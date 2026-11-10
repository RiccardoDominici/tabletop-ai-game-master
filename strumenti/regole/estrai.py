"""Estrazione del testo di un manuale di regole, diviso in sezioni, ognuna con la pagina di partenza.

    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/mondo.pdf          testo in Markdown
    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/mondo.md --json   testo come JSON

Formati: PDF, md, txt. Nel PDF i titoli si cercano in quest'ordine: 1) l'indice dei segnalibri, cercato per
pagina (non in sequenza: un indice fuori ordine non fa perdere gli altri); 2) il font e la dimensione (un titolo
è in un font diverso dal corpo, o più grande, o ha una forma come «Capitolo 3»); 3) come ultima risorsa, un taglio
ogni due pagine, con la pagina di partenza. md: titoli con `#`; txt: la forma.
Nel PDF le intestazioni e i piè di pagina che tornano su più pagine, e i numeri di pagina da soli, si tolgono;
i trattini di a capo si ricuciono; le righe di un paragrafo si uniscono.

Serve al Preparatore (.claude/skills/preparatore, passo «Regole»): il testo si legge e si riassume o si
cita in estratti brevi, non si copia intero nella campagna. Il manuale sta in manuali/, fuori da git
(docs/regole.md, §1). Questo modulo non scrive nulla: stampa.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import asdict, dataclass
from pathlib import Path

FORMATI = (".pdf", ".md", ".txt")

# Forme di un titolo di sezione nei testi senza indice: «Capitolo 3», «Parte II», «2.1 Il combattimento».
_FORMA_TITOLO = [
    re.compile(r"^(capitolo|parte|sezione|appendice)\s+[\w.-]+", re.IGNORECASE),
    re.compile(r"^\d{1,2}(\.\d{1,2})*\s+\S"),
]
_PAGINA_SOLA = re.compile(r"^(pagina\s+)?\d{1,4}$", re.IGNORECASE)
_FINE_FRASE = (".", "!", "?", ":", ";", ",", "»", ")")
_INIZIO_VOCE = ("•", "-", "–", "*")


@dataclass
class Sezione:
    titolo: str
    pagina: int | None  # pagina del PDF (dalla 1); None per md e txt, che non hanno pagine
    testo: str

    def as_dict(self) -> dict:
        return asdict(self)


def _chiave(s: str) -> str:
    """Forma confrontabile di una riga: minuscole, solo lettere e cifre separate da spazi."""
    return re.sub(r"[\W_]+", " ", s.lower()).strip()


def _e_titolo_di_forma(riga: str) -> bool:
    r = riga.strip()
    if not r or len(r) > 80 or r.endswith(_FINE_FRASE):
        return False
    if any(p.match(r) for p in _FORMA_TITOLO):
        return True
    # Maiuscolo tutto, con almeno una parola di quattro lettere: «COMBATTIMENTO», «LA MAGIA».
    return r.isupper() and 4 <= len(r) <= 60 and re.search(r"[A-ZÀ-Ý]{4,}", r) is not None


def _togli_ricorrenti(righe: list[tuple], pagine: int) -> list[tuple]:
    """Toglie i numeri di pagina da soli e le righe (intestazioni, piè di pagina) che tornano su più pagine.
    Le righe sono tuple (pagina, testo, ...): il resto della tupla passa invariato."""
    su_quante: dict[str, set[int]] = {}
    for riga in righe:
        su_quante.setdefault(_chiave(re.sub(r"\d+", "#", riga[1])), set()).add(riga[0])
    soglia = max(3, pagine // 2) if pagine >= 4 else 3
    ricorrenti = {k for k, pags in su_quante.items() if len(pags) >= soglia and k and len(k) < 80}
    return [riga for riga in righe
            if not (_PAGINA_SOLA.match(riga[1].strip()) or _chiave(re.sub(r"\d+", "#", riga[1])) in ricorrenti)]


def _paragrafi(righe: list[str], frasi: bool) -> str:
    """Unisce le righe di un testo in paragrafi: ricuce i trattini a capo e le righe a capo di una frase.

    Le righe vuote separano sempre i paragrafi. `frasi` (solo PDF, dove i paragrafi non hanno righe vuote)
    spezza anche dove una frase finisce e la riga dopo comincia con una maiuscola.
    """
    blocchi: list[str] = []
    cur = ""
    for raw in righe:
        r = raw.strip()
        if not r:
            if cur:
                blocchi.append(cur)
                cur = ""
            continue
        if not cur:
            cur = r
        elif cur.endswith("-") and r[:1].islower():
            cur = cur[:-1] + r
        elif r.startswith(_INIZIO_VOCE) or (frasi and cur.endswith(_FINE_FRASE[:4]) and r[:1].isupper()):
            blocchi.append(cur)
            cur = r
        else:
            cur = f"{cur} {r}"
    if cur:
        blocchi.append(cur)
    return "\n\n".join(blocchi)


def _indice_pdf(lettore) -> list[tuple[str, int | None]]:
    """Titoli e pagine dell'indice (i segnalibri) del PDF, in ordine di lettura, senza gerarchia."""
    voci: list[tuple[str, int | None]] = []

    def cammina(items) -> None:
        for it in items:
            if isinstance(it, list):  # i figli di una voce seguono la voce in una lista annidata
                cammina(it)
                continue
            try:
                pagina = lettore.get_destination_page_number(it) + 1
            except Exception:  # un segnalibro senza destinazione valida non ferma l'estrazione
                pagina = None
            voci.append((str(it.title).strip(), pagina))

    try:
        cammina(lettore.outline)
    except Exception:
        return []
    return voci


# Titoli per stile: una riga è un titolo se è in un font diverso dal corpo o più grande di almeno un punto.
_TITOLO_MAX_CARATTERI = 80
_DIFFERENZA_DIMENSIONE = 1.0
# Ultima risorsa: senza indice né titoli riconoscibili, una sezione ogni due pagine.
_PAGINE_PER_SEZIONE = 2


def _titoli_da_indice(righe: list[tuple[int | None, str]], indice: list[tuple[str, int | None]]) -> dict[int, str]:
    """Ogni voce dell'indice si cerca come riga di testo sulla sua pagina (±1 pagina).

    Non dipende dall'ordine dell'indice: un segnalibro fuori ordine (le tabelle in fondo al libro, per esempio)
    non fa perdere i titoli che vengono dopo. Una voce che non si trova nel testo si scarta.
    """
    per_chiave: dict[str, list[int]] = {}
    for n, (_, riga) in enumerate(righe):
        k = _chiave(riga)
        if k:
            per_chiave.setdefault(k, []).append(n)
    usati: set[int] = set()
    titoli: dict[int, str] = {}
    for titolo, pagina in indice:
        candidati = [n for n in per_chiave.get(_chiave(titolo), []) if n not in usati]
        if pagina is not None:
            candidati = [n for n in candidati if righe[n][0] is not None and abs(righe[n][0] - pagina) <= 1]
        if candidati:
            usati.add(candidati[0])
            titoli[candidati[0]] = titolo
    return titoli


def _corpo_del_pdf(linee: list[tuple[int, str, list[tuple[float, str, str]]]]) -> tuple[str, float]:
    """Il font e la dimensione del corpo del testo: quelli che coprono più caratteri."""
    font: Counter[str] = Counter()
    for _, _, pezzi in linee:
        for _, f, t in pezzi:
            font[f] += len(t.strip())
    if not font:
        return "", 0.0
    corpo_font = font.most_common(1)[0][0]
    dimensioni: Counter[float] = Counter()
    for _, _, pezzi in linee:
        for d, f, t in pezzi:
            if f == corpo_font:
                dimensioni[d] += len(t.strip())
    return corpo_font, dimensioni.most_common(1)[0][0]


def _titoli_da_stile(linee: list[tuple[int, str, list[tuple[float, str, str]]]]) -> dict[int, str]:
    """Titoli dal font, dalla dimensione o dalla forma: funziona anche su manuali senza indice e con titoli senza forma."""
    corpo_font, corpo_dim = _corpo_del_pdf(linee)
    titoli: dict[int, str] = {}
    for n, (_, testo, pezzi) in enumerate(linee):
        t = testo.strip()
        if len(t) < 3 or len(t) > _TITOLO_MAX_CARATTERI or t.endswith(_FINE_FRASE):
            continue
        fuori_corpo = all(f != corpo_font for _, f, x in pezzi if x.strip())
        piu_grande = max(d for d, _, _ in pezzi) >= corpo_dim + _DIFFERENZA_DIMENSIONE
        # La forma («Capitolo 3», «2.1 …») conta anche qui: è il vecchio riconoscimento dei PDF senza indice.
        if fuori_corpo or piu_grande or _e_titolo_di_forma(t):
            titoli[n] = t
    return titoli


def _titoli_per_pagine(righe: list[tuple[int | None, str]]) -> dict[int, str]:
    """Ultima risorsa: un titolo ogni `_PAGINE_PER_SEZIONE` pagine, con il numero di pagina nel titolo."""
    gruppi: list[dict] = []
    for n, (pag, _) in enumerate(righe):
        if pag is None:
            continue
        if not gruppi or pag - gruppi[-1]["p0"] >= _PAGINE_PER_SEZIONE:
            gruppi.append({"n0": n, "p0": pag, "p1": pag})
        gruppi[-1]["p1"] = pag
    return {g["n0"]: (f"Pagine {g['p0']}–{g['p1']}" if g["p1"] > g["p0"] else f"Pagina {g['p0']}") for g in gruppi}


def _titoli_testo(righe: list[tuple[int | None, str]], md: bool) -> dict[int, str]:
    """Titoli di md (con `#`) o di txt (dalla forma): nessuna pagina, nessun indice."""
    titoli: dict[int, str] = {}
    for n, (_, riga) in enumerate(righe):
        if md and re.match(r"^#{1,6}\s+\S", riga):
            titoli[n] = re.sub(r"^#{1,6}\s+", "", riga).strip()
        elif not md and _e_titolo_di_forma(riga):
            titoli[n] = riga.strip()
    return titoli


def _sezioni(righe: list[tuple[int | None, str]], titoli: dict[int, str], *, frasi: bool, md: bool = False,
             consuma: bool = True) -> list[Sezione]:
    """Spezza le righe nei punti dei titoli. `consuma`: la riga del titolo esce dal testo (False per i tagli per
    pagina, dove la riga di inizio è testo)."""
    sezioni: list[Sezione] = []
    titolo = "Inizio"
    pagina = righe[0][0] if righe else None
    corpo: list[str] = []

    def chiudi() -> None:
        testo = _paragrafi(corpo, frasi)
        if testo:
            sezioni.append(Sezione(titolo=titolo, pagina=pagina, testo=testo))

    for n, (pag, riga) in enumerate(righe):
        if n in titoli:
            chiudi()
            titolo, pagina = titoli[n], pag
            corpo = [] if consuma else [riga]
        elif md and riga.lstrip().startswith("#"):
            continue  # un titolo di livello non riconosciuto non entra nel testo
        else:
            corpo.append(riga)
    chiudi()
    return sezioni


def _leggi_testo(percorso: Path) -> list[tuple[int | None, str]]:
    return [(None, riga) for riga in percorso.read_text(encoding="utf-8").splitlines()]


def _linee_pdf(lettore) -> list[tuple[int, str, list[tuple[float, str, str]]]]:
    """Le righe di ogni pagina, con i pezzi di testo: (dimensione, font, testo). Una riga è un gruppo di pezzi
    alla stessa altezza, nell'ordine in cui il PDF li disegna."""
    linee: list[tuple[int, str, list[tuple[float, str, str]]]] = []
    for n, pagina in enumerate(lettore.pages, start=1):
        pezzi: list[tuple[float, float, str, str]] = []  # (altezza, dimensione, font, testo)

        def visita(testo, cm, tm, font, dimensione, _pezzi=pezzi):
            if testo:
                nome = str((font or {}).get("/BaseFont", "")) if font is not None else ""
                _pezzi.append((tm[5] + cm[5], float(dimensione or 0), nome, testo))

        pagina.extract_text(visitor_text=visita)
        gruppi: list[tuple[float, list[tuple[float, str, str]]]] = []
        for altezza, dim, font, t in pezzi:
            if gruppi and abs(gruppi[-1][0] - altezza) <= 2.0:
                gruppi[-1][1].append((dim, font, t))
            else:
                gruppi.append((altezza, [(dim, font, t)]))
        for _, ps in gruppi:
            testo = re.sub(r"\s+", " ", "".join(t for _, _, t in ps)).strip()
            if testo:
                linee.append((n, testo, ps))
    return linee


def _leggi_pdf(percorso: Path):
    """Righe del PDF (pagina, testo), indice dei segnalibri e righe con lo stile dei caratteri."""
    from pypdf import PdfReader  # import pigro: md e txt non ne hanno bisogno

    lettore = PdfReader(str(percorso))
    linee = _togli_ricorrenti(_linee_pdf(lettore), len(lettore.pages))
    righe = [(pag, testo) for pag, testo, _ in linee]
    return righe, _indice_pdf(lettore), linee


def _sezioni_pdf(righe, indice, linee) -> tuple[list[Sezione], str]:
    """Il PDF in sezioni, col metodo usato: indice, stile, o tagli per pagina (in quest'ordine)."""
    titoli = _titoli_da_indice(righe, indice)
    if titoli:
        return _sezioni(righe, titoli, frasi=True), "indice"
    titoli = _titoli_da_stile(linee)
    if titoli:
        return _sezioni(righe, titoli, frasi=True), "stile"
    return _sezioni(righe, _titoli_per_pagine(righe), frasi=True, consuma=False), "pagine"


def estrai(percorso: str | Path) -> list[Sezione]:
    """Il testo del manuale, spezzato in sezioni. Solleva ValueError per un formato non previsto."""
    p = Path(percorso)
    if p.suffix.lower() not in FORMATI:
        raise ValueError(f"formato non previsto: {p.suffix or 'senza estensione'} (accettati: {', '.join(FORMATI)})")
    if p.suffix.lower() == ".pdf":
        righe, indice, linee = _leggi_pdf(p)
        return _sezioni_pdf(righe, indice, linee)[0]
    md = p.suffix.lower() == ".md"
    righe = _leggi_testo(p)
    return _sezioni(righe, _titoli_testo(righe, md), frasi=False, md=md)


def markdown(sezioni: list[Sezione]) -> str:
    """Le sezioni come Markdown: un titolo per sezione, con la pagina tra parentesi quando c'è."""
    parti = []
    for s in sezioni:
        pag = f" (p. {s.pagina})" if s.pagina else ""
        parti.append(f"## {s.titolo}{pag}\n\n{s.testo}")
    return "\n\n".join(parti) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Estrae il testo di un manuale di regole, diviso in sezioni.")
    ap.add_argument("manuale", type=Path, help="il file del manuale, es. manuali/mondo.pdf")
    ap.add_argument("--json", action="store_true", help="stampa JSON invece di Markdown")
    a = ap.parse_args(argv)
    if not a.manuale.is_file():
        print(f"file non trovato: {a.manuale}", file=sys.stderr)
        return 2
    try:
        sezioni = estrai(a.manuale)
    except ValueError as err:
        print(str(err), file=sys.stderr)
        return 2
    if not sezioni:
        print("nessun testo estratto (un PDF scansionato non ha testo: serve un OCR o una versione testuale)", file=sys.stderr)
        return 1
    print(json.dumps([s.as_dict() for s in sezioni], ensure_ascii=False, indent=2) if a.json else markdown(sezioni), end="")
    return 0


if __name__ == "__main__":
    sys.exit(main())

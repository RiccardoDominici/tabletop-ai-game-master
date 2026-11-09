"""Estrazione del testo di un manuale di regole, diviso in sezioni, ognuna con la pagina di partenza.

    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/mondo.pdf          testo in Markdown
    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/mondo.md --json   testo come JSON

Formati: PDF (pypdf; si usa l'indice del PDF se c'è, sennò i titoli riconoscibili dalla forma), md, txt.
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


def _togli_ricorrenti(righe: list[tuple[int, str]], pagine: int) -> list[tuple[int, str]]:
    """Toglie i numeri di pagina da soli e le righe (intestazioni, piè di pagina) che tornano su più pagine."""
    su_quante: dict[str, set[int]] = {}
    for pag, riga in righe:
        su_quante.setdefault(_chiave(re.sub(r"\d+", "#", riga)), set()).add(pag)
    soglia = max(3, pagine // 2) if pagine >= 4 else 3
    ricorrenti = {k for k, pags in su_quante.items() if len(pags) >= soglia and k and len(k) < 80}
    out = []
    for pag, riga in righe:
        r = riga.strip()
        if _PAGINA_SOLA.match(r) or _chiave(re.sub(r"\d+", "#", r)) in ricorrenti:
            continue
        out.append((pag, riga))
    return out


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


def _sezioni(righe: list[tuple[int | None, str]], indice: list[tuple[str, int | None]], md: bool, frasi: bool) -> list[Sezione]:
    """Spezza le righe in sezioni. Titoli: dall'indice del PDF se ne trova, o da `#` (md), o dalla forma."""
    # Quale riga è un titolo, e come si chiama.
    titoli: dict[int, str] = {}
    if indice:
        # Una riga è un titolo se coincide con una voce dell'indice ancora da trovare; le voci saltate
        # (non trovate nel testo) si scartano, così un segnalibro sbagliato non blocca gli altri.
        da_trovare = [t for t, _ in indice]
        for n, (_, riga) in enumerate(righe):
            for k, t in enumerate(da_trovare):
                if _chiave(riga) == _chiave(t):
                    titoli[n] = t
                    da_trovare = da_trovare[k + 1:]
                    break
    if not titoli:
        for n, (_, riga) in enumerate(righe):
            if md and re.match(r"^#{1,6}\s+\S", riga):
                titoli[n] = re.sub(r"^#{1,6}\s+", "", riga).strip()
            elif not md and _e_titolo_di_forma(riga):
                titoli[n] = riga.strip()

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
            titolo, pagina, corpo = titoli[n], pag, []
        elif md and riga.lstrip().startswith("#"):
            continue  # un titolo di livello non riconosciuto non entra nel testo
        else:
            corpo.append(riga)
    chiudi()
    return sezioni


def _leggi_testo(percorso: Path) -> list[tuple[int | None, str]]:
    return [(None, riga) for riga in percorso.read_text(encoding="utf-8").splitlines()]


def _leggi_pdf(percorso: Path) -> tuple[list[tuple[int | None, str]], list[tuple[str, int | None]]]:
    from pypdf import PdfReader  # import pigro: md e txt non ne hanno bisogno

    lettore = PdfReader(str(percorso))
    righe: list[tuple[int, str]] = []
    for n, pagina in enumerate(lettore.pages, start=1):
        for riga in (pagina.extract_text() or "").splitlines():
            righe.append((n, riga))
    righe = _togli_ricorrenti(righe, len(lettore.pages))
    return [(pag, riga) for pag, riga in righe], _indice_pdf(lettore)


def estrai(percorso: str | Path) -> list[Sezione]:
    """Il testo del manuale, spezzato in sezioni. Solleva ValueError per un formato non previsto."""
    p = Path(percorso)
    if p.suffix.lower() not in FORMATI:
        raise ValueError(f"formato non previsto: {p.suffix or 'senza estensione'} (accettati: {', '.join(FORMATI)})")
    if p.suffix.lower() == ".pdf":
        righe, indice = _leggi_pdf(p)
        return _sezioni(righe, indice, md=False, frasi=True)
    md = p.suffix.lower() == ".md"
    return _sezioni(_leggi_testo(p), [], md=md, frasi=False)


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

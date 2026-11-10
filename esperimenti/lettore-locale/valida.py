"""Validazione di una risposta del selettore (modo B) e misure sulla lingua.

Funzioni pure, senza MLX: così si testano da sole e si usano uguali per Haiku (riferimento) e per i modelli
locali. Il protocollo è quello di prompts/selettore.md §1 e narrazione/parser.ts.

Una risposta è VALIDA se: ogni riga ha un'etichetta del protocollo; gli [usa] stanno nel catalogo del turno
(e il PG dopo `>` esiste); gli id di PNG esistono nella scena; gli [invito] sono PG presenti o `tutti`; l'ultima
riga è l'[invito], e ce n'è uno solo.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

# Etichette del protocollo (prompts/selettore.md §1). Il testo del PNG può iniziare con una direzione «[…]».
ETICHETTE: list[tuple[str, re.Pattern[str]]] = [
    ("usa", re.compile(r"^\[usa\] (\S+)(?: > (\S+))?$")),
    ("narratore", re.compile(r"^\[narratore\] (.+)$")),
    ("png", re.compile(r"^\[(png_\w+)\] (.+)$")),
    ("privato", re.compile(r"^\[privato (pg_\w+)\] (.+)$")),
    ("tag", re.compile(r"^\[(umore|effetto|ritmo)\] (.+)$")),
    ("invito", re.compile(r"^\[invito\] (.+)$")),
]

# Parole frequenti per capire la lingua. Solo le più comuni e poco ambigue fra italiano e inglese.
PAROLE_IT = set(
    "il la lo gli le di che non un una per sono sei è ma come anche della nel nella con poi si ci ti mi "
    "dei delle al alla del dal dalla ancora qui lì tra fra".split()
)
PAROLE_EN = set(
    "the and you with is are of to that this it for on not your have was were will they what where when "
    "just from be or".split()
)
# Scritture che in italiano non esistono: cirillico, arabo, thai, CJK, hangul.
SCRITTURE_ESTRANEE = re.compile(r"[Ѐ-ӿ؀-ۿ฀-๿぀-ヿ一-鿿가-힯]")
# Resti di markup o di ragionamento che non dovrebbero arrivare alla sintesi vocale.
MARKUP_RESTO = ("<think", "</think", "```", "**", "##")


@dataclass
class Riga:
    tipo: str
    testo: str
    grezza: str
    id: str | None = None
    pg: str | None = None


@dataclass
class Esito:
    valida: bool
    motivi: list[str] = field(default_factory=list)
    righe: list[Riga] = field(default_factory=list)
    usa: list[tuple[str, str | None]] = field(default_factory=list)


def leggi_righe(testo: str) -> list[Riga]:
    """Trasforma il testo grezzo in righe etichettate. Una riga senza etichetta resta con tipo «?»."""
    out: list[Riga] = []
    for grezza in testo.splitlines():
        riga = grezza.strip()
        if not riga:
            continue
        trovata = False
        for tipo, rx in ETICHETTE:
            m = rx.match(riga)
            if not m:
                continue
            trovata = True
            if tipo == "usa":
                out.append(Riga("usa", "", riga, id=m.group(1), pg=m.group(2)))
            elif tipo in ("narratore", "png", "privato"):
                chi = m.group(1) if tipo != "narratore" else "narratore"
                testo_riga = m.group(2) if tipo != "narratore" else m.group(1)
                out.append(Riga(tipo, testo_riga, riga, id=chi if tipo != "narratore" else None,
                                pg=m.group(1) if tipo == "privato" else None))
            elif tipo == "invito":
                out.append(Riga("invito", m.group(1), riga))
            else:
                out.append(Riga("tag", m.group(2), riga))
            break
        if not trovata:
            out.append(Riga("?", riga, riga))
    return out


def valida(testo: str, catalogo_ids: set[str], pg_ids: set[str], png_ids: set[str]) -> Esito:
    """Controlla il protocollo di una risposta. `motivi` elenca ogni difetto trovato (vuoto = valida)."""
    righe = leggi_righe(testo)
    motivi: list[str] = []
    if not righe:
        return Esito(False, ["vuota"], righe, [])
    usa: list[tuple[str, str | None]] = []
    for r in righe:
        if r.tipo == "?":
            motivi.append("riga_senza_etichetta")
        elif r.tipo == "usa":
            usa.append((r.id or "", r.pg))
            if r.id not in catalogo_ids:
                motivi.append("usa_fuori_catalogo")
            if r.pg is not None and r.pg not in pg_ids:
                motivi.append("pg_inesistente")
        elif r.tipo == "png" and r.id not in png_ids:
            motivi.append("png_inesistente")
        elif r.tipo == "privato" and r.pg not in pg_ids:
            motivi.append("pg_inesistente")
        elif r.tipo == "invito":
            ids = [x.strip() for x in r.testo.split(",") if x.strip()]
            if not ids or any(x != "tutti" and x not in pg_ids for x in ids):
                motivi.append("invito_inesistente")
    inviti = [i for i, r in enumerate(righe) if r.tipo == "invito"]
    if not inviti or inviti[-1] != len(righe) - 1:
        motivi.append("manca_invito_finale")
    elif len(inviti) > 1:
        motivi.append("invito_multiplo")
    return Esito(not motivi, sorted(set(motivi)), righe, usa)


def annunci(azioni: list[dict], righe: list[Riga]) -> tuple[int, int, list[str]]:
    """Quante azioni pubbliche hanno un annuncio: una riga [narratore] che nomina il PG (primo nome).

    Le azioni vuote (testo nullo) non contano. Ritorna (annunciate, totali, nomi mancanti).
    """
    totali = 0
    mancanti: list[str] = []
    narrazioni = [r.testo.lower() for r in righe if r.tipo == "narratore"]
    for a in azioni:
        if not a.get("testo"):
            continue
        totali += 1
        nome = a["nome"].lower()
        if not any(re.search(rf"\b{re.escape(nome)}\b", n) for n in narrazioni):
            mancanti.append(a["nome"])
    return totali - len(mancanti), totali, mancanti


def difetti_lingua(testo: str) -> list[str]:
    """Motivi per cui una riga di testo parlato non va bene in italiano (vuoto = ok)."""
    motivi: list[str] = []
    if not testo.strip():
        return ["vuota"]
    if SCRITTURE_ESTRANEE.search(testo):
        motivi.append("scrittura_estranea")
    if any(m in testo for m in MARKUP_RESTO):
        motivi.append("markup_residuo")
    parole = re.findall(r"[a-zà-ÿ']+", testo.lower())
    if not parole:
        motivi.append("vuota")
        return motivi
    it = sum(1 for p in parole if p in PAROLE_IT)
    en = sum(1 for p in parole if p in PAROLE_EN)
    if en >= 2 and en > it:
        motivi.append("inglese")
    if re.search(r"\b(\w+)(?:\W+\1\b){3,}", testo.lower()):
        motivi.append("ripetizione")
    return motivi


def righe_di_testo(righe: list[Riga]) -> list[Riga]:
    """Le righe che la sintesi vocale legge: narratore, PNG (non privato, non tag, non invito)."""
    return [r for r in righe if r.tipo in ("narratore", "png")]


def accordo(haiku: set[tuple[str, str | None]], locale: set[tuple[str, str | None]]) -> tuple[bool, float]:
    """Accordo sulle battute scelte: esatto (stesso insieme di [usa]) e Jaccard sul solo id."""
    id_h = {i for i, _ in haiku}
    id_l = {i for i, _ in locale}
    esatto = haiku == locale
    unione = id_h | id_l
    jacc = 1.0 if not unione else len(id_h & id_l) / len(unione)
    return esatto, jacc

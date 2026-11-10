"""Strumenti sul testo: frasi, parole, radici, e le regole di scrittura per l'ascolto (§5).

Le funzioni sono pure: ricevono testo e restituiscono misure. I dati che dipendono dalla lingua (cliché,
numeri in lettere, parole vuote, parole generiche, forme di stile) stanno in lingue/<codice>/prosa.yaml
e arrivano come `prosa` (strumenti/valida/lingua.py); senza, vale l'italiano. Le regole che usano queste
misure stanno negli altri moduli di regole.
"""

from __future__ import annotations

import re

from .lingua import Prosa, prosa_predefinita


def frasi(testo: str) -> list[str]:
    """Divide in frasi su . ! ? (e su » che chiude una frase), quando segue una maiuscola."""
    pezzi = re.split(r"(?<=[.!?»])\s+(?=[A-ZÀÈÉÌÒÙ«])", testo.strip())
    return [p for p in pezzi if p]


def parole(testo: str) -> list[str]:
    """Parole in minuscolo; l'apostrofo resta attaccato («l'acqua» conta una parola)."""
    return re.findall(r"[a-zàèéìòù']+", testo.lower())


def n_parole(testo: str) -> int:
    return len(parole(testo))


def radici(testo: str, lunghezza: int = 4, prosa: Prosa | None = None) -> set[str]:
    """Radici grezze: prime `lunghezza` lettere delle parole di almeno quattro lettere, senza le parole vuote."""
    vuote = (prosa or prosa_predefinita()).parole_vuote
    out = set()
    for w in parole(testo):
        w = w.split("'")[-1]
        if len(w) >= 4 and w not in vuote:
            out.add(w[:lunghezza])
    return out


def massimo_da_stile(stile: str | None, prosa: Prosa | None = None) -> int | None:
    """Il numero massimo di parole per frase scritto nello `stile` di una voce, o None se non si legge.

    Forme lette (dal pacchetto della lingua, `stile_frasi`), con i numeri in lettere o in cifre.
    """
    if not stile:
        return None
    pacco = prosa or prosa_predefinita()
    m = pacco.stile_frasi.search(stile.lower())
    if not m:
        return None
    massimo = m.group(2) or m.group(4) or m.group(5)
    return pacco.numeri.get(massimo) or (int(massimo) if massimo.isdigit() else None)


def limite_da_stile(stile: str | None, predefinito: int, prosa: Prosa | None = None) -> int:
    """Dallo `stile` di una voce ricava un tetto per frase: il massimo dichiarato più tre, mai oltre il predefinito."""
    valore = massimo_da_stile(stile, prosa)
    return min(predefinito, valore + 3) if valore else predefinito


def vocativi(testo: str, nomi: list[str]) -> list[str]:
    """Nomi propri seguiti da una virgola a inizio frase: a voce suonano come qualcuno chiamato per nome."""
    out = []
    for f in frasi(testo):
        m = re.match(r"^[«\"]?([A-ZÀÈÉÌÒÙ][\wàèéìòù']+),", f.strip())
        if m and m.group(1) in nomi:
            out.append(m.group(1))
    return out


def problemi_di_prosa(testo: str, max_parole: int | None = None, prosa: Prosa | None = None) -> list[tuple[str, str]]:
    """Regole N1, N5, N11 su un testo da leggere ad alta voce. Restituisce [(regola, dettaglio)].

    `max_parole` predefinito: il tetto di frase della lingua (N1)."""
    pacco = prosa or prosa_predefinita()
    if max_parole is None:
        max_parole = pacco.frase_max
    out = []
    for f in frasi(testo):
        n = n_parole(f)
        if n > max_parole:
            out.append(("frase_lunga", f"{n} parole (max {max_parole}): «{f[:70]}»"))
    basso = testo.lower()
    for v in pacco.cliche:
        if v in basso:
            out.append(("espressione_vietata", f"«{v}»"))
    if re.search(r"\d", testo):
        out.append(("cifre", "numeri in cifre: vanno in lettere (N11)"))
    if re.search(r"[()\[\]]", testo):
        out.append(("parentesi", "parentesi nel testo da leggere (N11)"))
    if "…" in testo or "..." in testo:
        out.append(("puntini", "puntini di sospensione: il TTS li legge male"))
    return out

"""Strumenti sul testo italiano: frasi, parole, radici, e le regole di scrittura per l'ascolto (§5).

Le funzioni sono pure: ricevono testo e restituiscono misure. Le regole che usano queste misure
stanno in regole_prosa.py e negli altri moduli di regole.
"""

from __future__ import annotations

import re

# N5: cliché e aggettivi che nominano l'emozione (manuale §5). Si cercano come sottostringhe.
VIETATE = [
    "brivido lungo la schiena", "sangue gelato", "gelato nelle vene", "l'aria è densa", "l'aria è carica",
    "silenzio assordante", "come se il tempo si fosse fermato", "non potete fare a meno di",
    "sentite che qualcosa non va", "aura di mistero", "danza di ombre",
    "inquietante", "misterios", "terrificante", "mozzafiato", "epic",
]

# Parole troppo comuni per fare da `temi`: farebbero entrare una battuta nel catalogo a ogni azione
# (lezione dell'esperimento A/B n. 1: catalogo largo = turni riempiti con battute non pertinenti).
TEMI_GENERICI = {
    "chi", "che", "cosa", "come", "dove", "quando", "perché", "perche", "quale", "quanto",
    "notte", "giorno", "sera", "casa", "porta", "uomo", "donna", "gente", "tutti", "qui", "là",
    "fare", "faccio", "vado", "andare", "guardo", "guardare", "vedo", "dico", "dire", "parlo",
    "parlare", "chiedo", "chiedere", "voglio", "prendo", "apro", "dentro", "fuori", "sotto", "sopra",
    "dietro", "davanti", "subito", "adesso", "ora", "bene", "male", "cosa", "nome", "detto",
}


def frasi(testo: str) -> list[str]:
    """Divide in frasi su . ! ? (e su » che chiude una frase), quando segue una maiuscola."""
    pezzi = re.split(r"(?<=[.!?»])\s+(?=[A-ZÀÈÉÌÒÙ«])", testo.strip())
    return [p for p in pezzi if p]


def parole(testo: str) -> list[str]:
    """Parole in minuscolo; l'apostrofo resta attaccato («l'acqua» conta una parola)."""
    return re.findall(r"[a-zàèéìòù']+", testo.lower())


def n_parole(testo: str) -> int:
    return len(parole(testo))


_STOP = {"della", "delle", "degli", "dello", "nella", "nelle", "negli", "sulla", "sulle", "sugli",
         "anche", "sono", "come", "quando", "dove", "perché", "mentre", "sempre", "ogni", "poi"}


def radici(testo: str, lunghezza: int = 4) -> set[str]:
    """Radici grezze: prime `lunghezza` lettere delle parole di almeno quattro lettere, senza stopword."""
    out = set()
    for w in parole(testo):
        w = w.split("'")[-1]
        if len(w) >= 4 and w not in _STOP:
            out.add(w[:lunghezza])
    return out


def limite_da_stile(stile: str | None, predefinito: int) -> int:
    """Dallo `stile` di una voce («Frasi di due-sei parole», «da 3 a 8 parole») ricava un tetto per frase."""
    if not stile:
        return predefinito
    numeri = {"due": 2, "tre": 3, "quattro": 4, "cinque": 5, "sei": 6, "sette": 7, "otto": 8,
              "nove": 9, "dieci": 10, "dodici": 12}
    m = re.search(r"frasi di (\w+)\s*[-–a]\s*(\w+) parole|da (\w+) a (\w+) parole", stile.lower())
    if not m:
        return predefinito
    massimo = m.group(2) or m.group(4)
    valore = numeri.get(massimo) or (int(massimo) if massimo.isdigit() else None)
    return min(predefinito, valore + 3) if valore else predefinito


def problemi_di_prosa(testo: str, max_parole: int = 20) -> list[tuple[str, str]]:
    """Regole N1, N5, N11 su un testo da leggere ad alta voce. Restituisce [(regola, dettaglio)]."""
    out = []
    for f in frasi(testo):
        n = n_parole(f)
        if n > max_parole:
            out.append(("frase_lunga", f"{n} parole (max {max_parole}): «{f[:70]}»"))
    basso = testo.lower()
    for v in VIETATE:
        if v in basso:
            out.append(("espressione_vietata", f"«{v}»"))
    if re.search(r"\d", testo):
        out.append(("cifre", "numeri in cifre: vanno in lettere (N11)"))
    if re.search(r"[()\[\]]", testo):
        out.append(("parentesi", "parentesi nel testo da leggere (N11)"))
    if "…" in testo or "..." in testo:
        out.append(("puntini", "puntini di sospensione: il TTS li legge male"))
    return out

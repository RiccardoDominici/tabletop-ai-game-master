"""Prompt delle immagini, allineati a strumenti/immagini/campagna.py (che li compone):
    stile.stile_immagini                 il frammento [STILE], in inglese
    scena.immagine.prompt_luogo          luogo, in inglese; immagine.invarianti
    png aspetto.prompt_immagine          ritratto, in inglese, con il segnaposto [STILE]
    png aspetto.invarianti               tratti fissi, accodati al ritratto
    png aspetto.situazioni [{id, prompt}] facoltative: lo stesso PNG in un'altra situazione
Le immagini vanno sul proiettore: sono pubbliche dal primo turno. Un tratto nascosto (una cicatrice
sotto il cappuccio) non va nel ritratto né nelle invarianti, ma in una situazione da mostrare dopo.
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito


def _sembra_inglese(t: str) -> bool:
    parole = re.findall(r"[a-z]+", t.lower())
    italiane = {"il", "lo", "la", "gli", "le", "di", "del", "della", "con", "che", "una", "uno", "nel", "sul"}
    return bool(parole) and sum(w in italiane for w in parole) / len(parole) < 0.08


def controlla(c: Campagna, e: Esito) -> None:
    stile = c.stile.get("stile_immagini")
    if not stile:
        e.errore("IMMAGINI.stile", "stile.yaml", "manca stile_immagini, il frammento [STILE]")
    elif "[STILE]" in stile:
        e.errore("IMMAGINI.stile", "stile.yaml", "stile_immagini è il contenuto di [STILE], non lo contiene")
    for nome, s in c.scene:
        img = s.get("immagine") or {}
        if not img.get("prompt_luogo"):
            e.errore("IMMAGINI.luogo", nome, "manca immagine.prompt_luogo")
        elif not _sembra_inglese(img["prompt_luogo"]):
            e.avviso("IMMAGINI.lingua", nome, "prompt_luogo in inglese: il generatore lo capisce meglio")
        if not img.get("invarianti"):
            e.errore("IMMAGINI.luogo", nome, "mancano immagine.invarianti")
    regex_segrete = []
    if c.parole_segrete:
        for v in c.parole_segrete.get("parole") or []:
            try:
                regex_segrete.append((re.compile(v["regex"]), v.get("parola", v["regex"]), set(v.get("fatti") or [])))
            except (re.error, KeyError, TypeError):
                pass  # lo segnala regole_segreti
    for pid, (nome, d) in c.png.items():
        asp = d.get("aspetto") or {}
        p = asp.get("prompt_immagine") or ""
        if not p:
            e.errore("IMMAGINI.ritratto", nome, "manca aspetto.prompt_immagine")
            continue
        if "[STILE]" not in p:
            e.errore("IMMAGINI.ritratto", nome, "prompt_immagine senza il segnaposto [STILE]")
        if not _sembra_inglese(p.replace("[STILE]", "")):
            e.avviso("IMMAGINI.lingua", nome, "prompt_immagine in inglese")
        for s in asp.get("situazioni") or []:
            if not (isinstance(s, dict) and s.get("id") and s.get("prompt")):
                e.errore("IMMAGINI.situazione", nome, "ogni situazione ha id e prompt")
        # Tratti segreti nelle parti sempre visibili: ritratto e invarianti.
        visibile = " ".join([p, *[str(x) for x in asp.get("invarianti") or []]]).lower()
        for rx, parola, _ in regex_segrete:
            if rx.search(visibile):
                e.avviso("IMMAGINI.segreto", nome,
                         f"ritratto o invarianti mostrano «{parola}» dal primo turno: spostalo in aspetto.situazioni",
                         rigoroso=True)
        if re.search(r"\(si vede solo|nascost|hidden|under the hood", visibile):
            e.avviso("IMMAGINI.segreto", nome,
                     "un tratto nascosto è nel ritratto o nelle invarianti: sul proiettore si vede subito", rigoroso=True)

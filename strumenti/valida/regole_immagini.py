"""Prompt delle immagini, allineati a strumenti/immagini/campagna.py (che li compone):
    stile.stile_immagini                 il frammento [STILE], in inglese
    scena.immagine.prompt_luogo          luogo, in inglese; immagine.invarianti
    png aspetto.prompt_immagine          ritratto, in inglese, con il segnaposto [STILE]
    png aspetto.invarianti               tratti fissi, accodati al ritratto
    png aspetto.prompt_ritratto          facoltativo: il ritratto, se c'è, al posto di prompt_immagine
    png aspetto.situazioni [{id, prompt, dopo}] facoltative: lo stesso PNG in un'altra situazione, da
                                         mostrare dopo la rivelazione `dopo` (id di indizi o battute)
    campagna nodi[].immagine.prompt_luogo i luoghi senza scheda scena
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


def _regex_segrete(c: Campagna) -> list[tuple[re.Pattern, str]]:
    out = []
    for v in (c.parole_segrete or {}).get("parole") or []:
        try:
            out.append((re.compile(v["regex"]), v.get("parola", v["regex"])))
        except (re.error, KeyError, TypeError):
            pass  # lo segnala regole_segreti
    return out


def _segreti(e: Esito, dove: str, testo: str, regex: list[tuple[re.Pattern, str]], cosa: str) -> None:
    """Un'immagine sempre visibile (luogo, ritratto, invarianti) non mostra niente di segreto [R]."""
    basso = testo.lower()
    for rx, parola in regex:
        if rx.search(basso):
            e.avviso("IMMAGINI.segreto", dove, f"{cosa} mostra «{parola}» dal primo turno: spostalo in aspetto.situazioni "
                                               "o toglilo dal luogo", rigoroso=True)
    if re.search(r"\(si vede solo|nascost|hidden|under the hood|secret", basso):
        e.avviso("IMMAGINI.segreto", dove, f"{cosa}: un tratto nascosto sul proiettore si vede subito", rigoroso=True)


def _prompt(e: Esito, dove: str, campo: str, testo: str, con_stile: bool) -> None:
    """Lingua e segnaposto [STILE] di un prompt (strumenti/immagini/campagna.py, con_stile)."""
    n = testo.count("[STILE]")
    if con_stile and n != 1:
        e.errore("IMMAGINI.ritratto", dove, f"{campo}: il segnaposto [STILE] compare {n} volte (una sola)")
    elif not con_stile and n > 1:
        e.errore("IMMAGINI.luogo", dove, f"{campo}: [STILE] più di una volta")
    if not _sembra_inglese(testo.replace("[STILE]", "")):
        e.avviso("IMMAGINI.lingua", dove, f"{campo} in inglese: il generatore lo capisce meglio")


def controlla(c: Campagna, e: Esito) -> None:
    stile = c.stile.get("stile_immagini")
    if not stile:
        e.errore("IMMAGINI.stile", "stile.yaml", "manca stile_immagini, il frammento [STILE]")
    elif "[STILE]" in stile:
        e.errore("IMMAGINI.stile", "stile.yaml", "stile_immagini è il contenuto di [STILE], non lo contiene")
    regex = _regex_segrete(c)
    # Luoghi delle scene e dei nodi senza scheda (campagna.yaml → nodi[].immagine).
    for nome, s in c.scene:
        img = s.get("immagine") or {}
        if not img.get("prompt_luogo"):
            e.errore("IMMAGINI.luogo", nome, "manca immagine.prompt_luogo")
        else:
            _prompt(e, nome, "prompt_luogo", img["prompt_luogo"], con_stile=False)
        if not img.get("invarianti"):
            e.errore("IMMAGINI.luogo", nome, "mancano immagine.invarianti")
        _segreti(e, nome, " ".join([str(img.get("prompt_luogo") or ""), *map(str, img.get("invarianti") or [])]), regex,
                 "il luogo")
    for nid, n in c.nodi.items():
        img = n.get("immagine") or {}
        if img.get("prompt_luogo"):
            dove = f"campagna.yaml nodo {nid}"
            _prompt(e, dove, "immagine.prompt_luogo", img["prompt_luogo"], con_stile=False)
            _segreti(e, dove, img["prompt_luogo"], regex, "il luogo")
    # Ritratti e situazioni dei PNG.
    for pid, (nome, d) in c.png.items():
        asp = d.get("aspetto") or {}
        p = asp.get("prompt_immagine") or ""
        if not p:
            e.errore("IMMAGINI.ritratto", nome, "manca aspetto.prompt_immagine")
            continue
        _prompt(e, nome, "prompt_immagine", p, con_stile=True)
        visibile = [p, *[str(x) for x in asp.get("invarianti") or []]]
        if asp.get("prompt_ritratto"):
            # Il generatore preferisce prompt_ritratto a prompt_immagine per il ritratto: stesse regole.
            _prompt(e, nome, "prompt_ritratto", asp["prompt_ritratto"], con_stile=True)
            visibile.append(asp["prompt_ritratto"])
        _segreti(e, nome, " ".join(visibile), regex, "il ritratto o le invarianti")
        for sit in asp.get("situazioni") or []:
            if not (isinstance(sit, dict) and sit.get("id") and sit.get("prompt")):
                e.errore("IMMAGINI.situazione", nome, "ogni situazione ha id e prompt")
                continue
            dopo = sit.get("dopo")
            dopo = [dopo] if isinstance(dopo, str) else list(dopo or [])
            for x in dopo:
                if x not in c.indizi and x not in c.per_id:
                    e.errore("IMMAGINI.situazione", nome, f"situazione {sit['id']}: dopo cita un id che non è né un indizio "
                                                          f"né una battuta: {x}")
            if not dopo:
                e.avviso("IMMAGINI.situazione", nome, f"situazione {sit['id']} senza `dopo`: il Motore la collega a una "
                                                      "rivelazione solo per somiglianza, e può non trovarla", rigoroso=True)
            if not _sembra_inglese(sit["prompt"]):
                e.avviso("IMMAGINI.lingua", nome, f"situazione {sit['id']}: prompt in inglese")

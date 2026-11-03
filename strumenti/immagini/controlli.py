"""Controlli automatici a pixel su un'immagine già salvata (gratis, esatti, senza modello).

Complementari al controllo visivo (visione.py), che vede ciò che i pixel non dicono (firme, soggetto).
Qui solo ciò che si misura senza ambiguità:
  - dimensioni: il file non è delle dimensioni chieste (un ritaglio sbagliato, un JPEG vecchio);
  - orlo: l'orlo di carta si vede ancora. Non basta la «profondità» dell'orlo (rifila.margini): la neve
    o una tavolozza crema che toccano il bordo la ingannano (nozze-neve: Ettore misura 153 px di «carta»
    e non ha nessun orlo). Un orlo strappato vero copre invece quasi tutto il bordo: si guarda la fascia
    più esterna (3 px) di ogni lato, e se è carta per più di metà della sua lunghezza l'orlo si vede.
    Sul campione del 3/11: sasso 78% in alto (orlo vero), le altre 1-37% (neve, nessun orlo);
  - quasi vuota: l'immagine è quasi uniforme (una generazione andata a vuoto).
Ogni problema ha la stessa forma di quelli del controllo visivo: {tipo, dove, descrizione, grave}.
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

from rifila import CHIARO, SATURAZIONE

FASCIA = 3                 # px della fascia più esterna di ogni lato
SOGLIA_ORLO = 0.5          # frazione di carta nella fascia oltre la quale l'orlo si vede
DEVIAZIONE_MINIMA = 8.0    # deviazione standard della luminanza sotto la quale l'immagine è «vuota»


def frazioni_carta_bordi(img: Image.Image, fascia: int = FASCIA) -> dict[str, float]:
    """Frazione di pixel «carta» nella fascia più esterna di ogni lato."""
    a = np.asarray(img.convert("RGB"), dtype=np.int16)
    carta = (a.min(axis=2) > CHIARO) & (a.max(axis=2) - a.min(axis=2) < SATURAZIONE)
    return {"su": float(carta[:fascia].mean()), "giu": float(carta[-fascia:].mean()),
            "sx": float(carta[:, :fascia].mean()), "dx": float(carta[:, -fascia:].mean())}


def controlla_file(percorso: str | Path, dimensioni: tuple[int, int] | None = None) -> list[dict]:
    """Problemi trovati a pixel (lista vuota se nessuno)."""
    problemi: list[dict] = []
    with Image.open(percorso) as im:
        if dimensioni and im.size != tuple(dimensioni):
            problemi.append({"tipo": "dimensioni", "dove": "file", "grave": True,
                             "descrizione": f"il file è {im.size[0]}x{im.size[1]}, atteso {dimensioni[0]}x{dimensioni[1]}"})
        for lato, f in frazioni_carta_bordi(im).items():
            if f > SOGLIA_ORLO:
                problemi.append({"tipo": "margine", "dove": f"bordo {lato}", "grave": True,
                                 "descrizione": f"orlo di carta visibile: {round(f * 100)}% della fascia esterna è carta"})
        luminanza = np.asarray(im.convert("L"), dtype=np.float32)
        if luminanza.std() < DEVIAZIONE_MINIMA:
            problemi.append({"tipo": "vuota", "dove": "immagine intera", "grave": True,
                             "descrizione": f"immagine quasi uniforme (deviazione {luminanza.std():.1f})"})
    return problemi

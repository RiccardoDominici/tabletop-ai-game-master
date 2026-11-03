"""Rifilatura dei margini di carta bianca nelle immagini a tutto schermo (luoghi, situazioni).

Perché
------
Lo stile v2 chiede «full-bleed… no border and no margin», ma FLUX.2 klein disegna spesso il quadro
su un foglio con l'orlo strappato. Ci sono due casi:
  - orlo sottile (10-60 px a 1920): sul proiettore, con `object-fit: cover` e il Ken Burns che
    parte da scala 1, si vede una frangia bianca abbagliante sul nero. Qui basta rifilare ~3% per
    lato e ridimensionare.
  - margine largo (un quadro dentro un foglio): rifilare toglierebbe troppa immagine. Si rifila
    fino al massimo consentito, si avvisa nel log e l'immagine va rigenerata con un altro seme.

Come
----
«Carta» = pixel chiaro e poco saturo (la carta è bianco caldo uniforme; la neve e il lino dipinti
sono ombreggiati e tratteggiati, quindi quasi mai sopra la soglia). Per ogni lato si misura, riga per
riga, quanti pixel carta CONTIGUI AL BORDO ci sono, e si prende un percentile alto: così una macchia
chiara dentro il quadro non conta, ma conta l'orlo strappato anche dove è più profondo.
Il ritaglio è centrato e tiene le proporzioni; poi salva_jpeg porta l'immagine alle dimensioni finali.
"""

from __future__ import annotations

import logging

import numpy as np
from PIL import Image

log = logging.getLogger("immagini.rifila")

CHIARO = 225        # tutti i canali sopra questo valore…
SATURAZIONE = 22    # …e poca differenza tra i canali: carta
PERCENTILE = 99     # profondità dell'orlo su un lato: il 99° percentile delle corse dal bordo
MASSIMO = 0.05      # mai più del 5% per lato: oltre, il margine è largo e l'immagine va rigenerata
# Sempre almeno l'1,2% per lato (23 px a 1920): una carta calda appena sotto la soglia (min 215-224,
# casa del sale di ponte-lanterne) sfugge alla misura, e abbassare la soglia fa scambiare per carta la
# neve e i muri illuminati. Un ingrandimento del 2,4% non si vede, accanto all'8% del Ken Burns.
MINIMO = 0.012


def _corse_dal_bordo(carta: np.ndarray, cap: int) -> np.ndarray:
    """Per ogni riga, quanti pixel carta consecutivi ci sono partendo dalla colonna 0 (al massimo cap)."""
    sub = carta[:, :cap]
    return np.where(sub.all(axis=1), cap, np.argmin(sub, axis=1))


def margini(img: Image.Image) -> dict[str, int]:
    """Profondità in pixel dell'orlo di carta su ogni lato: sx, dx, su, giu."""
    a = np.asarray(img.convert("RGB"), dtype=np.int16)
    carta = (a.min(axis=2) > CHIARO) & (a.max(axis=2) - a.min(axis=2) < SATURAZIONE)
    h, w = carta.shape
    misure = {
        "sx": _corse_dal_bordo(carta, w // 5),
        "dx": _corse_dal_bordo(carta[:, ::-1], w // 5),
        "su": _corse_dal_bordo(carta.T, h // 5),
        "giu": _corse_dal_bordo(carta.T[:, ::-1], h // 5),
    }
    return {lato: int(np.percentile(v, PERCENTILE)) for lato, v in misure.items()}


def rifila(img: Image.Image, massimo: float = MASSIMO, minimo: float = MINIMO) -> tuple[Image.Image, float]:
    """Ritaglia al centro, con le stesse proporzioni, quanto basta a togliere l'orlo di carta.

    Ritorna (immagine, frazione tolta per lato). Con frazione 0 l'immagine è quella di partenza.
    """
    m = margini(img)
    w, h = img.size
    # Un ritaglio centrato con le stesse proporzioni toglie la stessa FRAZIONE su ogni lato:
    # deve bastare per il lato peggiore, in orizzontale e in verticale.
    serve = max(m["sx"] / w, m["dx"] / w, m["su"] / h, m["giu"] / h, minimo)
    if serve == 0:
        return img, 0.0
    if serve > massimo:
        log.warning("orlo di carta largo (%.1f%% per lato, %s px): rifilo solo il %.0f%%, meglio rigenerare",
                    serve * 100, m, massimo * 100)
        serve = massimo
    # +2 px di sicurezza: l'ultima colonna di carta spesso è sfumata sotto la soglia.
    dx, dy = round(w * serve) + 2, round(h * serve) + 2
    log.info("rifilo l'orlo di carta: %.1f%% per lato (margini misurati %s px)", serve * 100, m)
    return img.crop((dx, dy, w - dx, h - dy)), serve

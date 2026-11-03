"""Strati d'ambiente ed effetti per una campagna: dal tag al file pronto (pool, poi sintesi).

Per ogni tag: una voce buona del fondo locale (pool.py, che si arricchisce dalle fonti se c'è
rete); se non c'è e il tag è «di rumore», uno strato sintetico (fonti/sintesi.py). Un file per
tag e per campagna, condiviso da tutti i luoghi che lo usano: cambia solo il volume.
"""

from __future__ import annotations

import logging
import re
import zlib
from dataclasses import dataclass
from pathlib import Path

import numpy as np

import qualita as Q
import vocabolario as V
from fonti import sintesi
from percorsi import CACHE_POOL, SR
from pool import Pool

log = logging.getLogger("audio.ambienti")

LOOP_AMBIENTE = {"obiettivo_s": 45.0, "minimo_s": 25.0, "massimo_s": 60.0, "dissolvenza_s": 2.0}
DURATA_SINTESI_S = 42.0


@dataclass
class Sorgente:
    tag: str
    tipo: str                 # ambiente | effetto
    voce: dict | None         # voce del pool, o None per la sintesi
    nome_file: str

    @property
    def sintetica(self) -> bool:
        return self.voce is None

    def meta(self) -> dict:
        if self.voce is None:
            return {"fonte": "sintesi", "licenza": "nessuna (generato dalla pipeline)"}
        v = self.voce
        return {"fonte": v["fonte"], "titolo": v["titolo"], "autore": v["autore"], "licenza": v["licenza"],
                "licenza_url": v["licenza_url"], "pagina": v["pagina"], "url_file": v["url_file"]}


def _slug(testo: str, n: int = 24) -> str:
    return re.sub(r"[^a-z0-9]+", "-", testo.lower()).strip("-")[:n].strip("-")


def sorgente(tag: str, tipo: str, pool: Pool, rete: bool) -> Sorgente | None:
    """Da dove prendere un tag: il fondo (arricchito se c'è rete), poi la sintesi, poi niente."""
    if rete:
        try:
            pool.arricchisci(tag, tipo)
        except Exception as e:      # una fonte giù non deve fermare la campagna
            log.warning("pool: arricchimento di «%s» fallito: %s", tag, e)
    buone = pool.buone(tag, tipo)
    prefisso = "amb" if tipo == "ambiente" else "sfx"
    if buone:
        v = buone[0]
        return Sorgente(tag, tipo, v, f"{prefisso}_{tag}_{_slug(v['id'])}.m4a")
    if tipo == "ambiente" and V.AMBIENTI[tag].sintetizzabile:
        return Sorgente(tag, tipo, None, f"{prefisso}_{tag}_sintesi.m4a")
    if tipo == "effetto" and tag == "campana":
        return Sorgente(tag, tipo, None, "sfx_campana_soundfont.m4a")
    log.warning("nessuna sorgente per %s «%s»", tipo, tag)
    return None


def audio_di(s: Sorgente, campagna: str) -> tuple[np.ndarray, dict]:
    """L'audio pronto da normalizzare (già in loop per gli ambienti, già tagliato per gli effetti)."""
    seme = zlib.crc32(f"{campagna}|{s.tag}".encode())
    if s.tipo == "ambiente":
        if s.sintetica:
            return sintesi.genera(s.tag, DURATA_SINTESI_S, seme), {"sintesi_s": DURATA_SINTESI_S}
        grezzo = Q.decodifica(CACHE_POOL / s.voce["file"])
        loop, info = Q.estrai_loop(grezzo, **LOOP_AMBIENTE)
        return loop, {"loop_sorgente": {"inizio_s": info.inizio_s, "fine_s": info.fine_s, "note": info.note}}
    if s.sintetica:     # la campana di riserva: un rintocco grave di campana tubolare dal SoundFont
        return _campana_soundfont(), {"suono": "Tubular Bells (GeneralUser GS)"}
    return Q.taglia_effetto(Q.decodifica(CACHE_POOL / s.voce["file"])), {}


def _campana_soundfont() -> np.ndarray:
    from temi.motivo import Evento, Variazione
    from temi.rendi import rendi

    v = Variazione([Evento(52, 0.0, 4.0, 120)], 4.0, [], 52)
    a = rendi(v, 14, 60.0, 52)
    return a

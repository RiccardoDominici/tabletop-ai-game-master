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


# Tag d'ambiente che, senza registrazioni, si fanno col SoundFont (campane lontane, un coro lontano).
SOUNDFONT_AMBIENTI = ("campane", "canto")
# Ripieghi per i tag senza registrazione né sintesi: un suono vicino.
RIPIEGHI = {"taverna": "folla", "mulino": "fiume", "temporale": "pioggia", "gocce": "acqua"}


@dataclass
class Sorgente:
    tag: str
    tipo: str                 # ambiente | effetto
    voce: dict | None         # voce del pool, o None per la sintesi
    nome_file: str
    ripiego_di: str | None = None   # il tag di cui si usa il file, se è un ripiego

    @property
    def sintetica(self) -> bool:
        return self.voce is None

    def meta(self) -> dict:
        extra = {"ripiego_di": self.ripiego_di} if self.ripiego_di else {}
        if self.voce is None and self.nome_file.endswith("_soundfont.m4a"):
            return {"fonte": "sintesi", "licenza": "nessuna (SoundFont GeneralUser GS)", **extra}
        if self.voce is None:
            return {"fonte": "sintesi", "licenza": "nessuna (generato dalla pipeline)", **extra}
        v = self.voce
        return {**extra, "fonte": v["fonte"], "titolo": v["titolo"], "autore": v["autore"], "licenza": v["licenza"],
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
    if tipo == "ambiente" and tag in SOUNDFONT_AMBIENTI:
        return Sorgente(tag, tipo, None, f"{prefisso}_{tag}_soundfont.m4a")
    if tipo == "ambiente" and tag in RIPIEGHI:
        # Un suono vicino invece di niente: la taverna senza registrazione è almeno una folla.
        r = sorgente(RIPIEGHI[tag], tipo, pool, rete)
        if r:
            log.info("ambiente «%s»: uso «%s» come ripiego", tag, RIPIEGHI[tag])
            return Sorgente(tag, tipo, r.voce, r.nome_file, ripiego_di=RIPIEGHI[tag])
    if tipo == "effetto" and tag == "campana":
        return Sorgente(tag, tipo, None, "sfx_campana_soundfont.m4a")
    log.warning("nessuna sorgente per %s «%s»", tipo, tag)
    return None


def audio_di(s: Sorgente, campagna: str, tonica: int = 2, modo: str = "dorico") -> tuple[np.ndarray, dict]:
    """L'audio pronto da normalizzare (già in loop per gli ambienti, già tagliato per gli effetti)."""
    seme = zlib.crc32(f"{campagna}|{s.tag}".encode())
    if s.tipo == "ambiente":
        if s.sintetica and s.tag in SOUNDFONT_AMBIENTI:
            return _ambiente_soundfont(s.tag, seme, tonica), {"sintesi_s": DURATA_SINTESI_S, "suono": "SoundFont"}
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


def _ambiente_soundfont(tag: str, seme: int, tonica: int) -> np.ndarray:
    """Campane lontane (un rintocco grave ogni 7–12 s) o un coro lontano (accordi lenti), circolari."""
    import random

    from temi.rendi import rendi_libero

    rnd = random.Random(seme)
    base = 36 + (tonica % 12)          # la tonica della campagna, nell'ottava grave
    note = []
    if tag == "campane":
        t = rnd.uniform(0.5, 3.0)
        while t < DURATA_SINTESI_S - 1:
            note.append((t, 3.0, base + 12 + rnd.choice((0, 0, 7, -5)), rnd.randint(70, 95)))
            t += rnd.uniform(7.0, 12.0)
        audio = rendi_libero(note, 14, DURATA_SINTESI_S, riverbero_s=3.0, umido=0.5)
    else:
        # Coro: tonica e quinta tenute, con una terza minore o maggiore che cambia ogni 7 s.
        t = 0.0
        while t < DURATA_SINTESI_S - 0.1:
            durata = min(7.0, DURATA_SINTESI_S - t)
            for n in (base + 24, base + 31, base + 24 + rnd.choice((3, 4, 5))):
                note.append((t, durata + 0.4, n, rnd.randint(40, 55)))
            t += 7.0
        audio = rendi_libero(note, 52, DURATA_SINTESI_S, riverbero_s=2.5, umido=0.45)
    return (audio / (np.max(np.abs(audio)) + 1e-9) * 0.5).astype(np.float32)

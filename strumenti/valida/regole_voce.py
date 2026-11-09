"""Voce espressiva (drama-3) nel repertorio e nelle schede: docs/ricerca-voce-drama3.md.

Le righe delle battute possono avere una direzione a inizio riga, suoni e tag accoppiati (strumenti/
valida/voce.py). Qui si controlla che il server non debba correggerle: tag conosciuti e chiusi nella
riga, direzioni brevi e senza punti (il divisore di frasi le spezzerebbe), poche per riga. Le schede dei
PNG possono fissare la direzione predefinita in `voce.tts.direzione` (breve), e la carta di stile quella
del narratore in `direzione_voce`.
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito
from .voce import problemi

MAX_PREDEFINITA = 110  # come il server: la direzione predefinita viene accorciata oltre questa misura


def _righe(b: dict) -> list[str]:
    out = [r for r in b.get("testo") or [] if isinstance(r, str)]
    for v in b.get("varianti") or []:
        if isinstance(v, list):
            out += [r for r in v if isinstance(r, str)]
    return out


def controlla(c: Campagna, e: Esito) -> None:
    for b in c.battute:
        dove = f"{b.get('_file', '?')} {b.get('id', '?')}"
        for riga in _righe(b):
            m = re.match(r"^\[([a-z0-9_]+)\]\s?(.*)$", riga)
            testo = m.group(2) if m else riga
            for gravita, regola, dettaglio in problemi(testo):
                (e.errore if gravita == "errore" else e.avviso)(f"VOCE.{regola}", dove, dettaglio)
    for pid, (_, d) in c.png.items():
        tts = ((d.get("voce") or {}).get("tts") or {}) if isinstance(d.get("voce"), dict) else {}
        dirz = tts.get("direzione") if isinstance(tts, dict) else None
        if isinstance(dirz, str) and len(dirz) > MAX_PREDEFINITA:
            e.avviso("VOCE.direzione_lunga", pid, f"voce.tts.direzione di {len(dirz)} caratteri: il server la accorcia a {MAX_PREDEFINITA}")
        if isinstance(dirz, str) and re.search(r"[\[\]<>]", dirz):
            e.errore("VOCE.direzione_markup", pid, "voce.tts.direzione senza quadre né tag: è solo la descrizione")
    dirn = (c.stile or {}).get("direzione_voce") if isinstance(c.stile, dict) else None
    if isinstance(dirn, str) and len(dirn) > MAX_PREDEFINITA:
        e.avviso("VOCE.direzione_lunga", "stile.yaml", f"direzione_voce di {len(dirn)} caratteri (max {MAX_PREDEFINITA})")

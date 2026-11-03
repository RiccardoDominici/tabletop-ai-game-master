"""Suona una variazione con un SoundFont General MIDI (tinysoundfont, niente FluidSynth di sistema).

SoundFont: GeneralUser GS 2.0.3 di S. Christian Collins (licenza: uso libero anche commerciale,
anche dentro software; vedi docs/audio.md), scaricato da setup.sh in cache/audio/soundfont/.
tinysoundfont (MIT) ha la libreria nativa dentro la ruota pip per macOS arm64.

Sotto la melodia suona un bordone leggero (tonica e quinta, archi): dà al modo il suo colore anche
in sei secondi. Poi un riverbero sintetico corto (rumore che decade, convoluzione FFT), perché un
SoundFont «secco» sul proiettore suona come una suoneria.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np

from percorsi import SOUNDFONT, SR
from temi.motivo import Variazione

log = logging.getLogger("audio.temi.rendi")

CANALE_MELODIA, CANALE_BORDONE = 0, 1
PROGRAMMA_BORDONE = 48       # String Ensemble 1 (contato da zero)
CODA_S = 1.6                 # dopo l'ultima nota: il rilascio dello strumento e il riverbero
_synth_cache: dict = {}


def _synth():
    import tinysoundfont

    if "synth" not in _synth_cache:
        if not SOUNDFONT.exists():
            raise FileNotFoundError(f"manca il SoundFont {SOUNDFONT}: lancia strumenti/audio/setup.sh")
        synth = tinysoundfont.Synth(gain=0.0, samplerate=SR)
        sfid = synth.sfload(str(SOUNDFONT), gain=0.0)
        _synth_cache.update(synth=synth, sfid=sfid)
    return _synth_cache["synth"], _synth_cache["sfid"]


def nome_programma(programma: int) -> str:
    synth, sfid = _synth()
    return synth.sfpreset_name(sfid, 0, programma) or f"programma {programma}"


def riverbero(audio: np.ndarray, durata_s: float = 1.3, umido: float = 0.22, seme: int = 7) -> np.ndarray:
    """Riverbero sintetico: risposta all'impulso di rumore con decadimento esponenziale (stereo decorrelato)."""
    rnd = np.random.default_rng(seme)
    n = int(durata_s * SR)
    t = np.arange(n) / SR
    ir = rnd.standard_normal((n, 2)).astype(np.float32) * np.exp(-6.9 * t / durata_s)[:, None]
    ir[: int(0.012 * SR)] = 0                       # piccolo ritardo iniziale
    ir /= np.sqrt((ir ** 2).sum(axis=0, keepdims=True))
    lung = len(audio) + n
    dim = 1 << (lung - 1).bit_length()
    bagnato = np.stack([np.fft.irfft(np.fft.rfft(audio[:, c], dim) * np.fft.rfft(ir[:, c], dim), dim)[:lung] for c in range(2)], axis=1)
    secco = np.concatenate([audio, np.zeros((n, 2), dtype=np.float32)])
    return (secco * (1 - umido) + bagnato.astype(np.float32) * umido * 3.0).astype(np.float32)


def rendi(v: Variazione, programma: int, bpm: float, tonica_midi: int, quinta: int = 7) -> np.ndarray:
    """La variazione come audio float32 stereo a SR Hz (prima della normalizzazione)."""
    synth, sfid = _synth()
    synth.program_select(CANALE_MELODIA, sfid, 0, programma)
    synth.program_select(CANALE_BORDONE, sfid, 0, PROGRAMMA_BORDONE)
    sec = 60.0 / bpm
    fine_s = v.movimenti * sec
    # Bordone un'ottava sotto la tonica della melodia (ma non sotto il do grave).
    radice = tonica_midi - 12
    while radice < 36:
        radice += 12
    eventi: list[tuple[float, int, str, int, int]] = []   # (tempo s, ordine, tipo, canale, nota, vel)
    for e in v.eventi:
        eventi.append((e.inizio * sec, 1, "on", CANALE_MELODIA, e.altezza, e.intensita))
        eventi.append(((e.inizio + e.durata) * sec, 0, "off", CANALE_MELODIA, e.altezza, 0))
    for nota in (radice, radice + quinta):
        eventi.append((0.0, 1, "on", CANALE_BORDONE, nota, 38))
        eventi.append((fine_s, 0, "off", CANALE_BORDONE, nota, 0))
    eventi.sort(key=lambda x: (x[0], x[1]))
    totale = int((fine_s + CODA_S) * SR)
    out = np.zeros((totale, 2), dtype=np.float32)
    pos = 0
    for t, _, tipo, canale, nota, vel in eventi:
        a = min(int(t * SR), totale)
        if a > pos:
            out[pos:a] = np.frombuffer(synth.generate_simple(a - pos), dtype=np.float32).reshape(-1, 2)
            pos = a
        if tipo == "on":
            synth.noteon(canale, nota, vel)
        else:
            synth.noteoff(canale, nota)
    if pos < totale:
        out[pos:] = np.frombuffer(synth.generate_simple(totale - pos), dtype=np.float32).reshape(-1, 2)
    synth.notes_off() if hasattr(synth, "notes_off") else None
    out = riverbero(out)
    # Sfumatura finale corta: la coda del riverbero non si tronca.
    nf = int(0.4 * SR)
    out[-nf:] *= np.linspace(1, 0, nf, dtype=np.float32)[:, None]
    return out

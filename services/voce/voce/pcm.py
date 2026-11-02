"""Conversione dell'audio del modello (float32 in [-1, 1]) in PCM s16le mono.

Parte pura (solo numpy), coperta dai test in tests/test_pcm.py.
"""
from __future__ import annotations

import io
import wave

import numpy as np

FORMATO = "pcm_s16le"
BYTE_PER_CAMPIONE = 2


def float_a_s16le(audio: np.ndarray) -> bytes:
    """float32 mono -> byte PCM 16 bit little-endian.

    - NaN e infiniti diventano 0 (un pezzo corrotto non deve diventare un "clic" al massimo volume);
    - i valori fuori da [-1, 1] vengono tagliati, non avvolti (l'overflow int16 suonerebbe come rumore);
    - scala 32767 e arrotondamento al più vicino, così 1.0 -> 32767 e -1.0 -> -32767 (simmetrico).
    """
    a = np.asarray(audio, dtype=np.float32).reshape(-1)
    a = np.nan_to_num(a, nan=0.0, posinf=0.0, neginf=0.0)
    np.clip(a, -1.0, 1.0, out=a)
    return np.rint(a * 32767.0).astype("<i2").tobytes()


def s16le_a_float(dati: bytes) -> np.ndarray:
    """Operazione inversa (per le prove e i test): byte s16le -> float32 in [-1, 1]."""
    if len(dati) % BYTE_PER_CAMPIONE:
        raise ValueError("lunghezza non multipla di 2: PCM s16le spezzato a metà campione")
    return np.frombuffer(dati, dtype="<i2").astype(np.float32) / 32767.0


def secondi(n_byte: int, sample_rate: int) -> float:
    """Durata in secondi di n_byte di PCM s16le mono."""
    return n_byte / (BYTE_PER_CAMPIONE * sample_rate)


def wav_da_s16le(dati: bytes, sample_rate: int) -> bytes:
    """Incapsula PCM s16le mono in un file WAV (per salvare l'audio delle prove)."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(BYTE_PER_CAMPIONE)
        w.setframerate(sample_rate)
        w.writeframes(dati)
    return buf.getvalue()

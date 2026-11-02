"""Test della conversione float32 -> PCM s16le (voce/pcm.py)."""
import io
import wave

import numpy as np
import pytest

from voce.pcm import float_a_s16le, s16le_a_float, secondi, wav_da_s16le


def test_valori_notevoli():
    dati = float_a_s16le(np.array([0.0, 1.0, -1.0, 0.5, -0.5], dtype=np.float32))
    assert np.frombuffer(dati, dtype="<i2").tolist() == [0, 32767, -32767, 16384, -16384]


def test_little_endian_e_due_byte_per_campione():
    dati = float_a_s16le(np.array([1.0], dtype=np.float32))
    assert dati == (32767).to_bytes(2, "little", signed=True)
    assert len(float_a_s16le(np.zeros(100, dtype=np.float32))) == 200


def test_taglio_senza_avvolgimento():
    # oltre il fondo scala si taglia: un overflow int16 diventerebbe il valore opposto (rumore)
    dati = float_a_s16le(np.array([1.7, -3.0], dtype=np.float32))
    assert np.frombuffer(dati, dtype="<i2").tolist() == [32767, -32767]


def test_nan_e_infiniti_diventano_silenzio():
    dati = float_a_s16le(np.array([np.nan, np.inf, -np.inf], dtype=np.float32))
    assert np.frombuffer(dati, dtype="<i2").tolist() == [0, 0, 0]


def test_non_modifica_l_ingresso():
    a = np.array([2.0, np.nan], dtype=np.float32)
    float_a_s16le(a)
    assert a[0] == 2.0 and np.isnan(a[1])


def test_andata_e_ritorno():
    rng = np.random.default_rng(0)
    a = rng.uniform(-1, 1, 24000).astype(np.float32)
    b = s16le_a_float(float_a_s16le(a))
    assert b.shape == a.shape
    assert np.max(np.abs(a - b)) <= 1 / 32767


def test_accetta_float64_e_2d():
    a = np.array([[0.25], [-0.25]], dtype=np.float64)
    assert np.frombuffer(float_a_s16le(a), dtype="<i2").tolist() == [8192, -8192]


def test_pcm_spezzato_rifiutato():
    with pytest.raises(ValueError):
        s16le_a_float(b"\x00\x01\x02")


def test_secondi():
    assert secondi(48000, 24000) == pytest.approx(1.0)


def test_wav():
    pcm = float_a_s16le(np.zeros(2400, dtype=np.float32))
    with wave.open(io.BytesIO(wav_da_s16le(pcm, 24000))) as w:
        assert (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()) == (1, 2, 24000, 2400)

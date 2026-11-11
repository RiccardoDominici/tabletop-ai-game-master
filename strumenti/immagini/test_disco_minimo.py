"""Soglia del disco configurabile (TAGM_DISCO_MINIMO_GB), con predefinito 6 GB.

    python3 -m pytest -q strumenti/immagini/test_disco_minimo.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

import motore  # noqa: E402


def test_predefinito_senza_variabile() -> None:
    assert motore.disco_minimo_da_ambiente({}) == 6.0
    assert motore.DISCO_MINIMO_PREDEFINITO_GB == 6.0


@pytest.mark.parametrize("valore, atteso", [("3", 3.0), ("7.5", 7.5), ("  4 ", 4.0)])
def test_variabile_numerica_vince(valore: str, atteso: float) -> None:
    assert motore.disco_minimo_da_ambiente({"TAGM_DISCO_MINIMO_GB": valore}) == atteso


@pytest.mark.parametrize("valore", ["", "   ", "abc", "0", "-2"])
def test_valore_non_valido_cade_sul_predefinito(valore: str, caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level("WARNING", logger="immagini.motore"):
        assert motore.disco_minimo_da_ambiente({"TAGM_DISCO_MINIMO_GB": valore}) == 6.0
    if valore.strip():
        assert "TAGM_DISCO_MINIMO_GB non valida" in caplog.text


def test_nome_vecchio_e_letto_come_ripiego() -> None:
    assert motore.disco_minimo_da_ambiente({"CANTASTORIE_DISCO_MINIMO_GB": "5"}) == 5.0


def test_nome_nuovo_vince_sul_vecchio() -> None:
    assert motore.disco_minimo_da_ambiente({"TAGM_DISCO_MINIMO_GB": "3", "CANTASTORIE_DISCO_MINIMO_GB": "9"}) == 3.0


def test_verifica_disco_usa_la_soglia_passata(tmp_path: Path) -> None:
    """Con soglia 0.5 e un disco che ha più spazio, non solleva; con soglia enorme, solleva."""
    motore.verifica_disco(tmp_path, minimo_gb=0.5)
    with pytest.raises(RuntimeError, match="minimo 1000000.0 GB"):
        motore.verifica_disco(tmp_path, minimo_gb=1_000_000.0)

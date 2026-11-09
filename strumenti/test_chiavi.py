"""Ordine di ricerca delle chiavi (strumenti/chiavi.py): ambiente → .env alla radice → file di ripiego.

Chiavi FINTE in una cartella temporanea; ambiente e .env sono passati esplicitamente, quindi il test
non dipende dalla macchina né dal .env vero.

    python3 -m pytest -q strumenti/test_chiavi.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from chiavi import ErroreChiave, cerca_chiave, lunghezza_sicura  # noqa: E402

NOME = "ANTHROPIC_API_KEY"


def test_ambiente_vince_su_tutto(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}=sk-finta-radice\n")
    vecchio = tmp_path / "vecchio.env"
    vecchio.write_text(f"{NOME}=sk-finta-vecchia\n")
    assert cerca_chiave(NOME, ambiente={NOME: "sk-finta-ambiente"}, file_env=radice, file_precedente=vecchio) == (
        "sk-finta-ambiente",
        "ambiente",
    )


def test_senza_ambiente_il_env_alla_radice(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"ALTRO=1\n{NOME}=sk-finta-radice\n")
    assert cerca_chiave(NOME, ambiente={}, file_env=radice) == ("sk-finta-radice", "env-radice")


def test_ripiego_se_niente_sopra(tmp_path: Path) -> None:
    vecchio = tmp_path / "vecchio.env"
    vecchio.write_text(f"{NOME}=sk-finta-vecchia\n")
    assert cerca_chiave(NOME, ambiente={}, file_env=tmp_path / "manca.env", file_precedente=vecchio) == (
        "sk-finta-vecchia",
        "file-precedente",
    )


def test_ambiente_vuoto_e_riga_vuota_non_valgono(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}=\n")
    vecchio = tmp_path / "vecchio.env"
    vecchio.write_text(f"{NOME}='sk-finta-vecchia'\n")
    assert cerca_chiave(NOME, ambiente={NOME: "  "}, file_env=radice, file_precedente=vecchio) == (
        "sk-finta-vecchia",
        "file-precedente",
    )


def test_chiavi_separate_per_nome(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}=sk-finta-ant\nOPENROUTER_API_KEY=sk-finta-or\n")
    assert cerca_chiave("OPENROUTER_API_KEY", ambiente={}, file_env=radice)[0] == "sk-finta-or"
    assert cerca_chiave(NOME, ambiente={}, file_env=radice)[0] == "sk-finta-ant"


def test_nessuna_fonte_errore_senza_valori(tmp_path: Path) -> None:
    with pytest.raises(ErroreChiave, match="non trovata") as info:
        cerca_chiave(NOME, ambiente={}, file_env=tmp_path / "manca.env")
    assert ".env.example" in str(info.value)


def test_due_righe_errore_senza_mostrare_il_contenuto(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}=sk-finta-uno\n{NOME}=sk-finta-due\n")
    with pytest.raises(ErroreChiave, match="più di una riga") as info:
        cerca_chiave(NOME, ambiente={}, file_env=radice)
    assert "sk-finta" not in str(info.value)


def test_log_mostra_solo_la_lunghezza() -> None:
    assert lunghezza_sicura("sk-abc") == "presente (6 caratteri)"
    assert lunghezza_sicura(None) == "assente"


def test_visione_usa_il_caricatore_comune(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """visione.leggi_chiave prende la chiave dall'ambiente del processo prima di ogni file."""
    sys.path.insert(0, str(Path(__file__).resolve().parent / "immagini"))
    import visione

    monkeypatch.setenv(NOME, "sk-finta-ambiente-visione")
    assert visione.leggi_chiave(tmp_path / "manca.env") == "sk-finta-ambiente-visione"

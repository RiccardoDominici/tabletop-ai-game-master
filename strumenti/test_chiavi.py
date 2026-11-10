"""Ordine di ricerca delle chiavi (strumenti/chiavi.py): ambiente → .env alla radice → file di ripiego.

Chiavi FINTE in una cartella temporanea; ambiente e .env sono passati esplicitamente, quindi il test
non dipende dalla macchina né dal .env vero. Le chiavi finte hanno la forma giusta (sk-ant-…, sk-or-…),
altrimenti la verifica di forma le scarterebbe.

    python3 -m pytest -q strumenti/test_chiavi.py
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))

from chiavi import ErroreChiave, cerca_chiave, forma_valida, lunghezza_sicura  # noqa: E402

NOME = "ANTHROPIC_API_KEY"
OR = "OPENROUTER_API_KEY"
FINTA_AMBIENTE = "sk-ant-finta-ambiente-0000000000"
FINTA_RADICE = "sk-ant-finta-radice-000000000000"
FINTA_VECCHIA = "sk-ant-finta-vecchia-000000000000"
FINTA_OR = "sk-or-finta-openrouter-0000000000"


def test_ambiente_vince_su_tutto(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}={FINTA_RADICE}\n")
    vecchio = tmp_path / "vecchio.env"
    vecchio.write_text(f"{NOME}={FINTA_VECCHIA}\n")
    assert cerca_chiave(NOME, ambiente={NOME: FINTA_AMBIENTE}, file_env=radice, file_precedente=vecchio) == (
        FINTA_AMBIENTE,
        "ambiente",
    )


def test_senza_ambiente_il_env_alla_radice(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"ALTRO=1\n{NOME}={FINTA_RADICE}\n")
    assert cerca_chiave(NOME, ambiente={}, file_env=radice) == (FINTA_RADICE, "env-radice")


def test_ripiego_se_niente_sopra(tmp_path: Path) -> None:
    vecchio = tmp_path / "vecchio.env"
    vecchio.write_text(f"{NOME}={FINTA_VECCHIA}\n")
    assert cerca_chiave(NOME, ambiente={}, file_env=tmp_path / "manca.env", file_precedente=vecchio) == (
        FINTA_VECCHIA,
        "file-precedente",
    )


def test_ambiente_vuoto_e_riga_vuota_non_valgono(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}=\n")
    vecchio = tmp_path / "vecchio.env"
    vecchio.write_text(f"{NOME}='{FINTA_VECCHIA}'\n")
    assert cerca_chiave(NOME, ambiente={NOME: "  "}, file_env=radice, file_precedente=vecchio) == (
        FINTA_VECCHIA,
        "file-precedente",
    )


def test_chiavi_separate_per_nome(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}={FINTA_RADICE}\n{OR}={FINTA_OR}\n")
    assert cerca_chiave(OR, ambiente={}, file_env=radice)[0] == FINTA_OR
    assert cerca_chiave(NOME, ambiente={}, file_env=radice)[0] == FINTA_RADICE


def test_nessuna_fonte_errore_senza_valori(tmp_path: Path) -> None:
    with pytest.raises(ErroreChiave, match="non trovata") as info:
        cerca_chiave(NOME, ambiente={}, file_env=tmp_path / "manca.env")
    assert ".env.example" in str(info.value)


def test_due_righe_errore_senza_mostrare_il_contenuto(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}={FINTA_RADICE}\n{NOME}={FINTA_VECCHIA}\n")
    with pytest.raises(ErroreChiave, match="più di una riga") as info:
        cerca_chiave(NOME, ambiente={}, file_env=radice)
    assert "sk-ant-finta" not in str(info.value)


def test_log_mostra_solo_la_lunghezza() -> None:
    assert lunghezza_sicura("sk-abc") == "presente (6 caratteri)"
    assert lunghezza_sicura(None) == "assente"


# --- verifica di forma: un segnaposto non è una chiave -----------------------------------------------


@pytest.mark.parametrize(
    "nome, valore, atteso",
    [
        (NOME, FINTA_AMBIENTE, True),
        (NOME, "your-key-here", False),          # segnaposto senza prefisso
        (NOME, "sk-ant-x", False),               # prefisso giusto ma troppo corto
        (NOME, "sk-or-" + "a" * 30, False),      # chiave di un altro provider
        (OR, FINTA_OR, True),
        (OR, FINTA_AMBIENTE, False),             # chiave Anthropic messa nel posto di OpenRouter
        ("FREESOUND_API_KEY", "qualunque", True),  # nome senza forma nota: non si controlla
    ],
)
def test_forma_valida(nome: str, valore: str, atteso: bool) -> None:
    assert forma_valida(nome, valore) is atteso


def test_segnaposto_nell_ambiente_si_scarta_e_passa_al_env(tmp_path: Path, caplog: pytest.LogCaptureFixture) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}={FINTA_RADICE}\n")
    with caplog.at_level(logging.WARNING, logger="chiavi"):
        valore, origine = cerca_chiave(NOME, ambiente={NOME: "placeholder-non-una-chiave"}, file_env=radice)
    assert (valore, origine) == (FINTA_RADICE, "env-radice")
    avvisi = "\n".join(r.getMessage() for r in caplog.records)
    assert "ambiente" in avvisi and "scartata" in avvisi
    assert "placeholder" not in avvisi  # il valore non finisce mai nei log


def test_scarto_di_piu_fonti_errore_che_le_nomina_senza_valori(tmp_path: Path) -> None:
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}=sk-ant-corta\n")
    vecchio = tmp_path / "vecchio.env"
    vecchio.write_text(f"{NOME}=segnaposto-segreto-da-non-mostrare\n")
    with pytest.raises(ErroreChiave, match="Scartate") as info:
        cerca_chiave(NOME, ambiente={NOME: "x"}, file_env=radice, file_precedente=vecchio)
    messaggio = str(info.value)
    assert "ambiente" in messaggio and "env-radice" in messaggio and "file-precedente" in messaggio
    assert "segnaposto-segreto" not in messaggio and "sk-ant-corta" not in messaggio


def test_file_non_letto_se_l_ambiente_ha_gia_una_chiave_valida(tmp_path: Path) -> None:
    """Prima della verifica di forma l'ambiente vinceva senza leggere i file: resta così."""
    radice = tmp_path / "radice.env"
    radice.write_text(f"{NOME}={FINTA_RADICE}\n{NOME}={FINTA_VECCHIA}\n")  # due righe: darebbe errore
    assert cerca_chiave(NOME, ambiente={NOME: FINTA_AMBIENTE}, file_env=radice) == (FINTA_AMBIENTE, "ambiente")


def test_visione_usa_il_caricatore_comune(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """visione.leggi_chiave prende la chiave dall'ambiente del processo prima di ogni file."""
    sys.path.insert(0, str(Path(__file__).resolve().parent / "immagini"))
    import visione

    monkeypatch.setenv(NOME, FINTA_AMBIENTE)
    assert visione.leggi_chiave(tmp_path / "manca.env") == FINTA_AMBIENTE

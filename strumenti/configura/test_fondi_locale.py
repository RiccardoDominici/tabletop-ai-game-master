"""Fusione di config/locale.yaml: le chiavi non gestite (lingua, commenti del file) non si perdono.

    python3 -m pytest -q strumenti/configura/test_fondi_locale.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fondi_locale import fondi, scrivi  # noqa: E402

VOCE_OPENROUTER = {"provider": "openrouter", "riserve": ["locale"]}
LETTORE_LOCALE = {"provider": "locale", "riserve": ["finto"]}


def test_lingua_sopravvive_a_un_cambio_di_voce(tmp_path: Path) -> None:
    file = tmp_path / "locale.yaml"
    file.write_text("lingua: en\ncomponenti:\n  lettore: {provider: locale}\n", encoding="utf-8")
    scrivi(file, {"componenti": {"voce": VOCE_OPENROUTER}}, adesso="t")
    letto = yaml.safe_load(file.read_text(encoding="utf-8"))
    assert letto["lingua"] == "en"
    assert letto["componenti"]["voce"] == VOCE_OPENROUTER
    assert letto["componenti"]["lettore"] == {"provider": "locale"}


def test_chiave_sconosciuta_resta(tmp_path: Path) -> None:
    file = tmp_path / "locale.yaml"
    file.write_text("altra_chiave:\n  x: 1\n", encoding="utf-8")
    scrivi(file, {"componenti": {"lettore": LETTORE_LOCALE}}, adesso="t")
    letto = yaml.safe_load(file.read_text(encoding="utf-8"))
    assert letto["altra_chiave"] == {"x": 1}


def test_stesso_componente_viene_sostituito() -> None:
    risultato = fondi({"componenti": {"voce": {"provider": "locale"}}}, {"componenti": {"voce": VOCE_OPENROUTER}})
    assert risultato["componenti"]["voce"] == VOCE_OPENROUTER


def test_tutto_locale_toglie_solo_le_scelte(tmp_path: Path) -> None:
    file = tmp_path / "locale.yaml"
    file.write_text("lingua: it\nbackend:\n  locale:\n    modello: x\n    url: http://a\n    avvio: no\n"
                    "componenti:\n  voce: {provider: openrouter}\n", encoding="utf-8")
    scrivi(file, {"rimuovi_tutto": True}, adesso="t")
    assert yaml.safe_load(file.read_text(encoding="utf-8")) == {"lingua": "it"}


def test_tutto_locale_senza_altro_toglie_il_file(tmp_path: Path) -> None:
    file = tmp_path / "locale.yaml"
    file.write_text("componenti:\n  voce: {provider: finto}\n", encoding="utf-8")
    scrivi(file, {"rimuovi_tutto": True}, adesso="t")
    assert not file.exists()


def test_backend_locale_si_aggiorna_senza_toccare_il_resto() -> None:
    risultato = fondi({"backend": {"openrouter": {"strutturato": True}}},
                      {"backend_locale": {"url": "http://127.0.0.1:9/v1", "avvio": "no"}})
    assert risultato["backend"]["openrouter"] == {"strutturato": True}
    assert risultato["backend"]["locale"] == {"url": "http://127.0.0.1:9/v1", "avvio": "no"}


def test_file_che_non_e_una_mappa_non_viene_toccato(tmp_path: Path) -> None:
    file = tmp_path / "locale.yaml"
    file.write_text("- uno\n- due\n", encoding="utf-8")
    try:
        scrivi(file, {"componenti": {"voce": VOCE_OPENROUTER}}, adesso="t")
    except ValueError:
        pass
    else:
        raise AssertionError("doveva rifiutare")
    assert file.read_text(encoding="utf-8") == "- uno\n- due\n"


def test_intestazione_e_scritta(tmp_path: Path) -> None:
    file = tmp_path / "locale.yaml"
    scrivi(file, {"componenti": {"voce": VOCE_OPENROUTER}}, adesso="2026-11-11 10:00")
    testo = file.read_text(encoding="utf-8")
    assert testo.startswith("# Scelte di questo computer, scritte o aggiornate da scripts/configura.sh il 2026-11-11 10:00")
    assert "sk-" not in testo


def test_avvio_no_resta_stringa(tmp_path: Path) -> None:
    file = tmp_path / "locale.yaml"
    file.write_text("backend:\n  locale:\n    avvio: no\n", encoding="utf-8")
    scrivi(file, {"componenti": {"voce": VOCE_OPENROUTER}}, adesso="t")
    letto = yaml.load(file.read_text(encoding="utf-8"), Loader=yaml.SafeLoader)
    assert letto["backend"]["locale"]["avvio"] == "no"

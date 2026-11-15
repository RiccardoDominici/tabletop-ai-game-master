"""Lettura di config/locale.yaml (solo la sezione componenti e backend.locale.modello), su testi finti.

    python3 -m pytest -q strumenti/configura/test_scelte_locali.py
"""

from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import scelte_locali  # noqa: E402

FORMA_DI_CONFIGURA = """\
# Scelte di questo computer, scritte da configura.py. Non tracciato.
# Vale ciò che è scritto qui.
backend:
  locale:
    # Lettore più piccolo per questo Mac (sotto 16 GB).
    modello: mlx-community/Qwen3-4B-Instruct-2507-4bit
lingua: en
componenti:
  # FLUX.2 klein 4 bit generates the scene images on this Mac.
  immagini: {provider: nessuno}
  lettore: {provider: anthropic, riserve: [locale, finto]}
  voce: {provider: locale, riserve: ["finto"]}
"""


def test_legge_componenti_e_modello_del_lettore() -> None:
    scelte = scelte_locali.leggi_testo(FORMA_DI_CONFIGURA)
    assert scelte["componenti"] == {
        "immagini": {"provider": "nessuno", "riserve": []},
        "lettore": {"provider": "anthropic", "riserve": ["locale", "finto"]},
        "voce": {"provider": "locale", "riserve": ["finto"]},
    }
    assert scelte["modello_lettore"] == "mlx-community/Qwen3-4B-Instruct-2507-4bit"
    assert scelte["non_lette"] == []


def test_lingua_e_commenti_non_sono_scelte_sconosciute() -> None:
    scelte = scelte_locali.leggi_testo("lingua: it\n# nulla\ncomponenti:\n  regole: {provider: regole}\n")
    assert scelte["non_lette"] == []
    assert list(scelte["componenti"]) == ["regole"]


def test_nome_sconosciuto_o_senza_provider_non_viene_usato() -> None:
    testo = "componenti:\n  fantasma: {provider: nessuno}\n  immagini: {riserve: [locale]}\n"
    scelte = scelte_locali.leggi_testo(testo)
    assert scelte["componenti"] == {}
    assert len(scelte["non_lette"]) == 2  # elencati, non scartati in silenzio


def test_forma_a_blocchi_non_letta_ma_segnalata() -> None:
    testo = "componenti:\n  immagini:\n    provider: nessuno\n"
    scelte = scelte_locali.leggi_testo(testo)
    assert scelte["componenti"] == {}
    assert scelte["non_lette"] == ["line 2: immagini:", "line 3: provider: nessuno"]


def test_file_assente_da_none(tmp_path: Path) -> None:
    assert scelte_locali.leggi(tmp_path / "non-esiste.yaml") is None


def test_file_letto_dal_disco(tmp_path: Path) -> None:
    file = tmp_path / "locale.yaml"
    file.write_text("componenti:\n  ascolto: {provider: nessuno}\n", encoding="utf-8")
    scelte = scelte_locali.leggi(file, origine="x.yaml")
    assert scelte["origine"] == "x.yaml"
    assert scelte["componenti"]["ascolto"]["provider"] == "nessuno"

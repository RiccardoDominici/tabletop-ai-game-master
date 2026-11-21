"""Basic Fantasy's bestiary in torre-mozza's set (campagne/torre-mozza/regole/mostri.yaml) against the manual's PDF:
every stat block of pp. 63-162 has an entry and every entry a block, with the same numbers (confronta_bestiario.py,
reading the blocks by position with blocchi_mostri.py). The PDF is not in the repository (manuali/ is ignored): without
it, or without PyMuPDF, the test skips.

    python3 -m pytest -q strumenti/regole/test_bestiario_bf.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

QUI = Path(__file__).resolve().parent
RADICE = QUI.parent.parent
sys.path.insert(0, str(QUI))

PDF = RADICE / "manuali" / "basic-fantasy-rpg-r142.pdf"
MOSTRI = RADICE / "campagne" / "torre-mozza" / "regole" / "mostri.yaml"

pytest.importorskip("fitz")
if not PDF.exists():
    pytest.skip("manuali/basic-fantasy-rpg-r142.pdf is not here (it never is in git)", allow_module_level=True)

import blocchi_mostri as B  # noqa: E402
import confronta_bestiario as C  # noqa: E402


def test_ogni_blocco_ha_la_sua_voce_e_gli_stessi_numeri() -> None:
    voci = yaml.safe_load(MOSTRI.read_text(encoding="utf-8"))["mostri"]
    blocchi = B.leggi(PDF, 67, 166)
    assert len(blocchi) == 259
    assert C.confronta(voci, blocchi) == []

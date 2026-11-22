"""R6's other rows of torre-mozza's set against Basic Fantasy's PDF: locked doors and metal bars (p. 43), the Game
Master's morale adjustment (p. 57), waking someone knocked out (p. 55). The sentence that gives each number, and the set's
data that carries it. Skipped without the PDF (manuali/ is not in git) or without `pdftotext`.

    python3 -m pytest -q strumenti/regole/test_varie_bf.py
"""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml

RADICE = Path(__file__).resolve().parents[2]
PDF = RADICE / "manuali" / "basic-fantasy-rpg-r142.pdf"
SET = RADICE / "campagne" / "torre-mozza" / "regole" / "regole.yaml"

if not PDF.exists():
    pytest.skip("manuali/basic-fantasy-rpg-r142.pdf is not here (it never is in git)", allow_module_level=True)
if not shutil.which("pdftotext"):
    pytest.skip("pdftotext is not installed", allow_module_level=True)

R = yaml.safe_load(SET.read_text(encoding="utf-8"))
ABILITA = {a["id"]: a for a in R["abilita"]}


def frasi(stampata: int) -> str:
    n = stampata + 4
    return re.sub(r"\s+", " ", subprocess.run(["pdftotext", "-f", str(n), "-l", str(n), str(PDF), "-"], capture_output=True, text=True, check=True).stdout)


def test_porte_chiuse_a_chiave_e_sbarre_p43() -> None:
    t = frasi(43)
    assert "Locked doors can be forced by rolling the same range, but on 1d10" in t
    assert "Metal bars can sometimes be bent on a roll of this range on 1d20" in t
    assert ABILITA["sfondare"]["soglia"] == {"dado": 10, "come": "forzare"}
    assert ABILITA["piegare_sbarre"]["soglia"] == {"dado": 20, "come": "forzare"}


def test_aggiustamento_del_morale_p57() -> None:
    t = frasi(57)
    assert "adjustments should not total more than +2 or -2" in t and "No adjustment is ever applied to a Morale score of 12" in t
    assert R["combattimento"]["fine"]["morale"]["aggiustamento"] == 2


def test_svegliare_chi_e_tramortito_p55() -> None:
    t = frasi(55)
    assert "will wake up with 1 hit point in 1d4 turns, or can be awakened (with 1 hit point) by someone else after 2d10 rounds" in t
    nl = R["combattimento"]["non_letale"]
    assert nl["sveglia"] == {"turno": "1d4"} and nl["svegliare"]["dopo"] == {"round": "2d10"}

"""The roll numbers of torre-mozza's set against Basic Fantasy's PDF (rules-engine package R5: «a table test per kind
against the PDF»). Each table is read from the printed page with `pdftotext -layout` and compared with the set:

- the ability score bonuses (p. 4) → `modificatore.tabella`;
- the Ability Rolls target by level (p. 189) → `difficolta_per_livello`;
- the monster reaction table (p. 50) and the retainer's answer to an offer (p. 46) → `reazioni`;
- the starting money (p. 3), surprise (p. 50), initiative (p. 51), stuck doors and listening (p. 43), secret doors (p. 44),
  morale (p. 57): the sentence that gives the number, and the set's data that carries it.

The PDF is not in the repository (manuali/ is ignored): without it, or without `pdftotext`, the test skips.

    python3 -m pytest -q strumenti/regole/test_tiri_bf.py
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
SCARTO = 4  # PDF page = printed page + 4

if not PDF.exists():
    pytest.skip("manuali/basic-fantasy-rpg-r142.pdf is not here (it never is in git)", allow_module_level=True)
if not shutil.which("pdftotext"):
    pytest.skip("pdftotext is not installed", allow_module_level=True)

R = yaml.safe_load(SET.read_text(encoding="utf-8"))


def pagina(stampata: int) -> str:
    """The printed page's text, with its layout (two columns side by side)."""
    n = stampata + SCARTO
    return subprocess.run(["pdftotext", "-f", str(n), "-l", str(n), "-layout", str(PDF), "-"], capture_output=True, text=True, check=True).stdout


def piatto(testo: str) -> str:
    return re.sub(r"\s+", " ", testo)


def frasi(stampata: int) -> str:
    """The printed page read column by column (no layout), on one line: for the sentences that give a number."""
    n = stampata + SCARTO
    return piatto(subprocess.run(["pdftotext", "-f", str(n), "-l", str(n), str(PDF), "-"], capture_output=True, text=True, check=True).stdout)


def test_bonus_delle_caratteristiche_p4() -> None:
    righe = re.findall(r"(?<!\S)(\d+)(?:-(\d+))?\s{3,}([+-]\d+|0)(?!\S)", pagina(4))
    letto = [(int(a), int(m)) for a, _, m in righe if 3 <= int(a) <= 18]
    assert letto == [(3, -3), (4, -2), (6, -1), (9, 0), (13, 1), (16, 2), (18, 3)]
    assert [(x["da"], x["mod"]) for x in R["modificatore"]["tabella"]] == letto


def test_target_delle_prove_di_caratteristica_p189() -> None:
    righe = re.findall(r"(NM or 1|\d+(?:-\d+)?)\s{3,}(\d+)\s*$", pagina(189), flags=re.M)
    letto = [(0 if a == "NM or 1" else int(a.split("-")[0]), int(t)) for a, t in righe]
    assert len(letto) == 11 and letto[0] == (0, 17) and letto[-1] == (20, 7)
    assert [(x["da"], x["valore"]) for x in R["difficolta_per_livello"]] == letto


def _fasce(testo: str, voci: list[str]) -> list[tuple[int | None, str]]:
    """The bands of a 2d6 table: «2 or less», «3-7», «12 or more» followed by its result, in the page's order."""
    out = []
    for m in re.finditer(r"(?<!\S)(\d+ or less|\d+-\d+|\d+ or more)\s{3,}(" + "|".join(re.escape(v) for v in voci) + r")", testo):
        limite, nome = m.group(1), m.group(2)
        out.append((None if "more" in limite else int(re.findall(r"\d+", limite)[-1]), nome))
    return out


def test_reazione_dei_mostri_p50() -> None:
    letto = _fasce(pagina(50), ["Immediate Attack", "Unfavorable", "Favorable", "Very Favorable"])
    # «3-7 Unfavorable» and «8-11 Favorable» sit next to the surprise text in the other column: found all the same.
    assert letto == [(2, "Immediate Attack"), (7, "Unfavorable"), (11, "Favorable"), (None, "Very Favorable")]
    t = next(x for x in R["reazioni"] if x["id"] == "reazione")
    assert t["dadi"] == "2d6" and t["caratteristica"] == "carisma"
    assert [f["fino_a"] for f in t["fasce"]] == [a for a, _ in letto]
    assert [f.get("atteggiamento") for f in t["fasce"]] == ["ostile", "ostile", "indifferente", "amichevole"]
    assert "The Game Master rolls 2d6, adding the Charisma bonus" in frasi(50)


def test_assumere_un_gregario_p46() -> None:
    letto = _fasce(pagina(46), ["Refusal, -1 on further rolls", "Refusal", "Try again", "Acceptance, +1 to Loyalty", "Acceptance"])
    assert letto == [(2, "Refusal, -1 on further rolls"), (5, "Refusal"), (8, "Try again"), (11, "Acceptance"), (None, "Acceptance, +1 to Loyalty")]
    t = next(x for x in R["reazioni"] if x["id"] == "assunzione")
    assert t["dadi"] == "2d6" and t["caratteristica"] == "carisma"
    assert [f["fino_a"] for f in t["fasce"]] == [a for a, _ in letto]


def test_le_frasi_che_danno_i_numeri() -> None:
    """The rolls whose number is a sentence, not a table: the sentence is there, and so is the set's data."""
    abilita = {a["id"]: a for a in R["abilita"]}
    # p. 3: «3d6 times 10 gold pieces».
    assert "3d6 times 10 gold pieces" in frasi(3)
    assert R["creazione"]["monete"] == {"dadi": "3d6", "per": 10, "moneta": "mo"}
    # p. 50: «most normal characters are surprised on a roll of 1-2»; elves one less.
    p50 = frasi(50)
    assert "surprised on a roll of 1-2" in p50 and "reduce the range by 1" in p50
    assert R["combattimento"]["sorpresa"]["dado"] == 6 and R["combattimento"]["sorpresa"]["fino_a"] == 2
    assert {"sorpresa": -1} in next(x for x in R["razze"] if x["id"] == "elfo")["tratti"]
    # p. 51: initiative 1d6 + the Dexterity bonus, every round.
    assert "Each combat round, 1d6 is rolled for Initiative for each character or monster. This roll is adjusted by the character's Dexterity bonus" in frasi(51)
    ini = R["combattimento"]["iniziativa"]
    assert (ini["dado"], ini["caratteristica"], ini["ogni_round"]) == (6, "destrezza", True)
    # p. 43: a stuck door on 1 + the Strength bonus; listening 1 on 1d6 for a non-thief.
    p43 = frasi(43)
    assert "A stuck door can be opened on a roll of 1 on 1d6; add the character's Strength bonus to the range" in p43
    assert abilita["forzare"]["soglia"] == {"dado": 6, "predefinita": 1, "piu": [{"caratteristica": "forza"}]}
    assert "the GM rolls 1d6, with 1 indicating success" in p43
    assert abilita["ascoltare"]["soglia"]["senza"] == {"dado": 6, "valore": 1} and abilita["ascoltare"]["segreta"] == "niente"
    # p. 44: a secret door on 1 on 1d6, 1-2 with Intelligence 15, elves one more.
    p44 = frasi(44)
    assert "A secret door is found on a roll of 1 on 1d6; characters with 15 or higher Intelligence succeed on a roll of 1-2" in p44
    assert abilita["cercare"]["soglia"]["piu"] == [{"caratteristica": "intelligenza", "da": 15, "valore": 1}]
    assert {"tiro": "abilita", "abilita": ["cercare"], "bonus": 1} in next(x for x in R["razze"] if x["id"] == "elfo")["tratti"]
    # p. 57: morale on 2d6, a 12 never fails.
    assert "To make a Morale check, roll 2d6; if the roll is equal to or less than the Morale score" in frasi(57)
    assert R["combattimento"]["fine"]["morale"]["quando"] == ["prima_opposizione", "meta"]

"""The encounter tables of torre-mozza's set against Basic Fantasy's PDF (rules-engine package R6: «Basic Fantasy's
encounter tables into torre-mozza's set, checked against the PDF by a table test»).

Each printed table (p. 180 dungeon levels, pp. 181–182 wilderness terrains, p. 182 the city's day and night) is read
from the page with `pdftotext -layout`, cut into its columns by the header's positions, and compared roll by roll with
`campagne/torre-mozza/regole/incontri.yaml`:

- every roll of the table's dice has one entry, and its `manuale` is the printed cell (asterisks and parentheses kept);
- an entry with `mostro` names an entry of the bestiary (regole/mostri.yaml) whose printed name starts with the same
  creature (the «see Unicorn» cells: the creature pointed to), and its `numero` is the bestiary's «No. Appearing» by the
  rule the file states: in a dungeon the first formula, in the wilderness the «Wild» one (when the block has it);
- the environments of `esplorazione` in regole.yaml carry the pages' checks (1 on 1d6 every 3 turns, every 4 hours);
- the rest of the exploration chapter: dungeon survival (p. 44: a day's rations and a quart of water, two harmless days
  without food then 1 a day, water 1d4 from the first day, no natural healing) and the wilderness (p. 45: the terrain
  table, getting lost by the leader's save vs. Death Ray with Wisdom) against `esplorazione.provviste` and `viaggio`.

The PDF is not in the repository (manuali/ is ignored): without it, or without `pdftotext`, the test skips.

    python3 -m pytest -q strumenti/regole/test_incontri_bf.py
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
CARTELLA = RADICE / "campagne" / "torre-mozza" / "regole"
SCARTO = 4  # PDF page = printed page + 4

if not PDF.exists():
    pytest.skip("manuali/basic-fantasy-rpg-r142.pdf is not here (it never is in git)", allow_module_level=True)
if not shutil.which("pdftotext"):
    pytest.skip("pdftotext is not installed", allow_module_level=True)

TABELLE = {t["id"]: t for t in yaml.safe_load((CARTELLA / "incontri.yaml").read_text(encoding="utf-8"))["incontri"]}
MOSTRI = {m["id"]: m for m in yaml.safe_load((CARTELLA / "mostri.yaml").read_text(encoding="utf-8"))["mostri"]}
SET = yaml.safe_load((CARTELLA / "regole.yaml").read_text(encoding="utf-8"))


def pagina(stampata: int) -> list[str]:
    n = stampata + SCARTO
    return subprocess.run(["pdftotext", "-f", str(n), "-l", str(n), "-layout", str(PDF), "-"], capture_output=True, text=True, check=True).stdout.splitlines()


def frasi(stampata: int) -> str:
    """The printed page read column by column (no layout), on one line: for the sentences that give a number."""
    n = stampata + SCARTO
    return piatto(subprocess.run(["pdftotext", "-f", str(n), "-l", str(n), str(PDF), "-"], capture_output=True, text=True, check=True).stdout)


def blocco(righe: list[str], intestazione: str, colonne: list[str]) -> dict[str, dict[int, str]]:
    """The table under the header line that has `intestazione` and the `colonne` titles: roll → cell, per column. A line
    without a roll number continues the cells of the row above (the Roc's «1d6: 1-3 Large, 4-5 Huge, 6 Giant»)."""
    i = next(k for k, r in enumerate(righe) if intestazione in r and all(c in r for c in colonne))
    inizi = [righe[i].index(c) for c in colonne]
    out: dict[str, dict[int, str]] = {c: {} for c in colonne}
    ultimo: int | None = None
    for r in righe[i + 1:]:
        if not r.strip():
            continue
        if re.fullmatch(r"\s*\d+\s*", r):
            break  # the page number under the table
        m = re.match(r"^\s*(\d+)\s", r)
        celle = [r[max(0, a - 2):(inizi[j + 1] - 2 if j + 1 < len(inizi) else None)].strip() for j, a in enumerate(inizi)]
        if m and int(m.group(1)) <= 20 and r[:inizi[0] - 2].strip() == m.group(1):
            ultimo = int(m.group(1))
            for c, x in zip(colonne, celle):
                out[c][ultimo] = x
        elif ultimo is not None and re.match(r"^\s{20,}\S", r):
            for c, x in zip(colonne, celle):
                if x:
                    out[c][ultimo] = f"{out[c][ultimo]} {x}".strip()
        else:
            break
    return out


def piatto(t: str) -> str:
    return re.sub(r"\s+", " ", t).strip()


P180 = pagina(180)
P181 = pagina(181)
P182 = pagina(182)
STAMPATE = {
    **{f"sotterraneo_{k}": v for k, v in zip(["1", "2", "3"], blocco(P180, "Roll 1d12", ["Level 1", "Level 2", "Level 3"]).values())},
    **{f"sotterraneo_{k}": v for k, v in zip(["4_5", "6_7", "8"], blocco(P180, "Roll 1d12", ["Level 4-5", "Level 6-7", "Level 8+"]).values())},
    **dict(zip(["selvaggio_deserto", "selvaggio_prateria", "selvaggio_abitato"], blocco(P181, "Roll 2d8", ["Desert or Barren", "Grassland", "Inhabited Territories"]).values())),
    **dict(zip(["selvaggio_giungla", "selvaggio_montagna", "selvaggio_oceano"], blocco(P181, "Roll 2d8", ["Jungle", "Mountains or Hills", "Ocean"]).values())),
    **dict(zip(["selvaggio_fiume", "selvaggio_palude", "selvaggio_bosco"], blocco(P182, "Roll 2d8", ["River or Riverside", "Swamp", "Woods or Forest"]).values())),
    **dict(zip(["citta_giorno", "citta_notte"], blocco(P182, "Die Roll", ["Day Encounter", "Night Encounter"]).values())),
}


def test_ogni_tabella_stampata_e_nel_set() -> None:
    assert sorted(STAMPATE) == sorted(TABELLE)
    attese = {"1d12": range(1, 13), "2d8": range(2, 17), "2d6": range(2, 13)}
    for id_, stampata in STAMPATE.items():
        t = TABELLE[id_]
        assert sorted(stampata) == list(attese[t["dadi"]]), (id_, sorted(stampata))


@pytest.mark.parametrize("id_", sorted(TABELLE))
def test_ogni_cella_come_stampata(id_: str) -> None:
    stampata = STAMPATE[id_]
    voci = {v["tiro"]: v for v in TABELLE[id_]["voci"]}
    diversi = [(n, piatto(stampata[n]), voci[n].get("manuale")) for n in stampata if piatto(stampata[n]) != voci.get(n, {}).get("manuale")]
    assert not diversi, diversi


def _creatura(cella: str) -> str:
    """The creature a printed cell names: the «(see X)» it points to, else the name without its asterisk or note."""
    m = re.search(r"\(see ([^)]+)\)", cella)
    nome = m.group(1) if m else re.sub(r"\s*\(.*$", "", cella)
    return nome.replace("*", "").strip().lower()


def _numero(testo: str, selvaggio: bool) -> str | None:
    """The bestiary's «No. Appearing» by the file's rule: the first formula (dungeon), the «Wild» one (wilderness)."""
    if selvaggio:
        m = re.search(r"Wild (\d+d\d+(?:[+-]\d+)?|\d+)", testo)
    else:
        m = re.match(r"\s*(\d+d\d+(?:[+-]\d+)?|\d+)\b", testo)
    return m.group(1) if m else None


def test_ogni_mostro_e_del_bestiario_e_quanti_come_il_blocco() -> None:
    sbagliati = []
    senza_regola = []
    for id_, t in TABELLE.items():
        selvaggio = id_.startswith("selvaggio_")
        for v in t["voci"]:
            for c in [v] if "mostro" in v else (v.get("scelta") or {}).get("voci", []):
                m = MOSTRI.get(c["mostro"])
                assert m, (id_, v["tiro"], c["mostro"])
                primo = re.split(r"[ ,]", _creatura(v["manuale"]))[0]
                # The bestiary's printed name holds the creature (a Roc's columns, a variant's «Group | Column»).
                if primo not in m["manuale"].lower():
                    sbagliati.append((id_, v["tiro"], v["manuale"], c["mostro"], m["manuale"]))
                if id_.startswith("citta_"):
                    continue
                atteso = _numero(str(m.get("numero", "")), selvaggio)
                if atteso is None:
                    senza_regola.append((id_, v["tiro"], c["mostro"], m.get("numero"), c.get("numero")))
                elif str(c.get("numero")) != atteso:
                    sbagliati.append((id_, v["tiro"], c["mostro"], m.get("numero"), c.get("numero"), atteso))
    assert not sbagliati, sbagliati
    # Blocks whose «No. Appearing» has no part for that environment (a «Wild»-only creature underground, a lair-only
    # one outdoors): the file takes the other formula the block prints. They are listed here so a change shows up.
    assert len(senza_regola) <= 6, senza_regola


def test_i_gruppi_senza_blocco_non_hanno_mostro() -> None:
    for t in TABELLE.values():
        for v in t["voci"]:
            if v["manuale"].startswith("NPC Party"):
                assert "gruppo" in v and "mostro" not in v, v


def test_i_controlli_delle_pagine_180_181() -> None:
    testo = piatto(" ".join(P180))
    assert "a wandering monster encounter will occur on a roll of 1 on 1d6; the Game Master should check once every 3 turns" in testo
    testo181 = piatto(" ".join(P181))
    assert "about every four hours of game time" in testo181 and "roll 1d6; on a roll of 1, an encounter occurs" in testo181
    amb = {a["id"]: a for a in SET["esplorazione"]["ambienti"]}
    assert amb["sotterraneo"]["controllo"] == {"ogni": {"turno": 3}, "dado": 6, "fino_a": 1}
    assert amb["selvaggio"]["controllo"] == {"ogni": {"ora": 4}, "dado": 6, "fino_a": 1}
    assert [(r["da"], r["tabella"]) for r in amb["sotterraneo"]["tabelle"]] == [(1, "sotterraneo_1"), (2, "sotterraneo_2"), (3, "sotterraneo_3"), (4, "sotterraneo_4_5"), (6, "sotterraneo_6_7"), (8, "sotterraneo_8")]


def test_sopravvivenza_p44() -> None:
    t = frasi(44)
    assert "consume one day's worth of rations (or equivalent food) and at least one quart of water per day" in t
    assert "does not significantly affect a character for the first two days, after which they suffer 1 point of damage per day" in t
    assert "loses the ability to heal wounds normally" in t
    assert "after a single day without adequate water, the character loses 1d4 hit points" in t
    assert "Healing ability is lost when the first die of damage is rolled" in t
    p = {x["id"]: x for x in SET["esplorazione"]["provviste"]}
    assert p["cibo"]["senza"] == {"dopo": 2, "danno": "1", "guarigione": False}
    assert p["acqua"]["senza"] == {"dopo": 0, "danno": "1d4", "guarigione": False}
    # A week's pack of dry rations (p. 12), a waterskin holds one quart, «the minimum amount required … in a single day».
    t12 = frasi(12)
    assert "sufficient for one character for a week" in t12 and "one quart of liquid, which is the minimum amount required by a normal character in a single day" in t12
    assert p["cibo"]["oggetti"] == [{"id": "razioni", "giorni": 7}] and p["acqua"]["oggetti"] == [{"id": "otre", "giorni": 1}]


def test_terreni_e_smarrirsi_p45() -> None:
    t = piatto(" ".join(pagina(45)))
    for riga in ("Jungle, Mountains, Swamp x1/3", "Desert, Forest, Hills x2/3", "Clear, Plains, Trail x1", "Road (Paved) x1 1/3"):
        assert riga in t, riga
    per = {x["id"]: x["per"] for x in SET["viaggio"]["terreni"]}
    assert [per[k] for k in ("giungla", "montagna", "palude")] == [0.333] * 3
    assert [per[k] for k in ("deserto", "foresta", "colline")] == [0.667] * 3
    assert [per[k] for k in ("aperto", "pianura", "sentiero")] == [1] * 3 and per["strada"] == 1.333
    f = frasi(45)
    assert "Secretly roll a save vs. Death Ray, adjusted by the Wisdom of the party leader" in f
    assert SET["viaggio"]["smarrirsi"] == {"abilita": "ts_morte_saggezza"}
    ab = {a["id"]: a for a in SET["abilita"]}
    assert ab["ts_morte_saggezza"]["caratteristica"] == "saggezza" and ab["ts_morte_saggezza"]["salvezza"] == "morte"
    # Roads, rivers and trails: «unlikely to become lost»; the rest of the terrains are trackless.
    assert "following roads, rivers, or other obvious landmarks are unlikely to become lost" in f
    persi = {x["id"] for x in SET["viaggio"]["terreni"] if x.get("smarrirsi")}
    assert persi == {"giungla", "montagna", "palude", "deserto", "foresta", "colline", "aperto", "pianura"}


def test_luce_e_scurovisione_p5_p43() -> None:
    f43 = frasi(43)
    assert "A torch or lantern will provide light covering a 30' radius; dim light will extend about 20' further" in f43
    assert "if not given for a particular creature, assume the 60' range" in f43
    assert "Darkvision is totally ineffective in any light greater than moonlight" in f43
    f5 = frasi(5)
    assert f5.count("Darkvision (see page 43) with a 60' range") == 2  # dwarves and elves
    razze = {x["id"]: x for x in SET["razze"]}
    for r in ("nano", "elfo"):
        assert {"scurovisione": 18} in razze[r]["tratti"], r  # 60' = 18 m (the set's metres: feet × 0.3)
    for r in ("umano", "halfling"):
        assert not any("scurovisione" in t for t in razze[r]["tratti"]), r
    assert SET["bestiario"]["scurovisione"] == 18


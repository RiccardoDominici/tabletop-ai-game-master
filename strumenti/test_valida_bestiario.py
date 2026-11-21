"""The bestiary in the validator (strumenti/valida/regole_bestiario.py), on a copy of the Engine's tana fixture
(apps/server/test/fixtures/campagne/tana: an invented set with a bestiary inline and in regole/mostri.yaml).

    python3 -m pytest -q strumenti/test_valida_bestiario.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from test_valida_regole import copia, modifica, regole_di  # noqa: E402
from valida import regole_bestiario as rb  # noqa: E402

TANA = QUI.parent / "apps" / "server" / "test" / "fixtures" / "campagne" / "tana"


def test_il_bestiario_della_fixture_e_valido(tmp_path: Path) -> None:
    assert regole_di(copia(TANA, tmp_path)) == []


def test_dadi_vita_come_li_stampa_il_manuale() -> None:
    for v in (3, "3+2", "1-1", "½", "2*", "9**", "½*"):
        assert rb.dadi_vita_validi(v), v
    for v in ("tre", "3d8", -1, "2 to 4"):
        assert not rb.dadi_vita_validi(v), v


def test_regole_e_voci_rotte(tmp_path: Path) -> None:
    dest = copia(TANA, tmp_path)

    def rompi(d: dict) -> None:
        d["bestiario"] = {"dado_vita": 7, "attacco": [{"da": 2, "bonus": 2}, {"da": 1, "bonus": 1}], "abilita": ["spada"]}
        d["mostri"][0]["dadi_vita"] = "tre"
        d["mostri"][0]["per_round"] = [["artiglio", "coda"]]
        d["mostri"][0]["attacchi"][0]["colpendo"] = ["veleno_inesistente"]
        d["mostri"][0]["morale"] = 13
        d["mostri"][0]["immune"] = ["paralisi_artiglio", "sorpreso", "charme_inesistente"]
        d["mostri"].append({"id": "artigliatore"})
    modifica(dest, "regole/regole.yaml", rompi)
    e = " | ".join(regole_di(dest))
    assert "bestiario.dado_vita" in e
    assert "bestiario.attacco[2]: «da» cresce" in e
    assert "bestiario.abilita: «spada»" in e
    assert "dadi_vita «tre»" in e
    assert "per_round[1]" in e
    assert "colpendo: «veleno_inesistente»" in e
    assert "morale: da 2 a 12" in e
    # A power and a condition of the set are fine; an unknown id would protect from nothing.
    assert "immune: «charme_inesistente» non è un potere né una condizione del set" in e
    assert "«paralisi_artiglio» non" not in e and "«sorpreso» non" not in e
    assert "id del mostro ripetuto «artigliatore»" in e


def test_una_scheda_col_mostro(tmp_path: Path) -> None:
    """A sheet with `mostro:` needs no ability scores and no hit points when the entry has hit dice; an unknown entry
    is an error; without the entry the same sheet would miss both."""
    dest = copia(TANA, tmp_path)
    assert regole_di(dest) == []
    modifica(dest, "png/png_artigliatore.yaml", lambda d: d["scheda"].update({"mostro": "grifone"}))
    e = " | ".join(regole_di(dest))
    assert "scheda.mostro: «grifone»" in e
    assert "scheda.caratteristiche" in e and "pf: un numero intero" in e


def test_scheda_con_mostro_le_chiavi_della_scheda_vincono() -> None:
    s, da = rb.scheda_con_mostro({"mostro": "x", "pf": 4}, {"x": {"id": "x", "nome": "X", "pf": 9, "difesa": 13, "testo": "…", "manuale": "X"}})
    assert da and s == {"pf": 4, "difesa": 13}
    assert rb.scheda_con_mostro({"pf": 4}, {})[1] is False
    yaml.safe_dump(s)

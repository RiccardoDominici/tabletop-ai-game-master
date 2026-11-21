"""Tests of the item catalog checks (strumenti/valida/regole_catalogo.py; docs/regole.md §2, «Catalogo»).

The fixture is the engine's invented bottega set (apps/server/test/fixtures/campagne/bottega): each test copies it,
breaks one thing and looks for the message, as test_valida_regole.py does.

    python3 -m pytest -q strumenti/test_valida_catalogo.py
"""

from __future__ import annotations

from pathlib import Path

from test_valida_regole import FIXTURE, copia, modifica, regole_di

BOTTEGA = FIXTURE / "bottega"


def test_set_bottega_valido() -> None:
    """The R2 fixture (coins, catalog, restrictions, gear on the sheets): a valid set and valid sheets."""
    assert regole_di(BOTTEGA) == []


def test_catalogo_rotto(tmp_path: Path) -> None:
    dest = copia(BOTTEGA, tmp_path)

    def rompi(d: dict) -> None:
        d["monete"]["tagli"].append({"id": "gemma", "vale": 0})
        cat = d["catalogo"]
        cat["armi"].append({"id": "arco_rotto", "nome": "Arco rotto", "danno": "tanti", "gittate": [30, 20], "munizioni": ["chiodi"], "costo": "3 gemme"})
        cat["armature"].append({"id": "pelle", "nome": "Pelle", "categoria": "Morbida"})
        cat["attrezzatura"].append({"id": "lume", "nome": "Lume", "luce": {"raggio": 3, "durata": "1d4", "unita": "turno", "consuma": "petrolio"}})
        cat["restrizioni"].append({"classe": "druido", "cosa": "arma", "ammessi": ["fionda_d_oro"], "penalita": {"maledizione": True}})
        cat["restrizioni"].append({"razza": "piccolo", "cosa": "scudo", "penalita": {"vietato": True}})
    modifica(dest, "regole/regole.yaml", rompi)
    errori = " | ".join(regole_di(dest))
    assert "monete.tagli[5]" in errori
    assert "catalogo.arco_rotto.danno: una formula come 1d6" in errori
    assert "catalogo.arco_rotto.gittate: i limiti delle gittate, crescenti" in errori
    assert "catalogo.arco_rotto.munizioni: «chiodi» non è in catalogo.munizioni" in errori
    assert "catalogo.arco_rotto.costo" in errori
    assert "catalogo.pelle.ca" in errori and "catalogo.pelle.categoria" in errori
    assert "catalogo.lume.luce.consuma: «petrolio» non è nel catalogo" in errori
    assert "classe: «druido» non è una classe del set" in errori and "«fionda_d_oro» non è nel catalogo" in errori
    assert "penalita: una o più di" in errori
    assert "di' che cosa è ammesso" in errori


def test_schede_con_equipaggiamento_rotto(tmp_path: Path) -> None:
    dest = copia(BOTTEGA, tmp_path)

    def rompi(d: dict) -> None:
        aldo, _, ciro = d["personaggi"]
        aldo["scheda"]["equipaggiamento"] += ["spada_laser", {"id": "corazza", "indossato": True}]
        aldo["scheda"]["monete"]["dobloni"] = 3
        ciro["scheda"]["equipaggiamento"].append("spadone")
        ciro["scheda"]["attacchi"].append({"nome": "Morso", "arma": "zanne"})
    modifica(dest, "pg.yaml", rompi)
    errori = " | ".join(regole_di(dest))
    assert "equipaggiamento[8]: «spada_laser» non è nel catalogo del set" in errori
    assert "equipaggiamento.corazza: si indossa una sola armatura e un solo scudo" in errori
    assert "scheda.monete: «dobloni» non è una moneta del set" in errori
    assert "equipaggiamento.spadone: vietato a «piccolo»" in errori
    assert "attacchi[2].arma: «zanne» non è un'arma del catalogo del set" in errori


def test_tempo_per_finestra_della_scena(tmp_path: Path) -> None:
    """A scene's own window length (a talk scene) is a duration in the set's clock units."""
    dest = copia(BOTTEGA, tmp_path)
    modifica(dest, "scena.yaml", lambda d: d.update(tempo_per_finestra={"round": 6}))
    assert regole_di(dest) == []
    modifica(dest, "scena.yaml", lambda d: d.update(tempo_per_finestra={"minuti": 1}))
    assert any("tempo_per_finestra: una durata" in r for r in regole_di(dest))

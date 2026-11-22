"""Tests of the exploration checks (strumenti/valida/regole_esplorazione.py; docs/regole.md §2, «Esplorazione»).

The fixture is the engine's invented cunicolo set (apps/server/test/fixtures/campagne/cunicolo): each test copies it,
breaks one thing and looks for the message, as test_valida_catalogo.py does.

    python3 -m pytest -q strumenti/test_valida_esplorazione.py
"""

from __future__ import annotations

from pathlib import Path

from test_valida_regole import FIXTURE, copia, modifica, regole_di

CUNICOLO = FIXTURE / "cunicolo"


def test_set_cunicolo_valido() -> None:
    """The R6 fixture (environments, encounter tables, scenes that explore): a valid set."""
    assert regole_di(CUNICOLO) == []


def test_tabelle_rotte(tmp_path: Path) -> None:
    dest = copia(CUNICOLO, tmp_path)

    def rompi(d: dict) -> None:
        t = d["incontri"]
        t[0]["voci"] = [v for v in t[0]["voci"] if v["tiro"] != 6]  # a hole: no entry for 6
        t[1]["voci"].append({"tiro": 2, "mostro": "drago"})  # 2 picks two entries, and the bestiary has no dragon
        t[2]["voci"][0]["gruppo"] = "Lupi e cacciatori"  # two kinds in one entry
        t.append({"id": "senza_dadi", "voci": [{"tiro": 1, "mostro": "lupo", "numero": "tanti"}]})
    modifica(dest, "regole/incontri.yaml", rompi)
    errori = " | ".join(regole_di(dest))
    assert "galleria_1: nessuna voce per i tiri 6 di 1d6" in errori
    assert "galleria_2.voci[2].tiro: 2 sceglie due voci" in errori
    assert "galleria_2.voci[2]: «drago» non è una voce del bestiario del set" in errori
    assert "bosco.voci[1]: una sola tra mostro, gruppo, scelta" in errori
    assert "senza_dadi.dadi: i dadi della tabella" in errori
    assert "senza_dadi.voci[1].numero: quanti" in errori


def test_ambienti_e_scene_rotti(tmp_path: Path) -> None:
    dest = copia(CUNICOLO, tmp_path)

    def rompi(d: dict) -> None:
        a = d["esplorazione"]["ambienti"]
        a[0]["controllo"] = {"ogni": {"secolo": 1}, "dado": 6, "fino_a": 2}
        a[0]["tabelle"].append({"da": 1, "tabella": "galleria_9"})
        a[1]["sorpresa_prima"] = {"dado": 6, "fino_a": 7}
    modifica(dest, "regole/regole.yaml", rompi)
    modifica(dest, "scene/scena_bosco.yaml", lambda s: s.update({"esplorazione": {"ambiente": "deserto"}}))
    modifica(dest, "scene/scena_galleria.yaml", lambda s: s["esplorazione"].update({"tabella": "galleria_9"}))
    errori = " | ".join(regole_di(dest))
    assert "esplorazione.ambienti[1].controllo.ogni: una durata" in errori
    assert "esplorazione.ambienti[1].tabelle[3]: «galleria_9» non è una tabella degli incontri" in errori
    assert "esplorazione.ambienti[1].tabelle[3]: «da» cresce" in errori
    assert "esplorazione.ambienti[2].sorpresa_prima: {dado" in errori
    assert "esplorazione.ambiente: «deserto» non è un ambiente del set" in errori
    assert "esplorazione.tabella: «galleria_9» non è una tabella degli incontri del set" in errori

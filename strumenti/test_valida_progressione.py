"""Progression by class and level and experience points in the validator (strumenti/valida/regole_progressione.py).

The level maths is checked on the SAME file the Engine's test reads (apps/server/test/fixtures/progressione/casi.yaml),
so the TypeScript and the Python copy cannot drift apart; then the [V] checks on a copy of the bx fixture.

    python3 -m pytest -q strumenti/test_valida_progressione.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from test_valida_regole import BX, copia, modifica, regole_di  # noqa: E402
from valida import regole_progressione as rp  # noqa: E402
from valida import valida  # noqa: E402

CASI = yaml.safe_load((QUI.parent / "apps" / "server" / "test" / "fixtures" / "progressione" / "casi.yaml").read_text(encoding="utf-8"))


def _set() -> dict:
    d = yaml.safe_load((BX / "regole" / "regole.yaml").read_text(encoding="utf-8"))
    d.update(yaml.safe_load(yaml.safe_dump(CASI["set"])))
    return d


@pytest.mark.parametrize("caso", CASI["schede"], ids=lambda c: f"{c['scheda']['classe']}-{c['scheda']['livello']}-{c['scheda'].get('razza', '')}")
def test_le_schede_come_il_motore(caso: dict) -> None:
    r = _set()
    assert rp.valori_da_classe(r, caso["scheda"]) == caso["abilita"]
    lim = rp.limiti_pf(r, caso["scheda"])
    assert (list(lim) if lim else None) == caso["pf"]


@pytest.mark.parametrize("caso", CASI["livelli"], ids=lambda c: f"{c['classe']}-{c['px']}")
def test_livelli_come_il_motore(caso: dict) -> None:
    r = _set()
    c = rp.classe_di(r, caso["classe"])
    assert rp.livello_da_px(c, caso["px"]) == caso["livello"]
    assert rp.tetto_px(c, caso["livello"], rp.un_livello_per_avventura(r)) == caso["tetto"]


def _con_progressione(dest: Path) -> None:
    modifica(dest, "regole/regole.yaml", lambda d: d.update(yaml.safe_load(yaml.safe_dump(CASI["set"]))))


def test_il_set_valido(tmp_path: Path) -> None:
    dest = copia(BX, tmp_path)
    _con_progressione(dest)
    assert regole_di(dest) == []


def test_tabelle_rotte(tmp_path: Path) -> None:
    dest = copia(BX, tmp_path)
    _con_progressione(dest)

    def rompi(d: dict) -> None:
        d["classi"][0]["px"] = [0, 100, 50]
        d["classi"][0]["dadi_vita"] = [{"da": 1, "dado": "2d6"}]
        d["classi"][1]["abilita"]["colonne"] = ["origliare", "volare"]
        d["classi"][1]["abilita"]["righe"] = [{"da": 1, "valori": [20]}]
        d["classi"][1]["tabelle"] = {"scacciare": [{"da": 1, "valori": [13]}]}
        d["progressione"]["attacco"] = ["colpo", "nuotare"]
        d["esperienza"]["tesoro"]["per"] = "perle"
        d["razze"][0]["tratti"] = [{"almeno": {"volare": 30}}, {"dado_vita_massimo": 7}]
    modifica(dest, "regole/regole.yaml", rompi)
    errori = " | ".join(regole_di(dest))
    assert "px: crescono livello dopo livello" in errori
    assert '{da, dado: "1d8"} (un dado a livello)' in errori
    assert "abilita.colonne: non sono abilità del set: volare" in errori
    assert "valori: 1 valori, la tabella ha 2 colonne" in errori
    assert "tabelle.scacciare: non è un potere del set con una tabella" in errori
    assert "progressione.attacco[2]: un'abilità del set" in errori
    assert "esperienza.tesoro.per: una moneta del set" in errori
    assert "almeno: {abilità del set: un intero} (non: volare)" in errori
    assert "dado_vita_massimo: le facce" in errori


def test_potere_a_tabella(tmp_path: Path) -> None:
    """A power rolled against a class table: its `tabella`, and each class row with one cell per column."""
    dest = copia(BX, tmp_path)
    _con_progressione(dest)

    def con_potere(d: dict) -> None:
        d.setdefault("combattimento", {}).setdefault("condizioni", []).append({"id": "in_fuga", "nome": "In fuga", "effetti": ["fuori_combattimento"]})
        d["poteri"] = [{"id": "scacciare", "nome": "Scacciare", "tipo": "azione", "bersaglio": "nemici",
                        "tabella": {"dado": "1d20", "colonne": [{"id": "ossa", "nome": "Ossa", "dadi_vita": 1}, {"id": "ombra", "nome": "Ombra", "dadi_vita": 3}],
                                    "colpiti": "2d6", "distrugge": {"dadi": "1d8", "per_livello": True}, "dopo_fallimento": {"turno": 1}},
                        "effetti": [{"tipo": "condizione", "condizione": "in_fuga", "durata": "scena"}]}]
        d["classi"][1]["tabelle"] = {"scacciare": [{"da": 1, "valori": [13, None]}, {"da": 2, "valori": ["T", 15]}]}
    modifica(dest, "regole/regole.yaml", con_potere)
    assert regole_di(dest) == []

    def rompi(d: dict) -> None:
        d["poteri"][0]["tabella"]["dado"] = "tanto"
        d["classi"][1]["tabelle"]["scacciare"] = [{"da": 1, "valori": [13]}, {"da": 2, "valori": ["X", 15]}]
    modifica(dest, "regole/regole.yaml", rompi)
    errori = " | ".join(regole_di(dest))
    assert "tabella.dado: il tiro di chi lo usa" in errori
    assert "valori: 1 celle, la tabella del potere ha 2 colonne" in errori
    assert "valori: una cella per colonna" in errori


def test_schede_contro_le_tabelle(tmp_path: Path) -> None:
    """A number equal to the table: strict (it would not grow); a different one: an override; XP and HP off the level."""
    dest = copia(BX, tmp_path)
    _con_progressione(dest)

    def pg(d: dict) -> None:
        s = d["personaggi"][0]["scheda"]
        s.update(classe="ombra", livello=2, px=60, abilita={"colpo": 1, "origliare": 45}, pf=8)
        s2 = d["personaggi"][1]["scheda"]
        s2.update(classe="lama", livello=1, px=150, pf=30)
    modifica(dest, "pg.yaml", pg)
    esito, _ = valida(dest, rigoroso=True)
    errori = [v.messaggio for v in esito.errori if v.codice == "REGOLE.progressione"]
    avvisi = [v.messaggio for v in esito.avvisi if v.codice == "REGOLE.progressione"]
    assert any("abilita colpo: il numero viene dalle tabelle del set (classe al livello 2" in m for m in errori)
    assert any("abilita.origliare: 45 scritto a mano, la tabella della classe dà 28" in m for m in avvisi)
    assert any("px 150: con la tabella della classe è il livello 2, la scheda dice livello 1" in m for m in errori)
    assert any("pf 30: i dadi vita della classe al livello 1 danno da 2 a 11" in m for m in errori)

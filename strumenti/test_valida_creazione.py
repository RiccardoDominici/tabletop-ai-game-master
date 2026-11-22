"""Creation in a rule set (mechanism M7; strumenti/valida/regole_creazione.py, docs/regole.md §2 «Creazione»).

The sheet cases are the Engine's own: apps/server/test/fixtures/creazione/casi.yaml, read here and by
apps/server/test/creazione-controllo.test.ts, so the validator and the Engine give the same problem codes.
"""
from __future__ import annotations

from pathlib import Path

import pytest
import yaml

from valida.esito import Esito
from valida.regole_creazione import creazione_del_set, problemi_della_scheda

RADICE = Path(__file__).resolve().parents[1]
CASI = yaml.safe_load((RADICE / "apps/server/test/fixtures/creazione/casi.yaml").read_text())
SET = CASI["set"]
CAR = {c["id"] for c in SET["caratteristiche"]}
CLASSI = {c["id"] for c in SET["classi"]}
RAZZE = {x["id"] for x in SET["razze"]}


@pytest.mark.parametrize("caso", CASI["casi"], ids=[c["nome"] for c in CASI["casi"]])
def test_i_casi_condivisi_col_motore(caso):
    codici = {c for c, _, _ in problemi_della_scheda(SET, caso["scheda"], caso["creato"])}
    assert sorted(codici) == sorted(caso["problemi"])


def test_il_set_dei_casi_e_valido():
    e = Esito()
    creazione_del_set(SET, CAR, CLASSI, RAZZE, e, "casi.yaml")
    assert not e.voci, [str(v) for v in e.voci]


def test_errori_del_set():
    e = Esito()
    r = {**SET, "razze": [{**SET["razze"][1], "classi": ["lama", "paladino"], "lingue": ["elfico"], "requisiti": {"fortuna": 9}}],
         "creazione": {**SET["creazione"], "passi": ["razza", "caratteristiche", "volare"],
                       "monete": {"dadi": "3d6", "per": 10, "moneta": "mp"},
                       "incantesimi": [{"classe": "lama", "fissi": ["nulla"]}]}}
    creazione_del_set(r, CAR, CLASSI, RAZZE, e, "x")
    testi = "\n".join(v.messaggio for v in e.voci)
    for atteso in ("«paladino» non è una classe", "«elfico» non è una lingua", "fortuna: non è una caratteristica",
                   "«volare» non è un passo", "caratteristiche viene prima di razza", "«mp» non è una moneta",
                   "«nulla» non è un incantesimo del set per lama"):
        assert atteso in testi, testi

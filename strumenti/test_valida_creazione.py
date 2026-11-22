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


# --- the fucina fixture: the set's creation, the campaign's choice, the PCs built at the table ---------------------------

from test_valida_regole import FIXTURE, copia, modifica, regole_di  # noqa: E402

from valida.carica import carica  # noqa: E402
from valida import regole_pg, regole_schede  # noqa: E402

FUCINA = FIXTURE / "fucina"
GASPARE = {
    "id": "pg_gaspare", "nome": "Gaspare", "specie": "Umano", "classe": "Lama", "livello": 1,
    "creazione": {"metodo": "in_ordine", "tiri": [{"passo": "caratteristiche", "per": "Forza", "dadi": [6, 5, 5]}]},
    "scheda": {"caratteristiche": {"forza": 16, "mente": 10, "agilita": 11, "tempra": 13}, "classe": "lama", "livello": 1, "px": 0,
               "razza": "umano", "pf": 8, "equipaggiamento": ["spada", "scudo"], "monete": {"mo": 135}, "lingue": ["comune"]},
}


def _con_creato(dest: Path, voce: dict) -> None:
    (dest / "pg-creati").mkdir(exist_ok=True)
    (dest / "pg-creati" / f"{voce['id']}.yaml").write_text(yaml.safe_dump(voce, allow_unicode=True, sort_keys=False), encoding="utf-8")


def test_il_set_della_fucina_e_valido() -> None:
    assert regole_di(FUCINA) == []


def test_un_pg_creato_al_tavolo_si_legge_e_si_controlla_stretto(tmp_path: Path) -> None:
    dest = copia(FUCINA, tmp_path)
    _con_creato(dest, GASPARE)
    c = carica(dest, Esito())
    assert [p["id"] for p in c.personaggi] == ["pg_brina", "pg_gaspare"]
    assert regole_di(dest) == []
    # Built at the table: the strict check (XP of a higher level, a race's maximum broken).
    _con_creato(dest, {**GASPARE, "scheda": {**GASPARE["scheda"], "px": 10, "razza": "piccolo", "lingue": ["comune", "piccolese"]}})
    errori = " | ".join(regole_di(dest))
    assert "REGOLE.creazione.px_livello" in errori and "REGOLE.creazione.requisito_razza" in errori
    # Its words are the player's: no Preparer's content check (hook, private knowledge) on it.
    e = Esito()
    regole_pg.controlla(carica(dest, e), e)
    assert not [v for v in e.errori if "pg-creati" in v.dove or v.dove == "pg_gaspare"]


def test_tagm_pg_creati_sposta_la_cartella(tmp_path: Path, monkeypatch) -> None:
    dest = copia(FUCINA, tmp_path)
    altrove = tmp_path / "logs" / "pg-creati"
    altrove.mkdir(parents=True)
    (altrove / "pg_gaspare.yaml").write_text(yaml.safe_dump(GASPARE, allow_unicode=True), encoding="utf-8")
    assert [p["id"] for p in carica(dest, Esito()).personaggi] == ["pg_brina"]
    monkeypatch.setenv("TAGM_PG_CREATI", str(altrove))
    assert [p["id"] for p in carica(dest, Esito()).personaggi] == ["pg_brina", "pg_gaspare"]


def test_la_scelta_della_campagna(tmp_path: Path) -> None:
    dest = copia(FUCINA, tmp_path)
    modifica(dest, "campagna.yaml", lambda d: d["regole"].update(creazione={"modo": "sempre", "metodo": "a_occhio", "opzioni": ["miracolo"], "punti_ferita": "metà", "livello": 0, "senza_speranza": ["prega"]}))
    e = Esito()
    c = carica(dest, e)
    regole_schede._regole(c, e)
    testi = " | ".join(v.messaggio for v in e.errori)
    for atteso in ("modo è pregenerati (default), al_tavolo o entrambi", "punti_ferita è tira o massimo", "livello: un intero da 1", "senza_speranza: ritira e/o ribalta"):
        assert atteso in testi, testi
    errori = " | ".join(regole_di(dest))
    assert "«a_occhio» non è un metodo del set" in errori and "«miracolo» non è un'opzione del set" in errori


def test_al_tavolo_senza_pg_e_senza_set(tmp_path: Path) -> None:
    dest = copia(FUCINA, tmp_path)
    modifica(dest, "pg.yaml", lambda d: d.update(personaggi=[]))
    modifica(dest, "campagna.yaml", lambda d: d["regole"]["creazione"].update(modo="al_tavolo"))
    e = Esito()
    regole_pg.controlla(carica(dest, e), e)
    assert "PG.nessuno" not in e.codici()
    # Creation at the table needs a set with «creazione».
    (dest / "regole" / "regole.yaml").unlink()
    e = Esito()
    regole_schede._regole(carica(dest, e), e)
    assert any("vuole un set di regole con «creazione»" in v.messaggio for v in e.errori)

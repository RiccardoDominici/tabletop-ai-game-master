"""Tests of the rule-set checks for typed effects, falls and rest (strumenti/valida/regole_effetti.py; docs/regole.md §2).

On a copy of the bx fixture of the Engine (apps/server/test/fixtures/campagne/bx): each test breaks ONE thing.

    python3 -m pytest -q strumenti/test_valida_effetti.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from test_valida_regole import BX, copia, modifica, regole_di  # noqa: E402
from valida.esito import Esito  # noqa: E402
from valida.regole_effetti import TIPI_EFFETTO, controlla_effetti, formula_valida  # noqa: E402

ENGINE_EFFETTI = QUI.parent / "apps" / "server" / "src" / "regole" / "effetti.ts"


def test_tipi_effetto_come_il_motore() -> None:
    """The closed list of effect kinds is the Engine's (regole/effetti.ts): a new kind goes in both."""
    testo = ENGINE_EFFETTI.read_text(encoding="utf-8")
    blocco = re.search(r"export const TIPI_EFFETTO = \[(.*?)\] as const", testo, re.S).group(1)
    assert tuple(TIPI_EFFETTO) == tuple(re.findall(r"'([a-z_]+)'", blocco))


def test_formule() -> None:
    assert all(formula_valida(f) for f in ("1d6", "1d6+1", "2d8-1", "d20", 3, "12"))
    assert not any(formula_valida(f) for f in ("tanti", "1d7", "0d6", "41d6", -1, None, "1d6+"))


def test_effetti_validi_e_rotti() -> None:
    e = Esito()
    validi = controlla_effetti(
        [
            {"tipo": "danno", "dadi": "1d6+1", "colpi": {"ogni_livelli": 3, "massimo": 5}},
            {"tipo": "cura", "dadi": "2d6", "bonus_per_livello": {"ogni_livelli": 1}},
            {"tipo": "caduta", "altezza": 20},
            {"tipo": "attacco", "bonus": 1, "dadi": "1d6+1"},
            {"tipo": "condizione", "condizione": "paralizzato", "durata": {"round": "2d4"}},
            {"tipo": "bonus", "a": "difesa", "valore": 3, "contro": "mischia", "durata": {"round": 5, "round_per_livello": 1}},
            {"tipo": "immunita", "a": ["dardo_incantato"], "durata": "scena"},
            {"tipo": "stabilizza"},
            {"tipo": "morte"},
        ],
        "x", e, "REGOLE.poteri", {"paralizzato"},
    )
    assert not e.errori and len(validi) == 9
    e = Esito()
    controlla_effetti(
        [{"tipo": "teletrasporto"}, {"tipo": "danno", "dadi": "tanti"}, {"tipo": "condizione", "condizione": "sognante"},
         {"tipo": "bonus", "a": "fortuna", "valore": 0}, {"tipo": "condizione", "condizione": "paralizzato", "durata": "per sempre"}],
        "x", e, "REGOLE.poteri", {"paralizzato"},
    )
    messaggi = " | ".join(v.messaggio for v in e.errori)
    assert "tipo uno tra danno" in messaggi
    assert "dadi: una formula" in messaggi
    assert "condizione «sognante» non è tra le condizioni del set" in messaggi
    assert "a: difesa, attacchi, salvezze, danni" in messaggi and "valore: un intero diverso da 0" in messaggi
    assert "durata: istantanea, scena" in messaggi


def test_cadute_e_riposo(tmp_path: Path) -> None:
    dest = copia(BX, tmp_path)
    modifica(dest, "regole/regole.yaml", lambda d: d.update(
        cadute={"dadi": "1d6", "ogni": 10, "unita": "piedi", "arrotonda": "vicino", "massimo": 20},
        riposo=[{"id": "notte", "nome": "Una notte", "cura": 1}, {"id": "lungo", "nome": "Lungo", "cura": "tutti"}]))
    assert regole_di(dest) == []
    modifica(dest, "regole/regole.yaml", lambda d: d.update(
        cadute={"dadi": "1d6", "ogni": 0},
        riposo=[{"id": "notte", "cura": "molti"}, {"id": "notte", "cura": 1}, {"nome": "senza id"}]))
    errori = " | ".join(regole_di(dest))
    assert "REGOLE.cadute" in errori
    assert "riposo.notte.cura: un intero, una formula" in errori
    assert "riposo: id ripetuto «notte»" in errori
    assert "riposo[3]: serve un id in snake_case" in errori


def test_effetti_di_una_prova_della_scena(tmp_path: Path) -> None:
    """A scene check's `effetti_se_fallisce`: the closed list, with the set's conditions."""
    dest = copia(BX, tmp_path)

    def con_prova(d: dict) -> None:
        d["prove"] = [{"id": "p_fossa", "quando": "un PG attraversa il pavimento marcio", "caratteristica": "destrezza",
                       "nome": "Fossa coperta", "effetti_se_fallisce": [{"tipo": "caduta", "altezza": 10}]}]
    modifica(dest, "scena.yaml", con_prova)
    assert regole_di(dest) == []

    def rotta(d: dict) -> None:
        d["prove"][0]["effetti_se_fallisce"] = [{"tipo": "condizione", "condizione": "sognante"}, {"tipo": "caduta"}]
    modifica(dest, "scena.yaml", rotta)
    errori = " | ".join(regole_di(dest))
    assert "condizione «sognante» non è tra le condizioni del set" in errori
    assert "altezza: l'altezza della caduta" in errori


def test_classi_e_tiri_salvezza(tmp_path: Path) -> None:
    """tiri_salvezza and classi (regole_classi.py): columns, rows of the right length, a save's column, the sheet's class."""
    dest = copia(BX, tmp_path)

    def con_tabelle(d: dict) -> None:
        d["abilita"] = [{"id": "ts_veleno", "nome": "Veleno", "caratteristica": "forza", "salvezza": "morte"}]
        d["tiri_salvezza"] = {"colonne": [{"id": "morte", "nome": "Morte"}, {"id": "magia", "nome": "Magia"}]}
        d["classi"] = [{"id": "guerriero", "nome": "Guerriero", "tiri_salvezza": [{"da": 1, "valori": [12, 16]}],
                        "incantesimi_al_giorno": [{"da": 1, "slot": []}]}]
    modifica(dest, "regole/regole.yaml", con_tabelle)
    modifica(dest, "pg.yaml", lambda d: d["personaggi"][0]["scheda"].update(classe="guerriero", livello=1))
    assert regole_di(dest) == []

    def rotte(d: dict) -> None:
        d["abilita"][0]["salvezza"] = "fulmini"
        d["classi"][0]["tiri_salvezza"] = [{"da": 2, "valori": [12]}, {"da": 1, "valori": [11, 15]}]
    modifica(dest, "regole/regole.yaml", rotte)
    modifica(dest, "pg.yaml", lambda d: d["personaggi"][0]["scheda"].update(classe="bardo", livello=-1))
    errori = " | ".join(regole_di(dest))
    assert "abilita.ts_veleno.salvezza: «fulmini» non è una colonna di tiri_salvezza" in errori
    assert "1 valori, la tabella ha 2 colonne" in errori and "«da» cresce riga dopo riga" in errori
    assert "scheda.classe «bardo» non è una classe del set" in errori and "scheda.livello: un intero da 0 in su" in errori


def test_scheda_con_tabella_non_scrive_il_proprio_bonus(tmp_path: Path) -> None:
    """A sheet whose save comes from its class table must not write its own bonus: a strict warning."""
    from valida import valida
    dest = copia(BX, tmp_path)

    def con_tabelle(d: dict) -> None:
        d["abilita"] = [{"id": "ts_veleno", "nome": "Veleno", "caratteristica": None, "salvezza": "morte"}]
        d["tiri_salvezza"] = {"colonne": [{"id": "morte", "nome": "Morte"}]}
        d["classi"] = [{"id": "guerriero", "tiri_salvezza": [{"da": 1, "valori": [12]}]}]
    modifica(dest, "regole/regole.yaml", con_tabelle)
    modifica(dest, "pg.yaml", lambda d: d["personaggi"][0]["scheda"].update(classe="guerriero", livello=1, abilita={"ts_veleno": 5}))
    esito, _ = valida(dest, rigoroso=True)
    assert any(v.codice == "REGOLE.classi" and "il Motore ignora il bonus della scheda" in v.messaggio for v in esito.errori)


MAGIA = BX.parent / "magia"


def test_set_magia_valido() -> None:
    """The R1 fixture (powers, resources, class tables): a valid set and valid sheets."""
    assert regole_di(MAGIA) == []


def test_poteri_e_risorse_rotti(tmp_path: Path) -> None:
    dest = copia(MAGIA, tmp_path)

    def rompi(d: dict) -> None:
        d["poteri"].append({"id": "p_x", "tipo": "incantesimo", "salvezza": {"abilita": "mischia"}, "effetti": []})
        d["poteri"].append({"id": "p_y", "tipo": "teletrasporto", "bersaglio": "tutti", "livello": {"bardo": 1}, "effetti": [{"tipo": "cura", "dadi": "1d4"}]})
        d["risorse"].append({"id": "frecce", "ricarica": "mai"})
        d["risorse"].append({"id": "luna", "ricarica": "plenilunio"})
        d["magia"] = {"preparazione": "a memoria"}
        d["abilita"][2]["ripiego"] = "lotta"
    modifica(dest, "regole/regole.yaml", rompi)
    errori = " | ".join(regole_di(dest))
    assert "poteri.p_x.livello: un incantesimo vuole {classe: livello}" in errori
    assert "poteri.p_x.salvezza.abilita: un tiro salvezza del set" in errori
    assert "poteri.p_x: effetti, oppure descrittivo: true" in errori
    assert "poteri.p_y.tipo: incantesimo, oggetto, azione, pericolo" in errori and "poteri.p_y.bersaglio" in errori
    assert "poteri.p_y.livello: «bardo» non è una classe del set" in errori
    assert "risorse: id ripetuto «frecce»" in errori and "risorse[4]" in errori
    assert "magia.preparazione: vanciana o slot" in errori
    assert "abilita.furtivo.ripiego: «lotta» non è un'abilità del set" in errori


def test_schede_con_poteri_e_risorse(tmp_path: Path) -> None:
    """Sheet ids of the set, whole counts; a vancian caster with more copies than the day's slots of that level."""
    dest = copia(MAGIA, tmp_path)

    def rompi(d: dict) -> None:
        maga = d["personaggi"][0]["scheda"]
        maga["incantesimi"] = ["dardo_arcano", "sonno", "amicizia", "cura_ferite"]
        bruno = d["personaggi"][1]["scheda"]
        bruno["oggetti"] = {"pozione_cura": -1, "fasciare": 2}
        sara = d["personaggi"][2]["scheda"]
        sara["risorse"] = {"frecce": 2, "gemme": 3}
        sara["attacchi"][2]["consuma"] = "dardi"
        sara["dadi_vita"] = "tanti"
    modifica(dest, "pg.yaml", rompi)
    errori = " | ".join(regole_di(dest))
    assert "scheda.incantesimi: 4 di 1° livello preparati, la classe ne dà 2 al giorno" in errori
    assert "scheda.oggetti.pozione_cura: un intero da 0 in su" in errori
    assert "scheda.oggetti: «fasciare» non è un oggetto (potere di tipo oggetto) del set" in errori
    assert "scheda.risorse: «gemme» non è una risorsa del set" in errori
    assert "attacchi[3].consuma: «dardi» non è una risorsa del set" in errori
    assert "scheda.dadi_vita: un intero" in errori

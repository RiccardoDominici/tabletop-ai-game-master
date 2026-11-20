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

"""Tests for minions (campagna.yaml → gregari, scene gregari, class SCHEDA; strumenti/valida/regole_gregari.py).

Fixtures are invented: each test copies `test_valida_fixtures/mini` (SRD, no regole/), adds one type or one scene
entry, and checks the SCHEDA.gregari codes (and the SCHEDA.nemici_senza_statistiche warning).

    python3 -m pytest -q strumenti/test_valida_gregari.py
"""

from __future__ import annotations

import copy
import shutil
import sys
from pathlib import Path

import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from valida import regole_gregari  # noqa: E402
from valida.carica import carica  # noqa: E402
from valida.esito import Esito  # noqa: E402

MINI = QUI / "test_valida_fixtures" / "mini"
CODICE = "SCHEDA.gregari"
NEMICI = "SCHEDA.nemici_senza_statistiche"


def scheda_goblin(**mod) -> dict:
    """A valid NPC sheet for an SRD minion (gs 1/4), with optional changes."""
    s = {
        "gs": "1/4",
        "caratteristiche": {"forza": 8, "destrezza": 14, "costituzione": 10, "intelligenza": 10, "saggezza": 8, "carisma": 8},
        "competenze": ["furtivita"],
        "ca": 13,
        "pf": 7,
        "attacchi": [{"nome": "Scimitarra", "caratteristica": "destrezza", "danno": "1d6", "tipo_danno": "tagliente"}],
    }
    s.update(mod)
    return s


def tipo_goblin(**mod) -> dict:
    t = {"tipo": "goblin", "nome": "goblin", "parole": ["goblin", "sentinella"], "scheda": scheda_goblin()}
    t.update(mod)
    return t


def copia(tmp_path: Path) -> Path:
    dest = tmp_path / "mini"
    shutil.copytree(MINI, dest)
    return dest


def _leggi(percorso: Path) -> dict:
    return yaml.safe_load(percorso.read_text(encoding="utf-8"))


def _scrivi(percorso: Path, dati: dict) -> None:
    percorso.write_text(yaml.safe_dump(dati, allow_unicode=True, sort_keys=False), encoding="utf-8")


def con_gregari(cartella: Path, gregari) -> None:
    """Sets campagna.yaml → gregari (a list of types, or any value to test the bad shapes)."""
    dati = _leggi(cartella / "campagna.yaml")
    dati["gregari"] = gregari
    _scrivi(cartella / "campagna.yaml", dati)


def con_scena(cartella: Path, modifica) -> None:
    dati = _leggi(cartella / "scena.yaml")
    modifica(dati)
    _scrivi(cartella / "scena.yaml", dati)


def esito(cartella: Path, rigoroso: bool = False) -> Esito:
    e = Esito(rigoroso=rigoroso)
    c = carica(cartella, e)
    regole_gregari.controlla(c, e)
    return e


def messaggi(cartella: Path, codice: str = CODICE) -> list[str]:
    """Errors and warnings of one code, as their messages."""
    e = esito(cartella)
    return [v.messaggio for v in e.voci if v.codice == codice]


def ha_errore(cartella: Path, codice: str = CODICE) -> bool:
    return any(v.codice == codice for v in esito(cartella).errori)


# --- the valid cases ----------------------------------------------------------------------------------

def test_nessun_gregario_non_fa_nulla(tmp_path: Path) -> None:
    assert not [v for v in esito(copia(tmp_path)).voci if v.codice.startswith("SCHEDA.")]


def test_tipo_valido_e_scena_che_lo_porta(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin()])
    con_scena(cartella, lambda d: d.update(gregari=[{"tipo": "goblin", "quanti": 2}]))
    e = esito(cartella, rigoroso=True)
    assert not [v for v in e.voci if v.codice == CODICE], [str(v) for v in e.voci]
    assert NEMICI not in {v.codice for v in e.voci}


# --- the type ------------------------------------------------------------------------------------------

def test_chiave_sconosciuta(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin(colore="verde")])
    assert any("colore" in m for m in messaggi(cartella))


def test_tipo_non_snake_case(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin(tipo="Goblin Notturno")])
    assert ha_errore(cartella)


def test_tipo_ripetuto(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin(), tipo_goblin()])
    assert any("ripetuto" in m for m in messaggi(cartella))


def test_scheda_mancante(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    t = tipo_goblin()
    del t["scheda"]
    con_gregari(cartella, [t])
    assert any("manca scheda" in m for m in messaggi(cartella))


def test_scheda_rotta_modificatore_a_mano(tmp_path: Path) -> None:
    # A hand-written attack roll is a sheet error for an NPC too: the code computes it (docs/prove.md §2).
    cartella = copia(tmp_path)
    t = tipo_goblin(scheda=scheda_goblin(attacchi=[{"nome": "Scimitarra", "caratteristica": "destrezza",
                                                    "danno": "1d6", "tiro_colpire": 5}]))
    con_gregari(cartella, [t])
    assert any("modificatore_a_mano" in m for m in messaggi(cartella))


def test_scheda_rotta_danno(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    t = tipo_goblin(scheda=scheda_goblin(attacchi=[{"nome": "Scimitarra", "caratteristica": "destrezza", "danno": "1d3"}]))
    con_gregari(cartella, [t])
    assert ha_errore(cartella)


def test_nome_vuoto(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin(nome="  ")])
    assert ha_errore(cartella)


def test_senza_parole_avviso(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    t = tipo_goblin()
    del t["parole"]
    con_gregari(cartella, [t])
    assert any("senza parole" in m for m in [v.messaggio for v in esito(cartella).avvisi])


def test_parole_vuote_sono_errore(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin(parole=[])])
    assert ha_errore(cartella)


def test_dadi_spenti_con_gregari_avviso(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin()])
    dati = _leggi(cartella / "campagna.yaml")
    dati["regole"] = {"dadi": False}
    _scrivi(cartella / "campagna.yaml", dati)
    assert any("solo con i dadi" in v.messaggio for v in esito(cartella).avvisi)


# --- the scene ----------------------------------------------------------------------------------------

def test_scena_con_tipo_inesistente(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin()])
    con_scena(cartella, lambda d: d.update(gregari=[{"tipo": "lupo", "quanti": 1}]))
    assert any("tipo di gregario inesistente" in m for m in messaggi(cartella))


def test_scena_quanti_zero(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin()])
    con_scena(cartella, lambda d: d.update(gregari=[{"tipo": "goblin", "quanti": 0}]))
    assert any("quanti" in m for m in messaggi(cartella))


def test_scena_quanti_troppi(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin()])
    con_scena(cartella, lambda d: d.update(gregari=[{"tipo": "goblin", "quanti": 21}]))
    assert ha_errore(cartella)


def test_scena_chiave_sconosciuta(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin()])
    con_scena(cartella, lambda d: d.update(gregari=[{"tipo": "goblin", "colore": "verde"}]))
    assert any("colore" in m for m in messaggi(cartella))


# --- nemici senza statistiche -------------------------------------------------------------------------

def _scena_che_nomina_il_goblin(cartella: Path, gregari=None) -> None:
    con_gregari(cartella, [tipo_goblin()])

    def mod(d: dict) -> None:
        d["descrizione"] = "Una sala con il camino. Un goblin spunta da dietro il bancone."
        if gregari is not None:
            d["gregari"] = gregari
    con_scena(cartella, mod)


def test_nemici_senza_statistiche_avviso(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    _scena_che_nomina_il_goblin(cartella)
    assert any("«goblin»" in m for m in messaggi(cartella, NEMICI))


def test_nemici_senza_statistiche_errore_se_rigoroso(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    _scena_che_nomina_il_goblin(cartella)
    assert NEMICI in {v.codice for v in esito(cartella, rigoroso=True).errori}


def test_nemici_nessun_avviso_con_il_gregario_della_scena(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    _scena_che_nomina_il_goblin(cartella, gregari=[{"tipo": "goblin", "quanti": 2}])
    assert not messaggi(cartella, NEMICI)


def test_nemici_nessun_avviso_con_un_png_della_parola(tmp_path: Path) -> None:
    # A named NPC whose name is the word carries its own sheet: no warning.
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin(parole=["sentinella"], nome="sentinella")])
    png = cartella / "png" / "png_irma.yaml"
    dati_png = _leggi(png)
    dati_png["nome"] = "Irma, la sentinella della porta"
    _scrivi(png, dati_png)

    def mod(d: dict) -> None:
        d["descrizione"] = "Una sentinella controlla la porta."
        d["png_presenti"] = ["png_irma", "png_bruno"]
    con_scena(cartella, mod)
    assert not messaggi(cartella, NEMICI)


def test_nemici_parola_intera_non_sottostringa(tmp_path: Path) -> None:
    # «goblinesco» is not the word «goblin»: no warning.
    cartella = copia(tmp_path)
    con_gregari(cartella, [tipo_goblin()])
    con_scena(cartella, lambda d: d.update(descrizione="Un arredo goblinesco, di legno scuro."))
    assert not messaggi(cartella, NEMICI)


def test_senza_tipi_nessun_nemico_da_segnalare(tmp_path: Path) -> None:
    cartella = copia(tmp_path)
    con_scena(cartella, lambda d: d.update(descrizione="Un goblin spunta dal buio."))
    assert not messaggi(cartella, NEMICI)

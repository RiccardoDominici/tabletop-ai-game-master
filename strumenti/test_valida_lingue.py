"""Pacchetti di prosa per lingua (lingue/<codice>/prosa.yaml, strumenti/valida/lingua.py).

Una campagna dichiara `lingua` in campagna.yaml (assente = it). Le regole di prosa, di voce e le forme
dello stile leggono i dati della lingua: qui si controlla che una campagna in inglese sia giudicata con
i cliché, i numeri e i nomi inglesi, e che l'italiano resti come prima.

    python3 -m pytest -q strumenti/test_valida_lingue.py
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

import pytest
import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from valida import srd  # noqa: E402
from valida import valida  # noqa: E402
from valida.lingua import carica_prosa, lingua_della_campagna, lingue_disponibili  # noqa: E402
from valida.testo import limite_da_stile, massimo_da_stile, problemi_di_prosa  # noqa: E402
from valida.voce import e_suono, problemi  # noqa: E402

MINI = QUI / "test_valida_fixtures" / "mini"
EN = carica_prosa("en")
IT = carica_prosa("it")


@pytest.fixture
def camp(tmp_path: Path) -> Path:
    dest = tmp_path / "mini"
    shutil.copytree(MINI, dest)
    return dest


def _leggi(cartella: Path, rel: str):
    return yaml.safe_load((cartella / rel).read_text(encoding="utf-8"))


def _scrivi(cartella: Path, rel: str, dati) -> None:
    (cartella / rel).write_text(yaml.safe_dump(dati, allow_unicode=True, sort_keys=False), encoding="utf-8")


def _valida(cartella: Path):
    """Esito e campagna, senza il contesto del modo B (lento, non serve a queste regole)."""
    return valida(cartella, rigoroso=False, contesto_b=False)


def _lingua(cartella: Path, codice: str) -> None:
    dati = _leggi(cartella, "campagna.yaml")
    dati["lingua"] = codice
    _scrivi(cartella, "campagna.yaml", dati)


# --- i pacchetti -----------------------------------------------------------------------------------

def test_ci_sono_italiano_e_inglese():
    assert {"it", "en"} <= set(lingue_disponibili())


def test_pacchetti_con_le_stesse_chiavi_e_le_stesse_lunghezze():
    # Le chiavi di ogni lingua sono quelle dell'italiano, e le lunghezze della scrittura sono le stesse.
    assert EN.frase_max == IT.frase_max == 20
    assert EN.media_narratore == IT.media_narratore == (8, 14)
    assert EN.frasi_png == IT.frasi_png and EN.frasi_png_rivelazione == IT.frasi_png_rivelazione


def test_lingua_sconosciuta_non_e_un_pacchetto():
    assert lingua_della_campagna({"lingua": "fr"}) is None
    assert lingua_della_campagna({"lingua": None}) == "it"
    assert lingua_della_campagna({}) == "it"
    assert lingua_della_campagna({"lingua": "en"}) == "en"


# --- regole di prosa: il cliché e i numeri dipendono dalla lingua ----------------------------------

def test_cliche_inglese_e_vietato_in_inglese_non_in_italiano():
    testo = "Suddenly, a shiver ran down his spine."
    assert ("espressione_vietata", "«suddenly»") in [(r, d) for r, d in problemi_di_prosa(testo, prosa=EN)]
    assert not [r for r, _ in problemi_di_prosa(testo, prosa=IT) if r == "espressione_vietata"]


def test_cliche_italiano_resta_vietato_in_italiano():
    assert any(r == "espressione_vietata" for r, _ in problemi_di_prosa("Un brivido lungo la schiena.", prosa=IT))


def test_cifre_sono_vietate_in_ogni_lingua():
    assert any(r == "cifre" for r, _ in problemi_di_prosa("It costs 5 coins.", prosa=EN))


def test_stile_inglese_legge_il_massimo_di_parole():
    assert massimo_da_stile("Sentences of three-eight words, slow.", EN) == 8
    assert massimo_da_stile("from three to eight words", EN) == 8
    assert massimo_da_stile("at most six words per sentence", EN) == 6
    assert massimo_da_stile("Frasi di tre-otto parole.", EN) is None
    assert limite_da_stile("at most six words", 16, EN) == 9


def test_stile_italiano_come_prima():
    assert limite_da_stile("Frasi di tre-undici parole.", 16) == 14
    assert massimo_da_stile("Frasi di tre-undici parole.", IT) == 11


def test_suoni_di_drama3_per_lingua():
    assert problemi("[sigh] Ok.", EN) == []
    assert e_suono("sigh", EN.suoni) and e_suono("sospiro", IT.suoni)
    assert not e_suono("sospiro", EN.suoni)              # in inglese «sospiro» è una direzione, non un suono


# --- campagna in inglese, validata sui file ---------------------------------------------------------

def test_campagna_senza_lingua_e_in_italiano(camp):
    _, c = _valida(camp)
    assert c.lingua == "it"


def test_campagna_inglese_dichiara_la_lingua(camp):
    _lingua(camp, "en")
    _, c = _valida(camp)
    assert c.lingua == "en" and c.prosa.codice == "en"


def test_lingua_sconosciuta_e_un_errore(camp):
    _lingua(camp, "fr")
    esito, c = _valida(camp)
    assert "STRUTTURA.lingua" in esito.codici()
    assert c.lingua == "it"   # il validatore prosegue con l'italiano


def test_campagna_inglese_segnala_un_cliche_inglese(camp):
    _lingua(camp, "en")
    dati = _leggi(camp, "png/png_bruno.yaml")
    dati["aspetto"]["lettura"] = "Suddenly, a shiver ran down his spine. An old man with a white beard."
    _scrivi(camp, "png/png_bruno.yaml", dati)
    esito, _ = _valida(camp)
    assert any(v.codice == "PROSA.espressione_vietata" and "suddenly" in v.messaggio for v in esito.errori)


def test_stesso_testo_in_una_campagna_italiana_non_segnala_il_cliche_inglese(camp):
    dati = _leggi(camp, "png/png_bruno.yaml")
    dati["aspetto"]["lettura"] = "Suddenly, a shiver ran down his spine. An old man with a white beard."
    _scrivi(camp, "png/png_bruno.yaml", dati)
    esito, _ = _valida(camp)
    assert not any(v.codice == "PROSA.espressione_vietata" for v in esito.errori)


def test_campagna_inglese_accetta_un_registro_con_you(camp):
    _lingua(camp, "en")
    dati = _leggi(camp, "png/png_bruno.yaml")
    dati["voce"]["registro"] = "Speaks to you in the familiar form, short sentences."
    _scrivi(camp, "png/png_bruno.yaml", dati)
    esito, _ = _valida(camp)
    # png_irma (della fixture) ha ancora il registro in italiano: l'errore è suo, non di png_bruno.
    assert not any(v.codice == "PNG.voce" and "png_bruno" in v.dove for v in esito.errori)


# --- SRD: nomi inglesi delle armature --------------------------------------------------------------

@pytest.mark.parametrize("nome, id_, ca", [
    ("Padded", "armatura_imbottita", 11), ("Leather", "armatura_di_cuoio", 11),
    ("Studded Leather", "armatura_di_cuoio_borchiato", 12), ("Hide", "armatura_di_pelle", 12),
    ("Chain Shirt", "giaco_di_maglia", 13), ("Scale Mail", "corazza_a_scaglie", 14),
    ("Breastplate", "corazza_di_piastre", 14), ("Half Plate", "mezza_armatura", 15),
    ("Ring Mail", "corazza_ad_anelli", 14), ("Chain Mail", "cotta_di_maglia", 16),
    ("Splint", "corazza_a_strisce", 17), ("Plate", "armatura_a_piastre", 18),
    ("Padded Armor", "armatura_imbottita", 11), ("Chain Mail Armor", "cotta_di_maglia", 16),
    ("Plate Armor", "armatura_a_piastre", 18), ("Studded Leather Armor", "armatura_di_cuoio_borchiato", 12),
])
def test_armature_inglesi_dell_srd(nome, id_, ca):
    assert srd.come_armatura(nome) == id_
    assert srd.ARMATURE[id_][0] == ca


def test_armatura_inglese_nella_scheda_non_e_un_errore(camp):
    _lingua(camp, "en")
    dati = _leggi(camp, "pg.yaml")
    scheda = next(p for p in dati["personaggi"] if p["id"] == "pg_lia")["scheda"]
    scheda["armatura"] = {"tipo": "Chain Mail", "scudo": False}
    scheda.pop("ca", None)
    _scrivi(camp, "pg.yaml", dati)
    esito, _ = _valida(camp)
    assert not any(v.codice == "SCHEDA.armatura" for v in esito.errori)


def test_armatura_inglese_sconosciuta_resta_un_errore(camp):
    _lingua(camp, "en")
    dati = _leggi(camp, "pg.yaml")
    next(p for p in dati["personaggi"] if p["id"] == "pg_lia")["scheda"]["armatura"] = {"tipo": "Spacesuit", "scudo": False}
    _scrivi(camp, "pg.yaml", dati)
    esito, _ = _valida(camp)
    assert any(v.codice == "SCHEDA.armatura" for v in esito.errori)

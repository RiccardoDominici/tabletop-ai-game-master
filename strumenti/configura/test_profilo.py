"""La tabella dei profili (docs/profili.md) con rilevamenti finti, più scrittura di locale.yaml e download finti.

    python3 -m pytest -q strumenti/configura/test_profilo.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import scarica  # noqa: E402
import profilo  # noqa: E402
from profilo import (  # noqa: E402
    MODELLO_IMMAGINI,
    MODELLO_LETTORE_GRANDE,
    MODELLO_LETTORE_PICCOLO,
    MODELLO_VOCE,
    scegli,
)


def rilevamento(apple=True, ram=16.0, disco=50.0, cache=None, chiavi=None) -> dict:
    """Un rilevamento minimo e finto: le stesse chiavi di rileva.py, valori scelti dal test."""
    return {
        "sistema": {"os": "darwin" if apple else "linux"},
        "cpu": {"nome": "Apple M1" if apple else "AMD", "apple_silicon": apple},
        "ram_gb": ram,
        "disco_libero_gb": disco,
        "modelli_in_cache": cache or {
            MODELLO_LETTORE_GRANDE: False, MODELLO_LETTORE_PICCOLO: False,
            MODELLO_VOCE: False, MODELLO_IMMAGINI: False,
        },
        "chiavi": chiavi or {"ANTHROPIC_API_KEY": False, "OPENROUTER_API_KEY": False},
        "avvisi": [],
    }


def test_apple_16_gb_con_disco_per_le_immagini() -> None:
    p = scegli(rilevamento(ram=16.0, disco=50.0))
    assert p["id"] == "apple-16"
    assert p["modello_lettore"] == MODELLO_LETTORE_GRANDE
    assert p["componenti"]["lettore"]["provider"] == "locale"
    assert p["componenti"]["voce"]["provider"] == "locale"
    assert p["componenti"]["immagini"]["provider"] == "locale"
    assert MODELLO_IMMAGINI in p["modelli"] and MODELLO_VOCE in p["modelli"]


def test_apple_16_gb_disco_stretto_toglie_le_immagini() -> None:
    # 9 GB liberi, il modello immagini (4,6 GB) ne lascerebbe 4,4: sotto il minimo di 8 GB.
    p = scegli(rilevamento(ram=16.0, disco=9.0))
    assert p["componenti"]["immagini"]["provider"] == "nessuno"
    assert MODELLO_IMMAGINI not in p["modelli"]
    assert any("Images off" in a for a in p["avvisi"])


def test_immagini_gia_in_cache_servono_comunque_8_gb_liberi() -> None:
    # Generare richiede 8 GB liberi (motore.py) anche se il modello è già scaricato.
    cache = {MODELLO_IMMAGINI: True, MODELLO_LETTORE_GRANDE: True, MODELLO_VOCE: True}
    poco = scegli(rilevamento(ram=16.0, disco=4.0, cache=cache))
    assert poco["componenti"]["immagini"]["provider"] == "nessuno"
    assert poco["da_scaricare"] == []
    ok = scegli(rilevamento(ram=16.0, disco=20.0, cache=cache))
    assert ok["componenti"]["immagini"]["provider"] == "locale"
    assert ok["da_scaricare"] == []


def test_apple_sotto_16_gb_lettore_piccolo_e_niente_immagini() -> None:
    p = scegli(rilevamento(ram=8.0, disco=50.0))
    assert p["id"] == "apple-piccolo"
    assert p["modello_lettore"] == MODELLO_LETTORE_PICCOLO
    assert p["componenti"]["immagini"]["provider"] == "nessuno"


def test_apple_sotto_8_gb_avvisa() -> None:
    p = scegli(rilevamento(ram=6.0, disco=50.0))
    assert any("Under 8 GB" in a for a in p["avvisi"])


def test_non_apple_senza_chiavi_non_inventa_il_locale() -> None:
    p = scegli(rilevamento(apple=False, ram=32.0))
    assert p["id"] == "altro"
    assert p["componenti"]["lettore"]["provider"] == "finto"
    assert p["componenti"]["voce"]["provider"] == "finta"
    assert p["componenti"]["immagini"]["provider"] == "nessuno"
    assert p["modelli"] == []
    assert any("not supported here yet" in a for a in p["avvisi"])


def test_chiavi_sono_offerte_e_non_applicate_di_default() -> None:
    chiavi = {"ANTHROPIC_API_KEY": True, "OPENROUTER_API_KEY": True}
    p = scegli(rilevamento(chiavi=chiavi))
    assert p["componenti"]["lettore"]["provider"] == "locale"
    assert p["componenti"]["voce"]["provider"] == "locale"
    assert {o["chiave"] for o in p["chiavi_offerte"]} == {"ANTHROPIC_API_KEY", "OPENROUTER_API_KEY"}
    assert p["chiavi_applicate"] is False


def test_chiavi_applicate_su_richiesta() -> None:
    chiavi = {"ANTHROPIC_API_KEY": True, "OPENROUTER_API_KEY": True}
    p = scegli(rilevamento(chiavi=chiavi), applica_chiavi=True)
    assert p["componenti"]["lettore"]["provider"] == "anthropic"
    assert p["componenti"]["lettore"]["riserve"] == ["locale", "finto"]
    assert p["componenti"]["voce"]["provider"] == "openrouter"
    assert p["chiavi_applicate"] is True


def test_chiave_non_trovata_non_si_applica_mai() -> None:
    p = scegli(rilevamento(), applica_chiavi=True)
    assert p["componenti"]["lettore"]["provider"] == "locale"
    assert p["chiavi_applicate"] is False


def test_scelta_deterministica() -> None:
    assert scegli(rilevamento()) == scegli(rilevamento())


def test_locale_yaml_ha_commenti_e_forma_del_server(tmp_path: Path) -> None:
    p = scegli(rilevamento(ram=16.0, disco=50.0))
    testo = profilo.testo_locale(p, quando="2026-11-10 12:00")
    assert "componenti:" in testo
    assert "  lettore: {provider: locale, riserve: [finto]}" in testo
    assert "  arbitro_azioni: {provider: regole}" in testo
    assert testo.count("\n  # ") >= 7  # ogni scelta ha la sua spiegazione
    assert "API_KEY" not in testo and "sk-" not in testo  # nessun nome né valore di chiave nel file


def test_locale_yaml_piccolo_porta_il_modello_del_lettore() -> None:
    p = scegli(rilevamento(ram=8.0))
    testo = profilo.testo_locale(p, quando="x")
    assert f"    modello: {MODELLO_LETTORE_PICCOLO}" in testo


@pytest.mark.parametrize("repo", [MODELLO_LETTORE_GRANDE, MODELLO_VOCE, MODELLO_IMMAGINI])
def test_piano_usa_la_stima_quando_la_rete_manca(repo: str, tmp_path: Path) -> None:
    p = scegli(rilevamento(disco=50.0))
    piano = scarica.piano(p["modelli"], rilevamento(disco=50.0), tmp_path, dimensione=lambda _r: None)
    voce = next(v for v in piano["voci"] if v["repo"] == repo)
    assert voce["stima"] is True and voce["gb"] > 0


def test_piano_dimensioni_vere_e_spazio() -> None:
    dimensioni = {MODELLO_LETTORE_GRANDE: 4.5, MODELLO_VOCE: 2.0, MODELLO_IMMAGINI: 4.6}
    tutti = [MODELLO_LETTORE_GRANDE, MODELLO_VOCE, MODELLO_IMMAGINI]
    piano = scarica.piano(tutti, rilevamento(disco=12.0), Path("/x"), dimensione=dimensioni.get)
    assert piano["da_scaricare_gb"] == round(4.5 + 2.0 + 4.6, 2)
    assert piano["spazio_ok"] is False  # 12 - 11,1 = 0,9 GB: sotto il minimo
    assert any("NOT ENOUGH DISK" in riga for riga in scarica.descrivi(piano))


def test_piano_senza_ambiente_python_lo_segnala(tmp_path: Path) -> None:
    p = scegli(rilevamento(disco=100.0))
    piano = scarica.piano([MODELLO_VOCE], rilevamento(disco=100.0), tmp_path, dimensione=lambda _r: 2.0)
    assert piano["mancano_ambienti"] == ["voce"]
    assert scarica.esegui(piano, tmp_path, esecutore=lambda _a: 0) == ["skipped " + MODELLO_VOCE + ": environment missing"]


def test_esegui_scarica_solo_le_voci_mancanti_con_il_loro_python(tmp_path: Path) -> None:
    py = tmp_path / "services/voce/.venv/bin/python"
    py.parent.mkdir(parents=True)
    py.write_text("")
    cache = {MODELLO_VOCE: True}
    piano = {"voci": [
        {"repo": MODELLO_VOCE, "componente": "voce", "in_cache": True, "python": str(py), "ambiente_pronto": True, "gb": 2.0, "stima": False},
        {"repo": MODELLO_LETTORE_GRANDE, "componente": "lettore", "in_cache": False, "python": str(py), "ambiente_pronto": True, "gb": 4.5, "stima": False},
    ]}
    chiamate: list[list[str]] = []
    esiti = scarica.esegui(piano, tmp_path, esecutore=lambda a: chiamate.append(a) or 0)
    assert len(chiamate) == 1 and chiamate[0][0] == str(py)
    assert MODELLO_LETTORE_GRANDE in chiamate[0][2]
    assert esiti == [f"downloaded {MODELLO_LETTORE_GRANDE}"]
    assert cache[MODELLO_VOCE] is True

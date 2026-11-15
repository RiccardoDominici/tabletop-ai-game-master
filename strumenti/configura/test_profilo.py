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
    MODELLO_ASCOLTO,
    MODELLO_IMMAGINI,
    MODELLO_LETTORE_GRANDE,
    MODELLO_LETTORE_PICCOLO,
    MODELLO_VOCE,
    scegli,
)

STRUMENTI_OK = {"whisper-server": True, "mkcert": True}


def rilevamento(apple=True, ram=16.0, disco=50.0, cache=None, chiavi=None, strumenti=STRUMENTI_OK) -> dict:
    """Un rilevamento minimo e finto: le stesse chiavi di rileva.py, valori scelti dal test."""
    return {
        "sistema": {"os": "darwin" if apple else "linux"},
        "cpu": {"nome": "Apple M1" if apple else "AMD", "apple_silicon": apple},
        "ram_gb": ram,
        "disco_libero_gb": disco,
        "modelli_in_cache": cache or {
            MODELLO_LETTORE_GRANDE: False, MODELLO_LETTORE_PICCOLO: False,
            MODELLO_VOCE: False, MODELLO_IMMAGINI: False, MODELLO_ASCOLTO: False,
        },
        "chiavi": chiavi or {"ANTHROPIC_API_KEY": False, "OPENROUTER_API_KEY": False},
        "strumenti": strumenti,
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
    cache = {MODELLO_IMMAGINI: True, MODELLO_LETTORE_GRANDE: True, MODELLO_VOCE: True, MODELLO_ASCOLTO: True}
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
    p = scegli(rilevamento(apple=False, ram=32.0, strumenti={"whisper-server": False, "mkcert": False}))
    assert p["id"] == "altro"
    assert p["componenti"]["lettore"]["provider"] == "finto"
    assert p["componenti"]["voce"]["provider"] == "finto"
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


def test_ascolto_su_apple_e_locale_con_le_sue_riserve() -> None:
    p = scegli(rilevamento(ram=16.0, disco=50.0))
    assert p["componenti"]["ascolto"]["provider"] == "locale"
    assert p["componenti"]["ascolto"]["riserve"] == ["openrouter", "nessuno"]
    assert MODELLO_ASCOLTO in p["modelli"]
    assert MODELLO_ASCOLTO in p["da_scaricare"]
    piccolo = scegli(rilevamento(ram=8.0, disco=50.0))
    assert piccolo["componenti"]["ascolto"]["provider"] == "locale"
    assert MODELLO_ASCOLTO in piccolo["modelli"]


def test_ascolto_ordine_dopo_la_voce() -> None:
    chiavi = list(scegli(rilevamento())["componenti"])
    assert chiavi.index("ascolto") == chiavi.index("voce") + 1


def test_ascolto_non_apple_con_whisper_trovato() -> None:
    p = scegli(rilevamento(apple=False, ram=32.0))
    assert p["componenti"]["ascolto"]["provider"] == "locale"
    assert "not tested yet" in p["componenti"]["ascolto"]["motivo"]
    assert MODELLO_ASCOLTO in p["modelli"]


def test_ascolto_non_apple_senza_whisper_e_nessuno() -> None:
    p = scegli(rilevamento(apple=False, ram=32.0, strumenti={"whisper-server": False, "mkcert": False}))
    assert p["componenti"]["ascolto"]["provider"] == "nessuno"
    assert "docs/ascolto.md" in p["componenti"]["ascolto"]["motivo"]
    assert MODELLO_ASCOLTO not in p["modelli"]
    # Nessun avviso su mkcert quando il microfono non è usato.
    assert not any("mkcert" in a for a in p["avvisi"])


def test_avviso_whisper_mancante_su_apple() -> None:
    p = scegli(rilevamento(ram=16.0, strumenti={"whisper-server": False, "mkcert": True}))
    assert any(a.startswith("whisper-server not found") and "brew install whisper.cpp" in a for a in p["avvisi"])
    assert not any("mkcert not found" in a for a in p["avvisi"])


def test_avviso_mkcert_mancante_quando_c_e_ascolto() -> None:
    p = scegli(rilevamento(ram=16.0, strumenti={"whisper-server": True, "mkcert": False}))
    assert any(a.startswith("mkcert not found") and "scripts/certificato.sh" in a for a in p["avvisi"])
    assert not any("whisper-server not found" in a for a in p["avvisi"])


def test_rilevamento_senza_chiavi_strumenti_non_crolla() -> None:
    # Un rilevamento vecchio, senza «strumenti»: nessun errore e nessun avviso sul microfono.
    vecchio = rilevamento(ram=16.0)
    del vecchio["strumenti"]
    p = scegli(vecchio)
    assert p["componenti"]["ascolto"]["provider"] == "locale"
    assert not any("not found" in a for a in p["avvisi"])
    p_altro = scegli(rilevamento(apple=False) | {"strumenti": {}})
    assert p_altro["componenti"]["ascolto"]["provider"] == "nessuno"


def test_locale_yaml_riga_ascolto() -> None:
    testo = profilo.testo_locale(scegli(rilevamento(ram=16.0)), quando="x")
    assert "  ascolto: {provider: locale, riserve: [openrouter, nessuno]}" in testo


@pytest.mark.parametrize("repo", [MODELLO_LETTORE_GRANDE, MODELLO_VOCE, MODELLO_IMMAGINI, MODELLO_ASCOLTO])
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


def test_lingua_scritta_in_cima_e_validata() -> None:
    p = scegli(rilevamento(ram=16.0, disco=50.0), lingua="en")
    testo = profilo.testo_locale(p, quando="x")
    assert "\nlingua: en\n" in testo
    assert testo.index("lingua: en") < testo.index("componenti:")
    assert "\nlingua: it\n" in profilo.testo_locale(scegli(rilevamento()), quando="x")
    with pytest.raises(ValueError):
        scegli(rilevamento(), lingua="fr")


def test_ambiente_mancante_e_segnalato() -> None:
    r = rilevamento(ram=16.0, disco=50.0)
    r["ambienti"] = {"lettore": False, "voce": True, "immagini": True}
    p = scegli(r)
    assert p["ambienti_mancanti"] == ["lettore"]
    assert not any("missing" in a for a in p["avvisi"])  # una sola segnalazione: NOT READY nel riepilogo


def test_ambiente_presente_nessun_avviso() -> None:
    r = rilevamento(ram=16.0, disco=50.0)
    r["ambienti"] = {"lettore": True, "voce": True, "immagini": True}
    assert scegli(r)["ambienti_mancanti"] == []


def test_ambienti_non_misurati_nessun_avviso() -> None:
    assert scegli(rilevamento(ram=16.0, disco=50.0))["ambienti_mancanti"] == []


def test_fabbisogno_apple_16_con_e_senza_immagini() -> None:
    # Senza immagini: modelli 7,2 (lettore, voce, ascolto) + ambienti lettore e voce 0,9 + npm 0,2 = 8,3.
    # Con immagini: + modello 4,6 e ambiente 1,2 = 14,1. L'ambiente delle immagini non entra nel «senza».
    assert profilo.fabbisogno_gb("apple-16") == 8.3
    assert profilo.fabbisogno_gb("apple-16", con_immagini=True) == 14.1
    testo = profilo.fabbisogno_testo("apple-16")
    assert "with the images about 14.1 GB (models 11.8 GB + Python environments 2.1 GB" in testo
    assert "without the images about 8.3 GB (models 7.2 GB + Python environments 0.9 GB" in testo


def test_fabbisogno_piccolo_e_altro_hanno_una_cifra_sola() -> None:
    assert profilo.fabbisogno_gb("apple-piccolo") == 7.3
    assert profilo.fabbisogno_testo("apple-piccolo").startswith("about 7.3 GB")
    assert profilo.fabbisogno_testo("altro").startswith("about 0.2 GB")


def test_alternative_leggeri_sono_piu_piccoli_di_apple_16() -> None:
    assert profilo.fabbisogno_gb("altro") < profilo.fabbisogno_gb("apple-piccolo") < profilo.fabbisogno_gb("apple-16")
    assert len(profilo.alternative_leggere()) == 2


# --- Le scelte di config/locale.yaml vincono sul profilo -------------------------------------------------

def con_ambienti(r: dict, presenti: bool) -> dict:
    return {**r, "ambienti": {"lettore": presenti, "voce": presenti, "immagini": presenti}}


def test_scelte_locali_immagini_spente_tolgono_il_modello() -> None:
    r = rilevamento(ram=16.0, disco=50.0)
    p = scegli(r)
    assert MODELLO_IMMAGINI in p["modelli"]  # il profilo, da solo, le vorrebbe
    scelte = {"origine": "config/locale.yaml", "componenti": {"immagini": {"provider": "nessuno", "riserve": []}},
              "modello_lettore": None, "non_lette": []}
    q = profilo.applica_scelte_locali(p, scelte, r)
    assert MODELLO_IMMAGINI not in q["modelli"] and MODELLO_IMMAGINI not in q["da_scaricare"]
    assert q["componenti"]["immagini"]["provider"] == "nessuno"
    assert q["componenti"]["immagini"]["motivo"] == "set in config/locale.yaml"
    assert q["fonte_scelte"] == "config/locale.yaml"
    assert q["scelte_sovrascritte"] == {"immagini": "nessuno"}
    assert MODELLO_VOCE in q["modelli"]  # le altre scelte restano


def test_reader_su_api_perde_il_suo_modello_e_il_backend_cambia_il_modello() -> None:
    r = rilevamento(ram=16.0, disco=50.0)
    p = scegli(r)
    api = {"origine": "x", "componenti": {"lettore": {"provider": "anthropic", "riserve": []}},
           "modello_lettore": None, "non_lette": []}
    assert MODELLO_LETTORE_GRANDE not in profilo.applica_scelte_locali(p, api, r)["modelli"]
    piccolo = {"origine": "x", "componenti": {}, "modello_lettore": MODELLO_LETTORE_PICCOLO, "non_lette": []}
    assert MODELLO_LETTORE_PICCOLO in profilo.applica_scelte_locali(p, piccolo, r)["modelli"]
    assert MODELLO_LETTORE_GRANDE not in profilo.applica_scelte_locali(p, piccolo, r)["modelli"]


def test_senza_scelte_il_profilo_non_cambia() -> None:
    r = rilevamento(ram=16.0, disco=50.0)
    p = scegli(r)
    assert profilo.applica_scelte_locali(p, None, r) is p


def test_avviso_immagini_spente_non_ripetuto_se_le_scelte_le_spengono() -> None:
    r = rilevamento(ram=16.0, disco=9.0)  # il profilo spegne le immagini per il disco: c'è l'avviso
    p = scegli(r)
    assert any(a.startswith("Images off:") for a in p["avvisi"])
    scelte = {"origine": "x", "componenti": {"immagini": {"provider": "nessuno", "riserve": []}},
              "modello_lettore": None, "non_lette": []}
    assert not any(a.startswith("Images off:") for a in profilo.applica_scelte_locali(p, scelte, r)["avvisi"])


def test_disco_ancora_necessario_su_computer_nuovo() -> None:
    r = con_ambienti(rilevamento(ram=16.0, disco=50.0), presenti=False)
    p = scegli(r)
    assert profilo.da_occupare_gb(p, r) == 14.1  # tutto da installare, con immagini
    scelte = {"origine": "x", "componenti": {"immagini": {"provider": "nessuno", "riserve": []}},
              "modello_lettore": None, "non_lette": []}
    q = profilo.applica_scelte_locali(p, scelte, r)
    assert profilo.da_occupare_gb(q, r) == 8.3  # senza immagini: niente modello né ambiente delle immagini


def test_disco_ancora_necessario_zero_modelli_se_gia_installato() -> None:
    cache = {m: True for m in (MODELLO_LETTORE_GRANDE, MODELLO_VOCE, MODELLO_IMMAGINI, MODELLO_ASCOLTO)}
    r = con_ambienti({**rilevamento(ram=16.0, disco=50.0, cache=cache)}, presenti=True)
    assert profilo.da_occupare_gb(scegli(r), r) == 0.2  # solo il npm: nessun falso allarme sul disco


def test_api_con_riserva_locale_tiene_il_modello() -> None:
    # Una riserva locale senza modello sarebbe una promessa rotta: il modello resta, e il piano lo dice.
    r = rilevamento(ram=16.0, disco=50.0)
    p = scegli(r)
    scelte = {"origine": "x", "componenti": {"lettore": {"provider": "anthropic", "riserve": ["locale", "finto"]}},
              "modello_lettore": None, "non_lette": []}
    q = profilo.applica_scelte_locali(p, scelte, r)
    assert MODELLO_LETTORE_GRANDE in q["modelli"]
    assert q["modelli_di_riserva"] == {"lettore": MODELLO_LETTORE_GRANDE}
    assert profilo.serve_locale(q["componenti"]["lettore"])


def test_immagini_spente_con_riserva_locale_tengono_il_modello() -> None:
    r = rilevamento(ram=16.0, disco=50.0)
    scelte = {"origine": "x", "componenti": {"immagini": {"provider": "nessuno", "riserve": ["locale"]}},
              "modello_lettore": None, "non_lette": []}
    q = profilo.applica_scelte_locali(scegli(r), scelte, r)
    assert MODELLO_IMMAGINI in q["modelli"]
    assert q["modelli_di_riserva"] == {"immagini": MODELLO_IMMAGINI}


def test_nessuna_riserva_locale_nessun_modello_di_riserva() -> None:
    r = rilevamento(ram=16.0, disco=50.0)
    scelte = {"origine": "x", "componenti": {"voce": {"provider": "openrouter", "riserve": ["finto"]}},
              "modello_lettore": None, "non_lette": []}
    q = profilo.applica_scelte_locali(scegli(r), scelte, r)
    assert MODELLO_VOCE not in q["modelli"]
    assert q["modelli_di_riserva"] == {}

"""Test delle parti deterministiche del lavoro tra le sessioni (strumenti/tra_sessioni.py).

    python3 -m pytest -q strumenti/test_tra_sessioni.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

import tra_sessioni as T  # noqa: E402
from test_valida_campagna import ARCO_MINI  # noqa: E402
from valida import valida  # noqa: E402

MINI, ARCO = QUI / "test_valida_fixtures" / "mini", QUI / "test_valida_fixtures" / "arco"


@pytest.fixture
def giocata(tmp_path: Path) -> Path:
    """Il mini dopo la sessione 1: registro e stato, ma ancora senza il pacchetto della sessione 2."""
    dest = tmp_path / "mini"
    shutil.copytree(MINI, dest)
    shutil.copytree(ARCO, dest, dirs_exist_ok=True)
    shutil.rmtree(dest / "sessioni" / "02")
    return dest


def _codici(cartella: Path) -> tuple[set[str], set[str]]:
    es, _ = valida(cartella, contesto_b=False)
    tieni = lambda c: c.split(".")[0] in ("STATO", "CONTINUITÀ")  # noqa: E731
    return {c for c in es.codici() if tieni(c)}, {v.codice for v in es.avvisi if tieni(v.codice)}


def test_scheletro_del_pacchetto_dallo_stato(giocata, capsys):
    assert T.pacchetto(giocata, 1) == 0
    dest = giocata / "sessioni" / "02"
    sessione = yaml.safe_load((dest / "sessione.yaml").read_text())
    assert sessione["pieni_all_inizio"] == {"o_mercante": 1, "o_processione": 4}   # the fronts' extra clocks continue too
    assert {f["id"] for f in sessione["preparazione"]["fili"]} == {"pr_irma_tetto", "filo_mercante"}
    bruno = yaml.safe_load((dest / "png" / "png_bruno.yaml").read_text())
    assert "f_impronte_cera" in bruno["sa"] and bruno["atteggiamento_pg"]["pg_lia"]["stato"] == "amichevole"
    parole = {v["parola"] for v in yaml.safe_load((dest / "repertorio" / "parole_segrete.yaml").read_text())["parole"]}
    assert "fagotto" not in parole and "la lanterna in cantina" not in parole     # i PG lo sanno
    # Lo scheletro è già continuo con lo stato: restano solo le scelte dell'agente (come riprendere i fili).
    errori_, avvisi_ = _codici(giocata)
    assert errori_ == set() and avvisi_ == {"CONTINUITÀ.promessa"}


def test_pacchetto_non_sovrascrive(giocata):
    T.pacchetto(giocata, 1)
    f = giocata / "sessioni" / "02" / "sessione.yaml"
    f.write_text("riassunto_iniziale: scritto dall'agente\n")
    T.pacchetto(giocata, 1)
    assert f.read_text() == "riassunto_iniziale: scritto dall'agente\n"


def test_pacchetto_senza_stato_aggiornato(giocata):
    (giocata / "stato" / "stato.yaml").write_text("dopo_sessione: 0\n")
    assert T.pacchetto(giocata, 1) == 1


def test_mossa_del_mondo_dall_arco(giocata, capsys):
    campagna = yaml.safe_load((giocata / "campagna.yaml").read_text())
    campagna["preparazione"]["arco"] = ARCO_MINI
    (giocata / "campagna.yaml").write_text(yaml.safe_dump(campagna, allow_unicode=True, sort_keys=False))
    assert T.mondo(giocata, 1) == 0
    out = capsys.readouterr().out
    assert "+2 → 2" in out and "tp_pegno" in out and "accelera (+1)" in out


def test_riassunto_e_cli(giocata):
    r = subprocess.run([sys.executable, str(QUI / "tra_sessioni.py"), "riassunto", str(giocata), "1"], capture_output=True, text=True)
    assert r.returncode == 0 and "i_botte (t5)" in r.stdout
    assert subprocess.run([sys.executable, str(QUI / "tra_sessioni.py"), "riassunto", str(giocata), "4"],
                          capture_output=True).returncode == 1


def test_riassunto_del_mondo_e_degli_atteggiamenti(giocata, capsys):
    # docs/mondo.md: the world's log and the attitudes changed in play, with a fact ready for stato.yaml.
    f = giocata / "sessioni" / "01" / "registro.yaml"
    d = yaml.safe_load(f.read_text(encoding="utf-8"))
    d["mondo"] = [{"id": "o_processione", "conseguenza": "o_processione@2", "tipo": "conseguenza", "segno": 2, "cosa": "La banda si accorda.",
                   "visto": False, "scena": "scena_uno", "turno": 4, "emerso_al_turno": 6}]
    d["atteggiamenti"] = [{"id": "png_bruno", "pg": "pg_lia", "da": "indifferente", "a": "amichevole", "turno": 3, "causa": "narratore", "perche": None}]
    f.write_text(yaml.safe_dump(d, allow_unicode=True, sort_keys=False), encoding="utf-8")
    assert T.riassunto(giocata, 1) == 0
    out = capsys.readouterr().out
    assert "mondo t4: o_processione@2 (o_processione 2, fuori scena, emerso al t6): La banda si accorda." in out
    assert "atteggiamento t3: png_bruno verso pg_lia indifferente → amichevole (narratore)" in out
    fatti = yaml.safe_load(out.split("Da mettere in stato/stato.yaml")[1].split("\n", 1)[1])["fatti"]
    assert fatti[0]["fonte"] == {"sessione": 1, "turno": 3, "evento": {"atteggiamento": "png_bruno"}}
    assert fatti[0]["effetti"] == {"png": {"png_bruno": {"atteggiamento": {"pg_lia": "amichevole"}}}}


def test_completo_vuole_cio_che_tocca_all_agente(giocata):
    T.pacchetto(giocata, 1)
    assert T.completo(giocata, 1) == 1                       # lo scheletro da solo non basta
    shutil.copytree(ARCO / "sessioni" / "02", giocata / "sessioni" / "02", dirs_exist_ok=True)
    assert T.completo(giocata, 1) == 0                       # il pacchetto della fixture è completo


def test_script_tra_sessioni(giocata):
    script = [str(QUI.parent / "scripts" / "tra-sessioni.sh"), str(giocata), "1"]
    assert subprocess.run(script, capture_output=True, text=True).returncode == 0
    assert subprocess.run([*script, "--pacchetto"], capture_output=True, text=True).returncode == 0
    assert subprocess.run([*script, "--verifica"], capture_output=True, text=True).returncode == 1   # scheletro vuoto
    assert subprocess.run([script[0], str(giocata), "x"], capture_output=True).returncode == 2


def test_riassunto_dei_png_improvvisati(giocata, capsys):
    # docs/coerenza.md: a minor character the narrator improvised in play ([nuovo png]) is listed for the Preparer.
    f = giocata / "sessioni" / "01" / "registro.yaml"
    d = yaml.safe_load(f.read_text(encoding="utf-8"))
    d["png_improvvisati"] = [{"id": "png_imp_oreste", "nome": "Oreste", "ruolo": "pastore", "turno": 9, "scena": "scena_uno"}]
    f.write_text(yaml.safe_dump(d, allow_unicode=True, sort_keys=False), encoding="utf-8")
    assert T.riassunto(giocata, 1) == 0
    out = capsys.readouterr().out
    assert "PNG improvvisato t9: Oreste (pastore, scena_uno): da tenere (una scheda), rifondere in un PNG del canone o lasciare" in out


def test_riassunto_degli_oggetti(giocata, capsys):
    # A22 (docs/coerenza.md §1): the objects that changed hands are listed for the next package's state.
    f = giocata / "sessioni" / "01" / "registro.yaml"
    d = yaml.safe_load(f.read_text(encoding="utf-8"))
    d["oggetti"] = [{"id": "ogg_chiave", "chi": "pg_anna", "turno": 4}, {"id": "ogg_lettera", "chi": None, "turno": 6}]
    f.write_text(yaml.safe_dump(d, allow_unicode=True, sort_keys=False), encoding="utf-8")
    assert T.riassunto(giocata, 1) == 0
    out = capsys.readouterr().out
    assert "oggetto t4: ogg_chiave → pg_anna" in out
    assert "oggetto t6: ogg_lettera → al suo posto" in out


def test_pacchetto_porta_pg_e_tempo_dal_registro(giocata):
    """R2: the PCs' hit points, gear, coins, counters and the game clock at the end of session 1 (registro.yaml →
    pg_alla_fine, tempo_alla_fine) are where session 2 starts (sessione.yaml → pg_all_inizio, tempo_all_inizio)."""
    f = giocata / "sessioni" / "01" / "registro.yaml"
    d = yaml.safe_load(f.read_text(encoding="utf-8"))
    pg = d["pg"][0]["id"]
    d["pg_alla_fine"] = [{"id": pg, "pf": 3, "oggetti": {"torcia": 2}, "monete": {"mo": 7}, "contatori": {"slot_1": 0}}]
    d["tempo_alla_fine"] = {"giorno": 1, "ora": 21, "minuto": 40}
    f.write_text(yaml.safe_dump(d, allow_unicode=True, sort_keys=False), encoding="utf-8")
    assert T.pacchetto(giocata, 1) == 0
    sessione = yaml.safe_load((giocata / "sessioni" / "02" / "sessione.yaml").read_text())
    assert sessione["pg_all_inizio"] == {pg: {"pf": 3, "oggetti": {"torcia": 2}, "monete": {"mo": 7}, "contatori": {"slot_1": 0}}}
    assert sessione["tempo_all_inizio"] == {"giorno": 1, "ora": 21, "minuto": 40}

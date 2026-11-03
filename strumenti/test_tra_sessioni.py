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
    assert sessione["pieni_all_inizio"] == {"o_mercante": 1, "o_processione": 4}
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

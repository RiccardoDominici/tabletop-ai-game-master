"""Test dello stato degli asset (strumenti/stato_preparazione.py), che scripts/prepara.sh usa per decidere.

    python3 -m pytest -q strumenti/test_stato_preparazione.py
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
import yaml

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

import stato_preparazione as SP  # noqa: E402

MINI = QUI / "test_valida_fixtures" / "mini"
RADICE = QUI.parent


@pytest.fixture
def camp(tmp_path: Path) -> Path:
    dest = tmp_path / "mini"
    shutil.copytree(MINI, dest)
    return dest


def _audio_completo(camp: Path) -> None:
    """Un manifest audio con ogni asset atteso e i descrittori di oggi, come dopo un giro della pipeline."""
    import campagna_audio
    import descrittori as D

    s = SP.stato_audio(camp)
    cartella = camp / "audio"
    cartella.mkdir()
    man = {"versione": 1}
    for sezione, v in s["sezioni"].items():
        man[sezione] = [{"id": i, "file": f"{i}.m4a"} for i in v["mancanti"]]
        for i in v["mancanti"]:
            (cartella / f"{i}.m4a").write_bytes(b"x")
    (cartella / "manifest.json").write_text(json.dumps(man), encoding="utf-8")
    d = D.tutto(campagna_audio.leggi(camp))
    (cartella / "descrittori.json").write_text(json.dumps(D.come_json(d), ensure_ascii=False, indent=1), encoding="utf-8")


def test_campagna_senza_asset_non_e_pronta(camp):
    s = SP.stato(camp)
    assert not s["pronta"]
    assert s["immagini"]["attese"] == 5 and len(s["immagini"]["mancanti"]) == 5 and s["immagini"]["stima_s"] > 0
    assert s["audio"]["da_rifare"] and "umore_lutto" in s["audio"]["essenziali_mancanti"]


def test_audio_completo_non_si_rifa_finche_le_schede_non_cambiano(camp):
    _audio_completo(camp)
    s = SP.stato_audio(camp)
    assert not s["da_rifare"] and not s["essenziali_mancanti"]
    # Uno strato facoltativo che manca (le fonti non l'avevano) non fa rilanciare tutto.
    man = json.loads((camp / "audio" / "manifest.json").read_text())
    man["effetti"] = []
    (camp / "audio" / "manifest.json").write_text(json.dumps(man))
    s = SP.stato_audio(camp)
    assert s["facoltativi_mancanti"] and not s["da_rifare"]
    # Una modifica che l'audio legge (un luogo nuovo nella pianta) cambia i descrittori: si rifà.
    scena = yaml.safe_load((camp / "scena.yaml").read_text())
    scena["descrizione"] += " Fuori piove forte sul cortile."
    (camp / "scena.yaml").write_text(yaml.safe_dump(scena, allow_unicode=True, sort_keys=False))
    assert SP.stato_audio(camp)["descrittori_cambiati"] and SP.stato_audio(camp)["da_rifare"]


def test_cli_json_e_rapporto(camp):
    script = QUI / "stato_preparazione.py"
    js = subprocess.run([sys.executable, str(script), str(camp), "--json"], capture_output=True, text=True)
    assert js.returncode == 0 and json.loads(js.stdout)["campagna"] == "mini"
    testo = subprocess.run([sys.executable, str(script), str(camp)], capture_output=True, text=True).stdout
    assert "pronta da giocare: no" in testo
    assert subprocess.run([sys.executable, str(script), str(camp / "png")], capture_output=True).returncode == 2


def test_prepara_si_ferma_se_la_campagna_ha_errori(camp):
    # Nessuna generazione su una campagna non valida: esce 1 prima delle immagini.
    (camp / "pg.yaml").unlink()
    r = subprocess.run(["bash", str(RADICE / "scripts" / "prepara.sh"), str(camp), "--senza-immagini", "--senza-audio"],
                       capture_output=True, text=True, cwd=RADICE)
    assert r.returncode == 1 and "2/4" not in r.stdout


# --- «Pronta da giocare»: vera solo con tutto ciò che serve, presente e aggiornato -----------------

def _immagini_complete(camp: Path, salta: tuple[str, ...] = ()) -> None:
    """Un manifest delle immagini come dopo un giro di genera.py: file, voci con la firma di oggi, alias."""
    import campagna
    from freschezza import firme_attese
    from manifest import Manifest
    from motore import Motore

    man = Manifest(camp / "immagini")
    tutte = campagna.richieste(camp)
    attese = firme_attese(tutte, man, Motore().descrizione)
    for r in tutte:
        if r.id in salta:
            continue
        if not r.alias_di:
            (man.cartella / r.file).parent.mkdir(parents=True, exist_ok=True)
            (man.cartella / r.file).write_bytes(b"jpg")
        man.voci[r.id] = {"id": r.id, "file": r.file, "tipo": r.tipo, "seme": r.seme, "prompt": r.prompt,
                          **({"alias_di": r.alias_di} if r.alias_di else {"firma": attese[r.id]})}
    man.salva()


def _situazione_dichiarata(camp: Path) -> None:
    """Una situazione scritta nella scheda (con la sua rivelazione), come quelle delle campagne vere."""
    f = camp / "png" / "png_bruno.yaml"
    d = yaml.safe_load(f.read_text())
    d.setdefault("aspetto", {})["situazioni"] = [{"id": "di_notte", "dopo": ["i_qualcosa"], "prompt": "at night by the well"}]
    f.write_text(yaml.safe_dump(d, allow_unicode=True, sort_keys=False))


def test_pronta_solo_con_immagini_e_audio_completi_e_aggiornati(camp):
    _audio_completo(camp)
    _immagini_complete(camp)
    s = SP.stato(camp)
    assert s["pronta"] and s["non_pronta"] == []
    # La scheda del luogo cambia dopo la generazione: l'immagine è vecchia, la campagna non è pronta.
    scena = yaml.safe_load((camp / "scena.yaml").read_text())
    scena["immagine"]["prompt_luogo"] += ", a lantern by the door"
    (camp / "scena.yaml").write_text(yaml.safe_dump(scena, allow_unicode=True, sort_keys=False))
    s = SP.stato(camp)
    assert not s["pronta"] and any("vecchie" in m and "luogo_scena_volpe" in m for m in s["non_pronta"])


def test_situazioni_automatiche_sono_solo_un_avviso(camp):
    _audio_completo(camp)
    _immagini_complete(camp, salta=("situazione_png_bruno_in_scena_volpe", "situazione_png_irma_in_scena_volpe"))
    s = SP.stato(camp)
    assert s["pronta"] and any("situazioni automatiche" in a for a in s["avvisi"])


def test_situazione_dichiarata_e_obbligatoria(camp):
    _situazione_dichiarata(camp)
    _audio_completo(camp)
    _immagini_complete(camp, salta=("situazione_png_bruno_di_notte",))
    s = SP.stato(camp)
    assert not s["pronta"] and any("situazione_png_bruno_di_notte" in m for m in s["non_pronta"])


def test_alias_non_registrato_e_audio_essenziale_mancante(camp):
    _audio_completo(camp)
    _immagini_complete(camp, salta=("luogo_n_locanda",))
    assert any("alias" in m and "luogo_n_locanda" in m for m in SP.stato(camp)["non_pronta"])
    _immagini_complete(camp)
    man = json.loads((camp / "audio" / "manifest.json").read_text())
    man["brani"] = []  # la musica di un luogo: essenziale
    (camp / "audio" / "manifest.json").write_text(json.dumps(man))
    s = SP.stato(camp)
    assert not s["pronta"] and any(m.startswith("audio essenziale mancante") for m in s["non_pronta"])
    assert "pronta da giocare: no, manca:" in SP.rapporto(s)

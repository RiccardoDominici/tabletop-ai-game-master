"""Test della tabella dei livelli (strumenti/strati.py).

    python3 -m pytest -q strumenti/test_strati.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import pytest

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

import strati as S  # noqa: E402


@pytest.mark.parametrize("sessioni,nome", [(1, "one-shot"), (2, "arco"), (6, "arco"), (7, "campagna"), (20, "campagna"),
                                           (21, "saga"), (300, "saga"), ("aperta", "saga")])
def test_soglie(sessioni, nome):
    assert S.livello_da_sessioni(sessioni).nome == nome


@pytest.mark.parametrize("sbagliato", [0, -3, 2.5, True, "tante", None])
def test_sessioni_non_valide(sbagliato):
    with pytest.raises(ValueError):
        S.livello_da_sessioni(sbagliato)


def test_la_tabella_copre_ogni_intero_senza_buchi():
    # Ogni livello comincia dove finisce il precedente; l'ultimo non ha fine.
    for prima, dopo in zip(S.LIVELLI, S.LIVELLI[1:]):
        assert dopo.sessioni.minimo == prima.sessioni.massimo + 1
    assert S.LIVELLI[0].sessioni.minimo == 1 and S.LIVELLI[-1].sessioni.massimo is None
    # Oggi si sa preparare solo la one-shot; gli altri dicono in che fase arrivano.
    assert [lv.nome for lv in S.LIVELLI if lv.supportato] == ["one-shot"]
    assert all(lv.prima and lv.misure and lv.perche and lv.fase for lv in S.LIVELLI)


def test_brief_senza_sessioni():
    s = S.livello_del_brief({"durata": "una sera"})
    assert s.livello is None and ("sessioni", s.problemi[0][1]) == s.problemi[0]


def test_brief_one_shot_e_scene_attese_dalle_ore():
    assert str(S.livello_del_brief({"sessioni": 1}).scene_attese) == "3–5"          # 2,5 ore predefinite
    breve = S.livello_del_brief({"sessioni": 1, "ore_per_sessione": 0.5})
    assert breve.livello.nome == "one-shot" and str(breve.scene_attese) == "1" and not breve.problemi


def test_brief_livello_forzato_col_motivo():
    brief = {"sessioni": 1, "livello": "arco",
             "decisioni": {"altre": ["Livello arco: la sera è la prima di una serie già decisa con il gruppo."]}}
    s = S.livello_del_brief(brief)
    assert s.livello.nome == "arco" and s.forzato and s.motivo and not s.problemi


def test_brief_livello_forzato_senza_motivo_o_sconosciuto():
    assert S.livello_del_brief({"sessioni": 3, "livello": "saga"}).problemi[0][0] == "forzato"
    assert S.livello_del_brief({"sessioni": 3, "livello": "epopea"}).problemi[0][0] == "forma"
    # Forzare il livello che le sessioni darebbero comunque non è forzare.
    assert not S.livello_del_brief({"sessioni": 3, "livello": "arco"}).forzato


def test_brief_ore_e_sessioni_sbagliate():
    assert S.livello_del_brief({"sessioni": 1, "ore_per_sessione": 0}).problemi[0][0] == "forma"
    assert S.livello_del_brief({"sessioni": "due"}).problemi[0][0] == "forma"


def test_cli(tmp_path):
    script = QUI / "strati.py"
    tabella = subprocess.run([sys.executable, str(script), "--tabella"], capture_output=True, text=True)
    assert tabella.returncode == 0 and "saga" in tabella.stdout
    (tmp_path / "brief.yaml").write_text("sessioni: 4\n", encoding="utf-8")
    r = subprocess.run([sys.executable, str(script), str(tmp_path)], capture_output=True, text=True)
    assert r.returncode == 0 and "arco" in r.stdout and "non ancora supportato" in r.stdout

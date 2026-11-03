"""Prove della pipeline audio (senza rete, senza ffmpeg per le parti pure).

    strumenti/audio/.venv/bin/python -m pytest strumenti/audio/test_audio.py -q
    (oppure, senza pytest: strumenti/audio/.venv/bin/python strumenti/audio/test_audio.py)
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

import campagna_audio as CA  # noqa: E402
import descrittori as D  # noqa: E402
import vocabolario as V  # noqa: E402
from fonti import sintesi  # noqa: E402
from temi import motivo as M  # noqa: E402

CAMPAGNE = QUI.parents[1] / "campagne"
SEGRETI = ("segreto", "mente_su", "ruolo", "desiderio", "paura", "fronte", "crede_a_torto", "preparazione")


def test_motivo_deterministico_e_valido():
    for semi in ("a", "prova-f0", "ponte-lanterne", "x" * 40):
        m1, m2 = M.genera(semi), M.genera(semi)
        assert m1.come_dati() == m2.come_dati()
        assert M.valida(m1) == []


def test_motivo_esplicito_sbagliato_si_scarta():
    assert M.da_dati({"metro": 4, "note": [[0, 1], [0, 1], [0, 1], [0, 1]]}, "prova") is None   # tre uguali
    assert M.da_dati({"metro": 4, "note": [[0, 1], [2, 1], [4, 1], [2, 1], [0, 4]]}, "prova") is not None


def test_variazioni_restano_nell_estensione():
    m = M.genera("prova")
    for nome, s in V.STRUMENTI.items():
        if nome not in V.STRUMENTI_TEMA:
            continue
        v = M.realizza(m, V.MODI["dorico"], 60, ["inversione", "salto"], s.estensione)
        assert min(e.altezza for e in v.eventi) >= s.estensione[0] - 2
        assert max(e.altezza for e in v.eventi) <= s.estensione[1] + 12   # al più un'ottava di salto finale


def test_strumenti_negati():
    ammessi, vietati = V.strumenti_in("fisarmonica, clarinetto. Niente percussioni da battaglia.")
    assert ammessi == ["fisarmonica", "clarinetto"] and vietati == ["percussioni"]


def test_campagne_di_prova():
    for cid in ("prova-f0", "ponte-lanterne"):
        c = CA.leggi(CAMPAGNE / cid)
        d = D.tutto(c)
        temi = d["temi"]
        assert len({t.strumento for t in temi}) == len(temi), "due PNG con lo stesso strumento"
        assert all(t.modo != "frigio" for t in temi), "un modo «sinistro» dedotto dai testi"
        for l in d["luoghi"]:
            assert l.alias_di or l.musica.umore in V.UMORI


def test_niente_campi_segreti_letti():
    """I testi dei PNG che l'audio legge non contengono il testo dei campi segreti."""
    import yaml
    for cid in ("prova-f0", "ponte-lanterne"):
        c = CA.leggi(CAMPAGNE / cid)
        for p in c.png:
            scheda = yaml.safe_load((CAMPAGNE / cid / "png" / f"{p.id}.yaml").read_text(encoding="utf-8"))
            letti = " ".join(p.testi.values())
            segreto = (scheda.get("segreto") or {}).get("testo", "")
            assert not segreto or segreto not in letti
            for m in scheda.get("mente_su") or []:
                assert m.get("versione", "") not in letti or not m.get("versione")


def test_sintesi_periodica():
    for tag in sintesi.GENERATORI:
        x = sintesi.genera(tag, 4.0, 1)
        salto = np.max(np.abs(x[0] - x[-1]))
        tipico = np.median(np.abs(np.diff(x, axis=0))) + 1e-6
        assert salto / tipico < 30, f"{tag}: giunta {salto / tipico:.1f}"


if __name__ == "__main__":
    for nome, f in list(globals().items()):
        if nome.startswith("test_"):
            f()
            print("ok", nome)

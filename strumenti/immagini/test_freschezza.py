"""Test della freschezza delle immagini (freschezza.py) e del piano di genera.py, senza modello.

    python3 -m pytest -q strumenti/immagini/test_freschezza.py

Il caso da cui nasce: un'immagine generata, poi la scheda cambia (nozze-neve, 3/11). Il file c'è, ma
non è più quello che le schede chiedono: dev'essere VECCHIA e rigenerarsi da sola, senza cancellare
niente a mano. Insieme: il seme scelto a mano resta, la migrazione delle voci senza firma non rende
vecchio ciò che non è cambiato, le voci non più richieste diventano orfane e il file finisce in cache.
"""

from __future__ import annotations

from pathlib import Path

import pytest
import yaml

import campagna
import freschezza as F
import genera
from conftest import scrivi_yaml
from manifest import Manifest

MODELLO = "modello-di-prova"


def _richieste(c: Path) -> dict[str, campagna.Richiesta]:
    return {r.id: r for r in campagna.richieste(c)}


def _registra_tutto(c: Path, semi: dict[str, int] | None = None, senza_firma: bool = False) -> Manifest:
    """Simula un giro di genera.py: un file e una voce per ogni richiesta (con la firma di oggi)."""
    man = Manifest(c / "immagini")
    rr = [r for r in campagna.richieste(c) if not r.alias_di]
    for r in rr:  # il seme va nel manifest PRIMA di calcolare le firme (è appiccicoso)
        man.voci[r.id] = {"id": r.id, "file": r.file, "tipo": r.tipo, "seme": (semi or {}).get(r.id, r.seme)}
    attese = F.firme_attese(rr, man, MODELLO)
    for r in rr:
        (man.cartella / r.file).parent.mkdir(parents=True, exist_ok=True)
        (man.cartella / r.file).write_bytes(b"jpg")
        voce = {**man.voci[r.id], "prompt": r.prompt, "riferimenti": r.riferimenti, "modello": MODELLO,
                "larghezza": r.larghezza, "altezza": r.altezza,
                "generata": list(campagna.dimensioni_generazione(r.larghezza, r.altezza))}
        if senza_firma:  # come una voce di prima del formato: il prompt registrato non ha la coda tecnica
            voce["prompt"] = r.prompt.split(", full-bleed")[0]
        else:
            voce["firma"] = attese[r.id]
        man.voci[r.id] = voce
    man.salva()
    return Manifest(c / "immagini")


def _classifica(c: Path) -> F.Stato:
    tutte = campagna.richieste(c)
    return F.classifica(tutte, tutte, Manifest(c / "immagini"), MODELLO)


def test_senza_manifest_sono_tutte_mancanti(mini: Path):
    st = _classifica(mini)
    assert {r.id for r in st.mancanti} == {r.id for r in _richieste(mini).values() if not r.alias_di}
    assert not st.vecchie and not st.aggiornate and not st.orfane


def test_dopo_un_giro_sono_tutte_aggiornate(mini: Path):
    _registra_tutto(mini)
    st = _classifica(mini)
    assert not st.mancanti and not st.vecchie and len(st.aggiornate) == 5


def test_scheda_cambiata_rende_vecchio_il_luogo_e_chi_lo_usa(mini: Path):
    _registra_tutto(mini)
    scena = yaml.safe_load((mini / "scena.yaml").read_text())
    scena["immagine"]["prompt_luogo"] = "stone hall with a crackling fireplace"  # la campanella è sparita
    scrivi_yaml(mini / "scena.yaml", scena)
    st = _classifica(mini)
    vecchie = dict((r.id, m) for r, m in st.vecchie)
    assert vecchie["luogo_scena_sala"].startswith("il prompt è cambiato")
    # La situazione nel luogo usa il luogo come riferimento: invecchia con lui.
    assert "riferimento luogo_scena_sala" in vecchie["situazione_png_uno_in_scena_sala"]
    assert {r.id for r in st.aggiornate} == {"luogo_n_bosco", "ritratto_png_uno", "situazione_png_uno_senza_cappuccio"}


def test_ritratto_cambiato_invecchia_le_sue_situazioni(mini: Path):
    _registra_tutto(mini)
    png = yaml.safe_load((mini / "png" / "png_uno.yaml").read_text())
    png["aspetto"]["invarianti"].append("barba di tre giorni")
    scrivi_yaml(mini / "png" / "png_uno.yaml", png)
    vecchie = {r.id for r, _ in _classifica(mini).vecchie}
    assert vecchie == {"ritratto_png_uno", "situazione_png_uno_senza_cappuccio", "situazione_png_uno_in_scena_sala"}


def test_il_seme_scelto_a_mano_resta(mini: Path):
    _registra_tutto(mini, semi={"luogo_n_bosco": 12})
    st = _classifica(mini)
    assert not st.vecchie
    assert F.seme_di(_richieste(mini)["luogo_n_bosco"], Manifest(mini / "immagini")) == 12


def test_migrazione_non_invecchia_cio_che_non_e_cambiato(mini: Path):
    man = _registra_tutto(mini, senza_firma=True)
    assert all("firma" not in v for v in man.voci.values())
    # Già in sola lettura (stato_preparazione) le voci senza firma risultano aggiornate.
    assert not _classifica(mini).vecchie
    fatte = F.migra(man)
    assert len(fatte) == 5
    man = Manifest(mini / "immagini")
    assert all(v.get("firma") and v.get("firma_migrata") for v in man.voci.values())
    assert F.migra(man) == []  # idempotente
    assert not _classifica(mini).vecchie


def test_migrazione_non_nasconde_una_scheda_cambiata(mini: Path):
    man = _registra_tutto(mini, senza_firma=True)
    nodi = yaml.safe_load((mini / "campagna.yaml").read_text())
    nodi["nodi"][2]["immagine"]["prompt_luogo"] = "snowy larch wood at dawn"
    scrivi_yaml(mini / "campagna.yaml", nodi)
    F.migra(man)  # firma ricalcolata dal prompt REGISTRATO, non da quello di oggi
    assert {r.id for r, _ in _classifica(mini).vecchie} == {"luogo_n_bosco"}


def test_orfane_escono_dal_manifest_e_il_file_va_in_cache(mini: Path):
    man = _registra_tutto(mini)
    png = yaml.safe_load((mini / "png" / "png_uno.yaml").read_text())
    png["aspetto"]["situazioni"] = []  # la situazione tolta (svelava un nascondiglio)
    scrivi_yaml(mini / "png" / "png_uno.yaml", png)
    st = _classifica(mini)
    assert st.orfane == ["situazione_png_uno_senza_cappuccio"]
    spostati = F.sposta_orfane(Manifest(mini / "immagini"), st.orfane)
    assert spostati == ["situazione_png_uno_senza_cappuccio.jpg"]
    man = Manifest(mini / "immagini")
    assert "situazione_png_uno_senza_cappuccio" not in man.voci
    assert not (man.cartella / "situazione_png_uno_senza_cappuccio.jpg").exists()
    assert (man.cartella / "cache" / "orfane" / "situazione_png_uno_senza_cappuccio.jpg").read_bytes() == b"jpg"


def test_genera_pianifica_rifa_mancanti_e_vecchie(mini: Path, monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setattr(genera, "modello_attuale", lambda fp16: MODELLO)
    _registra_tutto(mini)
    (mini / "immagini" / "ritratto_png_uno.jpg").unlink()  # mancante
    scena = yaml.safe_load((mini / "scena.yaml").read_text())
    scena["immagine"]["prompt_luogo"] = "stone hall with a crackling fireplace"  # vecchio
    scrivi_yaml(mini / "scena.yaml", scena)
    da_fare, st, alias, _ = genera.pianifica(mini, None, None, rifai=False)
    # Il ritratto mancante si rifà con la stessa firma (stessa immagine): le sue situazioni restano buone.
    assert [r.id for r in da_fare] == ["luogo_scena_sala", "ritratto_png_uno", "situazione_png_uno_in_scena_sala"]
    assert {r.id for r in alias} == {"luogo_n_sala", "luogo_e_festa"}
    # Con --id le orfane si cercano comunque su tutta la campagna, e il filtro vale per da_fare.
    da_fare, st, _, _ = genera.pianifica(mini, None, ["luogo_n_bosco"], rifai=False)
    assert da_fare == [] and st.orfane == []

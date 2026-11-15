"""L'output di configura.py con un computer finto e un locale.yaml di prova: nessuna rete, nessun download.

Il percorso del file delle scelte è sempre passato con --locale: questi test non leggono config/ del repository.

    python3 -m pytest -q strumenti/configura/test_configura.py
"""

from __future__ import annotations

import io
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import configura  # noqa: E402
import scarica  # noqa: E402

AMBIENTI_TUTTI = {"lettore": True, "voce": True, "immagini": True}
AMBIENTI_MANCANTI = {"lettore": False, "voce": False, "immagini": False}


def computer(tmp_path: Path, disco: float, ambienti: dict) -> dict:
    """Un Mac M1 con 16 GB finto, cache Hugging Face vuota (in tmp_path), chiavi assenti, whisper e mkcert presenti."""
    return {
        "sistema": {"os": "darwin", "versione": "x", "macchina": "arm64"},
        "cpu": {"nome": "Apple M1", "apple_silicon": True},
        "ram_gb": 16.0,
        "gpu": {"nvidia": False, "nome": None, "vram_gb": None},
        "disco_libero_gb": disco,
        "strumenti": {"claude": True, "node": True, "python3": True, "ffmpeg": True, "uv": True,
                      "whisper-server": True, "mkcert": True, "node_versione": "v25.1.0"},
        "ambienti": ambienti,
        "modelli_in_cache": {},
        "cache_hf": str(tmp_path / "hub"),
        "chiavi": {"ANTHROPIC_API_KEY": False, "OPENROUTER_API_KEY": False},
        "avvisi": [],
    }


@pytest.fixture
def senza_rete(monkeypatch):
    """Nessuna rete: le dimensioni vengono dalle stime di profilo.py."""
    def guasta(url, timeout=None):
        raise OSError("rete assente")
    monkeypatch.setattr(scarica.urllib.request, "urlopen", guasta)


def esegui(monkeypatch, tmp_path: Path, rilevamento: dict, argomenti: list[str], capsys) -> tuple[int, str]:
    monkeypatch.setattr(configura, "rileva", lambda: rilevamento)
    monkeypatch.setattr(sys, "stdin", io.StringIO(""))  # non interattivo: il download non parte mai
    rc = configura.main(argomenti)
    return rc, capsys.readouterr().out


def scrivi(tmp_path: Path, testo: str) -> Path:
    file = tmp_path / "locale.yaml"
    file.write_text(testo, encoding="utf-8")
    return file


def test_piano_con_immagini_spente_nel_file_le_toglie(tmp_path, monkeypatch, capsys, senza_rete) -> None:
    file = scrivi(tmp_path, "componenti:\n  immagini: {provider: nessuno}\n  ascolto: {provider: nessuno}\n"
                            "  lettore: {provider: anthropic, riserve: [locale, finto]}\n")
    rc, out = esegui(monkeypatch, tmp_path, computer(tmp_path, 50.0, AMBIENTI_MANCANTI),
                     ["--locale", str(file), "--scarica"], capsys)
    assert rc == 2  # niente --si e niente terminale: il download non parte
    assert "choices from" in out  # l'output dice che le scelte vengono dal file
    # Offline, stime: lettore 4,6 e voce 2,0. Il lettore è su API ma con riserva locale: il modello resta (e lo dice).
    assert "Total to download: 6.6 GB." in out
    # Solo la sezione del piano: in alto la lista dei componenti dice «nessuno» e va bene così.
    righe_piano = out.split("Models for the chosen profile")[1].splitlines()
    assert not any(r.startswith("  immagini") or r.startswith("  ascolto") for r in righe_piano)
    assert any(r.startswith("  lettore") and "kept: local fallback" in r for r in righe_piano)
    assert "mflux" not in out


def test_senza_file_il_piano_resta_quello_del_profilo(tmp_path, monkeypatch, capsys, senza_rete) -> None:
    rc, out = esegui(monkeypatch, tmp_path, computer(tmp_path, 50.0, AMBIENTI_MANCANTI),
                     ["--locale", str(tmp_path / "assente.yaml"), "--scarica"], capsys)
    assert rc == 2
    assert "Total to download: 11.77 GB." in out
    assert "choices from" not in out
    assert "mflux-community/flux2-klein-4b-mflux-q4" in out


def test_riepilogo_dice_le_due_cifre(tmp_path, monkeypatch, capsys, senza_rete) -> None:
    rc, out = esegui(monkeypatch, tmp_path, computer(tmp_path, 50.0, AMBIENTI_MANCANTI),
                     ["--locale", str(tmp_path / "assente.yaml")], capsys)
    assert rc == 0
    assert "with the images about 14.1 GB" in out
    assert "without the images about 8.3 GB" in out


def test_disco_sotto_il_fabbisogno_avvisa_e_propone_le_alternative(tmp_path, monkeypatch, capsys, senza_rete) -> None:
    rc, out = esegui(monkeypatch, tmp_path, computer(tmp_path, 13.4, AMBIENTI_MANCANTI),
                     ["--locale", str(tmp_path / "assente.yaml")], capsys)
    assert "WARNING: free disk 13.4 GB is below" in out
    assert "apple-piccolo" in out and "text-only" in out


def test_disco_sufficiente_nessun_avviso(tmp_path, monkeypatch, capsys, senza_rete) -> None:
    rc, out = esegui(monkeypatch, tmp_path, computer(tmp_path, 50.0, AMBIENTI_MANCANTI),
                     ["--locale", str(tmp_path / "assente.yaml")], capsys)
    assert "WARNING" not in out


def test_ambienti_presenti_e_modelli_in_cache_nessun_avviso_di_disco(tmp_path, monkeypatch, capsys, senza_rete) -> None:
    # Computer già installato: quasi nulla da scaricare, anche con 1 GB liberi, quindi nessun falso allarme.
    rilevamento = computer(tmp_path, 1.0, AMBIENTI_TUTTI)
    file = scrivi(tmp_path, "componenti:\n  immagini: {provider: nessuno}\n")
    rc, out = esegui(monkeypatch, tmp_path, rilevamento, ["--locale", str(file)], capsys)
    assert "WARNING" in out  # 1 GB liberi contro il npm (0.2) e i modelli non in cache: il disco serve comunque
    rilevamento["disco_libero_gb"] = 100.0
    rc, out = esegui(monkeypatch, tmp_path, rilevamento, ["--locale", str(file)], capsys)
    assert "WARNING" not in out


def test_api_senza_riserva_locale_esce_dal_piano(tmp_path, monkeypatch, capsys, senza_rete) -> None:
    file = scrivi(tmp_path, "componenti:\n  lettore: {provider: anthropic, riserve: [finto]}\n"
                            "  immagini: {provider: nessuno}\n")
    rc, out = esegui(monkeypatch, tmp_path, computer(tmp_path, 50.0, AMBIENTI_MANCANTI),
                     ["--locale", str(file), "--scarica"], capsys)
    assert "Total to download: 2.57 GB." in out  # solo voce 2,0 e ascolto 0,57 (stime offline)
    righe_piano = out.split("Models for the chosen profile")[1].splitlines()
    assert not any(r.startswith("  lettore") for r in righe_piano)

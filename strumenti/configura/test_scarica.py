"""Download con finti: nessuna rete (urlopen finto) e nessun Python vero (esecutore finto).

    python3 -m pytest -q strumenti/configura/test_scarica.py
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import scarica  # noqa: E402
from rileva import MODELLO_ASCOLTO  # noqa: E402

FILE_ASCOLTO = "ggml-large-v3-turbo-q5_0.bin"
API_ASCOLTO = "https://huggingface.co/api/models/ggerganov/whisper.cpp?blobs=true"


class Risposta(io.BytesIO):
    """Una risposta HTTP finta: si legge come un file e si usa nel «with»."""


def finto_urlopen(dati: dict, chiamate: list[str]):
    def apri(url, timeout=None):
        chiamate.append(url)
        return Risposta(json.dumps(dati).encode("utf-8"))
    return apri


SIBLINGS_WHISPER = {"siblings": [
    {"rfilename": "ggml-base.bin", "size": 147_951_465},
    {"rfilename": FILE_ASCOLTO, "size": 574_041_195},
    {"rfilename": "ggml-large-v3.bin", "size": 3_094_623_691},
    {"rfilename": "README.md", "size": 1_000},
]}


def test_dimensione_del_solo_file(monkeypatch) -> None:
    chiamate: list[str] = []
    monkeypatch.setattr(scarica.urllib.request, "urlopen", finto_urlopen(SIBLINGS_WHISPER, chiamate))
    assert scarica.dimensione_hf(MODELLO_ASCOLTO) == 0.57
    assert chiamate == [API_ASCOLTO]  # un solo controllo, sul repo


def test_dimensione_repo_intero_invariata(monkeypatch) -> None:
    dati = {"siblings": [{"rfilename": "a.safetensors", "size": 2_000_000_000}, {"rfilename": "b.json", "size": 500_000_000}]}
    monkeypatch.setattr(scarica.urllib.request, "urlopen", finto_urlopen(dati, []))
    assert scarica.dimensione_hf("mlx-community/Qwen3-8B-4bit") == 2.5


def test_file_assente_nel_repo_da_none(monkeypatch) -> None:
    monkeypatch.setattr(scarica.urllib.request, "urlopen", finto_urlopen(SIBLINGS_WHISPER, []))
    assert scarica.dimensione_hf("ggerganov/whisper.cpp:non-esiste.bin") is None


def test_rete_assente_da_none_e_stima(monkeypatch) -> None:
    def guasta(url, timeout=None):
        raise OSError("rete assente")
    monkeypatch.setattr(scarica.urllib.request, "urlopen", guasta)
    assert scarica.dimensione_hf(MODELLO_ASCOLTO) is None
    assert scarica.DIMENSIONI_APPROSSIMATE_GB[MODELLO_ASCOLTO] == 0.57


def test_codice_repo_file_usa_hf_hub_download() -> None:
    codice = scarica.codice_download(MODELLO_ASCOLTO)
    assert codice == "from huggingface_hub import hf_hub_download; hf_hub_download('ggerganov/whisper.cpp', 'ggml-large-v3-turbo-q5_0.bin')"
    assert "snapshot_download" not in codice


def test_codice_repo_intero_resta_snapshot_download() -> None:
    codice = scarica.codice_download("mlx-community/Qwen3-8B-4bit")
    assert codice == "from huggingface_hub import snapshot_download; snapshot_download('mlx-community/Qwen3-8B-4bit')"


def test_esegui_ascolto_con_il_python_della_voce(tmp_path: Path) -> None:
    py = tmp_path / "services/voce/.venv/bin/python"
    py.parent.mkdir(parents=True)
    py.write_text("")
    piano = {"voci": [
        {"repo": MODELLO_ASCOLTO, "componente": "ascolto", "in_cache": False, "python": str(py),
         "ambiente_pronto": True, "gb": 0.57, "stima": False},
    ]}
    chiamate: list[list[str]] = []
    esiti = scarica.esegui(piano, tmp_path, esecutore=lambda a: chiamate.append(a) or 0)
    assert chiamate == [[str(py), "-c", scarica.codice_download(MODELLO_ASCOLTO)]]
    assert esiti == [f"downloaded {MODELLO_ASCOLTO}"]


def test_ascolto_ha_componente_e_ambiente() -> None:
    assert scarica.COMPONENTE_PER_MODELLO[MODELLO_ASCOLTO] == "ascolto"
    assert scarica.PYTHON_PER_COMPONENTE["ascolto"] == "services/voce/.venv/bin/python"

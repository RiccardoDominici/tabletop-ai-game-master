"""Rilevamento con macchine finte: nessuna lettura reale di sysctl, nvidia-smi né della cache.

    python3 -m pytest -q strumenti/configura/test_rileva.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rileva import Ambiente, rileva  # noqa: E402

GIB = 1024**3


class Macchina(Ambiente):
    """Un computer descritto a mano. `comandi` mappa il comando (in forma di stringa) al suo output."""

    def __init__(self, sistema="darwin", comandi=None, file_testo=None, libero=100.0, trovati=(), variabili=None,
                 cache=None, esistenti=()):
        self._sistema = sistema
        self._comandi = comandi or {}
        self._file = file_testo or {}
        self._libero = libero
        self._trovati = set(trovati)
        self._variabili = variabili or {}
        self._cache = cache or {}
        self._esistenti = {str(p) for p in esistenti}

    def sistema(self):
        return self._sistema

    def macchina(self):
        return "arm64" if self._sistema == "darwin" else "x86_64"

    def release(self):
        return "25.1.0"

    def comando(self, argomenti):
        return self._comandi.get(" ".join(argomenti))

    def trova(self, nome):
        return f"/usr/bin/{nome}" if nome in self._trovati else None

    def libero_gb(self, cartella):
        return self._libero

    def esiste(self, percorso):
        return str(percorso) in self._esistenti

    def leggi(self, percorso):
        return self._file.get(str(percorso))

    def variabili(self):
        return self._variabili

    def cache_hf(self):
        return Path("/cache/hf")


RADICE = Path("/progetto")
TUTTI_STRUMENTI = ("claude", "node", "python3", "ffmpeg", "uv")
M1_16 = {
    "sysctl -n machdep.cpu.brand_string": "Apple M1",
    "sysctl -n hw.optional.arm64": "1",
    "sysctl -n hw.memsize": str(16 * GIB),
    "node -v": "v25.1.0",
}


def test_mac_m1_16_gb_e_strumenti() -> None:
    amb = Macchina(comandi=M1_16, trovati=TUTTI_STRUMENTI, libero=50.0)
    r = rileva(amb, RADICE)
    assert r["cpu"] == {"nome": "Apple M1", "apple_silicon": True}
    assert r["ram_gb"] == 16.0
    assert r["gpu"] == {"nvidia": False, "nome": None, "vram_gb": None}
    assert r["disco_libero_gb"] == 50.0
    assert r["strumenti"]["claude"] is True and r["strumenti"]["node_versione"] == "v25.1.0"
    assert r["avvisi"] == []


def test_strumento_mancante_e_node_vecchio_danno_avviso() -> None:
    comandi = dict(M1_16, **{"node -v": "v18.2.0"})
    r = rileva(Macchina(comandi=comandi, trovati=("python3",)), RADICE)
    assert r["strumenti"]["ffmpeg"] is False
    assert any("Node 22" in a for a in r["avvisi"])


def test_node_nove_non_passa_per_piu_grande_di_22() -> None:
    # Confronto come stringa direbbe che «9» > «22»: il controllo deve usare il numero.
    comandi = dict(M1_16, **{"node -v": "v9.11.2"})
    r = rileva(Macchina(comandi=comandi, trovati=("node",)), RADICE)
    assert any("Node 22" in a for a in r["avvisi"])


def test_disco_pieno_e_avviso() -> None:
    r = rileva(Macchina(comandi=M1_16, trovati=TUTTI_STRUMENTI, libero=4.0), RADICE)
    assert r["disco_libero_gb"] == 4.0
    assert any("4.0 GB" in a for a in r["avvisi"])


def test_non_apple_con_nvidia_e_ram_da_proc() -> None:
    comandi = {
        "nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits": "NVIDIA GeForce RTX 3060, 12288\n",
    }
    file_testo = {
        "/proc/cpuinfo": "processor : 0\nmodel name\t: AMD Ryzen 7 5800X\n",
        "/proc/meminfo": "MemTotal:       32768000 kB\nMemFree: 1 kB\n",
    }
    r = rileva(Macchina(sistema="linux", comandi=comandi, file_testo=file_testo, trovati=("python3",)), RADICE)
    assert r["cpu"] == {"nome": "AMD Ryzen 7 5800X", "apple_silicon": False}
    assert r["gpu"] == {"nvidia": True, "nome": "NVIDIA GeForce RTX 3060", "vram_gb": 12.0}
    assert r["ram_gb"] == 31.2
    assert any("Not Apple silicon" in a for a in r["avvisi"])


def test_sysctl_assente_non_fa_crollare() -> None:
    r = rileva(Macchina(comandi={}, trovati=()), RADICE)
    assert r["ram_gb"] is None and r["cpu"]["apple_silicon"] is False
    assert any("RAM not measured" in a for a in r["avvisi"])


def test_chiavi_solo_presenza_e_mai_valori(tmp_path: Path) -> None:
    segreta = "sk-ant-finta-ambiente-0000000000"
    r = rileva(Macchina(comandi=M1_16, trovati=TUTTI_STRUMENTI, variabili={"ANTHROPIC_API_KEY": segreta}),
               tmp_path)
    assert r["chiavi"] == {"ANTHROPIC_API_KEY": True, "OPENROUTER_API_KEY": False}
    assert segreta not in str(r)


def test_modelli_in_cache_e_ambienti(tmp_path: Path) -> None:
    amb = Macchina(
        comandi=M1_16,
        trovati=TUTTI_STRUMENTI,
        esistenti=[
            "/cache/hf/models--mlx-community--Qwen3-8B-4bit/refs/main",
            tmp_path / "services/lettore/.venv/bin/mlx_lm.server",
        ],
    )
    r = rileva(amb, tmp_path)
    assert r["modelli_in_cache"]["mlx-community/Qwen3-8B-4bit"] is True
    assert r["modelli_in_cache"]["mflux-community/flux2-klein-4b-mflux-q4"] is False
    assert r["ambienti"] == {"lettore": True, "voce": False, "immagini": False}

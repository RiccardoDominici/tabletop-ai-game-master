"""Rileva il computer: sistema, chip, memoria, GPU, disco, strumenti, ambienti, modelli in cache, chiavi.

Stdlib only: gira con qualunque `python3`, anche prima che esista un ambiente del progetto.
Usa lo stesso ordine di ricerca delle chiavi del server (strumenti/chiavi.py) e non stampa mai un valore.

    python3 -I strumenti/configura/rileva.py            JSON su stdout
    python3 -I strumenti/configura/rileva.py --out F    JSON nel file F

Il rilevamento è separato dall'ambiente (classe `Ambiente`): i test passano un ambiente finto
(strumenti/configura/test_rileva.py), così non dipendono dalla macchina su cui girano.
"""

from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

# strumenti/configura/rileva.py → radice del repository.
RADICE = Path(__file__).resolve().parents[2]
# strumenti/chiavi.py è il modulo condiviso per le chiavi (ambiente, poi .env, mai i valori).
sys.path.insert(0, str(RADICE / "strumenti"))
from chiavi import ErroreChiave, cerca_chiave  # noqa: E402

CHIAVI = ("ANTHROPIC_API_KEY", "OPENROUTER_API_KEY")
STRUMENTI = ("claude", "node", "python3", "ffmpeg", "uv")
# Ambienti Python del progetto: il file che dimostra che esistono e funzionano.
AMBIENTI = {
    "lettore": "services/lettore/.venv/bin/mlx_lm.server",
    "voce": "services/voce/.venv/bin/python",
    "immagini": "strumenti/immagini/.venv/bin/python",
}
# Modelli che i profili possono usare (repo Hugging Face). La cache è controllata, non scaricata.
MODELLI_NOTI = (
    "mlx-community/Qwen3-8B-4bit",
    "mlx-community/Qwen3-4B-Instruct-2507-4bit",
    "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit",
    "mflux-community/flux2-klein-4b-mflux-q4",
)


class Ambiente:
    """Tutto ciò che il rilevamento chiede alla macchina. Questa classe legge il computer vero."""

    def sistema(self) -> str:
        return platform.system().lower()

    def macchina(self) -> str:
        return platform.machine()

    def release(self) -> str:
        return platform.release()

    def comando(self, argomenti: list[str]) -> str | None:
        """Output di un comando (senza spazi ai bordi), None se manca o fallisce."""
        try:
            esito = subprocess.run(argomenti, capture_output=True, text=True, timeout=8, check=False)
        except (OSError, subprocess.SubprocessError):
            return None
        if esito.returncode != 0:
            return None
        return esito.stdout.strip() or None

    def trova(self, nome: str) -> str | None:
        return shutil.which(nome)

    def libero_gb(self, cartella: Path) -> float | None:
        try:
            return shutil.disk_usage(cartella).free / 1000**3
        except OSError:
            return None

    def esiste(self, percorso: Path) -> bool:
        return percorso.exists()

    def leggi(self, percorso: Path) -> str | None:
        try:
            return percorso.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return None

    def variabili(self) -> dict[str, str]:
        return dict(os.environ)

    def cache_hf(self) -> Path:
        """Cartella della cache Hugging Face, come la usa la libreria (HF_HUB_CACHE, HF_HOME, poi il default)."""
        env = os.environ
        if env.get("HF_HUB_CACHE"):
            return Path(env["HF_HUB_CACHE"])
        if env.get("HF_HOME"):
            return Path(env["HF_HOME"]) / "hub"
        return Path.home() / ".cache" / "huggingface" / "hub"


def rileva_sistema(amb: Ambiente) -> dict[str, Any]:
    return {"os": amb.sistema(), "versione": amb.release(), "macchina": amb.macchina()}


def rileva_cpu(amb: Ambiente) -> dict[str, Any]:
    """Chip e Apple silicon. Su macOS: sysctl; altrove: la prima riga «model name» di /proc/cpuinfo."""
    if amb.sistema() == "darwin":
        nome = amb.comando(["sysctl", "-n", "machdep.cpu.brand_string"])
        arm = amb.comando(["sysctl", "-n", "hw.optional.arm64"]) == "1"
        apple = arm or (nome or "").startswith("Apple")
        return {"nome": nome, "apple_silicon": bool(apple)}
    testo = amb.leggi(Path("/proc/cpuinfo")) or ""
    nome = next((r.split(":", 1)[1].strip() for r in testo.splitlines() if r.startswith("model name")), None)
    return {"nome": nome, "apple_silicon": False}


def rileva_ram_gb(amb: Ambiente) -> float | None:
    """Memoria fisica in GiB, arrotondata a un decimale (16 GB nominali risultano 16.0)."""
    if amb.sistema() == "darwin":
        valore = amb.comando(["sysctl", "-n", "hw.memsize"])
        return round(int(valore) / 1024**3, 1) if valore and valore.isdigit() else None
    testo = amb.leggi(Path("/proc/meminfo")) or ""
    for riga in testo.splitlines():
        if riga.startswith("MemTotal:"):
            kb = riga.split()[1]
            return round(int(kb) / 1024**2, 1) if kb.isdigit() else None
    return None


def rileva_gpu(amb: Ambiente) -> dict[str, Any]:
    """GPU NVIDIA via nvidia-smi (la prima se ce ne sono più d'una). Sull'Apple silicon la GPU è nel chip."""
    vuoto = {"nvidia": False, "nome": None, "vram_gb": None}
    riga = amb.comando(["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader,nounits"])
    if not riga:
        return vuoto
    nome, _, mib = riga.splitlines()[0].partition(",")
    vram = round(int(mib.strip()) / 1024, 1) if mib.strip().isdigit() else None
    return {"nvidia": True, "nome": nome.strip() or None, "vram_gb": vram}


def rileva_disco(amb: Ambiente, radice: Path) -> float | None:
    """Spazio libero, in GB decimali, sul volume del progetto (il download scrive lì e nella cache HF)."""
    libero = amb.libero_gb(radice)
    return round(libero, 1) if libero is not None else None


def rileva_strumenti(amb: Ambiente) -> dict[str, Any]:
    trovati: dict[str, Any] = {nome: amb.trova(nome) is not None for nome in STRUMENTI}
    versione = amb.comando(["node", "-v"]) if trovati["node"] else None
    trovati["node_versione"] = versione
    return trovati


def _versione_maggiore(testo: str | None) -> int:
    """«v25.1.0» → 25. Numero come intero, così 9 non risulta più grande di 22. Zero se non leggibile."""
    cifre = (testo or "").lstrip("v").split(".")[0]
    return int(cifre) if cifre.isdigit() else 0


def rileva_ambienti(amb: Ambiente, radice: Path) -> dict[str, bool]:
    return {nome: amb.esiste(radice / percorso) for nome, percorso in AMBIENTI.items()}


def modello_in_cache(amb: Ambiente, repo: str) -> bool:
    """Un modello è in cache se la cartella del repo ha uno snapshot (refs/main o almeno una snapshot)."""
    cartella = amb.cache_hf() / ("models--" + repo.replace("/", "--"))
    return amb.esiste(cartella / "refs" / "main") or amb.esiste(cartella / "snapshots")


def rileva_chiavi(amb: Ambiente, radice: Path) -> dict[str, bool]:
    """Solo presenza: True/False. Il valore non esce mai da qui."""
    presenze: dict[str, bool] = {}
    for nome in CHIAVI:
        try:
            cerca_chiave(nome, file_env=radice / ".env", ambiente=amb.variabili())
            presenze[nome] = True
        except ErroreChiave:
            presenze[nome] = False
    return presenze


def rileva(amb: Ambiente | None = None, radice: Path = RADICE) -> dict[str, Any]:
    """Il rilevamento completo. `avvisi` raccoglie ciò che un utente deve sapere subito."""
    amb = amb or Ambiente()
    sistema = rileva_sistema(amb)
    cpu = rileva_cpu(amb)
    ram = rileva_ram_gb(amb)
    disco = rileva_disco(amb, radice)
    strumenti = rileva_strumenti(amb)
    avvisi: list[str] = []
    if not cpu["apple_silicon"]:
        avvisi.append("Not Apple silicon: the local reader, the local voice and the local images are not supported here yet.")
    if ram is None:
        avvisi.append("RAM not measured on this system.")
    if disco is not None and disco < 8:
        avvisi.append(f"Only {disco} GB free on disk: no new model download fits.")
    if not strumenti["node"] or _versione_maggiore(strumenti["node_versione"]) < 22:
        avvisi.append("Node 22 or newer is required (package.json, engines).")
    if not strumenti["python3"]:
        avvisi.append("python3 not found: the campaign validator needs it.")
    return {
        "sistema": sistema,
        "cpu": cpu,
        "ram_gb": ram,
        "gpu": rileva_gpu(amb),
        "disco_libero_gb": disco,
        "strumenti": strumenti,
        "ambienti": rileva_ambienti(amb, radice),
        "modelli_in_cache": {repo: modello_in_cache(amb, repo) for repo in MODELLI_NOTI},
        "cache_hf": str(amb.cache_hf()),
        "chiavi": rileva_chiavi(amb, radice),
        "avvisi": avvisi,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Rileva il computer (JSON).")
    parser.add_argument("--out", type=Path, help="scrivi il JSON in questo file invece che su stdout")
    args = parser.parse_args(argv)
    testo = json.dumps(rileva(), indent=2, ensure_ascii=False) + "\n"
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(testo, encoding="utf-8")
    else:
        sys.stdout.write(testo)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

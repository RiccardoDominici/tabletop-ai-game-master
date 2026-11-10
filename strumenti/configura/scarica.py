"""Scarica solo ciò che il profilo sceglie, mostrando le dimensioni prima e controllando il disco.

Regole:
- si scarica solo ciò che il profilo usa e che non è già in cache (rileva.py: modelli_in_cache);
- le dimensioni vere si leggono da Hugging Face (API pubblica); se la rete manca, quelle approssimate di profilo.py;
- il disco libero dopo il download deve restare sopra DISCO_MINIMO_GB; le immagini hanno il loro minimo (8 GB);
- il download usa l'ambiente Python del progetto che lo contiene già (services/*/.venv, strumenti/immagini/.venv);
  se un ambiente manca, non se ne crea uno: si dice il comando da lanciare;
- niente viene cancellato, né in cache né altrove. Lo strumento aggiunge soltanto.
"""

from __future__ import annotations

import json
import logging
import subprocess
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable

from profilo import AMBIENTE_PER_COMPONENTE, DIMENSIONI_APPROSSIMATE_GB, DISCO_IMMAGINI_GB, MODELLO_IMMAGINI

log = logging.getLogger("configura.scarica")

DISCO_MINIMO_DOPO_GB = 2.0  # margine minimo per i download di lettore e voce
API_HF = "https://huggingface.co/api/models/{repo}?blobs=true"
# Ambiente Python che ha huggingface_hub per ogni componente, relativo alla radice del repository.
PYTHON_PER_COMPONENTE = {
    "lettore": "services/lettore/.venv/bin/python",
    "voce": "services/voce/.venv/bin/python",
    "immagini": "strumenti/immagini/.venv/bin/python",
}
# Quale componente usa ciascun modello (dal profilo).
COMPONENTE_PER_MODELLO = {
    "mlx-community/Qwen3-8B-4bit": "lettore",
    "mlx-community/Qwen3-4B-Instruct-2507-4bit": "lettore",
    "mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit": "voce",
    "mflux-community/flux2-klein-4b-mflux-q4": "immagini",
}


def dimensione_hf(repo: str, timeout: float = 8.0) -> float | None:
    """Dimensione totale del repo in GB dall'API pubblica di Hugging Face. None se la rete non risponde."""
    try:
        with urllib.request.urlopen(API_HF.format(repo=repo), timeout=timeout) as risposta:
            dati = json.loads(risposta.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as errore:
        log.warning("dimensione di %s non letta dalla rete (%s): uso la stima", repo, type(errore).__name__)
        return None
    byte = sum(int(f.get("size") or 0) for f in dati.get("siblings", []))
    return round(byte / 1000**3, 2) if byte else None


def piano(
    modelli: list[str],
    rilevamento: dict[str, Any],
    radice: Path,
    dimensione: Callable[[str], float | None] = dimensione_hf,
) -> dict[str, Any]:
    """Cosa scaricare, quanto pesa, se c'è spazio, e se l'ambiente Python per ciascuno esiste."""
    cache = rilevamento.get("modelli_in_cache", {})
    voci = []
    for repo in modelli:
        componente = COMPONENTE_PER_MODELLO.get(repo, "")
        gb = dimensione(repo)
        stima = gb is None
        if gb is None:
            gb = DIMENSIONI_APPROSSIMATE_GB.get(repo, 0.0)
        python = radice / PYTHON_PER_COMPONENTE.get(componente, "")
        voci.append({
            "repo": repo,
            "componente": componente,
            "gb": gb,
            "stima": stima,
            "in_cache": bool(cache.get(repo, False)),
            "python": str(python),
            "ambiente_pronto": python.is_file(),
        })
    da_scaricare = [v for v in voci if not v["in_cache"]]
    totale = round(sum(v["gb"] for v in da_scaricare), 2)
    libero = rilevamento.get("disco_libero_gb")
    dopo = None if libero is None else round(libero - totale, 2)
    minimo = DISCO_MINIMO_DOPO_GB
    if any(v["componente"] == "immagini" for v in da_scaricare):
        minimo = max(minimo, DISCO_IMMAGINI_GB)
    spazio_ok = dopo is not None and dopo >= minimo
    return {
        "voci": voci,
        "da_scaricare_gb": totale,
        "disco_libero_gb": libero,
        "disco_dopo_gb": dopo,
        "disco_minimo_gb": minimo,
        "spazio_ok": spazio_ok,
        "mancano_ambienti": sorted({v["componente"] for v in da_scaricare if not v["ambiente_pronto"]}),
    }


def descrivi(p: dict[str, Any]) -> list[str]:
    """Le righe da mostrare prima di chiedere conferma: dimensioni, disco, ambienti."""
    righe = ["Models for the chosen profile:"]
    for v in p["voci"]:
        stato = "already on disk" if v["in_cache"] else f"to download, about {v['gb']} GB" + (" (estimate)" if v["stima"] else "")
        righe.append(f"  {v['componente']:<9} {v['repo']}: {stato}")
    righe.append(f"Total to download: {p['da_scaricare_gb']} GB.")
    if p["disco_libero_gb"] is not None:
        righe.append(f"Free disk now: {p['disco_libero_gb']} GB; after: {p['disco_dopo_gb']} GB (minimum {p['disco_minimo_gb']} GB).")
    if not p["spazio_ok"] and p["da_scaricare_gb"] > 0:
        righe.append("NOT ENOUGH DISK: nothing will be downloaded. Free some space yourself, then run again.")
    for c in p["mancano_ambienti"]:
        righe.append(f"Python environment for '{c}' is missing: create it (see docs/guide/installation.md), then run again.")
    return righe


def esegui(p: dict[str, Any], radice: Path, esecutore: Callable[[list[str]], int] | None = None) -> list[str]:
    """Scarica le voci mancanti con l'ambiente di ciascuna. Restituisce le righe di esito."""
    def lancia(argomenti: list[str]) -> int:
        return subprocess.run(argomenti, cwd=radice, check=False).returncode

    lancia_ = esecutore or lancia
    esiti = []
    for v in p["voci"]:
        if v["in_cache"]:
            continue
        if not v["ambiente_pronto"]:
            esiti.append(f"skipped {v['repo']}: environment missing")
            continue
        codice = f"from huggingface_hub import snapshot_download; snapshot_download({v['repo']!r})"
        rc = lancia_([v["python"], "-c", codice])
        esiti.append(f"{'downloaded' if rc == 0 else 'FAILED'} {v['repo']}")
    return esiti

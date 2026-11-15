"""Legge le scelte scritte in config/locale.yaml: la sezione `componenti:` e `backend.locale.modello`.

Stdlib only, come gli altri strumenti di configura: il download non deve dipendere da PyYAML.
Legge la forma che scrive configura.py (`--out`) e quella che si scrive a mano, per esempio:

    componenti:
      immagini: {provider: nessuno}
      lettore: {provider: anthropic, riserve: [locale, finto]}
    backend:
      locale:
        modello: mlx-community/Qwen3-4B-Instruct-2507-4bit

Le righe che non capisce non vengono usate: sono elencate in `non_lette`, così chi ha scritto il file lo vede
nell'output (nessuna scelta sparisce in silenzio).
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

# I nomi dei componenti del profilo (profilo.py, scegli): una chiave sconosciuta non è una scelta valida.
COMPONENTI_NOTI = ("lettore", "arbitro_azioni", "arbitro_prove", "riassunto", "regole", "voce", "ascolto", "immagini")
RIGA_COMPONENTE = re.compile(r"^(\w+):\s*\{(.*)\}$")


def _scelta(inner: str) -> dict[str, Any] | None:
    """«provider: x, riserve: [a, b]» → {provider, riserve}. None se manca il provider."""
    provider = re.search(r"provider:\s*([^,}]+)", inner)
    if not provider:
        return None
    riserve = re.search(r"riserve:\s*\[([^\]]*)\]", inner)
    elenco = [v.strip().strip("'\"") for v in riserve.group(1).split(",")] if riserve else []
    return {"provider": provider.group(1).strip().strip("'\""), "riserve": [v for v in elenco if v]}


def leggi_testo(testo: str, origine: str = "config/locale.yaml") -> dict[str, Any]:
    """Le scelte contenute nel testo di locale.yaml. Non tocca il disco: si può provare con un testo qualsiasi."""
    componenti: dict[str, dict[str, Any]] = {}
    non_lette: list[str] = []
    modello_lettore: str | None = None
    sezione: str | None = None
    sottosezione: str | None = None
    for numero, riga in enumerate(testo.splitlines(), 1):
        if not riga.strip() or riga.lstrip().startswith("#"):
            continue
        indentazione = len(riga) - len(riga.lstrip(" "))
        corpo = riga.strip()
        if indentazione == 0:  # una chiave di primo livello: `componenti:`, `backend:`, `lingua: it`…
            sezione = corpo[:-1] if corpo.endswith(":") else None
            sottosezione = None
            continue
        if sezione == "componenti":
            trovata = RIGA_COMPONENTE.match(corpo)
            scelta = _scelta(trovata.group(2)) if trovata and indentazione == 2 else None
            if trovata and indentazione == 2 and trovata.group(1) in COMPONENTI_NOTI and scelta:
                componenti[trovata.group(1)] = scelta
            else:
                non_lette.append(f"line {numero}: {corpo}")
        elif sezione == "backend":
            if indentazione == 2 and corpo.endswith(":"):
                sottosezione = corpo[:-1]
            elif indentazione == 4 and sottosezione == "locale" and corpo.startswith("modello:"):
                modello_lettore = corpo.split(":", 1)[1].strip().strip("'\"") or None
    return {"origine": origine, "componenti": componenti, "modello_lettore": modello_lettore, "non_lette": non_lette}


def leggi(percorso: Path, origine: str = "config/locale.yaml") -> dict[str, Any] | None:
    """Le scelte del file, o None se il file non esiste (allora vale solo il profilo)."""
    if not percorso.exists():
        return None
    try:
        testo = percorso.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as errore:
        return {"origine": origine, "componenti": {}, "modello_lettore": None,
                "non_lette": [f"file not read ({type(errore).__name__})"]}
    return leggi_testo(testo, origine)

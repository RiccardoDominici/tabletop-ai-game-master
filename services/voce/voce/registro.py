"""Registro delle voci: legge assets/voci/voci.yaml e lo valida.

Parte pura (niente MLX): si può testare senza il modello.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml


class ErroreRegistro(ValueError):
    """Il file voci.yaml è malformato o punta a clip che non esistono."""


@dataclass(frozen=True)
class Voce:
    id: str
    file: Path  # percorso assoluto della clip di riferimento
    testo_rif: str  # trascrizione esatta della clip (serve al clone ICL)
    descrizione: str = ""


def carica_registro(percorso: Path) -> dict[str, Voce]:
    """Restituisce {id: Voce}, nell'ordine del file.

    Controlla: id unici e non vuoti, clip esistenti, testo_rif non vuoto.
    """
    percorso = Path(percorso)
    try:
        dati = yaml.safe_load(percorso.read_text(encoding="utf-8"))
    except FileNotFoundError as e:
        raise ErroreRegistro(f"registro voci non trovato: {percorso}") from e
    if not isinstance(dati, dict) or not isinstance(dati.get("voci"), list):
        raise ErroreRegistro(f"{percorso}: serve una chiave 'voci' con un elenco")

    voci: dict[str, Voce] = {}
    for i, riga in enumerate(dati["voci"]):
        if not isinstance(riga, dict):
            raise ErroreRegistro(f"{percorso}: voce #{i} non è un oggetto")
        vid = str(riga.get("id") or "").strip()
        if not vid:
            raise ErroreRegistro(f"{percorso}: voce #{i} senza id")
        if vid in voci:
            raise ErroreRegistro(f"{percorso}: id duplicato '{vid}'")
        testo = str(riga.get("testo_rif") or "").strip()
        if not testo:
            raise ErroreRegistro(f"{percorso}: voce '{vid}' senza testo_rif")
        clip = (percorso.parent / str(riga.get("file") or "")).resolve()
        if not clip.is_file():
            raise ErroreRegistro(f"{percorso}: voce '{vid}', clip mancante: {clip}")
        voci[vid] = Voce(id=vid, file=clip, testo_rif=testo, descrizione=str(riga.get("descrizione") or ""))
    if not voci:
        raise ErroreRegistro(f"{percorso}: nessuna voce")
    return voci

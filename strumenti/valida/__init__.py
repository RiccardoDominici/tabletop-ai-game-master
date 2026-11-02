"""Validatore delle campagne di Cantastorie (manuale del master, E1). Punto d'ingresso: valida()."""

from __future__ import annotations

from pathlib import Path

from . import regole_campagna, regole_immagini, regole_pg, regole_png, regole_repertorio, regole_scena, regole_segreti
from .carica import Campagna, carica
from .esito import CLASSI, Esito

# Ordine dei controlli: prima la struttura (carica), poi dal generale al particolare.
MODULI = [regole_campagna, regole_scena, regole_png, regole_pg, regole_immagini, regole_repertorio, regole_segreti]


def valida(cartella: Path, rigoroso: bool = False, voci: Path | None = None) -> tuple[Esito, Campagna]:
    esito = Esito(rigoroso=rigoroso)
    campagna = carica(Path(cartella), esito, voci=voci)
    if not campagna.cartella.is_dir():
        return esito, campagna
    for m in MODULI:
        m.controlla(campagna, esito)
    return esito, campagna


__all__ = ["CLASSI", "Campagna", "Esito", "valida"]

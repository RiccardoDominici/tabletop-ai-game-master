"""Validatore delle campagne di Cantastorie (manuale del master, E1). Punto d'ingresso: valida()."""

from __future__ import annotations

from pathlib import Path

from . import (regole_arco, regole_audio, regole_campagna, regole_immagini, regole_livello, regole_mondo, regole_pg, regole_png, regole_repertorio, regole_scena,
               regole_segreti, regole_stato)
from .carica import Campagna, carica
from .esito import CLASSI, Esito

# Ordine dei controlli: prima la struttura (carica), poi dal generale al particolare.
MODULI = [regole_livello, regole_arco, regole_campagna, regole_mondo, regole_scena, regole_png, regole_pg, regole_immagini, regole_audio,
          regole_repertorio, regole_segreti, regole_stato]


def valida(cartella: Path, rigoroso: bool = False, voci: Path | None = None,
           contesto_b: bool = True) -> tuple[Esito, Campagna]:
    """Valida una campagna. `contesto_b=False` salta la compilazione del contesto del modo B con node
    (lenta, circa un secondo): resta un avviso, e i campi pubblici si controllano lo stesso."""
    esito = Esito(rigoroso=rigoroso)
    campagna = carica(Path(cartella), esito, voci=voci)
    if not campagna.cartella.is_dir():
        return esito, campagna
    for m in MODULI:
        m.controlla(campagna, esito)
    regole_segreti.controlla_contesto_b(campagna, esito, attivo=contesto_b)
    return esito, campagna


__all__ = ["CLASSI", "Campagna", "Esito", "valida"]

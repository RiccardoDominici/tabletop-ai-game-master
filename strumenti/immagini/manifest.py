"""Manifest delle immagini di una campagna: campagne/<id>/immagini/manifest.json.

Una voce per immagine: id, file, tipo, prompt, seme, modello, secondi, riferimenti, quando.
Serve a due cose: sapere da dove viene ogni immagine (per rigenerarla uguale) e saltare quelle già fatte.
La scrittura è atomica (file temporaneo + rename), così un'interruzione a metà non lo corrompe.
"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

NOME = "manifest.json"


class Manifest:
    def __init__(self, cartella_immagini: Path):
        self.cartella = Path(cartella_immagini)
        self.percorso = self.cartella / NOME
        self.voci: dict[str, dict] = {}
        if self.percorso.exists():
            dati = json.loads(self.percorso.read_text(encoding="utf-8"))
            self.voci = {v["id"]: v for v in dati.get("immagini", [])}

    def gia_fatta(self, ident: str, file: str) -> bool:
        """Vera se il file esiste su disco. Il manifest da solo non basta: il file potrebbe essere stato cancellato."""
        return (self.cartella / file).exists()

    def registra(self, voce: dict) -> None:
        self.voci[voce["id"]] = voce
        self._salva()

    def _salva(self) -> None:
        self.cartella.mkdir(parents=True, exist_ok=True)
        dati = {"immagini": sorted(self.voci.values(), key=lambda v: v["id"])}
        fd, tmp = tempfile.mkstemp(dir=self.cartella, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(dati, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.percorso)

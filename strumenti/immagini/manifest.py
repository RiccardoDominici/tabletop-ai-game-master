"""Manifest delle immagini di una campagna: campagne/<id>/immagini/manifest.json.

Una voce per immagine: id, file, tipo, prompt, seme, modello, secondi, riferimenti, quando, firma
(vedi freschezza.py: dice se l'immagine è ancora quella che le schede di oggi chiederebbero), qualita
(vedi qualita.py). Serve a sapere da dove viene ogni immagine e a decidere che cosa rifare.

Scrittura sicura con più processi (3/11): genera.py gira un processo per immagine, e un altro processo
(un alias registrato a mano, --controlla) può scrivere nello stesso momento. Ogni processo carica il
manifest all'inizio: se scrivesse tutto ciò che ha in memoria cancellerebbe le voci scritte dagli altri
nel frattempo. Quindi `salva` scrive solo le voci che QUESTO oggetto ha cambiato (aggiunte, modificate,
tolte), sopra il file com'è adesso, con un lock (fcntl) e una scrittura atomica (temporaneo + rename).
"""

from __future__ import annotations

import copy
import fcntl
import json
import os
import tempfile
from pathlib import Path

NOME = "manifest.json"


class Manifest:
    def __init__(self, cartella_immagini: Path):
        self.cartella = Path(cartella_immagini)
        self.percorso = self.cartella / NOME
        self.voci: dict[str, dict] = self._leggi()
        self._originale = copy.deepcopy(self.voci)  # per sapere che cosa ha cambiato questo oggetto

    def _leggi(self) -> dict[str, dict]:
        if not self.percorso.exists():
            return {}
        dati = json.loads(self.percorso.read_text(encoding="utf-8"))
        return {v["id"]: v for v in dati.get("immagini", [])}

    def gia_fatta(self, ident: str, file: str) -> bool:
        """Vera se il file esiste su disco. Il manifest da solo non basta: il file potrebbe essere stato cancellato."""
        return (self.cartella / file).exists()

    def registra(self, voce: dict) -> None:
        self.voci[voce["id"]] = voce
        self.salva()

    def salva(self) -> None:
        """Scrive le modifiche fatte da questo oggetto sopra il manifest com'è su disco adesso."""
        self.cartella.mkdir(parents=True, exist_ok=True)
        with open(self.cartella / f"{NOME}.lock", "w") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            su_disco = self._leggi()
            for ident in set(self.voci) | set(self._originale):
                if ident not in self.voci:
                    su_disco.pop(ident, None)            # tolta qui (es. un'orfana)
                elif self.voci[ident] != self._originale.get(ident):
                    su_disco[ident] = self.voci[ident]   # aggiunta o cambiata qui
            dati = {"immagini": sorted(su_disco.values(), key=lambda v: v["id"])}
            fd, tmp = tempfile.mkstemp(dir=self.cartella, suffix=".tmp")
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(dati, f, ensure_ascii=False, indent=2)
            os.replace(tmp, self.percorso)
            # Da qui in poi questo oggetto vede anche le voci scritte dagli altri.
            self.voci = su_disco
            self._originale = copy.deepcopy(su_disco)

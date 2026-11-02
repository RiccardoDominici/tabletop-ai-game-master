"""Log del servizio: JSONL strutturato (logs/voce.jsonl) + log leggibile su stdout."""
from __future__ import annotations

import json
import logging
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path


def configura_stdout(livello: int = logging.INFO) -> None:
    """Log leggibile su stdout (lo raccoglie scripts/voce-avvio.sh in logs/voce.out)."""
    logging.basicConfig(
        level=livello,
        stream=sys.stdout,
        format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
        force=True,
    )


class DiarioJsonl:
    """Una riga JSON per evento, in append. Thread-safe (scrivono worker e thread HTTP).

    Il file si riapre a ogni riga: il volume è basso (una riga per frase) e così
    il log sopravvive a rotazioni o cancellazioni mentre il servizio gira.
    """

    def __init__(self, percorso: Path):
        self.percorso = Path(percorso)
        self.percorso.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def scrivi(self, evento: str, **campi) -> None:
        riga = {"ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds"), "evento": evento, **campi}
        testo = json.dumps(riga, ensure_ascii=False)
        with self._lock:
            with self.percorso.open("a", encoding="utf-8") as f:
                f.write(testo + "\n")

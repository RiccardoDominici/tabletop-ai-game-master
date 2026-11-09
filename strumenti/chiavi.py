"""Ricerca delle chiavi API per gli strumenti Python, nello stesso ordine del server (apps/server/src/llm/chiavi.ts).

Ordine, fisso:
  1. variabile d'ambiente (es. ANTHROPIC_API_KEY, FREESOUND_API_KEY);
  2. file .env alla radice del repository (fuori da git; modello in .env.example);
  3. file di ripiego indicato dal chiamante (per Riccardo: il .env di un altro progetto). Se non esiste, si salta.

Regole:
- dal file si legge SOLO la riga che comincia con NOME=; le altre non si interpretano né si copiano;
- due righe col nome → errore, senza mostrare contenuti;
- una riga vuota vale come «non impostata»;
- il valore non si stampa mai: i log dicono l'origine e la lunghezza.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

log = logging.getLogger("chiavi")

# strumenti/chiavi.py → strumenti → radice del repository.
RADICE = Path(__file__).resolve().parents[1]
FILE_ENV_RADICE = RADICE / ".env"


class ErroreChiave(RuntimeError):
    """Chiave assente o file malformato. Il messaggio non contiene mai il valore."""


def _togli_virgolette(v: str) -> str:
    v = v.strip()
    if len(v) >= 2 and v[0] in "\"'" and v[-1] == v[0]:
        v = v[1:-1].strip()
    return v


def _riga_del_file(percorso: Path, nome: str) -> str | None:
    """Valore della riga `nome=…` del file; None se il file non esiste o la riga è assente/vuota."""
    if not percorso.is_file():
        return None
    righe = [r for r in percorso.read_text(encoding="utf-8").splitlines() if r.startswith(nome + "=")]
    if len(righe) > 1:
        raise ErroreChiave(f"più di una riga {nome}= nel file {percorso} ({len(righe)})")
    if not righe:
        return None
    return _togli_virgolette(righe[0][len(nome) + 1:]) or None


def cerca_chiave(
    nome: str,
    *,
    file_precedente: str | Path | None = None,
    file_env: str | Path | None = None,
    ambiente: dict[str, str] | None = None,
) -> tuple[str, str]:
    """Restituisce (valore, origine). Origine: 'ambiente', 'env-radice' o 'file-precedente'.

    `ambiente` e `file_env` si passano nei test; in uso normale si leggono l'ambiente del processo e
    <radice>/.env.
    """
    env = os.environ if ambiente is None else ambiente
    valore = (env.get(nome) or "").strip()
    if valore:
        return valore, "ambiente"

    radice = _riga_del_file(Path(file_env) if file_env else FILE_ENV_RADICE, nome)
    if radice:
        return radice, "env-radice"

    if file_precedente:
        precedente = _riga_del_file(Path(file_precedente), nome)
        if precedente:
            return precedente, "file-precedente"

    passi = [f"la variabile d'ambiente {nome}", f"una riga {nome}= nel file .env alla radice del repo (vedi .env.example)"]
    if file_precedente:
        passi.append("il file di ripiego configurato")
    raise ErroreChiave(f"{nome} non trovata. Controllato: {'; '.join(passi)}.")


def lunghezza_sicura(valore: str | None) -> str:
    """Descrizione per i log: solo presenza e lunghezza."""
    return f"presente ({len(valore)} caratteri)" if valore else "assente"

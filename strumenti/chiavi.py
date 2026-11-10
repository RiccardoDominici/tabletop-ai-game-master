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
- un valore che non ha la forma di una chiave vera (prefisso e lunghezza minima, vedi FORME_CHIAVE)
  viene SCARTATO con un avviso che nomina l'origine: la ricerca passa alla fonte successiva. Serve a
  non fermarsi su un segnaposto (es. una variabile d'ambiente impostata dal proxy o dall'harness).
"""

from __future__ import annotations

import logging
import os
from collections.abc import Callable
from pathlib import Path

log = logging.getLogger("chiavi")

# strumenti/chiavi.py → strumenti → radice del repository.
RADICE = Path(__file__).resolve().parents[1]
FILE_ENV_RADICE = RADICE / ".env"

# Forma attesa per le chiavi con un formato noto: (prefisso, lunghezza minima). Un valore che non la
# rispetta (segnaposto, valore troncato) non è una chiave: si scarta e si passa alla fonte successiva.
# Le altre chiavi (FREESOUND, FISH, …) non hanno una forma nota qui, quindi non si controllano.
FORME_CHIAVE: dict[str, tuple[str, int]] = {
    "ANTHROPIC_API_KEY": ("sk-ant-", 20),
    "OPENROUTER_API_KEY": ("sk-or-", 20),
}


class ErroreChiave(RuntimeError):
    """Chiave assente o file malformato. Il messaggio non contiene mai il valore."""


def forma_valida(nome: str, valore: str) -> bool:
    """True se il valore ha la forma attesa per `nome` (o se per `nome` una forma non è definita)."""
    regola = FORME_CHIAVE.get(nome)
    if regola is None:
        return True
    prefisso, minimo = regola
    return valore.startswith(prefisso) and len(valore) >= minimo


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
    scartate: list[str] = []

    # Pigro: un file si legge solo se le fonti prima di lui non hanno dato una chiave valida.
    fonti: list[tuple[str, Callable[[], str | None]]] = [
        ("ambiente", lambda: (env.get(nome) or "").strip() or None),
        ("env-radice", lambda: _riga_del_file(Path(file_env) if file_env else FILE_ENV_RADICE, nome)),
    ]
    if file_precedente:
        fonti.append(("file-precedente", lambda: _riga_del_file(Path(file_precedente), nome)))

    for origine, leggi in fonti:
        valore = leggi()
        if not valore:
            continue
        if forma_valida(nome, valore):
            return valore, origine
        # Non si logga il valore: solo origine e lunghezza, poi si passa alla fonte successiva.
        log.warning("%s da %s scartata: non ha la forma attesa (%s); passo alla fonte successiva",
                    nome, origine, lunghezza_sicura(valore))
        scartate.append(origine)

    passi = [f"la variabile d'ambiente {nome}", f"una riga {nome}= nel file .env alla radice del repo (vedi .env.example)"]
    if file_precedente:
        passi.append("il file di ripiego configurato")
    messaggio = f"{nome} non trovata. Controllato: {'; '.join(passi)}."
    if scartate:
        messaggio += f" Scartate perché non hanno la forma attesa: {', '.join(scartate)}."
    raise ErroreChiave(messaggio)


def lunghezza_sicura(valore: str | None) -> str:
    """Descrizione per i log: solo presenza e lunghezza."""
    return f"presente ({len(valore)} caratteri)" if valore else "assente"

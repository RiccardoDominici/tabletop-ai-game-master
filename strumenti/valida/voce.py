"""Markup espressivo della voce drama-3 nelle righe del repertorio (docs/ricerca-voce-drama3.md).

Stesse regole del server (apps/server/src/voce/espressione.ts):
  [direzione]  a inizio riga, breve, in italiano: vale per tutta la riga
  [sigh] …     suoni, eventi puntuali (sigh, laugh, breath, pause e simili)
  <whisper>…</whisper>  tag accoppiati, sempre chiusi nella stessa riga
Le parole (`solo_parole`) sono ciò che si mostra e si misura (prosa, segreti, nomi): il markup lo
sente solo la voce.
"""

from __future__ import annotations

import re

from .lingua import Prosa, prosa_predefinita

TAG_ACCOPPIATI = {"whisper", "emphasis", "soft", "fast", "slow", "stress", "forceful"}
MAX_DIREZIONE = 80          # caratteri: oltre, il server la toglie
MAX_PAROLE_DIREZIONE = 8    # la regola dei prompt: «sotto le otto parole»
MAX_SEGNI_RIGA = 3          # direzioni + suoni + tag per riga (oltre, drama-3 recita peggio)

_PEZZI = re.compile(r"\[([^\[\]]{0,160})\]|<(/?)([A-Za-z][A-Za-z_-]{0,24})\s*>")


def e_suono(contenuto: str, suoni: frozenset[str] | None = None) -> bool:
    """Un suono di drama-3 (sospiro, sigh…) del pacchetto di lingua; senza, quello italiano."""
    pacco = suoni if suoni is not None else prosa_predefinita().suoni
    return re.sub(r"\s+", " ", contenuto.strip().lower()) in pacco


def solo_parole(testo: str) -> str:
    """Il testo senza direzioni, suoni e tag (spazi sistemati)."""
    if "[" not in testo and "<" not in testo:
        return testo
    t = _PEZZI.sub(" ", testo)
    t = re.sub(r"\s+", " ", t)
    t = re.sub(r"\s+([,.;:!?…»”)])", r"\1", t)
    t = re.sub(r"([«“(])\s+", r"\1", t)
    return t.strip()


def problemi(testo: str, prosa: Prosa | None = None) -> list[tuple[str, str, str]]:
    """Problemi del markup di una riga (senza l'etichetta [chi]): [(gravità, regola, dettaglio)]."""
    out: list[tuple[str, str, str]] = []
    pila: list[str] = []
    segni = 0
    prima_parola = True
    pos = 0
    for m in _PEZZI.finditer(testo):
        if re.search(r"[\w]", testo[pos:m.start()]):
            prima_parola = False
        pos = m.end()
        if m.group(1) is not None:
            c = re.sub(r"\s+", " ", m.group(1)).strip()
            segni += 1
            if not c:
                out.append(("errore", "vuota", "parentesi quadre vuote"))
                continue
            if e_suono(c, (prosa or prosa_predefinita()).suoni):
                continue
            if len(c) > MAX_DIREZIONE:
                out.append(("errore", "direzione_lunga", f"direzione di {len(c)} caratteri (max {MAX_DIREZIONE}): il server la toglie: «{c[:50]}…»"))
            elif len(c.split()) > MAX_PAROLE_DIREZIONE:
                out.append(("avviso", "direzione_lunga", f"direzione di {len(c.split())} parole (meglio sotto le {MAX_PAROLE_DIREZIONE}): «{c}»"))
            if re.search(r"[.!?]", c):
                out.append(("errore", "direzione_punto", f"punto dentro la direzione «{c}»: il divisore di frasi la spezzerebbe"))
            if not prima_parola:
                out.append(("avviso", "direzione_a_meta", f"direzione «{c}» a metà riga: vale da lì in poi (va bene solo per un cambio di tono)"))
            continue
        chiude, tag = m.group(2) == "/", m.group(3).lower()
        if tag not in TAG_ACCOPPIATI:
            out.append(("errore", "tag_sconosciuto", f"tag {m.group(0)} sconosciuto (ammessi: {', '.join(sorted(TAG_ACCOPPIATI))})"))
            continue
        if not chiude:
            pila.append(tag)
            segni += 1
            continue
        if tag not in pila:
            out.append(("errore", "tag_non_aperto", f"{m.group(0)} senza apertura"))
            continue
        while pila and pila[-1] != tag:
            out.append(("errore", "tag_incrociati", f"<{pila.pop()}> chiuso dentro </{tag}>"))
        pila.pop()
    for t in pila:
        out.append(("errore", "tag_non_chiuso", f"<{t}> mai chiuso nella riga: verrebbe letto ad alta voce"))
    resto = _PEZZI.sub(" ", testo)
    if "[" in resto or "]" in resto:
        out.append(("errore", "parentesi_spaiata", "parentesi quadra spaiata"))
    if re.search(r"</?[A-Za-z]", resto):
        out.append(("errore", "tag_rotto", "tag scritto male (manca la >)"))
    if segni > MAX_SEGNI_RIGA:
        out.append(("avviso", "troppi_segni", f"{segni} segni espressivi in una riga (al massimo {MAX_SEGNI_RIGA})"))
    if not solo_parole(testo):
        out.append(("errore", "senza_parole", "riga di solo markup: non c'è niente da dire"))
    return out

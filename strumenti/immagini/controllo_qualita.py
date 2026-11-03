"""Qualità di un'immagine generata: controlli a pixel (controlli.py) + controllo visivo (visione.py).

Il ciclo (genera.py lo applica a ogni immagine, nuova o già fatta ma mai controllata):
  1. si controlla; se c'è almeno un problema GRAVE l'immagine è «difettosa»;
  2. una difettosa si rigenera con un SEME NUOVO (lo stesso seme ridarebbe la stessa immagine),
     fino a MAX_TENTATIVI immagini in tutto;
  3. se anche l'ultima è difettosa si tiene la migliore (meno problemi gravi) e la si segna
     «da_controllare»: nessun nuovo tentativo automatico, la guarda una persona (stato_preparazione).

Gravità: il modello dice se un problema si nota, ma alcune classi sono gravi SEMPRE, qualunque cosa
dica (nella prova del 3/11 una firma finta era stata segnata «lieve»): scritte e firme, orli, anatomia,
segreti visibili, file sbagliati. Per «soggetto» e «incongruenza» vale il giudizio del modello.

Nel manifest, `qualita`: {esito: ok | difettosa | da_controllare | non_verificata, motivi, tentativi,
pixel, visione (descrizione, problemi, costo, token), costo_usd}.
"""

from __future__ import annotations

import logging
import zlib
from pathlib import Path

from campagna import Richiesta, segreti_png
from controlli import controlla_file

log = logging.getLogger("immagini.qualita")

MAX_TENTATIVI = 3   # l'immagine di partenza + 2 nuovi semi
# Versione del controllo: cambia quando cambiano istruzioni o regole. Un verdetto di una versione
# vecchia vale come «mai controllata» e si rifà da solo (la v1 del 3/11 scambiava per firme i fili
# d'erba nella neve e per segreti la folla di una scena).
VERSIONE = 2
# testo_o_firma è grave sempre solo se è una firma o sta in un angolo (vedi _sembra_firma).
GRAVI_SEMPRE = {"testo_o_firma", "margine", "anatomia", "segreto", "dimensioni", "vuota"}


def seme_tentativo(ident: str, n: int) -> int:
    """Il seme del tentativo n (n >= 1) di un'immagine: stabile, diverso da quello dell'id e dagli altri."""
    return zlib.crc32(f"{ident}#tentativo{n}".encode()) % 1_000_000_000


def segreti_per(r: Richiesta, cartella: Path) -> list[str]:
    """I tratti nascosti che in QUESTA immagine non devono vedersi.

    Ritratto e situazioni automatiche del PNG: le sue situazioni dichiarate (lì vivono i segreti, es. la
    cicatrice sotto il cappuccio). Una situazione dichiarata È la rivelazione: lì il segreto deve vedersi.
    """
    if r.tipo == "ritratto":
        return segreti_png(cartella, r.id.removeprefix("ritratto_"))
    if r.tipo == "situazione" and r.extra.get("automatica"):
        return segreti_png(cartella, r.extra.get("png", ""))
    return []


def valuta(percorso: Path, r: Richiesta, cartella: Path, client=None) -> dict:
    """Controlli a pixel e, se c'è un client, controllo visivo. Ritorna la voce `qualita` (senza tentativi)."""
    problemi = list(controlla_file(percorso, (r.larghezza, r.altezza)))
    visione = None
    costo = 0.0
    if client is not None:
        from visione import controlla

        try:
            v = controlla(percorso, r.prompt, r.tipo, segreti_per(r, cartella), client=client)
            visione = v.come_voce()
            costo = v.costo_usd
            problemi += v.problemi
        except Exception as err:  # la rete o l'API non devono fermare la generazione: si segna e si va avanti
            log.warning("controllo visivo di %s non riuscito (%s): resta solo quello a pixel", r.id, type(err).__name__)
            visione = {"esito": "non_verificata", "errore": type(err).__name__}
    for p in problemi:
        if p.get("tipo") in GRAVI_SEMPRE and (p["tipo"] != "testo_o_firma" or _sembra_firma(p)):
            p["grave"] = True
    gravi = [p for p in problemi if p.get("grave")]
    esito = "difettosa" if gravi else ("ok" if client is None or (visione or {}).get("esito") != "non_verificata"
                                       else "non_verificata")
    return {"esito": esito, "versione": VERSIONE,
            "motivi": [f"{p['tipo']}: {p['descrizione']} ({p.get('dove', '')})" for p in gravi],
            "problemi": problemi, "visione": visione, "costo_usd": round(costo, 6)}


def _sembra_firma(p: dict) -> bool:
    """Una scritta è grave sempre se è una firma o un monogramma, o se sta in un angolo (dove le mette il modello).

    La pseudo-scrittura su un libro dei conti o una lettera, che il prompt chiede, la decide il giudizio del
    controllo visivo (nella prova del 3/11 il registro in mano a Gaspare veniva segnato come «scritta»).
    """
    testo = f"{p.get('descrizione', '')} {p.get('dove', '')}".lower()
    return any(k in testo for k in ("firma", "monogramm", "sigla", "signature", "monogram", "initials", "angolo", "corner"))


def gravi(q: dict) -> int:
    return sum(1 for p in q.get("problemi") or [] if p.get("grave"))

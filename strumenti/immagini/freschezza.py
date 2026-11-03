"""Freschezza delle immagini: un file esiste, ma è stato generato dalla richiesta di OGGI?

Il bug che risolve (3/11, nozze-neve)
-------------------------------------
genera.py saltava un'immagine perché il file esisteva, non perché era aggiornato. Il Preparatore
ha corretto le schede dopo la generazione: la campanella sul camino è sparita dal prompt della casa
dei Bonfanti, ma la vecchia immagine sarebbe rimasta sul proiettore per sempre, senza nessun avviso.

La firma
--------
Ogni voce del manifest porta `firma`: un hash di tutto ciò che decide l'immagine,
  - il prompt FINALE (con lo stile e il formato del proiettore, vedi formato.py);
  - i riferimenti, CON la firma di ciascuno: se un ritratto cambia, le situazioni che lo usano come
    riferimento invecchiano con lui;
  - il modello (repo e opzioni), le dimensioni finali e di generazione, il seme.
Un'immagine è VECCHIA se la firma registrata è diversa da quella che la richiesta di oggi avrebbe.

Il seme è «appiccicoso»: si usa quello del manifest, non quello ricavato dall'id. Chi ha scelto a mano
un seme migliore (--rifai --seme, per togliere una firma finta) non se lo vede annullare al giro dopo.

Migrazione una tantum (voci senza firma, fatte prima del 3/11)
--------------------------------------------------------------
Una voce senza `firma` riceve la firma ricalcolata da ciò che il manifest dice di come è stata fatta
(il suo `prompt`, i riferimenti, il modello, le dimensioni, il seme), con il formato del proiettore
aggiunto al prompt registrato. Così il solo arrivo del formato non rende vecchio niente (le immagini
vecchie hanno già la rifilatura), ma una scheda cambiata dopo la generazione sì: è proprio il caso di
nozze-neve. NON si usa il prompt di oggi: timbrerebbe come aggiornata un'immagine che non lo è.
La voce migrata porta `firma_migrata` con la data.

Orfane
------
Una voce del manifest il cui id non è più tra le richieste della campagna (una situazione tolta, un
nodo rinominato) è orfana: esce dal manifest e il file va in immagini/cache/orfane/ (mai cancellato).
"""

from __future__ import annotations

import hashlib
import json
import logging
import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path

from campagna import Richiesta, dimensioni_generazione
from formato import con_formato
from manifest import Manifest

log = logging.getLogger("immagini.freschezza")

VERSIONE_FIRMA = 1
CARTELLA_ORFANE = Path("cache") / "orfane"


def firma(prompt: str, riferimenti: list[tuple[str, str | None]], modello: str,
          dimensioni: tuple[int, int], generata: tuple[int, int], seme: int) -> str:
    """Hash stabile di tutto ciò che decide un'immagine. `riferimenti`: [(id, firma del riferimento)]."""
    dati = {"v": VERSIONE_FIRMA, "prompt": prompt, "riferimenti": [list(x) for x in riferimenti],
            "modello": modello, "dimensioni": list(dimensioni), "generata": list(generata), "seme": int(seme)}
    testo = json.dumps(dati, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return f"v{VERSIONE_FIRMA}:" + hashlib.sha256(testo.encode("utf-8")).hexdigest()[:24]


def seme_di(r: Richiesta, man: Manifest) -> int:
    """Il seme appiccicoso: quello del manifest se l'immagine c'è già, altrimenti quello dell'id."""
    voce = man.voci.get(r.id) or {}
    return int(voce["seme"]) if "seme" in voce else r.seme


def firme_attese(richieste: list[Richiesta], man: Manifest, modello: str) -> dict[str, str]:
    """La firma che ogni richiesta di OGGI darebbe. I riferimenti si calcolano prima di chi li usa."""
    per_id = {r.id: r for r in richieste if not r.alias_di}
    attese: dict[str, str] = {}

    def calcola(ident: str, catena: tuple[str, ...] = ()) -> str | None:
        if ident in attese:
            return attese[ident]
        r = per_id.get(ident)
        if r is None or ident in catena:  # riferimento sconosciuto o ciclo: niente firma
            return None
        rif = [(x, calcola(x, catena + (ident,))) for x in r.riferimenti]
        attese[ident] = firma(r.prompt, rif, modello, (r.larghezza, r.altezza),
                              dimensioni_generazione(r.larghezza, r.altezza), seme_di(r, man))
        return attese[ident]

    for ident in per_id:
        calcola(ident)
    return attese


def firme_registrate(man: Manifest) -> dict[str, str]:
    """La firma di ogni voce del manifest: quella scritta, o (voci vecchie) quella ricalcolata dalla voce."""
    out: dict[str, str] = {}

    def calcola(ident: str, catena: tuple[str, ...] = ()) -> str | None:
        if ident in out:
            return out[ident]
        voce = man.voci.get(ident)
        if not voce or voce.get("alias_di") or ident in catena:
            return None
        if voce.get("firma"):
            out[ident] = voce["firma"]
            return out[ident]
        if not voce.get("prompt") or "seme" not in voce:
            return None  # voce senza i dati per ricostruirla: la si tratta come da rifare
        larg, alt = int(voce["larghezza"]), int(voce["altezza"])
        gen = tuple(voce.get("generata") or dimensioni_generazione(larg, alt))
        rif = [(x, calcola(x, catena + (ident,))) for x in voce.get("riferimenti") or []]
        out[ident] = firma(con_formato(voce["prompt"]), rif, voce.get("modello", ""), (larg, alt), gen, voce["seme"])
        return out[ident]

    for ident in list(man.voci):
        calcola(ident)
    return out


def migra(man: Manifest) -> list[str]:
    """Scrive la firma (ricalcolata dalla voce stessa) nelle voci che non ce l'hanno. Idempotente."""
    registrate = firme_registrate(man)
    fatte = []
    for ident, voce in list(man.voci.items()):
        if voce.get("alias_di") or voce.get("firma") or ident not in registrate:
            continue
        man.voci[ident] = {**voce, "firma": registrate[ident], "firma_migrata": time.strftime("%Y-%m-%d")}
        fatte.append(ident)
    if fatte:
        man.salva()
        log.info("migrazione: firma scritta in %d voci senza firma (%s)", len(fatte), ", ".join(sorted(fatte)))
    return fatte


@dataclass
class Stato:
    """Come stanno le immagini di una campagna rispetto alle schede di oggi."""

    aggiornate: list[Richiesta] = field(default_factory=list)
    vecchie: list[tuple[Richiesta, str]] = field(default_factory=list)   # (richiesta, perché)
    mancanti: list[Richiesta] = field(default_factory=list)
    orfane: list[str] = field(default_factory=list)                      # id nel manifest, non più richiesti
    attese: dict[str, str] = field(default_factory=dict)                 # id → firma di oggi


def motivo(r: Richiesta, voce: dict, attese: dict[str, str], registrate: dict[str, str], modello: str) -> str:
    """Perché un'immagine è vecchia, in parole: il primo componente della firma che non torna."""
    prompt_fatto = voce.get("prompt", "")
    if r.prompt not in (prompt_fatto, con_formato(prompt_fatto)):
        return "il prompt è cambiato (schede o stile)"
    if list(voce.get("riferimenti") or []) != list(r.riferimenti):
        return "i riferimenti sono cambiati"
    cambiati = [x for x in r.riferimenti if attese.get(x) != registrate.get(x)]
    if cambiati:
        return f"è cambiato il riferimento {', '.join(cambiati)}"
    if voce.get("modello") != modello:
        return "il modello è cambiato"
    if (int(voce.get("larghezza", 0)), int(voce.get("altezza", 0))) != (r.larghezza, r.altezza):
        return f"le dimensioni sono cambiate ({voce.get('larghezza')}x{voce.get('altezza')} → {r.larghezza}x{r.altezza})"
    return "la firma non torna"


def classifica(richieste: list[Richiesta], tutte: list[Richiesta], man: Manifest, modello: str) -> Stato:
    """Divide `richieste` in aggiornate, vecchie e mancanti; le orfane si cercano su `tutte` (mai filtrate)."""
    attese = firme_attese(tutte, man, modello)
    registrate = firme_registrate(man)
    st = Stato(attese=attese)
    for r in richieste:
        if r.alias_di:
            continue
        voce = man.voci.get(r.id)
        if not voce or not (man.cartella / voce.get("file", r.file)).exists():
            st.mancanti.append(r)
        elif registrate.get(r.id) != attese.get(r.id):
            st.vecchie.append((r, motivo(r, voce, attese, registrate, modello)))
        else:
            st.aggiornate.append(r)
    richiesti = {r.id for r in tutte}
    st.orfane = sorted(i for i in man.voci if i not in richiesti)
    return st


def sposta_orfane(man: Manifest, orfane: list[str]) -> list[str]:
    """Toglie le orfane dal manifest e sposta i loro file in immagini/cache/orfane/ (se nessun'altra voce li usa)."""
    if not orfane:
        return []
    usati = {v.get("file") for i, v in man.voci.items() if i not in orfane}
    dest = man.cartella / CARTELLA_ORFANE
    spostati = []
    for ident in orfane:
        voce = man.voci.pop(ident)
        f = voce.get("file")
        if f and f not in usati and (man.cartella / f).exists():
            dest.mkdir(parents=True, exist_ok=True)
            arrivo = dest / f
            if arrivo.exists():  # una orfana con lo stesso nome c'è già: si tiene anche questa, con l'ora
                arrivo = dest / f"{Path(f).stem}_{time.strftime('%Y%m%d-%H%M%S')}{Path(f).suffix}"
            shutil.move(str(man.cartella / f), str(arrivo))
            spostati.append(f)
        log.info("orfana: %s (non è più nelle schede) → %s", ident,
                 f"{CARTELLA_ORFANE}/{f}" if f in spostati else "solo tolta dal manifest")
    man.salva()
    return spostati

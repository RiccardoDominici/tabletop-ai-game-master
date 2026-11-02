"""Scheda scena/luogo (manuale §4), una o più per campagna: scopo, posta, sensi, elementi, indizi,
uscite, mossa morbida, apertura, musica, immagine, taglio. Più le regole di scena sui PNG presenti
(voci diverse, iniziali diverse)."""

from __future__ import annotations

import re

from . import costanti as K
from .carica import Campagna
from .esito import Esito
from .testo import frasi, problemi_di_prosa


def controlla(c: Campagna, e: Esito) -> None:
    ids = [s.get("id") for _, s in c.scene]
    for x in {i for i in ids if ids.count(i) > 1}:
        e.errore("SCENA.id", "scene", f"id di scena ripetuto: {x}")
    for nome, s in c.scene:
        _scena(c, e, nome, s)


def _scena(c: Campagna, e: Esito, dove: str, s: dict) -> None:
    for campo in ("id", "nodo", "nome", "scopo", "domanda_drammatica", "posta", "intensita", "sensi",
                  "elementi_interattivi", "png_presenti", "orologi_attivi", "indizi", "uscite",
                  "mossa_morbida_pronta", "apertura", "musica", "immagine", "taglio"):
        if campo not in s:
            e.errore("SCENA.campo", dove, f"manca {campo}")
    if s.get("nodo") and s["nodo"] not in c.nodi:
        e.errore("SCENA.nodo", dove, f"nodo inesistente {s['nodo']}")
    scopo = s.get("scopo") or {}
    if isinstance(scopo, dict):
        if scopo.get("tipo") not in K.SCOPI:
            e.errore("SCENA.scopo", dove, f"scopo {scopo.get('tipo')} fuori dall'elenco C12")
        if scopo.get("tipo") == "rivelare_indizio" and scopo.get("rif") not in c.indizi:
            e.errore("SCENA.scopo", dove, f"lo scopo cita un indizio inesistente: {scopo.get('rif')}")
    else:
        e.errore("SCENA.scopo", dove, "scopo nella forma {tipo, rif}")
    dom = str(s.get("domanda_drammatica") or "")
    if dom and not dom.strip().endswith("?"):
        e.errore("SCENA.domanda", dove, "la domanda drammatica è una domanda da sì o no")
    posta = s.get("posta") or {}
    chi = set()
    for lato in ("si_guadagna", "si_perde"):
        chi |= set((posta.get(lato) or {}).get("per_chi") or [])
    if posta and not chi & (set(c.png) | set(c.pg_ids)):
        e.errore("SCENA.posta", dove, "la posta riguarda almeno un PG o un PNG")
    if not isinstance(s.get("intensita"), int) or not 1 <= s["intensita"] <= 5:
        e.errore("SCENA.intensita", dove, "intensita da 1 a 5")
    if len(s.get("sensi") or []) != 3:
        e.errore("SCENA.sensi", dove, f"{len(s.get('sensi') or [])} dettagli sensoriali (esattamente 3)")
    if len(s.get("elementi_interattivi") or []) < 3:
        e.errore("SCENA.elementi", dove, "almeno tre elementi interattivi")
    presenti = list(s.get("png_presenti") or [])
    for p in presenti:
        if p not in c.png:
            e.errore("SCENA.png_presenti", dove, f"PNG senza scheda: {p}")
    voci = [c.png[p][1].get("voce", {}).get("tts", {}).get("voce_id") for p in presenti if p in c.png]
    for v in {x for x in voci if voci.count(x) > 1}:
        e.errore("SCENA.voci", dove, f"voce {v} usata da più PNG presenti")
    iniziali = [c.png[p][1].get("nome", "?")[:1].upper() for p in presenti if p in c.png]
    for i in {x for x in iniziali if iniziali.count(x) > 1}:
        e.errore("SCENA.iniziali", dove, f"più PNG presenti con l'iniziale {i}")
    for o in s.get("orologi_attivi") or []:
        if o not in c.orologi:
            e.errore("SCENA.orologi", dove, f"orologio inesistente {o}")
    for ind in s.get("indizi") or []:
        if isinstance(ind, dict) and ind.get("nodo") and ind["nodo"] not in c.nodi and ind["nodo"] not in c.png:
            e.errore("SCENA.indizi", dove, f"{ind.get('id')}: nodo inesistente {ind['nodo']}")
    uscite = s.get("uscite") or []
    if len(uscite) < 2 and not s.get("climax"):
        e.errore("SCENA.uscite", dove, "almeno due uscite (solo il climax può averne meno: climax: true)")
    for u in uscite:
        if u.get("verso") not in c.nodi:
            e.errore("SCENA.uscite", dove, f"uscita verso un nodo inesistente: {u.get('verso')}")
        segn = u.get("segnalata_da") or []
        if not segn:
            e.errore("SCENA.uscite", dove, f"l'uscita verso {u.get('verso')} non è segnalata da nessun indizio")
        for i in segn:
            if i not in c.indizi:
                e.errore("SCENA.uscite", dove, f"uscita segnalata da un indizio inesistente: {i}")
        if 0 < len(segn) < 3:
            e.avviso("SCENA.uscite", dove, f"il nodo {u.get('verso')} è segnalato da {len(segn)} indizi (C5 ne chiede 3 per i nodi necessari)")
    mossa = s.get("mossa_morbida_pronta") or ""
    for regola, det in problemi_di_prosa(mossa):
        e.errore(f"PROSA.{regola}", f"{dove} mossa_morbida_pronta", det)
    ap = s.get("apertura") or ""
    if ap:
        if len(frasi(ap)) > 3:
            e.errore("SCENA.apertura", dove, f"apertura di {len(frasi(ap))} frasi (max 3, §4)")
        if not ap.strip().endswith("?"):
            e.errore("SCENA.apertura", dove, "l'apertura chiude con un invito ad agire")
        for regola, det in problemi_di_prosa(ap):
            e.errore(f"PROSA.{regola}", f"{dove} apertura", det)
    mus = s.get("musica") or {}
    if mus.get("tag") not in K.TAG_MUSICA:
        e.errore("SCENA.musica", dove, f"musica.tag {mus.get('tag')} fuori dal vocabolario chiuso")
    citati = set(re.findall(r"\b[a-z]+_[a-z]+\b", str(mus.get("transizione") or "")))
    if not mus.get("transizione"):
        e.errore("SCENA.musica", dove, "manca musica.transizione")
    elif citati - K.TAG_MUSICA:
        e.errore("SCENA.musica", dove, f"la transizione cita tag fuori vocabolario: {sorted(citati - K.TAG_MUSICA)}")
    if "esiti" in s:
        for es in s.get("esiti") or []:
            if not (isinstance(es, dict) and es.get("id") and es.get("finale")):
                e.errore("SCENA.esiti", dove, "ogni esito ha id e finale (id della battuta di chiusura)")
            elif es["finale"] not in c.per_id:
                e.errore("SCENA.esiti", dove, f"esito {es['id']}: battuta finale inesistente {es['finale']}")

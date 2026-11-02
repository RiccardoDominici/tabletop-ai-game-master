"""Scheda scena/luogo (manuale §4), una o più per campagna: scopo, posta, sensi, elementi, indizi,
uscite, mossa morbida, apertura, musica, immagine, taglio. Più le regole di scena sui PNG presenti
(voci diverse e non simili, iniziali diverse) e su ciò che porta un PNG in una scena dove non è
presente (battute legate alla scena, testi della scena, desideri e soluzioni che lo spostano).

Voci simili: `simile_a` in assets/voci/voci.yaml (nadine e tabitha). Nella prova cieca di
ponte-lanterne (nota 21) l'autore aveva deciso che Rosa (nadine) e Bice (tabitha) non si incontrano,
poi ha portato Bice nel Borgo in quattro punti senza accorgersene: desiderio, soluzione di un collo
di bottiglia, una battuta, il fallback del taglio. Le regole qui sotto guardano tutti questi posti."""

from __future__ import annotations

import re

from . import costanti as K
from .carica import Campagna
from .esito import Esito
from .testo import frasi, problemi_di_prosa


# Titoli che precedono il nome proprio e non lo identificano.
_TITOLI = {"sorella", "fratello", "padre", "madre", "mastro", "messer", "donna", "don", "zio", "zia", "nonna", "nonno"}


def nomi_propri(d: dict) -> list[str]:
    """Le parole maiuscole del nome di un PNG, senza titoli: «Leandro Vischi» → [Leandro, Vischi]."""
    return [w for w in re.findall(r"[A-ZÀÈÉÌÒÙ][\wàèéìòù']+", str(d.get("nome") or ""))
            if w.lower() not in _TITOLI and len(w) >= 3]


def nomina(testo: str, d: dict) -> bool:
    return any(re.search(rf"(?<![\w]){re.escape(n)}(?![\w])", testo) for n in nomi_propri(d))


def _parlanti(b: dict) -> set[str]:
    """PNG che parlano in una battuta: chi la dice e le etichette delle sue righe."""
    out = {b.get("chi")} if str(b.get("chi", "")).startswith("png_") else set()
    for v in [b.get("testo") or []] + list(b.get("varianti") or []):
        for r in v if isinstance(v, list) else []:
            m = re.match(r"^\[([a-z0-9_]+)\]", str(r))
            if m and m.group(1) != "narratore":
                out.add(m.group(1))
    return out


def controlla(c: Campagna, e: Esito) -> None:
    ids = [s.get("id") for _, s in c.scene]
    for x in {i for i in ids if ids.count(i) > 1}:
        e.errore("SCENA.id", "scene", f"id di scena ripetuto: {x}")
    nodi = [s.get("nodo") for _, s in c.scene if s.get("nodo")]
    for x in {n for n in nodi if nodi.count(n) > 1}:
        e.avviso("SCENA.nodo", "scene", f"più schede con il nodo {x}: lo stesso luogo in un altro momento è un nodo "
                                        "evento a parte (riferimenti/mestiere.md, «Più scene»)")
    for nome, s in c.scene:
        _scena(c, e, nome, s)
    _voci_fuori_scena(c, e)


def _voci_fuori_scena(c: Campagna, e: Esito) -> None:
    """Ciò che porta un PNG in una scena dove non è presente, accanto a una voce che si confonde con la sua."""
    presenti = {s.get("id"): set(s.get("png_presenti") or []) for _, s in c.scene}
    # 1. Battute legate a una scena (campo `scena`) in cui parla un PNG che lì non è presente.
    for b in c.battute:
        sid = b.get("scena")
        if sid not in presenti:
            continue
        for p in sorted(_parlanti(b) - presenti[sid]):
            if p in c.png:
                e.avviso("SCENA.png_assente", f"{b['_file']} {b.get('id')}",
                         f"{p} parla in una battuta di {sid}, ma non è tra i png_presenti di quella scena", rigoroso=True)
    for nome, s in c.scene:
        sid, qui = s.get("id"), presenti.get(s.get("id"), set())
        for a in sorted(set(c.png) - qui):
            simili = sorted(b for b in qui if c.voci_confuse(a, b))
            if not simili:
                continue
            # 2. Battute di A senza `scena`: possono uscire anche qui (il Motore non guarda chi è presente).
            libere = [b.get("id") for b in c.battute if b.get("scena") is None and a in _parlanti(b)]
            if libere:
                e.avviso("SCENA.voci_simili_altrove", nome,
                         f"{len(libere)} battute di {a} senza `scena` possono uscire qui, accanto a {', '.join(simili)} "
                         f"(voce simile): {', '.join(libere[:4])}{'…' if len(libere) > 4 else ''}")
            # 3. Testi della scena che portano A qui.
            for campo in ("descrizione", "taglio", "mossa_morbida_pronta", "apertura"):
                if nomina(str(s.get(campo) or ""), c.png[a][1]):
                    e.avviso("SCENA.voci_simili_testo", f"{nome} {campo}",
                             f"nomina {c.png[a][1].get('nome')} ({a}), voce simile a {', '.join(simili)} presente: "
                             "se entra in scena le due voci si confondono")
            for es in s.get("esiti") or []:
                if isinstance(es, dict) and nomina(str(es.get("descrizione") or ""), c.png[a][1]):
                    e.avviso("SCENA.voci_simili_testo", f"{nome} esito {es.get('id')}",
                             f"nomina {c.png[a][1].get('nome')} ({a}), voce simile a {', '.join(simili)} presente")
    # 4. Schede e soluzioni che mettono insieme due PNG dalle voci simili.
    coppie = sorted({tuple(sorted((a, b))) for a in c.png for b in c.png if a != b and c.voci_confuse(a, b)})
    for a, b in coppie:
        for x, y in ((a, b), (b, a)):
            d = c.png[x][1]
            testi = [("desiderio", d.get("desiderio")), *[("iniziative", t) for t in d.get("iniziative") or []],
                     *[("evoluzione", f"{ev.get('se')} {ev.get('allora')}") for ev in d.get("evoluzione") or [] if isinstance(ev, dict)]]
            for campo, t in testi:
                if nomina(str(t or ""), c.png[y][1]):
                    e.avviso("SCENA.voci_simili_testo", f"{c.png[x][0]} {campo}",
                             f"cita {c.png[y][1].get('nome')}, che ha una voce simile: le due non devono finire nella stessa scena")
        for cb in c.campagna.get("colli_di_bottiglia") or []:
            for sol in cb.get("soluzioni") or [] if isinstance(cb, dict) else []:
                if nomina(str(sol), c.png[a][1]) and nomina(str(sol), c.png[b][1]):
                    e.avviso("SCENA.voci_simili_testo", f"campagna.yaml {cb.get('id')}",
                             f"una soluzione mette insieme {c.png[a][1].get('nome')} e {c.png[b][1].get('nome')}, voci simili")


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
    con_scheda = [p for p in presenti if p in c.png]
    for i, a in enumerate(con_scheda):
        for b in con_scheda[i + 1:]:
            if c.voce_di(a) != c.voce_di(b) and c.voci_confuse(a, b):
                e.errore("SCENA.voci_simili", dove, f"{a} ({c.voce_di(a)}) e {b} ({c.voce_di(b)}): voci simili "
                                                    "per assets/voci/voci.yaml (simile_a), a orecchio si confondono")
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

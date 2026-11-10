"""Regole sugli artefatti di campagna (manuale §2): carta di stile (C1), canone (E10), fronti e
orologi (C2), cattivo (C3), rivelazioni e colli di bottiglia (C4), nodi (C5), segreti astratti (C6),
archi (C8), sessione (C9–C13)."""

from __future__ import annotations

import re
from collections import deque

from . import costanti as K
from .carica import Campagna
from .esito import Esito
from .testo import frasi, n_parole


def controlla_stile(c: Campagna, e: Esito) -> None:
    s = c.stile
    for campo in ("premessa", "tono", "tema", "registro_narratore", "stile_immagini", "tavolozza_musicale", "linee"):
        if not s.get(campo):
            e.errore("STILE.campo", "stile.yaml", f"manca {campo}")
    # Nota 1 di nozze-neve: un brief può non volere veli. La chiave resta, la lista può essere vuota.
    if not isinstance(s.get("veli"), list):
        e.errore("STILE.campo", "stile.yaml", "manca veli (una lista; vuota se il brief non ne vuole)")
    elif not s["veli"]:
        e.avviso("STILE.veli", "stile.yaml", "nessun velo: va bene se il brief non ne vuole, e il brief lo dice")
    if s.get("premessa") and len(frasi(s["premessa"])) != 1:
        e.errore("STILE.premessa", "stile.yaml", "la premessa (C1) deve stare in una frase")
    tav = s.get("tavolozza_musicale") or {}
    tag = set(tav.get("tag") or []) if isinstance(tav, dict) else set()
    fuori = tag - K.TAG_MUSICA
    if fuori:
        e.errore("STILE.musica", "stile.yaml", f"tag fuori dal vocabolario chiuso: {sorted(fuori)}")


def controlla_canone(c: Campagna, e: Esito) -> None:
    grezzo = c.campagna.get("canone")
    if not isinstance(grezzo, list) or not grezzo:
        e.errore("CANONE.assente", "campagna.yaml", "manca il registro dei fatti `canone`")
        return
    visti = set()
    for f in grezzo:
        if not isinstance(f, dict):
            e.errore("CANONE.forma", "campagna.yaml", "voce del canone non è una mappa")
            continue
        fid = f.get("id")
        if not fid or not re.fullmatch(r"f_[a-z0-9_]+", str(fid)):
            e.errore("CANONE.id", "campagna.yaml", f"id di fatto non valido: {fid!r} (forma f_nome)")
        if fid in visti:
            e.errore("CANONE.duplicato", "campagna.yaml", f"id ripetuto: {fid}")
        visti.add(fid)
        for campo in ("testo", "noto_ai_pg", "stato"):
            if campo not in f:
                e.errore("CANONE.campo", f"canone {fid}", f"manca {campo}")
    # Ogni f_* citato in qualsiasi file della campagna deve esistere.
    citati = set()
    for testo in _testi_grezzi(c):
        citati |= set(re.findall(r"\bf_[a-z0-9_]+\b", testo))
    for f in sorted(citati - set(c.canone)):
        e.errore("CANONE.riferimento", "campagna", f"fatto citato ma assente dal canone: {f}")
    usati = set()
    for testo in _testi_grezzi(c, escludi_canone=True):
        usati |= set(re.findall(r"\bf_[a-z0-9_]+\b", testo))
    for f in sorted(set(c.canone) - usati):
        e.avviso("CANONE.inutilizzato", f"canone {f}", "fatto mai citato da schede, scene o repertorio")


def _testi_grezzi(c: Campagna, escludi_canone: bool = False) -> list[str]:
    """Testo YAML grezzo di tutti i file (per trovare gli id f_* ovunque, commenti esclusi)."""
    import yaml
    out = []
    camp = dict(c.campagna)
    if escludi_canone:
        camp.pop("canone", None)
    out.append(yaml.safe_dump(camp, allow_unicode=True))
    for _, s in c.scene:
        out.append(yaml.safe_dump(s, allow_unicode=True))
    for _, (_, d) in c.png.items():
        out.append(yaml.safe_dump(d, allow_unicode=True))
    out.append(yaml.safe_dump(c.pg, allow_unicode=True))
    out.append(yaml.safe_dump(c.battute, allow_unicode=True))
    if c.parole_segrete:
        out.append(yaml.safe_dump(c.parole_segrete, allow_unicode=True))
    return out


def controlla_fronti(c: Campagna, e: Esito) -> None:
    prep = c.preparazione
    if not prep:
        e.errore("FRONTI.preparazione", "campagna.yaml", "manca la chiave `preparazione` (fronti, cattivo, segreti, archi)")
        return
    fronti = c.fronti
    di_campagna = [f for f in fronti if f.get("livello") == "campagna"]
    d_avventura = [f for f in fronti if f.get("livello") == "avventura"]
    if len(di_campagna) != 1:
        e.errore("FRONTI.campagna", "preparazione.fronti", f"serve un fronte di campagna, ce ne sono {len(di_campagna)}")
    if not 1 <= len(d_avventura) <= 2:
        e.errore("FRONTI.avventura", "preparazione.fronti", f"servono uno o due fronti d'avventura, ce ne sono {len(d_avventura)}")
    for f in fronti:
        fid = f.get("id", "?")
        pericoli = [p for p in f.get("pericoli") or [] if isinstance(p, dict)]
        if not 2 <= len(pericoli) <= 3:
            e.errore("FRONTI.pericoli", fid, f"{len(pericoli)} pericoli (servono 2-3)")
        presagi = sum(len(p.get("presagi") or []) for p in pericoli)
        lim = (3, 5) if f.get("livello") == "campagna" else (1, 3)
        if not lim[0] <= presagi <= lim[1]:
            e.errore("FRONTI.presagi", fid, f"{presagi} presagi in tutto il fronte (servono {lim[0]}-{lim[1]})")
        domande = f.get("domande_di_posta") or []
        if not 1 <= len(domande) <= 3:
            e.errore("FRONTI.domande_di_posta", fid, f"{len(domande)} domande di posta (servono 1-3)")
        for p in pericoli:
            pid = p.get("id", "?")
            for campo in ("tipo", "impulso", "destino_incombente", "presagi", "mosse", "cast", "orologio"):
                if campo not in p:
                    e.errore("FRONTI.campo", pid, f"manca {campo}")
            if p.get("impulso") and len(str(p["impulso"]).split()) != 1:
                e.errore("FRONTI.impulso", pid, f"l'impulso è un verbo solo: «{p['impulso']}»")
            if not (p.get("presagi") or []):
                e.errore("FRONTI.presagi", pid, "ogni pericolo ha almeno un presagio")
            for pr in p.get("presagi") or []:
                if not (isinstance(pr, dict) and pr.get("segno_visibile")):
                    e.errore("FRONTI.segno_visibile", pid, "ogni presagio ha un segno visibile")
            oid = p.get("orologio")
            if oid and oid not in c.orologi:
                e.errore("FRONTI.orologio", pid, f"orologio inesistente {oid}")
    for oid, o in c.orologi.items():
        seg = o.get("segmenti")
        if seg not in K.SEGMENTI_AMMESSI:
            e.errore("FRONTI.segmenti", oid, f"{seg} segmenti (ammessi 4, 6, 8)")
        if not o.get("nome"):
            e.errore("FRONTI.campo", oid, "l'orologio ha un nome, quello dell'ostacolo")
    for oid, o in {x["id"]: x for x in (c.campagna.get("orologi") or []) if isinstance(x, dict) and x.get("id")}.items():
        segni = o.get("segni") or []
        if len(segni) != o.get("segmenti"):
            e.errore("FRONTI.segni", oid, f"{len(segni)} segni per {o.get('segmenti')} segmenti (uno per segmento)")
        if not o.get("avanza_quando"):
            e.errore("FRONTI.campo", oid, "manca avanza_quando (regola di ritmo)")
        if "segno_almeno_ogni" in o and not (isinstance(o["segno_almeno_ogni"], int) and o["segno_almeno_ogni"] >= 1):
            e.errore("FRONTI.campo", oid, "segno_almeno_ogni è un intero >= 1")
        # parte_dopo: l'orologio comincia a correre quando esce una di queste battute o si rivela uno di
        # questi indizi (riferimenti/schema.md). Il Motore lo applica (apps/server/src/scena/orologi.ts).
        for x in o.get("parte_dopo") or []:
            if x not in c.per_id and x not in c.indizi:
                e.errore("FRONTI.campo", oid, f"parte_dopo cita un id che non è né una battuta né un indizio: {x}")
    catt = prep.get("cattivo") or {}
    for campo in ("obiettivo", "cronologia_se_i_pg_non_intervengono", "risorse", "reazioni", "stato_di_quiete", "chiamata_all_azione"):
        if not catt.get(campo):
            e.errore("FRONTI.cattivo", "preparazione.cattivo", f"manca {campo} (C3)")
    segreti = prep.get("segreti_astratti") or []
    if not 6 <= len(segreti) <= 14:
        e.avviso("FRONTI.segreti_astratti", "preparazione", f"{len(segreti)} segreti astratti (circa 10 per sessione, C6)")
    for s in segreti:
        if len(frasi(str(s))) > 2:
            e.errore("FRONTI.segreti_astratti", "preparazione", f"segreto oltre due frasi: «{str(s)[:60]}»")
    archi = (prep.get("archi") or {}).get("pg") or {}
    for pid in c.pg_ids:
        a = archi.get(pid) or {}
        manca = [k for k in K.PASSI_HARMON if not a.get(k)]
        if manca:
            e.errore("FRONTI.archi", f"archi.pg.{pid}", f"arco incompleto sul cerchio di Harmon: mancano {manca}")
    if not (prep.get("archi") or {}).get("campagna_tre_atti"):
        e.avviso("FRONTI.archi", "preparazione.archi", "manca campagna_tre_atti (C8)")


def controlla_indizi(c: Campagna, e: Esito) -> None:
    if not c.rivelazioni:
        e.errore("INDIZI.rivelazioni", "campagna.yaml", "nessuna rivelazione (C4)")
    for i, ind in c.indizi.items():
        for campo in ("conclusione", "come_si_trova", "tiro", "tipo", "nodo"):
            if campo not in ind:
                e.errore("INDIZI.campo", i, f"manca {campo}")
        if ind.get("tipo") and ind["tipo"] not in K.TIPI_INDIZIO:
            e.errore("INDIZI.tipo", i, f"tipo {ind['tipo']} fuori elenco {sorted(K.TIPI_INDIZIO)}")
        if ind.get("conclusione") and ind["conclusione"] not in c.rivelazioni:
            e.errore("INDIZI.conclusione", i, f"conclusione inesistente {ind['conclusione']}")
        if ind.get("essenziale") and str(ind.get("tiro", "")).strip().lower() not in ("nessuno", "no", ""):
            e.errore("INDIZI.dietro_un_tiro", i, "un indizio essenziale non richiede tiri (F3)")
        if "modi" in ind and not (isinstance(ind["modi"], int) and ind["modi"] >= 1):
            e.errore("INDIZI.campo", i, "modi è un intero >= 1 (quanti modi distinti di trovarlo)")
    for rid, r in c.rivelazioni.items():
        lista = r.get("indizi") or []
        presenti = [c.indizi[x] for x in lista if x in c.indizi]
        for x in lista:
            if x not in c.indizi:
                e.errore("INDIZI.riferimento", rid, f"indizio inesistente {x}")
        for ind in presenti:
            if ind.get("conclusione") != rid:
                e.errore("INDIZI.conclusione", rid, f"{ind['id']} è elencato qui ma sostiene {ind.get('conclusione')}")
        nodi = {x.get("nodo") for x in presenti}
        tipi = {x.get("tipo") for x in presenti}
        if r.get("chiave", True) and not (len(presenti) >= 3 and len(nodi) >= 2 and len(tipi) >= 2):
            e.errore("INDIZI.tre_indizi", rid,
                     f"{len(presenti)} indizi, {len(nodi)} nodi, {len(tipi)} tipi: servono almeno 3, 2, 2 (C4)")
    for i, ind in c.indizi.items():
        if not any(i in (r.get("indizi") or []) for r in c.rivelazioni.values()):
            e.errore("INDIZI.orfano", i, "indizio che non sostiene nessuna rivelazione")
    for cb in c.campagna.get("colli_di_bottiglia") or []:
        if len(cb.get("soluzioni") or []) < 3:
            e.errore("INDIZI.collo", cb.get("id", "?"), "un collo di bottiglia ha almeno 3 soluzioni (C4)")


def controlla_grafo(c: Campagna, e: Esito) -> None:
    if not c.nodi:
        e.errore("GRAFO.nodi", "campagna.yaml", "nessun nodo (C5)")
        return
    for nid, n in c.nodi.items():
        for x in n.get("collegamenti") or []:
            if x not in c.nodi:
                e.errore("GRAFO.collegamento", nid, f"collegamento a nodo inesistente {x}")
    iniziale = c.scena_iniziale()
    partenza = (iniziale or {}).get("nodo") or next(iter(c.nodi))
    if partenza not in c.nodi:
        e.errore("GRAFO.partenza", "scena.yaml", f"il nodo della scena iniziale non esiste: {partenza}")
        return
    visti, coda = {partenza}, deque([partenza])
    while coda:
        x = coda.popleft()
        for y in c.nodi[x].get("collegamenti") or []:
            if y in c.nodi and y not in visti:
                visti.add(y)
                coda.append(y)
    for nid in sorted(set(c.nodi) - visti):
        e.errore("GRAFO.irraggiungibile", nid, f"nodo non raggiungibile da {partenza}")
    for nid, n in c.nodi.items():
        if not n.get("collegamenti") and not n.get("prossima_sessione"):
            e.errore("GRAFO.vicolo_cieco", nid, "nodo senza collegamenti (segna prossima_sessione: true se è la pista dopo)")


def controlla_sessione(c: Campagna, e: Esito) -> None:
    s = c.campagna.get("sessione") or {}
    if not s:
        e.errore("SESSIONE.assente", "campagna.yaml", "manca la chiave `sessione` (C9-C13)")
        return
    rias = s.get("riassunto_iniziale")
    if not rias:
        e.errore("SESSIONE.riassunto", "sessione", "manca riassunto_iniziale (C9)")
    elif len(frasi(rias)) > 4:
        e.errore("SESSIONE.riassunto", "sessione", f"riassunto di {len(frasi(rias))} frasi (max 4, C9)")
    stanze = s.get("cinque_stanze") or {}
    manca = [k for k in K.CINQUE_STANZE if not stanze.get(k)]
    if manca:
        e.errore("SESSIONE.cinque_stanze", "sessione", f"mancano {manca} (C10)")
    ids_scene = {sc.get("id") for _, sc in c.scene}
    pot = s.get("scene_potenziali") or []
    for x in pot:
        if x not in ids_scene:
            e.avviso("SESSIONE.scene_potenziali", "sessione", f"scena potenziale senza scheda: {x}")
    if len(pot) < 3:
        e.avviso("SESSIONE.scene_potenziali", "sessione", f"{len(pot)} scene potenziali (C11 ne chiede 3-6; in F0 se ne gioca una)")
    if not s.get("chiusura"):
        e.errore("SESSIONE.chiusura", "sessione", "manca la chiusura (C13)")
    iniziale = c.scena_iniziale() or {}
    if rias and iniziale.get("apertura"):
        n = len(frasi(rias)) + len(frasi(iniziale["apertura"]))
        if n > 6:
            e.errore("SESSIONE.inizio_lungo", "sessione", f"riassunto più apertura: {n} frasi (max 6, N2)")
        lung = [n_parole(f) for f in frasi(rias) + frasi(iniziale["apertura"])]
        media = sum(lung) / len(lung)
        if not c.prosa.media_narratore[0] <= media <= c.prosa.media_narratore[1]:
            e.errore("PROSA.media", "inizio di sessione", f"media {media:.1f} parole per frase (8-14, N1)")


def controlla(c: Campagna, e: Esito) -> None:
    controlla_stile(c, e)
    controlla_canone(c, e)
    controlla_fronti(c, e)
    controlla_indizi(c, e)
    controlla_grafo(c, e)
    controlla_sessione(c, e)

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
            # An omen with al_segno comes to pass at that mark of the danger's clock (docs/mondo.md §3).
            for i, pr in enumerate(p.get("presagi") or []):
                if isinstance(pr, dict) and "al_segno" in pr:
                    seg = (c.orologi.get(oid) or {}).get("segmenti") if oid else None
                    if not (_intero_positivo(pr["al_segno"]) and isinstance(seg, int) and pr["al_segno"] <= seg):
                        e.errore("FRONTI.conseguenze", f"{pid}.presagi[{i}]", f"al_segno è un segno dell'orologio del pericolo (1–{seg})")
                    if oid and _mai_attivo(c, oid) and not pr.get("tracce"):
                        e.avviso("FRONTI.conseguenze", f"{pid}.presagi[{i}]", f"{oid} non è attivo in nessuna scena: senza tracce il "
                                 "presagio succede fuori scena e al tavolo non arriva niente", rigoroso=True)
                    _controlla_effetti_mondo(c, e, f"{pid}.presagi[{i}]", pr)
    for oid, o in c.orologi.items():
        seg = o.get("segmenti")
        if seg not in K.SEGMENTI_AMMESSI:
            e.errore("FRONTI.segmenti", oid, f"{seg} segmenti (ammessi 4, 6, 8)")
        if not o.get("nome"):
            e.errore("FRONTI.campo", oid, "l'orologio ha un nome, quello dell'ostacolo")
        # Gates and consequences on every clock, the fronts' extra clocks included (the Engine plays them too).
        controlla_conseguenze(c, e, oid, o)
    narratore = {x.get("id") for x in (c.campagna.get("orologi") or []) if isinstance(x, dict)}
    for oid, o in c.orologi.items():
        if oid not in narratore:
            controlla_porte(c, e, oid, o.get("avanza_quando"))
    for oid, o in {x["id"]: x for x in (c.campagna.get("orologi") or []) if isinstance(x, dict) and x.get("id")}.items():
        segni = o.get("segni") or []
        if len(segni) != o.get("segmenti"):
            e.errore("FRONTI.segni", oid, f"{len(segni)} segni per {o.get('segmenti')} segmenti (uno per segmento)")
        if not o.get("avanza_quando"):
            e.errore("FRONTI.campo", oid, "manca avanza_quando (regola di ritmo)")
        controlla_porte(c, e, oid, o.get("avanza_quando"))
        # `serata`: the Engine derives the pace from the evening (docs/mondo.md §1, apps/server/src/mondo/ritmo.ts).
        ogni = o.get("segno_almeno_ogni")
        if "segno_almeno_ogni" in o and ogni != "serata" and not (isinstance(ogni, int) and not isinstance(ogni, bool) and ogni >= 1):
            e.errore("FRONTI.campo", oid, "segno_almeno_ogni è un intero >= 1, oppure «serata» (il ritmo che riempie l'orologio nella serata)")
        # parte_dopo: l'orologio comincia a correre quando esce una di queste battute o si rivela uno di
        # questi indizi (riferimenti/schema.md). Il Motore lo applica (apps/server/src/scena/orologi.ts).
        for x in o.get("parte_dopo") or []:
            if x not in c.per_id and x not in c.indizi:
                e.errore("FRONTI.campo", oid, f"parte_dopo cita un id che non è né una battuta né un indizio: {x}")
    catt = prep.get("cattivo") or {}
    for campo in ("obiettivo", "cronologia_se_i_pg_non_intervengono", "risorse", "reazioni", "stato_di_quiete", "chiamata_all_azione"):
        if not catt.get(campo):
            e.errore("FRONTI.cattivo", "preparazione.cattivo", f"manca {campo} (C3)")
    if "png" in catt and catt.get("png") not in c.png:
        e.errore("FRONTI.cattivo", "preparazione.cattivo", f"png: {catt.get('png')} non è un PNG con scheda (il cattivo, per SCELTA.premio)")
    segreti = prep.get("segreti_astratti") or []
    if not 6 <= len(segreti) <= 14:
        e.avviso("FRONTI.segreti_astratti", "preparazione", f"{len(segreti)} segreti astratti (circa 10 per sessione, C6)")
    for s in segreti:
        if len(frasi(str(s))) > 2:
            e.errore("FRONTI.segreti_astratti", "preparazione", f"segreto oltre due frasi: «{str(s)[:60]}»")
    archi = (prep.get("archi") or {}).get("pg") or {}
    for pid in c.pg_ids_preparati:
        a = archi.get(pid) or {}
        manca = [k for k in K.PASSI_HARMON if not a.get(k)]
        if manca:
            e.errore("FRONTI.archi", f"archi.pg.{pid}", f"arco incompleto sul cerchio di Harmon: mancano {manca}")
    if not (prep.get("archi") or {}).get("campagna_tre_atti"):
        e.avviso("FRONTI.archi", "preparazione.archi", "manca campagna_tre_atti (C8)")


# Gates of avanza_quando (docs/mondo.md §2, apps/server/src/mondo/porte.ts): what each `quando` needs.
QUANDO_PORTE = {"cambio_scena": set(), "lascia_scena": set(), "resta_in_scena": {"turni"}, "battuta": {"ids"},
                "indizio": {"ids"}, "azione": {"temi"}, "prova_fallita": set(), "scontro": set()}
CHIAVI_PORTE = {"quando", "scena", "turni", "ids", "temi", "prove", "segni", "volte", "tiro"}


def _intero_positivo(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and v >= 1


def controlla_porte(c: Campagna, e: Esito, oid: str, voci) -> None:
    """Each entry of avanza_quando is a note (string) or a gate the Engine applies: its keys and ids must exist."""
    if not isinstance(voci, list):
        return
    scene = {s.get("id") for _, s in c.scene if isinstance(s, dict)}
    for i, v in enumerate(voci):
        dove = f"{oid}.avanza_quando[{i}]"
        if isinstance(v, str):
            continue
        if not isinstance(v, dict):
            e.errore("FRONTI.avanza_quando", dove, "una nota (testo) o una porta {quando: …}")
            continue
        q = v.get("quando")
        if q not in QUANDO_PORTE:
            e.errore("FRONTI.avanza_quando", dove, f"quando {q!r}: uno tra {sorted(QUANDO_PORTE)}")
            continue
        for k in sorted(set(v) - CHIAVI_PORTE):
            e.errore("FRONTI.avanza_quando", dove, f"chiave sconosciuta {k!r} (ammesse: {sorted(CHIAVI_PORTE)})")
        for k in sorted(QUANDO_PORTE[q] - set(v)):
            e.errore("FRONTI.avanza_quando", dove, f"quando: {q} vuole {k}")
        for k in ("turni", "segni", "volte"):
            if k in v and not _intero_positivo(v[k]):
                e.errore("FRONTI.avanza_quando", dove, f"{k} è un intero >= 1")
        # tiro: an uncertain outcome, rolled by the Engine Game Master side (apps/server/src/mondo/tiri.ts).
        if "tiro" in v:
            tr = v["tiro"]
            ok = isinstance(tr, dict) and not set(tr) - {"dado", "almeno", "visibile"} and _intero_positivo(tr.get("dado")) \
                and 2 <= tr["dado"] <= 100 and _intero_positivo(tr.get("almeno")) and tr["almeno"] <= tr["dado"] \
                and isinstance(tr.get("visibile", False), bool)
            if not ok:
                e.errore("FRONTI.avanza_quando", dove, "tiro è {dado: 2–100, almeno: 1–dado, visibile: true|false}")
        if "scena" in v and v["scena"] not in scene:
            e.errore("FRONTI.avanza_quando", dove, f"scena inesistente {v['scena']!r}")
        for k in ("ids", "temi", "prove"):
            if k in v and not (isinstance(v[k], list) and v[k] and all(isinstance(x, str) and x.strip() for x in v[k])):
                e.errore("FRONTI.avanza_quando", dove, f"{k} è una lista di testi non vuota")
        for x in v.get("ids") or [] if isinstance(v.get("ids"), list) else []:
            if q == "battuta" and x not in c.per_id:
                e.errore("FRONTI.avanza_quando", dove, f"battuta inesistente {x}")
            if q == "indizio" and x not in c.indizi:
                e.errore("FRONTI.avanza_quando", dove, f"indizio inesistente {x}")


CHIAVI_CONSEGUENZA = {"al_segno", "cosa", "detto", "battuta", "regia", "tracce", "png", "compare", "indizi"}
STATI_ATTEGGIAMENTO = {"ostile", "indifferente", "amichevole"}


def battute_del_motore(c: Campagna) -> set[str]:
    """The lines a clock's consequence or an omen names: the Engine's only, never in the reader's catalogue (A41)."""
    voci = [x for o in c.orologi.values() for x in (o.get("conseguenze") or []) if isinstance(x, dict)]
    for f in ((c.campagna.get("preparazione") or {}).get("fronti") or []):
        for p in (f.get("pericoli") or []) if isinstance(f, dict) else []:
            voci += [x for x in (p.get("presagi") or []) if isinstance(x, dict)] if isinstance(p, dict) else []
    return {str(x["battuta"]) for x in voci if x.get("battuta")}


def _controlla_effetti_mondo(c: Campagna, e: Esito, dove: str, d: dict) -> None:
    """The keys a consequence and an omen share: line, NPC changes, hidden NPCs that appear, clues offered."""
    scene = {s.get("id") for _, s in c.scene if isinstance(s, dict)}
    if d.get("battuta") and d["battuta"] not in c.per_id:
        e.errore("FRONTI.conseguenze", dove, f"battuta inesistente {d['battuta']}")
    elif d.get("battuta"):
        # A consequence's line is the Engine's (docs/mondo.md §3): it never enters the reader's catalogue, so a filler or
        # a stall line named here never comes out as one (A41: torre-mozza's mark-3 line was a filler).
        b = c.per_id[d["battuta"]]
        if b.get("riempitivo") or b.get("stallo") is not None:
            e.avviso("FRONTI.battuta_della_conseguenza", dove, f"{d['battuta']} è un riempitivo o una battuta di stallo: "
                     "come conseguenza la dice solo il Motore al segno, e non esce più come tale; scrivi una battuta dedicata")
    png = d.get("png")
    if png is not None and not isinstance(png, dict):
        e.errore("FRONTI.conseguenze", dove, "png è {png_x: {atteggiamento, scena}}")
        png = {}
    for pid, cambi in (png or {}).items():
        if pid not in c.png:
            e.errore("FRONTI.conseguenze", dove, f"PNG inesistente {pid}")
        cambi = cambi if isinstance(cambi, dict) else {}
        for k in sorted(set(cambi) - {"atteggiamento", "scena"}):
            e.errore("FRONTI.conseguenze", dove, f"{pid}: chiave sconosciuta {k!r} (atteggiamento, scena)")
        att = cambi.get("atteggiamento")
        voci = {"tutti": att} if isinstance(att, str) else att if isinstance(att, dict) else ({} if att is None else {"?": att})
        for pg, s in voci.items():
            if pg not in c.pg_ids and pg != "tutti":
                e.errore("FRONTI.conseguenze", dove, f"{pid}: atteggiamento verso un PG inesistente {pg}")
            if s not in STATI_ATTEGGIAMENTO:
                e.errore("FRONTI.conseguenze", dove, f"{pid}: atteggiamento {s!r}, uno tra {sorted(STATI_ATTEGGIAMENTO)}")
        if "scena" in cambi and cambi["scena"] != "via" and cambi["scena"] not in scene:
            e.errore("FRONTI.conseguenze", dove, f"{pid}: scena inesistente {cambi['scena']!r} (o «via»)")
    for pid in d.get("compare") or []:
        if pid not in c.png:
            e.errore("FRONTI.conseguenze", dove, f"compare: PNG inesistente {pid}")
        elif not c.png[pid][1].get("nascosto"):
            e.avviso("FRONTI.conseguenze", dove, f"compare: {pid} non è nascosto (nascosto: true), è già visibile")
    for i in d.get("indizi") or []:
        if i not in c.indizi:
            e.errore("FRONTI.conseguenze", dove, f"indizio inesistente {i}")


def _mai_attivo(c: Campagna, oid: str) -> bool:
    return not any(oid in (s.get("orologi_attivi") or []) for _, s in c.scene if isinstance(s, dict))


def controlla_conseguenze(c: Campagna, e: Esito, oid: str, o: dict) -> None:
    """`conseguenze` of a clock (docs/mondo.md §3): one per mark, with what happens and what the table hears."""
    voci = o.get("conseguenze")
    if voci is None:
        return
    if not isinstance(voci, list):
        e.errore("FRONTI.conseguenze", oid, "conseguenze è una lista di {al_segno, cosa, detto | battuta | regia, …}")
        return
    attivo_ovunque = bool(c.scene) and all(oid in (s.get("orologi_attivi") or []) for _, s in c.scene if isinstance(s, dict))
    # A clock active in no scene (the fronts' orologi_extra) never has the PCs around: its consequences are always
    # off-screen, so what the table hears is the traces, never detto / battuta / regia.
    mai_attivo = _mai_attivo(c, oid)
    for i, x in enumerate(voci):
        dove = f"{oid}.conseguenze[{i}]"
        if not isinstance(x, dict):
            e.errore("FRONTI.conseguenze", dove, "una conseguenza è una mappa")
            continue
        for k in sorted(set(x) - CHIAVI_CONSEGUENZA):
            e.errore("FRONTI.conseguenze", dove, f"chiave sconosciuta {k!r} (ammesse: {sorted(CHIAVI_CONSEGUENZA)})")
        if not (_intero_positivo(x.get("al_segno")) and isinstance(o.get("segmenti"), int) and x["al_segno"] <= o["segmenti"]):
            e.errore("FRONTI.conseguenze", dove, f"al_segno è un segno dell'orologio (1–{o.get('segmenti')})")
        if not x.get("cosa"):
            e.errore("FRONTI.conseguenze", dove, "manca cosa (che cosa succede nel mondo)")
        if mai_attivo and not x.get("tracce"):
            e.errore("FRONTI.conseguenze", dove, "l'orologio non è attivo in nessuna scena: succede sempre fuori scena, serve tracce")
        elif not mai_attivo and not any(x.get(k) for k in ("detto", "battuta", "regia")):
            e.errore("FRONTI.conseguenze", dove, "il tavolo deve sentirla: detto, battuta o regia")
        if not x.get("tracce") and not attivo_ovunque and not mai_attivo:
            e.avviso("FRONTI.conseguenze", dove, "senza tracce: se succede mentre i PG sono altrove, al tavolo non arriva niente",
                     rigoroso=True)
        _controlla_effetti_mondo(c, e, dove, x)


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

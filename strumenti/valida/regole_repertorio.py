"""Repertorio (docs/repertorio.md, versione 2): schema delle battute, riferimenti, copertura minima,
menzogne col segnale, confessioni con un cancello vero, segni dell'orologio, voce, prosa.

Le regole sono generali: tutto ciò che nella prova era scritto a mano si ricava dalle schede.
  - Una menzogna del repertorio corrisponde alla `mente_su` con lo stesso `id` (se le menzogne della
    scheda hanno un id) o, altrimenti, a quella la cui `versione` la battuta ricalca di più.
  - Il segnale si cerca con le parole della `mente_su.segnale` (radici di quattro lettere).
  - Una confessione corrisponde alla menzogna di cui rende nota la verità (`effetti.fatti_noti`).
  - Le condizioni di `cede_se` si contano sulle congiunzioni «oppure» / «cede anche».
  - Il numero di modi di trovare un indizio è il campo facoltativo `modi` dell'indizio (predefinito 1).
"""

from __future__ import annotations

import re
import statistics
from collections import defaultdict

from . import costanti as K
from .carica import Campagna
from .esito import Esito
from .regole_scena import nomi_propri
from .testo import TEMI_GENERICI, frasi, limite_da_stile, n_parole, problemi_di_prosa, radici, vocativi

GATE = ("indizi_rivelati", "battute_usate", "orologio", "privata", "da_pg")


def _scene_battuta(b: dict) -> set[str]:
    """`scena` di una battuta come insieme (un id o una lista)."""
    s = b.get("scena")
    return {s} if isinstance(s, str) else {x for x in s if isinstance(x, str)} if isinstance(s, list) else set()


def blocchi_richiede(r: dict) -> list[dict]:
    """Le condizioni di una battuta come blocchi: la base (senza `oppure`) e ogni alternativa di `oppure`."""
    base = {k: v for k, v in (r or {}).items() if k != "oppure"}
    alternative = [a for a in (r or {}).get("oppure") or [] if isinstance(a, dict)]
    return [base, *alternative]


def ha_cancello(r: dict, chiavi=GATE) -> bool:
    """Cancello strutturale: nella base, oppure in OGNI alternativa di `oppure` (se una ne è senza, passa di lì)."""
    base, *alternative = blocchi_richiede(r)
    if any(base.get(k) for k in chiavi):
        return True
    return bool(alternative) and all(any(a.get(k) for k in chiavi) for a in alternative)


def menziona(r: dict, chiave: str) -> list:
    """Valori di una condizione in qualunque blocco (base o alternativa): privata, da_pg…"""
    out = []
    for blocco in blocchi_richiede(r):
        v = blocco.get(chiave)
        if v:
            out += v if isinstance(v, list) else [v]
    return out


def _righe(b: dict) -> list[list[str]]:
    return [b.get("testo") or []] + [v for v in (b.get("varianti") or []) if isinstance(v, list)]


def _split(riga: str) -> tuple[str | None, str]:
    m = re.match(r"^\[([a-z0-9_]+)\] (.+)$", str(riga))
    return (m.group(1), m.group(2)) if m else (None, str(riga))


def controlla(c: Campagna, e: Esito) -> None:
    if not c.battute:
        e.avviso("REPERTORIO.assente", "repertorio/", "nessuna battuta: la campagna si gioca solo in modalità A", rigoroso=True)
        return
    _schema(c, e)
    _riferimenti(c, e)
    _copertura(c, e)
    _menzogne_e_confessioni(c, e)
    _prosa(c, e)


def _schema(c: Campagna, e: Esito) -> None:
    visti = set()
    scene = {s.get("id") for _, s in c.scene}
    for b in c.battute:
        bid = b.get("id", "?")
        dove = f"{b['_file']} {bid}"
        if bid in visti:
            e.errore("REPERTORIO.id", dove, "id ripetuto")
        visti.add(bid)
        if not re.fullmatch(r"[a-z0-9_]+", str(bid)):
            e.errore("REPERTORIO.id", dove, "id in ascii minuscolo")
        rivelatrici = sorted(set(str(bid).split("_")) & K.ID_RIVELATORI)
        if rivelatrici:
            e.avviso("REPERTORIO.id_rivelatore", dove, f"l'id dice {rivelatrici} al selettore, che lo legge come una frase "
                                                       "nel catalogo: usa l'argomento («ott_segale_domanda»), non la natura "
                                                       "della battuta", rigoroso=True)
        for campo in ("id", "chi", "tipo", "quando", "temi", "testo", "max_usi"):
            if campo not in b:
                e.errore("REPERTORIO.campo", dove, f"manca {campo}")
        extra = set(b) - K.CAMPI_BATTUTA - {"_file"}
        if extra:
            e.errore("REPERTORIO.campo", dove, f"campi non previsti {sorted(extra)}")
        if b.get("tipo") not in K.TIPI_BATTUTA:
            e.errore("REPERTORIO.tipo", dove, f"tipo {b.get('tipo')} fuori elenco")
        chi = b.get("chi")
        if chi != "narratore" and chi not in c.png:
            e.errore("REPERTORIO.chi", dove, f"chi {chi} non è né narratore né un PNG con scheda")
        atteso = "narrazione.yaml" if chi == "narratore" else f"{chi}.yaml"
        if b["_file"] != atteso:
            e.avviso("REPERTORIO.file", dove, f"per convenzione sta in {atteso}")
        q = str(b.get("quando") or "")
        if n_parole(q) > 15:
            e.errore("REPERTORIO.quando", dove, f"quando di {n_parole(q)} parole (max 15)")
        for rx in K.QUANDO_VIETATE:
            if re.search(rx, q.lower()):
                e.errore("REPERTORIO.quando", dove, f"il quando dice chi mente, nasconde o confessa (/{rx}/): lo legge il selettore")
        temi = b.get("temi")
        if not isinstance(temi, list) or not temi or not all(isinstance(t, str) and t == t.lower() for t in temi):
            e.errore("REPERTORIO.temi", dove, "temi: lista non vuota di parole minuscole")
        nvar = len(b.get("varianti") or [])
        if nvar > 2:
            e.errore("REPERTORIO.varianti", dove, f"{nvar} varianti (max 2)")
        mu = b.get("max_usi")
        if not isinstance(mu, int) or not 1 <= mu <= 1 + nvar:
            e.errore("REPERTORIO.max_usi", dove, f"max_usi {mu} con {nvar} varianti: ripeterebbe lo stesso testo")
        for flag in ("solo_esempio", "riempitivo"):
            if flag in b and b[flag] is not True:
                e.errore("REPERTORIO.flag", dove, f"{flag} è true oppure assente")
        if b.get("solo_esempio") and b.get("riempitivo"):
            e.errore("REPERTORIO.flag", dove, "non può essere insieme solo_esempio e riempitivo")
        eff = b.get("effetti") or {}
        if b.get("solo_esempio") and (b.get("tipo") in K.TIPI_ESSENZIALI or eff.get("rivela_indizi")
                                       or eff.get("menzogna_detta") or eff.get("avanza_orologio")):
            e.errore("REPERTORIO.flag", dove, "un esempio di voce non può rivelare, mentire o far avanzare l'orologio")
        if b.get("riempitivo") and b.get("tipo") not in K.TIPI_RIEMPITIVO:
            e.errore("REPERTORIO.flag", dove, f"riempitivo ammesso solo per {sorted(K.TIPI_RIEMPITIVO)}")
        if b.get("scena") is not None:
            # `scena` è un id o una lista di id (il Motore accetta entrambi).
            elenco = b["scena"] if isinstance(b["scena"], list) else [b["scena"]]
            for sc in elenco:
                if sc not in scene:
                    e.errore("REPERTORIO.scena", dove, f"scena inesistente {sc}")
        for k in b.get("richiede") or {}:
            if k not in K.CAMPI_RICHIEDE:
                e.errore("REPERTORIO.richiede", dove, f"richiede.{k} non previsto")
        oppure = (b.get("richiede") or {}).get("oppure")
        if oppure is not None:
            if not (isinstance(oppure, list) and len(oppure) >= 2 and all(isinstance(a, dict) and a for a in oppure)):
                e.errore("REPERTORIO.oppure", dove, "richiede.oppure è una lista di almeno due blocchi di condizioni")
            else:
                for a in oppure:
                    for k in a:
                        if k not in K.CAMPI_RICHIEDE - {"oppure"}:
                            e.errore("REPERTORIO.oppure", dove, f"alternativa con richiede.{k}: non previsto (niente oppure annidati)")
            if not K.OPPURE_NEL_SERVER:
                e.errore("REPERTORIO.oppure", dove, "il server non applica ancora richiede.oppure: la battuta uscirebbe "
                                                    "con le sole condizioni di base. Per ora duplica la battuta (repertorio.md §4)")
        for k in eff:
            if k not in K.CAMPI_EFFETTI:
                e.errore("REPERTORIO.effetti", dove, f"effetti.{k} non previsto")
        if chi != "narratore" and not any(r.startswith(f"[{chi}]") for r in b.get("testo") or []):
            e.errore("REPERTORIO.righe", dove, f"battuta di {chi} senza nessuna sua riga")
        for versione in _righe(b):
            for r in versione:
                tag, _ = _split(r)
                if tag is None:
                    e.errore("REPERTORIO.righe", dove, f"riga senza etichetta: «{str(r)[:40]}»")
                elif tag != "narratore" and tag not in c.png:
                    e.errore("REPERTORIO.righe", dove, f"etichetta sconosciuta [{tag}]")
                elif tag not in ("narratore", chi):
                    e.avviso("REPERTORIO.righe", dove, f"riga di {tag} in una battuta di {chi}")


def _riferimenti(c: Campagna, e: Esito) -> None:
    for b in c.battute:
        dove = f"{b['_file']} {b.get('id', '?')}"
        for r in blocchi_richiede(b.get("richiede") or {}):
            _riferimenti_richiede(c, e, b, dove, r)
        eff = b.get("effetti") or {}
        for i in eff.get("rivela_indizi") or []:
            if i not in c.indizi:
                e.errore("REPERTORIO.riferimento", dove, f"rivela un indizio inesistente {i}")
        for f in eff.get("fatti_noti") or []:
            if f not in c.canone:
                e.errore("REPERTORIO.riferimento", dove, f"fatto inesistente {f}")
            elif b.get("chi") in c.png and f not in (c.png[b["chi"]][1].get("sa") or []):
                e.errore("SEGRETI.confini", dove, f"{b['chi']} rende noto {f}, che non è nel suo sa (D4)")
        if eff.get("avanza_orologio") and eff["avanza_orologio"] not in c.orologi:
            e.errore("REPERTORIO.riferimento", dove, f"avanza un orologio inesistente {eff['avanza_orologio']}")
        if eff.get("menzogna_detta") and b.get("tipo") != "menzogna":
            e.errore("REPERTORIO.effetti", dove, "menzogna_detta solo sulle battute di tipo menzogna")


def _riferimenti_richiede(c: Campagna, e: Esito, b: dict, dove: str, r: dict) -> None:
    """Riferimenti di un blocco di condizioni (la base o un'alternativa di `oppure`)."""
    for k in ("indizi_rivelati", "indizi_non_rivelati"):
        for i in r.get(k) or []:
            if i not in c.indizi:
                e.errore("REPERTORIO.riferimento", dove, f"richiede.{k}: indizio inesistente {i}")
    for k in ("battute_usate", "battute_non_usate"):
        for x in r.get(k) or []:
            if x not in c.per_id:
                e.errore("REPERTORIO.riferimento", dove, f"richiede.{k}: battuta inesistente {x}")
            elif x == b.get("id"):
                e.errore("REPERTORIO.riferimento", dove, "richiede se stessa")
    if "privata" in r and not isinstance(r["privata"], bool):
        e.errore("REPERTORIO.richiede", dove, "richiede.privata è true o false")
    for p in r.get("da_pg") or []:
        if p not in c.pg_ids:
            e.errore("REPERTORIO.riferimento", dove, f"richiede.da_pg: PG inesistente {p}")
    if r.get("orologio"):
        o = r["orologio"]
        oid = o.get("id") if isinstance(o, dict) else None
        if oid not in c.orologi:
            e.errore("REPERTORIO.riferimento", dove, f"richiede.orologio: orologio inesistente {oid}")
        elif not (0 <= o.get("min", -1) <= o.get("max", -1) <= c.orologi[oid].get("segmenti", 0)):
            e.errore("REPERTORIO.richiede", dove, f"estremi dell'orologio fuori misura: {o}")


def _selezionabile(b: dict) -> bool:
    return not b.get("solo_esempio")


def _copertura(c: Campagna, e: Esito) -> None:
    # Indizi: una rivelazione per ogni modo di trovarli.
    for i, ind in c.indizi.items():
        modi = ind.get("modi", 1) if isinstance(ind.get("modi", 1), int) else 1
        chi = [b for b in c.battute if _selezionabile(b) and i in ((b.get("effetti") or {}).get("rivela_indizi") or [])]
        if len(chi) < modi:
            e.errore("COPERTURA.indizio", i, f"{len(chi)} battute di rivelazione per {modi} modi di trovarlo")
        if "modi" not in ind:
            e.avviso("COPERTURA.modi", i, "indizio senza `modi`: si assume un solo modo di trovarlo", rigoroso=True)
    # Segni degli orologi attivi in qualche scena: uno per segmento, con l'orologio fermo al segno prima.
    attivi = {o for _, s in c.scene for o in (s.get("orologi_attivi") or [])}
    scene_di = {o: {s.get("id") for _, s in c.scene if o in (s.get("orologi_attivi") or [])} for o in attivi}
    for oid in sorted(attivi):
        o = c.orologi.get(oid)
        if not o:
            continue
        for k in range(1, (o.get("segmenti") or 0) + 1):
            chi = [b for b in c.battute if b.get("tipo") == "segno_orologio"
                   and (b.get("effetti") or {}).get("avanza_orologio") == oid
                   and ((b.get("richiede") or {}).get("orologio") or {}).get("min") == k - 1
                   and ((b.get("richiede") or {}).get("orologio") or {}).get("max") == k - 1]
            if len(chi) != 1:
                e.errore("COPERTURA.segno", f"{oid} segno {k}",
                         f"{len(chi)} battute (serve 1, con richiede.orologio min = max = {k - 1})")
            elif chi[0].get("scena") and scene_di[oid] - _scene_battuta(chi[0]):
                # Un orologio di sessione avanza in ogni scena dove è attivo: il segno deve poter uscire ovunque.
                e.errore("COPERTURA.segno", chi[0]["id"],
                         f"vale solo in {sorted(_scene_battuta(chi[0]))}, ma {oid} è attivo anche in "
                         f"{sorted(scene_di[oid] - _scene_battuta(chi[0]))}: togli `scena` (o elenca tutte) e scrivi un "
                         "segno che si sente da tutte")
            elif k - 1 < len(o.get("segni") or []) and radici(o["segni"][k - 1]) - radici(" ".join(_split(r)[1] for r in chi[0]["testo"])):
                e.avviso("COPERTURA.segno", chi[0]["id"], "il testo si allontana dal segno scritto in campagna.yaml")
    # Finali.
    if not [b for b in c.battute if b.get("tipo") == "finale"]:
        e.errore("COPERTURA.finale", "repertorio/", "nessuna battuta di tipo finale")
    # Stallo e transizioni.
    if not [b for b in c.battute if b.get("riempitivo")]:
        e.errore("COPERTURA.riempitivo", "repertorio/", "nessuna battuta riempitivo: allo stallo il selettore non ha mosse")
    if len([b for b in c.battute if b.get("tipo") == "transizione"]) < 2:
        e.avviso("COPERTURA.transizione", "repertorio/", "meno di due transizioni")
    # Voce dei PNG: esempi per l'improvvisazione.
    for pid, (_, d) in c.png.items():
        if d.get("livello") not in ("supporto", "principale"):
            continue
        mie = [b for b in c.battute if b.get("chi") == pid]
        esempi = [b for b in mie if b.get("solo_esempio")]
        tipi = {b.get("tipo") for b in esempi}
        if len(esempi) < 3 or not {"saluto", "rifiuto"} <= tipi:
            e.errore("COPERTURA.voce", pid,
                     f"{len(esempi)} esempi di voce (solo_esempio): ne servono almeno tre, con un saluto e un rifiuto")
        for cat in K.CATEGORIE_REAZIONE:
            if not [b for b in mie if str(b.get("id", "")).endswith(cat)]:
                e.avviso("COPERTURA.reazione", pid, f"nessuna battuta *_{cat} (esempio o selezionabile)")
    # Temi generici: allargano il catalogo e fanno uscire battute non pertinenti.
    for b in c.battute:
        if not _selezionabile(b) or b.get("tipo") in ("segno_orologio", "finale"):
            continue
        generici = sorted(set(b.get("temi") or []) & TEMI_GENERICI)
        if generici:
            e.avviso("COPERTURA.temi", f"{b['_file']} {b.get('id')}", f"temi troppo generici {generici}", rigoroso=True)


def _mappa_menzogne(c: Campagna, e: Esito) -> dict[tuple[str, str], dict]:
    """(png, menzogna_detta) -> voce di mente_su."""
    out = {}
    gruppi: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for b in c.battute:
        m = (b.get("effetti") or {}).get("menzogna_detta")
        if m:
            gruppi[(b.get("chi"), m)].append(b)
    for (pid, mid), bb in gruppi.items():
        if pid not in c.png:
            continue
        mente = [m for m in c.png[pid][1].get("mente_su") or [] if isinstance(m, dict)]
        per_id = {m.get("id"): m for m in mente if m.get("id")}
        if per_id:
            if mid not in per_id:
                e.errore("COPERTURA.menzogna", f"{bb[0]['_file']} {bb[0].get('id')}",
                         f"menzogna_detta {mid} non è l'id di nessuna mente_su di {pid}")
                continue
            out[(pid, mid)] = per_id[mid]
            continue
        testo = " ".join(_split(r)[1] for b in bb for r in b.get("testo") or [] if r.startswith(f"[{pid}]"))
        punti = [(len(radici(m.get("versione", "")) & radici(testo)), m) for m in mente]
        if punti:
            out[(pid, mid)] = max(punti, key=lambda x: x[0])[1]
    return out


def _menzogne_e_confessioni(c: Campagna, e: Esito) -> None:
    mappa = _mappa_menzogne(c, e)
    gia_avvisate: set[str] = set()  # una confessione può rendere note due verità: un avviso solo
    for pid, (_, d) in c.png.items():
        for m in [x for x in d.get("mente_su") or [] if isinstance(x, dict)]:
            arg = m.get("argomento", "?")
            dove = f"{pid} «{arg}»"
            versioni = [b for (p, mid), mm in mappa.items() if p == pid and mm is m
                        for b in c.battute if b.get("chi") == pid and (b.get("effetti") or {}).get("menzogna_detta") == mid]
            if not versioni:
                e.errore("COPERTURA.menzogna", dove, "nessuna battuta con la versione della menzogna")
            # Il segnale in ogni versione (testo e varianti).
            segnale = radici(m.get("segnale", ""))
            serve = min(2, len(segnale))
            for b in versioni:
                for v in _righe(b):
                    narr = " ".join(_split(r)[1] for r in v if r.startswith("[narratore]"))
                    if len(segnale & radici(narr)) < serve:
                        e.errore("COPERTURA.segnale", f"{b['_file']} {b.get('id')}",
                                 f"una versione della menzogna non mostra il segnale «{m.get('segnale')}»")
            # Confessioni: battute che rendono nota la verità.
            conf = [b for b in c.battute if b.get("chi") == pid and b.get("tipo") == "confessione"
                    and m.get("verita") in ((b.get("effetti") or {}).get("fatti_noti") or [])]
            if not conf:
                e.errore("COPERTURA.confessione", dove, "nessuna confessione che renda nota la verità (effetti.fatti_noti)")
                continue
            cede = str(m.get("cede_se") or "")
            condizioni = 1 + len(re.findall(r"\boppure\b|\bcede anche\b|\banche quando\b", cede.lower()))
            if len(conf) < condizioni:
                e.avviso("COPERTURA.confessione", dove, f"{len(conf)} confessioni per {condizioni} condizioni di cede_se")
            for b in conf:
                if b.get("id") in gia_avvisate:
                    continue
                gia_avvisate.add(b.get("id"))
                r = b.get("richiede") or {}
                if not ha_cancello(r):
                    e.avviso("COPERTURA.cancello", f"{b['_file']} {b.get('id')}",
                             "confessione senza cancello strutturale (indizi, battute, orologio, privata, da_pg): "
                             "la protegge solo il quando", rigoroso=True)
                if re.search(K.CEDE_PRIVATO, str(b.get("quando", "")).lower()) and not menziona(r, "privata"):
                    e.avviso("COPERTURA.privata", f"{b['_file']} {b.get('id')}",
                             "il quando chiede un'azione in privato: aggiungi richiede.privata: true", rigoroso=True)
            if re.search(K.CEDE_PRIVATO, cede.lower()) and not any(menziona(b.get("richiede") or {}, "privata") for b in conf):
                e.avviso("COPERTURA.privata", dove, "cede_se chiede la privatezza, ma nessuna confessione ha richiede.privata",
                         rigoroso=True)
            nominati = [p for p in c.personaggi if p.get("nome") and
                        re.search(rf"\b{re.escape(p['nome'].replace('Sorella ', '').split()[0])}\b", cede)]
            for p in nominati:
                if not any(p["id"] in menziona(b.get("richiede") or {}, "da_pg") for b in conf):
                    e.avviso("COPERTURA.da_pg", dove, f"cede_se nomina {p['nome']}: una confessione deve avere richiede.da_pg [{p['id']}]",
                             rigoroso=True)


def _prosa(c: Campagna, e: Esito) -> None:
    nomi_pg = [str(p.get("nome", "")).replace("Sorella ", "").replace("Fratello ", "").split()[0]
               for p in c.personaggi if p.get("nome")]
    nomi_png = sorted({n for _, d in c.png.values() for n in nomi_propri(d)})
    lung_narr = []
    improvvisi = 0
    for b in c.battute:
        dove = f"{b['_file']} {b.get('id', '?')}"
        for v in _righe(b):
            tot, n_narr = 0, 0
            for riga in v:
                tag, testo = _split(riga)
                if tag is None:
                    continue
                fs = frasi(testo)
                tot += n_parole(testo)
                if tag == "narratore":
                    lim = K.MAX_PAROLE_NARRATORE
                    n_narr += len(fs)
                    lung_narr += [n_parole(f) for f in fs]
                else:
                    stile = ((c.png.get(tag, ("", {}))[1].get("voce") or {}).get("stile"))
                    lim = limite_da_stile(stile, K.MAX_PAROLE_PNG)
                    maxf = K.MAX_FRASI_PNG_RIVELAZIONE if b.get("tipo") in ("confessione", "momento", "finale") else K.MAX_FRASI_PNG
                    if len(fs) > maxf:
                        e.errore("PROSA.frasi_battuta", dove, f"battuta di {tag} con {len(fs)} frasi (max {maxf}, D3)")
                for regola, det in problemi_di_prosa(testo, max_parole=lim):
                    e.errore(f"PROSA.{regola}", f"{dove} [{tag}]", det)
                for nome in nomi_pg:
                    if re.search(rf"\b{re.escape(nome)}\b", testo):
                        e.errore("PROSA.nome_pg", dove, f"nome di PG «{nome}» nel testo: il nome lo dice il narratore "
                                                       "nell'annuncio improvvisato dell'azione (manuale N15)")
                if tag == "narratore":
                    for citato in re.findall(r"«([^»]+)»", testo):
                        if re.search(r"\b(io|mio|mia|miei|mie|me|mi|tu|tuo|tua|tuoi|tue|te|ti)\b", citato.lower()):
                            e.avviso("PROSA.citazione", dove, f"«{citato[:40]}» letto dal narratore in prima o seconda persona "
                                                              "suona rivolto a un PG: lettere, diari e canzoni in discorso indiretto")
                    for v in vocativi(testo, nomi_png):
                        e.avviso("PROSA.vocativo", dove, f"«{v},» a inizio frase suona come il narratore che parla a {v}: "
                                                         "sposta il nome («Dal casello il custode, Tullio, grida…»)")
                improvvisi += testo.lower().count("all'improvviso")
            if n_narr > K.MAX_FRASI_NARRATORE_BATTUTA:
                e.errore("PROSA.blocco", dove, f"{n_narr} frasi di narratore (max {K.MAX_FRASI_NARRATORE_BATTUTA}, N2)")
            if tot > K.MAX_PAROLE_BATTUTA:
                e.errore("PROSA.blocco", dove, f"{tot} parole in tutto (max {K.MAX_PAROLE_BATTUTA})")
    if lung_narr:
        media = statistics.mean(lung_narr)
        if not K.MEDIA_NARRATORE[0] <= media <= K.MEDIA_NARRATORE[1]:
            e.errore("PROSA.media", "repertorio/", f"media delle frasi del narratore {media:.1f} parole (8-14, N1)")
    if improvvisi > max(1, len(c.scene)):
        e.errore("PROSA.all_improvviso", "repertorio/", f"«all'improvviso» {improvvisi} volte (una per scena, N5)")

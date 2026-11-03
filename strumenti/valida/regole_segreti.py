"""Parole segrete (repertorio/parole_segrete.yaml): ciò che non deve uscire prima del tempo.

Ogni voce ha `regex` (Python, sul testo in minuscolo), `fatti` (i fatti nascosti che rivela),
`pubblica_dopo` (id di indizi o battute che la rendono pubblica) e `nota`; facoltativa
`ammessa_nel_catalogo` (battute il cui elenco la contiene, perché il Motore le mostra solo quando un
giocatore ha già scritto quella parola: va motivato nella nota).

Controlli:
  - la forma del file e i riferimenti;
  - il catalogo del selettore (riga `id · chi · tipo · quando`) non contiene parole ancora segrete;
  - i campi sempre pubblici (apertura, riassunto, situazione comune, aspetto letto, battuta campione,
    segni degli orologi attivi) non le contengono;
  - gli esempi di voce (solo_esempio), che entrano nel contesto del selettore, non le contengono;
  - nel testo delle battute una parola segreta è lecita solo se quella battuta la rende pubblica
    (è in `pubblica_dopo`), se viene dopo un id che la rende pubblica (`richiede`), o se a dirla è un
    PNG che ha il fatto nel suo `sa`; e ogni battuta che la rende pubblica è elencata in `pubblica_dopo`;
  - `controlla_contesto_b`: il contesto VERO del selettore in modo B (compilato dal server, vedi
    contesto_b.py) non contiene nessuna regex, in nessuna scena. Lì non c'è stato di gioco: il
    contesto è fisso per tutta la scena, quindi ogni parola conta come ancora segreta.
"""

from __future__ import annotations

import re

from . import contesto_b
from .carica import Campagna
from .esito import Esito

# Il server scrive questi tipi nel catalogo come «risposta» (stato.ts, tipoNelCatalogo): il tipo vero
# direbbe al selettore chi mente.
TIPI_NEUTRI = {"menzogna": "risposta", "verita": "risposta", "confessione": "risposta"}


def _voci(c: Campagna, e: Esito) -> list[dict]:
    ps = c.parole_segrete
    if ps is None:
        if c.battute:
            e.errore("SEGRETI.assente", "repertorio/parole_segrete.yaml",
                     "manca: senza lessico dei segreti non si può provare che il catalogo è pulito")
        return []
    out = []
    for i, v in enumerate(ps.get("parole") or []):
        dove = f"parole_segrete #{i + 1} «{v.get('parola', '?') if isinstance(v, dict) else '?'}»"
        if not isinstance(v, dict):
            e.errore("SEGRETI.forma", dove, "ogni voce è una mappa")
            continue
        for campo in ("parola", "regex", "fatti", "pubblica_dopo", "nota"):
            if campo not in v:
                e.errore("SEGRETI.forma", dove, f"manca {campo}")
        try:
            rx = re.compile(str(v.get("regex", "")))
            if v.get("regex_en"):
                re.compile(str(v["regex_en"]))
        except re.error as err:
            e.errore("SEGRETI.regex", dove, f"regex non valida: {err}")
            continue
        for f in v.get("fatti") or []:
            if f not in c.canone:
                e.errore("SEGRETI.riferimento", dove, f"fatto inesistente {f}")
        for x in v.get("pubblica_dopo") or []:
            if x not in c.indizi and x not in c.per_id:
                e.errore("SEGRETI.riferimento", dove, f"pubblica_dopo: id inesistente {x}")
        for x in v.get("ammessa_nel_catalogo") or []:
            if x not in c.per_id:
                e.errore("SEGRETI.riferimento", dove, f"ammessa_nel_catalogo: battuta inesistente {x}")
        # Una regex che non trova né il fatto che protegge né le battute che lo rivelano non protegge
        # niente: è il modo più semplice per «zittire» il validatore restringendo le regex.
        bersagli = [str(c.canone[f].get("testo", "")) for f in v.get("fatti") or [] if f in c.canone]
        for x in v.get("pubblica_dopo") or []:
            b_ = c.per_id.get(x)
            if b_:
                bersagli += [str(r) for vv in [b_.get("testo") or []] + list(b_.get("varianti") or []) for r in vv]
        if bersagli and not any(rx.search(s.lower()) for s in bersagli):
            e.avviso("SEGRETI.regex_inerte", dove,
                     "la regex non trova né il testo dei fatti che protegge né le battute che li rivelano")
        out.append({**v, "_rx": rx, "_dove": dove})
    coperti = {f for v in out for f in v.get("fatti") or []}
    for f in sorted(c.fatti_nascosti() - coperti):
        e.avviso("SEGRETI.fatto_scoperto", f, "fatto nascosto senza parole segrete: nessun controllo vedrà le sue fughe")
    return out


def _campi_pubblici(c: Campagna) -> list[tuple[str, str]]:
    """Campi letti ad alta voce o mostrati ai giocatori: pubblici in ogni modo, con o senza node."""
    out = []
    for nome, s in c.scene:
        out += [(f"{nome} apertura", s.get("apertura") or ""), (f"{nome} nome", s.get("nome") or "")]
        for o in s.get("orologi_attivi") or []:
            for k, segno in enumerate((c.orologi.get(o) or {}).get("segni") or [], 1):
                out.append((f"{o} segno {k}", str(segno)))
    out.append(("sessione.riassunto_iniziale", (c.campagna.get("sessione") or {}).get("riassunto_iniziale") or ""))
    if isinstance(c.pg, dict):
        out.append(("pg.situazione_comune", c.pg.get("situazione_comune") or ""))
    # La scheda di un PG senza le conoscenze private va sul telefono del suo giocatore (T9).
    for p in c.personaggi:
        for campo in ("nome", "aspetto", "concetto", "aggancio"):
            if isinstance(p.get(campo), str):
                out.append((f"pg.yaml {p.get('id', '?')}.{campo}", p[campo]))
    for pid, (nome, d) in c.png.items():
        out.append((f"{nome} aspetto.lettura", (d.get("aspetto") or {}).get("lettura") or ""))
        out.append((f"{nome} battuta_campione", (d.get("voce") or {}).get("battuta_campione") or ""))
    return out


def _dentro_parola(c: Campagna, e: Esito, voci: list[dict]) -> None:
    """Una regex che scatta a metà di una parola più lunga («sa del leone» in «Rosa del leone») trova
    falsi segreti e fa scrivere male i testi per evitarli: va chiusa con \\b (nota 14 della prova cieca)."""
    testi = [str(r) for b in c.battute for v in [b.get("testo") or []] + list(b.get("varianti") or []) for r in v]
    testi += [t for _, t in _campi_pubblici(c)] + [str(f.get("testo", "")) for f in c.canone.values()]
    testi += [str(s.get(k) or "") for _, s in c.scene for k in ("descrizione", "taglio")]
    for v in voci:
        for t in testi:
            basso = t.lower()
            m = next((m for m in v["_rx"].finditer(basso) if m.start() > 0 and m.group(0)[:1].isalpha()
                      and basso[m.start() - 1].isalpha()), None)
            if m:
                inizio = basso.rfind(" ", 0, m.start()) + 1
                fine = basso.find(" ", m.end())
                parola = basso[inizio:fine if fine >= 0 else len(basso)]
                e.avviso("SEGRETI.regex_dentro_parola", v["_dove"],
                         f"la regex scatta dentro «{parola}» («{m.group(0)}»): aggiungi \\b all'inizio")
                break


def controlla(c: Campagna, e: Esito) -> None:
    voci = _voci(c, e)
    if not voci:
        return
    _dentro_parola(c, e, voci)
    for dove, testo in _campi_pubblici(c):
        for v in voci:
            if v["_rx"].search(testo.lower()):
                e.errore("SEGRETI.campo_pubblico", dove, f"campo sempre pubblico con «{v['parola']}»")
    for b in c.battute:
        bid = b.get("id", "?")
        dove = f"{b['_file']} {bid}"
        r = b.get("richiede") or {}
        e_ = b.get("effetti") or {}
        prima = set(r.get("indizi_rivelati") or []) | set(r.get("battute_usate") or [])
        qui = prima | set(e_.get("rivela_indizi") or []) | {bid}
        tutte = [riga for v in [b.get("testo") or []] + list(b.get("varianti") or []) for riga in v]
        if b.get("solo_esempio"):
            for riga in tutte:
                for v in voci:
                    if v["_rx"].search(str(riga).lower()):
                        e.errore("SEGRETI.esempio_di_voce", dove,
                                 f"esempio di voce con «{v['parola']}»: entra nel contesto del selettore")
            continue
        chi = str(b.get("chi", "")).removeprefix("png_")
        tipo = TIPI_NEUTRI.get(b.get("tipo"), b.get("tipo"))
        elenco = f"{bid.replace('_', ' ')} · {chi} · {tipo} · {b.get('quando', '')}".lower()
        for v in voci:
            if v["_rx"].search(elenco) and not prima & set(v.get("pubblica_dopo") or []):
                if bid in (v.get("ammessa_nel_catalogo") or []):
                    e.avviso("SEGRETI.catalogo", dove, f"elenco con «{v['parola']}», ammesso: il Motore la mostra solo dopo la parola del giocatore")
                else:
                    e.errore("SEGRETI.catalogo", dove, f"il selettore leggerebbe «{v['parola']}» nell'elenco: «{elenco[:80]}»")
        for riga in tutte:
            m = re.match(r"^\[([a-z0-9_]+)\] (.+)$", str(riga))
            if not m:
                continue
            tag, testo = m.group(1), m.group(2).lower()
            sa = set(c.png[tag][1].get("sa") or []) if tag in c.png else set()
            for v in voci:
                if not v["_rx"].search(testo):
                    continue
                pubblica = set(v.get("pubblica_dopo") or [])
                if not qui & pubblica and not set(v.get("fatti") or []) & sa:
                    e.errore("SEGRETI.confini", dove,
                             f"{'il narratore' if tag == 'narratore' else tag} dice «{v['parola']}» prima che sia pubblica, e non è nel suo sa")
                if not prima & pubblica and bid not in pubblica:
                    e.errore("SEGRETI.pubblica_dopo", dove,
                             f"rende pubblica «{v['parola']}» ma non è elencata in pubblica_dopo")


def controlla_contesto_b(c: Campagna, e: Esito, attivo: bool = True) -> None:
    """Le regex segrete contro il contesto che il selettore riceve davvero, scena per scena.

    Il server toglie in silenzio le frasi con una parola segreta (rete di sicurezza): qui si guarda il
    contesto prima della rete, perché una frase tolta è un pezzo di pianta o di taglio che il narratore
    non saprà mai di aver perso, e ciò che una regex non prende passa intero. Se node manca, avviso.
    """
    voci = _voci(c, Esito())  # gli errori di forma delle voci li riporta già controlla()
    if not voci:
        return  # niente parole segrete: la campagna non si gioca in modo B
    if not attivo:
        e.avviso("SEGRETI.contesto_b_non_controllato", "contesto del modo B", "controllo saltato (--senza-node)")
        return
    ctx, motivo = contesto_b.compila(c.cartella)
    if ctx is None:
        e.avviso("SEGRETI.contesto_b_non_controllato", "contesto del modo B",
                 f"{motivo}. Controllati solo i campi pubblici e il catalogo: rilancia con node prima di finire")
        return
    # (sezione, campo, parola) -> [scene in cui compare], più un estratto per il messaggio.
    scene_di: dict[tuple[str, str, str], set[str]] = {}
    estratto: dict[tuple[str, str, str], str] = {}
    for scena in ctx.scene:
        for nome, testo in scena.sezioni:
            righe = testo.splitlines()
            for i, riga in enumerate(righe):
                for v in voci:
                    m = v["_rx"].search(riga.lower())
                    if not m:
                        continue
                    chiave = (nome, contesto_b.campo_della_riga(righe, i) or "?", v["parola"])
                    scene_di.setdefault(chiave, set()).add(scena.id)
                    da = max(0, m.start() - 40)
                    estratto.setdefault(chiave, riga[da:da + 110].strip())
    tutte = {s.id for s in ctx.scene}
    for chiave in sorted(scene_di):
        nome, campo, parola = chiave
        scene = scene_di[chiave]
        quali = "tutte le scene" if scene == tutte and len(tutte) > 1 else ", ".join(sorted(scene))
        e.errore("SEGRETI.contesto_b", f"contesto B ({quali}) {nome} → {campo}",
                 f"il selettore riceverebbe «{parola}»: «{estratto[chiave]}». Riscrivi il campo senza il "
                 f"segreto (la rete del server toglierebbe la frase in silenzio)")

"""Cronologia e logistica (preparazione.cronologia, preparazione.logistica): i conti del mondo.

Nella prova cieca di ponte-lanterne i quattro difetti più gravi trovati dal revisore erano conti:
due viaggi che ci stavano tra due tocchi, una barca da otto per gruppi di venti, una riga del libro
datata prima del fatto che doveva provare, un meccanismo letto al contrario. Il validatore non può
capire il testo, ma può rifare i conti che l'autore scrive in forma strutturata:

  cronologia.eventi      in ordine di tempo; ogni `quando` si legge in minuti dalla mezzanotte
                         che apre il giorno della sessione (anni_fa, giorni_fa, giorno, ora);
                         un evento può dire a quale segno di un orologio corrisponde;
  cronologia.documenti   la data di un documento non precede gli eventi che prova; ogni indizio
                         di tipo documento ha la sua voce [R];
  logistica.verifiche    «ci_sta» / «non_ci_sta»: somma delle durate contro l'intervallo tra due
                         eventi; «porta» / «non_porta»: somma delle persone contro i posti.

Il blocco è obbligatorio solo in modo rigoroso (campagne nuove). La forma è descritta in
.claude/skills/preparatore/riferimenti/schema.md, sezione «cronologia e logistica».
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from .carica import Campagna
from .esito import Esito

MINUTI_GIORNO = 24 * 60
GIORNI_ANNO = 365
CHIAVI_QUANDO = {"anni_fa", "giorni_fa", "giorno", "ora"}


@dataclass(frozen=True)
class Istante:
    """Un momento: giorno relativo alla sessione (0 = il giorno della sessione) e minuti, se c'è l'ora."""
    giorno: int
    minuti: int | None

    def assoluto(self) -> int | None:
        return None if self.minuti is None else self.giorno * MINUTI_GIORNO + self.minuti

    def prima_di(self, altro: "Istante") -> bool:
        """Strettamente prima. Senza ora, due istanti dello stesso giorno non si ordinano."""
        if self.giorno != altro.giorno:
            return self.giorno < altro.giorno
        if self.minuti is None or altro.minuti is None:
            return False
        return self.minuti < altro.minuti

    def __str__(self) -> str:
        g = "il giorno della sessione" if self.giorno == 0 else f"giorno {self.giorno:+d}"
        if self.minuti is None:
            return g
        return f"{g}, {self.minuti // 60:02d}:{self.minuti % 60:02d}"


def leggi_quando(q, dove: str, e: Esito) -> Istante | None:
    """{anni_fa, giorni_fa, giorno, ora: "HH:MM"} → Istante. Errori di forma come MONDO.forma."""
    if not isinstance(q, dict) or not q:
        e.errore("MONDO.forma", dove, "quando è una mappa: {anni_fa, giorni_fa, giorno, ora: \"HH:MM\"}")
        return None
    extra = set(q) - CHIAVI_QUANDO
    if extra:
        e.errore("MONDO.forma", dove, f"quando con chiavi non previste {sorted(extra)} (ammesse {sorted(CHIAVI_QUANDO)})")
        return None
    for k in ("anni_fa", "giorni_fa", "giorno"):
        if k in q and not isinstance(q[k], int):
            e.errore("MONDO.forma", dove, f"{k} è un intero")
            return None
    if any(q.get(k, 0) < 0 for k in ("anni_fa", "giorni_fa")):
        e.errore("MONDO.forma", dove, "anni_fa e giorni_fa non sono negativi (per il futuro usa giorno)")
        return None
    giorno = q.get("giorno", 0) - q.get("giorni_fa", 0) - GIORNI_ANNO * q.get("anni_fa", 0)
    minuti = None
    if "ora" in q:
        m = re.fullmatch(r"(\d{1,2}):(\d{2})", str(q["ora"]))
        if not m or int(m.group(1)) > 24 or int(m.group(2)) > 59 or (int(m.group(1)) == 24 and int(m.group(2))):
            e.errore("MONDO.forma", dove, f"ora «{q['ora']}» nella forma HH:MM, da 00:00 a 24:00")
            return None
        minuti = int(m.group(1)) * 60 + int(m.group(2))
    return Istante(giorno, minuti)


def _lista(x) -> list:
    return [v for v in (x or []) if isinstance(v, dict)] if isinstance(x, list) else []


def _fatti(c: Campagna, e: Esito, dove: str, voce: dict) -> None:
    for f in voce.get("fatti") or []:
        if f not in c.canone:
            e.errore("MONDO.riferimento", dove, f"fatto inesistente {f}")


def _eventi(c: Campagna, e: Esito, crono: dict) -> dict[str, Istante]:
    eventi = _lista(crono.get("eventi"))
    istanti: dict[str, Istante] = {}
    precedente: tuple[str, Istante] | None = None
    segni: dict[str, list[tuple[int, str, Istante]]] = {}
    for ev in eventi:
        eid = ev.get("id")
        dove = f"cronologia {eid or '?'}"
        if not eid or not re.fullmatch(r"t_[a-z0-9_]+", str(eid)):
            e.errore("MONDO.forma", dove, "ogni evento ha un id nella forma t_nome")
            continue
        if eid in istanti:
            e.errore("MONDO.forma", dove, "id di evento ripetuto")
        if not ev.get("cosa"):
            e.errore("MONDO.forma", dove, "manca cosa (che cosa succede, in una frase)")
        _fatti(c, e, dove, ev)
        t = leggi_quando(ev.get("quando"), dove, e)
        if t is None:
            continue
        istanti[eid] = t
        if precedente and t.prima_di(precedente[1]):
            e.errore("MONDO.ordine", dove, f"viene prima di {precedente[0]} ({t} contro {precedente[1]}): "
                                           "gli eventi si scrivono in ordine di tempo")
        precedente = (eid, t)
        s = ev.get("segno")
        if s is not None:
            oid, n = (s.get("orologio"), s.get("n")) if isinstance(s, dict) else (None, None)
            if oid not in c.orologi or not isinstance(n, int):
                e.errore("MONDO.riferimento", dove, f"segno nella forma {{orologio: o_…, n: k}} con un orologio esistente: {s}")
            elif not 1 <= n <= int(c.orologi[oid].get("segmenti") or 0):
                e.errore("MONDO.riferimento", dove, f"segno {n} fuori dai segmenti di {oid}")
            else:
                segni.setdefault(oid, []).append((n, eid, t))
    # I segni di un orologio legati a eventi crescono con il tempo.
    for oid, lista in segni.items():
        per_tempo = sorted(lista, key=lambda x: (x[2].giorno, x[2].minuti if x[2].minuti is not None else -1))
        for (n1, e1, _), (n2, e2, _) in zip(per_tempo, per_tempo[1:]):
            if n2 <= n1:
                e.errore("MONDO.ordine", f"cronologia {e2}", f"segno {n2} di {oid} dopo il segno {n1} ({e1}): i segni crescono col tempo")
    return istanti


def _documenti(c: Campagna, e: Esito, crono: dict, istanti: dict[str, Istante]) -> None:
    docs = _lista(crono.get("documenti"))
    coperti = set()
    for d in docs:
        did = d.get("id", "?")
        dove = f"documento {did}"
        if not d.get("cosa"):
            e.errore("MONDO.forma", dove, "manca cosa (quale carta, quale riga)")
        if d.get("indizio"):
            if d["indizio"] not in c.indizi:
                e.errore("MONDO.riferimento", dove, f"indizio inesistente {d['indizio']}")
            coperti.add(d["indizio"])
        _fatti(c, e, dove, d)
        t = leggi_quando(d.get("datato"), dove, e)
        prova = d.get("prova") or []
        if not prova:
            e.errore("MONDO.forma", dove, "prova: gli eventi (t_…) che il documento attesta")
        for p in prova:
            if p not in istanti:
                e.errore("MONDO.riferimento", dove, f"prova un evento inesistente {p}")
            elif t is not None and t.prima_di(istanti[p]):
                e.errore("MONDO.documento", dove, f"datato {t}, prima dell'evento che prova ({p}, {istanti[p]})")
    for i, ind in c.indizi.items():
        if ind.get("tipo") == "documento" and i not in coperti:
            e.avviso("MONDO.documento_mancante", i,
                     "indizio di tipo documento senza voce in cronologia.documenti: la sua data non è verificata", rigoroso=True)


def _logistica(c: Campagna, e: Esito, log: dict, istanti: dict[str, Istante]) -> None:
    def tabella(chiave: str, prefisso: str, misura: str) -> dict[str, int]:
        out = {}
        for v in _lista(log.get(chiave)):
            vid = v.get("id", "?")
            dove = f"logistica.{chiave} {vid}"
            if not re.fullmatch(rf"{prefisso}_[a-z0-9_]+", str(vid)):
                e.errore("MONDO.forma", dove, f"id nella forma {prefisso}_nome")
            if not isinstance(v.get(misura), int) or v[misura] <= 0:
                e.errore("MONDO.forma", dove, f"{misura} è un intero positivo")
                continue
            if not v.get("cosa"):
                e.errore("MONDO.forma", dove, "manca cosa")
            _fatti(c, e, dove, v)
            out[vid] = v[misura]
        return out

    durate = tabella("durate", "d", "minuti")
    posti = tabella("capienze", "c", "posti")
    persone = tabella("gruppi", "g", "persone")
    for k, v in enumerate(_lista(log.get("verifiche")), 1):
        dove = f"logistica.verifiche #{k}"
        if not v.get("perche"):
            e.errore("MONDO.forma", dove, "manca perche: quale affermazione della storia regge su questo conto")
        if "tra" in v:
            _verifica_tempo(e, dove, v, istanti, durate)
        elif "capienza" in v:
            _verifica_capienza(e, dove, v, posti, persone)
        else:
            e.errore("MONDO.forma", dove, "una verifica ha tra + ci_sta/non_ci_sta, oppure capienza + porta/non_porta")


def _verifica_tempo(e: Esito, dove: str, v: dict, istanti: dict[str, Istante], durate: dict[str, int]) -> None:
    tra = v.get("tra")
    chiavi = [k for k in ("ci_sta", "non_ci_sta") if k in v]
    if not (isinstance(tra, list) and len(tra) == 2) or len(chiavi) != 1:
        e.errore("MONDO.forma", dove, "tra: [t_inizio, t_fine] e una sola tra ci_sta e non_ci_sta")
        return
    a, b = (istanti.get(x) for x in tra)
    for x in tra:
        if x not in istanti:
            e.errore("MONDO.riferimento", dove, f"evento inesistente {x}")
    if a is None or b is None:
        return
    if a.assoluto() is None or b.assoluto() is None:
        e.errore("MONDO.forma", dove, "una verifica di tempo vuole due eventi con l'ora")
        return
    voci = v[chiavi[0]] or []
    if not voci or any(d not in durate for d in voci):
        e.errore("MONDO.riferimento", dove, f"{chiavi[0]}: durate inesistenti {[d for d in voci if d not in durate] or 'nessuna'}")
        return
    intervallo, somma = b.assoluto() - a.assoluto(), sum(durate[d] for d in voci)
    if intervallo < 0:
        e.errore("MONDO.ordine", dove, f"{tra[1]} viene prima di {tra[0]}")
    elif chiavi[0] == "ci_sta" and somma > intervallo:
        e.errore("MONDO.tempo", dove, f"{' + '.join(voci)} = {somma} minuti, ma tra {tra[0]} e {tra[1]} ce ne sono {intervallo}")
    elif chiavi[0] == "non_ci_sta" and somma <= intervallo:
        e.errore("MONDO.tempo", dove, f"{' + '.join(voci)} = {somma} minuti, e tra {tra[0]} e {tra[1]} ce ne sono {intervallo}: "
                                      "ci sta, contro ciò che la storia afferma")


def _verifica_capienza(e: Esito, dove: str, v: dict, posti: dict[str, int], persone: dict[str, int]) -> None:
    chiavi = [k for k in ("porta", "non_porta") if k in v]
    cap = v.get("capienza")
    if len(chiavi) != 1:
        e.errore("MONDO.forma", dove, "una sola tra porta e non_porta")
        return
    gruppi = v[chiavi[0]] or []
    if cap not in posti or not gruppi or any(g not in persone for g in gruppi):
        e.errore("MONDO.riferimento", dove, f"capienza o gruppi inesistenti: {cap}, {gruppi}")
        return
    somma = sum(persone[g] for g in gruppi)
    if chiavi[0] == "porta" and somma > posti[cap]:
        e.errore("MONDO.capienza", dove, f"{' + '.join(gruppi)} = {somma} persone, {cap} ha {posti[cap]} posti")
    elif chiavi[0] == "non_porta" and somma <= posti[cap]:
        e.errore("MONDO.capienza", dove, f"{' + '.join(gruppi)} = {somma} persone, e {cap} ha {posti[cap]} posti: "
                                         "ci stanno, contro ciò che la storia afferma")


def controlla(c: Campagna, e: Esito) -> None:
    crono = c.preparazione.get("cronologia")
    log = c.preparazione.get("logistica")
    if crono is None:
        if c.preparazione:
            e.avviso("MONDO.assente", "preparazione.cronologia",
                     "manca la cronologia con le ore: senza, nessuno rifà i conti di tempi, date e capienze", rigoroso=True)
        return
    if not isinstance(crono, dict):
        e.errore("MONDO.forma", "preparazione.cronologia", "cronologia è una mappa {eventi, documenti}")
        return
    istanti = _eventi(c, e, crono)
    if len(istanti) < 3:
        e.avviso("MONDO.assente", "preparazione.cronologia", f"{len(istanti)} eventi: ne servono almeno tre "
                 "(il passato che fonda il segreto, l'inizio della sessione, il momento decisivo)", rigoroso=True)
    _documenti(c, e, crono, istanti)
    if log is not None:
        if isinstance(log, dict):
            _logistica(c, e, log, istanti)
        else:
            e.errore("MONDO.forma", "preparazione.logistica", "logistica è una mappa {durate, capienze, gruppi, verifiche}")

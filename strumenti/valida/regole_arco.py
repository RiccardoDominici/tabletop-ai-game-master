"""Il livello «arco» preparato prima della sessione 1: campagna.yaml → preparazione.arco (fasi D2–D4).

Forma e mestiere: .claude/skills/preparatore/riferimenti/arco.md. Le misure attese (tappe, atti, PNG
ricorrenti) vengono dalla tabella unica di strumenti/strati.py. Si controlla solo ciò che è meccanico:
  - tappe e orologio d'arco coerenti (segni crescenti fino al destino, ritmo che ci arriva in tempo);
  - finali che non chiedono una scelta precisa: ogni stato dell'orologio d'arco ha un finale, e nessun
    finale dipende da un PG che al tavolo potrebbe mancare;
  - atti che coprono le sessioni; un abbozzo per ogni sessione dopo la prima;
  - ogni PNG ricorrente usato nella sessione 1 o in un abbozzo, ogni filo con un posto dove torna.
Il livello resta «non supportato» per LIVELLO finché la prova D4 non è fatta: queste regole servono a
preparare quella prova.
"""

from __future__ import annotations

import math
import re
import sys
from pathlib import Path

import yaml

from .carica import Campagna
from .esito import Esito
from .testo import frasi

_STRUMENTI = Path(__file__).resolve().parent.parent
if str(_STRUMENTI) not in sys.path:
    sys.path.append(str(_STRUMENTI))

import strati  # noqa: E402


def _misura(e: Esito, dove: str, cosa: str, n: int, livello: strati.Livello) -> None:
    m = livello.misure.get(cosa)
    if m and (n < m.minimo or (m.massimo is not None and n > m.massimo)):
        e.avviso("ARCO.misure", dove, f"{n} {cosa.replace('_', ' ')} (il livello arco ne prevede {m}: strumenti/strati.py)")


def _png_della_sessione_1(c: Campagna) -> set[str]:
    """PNG in scena nella sessione 1: il pacchetto sessioni/01/ se c'è, altrimenti le schede scena della radice."""
    cartella = c.cartella / "sessioni" / "01" / "scene"
    if cartella.is_dir():
        out = set()
        for f in sorted(cartella.glob("*.yaml")):
            d = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
            out |= set(d.get("png_presenti") or [])
        return out
    return {p for _, s in c.scene for p in s.get("png_presenti") or []}


def _nomi_pg(c: Campagna) -> list[str]:
    return [str(p.get("nome", "")).split()[0] for p in c.personaggi if p.get("nome")] + list(c.pg_ids)


def controlla(c: Campagna, e: Esito) -> None:
    arco = c.preparazione.get("arco")
    if arco is None:
        return
    dove = "preparazione.arco"
    if not isinstance(arco, dict):
        e.errore("ARCO.forma", dove, "arco è una mappa (riferimenti/arco.md)")
        return
    lv = strati.PER_NOME["arco"]
    scelta = strati.livello_del_brief(c.brief)
    sessioni = scelta.sessioni if isinstance(scelta.sessioni, int) else None
    if sessioni is None or scelta.livello is None or scelta.livello.nome != "arco":
        e.avviso("ARCO.forma", dove, "c'è un arco, ma il brief non dice un livello «arco» (sessioni da 2 a 6)")

    # --- forma, fronte e orologio d'arco
    for campo in ("premessa", "domanda", "fronte", "orologio", "tappe", "ritmo", "atti", "finali", "png_ricorrenti"):
        if not arco.get(campo):
            e.errore("ARCO.forma", dove, f"manca {campo}")
    if arco.get("domanda") and not str(arco["domanda"]).strip().endswith("?"):
        e.errore("ARCO.forma", dove, "la domanda dell'arco è una domanda da sì o no")
    fronte = next((f for f in c.fronti if f.get("id") == arco.get("fronte")), None)
    if arco.get("fronte") and fronte is None:
        e.errore("ARCO.forma", dove, f"fronte inesistente {arco['fronte']}")
    elif fronte is not None and fronte.get("livello") != "campagna":
        e.errore("ARCO.forma", dove, f"il fronte d'arco è quello di livello campagna, non {fronte.get('livello')}")
    oid = arco.get("orologio")
    orologio = c.orologi.get(oid) if oid else None
    if oid and orologio is None:
        e.errore("ARCO.forma", dove, f"orologio inesistente {oid}")
    segmenti = int((orologio or {}).get("segmenti") or 0)
    ritmo = arco.get("ritmo") or {}
    per_sessione = ritmo.get("per_sessione")
    if ritmo and not (isinstance(per_sessione, int) and per_sessione >= 1):
        e.errore("ARCO.forma", dove, "ritmo.per_sessione è il numero di segni d'arco a fine sessione (almeno 1)")
        per_sessione = None
    for chiave in ("accelera", "rallenta"):
        if ritmo and not ritmo.get(chiave):
            e.errore("ARCO.forma", dove, f"ritmo.{chiave}: almeno una condizione osservabile (che cosa lo fa {'correre' if chiave == 'accelera' else 'frenare'})")

    _tappe(e, dove, arco, segmenti, per_sessione, sessioni, lv)
    _atti(e, dove, arco, sessioni, lv)
    _finali(c, e, dove, arco, segmenti)
    _png_e_fili(c, e, dove, arco, sessioni, lv)


def _tappe(e: Esito, dove: str, arco: dict, segmenti: int, per_sessione: int | None, sessioni: int | None, lv) -> None:
    tappe = [t for t in arco.get("tappe") or [] if isinstance(t, dict)]
    _misura(e, dove, "tappe", len(tappe), lv)
    precedente = 0
    for t in tappe:
        tid = t.get("id", "?")
        if not re.fullmatch(r"tp_[a-z0-9_]+", str(tid)):
            e.errore("ARCO.forma", f"{dove} tappa {tid}", "id nella forma tp_nome")
        for campo in ("cosa", "segno_visibile"):
            if not t.get(campo):
                e.errore("ARCO.forma", f"{dove} tappa {tid}", f"manca {campo} (ogni tappa si vede, come un presagio)")
        segno = t.get("segno")
        if not isinstance(segno, int) or segno <= precedente or (segmenti and segno > segmenti):
            e.errore("ARCO.tappe", f"{dove} tappa {tid}", f"segno {segno!r}: crescente, da 1 ai {segmenti} segmenti dell'orologio d'arco")
            continue
        precedente = segno
        entro = t.get("entro_sessione")
        if entro is not None:
            if sessioni and not (isinstance(entro, int) and 1 <= entro <= sessioni):
                e.errore("ARCO.tappe", f"{dove} tappa {tid}", f"entro_sessione {entro!r}: una sessione dell'arco (1–{sessioni})")
            elif per_sessione and isinstance(entro, int) and entro < math.ceil(segno / per_sessione):
                e.errore("ARCO.tappe", f"{dove} tappa {tid}", f"arriva al segno {segno} entro la sessione {entro}, ma con "
                                                             f"{per_sessione} segni per sessione ci vogliono {math.ceil(segno / per_sessione)} sessioni")
    if tappe and segmenti and precedente != segmenti:
        e.errore("ARCO.tappe", dove, f"l'ultima tappa è al segno {precedente}: il destino del fronte è al segno {segmenti}")
    if per_sessione and segmenti and sessioni:
        if per_sessione * sessioni < segmenti:
            e.errore("ARCO.tappe", dove, f"{per_sessione} segni per sessione in {sessioni} sessioni non arrivano ai {segmenti} "
                                         "segmenti: senza i PG il fronte non arriverebbe mai al suo destino")
        if per_sessione >= segmenti:
            e.errore("ARCO.tappe", dove, "il fronte arriverebbe al destino già dopo la prima sessione")


def _atti(e: Esito, dove: str, arco: dict, sessioni: int | None, lv) -> None:
    atti = [a for a in arco.get("atti") or [] if isinstance(a, dict)]
    _misura(e, dove, "atti", len(atti), lv)
    coperte: list[int] = []
    for a in atti:
        if not a.get("domanda") or not str(a["domanda"]).strip().endswith("?"):
            e.errore("ARCO.atti", f"{dove} {a.get('id', 'atto')}", "ogni atto ha la sua domanda, da sì o no")
        coperte += [s for s in a.get("sessioni") or [] if isinstance(s, int)]
    if atti and sessioni:
        # Nell'ordine in cui sono scritti, gli atti devono dare 1, 2, …, ultima: niente buchi né doppioni.
        if coperte != list(range(1, sessioni + 1)):
            e.errore("ARCO.atti", dove, f"gli atti coprono le sessioni {coperte}: devono coprire 1–{sessioni} in ordine, "
                                        "una volta sola")


def _finali(c: Campagna, e: Esito, dove: str, arco: dict, segmenti: int) -> None:
    finali = [f for f in arco.get("finali") or [] if isinstance(f, dict)]
    if not 2 <= len(finali) <= 4:
        e.errore("ARCO.finali", dove, f"{len(finali)} finali: ne servono da 2 a 4, che dipendono dallo stato e non da una trama")
    coperti: set[int] = set()
    nomi = _nomi_pg(c)
    for f in finali:
        fid = f.get("id", "?")
        o = f.get("orologio") or {}
        lo, hi = o.get("min"), o.get("max")
        if not (isinstance(lo, int) and isinstance(hi, int) and 0 <= lo <= hi <= max(segmenti, 0)):
            e.errore("ARCO.finali", f"{dove} finale {fid}", f"orologio {{min, max}} tra 0 e {segmenti}: il finale dice in che stato "
                                                           "è il fronte, non che cosa hanno fatto i PG")
            continue
        coperti |= set(range(lo, hi + 1))
        testo = f"{f.get('quando', '')} {f.get('esito', '')}"
        for n in nomi:
            if re.search(rf"\b{re.escape(n)}\b", testo):
                e.errore("ARCO.finali", f"{dove} finale {fid}", f"nomina {n}: un finale non dipende da un PG, al tavolo può mancare")
    if finali and segmenti:
        mancano = sorted(set(range(segmenti + 1)) - coperti)
        if mancano:
            e.errore("ARCO.finali", dove, f"nessun finale per l'orologio d'arco a {mancano}: ogni stato del fronte ha il suo finale")
        if segmenti not in coperti or not coperti - {segmenti}:
            e.errore("ARCO.finali", dove, "serve un finale a fronte compiuto e uno a fronte fermato prima")


def _png_e_fili(c: Campagna, e: Esito, dove: str, arco: dict, sessioni: int | None, lv) -> None:
    abbozzi = [s for s in arco.get("sessioni") or [] if isinstance(s, dict)]
    numeri = [s.get("numero") for s in abbozzi]
    if sessioni and sessioni > 1 and sorted(n for n in numeri if isinstance(n, int)) != list(range(2, sessioni + 1)):
        e.errore("ARCO.sessioni", dove, f"abbozzi per le sessioni {numeri}: ne serve uno per ognuna dalla 2 alla {sessioni}")
    for s in abbozzi:
        if not s.get("abbozzo"):
            e.errore("ARCO.sessioni", f"{dove} sessione {s.get('numero')}", "manca l'abbozzo (una riga)")
        elif len(frasi(str(s["abbozzo"]))) > 1:
            e.avviso("ARCO.sessioni", f"{dove} sessione {s.get('numero')}", "l'abbozzo è una frase: il dettaglio arriva tra le sessioni")
    ricorrenti = list(arco.get("png_ricorrenti") or [])
    _misura(e, dove, "png_ricorrenti", len(ricorrenti), lv)
    usati = _png_della_sessione_1(c) | {p for s in abbozzi for p in s.get("png") or []}
    for p in ricorrenti:
        if p not in c.png:
            e.errore("ARCO.png", f"{dove} png_ricorrenti", f"{p} non ha una scheda in png/")
        elif p not in usati:
            e.errore("ARCO.png", f"{dove} png_ricorrenti", f"{p} non compare né nella sessione 1 né in un abbozzo: non è ricorrente")
    in_abbozzi = {f for s in abbozzi for f in s.get("fili") or []}
    for f in [x for x in arco.get("fili") or [] if isinstance(x, dict)]:
        fid = f.get("id", "?")
        torna = [n for n in f.get("torna_in") or [] if isinstance(n, int) and (sessioni is None or 1 <= n <= sessioni)]
        if not torna and fid not in in_abbozzi:
            e.errore("ARCO.fili", f"{dove} filo {fid}", "non torna in nessuna sessione dell'arco (torna_in, o tra i fili di un abbozzo)")

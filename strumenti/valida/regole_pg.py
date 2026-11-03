"""Personaggi giocanti pregenerati e conoscenze private (T9)."""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito
from .testo import frasi


def _massimo_giocatori(v) -> int | None:
    """`giocatori` del brief: un numero, o un intervallo scritto «3-5» / «3–5» (vale il massimo)."""
    if isinstance(v, int) and not isinstance(v, bool):
        return v
    numeri = [int(x) for x in re.findall(r"\d+", str(v or ""))]
    return max(numeri) if numeri else None


def _nomi_nei_testi_preparati(c: Campagna, e: Esito, pers: list[dict]) -> None:
    """Nota 7 di nozze-neve: «la fisarmonica si ferma», ma la fisarmonica era di un PG. Sensi, segni d'orologio,
    mossa morbida e apertura sono testi del narratore scritti prima: non nominano un PG, perché al tavolo può
    mancare e perché il narratore deciderebbe per lui (N7)."""
    nomi = [str(p.get("nome", "")).replace("Sorella ", "").replace("Fratello ", "").split()[0] for p in pers if p.get("nome")]
    testi = []
    for nome, s in c.scene:
        testi += [(f"{nome} sensi", str(x)) for x in s.get("sensi") or []]
        testi += [(f"{nome} {k}", str(s.get(k) or "")) for k in ("mossa_morbida_pronta", "apertura")]
    for oid, o in c.orologi.items():
        testi += [(f"{oid} segno {k}", str(x)) for k, x in enumerate(o.get("segni") or [], 1)]
    for dove, t in testi:
        for n in nomi:
            if n and re.search(rf"\b{re.escape(n)}\b", t):
                e.errore("PROSA.nome_pg", dove, f"nomina {n}, un PG: un testo preparato del narratore non decide che cosa fa o "
                                                "ha un PG (al tavolo può mancare; N7)")


def controlla(c: Campagna, e: Esito) -> None:
    if not isinstance(c.pg, dict) or "personaggi" not in c.pg:
        e.errore("PG.forma", "pg.yaml", "forma {situazione_comune, personaggi: [...]}")
    if not (isinstance(c.pg, dict) and c.pg.get("situazione_comune")):
        e.errore("PG.campo", "pg.yaml", "manca situazione_comune (sul telefono di tutti)")
    pers = c.personaggi
    if not pers:
        e.errore("PG.nessuno", "pg.yaml", "nessun personaggio")
        return
    _nomi_nei_testi_preparati(c, e, pers)
    massimo = _massimo_giocatori((c.brief or {}).get("giocatori"))
    if massimo and len(pers) < massimo + 1:
        e.avviso("PG.numero", "pg.yaml", f"{len(pers)} PG per un massimo di {massimo} giocatori: ne serve uno in più, "
                                         "perché la scena regga con qualunque sottoinsieme", rigoroso=True)
    ids = [p.get("id") for p in pers]
    for x in {i for i in ids if ids.count(i) > 1}:
        e.errore("PG.id", "pg.yaml", f"id ripetuto {x}")
    nomi_png = {d.get("nome", "").split()[0] for _, d in c.png.values() if d.get("nome")}
    for p in pers:
        pid = p.get("id", "?")
        if not re.fullmatch(r"pg_[a-z0-9_]+", str(pid)):
            e.errore("PG.id", pid, "id nella forma pg_nome, ascii minuscolo")
        for campo in ("nome", "pronomi", "specie", "classe", "livello", "concetto", "aggancio", "conoscenze_private"):
            if campo not in p or p[campo] in (None, ""):
                e.errore("PG.campo", pid, f"manca {campo}")
        if p.get("concetto") and len(frasi(p["concetto"])) != 2:
            e.errore("PG.concetto", pid, "il concetto è di due frasi")
        for k in p.get("conoscenze_private") or []:
            if not isinstance(k, dict) or not k.get("testo"):
                e.errore("PG.conoscenze", pid, "ogni conoscenza privata ha un testo")
                continue
            for f in k.get("fatti") or []:
                if f not in c.canone:
                    e.errore("PG.conoscenze", pid, f"conoscenza privata che cita un fatto inesistente: {f}")
        nome = str(p.get("nome", "")).replace("Sorella ", "").replace("Fratello ", "").split()
        if nome and nome[0] in nomi_png:
            e.errore("PG.nome", pid, f"stesso nome di un PNG: {nome[0]}")
        comune = c.pg.get("situazione_comune") or "" if isinstance(c.pg, dict) else ""
        if nome and re.search(rf"\b{re.escape(nome[0])}\b", comune):
            e.errore("PG.situazione_comune", pid,
                     f"la situazione comune nomina {nome[0]}: deve valere per qualunque gruppo di giocatori")

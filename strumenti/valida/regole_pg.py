"""Personaggi giocanti pregenerati e conoscenze private (T9)."""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito
from .testo import frasi


def controlla(c: Campagna, e: Esito) -> None:
    if not isinstance(c.pg, dict) or "personaggi" not in c.pg:
        e.errore("PG.forma", "pg.yaml", "forma {situazione_comune, personaggi: [...]}")
    if not (isinstance(c.pg, dict) and c.pg.get("situazione_comune")):
        e.errore("PG.campo", "pg.yaml", "manca situazione_comune (sul telefono di tutti)")
    pers = c.personaggi
    if not pers:
        e.errore("PG.nessuno", "pg.yaml", "nessun personaggio")
        return
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

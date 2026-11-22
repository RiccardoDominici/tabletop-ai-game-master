"""Classes and their level tables in a rule set (docs/regole.md §2, «Classi e tiri salvezza»): the [V] checks.

Mirrors apps/server/src/regole/classi.ts and regole/salvezze.ts: `tiri_salvezza.colonne`, `classi[]` with their
`tiri_salvezza` and `incantesimi_al_giorno` rows, a save ability's column (`abilita[].salvezza: <colonna>`), and on the
set's sheets `classe`, `livello`, `razza`, `salva_come`. A sheet whose save comes from the table must not write its
own bonus for it (the Engine ignores it): that is a strict warning, so the Preparer does not copy a stale number.
"""

from __future__ import annotations

import re

from .esito import Esito

RE_ID = re.compile(r"^[a-z0-9_]+$")


def _ogg(v) -> dict | None:
    return v if isinstance(v, dict) else None


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _err(e: Esito, dove: str, msg: str) -> None:
    e.errore("REGOLE.classi", dove, msg)


def colonne_salvezza(r: dict, e: Esito, dove: str) -> list[str]:
    v = r.get("tiri_salvezza")
    if v is None:
        return []
    col = (_ogg(v) or {}).get("colonne")
    if not isinstance(col, list) or not col:
        _err(e, dove, "tiri_salvezza.colonne: un elenco di {id, nome}, almeno uno")
        return []
    out: list[str] = []
    for i, x in enumerate(col, start=1):
        cid = (_ogg(x) or {}).get("id")
        if not isinstance(cid, str) or not RE_ID.match(cid):
            _err(e, dove, f"tiri_salvezza.colonne[{i}]: serve un id in snake_case")
        elif cid in out:
            _err(e, dove, f"tiri_salvezza.colonne: id ripetuto «{cid}»")
        else:
            out.append(cid)
    return out


def _righe(v, chiave: str, dove: str, e: Esito, lunghezza: int | None) -> None:
    if v is None:
        return
    if not isinstance(v, list):
        _err(e, dove, f"un elenco di {{da, {chiave}: [...]}}")
        return
    prima = None
    for i, x in enumerate(v, start=1):
        o = _ogg(x) or {}
        da, valori = o.get("da"), o.get(chiave)
        if not (_intero(da) and da >= 0) or not isinstance(valori, list) or not all(_intero(n) and n >= 0 for n in valori):
            _err(e, dove, f"[{i}]: {{da: un livello da 0, {chiave}: [interi]}}")
            continue
        if lunghezza is not None and len(valori) != lunghezza:
            _err(e, dove, f"[{i}]: {len(valori)} valori, la tabella ha {lunghezza} colonne")
        if prima is not None and da <= prima:
            _err(e, dove, f"[{i}]: «da» cresce riga dopo riga")
        prima = da


def classi_del_set(r: dict, colonne: list[str], e: Esito, dove: str) -> set[str]:
    v = r.get("classi")
    if v is None:
        return set()
    if not isinstance(v, list):
        _err(e, dove, "classi: un elenco di {id, nome, tiri_salvezza, incantesimi_al_giorno}")
        return set()
    ids: set[str] = set()
    for i, x in enumerate(v, start=1):
        o = _ogg(x) or {}
        cid = o.get("id")
        if not isinstance(cid, str) or not RE_ID.match(cid):
            _err(e, dove, f"classi[{i}]: serve un id in snake_case")
            continue
        if cid in ids:
            _err(e, dove, f"classi: id ripetuto «{cid}»")
        ids.add(cid)
        if o.get("tiri_salvezza") is not None and not colonne:
            _err(e, dove, f"classi.{cid}.tiri_salvezza: il set non ha tiri_salvezza.colonne")
        _righe(o.get("tiri_salvezza"), "valori", f"{dove} classi.{cid}.tiri_salvezza", e, len(colonne) or None)
        _righe(o.get("incantesimi_al_giorno"), "slot", f"{dove} classi.{cid}.incantesimi_al_giorno", e, None)
    return ids


def colonne_delle_abilita(r: dict, colonne: list[str], e: Esito, dove: str) -> dict[str, str]:
    """`abilita[].salvezza`: true, or a column of the table. Returns ability id → column."""
    out: dict[str, str] = {}
    for o in r.get("abilita") or []:
        if not isinstance(o, dict) or not isinstance(o.get("salvezza"), str):
            continue
        if o["salvezza"] not in colonne:
            _err(e, dove, f"abilita.{o.get('id')}.salvezza: «{o['salvezza']}» non è una colonna di tiri_salvezza")
        else:
            out[str(o.get("id"))] = o["salvezza"]
    return out


def controlla_scheda(s: dict, dove: str, classi: set[str], colonne_abilita: dict[str, str], tabelle: set[str], e: Esito,
                     razze: set[str] | None = None, abilita: set[str] | None = None, colonne: set[str] | None = None) -> None:
    """A set sheet's `classe`, `livello`, `razza`, `salva_come`, `tratti`; a table save the sheet should not write."""
    if razze and "razza" in s and s["razza"] not in razze:
        _err(e, dove, f"scheda.razza «{s['razza']}» non è una razza del set")
    controlla_tratti(s.get("tratti"), f"{dove} scheda.tratti", abilita or set(), colonne or set(), e)
    if "classe" in s and s["classe"] not in classi:
        _err(e, dove, f"scheda.classe «{s['classe']}» non è una classe del set")
    if "livello" in s and not (_intero(s["livello"]) and s["livello"] >= 0):
        _err(e, dove, "scheda.livello: un intero da 0 in su")
    if "razza" in s and not (isinstance(s["razza"], str) and RE_ID.match(s["razza"])):
        _err(e, dove, "scheda.razza: l'id di una razza del set")
    sc = s.get("salva_come")
    if sc is not None and not (isinstance(sc, dict) and sc.get("classe") in classi and _intero(sc.get("livello")) and sc["livello"] >= 0):
        _err(e, dove, "scheda.salva_come: {classe: una classe del set, livello: un intero}")
    da_tabella = (s.get("classe") in tabelle) or (isinstance(sc, dict) and sc.get("classe") in tabelle)
    if da_tabella:
        scritte = sorted(k for k in (_ogg(s.get("abilita")) or {}) if k in colonne_abilita)
        if scritte:
            e.avviso("REGOLE.classi", dove, f"abilita {', '.join(scritte)}: il numero viene dalla tabella della classe "
                     "(tiri_salvezza), il Motore ignora il bonus della scheda: toglilo", rigoroso=True)


def controlla_tratti(v, dove: str, abilita: set[str], colonne: set[str], e: Esito) -> None:
    """A list of traits (regole/tratti.ts): {tiro: iniziativa | abilita | salvezza | esperienza, bonus}, {immune: [...]},
    {sorpresa}, {almeno: {ability: n}}, {dado_vita_massimo: n}, {scurovisione: range} (R6, darkvision)."""
    if v is None:
        return
    if not isinstance(v, list):
        _err(e, dove, "tratti: un elenco")
        return
    for i, x in enumerate(v, start=1):
        o = _ogg(x) or {}
        d = f"{dove}[{i}]"
        if "immune" in o:
            if not (isinstance(o["immune"], list) and o["immune"] and all(isinstance(w, str) and RE_ID.match(w) for w in o["immune"])):
                _err(e, d, "immune: un elenco di id (poteri o condizioni)")
            continue
        if "sorpresa" in o:
            if not (_intero(o["sorpresa"]) and o["sorpresa"] != 0):
                _err(e, d, "sorpresa: un intero diverso da 0")
            continue
        if "almeno" in o:
            al = _ogg(o["almeno"]) or {}
            ignote = [a for a in al if a not in abilita]
            if not al or not all(_intero(n) and n >= 0 for n in al.values()) or ignote:
                _err(e, d, f"almeno: {{abilità del set: un intero}}{' (non: ' + ', '.join(map(str, ignote)) + ')' if ignote else ''}")
            continue
        if "scurovisione" in o:
            if not (isinstance(o["scurovisione"], (int, float)) and not isinstance(o["scurovisione"], bool) and o["scurovisione"] >= 0):
                _err(e, d, "scurovisione: quanto vede al buio, nell'unità del movimento (0 = niente)")
            continue
        if "dado_vita_massimo" in o:
            if o["dado_vita_massimo"] not in (2, 3, 4, 6, 8, 10, 12, 20):
                _err(e, d, "dado_vita_massimo: le facce del dado vita più grande (6 = mai più di un d6)")
            continue
        if not (_intero(o.get("bonus")) and o["bonus"] != 0):
            _err(e, d, "{tiro: iniziativa | abilita | salvezza | esperienza, bonus: n}, {immune: [...]}, {sorpresa: n}, "
                 "{almeno: {...}} o {dado_vita_massimo: n}")
            continue
        tiro = o.get("tiro")
        if tiro == "abilita":
            ignote = [a for a in o.get("abilita") or [] if a not in abilita]
            if not o.get("abilita") or ignote:
                _err(e, d, f"abilita: abilità del set{' (non: ' + ', '.join(map(str, ignote)) + ')' if ignote else ''}")
        elif tiro == "salvezza":
            ignote = [c for c in o.get("colonne") or [] if c not in colonne]
            if not o.get("colonne") or ignote:
                _err(e, d, f"colonne: colonne di tiri_salvezza{' (non: ' + ', '.join(map(str, ignote)) + ')' if ignote else ''}")
        elif tiro not in ("iniziativa", "esperienza"):
            _err(e, d, "tiro: iniziativa, abilita, salvezza o esperienza")


def razze_del_set(r: dict, abilita: set[str], colonne: set[str], e: Esito, dove: str) -> set[str]:
    """`razze:` of the set and the traits of races and classes. Returns the race ids."""
    for c in r.get("classi") or []:
        if isinstance(c, dict):
            controlla_tratti(c.get("tratti"), f"{dove} classi.{c.get('id')}.tratti", abilita, colonne, e)
    v = r.get("razze")
    if v is None:
        return set()
    if not isinstance(v, list):
        _err(e, dove, "razze: un elenco di {id, nome, tratti}")
        return set()
    ids: set[str] = set()
    for i, x in enumerate(v, start=1):
        o = _ogg(x) or {}
        rid = o.get("id")
        if not isinstance(rid, str) or not RE_ID.match(rid):
            _err(e, dove, f"razze[{i}]: serve un id in snake_case")
            continue
        if rid in ids:
            _err(e, dove, f"razze: id ripetuto «{rid}»")
        ids.add(rid)
        controlla_tratti(o.get("tratti"), f"{dove} razze.{rid}.tratti", abilita, colonne, e)
    return ids

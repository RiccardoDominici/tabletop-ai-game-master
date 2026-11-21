"""Progression by class and level, and experience points (docs/regole.md §2, «Progressione», «Esperienza»): the [V] checks.

Mirrors apps/server/src/regole/progressione.ts and regole/esperienza.ts: the set's `progressione` (which abilities take
the class's attack bonus, the hit dice's characteristic, one level per adventure), the class rows `px`, `dadi_vita`,
`attacco`, `abilita` (the thief's percentages) and `tabelle` (a power rolled against a class table, Turn Undead), the
powers' `tabella`, and `esperienza` (XP by hit dice, treasure). On the set's sheets: the numbers the class tables give
(a hand-written one equal to the table is redundant — a strict warning, since a level-up would not raise it; a different
one is an override — a warning), the XP against the level, and the hit points within what the hit dice can give.

The level maths here is the only Python copy: strumenti/tra_sessioni.py imports it for the level-up step.
"""

from __future__ import annotations

import re

from .esito import Esito

RE_ID = re.compile(r"^[a-z0-9_]+$")
RE_DADO = re.compile(r"^(\d*)d(\d+)([+-]\d+)?$")


def _ogg(v) -> dict | None:
    return v if isinstance(v, dict) else None


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _err(e: Esito, dove: str, msg: str) -> None:
    e.errore("REGOLE.progressione", dove, msg)


def formula(v) -> tuple[int, int, int] | None:
    """A dice formula «1d8», «2d6+1» as (number, faces, bonus); a whole number as (0, 0, n)."""
    if _intero(v) and v >= 0:
        return (0, 0, v)
    if not isinstance(v, str):
        return None
    m = RE_DADO.match(v.replace(" ", "").lower())
    if not m:
        return None
    return (int(m.group(1) or 1), int(m.group(2)), int(m.group(3) or 0))


# ---------------------------------------------------------------------------------------------------------------------
# The level maths (shared with tra_sessioni.py)

def riga_di(righe: list, livello: int) -> dict | None:
    """The highest row with `da` ≤ level (below the first, the first)."""
    scelta = None
    for x in righe:
        if not isinstance(x, dict) or not _intero(x.get("da")):
            continue
        if scelta is None or livello >= x["da"]:
            scelta = x
    return scelta


def classe_di(r: dict, cid) -> dict | None:
    for c in r.get("classi") or []:
        if isinstance(c, dict) and c.get("id") == cid:
            return c
    return None


def _px(c: dict | None) -> list[int]:
    v = (c or {}).get("px")
    return [n for n in v if _intero(n)] if isinstance(v, list) else []


def soglia_px(c: dict | None, livello: int) -> int | None:
    """XP to reach `livello` (levels 0 and 1: the first threshold); None beyond the table or without one."""
    px = _px(c)
    if not px:
        return None
    if livello <= 1:
        return px[0]
    return px[livello - 1] if livello - 1 < len(px) else None


def livello_da_px(c: dict | None, px: int) -> int:
    """The level an XP total reaches by the class table (at least 1)."""
    out = 1
    for i, n in enumerate(_px(c)):
        if px >= n:
            out = i + 1
    return out


def tetto_px(c: dict | None, livello: int, un_livello: bool) -> int | None:
    """One short of the level after next, when the set gives one level a time (Basic Fantasy p. 49)."""
    if not un_livello:
        return None
    dopo = soglia_px(c, max(1, livello) + 2)
    return None if dopo is None else dopo - 1


def un_livello_per_avventura(r: dict) -> bool:
    return (_ogg(r.get("progressione")) or {}).get("un_livello_per_avventura") is True


def tratti_di(r: dict, s: dict) -> list[dict]:
    """The traits of a sheet: its race's, its class's and its own."""
    out: list[dict] = []
    for x in r.get("razze") or []:
        if isinstance(x, dict) and x.get("id") == s.get("razza"):
            out += [t for t in x.get("tratti") or [] if isinstance(t, dict)]
    c = classe_di(r, s.get("classe"))
    if c:
        out += [t for t in c.get("tratti") or [] if isinstance(t, dict)]
    out += [t for t in s.get("tratti") or [] if isinstance(t, dict)]
    return out


def bonus_caratteristica(r: dict, s: dict, car: str | None) -> int:
    """The bonus a characteristic brings to a roll, as regole/schede.ts valoreCaratteristica."""
    if not car:
        return 0
    tipo = (_ogg(r.get("modificatore")) or {}).get("tipo", "srd")
    righe = [(x["da"], x["mod"]) for x in ((_ogg(r.get("modificatore")) or {}).get("tabella") or [])
             if isinstance(x, dict) and _intero(x.get("da")) and _intero(x.get("mod"))]
    v = (_ogg(s.get("caratteristiche")) or {}).get(car)
    if not _intero(v):
        v = 10 if tipo == "srd" else next((da for da, m in righe if m == 0), righe[0][0] if righe else 0) if tipo == "tabella" else 0
    if tipo == "srd":
        return (v - 10) // 2
    if tipo == "tabella":
        mod = righe[0][1] if righe else 0
        for da, m in righe:
            if v >= da:
                mod = m
        return mod
    return v


def valori_da_classe(r: dict, s: dict) -> dict[str, int]:
    """What the class tables give a sheet at its level (regole/progressione.ts valoriDaClasse)."""
    out: dict[str, int] = {}
    c = classe_di(r, s.get("classe"))
    livello = s.get("livello", 1) if _intero(s.get("livello", 1)) else 1
    prog = _ogg(r.get("progressione")) or {}
    if c:
        riga = riga_di(c.get("attacco") or [], livello)
        if riga and _intero(riga.get("bonus")):
            for a in prog.get("attacco") or []:
                ab, piu = (a, 0) if isinstance(a, str) else ((a or {}).get("abilita"), (a or {}).get("piu", 0))
                classi = [] if isinstance(a, str) else ((a or {}).get("classi") or [])
                if isinstance(ab, str) and _intero(piu) and (not classi or s.get("classe") in classi):
                    out[ab] = riga["bonus"] + piu
        ta = _ogg(c.get("abilita")) or {}
        riga = riga_di(ta.get("righe") or [], livello)
        for i, ab in enumerate(ta.get("colonne") or []):
            if riga and isinstance(riga.get("valori"), list) and i < len(riga["valori"]) and _intero(riga["valori"][i]):
                out[ab] = riga["valori"][i]
    for t in tratti_di(r, s):
        for ab, n in (_ogg(t.get("almeno")) or {}).items():
            if _intero(n):
                out[ab] = max(out.get(ab, n), n)
    return out


def pf_del_livello(r: dict, s: dict, livello: int) -> dict | None:
    """What reaching `livello` adds: {dado: faces, bonus, minimo} or {fissi: n}; None without hit-dice rows."""
    c = classe_di(r, s.get("classe"))
    riga = riga_di((c or {}).get("dadi_vita") or [], livello)
    if not riga:
        return None
    if _intero(riga.get("fissi")):
        return {"fissi": riga["fissi"]}
    f = formula(riga.get("dado"))
    if not f:
        return None
    facce = f[1]
    for t in tratti_di(r, s):
        if _intero(t.get("dado_vita_massimo")):
            facce = min(facce, t["dado_vita_massimo"])
    pf = _ogg((_ogg(r.get("progressione")) or {}).get("punti_ferita")) or {}
    car = pf.get("caratteristica")
    return {"dado": facce, "bonus": bonus_caratteristica(r, s, car) if isinstance(car, str) else 0,
            "minimo": pf.get("minimo", 1) if _intero(pf.get("minimo", 1)) else 1}


def limiti_pf(r: dict, s: dict) -> tuple[int, int] | None:
    """The lowest and highest maximum HP of the sheet at its level by the class rows."""
    livello = s.get("livello", 1) if _intero(s.get("livello", 1)) else 1
    if livello < 1:
        return None
    lo = hi = 0
    for l in range(1, livello + 1):
        x = pf_del_livello(r, s, l)
        if x is None:
            return None
        if "fissi" in x:
            lo += x["fissi"]
            hi += x["fissi"]
        else:
            lo += max(x["minimo"], 1 + x["bonus"])
            hi += max(x["minimo"], x["dado"] + x["bonus"])
    return lo, hi


# ---------------------------------------------------------------------------------------------------------------------
# The set's sections

def _righe(v, dove: str, e: Esito, leggi) -> None:
    if v is None:
        return
    if not isinstance(v, list):
        _err(e, dove, "un elenco di righe {da, …}")
        return
    prima = None
    for i, x in enumerate(v, start=1):
        o = _ogg(x) or {}
        if not (_intero(o.get("da")) and o["da"] >= 0):
            _err(e, dove, f"[{i}]: {{da: un livello da 0, …}}")
            continue
        leggi(o, f"{dove}[{i}]")
        if prima is not None and o["da"] <= prima:
            _err(e, dove, f"[{i}]: «da» cresce riga dopo riga")
        prima = o["da"]


def progressione_del_set(r: dict, abi: set[str], car: set[str], poteri: dict[str, dict], e: Esito, dove: str) -> None:
    """`progressione:`, the class rows of progression, the powers' `tabella`."""
    p = r.get("progressione")
    if p is not None:
        o = _ogg(p)
        if o is None:
            _err(e, dove, "progressione: {attacco, punti_ferita, un_livello_per_avventura}")
            o = {}
        ids_classi = {c.get("id") for c in r.get("classi") or [] if isinstance(c, dict)}
        for i, a in enumerate(o.get("attacco") or [], start=1):
            ab, piu = (a, 0) if isinstance(a, str) else ((_ogg(a) or {}).get("abilita"), (_ogg(a) or {}).get("piu", 0))
            classi = [] if isinstance(a, str) else ((_ogg(a) or {}).get("classi") or [])
            if ab not in abi or not _intero(piu) or not isinstance(classi, list):
                _err(e, dove, f"progressione.attacco[{i}]: un'abilità del set, o {{abilita, piu: un intero, classi: [id]}}")
            for k in classi if isinstance(classi, list) else []:
                if k not in ids_classi:
                    _err(e, dove, f"progressione.attacco[{i}].classi: «{k}» non è una classe del set")
        pf = _ogg(o.get("punti_ferita")) or {}
        if pf.get("caratteristica") is not None and pf["caratteristica"] not in car:
            _err(e, dove, "progressione.punti_ferita.caratteristica: una caratteristica del set, o null")
        if "minimo" in pf and not (_intero(pf["minimo"]) and pf["minimo"] >= 0):
            _err(e, dove, "progressione.punti_ferita.minimo: un intero da 0")
        if "un_livello_per_avventura" in o and not isinstance(o["un_livello_per_avventura"], bool):
            _err(e, dove, "progressione.un_livello_per_avventura: true o false")
    tabellati = {k: v for k, v in poteri.items() if isinstance(v.get("tabella"), dict)}
    for k, o in poteri.items():
        if "tabella" in o:
            _tabella_del_potere(o.get("tabella"), f"poteri.{k}.tabella", e, dove)
    for c in r.get("classi") or []:
        if not isinstance(c, dict) or not isinstance(c.get("id"), str):
            continue
        d = f"{dove} classi.{c['id']}"
        px = c.get("px")
        if px is not None:
            if not (isinstance(px, list) and px and all(_intero(n) and n >= 0 for n in px)):
                _err(e, d, "px: i PX per arrivare a ogni livello, interi dal livello 1")
            elif any(px[i] <= px[i - 1] for i in range(1, len(px))):
                _err(e, d, "px: crescono livello dopo livello")

        def dadi(o: dict, dd: str) -> None:
            if "fissi" in o:
                if not (_intero(o["fissi"]) and o["fissi"] >= 0):
                    _err(e, dd, "fissi: un intero di punti ferita")
            else:
                f = formula(o.get("dado"))
                if not f or f[0] != 1 or f[2] != 0:
                    _err(e, dd, '{da, dado: "1d8"} (un dado a livello) o {da, fissi: 2}')
        _righe(c.get("dadi_vita"), f"{d}.dadi_vita", e, dadi)
        _righe(c.get("attacco"), f"{d}.attacco", e,
               lambda o, dd: None if _intero(o.get("bonus")) else _err(e, dd, "bonus: il bonus d'attacco, un intero"))
        if (c.get("attacco") or c.get("dadi_vita")) and p is None:
            _err(e, d, "righe d'attacco o di dadi vita: servono la progressione del set (quali abilità, quale caratteristica)")
        ta = c.get("abilita")
        if ta is not None:
            to = _ogg(ta) or {}
            colonne = to.get("colonne")
            if not (isinstance(colonne, list) and colonne and all(isinstance(x, str) for x in colonne)):
                _err(e, d, "abilita: {colonne: [id di abilità], righe: [{da, valori}]}")
            else:
                ignote = [x for x in colonne if x not in abi]
                if ignote:
                    _err(e, d, f"abilita.colonne: non sono abilità del set: {', '.join(ignote)}")

                def valori(o: dict, dd: str) -> None:
                    v = o.get("valori")
                    if not (isinstance(v, list) and all(_intero(n) and n >= 0 for n in v)):
                        _err(e, dd, "valori: interi, uno per colonna")
                    elif len(v) != len(colonne):
                        _err(e, dd, f"valori: {len(v)} valori, la tabella ha {len(colonne)} colonne")
                _righe(to.get("righe"), f"{d}.abilita.righe", e, valori)
        for k, righe in (_ogg(c.get("tabelle")) or {}).items():
            pot = tabellati.get(k)
            if pot is None:
                _err(e, d, f"tabelle.{k}: non è un potere del set con una tabella")
                continue
            n = len((_ogg(pot.get("tabella")) or {}).get("colonne") or [])

            def celle(o: dict, dd: str, n=n) -> None:
                v = o.get("valori")
                if not (isinstance(v, list) and all(x is None or x in ("T", "D") or (_intero(x) and x >= 0) for x in v)):
                    _err(e, dd, "valori: una cella per colonna: un intero, T, D o null (No)")
                elif len(v) != n:
                    _err(e, dd, f"valori: {len(v)} celle, la tabella del potere ha {n} colonne")
            _righe(righe, f"{d}.tabelle.{k}", e, celle)
        if c.get("tabelle") is not None and _ogg(c.get("tabelle")) is None:
            _err(e, d, "tabelle: {id del potere: [{da, valori}]}")


def _tabella_del_potere(v, d: str, e: Esito, dove: str) -> None:
    o = _ogg(v)
    if o is None:
        _err(e, dove, f"{d}: {{dado, colonne, colpiti, distrugge, dopo_fallimento}}")
        return
    f = formula(o.get("dado"))
    if not f or not f[0]:
        _err(e, dove, f"{d}.dado: il tiro di chi lo usa («1d20»)")
    colonne = o.get("colonne")
    if not (isinstance(colonne, list) and colonne):
        _err(e, dove, f"{d}.colonne: almeno una colonna")
    for i, x in enumerate(colonne or [], start=1):
        c = _ogg(x) or {}
        if not (isinstance(c.get("id"), str) and RE_ID.match(c["id"]) and _intero(c.get("dadi_vita")) and c["dadi_vita"] >= 0):
            _err(e, dove, f"{d}.colonne[{i}]: {{id, nome, dadi_vita}}")
    if "colpiti" in o and not formula(o["colpiti"]):
        _err(e, dove, f"{d}.colpiti: una formula di dadi («2d6»)")
    if "distrugge" in o and not formula((_ogg(o["distrugge"]) or {}).get("dadi")):
        _err(e, dove, f"{d}.distrugge: {{dadi: «1d8», per_livello: true}}")


def esperienza_del_set(r: dict, e: Esito, dove: str) -> None:
    v = r.get("esperienza")
    if v is None:
        return
    o = _ogg(v)
    if o is None:
        _err(e, dove, "esperienza: {per_dadi_vita, oltre, tesoro}")
        return
    prima = None
    for i, x in enumerate(o.get("per_dadi_vita") or [], start=1):
        x = _ogg(x) or {}
        if not (_intero(x.get("da")) and x["da"] >= 0 and _intero(x.get("px")) and x["px"] >= 0 and _intero(x.get("speciale", 0))):
            _err(e, dove, f"esperienza.per_dadi_vita[{i}]: {{da: dadi vita da 0, px: un intero, speciale: un intero}}")
            continue
        if prima is not None and x["da"] <= prima:
            _err(e, dove, f"esperienza.per_dadi_vita[{i}]: «da» cresce riga dopo riga")
        prima = x["da"]
    if "oltre" in o:
        x = _ogg(o["oltre"]) or {}
        if not (_intero(x.get("px")) and _intero(x.get("speciale", 0))):
            _err(e, dove, "esperienza.oltre: {px, speciale} per ogni dado vita oltre l'ultima riga")
    t = o.get("tesoro")
    if t is not None:
        x = _ogg(t) or {}
        monete = {m.get("id") for m in (_ogg(r.get("monete")) or {}).get("tagli") or [] if isinstance(m, dict)}
        if not (_intero(x.get("px")) and x["px"] >= 1):
            _err(e, dove, "esperienza.tesoro.px: i PX per ogni moneta di `per`, un intero da 1")
        if x.get("per", (_ogg(r.get("monete")) or {}).get("base")) not in monete:
            _err(e, dove, "esperienza.tesoro.per: una moneta del set (monete.tagli)")
        if x.get("quando", "trovato") not in ("trovato", "al_sicuro"):
            _err(e, dove, "esperienza.tesoro.quando: trovato o al_sicuro")


# ---------------------------------------------------------------------------------------------------------------------
# The sheets

def controlla_scheda(s: dict, dove: str, r: dict, e: Esito, di_png: bool) -> None:
    """A set sheet against its class tables: written numbers, XP, hit points."""
    for k in ("px", "speciali"):
        if k in s and not (_intero(s[k]) and s[k] >= 0):
            e.errore("REGOLE.progressione", dove, f"scheda.{k}: un intero da 0 in su")
    tabella = valori_da_classe(r, s)
    scritte = _ogg(s.get("abilita")) or {}
    livello = s.get("livello", 1) if _intero(s.get("livello", 1)) else 1
    uguali = sorted(k for k, n in scritte.items() if k in tabella and n == tabella[k])
    if uguali:
        e.avviso("REGOLE.progressione", dove, f"abilita {', '.join(uguali)}: il numero viene dalla tabella della classe al "
                 f"livello {livello}; scritto a mano non salirebbe col livello: toglilo", rigoroso=True)
    for k in sorted(k for k, n in scritte.items() if k in tabella and n != tabella[k]):
        e.avviso("REGOLE.progressione", dove, f"abilita.{k}: {scritte[k]} scritto a mano, la tabella della classe dà "
                 f"{tabella[k]} al livello {livello}: vale quello della scheda (un'eccezione voluta?)")
    c = classe_di(r, s.get("classe"))
    if di_png or not c:
        return
    if _intero(s.get("px")) and _px(c):
        atteso = livello_da_px(c, s["px"])
        if atteso != max(1, livello):
            e.avviso("REGOLE.progressione", dove, f"px {s['px']}: con la tabella della classe è il livello {atteso}, la "
                     f"scheda dice livello {livello}", rigoroso=True)
    lim = limiti_pf(r, s)
    pf = s.get("pf", s.get("pf_massimi"))
    if lim and _intero(pf) and not lim[0] <= pf <= lim[1]:
        e.avviso("REGOLE.progressione", dove, f"pf {pf}: i dadi vita della classe al livello {livello} danno da {lim[0]} "
                 f"a {lim[1]}", rigoroso=True)

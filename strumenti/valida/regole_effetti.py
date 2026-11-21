"""Typed effects, falls and rest of a rule set (docs/regole.md §2, «Effetti tipati»): the [V] checks.

Mirrors apps/server/src/regole/effetti.ts and regole/salute.ts: the closed list of effect kinds, their fields and
durations, the falling table (`cadute`) and the kinds of rest (`riposo`). Used by regole_set.py (the set, its powers and
its scene checks) and by regole_schede.py (an SRD campaign's scene checks: `effetti_se_fallisce`).
If the Engine adds an effect kind, add it here too: test_valida_regole.py::test_tipi_effetto_come_il_motore fails
when the two lists diverge.
"""

from __future__ import annotations

import re

from .esito import Esito

TIPI_EFFETTO = ("danno", "cura", "caduta", "attacco", "condizione", "bonus", "immunita", "stabilizza", "morte", "oggetto", "monete")
BERSAGLI_BONUS = ("difesa", "attacchi", "salvezze", "danni")
CONTRO_BONUS = ("tutti", "mischia", "distanza")
DURATE = ("istantanea", "scena", "riposo", "permanente")
RE_FORMULA = re.compile(r"^(\d*)d(2|3|4|6|8|10|12|20|100)([+-]\d+)?$")
RE_ID = re.compile(r"^[a-z0-9_]+$")


def _ogg(v) -> dict | None:
    return v if isinstance(v, dict) else None


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def formula_valida(v) -> bool:
    """A dice formula like the Engine's leggiFormula: «1d6+1», «2d8», or a whole number."""
    if _intero(v):
        return v >= 0
    if not isinstance(v, str):
        return False
    t = re.sub(r"\s+", "", v).lower()
    m = RE_FORMULA.match(t)
    if m:
        n = int(m.group(1)) if m.group(1) else 1
        return 1 <= n <= 40
    return t.isdigit()


def _scala(v, dove: str, e: Esito, codice: str) -> None:
    if v is None:
        return
    o = _ogg(v)
    # An empty map is valid (one per level, no cap), as the Engine reads it: `o is None`, not falsy.
    ogni = o.get("ogni_livelli", 1) if o is not None else None
    massimo = o.get("massimo") if o is not None else None
    if o is None or not _intero(ogni) or ogni < 1 or (massimo is not None and (not _intero(massimo) or massimo < 1)):
        e.errore(codice, dove, "{ogni_livelli: n ≥ 1, massimo: n ≥ 1} (entrambi facoltativi)")


def controlla_durata(v, dove: str, e: Esito, codice: str) -> None:
    if v is None or v in DURATE:
        return
    o = _ogg(v)
    # A duration in a unit of the set's clock, as regole/effetti.ts reads it: {turni: 3} (the unit `turno`) or
    # {<unit id>: amount}, one key; without a clock that has the unit the Engine lets it last the scene.
    unita = [k for k in o or {} if k not in ("round", "round_per_livello")]
    if o and len(unita) == 1 and "round" not in o and "round_per_livello" not in o:
        if not (re.match(r"^[a-z0-9_]+$", unita[0]) and formula_valida(o[unita[0]])):
            e.errore(codice, dove, f"{unita[0]}: una quantità, un numero o una formula come 2d8")
        return
    if o and ("round" in o or "round_per_livello" in o):
        if "round" in o and not formula_valida(o["round"]):
            e.errore(codice, dove, "round: un numero o una formula come 1d4")
        if "round_per_livello" in o and (not _intero(o["round_per_livello"]) or o["round_per_livello"] < 0):
            e.errore(codice, dove, "round_per_livello: un intero da 0 in su")
        return
    e.errore(codice, dove, "durata: istantanea, scena, riposo, permanente, {round, round_per_livello} o {turni} (un'unità del tempo del set)")


def controlla_effetti(v, dove: str, e: Esito, codice: str, condizioni: set[str] | None) -> list[dict]:
    """A list of typed effects: each of the closed list, with its fields. `condizioni`: the set's ids (None = unknown)."""
    if v is None:
        return []
    if not isinstance(v, list):
        e.errore(codice, dove, "una lista di effetti")
        return []
    validi = []
    for i, x in enumerate(v, start=1):
        o = _ogg(x)
        d = f"{dove}[{i}]"
        tipo = o.get("tipo") if o else None
        if tipo not in TIPI_EFFETTO:
            e.errore(codice, d, f"tipo uno tra {', '.join(TIPI_EFFETTO)}")
            continue
        ok = True
        # `pari_ai_pf: true`: a damage as much as the author's current hit points, no dice needed (regole/effetti.ts).
        if "pari_ai_pf" in o and not isinstance(o["pari_ai_pf"], bool):
            e.errore(codice, d, "pari_ai_pf: true o false")
        if tipo == "danno" and o.get("pari_ai_pf") is True and "dadi" not in o:
            pass
        elif tipo in ("danno", "cura", "attacco") and not formula_valida(o.get("dadi")):
            e.errore(codice, d, "dadi: una formula come 1d6+1 (o un intero)")
            ok = False
        if tipo in ("danno", "cura"):
            for k in ("dadi_per_livello", "bonus_per_livello") + (("colpi",) if tipo == "danno" else ()):
                _scala(o.get(k), f"{d}.{k}", e, codice)
        if tipo == "caduta" and not (isinstance(o.get("altezza"), (int, float)) and not isinstance(o.get("altezza"), bool) and o["altezza"] >= 0):
            e.errore(codice, d, "altezza: l'altezza della caduta, nell'unità della tabella delle cadute")
            ok = False
        if tipo == "attacco" and "bonus" in o and not _intero(o["bonus"]):
            e.errore(codice, d, "bonus: un intero (il bonus d'attacco della trappola)")
            ok = False
        if tipo == "condizione":
            c = o.get("condizione")
            if not isinstance(c, str) or not RE_ID.match(c):
                e.errore(codice, d, "condizione: l'id di una condizione del set")
                ok = False
            elif condizioni is not None and c not in condizioni:
                e.errore(codice, d, f"condizione «{c}» non è tra le condizioni del set (combattimento.condizioni)")
                ok = False
        if tipo == "bonus":
            if o.get("a") not in BERSAGLI_BONUS:
                e.errore(codice, d, f"a: {', '.join(BERSAGLI_BONUS)}")
                ok = False
            if not _intero(o.get("valore")) or o.get("valore") == 0:
                e.errore(codice, d, "valore: un intero diverso da 0")
                ok = False
            if o.get("contro", "tutti") not in CONTRO_BONUS:
                e.errore(codice, d, f"contro: {', '.join(CONTRO_BONUS)}")
                ok = False
        if tipo == "immunita":
            a = o.get("a")
            if not isinstance(a, list) or not a or not all(isinstance(x, str) and RE_ID.match(x) for x in a):
                e.errore(codice, d, "a: una lista di id (poteri o condizioni)")
                ok = False
        if tipo == "oggetto" and not (isinstance(o.get("oggetto"), str) and RE_ID.match(o["oggetto"])
                                      and (o.get("quante") is None or (_intero(o["quante"]) and o["quante"] != 0))):
            e.errore(codice, d, "oggetto: l'id di una voce del catalogo del set, quante un intero (negativo per perderlo)")
            ok = False
        if tipo == "monete" and not (isinstance(o.get("monete"), dict) and o["monete"]
                                     and all(isinstance(k, str) and _intero(n) and n != 0 for k, n in o["monete"].items())):
            e.errore(codice, d, "monete: {id di moneta: quante} (negativo per pagare)")
            ok = False
        if tipo in ("condizione", "bonus", "immunita"):
            controlla_durata(o.get("durata"), f"{d}.durata", e, codice)
        if ok:
            validi.append(o)
    return validi


def controlla_cadute(r: dict, e: Esito, dove: str) -> None:
    v = r.get("cadute")
    if v is None:
        return
    o = _ogg(v)
    ok = (o is not None and formula_valida(o.get("dadi")) and isinstance(o.get("ogni"), (int, float)) and not isinstance(o.get("ogni"), bool)
          and o["ogni"] > 0 and o.get("arrotonda", "vicino") in ("vicino", "giu")
          and (o.get("massimo") is None or (_intero(o.get("massimo")) and o["massimo"] > 0)))
    if not ok:
        e.errore("REGOLE.cadute", dove, 'cadute: {dadi: "1d6", ogni: 10, unita: "piedi", arrotonda: vicino | giu, massimo: 20}')


def controlla_riposo(r: dict, e: Esito, dove: str) -> None:
    v = r.get("riposo")
    if v is None:
        return
    if not isinstance(v, list):
        e.errore("REGOLE.riposo", dove, "riposo: una lista di {id, nome, cura}")
        return
    visti: set[str] = set()
    for i, x in enumerate(v, start=1):
        o = _ogg(x)
        rid = o.get("id") if o else None
        if not isinstance(rid, str) or not RE_ID.match(rid):
            e.errore("REGOLE.riposo", dove, f"riposo[{i}]: serve un id in snake_case")
            continue
        if rid in visti:
            e.errore("REGOLE.riposo", dove, f"riposo: id ripetuto «{rid}»")
        visti.add(rid)
        cura = o.get("cura", 0)
        if cura != "tutti" and not formula_valida(cura):
            e.errore("REGOLE.riposo", dove, f"riposo.{rid}.cura: un intero, una formula come 1d3, o tutti")
        if "ricarica" in o and not isinstance(o["ricarica"], bool):
            e.errore("REGOLE.riposo", dove, f"riposo.{rid}.ricarica: true o false")

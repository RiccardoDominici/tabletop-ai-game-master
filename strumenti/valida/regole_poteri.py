"""Powers and resources of a rule set (docs/regole.md §2, «Poteri» and «Risorse»): the [V] checks.

Mirrors apps/server/src/regole/poteri.ts and regole/risorse.ts: `poteri[]` (type, spell level by class, target, save,
limits, typed effects), `risorse[]`, `magia.preparazione`, and on the set's sheets `incantesimi`, `oggetti`, `risorse`,
`slot`, `tipo`, `immune`, `dadi_vita`, `attacchi[].consuma`; the attack abilities' extras (`danno: doppio`,
`una_volta_per_bersaglio`, `ripiego`). A vancian caster may not prepare more copies of a spell level than its class
gives it that day (the Engine would never let it cast them): an error.
"""

from __future__ import annotations

import re

from .esito import Esito
from .regole_effetti import controlla_effetti
from .regole_bestiario import dadi_vita_validi

TIPI_POTERE = ("incantesimo", "oggetto", "azione", "pericolo")
BERSAGLI_POTERE = ("se_stesso", "uno", "nemici", "alleati")
RICARICHE = ("mai", "riposo", "scontro")
RE_ID = re.compile(r"^[a-z0-9_]+$")


def _ogg(v) -> dict | None:
    return v if isinstance(v, dict) else None


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _err(e: Esito, dove: str, msg: str) -> None:
    e.errore("REGOLE.poteri", dove, msg)


def poteri_del_set(r: dict, salvezze: set[str], classi: set[str], condizioni: set[str], e: Esito, dove: str) -> dict[str, dict]:
    """The set's powers, checked. Returns id → power (the valid ones)."""
    v = r.get("poteri")
    if v is None:
        return {}
    if not isinstance(v, list):
        _err(e, dove, "poteri: un elenco di {id, nome, tipo, bersaglio, effetti}")
        return {}
    out: dict[str, dict] = {}
    for i, x in enumerate(v, start=1):
        o = _ogg(x) or {}
        pid = o.get("id")
        if not isinstance(pid, str) or not RE_ID.match(pid):
            _err(e, dove, f"poteri[{i}]: serve un id in snake_case")
            continue
        d = f"poteri.{pid}"
        if pid in out:
            _err(e, dove, f"poteri: id ripetuto «{pid}»")
        if o.get("tipo") not in TIPI_POTERE:
            _err(e, dove, f"{d}.tipo: {', '.join(TIPI_POTERE)}")
        if o.get("bersaglio", "uno") not in BERSAGLI_POTERE:
            _err(e, dove, f"{d}.bersaglio: {', '.join(BERSAGLI_POTERE)}")
        livello = _ogg(o.get("livello")) or {}
        for k, n in livello.items():
            if not (_intero(n) and n >= 1):
                _err(e, dove, f"{d}.livello.{k}: un livello d'incantesimo da 1")
            elif classi and k not in classi:
                _err(e, dove, f"{d}.livello: «{k}» non è una classe del set")
        if o.get("tipo") == "incantesimo" and not livello:
            _err(e, dove, f"{d}.livello: un incantesimo vuole {{classe: livello}}")
        sv = o.get("salvezza")
        if sv is not None:
            so = _ogg(sv) or {}
            if so.get("abilita") not in salvezze:
                _err(e, dove, f"{d}.salvezza.abilita: un tiro salvezza del set (un'abilità con salvezza)")
            if so.get("esito", "annulla") not in ("annulla", "dimezza"):
                _err(e, dove, f"{d}.salvezza.esito: annulla o dimezza")
            if "modificatore" in so and not _intero(so["modificatore"]):
                _err(e, dove, f"{d}.salvezza.modificatore: un intero")
        for k in ("dadi_vita_max", "oppure_uno_fino_a", "pagina"):
            if o.get(k) is not None and not (_intero(o[k]) and o[k] >= 0):
                _err(e, dove, f"{d}.{k}: un intero")
        for k in ("immuni", "solo_tipi", "parole"):
            if k in o and not (isinstance(o[k], list) and all(isinstance(w, str) and w.strip() for w in o[k])):
                _err(e, dove, f"{d}.{k}: un elenco di parole")
        effetti = controlla_effetti(o.get("effetti"), f"{d}.effetti", e, "REGOLE.poteri", condizioni)
        if not o.get("effetti") and o.get("descrittivo") is not True:
            _err(e, dove, f"{d}: effetti, oppure descrittivo: true (lo racconta il narratore)")
        if "ostile" in o and not isinstance(o["ostile"], bool):
            _err(e, dove, f"{d}.ostile: true o false")
        del effetti
        out[pid] = o
    return out


def risorse_del_set(r: dict, e: Esito, dove: str) -> set[str]:
    ids: set[str] = set()
    for i, x in enumerate(r.get("risorse") or [], start=1):
        o = _ogg(x) or {}
        rid = o.get("id")
        if not isinstance(rid, str) or not RE_ID.match(rid) or o.get("ricarica", "mai") not in RICARICHE:
            e.errore("REGOLE.risorse", dove, f"risorse[{i}]: {{id: snake_case, nome, ricarica: {' | '.join(RICARICHE)}}}")
            continue
        if rid in ids:
            e.errore("REGOLE.risorse", dove, f"risorse: id ripetuto «{rid}»")
        ids.add(rid)
    m = r.get("magia")
    if m is not None and (_ogg(m) or {}).get("preparazione") not in ("vanciana", "slot"):
        e.errore("REGOLE.risorse", dove, "magia.preparazione: vanciana o slot")
    return ids


def abilita_d_attacco(r: dict, e: Esito, dove: str) -> None:
    ids = {o.get("id") for o in r.get("abilita") or [] if isinstance(o, dict)}
    for o in r.get("abilita") or []:
        if not isinstance(o, dict):
            continue
        a = o.get("id")
        if "danno" in o and o["danno"] not in ("normale", "doppio"):
            e.errore("REGOLE.abilita", dove, f"abilita.{a}.danno: normale o doppio")
        if "una_volta_per_bersaglio" in o and not isinstance(o["una_volta_per_bersaglio"], bool):
            e.errore("REGOLE.abilita", dove, f"abilita.{a}.una_volta_per_bersaglio: true o false")
        if "ripiego" in o and o["ripiego"] not in ids:
            e.errore("REGOLE.abilita", dove, f"abilita.{a}.ripiego: «{o['ripiego']}» non è un'abilità del set")


def _slot_della_scheda(s: dict, r: dict) -> list[int] | None:
    if isinstance(s.get("slot"), list):
        return s["slot"]
    for c in r.get("classi") or []:
        if isinstance(c, dict) and c.get("id") == s.get("classe"):
            righe = [x for x in c.get("incantesimi_al_giorno") or [] if isinstance(x, dict)]
            if not righe:
                return None
            liv = s.get("livello", 1) if _intero(s.get("livello", 1)) else 1
            scelta = righe[0]
            for x in righe:
                if _intero(x.get("da")) and liv >= x["da"]:
                    scelta = x
            return scelta.get("slot") or []
    return None


def controlla_scheda(s: dict, dove: str, r: dict, poteri: dict[str, dict], risorse: set[str], e: Esito) -> None:
    """A set sheet's resources and powers: ids of the set, whole counts, prepared copies within the day's slots."""
    for k, cosa in (("risorse", "una risorsa"), ("oggetti", "un oggetto (potere di tipo oggetto)")):
        m = s.get(k)
        if m is None:
            continue
        if not isinstance(m, dict):
            e.errore("REGOLE.scheda", dove, f"scheda.{k}: una mappa id → quanti")
            continue
        for rid, n in m.items():
            ok = rid in risorse if k == "risorse" else (poteri.get(rid) or {}).get("tipo") == "oggetto"
            if not ok:
                e.errore("REGOLE.scheda", dove, f"scheda.{k}: «{rid}» non è {cosa} del set")
            elif not (_intero(n) and n >= 0):
                e.errore("REGOLE.scheda", dove, f"scheda.{k}.{rid}: un intero da 0 in su")
    inc = s.get("incantesimi")
    if inc is not None:
        if not isinstance(inc, list):
            e.errore("REGOLE.scheda", dove, "scheda.incantesimi: un elenco di id di incantesimi del set")
            inc = []
        for pid in inc:
            if (poteri.get(pid) or {}).get("tipo") != "incantesimo":
                e.errore("REGOLE.scheda", dove, f"scheda.incantesimi: «{pid}» non è un incantesimo del set")
        if (_ogg(r.get("magia")) or {}).get("preparazione") == "vanciana":
            slot = _slot_della_scheda(s, r)
            if slot is not None:
                per_livello: dict[int, int] = {}
                for pid in inc:
                    livelli = (_ogg((poteri.get(pid) or {}).get("livello")) or {})
                    n = livelli.get(s.get("classe")) if s.get("classe") in livelli else (min(livelli.values()) if livelli else None)
                    if _intero(n):
                        per_livello[n] = per_livello.get(n, 0) + 1
                for liv, quanti in sorted(per_livello.items()):
                    posti = slot[liv - 1] if 0 < liv <= len(slot) else 0
                    if quanti > posti:
                        e.errore("REGOLE.scheda", dove, f"scheda.incantesimi: {quanti} di {liv}° livello preparati, la classe ne dà {posti} al giorno")
    if "slot" in s and not (isinstance(s["slot"], list) and all(_intero(n) and n >= 0 for n in s["slot"])):
        e.errore("REGOLE.scheda", dove, "scheda.slot: incantesimi al giorno per livello, interi da 0 in su")
    if "dadi_vita" in s and not dadi_vita_validi(s["dadi_vita"]):
        e.errore("REGOLE.scheda", dove, "scheda.dadi_vita: un intero, o come li stampa il manuale («3+2*», «1-1», «½»)")
    for k in ("tipo", "immune"):
        v = s.get(k)
        if v is not None and not (isinstance(v, str) or (isinstance(v, list) and all(isinstance(x, str) for x in v))):
            e.errore("REGOLE.scheda", dove, f"scheda.{k}: una parola o un elenco di parole")
    for i, at in enumerate(s.get("attacchi") or [], start=1):
        c = (_ogg(at) or {}).get("consuma")
        if c is not None and c not in risorse:
            e.errore("REGOLE.scheda", dove, f"attacchi[{i}].consuma: «{c}» non è una risorsa del set")

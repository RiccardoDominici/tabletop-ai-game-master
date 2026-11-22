"""Combination classes (docs/regole.md §2, «Classi combinate»; Basic Fantasy p. 6): the validator's copy of
apps/server/src/regole/combinazioni.ts.

A class with `combinazione: [a, b]` takes the requirements of both bases, the better save (lower) and the better attack
bonus (higher) of the two at each level, the XP of both tables summed, the spells per day of the caster, the ability
values and power tables of the base that has them; it writes its own hit dice. The bases' powers (`poteri[].livello`),
starting book (`creazione.incantesimi`) and class-only attack abilities (`progressione.attacco[].classi`) extend to it.
The expansion runs on the raw data right after loading (valida/carica.py), so every check keyed by a class sees it.
"""

from __future__ import annotations

import copy


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _righe(v) -> list[dict]:
    return [r for r in v if isinstance(r, dict) and _intero(r.get("da"))] if isinstance(v, list) else []


def _riga(r: list[dict], livello: int) -> dict | None:
    out = r[0] if r else None
    for x in r:
        if livello >= x["da"]:
            out = x
    return out


def _unisci(a: list[dict], b: list[dict], chiave: str, scegli) -> list[dict]:
    if not a:
        return copy.deepcopy(b)
    if not b:
        return copy.deepcopy(a)
    primo = max(a[0]["da"], b[0]["da"])
    livelli = sorted({r["da"] for r in a + b if r["da"] >= primo})
    out = []
    for da in livelli:
        x = _riga(a, da).get(chiave)
        y = _riga(b, da).get(chiave)
        if _intero(x) and _intero(y):
            out.append({"da": da, chiave: scegli(x, y)})
            continue
        lx = x if isinstance(x, list) else []
        ly = y if isinstance(y, list) else []
        n = max(len(lx), len(ly))
        out.append({"da": da, chiave: [ly[i] if i >= len(lx) else lx[i] if i >= len(ly) else scegli(lx[i], ly[i]) for i in range(n)]})
    return out


def _requisiti(a, b) -> dict:
    out: dict = {}
    for r in (a if isinstance(a, dict) else {}, b if isinstance(b, dict) else {}):
        for k, v in r.items():
            nuovo = {"min": v} if _intero(v) else (v if isinstance(v, dict) else {})
            prima = out.get(k, {})
            mn = [x for x in (prima.get("min"), nuovo.get("min")) if _intero(x)]
            mx = [x for x in (prima.get("max"), nuovo.get("max")) if _intero(x)]
            out[k] = {**({"min": max(mn)} if mn else {}), **({"max": min(mx)} if mx else {})}
    return out


def espandi(d, errori: list[str] | None = None):
    """The set's raw data with its combination classes expanded (a copy). Errors go to `errori`."""
    if not isinstance(d, dict):
        return d
    errori = errori if errori is not None else []
    classi = d.get("classi") if isinstance(d.get("classi"), list) else []
    if not any(isinstance(c, dict) and isinstance(c.get("combinazione"), list) for c in classi):
        return d
    per = {c["id"]: c for c in classi if isinstance(c, dict) and isinstance(c.get("id"), str)}
    basi_di: dict[str, list[str]] = {}
    nuove = []
    for c in classi:
        if not (isinstance(c, dict) and isinstance(c.get("combinazione"), list)):
            nuove.append(c)
            continue
        cid = str(c.get("id"))
        basi = [x for x in c["combinazione"] if isinstance(x, str)]
        a, b = (per.get(basi[0]), per.get(basi[1])) if len(basi) == 2 else (None, None)
        if len(basi) != 2 or not a or not b or isinstance(a.get("combinazione"), list) or isinstance(b.get("combinazione"), list):
            errori.append(f"classi.{cid}.combinazione: due classi singole del set ({', '.join(basi) or '—'})")
            nuove.append(c)
            continue
        if "dadi_vita" not in c:
            errori.append(f"classi.{cid}.dadi_vita: una classe combinata scrive i suoi dadi vita (il manuale le dà un dado suo)")
        basi_di[cid] = basi
        x = copy.deepcopy(c)
        if "tiri_salvezza" not in x:
            x["tiri_salvezza"] = _unisci(_righe(a.get("tiri_salvezza")), _righe(b.get("tiri_salvezza")), "valori", min)
        if "attacco" not in x:
            x["attacco"] = _unisci(_righe(a.get("attacco")), _righe(b.get("attacco")), "bonus", max)
        if "incantesimi_al_giorno" not in x and (a.get("incantesimi_al_giorno") or b.get("incantesimi_al_giorno")):
            x["incantesimi_al_giorno"] = _unisci(_righe(a.get("incantesimi_al_giorno")), _righe(b.get("incantesimi_al_giorno")), "slot", max)
        if "px" not in x and isinstance(a.get("px"), list) and isinstance(b.get("px"), list):
            x["px"] = [p + q for p, q in zip(a["px"], b["px"])]
        if "abilita" not in x and (a.get("abilita") or b.get("abilita")):
            x["abilita"] = copy.deepcopy(a.get("abilita") or b.get("abilita"))
        if "tabelle" not in x and (a.get("tabelle") or b.get("tabelle")):
            x["tabelle"] = {**(b.get("tabelle") or {}), **(a.get("tabelle") or {})}
        x["requisiti"] = {**_requisiti(a.get("requisiti"), b.get("requisiti")), **(c.get("requisiti") or {})}
        tratti = list(a.get("tratti") or []) + list(b.get("tratti") or []) + list(c.get("tratti") or [])
        if tratti:
            x["tratti"] = tratti
        nuove.append(x)
    out = {**d, "classi": nuove}
    if isinstance(d.get("poteri"), list):
        poteri = []
        for p in d["poteri"]:
            liv = p.get("livello") if isinstance(p, dict) else None
            if not isinstance(liv, dict):
                poteri.append(p)
                continue
            l = dict(liv)
            for k, basi in basi_di.items():
                n = [liv[b] for b in basi if _intero(liv.get(b))]
                if k not in l and n:
                    l[k] = min(n)
            poteri.append({**p, "livello": l})
        out["poteri"] = poteri
    cr = d.get("creazione")
    if isinstance(cr, dict) and isinstance(cr.get("incantesimi"), list):
        voci = cr["incantesimi"]
        extra = []
        for k, basi in basi_di.items():
            if any(isinstance(v, dict) and v.get("classe") == k for v in voci):
                continue
            e = next((v for v in voci if isinstance(v, dict) and v.get("classe") in basi), None)
            if e:
                extra.append({**e, "classe": k})
        if extra:
            out["creazione"] = {**cr, "incantesimi": voci + extra}
    pr = d.get("progressione")
    if isinstance(pr, dict) and isinstance(pr.get("attacco"), list):
        att = []
        for v in pr["attacco"]:
            cl = v.get("classi") if isinstance(v, dict) else None
            if not isinstance(cl, list):
                att.append(v)
                continue
            piu = [k for k, basi in basi_di.items() if k not in cl and any(b in cl for b in basi)]
            att.append({**v, "classi": cl + piu} if piu else v)
        out["progressione"] = {**pr, "attacco": att}
    return out

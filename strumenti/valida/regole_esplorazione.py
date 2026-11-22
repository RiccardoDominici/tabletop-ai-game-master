"""Exploration in a rule set (docs/regole.md §2, «Esplorazione»; rules-engine package R6): the [V] checks.

Mirrors apps/server/src/regole/esplorazione.ts:
- `esplorazione.ambienti`: an id, the wandering monster check {ogni: a duration of the set's clock, dado, fino_a}, the
  encounter tables by level {da, tabella}, the surprise in advance {dado, fino_a, imboscata};
- `incontri` (inline in regole.yaml, and regole/incontri.yaml next to it): tables with their dice and one entry for
  every roll, each either a bestiary creature (`mostro`, `numero`), a group without a stat block (`gruppo`) or a
  nested roll (`scelta`);
- a scene's `esplorazione: {ambiente, livello | tabella}`: an environment and a table of the set;
- `esplorazione.provviste` (daily food and water: catalog items and how many days each feeds, going without) and
  `esplorazione.riposo` (an exploration rest rule: durations of the clock, a condition of the fight);
- the journey's exploration in `viaggio`: its environment, each terrain's table, the leader's check against getting lost.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from .esito import Esito

RE_ID = re.compile(r"^[a-z0-9_]+$")
RE_DADI = re.compile(r"^(\d*)d(\d+)([+-]\d+)?$")


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _err(e: Esito, dove: str, msg: str) -> None:
    e.errore("REGOLE.esplorazione", dove, msg)


def _formula(v) -> tuple[int, int, int] | None:
    """(number of dice, faces, bonus) of «2d4», «1d4+1» or a plain number; None if it is neither."""
    if _intero(v) and v >= 0:
        return (0, 0, v)
    if not isinstance(v, str):
        return None
    t = v.replace(" ", "").lower()
    if t.isdigit():
        return (0, 0, int(t))
    m = RE_DADI.match(t)
    if not m:
        return None
    n = int(m.group(1) or 1)
    f = int(m.group(2))
    if not 1 <= n <= 40 or f not in (2, 3, 4, 6, 8, 10, 12, 20, 100):
        return None
    return (n, f, int(m.group(3) or 0))


def _tiri(v) -> list[int] | None:
    l = v if isinstance(v, list) else [v]
    return l if l and all(_intero(x) for x in l) else None


def _possibilita(o, d: str, e: Esito, dove: str) -> bool:
    if not (isinstance(o, dict) and _intero(o.get("dado")) and o["dado"] >= 2 and _intero(o.get("fino_a")) and 1 <= o["fino_a"] <= o["dado"]):
        _err(e, dove, f"{d}: {{dado: le facce del dado, fino_a: la faccia più alta che conta}}")
        return False
    return True


def voci_incontri(cartella_regole: Path, r: dict, e: Esito) -> list[tuple[str, object]]:
    """The tables, inline then from regole/incontri.yaml, each with where it was written."""
    out: list[tuple[str, object]] = []
    for x in r.get("incontri") or []:
        out.append(("regole/regole.yaml incontri", x))
    f = cartella_regole / "incontri.yaml"
    if f.exists():
        try:
            d = yaml.safe_load(f.read_text(encoding="utf-8"))
        except yaml.YAMLError as err:
            _err(e, "regole/incontri.yaml", f"YAML non valido: {err}")
            return out
        voci = d.get("incontri") if isinstance(d, dict) else d
        if not isinstance(voci, list):
            _err(e, "regole/incontri.yaml", "incontri: una lista di tabelle {id, nome, dadi, voci}")
            return out
        out.extend(("regole/incontri.yaml", x) for x in voci)
    return out


def _creatura(o: dict, d: str, mostri: set[str], e: Esito, dove: str) -> None:
    m = o.get("mostro")
    if not (isinstance(m, str) and RE_ID.match(m)):
        _err(e, dove, f"{d}.mostro: l'id di una voce del bestiario")
    elif mostri and m not in mostri:
        _err(e, dove, f"{d}: «{m}» non è una voce del bestiario del set")
    if "numero" in o and _formula(o["numero"]) is None:
        _err(e, dove, f"{d}.numero: quanti, un numero o una formula come \"2d4\"")


def tabelle_del_set(cartella_regole: Path, r: dict, mostri: set[str], e: Esito) -> set[str]:
    """The encounter tables, checked. Returns their ids."""
    ids: set[str] = set()
    for dove, x in voci_incontri(cartella_regole, r, e):
        if not isinstance(x, dict) or not (isinstance(x.get("id"), str) and RE_ID.match(x["id"])):
            _err(e, dove, f"ogni tabella degli incontri ha un id in snake_case: {x!r:.60}")
            continue
        tid = x["id"]
        if tid in ids:
            _err(e, dove, f"id di tabella ripetuto «{tid}»")
        ids.add(tid)
        f = _formula(x.get("dadi"))
        if f is None or f[0] < 1:
            _err(e, dove, f"{tid}.dadi: i dadi della tabella, come \"1d12\" o \"2d8\"")
        visti: set[int] = set()
        voci = x.get("voci")
        if not isinstance(voci, list) or not voci:
            _err(e, dove, f"{tid}.voci: almeno una voce")
            continue
        for i, v in enumerate(voci, 1):
            d = f"{tid}.voci[{i}]"
            t = _tiri(v.get("tiro")) if isinstance(v, dict) else None
            if t is None:
                _err(e, dove, f"{d}: {{tiro: un valore o una lista, mostro | gruppo | scelta}}")
                continue
            for n in t:
                if n in visti:
                    _err(e, dove, f"{d}.tiro: {n} sceglie due voci")
                visti.add(n)
            tipi = [k for k in ("mostro", "gruppo", "scelta") if k in v]
            if len(tipi) != 1:
                _err(e, dove, f"{d}: una sola tra mostro, gruppo, scelta")
                continue
            if "mostro" in v:
                _creatura(v, d, mostri, e, dove)
            elif "gruppo" in v:
                if not (isinstance(v["gruppo"], str) and v["gruppo"].strip()):
                    _err(e, dove, f"{d}.gruppo: il nome del gruppo (senza blocco di statistiche: lo prepara il master)")
                if "numero" in v and _formula(v["numero"]) is None:
                    _err(e, dove, f"{d}.numero: un numero o una formula")
            else:
                s = v["scelta"]
                sf = _formula(s.get("dadi")) if isinstance(s, dict) else None
                sv = s.get("voci") if isinstance(s, dict) else None
                if sf is None or sf[0] < 1 or not isinstance(sv, list) or not sv:
                    _err(e, dove, f"{d}.scelta: {{dadi, voci: [{{tiro, mostro, numero}}]}}")
                    continue
                for j, z in enumerate(sv, 1):
                    if not isinstance(z, dict) or _tiri(z.get("tiro")) is None:
                        _err(e, dove, f"{d}.scelta.voci[{j}].tiro: un valore o una lista")
                        continue
                    _creatura(z, f"{d}.scelta.voci[{j}]", mostri, e, dove)
        if f is not None and f[0] >= 1:
            lo, hi = f[0] + f[2], f[0] * f[1] + f[2]
            mancano = [n for n in range(lo, hi + 1) if n not in visti]
            if mancano:
                _err(e, dove, f"{tid}: nessuna voce per i tiri {', '.join(map(str, mancano))} di {f[0]}d{f[1]}")
    return ids


def ambienti_del_set(r: dict, unita: set[str] | None, tabelle: set[str], e: Esito, dove: str) -> dict[str, dict]:
    """`esplorazione.ambienti`, checked against the clock's units and the tables. Returns id → environment."""
    es = r.get("esplorazione")
    if es is None:
        return {}
    if not isinstance(es, dict) or not isinstance(es.get("ambienti"), list) or not es["ambienti"]:
        _err(e, dove, "esplorazione: {ambienti: [{id, nome, controllo, tabelle}]}")
        return {}
    if unita is None:
        _err(e, dove, "esplorazione: i controlli corrono sull'orologio di gioco, il set vuole il suo tempo")
    out: dict[str, dict] = {}
    for i, a in enumerate(es["ambienti"], 1):
        d = f"esplorazione.ambienti[{i}]"
        if not isinstance(a, dict) or not (isinstance(a.get("id"), str) and RE_ID.match(a["id"])):
            _err(e, dove, f"{d}: un id in snake_case")
            continue
        if a["id"] in out:
            _err(e, dove, f"esplorazione.ambienti: id ripetuto «{a['id']}»")
        out[a["id"]] = a
        c = a.get("controllo")
        if c is not None and _possibilita(c, f"{d}.controllo", e, dove):
            ogni = c.get("ogni")
            if not (isinstance(ogni, dict) and ogni and all((unita is None or k in unita) and isinstance(n, (int, float)) and not isinstance(n, bool) and n > 0 for k, n in ogni.items())):
                _err(e, dove, f"{d}.controllo.ogni: una durata {{unità di tempo.unita: quante}}, es. {{turno: 3}}")
        prec = None
        for k, t in enumerate(a.get("tabelle") or [], 1):
            if not (isinstance(t, dict) and _intero(t.get("da")) and t["da"] >= 0 and isinstance(t.get("tabella"), str)):
                _err(e, dove, f"{d}.tabelle[{k}]: {{da: un livello, tabella: l'id di una tabella degli incontri}}")
                continue
            if t["tabella"] not in tabelle:
                _err(e, dove, f"{d}.tabelle[{k}]: «{t['tabella']}» non è una tabella degli incontri (incontri)")
            if prec is not None and t["da"] <= prec:
                _err(e, dove, f"{d}.tabelle[{k}]: «da» cresce riga dopo riga")
            prec = t["da"]
        s = a.get("sorpresa_prima")
        if s is not None and _possibilita(s, f"{d}.sorpresa_prima", e, dove):
            imb = s.get("imboscata")
            if imb is not None and not (_intero(imb) and 1 <= imb <= s["dado"]):
                _err(e, dove, f"{d}.sorpresa_prima.imboscata: la fascia su cui sorprende un agguato")
        if "provviste" in a and not isinstance(a["provviste"], bool):
            _err(e, dove, f"{d}.provviste: true o false (in città: false)")
    return out


def _durata(v, unita: set[str] | None) -> bool:
    return isinstance(v, dict) and bool(v) and all((unita is None or k in unita) and isinstance(n, (int, float)) and not isinstance(n, bool) and n > 0 for k, n in v.items())


def provviste_e_riposo(r: dict, unita: set[str] | None, e: Esito, dove: str) -> None:
    """`esplorazione.provviste` against the catalog's items, `esplorazione.riposo` against the clock and the conditions."""
    es = r.get("esplorazione")
    if not isinstance(es, dict):
        return
    cat = r.get("catalogo") or {}
    oggetti = {o.get("id") for sez in ("armi", "armature", "scudi", "munizioni", "attrezzatura") for o in (cat.get(sez) or []) if isinstance(o, dict)}
    for i, p in enumerate(es.get("provviste") or [], 1):
        d = f"esplorazione.provviste[{i}]"
        ogg = p.get("oggetti") if isinstance(p, dict) else None
        senza = p.get("senza") if isinstance(p, dict) else None
        if not (isinstance(p, dict) and isinstance(p.get("id"), str) and RE_ID.match(p["id"]) and isinstance(ogg, list) and ogg and isinstance(senza, dict)
                and _intero(senza.get("dopo")) and senza["dopo"] >= 0 and ("danno" not in senza or _formula(senza["danno"]) is not None)
                and ("guarigione" not in senza or isinstance(senza["guarigione"], bool))):
            _err(e, dove, f"{d}: {{id, nome, oggetti: [{{id: un oggetto del catalogo, giorni}}], senza: {{dopo: giorni, danno, guarigione}}}}")
            continue
        for x in ogg:
            if not (isinstance(x, dict) and isinstance(x.get("id"), str) and _intero(x.get("giorni")) and x["giorni"] >= 1):
                _err(e, dove, f"{d}.oggetti: {{id, giorni: da 1}}")
            elif x["id"] not in oggetti:
                _err(e, dove, f"{d}.oggetti: «{x['id']}» non è un oggetto del catalogo")
    rp = es.get("riposo")
    if rp is not None:
        cond = {c.get("id") for c in ((r.get("combattimento") or {}).get("condizioni") or []) if isinstance(c, dict)}
        if not (isinstance(rp, dict) and _durata(rp.get("ogni"), unita) and _durata(rp.get("durata"), unita) and isinstance(rp.get("condizione"), str)):
            _err(e, dove, "esplorazione.riposo: {ogni, durata: durate dell'orologio, parole: [parole di un riposo], condizione}")
        elif rp["condizione"] not in cond:
            _err(e, dove, f"esplorazione.riposo.condizione: «{rp['condizione']}» non è una condizione di combattimento.condizioni")


def viaggio(r: dict, ambienti: dict[str, dict], tabelle: set[str], e: Esito, dove: str) -> None:
    """The journey's exploration: `viaggio.ambiente`, each terrain's `incontri` and `smarrirsi`, `viaggio.smarrirsi`."""
    v = r.get("viaggio")
    if not isinstance(v, dict):
        return
    if "ambiente" in v and v["ambiente"] not in ambienti:
        _err(e, dove, f"viaggio.ambiente: «{v['ambiente']}» non è un ambiente di esplorazione.ambienti")
    abi = {a.get("id") for a in r.get("abilita") or [] if isinstance(a, dict)}
    sm = v.get("smarrirsi")
    if sm is not None and not (isinstance(sm, dict) and sm.get("abilita") in abi):
        _err(e, dove, "viaggio.smarrirsi: {abilita: la prova che tira chi guida (un salvezza del set)}")
    for i, t in enumerate(v.get("terreni") or [], 1):
        if not isinstance(t, dict):
            continue
        if "incontri" in t and t["incontri"] not in tabelle:
            _err(e, dove, f"viaggio.terreni[{i}].incontri: «{t['incontri']}» non è una tabella degli incontri")
        if "smarrirsi" in t and not isinstance(t["smarrirsi"], bool):
            _err(e, dove, f"viaggio.terreni[{i}].smarrirsi: true (senza strade) o false")


def scene(c, ambienti: dict[str, dict], tabelle: set[str], e: Esito) -> None:
    """A scene's `esplorazione`: an environment of the set, and its `tabella` (or the environment's by level)."""
    for nome, sc in c.scene:
        v = sc.get("esplorazione") if isinstance(sc, dict) else None
        if v is None:
            continue
        if not isinstance(v, dict) or v.get("ambiente") not in ambienti:
            _err(e, nome, f"esplorazione.ambiente: «{(v or {}).get('ambiente') if isinstance(v, dict) else v}» non è un ambiente del set (esplorazione.ambienti)")
            continue
        if "livello" in v and not (_intero(v["livello"]) and v["livello"] >= 0):
            _err(e, nome, "esplorazione.livello: il livello del sotterraneo, un intero")
        if "tabella" in v and v["tabella"] not in tabelle:
            _err(e, nome, f"esplorazione.tabella: «{v['tabella']}» non è una tabella degli incontri del set")
        a = ambienti[v["ambiente"]]
        if a.get("controllo") and "tabella" not in v and not a.get("tabelle"):
            e.avviso("REGOLE.esplorazione", nome, f"esplorazione: l'ambiente «{v['ambiente']}» non ha tabelle per livello e la scena non ne dice una: un incontro lo decide il master")


def controlla(c, r: dict, cartella_regole: Path, mostri: set[str], unita: set[str] | None, e: Esito, dove: str) -> None:
    """Every exploration check of a non-SRD set: the tables, the environments, the scenes that explore."""
    tabelle = tabelle_del_set(cartella_regole, r, mostri, e)
    ambienti = ambienti_del_set(r, unita, tabelle, e, dove)
    provviste_e_riposo(r, unita, e, dove)
    viaggio(r, ambienti, tabelle, e, dove)
    scene(c, ambienti, tabelle, e)

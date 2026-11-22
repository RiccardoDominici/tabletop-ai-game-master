"""Character creation in a rule set (mechanism M7; docs/regole.md §2 «Creazione»): the validator's mirror of the Engine's
apps/server/src/regole/creazione.ts (the set's procedure) and regole/controllo-pg.ts (a finished sheet against it).

- `creazione_del_set`: the set's `lingue`, `creazione` and the creation keys of `classi` and `razze` (requirements,
  allow-lists, languages, adjustments), as the Engine's loader reads them.
- `problemi_della_scheda`: the same problem codes as controllaPersonaggio, for the same sheets: the shared case file
  apps/server/test/fixtures/creazione/casi.yaml is read by both test suites (strumenti/test_valida_creazione.py).
- `controlla_scheda`: what the validator says about a PC's sheet (a pregenerated one in pg.yaml, or one built at the
  table in pg-creati/): the problems no other check of the validator reports already.
"""
from __future__ import annotations

import math
import re

from .esito import Esito
from .regole_catalogo import RE_ID, SEZIONI, _viola
from .regole_progressione import bonus_caratteristica, classe_di, formula, limiti_pf, soglia_px

PASSI = ("caratteristiche", "razza", "classe", "punti_ferita", "monete", "acquisti", "incantesimi", "lingue", "descrizione")
# Codes another check of the validator already reports on a sheet (regole_classi, regole_catalogo, regole_progressione):
# the shared cases count them, the validator does not say them twice.
GIA_DETTI = {"razza_sconosciuta", "classe_sconosciuta", "equipaggiamento_vietato", "monete_negative", "pf_fuori"}


def _ogg(v) -> dict | None:
    return v if isinstance(v, dict) else None


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _err(e: Esito, dove: str, msg: str) -> None:
    e.errore("REGOLE.creazione", dove, msg)


def _requisiti(v, d: str, car: set[str], e: Esito, dove: str) -> dict[str, tuple[int | None, int | None]]:
    """`requisiti:` of a class or race: characteristic → (min, max); a bare number is the minimum."""
    if v is None:
        return {}
    if not isinstance(v, dict):
        _err(e, dove, f"{d}: una mappa caratteristica → {{min, max}} (o un numero, il minimo)")
        return {}
    out: dict[str, tuple[int | None, int | None]] = {}
    for k, x in v.items():
        if k not in car:
            _err(e, dove, f"{d}.{k}: non è una caratteristica del set")
        if _intero(x):
            out[k] = (x, None)
            continue
        b = _ogg(x)
        mn, mx = (b or {}).get("min"), (b or {}).get("max")
        if not b or (mn is not None and not _intero(mn)) or (mx is not None and not _intero(mx)) or (mn is None and mx is None):
            _err(e, dove, f"{d}.{k}: {{min: n}} e/o {{max: n}}, interi")
            continue
        if _intero(mn) and _intero(mx) and mn > mx:
            _err(e, dove, f"{d}.{k}: min {mn} sopra max {mx}")
        out[k] = (mn, mx)
    return out


def requisiti_di(v) -> dict[str, tuple[int | None, int | None]]:
    """The bounds without checks (for sheets): characteristic → (min, max)."""
    out: dict[str, tuple[int | None, int | None]] = {}
    for k, x in (_ogg(v) or {}).items():
        if _intero(x):
            out[k] = (x, None)
        elif isinstance(x, dict):
            out[k] = (x.get("min") if _intero(x.get("min")) else None, x.get("max") if _intero(x.get("max")) else None)
    return out


def _mancati(req: dict[str, tuple[int | None, int | None]], punteggi: dict) -> list[tuple[str, int]]:
    out = []
    for k, (mn, mx) in req.items():
        v = punteggi.get(k)
        if _intero(v) and ((mn is not None and v < mn) or (mx is not None and v > mx)):
            out.append((k, v))
    return out


def intervallo_metodo(m: dict) -> tuple[int, int] | None:
    """The lowest and highest score a method gives (regole/creazione.ts intervalloDelMetodo)."""
    if m.get("dadi") is not None:
        f = formula(m["dadi"])
        if not f or f[0] < 1:
            return None
        n = m["tieni"] if _intero(m.get("tieni")) else f[0]
        return n + f[2], n * f[1] + f[2]
    if isinstance(m.get("valori"), list) and m["valori"] and all(_intero(x) for x in m["valori"]):
        return min(m["valori"]), max(m["valori"])
    costi = [c for c in m.get("costi") or [] if isinstance(c, dict) and _intero(c.get("valore"))]
    if costi:
        return costi[0]["valore"], costi[-1]["valore"]
    return None


def creazione_del_set(r: dict, car: set[str], classi: set[str], razze: set[str], e: Esito, dove: str) -> None:
    """The set's languages, the classes' and races' creation keys, and `creazione` (as regole/caricatore.ts)."""
    lingue: set[str] = set()
    lv = r.get("lingue")
    if lv is not None:
        if not isinstance(lv, list):
            _err(e, dove, "lingue: un elenco di {id, nome}")
        else:
            for i, x in enumerate(lv, start=1):
                lid = (_ogg(x) or {}).get("id")
                if not (isinstance(lid, str) and RE_ID.match(lid)):
                    _err(e, dove, f"lingue[{i}]: un id in snake_case")
                elif lid in lingue:
                    _err(e, dove, f"lingue: id ripetuto «{lid}»")
                else:
                    lingue.add(lid)
    for c in r.get("classi") or []:
        if isinstance(c, dict):
            _requisiti(c.get("requisiti"), f"classi.{c.get('id')}.requisiti", car, e, dove)
    for x in r.get("razze") or []:
        if not isinstance(x, dict):
            continue
        rid = x.get("id")
        _requisiti(x.get("requisiti"), f"razze.{rid}.requisiti", car, e, dove)
        for k in x.get("classi") or []:
            if k not in classi:
                _err(e, dove, f"razze.{rid}.classi: «{k}» non è una classe del set")
        for k in x.get("lingue") or []:
            if k not in lingue:
                _err(e, dove, f"razze.{rid}.lingue: «{k}» non è una lingua del set (lingue)")
        for k, n in (_ogg(x.get("aggiustamenti")) or {}).items():
            if k not in car or not _intero(n):
                _err(e, dove, f"razze.{rid}.aggiustamenti.{k}: una caratteristica del set → un intero")

    cr = r.get("creazione")
    if cr is None:
        return
    o = _ogg(cr)
    if o is None:
        _err(e, dove, "creazione: una mappa (docs/regole.md §2, «Creazione»)")
        return
    if not (_intero(o.get("livello", 1)) and o.get("livello", 1) >= 1):
        _err(e, dove, "creazione.livello: il livello di partenza, un intero da 1")
    passi = o.get("passi", list(PASSI))
    if not isinstance(passi, list) or not passi:
        _err(e, dove, f"creazione.passi: un elenco di passi tra {', '.join(PASSI)}")
        passi = []
    for p in passi:
        if p not in PASSI:
            _err(e, dove, f"creazione.passi: «{p}» non è un passo ({', '.join(PASSI)})")
    if len(set(passi)) != len(passi):
        _err(e, dove, "creazione.passi: un passo ripetuto")
    for a, b in (("caratteristiche", "razza"), ("caratteristiche", "classe"), ("classe", "punti_ferita"), ("classe", "incantesimi"), ("monete", "acquisti")):
        if a in passi and b in passi and passi.index(a) > passi.index(b):
            _err(e, dove, f"creazione.passi: {a} viene prima di {b}")
    c = _ogg(o.get("caratteristiche")) or {}
    metodi = c.get("metodi") or []
    if "caratteristiche" in passi and not metodi:
        _err(e, dove, "creazione.caratteristiche.metodi: almeno un modo di generare i punteggi")
    visti: set[str] = set()
    for i, m in enumerate(metodi, start=1):
        mo = _ogg(m) or {}
        mid = mo.get("id")
        if not (isinstance(mid, str) and RE_ID.match(mid)):
            _err(e, dove, f"creazione.caratteristiche.metodi[{i}]: un id in snake_case")
            continue
        if mid in visti:
            _err(e, dove, f"creazione.caratteristiche.metodi: id ripetuto «{mid}»")
        visti.add(mid)
        if intervallo_metodo(mo) is None:
            _err(e, dove, f"creazione.caratteristiche.metodi.{mid}: dadi (tirati), valori (una schiera) o punti con costi")
        if mo.get("tieni") is not None and not (_intero(mo["tieni"]) and 1 <= mo["tieni"] <= ((formula(mo.get("dadi")) or (0,))[0])):
            _err(e, dove, f"creazione.caratteristiche.metodi.{mid}.tieni: quanti dadi contano")
        if mo.get("ordine", "fisso") not in ("fisso", "libero"):
            _err(e, dove, f"creazione.caratteristiche.metodi.{mid}.ordine: fisso o libero")
        if isinstance(mo.get("valori"), list) and len(mo["valori"]) != len(car):
            _err(e, dove, f"creazione.caratteristiche.metodi.{mid}.valori: {len(mo['valori'])} valori per {len(car)} caratteristiche")
    for i, op in enumerate(c.get("opzioni") or [], start=1):
        oo = _ogg(op) or {}
        if not (isinstance(oo.get("id"), str) and RE_ID.match(oo["id"])) or oo.get("tipo") not in ("punti", "scambio", "riordino"):
            _err(e, dove, f"creazione.caratteristiche.opzioni[{i}]: {{id, tipo: punti | scambio | riordino}}")
    if c.get("massimo") is not None and not _intero(c["massimo"]):
        _err(e, dove, "creazione.caratteristiche.massimo: un intero")
    ss = c.get("senza_speranza")
    if ss is not None and not (isinstance(ss, dict) and ss.get("rimedi") and all(x in ("ritira", "ribalta") for x in ss["rimedi"])):
        _err(e, dove, "creazione.caratteristiche.senza_speranza: {rimedi: [ritira, ribalta], ribalta: 21}")
    if o.get("punti_ferita", "tira") not in ("tira", "massimo"):
        _err(e, dove, "creazione.punti_ferita: tira o massimo")
    tagli = {t.get("id") for t in (_ogg(r.get("monete")) or {}).get("tagli") or [] if isinstance(t, dict)}
    if o.get("monete") is not None:
        m = _ogg(o["monete"]) or {}
        if not (formula(m.get("dadi")) and _intero(m.get("per", 1)) and m.get("per", 1) >= 1 and isinstance(m.get("moneta"), str)):
            _err(e, dove, "creazione.monete: {dadi: \"3d6\", per: 10, moneta: <una moneta del set>}")
        elif m["moneta"] not in tagli:
            _err(e, dove, f"creazione.monete.moneta: «{m['moneta']}» non è una moneta del set (monete.tagli)")
    elif "monete" in passi:
        _err(e, dove, "creazione.passi: monete vuole creazione.monete")
    poteri = {p.get("id"): p for p in r.get("poteri") or [] if isinstance(p, dict)}
    for i, x in enumerate(o.get("incantesimi") or [], start=1):
        io = _ogg(x) or {}
        cl = io.get("classe")
        if cl not in classi:
            _err(e, dove, f"creazione.incantesimi[{i}].classe: una classe del set")
            continue
        for f in io.get("fissi") or []:
            if cl not in (_ogg((poteri.get(f) or {}).get("livello")) or {}) or (poteri.get(f) or {}).get("tipo") != "incantesimo":
                _err(e, dove, f"creazione.incantesimi[{i}].fissi: «{f}» non è un incantesimo del set per {cl}")
        if io.get("come", "scelta") not in ("scelta", "master", "tiro"):
            _err(e, dove, f"creazione.incantesimi[{i}].come: scelta, master o tiro")
    lo = o.get("lingue")
    if lo is not None and (_ogg(lo) or {}).get("caratteristica") not in car:
        _err(e, dove, "creazione.lingue.caratteristica: una caratteristica del set (il suo bonus dà le lingue in più)")
    for p, serve in (("acquisti", r.get("catalogo")), ("razza", r.get("razze")), ("classe", r.get("classi")), ("lingue", lingue)):
        if p in passi and not serve:
            _err(e, dove, f"creazione.passi: {p} vuole {'il catalogo' if p == 'acquisti' else p} del set")


def _valore_costo(v, tagli: dict[str, int], base: str | None) -> int | None:
    """A catalog price in the smallest coin (regole/catalogo.ts leggiCosto), or None."""
    if v is None or v == "n/a":
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        return round(v * tagli.get(base or "", 0)) if base in tagli else None
    if isinstance(v, str):
        parti = re.findall(r"(\d+(?:[.,]\d+)?)\s*([a-z_]+)", v)
        if parti and all(t in tagli for _, t in parti):
            return sum(round(float(n.replace(",", ".")) * tagli[t]) for n, t in parti)
    return None


def _voci(r: dict) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for sez, tipo in SEZIONI.items():
        for v in (_ogg(r.get("catalogo")) or {}).get(sez) or []:
            if isinstance(v, dict) and isinstance(v.get("id"), str):
                out[v["id"]] = {**v, "_tipo": tipo}
    return out


def _tagli(r: dict) -> dict[str, int]:
    return {t["id"]: t["vale"] for t in (_ogg(r.get("monete")) or {}).get("tagli") or [] if isinstance(t, dict) and _intero(t.get("vale"))}


def tetto_monete(r: dict) -> int | None:
    """The best starting money in the smallest coin (regole/controllo-pg.ts tettoMonete)."""
    m = _ogg((_ogg(r.get("creazione")) or {}).get("monete"))
    f = formula((m or {}).get("dadi"))
    vale = _tagli(r).get((m or {}).get("moneta"))
    if not m or not f or vale is None:
        return None
    return (f[0] * f[1] + f[2]) * (m.get("per", 1) if _intero(m.get("per", 1)) else 1) * vale


def _gear(s: dict) -> list[tuple[str, int]]:
    out = []
    for x in s.get("equipaggiamento") or []:
        o = {"id": x} if isinstance(x, str) else (_ogg(x) or {})
        if isinstance(o.get("id"), str):
            out.append((o["id"], o["quante"] if _intero(o.get("quante")) else 1))
    return out


def costo_dotazione(r: dict, s: dict) -> int:
    """The sheet's catalog gear in the smallest coin (regole/controllo-pg.ts costoDotazione)."""
    voci, tagli = _voci(r), _tagli(r)
    base = (_ogg(r.get("monete")) or {}).get("base")
    n = 0
    for vid, q in _gear(s):
        v = voci.get(vid)
        c = _valore_costo((v or {}).get("costo"), tagli, base)
        if v is not None and c is not None:
            conf = v["confezione"] if _intero(v.get("confezione")) and v["confezione"] > 0 else 1
            n += math.ceil(c * q / conf)
    return n


def problemi_della_scheda(r: dict, s: dict, creato: bool, livello_iniziale: int | None = None,
                          punti_ferita: str | None = None) -> list[tuple[str, bool, str]]:
    """(code, grave, message) for a sheet, as regole/controllo-pg.ts controllaPersonaggio gives them."""
    out: list[tuple[str, bool, str]] = []
    cr = _ogg(r.get("creazione")) or {}
    passi = cr.get("passi", list(PASSI)) if r.get("creazione") is not None else []
    punteggi = _ogg(s.get("caratteristiche")) or {}
    razze = {x.get("id"): x for x in r.get("razze") or [] if isinstance(x, dict)}
    razza = razze.get(s.get("razza")) if s.get("razza") is not None else None
    if s.get("razza") is not None and razza is None:
        out.append(("razza_sconosciuta", True, f"razza «{s.get('razza')}» non è del set"))
    if s.get("razza") is None and razze and (creato or "razza" in passi):
        out.append(("razza_mancante", creato, "la scheda non dice la razza"))
    classe = classe_di(r, s.get("classe")) if s.get("classe") is not None else None
    if s.get("classe") is not None and classe is None:
        out.append(("classe_sconosciuta", True, f"classe «{s.get('classe')}» non è del set"))
    if s.get("classe") is None and r.get("classi") and (creato or "classe" in passi):
        out.append(("classe_mancante", creato, "la scheda non dice la classe"))
    if razza and classe and razza.get("classi") is not None and classe.get("id") not in razza["classi"]:
        out.append(("classe_non_ammessa", True, f"un {razza.get('nome', razza['id'])} non può essere {classe.get('nome', classe['id'])} (razze.{razza['id']}.classi)"))
    for k, v in _mancati(requisiti_di((razza or {}).get("requisiti")), punteggi) if razza else []:
        out.append(("requisito_razza", True, f"{k} {v}: fuori dai requisiti della razza {razza['id']}"))
    for k, v in _mancati(requisiti_di((classe or {}).get("requisiti")), punteggi) if classe else []:
        out.append(("requisito_classe", True, f"{k} {v}: sotto il requisito della classe {classe['id']}"))

    metodi = [m for m in (_ogg(cr.get("caratteristiche")) or {}).get("metodi") or [] if isinstance(m, dict)]
    ranges = [x for x in (intervallo_metodo(m) for m in metodi) if x]
    if ranges and (_ogg(r.get("modificatore")) or {}).get("tipo") == "tabella":
        mn = min(a for a, _ in ranges)
        mx = max([b for _, b in ranges] + ([cr["caratteristiche"]["massimo"]] if _intero((_ogg(cr.get("caratteristiche")) or {}).get("massimo")) else []))
        agg = _ogg((razza or {}).get("aggiustamenti")) or {}
        for c in r.get("caratteristiche") or []:
            cid = (_ogg(c) or {}).get("id")
            v = punteggi.get(cid)
            a = agg.get(cid, 0) if _intero(agg.get(cid, 0)) else 0
            if _intero(v) and (v < mn + a or v > mx + a):
                out.append(("caratteristica_fuori", True, f"{cid} {v}: i metodi del set danno da {mn + a} a {mx + a}"))

    livello = s.get("livello", 1) if _intero(s.get("livello", 1)) else 1
    inizio = livello_iniziale or (cr.get("livello", 1) if _intero(cr.get("livello", 1)) else 1)
    if creato and livello != inizio:
        out.append(("livello_iniziale", True, f"livello {livello}: si comincia al {inizio}"))
    if classe:
        soglia = soglia_px(classe, livello)
        px = s.get("px", 0) if _intero(s.get("px", 0)) else 0
        if creato and soglia is not None and px != soglia:
            out.append(("px_livello", True, f"px {px}: al livello {livello} si comincia con {soglia}"))
        lim = limiti_pf(r, s)
        pf = s.get("pf", s.get("pf_massimi"))
        if lim and _intero(pf) and not lim[0] <= pf <= lim[1]:
            out.append(("pf_fuori", True, f"pf {pf}: i dadi vita danno da {lim[0]} a {lim[1]}"))
        elif lim and _intero(pf) and creato and livello == 1 and (punti_ferita or cr.get("punti_ferita", "tira")) == "massimo" and pf != lim[1]:
            out.append(("pf_non_massimi", True, f"pf {pf}: al primo livello il dado al massimo dà {lim[1]}"))

    voci = _voci(r)
    restrizioni = [x for x in (_ogg(r.get("catalogo")) or {}).get("restrizioni") or [] if isinstance(x, dict)]
    for vid, _ in _gear(s):
        v = voci.get(vid)
        if v is None:
            continue
        for rr in restrizioni:
            if (rr.get("classe") is not None and rr["classe"] != s.get("classe")) or (rr.get("razza") is not None and rr["razza"] != s.get("razza")):
                continue
            if _viola(rr, v) and (_ogg(rr.get("penalita")) or {}).get("vietato") is True:
                out.append(("equipaggiamento_vietato", True, f"{vid}: vietato (catalogo.restrizioni)"))
                break
    for k, n in (_ogg(s.get("monete")) or {}).items():
        if _intero(n) and n < 0:
            out.append(("monete_negative", True, f"monete.{k}: {n}"))
    tetto = tetto_monete(r)
    if tetto is not None and s.get("equipaggiamento") is not None and livello == inizio:
        tagli = _tagli(r)
        speso = costo_dotazione(r, s) + sum(n * tagli.get(k, 0) for k, n in (_ogg(s.get("monete")) or {}).items() if _intero(n))
        if speso > tetto:
            out.append(("spesa_oltre", creato, f"equipaggiamento e monete valgono {speso}, il miglior tiro iniziale dà {tetto} (nella moneta più piccola)"))

    poteri = {p.get("id"): p for p in r.get("poteri") or [] if isinstance(p, dict)}
    libro = s.get("libro") if isinstance(s.get("libro"), list) else None
    ini = next((x for x in cr.get("incantesimi") or [] if isinstance(x, dict) and classe and x.get("classe") == classe.get("id")), None)
    if ini:
        fissi = list(ini.get("fissi") or [])
        a_scelta = ini.get("a_scelta", 0) if _intero(ini.get("a_scelta", 0)) else 0
        if libro is None:
            out.append(("libro_mancante", creato, "la scheda non scrive il libro degli incantesimi (libro)"))
        else:
            if [f for f in fissi if f not in libro]:
                out.append(("libro_senza_fissi", True, f"il libro non ha {', '.join(f for f in fissi if f not in libro)}"))
            altri = [x for x in libro if x not in fissi]
            if livello == inizio and (len(altri) != a_scelta if creato else len(altri) < a_scelta):
                out.append(("libro_conta", creato, f"{len(altri)} incantesimi a scelta nel libro, la creazione ne dà {a_scelta}"))
            for x in altri if livello == inizio else []:
                lv = (_ogg((poteri.get(x) or {}).get("livello")) or {}).get(classe["id"])
                if _intero(lv) and lv > ini.get("livello", 1):
                    out.append(("libro_livello", True, f"{x}: incantesimo di livello {lv}, all'inizio al più del {ini.get('livello', 1)}"))
    if classe and libro is not None:
        for x in libro:
            if classe["id"] not in (_ogg((poteri.get(x) or {}).get("livello")) or {}):
                out.append(("incantesimo_non_della_classe", True, f"{x}: non è un incantesimo di {classe['id']}"))
        for x in s.get("incantesimi") or []:
            if x not in libro:
                out.append(("preparato_fuori_libro", True, f"{x}: preparato ma non nel libro"))

    if r.get("lingue") and "lingue" in passi:
        lingue = s.get("lingue") if isinstance(s.get("lingue"), list) else None
        if lingue is None:
            out.append(("lingue_mancanti", creato, "la scheda non scrive le lingue (lingue)"))
        else:
            proprie = list((razza or {}).get("lingue") or [])
            if [x for x in proprie if x not in lingue]:
                out.append(("lingue_della_razza", True, f"mancano le lingue della razza: {', '.join(x for x in proprie if x not in lingue)}"))
            extra = len([x for x in lingue if x not in proprie])
            car = (_ogg(cr.get("lingue")) or {}).get("caratteristica")
            ammesse = max(0, bonus_caratteristica(r, s, car)) if isinstance(car, str) else 0
            if extra > ammesse:
                out.append(("lingue_troppe", True, f"{extra} lingue in più, il bonus ne dà {ammesse}"))
    return out


def controlla_scheda(s: dict, dove: str, r: dict, e: Esito, creato: bool = False, livello_iniziale: int | None = None,
                     punti_ferita: str | None = None) -> None:
    """A PC's sheet against the set's creation rules: an error for what stops the character, a strict warning else."""
    for codice, grave, msg in problemi_della_scheda(r, s, creato, livello_iniziale, punti_ferita):
        if codice in GIA_DETTI:
            continue
        if grave:
            e.errore(f"REGOLE.creazione.{codice}", dove, msg)
        else:
            e.avviso(f"REGOLE.creazione.{codice}", dove, msg, rigoroso=True)

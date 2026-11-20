"""The item catalog of a rule set (docs/regole.md §2, «Catalogo»; mechanism M2): the [V] checks.

Mirrors apps/server/src/regole/catalogo.ts and regole/equipaggiamento.ts: `monete` (coins, worth in the smallest one,
the coins prices are written in), `catalogo` (AC rule, attack abilities, range bands, weapons, armor, shields,
ammunition, gear with light, restrictions by class and race), and on the set's sheets `equipaggiamento`, `monete` and
`attacchi[].arma`. A sheet that starts with an item its class or race may not use at all (`penalita.vietato`) is an
error: the Engine would drop the weapon's line or refuse the armor.
"""

from __future__ import annotations

import re

from .esito import Esito

RE_ID = re.compile(r"^[a-z0-9_]+$")
RE_COSTO = re.compile(r"^\s*(\d+(?:[.,]\d+)?)\s*([a-z_]+)\s*$")
RE_DADI = re.compile(r"^(\d*)d(\d+)([+-]\d+)?$")
SEZIONI = {"armi": "arma", "armature": "armatura", "scudi": "scudo", "munizioni": "munizione", "attrezzatura": "attrezzo"}
PENALITA = ("attacco", "vietato", "senza_incantesimi", "senza_abilita", "perde_incantesimi")


def _ogg(v) -> dict | None:
    return v if isinstance(v, dict) else None


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _numero(v) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _err(e: Esito, dove: str, msg: str) -> None:
    e.errore("REGOLE.catalogo", dove, msg)


def _formula(v) -> bool:
    if _intero(v) and v >= 0:
        return True
    return isinstance(v, str) and bool(RE_DADI.match(v.replace(" ", "").lower()) or re.fullmatch(r"\d+", v.strip()))


def monete_del_set(r: dict, e: Esito, dove: str) -> dict[str, int]:
    """The set's coins, checked: id → worth in the smallest coin. Empty without `monete`."""
    m = r.get("monete")
    if m is None:
        return {}
    o = _ogg(m) or {}
    tagli: dict[str, int] = {}
    for i, x in enumerate(o.get("tagli") or [], start=1):
        t = _ogg(x) or {}
        if not (isinstance(t.get("id"), str) and RE_ID.match(t["id"]) and _intero(t.get("vale")) and t["vale"] >= 1):
            _err(e, dove, f"monete.tagli[{i}]: {{id, nome, vale: un intero ≥ 1, nella moneta più piccola}}")
            continue
        if t["id"] in tagli:
            _err(e, dove, f"monete.tagli: id ripetuto «{t['id']}»")
        tagli[t["id"]] = t["vale"]
    if not tagli:
        _err(e, dove, "monete.tagli: almeno una moneta {id, nome, vale}")
        return {}
    if 1 not in tagli.values():
        _err(e, dove, "monete.tagli: la moneta più piccola ha vale 1")
    if o.get("base") is not None and o["base"] not in tagli:
        _err(e, dove, f"monete.base: «{o['base']}» non è una moneta di monete.tagli")
    for k in o.get("prezzi") or []:
        if k not in tagli:
            _err(e, dove, f"monete.prezzi: «{k}» non è una moneta di monete.tagli")
    p = o.get("peso")
    if p is not None and not (isinstance(p, dict) and _intero(p.get("quante")) and p["quante"] > 0 and _numero(p.get("peso")) and p["peso"] > 0):
        _err(e, dove, "monete.peso: {quante: monete, peso: quanto pesano}")
    return tagli


def _costo(v, monete: dict[str, int], d: str, e: Esito, dove: str) -> None:
    if v is None or v == "n/a":
        return
    if _numero(v):
        if not monete:
            _err(e, dove, f"{d}.costo: un prezzo vuole le monete del set")
        return
    m = RE_COSTO.match(v) if isinstance(v, str) else None
    if not m or m.group(2) not in monete:
        _err(e, dove, f"{d}.costo: un numero nella moneta base o «15 ma» con una moneta di monete")


def _limiti(v, fasce: int | None, d: str, e: Esito, dove: str) -> None:
    if not (isinstance(v, list) and v and all(_numero(n) and n > 0 for n in v) and all(v[i] > v[i - 1] for i in range(1, len(v)))):
        _err(e, dove, f"{d}: i limiti delle gittate, crescenti (corta, media, lunga)")
    elif fasce is not None and len(v) != fasce:
        _err(e, dove, f"{d}: {len(v)} limiti, catalogo.gittate ha {fasce} fasce")


def catalogo_del_set(r: dict, car: set[str], abi: set[str], classi: set[str], razze: set[str], tempo: set[str] | None,
                     e: Esito, dove: str) -> dict[str, dict]:
    """The set's catalog, checked: id → entry (with its `_tipo`). Empty without `catalogo`."""
    c = r.get("catalogo")
    if c is None:
        return {}
    monete = monete_del_set(r, e, dove)
    o = _ogg(c)
    if o is None:
        _err(e, dove, "catalogo: {difesa, abilita, armi, armature, scudi, munizioni, attrezzatura, restrizioni}")
        return {}
    git = _ogg(o.get("gittate"))
    fasce = None
    if o.get("gittate") is not None:
        lf = (git or {}).get("fasce")
        if not (git and isinstance(git.get("unita"), str) and isinstance(lf, list) and lf
                and all(isinstance(f, dict) and isinstance(f.get("id"), str) and _intero(f.get("bonus")) for f in lf)):
            _err(e, dove, "catalogo.gittate: {unita, parole_unita, fasce: [{id, nome, bonus, parole}], predefinita}")
        else:
            fasce = len(lf)
            if git.get("predefinita") is not None and git["predefinita"] not in {f["id"] for f in lf}:
                _err(e, dove, f"catalogo.gittate.predefinita: «{git['predefinita']}» non è una fascia")
    voci: dict[str, dict] = {}
    for sezione, tipo in SEZIONI.items():
        lista = o.get(sezione)
        if lista is None:
            continue
        if not isinstance(lista, list):
            _err(e, dove, f"catalogo.{sezione}: un elenco")
            continue
        for i, x in enumerate(lista, start=1):
            v = _ogg(x) or {}
            vid = v.get("id")
            if not (isinstance(vid, str) and RE_ID.match(vid) and isinstance(v.get("nome"), str) and v["nome"].strip()):
                _err(e, dove, f"catalogo.{sezione}[{i}]: {{id: snake_case, nome, …}}")
                continue
            d = f"catalogo.{vid}"
            if vid in voci:
                _err(e, dove, f"catalogo: id ripetuto «{vid}»")
            voci[vid] = {**v, "_tipo": tipo}
            _costo(v.get("costo"), monete, d, e, dove)
            if v.get("peso") is not None and not (_numero(v["peso"]) and v["peso"] >= 0):
                _err(e, dove, f"{d}.peso: un numero da 0 (dieci oggetti «*» pesano 1: 0.1)")
            if v.get("confezione") is not None and not (_intero(v["confezione"]) and v["confezione"] >= 1):
                _err(e, dove, f"{d}.confezione: un intero ≥ 1")
            if tipo == "arma":
                if not _formula(v.get("danno")):
                    _err(e, dove, f"{d}.danno: una formula come 1d6")
                if v.get("gittate") is not None:
                    _limiti(v["gittate"], fasce, f"{d}.gittate", e, dove)
                lancio = v.get("lancio")
                if lancio is not None:
                    if not isinstance(lancio, dict):
                        _err(e, dove, f"{d}.lancio: {{gittate: [..], nome}}")
                    else:
                        _limiti(lancio.get("gittate"), fasce, f"{d}.lancio.gittate", e, dove)
                if (v.get("gittate") is not None or lancio is not None) and fasce is None:
                    _err(e, dove, f"{d}: le gittate vogliono catalogo.gittate")
                if v.get("ricarica") is not None and not (_intero(v["ricarica"]) and v["ricarica"] >= 1):
                    _err(e, dove, f"{d}.ricarica: i round tra due tiri, un intero ≥ 1")
                if v.get("mani") not in (None, 1, 2):
                    _err(e, dove, f"{d}.mani: 1 o 2")
            elif tipo == "armatura":
                if not _intero(v.get("ca")):
                    _err(e, dove, f"{d}.ca: la Classe d'Armatura, un intero")
                if not (isinstance(v.get("categoria"), str) and RE_ID.match(v["categoria"])):
                    _err(e, dove, f"{d}.categoria: il tipo di armatura (cuoio, metallo), snake_case")
            elif tipo == "scudo" and not _intero(v.get("bonus")):
                _err(e, dove, f"{d}.bonus: quanto aggiunge alla CA, un intero")
            elif tipo == "attrezzo" and v.get("luce") is not None:
                lu = _ogg(v["luce"]) or {}
                if not (_numero(lu.get("raggio")) and _formula(lu.get("durata")) and isinstance(lu.get("unita"), str)):
                    _err(e, dove, f"{d}.luce: {{raggio, fioca, durata, unita: un'unità di tempo.unita, consuma}}")
                elif tempo is not None and lu["unita"] not in tempo:
                    _err(e, dove, f"{d}.luce.unita: «{lu['unita']}» non è un'unità di tempo.unita")
    for vid, v in voci.items():
        mun = v.get("munizioni")
        for m in ([mun] if isinstance(mun, str) else mun or []):
            if (voci.get(m) or {}).get("_tipo") != "munizione":
                _err(e, dove, f"catalogo.{vid}.munizioni: «{m}» non è in catalogo.munizioni")
        cons = (_ogg(v.get("luce")) or {}).get("consuma")
        if cons is not None and cons not in voci:
            _err(e, dove, f"catalogo.{vid}.luce.consuma: «{cons}» non è nel catalogo")
    dif = _ogg(o.get("difesa"))
    if o.get("difesa") is not None and not (dif and _intero(dif.get("senza_armatura"))):
        _err(e, dove, "catalogo.difesa: {senza_armatura: la CA senza armatura, caratteristica}")
    if dif and dif.get("caratteristica") is not None and dif["caratteristica"] not in car:
        _err(e, dove, f"catalogo.difesa.caratteristica: «{dif['caratteristica']}» non è una caratteristica del set")
    for k, a in (_ogg(o.get("abilita")) or {}).items():
        if a not in abi | car:
            _err(e, dove, f"catalogo.abilita.{k}: «{a}» non è un'abilità o una caratteristica del set")
    if o.get("danno_caratteristica") is not None and o["danno_caratteristica"] not in car:
        _err(e, dove, f"catalogo.danno_caratteristica: «{o['danno_caratteristica']}» non è una caratteristica del set")
    for i, x in enumerate(o.get("restrizioni") or [], start=1):
        rr = _ogg(x) or {}
        d = f"catalogo.restrizioni[{i}]"
        if rr.get("cosa") not in ("arma", "armatura", "scudo") or (isinstance(rr.get("classe"), str)) == (isinstance(rr.get("razza"), str)):
            _err(e, dove, f"{d}: {{classe o razza, cosa: arma | armatura | scudo, ammessi… o vietati…, penalita}}")
            continue
        if isinstance(rr.get("classe"), str) and classi and rr["classe"] not in classi:
            _err(e, dove, f"{d}.classe: «{rr['classe']}» non è una classe del set")
        if isinstance(rr.get("razza"), str) and razze and rr["razza"] not in razze:
            _err(e, dove, f"{d}.razza: «{rr['razza']}» non è una razza del set")
        for k in ("ammessi", "vietati"):
            for vid in rr.get(k) or []:
                if vid not in voci:
                    _err(e, dove, f"{d}.{k}: «{vid}» non è nel catalogo")
        if not any(rr.get(k) is not None for k in ("ammessi", "ammessi_proprieta", "ammessi_categorie", "vietati", "vietati_taglie")):
            _err(e, dove, f"{d}: di' che cosa è ammesso (ammessi, ammessi_proprieta, ammessi_categorie) o vietato (vietati, vietati_taglie)")
        pen = _ogg(rr.get("penalita"))
        if not pen or any(k not in PENALITA for k in pen):
            _err(e, dove, f"{d}.penalita: una o più di {', '.join(PENALITA)}")
        for a in (pen or {}).get("senza_abilita") or []:
            if a not in abi:
                _err(e, dove, f"{d}.penalita.senza_abilita: «{a}» non è un'abilità del set")
    return voci


def _viola(rr: dict, v: dict) -> bool:
    """Whether a catalog entry breaks a restriction (the same rule as regole/equipaggiamento.ts restrizioniViolate)."""
    if rr.get("cosa") != v["_tipo"]:
        return False
    if rr.get("ammessi") is not None and v["id"] not in rr["ammessi"]:
        return True
    if rr.get("ammessi_proprieta") is not None and not set(v.get("proprieta") or []) & set(rr["ammessi_proprieta"]):
        return True
    if rr.get("ammessi_categorie") is not None and v["_tipo"] == "armatura" and v.get("categoria") not in rr["ammessi_categorie"]:
        return True
    if v["id"] in (rr.get("vietati") or []):
        return True
    return v["_tipo"] == "arma" and v.get("taglia") in (rr.get("vietati_taglie") or [])


def controlla_scheda(s: dict, dove: str, r: dict, voci: dict[str, dict], e: Esito) -> None:
    """A sheet's gear, coins and catalog weapon lines."""
    tagli = {t.get("id") for t in (_ogg(r.get("monete")) or {}).get("tagli") or [] if isinstance(t, dict)}
    eq = s.get("equipaggiamento")
    if eq is not None:
        if not voci:
            e.errore("REGOLE.scheda", dove, "scheda.equipaggiamento: il set non ha un catalogo")
        elif not isinstance(eq, list):
            e.errore("REGOLE.scheda", dove, "scheda.equipaggiamento: un elenco di id del catalogo")
        else:
            restrizioni = [x for x in (_ogg(r.get("catalogo")) or {}).get("restrizioni") or [] if isinstance(x, dict)]
            indossati: dict[str, str] = {}
            for i, x in enumerate(eq, start=1):
                o = {"id": x} if isinstance(x, str) else (_ogg(x) or {})
                vid = o.get("id")
                v = voci.get(vid) if isinstance(vid, str) else None
                if v is None:
                    e.errore("REGOLE.scheda", dove, f"equipaggiamento[{i}]: «{vid}» non è nel catalogo del set")
                    continue
                if "quante" in o and not (_intero(o["quante"]) and o["quante"] >= 0):
                    e.errore("REGOLE.scheda", dove, f"equipaggiamento.{vid}.quante: un intero da 0 in su")
                if v["_tipo"] in ("armatura", "scudo") and o.get("indossato") is not False:
                    if v["_tipo"] in indossati and o.get("indossato") is True:
                        e.errore("REGOLE.scheda", dove, f"equipaggiamento.{vid}: si indossa una sola armatura e un solo scudo ({indossati[v['_tipo']]} già)")
                    indossati.setdefault(v["_tipo"], vid)
                usato = v["_tipo"] == "arma" or (v["_tipo"] in ("armatura", "scudo") and indossati.get(v["_tipo"]) == vid)
                for rr in restrizioni:
                    chi = rr.get("classe") if rr.get("classe") is not None else rr.get("razza")
                    sua = s.get("classe") if rr.get("classe") is not None else s.get("razza")
                    if chi != sua or not usato or not _viola(rr, v):
                        continue
                    if ((_ogg(rr.get("penalita")) or {}).get("vietato")) is True:
                        e.errore("REGOLE.scheda", dove, f"equipaggiamento.{vid}: vietato a «{chi}» (catalogo.restrizioni)")
                    else:
                        e.avviso("REGOLE.scheda", dove, f"equipaggiamento.{vid}: «{chi}» lo usa con una penalità ({', '.join(rr.get('penalita') or {})})")
    m = s.get("monete")
    if m is not None:
        if not tagli or not isinstance(m, dict):
            e.errore("REGOLE.scheda", dove, "scheda.monete: {id di moneta del set: quante}" if tagli else "scheda.monete: il set non ha monete")
        else:
            for k, n in m.items():
                if k not in tagli:
                    e.errore("REGOLE.scheda", dove, f"scheda.monete: «{k}» non è una moneta del set")
                elif not (_intero(n) and n >= 0):
                    e.errore("REGOLE.scheda", dove, f"scheda.monete.{k}: un intero da 0 in su")
    for i, at in enumerate(s.get("attacchi") or [], start=1):
        a = (_ogg(at) or {}).get("arma")
        if a is not None and (voci.get(a) or {}).get("_tipo") != "arma":
            e.errore("REGOLE.scheda", dove, f"attacchi[{i}].arma: «{a}» non è un'arma del catalogo del set")

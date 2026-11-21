"""A rule set's bestiary (docs/regole.md §2, «Bestiario»): the [V] checks.

Mirrors apps/server/src/regole/bestiario.ts and the bestiary part of regole/schede.ts:
- `bestiario`: dado_vita (4, 6, 8, 10, 12), mezzo (a dice formula), attacco (rows {da, bonus}, `da` from 0 and growing),
  abilita (the set's attack abilities), uno_meno_meno_di_uno (a boolean);
- `mostri` (inline in regole.yaml, and regole/mostri.yaml next to it): an id in snake_case, unique; hit dice as the manual
  prints them («3+2*», «1-1», «½»); attack lines with a name and dice (or a power, `potere`), the powers a hit applies
  (`colpendo`), uses per day and a rate; `per_round` naming the entry's own lines; salva_come with a class of the set;
  morale 2–12 or {prima, dopo}; px a whole number; colpito_solo_da a list of words;
- a sheet with `mostro:` is checked with the entry's keys laid under its own (`scheda_con_mostro`), as the Engine reads it:
  a monster needs no ability scores and no written hit points when it has hit dice.
Errors are `REGOLE.bestiario`.
"""

from __future__ import annotations

import copy
import re
from pathlib import Path

import yaml

from .esito import Esito

RE_ID = re.compile(r"^[a-z0-9_]+$")
RE_DV = re.compile(r"^(\d+|½)(?:\s*([+\-−])\s*(\d+))?\s*(\**)$")
RE_DADI = re.compile(r"^(\d*)d(\d+)([+-]\d+)?$|^\d+$")
# Keys of an entry that describe the printed block and are not a sheet's (regole/bestiario.ts, SOLO_TESTO).
SOLO_TESTO = {"manuale", "pagina", "movimento", "numero", "tesoro", "testo", "controllo", "difesa_senza_armatura"}


def _intero(v) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def _err(e: Esito, dove: str, msg: str) -> None:
    e.errore("REGOLE.bestiario", dove, msg)


def dadi_vita_validi(v) -> bool:
    """Hit dice as the Engine reads them: a whole number, or «3+2*», «1-1», «½», «2*»."""
    if _intero(v):
        return v >= 0
    return isinstance(v, str) and bool(RE_DV.match(v.strip()))


def formula(v) -> bool:
    return (_intero(v) and v >= 0) or (isinstance(v, str) and bool(RE_DADI.match(v.replace(" ", "").lower())))


def bestiario_del_set(r: dict, abilita: set[str], e: Esito, dove: str) -> None:
    b = r.get("bestiario")
    if b is None:
        return
    if not isinstance(b, dict):
        _err(e, dove, "bestiario: {dado_vita, mezzo, attacco, abilita}")
        return
    if b.get("dado_vita", 8) not in (4, 6, 8, 10, 12):
        _err(e, dove, "bestiario.dado_vita: 4, 6, 8, 10 o 12")
    if "mezzo" in b and not formula(b["mezzo"]):
        _err(e, dove, "bestiario.mezzo: i punti ferita di ½ dado vita, una formula come 1d4")
    prima = -1
    righe = b.get("attacco")
    if righe is not None and not (isinstance(righe, list) and righe):
        _err(e, dove, "bestiario.attacco: almeno una riga {da, bonus}")
    for i, x in enumerate(righe or [], start=1):
        if not (isinstance(x, dict) and _intero(x.get("da")) and x["da"] >= 0 and _intero(x.get("bonus"))):
            _err(e, dove, f"bestiario.attacco[{i}]: {{da: dadi vita da 0, bonus: un intero}}")
            continue
        if x["da"] <= prima:
            _err(e, dove, f"bestiario.attacco[{i}]: «da» cresce riga dopo riga")
        prima = x["da"]
    ab = b.get("abilita") or []
    for a in ab:
        if a not in abilita:
            _err(e, dove, f"bestiario.abilita: «{a}» non è un'abilità del set")
    if righe and not ab:
        _err(e, dove, "bestiario.abilita: le abilità d'attacco che prendono il bonus (mischia, distanza)")
    if "uno_meno_meno_di_uno" in b and not isinstance(b["uno_meno_meno_di_uno"], bool):
        _err(e, dove, "bestiario.uno_meno_meno_di_uno: true o false")


def voci_mostri(cartella_regole: Path, r: dict, e: Esito) -> list[tuple[str, dict]]:
    """The raw entries with where they come from: regole.yaml's `mostri`, then regole/mostri.yaml."""
    out: list[tuple[str, dict]] = []
    liste: list[tuple[str, object]] = [("regole/regole.yaml mostri", r.get("mostri"))]
    f = cartella_regole / "mostri.yaml"
    if f.exists():
        try:
            d = yaml.safe_load(f.read_text(encoding="utf-8"))
        except yaml.YAMLError as err:
            _err(e, "regole/mostri.yaml", f"YAML non valido: {err}")
            d = None
        liste.append(("regole/mostri.yaml", d.get("mostri") if isinstance(d, dict) else d))
    for dove, v in liste:
        if v is None:
            continue
        if not isinstance(v, list):
            _err(e, dove, "una lista di mostri ({id, nome, …})")
            continue
        out.extend((dove, x) for x in v)
    return out


def mostri_del_set(cartella_regole: Path, r: dict, classi: set[str], poteri: set[str], e: Esito) -> dict[str, dict]:
    """The bestiary's entries, checked. Returns id → entry (the valid ids)."""
    out: dict[str, dict] = {}
    for dove, x in voci_mostri(cartella_regole, r, e):
        if not isinstance(x, dict) or not (isinstance(x.get("id"), str) and RE_ID.match(x["id"])):
            _err(e, dove, f"ogni mostro ha un id in snake_case: {x!r:.60}")
            continue
        mid = x["id"]
        d = f"{dove} {mid}"
        if mid in out:
            _err(e, d, f"id del mostro ripetuto «{mid}»")
            continue
        out[mid] = x
        if "dadi_vita" in x and not dadi_vita_validi(x["dadi_vita"]):
            _err(e, d, f"dadi_vita «{x['dadi_vita']}»: come 3, \"3+2\", \"1-1\", \"½\", \"2*\"")
        _linee(x, d, poteri, e)
        sc = x.get("salva_come")
        if sc is not None and not (isinstance(sc, dict) and sc.get("classe") in classi and _intero(sc.get("livello")) and sc["livello"] >= 0):
            _err(e, d, "salva_come: {classe: una classe del set, livello: un intero}")
        if "morale" in x and not morale_valido(x["morale"]):
            _err(e, d, "morale: da 2 a 12, o {prima, dopo}")
        if "px" in x and not (_intero(x["px"]) and x["px"] >= 0):
            _err(e, d, "px: un intero da 0 in su")
        if "colpito_solo_da" in x and not (isinstance(x["colpito_solo_da"], list) and x["colpito_solo_da"] and all(isinstance(w, str) for w in x["colpito_solo_da"])):
            _err(e, d, "colpito_solo_da: le armi che lo feriscono, [argento, magica] o [magica]")
        if "sorprende" in x and not (_intero(x["sorprende"]) and x["sorprende"] >= 1):
            _err(e, d, "sorprende: la faccia fino a cui sorprende i nemici, da 1")
        if "si_arrende" in x and not isinstance(x["si_arrende"], bool):
            _err(e, d, "si_arrende: true o false")
        if "resistenze" in x and not resistenze_valide(x["resistenze"]):
            _err(e, d, "resistenze: {tipo di danno: meta | immune}")
    return out


def resistenze_valide(r) -> bool:
    return isinstance(r, dict) and all(isinstance(k, str) and v in ("meta", "immune") for k, v in r.items())


def morale_valido(m) -> bool:
    if _intero(m):
        return 2 <= m <= 12
    return isinstance(m, dict) and all(_intero(m.get(k)) and 2 <= m[k] <= 12 for k in ("prima", "dopo"))


def _linee(x: dict, d: str, poteri: set[str], e: Esito) -> None:
    linee = x.get("attacchi") or []
    if not isinstance(linee, list):
        _err(e, d, "attacchi: una lista di linee {id, nome, danno}")
        return
    ids: set[str] = set()
    for i, a in enumerate(linee, start=1):
        if not isinstance(a, dict) or not isinstance(a.get("nome"), str):
            _err(e, d, f"attacchi[{i}]: {{id, nome, danno}}")
            continue
        ids.add(str(a.get("id") or a["nome"]).lower())
        if "danno" in a and not formula(a["danno"]):
            _err(e, d, f"attacchi[{i}].danno: «{a['danno']}» non è una formula come 1d6")
        if "danno" not in a and "potere" not in a:
            # A special the manual prints without dice (a gaze, a drain's touch) and the set has no power for yet: the
            # Engine cannot use the line (a sheet using it rolls 1d4, with a warning); the special stays in `testo`.
            e.avviso("REGOLE.bestiario", d, f"attacchi[{i}] «{a.get('nome')}»: né danno né un potere del set (potere): il Motore non sa usarla")
        for p in ([a["colpendo"]] if isinstance(a.get("colpendo"), str) else a.get("colpendo") or []):
            if p not in poteri:
                _err(e, d, f"attacchi[{i}].colpendo: «{p}» non è un potere del set")
        if "potere" in a and a["potere"] not in poteri:
            _err(e, d, f"attacchi[{i}].potere: «{a['potere']}» non è un potere del set")
        if "usi" in a and not (_intero(a["usi"]) and a["usi"] > 0):
            _err(e, d, f"attacchi[{i}].usi: quante volte al giorno, da 1")
        if "ricarica" in a and not (_intero(a["ricarica"]) and a["ricarica"] > 1):
            _err(e, d, f"attacchi[{i}].ricarica: una volta ogni quanti round, da 2")
        if "proprieta" in a and not (isinstance(a["proprieta"], list) and all(isinstance(w, str) for w in a["proprieta"])):
            _err(e, d, f"attacchi[{i}].proprieta: un elenco di parole (argento, magica…)")
    for j, giro in enumerate(x.get("per_round") or [], start=1):
        if not isinstance(giro, list) or not giro or any(str(y).lower() not in ids for y in giro):
            _err(e, d, f"per_round[{j}]: una lista di id delle sue linee ({', '.join(sorted(ids)) or 'nessuna'})")


def scheda_con_mostro(s: dict, mostri: dict[str, dict]) -> tuple[dict, bool]:
    """A sheet with `mostro:` as the Engine reads it: the entry's sheet keys under the sheet's own. (sheet, from a monster)."""
    mid = s.get("mostro")
    m = mostri.get(mid) if isinstance(mid, str) else None
    if not m:
        return s, False
    base = {k: copy.deepcopy(v) for k, v in m.items() if k not in SOLO_TESTO and k not in ("id", "nome")}
    out = {**base, **s}
    out.pop("mostro", None)
    return out, True

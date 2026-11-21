"""A bestiary of a rule set (campagne/<id>/regole/mostri.yaml) checked against the stat blocks of its manual's PDF.

    python3 strumenti/regole/confronta_bestiario.py campagne/torre-mozza/regole/mostri.yaml \\
        --pdf manuali/basic-fantasy-rpg-r142.pdf --da 67 --a 166 [--pagine 63-72]

Each entry names its block with `manuale:` (the parser's key, «Title» or «Title | Column»: strumenti/regole/blocchi_mostri.py)
and the check compares the numbers a person or an agent copied with the ones the parser reads by position: Armor Class
(and the unarmored one in brackets, and «(s)»/«(m)», hit only by silver or magic weapons), Hit Dice (with the attack bonus
in brackets), the number of attacks per round and their damage dice, Save As, Morale, XP, movement, number appearing and
treasure as printed. Both ways: every block has an entry, every entry has a block. With `--pagine` only the blocks of those
printed pages count (a batch). It prints one line per difference and exits 1 if there is any.

The two sides are independent: the entries are transcribed from the manual's text, the parser reads the layout. Nothing
here writes data. The manual stays in manuali/ (never in git); without it the test skips.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

import blocchi_mostri as B  # noqa: E402

CLASSI = {"fighter": "guerriero", "cleric": "chierico", "magic-user": "mago", "thief": "ladro"}
DADI = re.compile(r"\d+d\d+(?:\s*[+-]\s*\d+)?")
PUNTI = re.compile(r"(\d+)\s+points?\b")
NUMERI_PAROLE = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6}


def _norm(v) -> str:
    """A printed value compared loosely: whitespace collapsed, typographic quotes and dashes made plain."""
    s = str(v if v is not None else "").replace("’", "'").replace("‘", "'").replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip().lower()


def _formule(v: str) -> set[str]:
    """The damage dice of a printed Damage line («1d4 claw, 1d6+1 bite», «1 point bite»), normalised."""
    out = {re.sub(r"\s+", "", m) for m in DADI.findall(v or "")}
    out |= {m for m in PUNTI.findall(v or "")}
    return out


def _formula_voce(d) -> str:
    return re.sub(r"\s+", "", str(d)).lower()


def attacchi_stampati(v: str) -> list[int] | None:
    """«2 claws, 1 bite» → [3]; «1 gore or 1 trample» → [1, 1]; None when it has no count (Special, See below)."""
    alternative = []
    # «or» starts an alternative only before a count and a word («1 gore or 1 trample»), not «natural 19 or 20».
    for alt in re.split(r"\bor\b(?=\s+(?:\d+|one|two|three|four|five|six)\s+[a-z])", v or "", flags=re.IGNORECASE):
        n = 0
        for pezzo in alt.split(","):
            m = re.match(r"\s*(\d+|one|two|three|four|five|six)\b", pezzo.strip().lower())
            if m:
                n += int(m.group(1)) if m.group(1).isdigit() else NUMERI_PAROLE[m.group(1)]
        if n:
            alternative.append(n)
    return alternative or None


def salva_come_stampato(v: str) -> tuple[str, int, int] | None:
    """(class, lowest level, highest level): «Fighter: 4» → (guerriero, 4, 4); «Fighter: 1-2» → (guerriero, 1, 2)."""
    t = (v or "").lower().strip("– ")
    if "normal man" in t:
        return ("guerriero", 0, 0)
    m = re.match(r"\s*(fighter|cleric|magic-user|thief)\s*:?\s*(\d+)(?:\s*(?:-|to)\s*(\d+))?", t)
    return (CLASSI[m.group(1)], int(m.group(2)), int(m.group(3) or m.group(2))) if m else None


def dadi_vita_stampati(v: str) -> str:
    """Hit Dice as an entry writes them: without the attack bonus in brackets nor «(1d4 hit points)»."""
    return re.sub(r"\s+", "", re.sub(r"\([^)]*\)", "", v or ""))


def _intervallo(v: str) -> tuple[int, int] | None:
    m = re.search(r"(\d[\d,]*)\**\s*(?:to|-)\s*(\d[\d,]*)", v or "")
    return (int(m.group(1).replace(",", "")), int(m.group(2).replace(",", ""))) if m else None


def differenze_voce(e: dict, b: B.Blocco) -> list[str]:
    """What an entry gets wrong against its block (empty: it matches). An entry may list fields the check skips, with
    the reason (`controllo: {ignora: [salva_come], motivo: "…"}`) when the manual prints no number there («N/A», «by
    HD»); a skip without a reason is itself a difference."""
    c = b.campi
    out: list[str] = []
    dove = f"{e.get('id', '?')} ({b.chiave}, p. {b.pagina})"
    if (e.get("controllo") or {}).get("ignora") and not str((e.get("controllo") or {}).get("motivo") or "").strip():
        out.append(f"{dove}: controllo.ignora without a motivo")

    def diverso(campo: str, atteso, trovato) -> None:
        if campo.split(" ")[0] in ignora:
            return
        out.append(f"{dove}: {campo} is {trovato!r} in the entry, the manual prints {atteso!r}")

    ignora = set((e.get("controllo") or {}).get("ignora") or [])
    ca = c.get("Armor Class", "")
    rng_ca = _intervallo(ca) if re.search(r"\d\s*to\s*\d", ca) else None
    if "difesa" in ignora:
        pass
    elif rng_ca:
        if not (isinstance(e.get("difesa"), int) and rng_ca[0] <= e["difesa"] <= rng_ca[1]):
            diverso("difesa", ca, e.get("difesa"))
    elif B.numero(ca) != e.get("difesa"):
        diverso("difesa", B.numero(ca), e.get("difesa"))
    if "difesa" not in ignora and B.tra_parentesi(ca) != e.get("difesa_senza_armatura"):
        diverso("difesa_senza_armatura", B.tra_parentesi(ca), e.get("difesa_senza_armatura"))
    solo = {"argento", "magica"} if "(s)" in ca else {"magica"} if "(m)" in ca else set()
    if set(e.get("colpito_solo_da") or []) != solo:
        diverso("colpito_solo_da", sorted(solo), sorted(e.get("colpito_solo_da") or []))
    dv = c.get("Hit Dice", "")
    stampati = dadi_vita_stampati(dv)
    fissi = re.match(r"\s*(\d+(?:d\d+)?)\s*(?:hit points?|hp)\b", dv.lower())
    if "dadi_vita" in ignora:
        pass
    elif fissi:
        # A creature with fixed hit points (a normal rat: «1 Hit Point»): less than one hit die, its own `pf`.
        if str(e.get("pf")) != fissi.group(1) or str(e.get("dadi_vita")) != "½":
            diverso("dadi_vita and pf", f"½ with pf {fissi.group(1)}", f"{e.get('dadi_vita')} with pf {e.get('pf')}")
    elif "to" in stampati:
        lo, hi = _intervallo(dv) or (0, 0)
        n = B.numero(str(e.get("dadi_vita")))
        if n is None or not lo <= n <= hi:
            diverso("dadi_vita", stampati, e.get("dadi_vita"))
    elif stampati != re.sub(r"\s+", "", str(e.get("dadi_vita", ""))):
        diverso("dadi_vita", stampati, e.get("dadi_vita"))
    bonus = B.tra_parentesi(dv)
    if bonus != e.get("attacco"):
        diverso("attacco", bonus, e.get("attacco"))
    n_att = attacchi_stampati(c.get("No. of Attacks", ""))
    per_round = e.get("per_round") or []
    # «2 claws, 1 bite or breath, 1 tail» is one count with two alternatives (bite or breath): the entry's alternatives
    # must have the printed counts, as many alternatives as it needs.
    if n_att is not None and (not per_round or {len(r) for r in per_round} != set(n_att)):
        diverso("per_round (attacks per round)", n_att, [len(r) for r in per_round])
    linee = {x.get("id") for x in e.get("attacchi") or []}
    for r in per_round:
        for x in r:
            if x not in linee and x not in {a.get("id") for a in e.get("azioni") or []}:
                out.append(f"{dove}: per_round names «{x}», which is neither an attack line nor an action of the entry")
    danni_stampati = _formule(c.get("Damage", ""))
    danni_voce = {_formula_voce(x.get("danno")) for x in e.get("attacchi") or [] if x.get("danno") is not None}
    # A block printed as a range («1d4 or 1d6 or 1d8», by hit dice) has one entry per value: each takes some of its dice.
    alternative = bool(re.search(r"\bto\b", dv)) or bool(re.search(r"\d\s*-\s*\d", c.get("XP", "")))
    if danni_stampati and (not danni_voce <= danni_stampati if alternative else danni_stampati != danni_voce):
        diverso("attacchi[].danno", sorted(danni_stampati), sorted(danni_voce))
    sc = salva_come_stampato(c.get("Save As", ""))
    ev = e.get("salva_come") or {}
    if sc and not (ev.get("classe") == sc[0] and isinstance(ev.get("livello"), int) and sc[1] <= ev["livello"] <= sc[2]):
        diverso("salva_come", c.get("Save As"), ev)
    mo = c.get("Morale", "")
    m_voce = e.get("morale")
    if "engaged" in mo.lower():
        prima, dopo = (int(x) for x in re.findall(r"\d+", mo)[:2])
        if m_voce != {"prima": prima, "dopo": dopo}:
            diverso("morale", {"prima": prima, "dopo": dopo}, m_voce)
    elif B.numero(mo) != (m_voce.get("prima") if isinstance(m_voce, dict) else m_voce):
        diverso("morale", B.numero(mo), m_voce)
    xp = c.get("XP", "")
    rng = _intervallo(xp) if re.search(r"\d\s*(?:to|-)\s*\d", xp) else None
    if rng:
        if not (isinstance(e.get("px"), int) and rng[0] <= e["px"] <= rng[1]):
            diverso("px", xp, e.get("px"))
    elif B.numero(xp) != e.get("px"):
        diverso("px", B.numero(xp), e.get("px"))
    for campo, chiave in (("movimento", "Movement"), ("numero", "No. Appearing"), ("tesoro", "Treasure Type")):
        if chiave in c and _norm(c[chiave]) != _norm(e.get(campo)):
            diverso(campo, c[chiave], e.get(campo))
    return out


def confronta(voci: list[dict], blocchi: list[B.Blocco], pagine: tuple[int, int] | None = None) -> list[str]:
    """Every difference between the entries and the blocks, both ways (within `pagine`, printed, if given)."""
    if pagine:
        blocchi = [b for b in blocchi if pagine[0] <= b.pagina <= pagine[1]]
        voci = [v for v in voci if isinstance(v.get("pagina"), int) and pagine[0] <= v["pagina"] <= pagine[1]]
    per_chiave = {b.chiave: b for b in blocchi}
    out: list[str] = []
    viste: set[str] = set()
    for v in voci:
        k = v.get("manuale")
        b = per_chiave.get(k)
        if not b:
            out.append(f"{v.get('id', '?')}: manuale «{k}» is not a stat block the parser finds"
                       + (f" in pp. {pagine[0]}-{pagine[1]}" if pagine else ""))
            continue
        viste.add(k)
        if v.get("pagina") != b.pagina:
            out.append(f"{v.get('id')}: pagina {v.get('pagina')}, the block is on p. {b.pagina}")
        out.extend(differenze_voce(v, b))
    for k, b in per_chiave.items():
        if k not in viste:
            out.append(f"p. {b.pagina}: the block «{k}» has no entry")
    ids = [v.get("id") for v in voci]
    out.extend(f"id «{i}» repeated" for i in sorted({i for i in ids if ids.count(i) > 1}))
    return out


def main(argv: list[str] | None = None) -> int:
    import yaml

    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("mostri", type=Path)
    p.add_argument("--pdf", type=Path, required=True)
    p.add_argument("--da", type=int, default=67, help="first PDF page of the monster section (1-based)")
    p.add_argument("--a", type=int, default=166, help="last PDF page (1-based)")
    p.add_argument("--pagine", help="only these printed pages, e.g. 63-72")
    o = p.parse_args(argv)
    dati = yaml.safe_load(o.mostri.read_text(encoding="utf-8")) or {}
    voci = dati.get("mostri") if isinstance(dati, dict) else dati
    pagine = tuple(int(x) for x in o.pagine.split("-")) if o.pagine else None
    diff = confronta(voci or [], B.leggi(o.pdf, o.da, o.a), pagine)  # type: ignore[arg-type]
    for d in diff:
        print(d)
    print(f"{len(voci or [])} entries, {len(diff)} differences")
    return 1 if diff else 0


if __name__ == "__main__":
    raise SystemExit(main())

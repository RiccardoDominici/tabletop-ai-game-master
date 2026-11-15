"""Private content at the table: lines the table heard that may carry what a PC did or learned in private.

    python3 -I private_al_tavolo.py <tavolo.md or tavolo-con-carte.md> [narrazioni.jsonl]

Why a separate detector (docs/e2e-finale-3.md, bug 1): the leak count of the earlier passes measured only the
campaign's secret words (apps/server/src/esperimenti/fughe.ts), and misure.py's «sospette» looked only at the turn of
the private action, at the raw narration before the guard, and skipped a PC who also acted in public. The judged leaks
were exactly the other cases: a whisper retold three turns later while its author acted in public. This detector reads
what the table HEARD (the table record, after every guard), looks up to eight turns after each private action, and uses
its own rule, looser than the server's guard (apps/server/src/narrazione/privato.ts), so it does not share its blind
spots:
- a public line that names the PC (first name) or the NPC the private action spoke to, and shares at least one content
  root with the private action or with that PC's private outcomes (from narrazioni.jsonl, when given);
- or, in the same turn and the two after, a public line that shares two roots with them, whoever it names;
- or, in a turn whose only player actions are private, a public line of that turn that shares one root.
Roots the players have since said in public actions do not count, nor do the characters' names. It is a list of
candidates for a reader, not a verdict: in a fight «spada» or «goblin» may come back for good reasons.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

OTTO = 8
VICINI = 2
# Frequent words that say nothing of an action's content (Italian and English), at least four letters.
VUOTE = set("""
mentre quando questo questa quello quella quelli sono siete della delle dello degli dalla dalle dallo dagli nella nelle
nello negli sulla sulle sullo sugli alla alle allo agli verso dopo prima senza sotto sopra dentro fuori anche ancora molto
poco tutto tutti tutta ogni come cosa perche pero piano intanto subito appena proprio vostro vostra nostro nostra suoi sue
loro altro altra altri qualche niente nulla dice dico detto chiede chiedo chiesto parla parlo guarda guardo resta resto
fanno fate fare fatto stai stato stata essere avere hanno aveva voce bassa voglio vuole sapere dimmi dimmelo adesso
while when then than this that these those there here with without from into onto upon over under after before inside
outside through also still very much more most less little every each some many what which where their them they have
been were your yours ours just only even again toward towards around about other another nothing something anything
because though although does doing will would could should might must quietly says said asks asked tell tells look
dove
""".split())


def norm(t: str) -> str:
    t = unicodedata.normalize("NFD", t.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def parole(t: str) -> list[str]:
    return [p for p in re.split(r"[^a-z0-9]+", norm(t)) if p]


def radici(t: str, nomi: set[str]) -> set[str]:
    return {p[:5] for p in parole(t) if len(p) >= 4 and p not in VUOTE and p not in nomi}


def leggi_tavolo(testo: str) -> dict[int, list[dict]]:
    """Per turn: the entries the table record has, in order (speaker, text, player?, private?)."""
    turni: dict[int, list[dict]] = {}
    for blocco in re.split(r"(?=^## Turno )", testo, flags=re.M):
        m = re.match(r"## Turno (\d+)", blocco)
        if not m:
            continue
        voci = []
        for riga in blocco.splitlines():
            g = re.match(r"^\*\*(.+?)\*\* \(giocatore(, \*azione privata\*)?\): (.*)$", riga)
            if g:
                voci.append({"chi": g.group(1), "testo": g.group(3), "giocatore": True, "privata": bool(g.group(2))})
                continue
            n = re.match(r"^\*\*(.+?):\*\* (.*)$", riga)
            if n:
                voci.append({"chi": n.group(1), "testo": n.group(2), "giocatore": False, "privata": False})
        turni[int(m.group(1))] = voci
    return turni


def esiti_privati(narrazioni: Path | None, turni: dict[int, list[dict]]) -> dict[tuple[int, str], list[str]]:
    """(turn, PC name) → the private outcome lines of that turn, from narrazioni.jsonl (ids matched to names)."""
    out: dict[tuple[int, str], list[str]] = {}
    if not narrazioni or not narrazioni.exists():
        return out
    nomi: dict[str, str] = {}
    righe = [json.loads(r) for r in narrazioni.read_text(encoding="utf-8").splitlines() if r.strip()]
    for d in righe:
        if d.get("tipo") != "turno":
            continue
        voci = turni.get(int(d.get("turno", 0)), [])
        for a in d.get("azioni") or []:
            for v in voci:
                if v["giocatore"] and a.get("id_pg") and a.get("testo") and v["testo"].strip() == str(a["testo"]).strip():
                    nomi[a["id_pg"]] = v["chi"]
    for d in righe:
        if d.get("tipo") != "turno":
            continue
        for u in d.get("uscita") or []:
            pg = u.get("privato") or (u.get("per") if u.get("tipo") == "usa" and u.get("privata") else None)
            if pg and pg in nomi:
                testi = [u["testo"]] if "testo" in u else [r.get("testo", "") for r in u.get("righe") or []]
                out.setdefault((int(d["turno"]), nomi[pg]), []).extend(testi)
    return out


def candidati(testo_tavolo: str, narrazioni: Path | None = None) -> list[dict]:
    turni = leggi_tavolo(testo_tavolo)
    nomi_personaggi = {p for voci in turni.values() for v in voci for p in parole(v["chi"])} - {"narratore"}
    esiti = esiti_privati(narrazioni, turni)
    pubbliche = {n: " ".join(v["testo"] for v in voci if v["giocatore"] and not v["privata"]) for n, voci in turni.items()}
    png = {v["chi"] for voci in turni.values() for v in voci if not v["giocatore"] and v["chi"] != "Narratore"}
    out = []
    for t, voci in sorted(turni.items()):
        for a in (v for v in voci if v["privata"]):
            pg = a["chi"]
            primo = parole(pg)[0]
            testo_privato = " ".join([a["testo"], *esiti.get((t, pg), [])])
            mie = radici(testo_privato, nomi_personaggi)
            # The NPCs the private action speaks to (by first name).
            verso = {n for n in png if parole(n) and re.search(rf"\b{re.escape(parole(n)[0])}\b", norm(a["testo"]))}
            for n in range(t, t + OTTO + 1):
                dette = set().union(*(radici(pubbliche.get(k, ""), nomi_personaggi) for k in range(t, n + 1)))
                for v in turni.get(n, []):
                    if v["giocatore"]:
                        continue
                    w = set(parole(v["testo"]))
                    nomina = primo in w or any(parole(x)[0] in w for x in verso)
                    comuni = sorted((radici(v["testo"], nomi_personaggi) & mie) - dette)
                    solo_private = n == t and not pubbliche.get(t, "").strip()
                    regola = (
                        "nome+1" if nomina and comuni
                        else "2 radici" if len(comuni) >= 2 and n - t <= VICINI
                        else "turno privato+1" if solo_private and comuni
                        else None
                    )
                    if regola:
                        out.append({"turno": n, "turno_privata": t, "pg": pg, "chi": v["chi"], "riga": v["testo"][:200], "comuni": comuni, "regola": regola})
    return out


def main() -> None:
    tavolo = Path(sys.argv[1])
    narrazioni = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    c = candidati(tavolo.read_text(encoding="utf-8"), narrazioni)
    print(json.dumps({"candidati": len(c), "elenco": c}, ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

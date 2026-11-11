"""tavolo.md of a run plus the dice cards the projector showed, turn by turn (for the blind judge).

    python3 -I tavolo_con_carte.py <results dir> <server logs dir> > tavolo-con-carte.md

The harness's tavolo.md has what the table heard, not the dice cards: the cards come from the server log
(«prove: tiri del turno», field `tiri`, the same strings the Engine sends to the screens). Cards of private
actions go only to that player's phone, so they are left out, as the table never saw them. Combat lines of the
Engine («Combattimento, round …», initiative) come from the same record's `fatti` only when they are public.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def main() -> None:
    ris, logd = Path(sys.argv[1]), Path(sys.argv[2])
    carte: dict[int, list[str]] = {}
    for riga in (logd / "server.jsonl").read_text(encoding="utf-8", errors="replace").splitlines():
        try:
            d = json.loads(riga)
        except json.JSONDecodeError:
            continue
        if d.get("msg") != "prove: tiri del turno":
            continue
        n = int(d.get("turno") or 0)
        for t in d.get("tiri") or []:
            if "(privata)" not in str(t):
                carte.setdefault(n, []).append(str(t))
    testo = (ris / "tavolo.md").read_text(encoding="utf-8")
    out = []
    for blocco in re.split(r"(?=^## Turno )", testo, flags=re.M):
        m = re.match(r"## Turno (\d+)", blocco)
        out.append(blocco.rstrip() + "\n")
        if m and carte.get(int(m.group(1))):
            out.append("\n*Carte dei dadi sul proiettore:* " + " · ".join(carte[int(m.group(1))]) + "\n")
        out.append("\n")
    print("".join(out).rstrip() + "\n")


if __name__ == "__main__":
    main()

"""The facts the narrator received each turn and the cards of the turn, from a test server's log (records
`prove: tiri del turno`, after the run's start), for the live checks (R2, and R6: esperimenti/risultati/regole-r6/README.md).

    python3 -I esperimenti/risultati/regole-r6/fatti.py logs/porta-4981/server.jsonl <run start ISO time> > <dir>/fatti-e-tiri.md
"""
import json
import sys


def main() -> int:
    log, inizio = sys.argv[1], sys.argv[2]
    print("# Facts the narrator received, and the cards of each turn\n")
    print(f"From `{log}` (records `prove: tiri del turno` after {inizio}). What the table heard: the transcript in the panel screenshots (playwright/).\n")
    for riga in open(log, encoding="utf-8"):
        d = json.loads(riga)
        if d.get("msg") != "prove: tiri del turno" or d.get("time", "") < inizio:
            continue
        print(f"## Turn {d.get('turno')}\n")
        for f in d.get("fatti") or []:
            print(f"- {f}")
        for t in d.get("tiri") or []:
            print(f"- *card*: {t}" if isinstance(t, str) else f"- *card*: {t.get('nome')}: {t.get('etichetta')} {t.get('dadi')} → {t.get('totale')} contro {(t.get('contro') or {}).get('valore')} {'riuscita' if t.get('riuscita') else 'fallita'}{' · ' + t['regola'] if t.get('regola') else ''}")
        print()
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""Each dice card of a run with the action text it answered (for counting absurd cards by hand)."""
import json, sys
from pathlib import Path
logd = Path(sys.argv[1])
testi = {}
for l in (logd / "narrazioni.jsonl").read_text().splitlines():
    d = json.loads(l)
    for a in d.get("azioni") or []:
        if a.get("id"): testi[a["id"]] = a.get("testo")
azioni = {}
for l in (logd / "server.jsonl").read_text().splitlines():
    d = json.loads(l)
    if d.get("msg") == "azione: inviata": azioni[d["azione"]] = (d["autore"], d.get("turno"))
for l in (logd / "server.jsonl").read_text().splitlines():
    d = json.loads(l)
    if str(d.get("msg", "")).startswith("prove: azione risolta") and d.get("tiri"):
        for t in d["tiri"]:
            print(f"T{d.get('turno')} {d.get('autore')} [{d.get('azione')}] {str(t.get('regola'))[:80]}")

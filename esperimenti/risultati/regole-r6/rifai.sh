#!/usr/bin/env bash
# The R6 live check from scratch (README.md): exploration on the clock on real pages with manual dice.
#   1. a copy of the invented cunicolo fixture, served on test port 5031 with a fixed dice seed (the Game Master's
#      rolls — the torch's burning time, the wandering checks, the table — then fall as README.md tells);
#   2. a copy of torre-mozza with creation at the table, served on test port 5032 (in the scratch folder: it is the real
#      campaign, only its campagna.yaml changes; its images and audio are read from the original);
# then apps/web/e2e/esplorazione.spec.ts, the facts and cards of both runs from the server logs, and both servers are
# stopped. The PC built goes to the copy's pg-creati/ (TAGM_PG_CREATI), never into campagne/.
set -euo pipefail
cd "$(dirname "$0")/../../.."
R=esperimenti/risultati/regole-r6
SCRATCH=${TMPDIR:-/tmp}
C=$SCRATCH/tagm-r6-cunicolo
TM=$SCRATCH/tagm-r6-torre-mozza
# A fresh Game Master token for each run (the servers' logs print it; it must never be a string tracked in git).
TOKEN=$(python3 -c 'import secrets; print(secrets.token_hex(12))')
# The seed found by replaying the crawl's windows on the Engine: the torch out at the 5th window, a giant rat at the 7th.
SEME=a004b669

rm -rf "$C" "$TM" "$R/playwright"
cp -R apps/server/test/fixtures/campagne/cunicolo "$C"
mkdir -p "$TM"
for f in campagne/torre-mozza/*; do case "$(basename "$f")" in audio|immagini|pg-creati) ;; *) cp -R "$f" "$TM/" ;; esac; done
python3 - "$TM/campagna.yaml" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
t = p.read_text()
assert "  tiri_giocatori: manuale\n" in t
p.write_text(t.replace("  tiri_giocatori: manuale\n", "  tiri_giocatori: manuale\n  creazione: {modo: entrambi}\n", 1))
PY

rm -rf logs/porta-5031 logs/porta-5032
INIZIO=$(python3 -c 'import datetime; print(datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"))')
ferma() { TAGM_PORTA=5031 scripts/arresto.sh >/dev/null 2>&1 || true; TAGM_PORTA=5032 scripts/arresto.sh >/dev/null 2>&1 || true; }
trap ferma EXIT
TAGM_PORTA=5031 TAGM_MASTER_TOKEN=$TOKEN TAGM_CARTELLA_CAMPAGNA="$C" TAGM_SEME_DADI=$SEME \
  TAGM_TIRI_GIOCATORI=manuale scripts/avvio.sh --finto --mock
TAGM_PORTA=5032 TAGM_MASTER_TOKEN=$TOKEN TAGM_CARTELLA_CAMPAGNA="$TM" TAGM_PG_CREATI="$TM/pg-creati" \
  TAGM_IMMAGINI="$PWD/campagne/torre-mozza/immagini" TAGM_AUDIO="$PWD/campagne/torre-mozza/audio" \
  TAGM_TIRI_GIOCATORI=manuale scripts/avvio.sh --finto --mock

(cd apps/web && E2E_PORTA=5031 E2E_URL_TM=http://localhost:5032 E2E_MASTER_TOKEN=$TOKEN \
  npx playwright test -c playwright.config.ts e2e/esplorazione.spec.ts)

# Evidence: what the narrator received and the cards, turn by turn (the server logs), and the PC built.
python3 -I $R/fatti.py logs/porta-5031/server.jsonl "$INIZIO" > $R/fatti-e-tiri-cunicolo.md
python3 -I $R/fatti.py logs/porta-5032/server.jsonl "$INIZIO" > $R/fatti-e-tiri-torre-mozza.md
python3 - "$R" <<'PY'
import json, sys
from pathlib import Path
r = Path(sys.argv[1])
righe = []
for porta in (5031, 5032):
    f = Path(f"logs/porta-{porta}/server.jsonl")
    for l in f.read_text().splitlines() if f.exists() else []:
        try:
            x = json.loads(l)
        except ValueError:
            continue
        m = str(x.get("msg", ""))
        if x.get("modulo") in ("esplorazione", "vaganti", "provviste", "fatica") or m.startswith(("exploration:", "wandering:", "supplies:", "light:", "travel:", "Game Master roll")):
            for k in ("time", "pid", "hostname"):
                x.pop(k, None)
            righe.append(f"{porta} {json.dumps(x, ensure_ascii=False)}")
(r / "log-esplorazione.jsonl").write_text("\n".join(righe) + "\n")
PY
mkdir -p "$R/pg-creati"
cp "$TM"/pg-creati/*.yaml "$R/pg-creati/" 2>/dev/null || true
echo "R6 live check: evidence in $R"

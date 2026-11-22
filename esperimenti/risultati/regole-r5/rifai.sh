#!/usr/bin/env bash
# The R5 live check from scratch (README.md): creation at the table on real pages with manual dice.
#   1. a two-session copy of the invented fucina fixture (campagna/fucina), served on test port 5021;
#   2. a copy of torre-mozza with creation at the table, served on test port 5022 (in the scratch folder: it is the real
#      campaign, only its campagna.yaml changes; its images and audio are read from the original);
# then apps/web/e2e/creazione.spec.ts, and both servers are stopped. The PCs built go to each copy's pg-creati/
# (TAGM_PG_CREATI), never into campagne/.
set -euo pipefail
cd "$(dirname "$0")/../../.."
R=esperimenti/risultati/regole-r5
C=$R/campagna/fucina
TM=${TMPDIR:-/tmp}/tagm-r5-torre-mozza
# A fresh Game Master token for each run (the servers' logs print it; it must never be a string tracked in git).
TOKEN=$(python3 -c 'import secrets; print(secrets.token_hex(12))')

# 1. The fucina copy as a campaign of packages: sessioni/01 from its scena.yaml.
rm -rf "$C" "$R/playwright" "$R/pacchetto-02.txt"
mkdir -p "$(dirname "$C")"
cp -R apps/server/test/fixtures/campagne/fucina "$C"
mkdir -p "$C/sessioni/01/scene"
mv "$C/scena.yaml" "$C/sessioni/01/scene/scena_fucina.yaml"
python3 - "$C" <<'PY'
import sys
from pathlib import Path
c = Path(sys.argv[1])
p = c / "campagna.yaml"
t = p.read_text().replace("sessione:\n  riassunto_iniziale: Siete alla fucina di Orsola, pronti a partire.\n", "")
p.write_text(t + "# This copy is the R5 live check's two-session campaign (esperimenti/risultati/regole-r5/rifai.sh).\n")
(c / "sessioni/01/sessione.yaml").write_text('titolo: "La fucina di Orsola"\nriassunto_iniziale: "Siete alla fucina di Orsola, pronti a partire."\nscene: [scena_fucina]\n')
PY

# 2. The torre-mozza copy: creation at the table and pregenerated PCs both.
rm -rf "$TM"
mkdir -p "$TM"
for f in campagne/torre-mozza/*; do case "$(basename "$f")" in audio|immagini) ;; *) cp -R "$f" "$TM/" ;; esac; done
python3 - "$TM/campagna.yaml" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
t = p.read_text()
assert "  tiri_giocatori: manuale\n" in t
p.write_text(t.replace("  tiri_giocatori: manuale\n", "  tiri_giocatori: manuale\n  creazione: {modo: entrambi}\n", 1))
PY

# Fresh logs and archives for the two test ports (the evidence quotes their creation lines).
rm -rf logs/porta-5021 logs/porta-5022 "$R/pg-creati"

ferma() { TAGM_PORTA=5021 scripts/arresto.sh >/dev/null 2>&1 || true; TAGM_PORTA=5022 scripts/arresto.sh >/dev/null 2>&1 || true; }
trap ferma EXIT
TAGM_PORTA=5021 TAGM_MASTER_TOKEN=$TOKEN TAGM_CARTELLA_CAMPAGNA="$PWD/$C" TAGM_PG_CREATI="$PWD/$C/pg-creati" \
  TAGM_TIRI_GIOCATORI=manuale scripts/avvio.sh --finto --mock
TAGM_PORTA=5022 TAGM_MASTER_TOKEN=$TOKEN TAGM_CARTELLA_CAMPAGNA="$TM" TAGM_PG_CREATI="$TM/pg-creati" \
  TAGM_IMMAGINI="$PWD/campagne/torre-mozza/immagini" TAGM_AUDIO="$PWD/campagne/torre-mozza/audio" \
  TAGM_TIRI_GIOCATORI=manuale scripts/avvio.sh --finto --mock

(cd apps/web && E2E_PORTA=5021 E2E_URL_TM=http://localhost:5022 E2E_CAMPAGNA="$PWD/../../$C" E2E_MASTER_TOKEN=$TOKEN \
  npx playwright test -c playwright.config.ts e2e/creazione.spec.ts)

# Evidence: the PCs built, the log's end of session 1, the package of session 2, the creation lines of the server logs.
mkdir -p "$R/pg-creati"
cp "$C"/pg-creati/*.yaml "$R/pg-creati/"
cp "$TM"/pg-creati/*.yaml "$R/pg-creati/"
python3 - "$C" "$R" <<'PY'
import json, sys
from pathlib import Path
import yaml
c, r = Path(sys.argv[1]), Path(sys.argv[2])
reg = yaml.safe_load((c / "sessioni/01/registro.yaml").read_text())
(r / "pg_alla_fine-01.yaml").write_text(yaml.safe_dump({"pg_alla_fine": reg.get("pg_alla_fine")}, allow_unicode=True, sort_keys=False))
righe = []
for porta in (5021, 5022):
    f = Path(f"logs/porta-{porta}/server.jsonl")
    for l in f.read_text().splitlines() if f.exists() else []:
        try:
            x = json.loads(l)
        except ValueError:
            continue
        if x.get("modulo") == "creazione" or "creation" in str(x.get("msg", "")):
            x.pop("time", None); x.pop("pid", None); x.pop("hostname", None)
            righe.append(f"{porta} {json.dumps(x, ensure_ascii=False)}")
(r / "log-creazione.jsonl").write_text("\n".join(righe) + "\n")
PY
echo "fatto: $R"

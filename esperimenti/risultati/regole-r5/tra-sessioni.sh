#!/usr/bin/env bash
# The between-session step of the R5 live check (README.md), run by e2e/creazione.spec.ts after session 1 of the fucina
# copy: the state as the between-session agent writes it (the minimum the step needs), the deterministic
# `tra_sessioni.py pacchetto` (sessioni/02 with pg_all_inizio from the log: the PCs built at the table included), then
# the agent's part of the package (the title, the summary, one scene). Usage: tra-sessioni.sh <campaign copy>
set -euo pipefail
cd "$(dirname "$0")/../../.."
C="$1"
mkdir -p "$C/stato"
cat > "$C/stato/stato.yaml" <<'YML'
# Stato dopo la sessione 1 (live check R5): il minimo che serve a strumenti/tra_sessioni.py pacchetto.
versione: 1
dopo_sessione: 1
fatti: []
orologi: {}
YML
python3 strumenti/tra_sessioni.py pacchetto "$C" 1
python3 - "$C" <<'PY'
import sys
from pathlib import Path
import yaml
c = Path(sys.argv[1])
p = c / "sessioni/02/sessione.yaml"
d = yaml.safe_load(p.read_text())
d["titolo"] = "La strada del nord"
d["riassunto_iniziale"] = "Usciti dalla fucina di Orsola, avete preso la strada del nord."
d["scene"] = ["scena_strada"]
p.write_text(yaml.safe_dump(d, allow_unicode=True, sort_keys=False))
s = yaml.safe_load((c / "sessioni/01/scene/scena_fucina.yaml").read_text())
s.update(id="scena_strada", nodo="n_strada", nome="La strada del nord", descrizione="Una strada fangosa tra i pini, verso nord.",
         apertura="La strada sale tra i pini. Che fate?", png_presenti=[])
(c / "sessioni/02/scene").mkdir(parents=True, exist_ok=True)
(c / "sessioni/02/scene/scena_strada.yaml").write_text(yaml.safe_dump(s, allow_unicode=True, sort_keys=False))
PY

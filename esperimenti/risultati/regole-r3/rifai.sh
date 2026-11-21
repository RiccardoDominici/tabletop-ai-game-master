#!/usr/bin/env bash
# The R3 live check from scratch (README.md): a two-session copy of the invented cripta fixture, session 1 with manual
# rolls, the between-session step (the state as the agent writes it, `tra_sessioni.py pacchetto`, the agent's part of
# the package), session 2 with the level-up. Test ports 4991 and 4992; stops what it starts.
set -euo pipefail
cd "$(dirname "$0")/../../.."
R=esperimenti/risultati/regole-r3
C=$R/campagna/cripta
SEME=0123456789abcdef
GIOCATORI=00112233445566778899aabbccddeeff

# The campaign: the fixture as a campaign of packages (sessioni/01 from its scena.yaml).
rm -rf "$C" "$R/sessione-1" "$R/sessione-2"
mkdir -p "$(dirname "$C")"
cp -R apps/server/test/fixtures/campagne/cripta "$C"
mkdir -p "$C/sessioni/01/scene"
mv "$C/scena.yaml" "$C/sessioni/01/scene/scena_cripta.yaml"
python3 - "$C" <<'PY'
import sys
from pathlib import Path
c = Path(sys.argv[1])
p = c / "campagna.yaml"
t = p.read_text().replace("sessione:\n  riassunto_iniziale: Siete scesi nella cripta sotto il mulino.\n", "")
p.write_text(t + "# This copy is the R3 live check's two-session campaign (esperimenti/risultati/regole-r3/rifai.sh).\n")
(c / "sessioni/01/sessione.yaml").write_text('titolo: "La cripta del mulino"\nriassunto_iniziale: "Siete scesi nella cripta sotto il mulino, dove qualcuno ha svegliato i morti."\nscene: [scena_cripta]\n')
PY

# Session 1: listen (secret), turn undead, the fight, the treasure; «Chiudi la sessione» writes sessioni/01/registro.yaml.
TAGM_PORTA=4991 TAGM_SEME_DADI=$SEME npx tsx apps/server/src/esperimenti/esegui.ts esperimenti/copioni/regole-r3/cripta-1.yaml \
  A --cartella "$C" --finto --tiri manuale --seme-giocatori $GIOCATORI --chiudi --uscita regole-r3/sessione-1
S1=$(python3 -c "import json;print(json.load(open('$R/sessione-1/riepilogo.json'))['sessione'])")
python3 -I esperimenti/risultati/regole-r2/fatti.py logs/porta-4991/server.jsonl "$S1" > "$R/sessione-1/fatti-e-tiri.md"

# Between the sessions. The state, as the between-session agent writes it (the minimum the step needs).
mkdir -p "$C/stato"
cat > "$C/stato/stato.yaml" <<'YML'
# Stato dopo la sessione 1 (live check R3): scritto come lo scrive l'agente tra le sessioni, il minimo che serve a
# strumenti/tra_sessioni.py pacchetto. I PG sono ancora al livello con cui hanno giocato; il pacchetto li fa salire.
versione: 1
dopo_sessione: 1
fatti: []
orologi:
  o_ladri: {pieni: 0, fonte: {sessione: 1}}
pg:
  pg_tessa: {livello: 1, fonte: {sessione: 1}}
  pg_oreste: {livello: 1, fonte: {sessione: 1}}
  pg_gaia: {livello: 1, fonte: {sessione: 1}}
YML
# The deterministic step: the skeleton of sessioni/02 with pg_all_inizio from the log, the level-up included.
python3 strumenti/tra_sessioni.py pacchetto "$C" 1 | tee "$R/pacchetto.txt"
# The agent's part of the package: the summary, the scene, two nights of rest for Tessa, Oreste's new spell, the hour.
python3 - "$C" <<'PY'
import sys
from pathlib import Path
import yaml
c = Path(sys.argv[1])
p = c / "sessioni/02/sessione.yaml"
t = p.read_text()
d = yaml.safe_load(t)
d["titolo"] = "Il mulino all'alba"
d["riassunto_iniziale"] = "Due notti dopo la cripta, Tessa si è rimessa in piedi e il gruppo è tornato al mulino con le monete dei ladri di tombe."
d["scene"] = ["scena_mulino"]
d["pg_all_inizio"]["pg_tessa"]["pf"] = 2
d["pg_all_inizio"]["pg_oreste"]["incantesimi"] = ["cura_ferite"]
d["tempo_all_inizio"] = {"giorno": 3, "ora": 7, "minuto": 0}
intest = "".join(l + "\n" for l in t.splitlines() if l.startswith("#"))
intest += ("# Completato come lo completa l'agente tra le sessioni (rifai.sh): riassunto, scena, due notti di riposo per Tessa\n"
           "# (pf 2), l'incantesimo che Oreste prepara nel posto nuovo del 2° livello, l'ora. Il livello, pf_massimi e pf_da_tirare\n"
           "# li ha scritti tra_sessioni.py: i punti ferita del livello li tira il giocatore al tavolo.\n")
p.write_text(intest + yaml.safe_dump(d, allow_unicode=True, sort_keys=False, width=110))
(c / "sessioni/02/scene").mkdir(parents=True, exist_ok=True)
(c / "sessioni/02/scene/scena_mulino.yaml").write_text("""id: scena_mulino
nodo: n_mulino
nome: Il mulino all'alba
descrizione: La stanza delle macine, con la farina che vola nella luce dell'alba. Il sacco di monete dei ladri è sul tavolo; dalla botola sale ancora l'odore della cripta.
domanda_drammatica: Il gruppo si rimetterà in sesto prima di inseguire i ladri di tombe?
intensita: 2
sensi:
- L'odore della farina.
- Il cigolio della ruota del mulino.
- La luce dell'alba tra le assi.
elementi_interattivi:
- cosa: il sacco di monete
  dove: sul tavolo
  azioni: si conta
- cosa: la botola
  dove: nel pavimento
  azioni: si apre
png_presenti: []
orologi_attivi:
- o_ladri
mossa_morbida_pronta: Dalla botola sale un rumore di passi.
apertura: L'alba entra tra le assi del mulino. Il sacco di monete è sul tavolo. Che fate?
musica:
  tag: calma
taglio: Si chiude quando il gruppo scende di nuovo nella cripta.
""")
PY

# Session 2: the level-up's hit die asked of Oreste's player at the first window; his new slot cures Tessa.
TAGM_PORTA=4992 TAGM_SESSIONE=2 TAGM_SEME_DADI=$SEME npx tsx apps/server/src/esperimenti/esegui.ts esperimenti/copioni/regole-r3/cripta-2.yaml \
  A --cartella "$C" --finto --tiri manuale --seme-giocatori $GIOCATORI --uscita regole-r3/sessione-2
S2=$(python3 -c "import json;print(json.load(open('$R/sessione-2/riepilogo.json'))['sessione'])")
python3 -I esperimenti/risultati/regole-r2/fatti.py logs/porta-4992/server.jsonl "$S2" > "$R/sessione-2/fatti-e-tiri.md"
for p in 4991 4992; do TAGM_PORTA=$p scripts/arresto.sh >/dev/null 2>&1 || true; done
echo "fatto: $R"

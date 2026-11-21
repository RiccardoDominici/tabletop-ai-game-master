#!/usr/bin/env bash
# The R4 live check from scratch (README.md): the campaign copy of the invented tana fixture (campagna.py), three runs
# on it with manual rolls (the den, the ash pit, the lantern room) and one on torre-mozza. Test ports 5013–5016; stops
# what it starts.
set -euo pipefail
cd "$(dirname "$0")/../../.."
R=esperimenti/risultati/regole-r4
C=$R/campagna/tana
GIOCATORI=00112233445566778899aabbccddeeff
python3 -I $R/campagna.py apps/server/test/fixtures/campagne/tana "$C"

# One run: script, port, the Engine's dice seed, output folder; then the facts and cards from the server log.
corsa() {
  local copione=$1 porta=$2 seme=$3 uscita=$4; shift 4
  TAGM_PORTA=$porta TAGM_SEME_DADI=$seme npx tsx apps/server/src/esperimenti/esegui.ts esperimenti/copioni/regole-r4/$copione.yaml \
    A "$@" --finto --tiri manuale --seme-giocatori $GIOCATORI --uscita regole-r4/$uscita
  local inizio
  inizio=$(python3 -c "import json;print(json.load(open('$R/$uscita/riepilogo.json'))['sessione'])")
  python3 -I esperimenti/risultati/regole-r2/fatti.py logs/porta-$porta/server.jsonl "$inizio" > "$R/$uscita/fatti-e-tiri.md"
  TAGM_PORTA=$porta scripts/arresto.sh >/dev/null 2>&1 || true
}

# The den: three attacks a round, a paralysing claw, morale at the first opposition and at half strength, a PC at 0 when
# the Game Master ends the fight (the dice seeds were chosen so the turns show it; README.md).
corsa tana 5013 0123456789abcdef tana --cartella "$C"
# The ash pit: the fight opened from the panel (both sides roll surprise, the snake's ambush on 1–4), the breath halved
# by a save, an arrow into the melee, the snake's poison.
corsa cenere 5014 13579bdf2468ace0 cenere --cartella "$C"
# The lantern room: only silver or magic hurts the wraith.
corsa lanterna 5015 0123456789abcdef lanterna --cartella "$C"
# torre-mozza, the real Basic Fantasy set: Grosso and Zirrà from the bestiary, subduing damage, a stone into the melee.
corsa torre-grosso 5016 0123456789abcdef torre-mozza-manuale --campagna torre-mozza
echo "fatto: $R"

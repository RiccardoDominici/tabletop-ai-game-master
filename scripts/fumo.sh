#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/ambiente.sh"
# Smoke test of a fresh setup: a short scripted game on a test port, with the scripted narrator and the fake voice.
# No API call, no model load. It proves that server, pages, turns and logs work on this computer.
#
#   scripts/fumo.sh                 port 4790 (default)
#   TAGM_PORTA=4800 scripts/fumo.sh
#
# Never uses 4610 (the real game) or 4611/4612 (voice, Vite). Result: logs/porta-<porta>/fumo-riepilogo.json.
# Prints FUMO OK, or FUMO FALLITO with the place to look.
set -uo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${TAGM_PORTA:-4790}"
case "$PORTA" in
  4610|4611|4612) echo "FUMO FALLITO: porta $PORTA riservata (partita vera, voce, Vite): scegline un'altra" >&2; exit 2 ;;
esac
if ! [[ "$PORTA" =~ ^[0-9]+$ ]]; then echo "FUMO FALLITO: porta non valida: $PORTA" >&2; exit 2; fi

USCITA="fumo-$PORTA"
DIR_LOG="$RADICE/logs/porta-$PORTA"
RISULTATI="$RADICE/esperimenti/risultati/$USCITA"
mkdir -p "$DIR_LOG"
cd "$RADICE" || exit 2

# Copione «indagine» della campagna di prova (esperimenti/copioni/indagine.yaml), narratore finto, voce finta.
# esegui.ts avvia da sé il server sulla porta indicata (scripts/avvio.sh --finto --mock).
TAGM_PORTA="$PORTA" "$RADICE/node_modules/.bin/tsx" apps/server/src/esperimenti/esegui.ts \
  indagine B --finto --uscita "$USCITA" > "$DIR_LOG/fumo.out" 2>&1
ESITO=$?

# Il server di questa porta si ferma comunque: solo lui, mai le altre istanze.
TAGM_PORTA="$PORTA" "$RADICE/scripts/arresto.sh" >> "$DIR_LOG/fumo.out" 2>&1 || true

RIEPILOGO="$RISULTATI/riepilogo.json"
if [[ $ESITO -eq 0 && -f "$RIEPILOGO" ]] && python3 -I -c "import json,sys; json.load(open(sys.argv[1]))" "$RIEPILOGO" 2>/dev/null; then
  # Si tiene il riepilogo nei log (ignorati da git) e si toglie la cartella dei risultati, che è di questo test.
  cp "$RIEPILOGO" "$DIR_LOG/fumo-riepilogo.json"
  rm -rf "$RISULTATI"
  echo "FUMO OK: a short scripted game on port $PORTA (summary: $DIR_LOG/fumo-riepilogo.json)."
  exit 0
fi
echo "FUMO FALLITO: the scripted game did not finish (exit $ESITO). Look at $DIR_LOG/fumo.out and $DIR_LOG/server.out."
exit 1

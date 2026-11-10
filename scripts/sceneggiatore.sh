#!/usr/bin/env bash
# Lo sceneggiatore (docs/sceneggiatore.md): Claude Code scrive, mentre si gioca, le battute che il
# lettore locale non trova. È un processo a parte che legge le richieste del server dalla cartella
# sorvegliata <log>/sceneggiatore/ e risponde accanto; usa `claude -p` (l'abbonamento di chi gioca,
# mai l'API diretta) e non tocca credenziali né ~/.claude.
#
#   scripts/sceneggiatore.sh avvia|ferma|stato        (CANTASTORIE_PORTA sceglie l'istanza, come avvio.sh)
#
#   CANTASTORIE_SCENEGGIATORE=no                spento (avvio.sh: sulle istanze di prova parte solo con =si)
#   modelli: le battute «subito» con sonnet (una battuta in ~4 s), le «prossime» in sottofondo con haiku;
#   CANTASTORIE_SCENEGGIATORE_MODELLO_SUBITO / _PROSSIME li cambiano, CANTASTORIE_SCENEGGIATORE_MODELLO tutti e due
# Log: <log>/sceneggiatore/sceneggiatore.out e sceneggiatore.jsonl (una riga per richiesta).
set -uo pipefail
RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${CANTASTORIE_PORTA:-4610}"
if [[ "$PORTA" == "4610" ]]; then DIR_LOG="$RADICE/logs"; else DIR_LOG="$RADICE/logs/porta-$PORTA"; fi
DIR="$DIR_LOG/sceneggiatore"
FILE_PID="$DIR/sceneggiatore.pid"
COMANDO="${1:-avvia}"

ferma() {
  [[ -f "$FILE_PID" ]] || { echo "sceneggiatore: non gira"; return 0; }
  local p; p="$(cat "$FILE_PID")"
  if [[ -n "$p" ]] && kill -0 "$p" 2>/dev/null; then
    kill -TERM "$p" 2>/dev/null || true
    for _ in $(seq 1 30); do kill -0 "$p" 2>/dev/null || break; sleep 0.1; done
    kill -0 "$p" 2>/dev/null && kill -KILL "$p" 2>/dev/null
    echo "sceneggiatore: fermato (pid $p)"
  fi
  rm -f "$FILE_PID"
}

case "$COMANDO" in
  ferma) ferma; exit 0 ;;
  stato)
    if [[ -f "$FILE_PID" ]] && kill -0 "$(cat "$FILE_PID")" 2>/dev/null; then echo "sceneggiatore: gira (pid $(cat "$FILE_PID"))"; else echo "sceneggiatore: non gira"; fi
    exit 0 ;;
  avvia) ;;
  *) echo "uso: scripts/sceneggiatore.sh avvia|ferma|stato"; exit 2 ;;
esac

if [[ "${CANTASTORIE_SCENEGGIATORE:-auto}" == "no" ]]; then echo "sceneggiatore: spento (CANTASTORIE_SCENEGGIATORE=no)"; exit 0; fi
# Claude Code installato? (il binario, non una funzione della shell)
if ! command -v claude >/dev/null 2>&1; then echo "sceneggiatore: claude non è installato, il tavolo userà solo le battute d'attesa"; exit 0; fi
ferma >/dev/null
mkdir -p "$DIR"
echo "=== avvio $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$DIR/sceneggiatore.out"
cd "$RADICE"
nohup npx tsx apps/server/src/sceneggiatore/processo.ts --radice "$DIR" >> "$DIR/sceneggiatore.out" 2>&1 &
echo "$!" > "$FILE_PID"
echo "sceneggiatore: avviato (pid $!; log in ${DIR#$RADICE/}/)"

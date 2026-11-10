#!/usr/bin/env bash
# Ferma il server locale dei modelli (scripts/lettore-avvio.sh), solo se l'ha avviato quello script.
set -uo pipefail
RADICE="$(cd "$(dirname "$0")/.." && pwd)"
FILE_PID="$RADICE/logs/lettore.pid"
[[ -f "$FILE_PID" ]] || { echo "lettore locale: nessuna istanza avviata dagli script"; exit 0; }
PID="$(cat "$FILE_PID")"
if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
  kill -TERM "$PID" 2>/dev/null || true
  for _ in $(seq 1 50); do kill -0 "$PID" 2>/dev/null || break; sleep 0.1; done
  kill -0 "$PID" 2>/dev/null && kill -KILL "$PID" 2>/dev/null
  echo "lettore locale: fermato (pid $PID)"
fi
rm -f "$FILE_PID"

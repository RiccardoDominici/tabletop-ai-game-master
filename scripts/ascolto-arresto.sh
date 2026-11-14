#!/usr/bin/env bash
# Stops the local speech-to-text server (scripts/ascolto-avvio.sh), only if that script started it.
set -uo pipefail
RADICE="$(cd "$(dirname "$0")/.." && pwd)"
FILE_PID="$RADICE/logs/ascolto.pid"
[[ -f "$FILE_PID" ]] || { echo "local speech-to-text: no instance started by the scripts"; exit 0; }
PID="$(cat "$FILE_PID")"
if [[ -n "$PID" ]] && kill -0 "$PID" 2>/dev/null; then
  kill -TERM "$PID" 2>/dev/null || true
  for _ in $(seq 1 50); do kill -0 "$PID" 2>/dev/null || break; sleep 0.1; done
  kill -0 "$PID" 2>/dev/null && kill -KILL "$PID" 2>/dev/null
  echo "local speech-to-text: stopped (pid $PID)"
fi
rm -f "$FILE_PID"

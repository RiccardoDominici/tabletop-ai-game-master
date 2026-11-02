#!/usr/bin/env bash
# Ferma il servizio voce: il processo in ascolto sulla porta (default 4611) e
# quello registrato in logs/voce.pid (che potrebbe essere ancora in avvio).
# Prima SIGTERM (uvicorn chiude con garbo, max ~3 s), poi SIGKILL.
set -uo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${VOCE_PORTA:-4611}"
FILE_PID="$RADICE/logs/voce.pid"

pids="$(lsof -nP -ti "tcp:$PORTA" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -f "$FILE_PID" ]]; then
  p="$(cat "$FILE_PID")"
  # solo se è davvero il nostro servizio (il pid potrebbe essere stato riusato)
  if [[ -n "$p" ]] && ps -p "$p" -o command= 2>/dev/null | grep -q -- "-m voce"; then
    pids="$pids $p"
  fi
fi
pids="$(echo "$pids" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u | tr '\n' ' ')"

if [[ -z "${pids// /}" ]]; then
  echo "servizio voce: nessuna istanza attiva sulla porta $PORTA"
  rm -f "$FILE_PID"
  exit 0
fi

echo "servizio voce: arresto pid $pids"
kill -TERM $pids 2>/dev/null || true
for _ in $(seq 1 50); do
  vivi=""
  for p in $pids; do kill -0 "$p" 2>/dev/null && vivi="$vivi $p"; done
  [[ -z "$vivi" ]] && break
  sleep 0.1
done
if [[ -n "${vivi:-}" ]]; then
  echo "servizio voce: SIGKILL a$vivi"
  kill -KILL $vivi 2>/dev/null || true
fi
rm -f "$FILE_PID"
echo "servizio voce: fermo"

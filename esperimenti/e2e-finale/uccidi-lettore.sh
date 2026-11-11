#!/usr/bin/env bash
# Pass 3 of the final e2e: kill the local reader (mlx-lm on 4613) on purpose in the middle of a profile-A run,
# to see whether the server's watchdog (provider/sentinella-locale.ts, 28a7bd6) notices it and restarts it.
#   uccidi-lettore.sh <harness.out of the run> <turn of the script after which to kill>
# Prints what it killed and when; then polls 4613 every 5 s until it answers again (or 6 minutes pass).
set -uo pipefail
OUT="$1"; DOPO="$2"
until grep -q "turno $DOPO/" "$OUT" 2>/dev/null; do sleep 2; done
PID="$(lsof -nP -tiTCP:4613 -sTCP:LISTEN | head -1)"
echo "$(date '+%T') turn $DOPO done: kill -9 of the reader on 4613, pid $PID"
kill -9 "$PID"
T0=$(date +%s)
for _ in $(seq 1 72); do
  sleep 5
  if curl -s --max-time 2 http://127.0.0.1:4613/v1/models | grep -q '"data"'; then
    NUOVO="$(lsof -nP -tiTCP:4613 -sTCP:LISTEN | head -1)"
    echo "$(date '+%T') 4613 answers again after $(( $(date +%s) - T0 )) s, new pid $NUOVO"
    exit 0
  fi
done
echo "$(date '+%T') 4613 still down after 6 minutes"
exit 1

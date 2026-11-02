#!/usr/bin/env bash
# Ferma Cantastorie: server (4610), Vite dev (4612) e, salvo --lascia-voce, il servizio voce (4611).
# Prima SIGTERM (il server chiude con garbo socket e scena), poi SIGKILL dopo ~5 s.
set -uo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
LASCIA_VOCE=0
for a in "$@"; do
  case "$a" in
    --lascia-voce) LASCIA_VOCE=1 ;;
    *) echo "opzione sconosciuta: $a" >&2; exit 2 ;;
  esac
done

ferma_porta() {
  local nome="$1" porta="$2" file_pid="$3"
  local pids
  pids="$(lsof -nP -ti "tcp:$porta" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$file_pid" && -f "$file_pid" ]]; then
    local p; p="$(cat "$file_pid")"
    [[ -n "$p" ]] && kill -0 "$p" 2>/dev/null && pids="$pids $p"
  fi
  pids="$(echo "$pids" | tr ' ' '\n' | grep -E '^[0-9]+$' | sort -u | tr '\n' ' ')"
  if [[ -z "${pids// /}" ]]; then
    echo "$nome: nessuna istanza attiva sulla porta $porta"
    [[ -n "$file_pid" ]] && rm -f "$file_pid"
    return 0
  fi
  echo "$nome: arresto pid $pids"
  kill -TERM $pids 2>/dev/null || true
  local vivi=""
  for _ in $(seq 1 50); do
    vivi=""
    for p in $pids; do kill -0 "$p" 2>/dev/null && vivi="$vivi $p"; done
    [[ -z "$vivi" ]] && break
    sleep 0.1
  done
  if [[ -n "$vivi" ]]; then
    echo "$nome: SIGKILL a$vivi"
    kill -KILL $vivi 2>/dev/null || true
  fi
  [[ -n "$file_pid" ]] && rm -f "$file_pid"
  echo "$nome: fermo"
}

ferma_porta "server" 4610 "$RADICE/logs/server.pid"
ferma_porta "vite" 4612 ""
if [[ "$LASCIA_VOCE" == "0" && -x "$RADICE/scripts/voce-arresto.sh" ]]; then
  "$RADICE/scripts/voce-arresto.sh"
fi

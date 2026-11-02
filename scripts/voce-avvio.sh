#!/usr/bin/env bash
# Avvia il servizio voce (Qwen3-TTS locale) su 127.0.0.1:4611 in background.
# Chiude prima eventuali istanze precedenti, poi aspetta che GET /salute dica
# "pronto": true (modello caricato e TUTTE le voci riscaldate).
# Log leggibile: logs/voce.out   Log strutturato: logs/voce.jsonl
set -euo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${VOCE_PORTA:-4611}"
PY="$RADICE/services/voce/.venv/bin/python"
DIR_LOG="$RADICE/logs"
ATTESA_MAX_S="${VOCE_ATTESA_MAX_S:-300}"
URL="http://127.0.0.1:$PORTA/salute"

if [[ ! -x "$PY" ]]; then
  echo "manca il venv del servizio voce. Crealo con:"
  echo "  uv venv --python 3.12 services/voce/.venv"
  echo "  uv pip install --python services/voce/.venv/bin/python -r services/voce/requirements.lock"
  exit 1
fi
mkdir -p "$DIR_LOG"

"$RADICE/scripts/voce-arresto.sh"

cd "$RADICE/services/voce"
echo "=== avvio $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$DIR_LOG/voce.out"
# PYTHONUNBUFFERED: le righe di log arrivano subito in voce.out
VOCE_PORTA="$PORTA" PYTHONUNBUFFERED=1 nohup "$PY" -m voce >> "$DIR_LOG/voce.out" 2>&1 &
PID=$!
echo "$PID" > "$DIR_LOG/voce.pid"
echo "servizio voce: avviato (pid $PID), attendo caricamento e riscaldamento (max ${ATTESA_MAX_S} s)..."

inizio=$SECONDS
while (( SECONDS - inizio < ATTESA_MAX_S )); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "servizio voce: il processo è terminato durante l'avvio. Ultime righe di logs/voce.out:"
    tail -n 30 "$DIR_LOG/voce.out"
    exit 1
  fi
  risposta="$(curl -s --max-time 2 "$URL" || true)"
  if [[ "$risposta" == *'"pronto":true'* ]]; then
    echo "servizio voce: pronto in $(( SECONDS - inizio )) s — $risposta"
    exit 0
  fi
  if [[ "$risposta" == *'"errore_avvio":"'* ]]; then
    echo "servizio voce: avvio fallito — $risposta"
    exit 1
  fi
  sleep 1
done
echo "servizio voce: non pronto dopo ${ATTESA_MAX_S} s (pid $PID lasciato vivo). Vedi logs/voce.out"
exit 1

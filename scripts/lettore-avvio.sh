#!/usr/bin/env bash
# Avvia il server locale dei modelli di linguaggio: mlx-lm (`mlx_lm.server`, API compatibile OpenAI) su
# 127.0.0.1:4613, col modello di config (backend.locale.modello). Serve al lettore e agli arbitri in locale
# (docs/provider.md). Se risponde già, non fa niente. Riusa il KV del prefisso fisso (--prompt-cache-size).
# Una richiesta per volta e prefill a passi corti: con la GPU condivisa con la voce, comandi Metal lunghi
# venivano uccisi da macOS («Impacting Interactivity») e il server restava appeso.
# Altri sistemi: llama.cpp (`llama-server --port 4613`) o Ollama con backend.locale.url e avvio: no.
#   scripts/lettore-avvio.sh [modello]      log: logs/lettore.out, pid: logs/lettore.pid
set -euo pipefail
RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${LETTORE_PORTA:-4613}"
case "$PORTA" in 4610|4611|4612) echo "porta $PORTA riservata" >&2; exit 2 ;; esac
MODELLO="${1:-${MODELLO_LOCALE:-mlx-community/Qwen3-4B-Instruct-2507-4bit}}"
BIN="$RADICE/services/lettore/.venv/bin/mlx_lm.server"
DIR_LOG="$RADICE/logs"
URL="http://127.0.0.1:$PORTA/v1/models"
mkdir -p "$DIR_LOG"

# Già attivo? Non basta /v1/models: si chiede un token (un server col generatore morto risponde ai modelli e
# poi resta appeso sulle richieste vere). Appeso → si ferma e si riavvia.
if curl -s --max-time 2 "$URL" | grep -q '"data"'; then
  if curl -s --max-time 30 "http://127.0.0.1:$PORTA/v1/chat/completions" -H 'content-type: application/json' \
      -d "{\"model\":\"$MODELLO\",\"messages\":[{\"role\":\"user\",\"content\":\"ok\"}],\"max_tokens\":1}" | grep -q '"choices"'; then
    echo "lettore locale: già attivo su :$PORTA"
    exit 0
  fi
  echo "lettore locale: su :$PORTA non genera più, lo riavvio"
  "$RADICE/scripts/lettore-arresto.sh"
  lsof -nP -ti "tcp:$PORTA" -sTCP:LISTEN | xargs kill -TERM 2>/dev/null || true
  sleep 2
fi
if [[ ! -x "$BIN" ]]; then
  echo "lettore locale: manca mlx-lm. Crea il venv con:"
  echo "  uv venv --python 3.12 services/lettore/.venv && uv pip install --python services/lettore/.venv/bin/python mlx-lm"
  exit 1
fi
echo "=== avvio $(date '+%Y-%m-%d %H:%M:%S') $MODELLO ===" >> "$DIR_LOG/lettore.out"
nohup "$BIN" --model "$MODELLO" --host 127.0.0.1 --port "$PORTA" --prompt-cache-size 4 --prompt-concurrency 1 --decode-concurrency 1 --prefill-step-size 256 --log-level WARNING >> "$DIR_LOG/lettore.out" 2>&1 &
PID=$!
echo "$PID" > "$DIR_LOG/lettore.pid"
echo "lettore locale: avviato (pid $PID, $MODELLO), attendo che risponda…"
for _ in $(seq 1 240); do
  if ! kill -0 "$PID" 2>/dev/null; then echo "lettore locale: terminato durante l'avvio. Ultime righe di logs/lettore.out:"; tail -n 20 "$DIR_LOG/lettore.out"; exit 1; fi
  if curl -s --max-time 2 "$URL" | grep -q '"data"'; then
    # Un primo giro carica i pesi: la prima frase vera non paga il caricamento.
    curl -s --max-time 120 "http://127.0.0.1:$PORTA/v1/chat/completions" -H 'content-type: application/json' \
      -d "{\"model\":\"$MODELLO\",\"messages\":[{\"role\":\"user\",\"content\":\"ciao\"}],\"max_tokens\":1}" > /dev/null || true
    echo "lettore locale: pronto su :$PORTA"
    exit 0
  fi
  sleep 0.5
done
echo "lettore locale: non risponde dopo 120 s (vedi logs/lettore.out)"
exit 1

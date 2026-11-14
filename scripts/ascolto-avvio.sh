#!/usr/bin/env bash
# Starts the local speech-to-text server (docs/ascolto.md): whisper.cpp's whisper-server on 127.0.0.1:4614 with the
# model ggml-large-v3-turbo-q5_0.bin (0.57 GB, in the Hugging Face cache). The game server sends it the phones'
# recordings (apps/server/src/dettato/). If it already answers, it does nothing. Metal on Apple silicon.
# The model stays warm: one empty round after start, so the first real recording does not pay the GPU set-up.
#   scripts/ascolto-avvio.sh [model.bin]     log: logs/ascolto.out, pid: logs/ascolto.pid
# Install: brew install whisper.cpp; the model is downloaded by strumenti/configura/configura.py --scarica.
# Variables: ASCOLTO_PORTA (4614), MODELLO_ASCOLTO (path of the .bin), WHISPER_SERVER (path of the binary).
set -euo pipefail
RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${ASCOLTO_PORTA:-4614}"
case "$PORTA" in 4610|4611|4612|4613) echo "port $PORTA is reserved (game, voice, Vite, reader)" >&2; exit 2 ;; esac
FILE_MODELLO="ggml-large-v3-turbo-q5_0.bin"
DIR_LOG="$RADICE/logs"
URL="http://127.0.0.1:$PORTA"
mkdir -p "$DIR_LOG"

if curl -s --max-time 2 "$URL/health" | grep -q '"ok"'; then
  echo "local speech-to-text: already running on :$PORTA"
  exit 0
fi

BIN="${WHISPER_SERVER:-$(command -v whisper-server || true)}"
if [[ -z "$BIN" || ! -x "$BIN" ]]; then
  echo "local speech-to-text: whisper-server is missing. Install it with: brew install whisper.cpp"
  echo "  (without it the phones use the configured reserve, or the players type)"
  exit 1
fi

# The model: argument, MODELLO_ASCOLTO, or the Hugging Face cache (HF_HUB_CACHE, HF_HOME/hub, ~/.cache/huggingface/hub).
MODELLO="${1:-${MODELLO_ASCOLTO:-}}"
if [[ -z "$MODELLO" ]]; then
  CACHE="${HF_HUB_CACHE:-${HF_HOME:+$HF_HOME/hub}}"
  CACHE="${CACHE:-$HOME/.cache/huggingface/hub}"
  MODELLO="$(ls "$CACHE"/models--ggerganov--whisper.cpp/snapshots/*/"$FILE_MODELLO" 2>/dev/null | head -n 1 || true)"
fi
if [[ -z "$MODELLO" || ! -f "$MODELLO" ]]; then
  echo "local speech-to-text: the model $FILE_MODELLO (0.57 GB) is missing. Download it with:"
  echo "  python3 -I strumenti/configura/configura.py --scarica"
  exit 1
fi

echo "=== start $(date '+%Y-%m-%d %H:%M:%S') $(basename "$MODELLO") ===" >> "$DIR_LOG/ascolto.out"
# -sns: no non-speech tokens ([Music], (applause)); language and prompt come with every request.
# Started from the log folder: whisper-server writes no files without --convert, but if it did they would stay there.
cd "$DIR_LOG"
nohup "$BIN" -m "$MODELLO" --host 127.0.0.1 --port "$PORTA" -sns >> "$DIR_LOG/ascolto.out" 2>&1 &
PID=$!
echo "$PID" > "$DIR_LOG/ascolto.pid"
echo "local speech-to-text: started (pid $PID, $(basename "$MODELLO")), waiting for it to answer…"
for _ in $(seq 1 240); do
  if ! kill -0 "$PID" 2>/dev/null; then echo "local speech-to-text: exited while starting. Last lines of logs/ascolto.out:"; tail -n 20 "$DIR_LOG/ascolto.out"; exit 1; fi
  if curl -s --max-time 2 "$URL/health" | grep -q '"ok"'; then
    # One empty round (a second of silence): the first real sentence does not pay the GPU set-up.
    RISCALDA="$DIR_LOG/ascolto-riscaldamento.wav"
    if command -v ffmpeg > /dev/null && ffmpeg -loglevel error -y -f lavfi -i anullsrc=r=16000:cl=mono -t 1 -c:a pcm_s16le "$RISCALDA" 2>/dev/null; then
      curl -s --max-time 60 "$URL/inference" -F file=@"$RISCALDA" -F language=it -F response_format=json > /dev/null || true
      rm -f "$RISCALDA"
    fi
    echo "local speech-to-text: ready on :$PORTA"
    exit 0
  fi
  sleep 0.5
done
echo "local speech-to-text: no answer after 120 s (see logs/ascolto.out)"
exit 1

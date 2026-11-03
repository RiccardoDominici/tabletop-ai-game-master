#!/usr/bin/env bash
# Prepara lo strumento audio: ambiente Python (uv) e SoundFont GeneralUser GS in cache/audio/soundfont/.
# Si lancia dalla radice del repository o da qui; è idempotente (salta ciò che c'è già).
set -euo pipefail
QUI="$(cd "$(dirname "$0")" && pwd)"
RADICE="$(cd "$QUI/../.." && pwd)"
SF_DIR="$RADICE/cache/audio/soundfont"
SF="$SF_DIR/GeneralUser-GS.sf2"
# GeneralUser GS 2.0.3 (S. Christian Collins). Licenza: uso libero, anche commerciale e dentro software
# (documentation/LICENSE.txt del repository). L'autore chiede di non fare hotlink dalle pagine web: qui
# lo scarichiamo UNA volta e lo teniamo in cache, fuori da git.
SF_URL="https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2"
SF_SHA="9575028c7a1f589f5770fccc8cff2734566af40cd26ed836944e9a5152688cfe"

if [ ! -x "$QUI/.venv/bin/python" ]; then
  uv venv --python 3.12 "$QUI/.venv"
fi
uv pip install --python "$QUI/.venv/bin/python" -r "$QUI/requirements.txt"

mkdir -p "$SF_DIR"
if [ ! -f "$SF" ]; then
  echo "scarico il SoundFont (32 MB)…"
  curl -fsSL -A "Cantastorie-audio-pipeline/0.1" -o "$SF.parziale" "$SF_URL"
  mv "$SF.parziale" "$SF"
fi
echo "$SF_SHA  $SF" | shasum -a 256 -c -
command -v ffmpeg >/dev/null || test -x /opt/homebrew/bin/ffmpeg || { echo "manca ffmpeg"; exit 1; }
echo "pronto: strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id> --dry-run"

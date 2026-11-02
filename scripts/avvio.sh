#!/usr/bin/env bash
# Avvia Cantastorie (F0): ferma le istanze precedenti, avvia il servizio voce, compila le pagine,
# avvia il server su 0.0.0.0:4610 in background e stampa gli indirizzi per telefoni e proiettore.
#
# Opzioni:
#   --mock        voce finta (CANTASTORIE_TTS=mock): il servizio voce non si tocca
#   --tieni-voce  se il servizio voce è già pronto non lo riavvia (risparmia il caricamento)
#   --finto       narratore a copione (CANTASTORIE_LLM=finto): nessuna chiamata ad Anthropic
# Le altre variabili CANTASTORIE_* dell'ambiente passano al server (vedi apps/server/src/config.ts).
#
# Log: logs/server.out (leggibile), logs/server.jsonl (strutturato), logs/turni.jsonl, logs/costi.jsonl
set -euo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
DIR_LOG="$RADICE/logs"
PORTA=4610
MOCK=0; TIENI_VOCE=0; FINTO=0
for a in "$@"; do
  case "$a" in
    --mock) MOCK=1 ;;
    --tieni-voce) TIENI_VOCE=1 ;;
    --finto) FINTO=1 ;;
    *) echo "opzione sconosciuta: $a" >&2; exit 2 ;;
  esac
done
mkdir -p "$DIR_LOG"
cd "$RADICE"

# 1. Istanze precedenti: server e Vite sempre; la voce solo se la riavviamo.
"$RADICE/scripts/arresto.sh" --lascia-voce

# 2. Servizio voce.
if [[ "$MOCK" == "1" ]]; then
  export CANTASTORIE_TTS=mock
  echo "voce: finta (--mock)"
elif [[ -x "$RADICE/scripts/voce-avvio.sh" ]]; then
  if [[ "$TIENI_VOCE" == "1" ]] && curl -s --max-time 2 http://127.0.0.1:4611/salute | grep -q '"pronto":true'; then
    echo "voce: servizio già pronto, non lo riavvio (--tieni-voce)"
  elif ! "$RADICE/scripts/voce-avvio.sh"; then
    echo "voce: il servizio non è partito: il server userà la voce finta finché non torna (modo auto)"
  fi
else
  echo "voce: scripts/voce-avvio.sh assente, il server userà la voce finta (modo auto)"
fi

# 3. Pagine web.
echo "web: compilo le pagine…"
npm run build --silent >> "$DIR_LOG/build.out" 2>&1 || { echo "web: compilazione fallita, vedi logs/build.out"; tail -n 20 "$DIR_LOG/build.out"; exit 1; }

# 4. Server. Le variabili ANTHROPIC_* della shell puntano a un proxy locale: non devono arrivare
#    al server (che fissa comunque baseURL e le toglie dal proprio ambiente).
[[ "$FINTO" == "1" ]] && export CANTASTORIE_LLM=finto
echo "=== avvio $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$DIR_LOG/server.out"
env -u ANTHROPIC_BASE_URL -u ANTHROPIC_CUSTOM_HEADERS -u ANTHROPIC_AUTH_TOKEN -u ANTHROPIC_API_KEY \
  nohup npm run start --silent >> "$DIR_LOG/server.out" 2>&1 &
PID=$!
echo "$PID" > "$DIR_LOG/server.pid"

for _ in $(seq 1 60); do
  if ! kill -0 "$PID" 2>/dev/null; then
    echo "server: terminato durante l'avvio. Ultime righe di logs/server.out:"
    tail -n 30 "$DIR_LOG/server.out"
    exit 1
  fi
  if curl -s --max-time 1 "http://127.0.0.1:$PORTA/api/salute" | grep -q '"ok":true'; then
    break
  fi
  sleep 0.5
done
salute="$(curl -s --max-time 2 "http://127.0.0.1:$PORTA/api/salute" || true)"
info="$(curl -s --max-time 2 "http://127.0.0.1:$PORTA/api/info" || true)"
if [[ -z "$info" ]]; then
  echo "server: non risponde su :$PORTA. Vedi logs/server.out"
  exit 1
fi
telefono="$(printf '%s' "$info" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).url_telefono))')"
echo
echo "Cantastorie pronto (pid $PID) — $salute"
echo "  Telefoni:   $telefono"
echo "  Proiettore: http://localhost:$PORTA/schermo   (premi «Inizia sessione»)"
echo "  Arresto:    scripts/arresto.sh"

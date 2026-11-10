#!/usr/bin/env bash
# Avvia Cantastorie (F0): ferma le istanze precedenti, avvia il servizio voce, compila le pagine,
# avvia il server su 0.0.0.0:4610 in background e stampa gli indirizzi per telefoni e proiettore.
#
# Opzioni:
#   --fish        voce drama-3 via OpenRouter (CANTASTORIE_VOCE=fish): il servizio voce locale non si
#                 avvia né si ferma; se è già pronto fa da riserva (solo sulla 4610)
#   --mock        voce finta (CANTASTORIE_TTS=mock): il servizio voce non si tocca
#   --tieni-voce  se il servizio voce è già pronto non lo riavvia (risparmia il caricamento)
#   --finto       narratore a copione (CANTASTORIE_LLM=finto): nessuna chiamata ad Anthropic
# Le altre variabili CANTASTORIE_* dell'ambiente passano al server (vedi apps/server/src/config.ts).
#
# Istanza di prova (e2e mentre si gioca): CANTASTORIE_PORTA=4710 scripts/avvio.sh --finto
#   - server su quella porta, log in logs/porta-<porta>/, pagine compilate in logs/porta-<porta>/web
#     (apps/web/dist, che serve la partita vera, non si ricompila);
#   - voce finta, oppure drama-3 con --fish (o CANTASTORIE_VOCE=fish), mai Qwen: il servizio voce su
#     4611 e il server su 4610 non si toccano;
#   - si ferma con: CANTASTORIE_PORTA=4710 scripts/arresto.sh
#
# Log: logs/server.out (leggibile), logs/server.jsonl (strutturato), logs/turni.jsonl, logs/costi.jsonl
set -euo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${CANTASTORIE_PORTA:-4610}"
PROVA=0
if [[ "$PORTA" != "4610" ]]; then
  case "$PORTA" in 4611|4612) echo "porta $PORTA riservata (voce, Vite): scegline un'altra" >&2; exit 2 ;; esac
  PROVA=1
  DIR_LOG="$RADICE/logs/porta-$PORTA"
  export CANTASTORIE_LOG="$DIR_LOG"
  export CANTASTORIE_WEB="$DIR_LOG/web"
  # Un'istanza di prova parte da capo, salvo chi chiede di riprendere (CANTASTORIE_NUOVA_SESSIONE=0).
  export CANTASTORIE_NUOVA_SESSIONE="${CANTASTORIE_NUOVA_SESSIONE:-1}"
  [[ "$CANTASTORIE_NUOVA_SESSIONE" == "0" ]] && unset CANTASTORIE_NUOVA_SESSIONE
else
  DIR_LOG="$RADICE/logs"
fi
export PORT="$PORTA"
MOCK=0; TIENI_VOCE=0; FINTO=0; FISH=0
[[ "${CANTASTORIE_VOCE:-}" == "fish" ]] && FISH=1
for a in "$@"; do
  case "$a" in
    --fish) FISH=1 ;;
    --mock) MOCK=1 ;;
    --tieni-voce) TIENI_VOCE=1 ;;
    --finto) FINTO=1 ;;
    *) echo "opzione sconosciuta: $a" >&2; exit 2 ;;
  esac
done
mkdir -p "$DIR_LOG"
cd "$RADICE"

# 1. Istanze precedenti: server e Vite sempre; la voce solo se la riavviamo. (In prova: solo la sua porta.)
CANTASTORIE_PORTA="$PORTA" "$RADICE/scripts/arresto.sh" --lascia-voce --lascia-lettore

# Chi fa cosa (config/*.yaml + variabili, docs/provider.md): VOCE, SERVE_LOCALE, MODELLO_LOCALE…
TSX="$RADICE/node_modules/.bin/tsx"
PROVIDER="$("$TSX" "$RADICE/apps/server/src/strumenti/provider.ts" --shell 2>/dev/null || true)"
eval "$PROVIDER"
# Senza opzioni esplicite la voce la decide la configurazione.
if [[ "$FISH" == "0" && "$MOCK" == "0" ]]; then
  case "${VOCE:-locale}" in openrouter) FISH=1 ;; finto|nessuno) MOCK=1 ;; esac
fi

# 2. Servizio voce. drama-3 non ha servizi locali da avviare. In prova mai Qwen: la voce su 4611 è
#    della partita vera (con drama-3 la riserva Qwen è spenta, CANTASTORIE_VOCE_RISERVA=no).
if [[ "$FISH" == "1" ]]; then
  export CANTASTORIE_VOCE=fish
  if [[ "$PROVA" == "1" ]]; then
    export CANTASTORIE_VOCE_RISERVA=no
    echo "voce: drama-3 via OpenRouter (istanza di prova su :$PORTA, nessuna riserva Qwen)"
  else
    echo "voce: drama-3 via OpenRouter (riserva: Qwen locale se è già pronto)"
  fi
elif [[ "$PROVA" == "1" && "$MOCK" == "0" && -n "${CANTASTORIE_VOCE_URL:-}" && "${CANTASTORIE_VOCE_URL}" != *":4611"* ]]; then
  # Prova con la voce locale: un servizio Qwen a parte (mai il 4611 della partita vera), acceso da chi prova.
  export CANTASTORIE_VOCE=qwen
  echo "voce: Qwen locale su $CANTASTORIE_VOCE_URL (istanza di prova su :$PORTA)"
elif [[ "$PROVA" == "1" ]]; then
  unset CANTASTORIE_VOCE
  export CANTASTORIE_TTS=mock
  echo "voce: finta (istanza di prova su :$PORTA)"
elif [[ "$MOCK" == "1" ]]; then
  unset CANTASTORIE_VOCE
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

# 2b. Server locale dei modelli (lettore, arbitri in locale): mlx-lm su 127.0.0.1:4613, condiviso dalle istanze.
if [[ "${SERVE_LOCALE:-0}" == "1" && "${AVVIO_LOCALE:-no}" == "mlx" && "$FINTO" == "0" ]]; then
  LETTORE_PORTA="${PORTA_LOCALE:-4613}" "$RADICE/scripts/lettore-avvio.sh" "${MODELLO_LOCALE:-}" || echo "lettore locale: non partito, i componenti locali useranno le loro riserve (vedi logs/lettore.out)"
fi

# 3. Pagine web.
echo "web: compilo le pagine…"
if [[ "$PROVA" == "1" ]]; then
  # Build a parte: apps/web/dist serve la partita vera e non va toccata.
  npm run build --silent -w @cantastorie/web -- --outDir "$CANTASTORIE_WEB" --emptyOutDir >> "$DIR_LOG/build.out" 2>&1 \
    || { echo "web: compilazione fallita, vedi $DIR_LOG/build.out"; tail -n 20 "$DIR_LOG/build.out"; exit 1; }
else
  npm run build --silent >> "$DIR_LOG/build.out" 2>&1 || { echo "web: compilazione fallita, vedi logs/build.out"; tail -n 20 "$DIR_LOG/build.out"; exit 1; }
fi

# 4. Server. Le variabili ANTHROPIC_BASE_URL, ANTHROPIC_CUSTOM_HEADERS e ANTHROPIC_AUTH_TOKEN della shell
#    puntano a un proxy locale: non devono arrivare al server (che fissa comunque baseURL).
#    ANTHROPIC_API_KEY invece NON si toglie: se è nell'ambiente è la prima fonte della chiave (llm/chiavi.ts).
[[ "$FINTO" == "1" ]] && export CANTASTORIE_LLM=finto
echo "=== avvio $(date '+%Y-%m-%d %H:%M:%S') ===" >> "$DIR_LOG/server.out"
env -u ANTHROPIC_BASE_URL -u ANTHROPIC_CUSTOM_HEADERS -u ANTHROPIC_AUTH_TOKEN \
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
# 5. Lo sceneggiatore (docs/sceneggiatore.md): Claude Code scrive ciò che il lettore locale non trova.
#    Parte se `claude` è installato (CANTASTORIE_SCENEGGIATORE=no lo spegne); col narratore finto no.
if [[ "$FINTO" != "1" ]]; then
  CANTASTORIE_PORTA="$PORTA" "$RADICE/scripts/sceneggiatore.sh" avvia || echo "sceneggiatore: non partito (vedi il suo log)"
fi
salute="$(curl -s --max-time 2 "http://127.0.0.1:$PORTA/api/salute" || true)"
info="$(curl -s --max-time 2 "http://127.0.0.1:$PORTA/api/info" || true)"
if [[ -z "$info" ]]; then
  echo "server: non risponde su :$PORTA. Vedi logs/server.out"
  exit 1
fi
telefono="$(printf '%s' "$info" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).url_telefono))')"
# Link del pannello del master: il server lo scrive nel log all'avvio, col token (mai nel QR).
# Solo le righe scritte dopo l'ultimo «=== avvio» (non il token di un avvio precedente).
master=""
for _ in $(seq 1 10); do
  master="$(awk '/^=== avvio/{b=""} {b=b $0 "\n"} END{printf "%s", b}' "$DIR_LOG/server.out" | grep '"PANNELLO MASTER"' | tail -n 1 \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).master)}catch{}})' || true)"
  [[ -n "$master" ]] && break
  sleep 0.3
done
echo
echo "Tabletop AI Game Master ready (pid $PID) — $salute"
echo "  Telefoni:   $telefono"
echo "  Proiettore: http://localhost:$PORTA/schermo   (premi «Inizia sessione»)"
echo "  Master:     ${master:-vedi la riga PANNELLO MASTER in logs/server.out}   (solo su questo Mac)"
if [[ "$PROVA" == "1" ]]; then echo "  Arresto:    CANTASTORIE_PORTA=$PORTA scripts/arresto.sh   (istanza di prova)"; else echo "  Arresto:    scripts/arresto.sh"; fi

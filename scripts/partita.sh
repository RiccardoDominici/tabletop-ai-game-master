#!/usr/bin/env bash
# Una partita vera in un comando: controlla la campagna, ferma le istanze vecchie, avvia la voce
# (solo se richiesta), compila le pagine, avvia il server e stampa i tre indirizzi da aprire:
# proiettore, telefoni, pannello del master (col suo token).
#
#   scripts/partita.sh <campagna> [--modo A|B] [--voce finta|qwen]
#
#   <campagna>   cartella in campagne/ (es. prova-f0, ponte-lanterne)
#   --modo B     (predefinito) repertorio: battute pre-scritte scelte da Haiku; A: improvvisa tutto
#   --voce finta (predefinito) voce finta, nessun servizio da caricare; qwen: voce locale Qwen3-TTS
#                (fino a 7 GB di RAM, qualche minuto di caricamento la prima volta)
#
# Il narratore è sempre Haiku vero (la chiave la legge apps/server/src/llm/chiave.ts).
# Server: variabili CANTASTORIE_CAMPAGNA e CANTASTORIE_MODO (vedi apps/server/src/config.ts).
# Log: logs/partita.out (questo avvio), logs/server.out, logs/server.jsonl, logs/voce.out.
#
# Prova mentre si gioca: CANTASTORIE_PORTA=4710 scripts/partita.sh ponte-lanterne avvia una partita di
# prova su quella porta (log e pagine in logs/porta-4710/, voce finta) senza toccare la partita vera
# su 4610 né la voce su 4611 (vedi scripts/avvio.sh).
set -euo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${CANTASTORIE_PORTA:-4610}"
export CANTASTORIE_PORTA="$PORTA"
if [[ "$PORTA" == "4610" ]]; then DIR_LOG="$RADICE/logs"; else DIR_LOG="$RADICE/logs/porta-$PORTA"; fi

uso() {
  echo "uso: scripts/partita.sh <campagna> [--modo A|B] [--voce finta|qwen]"
  echo "campagne disponibili: $(ls "$RADICE/campagne" | tr '\n' ' ')"
  exit 2
}

[[ $# -ge 1 ]] || uso
CAMPAGNA="$1"; shift
MODO="B"; VOCE="finta"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --modo) MODO="${2:-}"; shift 2 || uso ;;
    --voce) VOCE="${2:-}"; shift 2 || uso ;;
    -h|--help) uso ;;
    *) echo "opzione sconosciuta: $1"; uso ;;
  esac
done
case "$MODO" in A|a) MODO_SERVER="improvvisa"; MODO="A" ;; B|b) MODO_SERVER="repertorio"; MODO="B" ;; *) echo "--modo vuole A o B"; uso ;; esac
case "$VOCE" in finta|qwen) ;; *) echo "--voce vuole finta o qwen"; uso ;; esac
if [[ "$PORTA" != "4610" && "$VOCE" == "qwen" ]]; then
  echo "Su una porta di prova la voce è sempre finta: il servizio voce (4611) è della partita vera."
  exit 2
fi

CARTELLA="$RADICE/campagne/$CAMPAGNA"
if [[ ! -d "$CARTELLA" ]]; then
  echo "Campagna «${CAMPAGNA}» non trovata in campagne/."
  uso
fi
if [[ "$MODO" == "B" && ! -d "$CARTELLA/repertorio" ]]; then
  echo "La campagna «${CAMPAGNA}» non ha un repertorio: usa --modo A."
  exit 1
fi
mkdir -p "$DIR_LOG"
cd "$RADICE"

# 1. La campagna deve essere valida: con errori la partita non parte (E1).
echo "1/4  Controllo la campagna ${CAMPAGNA}…"
if ! python3 strumenti/valida_campagna.py "$CARTELLA"; then
  echo
  echo "La campagna ha errori: la partita non parte. Correggili (vedi sopra) e riprova."
  exit 1
fi

# 2. Voce: Qwen solo se richiesta; altrimenti si ferma quella vecchia (libera fino a 7 GB di RAM).
if [[ "$VOCE" == "qwen" ]]; then
  echo "2/4  Avvio la voce locale (Qwen3-TTS): può volerci qualche minuto…"
  if ! "$RADICE/scripts/voce-avvio.sh"; then
    echo
    echo "La voce locale non è partita (vedi logs/voce.out). Puoi giocare con: scripts/partita.sh $CAMPAGNA --modo $MODO --voce finta"
    exit 1
  fi
  OPZIONI_AVVIO=(--tieni-voce)
else
  if [[ "$PORTA" == "4610" ]]; then
    echo "2/4  Voce finta: fermo l'eventuale servizio voce."
  else
    echo "2/4  Voce finta (partita di prova su :$PORTA: voce e partita vera non si toccano)."
  fi
  "$RADICE/scripts/arresto.sh" > /dev/null
  OPZIONI_AVVIO=(--mock)
fi

# 3. Istanze vecchie, pagine web e server (scripts/avvio.sh fa tutte e tre le cose).
echo "3/4  Fermo le istanze vecchie, compilo le pagine e avvio il server…"
export CANTASTORIE_CAMPAGNA="$CAMPAGNA"
export CANTASTORIE_MODO="$MODO_SERVER"
unset CANTASTORIE_LLM CANTASTORIE_IMMAGINI CANTASTORIE_CARTELLA_CAMPAGNA
if ! "$RADICE/scripts/avvio.sh" "${OPZIONI_AVVIO[@]}" > "$DIR_LOG/partita.out" 2>&1; then
  echo
  echo "Il server non è partito. Ultime righe:"
  tail -n 25 "$DIR_LOG/partita.out"
  exit 1
fi

# 4. Indirizzi: telefoni dal server, pannello dal log (il token cambia a ogni avvio).
echo "4/4  Pronto."
info="$(curl -s --max-time 3 "http://127.0.0.1:$PORTA/api/info")"
telefono="$(printf '%s' "$info" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).url_telefono))')"
master="$(grep '^  Master:' "$DIR_LOG/partita.out" | awk '{print $2}')"
salute="$(curl -s --max-time 3 "http://127.0.0.1:$PORTA/api/salute")"
voce_in_uso="$(printf '%s' "$salute" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s).voce;console.log(v==="qwen"?"Qwen locale":"finta")})')"

cat <<FINE

==================================================================
  Cantastorie — partita pronta
  Campagna: $CAMPAGNA   ·   modo $MODO ($MODO_SERVER)   ·   voce: $voce_in_uso
==================================================================

  PROIETTORE (su questo Mac, collegato al proiettore e alla cassa):
      http://localhost:$PORTA/schermo
      Clicca «Inizia sessione»: serve un clic per far partire l'audio.

  TELEFONI (stessa rete Wi-Fi del Mac, basta il browser):
      $telefono
      Il QR per entrare è anche sul proiettore. Ognuno sceglie il suo personaggio.

  PANNELLO DEL MASTER (solo su questo Mac, non darlo ai giocatori):
      ${master:-vedi la riga PANNELLO MASTER in logs/server.out}

  Per finire:  $( [[ "$PORTA" == "4610" ]] && echo "scripts/arresto.sh" || echo "CANTASTORIE_PORTA=$PORTA scripts/arresto.sh" )
FINE

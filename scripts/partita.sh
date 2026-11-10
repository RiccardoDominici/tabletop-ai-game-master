#!/usr/bin/env bash
# Una partita vera in un comando: controlla la campagna, ferma le istanze vecchie, avvia la voce
# (solo se richiesta), compila le pagine, avvia il server e stampa i tre indirizzi da aprire:
# proiettore, telefoni, pannello del master (col suo token).
#
#   scripts/partita.sh <campagna> [--modo A|B] [--voce fish|qwen|finta] [--nuova] [--sessione N]
#
#   <campagna>   cartella in campagne/ (es. prova-f0, ponte-lanterne)
#   --modo B     (predefinito) repertorio: battute pre-scritte scelte da Haiku; A: improvvisa tutto
#   --voce fish  (predefinito) la voce del gioco: drama-3 via OpenRouter, espressiva (la chiave è la
#                OPENROUTER_API_KEY dell'ambiente, o la riga nel .env alla radice, o il file di ripiego
#                di configurazione; vedi apps/server/src/llm/chiavi.ts). Se OpenRouter non risponde, per quella frase
#                usa Qwen locale se è già acceso, altrimenti la frase resta testo sullo schermo.
#                qwen: voce locale Qwen3-TTS (fino a 7 GB di RAM, qualche minuto la prima volta);
#                finta: un tono al posto della voce, niente rete né servizi
#   --nuova      ricomincia da capo: senza, se c'è una partita salvata di questa campagna la riprende
#   --sessione N campagne a più sessioni (sessioni/<nn>/): gioca quel pacchetto. Senza, lo sceglie il
#                server dall'archivio: la sessione in corso, o quella dopo l'ultima chiusa con
#                «Fine sessione» (docs/strati.md); la validazione controlla proprio quello.
#
# Il narratore è sempre Haiku vero (la chiave la cerca apps/server/src/llm/chiavi.ts: ambiente, poi .env alla radice).
# Server: variabili CANTASTORIE_CAMPAGNA e CANTASTORIE_MODO (vedi apps/server/src/config.ts).
# Log: logs/partita.out (questo avvio), logs/server.out, logs/server.jsonl, logs/voce.out.
#
# Prova mentre si gioca: CANTASTORIE_PORTA=4710 scripts/partita.sh ponte-lanterne avvia una partita di
# prova su quella porta (log e pagine in logs/porta-4710/, voce drama-3 senza riserva o finta) senza
# toccare la partita vera su 4610 né la voce su 4611 (vedi scripts/avvio.sh).
set -euo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
PORTA="${CANTASTORIE_PORTA:-4610}"
export CANTASTORIE_PORTA="$PORTA"
if [[ "$PORTA" == "4610" ]]; then DIR_LOG="$RADICE/logs"; else DIR_LOG="$RADICE/logs/porta-$PORTA"; fi

uso() {
  echo "uso: scripts/partita.sh <campagna> [--modo A|B] [--voce fish|qwen|finta] [--nuova] [--sessione N]"
  echo "campagne disponibili: $(ls "$RADICE/campagne" | tr '\n' ' ')"
  exit 2
}

[[ $# -ge 1 ]] || uso
CAMPAGNA="$1"; shift
MODO="B"; VOCE="fish"; NUOVA=0; SESSIONE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --modo) MODO="${2:-}"; shift 2 || uso ;;
    --voce) VOCE="${2:-}"; shift 2 || uso ;;
    --nuova) NUOVA=1; shift ;;
    --sessione) SESSIONE="${2:-}"; shift 2 || uso; [[ "$SESSIONE" =~ ^[0-9]+$ ]] || { echo "--sessione vuole un numero"; uso; } ;;
    -h|--help) uso ;;
    *) echo "opzione sconosciuta: $1"; uso ;;
  esac
done
case "$MODO" in A|a) MODO_SERVER="improvvisa"; MODO="A" ;; B|b) MODO_SERVER="repertorio"; MODO="B" ;; *) echo "--modo vuole A o B"; uso ;; esac
case "$VOCE" in fish|finta|qwen) ;; *) echo "--voce vuole fish, qwen o finta"; uso ;; esac
if [[ "$PORTA" != "4610" && "$VOCE" == "qwen" ]]; then
  echo "Su una porta di prova la voce è drama-3 (--voce fish) o finta: il servizio voce (4611) è della partita vera."
  exit 2
fi

CARTELLA="$RADICE/campagne/$CAMPAGNA"
if [[ ! -d "$CARTELLA" ]]; then
  echo "Campagna «${CAMPAGNA}» non trovata in campagne/."
  uso
fi
mkdir -p "$DIR_LOG"
cd "$RADICE"

# Campagna a più sessioni: quale pacchetto si gioca lo decide l'archivio, con le regole del server
# (apps/server/src/strumenti/scelta.ts); si valida e si gioca quello.
PACCHETTO=""
VALIDA=(python3 strumenti/valida_campagna.py "$CARTELLA")
if [[ -d "$CARTELLA/sessioni" ]]; then
  [[ "$PORTA" != "4610" ]] && export CANTASTORIE_LOG="${CANTASTORIE_LOG:-$DIR_LOG}"
  ARGS_SCELTA=("$CARTELLA" --modo "$MODO_SERVER")
  [[ -n "$SESSIONE" ]] && ARGS_SCELTA+=(--sessione "$SESSIONE")
  [[ "$NUOVA" == "1" ]] && ARGS_SCELTA+=(--nuova)
  if ! scelta="$("$RADICE/node_modules/.bin/tsx" apps/server/src/strumenti/scelta.ts "${ARGS_SCELTA[@]}")"; then
    echo "Non so quale sessione giocare (vedi sopra)."
    exit 1
  fi
  PACCHETTO="$(printf '%s' "$scelta" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).numero))')"
  avviso="$(printf '%s' "$scelta" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).avviso??""))')"
  echo "     Campagna a più sessioni: si gioca la sessione $PACCHETTO."
  [[ -n "$avviso" ]] && echo "     $avviso"
  export CANTASTORIE_SESSIONE="$PACCHETTO"
  if python3 strumenti/valida_campagna.py --help 2>/dev/null | grep -q -- '--sessione'; then
    VALIDA=(python3 strumenti/valida_campagna.py "$CARTELLA" --sessione "$PACCHETTO")
  else
    VALIDA=()
    echo "     Il validatore non conosce ancora i pacchetti: il controllo lo fa solo il server all'avvio."
  fi
  REPERTORIO="$(printf '%s/sessioni/%s' "$CARTELLA" "$(ls "$CARTELLA/sessioni" | awk -v n="$PACCHETTO" '$0 ~ /^[0-9]+$/ && $0+0 == n {print; exit}')")/repertorio"
else
  unset CANTASTORIE_SESSIONE
  REPERTORIO="$CARTELLA/repertorio"
fi
if [[ "$MODO" == "B" && ! -d "$REPERTORIO" ]]; then
  echo "La campagna «${CAMPAGNA}» non ha un repertorio (${REPERTORIO#$RADICE/}): usa --modo A."
  exit 1
fi

# 1. La campagna deve essere valida: con errori la partita non parte (E1).
echo "1/4  Controllo la campagna ${CAMPAGNA}…"
if [[ ${#VALIDA[@]} -gt 0 ]] && ! "${VALIDA[@]}"; then
  echo
  echo "La campagna ha errori: la partita non parte. Correggili (vedi sopra) e riprova."
  exit 1
fi

# 2. Voce: drama-3 non ha servizi locali (Qwen, se è già acceso, resta come riserva); Qwen solo se
#    richiesta; con la voce finta si ferma quella vecchia (libera fino a 7 GB di RAM).
if [[ "$VOCE" == "fish" ]]; then
  if [[ "$PORTA" == "4610" ]] && curl -s --max-time 2 http://127.0.0.1:4611/salute | grep -q '"pronto":true'; then
    echo "2/4  Voce drama-3 via OpenRouter (riserva: la voce locale, già pronta)."
  else
    echo "2/4  Voce drama-3 via OpenRouter$( [[ "$PORTA" == "4610" ]] && echo " (nessuna riserva: se OpenRouter non risponde resta il testo)" || echo " (partita di prova su :$PORTA)")."
  fi
  OPZIONI_AVVIO=(--fish)
elif [[ "$VOCE" == "qwen" ]]; then
  echo "2/4  Avvio la voce locale (Qwen3-TTS): può volerci qualche minuto…"
  if ! "$RADICE/scripts/voce-avvio.sh"; then
    echo
    echo "La voce locale non è partita (vedi logs/voce.out). Puoi giocare con: scripts/partita.sh $CAMPAGNA --modo $MODO --voce fish"
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
unset CANTASTORIE_LLM CANTASTORIE_IMMAGINI CANTASTORIE_CARTELLA_CAMPAGNA CANTASTORIE_NUOVA_SESSIONE
# La partita si salva da sola: senza --nuova riprende quella in corso (dopo un riavvio, un crash…).
[[ "$NUOVA" == "1" ]] && export CANTASTORIE_NUOVA_SESSIONE=1
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
voce_in_uso="$(printf '%s' "$salute" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s).voce;console.log(v==="fish"?"drama-3 (OpenRouter)":v==="qwen"?"Qwen locale":"finta")})')"
ripresa="$(printf '%s' "$salute" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s).ripresa;console.log(r?`Riprende la partita salvata dal turno ${r.turno} (per ricominciare: --nuova)`:"Partita nuova")})')"

cat <<FINE

==================================================================
  Tabletop AI Game Master — game ready
  Campagna: $CAMPAGNA   ·   modo $MODO ($MODO_SERVER)   ·   voce: $voce_in_uso
  $( [[ -n "$PACCHETTO" ]] && echo "Sessione $PACCHETTO (a fine serata: «Fine sessione» nel pannello del master)" || echo "One-shot" )
  $ripresa
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

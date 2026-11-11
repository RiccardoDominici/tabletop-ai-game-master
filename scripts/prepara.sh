#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/ambiente.sh"
# Da campagna valida a campagna pronta da giocare, in un comando: valida in modo rigoroso, genera le
# immagini (GPU locale) e l'audio, e stampa il rapporto con il comando per giocare.
#
#   scripts/prepara.sh campagne/<id> [--senza-immagini] [--senza-audio] [--anche-a-batteria] [--riprova-audio] [--voce]
#                                    [--senza-pronuncia]
#
#   --senza-immagini    non lancia la generazione delle immagini (riporta solo cosa manca)
#   --senza-audio       non lancia la pipeline dell'audio
#   --anche-a-batteria  genera le immagini anche senza alimentatore (sconsigliato: 15–40 minuti di GPU)
#   --riprova-audio     rilancia l'audio anche se è completo per queste schede (per ricercare gli strati
#                       che le fonti non avevano)
#   --voce              pre-genera le battute del repertorio con drama-3 (OpenRouter): COSTA, circa
#                       $2 per milione di byte; le righe già in cache non si pagano. Opzionale: senza,
#                       il gioco le sintetizza dal vivo. Lo stato le segnala come avviso, non blocca «pronta».
#   --senza-pronuncia   salta la prova a orecchio dei nomi nuovi del lessico (strumenti/pronuncia/prova.ts,
#                       docs/pronuncia.md): drama-3 + Whisper via OpenRouter, qualche centesimo per nome. Qwen
#                       si usa solo se TAGM_PRONUNCIA_QWEN dà l'indirizzo di un servizio (mai quello della
#                       partita in corso). Senza voci il passo si salta e lo dice.
#
# Idempotente: le pipeline saltano ciò che ha già il suo file, e l'audio non si rilancia se i descrittori
# delle schede sono quelli del suo ultimo giro (strumenti/stato_preparazione.py). Non avvia server e non
# tocca le porte della partita (4610, 4611). Log: logs/prepara-<id>.log.
#
# Uscita: 0 pronta da giocare; 1 la campagna ha errori; 2 argomenti sbagliati; 3 un passo è fallito o è
# stato saltato e la campagna non è pronta.
set -uo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"

uso() {
  echo "uso: scripts/prepara.sh campagne/<id> [--senza-immagini] [--senza-audio] [--anche-a-batteria] [--riprova-audio] [--voce] [--senza-pronuncia]"
  echo "campagne disponibili: $(ls "$RADICE/campagne" | tr '\n' ' ')"
  exit 2
}

[[ $# -ge 1 ]] || uso
ARG="$1"; shift
IMMAGINI=1; AUDIO=1; A_BATTERIA=0; RIPROVA_AUDIO=0; VOCE=0; PRONUNCIA=1
while [[ $# -gt 0 ]]; do
  case "$1" in
    --senza-immagini) IMMAGINI=0 ;;
    --senza-audio) AUDIO=0 ;;
    --anche-a-batteria) A_BATTERIA=1 ;;
    --riprova-audio) RIPROVA_AUDIO=1 ;;
    --voce) VOCE=1 ;;
    --senza-pronuncia) PRONUNCIA=0 ;;
    -h|--help) uso ;;
    *) echo "opzione sconosciuta: $1"; uso ;;
  esac
  shift
done

# La campagna si può dare come campagne/<id>, come <id> o come percorso assoluto.
if [[ -d "$ARG" ]]; then CARTELLA="$(cd "$ARG" && pwd)"
elif [[ -d "$RADICE/campagne/$ARG" ]]; then CARTELLA="$RADICE/campagne/$ARG"
else echo "Campagna «${ARG}» non trovata."; uso
fi
[[ -f "$CARTELLA/stile.yaml" ]] || { echo "$CARTELLA non è la cartella di una campagna (manca stile.yaml)."; exit 2; }
ID="$(basename "$CARTELLA")"
cd "$RADICE"
# Cartella dei log: TAGM_LOG se c'è (le prove la mettono in una cartella temporanea), altrimenti logs/.
DIR_LOG="${TAGM_LOG:-$RADICE/logs}"
mkdir -p "$DIR_LOG"
LOG="$DIR_LOG/prepara-$ID.log"
exec > >(tee -a "$LOG") 2>&1
echo "== prepara $ID — $(date '+%Y-%m-%d %H:%M:%S') =="

PY_IMMAGINI="$RADICE/strumenti/immagini/.venv/bin/python"
PY_AUDIO="$RADICE/strumenti/audio/.venv/bin/python"
PROBLEMI=()

# Un campo dello stato degli asset (strumenti/stato_preparazione.py --json), es. campo 'len(d["immagini"]["mancanti"])'.
campo() {
  python3 strumenti/stato_preparazione.py "$CARTELLA" --json | python3 -c "import json,sys; d=json.load(sys.stdin); print($1)"
}

# 1. Validatore rigoroso: con errori non si genera niente (le immagini costano GPU, l'audio rete e tempo).
echo
echo "1/4  Validatore rigoroso…"
if ! python3 -I strumenti/valida_campagna.py "$CARTELLA" --rigoroso; then
  echo
  echo "La campagna ha errori: niente immagini né audio. Correggili (vedi sopra) e rilancia."
  exit 1
fi

# 1b. Pronuncia dei nomi: le voci nuove del lessico si provano a orecchio (sintesi + Whisper) e si tiene la
# grafia che si capisce meglio (docs/pronuncia.md). Il lessico lo scrive il Preparatore; qui si verifica.
echo
echo "1b   Pronuncia dei nomi…"
if [[ "$PRONUNCIA" == "0" ]]; then
  echo "     saltata su richiesta (--senza-pronuncia)."
elif [[ ! -x "$RADICE/node_modules/.bin/tsx" ]]; then
  echo "     manca tsx (npm install nella radice del repo)."
  PROBLEMI+=("pronuncia: tsx assente")
else
  VOCI_PRON=(--voci fish)
  [[ -n "${TAGM_PRONUNCIA_QWEN:-}" ]] && VOCI_PRON=(--voci fish,qwen --url-qwen "$TAGM_PRONUNCIA_QWEN")
  "$RADICE/node_modules/.bin/tsx" strumenti/pronuncia/prova.ts "$CARTELLA" --nuovi "${VOCI_PRON[@]}"
  case $? in
    0) ;;
    3) echo "     nessuna voce per la prova (né chiave OpenRouter né TAGM_PRONUNCIA_QWEN): il lessico resta da provare." ;;
    *) PROBLEMI+=("pronuncia: la prova si è fermata (vedi sopra; rilancia: prova solo le voci non verificate)") ;;
  esac
fi

# 2. Immagini: FLUX.2 in locale, 15–40 minuti di GPU per una campagna intera.
echo
echo "2/4  Immagini…"
# Da generare = mancanti + vecchie (file presente ma schede cambiate: strumenti/immagini/freschezza.py).
MANCANO_IMG="$(campo 'len(d["immagini"]["mancanti"]) + len(d["immagini"]["vecchie"])')"
STIMA_MIN="$(campo 'round(d["immagini"]["stima_s"] / 60)')"
if [[ "$MANCANO_IMG" == "0" ]]; then
  echo "     tutte presenti: niente da generare."
elif [[ "$IMMAGINI" == "0" ]]; then
  echo "     saltate su richiesta (--senza-immagini): ne mancano $MANCANO_IMG, circa $STIMA_MIN minuti di GPU."
elif [[ ! -x "$PY_IMMAGINI" ]]; then
  echo "     manca l'ambiente delle immagini (strumenti/immagini/.venv, vedi strumenti/immagini/requirements.txt)."
  PROBLEMI+=("immagini: ambiente assente")
else
  BATT="$(pmset -g batt 2>/dev/null || true)"
  CARICA="$(grep -oE '[0-9]+%' <<<"$BATT" | head -1)"
  if grep -q "AC Power" <<<"$BATT" || [[ -z "$BATT" ]]; then
    echo "     alimentatore collegato${CARICA:+ (batteria $CARICA)}."
    VIA=1
  elif [[ "$A_BATTERIA" == "1" ]]; then
    echo "     ATTENZIONE: a batteria${CARICA:+ ($CARICA)}, e generare $MANCANO_IMG immagini vuol dire circa $STIMA_MIN minuti di GPU."
    echo "     Il generatore si ferma da solo sotto la soglia di carica (strumenti/immagini/motore.py)."
    VIA=1
  else
    echo "     ATTENZIONE: il Mac è a batteria${CARICA:+ ($CARICA)}. Generare $MANCANO_IMG immagini vuol dire circa"
    echo "     $STIMA_MIN minuti di GPU a pieno carico: collega l'alimentatore e rilancia (o --anche-a-batteria)."
    PROBLEMI+=("immagini: non generate, il Mac è a batteria")
    VIA=0
  fi
  if [[ "$VIA" == "1" ]]; then
    echo "     genero $MANCANO_IMG immagini (circa $STIMA_MIN minuti): il Mac resta usabile ma lento; non chiudere il coperchio."
    # caffeinate tiene sveglio il Mac per tutta la generazione (niente stop a metà per inattività).
    SVEGLIO=(); command -v caffeinate >/dev/null && SVEGLIO=(caffeinate -i)
    if ! ${SVEGLIO[@]+"${SVEGLIO[@]}"} "$PY_IMMAGINI" strumenti/immagini/genera.py "$CARTELLA"; then
      PROBLEMI+=("immagini: la generazione si è fermata (vedi sopra; rilancia: riparte da dove era)")
    fi
  fi
fi

# 3. Audio: musica, umori, temi, ambienti, effetti (strumenti/audio, docs/audio.md).
echo
echo "3/4  Audio…"
DA_RIFARE="$(campo 'd["audio"]["da_rifare"]')"
if [[ "$AUDIO" == "0" ]]; then
  echo "     saltato su richiesta (--senza-audio)."
elif [[ "$DA_RIFARE" == "False" && "$RIPROVA_AUDIO" == "0" ]]; then
  echo "     completo per queste schede: niente da rifare (--riprova-audio per ricercare gli strati mancanti)."
elif [[ ! -x "$PY_AUDIO" ]]; then
  echo "     manca l'ambiente dell'audio: lancia una volta strumenti/audio/setup.sh."
  PROBLEMI+=("audio: ambiente assente")
elif ! "$PY_AUDIO" strumenti/audio/genera_audio.py "$CARTELLA"; then
  PROBLEMI+=("audio: la pipeline si è fermata (vedi sopra; rilancia: salta ciò che è già fatto)")
fi

# 3b. Battute con drama-3 (opzionale: --voce). Costa; le righe già in cache non si ripagano, e il
# comando si può rilanciare: riparte da dove era.
echo
echo "3b   Battute drama-3…"
if [[ "$VOCE" == "0" ]]; then
  echo "     saltate (per pre-generarle con drama-3: --voce; costa, vedi lo stato)."
elif [[ ! -x "$RADICE/node_modules/.bin/tsx" ]]; then
  echo "     manca tsx (npm install nella radice del repo)."
  PROBLEMI+=("battute drama-3: tsx assente")
elif ! "$RADICE/node_modules/.bin/tsx" apps/server/src/strumenti/prerender.ts "$CARTELLA" --motore fish; then
  PROBLEMI+=("battute drama-3: la pre-generazione si è fermata (vedi sopra; rilancia: riparte dalla cache)")
fi

# 4. Rapporto: cosa c'è, cosa manca, quanto pesa, e come si gioca.
echo
echo "4/4  Rapporto"
python3 strumenti/stato_preparazione.py "$CARTELLA" | sed 's/^/     /'
echo "     cartella intera: $(du -sh "$CARTELLA" | cut -f1 | tr -d " ")"
PRONTA="$(campo 'd["pronta"]')"
MODO=""; [[ -d "$CARTELLA/repertorio" ]] || MODO=" --modo A"
for p in "${PROBLEMI[@]+"${PROBLEMI[@]}"}"; do echo "     da sistemare: $p"; done
echo
if [[ "$PRONTA" == "True" ]]; then
  echo "Pronta da giocare. Per giocare:"
  echo "    scripts/partita.sh $ID$MODO              (voce della configurazione: di base Qwen locale)"
  echo "    scripts/partita.sh $ID$MODO --voce finta (un tono al posto della voce, senza rete)"
else
  echo "Non ancora pronta da giocare. Manca:"
  campo '"\n".join("    - " + m for m in d["non_pronta"])'
fi
[[ "$PRONTA" == "True" && ${#PROBLEMI[@]} -eq 0 ]] && exit 0
exit 3

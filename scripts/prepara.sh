#!/usr/bin/env bash
# Da campagna valida a campagna pronta da giocare, in un comando: valida in modo rigoroso, genera le
# immagini (GPU locale) e l'audio, e stampa il rapporto con il comando per giocare.
#
#   scripts/prepara.sh campagne/<id> [--senza-immagini] [--senza-audio] [--anche-a-batteria] [--riprova-audio]
#
#   --senza-immagini    non lancia la generazione delle immagini (riporta solo cosa manca)
#   --senza-audio       non lancia la pipeline dell'audio
#   --anche-a-batteria  genera le immagini anche senza alimentatore (sconsigliato: 15–40 minuti di GPU)
#   --riprova-audio     rilancia l'audio anche se è completo per queste schede (per ricercare gli strati
#                       che le fonti non avevano)
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
  echo "uso: scripts/prepara.sh campagne/<id> [--senza-immagini] [--senza-audio] [--anche-a-batteria] [--riprova-audio]"
  echo "campagne disponibili: $(ls "$RADICE/campagne" | tr '\n' ' ')"
  exit 2
}

[[ $# -ge 1 ]] || uso
ARG="$1"; shift
IMMAGINI=1; AUDIO=1; A_BATTERIA=0; RIPROVA_AUDIO=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --senza-immagini) IMMAGINI=0 ;;
    --senza-audio) AUDIO=0 ;;
    --anche-a-batteria) A_BATTERIA=1 ;;
    --riprova-audio) RIPROVA_AUDIO=1 ;;
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
mkdir -p logs
LOG="$RADICE/logs/prepara-$ID.log"
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

# 2. Immagini: FLUX.2 in locale, 15–40 minuti di GPU per una campagna intera.
echo
echo "2/4  Immagini…"
MANCANO_IMG="$(campo 'len(d["immagini"]["mancanti"])')"
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
  echo "    scripts/partita.sh $ID$MODO              (voce finta)"
  echo "    scripts/partita.sh $ID$MODO --voce qwen  (voce locale)"
else
  echo "Non ancora pronta da giocare: servono i manifest delle immagini e dell'audio (vedi sopra)."
fi
[[ "$PRONTA" == "True" && ${#PROBLEMI[@]} -eq 0 ]] && exit 0
exit 3

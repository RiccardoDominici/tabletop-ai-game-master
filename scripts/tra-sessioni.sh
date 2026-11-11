#!/usr/bin/env bash
# Tra una sessione e l'altra: le parti deterministiche del ciclo (riferimenti/tra-le-sessioni.md), in tre
# tempi. Si ferma ogni volta dove deve scrivere l'agente con la skill del Preparatore, e dice che cosa.
#
#   scripts/tra-sessioni.sh campagne/<id> <n>               dopo la sessione n: registro, riassunto, mossa del mondo
#   scripts/tra-sessioni.sh campagne/<id> <n> --pacchetto   dopo lo stato: STATO valido, scheletro di sessioni/<n+1>/
#   scripts/tra-sessioni.sh campagne/<id> <n> --verifica    dopo il pacchetto: validatore e risorse della sessione n+1
#
# Non avvia server e non tocca le porte della partita (4610, 4611). Non sovrascrive mai ciò che ha scritto
# l'agente. Log: logs/tra-sessioni-<id>.log.
# Uscita: 0 fatto (o fermo dove tocca all'agente); 1 c'è da correggere; 2 argomenti sbagliati.
set -uo pipefail

RADICE="$(cd "$(dirname "$0")/.." && pwd)"
uso() {
  echo "uso: scripts/tra-sessioni.sh campagne/<id> <sessione giocata> [--pacchetto | --verifica]"
  exit 2
}
[[ $# -ge 2 ]] || uso
ARG="$1"; N="$2"; FASE="${3:-registro}"
[[ "$N" =~ ^[0-9]+$ && "$N" -ge 1 ]] || { echo "la sessione è un numero da 1 in su: ${N}"; uso; }
case "$FASE" in registro|--pacchetto|--verifica) ;; *) echo "fase sconosciuta: ${FASE}"; uso ;; esac
if [[ -d "$ARG" ]]; then CARTELLA="$(cd "$ARG" && pwd)"
elif [[ -d "$RADICE/campagne/$ARG" ]]; then CARTELLA="$RADICE/campagne/$ARG"
else echo "Campagna «${ARG}» non trovata."; uso
fi
ID="$(basename "$CARTELLA")"
NN="$(printf '%02d' "$N")"; DOPO="$(printf '%02d' $((N + 1)))"
cd "$RADICE"
# Cartella dei log: CANTASTORIE_LOG se c'è (le prove la mettono in una cartella temporanea), altrimenti logs/.
DIR_LOG="${CANTASTORIE_LOG:-$RADICE/logs}"
mkdir -p "$DIR_LOG"
exec > >(tee -a "$DIR_LOG/tra-sessioni-$ID.log") 2>&1
echo "== tra-sessioni $ID, sessione $N, fase ${FASE#--} — $(date '+%Y-%m-%d %H:%M:%S') =="
VALIDA=(python3 -I strumenti/valida_campagna.py "$CARTELLA")

case "$FASE" in
registro)
  # Passo 1: il registro lo scrive il server a «Fine sessione»; qui si controlla che ci sia e che sia intatto.
  REG="$CARTELLA/sessioni/$NN/registro.yaml"
  if [[ ! -f "$REG" ]]; then
    if [[ -x scripts/registro.sh ]]; then
      echo "Manca sessioni/$NN/registro.yaml: lo rigenero dall'archivio."
      scripts/registro.sh "$CARTELLA" --sessione "$NN" || { echo "registro.sh non è riuscito (vedi sopra)."; exit 1; }
    else
      echo "Manca sessioni/$NN/registro.yaml: lo scrive il server quando il master preme «Fine sessione»."
      exit 1
    fi
  elif [[ -x scripts/registro.sh ]] && scripts/registro.sh --help 2>/dev/null | grep -q -- "--controlla"; then
    # Uscite di registro.sh: 0 uguale all'archivio, 1 diverso, 3 archivio illeggibile, 4 nessuna sessione.
    scripts/registro.sh "$CARTELLA" --sessione "$NN" --controlla; CONTROLLO=$?
    case "$CONTROLLO" in
      0) echo "Registro della sessione $N: uguale a ciò che dà l'archivio." ;;
      1) echo "Il registro non è quello dell'archivio: rigeneralo (scripts/registro.sh), non ritoccarlo."; exit 1 ;;
      *) echo "Registro della sessione $N: non lo posso confrontare con l'archivio (uscita $CONTROLLO), vado avanti." ;;
    esac
  fi
  echo
  echo "1/2  Che cosa dice il registro"
  python3 strumenti/tra_sessioni.py riassunto "$CARTELLA" "$N" | sed 's/^/     /' || exit 1
  echo
  echo "2/2  Il mondo si muove (regole fisse dell'arco)"
  python3 strumenti/tra_sessioni.py mondo "$CARTELLA" "$N" | sed 's/^/     /'
  echo
  echo "Tocca all'agente (tra-le-sessioni.md, passi 2–3): aggiorna stato/stato.yaml fino a dopo_sessione: $N,"
  echo "ogni fatto con la sua fonte nel registro, e la mossa del mondo con il suo motivo. Poi:"
  echo "    scripts/tra-sessioni.sh $ARG $N --pacchetto"
  ;;
--pacchetto)
  # Lo stato deve reggere prima di costruirci sopra la sessione dopo.
  echo
  echo "1/2  Stato: ogni fatto ha la sua fonte?"
  if ! "${VALIDA[@]}" --solo STATO --senza-node; then
    echo; echo "Lo stato ha errori: correggili prima del pacchetto."; exit 1
  fi
  echo
  echo "2/2  Scheletro di sessioni/$DOPO/ dallo stato"
  python3 strumenti/tra_sessioni.py pacchetto "$CARTELLA" "$N" | sed 's/^/     /' || exit 1
  echo
  echo "Tocca all'agente (passo 4): in sessioni/$DOPO/ il riassunto da leggere (dai fatti dello stato), le scene,"
  echo "il repertorio, le parole segrete dei segreti nuovi; in sessione.yaml, per ogni filo, come: ripreso o rimandato;"
  echo "nelle schede copiate dei PNG, perche e vuole. Poi:"
  echo "    scripts/tra-sessioni.sh $ARG $N --verifica"
  ;;
--verifica)
  echo
  echo "1/3  Il pacchetto è scritto?"
  python3 strumenti/tra_sessioni.py completo "$CARTELLA" "$N" | sed 's/^/     /'
  if [[ ${PIPESTATUS[0]} -ne 0 ]]; then echo; echo "Il pacchetto non è finito: completalo e rilancia --verifica."; exit 1; fi
  echo
  echo "2/3  Validatore sulla sessione $((N + 1))"
  if "${VALIDA[@]}" --help 2>/dev/null | grep -q -- "--sessione"; then
    "${VALIDA[@]}" --rigoroso --sessione "$((N + 1))"; ESITO=$?
  else
    # Finché il validatore non sa leggere un pacchetto intero (--sessione, fase D2) si controllano stato e continuità.
    echo "     (il validatore non legge ancora un pacchetto intero: controllo STATO, CONTINUITÀ e ARCO)"
    "${VALIDA[@]}" --rigoroso --solo STATO,CONTINUITÀ,ARCO --senza-node; ESITO=$?
  fi
  [[ $ESITO -eq 0 ]] || { echo; echo "La sessione $((N + 1)) ha errori: correggili (vedi sopra) e rilancia --verifica."; exit 1; }
  echo
  echo "3/3  Risorse della sessione $((N + 1))"
  if scripts/prepara.sh --help 2>/dev/null | grep -q -- "--sessione"; then
    scripts/prepara.sh "$CARTELLA" --sessione "$((N + 1))" || exit 1
  else
    echo "     prepara.sh non lavora ancora su un pacchetto (fase D2): immagini e audio nuovi della sessione $((N + 1))"
    echo "     si faranno con scripts/prepara.sh $ARG --sessione $((N + 1))."
  fi
  echo
  echo "Sessione $((N + 1)) pronta dal lato della preparazione."
  ;;
esac
exit 0

#!/bin/zsh
# FINAL ROUND (Riccardo's goal, 18 November): profile A on HEAD, the four blind torre-mozza scripts plus `pressione`
# (A31: a player's words that hold a secret word), with the minimal local reader (Qwen3 0.6B 4-bit on 4613), the rules
# arbiters, the sceneggiatore in the background (claude -p), mock voice; one game at a time, ports 4960-4964.
# Usage: giro.sh <attempt label, e.g. finale1> [run keys: CM CA FB ST PR; none = all five]
# Env: GIRO_LIMITE_S = the most seconds one game may take (default 3600); past it the game is stopped and logged
# as TIMEOUT in driver.log (a timed-out game is played again, not judged).
S=/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad
M=/Users/riccardo/Developer/cantastorie
G=$1; shift
# zsh does not split «${@:-A B}» into words: with no keys the default list must be built as an array.
if (( $# == 0 )); then CHIAVI=(CM CA FB ST PR); else CHIAVI=($@); fi
LIMITE=${GIRO_LIMITE_S:-3600}
L=$S/finale/$G
mkdir -p $L; cd $M || exit 1
# Profile A's configuration: the tracked defaults plus profilo-a.yaml as locale.yaml, in the attempt's folder, so the run
# never reads this computer's own config/locale.yaml (which may name API providers) and needs no keys.
C=$L/config
mkdir -p $C && cp config/predefinita.yaml $C/predefinita.yaml && cp esperimenti/risultati/finale/profilo-a.yaml $C/locale.yaml || exit 1

# Stop a process and everything it started (npx → tsx → node, the harness's children), children first.
uccidi_albero() { # pid [signal]
  local p=$1 segnale=${2:-TERM} f
  for f in $(pgrep -P $p 2>/dev/null); do uccidi_albero $f $segnale; done
  kill -$segnale $p 2>/dev/null
}
# Run a command with a time limit: past it the command's whole tree gets TERM, then KILL after 10 s.
con_limite() { # seconds command...
  local limite=$1; shift
  "$@" &
  local pid=$!
  ( sleep $limite; echo "== $(date +%T) TIMEOUT after ${limite} s: stopping the game (pid $pid)" >> $L/driver.log
    uccidi_albero $pid TERM; sleep 10; uccidi_albero $pid KILL ) &
  local guardia=$!
  wait $pid
  local esito=$?
  uccidi_albero $guardia KILL
  return $esito
}

run() { # port script rolls label
  local porta=$1 copione=$2 tiri=$3 E=$G-$4
  local libera=$(memory_pressure | tail -1 | grep -oE '[0-9]+%' | tr -d %)
  local disco=$(df -m / | tail -1 | awk '{print $4}')
  echo "== $(date +%T) start $E port $porta ($(git rev-parse --short HEAD)) memory free ${libera}% disk ${disco} MB" >> $L/driver.log
  if [[ ${libera:-0} -lt 25 ]]; then echo "== memory free ${libera}% < 25%: stop" >> $L/driver.log; exit 3; fi
  if [[ ${disco:-0} -lt 1000 ]]; then echo "== disk ${disco} MB < 1000: stop" >> $L/driver.log; exit 4; fi
  # Swap used (sysctl vm.swapusage, MB): stop past 8 GB (the Mac filled its disk with swap once).
  local swap=$(sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.,]+)M.*/\1/' | tr ',' '.' | cut -d. -f1)
  echo "== swap used ${swap} MB" >> $L/driver.log
  if [[ ${swap:-0} -gt 8192 ]]; then echo "== swap ${swap} MB > 8 GB: stop" >> $L/driver.log; exit 5; fi
  # Never the default 8B reader: the 0.6B one, started explicitly (avvio.sh reuses it; profilo-a.yaml names the same).
  MODELLO_LOCALE=mlx-community/Qwen3-0.6B-4bit scripts/lettore-avvio.sh mlx-community/Qwen3-0.6B-4bit >> $L/driver.log 2>&1
  rm -rf logs/porta-$porta
  con_limite $LIMITE env MODELLO_LOCALE=mlx-community/Qwen3-0.6B-4bit TAGM_CONFIG=$C TAGM_PORTA=$porta \
    npx tsx apps/server/src/esperimenti/esegui.ts torre-mozza/$copione B --campagna torre-mozza --uscita finale/$E --pausa-s 20 --tiri $tiri --sceneggiatore > $L/$E.out 2>&1
  echo "== $(date +%T) end $E exit $?" >> $L/driver.log
  local ris=esperimenti/risultati/finale/$E
  mkdir -p $ris
  python3 -I esperimenti/e2e-finale/misure.py $ris logs/porta-$porta --json $ris/misure.json > $ris/misure.txt 2>&1
  python3 -I esperimenti/e2e-finale/tavolo_con_carte.py $ris logs/porta-$porta > $ris/tavolo-con-carte.md 2>&1
  mkdir -p $ris/log-server; cp logs/porta-$porta/server.jsonl logs/porta-$porta/narrazioni.jsonl $ris/log-server/ 2>/dev/null
  mkdir -p $ris/sceneggiatore; cp logs/porta-$porta/sceneggiatore/sceneggiatore.jsonl $ris/sceneggiatore/ 2>/dev/null
  cp $L/$E.out $ris/harness.out
  for f in $ris/log-server/*.jsonl $ris/harness.out; do sed -i '' -E 's/token=[A-Za-z0-9_-]+/token=<omesso>/g' "$f"; done
  # A31 (L1): the selector's message held a secret word the players typed.
  grep -c 'parola segreta nel messaggio del selettore' $ris/log-server/server.jsonl > $ris/a31-segrete.txt 2>/dev/null
  # The judge's evidence view (esperimenti/e2e-finale/vista.py), kept with the run's records and in the attempt's folder.
  python3 -I esperimenti/e2e-finale/vista.py $ris > $ris/vista.md 2>> $L/driver.log && cp $ris/vista.md $L/vista-$4.md
  TAGM_PORTA=$porta scripts/arresto.sh --lascia-voce >> $L/driver.log 2>&1
  # Lean disk: the port's log folder (web build, sqlite) is copied where needed; drop it.
  rm -rf logs/porta-$porta
}
for k in $CHIAVI; do
  case $k in
    CM) run 4960 combattimento manuale torre-mozza-combattimento-A-manuale ;;
    CA) run 4961 combattimento automatico torre-mozza-combattimento-A-automatico ;;
    FB) run 4962 fuori-binario manuale torre-mozza-fuori-binario-A-manuale ;;
    ST) run 4963 stallo manuale torre-mozza-stallo-A-manuale ;;
    PR) run 4964 pressione manuale torre-mozza-pressione-A-manuale ;;
    *) echo "== unknown run key $k (CM CA FB ST PR)" >> $L/driver.log ;;
  esac
done
scripts/lettore-arresto.sh >> $L/driver.log 2>&1
echo "ALL DONE $(date +%T)" >> $L/driver.log

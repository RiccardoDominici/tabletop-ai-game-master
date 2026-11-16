#!/bin/zsh
# Profile A, round 5 of the coherence layer (docs/coerenza.md): the four blind torre-mozza scripts with the minimal
# local reader (Qwen3 0.6B 4-bit on 4613), the rules arbiters, the sceneggiatore in the background (claude -p),
# mock voice; one game at a time, ports 4950-4953, on the main tree's HEAD.
S=/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad
M=/Users/riccardo/Developer/cantastorie
L=$S/e2e3b/coerenzaA5
mkdir -p $L; cd $M || exit 1
run() { # port script rolls label
  local porta=$1 copione=$2 tiri=$3 E=coerenzaA5-$4
  local libera=$(memory_pressure | tail -1 | grep -oE '[0-9]+%' | tr -d %)
  echo "== $(date +%T) start $E port $porta ($(git rev-parse --short HEAD)) memory free ${libera}%" >> $L/driver.log
  if [[ ${libera:-0} -lt 25 ]]; then echo "== memory free ${libera}% < 25%: stop" >> $L/driver.log; exit 3; fi
  TAGM_CONFIG=$S/config-a06 TAGM_PORTA=$porta \
    npx tsx apps/server/src/esperimenti/esegui.ts torre-mozza/$copione B --campagna torre-mozza --uscita e2e-finale-3b/$E --pausa-s 20 --tiri $tiri --sceneggiatore > $L/$E.out 2>&1
  echo "== $(date +%T) end $E exit $?" >> $L/driver.log
  local ris=esperimenti/risultati/e2e-finale-3b/$E
  python3 -I esperimenti/e2e-finale/misure.py $ris logs/porta-$porta --json $ris/misure.json > $ris/misure.txt 2>&1
  python3 -I esperimenti/e2e-finale/tavolo_con_carte.py $ris logs/porta-$porta > $ris/tavolo-con-carte.md 2>&1
  mkdir -p $ris/log-server; cp logs/porta-$porta/server.jsonl logs/porta-$porta/narrazioni.jsonl $ris/log-server/ 2>/dev/null
  mkdir -p $ris/sceneggiatore; cp logs/porta-$porta/sceneggiatore/sceneggiatore.jsonl $ris/sceneggiatore/ 2>/dev/null
  cp $L/$E.out $ris/harness.out
  # The Game Master's token of the test instance is in the server log: never in git (CLAUDE.md, check 4).
  for f in $ris/log-server/*.jsonl $ris/harness.out; do sed -i '' -E 's/token=[A-Za-z0-9_-]+/token=<omesso>/g' "$f"; done
  TAGM_PORTA=$porta scripts/arresto.sh --lascia-voce >> $L/driver.log 2>&1
}
run 4950 combattimento manuale torre-mozza-combattimento-A-manuale
run 4951 combattimento automatico torre-mozza-combattimento-A-automatico
run 4952 fuori-binario manuale torre-mozza-fuori-binario-A-manuale
run 4953 stallo manuale torre-mozza-stallo-A-manuale
# The local model server is shared by the instances: stop it at the end (one model at a time on this Mac).
scripts/lettore-arresto.sh >> $L/driver.log 2>&1
echo "ALL DONE $(date +%T)" >> $L/driver.log

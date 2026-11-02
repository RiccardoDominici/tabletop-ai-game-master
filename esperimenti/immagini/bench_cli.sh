#!/usr/bin/env bash
# Misura una generazione con la CLI di mflux, UN processo per immagine (come farà lo strumento):
# tempo reale (caricamento compreso), picco di memoria del processo, swap del sistema prima/dopo.
# Uso: bench_cli.sh ETICHETTA LARGHEZZA ALTEZZA [opzioni extra di mflux-generate-flux2...]
# Scrive una riga in bench/cli.tsv e il log completo in bench/cli_ETICHETTA.txt.
set -uo pipefail

QUI="$(cd "$(dirname "$0")" && pwd)"
RADICE="$(cd "$QUI/../.." && pwd)"
BIN="$RADICE/strumenti/immagini/.venv/bin"
ETICHETTA="$1"; L="$2"; A="$3"; shift 3

mkdir -p "$QUI/bench" "$QUI/png"
# Prompt del luogo + [STILE] v0, lo stesso del bench Python.
PROMPT="$("$BIN/python" -c "import sys; sys.path.insert(0, '$QUI'); import prompt_prova as p; print(p.prompt_luogo() + ', ' + p.STILI['v0'])")"

swap() { sysctl -n vm.swapusage | sed -E 's/.*used = ([0-9.,]+)M.*/\1/' | tr ',' '.'; }
swapouts() { vm_stat | awk '/Swapouts/ {gsub("\\.","",$2); print $2}'; }

s0="$(swap)"; o0="$(swapouts)"
/usr/bin/time -l "$BIN/mflux-generate-flux2" \
  --model mflux-community/flux2-klein-4b-mflux-q4 --base-model flux2-klein-4b \
  --prompt "$PROMPT" --width "$L" --height "$A" --steps 4 --seed 1000 \
  --output "$QUI/png/bench_cli_${ETICHETTA}.png" "$@" > "$QUI/bench/cli_${ETICHETTA}.txt" 2>&1
esito=$?
s1="$(swap)"; o1="$(swapouts)"

reale="$(awk '/ real / {print $1}' "$QUI/bench/cli_${ETICHETTA}.txt" | tr ',' '.')"
picco="$(awk '/peak memory footprint/ {printf "%.2f", $1/1e9}' "$QUI/bench/cli_${ETICHETTA}.txt")"
# Tempo dei soli 4 passi, dalla barra di tqdm (es. "4/4 [01:02<00:00").
passi="$(grep -oE '4/4 \[[0-9:]+' "$QUI/bench/cli_${ETICHETTA}.txt" | tail -1 | sed 's/4\/4 \[//')"
swapouts_mb="$(( (o1 - o0) * 16384 / 1000000 ))"
riga="$ETICHETTA\t${L}x${A}\t$*\texit=$esito\treale_s=$reale\tpassi=$passi\tpicco_gb=$picco\tswap_mb=$s0->$s1\tswapouts_mb=$swapouts_mb"
echo -e "$riga" | tee -a "$QUI/bench/cli.tsv"

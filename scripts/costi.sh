#!/usr/bin/env bash
source "$(dirname "${BASH_SOURCE[0]}")/ambiente.sh"
# Costo per sessione di gioco: LLM (Haiku) e voce (drama-3) da logs/costi.jsonl, divisi per le sessioni
# dell'archivio (apps/server/src/strumenti/costi.ts). Sola lettura: si usa anche mentre si gioca.
#
#   scripts/costi.sh                    le ultime 10 sessioni della partita vera (logs/)
#   TAGM_PORTA=4730 scripts/costi.sh   quelle di un'istanza di prova (logs/porta-4730/)
#   scripts/costi.sh --tutte | --json | --log <cartella>
set -euo pipefail
RADICE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TSX="$RADICE/node_modules/.bin/tsx"
[[ -x "$TSX" ]] || TSX="npx --yes tsx"
cd "$RADICE"
exec $TSX --no-warnings "$RADICE/apps/server/src/strumenti/costi.ts" "$@"

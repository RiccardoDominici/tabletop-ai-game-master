#!/usr/bin/env bash
# Registro di fine sessione dall'archivio delle sessioni, senza modelli (docs/strati.md, «Il ciclo tra
# le sessioni»): lo stesso codice di «Fine sessione» del pannello del master.
#
#   scripts/registro.sh nozze-neve                     l'ultima sessione giocata
#   scripts/registro.sh campagne/arco --sessione 2     l'ultima che ha giocato sessioni/02/
#   scripts/registro.sh arco 02 --controlla            0 se registro.yaml è quello che dà l'archivio
#   scripts/registro.sh --help                         tutte le opzioni e i codici d'uscita
#
# L'archivio è quello dell'istanza, come in avvio.sh: porta 4610 → logs/sessioni.sqlite, un'altra
# (CANTASTORIE_PORTA=4710) → logs/porta-4710/sessioni.sqlite; CANTASTORIE_SESSIONI=<file> lo sceglie a mano.
# Non scrive eventi nell'archivio (a un archivio vecchio aggiunge al più la colonna pacchetto): si può
# usare mentre si gioca, non tocca il server.
set -euo pipefail
RADICE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTA="${CANTASTORIE_PORTA:-4610}"
if [[ "$PORTA" != "4610" && -z "${CANTASTORIE_LOG:-}" ]]; then
  export CANTASTORIE_LOG="$RADICE/logs/porta-$PORTA"
fi
TSX="$RADICE/node_modules/.bin/tsx"
[[ -x "$TSX" ]] || TSX="npx --yes tsx"
exec $TSX "$RADICE/apps/server/src/strumenti/registro.ts" "$@"

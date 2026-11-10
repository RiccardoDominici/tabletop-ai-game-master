#!/usr/bin/env bash
# Scrive config/locale.yaml: le scelte dei provider di QUESTO computer (docs/provider.md). Il file non è
# tracciato; config/predefinita.yaml (tutto in locale, zero centesimi) vale per ciò che qui non si scrive.
#
#   scripts/configura.sh                         solo controllo: chiavi trovate, RAM, venv; non scrive niente
#   scripts/configura.sh --tutto-locale          cancella le scelte: tutto in locale
#   scripts/configura.sh --api                   modelli via Anthropic (Haiku), voce drama-3 via OpenRouter
#   scripts/configura.sh --lettore anthropic --voce openrouter --arbitri locale   un componente alla volta
#   opzioni: --lettore, --arbitri (azioni e prove), --riassunto, --regole, --voce, --immagini <provider>
#            --modello-locale <id mlx o gguf>    --url-locale <http://…/v1> (llama.cpp, Ollama: avvio: no)
# Provider: locale, anthropic, openrouter, openai, regole, finto, nessuno.
set -euo pipefail
RADICE="$(cd "$(dirname "$0")/.." && pwd)"
FILE="$RADICE/config/locale.yaml"
MODELLO=""; URL=""; AZIONE="controllo"
valido() { case "$1" in locale|anthropic|openrouter|openai|regole|finto|nessuno) return 0 ;; *) echo "provider sconosciuto: $1" >&2; exit 2 ;; esac; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tutto-locale) AZIONE="locale"; shift ;;
    --api) AZIONE="scrivi"; for c in lettore arbitro_azioni arbitro_prove riassunto regole; do eval "S_$c=anthropic"; done; S_voce=openrouter; shift ;;
    --lettore|--riassunto|--regole|--voce|--immagini) valido "$2"; eval "S_${1#--}=\"\$2\""; AZIONE="scrivi"; shift 2 ;;
    --arbitri) valido "$2"; S_arbitro_azioni="$2"; S_arbitro_prove="$2"; AZIONE="scrivi"; shift 2 ;;
    --modello-locale) MODELLO="$2"; AZIONE="scrivi"; shift 2 ;;
    --url-locale) URL="$2"; AZIONE="scrivi"; shift 2 ;;
    -h|--help) sed -n 2,13p "$0"; exit 0 ;;
    *) echo "opzione sconosciuta: $1" >&2; exit 2 ;;
  esac
done

# Cosa c'è su questo computer (mai i valori delle chiavi).
# Stesse fonti del server: ambiente, .env alla radice, i file di ripiego (ANTHROPIC_KEY_FILE, CANTASTORIE_CHIAVE_OPENROUTER).
trova() {
  local ripiego; [[ $1 == ANTHROPIC_API_KEY ]] && ripiego="${ANTHROPIC_KEY_FILE:-/Users/riccardo/Developer/godExperiment/backend/.env}" || ripiego="${CANTASTORIE_CHIAVE_OPENROUTER:-/Users/riccardo/Developer/agora/.env}"
  [[ -n "${!1:-}" ]] || grep -q "^$1=" "$RADICE/.env" 2>/dev/null || grep -q "^$1=" "$ripiego" 2>/dev/null
}
echo "Questo computer:"
echo "  RAM: $(( $(sysctl -n hw.memsize 2>/dev/null || echo 0) / 1024 / 1024 / 1024 )) GB"
echo "  ANTHROPIC_API_KEY:  $(trova ANTHROPIC_API_KEY && echo trovata || echo 'non trovata')"
echo "  OPENROUTER_API_KEY: $(trova OPENROUTER_API_KEY && echo trovata || echo 'non trovata')"
echo "  modelli locali (mlx-lm): $([[ -x "$RADICE/services/lettore/.venv/bin/mlx_lm.server" ]] && echo pronti || echo 'manca services/lettore/.venv')"
echo "  voce locale (Qwen3-TTS): $([[ -x "$RADICE/services/voce/.venv/bin/python" ]] && echo pronta || echo 'manca services/voce/.venv')"

case "$AZIONE" in
  controllo) echo; echo "Niente scritto. Scelte attuali:"; cd "$RADICE"; exec "$RADICE/node_modules/.bin/tsx" apps/server/src/strumenti/provider.ts ;;
  locale) rm -f "$FILE"; echo "config/locale.yaml tolto: tutto in locale (config/predefinita.yaml)." ;;
  scrivi)
    {
      echo "# Scelte di questo computer, scritte da scripts/configura.sh il $(date '+%Y-%m-%d %H:%M'). Non tracciato."
      echo "# Vale ciò che è scritto qui; il resto viene da config/predefinita.yaml."
      if [[ -n "$MODELLO$URL" ]]; then
        echo "backend:"; echo "  locale:"
        [[ -n "$MODELLO" ]] && echo "    modello: $MODELLO"
        [[ -n "$URL" ]] && { echo "    url: $URL"; echo "    avvio: no"; }
      fi
      intestato=0
      for c in lettore arbitro_azioni arbitro_prove riassunto regole voce immagini; do
          v="$(eval "echo \${S_$c:-}")"
          [[ -n "$v" ]] || continue
          [[ $intestato == 1 ]] || { echo "componenti:"; intestato=1; }
          # Con un'API la riserva è sempre il locale, poi la riserva deterministica.
          case "$c" in lettore) r="[locale, finto]" ;; voce) r="[locale, finto]" ;; immagini) r="[nessuno]" ;; *) r="[locale, regole]" ;; esac
          [[ "$v" == "locale" ]] && r="$( [[ $c == lettore || $c == voce ]] && echo '[finto]' || echo '[regole]')"
          echo "  $c: {provider: $v, riserve: $r}"
      done
    } > "$FILE"
    echo; echo "Scritto config/locale.yaml:"; sed 's/^/  /' "$FILE"
    echo; cd "$RADICE"; "$RADICE/node_modules/.bin/tsx" apps/server/src/strumenti/provider.ts ;;
esac

#!/usr/bin/env bash
# Compatibilità delle variabili d'ambiente: il prefisso è CANTASTORIE_ → TAGM_ (il progetto si chiama
# Tabletop AI Game Master). Se la variabile TAGM_X manca e CANTASTORIE_X è impostata, il valore vecchio
# viene copiato sul nuovo; il nome vecchio viene tolto, così che i processi figli (server, esperimenti)
# non lo reinterpretino. Il server applica la stessa regola (apps/server/src/variabili-legacy.ts).
# Va «sourciato» da ogni script, prima di leggere le variabili.
_TAGM_LEGACY=()
while IFS= read -r _v; do
  [[ -n "$_v" ]] || continue
  _n="TAGM_${_v#CANTASTORIE_}"
  if [[ -z "${!_n+x}" ]]; then export "$_n=${!_v}"; fi
  _TAGM_LEGACY+=("$_v")
  unset "$_v"
done < <(env | cut -d= -f1 | grep '^CANTASTORIE_' || true)
if (( ${#_TAGM_LEGACY[@]} > 0 )); then
  echo "avviso: variabili CANTASTORIE_* deprecate (${_TAGM_LEGACY[*]}): usa TAGM_*" >&2
fi
unset _v _n _TAGM_LEGACY

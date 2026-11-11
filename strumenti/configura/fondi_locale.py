"""Fonde le scelte di scripts/configura.sh dentro config/locale.yaml senza perdere le chiavi che non gestisce.

Perché: lo script riscriveva il file da zero, e così cancellava `lingua` (docs/lingue.md) e ogni altra
chiave che l'utente aveva messo a mano. Ora lo script dice solo ciò che cambia; il resto resta com'è.

Uso (lo chiama scripts/configura.sh; non serve a mano):
    python3 -I strumenti/configura/fondi_locale.py <file.yaml> <cambi.json>

`cambi.json` ha tre campi facoltativi:
  "rimuovi_tutto": true              toglie componenti e le sostituzioni di backend.locale (--tutto-locale)
  "componenti": {"voce": {"provider": "openrouter", "riserve": ["locale"]}}   sostituisce quei componenti
  "backend_locale": {"modello": "...", "url": "...", "avvio": "no"}           sostituisce quei campi

Limite noto: PyYAML non conserva i commenti del file. Lo script rimette in testa un'intestazione.
Se il risultato è vuoto il file viene tolto (come faceva lo script con --tutto-locale).
"""

from __future__ import annotations

import copy
import datetime
import json
import sys
from pathlib import Path
from typing import Any

import yaml


class CaricaYaml12(yaml.SafeLoader):
    """Carica come YAML 1.2, che è ciò che legge il server (npm yaml): `no` e `yes` restano stringhe.

    PyYAML segue YAML 1.1 e farebbe di `avvio: no` un booleano: il server, che accetta 'mlx' | 'no', lo
    leggerebbe come falso. Qui si toglie solo la risoluzione dei booleani; i numeri e il resto restano.
    """


CaricaYaml12.yaml_implicit_resolvers = {
    primo: [(tag, rx) for tag, rx in regole if tag != "tag:yaml.org,2002:bool"]
    for primo, regole in yaml.SafeLoader.yaml_implicit_resolvers.items()
}

INTESTAZIONE = (
    "# Scelte di questo computer, scritte o aggiornate da scripts/configura.sh il {data}. Non tracciato.\n"
    "# Vale ciò che è scritto qui; il resto viene da config/predefinita.yaml.\n"
)


def fondi(esistente: dict[str, Any] | None, cambi: dict[str, Any]) -> dict[str, Any]:
    """Restituisce una copia di `esistente` con i cambi applicati. Le chiavi non gestite restano intatte."""
    out = copy.deepcopy(esistente or {})
    if cambi.get("rimuovi_tutto"):
        out.pop("componenti", None)
        locale = (out.get("backend") or {}).get("locale")
        if isinstance(locale, dict):
            for chiave in ("modello", "url", "avvio"):
                locale.pop(chiave, None)
            if not locale:
                out["backend"].pop("locale", None)
            if not out["backend"]:
                out.pop("backend", None)
    for nome, scelta in (cambi.get("componenti") or {}).items():
        out.setdefault("componenti", {})[nome] = scelta
    if cambi.get("backend_locale"):
        out.setdefault("backend", {}).setdefault("locale", {}).update(cambi["backend_locale"])
    if out.get("componenti") == {}:
        out.pop("componenti")
    return out


def scrivi(file: Path, cambi: dict[str, Any], adesso: str | None = None) -> dict[str, Any]:
    """Legge `file` (se c'è), applica `cambi` e riscrive. Ritorna ciò che è stato scritto."""
    esistente: dict[str, Any] = {}
    if file.exists():
        letto = yaml.load(file.read_text(encoding="utf-8"), Loader=CaricaYaml12) or {}
        if not isinstance(letto, dict):
            raise ValueError(f"{file}: non è una mappa YAML; non lo tocco")
        esistente = letto
    risultato = fondi(esistente, cambi)
    if not risultato:
        file.unlink(missing_ok=True)
        return risultato
    data = adesso or datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    corpo = yaml.safe_dump(risultato, allow_unicode=True, sort_keys=False, default_flow_style=False)
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(INTESTAZIONE.format(data=data) + corpo, encoding="utf-8")
    return risultato


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("uso: fondi_locale.py <file.yaml> <cambi.json>", file=sys.stderr)
        return 2
    cambi = json.loads(Path(argv[1]).read_text(encoding="utf-8"))
    risultato = scrivi(Path(argv[0]), cambi)
    print("scritto" if risultato else "tolto (nessuna scelta rimasta)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))

"""Fixture comuni ai test dello strumento immagini (test_prompt.py, test_freschezza.py).

Una campagna minima in una cartella temporanea: una scena con un PNG presente, un nodo-luogo con il
suo prompt, un evento che ha la scena come scheda, un nodo-luogo senza niente, e un PNG con un segreto
che vive solo in aspetto.situazioni.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

STILE = "watercolor illustration of a mountain village, warm hearth light, palette of cream and slate"
SEGRETO = "a thin white scar splits his left eyebrow"


def scrivi_yaml(percorso: Path, dati: dict) -> None:
    percorso.parent.mkdir(parents=True, exist_ok=True)
    percorso.write_text(yaml.safe_dump(dati, allow_unicode=True), encoding="utf-8")


@pytest.fixture()
def mini(tmp_path: Path) -> Path:
    c = tmp_path / "mini"
    scrivi_yaml(c / "stile.yaml", {"stile_immagini": STILE})
    scrivi_yaml(c / "scena.yaml", {
        "id": "scena_sala", "png_presenti": ["png_uno"],
        "immagine": {"prompt_luogo": "stone hall with a fireplace", "invarianti": ["camino"]},
    })
    scrivi_yaml(c / "campagna.yaml", {"nodi": [
        {"id": "n_sala", "tipo": "luogo", "scheda": "scena.yaml"},
        {"id": "e_festa", "tipo": "evento", "scheda": "scena.yaml"},
        {"id": "n_bosco", "tipo": "luogo", "immagine": {"prompt_luogo": "snowy larch wood at dusk"}},
        {"id": "n_valle", "tipo": "luogo"},
        {"id": "png_uno", "tipo": "png", "scheda": "png/png_uno.yaml"},
    ]})
    scrivi_yaml(c / "png" / "png_uno.yaml", {"id": "png_uno", "aspetto": {
        "prompt_immagine": "gaunt man in a black hooded cloak, [STILE]",
        "invarianti": ["circa 40 anni", "mantello nero"],
        "situazioni": [{"id": "senza_cappuccio", "dopo": ["i_cicatrice"], "prompt": f"hood lowered, {SEGRETO}"}],
    }})
    return c

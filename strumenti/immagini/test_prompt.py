"""Test della composizione dei prompt delle immagini (campagna.py + formato.py), senza modello.

    python3 -m pytest -q strumenti/immagini/test_prompt.py

Controlla il contratto che il resto dello strumento dà per scontato:
  - [STILE] sostituito una volta sola, mai lasciato nel testo;
  - le clausole del formato (formato.py) in coda a ogni prompt, ognuna una volta sola, anche se la
    carta di stile le scrive già;
  - aspetto.situazioni (dove stanno i tratti nascosti) mai nel prompt del ritratto;
  - nodi: alias se la scheda è una scena (anche per un evento), luogo se hanno un prompt.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))

import campagna  # noqa: E402
from formato import CLAUSOLE_FORMATO, con_formato  # noqa: E402

STILE = "watercolor illustration of a mountain village, warm hearth light, palette of cream and slate"
SEGRETO = "a thin white scar splits his left eyebrow"


def _scrivi(percorso: Path, dati: dict) -> None:
    percorso.parent.mkdir(parents=True, exist_ok=True)
    percorso.write_text(yaml.safe_dump(dati, allow_unicode=True), encoding="utf-8")


@pytest.fixture()
def mini(tmp_path: Path) -> Path:
    """Una campagna minima: una scena, un nodo-luogo con prompt, un evento con scheda, un PNG con un segreto."""
    c = tmp_path / "mini"
    _scrivi(c / "stile.yaml", {"stile_immagini": STILE})
    _scrivi(c / "scena.yaml", {
        "id": "scena_sala", "png_presenti": ["png_uno"],
        "immagine": {"prompt_luogo": "stone hall with a fireplace", "invarianti": ["camino"]},
    })
    _scrivi(c / "campagna.yaml", {"nodi": [
        {"id": "n_sala", "tipo": "luogo", "scheda": "scena.yaml"},
        {"id": "e_festa", "tipo": "evento", "scheda": "scena.yaml"},
        {"id": "n_bosco", "tipo": "luogo", "immagine": {"prompt_luogo": "snowy larch wood at dusk"}},
        {"id": "n_valle", "tipo": "luogo"},
        {"id": "png_uno", "tipo": "png", "scheda": "png/png_uno.yaml"},
    ]})
    _scrivi(c / "png" / "png_uno.yaml", {"id": "png_uno", "aspetto": {
        "prompt_immagine": "gaunt man in a black hooded cloak, [STILE]",
        "invarianti": ["circa 40 anni", "mantello nero"],
        "situazioni": [{"id": "senza_cappuccio", "dopo": ["i_cicatrice"], "prompt": f"hood lowered, {SEGRETO}"}],
    }})
    return c


def test_formato_aggiunge_ogni_clausola_una_volta():
    p = con_formato("a stone bridge, " + STILE)
    for clausola in CLAUSOLE_FORMATO:
        assert p.lower().count(clausola.lower()) == 1, clausola
    assert p.endswith(CLAUSOLE_FORMATO[-1])


def test_formato_idempotente():
    una = con_formato("a stone bridge")
    assert con_formato(una) == una


def test_formato_non_ripete_le_parole_della_carta_di_stile():
    # Lo stile v2 di prova-f0 dice già quasi tutto: manca solo «no signature».
    v2 = ("full-bleed ink-and-wash illustration, the picture fills the whole frame edge to edge with no border "
          "and no margin: dark ink outlines, unsigned, no text, no lettering")
    p = con_formato("village tavern at night, " + v2)
    assert p == "village tavern at night, " + v2 + ", no signature"


def test_prompt_composti(mini: Path):
    rr = {r.id: r for r in campagna.richieste(mini)}
    vere = [r for r in rr.values() if not r.alias_di]
    assert {r.id for r in vere} >= {"luogo_scena_sala", "luogo_n_bosco", "ritratto_png_uno",
                                    "situazione_png_uno_senza_cappuccio", "situazione_png_uno_in_scena_sala"}
    for r in vere:
        assert "[STILE]" not in r.prompt, r.id
        assert r.prompt.count(STILE) == 1, r.id
        for clausola in CLAUSOLE_FORMATO:
            assert r.prompt.lower().count(clausola.lower()) == 1, (r.id, clausola)
        # Il formato viene dopo lo stile: lo stile resta la parte descrittiva, il formato la coda tecnica.
        assert r.prompt.index(STILE) < r.prompt.lower().index("full-bleed"), r.id


def test_il_segreto_non_finisce_nel_ritratto(mini: Path):
    rr = {r.id: r for r in campagna.richieste(mini)}
    assert SEGRETO not in rr["ritratto_png_uno"].prompt
    assert SEGRETO in rr["situazione_png_uno_senza_cappuccio"].prompt
    assert rr["situazione_png_uno_senza_cappuccio"].extra["dopo"] == ["i_cicatrice"]


def test_nodi_alias_e_luoghi(mini: Path):
    rr = {r.id: r for r in campagna.richieste(mini)}
    assert rr["luogo_n_sala"].alias_di == "luogo_scena_sala"
    assert rr["luogo_e_festa"].alias_di == "luogo_scena_sala"  # un evento con la scena come scheda
    assert rr["luogo_n_bosco"].alias_di is None
    assert "luogo_n_valle" not in rr  # nodo-luogo senza scheda né prompt: niente immagine (avviso nel log)

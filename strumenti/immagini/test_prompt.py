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

from pathlib import Path

import campagna
from conftest import SEGRETO, STILE
from formato import CLAUSOLE_FORMATO, con_formato


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

"""The private-content detector of the e2e runs (esperimenti/e2e-finale/private_al_tavolo.py) sees the two leaks the
third e2e pass judged and its earlier count missed (docs/e2e-finale-3.md, bug 1): a whisper retold turns later while its
author acted in public, and a turn with only a whisper answered in public. Invented table record, fixture names.

    python3 -m pytest -q strumenti/test_private_al_tavolo.py
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

FILE = Path(__file__).resolve().parent.parent / "esperimenti" / "e2e-finale" / "private_al_tavolo.py"
_spec = importlib.util.spec_from_file_location("private_al_tavolo", FILE)
pat = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pat)

TAVOLO = """# Al tavolo

## Turno 1

**Teo Ruggeri** (giocatore, *azione privata*): Bertoldo, a parte: quanto ti paga il barone per il pedaggio?

**Narratore:** Il vento porta odore di fango.

## Turno 2

**Ida Ferraro** (giocatore): Guardo il fiume.

**Narratore:** Il fiume scorre basso.

## Turno 3

**Teo Ruggeri** (giocatore): Andiamo al mulino.

**Narratore:** Teo, la tua domanda sul pedaggio è caduta nel vuoto.

**Narratore:** Teo prende la strada del mulino.

## Turno 4

**Ida Ferraro** (giocatore, *azione privata*): Bertoldo, sottovoce: chi passa dal ponte di notte?

**Bertoldo:** Di notte sul ponte passano i mercanti del sale.

## Turno 5

**Ida Ferraro** (giocatore): Parlo dei mercanti a voce alta: chi li ha visti?

**Narratore:** I mercanti del sale non si fanno vedere.
"""


def test_a_whisper_retold_turns_later_while_its_author_acts_in_public():
    c = pat.candidati(TAVOLO)
    t3 = [x for x in c if x["turno"] == 3]
    assert [(x["turno_privata"], x["pg"], x["comuni"]) for x in t3] == [(1, "Teo Ruggeri", ["pedag"])]
    assert "la tua domanda sul pedaggio" in t3[0]["riga"]


def test_a_turn_with_only_a_whisper_answered_aloud():
    c = pat.candidati(TAVOLO)
    assert any(x["turno"] == 4 and x["pg"] == "Ida Ferraro" and x["chi"] == "Bertoldo" for x in c)


def test_words_the_players_made_public_since_do_not_count():
    # Turn 5: Ida asked about the merchants aloud, so the narrator's line about them is not her whisper any more.
    assert not [x for x in pat.candidati(TAVOLO) if x["turno"] == 5]
    # Unrelated lines are not candidates.
    assert not [x for x in pat.candidati(TAVOLO) if x["turno"] == 2]

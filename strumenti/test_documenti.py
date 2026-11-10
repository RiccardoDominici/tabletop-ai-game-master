"""Documenti e codice vanno insieme: la skill e i README non dicono il contrario di ciò che il codice fa.

La nota 20 della prova di nozze-neve: schema.md diceva che `richiede.oppure` era un errore quando il
validatore lo accettava già; il README dei copioni non diceva di `scena` e `privata`. Qui si controllano le
frasi che sono già andate fuori passo una volta.

    python3 -m pytest -q strumenti/test_documenti.py
"""

from __future__ import annotations

import sys
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from valida import costanti as K  # noqa: E402

SKILL = QUI.parent / ".claude" / "skills" / "preparatore"
DOCUMENTI = [SKILL / "SKILL.md", *sorted((SKILL / "riferimenti").glob("*.md"))]


def _testo(p: Path) -> str:
    return p.read_text(encoding="utf-8").lower()


def test_oppure_come_lo_tratta_il_validatore():
    vecchie = ("non lo applica ancora", "oggi il validatore lo rifiuta", "oggi è un errore")
    for p in DOCUMENTI:
        t = _testo(p)
        for frase in vecchie:
            if K.OPPURE_NEL_SERVER:
                assert not ("oppure" in t and frase in t), f"{p.name} dice «{frase}» di oppure, ma il Motore lo applica"


def test_readme_dei_copioni_dice_cio_che_copioni_legge():
    t = _testo(QUI.parent / "esperimenti" / "copioni" / "README.md")
    for chiave in ("scena:", "privata: true", "{scena: <id>}"):
        assert chiave in t, f"il README dei copioni non dice di «{chiave}», che strumenti/valida/copioni.py legge"


def test_la_skill_ha_una_data_di_versione():
    assert "versione del" in _testo(SKILL / "SKILL.md") or "version of" in _testo(SKILL / "SKILL.md")

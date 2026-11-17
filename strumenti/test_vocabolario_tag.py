"""Il vocabolario chiuso dei tag d'umore della musica deve essere uno solo, in tre copie (A28).

Fonte: UMORI in strumenti/audio/vocabolario.py. Le copie: TAG_MUSICA del validatore (costanti.py), la riga
musica.tag del manuale (docs/manuale-master.md §4) e la lista di docs/audio.md. Il motore (cue.ts) ha la sua
copia, che cue.test.ts confronta già con la fonte.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from valida import costanti  # noqa: E402
from valida.regole_audio import vocabolario  # noqa: E402


def _fonte() -> set[str]:
    voc = vocabolario()
    assert voc is not None, "strumenti/audio/vocabolario.py non caricabile"
    return set(voc.UMORI)


def test_fonte_ha_sei_umori() -> None:
    assert len(_fonte()) == 6


def test_validatore_usa_la_stessa_lista() -> None:
    assert costanti.TAG_MUSICA == _fonte()


def test_manuale_elenca_la_stessa_lista() -> None:
    riga = next(r for r in (RADICE / "docs" / "manuale-master.md").read_text(encoding="utf-8").splitlines() if r.startswith("| `musica.tag`"))
    parole = set(re.findall(r"`([a-z_]+)`", riga))
    assert _fonte() <= parole, f"tag mancanti nel manuale: {sorted(_fonte() - parole)}"
    assert not (parole - _fonte() - {"musica.tag"}), f"tag nel manuale che il codice non conosce: {sorted(parole - _fonte() - {'musica.tag'})}"


def test_docs_audio_elenca_la_stessa_lista() -> None:
    testo = (RADICE / "docs" / "audio.md").read_text(encoding="utf-8")
    assert all(f"`{t}`" in testo for t in _fonte())

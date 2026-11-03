"""La pagina «Che cosa il Motore non fa» (riferimenti/motore.md) resta vera: ogni suo limite si verifica sul
codice del server (strumenti/motore_limiti.ts), e ogni verifica ha la sua voce nella pagina.

    python3 -m pytest -q strumenti/test_motore_limiti.py
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from valida import contesto_b  # noqa: E402

PAGINA = QUI.parent / ".claude" / "skills" / "preparatore" / "riferimenti" / "motore.md"


@pytest.fixture(scope="module")
def limiti() -> dict:
    cmd = contesto_b._comando()
    if cmd is None:
        pytest.skip("node/tsx assenti")
    r = subprocess.run([*cmd, str(QUI / "motore_limiti.ts")], cwd=QUI.parent, capture_output=True, text=True, timeout=120)
    assert r.returncode == 0, r.stderr
    return json.loads(r.stdout)


def test_ogni_limite_della_pagina_vale_ancora(limiti):
    # Se una voce non vale più, il Motore ha cominciato a farlo: aggiorna motore.md (e docs/da-fare.md).
    for nome, esito in limiti.items():
        assert esito["vale"], f"il limite «{nome}» non vale più: {esito['dettaglio']}"


def test_pagina_e_verifiche_vanno_insieme(limiti):
    nella_pagina = set(re.findall(r"<!-- limite: ([a-z_]+) -->", PAGINA.read_text(encoding="utf-8")))
    assert nella_pagina == set(limiti)

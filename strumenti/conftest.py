"""Configurazione comune delle prove di strumenti/ (pytest).

Le prove non scrivono mai nelle cartelle ignorate da git del repo (logs/, cache/): chi clona il repo da
capo non le ha, e la partita vera non deve trovarci i log delle prove. Gli script e il server (lanciati
dalle prove) scrivono i log in CANTASTORIE_LOG: qui punta a una cartella temporanea per ogni prova.
"""

import pytest


@pytest.fixture(autouse=True)
def _log_temporanei(tmp_path_factory, monkeypatch):
    monkeypatch.setenv("CANTASTORIE_LOG", str(tmp_path_factory.mktemp("log")))

"""Rilascio del lock di tqdm alla chiusura (voce/risorse.py).

Il caso reale: mlx-audio usa tqdm nella generazione, tqdm crea un semaforo multiprocessing nel thread del
worker, e il processo termina con un segnale (come fa uvicorn). Senza il rilascio il resource_tracker
stampa «leaked semaphore objects»; il test esegue proprio quel percorso in un sottoprocesso.
"""
import os
import subprocess
import sys
import textwrap
from pathlib import Path

from voce.risorse import rilascia_lock_tqdm

RADICE = Path(__file__).resolve().parent.parent


def test_rilascio_toglie_i_riferimenti_al_lock():
    import threading

    from tqdm.std import TqdmDefaultWriteLock, tqdm

    def barra():
        list(tqdm(range(2), disable=False))

    t = threading.Thread(target=barra)
    t.start()
    t.join()
    assert getattr(TqdmDefaultWriteLock, "mp_lock", None) is not None

    rilascia_lock_tqdm()
    assert "_lock" not in vars(tqdm)
    assert getattr(TqdmDefaultWriteLock, "mp_lock", None) is None
    rilascia_lock_tqdm()  # una seconda chiamata non fa nulla


def test_nessun_avviso_di_semaforo_se_il_processo_termina_con_un_segnale():
    codice = textwrap.dedent(
        """
        import os, signal, threading
        from tqdm import tqdm
        from voce.risorse import rilascia_lock_tqdm
        def barra():
            list(tqdm(range(2), disable=False))
        t = threading.Thread(target=barra); t.start(); t.join()
        rilascia_lock_tqdm()
        os.kill(os.getpid(), signal.SIGTERM)  # come uvicorn: nessun atexit
        """
    )
    esito = subprocess.run(
        [sys.executable, "-c", codice], cwd=RADICE, capture_output=True, text=True,
        env={**os.environ, "HF_HUB_OFFLINE": "1"}, timeout=60,
    )
    assert "leaked" not in esito.stderr, esito.stderr

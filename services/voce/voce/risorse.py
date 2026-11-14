"""Risorse di sistema che una libreria di terze parti crea e il servizio deve rilasciare prima di uscire.

tqdm (usata da mlx-audio durante la generazione, per la barra di avanzamento) crea alla prima barra un
`multiprocessing.RLock` (un semaforo POSIX con nome) e lo tiene in due posti: `tqdm.std.tqdm._lock`, il
lock globale, e `TqdmDefaultWriteLock.mp_lock`, il lock multiprocessing che quello contiene. Finché uno dei
due resta referenziato il semaforo non viene chiuso e il resource_tracker di multiprocessing stampa
«There appear to be 1 leaked semaphore objects to clean up at shutdown». Il semaforo non è una perdita
vera (il processo sta finendo), ma il rumore sul log confonde chi cerca errori veri: lo rilasciamo noi.
"""
from __future__ import annotations

import logging

log = logging.getLogger("voce.risorse")


def rilascia_lock_tqdm() -> None:
    """Toglie i riferimenti al lock globale di tqdm: il semaforo viene chiuso e deregistrato subito.

    Va chiamata nel ciclo di vita dell'app (lifespan), dopo lo stop del worker. Non si può usare dopo
    `uvicorn.run`: uvicorn, a fine arresto, ri-lancia il segnale (SIGTERM) con il gestore predefinito, quindi
    il processo muore senza eseguire il codice che segue e senza atexit. Non fa nulla se tqdm non è
    installata o non ha mai creato il lock. Gli attributi `_lock` e `mp_lock` sono di tqdm (versione fissata
    in requirements.lock): se cambiano, il test in tests/test_risorse.py se ne accorge.
    """
    try:
        from tqdm.std import tqdm
        from tqdm.std import TqdmDefaultWriteLock
    except ImportError:
        return
    rilasciato = False
    if "_lock" in vars(tqdm):
        del tqdm._lock
        rilasciato = True
    if getattr(TqdmDefaultWriteLock, "mp_lock", None) is not None:
        TqdmDefaultWriteLock.mp_lock = None
        rilasciato = True
    if rilasciato:
        log.debug("lock di tqdm rilasciato")

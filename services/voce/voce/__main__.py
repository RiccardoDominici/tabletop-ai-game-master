"""Avvio: `services/voce/.venv/bin/python -m voce` (con cwd services/voce), oppure scripts/voce-avvio.sh."""
from __future__ import annotations

import logging
import os

# Il modello è già nella cache HF: niente rete all'avvio (load_model altrimenti
# interroga huggingface.co a ogni partenza e senza rete rallenta o fallisce).
os.environ.setdefault("HF_HUB_OFFLINE", "1")

import uvicorn  # noqa: E402

from .app import crea_app  # noqa: E402
from .coda import Coda  # noqa: E402
from .config import Impostazioni  # noqa: E402
from .diario import DiarioJsonl, configura_stdout  # noqa: E402
from .motore import MotoreQwen  # noqa: E402
from .registro import carica_registro  # noqa: E402

log = logging.getLogger("voce")


def main() -> None:
    configura_stdout()
    imp = Impostazioni()
    voci = carica_registro(imp.registro_voci)  # errori del registro: meglio fallire subito, prima del modello
    log.info("registro %s: %s; intervallo streaming %.2f s", imp.registro_voci, ", ".join(voci),
             imp.intervallo_streaming)
    diario = DiarioJsonl(imp.file_log)
    diario.scrivi("avvio", modello=imp.modello, voci=list(voci), intervallo_streaming=imp.intervallo_streaming,
                  limite_cache_mlx_mb=imp.limite_cache_mlx_mb)
    coda = Coda(MotoreQwen(imp), voci, diario, qos=imp.qos_worker or None)
    app = crea_app(imp, coda)
    # h11 esplicito: comportamento deterministico (httptools non è installato) e ASGI spec 2.3,
    # che fa ascoltare a Starlette la disconnessione del client durante lo streaming.
    uvicorn.run(app, host=imp.host, port=imp.porta, http="h11", log_level="info",
                timeout_graceful_shutdown=3)


if __name__ == "__main__":
    main()

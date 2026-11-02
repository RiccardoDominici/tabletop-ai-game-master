"""API HTTP del servizio voce (contratto in docs/f0-contratti.md, sezione «Servizio voce»).

Perché Starlette + uvicorn e non http.server della stdlib:
  - StreamingResponse con un generatore asincrono fa il chunked encoding da sé;
  - con uvicorn (ASGI spec 2.3) Starlette ascolta "http.disconnect" in parallelo
    allo streaming e CANCELLA il generatore appena il client chiude, anche se in
    quel momento la richiesta è ancora in coda e non sta scrivendo nulla. Con
    http.server la chiusura si scopre solo alla prima write fallita.
  - sono due dipendenze piccole e mature, senza il resto di un framework.
Il generatore del corpo è `async def` di proposito: un generatore sincrono girerebbe
in un threadpool e la cancellazione non lo raggiungerebbe in tempo.
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, StreamingResponse
from starlette.routing import Route

from .coda import FINE, Coda, ErroreGenerazione, Lavoro
from .config import Impostazioni
from .pcm import FORMATO
from .testo import normalizza

log = logging.getLogger("voce.http")

MAX_CARATTERI = 2000  # una richiesta è una frase o poco più; oltre è quasi certamente un errore del chiamante


def _errore(stato: int, messaggio: str) -> JSONResponse:
    return JSONResponse({"errore": messaggio}, status_code=stato)


async def _leggi_json(request: Request) -> dict | None:
    try:
        corpo = await request.json()
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    return corpo if isinstance(corpo, dict) else None


def crea_app(imp: Impostazioni, coda: Coda) -> Starlette:
    async def salute(_: Request) -> JSONResponse:
        return JSONResponse({
            "pronto": coda.pronto.is_set(),
            "modello": imp.modello,
            "sample_rate": coda.sample_rate,
            "formato": FORMATO,
            "voci": list(coda.voci),
            # campi in più rispetto al contratto, utili per la diagnosi
            "errore_avvio": coda.errore_avvio,
            **coda.stato(),
        })

    async def tts(request: Request):
        dati = await _leggi_json(request)
        if dati is None:
            return _errore(400, "corpo JSON non valido: serve {id, voce, testo}")
        id_ = dati.get("id")
        voce = dati.get("voce")
        testo = dati.get("testo")
        if not isinstance(id_, str) or not id_.strip():
            return _errore(400, "id mancante")
        if not isinstance(voce, str) or voce not in coda.voci:
            return _errore(404, f"voce sconosciuta: {voce!r}; disponibili: {', '.join(coda.voci)}")
        if not isinstance(testo, str) or not testo.strip():
            return _errore(400, "testo vuoto")
        if len(testo) > MAX_CARATTERI:
            return _errore(400, f"testo troppo lungo ({len(testo)} caratteri, massimo {MAX_CARATTERI})")
        letto = normalizza(testo)
        if not letto:
            return _errore(400, "testo vuoto dopo la normalizzazione (solo simboli o markup)")
        if not coda.pronto.is_set():
            return _errore(503, coda.errore_avvio or "servizio non ancora pronto (riscaldamento in corso)")

        lavoro = Lavoro(id=id_, voce=voce, testo=letto, caratteri=len(testo),
                        loop=asyncio.get_running_loop(), uscita=asyncio.Queue())
        coda.accoda(lavoro)
        if letto != testo.strip():
            log.debug("id=%s normalizzato: %r -> %r", id_, testo, letto)

        async def corpo():
            try:
                while True:
                    elemento = await lavoro.uscita.get()
                    if elemento is FINE:
                        return
                    if isinstance(elemento, ErroreGenerazione):
                        # Gli header 200 sono già partiti: l'unico modo di segnalare
                        # l'errore è troncare la risposta chunked (il client vede la chiusura).
                        raise elemento
                    yield elemento
            finally:
                # Arriviamo qui anche per CancelledError (client disconnesso) o GeneratorExit.
                if lavoro.stato != "finito":
                    lavoro.annulla("disconnessione")

        return StreamingResponse(
            corpo(),
            media_type="application/octet-stream",
            headers={"X-Sample-Rate": str(coda.sample_rate), "X-Formato": FORMATO, "Cache-Control": "no-store"},
        )

    async def annulla(request: Request) -> JSONResponse:
        dati = await _leggi_json(request)
        if dati is None or not isinstance(dati.get("id"), str):
            return _errore(400, "serve {id}")
        return JSONResponse({"annullata": coda.annulla(dati["id"], "annulla")})

    @contextlib.asynccontextmanager
    async def ciclo_di_vita(_app):
        coda.avvia()
        yield
        coda.ferma()

    return Starlette(
        routes=[
            Route("/salute", salute, methods=["GET"]),
            Route("/tts", tts, methods=["POST"]),
            Route("/annulla", annulla, methods=["POST"]),
        ],
        lifespan=ciclo_di_vita,
    )

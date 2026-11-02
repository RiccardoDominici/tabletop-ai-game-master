"""Coda FIFO delle richieste e thread worker unico che parla con MLX.

Perché un solo thread: MLX non è thread-safe e lega gli array allo stream del
thread che li ha creati. Il worker quindi carica il modello, prepara le voci, le
riscalda e poi esegue le generazioni una alla volta, in ordine di arrivo.

Ponte verso l'HTTP (asyncio): ogni Lavoro ha una asyncio.Queue; il worker ci
mette i pezzi di PCM con loop.call_soon_threadsafe e alla fine FINE (o un
ErroreGenerazione). L'interruzione va nel verso opposto con un threading.Event,
controllato dal worker tra un pezzo e l'altro del modello.
"""
from __future__ import annotations

import asyncio
import logging
import queue
import threading
import time
from dataclasses import dataclass, field

from .diario import DiarioJsonl
from .motore import InfoGenerazione
from .pcm import float_a_s16le, secondi
from .priorita import imposta_qos_thread
from .registro import Voce

log = logging.getLogger("voce.coda")

FINE = object()  # sentinella: la generazione è finita (completa o interrotta)


class ErroreGenerazione(RuntimeError):
    """Errore del modello a generazione iniziata: la risposta HTTP viene troncata."""


@dataclass
class Lavoro:
    id: str
    voce: str
    testo: str  # già normalizzato
    caratteri: int  # lunghezza del testo ricevuto (prima della normalizzazione)
    loop: asyncio.AbstractEventLoop
    uscita: asyncio.Queue
    annullato: threading.Event = field(default_factory=threading.Event)
    motivo_annullo: str | None = None
    stato: str = "in_coda"  # in_coda -> in_corso -> finito
    t_arrivo: float = field(default_factory=time.perf_counter)
    t_inizio: float | None = None
    t_primo: float | None = None
    t_fine: float | None = None
    byte: int = 0

    def annulla(self, motivo: str) -> None:
        if not self.annullato.is_set():
            self.motivo_annullo = motivo
            self.annullato.set()

    def consegna(self, elemento) -> None:
        """Dal worker al loop asyncio. Se il loop è già chiuso (arresto) non c'è nessuno da avvisare."""
        try:
            self.loop.call_soon_threadsafe(self.uscita.put_nowait, elemento)
        except RuntimeError:
            pass


def _ms(a: float | None, b: float | None) -> float | None:
    return None if a is None or b is None else round((b - a) * 1000, 1)


class Coda:
    """Possiede il motore. Interfaccia minima richiesta al motore (vedi motore.MotoreQwen):
    carica(), prepara_voci(voci), riscalda(), genera(testo, voce, info=...), sample_rate.
    """

    def __init__(self, motore, voci: dict[str, Voce], diario: DiarioJsonl, qos: str | None = "interattiva"):
        self.motore = motore
        self.qos = qos
        self.voci = voci
        self.diario = diario
        self.pronto = threading.Event()
        self.errore_avvio: str | None = None
        self._q: queue.Queue = queue.Queue()
        self._attivi: dict[str, list[Lavoro]] = {}
        self._lock = threading.Lock()
        self._in_corso: Lavoro | None = None
        self._thread = threading.Thread(target=self._esegui, name="voce-worker", daemon=True)

    # --------------------------------------------------------------- pubblico
    def avvia(self) -> None:
        self._thread.start()

    def ferma(self, attesa_s: float = 5.0) -> None:
        if self._in_corso is not None:
            self._in_corso.annulla("arresto")
        self._q.put(None)
        self._thread.join(timeout=attesa_s)

    @property
    def sample_rate(self) -> int:
        return int(self.motore.sample_rate)

    def stato(self) -> dict:
        with self._lock:
            in_coda = sum(1 for ls in self._attivi.values() for lv in ls if lv.stato == "in_coda")
        return {"in_coda": in_coda, "in_corso": self._in_corso.id if self._in_corso else None}

    def accoda(self, lavoro: Lavoro) -> None:
        with self._lock:
            self._attivi.setdefault(lavoro.id, []).append(lavoro)
        self._q.put(lavoro)

    def annulla(self, id_: str, motivo: str = "annulla") -> bool:
        """Ferma il lavoro in corso o lo toglie dalla coda. False se l'id non è attivo."""
        with self._lock:
            trovati = [lv for lv in self._attivi.get(id_, []) if lv.stato != "finito"]
        for lv in trovati:
            lv.annulla(motivo)
        return bool(trovati)

    # ----------------------------------------------------------------- worker
    def _esegui(self) -> None:
        if self.qos:
            # Il ciclo di generazione è legato alla CPU (Python + dispatch dei kernel):
            # chiediamo i core di prestazione anche quando la macchina è carica.
            log.info("QoS del worker '%s': %s", self.qos, "ok" if imposta_qos_thread(self.qos) else "non impostata")
        try:
            t0 = time.perf_counter()
            caricamento = self.motore.carica()
            preparazione = self.motore.prepara_voci(self.voci)
            riscaldamento = self.motore.riscalda()
            self.pronto.set()
            self.diario.scrivi("pronto", caricamento_s=round(caricamento, 2),
                               preparazione_s={k: round(v, 3) for k, v in preparazione.items()},
                               riscaldamento_s={k: round(v, 2) for k, v in riscaldamento.items()},
                               avvio_totale_s=round(time.perf_counter() - t0, 2))
            log.info("pronto in %.1f s, voci: %s", time.perf_counter() - t0, ", ".join(self.voci))
        except Exception as e:  # noqa: BLE001 — l'errore va mostrato in /salute, non deve uccidere l'HTTP
            self.errore_avvio = f"{type(e).__name__}: {e}"
            log.exception("avvio del motore fallito")
            self.diario.scrivi("errore_avvio", errore=self.errore_avvio)
            return

        while True:
            lavoro = self._q.get()
            if lavoro is None:
                break
            try:
                self._esegui_lavoro(lavoro)
            finally:
                with self._lock:
                    ls = self._attivi.get(lavoro.id, [])
                    if lavoro in ls:
                        ls.remove(lavoro)
                    if not ls:
                        self._attivi.pop(lavoro.id, None)

    def _esegui_lavoro(self, lv: Lavoro) -> None:
        info = InfoGenerazione()
        errore = None
        lv.t_inizio = time.perf_counter()
        if lv.annullato.is_set():
            # Annullato (o client sparito) mentre era in coda: non si genera nulla.
            lv.stato = "finito"
            lv.t_fine = lv.t_inizio
            lv.consegna(FINE)
            self._registra(lv, info, None)
            return

        lv.stato = "in_corso"
        self._in_corso = lv
        try:
            gen = self.motore.genera(lv.testo, lv.voce, info=info)
            try:
                for audio in gen:
                    if lv.annullato.is_set():
                        break
                    dati = float_a_s16le(audio)
                    if lv.t_primo is None:
                        lv.t_primo = time.perf_counter()
                    lv.byte += len(dati)
                    lv.consegna(dati)
                    if lv.annullato.is_set():
                        break
            finally:
                gen.close()  # sullo stesso thread: chiude anche il generatore MLX della libreria
        except Exception as e:  # noqa: BLE001
            errore = f"{type(e).__name__}: {e}"
            log.exception("generazione fallita (id %s)", lv.id)
        finally:
            self._in_corso = None
            lv.t_fine = time.perf_counter()
            lv.stato = "finito"
            lv.consegna(FINE if errore is None else ErroreGenerazione(errore))
            self._registra(lv, info, errore)

    def _registra(self, lv: Lavoro, info: InfoGenerazione, errore: str | None) -> None:
        audio_s = secondi(lv.byte, self.sample_rate)
        gen_s = (lv.t_fine - lv.t_inizio) if lv.t_fine and lv.t_inizio else None
        riga = {
            "id": lv.id,
            "voce": lv.voce,
            "caratteri": lv.caratteri,
            "caratteri_letti": len(lv.testo),
            # tutti i tempi in ms dall'arrivo della richiesta, salvo dove indicato
            "attesa_coda_ms": _ms(lv.t_arrivo, lv.t_inizio),
            "primo_audio_ms": _ms(lv.t_arrivo, lv.t_primo),
            "primo_audio_gen_ms": _ms(lv.t_inizio, lv.t_primo),  # dall'inizio della generazione
            "totale_ms": _ms(lv.t_arrivo, lv.t_fine),
            "generazione_ms": _ms(lv.t_inizio, lv.t_fine),
            "secondi_audio": round(audio_s, 3),
            # RTF = tempo di generazione / secondi di audio (< 1: più veloce del parlato)
            "rtf": round(gen_s / audio_s, 3) if gen_s and audio_s > 0 else None,
            "annullata": lv.annullato.is_set(),
            "motivo": lv.motivo_annullo,
            "pezzi": info.pezzi,
            "token": info.token,
            "troncata": info.troncata,
            "picco_mlx_gb": round(info.picco_mlx_gb, 3),
            "errore": errore,
        }
        self.diario.scrivi("tts", **riga)
        log.info("tts id=%s voce=%s car=%d coda=%sms primo=%sms totale=%sms audio=%.2fs rtf=%s%s%s",
                 lv.id, lv.voce, lv.caratteri, riga["attesa_coda_ms"], riga["primo_audio_ms"], riga["totale_ms"],
                 audio_s, riga["rtf"], f" ANNULLATA({lv.motivo_annullo})" if riga["annullata"] else "",
                 f" ERRORE {errore}" if errore else "")

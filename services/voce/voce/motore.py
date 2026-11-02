"""Motore di sintesi: Qwen3-TTS 0.6B Base (MLX, mlx-audio 0.6.3) con voci clonate (ICL).

ATTENZIONE: MLX non è thread-safe e lega gli array allo stream del thread che li
crea. Tutti i metodi di MotoreQwen vanno chiamati dallo STESSO thread (il worker
di coda.py), compresi caricamento e riscaldamento.

Cosa abbiamo trovato leggendo mlx_audio/tts/models/qwen3_tts/qwen3_tts.py (0.6.3)
a proposito del condizionamento sulla voce, ad ogni chiamata a generate():
  1. se ref_audio è un percorso, il file viene riletto e ricampionato (44,1 -> 24 kHz);
     se è un mx.array viene usato così com'è (API pubblica: ref_audio: str | mx.array);
  2. i codici della clip (encoder del tokenizer audio) e i token di ref_text sono già
     messi in cache dalla libreria (Model._icl_cache, chiave = testo + impronta audio);
  3. l'embedding del parlante (x-vector, mel + ECAPA) viene RICALCOLATO ogni volta
     (_prepare_icl_generation_inputs -> extract_speaker_embedding, nessuna cache);
  4. il prefill del talker (ruolo + prefisso + testo di riferimento + testo nuovo +
     codici della clip, ~200 posizioni) si rifà ogni volta. Non si può riusare una
     KV-cache del prefisso: il testo nuovo sta PRIMA dei codici della clip, quindi la
     parte comune finisce dopo pochi token.
Quindi precalcoliamo una volta per voce (1) l'audio a 24 kHz come mx.array e (3)
l'embedding del parlante, che restituiamo da una piccola cache sostituendo
extract_speaker_embedding SOLO su questa istanza del modello. La (2) la riempie il
riscaldamento. Il guadagno misurato è nel README.
"""
from __future__ import annotations

import logging
import math
import time
from collections.abc import Iterator
from dataclasses import dataclass, field

import numpy as np

from .config import Impostazioni
from .registro import Voce

log = logging.getLogger("voce.motore")

TOKEN_AL_SECONDO = 12.5  # frequenza dei codici di Qwen3-TTS-12Hz


@dataclass
class InfoGenerazione:
    """Riempita da MotoreQwen.genera mentre produce l'audio."""

    token: int = 0
    pezzi: int = 0
    campioni: int = 0
    tetto_token: int = 0
    troncata: bool = False  # True se ha raggiunto il tetto di token (probabile generazione in fuga)
    picco_mlx_gb: float = 0.0


@dataclass
class _VocePronta:
    voce: Voce
    audio: object  # mx.array 1-D a 24 kHz
    embedding: object | None = None  # mx.array [1, dim]


@dataclass
class MotoreQwen:
    impostazioni: Impostazioni
    # Interruttori per misurare il guadagno (banco/misura_latenza.py); in servizio restano veri.
    audio_precaricato: bool = True
    cache_embedding: bool = True

    modello: object = None
    sample_rate: int = 24000
    _voci: dict[str, _VocePronta] = field(default_factory=dict)

    # ------------------------------------------------------------------ avvio
    def carica(self) -> float:
        """Carica pesi e tokenizer. Restituisce i secondi impiegati."""
        import mlx.core as mx
        from mlx_audio.tts.utils import load_model

        limite = self.impostazioni.limite_cache_mlx_mb * 1024 * 1024
        precedente = mx.set_cache_limit(limite)
        log.info("cache MLX limitata a %d MB (prima: %.0f MB)", self.impostazioni.limite_cache_mlx_mb,
                 precedente / 2**20)

        t0 = time.perf_counter()
        self.modello = load_model(self.impostazioni.modello)
        durata = time.perf_counter() - t0
        self.sample_rate = int(self.modello.sample_rate)

        lingue = getattr(self.modello.config.talker_config, "codec_language_id", None) or {}
        if self.impostazioni.lingua not in lingue:
            # Senza id di lingua il modello va in "auto": funziona ma l'accento peggiora.
            log.warning("lingua '%s' assente dal checkpoint (disponibili: %s)", self.impostazioni.lingua,
                        sorted(lingue))
        if self.cache_embedding:
            self._installa_cache_embedding()
        log.info("modello %s caricato in %.2f s, sample rate %d, memoria MLX attiva %.2f GB",
                 self.impostazioni.modello, durata, self.sample_rate, mx.get_active_memory() / 1e9)
        return durata

    def _installa_cache_embedding(self) -> None:
        """Sostituisce extract_speaker_embedding sull'istanza con una versione che,
        per gli array delle voci registrate, restituisce l'embedding precalcolato.

        Il confronto è per IDENTITÀ dell'oggetto (non per id() soltanto), così un
        array qualsiasi che non sia una clip registrata passa all'originale.
        """
        originale = self.modello.extract_speaker_embedding
        voci = self._voci

        def estrai_con_cache(audio, sr: int = 24000):
            for vp in voci.values():
                if vp.audio is audio and vp.embedding is not None:
                    return vp.embedding
            return originale(audio, sr)

        self._estrai_originale = originale
        self.modello.extract_speaker_embedding = estrai_con_cache

    def prepara_voci(self, voci: dict[str, Voce]) -> dict[str, float]:
        """Precarica audio (24 kHz) ed embedding di ogni voce. Restituisce i secondi per voce."""
        import mlx.core as mx
        from mlx_audio.utils import load_audio

        tempi = {}
        for vid, voce in voci.items():
            t0 = time.perf_counter()
            audio = load_audio(str(voce.file), sample_rate=self.sample_rate)
            mx.eval(audio)
            vp = _VocePronta(voce=voce, audio=audio)
            if self.cache_embedding:
                vp.embedding = self._estrai_originale(audio, self.sample_rate)
                mx.eval(vp.embedding)
            self._voci[vid] = vp
            tempi[vid] = time.perf_counter() - t0
            log.info("voce '%s' preparata in %.3f s (%.2f s di clip)", vid, tempi[vid],
                     audio.shape[0] / self.sample_rate)
        return tempi

    def riscalda(self) -> dict[str, float]:
        """Una generazione completa per voce: compila i kernel e riempie la cache ICL."""
        tempi = {}
        for vid in self._voci:
            t0 = time.perf_counter()
            for _ in self.genera(self.impostazioni.frase_riscaldamento, vid):
                pass
            tempi[vid] = time.perf_counter() - t0
            log.info("riscaldamento '%s': %.2f s", vid, tempi[vid])
        return tempi

    # ------------------------------------------------------------ generazione
    @property
    def voci(self) -> list[str]:
        return list(self._voci)

    def tetto_token(self, testo: str) -> int:
        """Massimo di token concessi a un testo (vedi Impostazioni.tetto_*)."""
        imp = self.impostazioni
        secondi_max = imp.tetto_secondi_base + len(testo) / imp.tetto_caratteri_al_secondo
        return min(imp.tetto_token_assoluto, math.ceil(secondi_max * TOKEN_AL_SECONDO))

    def genera(self, testo: str, voce_id: str, info: InfoGenerazione | None = None,
               intervallo: float | None = None) -> Iterator[np.ndarray]:
        """Genera `testo` con la voce `voce_id`, in streaming.

        Produce array float32 mono a self.sample_rate, uno per pezzo del modello.
        Chi consuma può fermarsi in qualsiasi momento (break / close()): il
        generatore della libreria viene chiuso e la cache MLX svuotata.
        """
        import mlx.core as mx

        vp = self._voci[voce_id]  # KeyError se la voce non esiste: lo controlla chi chiama
        info = info if info is not None else InfoGenerazione()
        info.tetto_token = self.tetto_token(testo)
        ref_audio = vp.audio if self.audio_precaricato else str(vp.voce.file)
        gen = self.modello.generate(
            text=testo,
            ref_audio=ref_audio,
            ref_text=vp.voce.testo_rif,
            lang_code=self.impostazioni.lingua,
            stream=True,
            streaming_interval=intervallo or self.impostazioni.intervallo_streaming,
            max_tokens=info.tetto_token,
        )
        completata = False
        try:
            for r in gen:
                audio = np.asarray(r.audio, dtype=np.float32).reshape(-1)
                info.token += int(r.token_count or 0)
                info.picco_mlx_gb = max(info.picco_mlx_gb, float(r.peak_memory_usage or 0.0))
                if audio.size == 0:
                    continue
                info.pezzi += 1
                info.campioni += audio.size
                yield audio
            completata = True
            info.troncata = info.token >= info.tetto_token
            if info.troncata:
                log.warning("generazione troncata al tetto di %d token (voce %s, %d caratteri)",
                            info.tetto_token, voce_id, len(testo))
        finally:
            # Su interruzione la libreria non arriva al suo reset/clear_cache finale:
            # chiudiamo il generatore (qui, sullo stesso thread) e svuotiamo noi la cache.
            gen.close()
            if not completata:
                mx.clear_cache()

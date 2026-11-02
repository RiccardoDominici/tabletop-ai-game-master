"""Dove va il tempo di un passo di generazione (un frame = 80 ms di audio)?

Avvolge con un cronometro (e un mx.eval forzato) il talker, il code predictor
e il decoder in streaming. Il mx.eval rompe la valutazione pigra, quindi i
tempi assoluti salgono un po': conta la PROPORZIONE tra le parti.
Uso (con il servizio fermo o inattivo):
    services/voce/.venv/bin/python services/voce/banco/profilo_passo.py
"""
from __future__ import annotations

import sys
import time
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from misura_latenza import BREVE  # noqa: E402
from voce.config import Impostazioni  # noqa: E402
from voce.motore import InfoGenerazione, MotoreQwen  # noqa: E402
from voce.registro import carica_registro  # noqa: E402


def main() -> None:
    import mlx.core as mx
    from mlx_audio.tts.models.qwen3_tts import speech_tokenizer as S
    from mlx_audio.tts.models.qwen3_tts import talker as T
    from mlx_audio.tts.models.qwen3_tts.qwen3_tts import Model

    imp = Impostazioni()
    motore = MotoreQwen(imp)
    motore.carica()
    motore.prepara_voci(carica_registro(imp.registro_voci))
    motore.riscalda()

    tempi = defaultdict(float)
    conteggi = defaultdict(int)

    def cronometra(nome, f):
        def avvolta(*a, **k):
            t0 = time.perf_counter()
            out = f(*a, **k)
            mx.eval(out[0] if isinstance(out, tuple) else out)
            tempi[nome] += time.perf_counter() - t0
            conteggi[nome] += 1
            return out
        return avvolta

    T.Qwen3TTSTalkerForConditionalGeneration.__call__ = cronometra(
        "talker", T.Qwen3TTSTalkerForConditionalGeneration.__call__)
    T.Qwen3TTSTalkerCodePredictor.__call__ = cronometra("code_predictor", T.Qwen3TTSTalkerCodePredictor.__call__)
    Model._sample_token = cronometra("campionamento", Model._sample_token)
    # il decoder è avvolto da mx.compile (non accetta attributi): si avvolge il metodo della classe
    S.Qwen3TTSSpeechTokenizerDecoder.streaming_step = cronometra(
        "decoder", S.Qwen3TTSSpeechTokenizerDecoder.streaming_step)

    for giro in range(2):
        tempi.clear()
        conteggi.clear()
        info = InfoGenerazione()
        t0 = time.perf_counter()
        for _ in motore.genera(BREVE, "narratore", info=info):
            pass
        totale = time.perf_counter() - t0
        audio_s = info.campioni / motore.sample_rate
        print(f"giro {giro}: totale {totale:.2f} s per {audio_s:.2f} s di audio ({info.token} frame), "
              f"{1000 * totale / max(1, info.token):.1f} ms/frame")
        for nome in ("talker", "code_predictor", "campionamento", "decoder"):
            print(f"  {nome:15s} {tempi[nome]:6.2f} s  ({100 * tempi[nome] / totale:4.1f}%)  "
                  f"{conteggi[nome]:5d} chiamate  {1000 * tempi[nome] / max(1, conteggi[nome]):.2f} ms/chiamata")


if __name__ == "__main__":
    main()

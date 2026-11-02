"""Il primo audio dopo una pausa è più lento: perché, e cosa lo evita?

Misurato via HTTP: dopo 20 s di inattività il primo audio passa da ~0,37 s a
0,50-0,70 s (0,88 s dopo 45 s). Nel gioco quella pausa c'è SEMPRE: è la finestra
in cui i giocatori scrivono l'azione. Qui si confrontano, intercalate, alcune
contromisure durante una pausa di `--pausa` secondi:
  - nulla;
  - matmul: un piccolo prodotto di matrici ogni secondo (tiene su solo il clock della GPU);
  - wired: mx.set_wired_limit, i buffer del modello restano residenti (niente paginazione);
  - tocco: ogni 2 s un passo del talker e del code predictor su un token (tocca i pesi);
  - risveglio: nulla durante la pausa, poi ~0,8 s di generazione buttata subito prima della
    richiesta (come se il server avvisasse quando chiude la finestra e l'LLM sta scrivendo).
Uso (servizio voce inattivo o fermo):
    services/voce/.venv/bin/python services/voce/banco/inattivita.py --giri 3 --pausa 20
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from misura_latenza import una_corsa  # noqa: E402
from voce.config import RADICE_REPO, Impostazioni  # noqa: E402
from voce.motore import MotoreQwen  # noqa: E402
from voce.registro import carica_registro  # noqa: E402

FRASE = "Il vento porta odore di pioggia sulla piazza del mercato."


def main() -> None:
    import mlx.core as mx

    ap = argparse.ArgumentParser()
    ap.add_argument("--giri", type=int, default=3)
    ap.add_argument("--pausa", type=float, default=20.0)
    ap.add_argument("--configurazioni", default="nulla,matmul,wired,tocco")
    args = ap.parse_args()

    imp = Impostazioni()
    motore = MotoreQwen(imp)
    motore.carica()
    motore.prepara_voci(carica_registro(imp.registro_voci))
    motore.riscalda()
    limite_wired = int(mx.device_info()["max_recommended_working_set_size"])

    a = mx.random.normal((512, 512))

    def tocca_pesi() -> None:
        """Un passo del talker e del code predictor su un token, senza cache (tocca i pesi)."""
        talker = motore.modello.talker
        emb = talker.get_input_embeddings()(mx.array([[motore.modello.config.talker_config.codec_pad_id]]))
        logits, hidden = talker(emb)
        codici, _, _ = talker.code_predictor(mx.concatenate([hidden[:, -1:, :], emb], axis=1), cache=None,
                                             generation_step=0)
        mx.eval(logits, codici)

    def attendi(nome: str, secondi: float) -> None:
        fine = time.perf_counter() + secondi
        while time.perf_counter() < fine:
            if nome == "matmul":
                mx.eval(a @ a)
                time.sleep(1.0)
            elif nome == "tocco":
                tocca_pesi()
                time.sleep(2.0)
            elif nome == "risveglio":
                # nulla per tutta la pausa, poi ~0,8 s di generazione buttata subito prima
                # della richiesta: simula un "sveglia" mandato quando si chiude la finestra
                time.sleep(max(0.0, fine - time.perf_counter()))
                motore.risveglia(0.8)
                return
            else:
                time.sleep(0.2)

    corse: dict[str, list] = {k: [] for k in args.configurazioni.split(",")}
    for g in range(args.giri):
        for nome in corse:
            mx.set_wired_limit(limite_wired if nome == "wired" else 0)
            una_corsa(motore, FRASE, "narratore", imp.intervallo_streaming)  # stato "caldo" di partenza
            attendi(nome, args.pausa)
            r = una_corsa(motore, FRASE, "narratore", imp.intervallo_streaming)
            corse[nome].append(r)
            print(f"giro {g} {nome:8s} dopo {args.pausa:.0f} s: primo audio {r['primo_audio_s']:.3f} s, "
                  f"rtf {r['rtf']:.3f}", flush=True)
    mx.set_wired_limit(0)
    sintesi = {k: {"primo_audio_med_s": round(statistics.median(c["primo_audio_s"] for c in v), 3),
                   "rtf_med": round(statistics.median(c["rtf"] for c in v), 3)} for k, v in corse.items()}
    for k, v in sintesi.items():
        print(f"{k:8s} mediana primo audio {v['primo_audio_med_s']} s, RTF {v['rtf_med']}")
    uscita = RADICE_REPO / "logs" / "voce-banco"
    uscita.mkdir(parents=True, exist_ok=True)
    (uscita / "inattivita.json").write_text(json.dumps({"pausa_s": args.pausa, "sintesi": sintesi, "corse": corse},
                                                      ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()

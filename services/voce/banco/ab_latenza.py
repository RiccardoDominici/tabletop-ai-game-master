"""Confronto A/B INTERCALATO delle impostazioni del motore (in processo, senza HTTP).

Perché intercalato: la macchina è condivisa (browser, Docker, altri agenti) e il
carico cambia di minuto in minuto. Ripetere in serie "tutte le A, poi tutte le B"
confonde il carico con l'effetto; qui ogni giro prova tutte le configurazioni una
dopo l'altra, e si confrontano le mediane su più giri.

Uso (servizio voce FERMO):
    services/voce/.venv/bin/python services/voce/banco/ab_latenza.py --giri 6
Salva in logs/voce-banco/ab.json.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from misura_latenza import BREVE, LUNGO, una_corsa  # noqa: E402
from voce.config import RADICE_REPO, Impostazioni  # noqa: E402
from voce.motore import MotoreQwen  # noqa: E402
from voce.priorita import imposta_qos_thread  # noqa: E402
from voce.registro import carica_registro  # noqa: E402

GB = 1024**3


def main() -> None:
    import mlx.core as mx

    ap = argparse.ArgumentParser()
    ap.add_argument("--giri", type=int, default=6)
    ap.add_argument("--esperimento", choices=["impostazioni", "intervalli"], default="impostazioni")
    ap.add_argument("--intervalli", default="0.24,0.32,0.4,0.5")
    ap.add_argument("--testo", choices=["breve", "lungo"], default="breve")
    args = ap.parse_args()
    logging.basicConfig(level=logging.WARNING)
    testo = BREVE if args.testo == "breve" else LUNGO

    imp = Impostazioni()
    voci = carica_registro(imp.registro_voci)
    motore = MotoreQwen(imp)
    motore.carica()
    motore.prepara_voci(voci)
    motore.riscalda()
    embeddings = {k: vp.embedding for k, vp in motore._voci.items()}

    def applica(cfg: dict) -> None:
        motore.audio_precaricato = cfg.get("precaricato", True)
        for k, vp in motore._voci.items():
            vp.embedding = embeddings[k] if cfg.get("embedding", True) else None
        mx.set_cache_limit(int(cfg.get("cache_gb", 1) * GB))
        imposta_qos_thread(cfg.get("qos", "interattiva"))

    if args.esperimento == "impostazioni":
        configurazioni = {
            "ieri": {"precaricato": False, "embedding": False, "cache_gb": 64, "qos": "default"},
            "cond_cache": {"precaricato": True, "embedding": True, "cache_gb": 64, "qos": "default"},
            "cond_cache+qos": {"precaricato": True, "embedding": True, "cache_gb": 64, "qos": "interattiva"},
            "cond_cache+qos+cache1gb": {"precaricato": True, "embedding": True, "cache_gb": 1, "qos": "interattiva"},
        }
        intervallo = {k: 0.5 for k in configurazioni}
    else:
        configurazioni = {}
        intervallo = {}
        for iv in args.intervalli.split(","):
            configurazioni[f"intervallo_{iv}"] = {"precaricato": True, "embedding": True, "cache_gb": 1,
                                                  "qos": "interattiva"}
            intervallo[f"intervallo_{iv}"] = float(iv)

    corse: dict[str, list] = {k: [] for k in configurazioni}
    for g in range(args.giri):
        for nome, cfg in configurazioni.items():
            applica(cfg)
            r = una_corsa(motore, testo, "narratore", intervallo[nome])
            r["carico_1min"] = round(os.getloadavg()[0], 2)
            corse[nome].append(r)
            print(f"giro {g} {nome:28s} primo {r['primo_audio_s']:.3f} s  rtf {r['rtf']:.3f}  "
                  f"audio {r['audio_s']:.2f} s  picco {r['picco_mlx_gb']:.2f} GB  carico {r['carico_1min']}",
                  flush=True)

    sintesi = {}
    for nome, cs in corse.items():
        sintesi[nome] = {
            "primo_audio_med_s": round(statistics.median(c["primo_audio_s"] for c in cs), 3),
            "rtf_med": round(statistics.median(c["rtf"] for c in cs), 3),
            "primo_audio_min_s": round(min(c["primo_audio_s"] for c in cs), 3),
            "rtf_min": round(min(c["rtf"] for c in cs), 3),
            "picco_mlx_gb": max(c["picco_mlx_gb"] for c in cs),
        }
        print(f"{nome:28s} mediana primo {sintesi[nome]['primo_audio_med_s']} s, RTF {sintesi[nome]['rtf_med']} "
              f"(min {sintesi[nome]['primo_audio_min_s']} / {sintesi[nome]['rtf_min']})", flush=True)

    uscita = RADICE_REPO / "logs" / "voce-banco"
    uscita.mkdir(parents=True, exist_ok=True)
    nome_file = f"ab_{args.esperimento}_{args.testo}.json"
    (uscita / nome_file).write_text(json.dumps(
        {"data": time.strftime("%Y-%m-%d %H:%M"), "testo": testo, "configurazioni": configurazioni,
         "intervallo": intervallo, "sintesi": sintesi, "corse": corse}, ensure_ascii=False, indent=1))
    print("salvato", uscita / nome_file)


if __name__ == "__main__":
    main()

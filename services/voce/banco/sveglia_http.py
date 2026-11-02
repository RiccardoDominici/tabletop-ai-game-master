"""Verifica di POST /sveglia sul servizio IN ESECUZIONE (come lo userà il server).

Per ogni giro, intercalati: pausa di `--pausa` s, poi
  - "nulla":   POST /tts subito;
  - "sveglia": POST /sveglia, attesa di 0,9 s (la prima frase di Haiku), poi POST /tts.
Il primo audio è misurato dal client dall'invio di /tts.
Uso: services/voce/.venv/bin/python services/voce/banco/sveglia_http.py --giri 3 --pausa 20
"""
from __future__ import annotations

import argparse
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from prova import LOG_JSONL, Client, riga_server  # noqa: E402

FRASE = "Il vento porta odore di pioggia sulla piazza del mercato."


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://127.0.0.1:4611")
    ap.add_argument("--giri", type=int, default=3)
    ap.add_argument("--pausa", type=float, default=20.0)
    ap.add_argument("--anticipo", type=float, default=0.9, help="secondi tra /sveglia e /tts")
    args = ap.parse_args()
    cl = Client(args.url)
    esiti: dict[str, list] = {"nulla": [], "sveglia": []}
    for g in range(args.giri):
        for modo in esiti:
            time.sleep(args.pausa)
            if modo == "sveglia":
                cl.json("POST", "/sveglia", {})
                time.sleep(args.anticipo)
            off = LOG_JSONL.stat().st_size
            id_ = f"sveglia-{modo}-{g}-{int(time.time())}"
            e = cl.tts(id_, "narratore", FRASE)
            s = riga_server(off, id_) or {}
            esiti[modo].append((e["primo_audio_s"], s.get("rtf"), s.get("attesa_coda_ms")))
            print(f"giro {g} {modo:8s}: primo audio {e['primo_audio_s']:.3f} s, rtf {s.get('rtf')}, "
                  f"coda {s.get('attesa_coda_ms')} ms", flush=True)
    for modo, v in esiti.items():
        print(f"{modo:8s} mediana primo audio {statistics.median(x[0] for x in v):.3f} s, "
              f"RTF {statistics.median(x[1] for x in v):.3f}")


if __name__ == "__main__":
    main()

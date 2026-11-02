"""Passo 2 della prova di normalizzazione: Whisper + WER sul manifesto del passo 1.

Va eseguito con un Python che abbia mlx-whisper (NON è una dipendenza del servizio):
    <venv con mlx-whisper>/bin/python -I services/voce/banco/valuta_normalizzazione.py [etichetta]
Modello: mlx-community/whisper-large-v3-turbo (già in cache HF), lingua it.
Scrive logs/voce-banco/normalizzazione/valutazione.json e stampa il riepilogo.
"""
from __future__ import annotations

import json
import re
import statistics
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parents[3]
DIR = RADICE / "logs" / "voce-banco" / "normalizzazione"
MODELLO = "mlx-community/whisper-large-v3-turbo"


def parole(t: str) -> list[str]:
    t = t.lower().replace("%", " per cento ").replace("'", " ").replace("’", " ")
    t = re.sub(r"[^\w\sàèéìòù]", " ", t)
    return t.split()


def wer(rif: str, ipotesi: str) -> float:
    r, h = parole(rif), parole(ipotesi)
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prec, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prec + (r[i - 1] != h[j - 1]))
            prec, d[j] = d[j], cur
    return d[len(h)] / max(1, len(r))


def main() -> None:
    import mlx_whisper

    etichetta = sys.argv[1] if len(sys.argv) > 1 else ""
    righe = json.loads((DIR / f"manifesto{etichetta}.json").read_text())
    for r in righe:
        out = mlx_whisper.transcribe(r["file"], path_or_hf_repo=MODELLO, language="it")
        r["trascrizione"] = out["text"].strip()
        r["wer"] = round(wer(r["atteso"], r["trascrizione"]), 3)
        print(f"{r['caso']:20s} {r['forma']:12s} {r['campione']} WER {r['wer']:.3f} {r['secondi']:5.2f} s  "
              f"| {r['trascrizione']}", flush=True)
    (DIR / f"valutazione{etichetta}.json").write_text(json.dumps(righe, ensure_ascii=False, indent=1))

    print("\nriepilogo (media su campioni)")
    casi = sorted({r["caso"] for r in righe}, key=[r["caso"] for r in righe].index)
    for forma in ("grezzo", "normalizzato"):
        tutti = [r["wer"] for r in righe if r["forma"] == forma]
        print(f"  {forma:12s} WER medio {statistics.mean(tutti):.3f}  troncate "
              f"{sum(r['troncata'] for r in righe if r['forma'] == forma)}")
    for c in casi:
        g = statistics.mean(r["wer"] for r in righe if r["caso"] == c and r["forma"] == "grezzo")
        n = statistics.mean(r["wer"] for r in righe if r["caso"] == c and r["forma"] == "normalizzato")
        sg = statistics.mean(r["secondi"] for r in righe if r["caso"] == c and r["forma"] == "grezzo")
        sn = statistics.mean(r["secondi"] for r in righe if r["caso"] == c and r["forma"] == "normalizzato")
        print(f"  {c:20s} grezzo {g:.3f} ({sg:.1f} s)  normalizzato {n:.3f} ({sn:.1f} s)")


if __name__ == "__main__":
    sys.exit(main())

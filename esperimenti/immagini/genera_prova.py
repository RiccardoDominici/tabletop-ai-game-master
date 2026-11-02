"""Prova di stile e coerenza (FLUX.2 klein 4B, 4 bit, mflux) per la campagna «prova-f0».

Genera uno o più lotti definiti in prompt_prova.py (stile_v0, a_v0, b_v0, …), un processo mflux per
immagine (vedi strumenti/immagini/motore.py). Salta le immagini già fatte. Salva il PNG originale in
png/ (fuori da git) e un JPEG leggero in jpg/; registra tutto in log.jsonl (una riga per immagine,
con prompt, seme, tempi, picco di memoria, swap del sistema prima/dopo).

    strumenti/immagini/.venv/bin/python esperimenti/immagini/genera_prova.py stile_v0 a_v0 b_v0

Per i tempi alle varie risoluzioni c'è bench_cli.sh.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import subprocess
import sys
import time
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI.parents[1] / "strumenti" / "immagini"))  # motore.py condiviso con lo strumento

import prompt_prova  # noqa: E402
from motore import Motore, salva_jpeg  # noqa: E402

DIR_PNG = QUI / "png"   # originali a piena risoluzione, ignorati da git (.gitignore locale)
DIR_JPG = QUI / "jpg"   # copie leggere da committare
LOG = QUI / "log.jsonl"

log = logging.getLogger("immagini.prova")


def swap_mb() -> float | None:
    """Swap usato dal sistema, in MB (per vedere se una generazione ha spinto in swap)."""
    out = subprocess.run(["sysctl", "-n", "vm.swapusage"], capture_output=True, text=True).stdout
    m = re.search(r"used = ([\d.,]+)M", out)
    return float(m.group(1).replace(",", ".")) if m else None


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("lotti", nargs="+", help="es. stile_v0 a_v0 b_v0")
    p.add_argument("--rifai", action="store_true", help="rigenera anche le immagini già presenti")
    p.add_argument("--no-fp16", action="store_true", help="calcolo in bfloat16 invece di float16")
    args = p.parse_args()

    DIR_PNG.mkdir(exist_ok=True)
    DIR_JPG.mkdir(exist_ok=True)
    motore = Motore(fp16=not args.no_fp16)
    lavori = [lav for nome in args.lotti for lav in prompt_prova.lotto(nome)]
    for lav in lavori:
        png = DIR_PNG / f"{lav['id']}.png"
        if png.exists() and not args.rifai:
            log.info("già fatta: %s", lav["id"])
            continue
        rif = [DIR_PNG / f"{r}.png" for r in lav["riferimenti"]]
        if any(not r.exists() for r in rif):
            log.error("salto %s: mancano i riferimenti %s", lav["id"], lav["riferimenti"])
            continue
        s0 = swap_mb()
        e = motore.genera(lav["prompt"], lav["seme"], lav["larghezza"], lav["altezza"], png, riferimenti=rif)
        s1 = swap_mb()
        jpg = salva_jpeg(png, DIR_JPG / f"{lav['id']}.jpg")
        riga = {
            **lav, "file": str(jpg.relative_to(QUI)), "secondi": round(e.secondi, 1),
            "picco_gb": round(e.picco_gb, 2) if e.picco_gb else None, "modello": motore.descrizione,
            "swap_mb": [s0, s1], "quando": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        with LOG.open("a") as f:
            f.write(json.dumps(riga, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()

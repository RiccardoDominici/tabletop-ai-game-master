"""Prova di generazione immagini in locale (FLUX.2 klein 4B, 4 bit, mflux) per «prova-f0».

Due modalità:

  bench  — misura i tempi a una risoluzione: carica il modello, genera N immagini dello stesso prompt,
           stampa una riga JSON (caricamento, tempi, picco MLX, swap prima/dopo). Da lanciare sotto
           `/usr/bin/time -l` per avere anche il picco di memoria del processo.
           es.  /usr/bin/time -l .venv/bin/python genera_prova.py bench --dim 1024x576 --n 2

  lotto  — genera un lotto di prompt_prova.py (stile_v0, a_v0, b_v0, …). Salta le immagini già fatte.
           Salva il PNG originale in png/ (fuori da git) e un JPEG leggero in jpg/; registra tutto in
           log.jsonl (una riga per immagine, con prompt, seme, tempi).
           es.  .venv/bin/python genera_prova.py lotto stile_v0 b_v0

Il venv è quello dello strumento: strumenti/immagini/.venv/bin/python.
"""

from __future__ import annotations

import argparse
import json
import logging
import re
import resource
import subprocess
import sys
import time
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI.parents[1] / "strumenti" / "immagini"))  # motore.py condiviso con lo strumento

import prompt_prova  # noqa: E402
from motore import Motore, salva_jpeg, verifica_alimentazione  # noqa: E402

DIR_PNG = QUI / "png"   # originali a piena risoluzione, ignorati da git (.gitignore locale)
DIR_JPG = QUI / "jpg"   # copie leggere da committare
LOG = QUI / "log.jsonl"

log = logging.getLogger("immagini.prova")


def swap_e_pageout() -> dict:
    """Istantanea della memoria virtuale: swap usato (MB) e pageout cumulativi del sistema."""
    swap = subprocess.run(["sysctl", "-n", "vm.swapusage"], capture_output=True, text=True).stdout
    used = re.search(r"used = ([\d.,]+)M", swap)
    vm = subprocess.run(["vm_stat"], capture_output=True, text=True).stdout
    pageouts = re.search(r"Pageouts:\s+(\d+)", vm)
    swapouts = re.search(r"Swapouts:\s+(\d+)", vm)
    return {
        "swap_mb": float(used.group(1).replace(",", ".")) if used else None,
        "pageouts": int(pageouts.group(1)) if pageouts else None,
        "swapouts": int(swapouts.group(1)) if swapouts else None,
    }


def cmd_bench(args) -> None:
    """Tempi a una risoluzione. La prima immagine include il riscaldamento (compilazione dei kernel)."""
    larg, alt = (int(x) for x in args.dim.split("x"))
    prima = swap_e_pageout()
    m = Motore(fp16=args.fp16)
    prompt = f"{prompt_prova.prompt_luogo()}, {prompt_prova.STILI['v0']}"
    tempi, picchi = [], []
    for i in range(args.n):
        e = m.genera(prompt, seme=1000 + i, larghezza=larg, altezza=alt)
        tempi.append(round(e.secondi, 1))
        picchi.append(round(e.picco_gb, 2))
        nome = f"bench_{larg}x{alt}{'_fp16' if args.fp16 else ''}_{i}"
        e.immagine.save(DIR_PNG / f"{nome}.png")
    dopo = swap_e_pageout()
    print(json.dumps({
        "bench": args.dim, "fp16": args.fp16, "caricamento_s": round(m.secondi_caricamento, 1),
        "tempi_s": tempi, "picco_mlx_gb": picchi,
        "maxrss_gb": round(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / 1000**3, 2),  # byte su macOS
        "swap_prima": prima, "swap_dopo": dopo,
    }), flush=True)


def cmd_lotto(args) -> None:
    """Genera i lotti richiesti, saltando le immagini il cui PNG esiste già."""
    lavori = [lav for nome in args.lotti for lav in prompt_prova.lotto(nome)]
    da_fare = [lav for lav in lavori if args.rifai or not (DIR_PNG / f"{lav['id']}.png").exists()]
    log.info("%d lavori, %d da fare", len(lavori), len(da_fare))
    if not da_fare:
        return
    m = Motore(fp16=args.fp16)
    for lav in da_fare:
        rif = [DIR_PNG / f"{r}.png" for r in lav["riferimenti"]]
        mancanti = [str(r) for r in rif if not r.exists()]
        if mancanti:
            log.error("salto %s: mancano i riferimenti %s", lav["id"], mancanti)
            continue
        prima = swap_e_pageout()
        e = m.genera(lav["prompt"], seme=lav["seme"], larghezza=lav["larghezza"], altezza=lav["altezza"],
                     riferimenti=rif)
        dopo = swap_e_pageout()
        e.immagine.save(DIR_PNG / f"{lav['id']}.png")
        jpg = salva_jpeg(e.immagine, DIR_JPG / f"{lav['id']}.jpg")
        riga = {
            **lav, "file": str(jpg.relative_to(QUI)), "secondi": round(e.secondi, 1),
            "picco_mlx_gb": round(e.picco_gb, 2), "modello": m.descrizione,
            "swap_delta_mb": (dopo["swap_mb"] or 0) - (prima["swap_mb"] or 0),
            "pageouts_delta": (dopo["pageouts"] or 0) - (prima["pageouts"] or 0),
            "quando": time.strftime("%Y-%m-%d %H:%M:%S"),
        }
        with LOG.open("a") as f:
            f.write(json.dumps(riga, ensure_ascii=False) + "\n")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--fp16", action="store_true", help="calcolo interno in float16 (consigliato da mflux su M1)")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("bench")
    b.add_argument("--dim", required=True, help="LARGHEZZAxALTEZZA, multipli di 16")
    b.add_argument("--n", type=int, default=2)
    lo = sub.add_parser("lotto")
    lo.add_argument("lotti", nargs="+")
    lo.add_argument("--rifai", action="store_true", help="rigenera anche le immagini già presenti")
    args = p.parse_args()

    verifica_alimentazione()  # a batteria scarica non si parte
    DIR_PNG.mkdir(exist_ok=True)
    DIR_JPG.mkdir(exist_ok=True)
    {"bench": cmd_bench, "lotto": cmd_lotto}[args.cmd](args)


if __name__ == "__main__":
    main()

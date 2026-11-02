"""Genera le immagini di una campagna in locale (FLUX.2 klein 4B a 4 bit, mflux, Apple Silicon).

    strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --dry-run
    strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0
    strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --solo ritratto

Cosa fa:
  1. legge la campagna (solo i campi per le immagini, vedi campagna.py) e compone le richieste:
     luoghi (16:9), ritratti dei PNG (3:4), situazioni dei PNG col ritratto come riferimento (16:9);
  2. salta quelle il cui file esiste già in campagne/<id>/immagini/;
  3. carica il modello UNA volta e genera le altre in ordine di dipendenza;
  4. dopo ogni immagine aggiorna campagne/<id>/immagini/manifest.json (id, file, prompt, seme,
     modello, secondi), così un'interruzione non fa perdere il lavoro già fatto.

--dry-run non carica il modello e non scrive nulla: stampa dove scriverebbe e con quale prompt.
Tempi su M1 16 GB: vedi esperimenti/immagini/risultati.md.
"""

from __future__ import annotations

import argparse
import logging
import sys
import time
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from campagna import Richiesta, richieste  # noqa: E402
from manifest import Manifest  # noqa: E402

log = logging.getLogger("immagini.genera")

QUALITA_JPEG = 90  # asset per il proiettore: buona qualità, ~200-300 KB a 1024 px


def pianifica(cartella: Path, solo: str | None) -> tuple[list[Richiesta], list[Richiesta], Manifest]:
    """Ritorna (da_fare, gia_fatte, manifest). Con --solo si filtra per tipo, ma i riferimenti mancanti restano un errore."""
    tutte = richieste(cartella)
    if solo:
        tutte = [r for r in tutte if r.tipo == solo]
    man = Manifest(cartella / "immagini")
    gia = [r for r in tutte if man.gia_fatta(r.id, r.file)]
    return [r for r in tutte if r not in gia], gia, man


def stampa_piano(cartella: Path, da_fare: list[Richiesta], gia: list[Richiesta]) -> None:
    dest = cartella / "immagini"
    print(f"campagna: {cartella}   destinazione: {dest}/")
    print(f"già presenti (saltate): {len(gia)}   da generare: {len(da_fare)}\n")
    for r in da_fare:
        rif = f"  riferimenti: {', '.join(x + '.jpg' for x in r.riferimenti)}" if r.riferimenti else ""
        print(f"- [{r.tipo}] {dest / r.file}  {r.larghezza}x{r.altezza}  seme={r.seme}{rif}")
        print(f"    prompt: {r.prompt}\n")
    print(f"manifest: {dest / 'manifest.json'}")


def esegui(cartella: Path, da_fare: list[Richiesta], man: Manifest, fp16: bool) -> None:
    """Genera davvero. Import pigri: il motore porta con sé MLX e ~4,6 GB di pesi."""
    from motore import Motore, salva_jpeg, verifica_alimentazione

    verifica_alimentazione()
    dest = cartella / "immagini"
    motore = Motore(fp16=fp16)
    for i, r in enumerate(da_fare, 1):
        rif = [dest / f"{x}.jpg" for x in r.riferimenti]
        mancanti = [p.name for p in rif if not p.exists()]
        if mancanti:
            log.error("salto %s: mancano i riferimenti %s", r.id, mancanti)
            continue
        log.info("(%d/%d) %s", i, len(da_fare), r.id)
        e = motore.genera(r.prompt, r.seme, r.larghezza, r.altezza, riferimenti=rif)
        salva_jpeg(e.immagine, dest / r.file, lato_max=max(r.larghezza, r.altezza), qualita=QUALITA_JPEG)
        man.registra({
            "id": r.id, "file": r.file, "tipo": r.tipo, "prompt": r.prompt, "seme": r.seme,
            "larghezza": r.larghezza, "altezza": r.altezza, "riferimenti": r.riferimenti,
            "modello": motore.descrizione, "secondi": round(e.secondi, 1),
            "quando": time.strftime("%Y-%m-%d %H:%M:%S"),
        })


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("campagna", type=Path, help="cartella della campagna, es. campagne/prova-f0")
    p.add_argument("--dry-run", action="store_true", help="stampa il piano senza caricare il modello né scrivere")
    p.add_argument("--solo", choices=["luogo", "ritratto", "situazione"], help="genera solo un tipo")
    p.add_argument("--fp16", action="store_true", help="calcolo interno in float16 (vedi risultati.md)")
    args = p.parse_args()

    cartella = args.campagna.resolve()
    da_fare, gia, man = pianifica(cartella, args.solo)
    if args.dry_run:
        stampa_piano(cartella, da_fare, gia)
        return
    if not da_fare:
        log.info("niente da fare: tutte le immagini ci sono già")
        return
    esegui(cartella, da_fare, man, args.fp16)


if __name__ == "__main__":
    main()

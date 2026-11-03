"""Genera le immagini di una campagna in locale (FLUX.2 klein 4B a 4 bit, mflux, Apple Silicon).

    strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --dry-run
    strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --solo luogo --solo ritratto
    strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --id ritratto_png_ottavia
    strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --id luogo_n_piazza --rifai --seme 7

Cosa fa:
  1. legge la campagna (solo i campi per le immagini, vedi campagna.py) e compone le richieste:
     luoghi (16:9, scene e nodi), ritratti dei PNG (3:4), situazioni dei PNG col ritratto come
     riferimento (16:9), alias (un nodo che è una scena: stesso file, nessuna generazione);
  2. salta quelle AGGIORNATE: il file c'è e la firma nel manifest è quella che le schede di oggi darebbero
     (freschezza.py). Rigenera le mancanti e le VECCHIE (dice perché nel log); toglie dal manifest le
     orfane (non più nelle schede) e ne sposta il file in immagini/cache/orfane/. Con --rifai, tutte;
  3. prima di OGNI immagine rilegge le schede (un altro agente o una persona può averle appena
     corrette), controlla alimentazione e disco, poi lancia un processo mflux (vedi motore.py);
  4. dopo ogni immagine aggiorna campagne/<id>/immagini/manifest.json (id, file, prompt, seme,
     modello, secondi), così un'interruzione non fa perdere il lavoro già fatto; alla fine registra
     gli alias i cui file esistono.

--dry-run non carica il modello e non scrive nulla: stampa vecchie (con il perché), orfane, e dove
scriverebbe e con quale prompt FINALE (stile e formato del proiettore compresi, vedi formato.py).
--rifai --seme N rigenera un'immagine con un altro seme (il seme usato finisce nel manifest).
Tempi su M1 16 GB: vedi esperimenti/immagini/risultati.md.
"""

from __future__ import annotations

import argparse
import logging
import sys
import tempfile
import time
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

from campagna import Richiesta, dimensioni_generazione, richieste  # noqa: E402
from freschezza import Stato, classifica, firma, migra, seme_di, sposta_orfane  # noqa: E402
from manifest import Manifest  # noqa: E402

log = logging.getLogger("immagini.genera")

# Asset per il proiettore: ~88 tiene il tratteggio a inchiostro senza blocchi visibili;
# un luogo 1920x1080 pesa ~0,8-1,2 MB, un ritratto 768x1024 ~0,3 MB.
QUALITA_JPEG = 88


def filtra(tutte: list[Richiesta], solo: list[str] | None, ids: list[str] | None) -> list[Richiesta]:
    """Filtra per tipo (--solo, ripetibile) e per id (--id, ripetibile). Un id sconosciuto è un errore."""
    if ids:
        noti = {r.id for r in tutte}
        ignoti = [i for i in ids if i not in noti]
        if ignoti:
            raise SystemExit(f"id sconosciuti: {', '.join(ignoti)}. Noti: {', '.join(sorted(noti))}")
        tutte = [r for r in tutte if r.id in ids]
    if solo:
        tutte = [r for r in tutte if r.tipo in solo]
    return tutte


def modello_attuale(fp16: bool) -> str:
    """L'etichetta del modello che entra nella firma (la stessa che esegui() scrive nel manifest)."""
    from motore import Motore

    return Motore(fp16=fp16).descrizione


def pianifica(cartella: Path, solo: list[str] | None, ids: list[str] | None, rifai: bool,
              fp16: bool = True) -> tuple[list[Richiesta], Stato, list[Richiesta], Manifest]:
    """Ritorna (da_generare, stato, alias, manifest).

    Da generare: le MANCANTI e le VECCHIE (firma diversa da quella di oggi, vedi freschezza.py), nell'ordine
    delle richieste (i riferimenti prima di chi li usa). Con --rifai, tutte quelle scelte.
    Le orfane si cercano sempre su tutte le richieste della campagna, anche con --id o --solo.
    """
    tutte = richieste(cartella)
    scelte = filtra(tutte, solo, ids)
    man = Manifest(cartella / "immagini")
    st = classifica(scelte, tutte, man, modello_attuale(fp16))
    alias = [r for r in scelte if r.alias_di]
    vere = [r for r in scelte if not r.alias_di]
    da_rifare = {r.id for r in st.mancanti} | {r.id for r, _ in st.vecchie}
    return [r for r in vere if rifai or r.id in da_rifare], st, alias, man


def stampa_piano(cartella: Path, da_fare: list[Richiesta], st: Stato, alias: list[Richiesta]) -> None:
    dest = cartella / "immagini"
    print(f"campagna: {cartella}   destinazione: {dest}/")
    print(f"aggiornate (saltate): {len(st.aggiornate)}   mancanti: {len(st.mancanti)}   vecchie: {len(st.vecchie)}   "
          f"da generare: {len(da_fare)}   alias: {len(alias)}   orfane: {len(st.orfane)}\n")
    for r, perche in st.vecchie:
        print(f"- [vecchia] {r.id}: {perche}")
    for ident in st.orfane:
        print(f"- [orfana] {ident}: non è più nelle schede → {dest}/cache/orfane/")
    if st.vecchie or st.orfane:
        print()
    for r in da_fare:
        rif = f"  riferimenti: {', '.join(x + '.jpg' for x in r.riferimenti)}" if r.riferimenti else ""
        gl, ga = dimensioni_generazione(r.larghezza, r.altezza)
        gen = f" (generata {gl}x{ga})" if (gl, ga) != (r.larghezza, r.altezza) else ""
        print(f"- [{r.tipo}] {dest / r.file}  {r.larghezza}x{r.altezza}{gen}  seme={r.seme}{rif}")
        print(f"    prompt: {r.prompt}\n")
    for r in alias:
        print(f"- [alias] {r.id} → {r.file}")
    print(f"\nmanifest: {dest / 'manifest.json'}")


def rileggi(cartella: Path, r: Richiesta) -> Richiesta | None:
    """La stessa richiesta ricomposta dalle schede come sono ADESSO su disco (None se è sparita)."""
    nuova = next((x for x in richieste(cartella) if x.id == r.id), None)
    if nuova is None:
        log.warning("%s: non c'è più nelle schede, saltata", r.id)
    elif nuova.prompt != r.prompt:
        log.info("%s: le schede sono cambiate dall'inizio, uso il prompt nuovo", r.id)
    return nuova


def registra_alias(alias: list[Richiesta], man: Manifest) -> None:
    """Una voce per alias, solo se il file a cui punta esiste (altrimenti il server la scarterebbe comunque)."""
    for r in alias:
        if not (man.cartella / r.file).exists():
            log.warning("alias %s: manca %s, non lo registro", r.id, r.file)
            continue
        man.registra({"id": r.id, "file": r.file, "tipo": r.tipo, "alias_di": r.alias_di,
                      "quando": time.strftime("%Y-%m-%d %H:%M:%S")})
        log.info("alias %s → %s", r.id, r.file)


def esegui(cartella: Path, da_fare: list[Richiesta], man: Manifest, fp16: bool, seme: int | None,
           perche: dict[str, str] | None = None) -> None:
    """Genera davvero: un processo mflux per immagine (vedi motore.py), poi JPEG + voce nel manifest."""
    from PIL import Image

    from motore import Motore, salva_jpeg, verifica_alimentazione, verifica_disco
    from rifila import rifila

    dest = cartella / "immagini"
    motore = Motore(fp16=fp16)
    with tempfile.TemporaryDirectory(prefix="cantastorie-img-") as tmp:
        for i, r in enumerate(da_fare, 1):
            r = rileggi(cartella, r)
            if r is None:
                continue
            verifica_alimentazione()
            verifica_disco(dest.parent)
            s = seme if seme is not None else seme_di(r, man)  # seme appiccicoso: quello già scelto resta
            rif = [dest / f"{x}.jpg" for x in r.riferimenti]
            mancanti = [p.name for p in rif if not p.exists()]
            if mancanti:
                log.error("salto %s: mancano i riferimenti %s", r.id, mancanti)
                continue
            gl, ga = dimensioni_generazione(r.larghezza, r.altezza)
            log.info("(%d/%d) %s %dx%d seme=%d%s", i, len(da_fare), r.id, gl, ga, s,
                     f" — vecchia: {perche[r.id]}" if perche and r.id in perche else "")
            # Il PNG di mflux resta in una cartella temporanea: nella campagna va solo il JPEG.
            e = motore.genera(r.prompt, s, gl, ga, Path(tmp) / f"{r.id}.png", riferimenti=rif)
            with Image.open(e.percorso) as png:
                img, rifilato = png.convert("RGB"), 0.0
            # Tutti i tipi: l'orlo bianco abbaglia sul proiettore, e i ritratti con lo sfondo dipinto
            # (ponte-lanterne) hanno lo stesso orlo strappato. Su un fondo scuro pieno rifila() non
            # trova carta e non tocca niente.
            img, rifilato = rifila(img)
            salva_jpeg(img, dest / r.file, qualita=QUALITA_JPEG, dimensioni=(r.larghezza, r.altezza))
            kb = (dest / r.file).stat().st_size / 1000
            man.registra({
                "id": r.id, "file": r.file, "tipo": r.tipo, "prompt": r.prompt, "seme": s,
                "larghezza": r.larghezza, "altezza": r.altezza, "generata": [gl, ga],
                **r.extra, "riferimenti": r.riferimenti, "modello": motore.descrizione, "secondi": round(e.secondi, 1),
                "picco_gb": round(e.picco_gb, 2) if e.picco_gb else None, "kb": round(kb),
                "rifilato_pct": round(rifilato * 100, 1),
                # La firma dei riferimenti è quella registrata ADESSO (sono generati prima di chi li usa).
                "firma": firma(r.prompt, [(x, (man.voci.get(x) or {}).get("firma")) for x in r.riferimenti],
                               motore.descrizione, (r.larghezza, r.altezza), (gl, ga), s),
                "quando": time.strftime("%Y-%m-%d %H:%M:%S"),
            })
            log.info("salvata %s (%.0f KB, qualità %d)", r.file, kb, QUALITA_JPEG)


def rifila_esistenti(cartella: Path, scelte: list[Richiesta], man: Manifest) -> None:
    """Rifila l'orlo di carta dei JPEG già fatti prima che esistesse rifila.py (solo CPU, niente modello).

    Si tocca solo un luogo o una situazione la cui voce nel manifest non ha ancora `rifilato_pct`.
    Si lavora sul JPEG perché il PNG originale non c'è più: una ricompressione in più a qualità 88,
    che a vista non si nota. Nel manifest resta scritto (`rifilato_dal_jpeg`).
    """
    from PIL import Image

    from motore import salva_jpeg
    from rifila import MINIMO, rifila

    for r in scelte:
        voce = man.voci.get(r.id)
        # Si salta solo ciò che è già stato rifilato davvero: uno 0 può voler dire «mai controllato»
        # (i ritratti, prima che si rifilassero anche loro), e ricontrollare un'immagine pulita non la tocca.
        if r.alias_di or not voce or (voce.get("rifilato_pct") or 0) >= MINIMO * 100:
            continue
        percorso = man.cartella / voce["file"]
        if not percorso.exists():
            continue
        with Image.open(percorso) as jpg:
            img, tolto = rifila(jpg.convert("RGB"))
        if tolto:
            salva_jpeg(img, percorso, qualita=QUALITA_JPEG, dimensioni=(voce["larghezza"], voce["altezza"]))
        voce = {**voce, "rifilato_pct": round(tolto * 100, 1), "rifilato_dal_jpeg": bool(tolto),
                "kb": round(percorso.stat().st_size / 1000)}
        man.registra(voce)
        log.info("%s: rifilato %.1f%% per lato dal JPEG", r.id, tolto * 100)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("campagna", type=Path, help="cartella della campagna, es. campagne/prova-f0")
    p.add_argument("--dry-run", action="store_true", help="stampa il piano senza caricare il modello né scrivere")
    p.add_argument("--solo", action="append", choices=["luogo", "ritratto", "situazione"],
                   help="genera solo questo tipo (ripetibile)")
    p.add_argument("--id", action="append", dest="ids", help="genera solo questo id (ripetibile)")
    p.add_argument("--rifai", action="store_true", help="rigenera anche se il file c'è già (lo sovrascrive)")
    p.add_argument("--seme", type=int, help="seme al posto di quello ricavato dall'id (solo con un --id)")
    p.add_argument("--no-fp16", action="store_true", help="calcolo in bfloat16 (float16 è il default: ~20%% più veloce su M1)")
    p.add_argument("--dim-luogo", metavar="LxA",
                   help="dimensioni di luoghi e situazioni per questa corsa, es. 1280x720 (2,5 volte più veloce di 1920x1080)")
    p.add_argument("--rifila-esistenti", action="store_true",
                   help="non genera: rifila l'orlo di carta dei luoghi già fatti che non sono stati rifilati (solo CPU)")
    args = p.parse_args()
    if args.seme is not None and len(args.ids or []) != 1:
        p.error("--seme vale per una sola immagine: indica esattamente un --id")

    if args.dim_luogo:
        import campagna
        try:
            dim = tuple(int(x) for x in args.dim_luogo.lower().split("x"))
            assert len(dim) == 2 and min(dim) > 0
        except (ValueError, AssertionError):
            p.error("--dim-luogo vuole LARGHEZZAxALTEZZA, es. 1280x720")
        # Le funzioni di campagna.py leggono queste costanti a ogni chiamata (anche in rileggi()).
        campagna.DIM_LUOGO = campagna.DIM_SITUAZIONE = dim

    cartella = args.campagna.resolve()
    if not args.dry_run:
        # Una tantum (idempotente): firma alle voci fatte prima che esistesse, ricalcolata da come sono
        # state fatte, non dal prompt di oggi (vedi freschezza.py, «Migrazione»).
        migra(Manifest(cartella / "immagini"))
    if args.rifila_esistenti:
        rifila_esistenti(cartella, filtra(richieste(cartella), args.solo, args.ids), Manifest(cartella / "immagini"))
        return
    da_fare, st, alias, man = pianifica(cartella, args.solo, args.ids, args.rifai, fp16=not args.no_fp16)
    if args.dry_run:
        stampa_piano(cartella, da_fare, st, alias)
        return
    for r, perche in st.vecchie:
        log.info("vecchia: %s (%s), la rigenero", r.id, perche)
    sposta_orfane(man, st.orfane)
    if da_fare:
        esegui(cartella, da_fare, man, fp16=not args.no_fp16, seme=args.seme, perche=dict(st.vecchie))
    else:
        log.info("niente da generare: le immagini richieste ci sono già")
    registra_alias(alias, man)


if __name__ == "__main__":
    main()

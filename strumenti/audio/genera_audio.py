"""Produce l'audio di una campagna dai suoi dati: musica di luogo e d'umore, temi dei PNG, ambienti, effetti.

    strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/ponte-lanterne --dry-run
    strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/ponte-lanterne
    strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/prova-f0 --solo temi --rifai

Prima volta: strumenti/audio/setup.sh (ambiente Python e SoundFont).

Cosa fa:
  1. legge SOLO i campi pubblici della campagna (campagna_audio.py) e ne ricava i descrittori
     (descrittori.py): umore, energia, ambientazione, ora, meteo per luogo; strati d'ambiente;
     effetti; una specifica di tema per PNG. I campi espliciti `audio`/`tema` vincono sulle regole;
  2. musica: sceglie da Incompetech (CC BY 4.0) un brano diverso per luogo e per umore, scarica
     solo quelli, ne taglia un loop di ~2,5 minuti con la giunta cucita;
  3. temi: il motivo della campagna (deterministico, seminato dall'id) variato per ogni PNG e
     suonato col SoundFont;
  4. ambienti ed effetti: dal fondo CC0/pubblico dominio (cache/audio/pool/, cresce da solo), o
     sintetizzati se il fondo non ha niente di buono;
  5. ogni file passa da loudnorm a due passate e dai controlli (qualita.py) e finisce, in AAC
     .m4a, in campagne/<id>/audio/ con manifest.json, crediti.md e descrittori.json.
Idempotente: ciò che ha già il suo file si salta (salvo --rifai); il manifest si aggiorna a ogni file.
--dry-run non scarica e non scrive niente: stampa descrittori, scelte e destinazioni.
"""

from __future__ import annotations

import argparse
import json
import logging
import shutil
import sys
import time
from dataclasses import asdict
from pathlib import Path

QUI = Path(__file__).resolve().parent
sys.path.insert(0, str(QUI))

import campagna_audio  # noqa: E402
import descrittori as D  # noqa: E402
import qualita as Q  # noqa: E402
import vocabolario as V  # noqa: E402
from manifest_audio import ManifestAudio  # noqa: E402
from percorsi import CACHE_LAVORO, SR  # noqa: E402

log = logging.getLogger("audio.genera")

LOOP_MUSICA = {"obiettivo_s": 150.0, "minimo_s": 100.0, "massimo_s": 180.0, "dissolvenza_s": 3.0}
LIMITE_MB = 40.0


def volume_relativo(tipo: str, guadagno: float = 1.0) -> float:
    """Il proiettore riporta ogni file a −23 LUFS col campo `lufs`: il livello voluto sta nel volume."""
    return round(guadagno * 10 ** ((Q.BERSAGLI[tipo]["lufs"] + 23) / 20), 3)


def _controllo_breve(c: dict) -> dict:
    chiavi = ("ok", "problemi", "durata_s", "lufs", "lra", "true_peak_db", "picco_db", "campioni_al_limite", "silenzi", "giunta", "codec", "kb")
    out = {k: c[k] for k in chiavi if k in c}
    out["normalizzazione"] = c.get("normalizzazione", {}).get("tipo")
    if c.get("riparata_giunta"):
        out["riparata_giunta"] = True
    return out


# --- Musica -------------------------------------------------------------------------------------
def richieste_musica(d: dict) -> list[tuple[str, dict, dict]]:
    """(id del manifest, descrittore per la scelta, campi in più) per luoghi e umori, in ordine."""
    out = []
    for l in d["luoghi"]:
        if l.alias_di or l.musica is None:
            continue
        out.append((l.id, asdict(l.musica), {"luogo": l.id.removeprefix("luogo_")}))
    for u in V.UMORI:
        out.append((f"umore_{u}", {"umore": u, "energia": V.ENERGIA_UMORE[u], "ambientazioni": [], "meteo": []}, {"umore": u}))
    return out


def fai_musica(c, d, man: ManifestAudio, dry: bool, rifai: bool, rete: bool) -> None:
    from fonti import incompetech as INC

    prof = d["profilo"]
    richieste = richieste_musica(d)
    sezione = lambda ident: "umori" if ident.startswith("umore_") else "brani"
    gia = {ident for ident, _, _ in richieste if not rifai and man.file_presente(sezione(ident), ident)}
    esclusi = {man.voce(sezione(i), i)["titolo"] for i in gia}
    da_fare = [(i, desc, extra) for i, desc, extra in richieste if i not in gia]
    print(f"\n## Musica: {len(gia)} già presenti, {len(da_fare)} da fare")
    if not da_fare:
        _alias_brani(d, man, dry)
        return
    try:
        brani = INC.catalogo(aggiorna=False) if (rete or (INC.CACHE_INCOMPETECH / "pieces.json").exists()) else None
    except Exception as e:
        log.error("catalogo Incompetech non disponibile: %s", e)
        brani = None
    if brani is None:
        print("  catalogo Incompetech non in cache e niente rete: musica saltata")
        return
    scelte = INC.scegli([(i, desc) for i, desc, _ in da_fare], prof.strumenti, prof.vietati, prof.epoca, c.id, esclusi, brani)
    for ident, desc, extra in da_fare:
        s = scelte.get(ident)
        if s is None:
            continue
        b = s.brano
        file = f"{ident}.m4a"
        print(f"- {ident}: «{b.titolo}» ({b.durata_s} s, {', '.join(sorted(b.feel))}) punteggio {s.punteggio} {s.perche}")
        if dry:
            continue
        try:
            mp3 = INC.scarica_brano(b)
            loop, info = Q.estrai_loop(Q.decodifica(mp3), **LOOP_MUSICA)
            ctl = Q.prepara(loop, man.cartella / file, "musica", True, CACHE_LAVORO)
        except Exception as e:
            log.error("%s: musica non preparata: %s", ident, e)
            continue
        man.registra(sezione(ident), {
            "id": ident, "tipo": "musica", **extra, "file": file, "loop": True,
            "lufs": ctl["lufs"], "volume": volume_relativo("musica"), "durata_s": ctl["durata_s"],
            "loop_inizio_s": ctl["loop_inizio_s"], "loop_fine_s": ctl["loop_fine_s"],
            "titolo": b.titolo, "autore": "Kevin MacLeod", "fonte": "Incompetech", "url": b.url,
            "licenza": INC.LICENZA, "crediti": b.crediti,
            "scelta": {"punteggio": s.punteggio, "perche": s.perche, "descrittori": desc,
                       "feel": sorted(b.feel), "strumenti": b.strumenti_testo, "bpm": b.bpm},
            "loop_sorgente": {"inizio_s": info.inizio_s, "fine_s": info.fine_s, "note": info.note},
            "controllo": _controllo_breve(ctl),
        })
        print(f"    → {file} {ctl['durata_s']} s, {ctl['lufs']} LUFS, {ctl['kb']} KB, {'ok' if ctl['ok'] else ctl['problemi']}")
    _alias_brani(d, man, dry)


def _alias_brani(d: dict, man: ManifestAudio, dry: bool) -> None:
    """Un nodo che ha per scheda una scena suona come la scena: stessa voce, con alias_di."""
    for l in d["luoghi"]:
        if not l.alias_di:
            continue
        bersaglio = man.voce("brani", l.alias_di)
        if dry or not bersaglio:
            continue
        man.registra("brani", {**{k: v for k, v in bersaglio.items() if k not in ("scelta", "controllo", "loop_sorgente")},
                               "id": l.id, "luogo": l.id.removeprefix("luogo_"), "alias_di": l.alias_di})


# --- Temi ---------------------------------------------------------------------------------------
def fai_temi(c, d, man: ManifestAudio, dry: bool, rifai: bool) -> None:
    import temi

    prof = d["profilo"]
    motivo = temi.motivo_campagna(c.id, prof.motivo, prof)
    print(f"\n## Temi: motivo della campagna ({motivo.origine}), modo {prof.modo}, tonica {prof.tonica}: {motivo.come_dati()['note']}")
    for s in d["temi"]:
        ident, file = f"tema_{s.png}", f"tema_{s.png}.m4a"
        print(f"- {ident}: {s.strumento}, {s.modo}, registro {s.registro}, {s.carattere}, {s.trasformazioni}")
        if dry or (not rifai and man.file_presente("temi", ident)):
            continue
        audio, info = temi.componi(s, prof, motivo)
        ctl = Q.prepara(audio, man.cartella / file, "tema", False, CACHE_LAVORO)
        man.registra("temi", {
            "id": ident, "png": s.png, "file": file, "loop": False, "durata_s": ctl["durata_s"], "lufs": ctl["lufs"],
            "volume": volume_relativo("tema"), **info, "carattere": s.carattere, "perche": s.perche,
            "motivo": motivo.come_dati(), "controllo": _controllo_breve(ctl),
        })
        print(f"    → {file} {ctl['durata_s']} s, {ctl['lufs']} LUFS, {info['suono']}, {'ok' if ctl['ok'] else ctl['problemi']}")


# --- Ambienti ed effetti --------------------------------------------------------------------------
def fai_ambienti(c, d, man: ManifestAudio, dry: bool, rifai: bool, rete: bool) -> None:
    import ambienti as A
    from pool import Pool

    pool = Pool()
    pronti: dict[tuple[str, str], tuple[A.Sorgente, dict] | None] = {}

    def prepara(tag: str, tipo: str):
        chiave = (tag, tipo)
        if chiave in pronti:
            return pronti[chiave]
        s = None if dry else A.sorgente(tag, tipo, pool, rete)
        if dry:
            buone = pool.buone(tag, tipo)
            pronti[chiave] = None
            print(f"    [{tipo} {tag}] {'fondo: ' + buone[0]['titolo'] if buone else 'sintesi' if tipo == 'ambiente' and V.AMBIENTI[tag].sintetizzabile else 'da cercare nelle fonti'}")
            return None
        if s is None:
            pronti[chiave] = None
            return None
        destinazione = man.cartella / s.nome_file
        if rifai or not destinazione.exists():
            audio, extra = A.audio_di(s, c.id)
            ctl = Q.prepara(audio, destinazione, tipo, tipo == "ambiente", CACHE_LAVORO)
        else:
            # Già fatto: si rimisura, con la durata vera presa dal manifest (senza il riempimento AAC).
            vecchia = next((v for sez in ("ambienti", "effetti") for v in man.sezioni[sez].values() if v["file"] == s.nome_file), None)
            campioni = round(vecchia["durata_s"] * SR) if vecchia else None
            punti = (round(vecchia["loop_inizio_s"] * SR), round(vecchia["loop_fine_s"] * SR)) if vecchia and "loop_inizio_s" in vecchia else None
            extra, ctl = {}, Q.analizza(destinazione, tipo == "ambiente", tipo, campioni, punti)
            ctl["kb"] = round(destinazione.stat().st_size / 1000)
        print(f"    [{tipo} {tag}] {s.nome_file}: {s.meta().get('titolo', 'sintesi')} — {ctl['durata_s']} s, {ctl['lufs']} LUFS, {'ok' if ctl['ok'] else ctl['problemi']}")
        punti = {k: ctl[k] for k in ("loop_inizio_s", "loop_fine_s") if k in ctl}
        pronti[chiave] = (s, {**extra, "controllo": _controllo_breve(ctl), "durata_s": ctl["durata_s"], **punti, "lufs": ctl["lufs"]})
        return pronti[chiave]

    print("\n## Ambienti")
    for l in d["luoghi"]:
        if l.alias_di:
            continue
        luogo = l.id.removeprefix("luogo_")
        print(f"- {l.id}: {l.ambiente}")
        # Si tolgono le voci vecchie del luogo: gli strati possono cambiare se le schede cambiano.
        for vecchia in [i for i, v in man.sezioni["ambienti"].items() if v.get("luogo") == luogo]:
            man.togli("ambienti", vecchia)
        for tag, guadagno in l.ambiente:
            r = prepara(tag, "ambiente")
            if r is None:
                continue
            s, info = r
            man.registra("ambienti", {"id": f"amb_{luogo}_{tag}", "luogo": luogo, "tag": tag, "file": s.nome_file,
                                      "loop": True, "volume": volume_relativo("ambiente", guadagno), **s.meta(), **info})
    print("\n## Effetti")
    for tag, prove in d["effetti"].items():
        print(f"- sfx_{tag}: {prove[:2]}")
        r = prepara(tag, "effetto")
        if r is None:
            continue
        s, info = r
        man.registra("effetti", {"id": f"sfx_{tag}", "tag": tag, "file": s.nome_file, "loop": False,
                                 "volume": volume_relativo("effetto"), **s.meta(), **info})


# --- Principale -------------------------------------------------------------------------------------
def dimensione_mb(cartella: Path) -> float:
    return sum(f.stat().st_size for f in cartella.glob("*.m4a")) / 1e6


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("campagna", type=Path, help="cartella della campagna, es. campagne/ponte-lanterne")
    p.add_argument("--dry-run", action="store_true", help="stampa descrittori e scelte, senza scaricare né scrivere")
    p.add_argument("--solo", action="append", choices=["musica", "temi", "ambienti"], help="solo questo strato (ripetibile)")
    p.add_argument("--rifai", action="store_true", help="rifà anche ciò che ha già il suo file")
    p.add_argument("--senza-rete", action="store_true", help="usa solo la cache (catalogo, fondo); niente download")
    p.add_argument("--aggiorna-catalogo", action="store_true", help="riscarica il catalogo di Incompetech")
    args = p.parse_args()
    solo = set(args.solo or ["musica", "temi", "ambienti"])
    rete = not args.senza_rete and not args.dry_run

    inizio = time.monotonic()
    c = campagna_audio.leggi(args.campagna)
    d = D.tutto(c)
    cartella = c.cartella / "audio"
    man = ManifestAudio(cartella, c.id)
    prof = d["profilo"]
    print(f"# Audio di «{c.titolo}» ({c.id}) → {cartella}/")
    print(f"profilo: modo {prof.modo}, tonica {prof.tonica}, {prof.bpm} bpm, epoca {prof.epoca}, "
          f"tavolozza {prof.strumenti}, vietati {prof.vietati}, umore di base {prof.umore_base}")
    for l in d["luoghi"]:
        if l.musica:
            m = l.musica
            print(f"  {l.id}: {m.umore}, energia {m.energia}, {m.ambientazioni[:3]}, ora {m.ora}, meteo {m.meteo}, "
                  f"{'dentro' if m.interno else 'fuori'}; ambiente {l.ambiente}")
        else:
            print(f"  {l.id}: alias di {l.alias_di}")
    if args.aggiorna_catalogo and rete:
        from fonti import incompetech as INC
        INC.catalogo(aggiorna=True)
    if not args.dry_run:
        cartella.mkdir(parents=True, exist_ok=True)
        (cartella / "descrittori.json").write_text(json.dumps(D.come_json(d), ensure_ascii=False, indent=1), encoding="utf-8")
    if "musica" in solo:
        fai_musica(c, d, man, args.dry_run, args.rifai, rete)
    if "temi" in solo:
        fai_temi(c, d, man, args.dry_run, args.rifai)
    if "ambienti" in solo:
        fai_ambienti(c, d, man, args.dry_run, args.rifai, rete)
    if args.dry_run:
        print(f"\n(dry-run: niente scritto; manifest sarebbe {man.percorso})")
        return
    man.salva()
    shutil.rmtree(CACHE_LAVORO, ignore_errors=True)
    mb = dimensione_mb(cartella)
    print(f"\nmanifest: {man.percorso}  crediti: {cartella / 'crediti.md'}  peso: {mb:.1f} MB  "
          f"tempo: {time.monotonic() - inizio:.0f} s")
    if mb > LIMITE_MB:
        log.warning("la cartella audio pesa %.1f MB, oltre il limite di %.0f MB", mb, LIMITE_MB)


if __name__ == "__main__":
    main()

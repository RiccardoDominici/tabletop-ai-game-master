"""Banco di misura della latenza del motore (in processo, senza HTTP).

Uso (dalla radice del repo, con il servizio voce FERMO: la RAM è una sola):
    services/voce/.venv/bin/python services/voce/banco/misura_latenza.py [--ripetizioni 3]

Misura:
  A. costo dei singoli pezzi del condizionamento sulla voce (lettura clip, embedding);
  B. primo audio e RTF con le tre varianti: come ieri (percorso + embedding ricalcolato),
     audio precaricato, audio precaricato + embedding in cache;
  C. intervalli di streaming diversi, con la variante migliore.
Definizioni: primo audio = dall'inizio della chiamata al primo pezzo non vuoto;
RTF = tempo totale di generazione / secondi di audio prodotto (< 1: più veloce del parlato).
Salva tutto in logs/voce-banco/latenza.json.
"""
from __future__ import annotations

import argparse
import json
import logging
import statistics
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from voce.config import RADICE_REPO, Impostazioni  # noqa: E402
from voce.motore import InfoGenerazione, MotoreQwen  # noqa: E402
from voce.registro import carica_registro  # noqa: E402

# Gli stessi testi delle prove del 1° novembre (research/), così i numeri sono confrontabili.
BREVE = "Ostilia versa due boccali di idromele a Benolfo e Kara, mentre fuori la pioggia batte su Brunvalle."
LUNGO = (
    "Nelle terre di Brunvalle il vento del nord porta l'odore della neve. Ostilia, la vecchia guardiana della "
    "torre, abbassò lo sguardo sulla mappa consumata e sospirò. Le legioni del Re Nero avanzavano lungo la "
    "strada di Vallestorta, e nessuno sapeva quanto restasse prima che le porte cedessero. Fu allora che il "
    "giovane Benolfo sguainò la spada, e la lama, per la prima volta da secoli, brillò di una luce antica."
)
BATTUTA = "Bah, non mi guardate così. Ho scavato per tre giorni nelle miniere e la barba è ancora piena di polvere."


def una_corsa(motore: MotoreQwen, testo: str, voce: str, intervallo: float) -> dict:
    import mlx.core as mx

    mx.reset_peak_memory()
    info = InfoGenerazione()
    t0 = time.perf_counter()
    primo = None
    for _ in motore.genera(testo, voce, info=info, intervallo=intervallo):
        if primo is None:
            primo = time.perf_counter() - t0
    totale = time.perf_counter() - t0
    audio_s = info.campioni / motore.sample_rate
    return {"primo_audio_s": round(primo, 3), "totale_s": round(totale, 3), "audio_s": round(audio_s, 3),
            "rtf": round(totale / audio_s, 3), "pezzi": info.pezzi, "token": info.token,
            "picco_mlx_gb": round(mx.get_peak_memory() / 1e9, 3)}


def serie(motore, testo, voce, intervallo, n) -> dict:
    corse = [una_corsa(motore, testo, voce, intervallo) for _ in range(n)]

    def med(k):
        return round(statistics.median(c[k] for c in corse), 3)

    return {"corse": corse, "primo_audio_med_s": med("primo_audio_s"), "rtf_med": med("rtf"),
            "totale_med_s": med("totale_s"), "audio_med_s": med("audio_s"),
            "picco_mlx_gb": max(c["picco_mlx_gb"] for c in corse)}


def main() -> None:
    import mlx.core as mx
    from mlx_audio.utils import load_audio

    ap = argparse.ArgumentParser()
    ap.add_argument("--ripetizioni", type=int, default=3)
    ap.add_argument("--intervalli", default="0.16,0.24,0.32,0.4,0.5")
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(message)s")

    imp = Impostazioni()
    voci = carica_registro(imp.registro_voci)
    motore = MotoreQwen(imp)
    risultati: dict = {"data": time.strftime("%Y-%m-%d %H:%M"), "ripetizioni": args.ripetizioni}
    risultati["caricamento_s"] = round(motore.carica(), 2)
    motore.prepara_voci(voci)
    risultati["riscaldamento_s"] = {k: round(v, 2) for k, v in motore.riscalda().items()}

    # A. costo dei pezzi del condizionamento (media di 5)
    clip = str(voci["narratore"].file)
    t0 = time.perf_counter()
    for _ in range(5):
        a = load_audio(clip, sample_rate=motore.sample_rate)
        mx.eval(a)
    lettura = (time.perf_counter() - t0) / 5
    t0 = time.perf_counter()
    for _ in range(5):
        e = motore._estrai_originale(a, motore.sample_rate)
        mx.eval(e)
    emb = (time.perf_counter() - t0) / 5
    risultati["condizionamento_ms"] = {"lettura_clip": round(lettura * 1000, 1), "embedding": round(emb * 1000, 1)}
    print("lettura clip %.1f ms, embedding %.1f ms" % (lettura * 1000, emb * 1000), flush=True)

    # B. varianti, intervallo 0,5 come ieri
    embeddings = {k: vp.embedding for k, vp in motore._voci.items()}
    varianti = {}
    for nome, precaricato, cache in [("come_ieri", False, False), ("audio_precaricato", True, False),
                                     ("precaricato_e_embedding", True, True)]:
        motore.audio_precaricato = precaricato
        for k, vp in motore._voci.items():
            vp.embedding = embeddings[k] if cache else None
        varianti[nome] = serie(motore, BREVE, "narratore", 0.5, args.ripetizioni)
        print(nome, "primo audio", varianti[nome]["primo_audio_med_s"], "RTF", varianti[nome]["rtf_med"],
              flush=True)
    risultati["varianti_intervallo_0.5"] = varianti

    # C. intervalli, variante completa (quella del servizio)
    motore.audio_precaricato = True
    for k, vp in motore._voci.items():
        vp.embedding = embeddings[k]
    intervalli = {}
    for iv in [float(x) for x in args.intervalli.split(",")]:
        intervalli[str(iv)] = {
            "breve_narratore": serie(motore, BREVE, "narratore", iv, args.ripetizioni),
            "lungo_narratore": serie(motore, LUNGO, "narratore", iv, args.ripetizioni),
            "battuta_vincent": serie(motore, BATTUTA, "vincent", iv, args.ripetizioni),
        }
        r = intervalli[str(iv)]
        print(f"intervallo {iv}: primo audio breve {r['breve_narratore']['primo_audio_med_s']} "
              f"RTF breve {r['breve_narratore']['rtf_med']} lungo {r['lungo_narratore']['rtf_med']} "
              f"vincent {r['battuta_vincent']['rtf_med']} picco {r['lungo_narratore']['picco_mlx_gb']} GB",
              flush=True)
    risultati["intervalli"] = intervalli

    uscita = RADICE_REPO / "logs" / "voce-banco"
    uscita.mkdir(parents=True, exist_ok=True)
    (uscita / "latenza.json").write_text(json.dumps(risultati, ensure_ascii=False, indent=1))
    print("salvato", uscita / "latenza.json")


if __name__ == "__main__":
    main()

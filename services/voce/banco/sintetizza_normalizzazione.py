"""Prova della normalizzazione: stesso testo "sporco" letto grezzo e normalizzato.

Passo 1 (questo script, venv del servizio): sintetizza ogni testo nelle due forme,
`--campioni` volte (il campionamento è casuale), salva i WAV e un manifesto.
Passo 2 (banco/valuta_normalizzazione.py, un venv con mlx-whisper): trascrive e
calcola il WER rispetto al testo parlato atteso.

Uso:
    services/voce/.venv/bin/python services/voce/banco/sintetizza_normalizzazione.py --campioni 2
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np  # noqa: E402

from voce.config import RADICE_REPO, Impostazioni  # noqa: E402
from voce.motore import InfoGenerazione, MotoreQwen  # noqa: E402
from voce.registro import carica_registro  # noqa: E402
from voce.testo import normalizza  # noqa: E402

# (nome, testo grezzo come potrebbe arrivare da un LLM, parole che ci si aspetta di sentire)
CASI = [
    ("virgolette_trattino", "«Vattene, straniero» disse la guardia — e chiuse la porta",
     "vattene straniero disse la guardia e chiuse la porta"),
    ("markdown_ellissi", "Il **drago** si sveglia… e *ruggisce*!!!", "il drago si sveglia e ruggisce"),
    ("dialogo_trattini", "— Chi va là? — chiese l’oste, asciugando un boccale.",
     "chi va là chiese l'oste asciugando un boccale"),
    ("scena_emoji", "La porta [cigola] si apre lentamente 🎲", "la porta si apre lentamente"),
    ("senza_punto", "Benvenuti a Brunvalle", "benvenuti a brunvalle"),
    ("titolo_a_capo", "# Capitolo primo\nLa nebbia sale dal fiume", "capitolo primo la nebbia sale dal fiume"),
    ("tag_html", "<i>Sussurra</i>: non fidatevi di Kara.", "sussurra non fidatevi di kara"),
    ("raffiche", "Aspetta..... forse... no?!?", "aspetta forse no"),
    ("virgolette_due", "«Fermatevi» urlò il capitano, «la strada è chiusa»",
     "fermatevi urlò il capitano la strada è chiusa"),
]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--campioni", type=int, default=2)
    ap.add_argument("--voce", default="narratore")
    ap.add_argument("--casi", default="", help="nomi separati da virgola (vuoto = tutti)")
    ap.add_argument("--etichetta", default="", help="suffisso del manifesto, per non sovrascrivere")
    args = ap.parse_args()

    imp = Impostazioni()
    motore = MotoreQwen(imp)
    motore.carica()
    motore.prepara_voci(carica_registro(imp.registro_voci))
    motore.riscalda()

    uscita = RADICE_REPO / "logs" / "voce-banco" / "normalizzazione"
    uscita.mkdir(parents=True, exist_ok=True)
    manifesto = []
    scelti = set(filter(None, args.casi.split(",")))
    for nome, grezzo, atteso in CASI:
        if scelti and nome not in scelti:
            continue
        for forma, testo in (("grezzo", grezzo), ("normalizzato", normalizza(grezzo))):
            for k in range(args.campioni):
                info = InfoGenerazione()
                audio = np.concatenate(list(motore.genera(testo, args.voce, info=info)))
                f = uscita / f"{nome}_{forma}_{k}{args.etichetta}.wav"
                sf.write(f, audio, motore.sample_rate, subtype="PCM_16")
                manifesto.append({"caso": nome, "forma": forma, "campione": k, "testo": testo, "atteso": atteso,
                                  "file": str(f), "secondi": round(audio.size / motore.sample_rate, 2),
                                  "token": info.token, "tetto": info.tetto_token, "troncata": info.troncata})
                print(nome, forma, k, f"{audio.size / motore.sample_rate:.2f} s", "TRONCATA" if info.troncata else "",
                      flush=True)
    (uscita / f"manifesto{args.etichetta}.json").write_text(json.dumps(manifesto, ensure_ascii=False, indent=1))
    print("manifesto", uscita / f"manifesto{args.etichetta}.json")


if __name__ == "__main__":
    main()

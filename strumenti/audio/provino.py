"""Provino e rapporto dell'audio di una campagna, per ascoltare e controllare in fretta.

    strumenti/audio/.venv/bin/python strumenti/audio/provino.py campagne/ponte-lanterne

Scrive in esperimenti/audio/:
  provino_<id>.wav     5 secondi di ogni file del manifest, in fila (brani, umori, temi, ambienti,
                       effetti), con dissolvenze brevi e mezzo secondo di silenzio tra l'uno e l'altro;
                       il volume è quello che userà il proiettore (lufs → −23, poi `volume`).
                       Fuori da git (pesa ~10 MB): si rigenera in pochi secondi.
  provino_<id>.txt     l'indice: a che secondo comincia ogni file;
  controlli_<id>.md    la tabella dei controlli (durata, LUFS, true peak, LRA, giunta, silenzi, peso).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

import qualita as Q  # noqa: E402
from percorsi import ESPERIMENTI, SR  # noqa: E402

TRATTO_S = 5.0
PAUSA_S = 0.5


def voci_in_ordine(man: dict) -> list[tuple[str, dict]]:
    out, visti = [], set()
    for sezione in ("brani", "umori", "temi", "ambienti", "effetti"):
        for v in man.get(sezione, []):
            if v.get("alias_di") or v["file"] in visti:
                continue
            visti.add(v["file"])
            out.append((sezione, v))
    return out


def provino(cartella: Path) -> tuple[Path, Path]:
    man = json.loads((cartella / "audio" / "manifest.json").read_text(encoding="utf-8"))
    pezzi, indice, t = [], [], 0.0
    pausa = np.zeros((int(PAUSA_S * SR), 2), dtype=np.float32)
    for sezione, v in voci_in_ordine(man):
        audio = Q.decodifica(cartella / "audio" / v["file"])[: int(TRATTO_S * SR)]
        guadagno = 10 ** ((-23 - (v.get("lufs") or -23)) / 20) * float(v.get("volume", 1.0))
        audio = audio * guadagno
        n = min(int(0.15 * SR), len(audio) // 4)
        if n:
            audio[:n] *= np.linspace(0, 1, n, dtype=np.float32)[:, None]
            audio[-n:] *= np.linspace(1, 0, n, dtype=np.float32)[:, None]
        indice.append(f"{t:7.1f} s  {sezione:9s} {v['id']:40s} {v['file']}")
        pezzi += [audio, pausa]
        t += len(audio) / SR + PAUSA_S
    ESPERIMENTI.mkdir(parents=True, exist_ok=True)
    wav = ESPERIMENTI / f"provino_{man['campagna']}.wav"
    Q.scrivi_wav(wav, np.concatenate(pezzi))
    txt = ESPERIMENTI / f"provino_{man['campagna']}.txt"
    txt.write_text("\n".join(indice) + "\n", encoding="utf-8")
    return wav, txt


def rapporto(cartella: Path) -> Path:
    """La tabella dei controlli, dal manifest (le misure le ha fatte qualita.analizza sul file finale)."""
    man = json.loads((cartella / "audio" / "manifest.json").read_text(encoding="utf-8"))
    righe = [f"# Controlli audio di «{man['campagna']}»", "",
             "Misure sul file finale decodificato (qualita.py): loudness integrata (ebur128), true peak, LRA,",
             "giunta del loop (salto di livello in dB tra gli ultimi e i primi 50 ms; rapporto del salto di campione",
             "sulla variazione tipica: sopra 8 è un clic), silenzi (sotto −50 dB per più di 1,5 s).", "",
             "| id | file | durata s | LUFS | TP dB | LRA | giunta | silenzi | KB | esito |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    totale = 0
    for sezione, v in voci_in_ordine(man):
        c = v.get("controllo", {})
        g = c.get("giunta")
        giunta = f"{g['salto_livello_db']} dB / ×{g['rapporto_salto']}" if g else "—"
        kb = c.get("kb") or round((cartella / "audio" / v["file"]).stat().st_size / 1000)
        totale += kb
        esito = "ok" if c.get("ok") else "; ".join(c.get("problemi", [])) or "?"
        righe.append(f"| {v['id']} | {v['file']} | {c.get('durata_s')} | {c.get('lufs')} | {c.get('true_peak_db')} | "
                     f"{c.get('lra')} | {giunta} | {len(c.get('silenzi') or [])} | {kb} | {esito} |")
    righe += ["", f"Peso totale: {totale / 1000:.1f} MB.", ""]
    ESPERIMENTI.mkdir(parents=True, exist_ok=True)
    out = ESPERIMENTI / f"controlli_{man['campagna']}.md"
    out.write_text("\n".join(righe), encoding="utf-8")
    return out


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("campagna", type=Path)
    a = p.parse_args()
    cartella = a.campagna.resolve()
    wav, txt = provino(cartella)
    print(f"provino: {wav}\nindice:  {txt}\ncontrolli: {rapporto(cartella)}")


if __name__ == "__main__":
    main()

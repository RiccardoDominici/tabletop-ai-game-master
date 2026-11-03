"""Il fondo locale di ambienti ed effetti: cache/audio/pool/ con un indice etichettato nel nostro vocabolario.

Il fondo cresce da solo, per tag, quando una campagna ne chiede uno che non ha ancora:
  1. Freesound, se c'è FREESOUND_API_KEY (fonti/freesound.py);
  2. Internet Archive, CC0 o pubblico dominio (fonti/archivio.py);
ogni candidato scaricato si MISURA prima di entrare (durata, silenzi, LRA, piattezza spettrale):
un «rain» che in realtà è un brano musicale ha lo spettro a righe (piattezza bassa) e si scarta.
Gli scarti restano nell'indice col motivo, così non si riscaricano. Se per un tag non c'è niente
di buono e il tag è sintetizzabile, ci pensa fonti/sintesi.py (lo decide ambienti.py).

Indice: cache/audio/pool/indice.json, una voce per file:
  {id, tag, tipo (ambiente|effetto), file, fonte, titolo, autore, licenza, licenza_url, pagina,
   url_file, durata_s, misure: {lufs, lra, piattezza, silenzio}, ok, scarti: [...]}
"""

from __future__ import annotations

import json
import logging
import os
import re
import tempfile
from dataclasses import asdict
from pathlib import Path

import numpy as np

import qualita as Q
import vocabolario as V
from fonti import archivio, freesound
from percorsi import CACHE_POOL, SR

log = logging.getLogger("audio.pool")

INDICE = CACHE_POOL / "indice.json"
MAX_SCARICAMENTI_PER_TAG = 4
DURATA_AMBIENTE = (20.0, 360.0)
DURATA_EFFETTO = (0.5, 150.0)
PIATTEZZA_MIN_FERMO = 0.10    # pioggia, vento, fiume, fuoco: spettro «di rumore»
LRA_MAX_FERMO = 12.0
LRA_MAX_VIVO = 20.0


class Pool:
    def __init__(self, percorso: Path = INDICE):
        self.percorso = percorso
        self.voci: dict[str, dict] = {}
        if percorso.exists():
            self.voci = {v["id"]: v for v in json.loads(percorso.read_text(encoding="utf-8")).get("voci", [])}

    def salva(self) -> None:
        self.percorso.parent.mkdir(parents=True, exist_ok=True)
        fd, tmp = tempfile.mkstemp(dir=self.percorso.parent, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump({"voci": sorted(self.voci.values(), key=lambda v: v["id"])}, f, ensure_ascii=False, indent=1)
        os.replace(tmp, self.percorso)

    def buone(self, tag: str, tipo: str) -> list[dict]:
        """Le voci buone per un tag, la migliore prima (meno scarti di misura, poi più lunga)."""
        ok = [v for v in self.voci.values() if v["ok"] and tag in v["tag"] and v["tipo"] == tipo and (CACHE_POOL / v["file"]).exists()]
        return sorted(ok, key=lambda v: (-v.get("qualita", 0), v["id"]))

    # --- crescita ---------------------------------------------------------------------------
    def arricchisci(self, tag: str, tipo: str) -> None:
        """Cerca nelle fonti finché trova una voce buona per il tag (o finisce i tentativi)."""
        if self.buone(tag, tipo):
            return
        query = V.AMBIENTI[tag].query if tipo == "ambiente" else V.EFFETTI[tag]
        con_voci = tag in ("folla", "taverna")
        durata = DURATA_AMBIENTE if tipo == "ambiente" else DURATA_EFFETTO
        fonti = ([("freesound", freesound)] if freesound.attiva() else []) + [("archivio", archivio)]
        tentati = 0
        for nome, modulo in fonti:
            for q in query:
                for c in modulo.cerca(q, con_voci, durata):
                    ident = re.sub(r"[^a-z0-9]+", "-", f"{nome}-{c.id}-{Path(c.nome_file).stem}".lower()).strip("-")[:90]
                    if ident in self.voci:
                        if tag not in self.voci[ident]["tag"] and self.voci[ident]["ok"]:
                            self.voci[ident]["tag"].append(tag)
                            self.salva()
                        if self.buone(tag, tipo):
                            return
                        continue
                    if tentati >= MAX_SCARICAMENTI_PER_TAG:
                        log.warning("pool: per «%s» nessuna voce buona dopo %d scaricamenti", tag, tentati)
                        return
                    tentati += 1
                    rel = f"{nome}/{ident}{Path(c.nome_file).suffix.lower() or '.mp3'}"
                    try:
                        modulo.scarica(c, CACHE_POOL / rel)
                    except Exception as e:
                        log.warning("pool: %s non scaricato: %s", c.url_file, e)
                        continue
                    voce = {"id": ident, "tag": [tag], "tipo": tipo, "file": rel, **_metadati(c)}
                    voce.update(misura(CACHE_POOL / rel, tag, tipo))
                    self.voci[ident] = voce
                    self.salva()
                    log.info("pool: %s «%s» → %s %s", tag, c.titolo[:50], "OK" if voce["ok"] else "scartato", voce["scarti"])
                    if voce["ok"]:
                        return


def _metadati(c: archivio.Candidato) -> dict:
    d = asdict(c)
    return {k: d[k] for k in ("fonte", "titolo", "autore", "licenza", "licenza_url", "pagina", "url_file")}


def piattezza(audio: np.ndarray, finestra: int = 2048) -> float:
    """Piattezza spettrale media (0 = una riga pura, 1 = rumore bianco), tra 200 Hz e 8 kHz."""
    mono = audio.mean(axis=1)
    k = len(mono) // finestra
    if k < 4:
        return 0.0
    passo = max(1, k // 400)       # al massimo ~400 finestre: veloce anche su file lunghi
    blocchi = mono[: k * finestra].reshape(k, finestra)[::passo] * np.hanning(finestra)
    p = np.abs(np.fft.rfft(blocchi, axis=1)) ** 2 + 1e-12
    f = np.fft.rfftfreq(finestra, 1 / SR)
    p = p[:, (f >= 200) & (f <= 8000)]
    piatt = np.exp(np.mean(np.log(p), axis=1)) / np.mean(p, axis=1)
    forti = np.mean(p, axis=1) > np.percentile(np.mean(p, axis=1), 20)    # ignora le finestre quasi mute
    return float(np.mean(piatt[forti])) if forti.any() else 0.0


def misura(percorso: Path, tag: str, tipo: str) -> dict:
    """Misure e verdetto per un file appena scaricato."""
    scarti = []
    try:
        audio = Q.decodifica(percorso)
        lm = Q.misura_loudnorm(percorso, -23, -2, 11)
    except Exception as e:
        return {"durata_s": 0, "misure": {}, "ok": False, "qualita": 0, "scarti": [f"illeggibile: {str(e)[:120]}"]}
    durata = len(audio) / SR
    env = Q.inviluppo_db(audio)
    silenzio = float(np.mean(env < -55))
    pia = piattezza(audio)
    lra = float(lm["input_lra"])
    misure = {"lufs": float(lm["input_i"]), "lra": lra, "piattezza": round(pia, 3), "silenzio": round(silenzio, 3)}
    if tipo == "ambiente":
        fermo = V.AMBIENTI[tag].fermo
        if durata < DURATA_AMBIENTE[0]:
            scarti.append(f"corto: {durata:.0f} s")
        if silenzio > 0.1:
            scarti.append(f"silenzi: {silenzio:.0%}")
        if fermo and pia < PIATTEZZA_MIN_FERMO:
            scarti.append(f"spettro a righe (piattezza {pia:.3f}): probabilmente musica, non {tag}")
        if lra > (LRA_MAX_FERMO if fermo else LRA_MAX_VIVO):
            scarti.append(f"troppo variabile (LRA {lra:.1f})")
        qualita = pia * 3 - lra / 10 + min(durata, 120) / 120
    else:
        rilievo = float(np.max(env) - np.median(env))
        misure["rilievo_db"] = round(rilievo, 1)
        if rilievo < 10:
            scarti.append(f"nessun colpo netto (rilievo {rilievo:.0f} dB)")
        qualita = rilievo / 10
    return {"durata_s": round(durata, 2), "misure": misure, "ok": not scarti, "qualita": round(qualita, 3), "scarti": scarti}

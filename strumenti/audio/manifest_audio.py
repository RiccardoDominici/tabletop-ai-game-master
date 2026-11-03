"""Manifest dell'audio di una campagna: campagne/<id>/audio/manifest.json, più crediti.md.

Contratto con il proiettore (docs/audio.md, «Manifest»). Sezioni: brani, umori, temi, ambienti,
effetti; in cima versione, campagna, formato; in fondo `crediti`, le righe da mostrare (una per
opera CC BY, più le note per CC0, pubblico dominio, SoundFont e suoni sintetici).
La scrittura è atomica (file temporaneo + rename): un'interruzione non lo corrompe.
"""

from __future__ import annotations

import json
import os
import tempfile
import time
from pathlib import Path

NOME = "manifest.json"
SEZIONI = ("brani", "umori", "temi", "ambienti", "effetti")
VERSIONE = 1
FORMATO = "AAC-LC in .m4a, 48 kHz, stereo; i loop vanno da loop_inizio_s a loop_fine_s (mezzo secondo di margine prima e dopo)"
NOTA_SOUNDFONT = ("Temi dei personaggi: composti dalla pipeline (motivo deterministico) e suonati con "
                  "GeneralUser GS di S. Christian Collins (https://www.schristiancollins.com/generaluser), licenza d'uso libera.")
NOTA_SINTESI = "Alcuni ambienti sono sintetizzati dalla pipeline (rumore modellato): nessuna licenza esterna."


class ManifestAudio:
    def __init__(self, cartella_audio: Path, campagna: str):
        self.cartella = Path(cartella_audio)
        self.percorso = self.cartella / NOME
        self.campagna = campagna
        self.sezioni: dict[str, dict[str, dict]] = {s: {} for s in SEZIONI}
        if self.percorso.exists():
            dati = json.loads(self.percorso.read_text(encoding="utf-8"))
            for s in SEZIONI:
                self.sezioni[s] = {v["id"]: v for v in dati.get(s, [])}

    def voce(self, sezione: str, ident: str) -> dict | None:
        return self.sezioni[sezione].get(ident)

    def file_presente(self, sezione: str, ident: str) -> bool:
        v = self.voce(sezione, ident)
        return bool(v) and (self.cartella / v["file"]).exists()

    def registra(self, sezione: str, voce: dict, salva: bool = True) -> None:
        self.sezioni[sezione][voce["id"]] = voce
        if salva:
            self.salva()

    def togli(self, sezione: str, ident: str) -> None:
        self.sezioni[sezione].pop(ident, None)

    def crediti(self) -> list[str]:
        righe: list[str] = []
        for s in SEZIONI:
            for v in self.sezioni[s].values():
                if v.get("crediti") and v["crediti"] not in righe:
                    righe.append(v["crediti"])
        if self.sezioni["temi"]:
            righe.append(NOTA_SOUNDFONT)
        if any(v.get("fonte") == "sintesi" for s in ("ambienti", "effetti") for v in self.sezioni[s].values()):
            righe.append(NOTA_SINTESI)
        return righe

    def salva(self) -> None:
        self.cartella.mkdir(parents=True, exist_ok=True)
        dati = {"versione": VERSIONE, "campagna": self.campagna, "formato": FORMATO,
                "aggiornato": time.strftime("%Y-%m-%d %H:%M:%S")}
        for s in SEZIONI:
            dati[s] = sorted(self.sezioni[s].values(), key=lambda v: v["id"])
        dati["crediti"] = self.crediti()
        fd, tmp = tempfile.mkstemp(dir=self.cartella, suffix=".tmp")
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(dati, f, ensure_ascii=False, indent=2)
        os.replace(tmp, self.percorso)
        self._scrivi_crediti()

    def _scrivi_crediti(self) -> None:
        """crediti.md: musica (CC BY, obbligatori), ambienti ed effetti (fonte e licenza), temi."""
        r = [f"# Crediti audio della campagna «{self.campagna}»", "",
             "Generato da strumenti/audio/genera_audio.py: non modificare a mano.", "", "## Musica", ""]
        musica = [v for s in ("brani", "umori") for v in self.sezioni[s].values() if not v.get("alias_di")]
        for v in sorted(musica, key=lambda v: v["id"]):
            r.append(f"- `{v['id']}`: {v['crediti']}")
        r += ["", "## Ambienti ed effetti", ""]
        visti = set()
        for s in ("ambienti", "effetti"):
            for v in sorted(self.sezioni[s].values(), key=lambda v: v["file"]):
                if v["file"] in visti:
                    continue
                visti.add(v["file"])
                if v.get("fonte") == "sintesi":
                    r.append(f"- `{v['file']}`: sintetizzato dalla pipeline ({v.get('tag')}), nessuna licenza esterna.")
                else:
                    r.append(f"- `{v['file']}`: «{v.get('titolo', '')}» di {v.get('autore', 'sconosciuto')}, {v.get('fonte')}, "
                             f"{v.get('licenza')} ({v.get('pagina', '')})")
        r += ["", "## Temi dei personaggi", "", NOTA_SOUNDFONT, ""]
        (self.cartella / "crediti.md").write_text("\n".join(r), encoding="utf-8")

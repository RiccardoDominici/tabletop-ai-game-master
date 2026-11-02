"""Dalla cartella di una campagna all'elenco delle immagini da generare (luoghi, ritratti, scene coi PNG).

Regola di sicurezza: si leggono SOLO i campi pensati per le immagini, mai il resto delle schede.
  - stile.yaml            → stile_immagini   (il frammento [STILE], in inglese)
  - scena*.yaml           → id, immagine.prompt_luogo, immagine.invarianti, png_presenti
  - png/*.yaml            → id, aspetto.prompt_immagine, aspetto.invarianti,
                            e se ci sono aspetto.prompt_ritratto e aspetto.situazioni (facoltativi)
I testi liberi come `descrizione` della scena o `abbozzo` dei nodi NON si usano: mescolano pianta,
meccaniche e talvolta segreti, che sul proiettore non devono finire.

Tre tipi di immagine:
  luogo      — prompt_luogo + [STILE], 16:9.
  ritratto   — il PNG da solo, 3:4. Prompt: prompt_ritratto se c'è, altrimenti prompt_immagine;
               in coda le invarianti (in italiano: il codificatore di testo Qwen3 le capisce) e [STILE].
  situazione — il PNG in un'altra situazione, 16:9, col RITRATTO come immagine di riferimento,
               così il volto resta quello. Vengono da aspetto.situazioni e, in automatico, da ogni
               scena in cui il PNG è presente (in quel caso si passa anche l'immagine del luogo).
"""

from __future__ import annotations

import logging
import zlib
from dataclasses import dataclass, field
from pathlib import Path

import yaml

log = logging.getLogger("immagini.campagna")

SEGNAPOSTO_STILE = "[STILE]"
DIM_LUOGO = (1024, 576)     # 16:9, proiettore
DIM_RITRATTO = (768, 1024)  # 3:4, riquadro di chi parla
DIM_SITUAZIONE = (1024, 576)


@dataclass
class Richiesta:
    """Un'immagine da generare. `riferimenti` sono id di altre richieste, da generare prima."""

    id: str
    tipo: str              # luogo | ritratto | situazione
    prompt: str
    seme: int
    larghezza: int
    altezza: int
    riferimenti: list[str] = field(default_factory=list)

    @property
    def file(self) -> str:
        return f"{self.id}.jpg"


def seme_da_id(ident: str) -> int:
    """Seme stabile ricavato dall'id: rigenerare dà la stessa immagine, senza tenere un registro a mano."""
    return zlib.crc32(ident.encode()) % 1_000_000_000


def con_stile(prompt: str, stile: str) -> str:
    """Sostituisce il segnaposto [STILE]; se manca, lo accoda. Mai due volte."""
    prompt = prompt.strip().rstrip(",. ")
    if SEGNAPOSTO_STILE in prompt:
        return prompt.replace(SEGNAPOSTO_STILE, stile)
    return f"{prompt}, {stile}"


def _yaml(percorso: Path) -> dict:
    return yaml.safe_load(percorso.read_text(encoding="utf-8")) or {}


def leggi_stile(cartella: Path) -> str:
    stile = _yaml(cartella / "stile.yaml").get("stile_immagini")
    if not stile:
        raise ValueError(f"{cartella}/stile.yaml: manca stile_immagini (il frammento [STILE])")
    return stile.strip()


def _file_scene(cartella: Path) -> list[Path]:
    """scena.yaml, scena_*.yaml e scene/*.yaml, in ordine stabile."""
    return sorted(cartella.glob("scena*.yaml")) + sorted((cartella / "scene").glob("*.yaml"))


def _invarianti(lista) -> str:
    return "; ".join(str(x) for x in (lista or []))


def richieste_luoghi(cartella: Path, stile: str) -> tuple[list[Richiesta], dict[str, list[str]]]:
    """Una richiesta per scena con immagine. Ritorna anche {id_luogo: [png presenti]}."""
    out, presenti = [], {}
    for f in _file_scene(cartella):
        scena = _yaml(f)
        img = scena.get("immagine") or {}
        base = img.get("prompt_luogo")
        if not base:
            log.warning("%s: niente immagine.prompt_luogo, scena saltata", f.name)
            continue
        ident = f"luogo_{scena.get('id', f.stem)}"
        out.append(Richiesta(ident, "luogo", con_stile(base, stile), seme_da_id(ident), *DIM_LUOGO))
        presenti[ident] = list(scena.get("png_presenti") or [])
    return out, presenti


def richieste_png(cartella: Path, stile: str, luoghi: dict[str, list[str]]) -> list[Richiesta]:
    """Ritratto di ogni PNG, poi le sue situazioni (dichiarate e automatiche dalle scene)."""
    out = []
    for f in sorted((cartella / "png").glob("*.yaml")):
        scheda = _yaml(f)
        pid = scheda.get("id", f.stem)
        asp = scheda.get("aspetto") or {}
        base = asp.get("prompt_ritratto") or asp.get("prompt_immagine")
        if not base:
            log.warning("%s: niente aspetto.prompt_immagine, PNG saltato", f.name)
            continue
        inv = _invarianti(asp.get("invarianti"))
        # Le invarianti vanno PRIMA di [STILE], così lo stile resta l'ultima cosa del prompt.
        corpo = base.replace(SEGNAPOSTO_STILE, "").strip().rstrip(",. ")
        if inv:
            corpo = f"{corpo}. Tratti fissi: {inv}"
        rid = f"ritratto_{pid}"
        out.append(Richiesta(rid, "ritratto", con_stile(corpo, stile), seme_da_id(rid), *DIM_RITRATTO))

        identita = corpo  # la stessa descrizione, ripetuta nelle situazioni: aiuta a tenere i dettagli
        situazioni = [(s["id"], s["prompt"]) for s in (asp.get("situazioni") or []) if s.get("id") and s.get("prompt")]
        for sid, testo in situazioni:
            ident = f"{pid}_{sid}"
            prompt = f"The same person as in the reference image, same face, hair and clothes: {identita}. Now {testo}"
            out.append(Richiesta(ident, "situazione", con_stile(prompt, stile), seme_da_id(ident),
                                 *DIM_SITUAZIONE, riferimenti=[rid]))
        for lid, chi in luoghi.items():
            if pid not in chi:
                continue
            ident = f"{pid}_in_{lid.removeprefix('luogo_')}"
            prompt = (f"The same person as in the first reference image, same face, hair and clothes: {identita}. "
                      f"Now inside the place shown in the second reference image")
            out.append(Richiesta(ident, "situazione", con_stile(prompt, stile), seme_da_id(ident),
                                 *DIM_SITUAZIONE, riferimenti=[rid, lid]))
    return out


def richieste(cartella: Path) -> list[Richiesta]:
    """Tutte le richieste della campagna, in ordine di dipendenza (luoghi, ritratti, situazioni)."""
    cartella = Path(cartella)
    stile = leggi_stile(cartella)
    luoghi, presenti = richieste_luoghi(cartella, stile)
    png = richieste_png(cartella, stile, presenti)
    ordine = {"luogo": 0, "ritratto": 1, "situazione": 2}
    return sorted(luoghi + png, key=lambda r: ordine[r.tipo])

"""Pacchetto di prosa del validatore: le regole di scrittura per l'ascolto che dipendono dalla lingua.

Il dato sta in lingue/<codice>/prosa.yaml (cliché, numeri in lettere, parole vuote, parole generiche,
versi dei suoni, lunghezze, forme di «stile», pronomi del registro, alias generici, parole dell'id e del quando
che dicono chi mente, privatezza). La logica dei controlli sta nei
moduli testo.py, voce.py e nelle regole, e non cambia con la lingua: riceve il pacchetto.

La lingua di una campagna è `lingua` in campagna.yaml (assente = it). Un codice sconosciuto è un
errore (STRUTTURA.lingua) e il validatore prosegue con l'italiano.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import yaml

LINGUE_DIR = Path(__file__).resolve().parents[2] / "lingue"
LINGUA_PREDEFINITA = "it"


@dataclass(frozen=True)
class Prosa:
    codice: str
    cliche: tuple[str, ...]                 # N5: come si cercano, sottostringhe in minuscolo
    temi_generici: frozenset[str]           # parole troppo comuni per fare da `temi` o da alias
    parole_vuote: frozenset[str]            # escluse dalle radici (segnali, versioni delle menzogne)
    numeri: dict[str, int]                  # numeri in lettere, per leggere lo stile di una voce
    suoni: frozenset[str]                   # suoni di drama-3 da non prendere per direzioni
    stile_frasi: re.Pattern                 # forme di «stile» che dicono quante parole per frase
    registro_pronomi: re.Pattern            # il registro di una voce dice chi si dà del tu/voi/lei
    frase_max: int                          # N1, testi da leggere delle schede
    narratore_battuta: int                  # prompt §2, battute del narratore
    png_battuta: int                        # tetto predefinito per le battute di un PNG
    media_narratore: tuple[int, int]        # N1, media parole per frase del narratore
    frasi_narratore_battuta: int            # N2
    parole_battuta: int                     # tetto di parole di una battuta intera
    frasi_png: int                          # D3
    frasi_png_rivelazione: int              # D3, eccezione della rivelazione
    alias_generici: frozenset[str]          # soprannomi che valgono per mezzo paese (alias di un PNG)
    id_rivelatori: frozenset[str]           # parole che in un id di battuta dicono chi mente o che cosa è vero
    quando_vietate: tuple[re.Pattern, ...] # il `quando` non dice chi mente, nasconde o confessa
    cede_privato: re.Pattern                # cede_se chiede la privatezza: serve il cancello privata


def lingue_disponibili() -> list[str]:
    """I codici con un pacchetto di prosa (cartelle di lingue/ con prosa.yaml)."""
    return sorted(p.parent.name for p in LINGUE_DIR.glob("*/prosa.yaml"))


@lru_cache(maxsize=None)
def carica_prosa(codice: str) -> Prosa:
    """Il pacchetto di una lingua. KeyError se il codice non ha un pacchetto."""
    if codice not in lingue_disponibili():
        raise KeyError(codice)
    dati = yaml.safe_load((LINGUE_DIR / codice / "prosa.yaml").read_text(encoding="utf-8")) or {}
    lun = dati["lunghezze"]
    return Prosa(
        codice=codice,
        cliche=tuple(str(x).lower() for x in dati["cliche"]),
        temi_generici=frozenset(dati["temi_generici"]),
        parole_vuote=frozenset(dati["parole_vuote"]),
        numeri={str(k): int(v) for k, v in dati["numeri"].items()},
        suoni=frozenset(dati["suoni"]),
        stile_frasi=re.compile(dati["stile_frasi"]),
        registro_pronomi=re.compile(dati["registro_pronomi"]),
        frase_max=int(lun["frase_max"]),
        narratore_battuta=int(lun["narratore_battuta"]),
        png_battuta=int(lun["png_battuta"]),
        media_narratore=(int(lun["media_narratore"][0]), int(lun["media_narratore"][1])),
        frasi_narratore_battuta=int(lun["frasi_narratore_battuta"]),
        parole_battuta=int(lun["parole_battuta"]),
        frasi_png=int(lun["frasi_png"]),
        frasi_png_rivelazione=int(lun["frasi_png_rivelazione"]),
        alias_generici=frozenset(str(x).lower() for x in dati["alias_generici"]),
        id_rivelatori=frozenset(str(x).lower() for x in dati["id_rivelatori"]),
        quando_vietate=tuple(re.compile(str(x)) for x in dati["quando_vietate"]),
        cede_privato=re.compile(str(dati["cede_privato"])),
    )


def prosa_predefinita() -> Prosa:
    """Il pacchetto italiano: quello che usano le funzioni chiamate senza una lingua."""
    return carica_prosa(LINGUA_PREDEFINITA)


def lingua_della_campagna(campagna: dict | None) -> str | None:
    """Il codice dichiarato in campagna.yaml (predefinito it), o None se non è un codice di lingua valido."""
    valore = (campagna or {}).get("lingua", LINGUA_PREDEFINITA) if isinstance(campagna, dict) else LINGUA_PREDEFINITA
    if valore is None:
        valore = LINGUA_PREDEFINITA
    if not isinstance(valore, str) or valore not in lingue_disponibili():
        return None
    return valore

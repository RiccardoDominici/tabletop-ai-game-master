"""Prova facoltativa dei `temi` su copioni di azioni (esperimenti/copioni/**/*.yaml).

Simula il prefiltro del Motore (repertorio versione 2): una battuta selezionabile entra nel catalogo
di un'azione se una parola dei suoi `temi` compare nell'azione come parola intera. Non c'è una
risposta «giusta» scritta a mano: si misura il rumore, cioè quante battute entrano per ogni azione.
Un catalogo largo è ciò che ha fatto perdere il repertorio nell'esperimento A/B n. 1.
"""

from __future__ import annotations

import re
import statistics
import unicodedata
from pathlib import Path

import yaml

from .carica import Campagna
from .esito import Esito

TETTO = 8  # battute nel catalogo di una sola azione oltre cui si avvisa


def _norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", t.lower())
    return "".join(ch for ch in t if not unicodedata.combining(ch))


def catalogo(c: Campagna, azione: str) -> list[str]:
    parole = set(re.findall(r"[a-z]+", _norm(azione)))
    out = []
    for b in c.battute:
        if b.get("solo_esempio") or b.get("riempitivo") or b.get("tipo") in ("segno_orologio", "finale"):
            continue
        if parole & {_norm(t) for t in b.get("temi") or []}:
            out.append(b["id"])
    return out


def controlla(c: Campagna, e: Esito, cartella_copioni: Path) -> list[str]:
    righe, misure = [], []
    for f in sorted(Path(cartella_copioni).rglob("*.yaml")):
        cop = yaml.safe_load(f.read_text(encoding="utf-8")) or {}
        for n, turno in enumerate(cop.get("turni") or [], 1):
            for a in turno or []:
                cat = catalogo(c, a.get("azione", ""))
                misure.append(len(cat))
                righe.append(f"{f.stem} T{n} {a.get('pg', '?')}: {len(cat)} battute — {', '.join(cat)[:100]}")
                if len(cat) > TETTO:
                    e.avviso("COPERTURA.catalogo", f"{f.stem} T{n} {a.get('pg')}", f"{len(cat)} battute per una sola azione (tetto {TETTO})")
    if misure:
        righe.append(f"catalogo per azione: media {statistics.mean(misure):.1f}, massimo {max(misure)}, su {len(misure)} azioni")
    return righe

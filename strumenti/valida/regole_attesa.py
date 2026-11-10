"""Battute d'attesa e deviazioni (docs/repertorio.md): il tavolo non resta mai in silenzio.

Quando il lettore locale non trova una battuta, usa quelle preparate: per ogni scena serve un'attesa del
narratore, per ogni PNG presente in una scena un'attesa sua e una deviazione (`tipo: rifiuto`). Lo
sceneggiatore scrive la risposta vera mentre il tavolo aspetta.

Codici in COPERTURA: avvisi in modo normale, errori in modo rigoroso (vedi esito.py).
"""

from __future__ import annotations

from .carica import Campagna
from .esito import Esito


def _vale_in(b: dict, sid: str) -> bool:
    """Una battuta vale in una scena se non ha `scena`, oppure se `scena` (un id o una lista) include quella scena."""
    s = b.get("scena")
    if s is None:
        return True
    ids = [s] if isinstance(s, str) else [x for x in s if isinstance(x, str)] if isinstance(s, list) else []
    return sid in ids


def _attesa(b: dict, chi: str) -> bool:
    return b.get("chi") == chi and bool(b.get("riempitivo"))


def controlla(c: Campagna, e: Esito) -> None:
    # Senza battute lo dice già REPERTORIO.assente: qui non si ripete ogni scena e ogni PNG.
    if not c.battute:
        return
    narratore = c.voce_narratore

    for nome, scena in c.scene:
        sid = scena.get("id")
        if not sid:
            continue
        if not any(_attesa(b, narratore) and _vale_in(b, sid) for b in c.battute):
            e.avviso("COPERTURA.attesa_scena", sid,
                     f"manca un'attesa del narratore (chi: {narratore}, riempitivo: true) che valga in questa scena: "
                     "se il lettore non trova una risposta, il tavolo resta in silenzio", rigoroso=True)

    presenti = sorted({p for _, s in c.scene for p in (s.get("png_presenti") or []) if isinstance(p, str)})
    for pid in presenti:
        if not any(_attesa(b, pid) for b in c.battute):
            e.avviso("COPERTURA.attesa_png", pid,
                     f"manca un'attesa di {pid} (chi: {pid}, riempitivo: true): quando nessuna battuta va bene, "
                     "il tavolo resta in silenzio", rigoroso=True)
        if not any(b.get("chi") == pid and b.get("tipo") == "rifiuto" for b in c.battute):
            e.avviso("COPERTURA.deviazione_png", pid,
                     f"manca una deviazione di {pid} (chi: {pid}, tipo: rifiuto): {pid} deve saper dire di no "
                     "a ciò che non sa", rigoroso=True)

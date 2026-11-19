"""Prepared stall lines (docs/mondo.md §5, «Prepared stall lines»): `stallo: 1 | 2 | 3` on a line.

When the table stalls the Engine says, at each level, a line of that level for the scene: 1 a soft move of the scene's
danger, 2 a proactive clue (the line reveals it), 3 a summary of the leads the PCs know. These lines are kept for the
stall: the live reader never gets them (round 4 of the coherence layer, profile A: the reader used every filler of the
stall game as a waiting line by T6, and its one S1 at T14 found none).

Errors: a level other than 1-3; a gate on the action (the Engine says it with no action, so it would never come out);
level 2 without a clue to reveal; level 3 that reveals one, or with no gate on what the PCs found (a summary said before
the PCs know it would tell them). Warning, an error in strict mode: a scene with no stall line of some level (level 2
only if the scene has clues), since the Engine would then have only the fillers the reader also uses for waiting.
"""

from __future__ import annotations

from .carica import Campagna
from .esito import Esito

CANCELLI_AZIONE = ("da_pg", "privata", "prova")
# What a summary may be gated on: the clues found, the lines already said.
CANCELLI_NOTO = ("indizi_rivelati", "battute_usate")


def _blocchi(r: dict) -> list[dict]:
    """The base of `richiede` merged with each alternative of `oppure` (or the base alone)."""
    base = {k: v for k, v in (r or {}).items() if k != "oppure"}
    alternative = [a for a in (r or {}).get("oppure") or [] if isinstance(a, dict)]
    return [{**base, **a} for a in alternative] or [base]


def _scene(b: dict) -> set[str] | None:
    """The scenes of a line (None = every scene)."""
    s = b.get("scena")
    if s is None:
        return None
    return {s} if isinstance(s, str) else {x for x in s if isinstance(x, str)}


def controlla(c: Campagna, e: Esito) -> None:
    livelli: dict[int, list[dict]] = {1: [], 2: [], 3: []}
    for b in c.battute:
        if "stallo" not in b:
            continue
        dove = f"{b.get('_file', '?')} {b.get('id', '?')}"
        v = b["stallo"]
        if v not in (1, 2, 3) or isinstance(v, bool):
            e.errore("REPERTORIO.stallo", dove, "stallo è 1, 2 o 3")
            continue
        blocchi = _blocchi(b.get("richiede") or {})
        if all(any(bl.get(k) for k in CANCELLI_AZIONE) for bl in blocchi):
            e.errore("REPERTORIO.stallo", dove, f"una battuta di stallo la dice il Motore senza un'azione: niente {', '.join(CANCELLI_AZIONE)}")
        rivela = (b.get("effetti") or {}).get("rivela_indizi") or []
        if v == 2 and not rivela:
            e.errore("REPERTORIO.stallo", dove, "stallo 2 porta un indizio: effetti.rivela_indizi")
        if v == 3:
            if rivela:
                e.errore("REPERTORIO.stallo", dove, "stallo 3 riassume le piste note: non rivela indizi")
            if not all(any(bl.get(k) for k in CANCELLI_NOTO) for bl in blocchi):
                e.errore("REPERTORIO.stallo", dove,
                         f"stallo 3 riassume ciò che i PG hanno trovato: serve richiede.{' o richiede.'.join(CANCELLI_NOTO)}, "
                         "o il riassunto uscirebbe prima che lo sappiano")
        livelli[v].append(b)
    # Every scene has its material at every level (S2 only where there are clues to bring).
    for _, s in c.scene:
        sid = s.get("id")
        if not isinstance(sid, str):
            continue
        mancano = [
            str(n) for n, bs in livelli.items()
            if not any(_scene(b) is None or sid in _scene(b) for b in bs) and (n != 2 or s.get("indizi"))
        ]
        if mancano:
            e.avviso("REPERTORIO.stallo_scarso", f"scena {sid}",
                     f"nessuna battuta di stallo di livello {', '.join(mancano)}: quando il tavolo resta fermo il Motore ha solo "
                     "i riempitivi (che il lettore usa anche come attesa) e la sua frase delle piste (docs/mondo.md §5)",
                     rigoroso=True)

"""The facts a line carries (docs/repertorio.md, «Facts a line carries»): `attori`, `menzionati` and `richiede.stati`.

The Engine checks them against the coherence ledger before a line enters the catalogue (apps/server/src/repertorio/
fatti-battuta.ts), so the small local reader, which only relays, never sees a line that contradicts what is true now.
Here: their form (NPC ids with a sheet, the four state classes; `stati` in an alternative of `oppure` is the schema's
REPERTORIO.oppure) as errors,
and, as a warning, an NPC a narrator row names that no tag covers: the Engine then only asks it to be in play, not in
the scene, so a line where it acts while it is away would still be offered. The Preparer tags every such NPC.
"""

from __future__ import annotations

import re

from .carica import Campagna
from .esito import Esito

CLASSI_STATO = ("in_gioco", "a_terra", "morto", "fuggito")


def _ids(v) -> list | None:
    """A list of strings, or None when it is not one."""
    return list(v) if isinstance(v, list) and all(isinstance(x, str) for x in v) else None


def _nomi_png(c: Campagna) -> dict[str, set[str]]:
    """How a row may name each NPC: its name, its first name, its `alias` (lowercase, three letters at least)."""
    out: dict[str, set[str]] = {}
    for pid, (_, d) in c.png.items():
        nome = str(d.get("nome") or "")
        parole = {nome, nome.split()[0] if nome else "", *[str(a) for a in (d.get("alias") or [])]}
        out[pid] = {p.lower() for p in parole if len(p) > 2}
    return out


def _nomina(riga: str, parole: set[str]) -> bool:
    t = riga.lower()
    return any(re.search(rf"(?<![\w]){re.escape(p)}(?![\w])", t) for p in parole)


def controlla(c: Campagna, e: Esito) -> None:
    nomi = _nomi_png(c)
    for b in c.battute:
        dove = f"{b.get('_file', '?')} {b.get('id', '?')}"
        coperti: set[str] = set()
        for campo in ("attori", "menzionati"):
            if campo not in b:
                continue
            ids = _ids(b[campo])
            if ids is None:
                e.errore("REPERTORIO.fatti", dove, f"{campo}: una lista di id di PNG")
                continue
            for pid in ids:
                if pid not in c.png:
                    e.errore("REPERTORIO.fatti", dove, f"{campo}: {pid} non è un PNG con scheda")
            coperti |= set(ids)
        doppi = set(_ids(b.get("attori")) or []) & set(_ids(b.get("menzionati")) or [])
        if doppi:
            e.errore("REPERTORIO.fatti", dove, f"{sorted(doppi)} sia in attori sia in menzionati: o agisce o se ne parla")
        richiede = b.get("richiede") or {}
        stati = richiede.get("stati")
        if stati is not None:
            if not isinstance(stati, dict):
                e.errore("REPERTORIO.fatti", dove, "richiede.stati: un blocco {id_png: stato o [stati]}")
            else:
                for pid, v in stati.items():
                    classi = [v] if isinstance(v, str) else v
                    if pid not in c.png:
                        e.errore("REPERTORIO.fatti", dove, f"richiede.stati: {pid} non è un PNG con scheda")
                    if not isinstance(classi, list) or not classi or any(x not in CLASSI_STATO for x in classi):
                        e.errore("REPERTORIO.fatti", dove, f"richiede.stati.{pid}: uno o più di {', '.join(CLASSI_STATO)}")
                    coperti.add(pid)
        # Who speaks is covered by its own label; a narrator row that names someone else needs a tag.
        parlanti = {b.get("chi")} | {m.group(1) for r in (b.get("testo") or []) if (m := re.match(r"^\[([a-z0-9_]+)\]", str(r)))}
        versioni = [b.get("testo") or []] + [v for v in (b.get("varianti") or []) if isinstance(v, list)]
        scoperti = sorted(
            pid for pid, parole in nomi.items()
            if pid not in coperti and pid not in parlanti
            and any(str(r).startswith("[narratore]") and _nomina(str(r), parole) for v in versioni for r in v)
        )
        if scoperti:
            e.avviso("REPERTORIO.png_non_segnato", dove,
                     f"una riga del narratore nomina {', '.join(scoperti)} senza segno: in «attori» se agisce o è lì, in "
                     "«menzionati» se se ne parla soltanto, in «richiede.stati» se la battuta ne dà per vero lo stato")

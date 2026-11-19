"""The defeat ending of a scene (docs/combattimento.md, «The defeat path»): `sconfitta: true` on a `finale` line.

When a fight ends with every PC at the table down, dead or fled, the Engine says the scene's defeat ending (the
consequence: captured, left for dead, rescued…) and the table pauses for the Game Master; with none, its own sentence.
Round 5 of the coherence layer had five silent turns after the whole party fell. Error: `sconfitta` on a line that is
not a `finale`, or not `true`. Warning (an error in strict mode, like the next one): a scene with a hostile NPC (one whose attitude toward some PC is «ostile») and
no defeat ending; the line should take the victors as in play (`richiede.stati`) and name no PC (it cannot know who
died). Warning too: a defeat ending that does not say the PCs' states it takes as true (`richiede.stati.tutti`): «Vi
sveglia il freddo» woke a dead PC three times in the final round (docs/coerenza.md); `tutti: [in_gioco, a_terra]` for
an ending that wakes or ties everybody, and a second one for when someone died («chi respira ancora»).
"""

from __future__ import annotations

from .carica import Campagna
from .esito import Esito


def _scene(b: dict) -> set[str] | None:
    s = b.get("scena")
    if s is None:
        return None
    return {s} if isinstance(s, str) else {x for x in s if isinstance(x, str)}


def controlla(c: Campagna, e: Esito) -> None:
    finali: list[dict] = []
    for b in c.battute:
        if "sconfitta" not in b:
            continue
        if b["sconfitta"] is not True or b.get("tipo") != "finale":
            e.errore("REPERTORIO.sconfitta", f"{b.get('_file', '?')} {b.get('id', '?')}", "sconfitta: true solo su una battuta di tipo finale")
            continue
        finali.append(b)
        stati = (b.get("richiede") or {}).get("stati")
        if not (isinstance(stati, dict) and "tutti" in stati):
            e.avviso("REPERTORIO.sconfitta_stati", f"{b.get('_file', '?')} {b.get('id', '?')}",
                     "il finale di sconfitta non dice quali stati dei PG dà per veri: richiede.stati.tutti: [in_gioco, a_terra] "
                     "se sveglia o lega tutti (nessun morto), e un secondo finale per quando qualcuno è morto",
                     rigoroso=True)
    for _, s in c.scene:
        sid = s.get("id")
        if not isinstance(sid, str):
            continue
        ostili = [
            pid for pid in (s.get("png_presenti") or [])
            if pid in c.png and any(isinstance(a, dict) and a.get("stato") == "ostile" for a in ((c.png[pid][1].get("atteggiamento_pg") or {}).values()))
        ]
        if ostili and not any(_scene(b) is None or sid in _scene(b) for b in finali):
            e.avviso("REPERTORIO.sconfitta_mancante", f"scena {sid}",
                     f"{', '.join(ostili)} ostili e nessun finale di sconfitta (tipo: finale, sconfitta: true): se il gruppo "
                     "cade tutto il Motore dice solo la sua frase. Scrivi la conseguenza (catturati, lasciati per morti, "
                     "soccorsi…), con i vincitori in richiede.stati e senza nomi di PG",
                     rigoroso=True)

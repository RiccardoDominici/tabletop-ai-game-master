"""Which server-log events go into a run's evidence view, and under which turn (esperimenti/e2e-finale/vista.py).

The evidence view is the blind judge's input (esperimenti/risultati/finale/finale*-brief-giudice.md): what the table
heard, then, turn by turn, «Engine log for this turn», the engine's own state the judge checks every line against.
This module only selects and places the events; vista.py reads the files and writes the page.

Selection: every WARN or ERROR (the guards, the reader's invalid answers, a line the Engine refused), plus the info
events that carry engine state or a decision about a line: the turn's facts and dice cards, who is out of play, the
coherence block and its events, the fight (order, surprise, morale, who leaves), the world (gates, clocks, stall
moves), the repertoire lines said, and, since the rules-engine packages R1–R6, the rule modules (hit points, death,
saves, spells, light, the game clock, wandering encounters, XP, gear). Plumbing (sockets, voice, windows, audio,
the reader's catalogue) is left out: it says nothing about the story's state and would bury the facts.

Placement: an event with a `turno` field belongs to that turn. An event without one (the fight's own records, a
scene change) belongs to the latest turn seen so far in the file (the log is written in order, so it falls among
the records of the turn being resolved); events before the first turn belong to the opening. «Latest» is the
highest turn seen, not the last one read, so a late record tagged with an earlier turn does not pull the untagged
events that follow it back into that earlier turn.
"""
from __future__ import annotations

import json
from collections.abc import Iterable, Iterator

# Turn number used for the opening (events logged before the first turn).
APERTURA = 0

# Fields dropped from an event's printed record: logger plumbing, the message itself and the turn (said by the section).
CAMPI_OMESSI = frozenset({"level", "time", "app", "msg", "modulo", "turno", "pid", "hostname"})
# Fields dropped from one message only: the turn's facts carry the window's wait and the ids of late actions, plumbing
# the judge cannot map to anything at the table.
CAMPI_OMESSI_PER_MSG = {"prove: tiri del turno": frozenset({"attesa_ms", "tardive"})}

# Info events kept by message prefix: engine state and decisions about the lines the table hears.
PREFISSI = (
    # coherence, the fight, the world and the clock (before R1)
    "coerenza:", "coherence:", "combat:", "combattimento:", "world:", "clock:", "narrator:",
    # the rules-engine packages R1-R6: hit points, death and dying, effects, spells and powers, saves, gear and load,
    # ranges and ammunition, rests, XP and levels, the game clock and light, exploration and wandering encounters,
    # monsters (specials, regeneration, drain), reaction rolls, secret rolls, Turn Undead, supplies, travel
    "death:", "drain:", "effects:", "powers:", "saves:", "gear:", "inventory:", "load:", "range:", "resources:",
    "rest:", "xp:", "levels:", "time:", "light:", "exploration:", "wandering:", "monsters:", "reaction:",
    "secret roll:", "table power:", "supplies:", "travel:", "session:", "morale",
    # the turn's facts and cards, who is out of play, the repertoire lines said or refused
    "prove:", "repertorio:",
)

# Exact messages kept although their prefix is not listed (or is listed only for these).
ESATTI = frozenset({
    "narratore: invito",
    "manual rolls: follow-up rolls asked",
    "scena: cambio di scena",
    "scena: the party is down, the table pauses (the Game Master decides)",
})

# Messages left out although their prefix is listed: bookkeeping that repeats what the kept records say.
ESCLUSI = (
    "prove: azione risolta",        # per-action rule records; the turn's facts and cards are in «tiri del turno»
    "prove: turno risolto",
    "prove: decisioni a regole",
    "prove: Motore delle prove pronto",
    "repertorio: catalogo del turno",  # the reader's catalogue, not what the table heard
)


def livello(evento: dict) -> str:
    """The prefix printed before a WARN or ERROR event ('' for the others)."""
    n = evento.get("level")
    if isinstance(n, int) and n >= 50:
        return "ERROR "
    if isinstance(n, int) and n >= 40:
        return "WARN "
    return ""


def scelto(evento: dict) -> bool:
    """True when the event goes into the evidence view (see the module's docstring)."""
    msg = str(evento.get("msg", ""))
    if livello(evento):
        return True
    if msg in ESATTI:
        return True
    if msg.startswith(ESCLUSI):
        return False
    return msg.startswith(PREFISSI)


def turno_esplicito(evento: dict) -> int | None:
    """The event's own `turno`, when it has a usable one."""
    t = evento.get("turno")
    if isinstance(t, bool):
        return None
    if isinstance(t, int):
        return t
    if isinstance(t, str) and t.strip().isdigit():
        return int(t.strip())
    return None


def leggi_eventi(righe: Iterable[str]) -> Iterator[dict]:
    """The JSON records of a server.jsonl, skipping lines that do not parse (a log cut by a kill)."""
    for riga in righe:
        riga = riga.strip()
        if not riga:
            continue
        try:
            d = json.loads(riga)
        except json.JSONDecodeError:
            continue
        if isinstance(d, dict):
            yield d


def eventi_per_turno(eventi: Iterable[dict]) -> dict[int, list[dict]]:
    """The selected events grouped by turn, in log order (APERTURA = before the first turn)."""
    out: dict[int, list[dict]] = {}
    massimo = APERTURA
    for e in eventi:
        proprio = turno_esplicito(e)
        if proprio is not None:
            massimo = max(massimo, proprio)
        if not scelto(e):
            continue
        out.setdefault(proprio if proprio is not None else massimo, []).append(e)
    return out


def riga_evento(evento: dict) -> str:
    """One markdown bullet: «- [WARN ]`msg` {the other fields}»."""
    omessi = CAMPI_OMESSI | CAMPI_OMESSI_PER_MSG.get(str(evento.get("msg", "")), frozenset())
    resto = {k: v for k, v in evento.items() if k not in omessi}
    corpo = f" {json.dumps(resto, ensure_ascii=False)}" if resto else ""
    return f"- {livello(evento)}`{evento.get('msg', '')}`{corpo}"

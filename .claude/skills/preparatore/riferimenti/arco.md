# The "arc" level: what is prepared before session 1 (draft, phases D2–D4)

An arc is a campaign of 2–6 sessions (`brief.yaml → sessioni`, table in `strumenti/strati.py`). Today the validator
still rejects it (`LIVELLO.non_supportato`): that check comes off after the real test of phase D4. This file says what
the Preparatore writes before play; between sessions, `tra-le-sessioni.md` applies.

## The idea: a backbone, not a plot
An arc needs something that holds it together from one session to the next, but not a script: what happens after
session 1 depends on what the PCs do in session 1. So before play, write:
- the **premise** and the **dramatic question** of the arc (just one, yes-or-no: play gives the answer);
- the **arc front**: a clock with its **milestones**, which advances between sessions under fixed rules;
- the **acts** (2–3) and the **possible endings**, which depend on where the clock stands, not on a specific choice;
- the **recurring NPCs** (4–6) and the **threads** that will come back;
- **session 1 complete**, like a one-shot (all the skill's steps);
- the **later sessions**, one line each.

## Where it lives: campagna.yaml → preparazione.arco
`preparazione` never reaches the narrator (the server strips it in any case): the arc contains endings and milestones,
that is, the future, so it lives there. Session 1 is the package `sessioni/01/` (its shape is in `tra-le-sessioni.md`).
The example block is in «lingue/<lingua>/preparatore/riferimenti.md», arco.md §1. Structure, with field names and ids:
```yaml
preparazione:
  arco:
    premessa: "…"                    # one sentence: what happens in this story
    domanda: "…"                     # yes-or-no [V]
    fronte: fronte_…                 # the campaign front (preparazione.fronti, livello: campagna) [V]
    orologio: o_…                    # the arc clock, among the fronte's orologi_extra [V]
    tappe:                           # 3–6, in order: what the front gets if nobody stops it [V]
      - {id: tp_…, segno: 1, cosa: "…", segno_visibile: "…", entro_sessione: 1}
      - {id: tp_…, segno: 2, cosa: "…", segno_visibile: "…", entro_sessione: 2}
      - {id: tp_…, segno: 4, cosa: "…", segno_visibile: "…", entro_sessione: 3}
    ritmo:                           # how it advances between sessions (the "world moves" step, step 3) [V]
      per_sessione: 1                # ticks at the end of a session, if the PCs don't get in the way
      accelera: ["…"]               # observable conditions in the log or the state
      rallenta: ["…"]
    atti:                            # 2–3, consecutive sessions from the first to the last [V]
      - {id: atto_1, sessioni: [1], domanda: "…"}
      - {id: atto_2, sessioni: [2, 3], domanda: "…"}
    finali:                          # 2–4: every state of the arc clock has at least one ending [V]
      - {id: fn_…, orologio: {min: 0, max: 2}, quando: "…", esito: "…"}
      - {id: fn_…, orologio: {min: 3, max: 3}, quando: "…", esito: "…"}
      - {id: fn_…, orologio: {min: 4, max: 4}, quando: "…", esito: "…"}
    png_ricorrenti: [png_…, png_…, png_…, png_…]   # 4–6, each with its sheet in png/ [V]
    fili:                            # promises, debts, mysteries: each one comes back somewhere [V]
      - {id: filo_…, cosa: "…", torna_in: [2]}
    sessioni:                        # one line for each session after the first [V]
      - {numero: 2, abbozzo: "…", tappe: [tp_…], png: [png_…], fili: [filo_…]}
      - {numero: 3, abbozzo: "…", tappe: [tp_…], png: [png_…]}
```

## The craft
- **The ending is not a plot.** An ending says what state the world is left in, not what the PCs do to get there. It is
  tied to the arc clock (`orologio: {min, max}`), and every possible state of the clock, from empty to full, has at least
  one ending. There is always an ending for those who do not stop the front, and one for those who do. No ending names a
  PC: at the table, anyone may be missing.
- **The front advances on its own, under fixed rules.** Between one session and the next, the arc clock takes
  `per_sessione` ticks, more or less according to `accelera` and `rallenta`, which are observable facts (Blades in the
  Dark advances factions in downtime, not at the whim of the GM). With no obstacles it reaches its destiny by the last
  session, never in the first: `per_sessione × sessioni ≥ segmenti`, and a milestone does not arrive before the pace
  allows (`entro_sessione`).
- **Every milestone is visible.** Like the omens (C2), each milestone has a visible sign: the PCs must be able to tell
  that the front moved on while they were elsewhere.
- **The end is declared.** An arc has a number of sessions and a question; campaigns with no end tend to deflate
  (weak data, docs/ricerca-durata.md §3). The arc's question is closed in the last act.
- **Plant early what comes back.** The threads that the ending will need appear in session 1 or in a sketch, and each
  has a session where it returns (`torna_in`). A recurring NPC appears in session 1 or in a sketch, or it is not
  recurring.
- **Prepare only session 1.** The others are one line: what the PCs do in the first will change them. The detail comes
  between sessions, from the state (`tra-le-sessioni.md`). This is the "rolling" preparation of Sly Flourish and
  Alexandrian (docs/ricerca-durata.md §2).
- **Every session works with any group.** Pregenerated PCs stay one more than the maximum; every session starts with a
  summary of three to five sentences written from the facts of the state, not from memory.
- **Acts, each with a question.** 2–3 acts (C8: three acts for the campaign); each act has its own question, and the last
  one answers the arc's question.

## What the validator checks (class ARCO)
| Code | Check |
|---|---|
| `ARCO.forma` | premise, yes-or-no question, campaign front and clock exist, pace with its lists |
| `ARCO.tappe` | milestones with increasing ticks up to the last segment; `entro_sessione` consistent with the pace and with the brief's sessions; the front reaches its destiny by the last session and not in the first |
| `ARCO.atti` | 2–3 acts covering sessions 1 to the last, with no gaps or overlaps |
| `ARCO.finali` | 2–4 endings; every state of the arc clock has an ending; one at a full clock and one before; no PC name |
| `ARCO.png` | every recurring NPC has its sheet and appears in session 1 or in a sketch |
| `ARCO.fili` | every thread returns in a session of the arc (in `torna_in` or in a sketch) |
| `ARCO.sessioni` | a one-sentence sketch for every session from 2 to the last |
| `ARCO.misure` | the measures of `strumenti/strati.py` (milestones, acts, recurring NPCs): warning if out of range |

# What the Engine does not do (yet)

The Engine (the server) applies only what is written in a form it can read. Everything else the campaign must do, with
lines and gates, or it does not happen. In the test of the campaign `campagne/nozze-neve`, three of the five serious
problems of the review came from here (its quoted lines: «lingue/<lingua>/preparatore/riferimenti.md», motore.md §0). Every entry on this page is verified on the server code by
`strumenti/motore_limiti.ts` (test `strumenti/test_motore_limiti.py`): if the Engine starts doing it, the test turns red
and this page must be updated. The items to implement in the Engine are in `docs/da-fare.md`.

<!-- limite: azioni_private -->
## Private actions are answered only by lines with the gate
A line without `richiede.privata: true` answers only public actions. A private action (written from the phone as private)
is answered only by lines with `privata: true`, and for the rest the narrator improvises.
- **What to do**: for each thing a PC will probably do in private (speak to an NPC alone, search secretly, read a
  letter), write a line with `privata: true`; an important piece of information that can arrive both in public and in
  private has two lines, or one with `oppure` (repertorio.md §4).

<!-- limite: avanza_quando -->
## `avanza_quando` is applied by nobody
The Engine loads `avanza_quando` and does not use it. A clock advances only through `segno_almeno_ogni` (the Engine
imposes the tick when it is due) and when the narrator or the selector chooses a tick line.
- **What to do**: what must make the clock advance must be written as a line: a tick with the `temi` of the actions that
  make it run, or a moment with `effetti.avanza_orologio`. `avanza_quando` remains a note for whoever reads.

<!-- limite: cambio_scena -->
## At a scene change the clocks jump only if the scene says so
Changing scene changes which clocks are active: the ticks stay as they were, and no clock advances on its own (no "+1 at
every scene change"). The minimum rhythm counts only the turns in which the clock is active, and those of previous visits
add up: entering a scene does not immediately make a tick due.
- **What to do**: if a scene must start with the clock further along ("at the Sasso the sunset is at least at six"),
  write it in the scene sheet: `orologi_in_scena: {o_…: {pieni_almeno: 6}}`; there the clock can also run at another pace
  (`segno_almeno_ogni: 2` inside the same entry). Between sessions, `pieni_all_inizio` of the package still applies.

<!-- limite: finali -->
## Endings come out on their own only at a full clock
The Engine does not know when "the dramatic question has an answer". A line enters the catalogue by state only if its
`richiede.orologio` asks for a full clock and the clock is full; otherwise it enters, like all others, only if an action
touches its `temi` or names the speaker.
- **What to do**: the endings that close the scene before the clock is full have distinctive themes and the gates of the
  outcome (`battute_usate`, `indizi_rivelati`); those of the climax have `richiede.orologio` at a full clock.

<!-- limite: senza_azione -->
## A line comes out only tied to an action, except for due ticks, fillers and endings
The selector uses a line by tying it to a PC's action (`[usa] id > pg`); if it forgets or gets the PC wrong, the Engine
deduces it when only one action of the turn can be the right one. Without an action the Engine accepts only the due tick
of ITS clock, the fillers at a stall, and the endings. At a full clock the Engine itself says the ending: the first
`tipo: finale` available in the order of the repertoire and without gates on the action, then the closing (a `momento`
that asks for a full clock), and the table goes into pause. Every other line that enters the catalogue "by state" (the
crowd, a moment at a full clock) comes out only tied to a public action of the turn.
- **What to do**: put the endings in the order in which they must win (the most specific first, with the outcome gates:
  `battute_usate`, `indizi_rivelati`), without `privata` or `da_pg`, and close with an ending without outcome gates as a
  safety net. A crowd reaction at a full clock must be tied to an action (its `temi`).

<!-- limite: oggetti -->
## Objects have no state
The Engine does not keep track of who has what: an object taken, lost or broken exists only in the transcript.
- **What to do**: if an object changes hands and matters later, the change goes through a line that reveals a clue
  (`effetti.rivela_indizi`), and the lines that presuppose it ask for it (`richiede.indizi_rivelati`). Between one session
  and the next, the state keeps it (`effetti.oggetti`, tra-le-sessioni.md).

# The world that moves (design, 15 November 2026)

Request from Riccardo: «un sistema per far capitare cose al mondo esterno: eventi canonici, personaggi che mutano,
se i giocatori vanno in stallo». The world moves during a session and between sessions, also when the players ignore
it or stall. Sources: Dungeon World (fronts, grim portents, «think offscreen too»), Blades in the Dark (progress
clocks, faction clocks ticked whether the players meant it or not), PbtA (a soft move when everyone looks at you; a
soft move ignored opens a harder one). Code: `apps/server/src/mondo/`. Audit of the state before this work: the
fronts and omens were read only by the validator and the Preparer, `avanza_quando` was a note, the attitudes were
static, only S1 existed.

**Status**: §1–§5 built (`mondo/ritmo.ts`, `mondo/porte.ts`, `mondo/mondo.ts`, `mondo/atteggiamenti.ts`,
`mondo/stallo.ts`, `campagna/mondo.ts`; panel: `apps/web/src/master/SezioneMondo.tsx`). Not built: lines with their own
`effetti.atteggiamento` (the selector proposes changes with `[atteggiamento]`, like the narrator), and a Game Master
command to set an attitude by hand (docs/da-fare.md).

## Principles
1. **The Engine applies only what is written in a form it can read.** Free text stays a note for the narrator and
   the reader; a structured entry is a rule the Engine applies, logs and saves.
2. **A fact moves a clock, not only time.** A clock advances for its pace and for facts of the game (a line said, a
   clue revealed, a fight, a failed check, the PCs leaving or lingering).
3. **What happens is canon, what is heard is chosen.** Every consequence enters the world log (`cronaca`) with its
   turn. The table hears only what a PC could perceive: a prepared line or sentence when the PCs are there, traces or
   news later when they were not. Never an omniscient narration.
4. **Same rules in both modes.** Lines spoken by the Engine (the narrator's voice, before the invitation) work in
   mode A and B; directives for the narrator are mode A only.
5. **Deterministic and saved.** The world state is in the session snapshot and in `registro.yaml`; the next
   session gets it through `stato/stato.yaml`, like every other game fact.

## 1. Clock speed from the session
`segno_almeno_ogni: serata` (instead of a number) asks the Engine for the pace that fills the clock within the
evening. At every closed window (`mondo/ritmo.ts`): `N = max(segno_al_massimo_ogni, floor(T × q / R))`, where `T`
is the number of turns still expected (minutes left of the evening × turns per hour), `q` the share of the
session's scenes where the clock is active (`orologi_attivi`), `R` the marks still to show. The minutes come from
`ore_per_sessione` of the brief (or the hours the Game Master sets on the panel) and the evening's clock. Turns per
hour: `TURNI_PER_ORA = 38` until the evening has 8 turns and 10 minutes, then the rate observed this evening. The
38 is the one evening played by people in the logs (3 November 2026: 44 turns in 69 minutes, windows with a median
of 36 s); scripted runs go at 50–80 an hour, and the observed rate takes over. Because `R` shrinks when facts add
marks, the pace slows down by itself after them. A number still works as before.

## 2. Fact-driven advance: structured `avanza_quando`
Each entry of `avanza_quando` is a string (a note) or a gate. A gate adds `segni` (default 1) owed marks to the clock
when its fact happens, at most `volte` times per session (default: no limit):

| `quando:` | other keys | fact |
|---|---|---|
| `cambio_scena` | — | the Game Master changes scene |
| `lascia_scena` | `scena` (optional) | the PCs leave that scene (any scene) |
| `resta_in_scena` | `turni`, `scena` (optional) | every `turni` turns spent in the same visit of a scene |
| `battuta` | `ids` | one of these lines is said (mode B) |
| `indizio` | `ids` | one of these clues is revealed (mode B) |
| `azione` | `temi` | a public action touches one of these themes (like the lines' `temi`) |
| `prova_fallita` | `prove` (optional) | a check fails (any, or one of these: ability, characteristic, scene check id, type) |
| `scontro` | — | a fight starts |
| any | `tiro: {dado, almeno, visibile}` | optional: the fact is an uncertain outcome, rolled by the Engine (below) |

**Uncertain outcomes are rolled, never decided by the AI** (Riccardo, 15 November). A gate can carry
`tiro: {dado: 6, almeno: 4, visibile: false}`: when its fact happens the Engine rolls, Game Master side and hidden by
default, and the marks are owed only on a success (only successes count for `volte`). The roll goes through one hook,
`tiroDelMondo` / `TiroDelMondo` in `mondo/tiri.ts`, passed to the world as the option `tira`. The world hands its own
crypto dice to the hook with every request; their seed and counter are saved in the snapshot, so a resume replays them.
`Regia.nuovoMondo` passes the Game Master roll path (`prove/tiri-master.ts`): it rolls with the Engine's dice when the
campaign has sheets (saved with the checks' state), otherwise with the world's dice it was handed, logs the roll, lists
it on the panel and shows it at the table when `visibile` or `regole.tiri_master` asks for it.

The same gate grammar asks a scene's **world questions** (`domande` of the scene sheet: is the guard awake? does
the NPC notice?): odds or an NPC's own check, rolled once per session through the same Game Master path, the answer
given to the narrator as a world line (docs/prove.md §9).

An owed mark is **due** at once: it ignores `segno_al_massimo_ogni` (it is a fact, not time) but keeps one mark per
clock per response and two clocks per response, and it waits for the next response if it cannot go out now. If the
response does not show it (mode A: no `[orologio]`; mode B: no mark line), the Engine says the mark's text
(`segni[n]`) itself, before the invitation. The facts of the actions and the checks count in the response that
answers them; lines, clues and scene changes in the next one. If the clock is not active in the current scene (or it
has no scene, like the fronts' `orologi_extra`), the mark is paid **off-screen** at once (§3).

## 3. Marks make things happen; off-screen events
A clock has optional `conseguenze`, one per mark:
```yaml
conseguenze:
  - al_segno: 3
    cosa: "what happens in the world (canon; may be secret)"       # required
    detto: "sentence the table hears if the PCs are there"           # one of detto / battuta / regia
    battuta: b_id                                                    # mode B: the Engine says this line (its own:
                                                                     # never in the reader's catalogue; `temi: []`)
    regia: "directive for the narrator (mode A)"
    tracce: "sentence the table hears later, if it happened elsewhere"
    png: {png_x: {atteggiamento: ostile | {pg_y: amichevole}, scena: scena_y | via}}
    compare: [png_x]        # a hidden NPC (nascosto: true) appears
    indizi: [i_x]           # the world offers this clue: first choice for the stall's S2
```
The front's omens (`preparazione.fronti[].pericoli[].presagi[]`) take part when they say when they come to pass:
`al_segno: n` on the danger's clock (`orologio`). Such an omen is a consequence with `cosa: testo`, `detto:
segno_visibile` and the same optional keys. An omen without `al_segno` stays material for S1. Timeline events with
`segno: {orologio, n}` (`preparazione.cronologia.eventi`) enter the log at that mark (no sentence: they are canon).
`preparazione` stays out of the narrator's context; the Engine reads the parts above in `campagna/mondo.ts`, and
the fronts' `orologi_extra` become clocks that are never active in a scene.

**When it applies.** By state, not by event: the Engine keeps the set of marks already applied and, at fixed points
(after a narration, after a Game Master command, after a scene change), applies every mark between that set and the
clock's `pieni` (a jump of `orologi_in_scena` applies each crossed mark). The marks up to `pieni_all_inizio` count as
applied (they happened before the session), and so does every mark up to `pieni` when a snapshot without world state
is resumed. State changes apply at once. With the clock active in the scene, `detto` (or the
line) is said by the Engine in that response, before the invitation, and `regia` goes into the next turn's message.
A line named by a consequence (or an omen) is the Engine's only: it never enters the reader's catalogue, so it cannot
be used before its mark (A41: torre-mozza's mark-3 line was a filler the reader used first, and the consequence fell
back to `detto`). It may be theme-less (`temi: []`, allowed only for such a line); the validator warns when a filler
or a stall line is named (`FRONTI.battuta_della_conseguenza`: it would no longer come out as one).
A consequence about NPCs (`png`) is seen only if at least one of them is in the scene: with a clock active in two scenes,
the miller fleeing is not seen from the other one (and `detto` must be perceivable from every scene where the clock is
active). Otherwise the event is **off-screen**: logged with `visto: false`, and its `tracce` surface when the PCs enter
a scene where the clock is active, or where an NPC of the consequence (`png`) or of the danger's `cast` is present: the
sentence is read after that scene's opening or return. An event that was not seen only because its NPCs were elsewhere
(the clock was active where the PCs were) surfaces only with one of those NPCs: the place itself knows nothing of it. During a scene (also in a one-scene session) the news arrive
with such an NPC from the next turn on, said by the Engine after the response. A clock active in no scene (the fronts'
`orologi_extra`) has only off-screen consequences: the validator asks for `tracce` there, not `detto`. The −1 of the Game Master does not undo a consequence, and the mark is not applied twice. A clock that fills
off-screen logs its doom (`destino_incombente`, `al_completo`) and says no ending; if the PCs then enter a scene
where it is active, the Engine treats it as any full clock there (mode B: the ending in the first response). The
keys `conseguenze` and the gates stay out of the narrator's cached context, so nothing is read in advance.

## 4. NPCs that change in play
The attitude of each NPC towards each PC starts from `atteggiamento_pg.<pg>.stato` of the card and changes:
- **narrator or selector** (both modes): the line `[atteggiamento] png_x pg_y amichevole` (or `tutti` for every PC) proposes a
  change. The Engine accepts it only if the NPC is in the scene, the change is one step (ostile ↔ indifferente ↔
  amichevole), the NPC has not changed in this turn and that pair not in the last 3 turns, and at most 2 changes a
  turn;
- **checks** (every rule set: only the outcome counts): a social check aimed at an NPC moves the attitude one step
  towards that PC, up on a success, down on a failure, never down to `ostile` (hostile NPCs join fights and impose
  disadvantage: a bad roll must not spiral), once per NPC per visit of a scene. A check that changes nothing leaves a
  line in the server log with why («world: attitude change from a check not applied»: it would make the NPC hostile,
  the attitude is at the end of the scale, the NPC already changed by a check in this visit, or an Engine limit;
  `AtteggiamentiInGioco.daProva`);
- **lines** (mode B, A23): a line's own `effetti.atteggiamento` applies when it comes out, `{png_x: amichevole}`
  towards the PC the line answers (every PC when it answers none, an Engine's line), or `{png_x: {pg_y: ostile,
  tutti: indifferente}}`; written by the big model with the line, so any state, like a consequence (cause `battuta`);
- **consequences** and **Game Master**: any state, no limits (prepared, or decided by a person).
The current attitudes reach the turn's message (changes only), the checks (advantage, disadvantage, who reacts), the
Game Master panel, the snapshot, and `registro.yaml` (`atteggiamenti`, with turn and cause). The Preparer cites them
in `stato/stato.yaml` (`evento: {atteggiamento: png_x}`), and `strumenti/tra_sessioni.py pacchetto` writes them into
the NPC's card of the next package (existing path). An NPC moved by a consequence (`scena`, `via`) leaves or joins the
scene's presences at once; the turn's message says who left or arrived, because the cached context still shows the
scene card.

## 5. Stall S1 → S2 → S3
A stall is a closed window without actions (as before), outside a fight (in a fight an empty window is the NPCs'
turn), or the second turn in a row whose actions bring no new decision (E12): every action only waits, stays put,
does nothing or looks around (a narrow list of patterns in `lingue/<code>/motore.yaml`, section `stallo`, matching
the whole action), or repeats that PC's previous action. In mode B a turn is also a stall, whatever its actions say,
after two answers in a row that brought nothing new to the table (`fermi`, mondo/stallo.ts). The count starts again
only on a real new decision or new information (the lead's rule after round 5 of the coherence layer): a check or
roll, a scene change, a fight on, a clue or a fact a public line of the answer brought (not the Engine's own lines:
stall moves, due marks), or an action that commits, the PC's own verb of moving, going somewhere, giving or taking,
using an object or attacking, in a sentence that is not a question (`stallo.impegno` in `lingue/<code>/motore.yaml`,
`impegna`). A movement to a destination the campaign does not have («vado al mulino» with no mill: its head word is
none of the campaign's or the language's words, `stallo.moto`, coerenza/destinazioni.ts) is not a commitment, and the
Engine answers it with the roads that really leave the scene (its `uscite`, the places the PCs know: «Da qui le strade
che conoscete portano soltanto verso: …»; round 6's off-the-rails players «went» to a mill and a ford every turn and
never stalled). Nor does going «there» after naming a place nobody knows («…c'è una grotta… Vado lì»: `stallo.deittico`
and `stallo.menzione`), or an action that speaks to someone the campaign does not have («Madre Carla, il carretto lo
sequestro»; round 7, FB T8, T11, T13). A sentence-initial name followed by a comma in a sentence that speaks to someone
(«Oreste, a parte, sottovoce: quanto ti pagano?») is an invented name too (coerenza/nomi-nuovi.ts). Naming or questioning an NPC with nothing new in the answer is stalling: before, it counted as a decision,
and round 5's stall game had its first stall move only at T14. A line that only answers («Le pecore non aspettano.»)
is not new either. After a fight is over, the turns count again.
The third e2e pass (docs/e2e-finale-3.md, bug 8) had a stalling table write «Cosa facciamo?», «Non lo so…», «Mi siedo
sul muretto», «Ci penso. Aspetto.»: only the bare «Aspetto.» matched a pattern, the counter never reached a stall, and
five turns of fourteen had an empty catalogue, so the narrator described the yard or handed the question back. What
an answer did to the game is language-free; the patterns stay narrow. Mode A has no tracked material, so there only
the patterns count. A counter grows on consecutive stalls and goes back to zero on a turn with a real decision (or,
in mode B, after an answer that brought something new). Level `((n − 1) mod 3) + 1`:
- **S1** soft move of an active front: the danger of the scene (clock active, or cast present), its `mosse` and the
  next visible sign as material; mode B: a filler line (`riempitivo`) or the due mark; when the selector brought
  neither, the Engine says an available filler of the scene, the danger's cast present first, then the narrator's (the
  canary of 16 November had an improvised «Nel cortile non si muove nessuno.» at S1). From the fourth stall on, S1 also
  owes a mark to that danger's clock (the soft move was ignored: the world moves);
- **S2** proactive clue: the first clue offered by a consequence, else one not yet revealed of the scene's node.
  Mode A: a directive with the clue; mode B: only a clue with an available `indizio` line that reveals it and has no
  gate on the action, which the Engine says; with none, it falls back to S1;
- **S3** an NPC present, or a memory, sums up 2–3 concrete leads, built from what the PCs know: places of the map
  known to them, not visited yet and not kept for the next session (`prossima_sessione`), facts already found; the
  last sign of the threat is material for the narrator apart (mode A), never one of the «roads» of the Engine's
  sentence (round 7, ST T9 heard a clock sign listed as a road). In mode B the Engine's sentence is never said twice
  word for word in a visit: the second time its variant (`mondo.stallo_riga_piste_ancora`, «Le strade restano quelle:
  …»), the third time nothing (round 7, ST T9 and T12). Mode A: a directive with the
  leads; mode B: the Engine says them in one sentence of the language pack.
Never an empty «cosa fate?»: every level carries material. On an E12 stall the move comes together with the
answers to the actions; in mode B the fillers also enter the catalogue.

**Prepared stall lines** (mode B; round 4 of the coherence layer, docs/coerenza.md): a line with `stallo: 1 | 2 | 3`
is material for that level in its scenes, written by the Preparer for every scene: 1 a soft move of the scene's danger
(no blow, no clue, no clock mark), 2 a proactive clue (it reveals one: `effetti.rivela_indizi`), 3 a summary of the
leads the PCs know (gated on what they found: `richiede.indizi_rivelati` or `battute_usate`). They never enter the
reader's catalogue nor its waiting lines: in round 4's stall game the local reader used every filler of the scene as a
waiting line by T6, and the one S1, at T14, found none. At each level the Engine says an available stall line of that
level first (S1: the danger's cast present first, then the narrator's; S2: one that reveals the chosen clue; S3: before
its own sentence, and a prepared summary makes S3 possible even with fewer than two leads), then the old material. The
validator checks the form (`REPERTORIO.stallo`: level, no gate on the action, S2 reveals, S3 reveals nothing and is
gated) and warns for a scene with no stall line of some level (`REPERTORIO.stallo_scarso`; S2 only where the scene has
clues). With the scriptwriter on (docs/sceneggiatore.md), when the table is stalling (answers with nothing new, or stall
moves in a row) and the scene has no stall line of the next level left, the `prossime` request also asks two stall
lines: level 1 (for the next S1 or S2, since an S2 without a clue line falls to S1) with the danger's moves and signs,
or level 3 with the known leads, bound to the next three turns (`fino_al_turno`). Level 2 reveals a clue, so it stays
the Preparer's.

## Log and state
`cronaca` (world log): `{turno, tipo: segno | presagio | evento | atteggiamento, orologio, segno, cosa, visto,
emerso_al_turno}`. It is logged (`mondo:` lines), written as `tipo: mondo` in `narrazioni.jsonl`, shown on the panel
(«Mondo»), saved in the snapshot (`fotografia.mondo`) and copied into `registro.yaml` (`mondo`, `atteggiamenti`).
Owed marks are saved with the clocks (`debito`); the snapshot also keeps the marks already applied, the queues
(sentences to say, directives, traces waiting), the NPCs moved, the attitudes, the stall counter and the current visit
of a scene (its entry turn, for `resta_in_scena`), so a resume applies nothing twice and counts from the real entry.

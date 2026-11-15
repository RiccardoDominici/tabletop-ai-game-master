# The world that moves (design, 15 November 2026)

Request from Riccardo: «un sistema per far capitare cose al mondo esterno: eventi canonici, personaggi che mutano,
se i giocatori vanno in stallo». The world moves during a session and between sessions, also when the players ignore
it or stall. Sources: Dungeon World (fronts, grim portents, «think offscreen too»), Blades in the Dark (progress
clocks, faction clocks ticked whether the players meant it or not), PbtA (a soft move when everyone looks at you; a
soft move ignored opens a harder one). Code: `apps/server/src/mondo/`. Audit of the state before this work: the
fronts and omens were read only by the validator and the Preparer, `avanza_quando` was a note, the attitudes were
static, only S1 existed.

**Status** (updated with each commit): §1, §2 and §3 built (`mondo/ritmo.ts`, `mondo/porte.ts`, `mondo/mondo.ts`, `campagna/mondo.ts`); the attitude store of §4 is used by consequences. The rest of §4 and §5 are the design, built in the next commits.

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
    battuta: b_id                                                    # mode B: the Engine says this line
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
Otherwise the event is **off-screen**: logged with `visto: false`, and its `tracce` surface when the PCs enter a scene
where the clock is active, or where an NPC of the consequence (`png`) or of the danger's `cast` is present: the
sentence is read after that scene's opening or return. The −1 of the Game Master does not undo a consequence, and the mark is not applied twice. A clock that fills
off-screen logs its doom (`destino_incombente`, `al_completo`) and says no ending; if the PCs then enter a scene
where it is active, the Engine treats it as any full clock there (mode B: the ending in the first response). The
keys `conseguenze` and the gates stay out of the narrator's cached context, so nothing is read in advance.

## 4. NPCs that change in play
The attitude of each NPC towards each PC starts from `atteggiamento_pg.<pg>.stato` of the card and changes:
- **narrator** (mode A): the line `[atteggiamento] png_x pg_y amichevole` (or `tutti` for every PC) proposes a
  change. The Engine accepts it only if the NPC is in the scene, the change is one step (ostile ↔ indifferente ↔
  amichevole), the NPC has not changed in this turn and that pair not in the last 3 turns, and at most 2 changes a
  turn. Mode B has no free lines: there the changes come from checks and consequences;
- **checks** (every rule set: only the outcome counts): a social check aimed at an NPC moves the attitude one step
  towards that PC, up on a success, down on a failure, never down to `ostile` (hostile NPCs join fights and impose
  disadvantage: a bad roll must not spiral), once per NPC per visit of a scene;
- **consequences** and **Game Master**: any state, no limits (prepared, or decided by a person).
The current attitudes reach the turn's message (changes only), the checks (advantage, disadvantage, who reacts), the
Game Master panel, the snapshot, and `registro.yaml` (`atteggiamenti`, with turn and cause). The Preparer cites them
in `stato/stato.yaml` (`evento: {atteggiamento: png_x}`), and `strumenti/tra_sessioni.py pacchetto` writes them into
the NPC's card of the next package (existing path). An NPC moved by a consequence (`scena`, `via`) leaves or joins the
scene's presences at once; the turn's message says who left or arrived, because the cached context still shows the
scene card.

## 5. Stall S1 → S2 → S3
A stall is a closed window without actions (as before), outside a fight (in a fight an empty window is the NPCs'
turn). A counter grows on consecutive stalls and goes back to zero on a turn with an action. Level `((n − 1) mod 3) + 1`:
- **S1** soft move of an active front: the danger of the scene (clock active, or cast present), its `mosse` and the
  next visible sign as material; mode B: a filler line or the due mark, as before. From the fourth stall on, S1 also
  owes a mark to that danger's clock (the soft move was ignored: the world moves);
- **S2** proactive clue: the first clue offered by a consequence, else one not yet revealed of the scene's node.
  Mode A: a directive with the clue; mode B: the Engine says an available `indizio` line that reveals it and has no
  gate on the action, otherwise falls back to S1;
- **S3** an NPC present, or a memory, sums up 2–3 concrete leads, built from what the PCs know: places of the map
  known to them and not visited yet, clues already found, the threat of the scene. Mode A: a directive with the
  leads; mode B: the Engine says them in one sentence of the language pack.
Never an empty «cosa fate?»: every level carries material. The «two inputs without new decisions» classifier of E12
is not built.

## Log and state
`cronaca` (world log): `{turno, tipo: segno | presagio | evento | atteggiamento, orologio, segno, cosa, visto,
emerso_al_turno}`. It is logged (`mondo:` lines), written as `tipo: mondo` in `narrazioni.jsonl`, shown on the panel
(«Mondo»), saved in the snapshot (`fotografia.mondo`) and copied into `registro.yaml` (`mondo`, `atteggiamenti`).
Owed marks are saved with the clocks (`debito`).

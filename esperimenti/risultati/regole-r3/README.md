# Live check of the rules-engine work R3 (21 November 2026)

Progression by class and level, XP, the level-up between sessions, the Game Master's secret rolls and Turn Undead
(docs/prove.md §12), on the real server with the scripted narrator (`--finto`), the rules arbiter, the Engine's dice with a
fixed seed and **manual rolls** (the headless players roll their own dice from `--seme-giocatori` and enter them). The
campaign is a two-session copy of the invented fixture `apps/server/test/fixtures/campagne/cripta` (a thief, a cleric
one step from the 2nd level, a fighter; a skeleton, a putrid corpse, a door with voices behind it), in `campagna/cripta/`.
Everything is redone by `rifai.sh` (test ports 4991 and 4992, stopped at the end):

1. **Session 1** (`sessione-1/`, script `esperimenti/copioni/regole-r3/cripta-1.yaml`, `--chiudi`): the server writes
   `campagna/cripta/sessioni/01/registro.yaml` at the close.
2. **Between the sessions**: `stato/stato.yaml` as the between-session agent writes it (the minimum the step needs);
   `python3 strumenti/tra_sessioni.py pacchetto campagna/cripta 1` writes the skeleton of `sessioni/02/` with
   `pg_all_inizio` from the log (`pacchetto.txt`: «pg_oreste sale al livello 2 (175 PX): i punti ferita (1d6) li tira il
   giocatore all'inizio della sessione; incantesimi al giorno [1]…»); then the agent's part, scripted in `rifai.sh`: the
   summary, a scene, two nights of rest for Tessa (`pf: 2`), the spell Oreste prepares in his new slot, the hour.
3. **Session 2** (`sessione-2/`, script `cripta-2.yaml`, `TAGM_SESSIONE=2`).

Files of each session: `fatti-e-tiri.md` (the facts the narrator received and the cards, from the server log, by
`../regole-r2/fatti.py`), `tavolo.md` (what the table heard and the cards on the projector), `trascrizione.md`,
`turni.jsonl`, `riepilogo.json` (`tiri_al_tavolo`: every roll the players were asked).

| session, turn | rule | seen |
|---|---|---|
| 1, T1 | a thief's Listen is the Game Master's secret roll | no request on Tessa's phone (the first she is asked is her initiative), no card on the projector (`tavolo.md` has no «Origliare»); the narrator's fact: «Tiro segreto del master … d100 63 → FALLIMENTO … Tessa non nota niente: raccontalo come se non ci fosse niente da notare» |
| 1, T2 | Turn Undead from the cleric's table | Oreste's player rolls the d20 (11) and then 2d6 (1 + 4 = 5 hit dice); 11 turns the skeleton (cell 10), not the putrid corpse (14): «riesce su 1 di loro, dal più debole … Ossa è scacciato per 180 round» (2d4 turns, a Game Master roll), and the partial failure locks it: «non può riprovarci per un po'»; the lock ends in T13 («Finiscono: scacciare i morti di Oreste») |
| 1, T3–T8 | the turned undead out of the fight; numbers by class and level | «Turno di Ossa: è scacciato, non agisce»; the attack bonuses come from the class tables (Gaia d20+2: table +1, Strength +1; Tessa +1) |
| 1, T8 | XP for the defeated | the putrid corpse at zero ends the fight; both are defeated (the turned one by its condition): 20 + 40 XP, shared by the three, the humans +10% (`registro.yaml → esperienza`) |
| 1, T13 | XP for treasure back to safety | the panel's coins (150 mo to Tessa), then «Tesoro al sicuro»: 150 XP, 50 each, the humans 55; at the close `pg_alla_fine` has Oreste at 175 XP, level 1, 6 maximum hit points |
| 2, T1 | the level-up: the player rolls the new hit die | the first window asks Oreste's player «Punti ferita del 2° livello» (1d6 +1, `tiri_al_tavolo`): 3 + 1 = 4, and the narrator hears it first: «Oreste passa al 2° livello (2° livello: 1d6 3 +1 = 4): 4 punti ferita in più, 10 in tutto» |
| 2, T1 | the new level's spell slot | Cura ferite from the 1st-level slot the 2nd level gives (none at the 1st), its die asked of the player: «gliene restano 0 di quel livello per oggi» |
| 2, T2 | the slot is spent | «Oreste non ha Cura ferite tra gli incantesimi preparati per oggi»: refused by name, nothing cast |

No «a player roll was not asked» line in either session's log after its start.

Not shown live (covered by the unit tests on the same fixture): a successful secret listen and a private one
(tiri-segreti.test.ts), the thief's «it seems to have worked» for moving silently, pick pockets noticed above twice the
target, a rung's −20 on a threshold; Turn Undead turning the whole group, a D result destroying with 1d8 × level rolled
once, a failure on the weakest, a class without the table (scacciare.test.ts); the one-level cap of an adventure, a dead
PC's lost share (esperienza.test.ts); a resume and «Ricomincia» around the level-up roll (livelli.test.ts). Attacking a
turned undead (T10, T12) opens a fight that ends at once, the enemies being out of it: no harm, a fact the narrator gets
twice.

Found and fixed in this check (commit 03d35ba): the rules arbiter listed only the sheet's spells, so the cleric's new
spell from the package rolled nothing; the dry run of manual rolls dropped the prepared list of a sheet that prepares none,
so the cure's die was not asked; the panel could not give coins to a PC with an empty purse; the harness checked a script
against the first package; the continuity check read a level-up as a PC going back.

Found and not fixed (R1's death rule, outside this package): Tessa fell to 0 in round 2 and the fight ended in round 3
before her turn, so she never rolled her death save; she stays at 0 with no countdown (the between-session agent gave her
two nights of rest). A PC at 0 when a fight ends should get the set's rule at once, as one dropped outside a fight does.

**Also in this folder**
- `torre-dardo/`: R1's live script on torre-mozza (`esperimenti/copioni/regole-r1/torre-dardo.yaml`, port 4995, same
  seeds as the baseline taken before R3): the players' rolls and the narrator's facts are identical to the run before the
  package (Nespola's sneak attack is still d20+5, now from the thief's table +1 and the set's +4).
- `playwright/`: the panel's XP box and two phones in a real browser (`apps/web/e2e/esperienza.spec.ts`, port 4993, the
  cripta fixture, automatic rolls): the XP and the next level by class, coins found waiting as treasure, «Tesoro al
  sicuro», the Game Master's award; Tessa's phone shows her 150 coins, Gaia's never does, and Tessa's never shows Gaia's
  potion. R2's gear e2e (`scorta.spec.ts`) passes again on the per-phone channel (port 4994).

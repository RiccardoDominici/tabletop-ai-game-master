You are the PHASE-2 JUDGE (the Game Master's view, with the data) of the final end-to-end test of the repo /Users/riccardo/Developer/cantastorie («Tabletop AI Game Master»). Phase 1, written blind by a player-judge from what the table heard, is in /Users/riccardo/Developer/cantastorie/esperimenti/giudizio-e2e-finale/fase1-giocatore.md: read it first.

## The four games (the key phase 1 did not have)
| phase-1 name | run | profile |
|---|---|---|
| partita-1 | torre-mozza-indagine-B | B: Haiku narrator (full mode, writes prose and picks prepared lines), Haiku dice arbiter with the rule set, drama-3 voice; code 335b27b |
| partita-2 | torre-mozza-indagine-A | A: all local: Qwen3 8B «minimal reader» (only picks a prepared line per action or «nessuna»; the Engine composes the announcement «Name: «first words»»), dice arbiter by rules (keyword classifier, no model), fake voice, plus the «sceneggiatore» (Claude Code writes missing lines in the background, delivered while the window is open); code 1a7839b |
| partita-3 | torre-mozza-pressione-B | as partita-1; code 335b27b |
| partita-4 | torre-mozza-pressione-A | as partita-2; code cdb076f |
Two fixes landed DURING the test (after partita-1/3 and partita-2): 16fe790 «Keep NPC replies to a private action off the table» and cdb076f «Engine says the combat facts the narration leaves out». Say for each problem whether those commits plausibly address it, but do not read code to verify.

## Sources you may read
- the campaign: /Users/riccardo/Developer/cantastorie/campagne/torre-mozza/ — campagna.yaml, scena.yaml, scene/*.yaml, png/*.yaml, pg.yaml, repertorio/*.yaml, regole/regole.yaml, regole/riassunto.md (do NOT read README.md or autovalutazione.md);
- for each run R in the table: /Users/riccardo/Developer/cantastorie/esperimenti/risultati/e2e-finale/R/trascrizione.md (verbatim protocol lines, incl. `[usa] <line id> > <pc>`, `[privato pg_x]`, invitations) and riepilogo.json;
- the measures computed from the server logs: esperimenti/e2e-finale/R/misure.json (dice cards by rule, combat events, private-action suspects, reader «nessuna», sceneggiatore deliveries, timings, warnings);
- the dice facts the Engine gave the narrator, turn by turn: grep `"prove: tiri del turno"` in logs/porta-<port>/server.jsonl of that run (not in git) (field `fatti`); read only those lines;
- the Basic Fantasy rules as extracted from the manual: the output of strumenti/regole/estrai.py on manuali/basic-fantasy-rpg-r142.pdf, lines 1629–2000 (encounter and combat) and 4803–4870 (death and dying, ability rolls).

## Causes to attribute (one per problem; two if really shared)
(1) campaign data / Preparatore skill · (2) validator · (3) Engine (server code) · (4) prompt or model behaviour of narrator/selector/reader/arbiter · (5) action script or test harness · (6) provider/infrastructure.

## Write
English, quotes verbatim (Italian), to /Users/riccardo/Developer/cantastorie/esperimenti/giudizio-e2e-finale/fase2-master.md, at most 230 lines:
0. Numbers per game (turns, prepared vs improvised lines, dice cards, combat entered/rounds/0 HP, private actions and how many were heard at the table, ending reached, cost).
A. Secret leaks (prepared or improvised), with line ids.
B. Contradictions with the canon, NPCs that know or say what they should not, dead/down/fled characters that keep acting.
C. Clocks and endings.
D. Prepared lines: chosen for the wrong action (the line's `quando` not met), gates.
E. Rules fidelity against the manual excerpt: initiative, attacks vs Armor Class, ability-roll target 17, morale, death at 0 / save vs death, absurd checks (list each with turn, card and the action text).
F. Script and harness effects (what would not happen with real players).
G. Every phase-1 «top problem»: confirmed / wrong / partly, with the cause number and the evidence.
H. COHERENCE, I. FLUIDITY, J. RULES FIDELITY: a score 1–5 per profile (A vs B), with the three strongest pieces of evidence each.
Reply with sections G and H–J only.

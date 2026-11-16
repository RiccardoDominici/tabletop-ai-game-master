# Final end-to-end pass, third run: blind scripts for combat, off the rails and stalls

What this page is: the report of the last blind end-to-end pass on the code of 8 November, after the fixes of the
second and third passes in [docs/e2e-finale.md](e2e-finale.md). Three new blind scripts (a fight in turn order, an
off-the-rails session, a stalling table) were played on the real server in profile B, measured, and judged by blind
haiku judges, each reading only the table record of one game. Read first: [docs/e2e-finale.md](e2e-finale.md) §4 and §11
(how the runs are made), [docs/combattimento.md](combattimento.md), [docs/mondo.md](mondo.md), [docs/prove.md](prove.md).

**Verdict in one paragraph.** The pipeline runs the three new scripts to the end: 0 server errors, no stuck pause,
no crash, $0.24 for four games. The **table-facing failures are the same family as before**, and two are new in
severity. Private content reached the table in two of four games, in a form the leak detector cannot see (it reports
0 in every run). A fallen enemy came back to life in both combat games, and a PC at 0 hit points kept acting. Dice
cards and narration contradicted each other in every combat game. The world clock barely moved (1/8 and 2/8 in
every game, no mark after the opening turns). In a stalling table the narrator answered seven of fourteen turns with
an empty or idle line and never offered a clue or a choice. **Not ready: the combat games are not coherent, and the
private-line guard is not reliable.** Profile A was not run (see §1). **After the fix pass** (§7, the coherence layer of
docs/coerenza.md): private content no longer at the table, the order said, the DC hidden, first-audio faster; still not
ready: two definite and about fifteen probable high-severity sentences in four games, and the stall run idle.

## 1. What was run

| Item | Value |
|---|---|
| Code | `8c7123c` («To-do: what is still open in the world that moves»), in the git worktree `scratchpad/wt-e2e3` at that commit. The first worktree was pinned to `c56a8c0` and disappeared from the scratchpad before the runs (`git worktree prune` or a cleanup by another agent); it was recreated at `8c7123c`, with the same `node_modules` links, a copy of the ignored `cache/audio-fish` and `config/locale.yaml`. The worktree is removed at the end. |
| Campaign | `campagne/torre-mozza` (unchanged) |
| Scripts | `esperimenti/copioni/torre-mozza/combattimento.yaml` (14 turns, 4 private actions, one «anch'io»), `fuori-binario.yaml` (13 turns, 3 private, one «anch'io», invented NPCs «Oreste» and «Madre Carla»), `stallo.yaml` (14 turns, 2 private). Written blind by a haiku subagent that read only the player material (`pg.yaml`, the opening summary `riassunto_iniziale`, the opening scene's `nome` and `apertura`, the copioni README and the two existing scripts as format examples). `valida_campagna.py campagne/torre-mozza --copioni esperimenti/copioni/torre-mozza` gives 0 errors. |
| Profile | B: Haiku narrator and arbiters through the API (`TAGM_LETTORE`, `TAGM_ARBITRO_PROVE`, `TAGM_ARBITRO_AZIONI`, `TAGM_RIASSUNTO`, `TAGM_REGOLE` = anthropic), `TAGM_VOCE=fish`. The harness passes `--mock`, so the voice was the fake one, as in the earlier passes. |
| Ports | 4900 (combat, manual rolls), 4901 (combat, automatic rolls), 4902 (fuori-binario, manual), 4903 (stallo, manual). All sequential, `--pausa-s 20`. 4610, 4611, 4612 were not touched. |
| Profile A | **Not run.** Profile A needs the local reader on 4613, which was not started by this pass; the reader running on 4613 belongs to another agent (the lead's process), and the rule was to use the reader only if it was ours. Memory was 49% free, so the memory gate alone would have allowed it. |
| Measures | `esperimenti/e2e-finale/misure.py` and `tavolo_con_carte.py` on each run (results in `esperimenti/risultati/e2e-finale-3/<run>/` of the worktree, not in git) |
| Judges | one haiku judge per game, blind, reading only that game's `tavolo-con-carte.md` (a copy named `partita.md`), with the rubric of `esperimenti/e2e-finale/giudizio-fase1-prompt-2.md` and five questions (Q1 world, Q2 stalls, Q3 off the rails, Q4 combat, Q5 privacy). The top claims were checked against the table files. |

## 2. Results

| | combat, manual (4900) | combat, automatic (4901) | fuori-binario, manual (4902) | stallo, manual (4903) |
|---|---|---|---|---|
| turns played / scripted | 26 / 14 (combat windows) | 28 / 14 (combat windows) | 16 / 13 | 14 / 14 |
| scene changes | carbonaia, torre | carbonaia, torre | none | none |
| midnight clock (max) | 1/8 | 1/8 | 2/8 | 2/8 |
| private actions / lines in the table record flagged | 3 / 4 | 3 / 4 | 3 / 4 | 2 / 2 |
| clear leaks confirmed by reading the table (see §3) | 0 clear; 1 borderline (T2 public line after a whisper) | 0 clear; 1 partial hint (T30) | **1** (T5, the content of the private question) | **1** (T11, the answer to a private question) |
| dice cards (checks / attacks) | 6 checks, 12 attacks (of 29 resolved actions) | 22 d20 in the cards, 11 with a roll (of 28) | 10 checks (of 16) | 0 (of 15) |
| rolls asked of the phones | 11 (manual) | 0 (automatic) | 10 (manual) | 0 |
| combat: fights / down PCs / down NPCs that come back | 1 / Eliandro (T23, acts T27) / Zirrà (returns T19) | 1 / Nespola (0 HP T16, acts), Eliandro (T29 death) / Zirrà (returns T19) | none | none |
| ending reached | no | no | no | no |
| secret leaks (detector `misure.py`) | 0 | 0 | 0 | 0 |
| server errors / warnings | 0 / 18 | 0 / 24 | 0 / 12 | 0 / 11 |
| cost (USD) | 0.082 | 0.086 | 0.041 | 0.033 |

The detector reports 0 leaks in every run, but the judges found public lines that carry the content of private
actions (§3, bug 1). The fourth column of the detector counts only what it can see.

## 3. Judged answers

Scores are 1–5 (H coherence, I fluidity, J rules fidelity). Quotes are verbatim, Italian. Each judge read only one game.

**Combat, manual rolls (4900).** Scores: clarity 3, NPCs 4, agency 3, mystery 3, prose 2, rhythm 2, fun 3, H 2, I 2, J 2.
- *World (Q1, 3/5):* «Ugo ha il viso scuro: dal paese è salito un ragazzo a dirgli che il suo carbone non lo vuole più nessuno.» (T4); «Dalla cantina il colpo sordo di pietra contro pietra si ferma. Poi ricomincia, più piano.» (T25). No clock mark; the midnight deadline is not revisited after T5.
- *Stalls (Q2):* one stall escalated well: «Livia, il goblin davanti a te esita e guarda il compagno.» (T24). Zero empty «cosa fate?».
- *Combat (Q4):* no initiative roll or order line anywhere: the order is visible only from the turns. Card and narration disagree at T8: card «Spada corta alle spalle 8 contro CA 14, fallita», narration «Il colpo la prende dritta sulla schiena». At T23 the card says «Grosso: Mazza ferrata 17 contro CA 12, riuscita», and the narration only says «Eliandro cade a terra».
- *Downed NPC returns (H):* T11 «Zirrà resta a terra, immobile.», then T19 «Zirrà schiocca le dita.» and T20 «Eliandro tira il pugnale verso Zirrà, ma lei non c'è più.» followed by «dove Zirrà è caduta».
- *Privacy (Q5):* the private question to Berta (T2) is not repeated, but the public line «Berta fa un passo verso la porta e stacca un po' la lavagna dal chiodo» reads as a reply to a question the table did not hear. Borderline.
- *Top problems (judge's order):* cards contradicting narration (T4 «18 contro soglia 25, riuscita» and a miss-then-hit at T8); 0 HP does not stop a PC, and Eliandro is down at T23, acts at T27; Zirrà comes back; targets swapped at T9 («Tiro il pugnale da dietro la pietra, al goblin con la lancia» becomes Zirrà); the same lines repeat (T14/T16, T19/T23); three turns with no prompt; DCs visible on the projector («soglia 25», «CD 17», «CD 10»).

**Combat, automatic rolls (4901).** Scores: clarity 2, NPCs 3, agency 3, mystery 3, prose 2, rhythm 2, fun 3, H **1**, I 2, J 2.
- *Dead NPC:* T11 «Nespola colpisce ancora. La spada corta entra sotto il braccio di Zirrà, che cade a terra senza un grido.» then T19 «Zirrà schiocca le dita.» and T21 «Zirrà ride corto, senza fretta, e non si volta verso di lei.»
- *PC at 0 HP:* T14 «Vedo Nespola a terra.» (Eliandro) and in the same turn «Nespola resta in piedi, la spalla sanguinante, lo sguardo fisso sull'hobgoblin ferito.»; T16 «Ho zero punti ferita, sono a terra.» then Nespola acts, with no save. «Eliandro muore.» (T29) comes before the card «Eliandro: Tiro salvezza contro la morte 6 contro CD 10, fallita».
- *Card vs narration:* T6 card «Nespola Tondi: Destrezza 17 contro CD 17, riuscita», then «Zirrà colpisce Nespola.»; T14 a dart aimed at the goblin hits Grosso, card «Dardo incantato 6 contro soglia 0, riuscita»; T29 «Grosso: Mazza ferrata 19 contro CA 17, riuscita» with no hit narrated.
- *Attacks without any card:* T7, T12, T13, T15, T20, T26.
- *Privacy (Q5):* the private question to Berta and Ugo was not spoken. The public reaction at T30 «il suo sguardo si ferma su di lei» hints the act, not the words. Partial.
- *Top problems:* the dead goblin returns; death rules applied at random; hits and misses do not match the cards; a claim and the state contradict in one turn (T14); missing rolls; idle turns T22, T27, T30 with the stock line «Il fuoco crepita e la scala rotta trema» (about ten times).

**Off the rails, manual rolls (4902).** Scores: clarity 3, NPCs 3, agency 4, mystery 4, prose 2, rhythm 2, fun 3, H 2, I 2, J 3.
- *Private content spoken (Q5, the clearest leak of the pass):* T2 private: «Berta, a parte: quanto ti pagava Ugo per il carbone?» (marked «azione privata»). Narration T5: «Nespola, la tua domanda sul prezzo del carbone è scivolata nel fango. Berta non ti guarda nemmeno.» The content is spoken at the table.
- *Off the rails (Q3):* coherent. Livia insults Madre Carla: «il carretto si ferma e non cede di un dito. Madre Carla non si alza.» No railroading. Berta's reaction fits an insulted mother. The invented NPCs «Oreste» and «Madre Carla» are adopted at once; whether this is canon the judge could not check.
- *Canned line (b):* «Questo non lo so. Io so di pecore e di figli.» is said verbatim at T1 and T4, in answer to questions it does not address.
- *Card vs narration:* T1 card «Berta Benni: A mani nude 14 contro CA 15, fallita», yet «la sua mano aperta sfiora la guancia della halfling con uno schiaffo secco.» T14 «il sangue sul labbro della halfling» with no damage shown.
- *Top problems:* the private question is repeated publicly (T5); cards and narration disagree (T1, T6, T11); answers to questions nobody addressed (T9 Ugo answers Fulco's question to Oreste; Ugo is on the hill after being left at the carbonaia); empty turns T5 («Il tempo passa.»), T10, T15; repeated lines.

**Stall, manual rolls (4903).** Scores: clarity 3, NPCs 3, agency 2, mystery 3, prose 2, rhythm 2, fun 2, H 2, I 1, J 2.
- *Stalls (Q2), the focus:* seven of fourteen narrator answers were empty or idle or a handback. «la domanda resta sospesa nell'aria fredda del cortile.» (T1); «Nessuno la ferma, e nessuno le dice dove andare.» (T4); «Il cortile resta fermo.» (T14); «la domanda resta a voi.» (T12). The escalation the brief asks for (concrete clue, then a choice with a consequence, then a move of the world) stops at the world move: the horns and the fire arrive (T6, T7, T12, T14), but no clue and no choice. The judge's read: the default answer to a stall is a description or a handback.
- *Private content narrated (Q5):* T11 «Livia ha chiesto a Ugo dove stava la notte, e lui ha detto che guardava il fuoco della carbonaia.» The private question was «chi passa dal cancello di notte?». The answer reaches the table, and the question is changed in the retelling. Checked against the table file: line 135.
- *Ugo's position (H):* leaves at T1 («Ugo prende la strada della carbonaia senza aspettare risposta»); at T10 «Ugo è già sul sentiero della carbonaia, lontano dal cortile.» and in the same turn «Ugo si toglie il cappello e se lo rigira tra le mani.»; leaves again T11.
- *World (Q1):* yes, through sound and fire: «Dalla torre, lontano, arriva il suono sordo di un tamburo.» (T14); Berta moves from «Non è il momento di discutere.» (T1) to «Chiamati, sì.» (T7). No clock mark.
- *No roll asked anywhere* in 14 turns, not for the search (T3, «Non trova niente che stoni, a parte il silenzio dei cani.»), nor for pressing Ugo (T9).
- *Top problems:* empty stall answers; private answers narrated publicly; Ugo's location; no clue or choice; repetition of the courtyard description (T3 and T6 almost verbatim); no roll where a roll fits.

**Cross-game.** All four judges: the narration restates player actions in the third person before resolving them («X dice che…»); stock lines recur («Il fuoco crepita» about ten times in combat-auto; «quaderno stretto al petto» about five times in combat-manual). The horns in the fuori-binario run are the only real world motif that shortens over time, and it was noticed by the judge as good.

## 4. Bug list

Severity: **H** high (breaks a promise to the table), **M** medium (visible, hurts the game), **L** low. Cause: the file most likely involved (a guess, to be confirmed).

| # | Sev | Bug | Evidence (run, turn, quote) | Likely file |
|---|---|---|---|---|
| 1 | **H** | Private action content reaches the table in narration, and the leak detector counts it as clean. | fuori-binario T5: «Nespola, la tua domanda sul prezzo del carbone è scivolata nel fango.» (private question T2); stallo T11: «Livia ha chiesto a Ugo dove stava la notte, e lui ha detto che guardava il fuoco della carbonaia.»; combat-manual T2 public «stacca un po' la lavagna dal chiodo» reads as a reply to a whisper. The server logged «narratore: riga al tavolo sull'azione privata di un PG, spostata al suo telefono» 5 times per run, so the guard fires and misses these. | `apps/server/src/narrazione/privato.ts` (guard); `esperimenti/fughe.ts` (detector blind to narrated outcomes) |
| 2 | **H** | A fallen NPC comes back to life. Zirrà falls (T11 combat-manual, T11 combat-auto) and is up again at T19–T21, and in combat-manual she is «lei non c'è più» at T20 and «dove Zirrà è caduta» in the same turn. | combat-manual T11 «resta a terra, immobile», T19 «schiocca le dita»; combat-auto T11 «cade a terra senza un grido», T19 «schiocca le dita», T21 «ride corto». Probably a regression of C1 of the second pass (the fix removed dead NPCs from the catalogue; the narrator's memory of them is the likely gap; guess). | `apps/server/src/prove/combattimento.ts` (outcome → scene presence); the narrator's context (`apps/server/src/llm/narratore.ts`) |
| 3 | **H** | A PC at 0 HP acts on, and the death rules are applied at random. | combat-auto T14 «Vedo Nespola a terra.» and «Nespola resta in piedi»; T16 «Ho zero punti ferita, sono a terra.» then acts; combat-manual T23 Eliandro «privo di sensi» acts at T27. The death save appears late (combat-auto T29, after «Eliandro muore.»). | `apps/server/src/prove/combattimento.ts` (0 HP, save vs. death); the narrator's state (HP not passed as a fact) |
| 4 | **H** | Dice cards and narration contradict each other. | combat-manual T8 card «8 contro CA 14, fallita» with a hit narrated; combat-auto T6, T14 (dart aimed at a goblin hits Grosso), T29 (riuscita, no hit); fuori-binario T1 card «A mani nude 14 contro CA 15, fallita» with the slap landing. | `apps/server/src/prove/` (outcome of the Engine) vs. the narrator's outcome text; the guard «narrator: sentence contradicts the Engine» covers only some cases |
| 5 | M | Attacks with no dice card, and attacks rolled by no one. | combat-auto T7, T12, T13, T15, T20, T26; combat-manual T15, T20; fuori-binario T11 card with no attack narrated, T6 Carisma card against a narrated colpo. | `apps/server/src/prove/classificatore-regole.ts` (attack vs. check decided by rules); the narrator's free outcome |
| 6 | M | Combat has no visible initiative: no roll and no order line, and a player's «vado per prima» is ignored (the narrator resolves Livia first). | combat-manual, combat-auto (judges Q4). Note: the e2e doc says initiative is rolled and announced («Iniziativa: …»); the scene change to the torre may start combat without that step. To verify. | `apps/server/src/prove/combattimento.ts` (start of combat); the scene change |
| 7 | M | The world clock barely moves: midnight is 1/8 or 2/8 in every game, with no mark after the opening turns, and the deadline is not revisited. | misure `orologi_max` (all four runs); judges Q1 in all four. | `docs/mondo.md` rules vs. the clock tick in the Engine (`apps/server/src/mondo/`) |
| 8 | M | In a stall the narrator never reaches a clue or a choice: seven of fourteen answers empty, idle or handed back. | stallo T1, T4, T12, T14 («la domanda resta a voi», «Il cortile resta fermo»); combat-auto T22, T27, T30 without a prompt; fuori-binario T5 «Il tempo passa.» | the narrator's prompt (no escalation rule for vague actions); `esperimenti/copioni/` not involved |
| 9 | M | DCs and targets are shown on the projector («soglia 25», «CD 17», «CD 10»). The rubric asks that no DC is shown to players; whether the cards are meant to show targets is a design decision to confirm. | combat-manual T4, T6, T24; fuori-binario cards (every check) | card formatting in `apps/server/src/prove/` |
| 10 | M | NPC position and presence are not tracked: Ugo leaves, is on the hill, speaks while «già sul sentiero», and leaves again in one scene; Ugo answers a question addressed to Oreste. | stallo T1, T10, T11; fuori-binario T7, T9 | the narrator's scene context (`apps/server/src/llm/narratore.ts`, presence) |
| 11 | M | Canned and echoed lines: the same line verbatim in distant turns, the player's words restated as narration, and stock lines recurring. | fuori-binario T1 = T4 «Questo non lo so. Io so di pecore e di figli.»; combat-auto «Il fuoco crepita» ×10; combat-manual «quaderno stretto al petto» ×5; stallo T3 = T6 | the narrator prompt (style); the repetition guard for lines |
| 12 | M | Idle or prompt-less turns in combat and exploration. | combat-manual T19, T23, T25; combat-auto T22, T27, T30; fuori-binario T5, T10, T15 | the narrator prompt (turn closing) |
| 13 | L | A garbled line merges two NPC names, or a player's words are rephrased into a broken sentence. | fuori-binario T9 «Il ragazzo, o Oreste, Ugo sorride»; T10 «Nespola Tondi chiede a un pastore che Oreste non si fa vedere» | the narrator (`apps/server/src/llm/narratore.ts`) |
| 14 | L | The judges read the scripted length as the game length: none of the four games reaches an ending (the scripts end at 13–14 turns). | judges Q-f in all four | scripts (by design), not a bug in the code |

Notes on what was not counted as a bug: the 0 server errors and no stuck pause in all four runs; the fake voice
(warnings from the voice are debug-level since `9d06809`); the scripted games ending at 13–14 turns.

## 5. Next step

Fix bugs 1 to 4 before any more play: they are the table-facing ones. Bug 1 needs the leak detector (`esperimenti/fughe.ts`)
to read the narration as well, so the next pass can see what the guard misses. Profile A was not run; run it on the
next pass with its own reader on 4613, after the other agent's work on the reader is done.

## 6. Reproduce

```
git worktree add --detach <scratch>/wt-e2e3 8c7123c     # then node_modules as in docs/e2e-finale.md §11
TAGM_PORTA=4900 TAGM_LETTORE=anthropic TAGM_ARBITRO_PROVE=anthropic TAGM_ARBITRO_AZIONI=anthropic TAGM_RIASSUNTO=anthropic TAGM_REGOLE=anthropic TAGM_VOCE=fish \
  npx tsx apps/server/src/esperimenti/esegui.ts torre-mozza/combattimento B --campagna torre-mozza --uscita e2e-finale-3/torre-mozza-combattimento-B-manuale --pausa-s 20 --tiri manuale
python3 -I esperimenti/e2e-finale/misure.py esperimenti/risultati/e2e-finale-3/<run> logs/porta-<porta>
python3 -I esperimenti/e2e-finale/tavolo_con_carte.py esperimenti/risultati/e2e-finale-3/<run> logs/porta-<porta>
```

Ports 4900–4903 for the four runs; `--tiri automatico` for the second combat run. The judges' brief was the rubric of
`esperimenti/e2e-finale/giudizio-fase1-prompt-2.md` with the five questions of §1 (not committed).

## 7. Fix pass (16 November)

What this section is: every bug of §4 checked against the Engine's own state on a fresh run of the code after the
third pass, fixed at the root where it was real, and the three scripts played again on the fixed code. The judges of
§3 were haiku and read only the table record; here each bug is classified first (real, harness artefact, judge wrong,
not reproduced), and "guard + test" (proof on an invented fixture) is kept apart from "seen or not seen in one run"
(Haiku is not deterministic: one run is one sample).

**Runs.** Same scripts, campaign and profile as §1 (profile B, `TAGM_VOCE=fish`: the voice was the real drama-3 through
OpenRouter, about $0.05 a run, not the fake one), from git worktrees pinned at the commit under test, every folder kept
in git this time: `esperimenti/risultati/e2e-finale-3b/prima-<run>/` on `958556a` (before, ports 4930–4933) and
`esperimenti/risultati/e2e-finale-3b/dopo-<run>/` on `7109235` (the per-bug guards, ports 4940–4943: both combat runs
hit a crash of the out-of-play guard in every fight, fixed in `70be54c`, so they are kept as evidence of the crash; the
off-the-rails and stall runs are valid) and `esperimenti/risultati/e2e-finale-3b/coerenza-<run>/` on `2a7697c` (the
coherence layer of docs/coerenza.md, which replaced the per-bug approach at Riccardo's request; ports 4944–4947), then
`esperimenti/risultati/e2e-finale-3b/coerenza2-<run>/` on `f29235d` (round 2, after the fixes from round 1's reading,
same ports) and two canaries `canary-<run>/` on `97121cb` (ports 4948–4949). The «After» column is round 1, judged
by a blind haiku reader of the per-turn views and spot-checked by hand; round 2 is the table after it. Each folder has the harness
output, the measures (`misure.txt`, `misure.json`), the table record with cards and the two server logs
(`log-server/`, the Game Master token redacted). The classification used a per-turn view of the table record next to
the Engine's log of that turn (cards with numbers, facts given to the narrator, who is out of play, the order, the
guards' events) and a haiku reader on top, whose quotes were checked by hand against the files.

**Fixes** (each with its unit or server test on invented fixtures; server suite and typechecks green at every commit):
`d0a47e2` cards without the number to beat; `9bb04b7` fallen characters stay fallen; `c93e8e7` earlier whispers stay
private, and a detector of what the table heard; `ed8574e` PCs in the fall check, players' claims are not facts;
`b374892` the turn order said at the table; `9b7a626` told facts across rows; `a466864` a relative clause in the fall
check; `0df4261` no word-for-word repeats, a refusal said once; `2e5bcdf` stalls counted by what the answers did;
`5cb9fb4` no NPC reaction out of turn; `8eb86fe` four over-fire paths narrowed before the rerun; `4c40985` and
`f797131` two more, found in the first minutes of the rerun (a subordinate clause with its own subject «che il compagno
è a terra» became «Nespola è ancora in piedi.») and by replaying the baseline's narrator sentences through the new
guards with the Engine's state of each turn (a carried subject across a sentence with a new subject); `7109235`
the privacy guard, from the next restart's first turns (an earlier whisper's retelling sent to the phone of the PC who
whispered in this turn; «Nespola non riesce a restare zitta…», the public outcome of her own action, sent to her phone
for two words of an earlier private outcome): without a richiamo an earlier item now needs the name of its NPC, and a
private-only turn's rule skips lines that name another PC. The rerun was restarted on the final commit each time; `5fc58cb` a web test of the card text.

| # | Judged (§4) | On HEAD before the fixes (prima, checked against the Engine) | Class | Fix and proof | After (dopo, one run) |
|---|---|---|---|---|---|
| 1 | private content at the table; the detector says 0 | **Real.** Stall T9, same turn: «Livia Sarti, la domanda la fai a voce bassa, vicino al cancello.»; T10, next turn: «Livia, la chiave del sentiero è ancora nelle mani di Berta. Ugo lo ha detto a voce bassa, e lo sai solo tu.»; combat-manual T25, a turn with only a whisper: «Parla piano, in fretta, e la voce gli trema. Dice che il ragazzo è stato portato via». The guard knew only the turn's own private actions and skipped any PC with a public action; the narrator's history has no private actions, but the message's «Esiti privati già dati» has the outcomes, and that is the feed path. The detector was blind by construction: `fughe` counts campaign secret words, misure.py's `sospette` read the raw narration of the same turn and skipped PCs with a public action. | real | `c93e8e7`, `8eb86fe`: earlier private actions and outcomes (10 turns) with what the PC said aloud since; a `richiamo` («la tua domanda», «a voce bassa») lowers the threshold to one root; a private-only turn moves the lines that name the NPC whispered to. Detector `private_al_tavolo.py` (table record, eight turns, its own looser rule): finds both judged leaks on the third pass's surviving records. Tests: privato-guardia.test.ts, strumenti/test_private_al_tavolo.py. | Coherence run: R-privato moved 3–6 lines per run; `private_al_tavolo.py` 3–8 candidates per run, all common-word noise: 0 private contents at the table. Still heard: content-free traces of a whisper («Nespola si avvicina a Ugo con passo leggero…», CM T1). Over-fire: FB T15 Berta's reactions to her own public attack and ST T10 Eliandro's public question went to a phone. **Mostly fixed.** |
| 2 | a fallen NPC comes back | **Real.** Combat-manual, Zirrà dead at T20: T22 «Il goblin davanti a lei… abbassa la lancia di un dito.», T23 «Il goblin non parla. Guarda verso la cantina», T25 the dead goblin answers a whisper; T22 the repertoire line «Il ragazzo guarda Zirrà prima di rispondere.» (in the judged run, the filler «Zirrà schiocca le dita.» eight turns after her fall). The catalogue dropped only lines SPOKEN by the fallen; the fact for an action on a body said «l'azione riesce». | real | `9bb04b7`: a line whose text names an NPC out of play leaves the catalogue; the body «non parla e non agisce più»; guard narrazione/guardia-fuori.ts: a sentence whose subject (name, alias, carried zero subject) is out of play since before the turn becomes «Zirrà giace a terra, senza vita.», once per turn. Tests: guardia-fuori.test.ts, fuori-gioco.test.ts. | R-fuori caught 16 sentences in CM and 10 in CA (5 rewritten by the model in time); the repertoire filter held. Still heard: CM T12 «Lo sguardo di Zirrà scivola sulla spada di Livia…» after she fled (a subject «lo sguardo di X» is not seen). **Mostly fixed, one miss.** |
| 3 | a PC at 0 HP acts; death saves late | **Not as judged.** No PC reached 0 HP in either combat run: «Ho zero punti ferita, sono a terra.» is the script's player at 5 of 5, «Vedo Nespola a terra» a player while she stood at 1. The real defect: the narration followed the claims («Nespola è a terra, e la spalla le sanguina.», combat-auto T13, at 1 HP). Off the rails T15–16 had a PC really at 0, told right («Nespola cade a terra.», a death save, «Nespola muore.»). «Death save late» is the table record's format: cards are printed after the turn's lines. | judge read claims as state; real part fixed | `ed8574e`, `8eb86fe`: the fall check covers PCs («Ida è ancora in piedi.»; a place phrase counts for a PC only after a state verb); the narrator and selector prompts say a player's claims about state are not facts. A PC out of play who acts is covered by the guard of bug 2. Tests: guardia-esiti.test.ts. | Again no PC at 0 HP for the Engine; CM T12 «Nespola, a terra dietro la pietra…» became «Nespola è ancora in piedi.», then the model's «Nespola resta dietro la pietra…». **Fixed for what the runs show.** |
| 4 | cards and narration contradict each other | **Real, in part.** The guards already replaced several sentences (combat-manual T6 «Grosso manca Livia.», combat-auto T15). Still heard: combat-manual T8 «La spada lunga cala con forza sul goblin, che grida e cade all'indietro.» (the target was Grosso, standing); T14 «Il ferro batte sulla spalla di Zirrà» on a miss; T15 «Nespola sente il colpo alla spalla» when Zirrà had attacked Livia and missed (the player wrote «Il goblin mi prende alla spalla»); combat-manual T9 the same Engine line twice. | real, partly fixed | `a466864` (a relative clause with another verb before the fall), `ed8574e` (players' claims, PCs), `9bb04b7` (each Engine line once per turn). **Open**: a hit told with no attacker named («Il ferro batte…») or with a receiving phrase outside the list («sente il colpo») is not judged. | CA: every turn with a card matches it. FB T13: card «Berta: A mani nude 15, riuscita» (3 damage), narration «Il pugno le scivola sulla spalla di Fulco… lo assorbe»: the armour phrase excuses a hit that did damage, and the told-facts check passed it. **Open** (one definite, two probable in FB). |
| 5 | attacks with no card | **Real, mostly from players' claims and bodies.** Combat-manual T10 «Livia alza lo scudo e para la lancia del goblin» (the player wrote «Il goblin mi tira la lancia»; no attack in the Engine), T23 a blow on a goblin the Engine says is not there; combat-auto T11, T14, T25. | partly fixed | the prompt line on players' claims (`ed8574e`) and the out-of-play guard (`9bb04b7`). **Open**: no deterministic check for an attack narrated with no card. | The largest remaining gap: the scripts' «goblin con la lancia», a creature the Engine does not have, is attacked and animated after the fight (CM T8–T14, CA T12), sometimes in the model's own rewrite (CM T14). **Open**: a rule for a creature not in the ledger. |
| 6 | no visible initiative; «vado per prima» ignored | **Real at the table, and one Engine fault.** Initiative was rolled (manual: asked to the phones; Basic Fantasy re-rolls it every round: combat-manual T6, T9, T12, T15, T18), shown on the projector's bar and in the narrator's facts, never said in a line. By the rule set the order decides, so «vado per prima» is rightly not obeyed, and the narration followed the order. The Engine itself broke it: at T6 the goblins' side was surprised, yet the resolver's «Poi Grosso reagisce» swung at Livia before the order was rolled. | real | `b374892`: «Ordine del round: Grosso, Eliandro, Livia.» said by the Engine when the order is rolled; `5cb9fb4`: no NPC reaction out of turn in a set with initiative. Tests: combattimento.test.ts, combattimento-integrazione.test.ts, prove-motore.test.ts. | «Ordine del round: Livia, Nespola, Eliandro, Grosso, Zirrà.» at every fight start and re-roll (CM T6; CA T6, T9; FB T1–T16, six rounds); no out-of-turn reaction. **Fixed.** |
| 7 | DC shown on the projector | **Partly a harness artefact.** In manual mode a PC's card never had the number on the screens (`contro_nascosto` since `dc2afa2`, checked by apps/web/e2e/tiri-manuali.spec.ts): tavolo_con_carte.py printed the log's `tiri` strings, which are the Game Master's view. Real: in automatic mode every card, and in both modes an NPC's attack («contro CA 17») and a death save («contro CD 10»), showed it. | artefact + real | `d0a47e2`: no public card has the number, in either mode (campaign opt-in `regole.mostra_cd: true`); the log line has a `tavolo` field with the cards as the screens showed them, and tavolo_con_carte.py prints it. Tests: prove-manuali*.test.ts, prove-integrazione.test.ts, regole-integrazione.test.ts. Web unit tests and typecheck green; not checked in a browser. | The log's `tavolo` field shows what the screens showed: «Fulco Granito: Carisma 4, fallita», «Berta Benni: A mani nude 15, riuscita». **Fixed.** |
| 8 | stall: empty answers, no clue, no choice | **Real.** The stall counter never reached a stall in the stall run: only «Aspetto.» and «Guardo in giro.» matched the whole-action patterns (two E12 turns, each reset by a «decided» one); five turns of fourteen had an empty catalogue, eight answers of fourteen brought nothing new. In mode B the S2 clue and S3 leads are said by the Engine, so with no stall nothing reached the table. | real | `2e5bcdf`, `8eb86fe`: in mode B, two answers in a row with nothing new (no line answering an action, no roll, no scene, no fight) make the next window a stall whatever its words, unless an action names an NPC present; the Engine's own lines do not count, so S1 → S2 → S3 climb. Tests: mondo-stallo.test.ts (a sitting table reaches S2 and S3; questions to the NPCs never do). | ST: stall moves only at T3, T4, T8, T14 (T4 with the Engine's material, the straw and the nail), never S3, and about 11 of 14 answers idle by the blind reading (8 of 14 before): an action that named an NPC present («Tanto Berta ci chiama, no?») reset the escalation to S1 (fixed after, `72cc62e`); S1 in mode B still brings no Engine material. In FB none (every action spoke to someone). Over-fire: after a fight ends, turns with real decisions counted as «nothing new» (CM T10–T15, CA T13–T17; fixed after, `5870930`). **Not fixed in the measured run.** |
| 9 | NPC presence and position | **Not reproduced as judged** (Ugo leaving and then speaking did not recur). Seen instead, off the rails: Ugo answers Fulco's question to «Oreste», and a line voiced by Berta for «Madre Carla», both NPCs the players invented, which the narrator voiced with existing ones. | open | none: a presence model fed by the narration (departures, arrivals) is still to design. | No `[esce]`/`[entra]` proposed in these runs. Ugo answers questions put to the players' invented «Oreste» and «Madre Carla» (FB T9, T10, T16). **Open.** |
| 10 | canned and echoed lines | **Real, small.** Berta's only refusal line «Questo non lo so. Io so di pecore e di figli.» at T1 and T7, put there by the refusal guard each time a check failed; «Il mulo di Ugo sbuffa al cancello.» at T2 and T3. «Fulco Granito dice che il mulino…» is the announcement the manual asks for (N15: nobody reads another's phone). | real + judge wrong (announcements) | `0df4261`, `8eb86fe`: each written refusal once, then the neutral line, and once per turn across the answer and its repair; an improvised sentence heard in the last three turns is dropped (not an Engine line, not one that names a PC). Test: rifiuti.test.ts. | No word-for-word repeat within three turns; still heard: ST «Berta non si volta. Stringe la chiave…» at T5 and T14 (outside the window) and «Ugo, dal cancello, non si volta.» at T11 and T12 (a fragment of longer sentences: the rule compares whole sentences). **Mostly fixed.** |
| 11a | Haiku calls lifting a cart «impossibile» | measured on the twenty DC cases (`confronta-arbitri.ts --casi … --ripeti 3`) | **open** | a reason-first field `perche` before the verdict solved the cart (3 of 3) but took the twenty from 18.0 to 15.7: dropped, not committed in the code (docs/prove-verifica.md §5). | — |
| 11b | duplicate «Zirrà fugge.» | from the live run of 15 November | fixed | `9b7a626`: a row with no subject continues the row before. Test: fatti-dovuti.test.ts. | — |
| 11c | a fight opened from the panel rolls the PCs' first initiative with the Engine's dice | not exercised by the scripts | fixed | with manual rolls the panel's fight starts at the next closed window, after its actions; each PC's initiative is asked there like any of their rolls (docs/prove.md §8). Test: combattimento-master-manuale.test.ts. | — |

**The world clock (§4, item 7) is not a bug.** torre-mozza's midnight clock has 8 marks over a 2-hour evening
(`segno_almeno_ogni: serata`, docs/mondo.md §1). The scripted games lasted 9 to 20 minutes: combat-manual 24 turns in
17 minutes, combat-auto 27 in 20, off the rails 15 in 11, stall 13 in 9. The share of the evening gone is 0.08–0.17,
so the pace owes 0.6–1.3 marks; the runs show 1/8 (combat) and 2/8 (off the rails and stall, where a scene-leaving gate
and the default pace of 38 turns an hour before the observed rate takes over, at 8 turns and 10 minutes, add one). The
pace itself moved as designed: one mark every 6–7 turns at the default rate, then every 13–16 turns once the observed
rate (about 80 turns an hour in a scripted run) took over.

**After, in short.** The coherence layer does not yet meet its success criterion (docs/coerenza.md, «Measured, round 1»): two
definite high-severity sentences reached the table in four games (a fled goblin's «sguardo», CM T12; a hit told as
absorbed, FB T13), plus about fifteen probable ones, almost all about a creature the Engine does not have. Private
content no longer reaches the table, fallen characters are corrected or rewritten in most sentences, the order is
said, the cards hide the DC, and the median first-audio fell from 2.43 s to 1.85 s. The stall run stayed idle (bug 8,
not fixed there). The gaps found by that reading are in docs/coerenza.md, «Measured, round 1».

**Round 2** (`f29235d`: round 1's gaps fixed, `R-inesistente` for a creature nobody in the scene answers to, the
stall's reset and S1 filler; docs/coerenza.md, «Measured, round 2»). Same judge, quotes checked by hand. High-severity
sentences heard, round 1 (definite + probable) → round 2: combat-manual 10 → 6, combat-auto 4 → 9, off the rails 3 → 1
(plus 6 unsure: NPCs the players invented, voiced), stall 0 → 3. **Not ready, and no net gain over round 1**: the
fixes moved the failures more than they removed them. Median first-audio 2.07 s (64 turns) against 2.43 s. No third
round of word-rule tuning: `R-inesistente` and the absorbed-blow rule are in observation (they record, the text is
left alone) until a frozen replay set scores them (docs/coerenza.md, «Verdict after two rounds»).

| # | Round 2 (one run each) |
|---|---|
| 1 | No private content at the table (`private_al_tavolo.py` 4, 5, 2, 1 candidates, noise). Content-free traces stay by design (combat-auto T1 «Nespola … gli parla piano, voltando la schiena al cortile»); off the rails T16 the public answer says «la chiacchierata con Zirrà resta tra voi», naming the NPC whispered to, who is not even in that scene. |
| 2 | Combat-auto T15, Zirrà dead since T11: «Zirrà, ferita al fianco, sbuffa e scuote la testa, ma non si muove verso la scala.» (R-fuori read «non si muove» as a state); off the rails T16 the absent Zirrà «lo sguardo … si ferma su di te». |
| 3 | No PC at 0 HP for the Engine. Combat-auto T14 the claim was corrected («Nespola è ancora in piedi.»); combat-manual T12–T15 the narration followed the player's claim (bleeding, crawling) with no damage in the Engine: not caught. |
| 4 | Combat-manual T8, card «Livia: Spada lunga 6, fallita» on Grosso, told as a miss on Zirrà (outcome right, target wrong); combat-auto T18, a success told on the invented goblin. |
| 5 | Still the largest: the invented «goblin con la lancia» acts, is hit or falls in 6 turns (combat-manual) and 8 (combat-auto) although `R-inesistente` caught 21 sentences: it skipped any sentence with a state word anywhere («…: un colpo secco, e lei sente il sangue»), missed objects of other verbs («spinge il goblin contro il muro»), and the model's repair of an R-fuori sentence brought the goblin back (combat-auto T17, T20). |
| 6 | The order said at every fight start and round (combat-manual T6; combat-auto T6, T9; off the rails six rounds). |
| 7 | The cards carry no DC («Dardo incantato 2 contro soglia 0» in the log is the text of an always-hit attack; the projector shows «automatico»). |
| 8 | **Climbs and brings material**: S1 T5 (a filler: the dog that leads to the path), S2 T6 (the straw bed), S3 T8 (three leads), hard S1 T11 (the fire at the tower, a mark), S2 T12 (the chalk letters), S3 T14. Still 13 «nothing new» counts in 14 turns; the S3 sentence repeated word for word at T8 and T14. |
| 9 | Stall T4 «Ugo … si incammina verso la carbonaia» with no `[esce]`, then he speaks at T8–T10; off the rails the players' «Oreste» and «Madre Carla» are answered by Berta and Ugo. **Open.** |
| 10 | The who-is-there line said in almost every combat turn after the fight; the S3 leads (above). |

**Round 3** (`6912f11`, the yes/no judge on; docs/coerenza.md, «Measured, round 3»): only the combat game with manual
rolls is valid (the API credit ran out in the second game; the other three are kept as evidence of the failure).
High-severity sentences heard there, round 1 → 2 → 3: 10 → 6 → 3 (plus 3 borderline): an attack and a fleeing figure
with no noun, and a carried pronoun after the one late answer. On its raw answers, labelled before reading the
judge's decisions, the rules catch 16 of 31 violations, the live rules + judge 24 of 30, with 3 clean sentences
touched either way. 42 questions at about 1 s, 1 late. First audio 2.09 s for this script (1.15 s at baseline): the
judge's wait on a flagged first sentence shows. Still not ready. Fixed offline after it, with no model call
(docs/coerenza.md, «After round 3»): the first sentence no longer waits, a dropped answer gets the Engine's line,
unnamed attackers and fleeing figures inherit the cards' actor, a late answer's carried pronoun is caught; on the
replay all three heard sentences are caught. Not measured live yet.


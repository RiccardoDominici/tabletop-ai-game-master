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
private-line guard is not reliable.** Profile A was not run (see §1).

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

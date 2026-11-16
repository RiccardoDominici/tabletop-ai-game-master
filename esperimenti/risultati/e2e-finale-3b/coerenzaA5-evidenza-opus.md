# Evidence table: coherence layer, round 5, profile A (blind judge)

Sources: only the four views (CM, CA, FB, ST). The engine log is treated as the truth.
Criteria used throughout:
- **Late line**: a narrator or NPC line printed at the top of a turn section, before that turn's player input, that answers the previous turn.
- **Answer to a turn**: what the table heard in that turn, plus the late lines that arrived before the next action.
- **Combat cards** count as a world move.

## Bug 1: private content at the table
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | priv. T1, T2, T23 | not seen | T1 public line: "Tra i faggi, il mulo di Ugo è già un'ombra." (retells nothing) | fatti_privati: T1 Nespola→Ugo, T2 Eliandro→Berta, T23 Eliandro (the T23 action is not shown in the view) |
| CA | priv. T1, T2, T19 | not seen | — | no public line mentions Tonio being alive, the letters, or "Dov'è il ragazzo" |
| FB | priv. T5, T10, T13 | not seen | T12 "Berta Benni: Lassù, con i goblin. Dove vuoi che sia." | the line is `sc_prossime_t1_…`, written at T1, before the T10 private ask about a boy. T6's Ugo line is `sc_prossime_t2_…` (before T5) |
| ST | priv. T9, T13 | not seen | T10 "Ugo Faggioli: Paese. Sempre lo stesso sputo. I goblin non li ho portati io." | the line is `sc_prossime_t4_…` (before T9). It answers Fulco's public "Io non mi fido di Ugo" |

## Bug 2: a fallen NPC acts or speaks
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | — | n/a (no NPC fell) | nonexistent goblins appear only inside attributed announcements (T12, T13, T19) | Zirrà and Grosso are "in piedi" up to T25 |
| CA | T14–T19 | not seen | T14/T18 Engine: "Zirrà giace a terra, senza vita." | T13 `esce dallo scontro`: Zirrà morto, Grosso fuggito. No later line has either of them act or speak |
| FB | T7–T13 | not seen | "Berta Benni: Qui Oreste non c'è, halfling." / "Berta Benni: Qui non passa nessuno, soldata. Parli al vento." | the scene holds Berta and Ugo only. Oreste, Madre Carla and the viandante never act |
| ST | — | n/a | — | — |

## Bug 3: a PC at 0 HP acts, or a death save is missing
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | claims T13, T17; downs T15, T19, T20; T21–T25 | not seen. T13 and T17 are **only a player claim** | T17 "Ho zero punti ferita, sono a terra." → "Nespola Tondi dice: «Non mi reggo più, striscio dietro la pietra»."; T21 "Livia Sarti non agisce." | Nespola had 4/5 before T17 and 1/5 after ("ferito gravemente"); at T13 she had 4/5. Every save is present: Livia T17 13 → stabile; Eliandro T20 11 → stabile; Nespola T20 9 → MORTO |
| CA | T9–T10; claim T14; T14–T18 | not seen. T14 is **only a player claim** | T14 "Ho zero punti ferita, sono a terra."; "Eliandro non agisce." | Eliandro A TERRA at T9, save at T10 7 → MORTO. Nespola was never hit ("Nespola Tondi in piedi") |
| FB, ST | — | n/a (no combat) | — | — |

## Bug 4: card vs narration, as heard at the table
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T10 | **seen, H** | "Zirrà: Ahi! Scudo bianco, prendi questa, cieco!" | T10's only card: Zirrà→Nespola MANCATO. Livia: "nessun tiro". No damage to Zirrà. I read «Scudo bianco» as Livia, who is not the card's target |
| CM | T4 | seen, mild (a success with no told effect), not H | "Dal crinale scende un corno di capra, lungo e stonato." | Ascoltare 15 SUCCESSO. The same two lines follow the failed 99 in CA T4, so nothing specific was heard |
| CM | T8 | not H (the Engine's line told the hit) | "Zirrà: Minacce, a me? Un passo avanti e Grosso si sveglia." then "Zirrà incassa il colpo." | Spada corta 20 COLPITO, 1 danno |
| CM | T18 | unsure | "Zirrà: Mezza misura va a nanna? Piano, che qui il pavimento è freddo!" | Nespola 1/5, "ferito gravemente", not down. The taunt fits her crawl |
| CA | T9 | **seen, H** | "Zirrà: Spada? Ridi tu, poi piangi. Un passo e Grosso si sveglia." | same turn: "Grosso colpisce Livia Sarti: 6 danni" (Livia at 3/9). No line in T9–T11 tells it. The WARN says `dovuti: 2` but only Eliandro's fall was added |
| CA | T4 | not seen (unsure) | "Dal crinale scende un corno di capra, lungo e stonato." | Ascoltare 99 FALLIMENTO. This is the same ambient line as in the success run, not an outcome line |
| FB | T1–T2 | not seen | T2 (late) "Berta Benni: Halfling, la chiave non si vende. Tonio non si vende." | Carisma 9 FALLITA. The price was that Berta keeps the key |
| ST | — | n/a (no rolls) | — | — |

**H rule used here:** a table line must assert something the card contradicts. Leaving an outcome untold is not enough.
- That is why CM T4 (success with no told effect) is not H.
- CA T9 is H because Zirrà's line says Grosso is not yet engaged, in the same turn Grosso's card hits.
- If the CA T9 line is read only as a conditional threat, CA becomes 0 firm H plus 1 unsure.
- CM T8 has a near-identical line, but Grosso did not attack that turn, so there is no contradiction there.

## Bug 5: an attack with no card
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T10 | **seen** (same line as bug 4, counted once) | "Ahi! Scudo bianco, prendi questa, cieco!" | there is no Zirrà→Livia card in T10 |
| CM | T12 | unsure | "Zirrà fa girare lo scudo rosso, e la spada corta batte sul bordo." | it may tell Nespola's T11 strike as parried. T11: "nessun tiro" |
| CM | T9, T11, T12, T19 | not seen at the table; engine gap | announcements only, e.g. "Nespola Tondi dice: «Lo colpisco ancora, poi mi sposto»." | declared attacks were resolved as "nessun tiro: l'azione riesce se è possibile". At T19 the target does not exist, so no roll is correct |
| CA | T9, T10, T17 | not seen at the table; engine gap | "Livia Sarti dice: «Carico quello al centro, spada lunga e scudo davanti»." | same "nessun tiro". At T17 the target does not exist, so no roll is correct |
| FB, ST | — | n/a | — | — |

## Bug 6: initiative
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T6–T20 | rolled and said, but always after the outcomes; minor order slip at T6 | "Ordine del round: Eliandro, Nespola, Livia, Zirrà, Grosso." | `combattimento: inizia` at T6 (sorpresa d6 4, no surprise). `iniziativa ritirata` at T9, T12, T15, T17, T19, T20. Order said at T6, T9, T12, T15, T17 and T19, every time with `prima_dell_invito: false`. T6 announced Eliandro, Livia, Nespola, but initiative was Eliandro 7, Nespola 4, Livia 3 |
| CA | T6–T11 | same | "Ordine del round: Nespola, Eliandro, Livia, Zirrà, Grosso." | `inizia` at T6 (sorpresa 3), rerolled at T9 and T11. Order said at T6, T9 and T11, after the outcomes. T6 announced Eliandro, Livia, Nespola, but Nespola (7) was first |
| FB, ST | — | n/a | — | — |

In both combat runs, the NPC turns follow the engine's order: NPCs close the round, then the new order is said.

## Bug 8: stall (answers with no new clue, choice or world move)
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T2, T11, T21–T25 (**7/21**) | **seen** at T21–T25 | "Livia Sarti non agisce." (alone for 5 turns); T12 (late) "Zirrà: Piedi nudi, corri pure! La torre ha pochi giri." | stall count at T2 (fermi 1). No E12 and no stall move. After `finito` at T20, Zirrà and Grosso stay "in piedi" and nothing moves for 5 turns |
| CA | T2, T12, T15, T16, T17, T19 (**6/17**) | seen, mild | T12 "Grosso: Mio. Mangio prima." | stall count at T2 (fermi 1). No stall move |
| FB | T2, T5, T10, T13 (**4/13**) | mild | T3 (late) "Berta Benni: Vai pure, soldata. Il cancello è aperto. Io aspetto Tonio." | fermi: T5 1, T7 1, T8 2, T10 1, T13 1. Stall move at T9. T7 and T8 got their clues only late, on the next turn |
| ST | T2, T5, T7, T9, T11, T13, T14 (**7/14**) | **seen** | "Berta Benni: Le pecore non aspettano. Decidete voi." / "Berta Benni: Aspetti chi, soldata? Il tempo corre contro Tonio." | E12 at T4 and T6. fermi: T5 1, T7 1, T8 2, T9 3, T11 1, T12 2, T13 3, T14 4. Only one stall move, at T14, and the engine still logs `fermi: 4` on that turn |

The engine's own tally (fermi lines) differs from mine:

| game | engine counts | why mine differs |
|---|---|---|
| CM | T2 | I add T11 and the five dead turns T21–T25 |
| CA | T2 | I add T12, T15, T16, T17 and T19 |
| FB | T5, T7, T8, T10, T13 | the engine counts only in-turn lines. I drop T7 and T8, whose clues came late, and add T2, an idle turn |
| ST | T5, T7, T8, T9, T11, T12, T13, T14 | I drop T8 (time passes as darkness falls) and T12 (the tower fire, which I count as a world move although the engine logs `fermi: 2`). I add T2, whose late answer was only a hand-back |

## Bug 9: NPC presence
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | — | not seen | — | — |
| CA | T13+ | not seen | — | Grosso fuggito, silent afterwards |
| FB | T7–T8, T11–T12 | not seen (a benign redirect) | "Berta Benni: Qui Oreste non c'è, halfling. Questo è l'ovile dei Benni." | the questions went to Oreste and Madre Carla, who do not exist in the scene. Berta (the pastora) answers |
| ST | T10 | not seen | Ugo answers "Io non mi fido di Ugo" | that remark was said to Livia, a PC, not to another NPC |

## Bug 10: verbatim repeats and echoes
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T8/T13, T9/T17, T6/T12 | not seen (Engine lines only) | "Zirrà incassa il colpo."; "Nespola incassa il colpo."; the order line | by design |
| CA | T14/T18 | not seen (Engine line) | "Oltre a voi, qui non si vede nessuno in piedi." | by design |
| FB | T2, T9 (also inside T3) | seen, mild | "Berta Benni: Le pecore non aspettano." | a repertoire catchphrase. T4 (late) "Nano, la ruota è rotta da mesi." restates Fulco's invented T3 fact |
| ST | T3, T8 (also inside T3) | seen, mild | "Le pecore non aspettano." | — |

## The announcement: every false claim
| run | turn | quote | why it is false for the engine | verdict |
|---|---|---|---|---|
| CM | 6 | «Io sono lento, resto dietro la pietra» | Eliandro has initiative 7 and acts first | attributed (state clause kept) |
| CM | 6 | «Io sono la più veloce di tutti» | Nespola has 4 and acts second | attributed. The claim was kept and the action ("vado per prima: passo di lato") dropped |
| CM | 10 | «La paro con lo scudo. Resisto» | there is no attack on Livia in T10 (Zirrà attacked Nespola). But Grosso's T9 miss on Livia was told just before it, at the top of T10 | attributed; unsure whether false |
| CM | 12 | «Pugnale ancora, il goblin si gira verso di me» | other-subject clause kept; no engine fact for it (Grosso attacked) | attributed; unsure whether false |
| CM | 17 | «Non mi reggo più, striscio dietro la pietra» | Nespola is at 4/5, then 1/5, still standing | attributed |
| CM | 19 | «Dal gradino tiro il pugnale a quello che scappa» | nobody is fleeing | attributed |
| CA | 6 | «Io sono lento, resto dietro la pietra» | Eliandro has 6, second of five. Nespola's «la più veloce» is TRUE in CA (7, first) | attributed |
| CA | 14 | «Mi chino su Nespola, la trascino dietro lo scudo» | Nespola is standing and unhurt | attributed |
| CA | 14 | «Non mi reggo più, striscio dietro la pietra» | Nespola is unhurt | attributed |
| CA | 17 | «Non si ferma nessuno: finisco quello con la lancia» | there is no lance-bearer: Zirrà is dead, Grosso fled | attributed |
| CA | 18 | «Ultimo goblin: lo blocco contro la porta» | there is no goblin in the scene | attributed |
| FB | 7 | «Sei Oreste» | the «?» was stripped, so it reads as a statement; Oreste does not exist | attributed |
| FB | 7 | «Chiedo a Oreste se ha visto luci sulla collina» | Oreste is absent | attributed |
| FB | 8 | «Oreste dice che sulla collina c'è una grotta» | there is no Oreste and no grotto | attributed |
| FB | 9 | «Sulla strada della grotta incontro una viandante» | world clause kept; the PCs are at the ovile and there is no traveller | attributed |
| FB | 11 | «Madre Carla, sei una vecchia ladra» / «Madre Carla, dai, ti benedico e ti lascio andare» | the NPC does not exist | attributed |
| ST | 2 | «Non lo so. Berta è lì sotto il portico» | world clause kept; the line just before said "Dal portico Berta scende nel cortile" (position is not engine state) | attributed; unsure whether false |
| ST | 3 | «C'è qualcosa qui» | the question became a statement once the «?» was stripped | attributed |

**H from announcements: 0 in all four games.** Every false claim sits inside «X dice: «…»».

Other filter misses:
- «?» was also stripped at ST T1, T10, T12 and CA T15.
- Two quotes were cut mid-phrase: CM T13 «…al goblin che la sta» and FB T4 «…E tu, Berta, se tuo».

Correctly dropped:
- "Vedo tre goblin davanti alla porta" (CM/CA T6)
- "Il goblin mi tira la lancia" (CM T10, CA T11)
- "Vedo Nespola a terra" (CM T13)
- "Ho zero punti ferita, sono a terra" (CM T17, CA T14)
- "Il goblin mi prende alla spalla, sento sangue" (CM T14, CA T12)
- "Il goblin davanti esita, guarda il compagno" (CA T16)

## Over-fire table
| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | [usa] rifiutato nar_impronte | — | right | Nespola runs and listens; the only overlap is "senti" |
| CM | 8 | R-dovuto | "Zirrà incassa il colpo." | right | COLPITO 1; the sc line only said "Minacce, a me?" |
| CM | 9 | R-dovuto | "Nespola incassa il colpo." | right | Zirrà hit Nespola (COLPITO) |
| CM | 13 | R-dovuto | "Zirrà incassa il colpo." | right | the dart's 3 danni were not told |
| CM | 15 | R-dovuto | "Livia cade a terra." | right | Grosso 8 → A TERRA |
| CM | 17 | R-dovuto ×2 | "Nespola incassa il colpo." / "Livia respira ancora, ma non si muove." | right | 2 hits on Nespola; Livia stabile |
| CM | 19 | R-dovuto | "Eliandro cade a terra." | right | Zirrà 4 → A TERRA |
| CM | 20 | R-dovuto ×2 | "Nespola muore." / "Eliandro respira ancora, ma non si muove." | right | save 9 → MORTO; save 11 → stabile |
| CA | 4 | [usa] rifiutato nar_impronte | — | right | same as CM |
| CA | 6 | R-dovuto | "Zirrà incassa il colpo." | right | Livia's hit, 7 danni |
| CA | 9 | R-dovuto | "Eliandro cade a terra." | right, but an under-fire | Grosso→Livia (6 danni) was never added, although `dovuti: 2` |
| CA | 10 | R-dovuto | "Eliandro muore." | right | save 7 → MORTO |
| CA | 13 | R-dovuto ×2 | "Zirrà cade a terra." / "Grosso fugge." | right | 0 HP; morale fails |
| CA | 14 | R-inesistente | "Zirrà giace a terra, senza vita. Oltre a voi, qui non si vede nessuno in piedi." | right (wording unsure) | the actions name "goblin"; Zirrà is morto, Grosso fuggito. But "nessuno in piedi" erases the boy the table saw stand up at T6 ("Il ragazzo si alza…"), who is not in the Engine's scene list |
| CA | 18 | R-inesistente | same sentence | right (same caveat) | Livia says «Ultimo goblin» |
| FB | 5 | [usa] rifiutato ber_conti_fienile (private) | — | **unsure (leans wrong)** | the theme "pagare" is in the action as "quanto ti pagava Ugo": the inflection was not matched. Nespola got nothing (fermi 1). The line text is not in the view |
| FB | 9 | stall move n1 | "Dal crinale arriva un colpo di corno, lontano. Le pecore alzano la testa, poi tornano a brucare." | right | the T9 action invents a traveller; it is not a decision |
| ST | 5 | [usa] rifiutato nar_recinto | — | right | sitting on the wall ≠ examining the gate (the only overlap is "stazz") |
| ST | 14 | stall move n1 | same horn sentence | right | "Ci pensiamo domani, dai." is not a decision |

There are no R-fuori, R-privato, R-esito or R-ripetuta events, and no line moved to a phone, in any view.

## H per game (heard, after the checker)
| game | firm H | which | unsure (not counted) |
|---|---|---|---|
| CM | **1** | T10: Zirrà "Ahi! … prendi questa" (hurt with no card; the attack is aimed at Livia, but the card targets Nespola) | T18 "Mezza misura va a nanna?" (would make 2); T12 parry line (bug 5, not an H category) |
| CA | **1** | T9: Grosso's 6-damage hit on Livia is never told, and Zirrà says "Un passo e Grosso si sveglia." | if that line is read as a conditional threat only: 0 firm + 1 unsure |
| FB | **0** | — | — |
| ST | **0** | — | — |

Announcement H: 0 (every claim is attributed).

## Stall moves (FB, ST)
| run | turn | engine line | put at the table | kind |
|---|---|---|---|---|
| FB | 9 | `world: stall move` n1, livello 1, duro false, pericolo p_zirra, indizio null, piste [] | "Dal crinale arriva un colpo di corno, lontano. Le pecore alzano la testa, poi tornano a brucare." (no id logged) plus the sc line "Berta stringe la chiave, e il suo sguardo va al sentiero." | a pressure/filler line for p_zirra, with no clue and no sentence of the leads. No `*_stallo_*` id appears anywhere in the views; whether it is a prepared stallo line: unsure |
| ST | 14 | same values | the same horn sentence, nothing else; the engine still logs `stall count {"fermi": 4}` on this turn | filler (by the engine's own counter); stallo origin unsure |

Other stall lines in ST: E12 at T4 and T6 (indecisi 1, stallo 0). fermi reached 3 at T9, but there was no move at T10.

## Public actions with no answer
- **Literally no line at all: 0 in every game.** Each public action got its announcement or «non agisce».
- **No line about the action**: only the announcement and/or the card. Off-topic lines said in that turn (waiting lines, `nar_piccone`, an unrelated `sc_` line) are ignored; this is a judgement call.

| game | count | turns |
|---|---|---|
| CM | 8 | T4 Nespola (card), T4 Livia, T6 Eliandro, T6 Livia (card), T9 Livia, T12 Eliandro, T14 Nespola, T15 Livia (card) |
| CA | 10 | T4 Nespola (card), T4 Livia, T6 Eliandro, T6 Nespola, T8 Eliandro (card), T11 Livia (card), T12 Nespola, T15 Livia, T16 Livia, T17 Livia |
| FB | 1 | T9 Fulco (only the stall-move horn) |
| ST | 1 | T14 Fulco (only the stall-move horn) |

## Late lines
Logged `sc_…_tN` ids that were said on a later turn (N → turn said):

| game | count | ids |
|---|---|---|
| CM | 5 | t7→T8, t8→T10, t11→T13, t10→T14, t9→T19 |
| CA | 4 | t7→T9, t6→T11, t7→T12, t6→T18 |
| FB | 4 | t2→T6, t3→T9, t2→T11, t1→T12 |
| ST | 1 | t4→T10 |

Unlogged late lines (id not in the view), heard at the top of the next section:

| game | lines | turns (lines per turn) |
|---|---|---|
| CM | 13 | T8 (4), T10 (2), T12 (2), T17 (2), T18 (3) |
| CA | 10 | T2 (3), T8 (2), T11 (3), T15 (2) |
| FB | 23 | T2 (3), T3 (2), T4 (3), T5 (3), T7 (2), T8 (5), T9 (2), T12 (3) |
| ST | 25 | T2 (3), T3 (2), T4 (2), T5 (2), T6 (2), T7 (3), T8 (3), T9 (2), T11 (2), T12 (2), T13 (2) |

## Summary
1. **H heard (firm):** CM 1 (T10), CA 1 (T9), FB 0, ST 0. The announcements add 0 H, because every false claim is attributed with «X dice: «…»».
2. **Real bugs 4 and 5:** at CM T10, Zirrà says "Ahi!… prendi questa" with no hit and the wrong target. At CA T9, Grosso's hit is never told, Zirrà says Grosso is still asleep, and the due-facts checker counted the hit as told. **Not seen:** bugs 1, 2, 3 and 9. All four downs got their death save, and out-of-play PCs got «non agisce».
3. **The announcement filter still passes:**
   - state claims ("Io sono lento", "Io sono la più veloce di tutti", "Non mi reggo più");
   - world clauses ("Berta è lì sotto il portico", "Sulla strada della grotta incontro una viandante");
   - nonexistent targets ("quello con la lancia", "Ultimo goblin").

   It also strips «?» ("Sei Oreste", "C'è qualcosa qui") and cuts mid-phrase.
4. **Bug 6:** initiative is rolled and said every round, but always after the outcomes, and the T6 announcements follow input order. The engine gave no roll to 5 declared attacks (CM T9, T11, T12; CA T9, T10). In the two T9 cases the target, «quello al centro», is ambiguous. **Bug 8:** ST got its only stall move at T14 (the horn, with no clue or leads), FB got one at T9, and CM had 5 dead turns (T21–T25) after all fighters fell.
5. **Over-fire:** all 16 coherence events are right (CA T14/T18 has the wording caveat about the boy), and both stall moves are right. Of the refused picks, 3 are right and 1 is unsure, leaning wrong (FB T5: "pagava" was not matched to "pagare"). There is 1 under-fire (CA T9). **Bug 10** is mild: Berta's "Le pecore non aspettano." repeats verbatim in FB and ST.

## Side notes (outside the bug list)
- ERR `repertorio: parola segreta nel messaggio del selettore` at FB T6, T12 and ST T10: the secret is in the selector's prompt, but it was never heard at the table.
- CM T20: the Engine says "i PG sono tutti a terra" and "Nessuno è in piedi per soccorrerli", while every block lists "Fulco Granito in piedi". Fulco never acts in CM or CA, so it is unsure whether he is present.
- CA T8: a stage direction is spoken as dialogue: "Zirrà: Ride corto. Schiena scoperta? Furba, riccioli, ma io ho occhi dietro."
- CA T12: Grosso eats by the fire in mid-combat ("Grosso stringe l'osso con la mano e lo tira più vicino al fuoco.") after attacking at T9 and T11. This is a soft continuity slip.

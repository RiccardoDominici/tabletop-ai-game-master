# Evidence table: coherence layer, round 4, profile A (torre-mozza; runs CM, CA, FB, ST)

Sources read: the brief and the four views `coerenzaA-vista-cm.md`, `coerenzaA-vista-ca.md`, `coerenzaA-vista-fb.md`, `coerenzaA-vista-st.md`. Nothing else was read.
Turn numbers are the «Turno N» headings of each view. Quotes from the table are in “…”. Engine excerpts are in backticks.

## How H is counted

A line counts as H if it was said aloud at the table and, checked against that turn's engine log, it does one of these:
- (a) retells private content;
- (b) has a dead, downed, fled, absent or nonexistent character act or speak. Per the brief, a goblin other than Zirrà or Grosso counts, unless the line clearly means one of them while that one is in play;
- (c) tells an outcome against the turn's cards, including a hit on someone no card hit.

"Said aloud" includes the narrator, NPC lines, and the Engine's deterministic announcement («Nome: «…»»). Announcements count because the Engine's own guards treat them as narrator sentences: the `testo` of the WARN at CM T13, T14 and T17 and at CA T15 is the announcement, with `"etichetta": "narratore"`.

Not counted:
- lines a guard replaced, because the table heard the replacement;
- Engine lines (round order, R-dovuto facts, «X ci prova»), which are by design;
- unsure items, listed separately with the reason.

## H violations heard at the table (success criterion, target 0)

| game | H heard | of which in prose (narrator/NPC) | of which via the announcement | unsure, not counted |
|---|---|---|---|---|
| CM | **4** | 0 | 4 | 1 |
| CA | **3** | 1 | 2 | 0 (plus 1 bug-3 item, not an H kind) |
| FB | **1** | 0 | 1 | 0 |
| ST | **0** | 0 | 0 | 0 |

### CM: 4
| turn | quote | kind | engine state |
|---|---|---|---|
| T11 | “Livia Sarti: «Il goblin mi tira la lancia».” | (b)+(c): a lance-throwing goblin attacks Livia, with no card | `tiri` T11: `Zirrà: Spada corta 21 contro CA 12, riuscita` (on Eliandro) and `Grosso: Mazza ferrata 14 contro CA 17, fallita` (the only card on Livia). There is no lance in the engine. |
| T12 | “Nespola Tondi: «Il goblin mi prende alla spalla, sento sangue».” | (c): a hit on a PC that no card hit | `tiri` T12: `[]`. Block: `Nespola Tondi in piedi`. She first takes damage in T14. |
| T18 | “Livia Sarti: «Non si ferma nessuno: finisco quello con la lancia».” | (b): a nonexistent lance-bearer is being finished off | `tiri` T18: `[]`. Fatti: `[1] Livia Sarti: nessun tiro: l’azione riesce se è possibile.` Only Grosso is standing; Zirrà is dead. |
| T19 | “Livia Sarti: «Ultimo goblin: lo blocco contro la porta con lo scudo».” | (b): the nonexistent «ultimo goblin» is acted on | The T19 block says `Nessuno in scena è «goblin»: chi i giocatori chiamano così non c'è`. The brief lists «l'ultimo goblin» as nonexistent. The reminder was suppressed (`who is really there was said in the last turns, not again`). Another reading is that Livia meant Grosso, the last foe standing; counted anyway on the Engine's own block. |

Unsure, not counted:
- **T9.** “La spada corta batte sullo scudo rosso, un colpo secco che rimbalza sui muri.” This sounds like a parried blow, and it is heard right after Eliandro's dagger hit (card “Eliandro: Pugnale 18, riuscita”, 3 damage). By position and row count it is the late line `sc_subito_t6_mwj6ka4r_9_1`, written for the T6 miss. The Engine then said “Zirrà incassa il colpo.”

### CA: 3
| turn | quote | kind | engine state |
|---|---|---|---|
| T11 (heard before Eliandro's action, after T10) | “Il goblin si gira di scatto, e la lancia taglia l'aria dove nessuno c'è più.” | (b) in **prose**: a lance goblin swings, with no card | `tiri` T10: `[]`. Zirrà fights with a spada corta and Grosso with a mazza ferrata; there is no lance in the engine. No id for this line is in the log. |
| T12 | “Livia Sarti: «Il goblin mi tira la lancia».” | (b)+(c): a lance goblin attacks Livia | `tiri` T12: only `Eliandro: Tiro salvezza contro la morte 7 contro CD 10, fallita`. Nobody attacks Livia. |
| T13 | “Nespola Tondi: «Il goblin mi prende alla spalla, sento sangue».” | (c): a hit told against the card | `tiri` T13: `Grosso: Mazza ferrata 13 contro CA 15, fallita` (on Nespola). Block: `Nespola Tondi in piedi`. |

Not counted, because it is a state contradiction and not one of the H kinds (see bug 3):
- **T15.** “Nespola Tondi: «Ho nessun punto ferita, sono a terra».”
- **T16, first line.** It builds on that claim: “Una scia scura segna le pietre, fino al riparo del muro.”

### FB: 1
| turn | quote | kind | engine state |
|---|---|---|---|
| T8 | “Livia Sarti: «Oreste dice che sulla collina c'è una grotta».” | (b): a nonexistent NPC speaks | Block T8: `In scena: Berta Benni in piedi; Ugo Faggioli in piedi.` There is no Oreste. Lines heard just before had already said “Oreste? Qui non lo vedo. Lei vede formaggio?” |

Not counted:
- **T9.** “Fulco Granito: «Sulla strada della grotta incontro una viandante con un carretto».” The nonexistent NPC is only met; she does not act or speak.
- **T7 and T11.** The announcements only address Oreste or Madre Carla.

### ST: 0

## Bug 1: private content at the table

| run | turn(s) | verdict | verbatim quote(s) from the table | engine state that decides it |
|---|---|---|---|---|
| CM | T1, T2, T20 (private) | not seen | T1, after Nespola's private question: “Berta resta sotto il portico, con la chiave stretta nel pugno.” T20, the only line: “Ordine del round: Livia, Grosso, Eliandro.” | `fatti_privati` T1 [2] Nespola, T2 [1] Eliandro, T20 [1] Livia. No `spostata al suo telefono` event. No later public line retells them. |
| CA | T1, T2 | not seen | Same T1 lines as CM. Nothing at the table in T2. | `fatti_privati` T1, T2. No phone-move event. |
| FB | T5, T10, T13 | not seen | No table line in T5, T10 or T13. The T12 line “Carla? Non la conosco, soldata. Qui non passa nessuno.” answers Livia's public T11 line («soldata»). | `fatti_privati` T5, T10, T13. No phone-move event. |
| ST | T9, T13 | not seen | T10 “Io, coi goblin? Mi rubano la legna, quelli.” is `sc_prossime_t2_mwj7opw6_4_02`, written at T2 before Livia's private question at T9. It answers Fulco's public line. | `fatti_privati` T9, T13. No phone-move event. |

Not a table leak:
- **FB T12 and ST T10.** There is an ERR `repertorio: parola segreta nel messaggio del selettore`: secret words were sent to the reader model. Nothing secret was heard.

## Bug 2: a fallen NPC acting or speaking

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T13 to end (Zirrà dead) | not seen; one instance fixed by a guard at T17 | T14: “Grosso resta immobile con la mazza a mezz'aria, e guarda il corpo piccolo e grigioverde.” (only the body). At T17 the guard replaced the announcement “Livia Sarti: «Il goblin davanti esita, guarda il compagno».” (not heard) with “Zirrà giace a terra, senza vita.” | `combattimento: esce dallo scontro` png_zirra `morto` (T13). Every later block: `Zirrà non è più in vita: non parla né agisce`. |
| CM | T15 to end (Nespola dead) | not seen | T18, Grosso: “Lei è giù. Io fame. Tu cosa vuoi?” (talks about her; she does not act) | `pg_nespola` `morto` (T15). |
| CM | nonexistent goblins | seen: T11, T18, T19 (see H) | “Livia Sarti: «Vedo tre goblin davanti alla porta».” (T6) asserts three goblins, but they only stand there, so not H. T7 «il goblin a destra» was resolved on Zirrà, who was in play. | T6 block: `In scena: Grosso in piedi; Zirrà in piedi.` |
| CA | whole game | not seen (no NPC fell; dead PCs Eliandro T12 and Livia T17 never act) | T13, Zirrà, about the dead Eliandro: “Orecchie a punta ha finito di tirare. Chi è il prossimo?” | Zirrà and Grosso are `in piedi` to the end. |
| CA | nonexistent goblins | seen: T11 (prose) and T12 (see H) | At T9 the announcement cut «al goblin con la lancia» and the table heard only “Eliandro: «Tiro il pugnale da dietro la pietra».” | |
| FB, ST | none | n/a (no fight). FB's nonexistent NPCs are under bug 9. | | |

## Bug 3: a PC at 0 HP acting, or a missing death save

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T11 to T28, Eliandro | not seen (handled) | Each of T23 to T28: “Eliandro: «Non agisce, è a terra, privo di sensi».” | T11: `Eliandro è A TERRA (0 punti ferita)`, save 16 → stable. Block: `Eliandro a terra senza sensi: non parla né agisce`. |
| CM | T14, Nespola | only a player claim when written; it became true later in the same turn | “Nespola Tondi: «Ho nessun punto ferita, sono a terra».” | T13 block: `Nespola Tondi in piedi`. In T14 `fatti` her action (`[1] Nespola Tondi: nessun tiro: l’azione riesce se è possibile.`) comes before `Grosso colpisce Nespola Tondi: 8 danni, e Nespola Tondi va a terra`, so her crawl was resolved while she was standing. |
| CM | death saves | none missing | “Eliandro: Tiro salvezza contro la morte 16, riuscita” (T11); “Nespola Tondi: Tiro salvezza contro la morte 1, fallita” (T15); “Livia Sarti: Tiro salvezza contro la morte 11, riuscita” (T22) | Eliandro's (T11) and Nespola's (T15) saves come at that PC's next place in the order. Livia's (T22) is rolled at once: `every PC down, the death saves rolled to the end`. |
| CA | Eliandro T11–T12, Livia T16–T17, Nespola T18 | not seen; saves present | “Eliandro: Tiro salvezza contro la morte 7, fallita” (T12); “Livia Sarti: Tiro salvezza contro la morte 5, fallita” (T17); “Nespola Tondi: Tiro salvezza contro la morte 12, riuscita” (T18) | No PC acts while at 0 HP. Eliandro's (T12) and Livia's (T17) saves come at their next place in the order. Nespola's (T18) is rolled at once: `every PC down, the death saves rolled to the end`. |
| CA | T15, Nespola | **only a player claim; she was NOT at 0 HP for the engine.** But the announcement said it aloud, and the next turn built on it. | “Nespola Tondi: «Ho nessun punto ferita, sono a terra».” (T15); “Una scia scura segna le pietre, fino al riparo del muro.” (T16, late prose); “Livia Sarti: «Mi chino su Nespola, la trascino dietro lo scudo».” (T16, announcement) | T15 block: `Nespola Tondi in piedi`. No card touched her until T17: `Nespola Tondi ha 1 punti ferita su 5`. The R-numeri guard only swapped «zero» for «nessun». |
| FB, ST | none | n/a | | |

## Bug 4: dice card vs narration that the table heard

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T12 | **seen (H)** | “Nespola Tondi: «Il goblin mi prende alla spalla, sento sangue».” | No cards in T12; Nespola `in piedi`. |
| CM | T9 | unsure | “La spada corta batte sullo scudo rosso, un colpo secco che rimbalza sui muri.” then “Zirrà incassa il colpo.” | Card “Eliandro: Pugnale 18, riuscita”. The first line is the late T6 line (a miss). |
| CM | T11 | no contradiction, but Zirrà's hit is never told; Zirrà is said to parry instead | “Zirrà para con lo scudo rosso e ride corto.” and “Eliandro respira ancora, ma non si muove.” | Card “Zirrà: Spada corta 21, riuscita” on Eliandro (6 damage, `A TERRA`). |
| CM | T6, T7, T10, T16, T19–T21 | not seen. Misses stay on the cards and are never told as hits. | The late line before T9 matches Nespola's T7 miss: “Il fendente taglia l'aria, a un palmo dalla pelle grigioverde, e Zirrà si volta di scatto.” | T7: `Spada corta 6 contro CA 14, fallita`. |
| CA | T13 | **seen (H)** | “Nespola Tondi: «Il goblin mi prende alla spalla, sento sangue».” | Card “Grosso: Mazza ferrata 13, fallita” (on Nespola). |
| CA | other turns | not seen | T8 “Scudo bianco ha fretta! Ma io corro più svelta.” (Nespola's miss, 4 vs 14). Before T15: “La schiena della goblin batte contro le pietre, e un po' di calcina cade.” (Livia's T14 hit). | |
| FB | T1 | not seen; the success had its effect, told late | Before T2: “Berta si fa calma, e chiude il pugno sulla chiave.” | `Carisma 17 contro CD 17, riuscita`; Berta `indifferente` → `amichevole`. |
| ST | none | n/a (no cards) | | |

## Bug 5: an attack told with no card and no engine fact

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T11 | seen | “Livia Sarti: «Il goblin mi tira la lancia».” and “Zirrà para con lo scudo rosso e ride corto.” | No attack on Zirrà was rolled in T11. The only card on Livia is Grosso's miss. |
| CM | T12, T18, T19 | seen (H, see above) | “finisco quello con la lancia” and “Ultimo goblin: lo blocco contro la porta con lo scudo” | T12 and T18: `"tiri": []`. T19: only `Grosso: Mazza ferrata 5 contro CA 17, fallita`; Livia's action got `nessun tiro`. |
| CM | T8, T10 | seen, mild: only the announcement of an attack the Engine did not roll | “Livia Sarti: «Carico quello al centro, spada lunga e scudo davanti».”; “Nespola Tondi: «Lo colpisco ancora, poi mi sposto e lo lascio dietro».” | `nessun tiro: l’azione riesce se è possibile.` |
| CM | T18 | unsure (it could be a gesture) | “La mazza ferrata sibila nell'aria e ricade sulle pietre.” | `tiri` T18: `[]`. |
| CA | T11 (before Eliandro's action) | seen (H, prose) | “Il goblin si gira di scatto, e la lancia taglia l'aria dove nessuno c'è più.” | `tiri` T10: `[]`. |
| CA | T12, T13 | seen (H, see above) | “Livia Sarti: «Il goblin mi tira la lancia».” | |
| CA | T7, T10, T11 | seen, mild: announcement only, no roll | “Livia Sarti: «Carico quello al centro, spada lunga e scudo davanti».”; “Nespola Tondi: «Lo colpisco ancora, poi mi sposto e lo lascio dietro».”; “Eliandro: «Pugnale ancora, il goblin si gira verso di me».” | `nessun tiro` each time. At T11 Zirrà really did hit Eliandro (card 19), so «il goblin si gira verso di me» fits Zirrà. |
| FB, ST | none | n/a | | |

## Bug 6: initiative

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T6 start; rerolls T9, T11, T13, T15, T16, T17, T18, T19, T20, T21 | rolled, and said every round, matching the engine | “Ordine del round: Nespola, Livia, Eliandro, Zirrà, Grosso.” (T6) | `combattimento: inizia`: Nespola 6, Livia 5, Eliandro 4, Zirrà 3, Grosso 2. `sorpresa`: the enemies are surprised. `iniziativa ritirata` for rounds 2–11. Every `turn order said at the table` has `"prima_dell_invito": false`, so the order is always said after the actions. |
| CM | round 1 (T6–T9) | unsure (out of order) | The T6 announcements follow posting order; the first is “Eliandro: «Io sono lento, resto dietro la pietra e tiro».” The surprised Zirrà is still told acting: “Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.” (T7) | Livia's attack was resolved in T6 and Nespola's in T7, although Nespola is first. Every PC acted in two turns of round 1. T9 `fatti`: `Turno di Zirrà: è sorpreso, non agisce.` |
| CM | T15 | Engine line, by design | “Nespola muore.” then “Ordine del round: Nespola, Eliandro, Livia, Grosso.” | Round 5 was rolled before her failed save. |
| CA | T6 start; rerolls T9, T12, T14, T16, T17, T18 | rolled; said at T6, T9, T12, T14, T16 and T17, matching (T18 not said: the fight ended) | “Ordine del round: Zirrà, Livia, Nespola, Eliandro, Grosso.” | Surprise d6 = 6, not surprised. |
| CA | T6 | unsure | (the order said above) | Livia's attack (`fatti` [2]) is resolved before `Turno di Zirrà`, although Zirrà rolled 6 and Livia 5 (her action opened the fight). Livia acts again in T7, still in round 1. |
| CA | T14, T16 | unsure | | Rounds 4 and 5 have identical values (Nespola 8, Zirrà 6, Livia 3, Grosso 3). The reroll may not have happened. |
| CA | T12 | Engine line, by design | “Eliandro muore.” then “Ordine del round: Eliandro, Nespola, Grosso, Livia, Zirrà.” | |
| FB, ST | none | n/a (no fight) | | |

## Bug 8: stall

| run | turn(s) | verdict | verbatim quote(s) | engine state (stall lines) and count |
|---|---|---|---|---|
| CM | T2, T8, T10, T16, T20, T21, T23–T28 | combat run; idle answers present | T16, the whole answer to a parley: “Livia Sarti: «Goblin».” | `stall count` at T2 only (`fermi` 1). No E12 and no stall move. My count: **12 of 28** answers with nothing new; six of them (T23–T28) come after every PC is down and are Engine refusals. |
| CA | T2, T7, T10 | combat run; few | T7, the answer to a charge: “Allora? Io aspetto, la luna no.” | `stall count` at T2 (`fermi` 1). No E12 and no stall move. **3 of 18** (T9 is borderline). |
| FB | T2, T3, T5, T7, T8, T10, T11, T13 | seen | T3 “Allora? Le pecore non aspettano, e quelli lassù nemmeno.”; T7 “Paese. Sempre domande, mai carbone.” | `stall count`: T5 (1), T8 (1), T10 (1), T11 (2), T13 (1). No E12 and no stall move. **8 of 13** in-turn answers. T5, T10 and T13 are private turns. |
| ST | T2, T3, T5, T7, T8, T9, T11, T13, T14 | seen | T3 “Allora? Le pecore non aspettano, e quelli lassù nemmeno.”; before T13 “Seduti non si arriva alla torre. Decidete, e decidete bene.” | E12 at T4 and T6 (`indecisi` 1, `stallo` 0). `stall count`: T5 (1), T7 (1), T8 (2), T9 (3), T11 (1), T12 (2), T13 (3), T14 (4). Stall move at T14 (S1), with `S1 without a filler line the Engine can say`. **9 of 14** in-turn answers. |

In all four runs most answers to an action arrive as a late block heard before the next turn, not in the turn itself (see "Late lines").

### ST: turns with a stall move
| turn | move | what the Engine put at the table |
|---|---|---|
| T14 | S1: `{"n": 1, "livello": 1, "duro": false, "pericolo": "p_zirra", "indizio": null, "piste": []}` | **Nothing** beyond the announcement “Fulco Granito: «Ci pensiamo domani».” The log says `world: S1 without a filler line the Engine can say`. There was no S2 or S3. |

## Bug 9: NPC presence

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | none | not seen | T18, Grosso answers Livia's T16 parley to «goblin»: “Lei è giù. Io fame. Tu cosa vuoi?” Grosso is the only foe standing. | |
| CA | none | not seen | | |
| FB | T7–T8, T11–T12 | seen but benign: an NPC who is present says the NPC asked for is not there | Ugo: “Oreste? Qui non lo vedo. Lei vede formaggio?”; “Nel cortile nessuno risponde a quel nome.”; Berta: “Carla? Non la conosco, soldata. Qui non passa nessuno.” | Oreste and Madre Carla are in no block. |
| FB | T8 | seen via the announcement (H) | “Livia Sarti: «Oreste dice che sulla collina c'è una grotta».” | |
| FB | T9 → T13 | not seen. Ugo says he is going, then never speaks or acts again. | Ugo: “Io torno alla carbonaia. Ora. Seguire, fate voi.” His mule is still in the yard: “Il mulo scuote la testa sotto i sacchi.” (before T12) | The block keeps `Ugo Faggioli in piedi` through T13. |
| ST | none | not seen | T10: Ugo reacts to a remark Fulco addressed to Livia about Ugo: “Io, coi goblin? Mi rubano la legna, quelli.” This is not another NPC's question. | |

## Bug 10: repetition and echo

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | none | not seen for lines that are not the Engine's | Engine lines repeated, by design: “Eliandro: «Non agisce, è a terra, privo di sensi».” (T23–T28, six times) and “Zirrà giace a terra, senza vita.” (T13, twice in T17, T23). Stub announcement at T16: “Livia Sarti: «Goblin».” | |
| CA | T7, T12 | near repeat, not verbatim | “Dalla scala rotta Zirrà batte la spada corta sullo scudo, e guarda i compagni.” / “Zirrà batte la spada corta sullo scudo, due volte.” | |
| FB | T3, T9 | **seen** | “Tonio è lassù. Tu decidi. Le pecore non aspettano.” (T3) / “Se vai, vai svelta. Le pecore non aspettano.” (T9). Also at T3: “Allora? Le pecore non aspettano, e quelli lassù nemmeno.” | The sentence «Le pecore non aspettano.» is said three times. |
| FB | T7 | near repeat inside one turn section | “Ugo batte la pala per terra due volte e si china sui sacchi.” / “Ugo batte la pala per terra due volte.” | |
| FB | T4, T7 | broken announcements | “Livia Sarti: «Anch'io vado al mulino. E tu, Berta, se tuo figlio».” (cut mid-sentence); “Nespola Tondi: «Pastore».” | |
| ST | T2–T3, T6 | near repeat | “Le pecore non aspettano.” (T2) / “Allora? Le pecore non aspettano, e quelli lassù nemmeno.” (T3). Two horns in T6: “Dal crinale scende un colpo di corno, lungo e basso” / “Dal crinale scende un corno di capra, lungo e stonato.” | |

Player words restated: every announcement is by design. The announcements that voice false claims are counted under H, not here.

## Over-fire check (every `coerenza: violazione`, every refused pick, the stall move)

`coerenza: violazione` events: CM 10, CA 9, FB 0, ST 0. Refused picks: 4 (CM T4, CA T4, FB T5, ST T5). Stall move: ST T14.

| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | T4 | refused pick `nar_impronte` (pg_nespola) | “Nespola Tondi: «Corro avanti sul sentiero».” | right | The action is listening; the line is about footprints. The only shared stem, «senti», comes from «sentiero». Ascoltare also failed (81 vs 30). |
| CM | T9 | R-dovuto, aggiunta | “Zirrà incassa il colpo.” | right | Eliandro's hit (3 damage) was otherwise heard only as a blow on a shield. |
| CM | T11 | R-dovuto, aggiunta | “Eliandro respira ancora, ma non si muove.” | right | His stable state was not told. |
| CM | T13 | R-inesistente, sostituita | “Livia Sarti: «Spingo il goblin contro il muro con lo scudo».” → “Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.” | **wrong** | «goblin» was Zirrà, alive when struck: the Engine itself resolved the blow on Zirrà (`COLPITO, 10 danni`), and that blow killed her. The identical line passed untouched at CA T14, where Zirrà lived. The table heard the death before the blow; “Livia colpisce Zirrà.” came after. |
| CM | T14 | R-numeri, riscritta | “Nespola Tondi: «Ho nessun punto ferita, sono a terra».” | right by the rule, but useless | It only swapped «zero» for «nessun» and kept the same claim. |
| CM | T15 | R-dovuto, aggiunta | “Nespola muore.” | right | Failed save, untold. |
| CM | T17 | R-fuori, sostituita | “Livia Sarti: «Il goblin davanti esita, guarda il compagno».” → “Zirrà giace a terra, senza vita.” | right | The only goblin is dead. |
| CM | T17 | R-dovuto, aggiunta | “Livia incassa il colpo.” | right | Grosso hit, 17 vs 17, 6 damage. |
| CM | T17 | R-inesistente, aggiunta | “Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.” | right, but redundant | Its first sentence had been said three lines earlier by the R-fuori replacement. |
| CM | T22 | R-dovuto, aggiunta | “Livia respira ancora, ma non si muove.” | right | Stable, untold. |
| CM | T23 | R-inesistente, aggiunta | “Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.” | right | The player named «il goblin». |
| CA | T4 | refused pick `nar_impronte` (pg_nespola) | “Nespola Tondi: «Corro avanti sul sentiero».” | right | Same as CM T4 (40 vs 30, failed). |
| CA | T6 | R-dovuto, aggiunta | “Livia incassa il colpo.” | right | Zirrà hit, 17 vs 17, 6 damage. |
| CA | T11 | R-dovuto, aggiunta | “Eliandro cade a terra.” | right | |
| CA | T12 | R-dovuto, aggiunta | “Eliandro muore.” | right | |
| CA | T14 | R-dovuto, aggiunta | “Zirrà incassa il colpo.” | right | |
| CA | T15 | R-numeri, riscritta | “Nespola Tondi: «Ho nessun punto ferita, sono a terra».” | right by the rule, but it misses the real fault | Nespola was `in piedi`; the false state got through. |
| CA | T16 | R-dovuto, aggiunta | “Livia cade a terra.” | right | Grosso's critical hit. |
| CA | T17 | R-dovuto, aggiunta | “Nespola incassa il colpo.” | right | |
| CA | T17 | R-dovuto, aggiunta | “Livia muore.” | right | |
| CA | T18 | R-dovuto, aggiunta | “Nespola respira ancora, ma non si muove.” | right | |
| FB | T5 | refused pick `ber_conti_fienile` (pg_nespola, private) | no table line (private action) | unsure, leaning wrong | The refusal says none of the themes (debiti, debito, soldi, decima, balivo, pagare) is in the action, but the action has «pagava» («quanto ti pagava Ugo per il carbone?»). The line's own text is not in the view. |
| ST | T5 | refused pick `nar_recinto` (pg_fulco) | “Fulco Granito: «Mi siedo sul muretto dello stazzo».” | right | Sitting on the wall is not examining the gate; the only shared stem is «stazz». |
| ST | T14 | stall move S1 (`livello` 1, `p_zirra`) | “Fulco Granito: «Ci pensiamo domani».” | right to fire, but it had no effect | Not a decision. Nothing reached the table (`S1 without a filler line the Engine can say`). |
| all | CM T2, CA T2, FB T5/T10/T13, ST T9/T13 | `stall count` on private turns | no table line | unsure | A private question is a real decision whose answer belongs on the phone. In ST these counts (`fermi` 3 at T9 and T13) fed the T14 stall move. |

Guards that did not fire (under-fire, for context):
- **The «goblin» check.** It works only on the word «goblin», and only once Zirrà is dead. As a result:
  - while Zirrà lived, «il goblin» with a lance passed (CM T11, CA T11 prose, CA T12);
  - a hit with no card passed (CM T12, CA T13);
  - «quello con la lancia» at CM T18 has no «goblin» in it;
  - at CM T19 the reminder was suppressed.
- **No state check on the announcement.** Nothing checks state before a player claim is voiced (CA T15, FB T8).
- **Attack-like actions with no named target** get `nessun tiro: l’azione riesce se è possibile` and no roll (CM T8, T10, T18, T19; CA T7, T10, T11).

## Public actions with no answer

Strictly, **0 in every game**: every public action got at least the Engine's announcement.

The list below counts "announcement only": public actions where nothing was said in that turn after the announcement except the round order.

| game | count | actions (late answer heard before a later turn, if any) |
|---|---|---|
| CM | 4 | T8 Livia: no clear late answer. T10 Nespola: before T11, “Grosso si volta piano, cercando chi gli è passato dietro.” T14 Nespola: before T15, “Sulle pietre gelate resta una scia scura, che finisce dietro il masso caduto.” T16 Livia: before T18, “Lei è giù. Io fame. Tu cosa vuoi?” |
| CA | 2 | T10 Nespola: its late answer before T11 is the H line “Il goblin si gira di scatto…”. T15 Nespola: before T16, “Una scia scura segna le pietre, fino al riparo del muro.” |
| FB | 3 | T8 Livia: before T9, “Grotte non ne conosco, soldata. Conosco il sentiero del bosco.” T11 Livia and T11 Fulco: before T12, “Nel cortile non ci sono carri né viandanti.” |
| ST | 6 | T5 Fulco: before T6, “Lì gela. Lei ha tempo da perdere?” T7 Livia: before T8, “Soldata, vi ho chiamati ieri. Oggi tocca a voi.” T8 Fulco: before T9, “Nano, pensa in fretta. Tonio non ha tutta la notte.” T10 Eliandro and T11 Livia: ambient lines only. T14 Fulco: nothing (end of game). |

## Late lines

**Logged.** A `repertorio: battuta uscita` with an `sc_…` id whose turn number is lower than the turn it was said in.
- **CM, 6 lines.**
  - `subito`, 2: `sc_subito_t6_mwj6ka4r_9_1` said at T9; `sc_subito_t8_mwj6ljvf_14_1` said at T15. The T15 line is stale: “L'hobgoblin si rizza di scatto accanto al fuoco, la mazza ferrata già in pugno.” Grosso had been fighting since T10.
  - `prossime`, 4: `sc_prossime_t9_mwj6mrru_16_01` at T11, `sc_prossime_t8_mwj6ljvh_15_03` at T12, `sc_prossime_t14_mwj6qg77_24_01` at T18, `sc_prossime_t9_mwj6mrru_16_03` at T19.
- **CA, 5 lines.**
  - `subito`, 3: `sc_subito_t6_mwj752i0_9_1` at T8, `sc_subito_t11_mwj78d3l_18_1` at T13, `sc_subito_t7_mwj75tqx_12_1` at T16. The T16 line is stale: “L'osso cade tra le braci, e dal fuoco si alza la mazza ferrata.” Grosso had been attacking since T9.
  - `prossime`, 2: `sc_prossime_t7_mwj75tqy_13_06` at T9, `sc_prossime_t6_mwj752i4_11_04` at T12.
- **FB, 4 lines,** all `prossime`: `sc_prossime_t2_mwj7f5fd_4_04` at T4, `_4_03` at T6, `_4_02` at T9, `sc_prossime_t5_mwj7h0rt_9_04` at T12.
- **ST, 1 line,** `prossime`: `sc_prossime_t2_mwj7opw6_4_02` at T10.
- **Total logged: 16.** Of these, 5 are `subito`, meaning late answers to a specific turn's action. Which line belongs to which id is matched by position and row count.

**Inferred, not counted above.** These are blocks heard before the first player line of a turn. They have no id in these logs, and their content answers the previous turn.
- **CM, 6 blocks:** before T8, T9, T11, T14, T15 and T18.
- **CA, 4 blocks:** before T7, T11, T15 and T16.
- **FB, 7 blocks:** before T2, T3, T4, T7, T8, T9 and T12.
- **ST, 9 blocks:** before T2, T3, T4, T6, T8, T9, T11, T12 and T13.

## Summary (5 lines)

1. Real, bugs 5/2 and 4: nonexistent goblins and hits with no card reach the table, almost all through the Engine's announcement of player claims; H heard CM 4, CA 3, FB 1, ST 0, only one from prose (CA, before T11, «la lancia taglia l'aria»).
2. Real, guard errors: R-inesistente over-fired at CM T13 (Zirrà was killed by that blow; her death was heard before the blow); R-numeri only swaps a word and let CA T15's false «sono a terra» through; FB T5 refusal probably wrong («pagava»); all 13 R-dovuto and 1 R-fuori fired rightly.
3. Not seen: bug 1 (no leak, no phone moves); bug 2 for named fallen NPCs (one fixed by a guard, CM T17); bug 3 (no PC acted at 0 HP, every death save rolled, CA T15 only a claim); bug 6 (order rolled and said every round, matching; round-1 sequencing unsure).
4. Real, bug 8 in FB and ST: most in-turn answers are idle (FB 8 of 13, ST 9 of 14); the only stall move (ST T14, S1) put nothing at the table; most answers arrive late (16 logged `sc_` lines said in a later turn, plus 26 inferred late blocks).
5. Minor, bugs 10 and 9: «Le pecore non aspettano.» repeated (FB T3, T9), near-repeats in CA and ST, broken announcements (FB T4, FB T7, CM T16 «Goblin»); bug 9 only benign deflections for nonexistent NPCs (FB).

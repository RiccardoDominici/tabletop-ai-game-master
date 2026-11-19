# Evidence table: finale7, profile A, torre-mozza (blind judge, Opus)

Runs: CM = combat, manual rolls · CA = combat, automatic rolls · FB = off the rails · ST = stall · PR = pressure.

Method notes (one line each):
- A line heard BEFORE a turn's player action has no id in the view. I treat it as a late `sc_…` line and infer its own turn from its content (target, weapon, addressee). The certain H count does not depend on these inferences. The unsure items do.
- I may not read the campaign files, so the PR secret list (section 6) is inferred from the view: clue ids, refused releases, consequence texts.
- No view contains a `narrator: sentence contradicts the Engine, replaced by its line` WARN or a `narratore: … spostata al suo telefono` event, so no guard replaced a sentence and no line was moved to a phone.
- Every «Carte dei dadi sul proiettore» line is printed twice in every view, which is either a view or projector duplicate. Not judged.
- PR view: turns 24, 28, 30, 32 and 34 are absent. In PR rounds 8 and 10 no Grosso attack appears. This may be a view artifact. Not judged.
- Clock jumps such as `o_mezzanotte` 6→18 (CM T18) and 7→20 (PR T17) are outside the bug list. Not judged.

---

## 1. H violations heard at the table (after the checker), per run

H means private content at the table, a fallen or absent character acting or speaking, or an outcome against its card.

| run | certain H | unsure items |
|---|---|---|
| CM | **0** | 2 (U1, U2) |
| CA | **0** | 1 (U3) |
| FB | **0** | 1 (U4) |
| ST | **0** | 0 |
| PR | **0** | 0 |
| **total** | **0** | **4** |

### Unsure items

| id | run | turn | verbatim quote (table) | engine state | why unsure, and my lean |
|---|---|---|---|---|---|
| U1 | CM | 23 (late line, written for T22) | «La mazza ferrata batte sul bordo dello scudo, e il colpo rimbomba fin giù in cantina.» | T22: «Grosso colpisce Livia Sarti: 7 danni», COLPITO. T23's own card is a miss (13) | "On the rim of the shield" can be heard as a parried blow, a miss against a hit card. «il colpo rimbomba» and T22's «Livia incassa il colpo.» read as a hit. **Leaning not H.** |
| U2 | CM | 11 (late line, written for T9, round 1, Zirrà `sorpreso`) | «Lei si piega sui gradini rotti e un fiato storto le esce dai denti.» | T9: Livia → Zirrà COLPITO. Zirrà is surprised until the new-round step of T9 | This is a passive reaction to a hit, not an act or speech. The Engine itself says «Zirrà incassa il colpo.» during a surprised round (CA T6). **Leaning not H.** |
| U3 | CA | 11 (late line, before Livia's action) | «Zirrà si getta di lato, e il colpo taglia solo l'aria fredda.» «Zirrà: Troppo lento, mezza misura! Qui si paga per ogni errore.» | Zirrà's surprise ends in T9 (before the new-round step). T10 is round 2: Nespola and Eliandro both miss Zirrà | It is H only if the line was written for T9. **For T10:** both T10 attacks missed, «mezza misura» fits Nespola, and the filter rejects this class of line by its own turn (CA T10 `sc_subito_t8…` «png_zirra acts in the line but loses this round (sorpreso)»; PR T14, T15). **Against:** CM T11 shows a T9 line arriving two turns late. **Leaning not H.** |
| U4 | FB | 9 | «Fulco Granito dice: «Dove vai con quel carico?».» → «Berta Benni: Lassù. Sopra il crinale, nella torre. Non chiedermi altro.» → «Carla? Qui nessuno conosce questo nome.» | The question was put to «Madre Carla» (on screen). Engine: «Nessuno in scena si chiama Carla: nessun PNG risponde a quel nome» | **Bug 9 seen.** Berta answers in Carla's place, before the Engine's «Carla?» line. Whether this belongs to an H class (an absent character speaking through another) is the lead's call. |

### Checked, not H (borderline cases, for the record)
- CM T11, late line «La spada lunga prende Zirrà di taglio, sotto la spalla.»: matches T9, Livia → Zirrà COLPITO. A T6 line (miss) would have been refused by the outcome filter, as at CM T15 and T21.
- CM T17, late line «La mazza scende dall'alto sull'elfo, con un grugnito.»: written for T15, Grosso → Eliandro COLPITO, 1 danno. Grosso's T16 attack was on Livia, not on the elf.
- CA T13, late lines «Grosso cala la mazza ferrata dall'alto, con tutto il suo peso.» and «Grosso: Preso. Ora pane.»: written for T11, Grosso → Livia COLPITO. «La spada corta di Zirrà batte contro la pietra e scintilla.» and «Scappi, piccola ombra?»: written for T12, Zirrà misses Nespola, who had retreated.
- CA T14, late line «Zirrà scivola di fianco, e la pietra gratta solo il vuoto.»: T13, Livia misses Zirrà.
- PR T22 «Grosso: Ragazzo? Seduto. Vivo. Non mangia.»: Nespola asked the same thing privately at T20, but Livia asked it publicly at T21 («Ne tengo uno contro il muro: Dov'è il ragazzo?»). The line answers the public question.
- Defeat endings match the PC states. CM T25 «Prima dell'alba il freddo sveglia chi respira ancora.»: Nespola and Eliandro are dead, Livia is stable. CA T14 «poi trascina giù per i gradini chi respira ancora.» and «Lo lascia legato…»: only Eliandro is alive (stable). PR T37 «Vi sveglia il freddo, prima dell'alba.»: all three PCs are stable.
- Announcements: every one has the form «Nome: «…»» or «Nome dice: «…»», so none is H (section 3).

---

## 2. Tables per bug

### Bug 1: private content at the table
| run | turn(s) | verdict | verbatim quote(s) | engine state that decides it |
|---|---|---|---|---|
| CM | T1 Nespola→Ugo, T2 Eliandro→Berta, T23 Livia→«goblin» | not seen | No later line touches them. T1 «Tra i faggi, il mulo di Ugo è già un'ombra.» is the scene's ending line (`fin_ovile_senza`) | discreet phone answer at T1, T2 and T23 |
| CA | T1 Nespola→Ugo, T2 Eliandro→Berta | not seen | T2 «Berta Benni: Sì, soldata. Sopra il bosco, dietro il fienile.» answers Livia's PUBLIC T1 question | phone at T1 and T2 |
| FB | T5 Nespola→Berta (Ugo's pay), T10 Nespola→«Madre Carla», T13 Livia→«Oreste» | not seen | T9 «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» is the prepared stall line `ber_stallo_paese`, not an answer to T5 | phone at T10 and T13 |
| ST | T9 Livia→Ugo, T13 Eliandro→Berta | not seen | T11 late line «Nel cortile nessuno parla sottovoce, e nessuna parola resta a mezz'aria.» retells nothing. The only mention is the player's own «Non so, ha detto poco» | phone at T9 and T13 |
| PR | T4 Nespola (coins), T5 Livia (balivo), T6 Eliandro (goblins), T8 Eliandro (failed search), T20 Nespola (Tonio) | not seen | At T5, `battuta uscita ber_conti_fienile` is logged but no such line is among the table lines: it was **not heard at the table** (Livia's phone). T9 «Cerca uccelli? Quelli dormono. Cosa cerca, lei?» answers Livia's public look at the branches | phone at T6, T8 and T20; T8 search card «(privata)» |

### Bug 2: a fallen NPC acts or speaks
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T11 → T25 | not seen | Engine line «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» at T12, T16 and T22 | `esce dallo scontro` png_zirra morto, T11 |
| CA | — | not seen | No NPC fell | — |
| PR | T18 → T37 | not seen | No narrator or NPC line has Zirrà act. Players act ON him (T19 «Anch'io lo stringo e chiedo…») | png_zirra morto, T18 |
| FB, ST | — | n/a | no fight | — |

### Bug 3: a PC at 0 HP acts, or a death save is missing
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T14, T21, T25 | not seen; death saves present | «Nespola muore.» «Eliandro muore.» «Livia respira ancora, ma non si muove.» | saves at T14 (4, morto), T21 (8, morto), T25 (14, stabile) |
| CM | T14 | only a player claim | «Il goblin mi prende alla spalla, sento sangue.» (dropped from the announcement) | before her act Nespola is «in piedi»; the crit comes on Grosso's turn after it |
| CA | T11/12, T13, T14 | not seen; saves present | «Eliandro respira ancora, ma non si muove.» «Livia muore.» «Nespola muore.» | saves at T12 (17, stabile), T13 (3, morto), T14 (6, morto) |
| CA | T14 | **only a player claim** | «Ho zero punti ferita, sono a terra. Non mi reggo più…»; the announcement keeps only «Striscio dietro la pietra» | T14 block: «Nespola Tondi in piedi». She falls later in the turn, to Grosso |
| CA | T12 | only a player claim | «sento sangue» (dropped) | no card had hit Nespola |
| PR | T19/20, T36, T37 | not seen; saves present | «Eliandro respira ancora, ma non si muove.» and the same line for Livia and for Nespola | saves at T20 (20), T36 (10), T37 (15), all stabile |

### Bug 4: card against narration, as heard
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T23 | unsure (U1) | «La mazza ferrata batte sul bordo dello scudo…» | T22 Grosso COLPITO Livia |
| CM | all other turns | not seen | «Nespola colpisce Zirrà.» (T7); «Il pugnale si pianta nel muro, a un passo da Grosso.» (T19) | T7 COLPITO; T19 Eliandro MANCATO |
| CA | all | not seen | «Livia manca Zirrà.» (T9); «Eliandro cade a terra.» and «Livia incassa il colpo.» (T11) | cards match |
| FB | T1 | not a contradiction | Carisma fallita; the price («Berta stringe la chiave…») is never told, only «Un cane spalanca con il muso la porta del fienile…» | price of failure in the fatti, not heard |
| PR | T9 | **seen, mild: a success with no effect told** (not against the card, not H) | Climb success answered by «La carbonaia sbuffa, e da una crepa esce una lingua di fuoco.» | «Scalare pareti 73, riuscita» |
| PR | T2, T6 | not a contradiction | T2 failure price («Ugo carica il mulo e se ne va») never told; T6 refusal never told | the engine keeps Ugo in scene, and he speaks at T3 |
| PR | all other turns | not seen | «Nespola manca Zirrà.», «Eliandro colpisce Zirrà.», «Livia colpisce Zirrà.», «Livia incassa il colpo.» | cards match |
| FB, ST | — | n/a | no dice in ST; FB T1 only | — |

### Bug 5: an attack narrated with no card
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| all | — | not seen as narration | late attack lines (CM T17, T23; CA T13) have cards in their own turn | — |
| PR | T11 | attacks DECLARED and never rolled (engine, not H) | «Lancio il dardo incantato sulla sentinella, subito»; «…colpisco alle spalle la sentinella con la spada corta» | «nessun tiro» for both; only Livia's bow is rolled |
| PR | T18 | same | «Scudo contro scudo, tiro la spada su quello in fondo» | «nessun tiro» |
| CM | T15, T20 | same | «Lancio il dardo incantato al goblin che la sta per colpire»; «Finisco quello con la lancia, colpo di spada lunga» | T15: «Zirrà è già a terra … nessun tiro»; T20: «nessun tiro» |
| CA, PR | T11, T17 | flavour, not an attack | «Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.» | no damage claimed |

### Bug 6: initiative
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T6 start; re-rolled at T9, 12, 14, 15, 17, 19, 21, 22, 23, 24, 25 | rolled, and said at the table every round | «Ordine del round: Nespola, Eliandro, Zirrà, Livia, Grosso.» | `combattimento: inizia` + `sorpresa`; `iniziativa ritirata` every round; dead PCs dropped from the order at T14 and T21 (right) |
| CM | T6 + T9 | **out of order (engine):** Livia attacks twice in round 1 | T6 card «Spada lunga 5, fallita»; T9 «Livia colpisce Zirrà.» | Her T6 attack (initiative 2, 4th) resolves before Nespola and Eliandro act |
| CM | T10 | minor | «Zirrà schiocca le dita.» during Nespola's turn (Zirrà is last; not an attack) | round 2 |
| CA | T6; re-rolled at T9, 11, 13, 14 | rolled, and said every round | «Ordine del round: Grosso, Nespola, Eliandro, Livia, Zirrà.» | same double action: Livia T6 (hit) and T9 (miss), both in round 1 |
| PR | T11; re-rolled at T14 … T37 | rolled, and said every round | «Ordine del round: Nespola, Eliandro, Livia, Zirrà, Grosso.» | Livia T11 (bow) and T14 (sword) both in round 1; Nespola's and Eliandro's T11 attacks not rolled |

### Bug 8: stall (stall moves are listed in section 5)
| run | stall moves | engine stall lines | answers with no new clue, choice or world move |
|---|---|---|---|
| CM | none | stall count T1 fermi 0, T2 fermi 1 | 4/25: T2, T13, T18, T20 |
| CA | none | T2 fermi 1 | 1/14: T2 |
| FB | 6 (T5, 9, 10, 11, 12, 13) | fermi 0→3 (T2–T5), 0 (T6), 1→7 (T7–T13); stall lines asked of the scriptwriter at T9 and T13 | 3/13: T2, T7, T8. Hand-back at T3: «Berta Benni: Allora?» |
| ST | 9 (T4–T12) | E12 at T4 (stallo 1) and T6 (stallo 3); fermi 1→11 (T2–T12), 0 (T13), 1 (T14); stall lines asked at T8 and T11 | 4/14: T2, T3, T13, T14. Hand-backs: T3 «Allora? Le pecore non aspettano, e quelli lassù nemmeno.»; T12 «La scelta è vostra.» (with the leads, by design). **Note:** T13 resets to fermi 0 on a private question («Dimmelo, poi vado»). That is an under-count, not an over-fire |
| PR | none | fermi T3 1, T4 0, T5 0, T8 0 | 2: T3 (Berta's «Allora? …» after Livia's threat) and T23 (order only, until a late line at T26). T27, T29 and T33 have no player action |

### Bug 9: NPC presence
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| FB | 9 | **seen** (U4) | «Berta Benni: Lassù. Sopra il crinale, nella torre. Non chiedermi altro.» | «Nessuno in scena si chiama Carla» |
| FB | 7 | not seen (a gesture, not an answer) | «Berta indica il fienile con il mento, senza togliere la mano dal laccio.», then «Oreste? Qui nessuno conosce questo nome.» | — |
| ST | 5 | seen, minor continuity (not H) | «Sotto il portico Berta non si muove…», then in the same turn «Berta torna dal fienile con le mani vuote.» | the prepared clue `ber_stallo_giaciglio` assumes she went to the barn |
| FB | 10 | same prepared line, minor | «Berta torna dal fienile con le mani vuote.» | she was never said to leave |
| CM | 1→3 | not seen | «Tra i faggi, il mulo di Ugo è già un'ombra.»; next met in his own scene (carbonaia) | scene change |
| PR | 2→3 | not seen at the table | Ugo speaks at T3 «La strada parte dietro il fienile. Se la trova da sola.» | the failure price had him leave, but it was neither told nor applied (Ugo is «in piedi» in the T3 block) |

### Bug 10: repetition
| run | turn(s) | verdict | verbatim quote(s) | note |
|---|---|---|---|---|
| all | — | no verbatim repeat outside Engine lines | — | — |
| CM | 12, 16, 22 | Engine line, by design | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» | suppressed in between («said in the last turns, not again») |
| FB | 3 / 4 | near-repeat heard | «Berta non alza la voce, e parla piano, come a una pecora spaventata.» / «Berta abbassa la voce, come si fa con una pecora spaventata.» | not verbatim, so not caught |
| ST | 2 / 3 | near-repeat heard | «Mezzanotte non aspetta nessuno. Le pecore non aspettano.» / «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | FB T3 dropped this same tic; ST did not |
| ST | 4 / 11 | near-repeat heard | «Sui pali del cancello, nel legno chiaro, ci sono nomi di pecore incisi col coltello.» / «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» | a late line said the clue early |
| ST | 7 / 8 | contradiction between lines (not an H class) | «Sulla porta di casa pende la lavagna, con le lettere di gesso bianche.» / «Le lettere sono grandi e tonde, tracciate piano con il carbone.» | a late `sc_` line contradicts the prepared clue: chalk against charcoal |
| all | — | player words restated | none beyond the announcement | — |

---

## 3. The announcement

**Test, applied to every item:** a sentence inside «Nome: «…»» or «Nome dice: «…»» is heard as the PLAYER's words (attributed). It is the narrator asserting it only if a narrator or NPC line outside the quotes restates it. No announcement fails this test, so **0 H**. Attributed announcements with a claim false for the engine:

| run | turn | announcement (verbatim) | false for the engine because | corrected at the table? |
|---|---|---|---|---|
| CM | 8 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | no goblin with a spear; the roll was against Zirrà | yes: «Eliandro colpisce Zirrà.» |
| CA | 8 | same | same | yes: «Eliandro colpisce Zirrà.» |
| CA | 11 | «La paro con lo scudo. Resisto» | that turn Grosso hits Livia for 6 (no parry card) | yes: «Livia incassa il colpo.» |
| CM | 12 | «La paro con lo scudo. Resisto» | consistent: Grosso misses Livia | not false |
| CM | 13 | «Spingo il goblin contro il muro con lo scudo e lo colpisco» | «goblin» = Zirrà, who is dead; no roll | **no** (the who-is-there line is suppressed as said recently) |
| CM | 14 | «Indietreggio ma resto in piedi» | a PC-state clause was kept; Nespola falls and dies that turn | yes: «Nespola muore.» |
| CM | 15 | «Lancio il dardo incantato al goblin che la sta per colpire» | a clause with another subject was kept; no goblin exists; Nespola is already dead | **no** |
| CM | 19 | «Dal gradino tiro il pugnale a quello che scappa verso la cantina» | nobody flees | partly: «…a un passo da Grosso.» |
| CM | 20 | «Finisco quello con la lancia, colpo di spada lunga» | nobody has a spear; no card | **no** |
| CM | 21 | «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte» | Nespola is dead (an intent, not a claim) | **no** (only «Eliandro muore.») |
| CM | 22 | «Ultimo goblin: lo blocco contro la porta con lo scudo» | there is no goblin left | yes: the who-is-there line |
| FB | 1 | «La vendo a Valdirame e chiudo il conto» | the key is Berta's (an intent) | the card says fallita |
| FB | 7 | «Chiedo a Oreste se ha visto luci sulla collina» | Oreste does not exist | yes: «Oreste? Qui nessuno conosce questo nome.» |
| FB | 9 | «Dove vai con quel carico?» | the carrier («Madre Carla») does not exist | yes: «Carla? …», but only after Berta answers (U4) |
| FB | 11 | «Madre Carla, sei una vecchia ladra, e il carretto lo sequestro» | neither Carla nor the cart exists | not repeated (said at T9) |
| FB | 11 | «Madre Carla, dai, ti benedico e ti lascio andare» | same | same |
| PR | 2 | «Mi devi tre argenti» | a debt the engine does not track; the claim was kept and the demand dropped | Ugo's late «Tre argenti? Davanti a tutti, poi? Con che faccia?» |
| PR | 16 | «Tiro il pugnale al goblin che scappa verso le scale» | Zirrà does not flee (she attacks Eliandro that turn) | **no** |
| PR | 21 | «Ne tengo uno contro il muro: Dov'è il ragazzo?» | no hold was resolved («riesce se è possibile») | Grosso plays along: «Molla. Io dico. Poi carne.» |
| PR | 22 | «Anch'io scendo dietro di lei, scassino la porta in fondo» | Livia had not gone down yet | no |

The cases where a second judge is most likely to diverge are the uncorrected announcements: **CM T13, T15, T20, T21 and PR T16**. All are attributed.

Design finding (not H): the announcement often keeps an earlier sentence and drops the PC's own later act or question. Examples:
- CM/CA T1: «Berta, la torre è quella sopra il bosco?» is dropped.
- CM T16: «Fermatevi, e nessuno si fa più male!» is dropped.
- FB T2: «Dimmi la verità o me ne vado» is dropped.
- FB T7: «Mi vendi un formaggio, dai?» is dropped.
- FB T11: the act «Blocco le ruote con lo scudo» is dropped.
- FB T11: «ma prima mi dici la strada per la grotta» is dropped.
- ST T1: «Aspettiamo qui o andiamo?» is dropped.
- ST T11: «Aspettiamo che torni.» is dropped while the world clause «ha detto poco» is kept.
- PR T2: the demand is dropped and the claim is kept.

---

## 4. Over-fire check

| run | turn | event | sentence / line | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | [usa] rifiutato `nar_impronte` | Nespola: «Corro avanti… per ascoltare» | right | listening is not looking at footprints |
| CM | 8 | filter `sc_subito_t6…10_1` | not heard | right | Grosso acts while sorpreso |
| CM | 8 | filter `sc_subito_t7…12_1` | not heard | right | Zirrà acts while sorpreso |
| CM | 11 | R-dovuto aggiunta | «Zirrà cade a terra.» | right | the fall was untold |
| CM | 12 | filter `sc_subito_t11…20_1` | not heard | right | assumes a_terra, the ledger has morto |
| CM | 12 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» | right | «Il goblin mi tira la lancia»; Zirrà is dead |
| CM | 13 | [usa] rifiutato `nar_mappa` | Livia: «Spingo il goblin contro il muro…» | right | a shove is not looking at the charcoal marks |
| CM | 14 | R-dovuto | «Nespola muore.» | right | death untold |
| CM | 15 | filter, not on the card, `sc_subito_t13…24_1` | not heard | right | Livia hits Grosso, but T13 has no card |
| CM | 15 | R-dovuto | «Eliandro incassa il colpo.» | right | hit untold |
| CM | 16 | R-inesistente | same sentence | right | «Ehi goblin!»; the only one standing is Grosso, a hobgoblin |
| CM | 21 | filter, not on the card, `sc_subito_t20…38_1` | not heard | right | T20 has no card |
| CM | 21 | R-dovuto | «Eliandro muore.» | right | — |
| CM | 22 | R-dovuto | «Livia incassa il colpo.» | right | — |
| CM | 22 | R-inesistente | same sentence | right | «Ultimo goblin» |
| CM | 25 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | stable, untold |
| CA | 4 | [usa] rifiutato `nar_impronte` | after Ascoltare 37 fallita | right | a release does not answer a failed check |
| CA | 6 | R-dovuto | «Zirrà incassa il colpo.» | right | — |
| CA | 7 | filter, not on the card, `sc_subito_t6…9_1` | not heard | right | Eliandro had no card at T6 |
| CA | 8 | filter `sc_subito_t6…10_1` | not heard | right | Zirrà acts while sorpreso |
| CA | 10 | filter `sc_subito_t8…15_1` | not heard | right | checked against its own turn (T8, sorpreso) |
| CA | 11 | R-dovuto ×2 | «Eliandro cade a terra.» / «Livia incassa il colpo.» | right | — |
| CA | 12 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | — |
| CA | 13 | [usa] rifiutato `nar_mappa` | after Spada lunga fallita | right | — |
| CA | 13 | R-dovuto | «Livia muore.» | right | — |
| CA | 14 | R-dovuto | «Nespola muore.» | right | — |
| FB | 2 | filter `sc_subito_t1…1_1` | not heard | right | Berta had just refused (but no refusal line was ever heard for T1) |
| FB | 3 | R-ripetuta tolta (`ber_attesa`) | dropped «Le pecore non aspettano, e quelli lassù nemmeno.», kept «Allora?» | right | the tic was just heard in «Vai, se vuoi. Le pecore non aspettano.» |
| FB | 5 | [usa] rifiutato `ber_conti_fienile` | Nespola (private): «quanto ti pagava Ugo per il carbone?» | **wrong (likely)** | «pagava» is a form of «pagare», a listed theme, so the stated reason does not hold on the text. Private, phone only; the T5 stall verdict does not change |
| FB | 11 | R-ripetuta ×2 | dropped Ugo's «Il sentiero è quello.» / «Non si sbaglia, col buio.» | right | said word for word at T7; the narrator half stays |
| ST | 5 | release refused `nar_recinto`, replaced by `sc_prossime_t2…4_06` | Fulco: «Mi siedo sul muretto dello stazzo» | right | sitting is not examining the gate |
| PR | 2 | [usa] rifiutato `nar_lavagna` | after Intelligenza 5 fallita | right | — |
| PR | 4 | [usa] rifiutato `ber_conti_fienile` | Nespola (private): «Tonio aveva monete vecchie con una torre sopra?» | right | old coins with a tower are not Berta's debts |
| PR | 5 | [usa] rifiutato `fin_ovile_senza` | Nespola: «Vado a controllare il sentiero dietro l'ovile» | right | one PC checking the path is not the party leaving; an ending line would close the scene |
| PR | 8 | [usa] rifiutato `nar_impronte` | Nespola: «Corro avanti sul sentiero di Ugo…» | right | not looking at footprints |
| PR | 12 | filter, not on the card, `sc_subito_t11…23_1` | not heard | right | Eliandro had no card at T11 |
| PR | 13 | filter, not on the card, `sc_subito_t11…25_1` | not heard | right | Nespola had no card at T11 |
| PR | 14 | filter `sc_subito_t13…29_1` | not heard | right | Zirrà acts while sorpreso |
| PR | 15 | filter `sc_subito_t14…31_1` | not heard | right | same |
| PR | 17 | R-dovuto | «Livia incassa il colpo.» | right | — |
| PR | 18 | R-dovuto | «Zirrà cade a terra.» | right | — |
| PR | 19 | R-dovuto | «Eliandro cade a terra.» | right | — |
| PR | 20 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | — |
| PR | 21 | [usa] rifiutato `nar_tonio_parla` | Livia: «…Dov'è il ragazzo?» | right | asking where the boy is, not asking the boy why he climbed |
| PR | 23 | [usa] rifiutato `nar_conto` | Livia: «Vado giù per la scala della cantina…» | right | shares only «canti» |
| PR | 26 | R-dovuto | «Livia incassa il colpo.» | right | — |
| PR | 36 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | — |
| PR | 37 | R-dovuto | «Nespola respira ancora, ma non si muove.» | right | — |
| FB, ST | — | stall moves (15) | see section 5 | 15 right | — |

Totals: CM 16 rows (2 refusals, 5 filters, 9 coherence), CA 11 events, FB 5 events + 6 stall moves, ST 1 refusal + 9 stall moves, PR 17 events. **Wrong: 1 (FB T5, likely). Everything else is right.**

---

## 5. Stall moves (ST and FB): what the Engine put at the table, and the verdict

| run | turn | move | at the table | action that turn | verdict |
|---|---|---|---|---|---|
| FB | 5 | S1 | prepared `nar_stallo_ovile_corno`: «Dal crinale arriva un colpo di corno, lontano.» | private question to Berta (T3/T4 were the non-existent mill) | right |
| FB | 9 | S1 (n restarted after T6) | prepared `ber_stallo_paese`: «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» | question to the non-existent Carla | right |
| FB | 10 | S2, clue `i_giaciglio` | prepared `ber_stallo_giaciglio`: «Mancano gli stivali buoni e il mantello. E il pane della settimana, tutto.» | private question to «Madre Carla» | right |
| FB | 11 | S3, leads | prepared `ber_stallo_bosco`: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» «E più su, la Torre Mozza.» | insulting / blessing Carla; «Blocco le ruote con lo scudo» on a cart that does not exist | right (unsure-low: "uses an object", but on nothing) |
| FB | 12 | hard S1 → clock mark | `nar_segno_2`: «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | «Ci fermiamo al mulino a dormire» (non-existent place) | right |
| FB | 13 | S2, clue `i_lavagna` | clue `nar_lavagna`: «Le lettere sono grandi e tonde, tracciate piano con il carbone.» | private question to «Oreste» | right |
| ST | 4 | S1 | prepared `nar_stallo_ovile_corno` | «Aspetto.» | right |
| ST | 5 | S2, `i_giaciglio` | prepared `ber_stallo_giaciglio` (plus the footprint/gate line as Fulco's answer) | «Mi siedo sul muretto dello stazzo.» | right |
| ST | 6 | S3, leads | prepared `ber_stallo_bosco` (plus the clock sign `nar_segno_1`) | «Guardo in giro.» | right |
| ST | 7 | hard S1 → mark | `nar_segno_2` | «Aspetto ancora. Tanto Berta ci chiama, no?» | right |
| ST | 8 | S2, `i_lavagna` | clue `nar_lavagna` | «Ci penso. Aspetto.» | right |
| ST | 9 | S3, leads | **the Engine's own sentence of the leads**: «Vi tornano in mente le strade ancora aperte: La carbonaia di Ugo; La Torre Mozza.» | private question to Ugo | right |
| ST | 10 | hard S1 → mark | `nar_segno_3`: «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» + consequence `ber_pazienza` | PCs talking among themselves | right |
| ST | 11 | S2, clue `i_pali` | clue `nar_pali`: «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» | «Non so, ha detto poco.» | right |
| ST | 12 | S3, leads | **the Engine's own sentence of the leads**: «Le strade restano quelle: La carbonaia di Ugo; La Torre Mozza. La scelta è vostra.» | «Mi siedo di nuovo. Cosa facciamo adesso?» | right |

No fillers and no empty stall moves. CM, CA and PR have no stall moves.

---

## 6. PR: player actions with a word of a secret (secrets inferred from the view)

| turn | action (verbatim) | secret word / fact | heard a confirming line before its time? |
|---|---|---|---|
| 2 (public) | «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.» | who wrote the slate (`nar_lavagna`, `p_lettere`) | no: «Eliandro ci prova, ma non ci riesce.»; `nar_lavagna` refused after the failed check |
| 4 (private) | «Tonio aveva monete vecchie con una torre sopra?» | old coins with a tower | no: `ber_conti_fienile` refused; nothing at the table |
| 5 (private) | «Il balivo ti prende l'ovile alla prima neve, lo sai?» | the balivo / Berta's debts (`p_balivo`, `ber_conti_fienile`) | no: `ber_conti_fienile` reached only Livia's phone, and is **not among the table lines** |
| 6 (private) | «qualcuno a Spinalba parla con i goblin?» | who deals with the goblins (`o_sospetto`) | no: discreet phone answer |
| 19 (public) | «Chi vi ha dato le lettere per scrivere?» | the slate letters | no: Grosso's late «Lettere? Non so. Non si mangiano.» |

**H: 0.** «Grosso: Ragazzo? Seduto. Vivo.» at T22 is not a secret: Tonio is visible in the scene's opening.

---

## 7. Public actions with no answer, and late lines

| run | public actions with NO line about them | late lines (said before a later turn's action) |
|---|---|---|
| CM | 7: T4 Livia (rami); T13 Livia (shove, no roll); T15 Livia (drags Nespola); T15 Eliandro (dardo, no roll); T18 Livia («Non lo colpisco ancora…»); T20 Livia («Finisco quello con la lancia», no roll); T21 Eliandro (bandage) | 5 occasions, 15 lines: T7 (2), T11 (2), T17 (5), T19 (2), T23 (4) |
| CA | 1: T4 Livia (rami) | 5 occasions, 13 lines: T2 (2), T8 (2), T11 (2), T13 (5), T14 (2) |
| FB | 5: T1 Nespola (card only; the price is never told); T6 Nespola («Andiamo al guado»); T8 Livia («Vado lì, adesso»: nothing at all); T11 Livia (Carla/cart); T12 Nespola (mill, only the stall mark) | 3 occasions, 8 lines: T3 (3), T4 (2), T7 (3) |
| ST | 0 (T2 and T14 got only an idle line) | 9 occasions, 19 lines: T2 (3), T3 (2), T4 (2), T5 (2), T7 (2), T8 (2), T9 (2), T11 (2), T12 (2) |
| PR | 7: T3 Livia (threat to Ugo); T6 Livia (Carisma fallita, no refusal); T8 Nespola (runs ahead); T9 Livia (climbs after); T9 Nespola (success answered by an unrelated line); T11 Eliandro and Nespola (attacks not rolled) | 10 occasions, 24 lines: T2 (3), T3 (2), T5 (3), T6 (3), T9 (3), T16 (2), T19 (2), T20 (2), T22 (2), T26 (2) |

Each late line checked against its own inferred turn agrees with that turn's card, except U1 (unsure).

---

## 8. By-design items: one-line verdicts
- Every social check failed in every run (FB T1; PR T1, T6), so the rule on a rebuff after a passed check never applies.
- No run returns to a scene, so the scene-outcome-on-return rule never applies.
- CM T18: «Non lo colpisco ancora, aspetto la risposta» rolled nothing. Right.
- «Ancora» / «Pugnale ancora» / «Lo colpisco ancora» rolled against the last target (CM T10, T11; CA T10; PR T12). Right.
- «Oreste? / Carla? Qui nessuno conosce questo nome.» and «Da qui le strade che conoscete portano soltanto verso: …» (FB T3, T7, T9) are right, except that Berta answers in Carla's place (U4).
- Every defeat path paused the table with an ending that matches the PC states (section 1).
- Round order said at the end of a turn never names a PC who died that turn (CM T14, T21; CA T13). It does name unconscious PCs (CA, PR), which is allowed.
- No fall line or order line was heard before the faller's own announcement (CM T14, T21; CA T11, T13, T14; PR T19).

---

## 9. Summary
1. **H heard at the table: 0 in all five runs.** Four items are unsure, all leaning no: CM T23 and CM T11 (late lines), CA T11 (late Zirrà line, own turn inferred) and FB T9 (Berta answers for the non-existent Carla, which is bug 9).
2. Bugs 1, 2, 3 and 5 are not seen. Every 0 HP claim was only a player claim (CA T14, plus CM T14 and CA T12 «sento sangue»), all dropped from the announcements, and death saves are present in every fight.
3. Bug 6 is real at engine level in all three fights: the attack declared in the turn that opens combat resolves before the order and the same PC acts again in round 1. Some declared attacks are never rolled (PR T11 ×2, PR T18, CM T15, CM T20). Order lines are right.
4. Bug 9 is seen at FB T9 (with minor Berta continuity at ST T5 and FB T10). Bug 10 shows only near-verbatim repeats (FB T3/T4, ST T2/T3, ST T4/T11) and one chalk-against-charcoal contradiction (ST T7/T8). Bug 4 shows only a mild success-without-effect (PR T9).
5. Over-fire: 1 likely wrong refusal (FB T5 `ber_conti_fienile`, «pagava» against «pagare»). All other coherence events, filters and all 15 stall moves are right. The announcement never voices a claim as the narrator, but it often drops the PC's own later words, and five false attributed claims go uncorrected (CM T13, T15, T20, T21; PR T16).

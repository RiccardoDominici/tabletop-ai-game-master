# Evidence table: finale3, torre-mozza, PROFILE A (blind judge)

Sources: only the five views named in the brief (CM, CA, FB, ST, PR). Turn numbers are the views' «Turno N». The views have
no turns 23, 25 or 27 in CM and no turn 23 in PR. Every dice card is printed twice in each turn of every view. The views
can't tell me whether the projector really showed it twice.

## 1. Headline: HIGH-severity violations HEARD at the table (after the checker)

H = private content at the table / a fallen, absent or nonexistent character acting or speaking / an outcome against its
dice card / a secret confirmed before its time.

| run | H heard | H list (turn, verbatim quote, why) | unsure | unsure list (turn, quote, why undecidable) |
|---|---|---|---|---|
| CM | **0** | none | 2 | T19 «Grosso: Paga? Non so. Fame. Hai carne?»: Grosso answers «Ehi goblin! Chi vi paga?» right after the T18 block says «Nessuno in scena è «goblin»». The plural «vi» and the fact that he is the only enemy standing make it defensible (bug 9). T24 «La porta di ferro in fondo alla scala della cantina è dura e fredda al tatto.» / «Il buco nel muro soffia aria gelata sulle mani.»: sc lines bring the cellar door and a hole in the wall into the fight. The canon isn't in the views, so I can't tell whether this is a clue said too early. Low risk. |
| CA | **0** | none | 2 | T8 «La spada corta batte sullo scudo rosso, a colpi corti.»: the only shield anywhere in the views is Livia's, and no card in T7/T8 has Zirrà attacking Livia, so this may be an attack with no card (bug 5). It may also retell Nespola's T7 miss. T17 «Grosso: Paga? Io mangio. Lei contava.»: same bug-9 case as CM T19. |
| FB | **0** | none | 0 | none |
| ST | **0** | none | 0 | none |
| PR | **0** | none | 0 | none |

How I counted:
- **Announcements:** I applied the attribution test from the brief. A line framed «Nome: «…»» or «Nome dice: «…»» is the player's words, so it is attributed and not an H, even when it names a goblin that doesn't exist. I did not apply the general rule «a table line that has a nonexistent goblin act or be hit is H» to quoted announcements. If the caller wants to recount, the uncorrected regressions are PR T12, PR T13 and FB T9 (section 3).
- **Defeat ending:** «Vi sveglia il freddo, prima dell'alba.» is said with one PC dead in CM T32, CA T22 and PR T32. It is on the by-design list, so it gets a verdict in section 9 and is not counted in H or unsure.
- **FB T1–T2:** Carisma riuscita, then «Ladra, questa chiave non si vende». I decided it from engine state. The key stays with Berta in every later block («Chi ha che cosa: … ce l'ha Berta»), so the refusal agrees with the engine. That makes it bug 4 «success with no effect», not an outcome against the card.
- **Guards:** no view contains a guard-replacement WARN (`narrator: sentence contradicts the Engine, replaced`) or a `spostata al suo telefono` event. The verdict «fixed by a guard» is therefore never used.

## 2. Five-line summary

1. **H at the table:** 0 in all five games (CM 0, CA 0, FB 0, ST 0, PR 0). There are 4 unsure items (two cases of Grosso answering «goblin», one possible uncarded attack in CA T8, one possible early clue in CM T24). The checker's corrections (R-dovuto, R-inesistente, «Oreste?/Carla? Qui nessuno conosce questo nome.») landed every time they fired.
2. **Real: the announcement filter.** It still keeps world and third-party clauses while dropping the PC's real act or question: PR T12 «Guardo dentro la porta: tre o quattro goblin» (the shot was dropped), PR T13 «Ne arriva un altro», FB T9 «incontro una viandante con un carretto». No engine line corrected any of them. In total, 27 announcements carry a claim that is false for the engine, and all are attributed.
3. **Real: the engine's combat flow.** PCs act several times inside one round before NPCs reach their slot (CM: Zirrà killed in round 1 without ever acting). Declared attacks on unresolved targets get no roll and no answer (CM T21, PR T11 ×2, PR T17). Two death saves are one turn late (CA T8→T10, PR T12→T14). None of these is a narration contradiction.
4. **Real: repetition.** ST says «Le pecore non aspettano.» at T2 and again at T11, and «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» at T7 and T9. In FB, Berta's tic is not dropped at T3, although it was dropped in ST/PR. Every R-ripetuta drop that did fire was right.
5. **Stall: all 15 stall moves were right** (FB 6, ST 9). Two stall-count resets came on non-commitments (FB T6, ST T13), which is an under-count. Two successes had no effect (FB T1, PR T9). 27 public actions got no answer at the table: CM 8, CA 5, FB 4, ST 2, PR 8.

## 3. The announcement: every announcement with a claim false for the engine

Verdict test: does a listener hear it as the PLAYER's words (attributed, not H) or as the narrator asserting it (H)? Every
case below uses the «Nome: «…»» or «Nome dice: «…»» frame, so **all are attributed: 0 H from announcements.**

**3a. Regressions.** A world or third-party clause survived the filter and no Engine line corrected it that turn. These
are attributed but the most serious:

| run | turn | announcement (verbatim) | false for the engine | correction heard? |
|---|---|---|---|---|
| PR | 12 | «Eliandro: «Guardo dentro la porta: tre o quattro goblin».» | Three or four goblins don't exist (only Zirrà and Grosso). The real act «Tiro il dardo al più vicino!» was dropped (the engine still rolled it). | No. No R-inesistente event at T12. |
| PR | 13 | «Nespola Tondi: «Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle».» | «Ne arriva un altro» is a third-party clause. «lo colpisco» has no roll: «Zirrà è già a terra … nessun tiro». It may mean Grosso, who hit Nespola that turn. | No. |
| FB | 9 | «Fulco Granito: «Sulla strada della grotta incontro una viandante con un carretto».» | The cave road and the traveller with a cart don't exist. The PC's own question «Madre Carla? Dove vai con quel carico?» was dropped. | Partly: «Carla? Qui nessuno conosce questo nome.» The cart and the traveller are never denied. |

**3b. All other announcements with a false claim (attributed):**

| run | turn | announcement (verbatim) | false for the engine | correction heard that turn |
|---|---|---|---|---|
| CM | 9 | «Eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia».» | A creature nobody has (Zirrà dead since T7) | No (`who is really there was said in the last turns, not again`) |
| CM | 12 | «Livia Sarti: «La paro con lo scudo. Resisto».» | Parries an attack no card has | Yes: «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» |
| CM | 13 | «Livia Sarti: «Spingo il goblin contro il muro con lo scudo e lo colpisco».» | Dead target, and a hit no card has (no roll) | No (throttled) |
| CM | 15 | «Nespola Tondi: «Non mi reggo più, striscio dietro la pietra».» | Own state: the engine has «Nespola Tondi in piedi» | No |
| CM | 16 | «Livia Sarti: «Mi chino su Nespola, la trascino dietro lo scudo e la copro».» | Presupposes Nespola is down; the engine has her standing | No |
| CM | 21 | «Livia Sarti: «Finisco quello con la lancia, colpo di spada lunga».» | Nonexistent creature, and a kill with no roll («nessun tiro: l’azione riesce se è possibile») | No |
| CM | 24 | «Livia Sarti: «Ultimo goblin: lo blocco contro la porta con lo scudo».» | Nonexistent creature | Yes: «Zirrà giace a terra…» |
| CA | 10 | «Livia Sarti: «La paro con lo scudo. Resisto».» | No attack on Livia this turn (Zirrà attacked Nespola and missed) | No |
| CA | 13 | «Livia Sarti: «Mi chino su Nespola, la trascino dietro lo scudo e la copro».» | Nespola is 3/5 and standing | No |
| CA | 14 | «Nespola Tondi: «Non mi reggo più, striscio dietro la pietra».» | Own state: «Nespola Tondi ha 3 punti ferita su 5», standing | No |
| FB | 1 | «Nespola Tondi: «La vendo a Valdirame e chiudo il conto».» | The key is Berta's («ce l'ha Berta»). This is an intent. | Berta refuses (T2, late) |
| FB | 3 | «Fulco Granito: «Vado a benedirla».» | The mill wheel doesn't exist | Yes: «Da qui le strade che conoscete portano soltanto verso: La carbonaia di Ugo; La Torre Mozza.» |
| FB | 4 | «Livia Sarti: «Anch'io vado al mulino».» | Nonexistent place | No (roads sentence throttled). Berta answers late at T4/T5: «Mulini non ce n'è.» |
| FB | 6 | «Nespola Tondi: «Andiamo al guado».» | Nonexistent place | No (throttled) |
| FB | 7 | «Fulco Granito: «Chiedo a Oreste se ha visto luci sulla collina».» | Nonexistent person | Yes: «Oreste? Qui nessuno conosce questo nome.» |
| FB | 11 | «Livia Sarti dice: «Madre Carla, sei una vecchia ladra, e il carretto lo sequestro».» | Nonexistent person and cart | No (said at T9 only) |
| FB | 11 | «Fulco Granito dice: «Madre Carla, dai, ti benedico e ti lascio andare».» | Nonexistent person | No |
| FB | 12 | «Nespola Tondi: «Ci fermiamo al mulino a dormire».» | Nonexistent place | No |
| PR | 2 | «Nespola Tondi dice: «Mi devi tre argenti».» | A debt the engine doesn't show (unverifiable) | Ugo questions it at T3 (late) |
| PR | 11 | «Eliandro: «Lancio il dardo incantato sulla sentinella, subito».» | «sentinella» resolves to nobody (no roll) | No |
| PR | 11 | «Nespola Tondi: «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta».» | A hit no card has (no roll) | No |
| PR | 16 | «Nespola Tondi: «Colpisco il goblin alle spalle con la spada corta, e lo tengo fermo».» | Dead target, and a hit with no roll | Yes: «Zirrà giace a terra…» |
| PR | 17 | «Livia Sarti: «Scudo contro scudo, tiro la spada su quello in fondo».» | An attack with no roll | No |
| PR | 18 | «Livia Sarti: «Ne tengo uno contro il muro: Dov'è il ragazzo?».» | Holds someone no card or fact has | No |

Counts of announcements with a false claim: **CM 7, CA 3, FB 9, ST 0, PR 8 (27). H: 0.** CA T8 «…al goblin con la lancia»
is not false: it resolves to Zirrà, who is in play and is hit (19), and only the spear is wrong.

**3c. Announcement shape (not claims).** Speech keeps only the first sentence or question, and later words of the PC
are dropped:
- CM/CA T1 drop the question «Berta, la torre è quella sopra il bosco?».
- ST T1 keeps «Cosa facciamo?» and drops «Aspettiamo qui o andiamo?».
- FB T11 cuts mid-sentence before «, ma prima mi dici la strada per la grotta».
- PR T2 drops the threat «Dimmi la strada per la torre o te li riscuoto davanti a tutti».
- PR T18 drops «Parla!».

The good drops all worked: «Io sono lento», «Vedo tre goblin davanti alla porta», «Il goblin mi tira la lancia», «Il goblin mi prende alla spalla, sento sangue», «Ho zero punti ferita, sono a terra», «Oreste dice che sulla collina c'è una grotta…»
and «È quasi mezzanotte!».

## 4. Bug tables

### Bug 1: private content at the table
| run | turn(s) | verdict | verbatim quote(s) from the table | engine state that decides it |
|---|---|---|---|---|
| CM | 1, 2, 26 (Nespola→Ugo; Eliandro→Berta; Livia→«goblin») | not seen | T1 «Berta resta sotto il portico, con la chiave stretta nel pugno. Tra i faggi, il mulo di Ugo è già un'ombra.» T26: only «Ordine del round: Livia, Nespola, Grosso, Eliandro.» | Each private action gets `coherence: a private action nothing answered gets the Engine's discreet answer on its phone`. No later line names its content. |
| CA | 1, 2 (Nespola→Ugo «Tonio è vivo?»; Eliandro→Berta on the letters) | not seen | T2 «Berta Benni: Tonio è lassù. Andate adesso. Le pecore non aspettano.» | This Berta line answers Livia's public T1 question. Both private actions get the discreet phone answer. |
| FB | 5, 10, 13 (Nespola→Berta on Ugo's pay; Nespola→«Carla» on the boy with an old coin; Livia→«Oreste» on the goblins' pay) | not seen | T10 «Berta Benni: Mancano gli stivali buoni e il mantello. E il pane della settimana, tutto.» | That is the S2 stall clue (`indizio: i_giaciglio`), not the coin. T5: Berta's deviation (`deviazione: png_berta`). T10/T13: discreet phone answers. |
| ST | 9, 13 (Livia→Ugo «chi passa dal cancello di notte?»; Eliandro→Berta on the lavagna) | not seen | T11 «Livia Sarti: «Non so, ha detto poco».» | That is the player's own public words, not a narrator or NPC line. Discreet phone answers at T9 and T13. |
| PR | 4, 5, 6, 8, 19 | not seen | T9 «Tra i rami dei faggi non si muove niente, solo foglie secche.» | This answers Livia's public «guardo i rami» from T8, not Eliandro's private search with the lantern (failed «Cercare porte segrete e trappole 5 contro soglia 3»). The PR T5 `battuta uscita ber_conti_fienile` is logged as out but is not in the table view. |

### Bug 2: a fallen NPC who later acts or speaks
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 8–32 | not seen | T8/12/18/24 «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | `esce dallo scontro {png_zirra, morto}` at T7. Every goblin-acting clause was dropped from the announcements (for example T12 «Il goblin mi tira la lancia»). |
| CA | 13–22 | not seen | T17 «Grosso: Paga? Io mangio. Lei contava.» | Zirrà is dead from T12. Grosso mentions her in the past tense; she doesn't act. |
| PR | 14–32 | not seen | T16 «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | Zirrà is dead from T13. |
| FB, ST | — | n/a | — | No fight, and nobody falls. |

### Bug 3: a PC at 0 HP who acts, or a missing death save
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 12 / 29 / 32 | not seen (saves present) | T12 «Eliandro respira ancora, ma non si muove.» T29 «Livia cade a terra.» T30 «Livia respira ancora, ma non si muove.» T32 «Nespola muore.» | Eliandro is A TERRA at T12 (save 17, stable, same turn). Livia is A TERRA at T29 (save at T30: 17, stable). Nespola is A TERRA at T32 (save 6, MORTO). No player line from a downed PC afterwards. |
| CM | 15 | only a player claim | «Nespola Tondi: «Non mi reggo più, striscio dietro la pietra».» | **Not at 0 HP for the engine:** «Nespola Tondi in piedi». She was never hit before T32. |
| CA | 8 / 19 / 22 | not seen. One save is a turn late. | T8 «Eliandro cade a terra.» T10 «Eliandro respira ancora, ma non si muove.» T19 «Livia muore.» | Eliandro is down at T8 and gets no save in T9; his save comes at T10 (15, stable). Livia: T19, save 5, MORTO. Nespola: T22, save 18, stable. |
| CA | 14 | only a player claim | «Nespola Tondi: «Non mi reggo più, striscio dietro la pietra».» | **Not at 0 HP for the engine:** «Nespola Tondi ha 3 punti ferita su 5». |
| PR | 12 / 24 / 32 | not seen. One save is a turn late. | T12 «Eliandro cade a terra.» T14 «Eliandro respira ancora, ma non si muove.» T24 «Nespola muore.» | Eliandro is down at T12 and gets no save in T13; save at T14 (20). Nespola: T24, save 8, MORTO. Livia: T32, save 10, stable. |
| FB, ST | — | n/a | — | — |

Note: unconscious PCs keep getting initiative and are named in «Ordine del round». CM T30 asks
`r_t30_iniziativa_pg_eliandro_0` and `pg_livia_0` while both are unconscious. They don't act, so this is not a violation.

### Bug 4: dice card vs narration the table heard
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 6, 7, 10–12, 16–19, 22, 29, 30, 32 | not seen | T11 (late) «Il ferro affonda nella coscia dell'hobgoblin, sotto il bordo della pelle.» T17 (late) «Il colpo dell'hobgoblin spacca l'aria e picchia sul muro, a un palmo dallo scudo.» | Every narrated outcome matches its card. The T10 card «Nespola Tondi: Spada corta 14, riuscita» (COLPITO, Grosso) is told by the T11 late line. The T16 card «Grosso: Mazza ferrata 12, fallita» is told by the T17 late line. |
| CA | 4 | success, thin effect | «Nespola ci riesce.» | Ascoltare 26 vs 30, SUCCESSO. `nar_impronte` was refused, so only the acknowledgement and the clock horn followed. |
| CA | 19 | not seen (late line consistent with its own card) | «Il ferro fende l'aria e batte sul muro, scheggiando la pietra.» then «Livia muore.» | The miss line belongs to T18 (Grosso 8, fallita) and is heard before T19's card (Grosso 21, crit). The risk of confusion is a matter of order only. |
| FB | 1–2 | seen: success with no effect | T2 (late) «Berta Benni: Ladra, questa chiave non si vende. Tonio è lassù.» | Nespola Carisma 18 vs CD 17, RIUSCITA, and `attitude … indifferente → amichevole`. The key stays with Berta. The refusal agrees with the state; only the hostile tone clashes with the new attitude. Not H. |
| PR | 9 | seen: success with no effect | «La carbonaia sbuffa, e da una crepa esce una lingua di fuoco.» | Scalare pareti 16 vs 80, SUCCESSO. No line about the climb, and no «Nespola ci riesce.». |
| PR | 6, 11 | card only, no line | — | T6 Livia Carisma 12, FALLITA («Prezzo del fallimento: Berta stringe la chiave…») is never narrated. T11 Livia's Arco corto 10 miss is never narrated. |
| ST | — | n/a | — | No rolls. |

### Bug 5: an attack narrated with no card
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | all | not seen | — | Every narrated NPC attack has a card (T17 and T19 lines are late tellings of T16 and T18 misses). |
| CA | 8 | unsure | «La spada corta batte sullo scudo rosso, a colpi corti.» | The only shield in any view is Livia's, and no T7/T8 card has Zirrà attack Livia. It may also retell Nespola's T7 miss (Spada corta 7, fallita). |
| PR | all | not seen | T22 (late) «Grosso scende un gradino dopo l'altro e cala la mazza: manca, e il ferro scintilla sul muro.» | That matches T21 «Grosso: Mazza ferrata 2, fallita». |
| FB, ST | — | n/a | — | — |

The reverse case was seen: declared attacks that got no roll and no answer at the table.
- CM T21 «Finisco quello con la lancia, colpo di spada lunga»: the engine says «nessun tiro: l’azione riesce se è possibile».
- CM T9 and T13: the attacks went to the dead Zirrà, «nessun tiro», with the correction throttled.
- PR T11: Eliandro's «dardo incantato sulla sentinella» and Nespola's «colpisco alle spalle la sentinella» got no roll.
- PR T13: Nespola's «lo colpisco di nuovo» went to the dead Zirrà.
- PR T17: «tiro la spada su quello in fondo» got no roll, although Grosso is the only enemy.

### Bug 6: initiative
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 6, then each round | rolled and said | T6 «Ordine del round: Livia, Nespola, Eliandro, Grosso, Zirrà.» | `combattimento: inizia` at T6 (surprise d6=6: none). `iniziativa ritirata` every round, 15 rounds in all. The order line is said at every re-roll, always after the actions (at T18 it comes before the announcement). |
| CA | 6, then each round | rolled and said | T6 «Ordine del round: Nespola, Eliandro, Grosso, Zirrà, Livia.» | `inizia` at T6 (d6=5: no surprise). Re-rolled every round, 11 rounds. |
| PR | 11, then each round | rolled and said | T11 «Ordine del round: Eliandro, Zirrà, Livia, Nespola, Grosso.» | `inizia` at T11 (d6=4: no surprise). Re-rolled every round, 15 rounds. |
| CM/CA/PR | round 1 | seen: the engine itself resolves out of its order. The narration only follows the cards. | CM T7 «Livia colpisce Zirrà.» / «Zirrà cade a terra.» | CM round 1 (T6–T9): all PCs act at T6, then Livia attacks again at T7 and kills Zirrà (init 4) before Zirrà or Grosso (init 5) ever act. Grosso first acts at T9 (`Round 2, iniziativa ritirata` at T9). CA: Livia (init 2, last) hits at T6 before Grosso (6) and Zirrà (4); NPCs first act at T8. PR: Livia (3) shoots at T11 before Zirrà (6); Eliandro acts at T11 and T12. CM round 4: Nespola acts at T14 and T15 before Livia and Grosso. |
| FB, ST | — | n/a | — | No fight. |

### Bug 8: stall (empty, idle or handed-back answers)
| run | turn(s) | verdict | verbatim quote(s) | engine state (stall lines) |
|---|---|---|---|---|
| CM | 2, 14, 15, 21, 26 | seen: 5 idle answers out of 19 turns with an action | T15: only «Nespola Tondi: «Non mi reggo più, striscio dietro la pietra».» T21 «Grosso: Indietro. Mazza pesante, io.» | `an answer with nothing new` fermi 0 (T1), 1 (T2). No E12, no stall move. In the fight, cards count as world moves. |
| CA | 2, 14 | seen: 2 of 14 | T14: only the announcement and «Ordine del round: Livia, Nespola, Grosso, Eliandro.» | fermi 1 (T2). No moves. |
| FB | 2, 4, 7, 8 | seen: 4 of 13 | T2 «Nello stazzo una pecora bela, e un'altra le risponde. Dal paese arriva odore di minestra e di fumo.» T7 «Oreste? Qui nessuno conosce questo nome.» | fermi: 0 at T2, then 1, 2, 3 (T5, S1), 0 (T6, reset), 1, 2, 3 (T9, S1), then 4–7. Stall moves at T5, T9, T10, T11, T12 (hard S1), T13. `stall lines asked of the scriptwriter` at T9 and T13. |
| ST | 2, 3, 9, 13, 14 | seen: 5 of 14. One question handed back. | T3 «Berta Benni: Zitta, sì. Le parole non scaldano Tonio. Venite, o restate?» / «Berta Benni: Allora?» T14 «Ugo Faggioli: Paese. Sempre domande, mai carbone.» | E12 at T4 (stallo 1) and T6 (stallo 3). Stall moves T4–T12, one per turn (9). fermi climbs to 11, is reset to 0 at T13 (private «Dimmelo, poi vado»), then 1 at T14. |
| PR | 18, 19 | seen: 2 of 19 | T3 «Berta Benni: Allora?» (Ugo answers late at T4) | fermi 1 (T3), then 0 at T4, T5 and T8. No moves. |

Under-counts (resets on non-commitments; the cause isn't logged):
- FB T6 resets fermi to 0 on «Lascio Ugo con il suo carbone e vi vengo dietro» together with «Andiamo al guado». The ford was itself logged as `no commitment for the stall`.
- ST T13 resets on a private conditional «Dimmelo, poi vado».

### Bug 9: NPC presence and answering for another
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 1 → 3 | not seen | T1 «Tra i faggi, il mulo di Ugo è già un'ombra.» | Ugo is silent for the rest of scena_ovile and reappears only in the next scene (T3). |
| CM | 18–19 | unsure | T19 «Grosso: Paga? Non so. Fame. Hai carne?» | He answers «Ehi goblin! Chi vi paga?». The T18 block has «Nessuno in scena è «goblin»…». The plural «vi» and Grosso being the only enemy standing argue for it. |
| CA | 15–17 | unsure | T17 «Grosso: Paga? Io mangio. Lei contava.» | Same case. |
| FB | 7, 9, 11, 13 | not seen | T9 «Carla? Qui nessuno conosce questo nome.» | `[usa] rifiutato` ugo_niente_visto (Oreste) and sc_prossime_t1_…_2_02 (Carla): nobody answers in their place. |
| ST | all | not seen | — | — |
| PR | 3 | not seen | «Berta Benni: Allora?» | Livia addressed Ugo. Berta's line is what's left of ber_attesa after the drop (an idle prompt). Ugo answers at T4 «La milizia? Sta a Valdirame, quattro ore di cammino.» |

### Bug 10: repetition and restated player words
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 8, 12, 18, 24 | by design (Engine line) | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | The R-inesistente sentence, throttled («said in the last turns, not again»). |
| ST | 2, 11 | **seen** | «Berta Benni: Le pecore non aspettano.» | Verbatim and not an engine line. R-ripetuta didn't catch it (9 turns apart). |
| ST | 7, 9 | **seen** | «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | T7 nar_segno_2 (clock sign), then T9 sc_prossime_t8_mwmrzrqf_16_stallo_02 (S3) with the same words, not dropped. At T9 it falsely suggests a new clock move. |
| ST | 10, 12 | near-verbatim clause | T10 «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» | T12 sc_prossime_t11_…_23_7 repeats the clause. |
| FB | 2, 3 | seen (a tic that wasn't dropped) | T2 «Berta Benni: Le pecore non aspettano.» T3 «Berta Benni: Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | The same tic was dropped at ST T3 and PR T3, but not in FB. |
| PR | 9 | seen (an NPC gesture repeated in one block) | «Ugo non si volta, ma stringe il manico della pala.» / «Dietro, nella radura, Ugo guarda il sentiero e stringe la pala.» | Late lines from T8; not dropped. |
| PR | 25–29 | by design (Engine line) | «Ordine del round: Livia, Eliandro, Grosso.» | Five rounds with only NPC turns. The table hears just the order line, with Grosso's cards and no narration. |
| all | — | player words restated as narration: not seen | — | Only the by-design announcements. |

## 5. Over-fire check: every coherence event and every refused pick

| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | `[usa] rifiutato` nar_impronte (Nespola) | (table: «Nespola ci prova, ma non ci riesce.») | right | Ascoltare 86 vs 30 failed, and a clue release can't answer a failed check |
| CM | 6 | R-dovuto aggiunta | «Zirrà incassa il colpo.» | right | Livia 16 vs CA 14 hit for 10 and no line told it |
| CM | 7 | R-dovuto | «Zirrà cade a terra.» | right | Zirrà A TERRA, dead |
| CM | 8 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | «Il goblin a destra» and no living goblin |
| CM | 12 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | save 17, stable |
| CM | 12 | R-inesistente | «Zirrà giace a terra…» | right | «Il goblin mi tira la lancia» |
| CM | 13 | `[usa] rifiutato` nar_mappa (Livia) | — | right | a shield shove vs «guarda … i segni a carbone sul muro»: they share only «muro» |
| CM | 18 | R-inesistente | «Zirrà giace a terra…» | right | «Ehi goblin!» |
| CM | 22 | R-dovuto | «Livia incassa il colpo.» | right | Grosso 19 hit for 7 |
| CM | 24 | R-inesistente | «Zirrà giace a terra…» | right | «Ultimo goblin» |
| CM | 29 | R-dovuto | «Livia cade a terra.» | right | crit, 0 HP |
| CM | 30 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | save 17 |
| CM | 32 | R-dovuto | «Nespola muore.» | right | save 6, MORTO |
| CM | 7, 8, 10, 10, 14, 14, 15 | sceneggiatore filter (7 lines) | — | right (T10 sc_subito_t8_…_14_1: unsure on timing) | Each told an outcome no card of its turn had. T10's own card does have Nespola hitting Grosso, but the WARN is logged before T10's roll, so it was checked against T8/T9 |
| CA | 4 | `[usa] rifiutato` nar_impronte (Nespola, success) | (table: «Nespola ci riesce.») | unsure | Looking at tracks is not listening, but the refusal left a successful roll with only the acknowledgement |
| CA | 6 | R-dovuto | «Zirrà incassa il colpo.» | right | hit for 8 |
| CA | 8 | R-dovuto | «Eliandro cade a terra.» | right | Zirrà 20, 6 damage, 0 HP |
| CA | 10 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | save 15 |
| CA | 11 | R-dovuto | «Nespola incassa il colpo.» | right | Zirrà 21, 2 damage |
| CA | 12 | `[usa] rifiutato` nar_mappa (Livia) | — | right | only «muro» in common |
| CA | 12 | R-dovuto | «Zirrà cade a terra.» | right | dead |
| CA | 15 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | «Ehi goblin!» |
| CA | 16 | R-dovuto | «Livia incassa il colpo.» | right | 8 damage |
| CA | 19 | R-dovuto | «Livia muore.» | right | save 5, MORTO |
| CA | 22 | R-dovuto | «Nespola respira ancora, ma non si muove.» | right | save 18 |
| CA | 7, 13, 14 | sceneggiatore filter (3 lines) | — | right | T13 and T14 were stale (a T10 hit and the T12 kill, told after Zirrà was dead) |
| FB | 5 | `[usa] rifiutato` ber_conti_fienile (Nespola, private «quanto ti pagava Ugo per il carbone?») | — | unsure | The stated motive is false: «pagava» is the theme «pagare». Whether the debts line fits the question is arguable. Berta's deviation was used instead. |
| FB | 7 | `[usa] rifiutato` ugo_niente_visto (Fulco → Oreste) | — | right | Oreste doesn't exist |
| FB | 9 | `[usa] rifiutato` sc_prossime_t1_…_2_02 (Fulco → Carla) | — | right | Carla doesn't exist |
| FB | 12 | R-ripetuta tolta | «Tonio è lassù.» | right | said at T2 and T3; the rest, «Berta Benni: Sali, e non tornare senza di lui.», stands |
| ST | 3 | R-ripetuta tolta | «Le pecore non aspettano, e quelli lassù nemmeno.» | right | tic said at T2. «Berta Benni: Allora?» is left (thin, but not a needed line) |
| ST | 5 | `[usa] rifiutato` nar_recinto (Fulco sits on the wall) | — | right | sitting is not examining the gate |
| ST | 12 | R-ripetuta tolta | «Le pecore non aspettano, ma io sì.» | right | tic said at T11 |
| PR | 3 | R-ripetuta tolta | «Le pecore non aspettano, e quelli lassù nemmeno.» | right | tic said at T2 |
| PR | 4 | `[usa] rifiutato` ber_conti_fienile (Nespola, private, about the coins) | — | right | Tonio's old coins are not Berta's debts |
| PR | 5 | `[usa] rifiutato` fin_ovile_senza (Nespola checks the path) | — | right | that ending would close the scene, and she is only scouting |
| PR | 8 | `[usa] rifiutato` nar_impronte (Nespola runs between the roots) | — | right | she isn't looking at tracks |
| PR | 12 | R-dovuto ×2 | «Zirrà incassa il colpo.» / «Eliandro cade a terra.» | right | magic missile for 7; Zirrà 19, 5 damage |
| PR | 13 | R-dovuto ×2 | «Zirrà cade a terra.» / «Nespola incassa il colpo.» | right | crit kill; Grosso 4 damage |
| PR | 14 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | save 20 |
| PR | 16 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | «Colpisco il goblin» |
| PR | 18 | `[usa] rifiutato` nar_mappa (Livia) | — | right | only «muro» in common |
| PR | 20 | nar_conto refused, replaced by the Engine's sc_prossime_t14_…_32_02 | «Dalla cantina sale un vento freddo, e la porta di ferro resta chiusa.» | right | going down the stairs is not examining the wall by the door |
| PR | 20, 24, 30, 32 | R-dovuto | «Livia incassa il colpo.» / «Nespola muore.» / «Livia incassa il colpo.» / «Livia respira ancora, ma non si muove.» | right | all on their cards |
| PR | 12, 14 | sceneggiatore filter (2 lines) | — | right (T12 sc_subito_t11_…_22_1: unsure on timing) | T12's own card does have Eliandro hitting Zirrà, but the WARN is logged before the roll (checked against T11, when he had no roll) |
| FB/ST | stall moves | 15 stall moves | see section 6 | all right | no real decision was ignored |

Totals: 34 `coerenza: violazione` events (CM 11, CA 9, FB 1, ST 2, PR 11). 13 refused picks (CM 2, CA 2, FB 3, ST 1, PR 5).
12 filtered sceneggiatore lines. **Wrong: 0. Unsure: 2 picks (CA T4, FB T5) and 2 filter timings.** I found no
over-fire on a needed line, no "ancora in piedi" misfire, and no public fact moved to a phone.

Under-fires (missed corrections or drops):
- No correction for «tre o quattro goblin» (PR T12) or «Ne arriva un altro» (PR T13).
- R-inesistente was throttled at CM T9, T13 and T21 and PR T13, which left attacks on nobody with no answer.
- The tic was not dropped at FB T3.
- Verbatim repeats at ST T9 and T11 were not dropped.

## 6. Stall moves (FB and ST): what the Engine put at the table, and a verdict for each

| run | turn | move | put at the table | player action that turn | verdict |
|---|---|---|---|---|---|
| FB | 5 | S1 (n1) | prepared stallo line nar_stallo_ovile_corno: «Dal crinale arriva un colpo di corno, lontano. Le pecore alzano la testa, poi tornano a brucare.» | Nespola's private question to Berta (after T3/T4 «going» to a nonexistent mill) | right |
| FB | 9 | S1 (n1, after the T6 reset) | prepared stallo line ber_stallo_paese: «Berta Benni: Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» and the Engine's «Carla? Qui nessuno conosce questo nome.» | «Sulla strada della grotta incontro una viandante…» (a nonexistent place and person) | right |
| FB | 10 | S2 (n2, clue i_giaciglio) | clue line ber_stallo_giaciglio: «Berta torna dal fienile con le mani vuote.» / «Berta Benni: Mancano gli stivali buoni e il mantello…» | private question to «Carla» | right |
| FB | 11 | S3 (n3, leads) | prepared stallo line ber_stallo_bosco with the leads: «Berta Benni: I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» / «E più su, la Torre Mozza.», plus sc_prossime_t8 path lines | insults to «Carla» and seizing the cart | right |
| FB | 12 | hard S1 (n4, a mark on o_mezzanotte) | clock-sign line nar_segno_2: «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | «Ci fermiamo al mulino a dormire» | right |
| FB | 13 | S2 (n5, clue i_lavagna) | clue line nar_lavagna: «Le lettere sono grandi e tonde, tracciate piano con il carbone.» / «Ogni erre è rovesciata…» | private question to «Oreste» | right |
| ST | 4 | S1 (n1), E12 | prepared stallo line nar_stallo_ovile_corno (the horn, as in FB T5) | «Aspetto.» | right |
| ST | 5 | S2 (n2, i_giaciglio) | clue line ber_stallo_giaciglio | «Mi siedo sul muretto dello stazzo.» | right |
| ST | 6 | S3 (n3, leads), E12 | ber_stallo_bosco (leads by Berta) and the clock sign nar_segno_1 «Dal crinale scende un corno di capra, lungo e stonato.» | «Guardo in giro.» | right |
| ST | 7 | hard S1 (n4, a mark) | clock sign nar_segno_2 «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | «Aspetto ancora. Tanto Berta ci chiama, no?» | right |
| ST | 8 | S2 (n5, i_lavagna) | clue line nar_lavagna | «Ci penso. Aspetto.» | right |
| ST | 9 | S3 (n6, leads) | sc stallo line sc_prossime_t8_mwmrzrqf_16_stallo_02 = **a verbatim copy of T7's fire line**. The leads are not said. | Livia's private question to Ugo | right as a move, but the material is poor (a repeat, no leads) |
| ST | 10 | hard S1 (n7, a mark) and consequence o_mezzanotte@3 | clock sign nar_segno_3 «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» and ber_pazienza «Berta Benni: La notte non aspetta nessuno. Se non salite voi, lassù ci salgo io.» | the PCs talk among themselves | right |
| ST | 11 | S2 (n8, i_pali) | clue line nar_pali: «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» / «Le erre sono rovesciate, tutte quante.» | «Non so, ha detto poco. Aspettiamo che torni.» | right |
| ST | 12 | S3 (n9, leads) | sc line sc_prossime_t11_mwms20r5_23_7 (type momento, not a `_stallo_` id): «Il fumo della carbonaia sale dal bosco. Dalla torre arriva un tamburo, e i cani…» (the leads are implied) | «Mi siedo di nuovo. Cosa facciamo adesso?» | right |

The Engine's own sentence of the leads («Da qui le strade che conoscete portano soltanto verso: …») was said only at FB T3, as
the answer to a nonexistent place, not as a stall move.

## 7. PR: player actions that contain a word of a secret

The secrets are **inferred from the views** (the canon is not among the allowed files):
- Tonio left on his own or wrote the lavagna himself, and is with the goblins (clues nar_lavagna, ber_stallo_giaciglio, nar_pali, nar_piccone).
- Old coins with a tower on them.
- Berta's debts and the balivo at the first snow (the themes of ber_conti_fienile; p_balivo, p_inverno).
- Someone in Spinalba in touch with the goblins.
- The key «del castellano» and the cellar's iron door.

| turn | player action (verbatim) | secret word | did the table hear a confirming line before its time? |
|---|---|---|---|
| 2 (public) | «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.» | the author of the lavagna | **No (not H).** The announcement dropped the deduction. The table heard the clue earned by Intelligenza 22 vs CD 13: «Le lettere sono grandi e tonde, tracciate piano con il carbone.» / «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» It doesn't say who wrote it. |
| 4 (private) | «Berta, piano: Tonio aveva monete vecchie con una torre sopra? Non dirlo a nessuno.» | old coins with a tower | **No.** No table line mentions coins. ber_conti_fienile was refused, and Berta's deviation was used. |
| 5 (private) | «Il balivo ti prende l'ovile alla prima neve, lo sai?» | the balivo, the first snow | **No.** ber_conti_fienile is logged as out but is not in the table view. |
| 6 (private) | «Berta, qualcuno a Spinalba parla con i goblin?» | an insider | **No.** Discreet phone answer only. |
| 8 (private) | «Seguo con la lanterna e cerco segni incisi sugli alberi.» | carved marks | **No.** The roll failed (5 vs 3). The T9 lines talk only about branches and roots. |
| 18 / 19 (private) | «Dov'è il ragazzo? Parla!» / «Il ragazzo, Tonio. Dov'è?» | where Tonio is | **No.** «Grosso: Ragazzo? Non so. Fame, io.» |
| 20–21 | «Vado giù per la scala della cantina, spada in mano.» / «… scassino la porta in fondo.» | the iron door and the key | **No.** «Dalla cantina sale un vento freddo, e la porta di ferro resta chiusa.» «La serratura è fredda e dura, e dentro non scatta niente.» |

The prepared reveal nar_piccone («Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.», PR T11, also CM/CA T6) is said in its own scene, so it is not before its time. **PR secrets
confirmed before their time: 0.**

## 8. Per game: public actions with no answer, and late lines

Public actions with **no answer at the table**. Nothing about the action was heard except its announcement; other actors'
cards and order lines don't count.

| run | n | turns |
|---|---|---|
| CM | 8 | T4 Livia (the branches), T6 Eliandro, T6 Nespola, T9 Eliandro, T13 Livia, T14 Nespola, T15 Nespola, T16 Livia |
| CA | 5 | T4 Livia, T6 Eliandro, T6 Nespola, T10 Livia, T13 Livia |
| FB | 4 | T6 Nespola («Andiamo al guado»), T8 Livia («Vado lì, adesso»), T11 Livia, T11 Fulco |
| ST | 2 | T5 Fulco, T14 Fulco |
| PR | 8 | T6 Livia (card only), T9 Nespola (successful climb, no line), T9 Livia, T11 Eliandro, T11 Livia (card only), T11 Nespola, T13 Nespola, T17 Livia |

Lines that reached the table **late**:
- **(a)** named `sc_` ids said in a later turn;
- **(b)** id-less blocks at the top of a turn, said after the turn they answer. These are inferred to be sceneggiatore lines, since no `battuta uscita` is logged for them.

| run | (a) named sc ids said later | (b) late top-of-turn blocks |
|---|---|---|
| CM | sc_prossime_t13_mwmqsbgq_25_02 at T21 («Grosso: Indietro. Mazza pesante, io.»); sc_prossime_t18_mwmqvqq5_34_03 at T24 (the cellar door and the hole in the wall) | 5 blocks / 10 lines: T11, T12, T17, T19, T22 |
| CA | none | 5 blocks / 13 lines: T2, T8, T15, T17, T19 |
| FB | sc_prossime_t3_mwmrms4w_6_4 at T8; sc_prossime_t8_mwmrq2ok_15_06 at T11; sc_prossime_t7_mwmrpi20_14_06 at T12 | 5 blocks / 13 lines: T2, T3, T4, T5, T7 |
| ST | sc_prossime_t8_mwmrzrqf_16_stallo_02 at T9; sc_prossime_t7_mwmrz3a0_14_06 at T12; sc_prossime_t11_mwms20r5_23_7 at T12 | 9 blocks / 22 lines: T2, T3, T4, T5, T7, T8, T9, T11, T12 |
| PR | sc_prossime_t12_mwmse8ex_27_05 at T17 («Grosso si alza piano…», stale: Grosso has been fighting since T13); sc_prossime_t14_mwmsg5bu_32_02 at T20 | 9 blocks / 24 lines: T2, T3, T4, T5, T6, T9, T16, T19, T22 |

Every late block is consistent with the card of the turn it answers.

## 9. By-design items: right or wrong

- **«X ci prova / ci riesce / colpisce / manca»: right every time.**
  - CM T4, T7, T10, T11.
  - CA T4, T8, T9, T10, T12.
  - PR T13, T14, T15, T21.
  - Missing acknowledgements: CA T7 (Nespola's miss, answered late at T8), PR T9 (the climb), PR T11 (Livia's miss).
- **Defeat ending: right, with a wording flaw.** The path is right: `nar_sconfitta_grosso` is said, then `the party is down, the table pauses` (CM T32, CA T22, PR T32). But «La notte passa sulla torre. Vi sveglia il freddo, prima dell'alba.» is said to a party in which one PC has just died (CM and PR: Nespola; CA: Livia, dead since T19). A variant for a mixed party (dead plus stable) is needed. «Nessuno di voi si rialza…» never occurs, which is correct because no party was all dead.
- **An attack with no target goes to the last target:**
  - right: CA T10 («Lo colpisco ancora» → Zirrà), CM T10 (→ Grosso, the only enemy standing) and CM T11 «Pugnale ancora» → Grosso.
  - wrong in effect: PR T13. The last target was Zirrà, already killed by Livia that turn, while Grosso stood, so there was no roll.
  - similar: CM T13, where the word «goblin» resolves to the dead Zirrà (her alias), so no roll.
  - harmless misparse: CM T20 / CA T18 «Non lo colpisco ancora» is parsed as an attack on Zirrà.
- **«Oreste? / Carla? Qui nessuno conosce questo nome.»** (FB T7, T9): right. No NPC answered in their place.
- **«Da qui le strade che conoscete portano soltanto verso: …»** (FB T3): right. Later «mulino» and «guado» were not counted as decisions, but see the FB T6 reset.
- **Discreet phone answer to private actions:** right. Logged at CM T1, T2, T26; CA T1, T2; FB T10, T13; ST T9, T13; PR T6, T8, T19. FB T5 and PR T4 got Berta's deviation. No private content leaked.
- **Scene gates:** CM T1 closes scena_ovile with fin_ovile_senza after «Ci andiamo adesso, prima di mezzanotte»; right, a real commitment. No midnight gate fired, because the clock never filled.
- **«Chi ha che cosa»:** the key is Berta's in every block of every run, and no line gave it away. Right.
- **R-ripetuta drops:** all 4 were right (FB T12, ST T3, ST T12, PR T3). None removed a needed line.
- **Automatic rolls with an NPC first:** n/a. The only automatic fight (CA T6) was opened by the PCs (`primo: pg`).

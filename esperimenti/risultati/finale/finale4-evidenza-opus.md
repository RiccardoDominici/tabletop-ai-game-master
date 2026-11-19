# Evidence table: e2e coherence pass, final round, profile A (attempt 4), Opus judge

Sources: only the five evidence views named in the brief (runs CM, CA, FB, ST, PR). I did not read the campaign files, so wherever I call something a "secret" I inferred it from ids in the logs. No repo file was edited.

---

## 1. H heard at the table (success criterion, target 0)

**Rules applied.**
- **What counts as H.** A line heard at the table that leaks private content, has a fallen or absent character act or speak, or tells an outcome against its card, after the checker has run.
- **Unsure items.** They are never added to the H total.
- **Test for announcements** (from «Changes since attempt 3»):
  - A kept clause counts as **unsure at least** when it is a statement about the world or has another subject, rather than the PC's own act, and it is false in that turn's engine log.
  - A plain target noun phrase inside the PC's own first-person act counts as **attributed** (the player's words, not an H).
- **Same quote, same verdict.** The same quote gets the same verdict in every run unless the engine state differs, and any difference is named.

| run | certain H | unsure: would be H if confirmed | noted: not an H category |
|---|---|---|---|
| CM | **0** | 3 (T12, T19, T23) | 1 (T24) |
| CA | **0** | 1 (T18) | 0 |
| FB | **0** | 0 | 1 (T7) |
| ST | **0** | 0 | 0 |
| PR | **0** | 3 (T18, T11/T13, T15) | 2 (T6, T23) |

### Unsure items that would be H if confirmed

| run | turn | item | verbatim quote heard | engine state | why unsure |
|---|---|---|---|---|---|
| PR | 18 | A downed PC's own announcement is heard **after** his fall | Heard in this order: «Eliandro cade a terra.», then «Ordine del round: Nespola, Livia, Grosso, Eliandro, Zirrà.», then «Eliandro: «Anch'io lo stringo e chiedo: Chi vi ha dato le lettere per scrivere?».» | The engine order is the reverse: fact [1] «Eliandro: nessun tiro», then «Turno di Zirrà: … Eliandro va a terra». The fall line and the order line were placed `prima_dell_invito: true`. | Under bug 3's engine definition this is not seen, because Eliandro acted at 2 HP before he fell. Under the heard criterion, a fallen PC grips and speaks. I count it unsure and leaning H. It is a real line-order bug in either case (see bug 6). |
| PR | 13 (and 11) | A surprised NPC acts | T13: «Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.» + «Allora? Io aspetto, la luna no.»<br>T11: «Zirrà schiocca le dita.» | T11: «sono colti di sorpresa (sorpreso): perdono il primo round».<br>T13 fact: «Turno di Zirrà: è sorpreso, non agisce.» | Surprise is not one of the filter's out-of-play states, and no attack is narrated. Still, the table hears Zirrà act (kicking sparks at the PCs) in the very turn the engine says she does not act. |
| PR | 15 | A world clause with another subject was kept in the announcement | «Eliandro: «Tiro il pugnale al goblin che scappa verso le scale».» | Zirrà is not fleeing: in the same turn she crits Eliandro («Zirrà colpisce Eliandro: 2 danni»), and no «fugge» appears anywhere. | It is a relative clause with the goblin as subject, and it is false. It sits inside Eliandro's first-person quoted act, so it is probably heard as his words. |
| CM | 12 | A world clause with another subject was kept in the announcement | «Eliandro: «Lancio il dardo incantato al goblin che la sta per colpire».» | Zirrà's strike this turn is on Eliandro («Zirrà colpisce Eliandro: 5 danni»), not on Nespola. Nespola is «in piedi» and is never hit in CM. | Same test as PR T15: a false relative clause with another subject, inside a first-person act. |
| CM | 19 | A late line implies a wound that no card dealt | «Sui sassi gelati resta una striscia scura, fino al riparo dello scudo.» | Nespola is never hit in CM: Grosso misses her at T7, T10, T13 and T25, and the engine block reads «Nespola Tondi in piedi». The line answers Livia's T16 drag, which came after the player's claims «sento sangue» (T13) and «Ho zero punti ferita» (T15). | A «striscia scura» could be a drag mark. Read as blood (the usual narrative reading), it is a bug 4 H: a hit on someone no card hit. Leaning H. |
| CM | 23 | A verbless world label was kept in the announcement | «Livia Sarti: «Ultimo goblin: lo blocco contro la porta con lo scudo».» | Zirrà has been dead since T12, R-inesistente fired, and the engine block says «Nessuno in scena è «goblin»». | It has the same shape as the brief's «tre o quattro goblin» and is false. The same turn corrects it at the table: «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» |
| CA | 18 | The same quote as CM T23 | «Livia Sarti: «Ultimo goblin: lo blocco contro la porta con lo scudo».» | Zirrà has been dead since T13, and the block says «Nessuno in scena è «goblin»». | The engine state is the same as CM T23, so the verdict is the same. The one difference: no correction is heard in this turn («who is really there was said in the last turns, not again»; it was last said at T15). |

### Noted items (not an H category even if confirmed)

| run | turn | item | quote | engine state |
|---|---|---|---|---|
| CM | 24 | A dead PC is named in the round order right after her death | «Livia muore.», then «Ordine del round: Livia, Nespola, Grosso.» | Round 9 was rolled with pg_livia in it, before her failed save. The order line was spoken after her death. Nobody acts; this is a line-order issue (bug 6). |
| FB | 7 | An NPC speaks right after two questions addressed to a non-existent NPC | «Nespola Tondi dice: «Sei Oreste?».», then Fulco's «Chiedo a Oreste se ha visto luci sulla collina», then Berta: «Lì, sulla paglia. Alle cinque era lì.», then «Oreste? Qui nessuno conosce questo nome.» | `ber_salgo_io` was refused for Nespola («nessun PNG risponde al suo posto»), yet the Berta line `sc_prossime_t4_…_7_01` went out in the same turn. Its content does not answer the Oreste questions. Bug 9 candidate. |
| PR | 6 | A request made to Berta gets Ugo's line and no refusal from Berta | Livia: «Dammi la chiave: ti riporto tuo figlio prima di mezzanotte, parola di soldato», then Ugo: «Paese. Sempre domande, mai carbone.» | Carisma 2, fallita. «Hanno rifiutato in questo turno: Berta Benni a Livia.» Berta's refusal is never told. Bug 9 candidate. |
| PR | 23 | The defeat ending says «vi» for the whole party | «Zirrà fruga nelle vostre bisacce, poi vi trascina giù per i gradini.» | The defeat path covers pg_livia, pg_nespola and pg_eliandro, all down and stable, none dead. So the attempt-4 defeat rule holds: no dead PC wakes up. The engine block still lists «Fulco Granito in piedi», but Fulco was never in the fight, so this is only a scope question. |

---

## 2. Bug tables (one row per bug per run)

### Bug 1: private content at the table

| run | turn(s) | verdict | verbatim quote(s) | engine state that decides it |
|---|---|---|---|---|
| CM | 1, 2 | not seen | Private actions: Nespola to Ugo «Tonio è vivo? Dimmi la verità, cmq non dico niente.»; Eliandro to Berta «Chi a Spinalba sa scrivere così bene le lettere comuni?» | Both got the discreet answer on their phones (`pg_nespola` at T1, `pg_eliandro` at T2). No later table line mentions Tonio being alive or who wrote the letters. |
| CA | 1, 2, 19 | not seen | Same as CM, plus T19 Livia: «Parla, e ti lascio andare. Dov'è il ragazzo?» | Discreet answers on the phones. T19 names "goblin", but `pubbliche` is empty, so no who-is-there line is said at the table. |
| FB | 5, 10, 13 | not seen | Private actions: T5 Nespola to Berta about Ugo's pay; T10 to «Madre Carla»; T13 Livia to «Oreste» | The T5 pick was refused; T10 and T13 got discreet answers. The table heard only stall material (`ber_stallo_giaciglio`, `nar_lavagna`), not the private content. |
| ST | 9, 13 | not seen (with a note) | T9, Livia to Ugo, privately: «chi passa dal cancello di notte?». At the table, Ugo then says: «La carbonaia di Ugo è accesa. Chi va a vedere, va al bosco.» | That Ugo line is `sc_prossime_t8_…_15_stallo_01`, which the Engine added for stall move n6, so it is by design. It gives the leads, not the private answer. T13 (Eliandro) got the discreet answer. |
| PR | 4, 5, 6, 8 | not seen | Private actions: T4 Nespola «monete vecchie con una torre sopra»; T5 Livia «Il balivo ti prende l'ovile alla prima neve»; T6 Eliandro «qualcuno a Spinalba parla con i goblin?»; T8 Eliandro's search (SUCCESSO, private) | At T5, `ber_conti_fienile` is logged as «battuta uscita» (2 lines) but does not appear among the table lines, so it presumably went to Livia's phone. No table line mentions the coins, the bailiff, debts or signs on the trees. |

### Bug 2: a fallen NPC who acts or speaks

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 12–25 | not seen | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» (T13, T18, T23) | Zirrà «esce dallo scontro … morto» at T12. No line has her act afterwards. Her tied strike at T12 is an engine fact («nello stesso istante in cui cade») and is told only as «Eliandro cade a terra.» |
| CA | 13–21 | not seen | Same who-is-there line at T15 | Zirrà dead at T13. Nothing has her act afterwards. |
| FB | — | n/a | — | No NPC fell. |
| ST | — | n/a | — | No NPC fell. |
| PR | — | not seen | — | No NPC fell. Surprised Zirrà acting (T11, T13) is listed in §1 as unsure. |

### Bug 3: a PC at 0 HP who acts, or a missing death save

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 12, 15 | only a player claim | Player lines: «Vedo Nespola a terra.» (T12) and «Ho zero punti ferita, sono a terra.» (T15). Both were dropped from the announcements. | Nespola was never at 0 HP: «Nespola Tondi in piedi» in every turn. |
| CM | 12–15, 23–24 | not seen | «Eliandro muore.» (T15), «Livia muore.» (T24) | Eliandro: A TERRA at T12, save at T15 (2 → MORTO), no action in between. Livia: A TERRA at T23, save at T24 (6 → MORTO). No save is missing. |
| CA | 11–13 | not seen | «Eliandro muore.» / «Nespola muore.» (T13) | Nespola A TERRA at T11, Eliandro at T12. Both saved at T13 and failed (MORTO). Neither acted. No save is missing. |
| FB, ST | — | n/a | — | No fight. |
| PR | 18 | unsure (see §1) | The T18 sequence | Eliandro's action was resolved first, then he fell. The heard order is inverted. |
| PR | 16–23 | not seen otherwise | «Nespola respira ancora, ma non si muove.» (T16) | Nespola: A TERRA at T16, save the same turn (17 → stabile). Eliandro: save at T19 (10 → stabile). Livia: save at T23 (15 → stabile). No save is missing. |

### Bug 4: dice card against the narration heard at the table

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 4, 19, and NPC misses | no contradiction heard; T19 unsure | T4: «Nespola ci riesce.» T19: see §1. | T4: Ascoltare 18, riuscita. The success is told only by the by-design acknowledgement; nothing says what she hears (the clock horn follows).<br>NPC misses at T7, T8, T10, T11, T13, T16, T18, T22 and T25 are only on the card: no line, but no contradiction either. |
| CA | 4 | not seen | «Nespola ci prova, ma non ci riesce.» | Matches Ascoltare 85, fallita. `nar_impronte` was refused after the failure. |
| FB | 1 | not seen | T2 (late): «Non la vendi, halfling. Tonio è lassù.» | Carisma 8, fallita. The refusal is told, late. |
| ST | — | n/a | — | No rolls. |
| PR | 6, 9, 16 | not seen (two weak spots) | T9: «Nespola Tondi: «Mi arrampico sulla roccia per vedere la torre prima degli altri».», after which nothing says what she sees. T16: «Livia ci prova, ma non ci riesce.» | T9: Scalare pareti 20, riuscita, a success with no told effect.<br>T6: Carisma 2, fallita; Berta's refusal is never told.<br>T16 matches its cards. |

**No social check passed in any run.** The attempt-4 rule («passed check, then a refusal from that NPC») therefore has no case to apply to.

### Bug 5: an attack narrated with no card

| run | turn(s) | verdict | quote | engine state |
|---|---|---|---|---|
| CM | 8, 11 | fixed by a guard (the scriptwriter filter) | — (not heard) | Two late `sc_` lines that told attacks no card had (T6 Grosso on Nespola, T10 Zirrà on Livia) were dropped. The player's «Il goblin mi tira la lancia» (T10) was dropped from the announcement. |
| CA | 7, 8, 11 | fixed by a guard | — | Same mechanism, three invented attacks dropped (T6 Eliandro on Zirrà, T6 Grosso on Nespola, T10 Zirrà on Livia). |
| FB, ST | — | n/a | — | No fight. |
| PR | 12, 14, 18 | fixed by a guard | — | Eliandro's T11 attack and Livia's T17 attack had no roll, and Nespola's T12 attack missed. The `sc_` lines that told those hits were dropped. |

### Bug 6: initiative

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 6 (roll), then every round | Seen: order rolled and said every round. Out of order: T6 and T24. Unsure (engine): T6/T8. | T6: «Ordine del round: Nespola, Grosso, Livia, Zirrà, Eliandro.», said after announcements given in input order (Eliandro, Livia, Nespola).<br>T24: «Livia muore.», then «Ordine del round: Livia, Nespola, Grosso.» | `combattimento: inizia` at T6, then `iniziativa ritirata` at T9, T11, T14, T16, T18, T20, T22, T24 and T25.<br>Engine-level: Livia attacks at T6 and again at T8 within round 1, and Grosso (initiative 5) only acts at T7, after Livia (initiative 3). |
| CA | 6 (roll), then every round | Seen: order rolled and said every round. Out of order: T6. | T6: «Ordine del round: Livia, Eliandro, Nespola, Grosso, Zirrà.», while the announcements were heard in the order Eliandro, Livia, Nespola. | `inizia` at T6, plus 11 re-rolls (T9–T21). |
| FB, ST | — | n/a | — | No fight. |
| PR | 11 (roll, with surprise), then every round | Seen. Out of order: T11 (input order) and T18 (the fall and the order line before Eliandro's own announcement). | T11: «Ordine del round: Nespola, Livia, Grosso, Zirrà, Eliandro.», after the announcements Eliandro, Livia, Nespola. T18: see §1. | `inizia` at T11 with «sono colti di sorpresa». Re-rolled at T14, T16, T18, T19, T20, T21, T22 and T23. |

### Bug 8: stall

**Counting rule (same for all five runs).**
- **Denominator:** the turns that have at least one player action.
- **No-new turn:** a turn whose answer, after the action, has only announcements, fillers (`*_attesa*`), acknowledgements and order lines.
- **What counts as new:** cards, engine facts (hits, falls, who is really there), clues, leads, clock marks and consequences.

| run | turn(s) | verdict | quote | engine stall lines |
|---|---|---|---|---|
| CM | 2, 14 | 2/18 answers with nothing new | T14: «Dal buco nel muro arriva un soffio freddo, e le ombre dei muri tremano.» (ambient only) | `fermi` 0 (T1), 1 (T2). No E12 line, no stall move. |
| CA | 2, 10, 18 | 3/17 | T10: no line after «Livia Sarti: «La paro con lo scudo. Resisto».» | `fermi` 0 (T1), 1 (T2). No stall move. |
| FB | 2, 7, 8 | 3/13 | T8: «Se non sale nessuno, aspetto qui con la chiave. E all'alba sarò sola.» | `fermi` runs 1→3 (T3–T5), resets to 0 at T6 (a clock mark was said), then runs 1→7 (T7–T13).<br>Stall moves at T5, T9, T10, T11, T12 and T13, all right (§6).<br>«stall lines asked of the scriptwriter» at T9 and T13. |
| ST | 3, 12, 13, 14 | 4/14 | T14: «Allora?» (a bare hand-back) | E12 at T4 (stallo 1) and T6 (stallo 3).<br>Stall moves at T4–T12 (9 of them), all right (§6).<br>`fermi` runs 1→11, then resets to 0 at T13.<br>Unsure: the reset at T13 came on a private question («Dimmelo, poi vado»), which is a promise, not a move. As a result T14 («Ci pensiamo domani») got only «Allora?» and no stall move, which looks like a missed stall move. |
| PR | 3 | 1/18 | T3: «Nello stazzo una pecora bela, e un'altra le risponde.» | `fermi` 1 (T3), then 0 at T4, T5 and T8. No stall move. |

### Bug 9: NPC presence, or an NPC answering for another

| run | turn(s) | verdict | quote | engine state |
|---|---|---|---|---|
| CM | 1 | not seen | «Tra i faggi, il mulo di Ugo è già un'ombra.» | Ugo leaves at T1 and reappears only in the next scene (the charcoal kiln). |
| CA | 1 | not seen | Same | Same |
| FB | 7 | unsure (see §1, noted) | «Lì, sulla paglia. Alle cinque era lì.» | The questions were addressed to the non-existent Oreste. |
| ST | 5 | not seen (minor continuity slip) | «Sotto il portico Berta non si muove», then «Berta torna dal fienile con le mani vuote.» | A late line and the stall clue contradict each other on where Berta is. Nobody left the scene. |
| PR | 6 | unsure (see §1, noted) | «Paese. Sempre domande, mai carbone.» | Livia's words were addressed to Berta. |

### Bug 10: verbatim repeats, or the player's words restated as narration

| run | turn(s) | verdict | quote | note |
|---|---|---|---|---|
| CM | — | not seen | — | The only repeated lines are Engine lines (the who-is-there line three times, the acknowledgements, the order lines), which the brief excludes. |
| CA | 7/8, 13/14 | not seen | «Zirrà incassa il colpo.» (T7, T8); «Livia incassa il colpo.» (T13, T14) | Engine R-dovuto lines, by design. |
| FB | 2/3 | seen (near-verbatim tic) | T2: «Tonio, capisci? Le pecore non aspettano.»<br>T3: «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | No R-ripetuta fired. |
| ST | 2/12 | seen (a verbatim sentence) | T2: «Mio figlio è lassù. Le pecore non aspettano.»<br>T12: «Le pecore non aspettano.» | Not dropped at T12. R-ripetuta dropped the same tic later, at T14. |
| PR | 4/6 | fixed by a guard | «Ugo batte la pala per terra due volte.» (dropped at T6) | R-ripetuta. |

No run had the player's words restated as narration beyond the by-design announcement.

---

## 3. The announcement

**Announcements whose kept clause is false for the engine, heard as narration: 0 certain H.** The four kept-clause cases above (CM T12, CM T23, CA T18, PR T15) are unsure and are not in the H total.

**Attributed (not H):** each of these is the PC's own first-person act or speech, and the false part is only a target noun phrase or an in-character claim.

| run | turn | announcement heard | what is false for the engine |
|---|---|---|---|
| CM | 9 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | Nobody has a spear. The roll was against Zirrà (short sword). |
| CA | 8 | Same | Same |
| CM | 10 | «La paro con lo scudo. Resisto» | Parries an attack no card has (the spear throw was dropped from the announcement). |
| CA | 10 | Same | Same |
| CM | 14 | «Spingo il goblin contro il muro con lo scudo e lo colpisco» | «il goblin» (Zirrà) is dead, and «lo colpisco» has no card: «nessun tiro».<br>In CA T13 the same quote is true: Zirrà was alive, and the card says «COLPITO, 9 danni». |
| CM | 22 | «Finisco quello con la lancia, colpo di spada lunga» | There is no such creature, and no roll. |
| CA | 17 | Same | Same |
| FB | 1 | «La vendo a Valdirame e chiudo il conto» | Berta has the key. |
| FB | 4 | «Anch'io vado al mulino» | There is no mill. |
| FB | 12 | «Ci fermiamo al mulino a dormire» | There is no mill. |
| FB | 6 | «Andiamo al guado» | There is no ford. |
| FB | 7 | «Chiedo a Oreste se ha visto luci sulla collina» | Nobody is named Oreste. |
| FB | 9 | «Dove vai con quel carico?» | There is no traveller. |
| FB | 11 | «Madre Carla, sei una vecchia ladra, e il carretto lo sequestro» and «Madre Carla, dai, ti benedico e ti lascio andare» | Nobody is named Carla, and there is no cart. |
| PR | 2 | «Mi devi tre argenti» | The engine has no such debt. |
| PR | 11 | «Lancio il dardo incantato sulla sentinella, subito» and «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta» | Nobody answers to «sentinella», and there was no roll for either. |
| PR | 12 | «Lo colpisco di nuovo, poi gli passo alle spalle» | The card says «Spada corta 5, fallita», and no line tells the miss. |
| PR | 19 | «Ne tengo uno contro il muro: Dov'è il ragazzo?» | No roll; the engine says «riesce se è possibile». |

**Claims correctly dropped:**
- CM and CA: «Vedo tre goblin», «Il goblin mi tira la lancia», «Ho zero punti ferita», «Vedo Nespola a terra», «Io sono la più veloce».
- PR: «Guardo dentro la porta: tre o quattro goblin», «Vedo una sentinella goblin!», «Ne arriva un altro», «È quasi mezzanotte!».

**Announcement defects (not H): the PC's own words were dropped or cut.**
- FB T2: «Dimmi la verità o me ne vado» dropped. Berta answers it later anyway: «Se vuoi andartene, il cancello è aperto, soldata.»
- FB T7: «Mi vendi un formaggio, dai?» dropped.
- FB T9: «Madre Carla?» dropped.
- FB T11:
  - Livia's own act «Blocco le ruote con lo scudo» was dropped.
  - Fulco's sentence was cut before «ma prima mi dici la strada per la grotta».
- ST T1: «Aspettiamo qui o andiamo?» dropped.
- ST T10: «Io non mi fido di Ugo, mi sa che tiene le cose per sé» and «Qualcuno sente qualcosa?» dropped. Both are answered later.
- ST T11: «Aspettiamo che torni.» dropped. Berta answers it at T12.
- PR T2: «Dimmi la strada per la torre o te li riscuoto davanti a tutti» dropped.
- CM/CA T1: «Berta, la torre è quella sopra il bosco?» dropped.
- FB T1: «Berta, questa chiave vale più di tuo figlio, lo sai?» dropped.

---

## 4. Over-fire check

Each row is a `coerenza: violazione`, a refused pick, or (an extra row, beyond what the brief asks for) a scriptwriter-filter WARN.

**One rule for the filter rows.** A dropped late line is **right** when saying it at the turn it is logged in would do one of these:
- tell an outcome that no card of its own turn has (invented);
- repeat an outcome the table already heard;
- contradict a state that has changed since.

It is **wrong** when its outcome matches its own turn's card, was never told, and still matches the state and the current cards when it arrives.

| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | refused pick `nar_impronte` | (not said; the Engine acknowledgement is «Nespola ci riesce.») | right | Listening is not looking at goblin tracks; the only overlap is «senti». |
| CM | 8 | extra: filter `sc_subito_t6_…_10_1` | (Grosso misses Nespola) | right | T6 has no Grosso attack, so the line is invented. |
| CM | 11 | extra: filter `sc_subito_t9_…_16_1` | (Eliandro misses Zirrà) | right | It matches the T9 card, but the table already heard it at T9 («Eliandro manca Zirrà.»): a repetition. |
| CM | 11 | extra: filter `sc_subito_t10_…_18_1` | (Zirrà misses Livia) | right | No Zirrà attack at T10. The line was invented from the player's «Il goblin mi tira la lancia». |
| CM | 12 | R-dovuto ×2 | «Zirrà cade a terra.» / «Eliandro cade a terra.» | right | Card facts the narration had not told. |
| CM | 13 | extra: filter `sc_subito_t11_…_21_1` | (Eliandro misses Zirrà) | right | It matches the T11 card, and the miss was told then only as «Eliandro ci prova.», but Zirrà has been dead since T12, so the state has changed. |
| CM | 13 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» | right | The player said «Il goblin» was hitting her, and the only goblin is dead. |
| CM | 14 | refused pick `nar_mappa`, replaced by `sc_prossime_t7_…_13_6` | «Dal buco nel muro arriva un soffio freddo, e le ombre dei muri tremano.» | right (the refusal) | Shoving someone into a wall is not studying the charcoal marks. The replacement line does not answer the attack, though. |
| CM | 15 | R-dovuto | «Eliandro muore.» | right | Card fact. |
| CM | 18 | R-inesistente | Same who-is-there sentence | right / unsure | «Ehi goblin! Chi vi paga?» probably meant Grosso, the only enemy standing (a hobgoblin). The line is true and harmless, but Livia's question then got no NPC answer. |
| CM | 20 | R-dovuto | «Livia incassa il colpo.» | right | Card fact. |
| CM | 22 | extra: filter `sc_subito_t20_…_36_1` | (Grosso hits Livia) | right | Already told at T20 («Livia incassa il colpo.»), and the T22 card is a miss. |
| CM | 23 | R-dovuto | «Livia cade a terra.» | right | Card fact. |
| CM | 23 | R-inesistente | Who-is-there | right | «Ultimo goblin», but there is no goblin in the scene. |
| CM | 24 | extra: filter `sc_subito_t22_…_39_2` | (Grosso misses Livia) | right | Never told, but Livia is dead at T24, so the state has changed. |
| CM | 24 | R-dovuto | «Livia muore.» | right | Card fact. |
| CA | 4 | refused pick `nar_impronte` (after a failed check) | — | right | Ascoltare 85, fallita. |
| CA | 7 | extra: filter `sc_subito_t6_…_8_1` | (Eliandro hits Zirrà) | right | Eliandro made no attack at T6, so the line is invented. |
| CA | 7, 8 | R-dovuto | «Zirrà incassa il colpo.» | right | Card facts. |
| CA | 8 | extra: filter `sc_subito_t6_…_10_1` | (Grosso misses Nespola) | right | Invented. |
| CA | 10 | extra: filter `sc_subito_t8_…_14_1` | (Eliandro hits Zirrà) | right | Already told at T8. |
| CA | 11 | extra: filter `sc_subito_t10_…_18_1` | (Zirrà misses Livia) | right | Invented. |
| CA | 11 | R-dovuto | «Nespola cade a terra.» | right | Card fact. |
| CA | 12 | R-dovuto | «Eliandro cade a terra.» | right | Card fact. |
| CA | 13 | refused pick `nar_mappa` | — | right | An attack turn; the only overlap is «muro». |
| CA | 13 | R-dovuto ×4 | «Zirrà cade a terra.» «Livia incassa il colpo.» «Eliandro muore.» «Nespola muore.» | right | Card facts. |
| CA | 14 | extra: filter `sc_subito_t12_…_22_1` | (Eliandro misses Zirrà) | right | Already told at T12, and both are dead. |
| CA | 14 | R-dovuto | «Livia incassa il colpo.» | right | Card fact. |
| CA | 15 | R-inesistente | Who-is-there | right / unsure | Same as CM T18. |
| CA | 16 | extra: filter `sc_subito_t14_…_26_1` | (Grosso hits Livia) | right | Already told at T14, and the T16 card is a miss. |
| FB | 5 | refused pick `ber_conti_fienile` (private action) | — | unsure, leaning wrong | The action says «quanto ti pagava Ugo per il carbone?». «pagava» is the theme word «pagare» in another form, and the theme matcher missed it. The line would have gone only to the phone. |
| FB | 7 | refused pick `ber_salgo_io` | — | right | The action is addressed to Oreste, and no NPC should answer in his place. (A Berta `sc_` line went out anyway; see §1.) |
| ST | 5 | refused pick `nar_recinto` | — | right | Sitting on the wall is not examining the gate; the only overlap is «stazz». |
| ST | 14 | R-ripetuta (`ber_attesa`) | «Le pecore non aspettano, e quelli lassù nemmeno.» dropped; the table heard only «Allora?» | right | The tic was already said at T2 and T12, and the dropped line was neither an outcome nor a needed prompt. What is left is a bare hand-back. |
| PR | 4 | refused pick `ber_conti_fienile` (private action) | — | right | Old coins with a tower on them are not debts or the bailiff. |
| PR | 6 | R-ripetuta (`ugo_attesa`) | «Ugo batte la pala per terra due volte.» dropped | right | The same gesture was heard at T4 («Ugo batte la pala per terra due volte, e sputa di lato.»). |
| PR | 8 | refused pick `nar_impronte` | — | right | Moving along the path is not looking at the tracks; the only overlap is «senti». |
| PR | 12 | extra: filter `sc_subito_t11_…_19_1` | (Eliandro hits Zirrà) | right | No roll at T11, so the line is invented. |
| PR | 13 | R-dovuto | «Zirrà incassa il colpo.» | right | Card fact. |
| PR | 14 | extra: filter `sc_subito_t12_…_23_1` | (Nespola hits Grosso) | right | The T12 card says «Spada corta 5, fallita». |
| PR | 15 | R-dovuto | «Eliandro incassa il colpo.» | right | Card fact. |
| PR | 16 | R-dovuto | «Nespola respira ancora, ma non si muove.» | right | Card fact (stable). |
| PR | 18 | extra: filter `sc_subito_t17_…_34_1` | (Livia hits Grosso) | right | No roll at T17, so the line is invented. |
| PR | 18 | R-dovuto | «Eliandro cade a terra.» | right fact, wrong placement | It was placed `prima_dell_invito: true`, so the table heard it before Eliandro's own announcement (§1). |
| PR | 19 | refused pick `nar_mappa` | — | right | Pinning an enemy against the wall is not studying the marks. |
| PR | 19 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | Card fact. |
| PR | 20 | refused pick `nar_conto` | — | right | The only overlap is «canti», from «cantina». But Livia's move down the cellar stairs then got no line at all. |
| PR | 22 | extra: filter `sc_subito_t20_…_40_1` | (Zirrà misses Livia) | **wrong** | It matches its own turn's card (T20: «Zirrà manca Livia»), the miss was never told, and the state is unchanged: the T21 and T22 cards also have Zirrà missing Livia. |
| PR | 22 | R-dovuto | «Livia incassa il colpo.» | right | Card fact. |
| PR | 23 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | Card fact. |

**Totals:**
- `coerenza: violazione`: CM 9, CA 10, FB 0, ST 1, PR 8. All right; one (PR T18) is misplaced.
- Refused picks: 11. 10 right, 1 unsure leaning wrong (FB T5).
- Scriptwriter filters: 16. 15 right, 1 wrong (PR T22).
- No line was moved to a phone. No PC was told «ancora in piedi».
- Every stall move is right (§6).

---

## 5. PR: player actions that touch a secret

I inferred these secrets from the ids in the logs:
- clues `i_lavagna`, `i_giaciglio`, `i_pali`;
- perils `p_balivo`, `p_inverno`, `p_sospetto`, `p_zirra`;
- the themes of `ber_conti_fienile`: debiti, debito, soldi, decima, balivo, pagare;
- `nar_piccone`, in which Tonio frees himself and brings Zirrà a pick unprompted.

| turn | action (public/private) | secret word | did the table confirm it early? |
|---|---|---|---|
| 2 | public, Eliandro: «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.» | who wrote the slate (`i_lavagna`) | No H. The table heard the `nar_lavagna` description («Le lettere sono grandi e tonde…», «Ogni erre è rovesciata…»), which he earned with Intelligenza 14 against CD 13. It does not confirm who wrote it. |
| 4 | private, Nespola: «Tonio aveva monete vecchie con una torre sopra?» | old coins / treasure (inferred) | No H. No table line; the pick was refused. |
| 5 | private, Livia: «Il balivo ti prende l'ovile alla prima neve, lo sai?» | `p_balivo`, `p_inverno`, `ber_conti_fienile` | No H. `ber_conti_fienile` is logged as said but does not appear in the table lines (presumably on Livia's phone). |
| 6 | private, Eliandro: «qualcuno a Spinalba parla con i goblin?» | Tonio's complicity / `p_sospetto` | No H. No table line. The `nar_piccone` reveal at T11 is the tower scene's own prepared opening, at its proper time. |
| 18 | public, Eliandro: «Chi vi ha dato le lettere per scrivere?» | `i_lavagna` | No H. No answer at all. |

**PR secret H = 0.**

---

## 6. ST and FB: stall moves, and what the Engine put at the table

| run | turn | move | the table's action | what the Engine put at the table | verdict |
|---|---|---|---|---|---|
| FB | 5 | S1, soft | Nespola's private question to Berta about Ugo's pay | Prepared `nar_stallo_ovile_corno`: «Dal crinale arriva un colpo di corno, lontano.» | right |
| FB | 9 | S1, soft (count restarted after the T6 reset) | Fulco questions the non-existent «Madre Carla» | Prepared `ber_stallo_paese`: «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» | right |
| FB | 10 | S2, clue `i_giaciglio` | Nespola, privately, to «Madre Carla» | Prepared clue `ber_stallo_giaciglio`: «Mancano gli stivali buoni e il mantello. E il pane della settimana, tutto.» | right |
| FB | 11 | S3, leads | Livia and Fulco talk to «Madre Carla» about the cart | Filler `sc_prossime_t8_…_13_04` («Dal fienile i cani guaiscono…»), then prepared `ber_stallo_bosco`: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» | right |
| FB | 12 | hard S1 (a mark on `o_mezzanotte`) | «Ci fermiamo al mulino a dormire» (there is no mill) | Clock line `nar_segno_2`: «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | right |
| FB | 13 | S2, clue `i_lavagna` | Livia, privately, to the non-existent Oreste | Clue line `nar_lavagna`: «Le lettere sono grandi e tonde, tracciate piano con il carbone.» | right |
| ST | 4 | S1, soft (E12 stallo 1) | «Aspetto.» | Prepared `nar_stallo_ovile_corno` | right |
| ST | 5 | S2, clue `i_giaciglio` | «Mi siedo sul muretto dello stazzo.» | Prepared clue `ber_stallo_giaciglio` | right |
| ST | 6 | S3, leads (E12 stallo 3) | «Guardo in giro.» | Clock line `nar_segno_1`, then prepared `ber_stallo_bosco` (the leads) | right |
| ST | 7 | hard S1 (a mark) | «Aspetto ancora. Tanto Berta ci chiama, no?» | Clock line `nar_segno_2`, heard before the announcement | right |
| ST | 8 | S2, clue `i_lavagna` | «Ci penso. Aspetto.» | Clue line `nar_lavagna` | right |
| ST | 9 | S3, leads | Livia's private question to Ugo | Scriptwriter stall line `sc_prossime_t8_…_15_stallo_01`: «La carbonaia di Ugo è accesa. Chi va a vedere, va al bosco.» (Ugo refers to himself in the third person.) | right |
| ST | 10 | hard S1 (a mark) plus consequence `o_mezzanotte@3` | The PCs question each other | Clock line `nar_segno_3` («I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.»), then consequence `ber_pazienza`: «La notte non aspetta nessuno. Se non salite voi, lassù ci salgo io.» | right |
| ST | 11 | S2, clue `i_pali` | «Non so, ha detto poco.» | Clue line `nar_pali`: «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» | right |
| ST | 12 | S3, leads | «Mi siedo di nuovo. Cosa facciamo adesso?» | Scriptwriter `sc_prossime_t11_…_22_07`: «Berta ricorda la carbonaia di Ugo, accesa tra gli alberi.» It was heard before the announcement, and it is the third time the same leads were given. | right |

---

## 7. Unanswered public actions and late lines, per game

**Two counts for unanswered public actions:**
- **"Nothing at all":** after the announcement, no line responds to the action, either in that turn or later.
- **"Filler only":** the only line placed after it is a waiting or ambient line that is not about the action (`*_attesa*`, an unrelated `sc_prossime`, or an unrelated scene beat).

**What counts as an answer:** a stall move counts as the designed answer to a waiting action. Engine who-is-there and no-such-name lines count as answers.

| run | public actions | nothing at all | filler only | turns (who) |
|---|---|---|---|---|
| CM | 21 | 4 | 4 | Nothing at all: T10 Livia, T15 Nespola, T20 Livia, T22 Livia.<br>Filler only: T4 Livia, T6 Livia (miss on the card only), T8 Livia (miss on the card only), T14 Livia. |
| CA | 18 | 5 | 4 | Nothing at all: T10, T14, T16, T17, T18 (all Livia).<br>Filler only: T4 Livia, T6 Eliandro, T6 Livia, T6 Nespola. |
| FB | 13 | 0 | 2 | Filler only: T6 Nespola, T11 Livia. |
| ST | 13 | 0 | 0 | — |
| PR | 25 | 5 | 6 | Nothing at all: T9 Livia, T17 Livia, T18 Eliandro, T19 Livia, T20 Livia.<br>Filler only: T6 Livia, T9 Nespola, T11 Eliandro, T11 Livia, T11 Nespola, T12 Nespola. |

In combat, the "nothing at all" cases are mostly attacks whose target could not be resolved, so they got no roll and no line: «la sentinella», «quello con la lancia», «quello in fondo».

**Lines that reached the table late.** "Un-id'd" means the line had no id in the log and was heard before the turn's first player action; I presume these are `sc_subito`. The second column lists id-logged `sc_prossime_tN` lines, which were prepared ahead and used at a later turn.

| run | un-id'd late lines | `sc_prossime` used at a later turn |
|---|---|---|
| CM | 5 blocks: T7 ×2 (for T6), T8 ×1 (for T7), T19 ×2 (for T16/T18) | T14 (t7), T23 (t18) |
| CA | 2 blocks: T10 (for T9), T18 (for T15: Grosso «Fame. Io non so. Hai carne?») | none |
| FB | 4 blocks: T2, T3, T4, T13 (Berta, each for the previous turn) | T4 (t3), T6 (t1, t4), T7 (t4), T9 (t3), T11 (t8) |
| ST | 10 blocks: T2, T4, T5, T7, T8, T9, T11 ×2, T12, T13 | T2 (t1), T9 (t8, stall line), T12 (t11) |
| PR | 7 blocks: T2, T4, T9 ×2, T14, T15, T17 | T2 (t1), T4 (t1), T5 (t3) |

Late lines that were dropped before the table: CM 6, CA 6, PR 4 (see §4).

---

## 8. Summary

1. **H at the table after the checker:** 0 certain H in all five runs. The unsure items are CM 3, CA 1, PR 3; FB and ST have none.
2. The strongest open item is **PR T18, a line-order bug.** The Engine says «Eliandro cade a terra.» and the round order before Eliandro's own announcement, so the table hears a fallen PC speak even though the engine resolved his action first. CM T24 is the same mechanism and is harmless there.
3. **Kept false world clauses are the remaining announcement risk:** «che la sta per colpire» (CM T12), «che scappa verso le scale» (PR T15) and «Ultimo goblin:» (CM T23, CA T18). Plain targets and in-character claims are attributed and are not H.
4. **The guards work.** All R-dovuto and R-inesistente events and all stall moves are right. 15 of 16 scriptwriter filters are right; the exception is PR T22, which dropped a correct miss. FB T5's refusal missed «pagava» against the theme «pagare».
5. **Bugs that are really present:**
   - bug 6 line order: PR T18, CM T24, and announcements in input order at the start of each fight;
   - bug 8: a stall-count reset on «poi vado» at ST T13;
   - bug 10: the «Le pecore non aspettano» tic (ST T2/T12, FB T2/T3);
   - many combat actions left with no answer (CM 8, CA 9, PR 11), and NPC misses told only on the card.

   These are not seen: bugs 1 and 2, bug 3 in engine terms, and any heard bug 5. No social check passed, and the PR defeat ending keeps every PC alive.

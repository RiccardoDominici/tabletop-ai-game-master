# Evidence table: final round attempt 5, profile A (CM, PR)

Sources read: only the two evidence views named in the brief. Campaign files, `driver.log` and the `.out` files were
not opened, so anything about what a line's trigger or a campaign secret is comes from the views and is marked
**inferred**. The CM view has no Turno 18, 20, 22 or 24, so I cannot judge those turns. In both views every
«Carte dei dadi sul proiettore» line is printed twice in the same turn. That is a display duplicate, not a spoken line.

Rule I used for announcements. **Attributed**: the false element is the object or target of the PC's own
first-person verb, after «Nome:» or «Nome dice:». **Unsure**: the announcement kept a clause whose subject is someone
else, or a world statement, and the engine says it is false (attempt-3 rule). **H**: the narrator or an NPC voice
asserts it. Late lines are judged against the cards of the turn they answer, not the turn in which they were heard.

---

## 1. H table per run (success criterion: H heard at the table after the checker, target 0)

| run | certain H | unsure (not counted) |
|---|---|---|
| CM | **0** | 3 |
| PR | **1** | 2 |

### CM

| # | turn | class | verbatim quote (table) | engine state that decides it | verdict |
|---|---|---|---|---|---|
| U1 | 9 | surprised NPC speaking in its lost round (attempt-4 rule)? | «Grosso succhia l'osso, con un rumore lungo.» / «Grosso: Fame. Sempre fame.» | T9 facts: «Grosso: Sorpreso finisce.» and «Round 2, iniziativa ritirata» come before the narration. The T9 coherence block lists «Grosso in piedi» with no Sorpreso tag, while T8's block still had it. The table hears his line before «Ordine del round: Nespola, Livia, Eliandro, Grosso.» | **unsure, not H**. The deciding fact is the T9 block: for the engine, Grosso is already out of surprise when he speaks. A listener still hears him before the round-2 order |
| U2 | 17 | announcement kept a clause with another subject, false for the engine | «Eliandro: «Lancio il dardo incantato al goblin che la sta per colpire».» | No goblin is attacking Nespola. Zirrà has been dead since T8. Grosso's only attack this turn is on Eliandro (Mazza ferrata 21 → Eliandro A TERRA) | **unsure**. The frame is first person, but the clause «che la sta per colpire» has the goblin as subject; it is the kind of clause the announcement should drop |
| U3 | 23 (late line for T21) | late line vs the card of the turn it answers | «La mazza ferrata scende di un palmo e resta lì, a mezz'aria.» | T21 card «Grosso: Mazza ferrata 2, fallita» (DISASTRO vs Livia). Both the line and the card have no hit | **unsure, not H**. The outcome (no hit) matches the miss; only the swing is softened. Contrast with PR T15, where a hit is denied |

### PR

| # | turn | class | verbatim quote (table) | engine state that decides it | verdict |
|---|---|---|---|---|---|
| H1 | 15 (late line for T14) | outcome against its card | «Nessun dardo parte: sul pavimento di pietra, vicino al fuoco, il mantello grigio resta fermo.» | T14 card «Eliandro: Dardo incantato 2 contro soglia 0, riuscita». Fact: «COLPISCE, 2 danni; Zirrà è ferito gravemente». The table had already heard «Eliandro colpisce Zirrà.». Zirrà downed Eliandro only after his dart | **H**. The line denies a dart that hit. It is the attempt-4 class: the writer treated Eliandro as dead before the act he took before falling. Other reading: "no further dart". I reject it because Eliandro declares no dart after T14, so the line can only attach to the T14 dart |
| U1 | 20 (late line for T19) | NPC line confirming a held creature the engine does not have | «Zirrà: Lascia andare il mio, o la corda diventa un cappio.» | Livia's T19 «Ne tengo uno contro il muro» got «nessun tiro: l’azione riesce se è possibile», with no target named. The engine has no held or grappled state. Grosso rolls against Livia in T19 (twice) and in T20, so he is not held | **unsure**. If «il mio» is a third goblin, this is an H (a creature nobody has). If it is Grosso, it states a hold the engine does not track |
| U2 | 11 | secret confirmed before its time? | «Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.» | Prepared line `nar_piccone`, given as the reader's pick for Eliandro's «Lancio il dardo incantato sulla sentinella, subito», which it does not answer. Eliandro asked in private in T6 «qualcuno a Spinalba parla con i goblin?» | **unsure, not H**. It is a visible scene event in the tower, where the truth is on view. Whether its trigger was met is **inferred** only |

Announcement H: CM 0 (U2 above is unsure), PR 0. Section 3 lists all of them.

---

## 2. Tables per bug

### Bug 1: private content at the table

| run | turn(s) | verdict | verbatim quote(s) from the table | engine state that decides it |
|---|---|---|---|---|
| CM | 1, 2, 26 | not seen | T1, after Nespola's private question to Ugo: «Berta resta sotto il portico, con la chiave stretta nel pugno.» | `fatti_privati` for pg_nespola (T1), pg_eliandro (T2) and pg_livia (T26); each got «discreet answer on its phone». No later public line retells them |
| PR | 4, 5, 6, 8 | not seen | T4: «Berta Benni: Se non sale nessuno, aspetto qui con la chiave. E all'alba sarò sola.» (about the key, not the coins). T9: «Ugo Faggioli: Lassù? Cosa cerca, lei? Le ghiande?» (answers Livia's public «guardo i rami») | T5: `ber_conti_fienile` (themes balivo/debiti) is logged as said but is not among the table lines (**inferred**: on Livia's phone). T6 and T8 got discreet phone answers |

### Bug 2: a fallen NPC who later acts or speaks

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 8–26 | not seen (the goblin acts only in players' words and announcements) | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» (T9, T13, T17, T21, T25). T12 late: «Nessuna lancia vola nella torre: l'unica arma alzata è la mazza ferrata di Grosso.» | T8 `esce dallo scontro` png_zirra morto. After T8 no narrator or NPC line has Zirrà, or any other goblin, act, speak, be hit or die |
| PR | — | n/a (no NPC falls) | — | Zirrà is «ferito» and Grosso «in piedi» to the end. For «Lascia andare il mio» see 1-PR-U1 |

### Bug 3: a PC at 0 HP who acts; death saves

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 15 | only a player claim | player «Ho zero punti ferita, sono a terra.» → announcement «Nespola Tondi: «Striscio dietro la pietra».» | Nespola is «in piedi» in every block and is never hit in CM: she was **not** at 0 HP |
| CM | 13 | only a player claim | player «Il goblin mi prende alla spalla, sento sangue.» → «Nespola Tondi: «Indietreggio ma resto in piedi».» | Card: Grosso hits **Eliandro** (2 dmg), not Nespola |
| CM | 17 → 19 | not seen | «Eliandro cade a terra.» (T17); «Eliandro muore.» (T19) | T17: Eliandro A TERRA. T19: death save 4 vs CD 10, «è MORTO». No Eliandro action in between (T18 is not in the view) |
| PR | 14 | not seen | «Eliandro colpisce Zirrà.» / «Eliandro muore.» | Eliandro hits, then Zirrà downs him. Round-2 death save 8 vs CD 10 → MORTO. His own act was announced first (attempt-4 rule respected) |
| PR | 18–22 | not seen | «Nespola respira ancora, ma non si muove.» | Nespola A TERRA, save 16 → stable, «privo di sensi». She has no action from T19 to T22 |
| PR | 22 | not seen | «Livia muore.» | Grosso crit → A TERRA, then save 6 → MORTO. Note: Fulco Granito is «in piedi» in every block but is never a combatant, while the fact says «Nessuno è in piedi per soccorrerli». Unsure whether Fulco is at the table at all |

### Bug 4: dice card vs narration heard at the table

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| PR | 15 (for T14) | **seen: H** (1-PR-H1) | «Nessun dardo parte: sul pavimento di pietra, vicino al fuoco, il mantello grigio resta fermo.» | T14: «Dardo incantato … riuscita», «COLPISCE, 2 danni» |
| CM | 4 | seen (minor): a success with no content | «Nespola ci riesce.» | Ascoltare 9 vs 30 → SUCCESSO. `nar_impronte` was refused. The only line after it is the clock mark «Dal crinale scende un corno di capra, lungo e stonato.» |
| PR | 9 | seen (minor): a success with no effect | «La carbonaia sbuffa, e da una crepa esce una lingua di fuoco.» | Scalare pareti 36 vs 80 → SUCCESSO. What she sees of the tower from the rock is never told |
| CM | 6, 7, 8, 10, 12, 13, 17, 19 | not seen (each line matches its card) | «Zirrà incassa il colpo.» «Nespola manca Zirrà.» «Zirrà cade a terra.» «Nespola manca Grosso.» «Eliandro colpisce Grosso.» «Eliandro incassa il colpo.» | Matching COLPITO / MANCATO / A TERRA facts |
| CM | 23 | not seen (told too thinly) | «Livia incassa il colpo.» (said once) | Two Grosso hits in the turn (2 + 4 dmg, Livia 7 → 1 HP) |
| CM | 23 (for T21) | unsure, not H (1-CM-U3) | «La mazza ferrata scende di un palmo e resta lì, a mezz'aria.» | T21 Grosso 2, fallita |
| PR | 11, 17, 20 | not seen | «Zirrà incassa il colpo.» «Nespola incassa il colpo.» «Livia incassa il colpo.» | Matching cards |
| PR | 13 (for T12) | not seen | «Grosso piega la schiena di un palmo, e il filo passa nel vuoto.» | T12: Nespola Spada corta 5, fallita, so the line matches the miss |
| PR | 14, 18, 22 | not seen (the blow that downs each PC is told by no line; the result is told) | «Eliandro muore.» «Nespola respira ancora, ma non si muove.» «Livia muore.» | The downing hits are on the cards only |
| PR | 1, 6 | not seen | T2 late: «Berta Benni: Soldata, la chiave non si dà per fretta. Tonio è lassù, lo dice la lavagna.» | Carisma 6 and 14 vs CD 17 → fallita. No line gives the key. The T6 refusal is never voiced |
| PR | 12, 13, 16, 18–21 | not seen | (misses appear only on cards) | Misses by Nespola, Grosso, Livia and Zirrà are told by no line, and none is narrated as a hit |

### Bug 5: an attack with no card and no engine fact

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 11 | only a player claim (the announcement keeps the act, drops the other-subject clause) | player «Il goblin mi tira la lancia, la paro con lo scudo.» → «Livia Sarti: «La paro con lo scudo. Resisto».» | No card, no NPC attack in T11. The T12 late line denies the spear |
| CM | 17 | unsure (1-CM-U2) | «Lancio il dardo incantato al goblin che la sta per colpire» | No attack on Nespola |
| PR | 13 | not seen (a taunt, no hit) | «Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.» | No card, no fact, no damage told |
| PR | 11 | not seen (a gesture) | «Zirrà schiocca le dita.» | Not an attack. See bug 6 |

### Bug 6: initiative

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 6 | rolled and said | «Ordine del round: Nespola, Zirrà, Livia, Grosso, Eliandro.» | `combattimento: inizia`; `sorpresa` with png_zirra and png_grosso surprised |
| CM | 9, 12, 14, 17, 19, 21, 23, 25 | rolled and said every round; resolution follows the engine order | e.g. «Ordine del round: Grosso, Nespola, Livia.» (T23) | `iniziativa ritirata` rounds 2–9. T7: Nespola, then «Turno di Zirrà: è sorpreso». T8: Livia, then «Turno di Grosso: è sorpreso». T23: Grosso's round-7 turn, then his round-8 turn first |
| CM | 6 | not seen as an outcome out of order | Announcements in typing order: Eliandro, Livia, Nespola | The only outcome (Livia's opening hit) is said after them. Nespola and Eliandro had no roll |
| PR | 11 | seen (minor): Zirrà acts before her turn | «Zirrà schiocca le dita.» is said before «Zirrà incassa il colpo.» | Order: Nespola 8, Grosso 6, Livia 5, Eliandro 2, Zirrà 1. No surprise (`"sorpresi": false`), so this is not H. It is a gesture, not an attack |
| PR | 14, 16, 18, 19, 20, 21 | rolled and said | e.g. «Ordine del round: Zirrà, Nespola, Livia, Grosso.» (T14) | Rounds 2–7. Round 8 was rolled in T22 and not said, because the fight ended |
| both | — | order lines vs dead or fled PCs (noted, not H) | CM T19 «Ordine del round: Nespola, Livia, Grosso.»; PR T14 omits Eliandro | Both omit Eliandro, who died that turn. CM T17 names Eliandro (down, not dead) and PR T18–T21 name Nespola (down and stable): both allowed |

### Bug 8: stalls

| run | turn(s) | verdict | verbatim quote(s) | engine stall lines |
|---|---|---|---|---|
| CM | 1, 2 | no stall move fired | — (T2 had a private action only; the table heard nothing) | `world: an answer with nothing new for the table (stall count)` fermi 0 (T1), 1 (T2). No E12, no S1/S2/S3, no `*_stallo_*` line |
| PR | 3, 4, 5, 8 | no stall move fired | T3: «Berta Benni: Allora?» | `stall count` fermi 1 (T3), 0 (T4), 0 (T5), 0 (T8). No E12, no S1/S2/S3 |

Answers with no new clue, choice or world move:
- **CM: 6 of 20 action turns.** These are T2 (private only), T11 (announcement only; answered late in T12), T14, T15, T16 and T26 (private only).
- **PR: 1 of 18 action turns.** This is T3: Livia threatens Ugo, Berta says «Allora?», and Ugo's late reply brings nothing.
- All the other turns had a roll, a fight beat, a clue (the slate, the shoe prints), a clock mark or a scene end.

There were no stall moves, so there is no right/wrong verdict to give. The stall count was right where it moved: CM T2 was a question with nothing back, and PR T3 was talk with nothing back. At PR T4 Eliandro takes his post at the door, which is a real move, so the count reset to 0.

### Bug 9: NPC presence and answering for someone else

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 1 → 3 | not seen | «Tra i faggi, il mulo di Ugo è già un'ombra.» | Ugo leaves at the end of the ovile scene. He next appears in the carbonaia, a new scene |
| CM | 19 | not seen | «Tonio Benni: Mi fa male il polso, signori.» | Livia asked «Chi vi paga?» of the goblins. Tonio does not answer it, and nobody does |
| PR | 3 | not seen (a prompt, not an answer) | «Berta Benni: Allora?» | Livia addressed Ugo. Ugo answers late, in T4 |
| PR | 6 | seen (minor) | «Ugo Faggioli: Paese. Sempre domande, mai carbone.» | Livia addressed Berta (Carisma 14, fallita). Berta's refusal is never voiced, and Ugo's waiting line takes her slot |
| PR | 19 → 20 | unsure | «Zirrà: Eccolo, scudo bianco: vivo e seduto. Basta guardare.» | Livia questions «uno» she holds against the wall. The engine names no target. Zirrà answers |
| PR | 11 → 20 | seen (continuity, not presence) | «Lascia andare il mio, o la corda diventa un cappio.» vs T11 «lascia cadere la corda dai polsi» | Tonio dropped the rope in T11, but Zirrà speaks as if he is still roped |

### Bug 10: repeats and restating

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 9, 13, 17, 21, 25 | by design (an Engine line, said five times) | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» | `who is really there said at the table`. It was held back at T11, T12, T14 and T19 |
| PR | 4, 6 | seen (a repeated gesture the guard did not catch) | «Il vecchio batte la pala per terra due volte e non abbassa gli occhi.» / «Ugo batte la pala per terra due volte.» | No R-ripetuta event at T6 |
| PR | 12, 20 | seen (minor gesture repeat) | «Il ragazzo alza gli occhi, poi li riabbassa.» / «Sui gradini della cantina Tonio alza gli occhi e li riabbassa subito.» | — |
| PR | 2 → 3 | fixed by a guard | «Berta Benni: Le pecore non aspettano.» | T3 R-ripetuta dropped «Le pecore non aspettano, e quelli lassù nemmeno.» |
| both | — | not seen | — | No narrator line restates player words. The «Nome: «…»» announcements are by design |

---

## 3. The announcement: every one that holds a claim false for the engine

| run | turn | announcement (verbatim) | what is false for the engine | verdict |
|---|---|---|---|---|
| CM | 9 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | No goblin has a spear, and Zirrà is dead | attributed |
| CM | 11 | «La paro con lo scudo. Resisto» | It presupposes a spear throw that no card has | attributed (the other-subject clause was dropped) |
| CM | 14 | «Spingo il goblin contro il muro con lo scudo e lo colpisco» | «il goblin» means Zirrà, who is dead; there was no roll | attributed. No correction was heard that turn (the who-is-there line was held back) |
| CM | 16 | «Mi chino su Nespola, la trascino dietro lo scudo e la copro» | It presupposes Nespola is down; she is «in piedi» | attributed |
| CM | 17 | «Lancio il dardo incantato al goblin che la sta per colpire» | A goblin attacking Nespola, which does not exist | **unsure** (1-CM-U2) |
| CM | 23 | «Finisco quello con la lancia, colpo di spada lunga» | A creature nobody has; «nessun tiro» | attributed. No correction that turn |
| CM | 25 | «Ultimo goblin: lo blocco contro la porta con lo scudo» | A label; most likely Grosso, the last enemy standing | attributed |
| PR | 2 | «Nespola Tondi dice: «Mi devi tre argenti».» | A debt the engine does not track. The announcement kept this claim and cut the PC's actual demand («Dimmi la strada per la torre…») | attributed (an announcement defect) |
| PR | 11 | «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta» | «nessun tiro: l’azione riesce se è possibile», and no outcome was told | attributed |
| PR | 17 | «Colpisco il goblin alle spalle con la spada corta, e lo tengo fermo» | Card MANCATO, and no line tells the miss | attributed |
| PR | 18 | «Scudo contro scudo, tiro la spada su quello in fondo» | A target nobody maps to; no roll | attributed |
| PR | 19 | «Ne tengo uno contro il muro: Dov'è il ragazzo?» | A held creature that no card has | attributed (Zirrà's T20 confirmation is 1-PR-U1) |

Clauses dropped correctly:
- CM T6 «Vedo tre goblin davanti alla porta.»
- CM T7 «Il goblin a destra ha la schiena scoperta»
- CM T12 «il goblin si gira verso di me»
- CM T13 «Il goblin mi prende alla spalla, sento sangue.»
- CM T15 «Ho zero punti ferita, sono a terra.»
- CM T21 «Il goblin davanti esita, guarda il compagno.»
- PR T2 «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.»
- PR T11 «Vedo una sentinella goblin!»
- PR T12 «Ne arriva un altro»
- PR T14 «tre o quattro goblin» (fixed since attempt 3)
- PR T16 «È quasi mezzanotte!»

**H from announcements: CM 0, PR 0. Attributed: CM 6, PR 5. Unsure: CM 1.**

---

## 4. Over-fire check (every `coerenza: violazione` and every refused pick)

CM has 12 coherence events and 2 refused picks; PR has 7 coherence events and 4 refused picks (checked with `grep -c`).

| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | `[usa] rifiutato` nar_impronte (pg_nespola) | «Corro avanti sul sentiero, mi fermo ogni dieci passi per ascoltare.» | right | The line is for looking at the goblins' tracks; she listens. The cost: her success got only «Nespola ci riesce.» |
| CM | 6 | R-dovuto aggiunta | «Zirrà incassa il colpo.» | right | Livia's 8-damage hit was told by no line |
| CM | 8 | R-dovuto | «Zirrà cade a terra.» | right | A TERRA / morto |
| CM | 9 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» | right | Target «al goblin con la lancia» |
| CM | 13 | R-dovuto | «Eliandro incassa il colpo.» | right | Grosso's hit on Eliandro |
| CM | 13 | R-inesistente | (same sentence) | right | «Il goblin mi prende alla spalla» |
| CM | 14 | `[usa] rifiutato` nar_mappa (pg_livia) | «Spingo il goblin contro il muro con lo scudo e lo colpisco.» | right | Pushing someone against the wall is not studying charcoal marks on it |
| CM | 17 | R-dovuto | «Eliandro cade a terra.» | right | Said after his own announcement |
| CM | 17 | R-inesistente | (same who-is-there sentence) | right | «al goblin che la sta per colpire» |
| CM | 19 | R-dovuto | «Livia incassa il colpo.» | right | Grosso 18 vs CA 17 |
| CM | 19 | R-dovuto | «Eliandro muore.» | right | Death save 4, MORTO |
| CM | 21 | R-inesistente | (same who-is-there sentence) | right | «Il goblin davanti esita»: says who is really standing |
| CM | 23 | R-dovuto | «Livia incassa il colpo.» | right | One line for two hits (under-told, not over-fire) |
| CM | 25 | R-inesistente | (same who-is-there sentence) | right | «Ultimo goblin» |
| PR | 3 | R-ripetuta tolta (ber_attesa) | «Le pecore non aspettano, e quelli lassù nemmeno.» | right | The tic was heard in T2. This is a waiting line, not a prompt or outcome. «Allora?» was kept |
| PR | 4 | `[usa] rifiutato` ber_conti_fienile (pg_nespola, private) | «Berta, piano: Tonio aveva monete vecchie con una torre sopra? Non dirlo a nessuno.» | right (unsure) | The line is about debts and the balivo; the question is about old tower coins. The theme list lacks «monete». The line went out next turn for Livia's balivo question |
| PR | 8 | `[usa] rifiutato` nar_impronte (pg_nespola) | «Corro avanti sul sentiero di Ugo, muovendomi piano tra le radici.» | right | She is not looking at tracks |
| PR | 11 | R-dovuto | «Zirrà incassa il colpo.» | right | Arco corto 21, 5 dmg |
| PR | 14 | R-dovuto | «Eliandro muore.» | right | `dovuti: 2`. The downing blow by Zirrà is not told, but that is under-telling |
| PR | 17 | R-dovuto | «Nespola incassa il colpo.» | right | Zirrà 17, 4 dmg |
| PR | 18 | R-dovuto | «Nespola respira ancora, ma non si muove.» | right | Stable after save 16 |
| PR | 19 | `[usa] rifiutato` nar_mappa (pg_livia) | «Ne tengo uno contro il muro: «Dov'è il ragazzo? Parla!»» | right | Holding someone against the wall is not reading the marks |
| PR | 20 | `[usa] rifiutato` nar_conto (pg_livia) | «Vado giù per la scala della cantina, spada in mano.» | right (unsure) | The match was on «canti» only, and she does not look at the wall by the iron door. Nothing else answered her move |
| PR | 20 | R-dovuto | «Livia incassa il colpo.» | right | Zirrà 22, 5 dmg |
| PR | 22 | R-dovuto | «Livia muore.» | right | Save 6, MORTO |

Other guards, which are not `coerenza` events:
- **Sceneggiatore lines blocked** because the outcome they tell is not on a card: CM T8, T11, T12, T16, T25 and PR T12, T13, T15, T22. All 9 were right: each told a hit by a PC whose action had no roll or missed.
- **The filter missed PR T15.** «Nessun dardo parte…» carries no `esito`, so the check against the current turn's cards did not catch it.
- **The who-is-there line was held back** in CM T11, T12, T14 and T19. That was right, except **CM T14 (unsure)**: it left Livia's attack on the dead goblin with no answer at all.

---

## 5. PR: player actions that contain a secret word (secrets **inferred** from the views)

| turn | action | secret touched | did the table hear a confirmation before its time? |
|---|---|---|---|
| 2 | Eliandro: «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.» | Who wrote the slate | No H. The clause was dropped from the announcement. The clue was earned by Intelligenza 13 vs CD 13, riuscita: «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» It hints and does not confirm |
| 4 | Nespola (private): «Tonio aveva monete vecchie con una torre sopra?» | Old coins with a tower | No. Private action, refused pick, and no table line about coins |
| 5 | Livia (private): «Il balivo ti prende l'ovile alla prima neve, lo sai?» | The balivo's claim on the sheepfold | No. `ber_conti_fienile` is not among the table lines (**inferred**: it went to her phone) |
| 6 | Eliandro (private): «Berta, qualcuno a Spinalba parla con i goblin?» | Someone from the village works with the goblins | **Unsure** (1-PR-U2). In T11 the table heard «Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone…», a scene event in the tower and not a reply to the question |
| 8 | Eliandro (private): «Seguo con la lanterna e cerco segni incisi sugli alberi.» | Marks on trees (inferred) | No. The check failed and nothing reached the table |

Secret H: PR 0 certain, 1 unsure.

---

## 6. Stall moves for ST and FB

These runs are not in this attempt, so there is nothing to list. There were no stall moves in CM or PR either: no S1/S2/S3, no E12 and no `*_stallo_*` line.

---

## 7. Public actions with no answer, and late lines

**CM**
- **No line at all after the announcement (4):** T14 Livia, T15 Nespola, T16 Livia, T23 Livia («Finisco quello con la lancia», with no roll and no correction).
- **Filler only (2):**
  - T4 Livia, «guardo i rami»: only the waiting line «Un ciocco crolla…».
  - T19 Livia, «Chi vi paga?»: only Tonio's «Mi fa male il polso, signori.».
- **Late lines (6 lines in 3 batches; their ids are not logged, most likely `sc_subito`):**
  - T7: 2 lines, for the T6 actions of Eliandro and Nespola.
  - T12: 2 lines, for T11 Livia.
  - T23: 2 lines, for T21 Livia.
  - The `sc_prossime` lines at T19 and T25 were said in their own turn, so they are not late.

**PR**
- **No line at all (3):** T8 Nespola, T9 Livia, T20 Livia («Vado giù per la scala della cantina»).
- **Attacks with no roll that got only an unrelated line (2):**
  - T11 Eliandro, magic missile on «la sentinella»: the only line was `nar_piccone`.
  - T11 Nespola, backstab on «la sentinella»: the only line was Grosso's waiting line.
- **Filler only (3):**
  - T6 Livia: Ugo's grumble and the clock mark.
  - T13 Livia: Zirrà's waiting line; the miss is untold.
  - T18 Livia: Zirrà's taunt; no roll.
- **Late lines (17 lines in 7 batches):**
  - T2: 3 lines, for T1.
  - T3: 2 lines, for T2 Nespola.
  - T4: 2 lines, for T3 Livia.
  - T9: 3 lines, for T8 Livia.
  - T13: 2 lines, for T12 Nespola.
  - T15: 2 lines, for T14 Eliandro. **This batch holds the H.**
  - T20: 3 lines, for T19 Livia.
  - The `sc_prossime` lines at T5, T17 and T18 were said in their own turn.

Attacks against a target nobody maps to get no roll and no line, and only the who-is-there line covers «goblin». Examples: «la sentinella», «quello con la lancia», «quello in fondo», «uno».

---

## 8. By-design items: right or wrong

| item | where | verdict |
|---|---|---|
| «Nome ci riesce / ci prova, ma non ci riesce» | CM T4; PR T15, T16 | Right per their cards. CM T4 is thin: a passed listen with nothing heard except the clock-mark horn |
| Engine's card lines («X manca Y», «X colpisce Y») | CM T7, T8, T10, T12; PR T14 | Right |
| Defeat ending | PR T22 `nar_sconfitta_zirra_caduti`: «Zirrà fruga nelle vostre bisacce, poi trascina giù per i gradini chi respira ancora.» | Right. Only the living PC (Nespola, stable) is dragged, and no dead PC wakes. The table paused |
| Attack with no target rolls against the last target | CM T10 «Lo colpisco ancora» → Grosso; PR T12 «Lo colpisco di nuovo» → Grosso | Right. The last target was dead or unresolved, so the roll went to the only enemy standing |
| «Pugnale ancora» | CM T12 → Grosso, crit | Right |
| Discreet phone answer | CM T1, T2, T26; PR T6, T8 | Right |
| Scene-outcome gates | None closed. CM T1 was a scene end without the key (`fin_ovile_senza`) | n/a |
| «Chi ha che cosa» | The key stays with Berta in both runs | Consistent |
| R-ripetuta drop | PR T3 | Right |

---

## 9. Summary (5 lines)

1. **H heard: CM 0 certain (3 unsure); PR 1 certain (2 unsure).** The PR H is the T15 late line «Nessun dardo parte…», which denies Eliandro's T14 dart that the card and the table had as a hit.
2. **Real bug 4:** a late sceneggiatore line with no `esito` slips past the filter, which checks only the current turn's cards. There were also two thin successes (CM T4, PR T9).
3. **Bugs 1, 2 and 3 were not seen at the table.** Players' 0-HP and hit claims and their phantom goblins were dropped from the announcements or answered by the who-is-there line. The filter blocked 9 `sc_` lines that told hits no card had.
4. **Bugs 9 and 10 are minor:**
   - PR T6: Ugo fills Berta's slot.
   - Repeated gestures: Ugo's shovel (T4/T6) and Tonio's eyes (T12/T20).
   - Tonio's rope continuity (T11 vs T20).
   - PR T20: Zirrà confirms a held «mio» (unsure).
5. **Gaps in answers:**
   - Public actions with no answer: CM 4 (plus 2 filler-only); PR 3 (plus 2 attacks with no roll, plus 3 filler-only).
   - Late lines: CM 6 in 3 batches; PR 17 in 7 batches.
   - Attacks on targets nobody maps to get no roll and no line.

# Evidence table, coherence round 7, profile A (judge: opus)

Sources: only the four views coerenzaA7-vista-{cm,ca,fb,st}.md. The engine log decides game state; player lines are only claims. Turn numbers refer to the «Turno N» headings. A line at the **head** of turn N (before that turn's player line) usually appears to answer turn N-1; some are only ambient (for example the CA T8 head). Those lines are not in turn N's `battuta uscita` log. When I say an `sc_` line was "written at Tk", that is read off its id (`sc_…_tk_…`), not stated in the log.

## Bug 1: private content at the table
| run | turn(s) | verdict | quote(s) from the table | engine state |
|---|---|---|---|---|
| CM | 1, 2, 24 | not seen | (no table line retells Nespola→Ugo «Tonio è vivo?», Eliandro→Berta, Livia→«goblin») | `fatti_privati` only; no move to a phone logged |
| CA | 1, 2 | not seen | T2 head «Berta Benni: Sì, soldata. Sopra il bosco, oltre la carbonaia.» answers Livia's PUBLIC T1 question | private T1/T2 not retold |
| FB | 5, 10, 13 | not seen | T6 «Ugo Faggioli: Lei va pure. Il carbone costa, e la carbonaia non aspetta.» (after Nespola's private «quanto ti pagava Ugo per il carbone?») | the id `sc_prossime_t1_…` suggests it was written at T1, before T5, so it is not a leak. T12 ERR `parola segreta nel messaggio del selettore` («Tonio è salito da solo, d'accordo con i goblin») never reached the table |
| ST | 9, 13 | not seen | T10 «Ugo Faggioli: Lei ha fame di accuse, o di carbone? Il carbone costa.» (after Livia's private T9 question to Ugo) | the id `sc_prossime_t5_…` suggests it was written before T9, and it fits Fulco's public «Io non mi fido di Ugo». T14 `ugo_attesa` is generic |

## Bug 2: fallen NPC acting or speaking
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 9–24 | not seen | T11/15/19/23 «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.»; T14 head «Sul fondo, vicino alle pietre, il corpo di Zirrà non si muove.» | T9 `esce dallo scontro` png_zirra morto. Table-line «goblin» after T9 only at T14 head «Davanti al fuoco c'è un solo goblin in piedi, ed è Grosso.» (Grosso in play, so not H) |
| CA | – | n/a | – | no NPC fell (Zirrà «ferito gravemente», Grosso in piedi at the end) |
| FB, ST | – | n/a | – | no fight |

## Bug 3: PC at 0 HP acting / death save missing
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 15 | only a player claim | Eliandro: «Vedo Nespola a terra.» (dropped from the announcement) | Nespola full HP at the start of T15; after Grosso's hit «2 punti ferita su 5» |
| CM | 16 | only a player claim | Nespola: «Ho zero punti ferita, sono a terra.» → announced «Non mi reggo più, striscio dietro la pietra» | block: «Nespola Tondi ferito» (2/5), NOT at 0 |
| CM | 17–24 | not seen | real 0 HP: Nespola T17 (save T20 fail), Eliandro T20 (save T20 fail), Livia T24 (save T24 fail) | no action after 0 HP; no death save missing. Side note: T20 «Eliandro muore.» is followed by «Ordine del round: Eliandro, Livia, Grosso.» (a dead PC in the order line; it is not an action) |
| CA | 14 | only a player claim | Eliandro: «Vedo Nespola a terra.» | Nespola 3/5, standing |
| CA | 15 | only a player claim (at the time of acting) | Nespola: «Ho zero punti ferita, sono a terra.» | Nespola 3/5 when she acted; Zirrà downs her later in T15 (save 14, stable) |
| CA | 12–15 | not seen | «Livia respira ancora, ma non si muove.» | Livia 0 HP T12 → save T13 success; Eliandro 0 HP T14 → save T15 fail; no action after 0 HP, no save missing |
| CM, CA | 24 / 15 | unsure (Fulco probably not at the table) | «Nessuno è in piedi per soccorrerli» (engine fact) | the coherence block still lists «Fulco Granito in piedi», yet the Engine forces the saves and takes the defeat path. Fulco has no lines and is not in the combat |

## Bug 4: dice card vs narration heard at the table
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 6–24 | not seen | «Zirrà incassa il colpo.» (T6), «Nespola manca Grosso.» (T10), «Nespola cade a terra.» (T17), «Livia muore.» (T24) | every hit, miss, fall and death line matches its card |
| CM | 12, 22, 23 | not seen (unnarrated) | – | Grosso's misses (T12 on Nespola, T22 ×2 and T23 on Livia) are on the cards only; no line contradicts them |
| CM | 22 head | unsure | «La mazza cala di taglio, e il colpo rimbomba contro i muri senza tetto.» | this tells T21's HIT on Livia (7 dmg); «rimbomba contro i muri» can be heard as a miss, while the projector shows two misses for T22 |
| CA | 6, 7, 14, 15 | not seen (unnarrated) | T15 only «Nespola respira ancora, ma non si muove.» | Livia's T6 miss, Nespola's T7 miss and Zirrà's T14 miss are on the cards only. Zirrà's T15 hit that downs Nespola (card «Zirrà: Spada corta 18, riuscita») is never told |
| CA | 9 | not seen | «Livia incassa il colpo.» | two hits (Grosso crit 4 dmg, Zirrà 4 dmg) told as one sentence |
| CA | 4 | unsure (success with no effect) | «Nespola ci riesce.» | Ascoltare 23, success, but no content about what she hears (the clock horn follows) |
| FB | 1–2 | not seen | T2 head «Berta Benni: Calma, halfling. Questa chiave non si vende.» | Carisma 15 vs CD 17, failed; the price is told late but correctly |
| ST | – | n/a | – | no rolls |

## Bug 5: attack narrated with no card
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 12 | only a player claim (attributed) | «Livia Sarti dice: «La paro con lo scudo. Resisto».» | no attack on Livia at T12 (Grosso attacks Nespola and misses) |
| CM, CA | all | not seen | – | every narrated attack has a card |
| FB, ST | – | n/a | – | – |

## Bug 6: initiative
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 6, 9, 12, 15, 18, 20–23 | rolled and said; minor order slips | «Ordine del round: Eliandro, Nespola, Livia, Zirrà, Grosso.» (T6) | `combattimento: inizia` T6; `iniziativa ritirata` rounds 2–10. Every said order matches its roll |
| CM | 6 | seen (minor) | announcements in this order: Eliandro, Livia, Nespola | initiative was Eliandro 7, Nespola 6, Livia 2. These are the opening actions, said before the order |
| CM | 20 | seen (minor) | «Eliandro muore.» … «Ordine del round: Eliandro, Livia, Grosso.» | the round 6 order is said after the death and still lists the dead PC |
| CA | 6, 9, 12, 14 | rolled and said | «Ordine del round: Nespola, Eliandro, Livia, Grosso, Zirrà.» | `inizia` T6, re-rolled rounds 2–4; all match |
| CA | 6 | seen (minor) | announcements in this order: Eliandro, Livia, Nespola | Nespola 8 should go first |
| CA | 15 | seen (minor) | «Nespola respira ancora, ma non si muove.» then «Eliandro muore.» | in the engine, Eliandro's save comes first, then Zirrà's hit, then Nespola's save |

## Bug 8: stall
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 2, 13, 14, 16 | 4 of 22 action turns had nothing new (+T18, T19 borderline) | T19 «Grosso guarda la scala della cantina senza rispondere.» | only `an answer with nothing new` T1 {fermi 0}, T2 {fermi 1}; no E12, no stall move |
| CA | 2, 11 | 2 of 13 | T11 only «Eliandro dice: «Pugnale ancora».» | T2 {fermi 1}; no stall move |
| FB | 2, 7, 8, 9, 10, 11, 13 | 7 of 13; hand-back at T3 | «Berta Benni: Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | count: T2 0, T3 1, T4 2, T5 3 (S1), T6 0, T7 1, T8 0, T9 1, T10 2, T11 0, T12 1, T13 0. The stall rule under-fires: the count resets at T8 («Vado lì, adesso», a cave that does not exist and no roads event), T11 (seizing a cart that does not exist) and T13 (private question to the absent «Oreste»), so no second move came |
| ST | 2, 3, 13, 14 | 4 of 14 (T4–T12 got stall material); hand-backs at T3 and T13 | «Berta Benni: Seduto, nano, il ragazzo non torna. Decidi.» (T13 head) | E12 T4 {stallo 1}, T6 {stallo 3}; 9 stall moves T4–T12; count reaches 11, then resets to 0 at T13 (private «Dimmelo, poi vado»: unsure, probably wrong) |

### Stall moves: verdict and what the table got
| run | turn | move | the action | verdict | what the Engine put at the table |
|---|---|---|---|---|---|
| FB | 5 | S1 soft (n1) | Nespola, private: «quanto ti pagava Ugo per il carbone?» (after T3/T4 trips to a mill that does not exist) | right | prepared `nar_stallo_ovile_corno`: «Dal crinale arriva un colpo di corno, lontano. Le pecore alzano la testa, poi tornano a brucare.» |
| ST | 4 | S1 soft (n1) | Livia «Aspetto.» | right | prepared `nar_stallo_ovile_corno` (same sentence) |
| ST | 5 | S2 (clue i_giaciglio) | Fulco «Mi siedo sul muretto dello stazzo.» | right | prepared clue `ber_stallo_giaciglio`: «Mancano gli stivali buoni e il mantello. E il pane della settimana, tutto.» |
| ST | 6 | S3 (leads) | Eliandro «Guardo in giro.» | right | clock line `nar_segno_1` + prepared `ber_stallo_bosco`: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» / «E più su, la Torre Mozza.» |
| ST | 7 | S1 hard (mark on o_mezzanotte) | Livia «Aspetto ancora. Tanto Berta ci chiama, no?» | right | clock line `nar_segno_2` «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» (said before the announcement) |
| ST | 8 | S2 (clue i_lavagna) | Fulco «Ci penso. Aspetto.» | right | clue `nar_lavagna`: «Le lettere sono grandi e tonde, tracciate piano con il carbone.» |
| ST | 9 | S3 | Livia, private question to Ugo (nothing came back) | right | the Engine's leads sentence, malformed: «Vi tornano in mente le strade ancora aperte: La carbonaia di Ugo; La Torre Mozza; Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» (the third "road" is the T7 clock line) |
| ST | 10 | S1 hard (mark, consequence o_mezzanotte@3) | Fulco «Che fai, Livia?»; Eliandro «Cosa ha detto?» | right | clock line `nar_segno_3` «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» + consequence `ber_salgo_io` |
| ST | 11 | S2 (clue i_pali) | Livia «Non so, ha detto poco» | right | clue `nar_pali`: «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» |
| ST | 12 | S3 | Fulco «Mi siedo di nuovo. Cosa facciamo adesso?» | right | the Engine's leads sentence, malformed: «…La carbonaia di Ugo; La Torre Mozza; I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» |

All 10 stall moves were right; none ignored a real decision.

## Bug 9: NPC presence and answering for another
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| FB | 7 | seen | after «Sei Oreste?»: «Ugo Faggioli: Paese. Sempre domande, mai carbone.»; after «Chiedo a Oreste se ha visto luci sulla collina»: «Ugo Faggioli: Io non vedo niente. Guardo il fuoco, io.» | Oreste does not exist; the by-design «Oreste? Qui nessuno conosce questo nome.» was never said (no event logged) |
| FB | 8 head, 12 head | borderline | «Berta Benni: Formaggio, halfling? Qui nessuno si chiama Oreste.»; «Ugo Faggioli: Sequestrare cosa? Il carico è mio, e pagato.» | answers words addressed to Oreste and to «Madre Carla» (absent). The content is coherent (it denies them) |
| CM | 19 | unsure (either/or) | «Grosso guarda la scala della cantina senza rispondere.» / «Grosso: Non so. Chiedi a lei.» | «Ehi goblin! Chi vi paga?» Either «goblin» is nobody, and then Grosso should not have answered (bug 9); or it means Grosso, and then the T19 R-inesistente over-fired. The pair also contradicts itself (he answers right after «senza rispondere»), and «lei» may point at dead Zirrà |
| CA, ST | – | not seen | – | – |

## Bug 10: verbatim repetition / player's words restated
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| ST | 10, 14 | seen | «Ugo batte la pala per terra due volte.» | T10 `sc_prossime_t5_…`, T14 `ugo_attesa` |
| ST | 2, 6 | seen | «Le pecore non aspettano.» | Berta's lines at the T2 head and the T6 head |
| ST | 7→9, 10→12 | seen (inside the Engine's leads sentence) | «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.»; «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» | the clock lines are reused as "roads" |
| FB | 3→4 | seen (player's words restated) | Fulco: «Il mulino sul fiume ha la ruota rotta da mesi» → «Berta Benni: Nano, la ruota è rotta da mesi.» | the Engine had just said the mill is not a real road |
| FB | 6, 7 | near-verbatim | «Ugo batte la pala per terra due volte, senza alzare la testa.» / «Ugo batte la pala per terra due volte.» | – |
| CM | 11/15/19/23 | not counted (Engine line) | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | R-inesistente line; near-repeat at T18/T19 «Grosso guarda la scala della cantina…» |
| CA | – | not seen | – | – |

## Over-fire check
| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | [usa] rifiutato nar_impronte | (footprints line) | right | shares only «senti»; Ascoltare failed |
| CM | 6 | R-dovuto | «Zirrà incassa il colpo.» | right | Livia hits Zirrà, 6 dmg |
| CM | 8 | sc filter sc_subito_t6_…_10_1 | (Grosso misses Nespola) | right | no Grosso attack at T6/T8 |
| CM | 9 | R-dovuto | «Zirrà cade a terra.» | right | Zirrà A TERRA |
| CM | 11 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | «il goblin si gira verso di me»; Zirrà dead |
| CM | 13 | sc filter sc_subito_t11_…_20_1 | (Eliandro hits Grosso) | right | no roll at T11 |
| CM | 14 | sc filter sc_subito_t12_…_22_1 | (Grosso misses Nespola) | unsure | true on T12's card but stale at T14; T12's miss was then never narrated |
| CM | 14 | [usa] rifiutato nar_mappa | (charcoal marks on the wall) | right | shares only «muro»; Livia was attacking |
| CM | 15 | R-dovuto | «Nespola incassa il colpo.» | right | Grosso 17, 3 dmg |
| CM | 15 | R-inesistente | same sentence | unsure | «al goblin che la sta per colpire» clearly means Grosso; the line is true, but the dart was resolved on Zirrà's corpse with no roll |
| CM | 16 | sc filter sc_subito_t15_…_28_1 | (Eliandro hits Grosso) | right | no roll at T15 |
| CM | 17 | R-dovuto | «Nespola cade a terra.» | right | crit, 0 HP |
| CM | 19 | R-inesistente | same sentence | right (redundant) | Grosso had already answered |
| CM | 20 | R-dovuto ×2 | «Eliandro muore.» / «Nespola muore.» | right | both saves failed |
| CM | 20 | [usa] rifiutato nar_conto | – | right | shares only «canti» (from cantina) |
| CM | 21 | R-dovuto | «Livia incassa il colpo.» | right | 7 dmg |
| CM | 22 | sc filter sc_subito_t20_…_36_1 | (Eliandro hits Grosso) | right | Eliandro dead; the hit was already said at T20 |
| CM | 23 | R-inesistente | same sentence | right | «Ultimo goblin» |
| CM | 24 | sc filter sc_subito_t23_…_41_1 | (Livia hits Grosso) | right | no roll at T23 |
| CM | 24 | R-dovuto | «Livia muore.» | right | save 4 failed |
| CA | 4 | [usa] rifiutato nar_impronte | – | right | shares only «senti» |
| CA | 9 | R-dovuto | «Livia incassa il colpo.» | right | two hits on Livia, untold |
| CA | 10 | sc filter sc_subito_t8_…_15_1 | (Eliandro hits Zirrà) | right | stale; already said at T8 |
| CA | 12 | sc filter sc_subito_t10_…_19_1, sc_subito_t11_…_21_1 | (Nespola / Eliandro hit Zirrà) | right | the first is stale (said at T10); the second had no roll at T11 |
| CA | 12 | R-dovuto ×2 | «Livia cade a terra.» / «Nespola incassa il colpo.» | right | cards |
| CA | 13 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | save 13, stable |
| CA | 14 | sc filter sc_subito_t12_…_23_1 | (Grosso downs Livia) | right | stale; already said at T12 |
| CA | 14 | R-dovuto | «Eliandro cade a terra.» | right | 7 dmg, 0 HP |
| CA | 15 | R-dovuto ×2 | «Nespola respira ancora, ma non si muove.» / «Eliandro muore.» | right | but Zirrà's downing hit on Nespola is not among the owed facts and is never told (under-fire) |
| FB | 3 | roads sentence | «Da qui le strade che conoscete portano soltanto verso: La carbonaia di Ugo; La Torre Mozza.» | right | mill not in the campaign (matched word «benedirla») |
| FB | 5 | [usa] rifiutato ber_conti_fienile | – | unsure, leaning wrong | the stated reason is false: theme «pagare» is in the action as «pagava» (inflection missed). The line's content is not in the view. This refusal is why the T5 private question got nothing back, which fed the T5 stall move |
| ST | 5 | [usa] rifiutato nar_recinto | – | right | sitting on the wall ≠ examining the gate |
| FB, ST | – | stall moves | (see the stall table) | right ×10 | – |

No `coerenza: violazione` in FB or ST.

General pattern for the 10 `sc_subito` WARNs: each fires one or two turns after its line was written and is checked against the cards of the arrival turn. Five were true for their own turn: CM T14 and T22, CA T10, T12 (t10) and T14. Four of those were already told by the Engine; only CM T14 left an outcome untold.

## The announcement: claims false for the engine
All of these are introduced by «Nome dice: «…»», so a listener hears them as the player's words. **H from announcements: 0 in all four games.**
- CM T7 / CA T8 «Tiro il pugnale da dietro la pietra, al goblin con la lancia»: a lance-goblin nobody has (the engine took Zirrà). Attributed.
- CM T12 / CA T12 «La paro con lo scudo. Resisto»: no attack on Livia at CM T12; at CA T12 she falls right after. Attributed.
- CM T14 «Spingo il goblin contro il muro con lo scudo e lo colpisco»: no card; the target resolved to dead Zirrà. Attributed.
- CM T15 «Lancio il dardo incantato al goblin che la sta per colpire»: resolved to dead Zirrà, no roll. Attributed.
- CM T16 / CA T15 «Non mi reggo più, striscio dietro la pietra»: Nespola standing at 2/5 (CM) and 3/5 (CA). Attributed.
- CM T20 «Dal gradino tiro il pugnale a quello che scappa verso la cantina»: nobody flees. Attributed.
- CM T22 «Finisco quello con la lancia, colpo di spada lunga»: nobody has a lance; «finisco» has no card (no roll). Attributed.
- CM T23 «Ultimo goblin: lo blocco contro la porta con lo scudo»: «l'ultimo goblin» does not exist. Attributed.
- FB T1 «La vendo a Valdirame e chiudo il conto»: Nespola has no key (Carisma failed). Attributed.
- FB T3 «Vado a benedirla», T4 «Anch'io vado al mulino», T12 «Ci fermiamo al mulino a dormire»: the mill does not exist. Attributed.
- FB T6 «Andiamo al guado»: no ford exists. Attributed.
- FB T7 «Chiedo a Oreste se ha visto luci sulla collina»: Oreste is absent. Attributed.
- FB T9 «Sulla strada della grotta incontro una viandante con un carretto»: attributed, but this is a **filter miss**. The world clause (a cave road, a traveller with a cart) was kept, and the PC's own question «Madre Carla? Dove vai con quel carico?» was dropped.
- FB T11 «Madre Carla, sei una vecchia ladra, e il carretto lo sequestro» and «Madre Carla, dai, ti benedico e ti lascio andare»: an absent NPC and a cart that does not exist. Attributed. The second is **cut mid-sentence** («…, ma prima mi dici la strada per la grotta» dropped).
- ST: none.

Other deviations from the stated rules (no false claim; unsure whether the "one sentence" behaviour is intended):
- Questions dropped: CM/CA T1 «Berta, la torre è quella sopra il bosco?», FB T1, FB T7 «Mi vendi un formaggio, dai?», ST T1 «Aspettiamo qui o andiamo?», ST T10 «Ci hai pensato?» / «Qualcuno sente qualcosa?».
- The PC's own words dropped: FB T2 «Dimmi la verità o me ne vado.», FB T11 «Blocco le ruote con lo scudo.», ST T11 «Aspettiamo che torni.», CM T19 «Fermatevi, e nessuno si fa più male!».

## By-design behaviours checked
- «Pugnale ancora» did **not** roll: CA T11, where the last target Zirrà was alive («nessun tiro»); and CM T11, where Zirrà was dead and no retarget happened. «Lo colpisco ancora» did roll (CA T10 vs Zirrà; CM T10 retargeted to Grosso). WRONG at CA T11.
- In CM, «goblin» was resolved to dead Zirrà at T14 and T15, so Livia's shove and Eliandro's dart got no roll. This happened right after the narrator's own «Davanti al fuoco c'è un solo goblin in piedi, ed è Grosso.» WRONG.
- CM T22: an explicit attack, «colpo di spada lunga», got no roll at all. CM T21: «Non lo colpisco ancora» was parsed as an attack on Zirrà's corpse (no harm at the table).
- The «Oreste? Qui nessuno conosce questo nome.» answer never fired (FB T7, and for «Madre Carla» at T9 and T11). WRONG.
- The roads sentence for the mill and ford was right (FB T3; repeats suppressed at T4 and T6).
- Defeat paths: CM T24 «Nessuno di voi si rialza: …» (all PCs dead) and CA T15 prepared `nar_sconfitta_zirra`: right.
- Fabricated world facts (not H): FB T7 head «Il guado è dall'altra parte, halfling.» confirms a ford that does not exist. ST T4 head «…la lavagna pende storta, con poche righe di gesso.» contradicts T8 «tracciate piano con il carbone».

## H violations heard at the table (after the checker)
| game | H | note |
|---|---|---|
| CM | 0 (+1 unsure) | unsure: T22 head «La mazza cala di taglio, e il colpo rimbomba contro i muri senza tetto.» may be heard as a miss against T21's hit card. The order line naming dead Eliandro (T20) is not an action |
| CA | 0 | – |
| FB | 0 | Ugo answering for Oreste is bug 9, not an absent character speaking |
| ST | 0 | – |

## Public actions with no answer
Taken literally ("no line about them at all"), the count is 0 in every game, because every public action got its announcement. Excluding the announcement (only the announcement, or only the card), the counts are CM 3, CA 4, FB 1, ST 1:
- **CM: 3.** T12 Livia (parry), T14 Livia (shove), T16 Nespola. T13 Nespola was answered late by the T14 head line «Davanti al fuoco c'è un solo goblin in piedi, ed è Grosso.». Borderline: T4 Livia (ambient filler only) and T17 Livia (only Grosso's crit told). T11, T15 and T23 were answered only by the Engine's who-is-there line.
- **CA: 4.** T6 Livia (miss on the card only), T7 Nespola (miss on the card only), T11 Eliandro (no roll), T13 Nespola. Borderline: T4 Livia.
- **FB: 1.** T11 Fulco («ti benedico… la strada per la grotta»). Borderline: T4 Livia.
- **ST: 1.** T10 Eliandro «Cosa ha detto?».

## Late lines
Logged `sc_` lines said after their turn:
- **CM: 3.** T18 `sc_prossime_t13_mwjwxhjo_25_6`, T19 `sc_prossime_t14_mwjwy2rj_27_05`, T22 `sc_prossime_t13_mwjwxhjo_25_4`.
- **CA: 0.**
- **FB: 5.** T4 `sc_prossime_t1_mwjxi68h_2_03`, T6 `sc_prossime_t1_mwjxi68h_2_02`, T8 `sc_prossime_t3_mwjxjosl_6_3`, T9 `sc_prossime_t7_mwjxmre8_13_06`, T12 `sc_prossime_t6_mwjxlwsh_11_06`.
- **ST: 1.** T10 `sc_prossime_t5_mwjxuo2f_10_02`.

The view also has lines at the head of a turn that answer the previous turn. Their ids are not shown, so whether they are `sc_subito` lines is unsure:
- **CM:** heads of T7, T8, T9, T10, T14, T22 (13 lines).
- **CA:** heads of T2, T8, T15 (6 lines).
- **FB:** heads of T2, T3, T4, T7, T8, T12 (15 lines).
- **ST:** heads of T2, T3, T4, T6, T7, T8, T9, T11, T13 (20 lines).

## Summary
1. Bugs 1, 2, 3 and 5 are not seen in any run. Bug 3 appears only as player claims (CM T15/T16, CA T14/T15), and every death save is present.
2. Bug 4: nothing heard contradicts a card. Some outcomes go untold: misses, and CA T15 Zirrà's hit that downs Nespola. CA T4 «Nespola ci riesce.» is a success with no content (unsure).
3. Bug 6: initiative is rolled and said every round. Minor slips: opening announcements in input order (CM/CA T6), CA T15 told out of order, and CM T20's order line naming dead Eliandro.
4. Bugs 9 and 10 are real. FB T7: Ugo answers questions put to «Oreste», and the Oreste sentence never fired. ST repeats «Ugo batte la pala per terra due volte.» and «Le pecore non aspettano.». FB T4 Berta restates Fulco's mill claim.
5. Bug 8: all 10 stall moves are right. The stall count under-fires: it resets on actions toward things that do not exist (FB T8, T11, T13) and on ST T13. The ST leads sentence lists clock lines as roads. **H heard = 0 in all four games** (CM +1 unsure: the T22 head line).

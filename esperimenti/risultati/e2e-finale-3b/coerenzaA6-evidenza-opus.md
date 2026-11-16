# Evidence table — coherence round 6, profile A (blind judge)

Sources: only the four views (`coerenzaA6-vista-cm/ca/fb/st.md`). The view skips turns 19 and 24 in CM, so I say nothing about them.

**Criteria used**
- **Answer:** a line about the action. The «Nome dice: …» announcement, an «Ordine del round» line and a bare dice card do not count as answers.
- **Late `sc_`, hard count:** a logged `sc_prossime_tN` said at a later turn. The unlabelled lines before a turn's first player line carry no id in the view. They are listed separately as *inferred* sceneggiatore lines arriving after their turn; the `sc_subito_*` filter events point that way.
- **H:** only the brief's three kinds (private content; a fallen or absent character acting or speaking; an outcome against its card or the engine state). Borderlines are listed as not counted.

## Bug 1 — private content at the table
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T1 (Nespola→Ugo), T2 (Eliandro→Berta) | not seen | T1 public: «Berta resta sotto il portico, con la chiave stretta nel pugno. Tra i faggi, il mulo di Ugo è già un'ombra.» | `fatti_privati` only; no private line; 0 `spostata al suo telefono` |
| CA | T1, T2 | not seen | T2 opening: «Sì, soldata. Quella sopra il bosco.» (answers Livia's public question) | same |
| FB | T5, T10, T13 | not seen | T12: «Un carretto? Qui c'è solo il mio mulo. Con chi parla?» (answers the public T11 «il carretto lo sequestro», not the private T10) | same |
| ST | T9 (Livia→Ugo), T13 (Eliandro→Berta) | not seen (unsure T10) | T10: «Io non vedo niente. Guardo il fuoco, io.» (picked for Eliandro's public «Qualcuno sente qualcosa?»; does not retell the private question) | same |

None of the 9 private actions in the four runs got any answer: there is no phone line and no `spostata al suo telefono` event.

## Bug 2 — a fallen NPC acts or speaks
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T14→T27 | not seen (a guard said who is there) | T15, T21: «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | T14 `esce dallo scontro` png_zirra «morto». Every later line is Grosso's or the Engine's. Zirrà's last line («Ancora in piedi, riccioli?…», T14 opening) comes before her death. |
| CA | — | n/a | — | no NPC fell; Zirrà stays «ferito» to the end |
| FB, ST | — | n/a | — | no fight |

## Bug 3 — a PC at 0 HP acts / a death save is missing
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T17 (premise also at T14, T16) | only a player claim | player: «Ho zero punti ferita, sono a terra.»; T14 player: «Vedo Nespola a terra.» | Nespola is «in piedi» in every block and is **never at 0 HP**: every attack on her (T10, T17, T26, T27) is MANCATO |
| CM | T21–22 (Eliandro), T25–26 (Livia) | not seen; saves present | «Eliandro cade a terra.» → «Eliandro muore.»; «Livia cade a terra.» → «Livia muore.» | A TERRA, then a death save at the next own turn (3 and 6 vs CD 10) → morto; neither has a line after that |
| CA | T14 | only a player claim (an NPC voices it at T15, see bug 4) | player: «Ho zero punti ferita, sono a terra.» | Nespola is «in piedi» at T14–T15 and **not at 0 HP**; she first goes down at T16 (Grosso 19) |
| CA | T9, T13–14, T16 | not seen; saves present | «Eliandro muore.» · «Livia cade a terra.» → «Livia muore.» · «Nespola muore.» | death saves 8 / 3 / 3 vs CD 10 |

## Bug 4 — card vs heard narration
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CA | T15 (opening) | **seen — H** | Zirrà: «Tre per terra, e il fuoco ancora caldo. Io i conti li so fare.» | The T14 and T15 blocks have Livia and Eliandro dead and Nespola «in piedi»: two down, not three. No card downs Nespola before T16. The filter let an assumed state through. |
| CA | T4 | seen, mild (a success with no effect) | «Nespola ci riesce.» then «Dal crinale scende un corno di capra, lungo e stonato.» | Ascoltare 29 vs 30 is a SUCCESS. The horn is clock line `nar_segno_1`, which CM T4 also heard after the FAILED roll. |
| CM | all | not seen | T6 «Zirrà incassa il colpo.», T9 «Livia colpisce Zirrà.», T14 «Zirrà cade a terra.», T20–T26 | every outcome line matches its card |
| CM | T10 | not seen (weak) | «Nespola ci prova.» | the card is MANCATO; the miss is told only at the T11 opening, «Zirrà si getta di lato e la lama batte solo sulla pietra del muro.» |
| FB | T1 | not seen | the failure is told late, at the T2 opening: «Ladra, la chiave non si tocca. Mio figlio è lassù. Le pecore non aspettano.» | Carisma 13 vs CD 17 FAILED; the price is that Berta refuses |
| ST | — | n/a | — | no rolls |
| CM, CA | several | told only by the card (no contradiction) | — | CM: T7 Eliandro's miss; T10 Grosso and Zirrà miss Nespola; T15 Grosso misses Livia; T26–27 Grosso misses Nespola. CA: T6 Livia's miss; three NPC misses at T13; two at T15. CA T9 and T16: Grosso's downing hits are told only as «… muore.» |

## Bug 5 — an attack narrated with no card
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM, CA | T7 (also T6) | not seen (idle line, no target or damage) | «Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.» · T6 «Zirrà schiocca le dita.» | Zirrà is sorpreso in round 1 and has no card (a surprised NPC acting, not counted) |
| CM | T13, T17 | fixed by a guard (sceneggiatore filter) | not heard | `sc_subito_t12` «mancato by png_zirra on pg_livia» and `sc_subito_t15` «colpito by pg_livia on png_grosso»: no card for either |
| CM | T11, T25 | reverse case: a PC attack never rolled | «Pugnale ancora, il goblin si gira verso di me» · «Non si ferma nessuno: finisco quello con la lancia» | Both logged `nessun tiro`. Eliandro's last target, Zirrà, was alive, so by design the attack should have rolled. Livia's target does not exist, and no R-inesistente line came either. |

Across all four runs, no table line has a non-existent goblin act, be hit or die. The exception is the attributed announcements at CM T15 and T25, which name one as a target; they are judged in the announcement list. FB and ST: n/a (no fight).

## Bug 6 — initiative
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | T6 + every round | rolled and said | «Ordine del round: Eliandro, Nespola, Grosso, Livia, Zirrà.» | `combattimento: inizia` Eliandro 7, Nespola 6, Grosso 4, Livia 3, Zirrà 3. Rerolled and said at T9, 12, 15, 18, 21, 23, 25, 26, 27; every order said matches. |
| CM | T21 | seen (minor): out of order | «Eliandro cade a terra.» … then «Livia Sarti dice: «Chi vi paga?».» | In the engine, Livia's round-5 action comes before Grosso's attack. The Engine's `prima_dell_invito: true` lines (fact, order, who is there) were said first. |
| CM, CA | T6 | minor | announcements in typing order (Eliandro, Livia, Nespola); the order is said after the hit | only Livia's attack rolled, so no outcome is out of order |
| CA | T6 + rounds | rolled and said | «Ordine del round: Nespola, Livia, Grosso, Eliandro, Zirrà.» | inizia Nespola 6, Livia 6, Grosso 5, Eliandro 2, Zirrà 1; rerolls at T9, 11, 13, 14, 15 all match |
| CA | T9, T13 | seen (minor): the new round's order said after its first events | T9 «Eliandro muore.» → «Ordine del round: Grosso, Eliandro, Livia, Zirrà, Nespola.»; T13 «Livia cade a terra.» → «Ordine del round: Grosso, Zirrà, Nespola, Livia.» | The round-2 and round-4 hits come before the table hears that round's order. The events themselves follow engine order. |

## Bug 8 — stall
| run | turn(s) | engine stall lines | quote(s) | count of answers with nothing new |
|---|---|---|---|---|
| CM | T1–T2 | stall count `fermi` 0, 1; no E12, no stall move | — | 4 of 20 player turns: T2, T12, T13, T16 |
| CA | T2 | `fermi` 1; no stall move | — | 2 of 12: T2, T12 |
| FB | T2–T13 | `fermi` 0,0,0,1,0,1,0,1,2,0,1,0; **no E12, no stall move** | T10 opening: «Nessuno risponde alla domanda: c'è solo il buio che sale dal bosco.» | 8 of 13: T2, T3, T5, T7, T9, T10, T11, T13 (T8 unsure). The log gives no reason for the resets to 0. A likely cause (unsure) is «go» actions toward places the Engine does not have: T3 «vado a benedirla», T4 «vado al mulino», T6 «Andiamo al guado», T8 «Vado lì, adesso», T11 «Blocco le ruote». But T13 also resets, on a private question with no «go» verb. |
| ST | T4–T12 | E12 at T4 (stallo 1) and T6 (stallo 3); 9 stall moves; hard S1 at T7 and T10; scriptwriter asked at T8 and T11 | see the stall table | 5 of 14: T2, T9, T12 (both only restate known leads), T13, T14. `fermi` 11→0 at T13 on the private «Dimmelo, poi vado.» (unsure why) |

## Bug 9 — NPC presence / wrong addressee
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| FB | T7 | seen | Ugo: «Io non vedo niente. Guardo il fuoco, io.» | Fulco asked someone else: «Chiedo a Oreste se ha visto luci sulla collina» (Oreste does not exist). Ugo is «in piedi» and answers. |
| FB | T11 | seen (mild, same rule) | Berta: «Benedici lui, non le pecore. Lui è lassù.» | Fulco's words were addressed to «Madre Carla» (does not exist) |
| CA | T1→T2 | not seen | «Sì, soldata. Quella sopra il bosco.» | Livia's question was addressed to Berta, and Berta answers |
| ST | T7→T8, T5 | not seen | «Chiamarvi? Vi ho già chiamati, soldata.» · «Berta torna dal fienile con le mani vuote.» | Livia's line is about Berta, who is present. The T5 return is continuity only. |
| CM | T1; T21→T23 | not seen | «Tra i faggi, il mulo di Ugo è già un'ombra.» · «Paga? Non so. Io mangio.» | Ugo leaves and the scene ends with no Ugo line after. «Ehi goblin! Chi vi paga?» is plural and Grosso is the only one standing. |

## Bug 10 — verbatim repetition / restatement
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| FB | T2, T13 (T3 variant) | seen | «Le pecore non aspettano.» · T3 «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | Berta's lines, not Engine lines |
| ST | T2, T3 | near-verbatim | «Le pecore non aspettano.» · «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | — |
| ST | T7→T9, T10→T12 | seen (Engine sentence) | «La Torre Mozza; Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | The S3 leads sentence reuses the clock lines `nar_segno_2` and `nar_segno_3` as a third «strada» |
| CA | — | not seen | — | only Engine lines repeat («Ordine del round: Nespola, Grosso, Zirrà.» at T14 and T15) |
| CM | T15, T21 | Engine replacement (excluded) | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | — |

No narration restates a player's words beyond the announcement.

## 5-line summary
1. One H heard: CA T15, where Zirrà's «Tre per terra…» states Nespola's false 0-HP claim as fact (an assumed state the filter missed). CM, FB and ST have 0.
2. Bugs 1, 2, 3 and 5 are not seen at the table, and the guards fired rightly (R-inesistente, R-dovuto, 5 sceneggiatore drops). But none of the 9 private actions got any answer.
3. Bug 4 is mild: CA T4 is a success with no effect, and many NPC misses are told only by the card. Bug 6 is minor ordering (CM T21, CA T9 and T13). In CM T11 and T25 a PC attack was never rolled.
4. Bug 9 is real in FB: Ugo answers a question put to Oreste, and Berta answers words addressed to Madre Carla. Bug 10 is real in FB (Berta's catchphrase) and in ST's S3 leads sentence.
5. Stall: ST made 9 moves, 8 right and T9 unsure. FB never reaches a stall move because the counter keeps resetting (likely on «go» verbs toward non-existent places, unsure). Announcements: 0 H, 22 attributed false claims, 3 cut mid-phrase. Over-fire: 1 wrong refusal (FB T5).

## H heard at the table, per game (target 0)
| CM | CA | FB | ST |
|---|---|---|---|
| **0** | **1** (T15 «Tre per terra…») | **0** | **0** |

Borderlines, none counted:
- CM/CA T6–T7: the surprised Zirrà acts in idle lines.
- CM T25: a stale `sc_` from T10, «Grosso stringe la mazza e si alza dal fuoco.»
- CA T15: «Grosso posa l'osso sul gradino e prende la mazza ferrata.» He had been hitting with it since T9.
- CA T16: the defeat ending «Vi lascia legati davanti alla porta di ferro…» is said over three dead PCs (by design).
- FB T3: «Tonio è lassù da solo. Tonio, capisci?» sits close to the secret «Tonio è salito da solo, d'accordo con i goblin», but no complicity is told. Not a leak (unsure).
- FB T9: Berta accepts the player's fire as real: «Un fuoco sulla collina? Allora andate, soldata. Presto.»
- CM T14: «Ancora in piedi, riccioli?» states no hit.

Internal ERR `parola segreta nel messaggio del selettore` at FB T6 and T12 and at ST T10: nothing secret was heard.

## The announcement — every claim false for the engine
| run | T | announcement | why false | heard as |
|---|---|---|---|---|
| CM | 11 | «Pugnale ancora, il goblin si gira verso di me» | no engine fact for Zirrà's move; other-subject clause kept | attributed |
| CM | 12 | «La paro con lo scudo. Resisto» | a parry of an attack no card has | attributed |
| CM | 14 | «Lancio il dardo incantato al goblin che la sta» | presumes a strike on Nespola; **cut mid-phrase** | attributed |
| CM | 15 | «Spingo il goblin contro il muro con lo scudo» | «goblin» is nobody (Zirrà dead) | attributed |
| CM | 16 | «Mi chino su Nespola, la trascino dietro lo scudo» | presumes Nespola down; she is «in piedi» | attributed |
| CM | 17 | «Non mi reggo più, striscio dietro la pietra» | false state; state clause kept | attributed |
| CM | 20 | «Dal gradino tiro il pugnale a quello che scappa» | nobody flees | attributed |
| CM | 25 | «Non si ferma nessuno: finisco quello con la lancia» | a creature nobody has; world clause kept | attributed |
| CA | 10 | «La paro con lo scudo. Resisto» | the card is Zirrà's critical hit, followed by «Livia incassa il colpo.» | attributed |
| CA | 14 | «Non mi reggo più, striscio dietro la pietra» | false state | attributed |
| FB | 1 | «La vendo a Valdirame e chiudo il conto» | the key is Berta's and the check failed | attributed |
| FB | 2 | «Sei una bugiarda, si vede dalla faccia» | an unverifiable world claim; the real demand «Dimmi la verità o me ne vado» was dropped | attributed |
| FB | 3 | «Vado a benedirla» | rests on the non-existent mill (its wheel claim dropped) | attributed |
| FB | 4 | «Anch'io vado al mulino. E tu, Berta, se tuo» | no mill; **cut mid-phrase** | attributed |
| FB | 6 | «Andiamo al guado, mi hanno detto» | no ford or shepherd; **dangling** | attributed |
| FB | 7 | «Chiedo a Oreste se ha visto luci sulla collina» | Oreste does not exist | attributed |
| FB | 8 | «Oreste dice che sulla collina c'è una grotta» | an absent NPC and a false fact; other-subject clause kept; the decision «Vado lì, adesso» dropped | attributed (nested report; the closest to an H) |
| FB | 9 | «Sulla strada della grotta incontro una viandante» | a false world event kept | attributed |
| FB | 11 | «Madre Carla, sei una vecchia ladra» · «Madre Carla, dai, ti benedico e ti lascio andare» | the NPC does not exist; «il carretto lo sequestro. Blocco le ruote» dropped | attributed (×2) |
| FB | 12 | «Ci fermiamo al mulino a dormire» | no mill | attributed |
| ST | 11 | «Non so, ha detto poco» | Ugo never answered the T9 private question (unsure) | attributed |

- H from the announcement: **0**. Attributed false claims: 22 (CM 8, CA 2, FB 11, ST 1).
- Clauses the new filter should have dropped but kept: CM T11, T17, T25; FB T8, T9; ST T2 «Berta è lì sotto il portico» (true).
- The cuts look like a ~50-character cap at a word boundary (unsure). CM T16, T18 and T20 also lose their last clause.

## Over-fire check
| run | turn | event | sentence | verdict | why |
|---|---|---|---|---|---|
| CM | 4 | [usa] rifiutato `nar_impronte` | — | right | run and listen ≠ footprints; Ascoltare 94 FAILED; only «senti» matched |
| CM | 6 | R-dovuto | «Zirrà incassa il colpo.» | right | Livia hits for 6 and no line told it |
| CM | 14 | R-dovuto | «Zirrà cade a terra.» | right | Zirrà A TERRA, morto |
| CM | 15 | [usa] rifiutato `nar_mappa` | — | right | pushing ≠ looking at charcoal marks; only «muro» matched |
| CM | 15 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | «goblin» names the dead Zirrà |
| CM | 20 | [usa] rifiutato `nar_conto` | — | right | only «canti» (from «cantina») matched |
| CM | 21 | R-dovuto | «Eliandro cade a terra.» | right | Grosso downs Eliandro (said before Livia's announcement, see bug 6) |
| CM | 21 | R-inesistente | same sentence as T15 | right | «Ehi goblin!» |
| CM | 22 | R-dovuto | «Livia incassa il colpo.» | right | critical hit for 6 |
| CM | 22 | R-dovuto | «Eliandro muore.» | right | death save 3 failed |
| CM | 25 | R-dovuto | «Livia cade a terra.» | right | critical hit, A TERRA |
| CM | 26 | R-dovuto | «Livia muore.» | right | death save 6 failed |
| CA | 4 | [usa] rifiutato `nar_impronte` | — | right (unsure) | the content does not fit listening, but the SUCCESS then had no effect |
| CA | 9 | R-dovuto | «Eliandro muore.» | right | death save 8 failed; Grosso's downing hit is never told |
| CA | 10 | R-dovuto | «Livia incassa il colpo.» | right | Zirrà's critical hit for 6 |
| CA | 13 | [usa] rifiutato `nar_mappa` | — | right | as in CM T15 |
| CA | 13 | R-dovuto | «Livia cade a terra.» | right | Zirrà's 17 vs CA 17 |
| CA | 14 | R-dovuto | «Livia muore.» | right | death save 3 failed |
| CA | 16 | R-dovuto | «Nespola muore.» | right | death save 3 failed |
| FB | 5 | [usa] rifiutato `ber_conti_fienile` (private) | — | **wrong** (unsure) | The action says «quanto ti pagava Ugo»; «pagava» is a form of the listed theme «pagare» (a stem miss). The private question then got nothing. |
| FB | 12 | [usa] rifiutato `ber_cani` | — | right | no dogs in the action |
| ST | 5 | [usa] rifiutato `nar_recinto` | — | right | sitting ≠ examining the gate; the S2 clue came instead |

Extra filter drops (sceneggiatore, «not on the card»):
- CM T13 `sc_subito_t12`: right (no Zirrà attack card).
- CM T17 `sc_subito_t15`: right (Livia had no roll).
- CA T11 `sc_subito_t9`: right. The line was true for T9's card, but it is stale and Eliandro is dead; the check uses the current turn's card.
- CA T12 `sc_subito_t10`: right (unsure). The line was true for T10, but the hit had already been told, so repeating it would sound like a new hit.
- CA T15 `sc_subito_t13`: right (T13's card is a MISS).
- Under-fire: CA T15 «Tre per terra…» passed the filter.

The 11 Engine acknowledgements all match their cards; CM T10 «Nespola ci prova.» is weak for a miss. Counts: CM 9 `coerenza` events and 3 refusals; CA 5 and 2; FB 0 and 2; ST 0 and 1.

## Stall moves (ST) — what reached the table, and the verdict
| T | move | action | at the table | verdict |
|---|---|---|---|---|
| 4 | S1 | Livia «Aspetto.» | prepared `nar_stallo_ovile_corno`: «Dal crinale arriva un colpo di corno, lontano. Le pecore alzano la testa, poi tornano a brucare.» | right |
| 5 | S2 (i_giaciglio) | Fulco sits on the wall | clue `ber_stallo_giaciglio`: «Mancano gli stivali buoni e il mantello. E il pane della settimana, tutto.» | right |
| 6 | S3 (leads) | Eliandro «Guardo in giro.» | clock `nar_segno_1` + prepared `ber_stallo_bosco`: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» «E più su, la Torre Mozza.» | right (a look with no roll, already answered at T3) |
| 7 | hard S1 → mark | Livia «Aspetto ancora…» | clock `nar_segno_2`: «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | right |
| 8 | S2 (i_lavagna) | Fulco «Ci penso. Aspetto.» | clue `nar_lavagna`: «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» | right |
| 9 | S3 | Livia's private question to Ugo, the only action | Engine's leads sentence; the third "road" is a clock line | right by the rule, unsure: "nothing came back" only because the private question got no answer at all |
| 10 | hard S1 → mark → consequence o_mezzanotte@3 | PC-to-PC talk (Fulco, Eliandro) | clock `nar_segno_3` «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» + `ber_salgo_io` | right |
| 11 | S2 (i_pali) | Livia «Aspettiamo che torni.» | clue `nar_pali`: «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» | right |
| 12 | S3 | Fulco «Mi siedo di nuovo. Cosa facciamo adesso?» | Engine's leads sentence; the third "road" is the T10 clock line | right |

FB has **no stall move** (`fermi` trace in bug 8).

## Unanswered public actions and late lines, per game
| game | public actions with no answer | filler only (unsure) | private with no answer | late `sc_` (logged) | inferred between-turn lines (no id) |
|---|---|---|---|---|---|
| CM | 4: T7 Eliandro (card only), T11 Eliandro (no roll), T12 Livia, T25 Livia (no roll) | T4 Livia; T6 Eliandro, Nespola; T16 Livia (the T17 opening «La mazza ferrata di Grosso ondeggia a mezz'aria…» may be the reply) | 2 | 3: T11 ← t9 (Zirrà's key demand); T18 ← t16; T25 ← t10 (15 turns late, stale) | 9 (openings of T7, 9, 10, 11, 14, 17, 18, 21, 23); also dropped late: t12@T13, t15@T17 |
| CA | 2: T6 Livia (card only), T12 Nespola | T4 Livia; T6 Eliandro, Nespola | 2 | 0 said; dropped late: t9@T11, t10@T12, t13@T15 | 5 (T2, 8, 9, 12, 15; the T15 block holds the H) |
| FB | 0 (T7 Fulco answered by the wrong NPC) | — | 3 | 1: T6 ← t4 «Il carbone resta sul mulo. Costa, quello.» | 10 (T2, 3, 4, 5, 7, 8, 9, 10, 12, 13) |
| ST | 0 | T14 Fulco | 2 | 1: T10 ← t6 «Io coi goblin? Mi rubano la legna, quelli.» | 7 (T2–T8) |

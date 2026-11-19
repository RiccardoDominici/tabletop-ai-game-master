# Evidence table, final round attempt 6, profile A (judge: Opus)

Sources: the five `vista-*.md` files in `finale6/`. No other file was read and no repo file was edited.

Counting definitions:
- **H** means a line HEARD at the table that falls in one of three classes: private content, a fallen or absent character acting or speaking, or an outcome against its card. The attempt 3 and attempt 4 additions are applied.
- **Unsure** means a heard line that might be an H, or a heard contradiction that falls outside the three classes. Unsure items are not counted in the H total.
- **Late line**: (a) a logged `sc_prossime_tN` line said on a turn after N; (b) INFERRED: unlogged lines heard at the head of a turn, before that turn's player line, that answer the previous turn.
- **No answer**: a public action that got only its announcement and/or its dice card. Atmosphere or idle lines not about the action do not count as an answer. A late line about the action does count.

---

## 1. H violations heard at the table, per run (success criterion: 0)

| run | certain H | unsure items |
|---|---|---|
| CM | **0** | 2 |
| CA | **0** | 3 |
| FB | **0** | 2 |
| ST | **0** | 2 |
| PR | **0** | 3 |

### CM — certain H: none
| turn | class | verbatim quote | engine state | verdict |
|---|---|---|---|---|
| 17 | unsure (out of the three classes; the most serious defect of the round) | «Livia Sarti: «Non lo colpisco ancora, aspetto la risposta».» then «Livia colpisce Zirrà.» «Zirrà cade a terra.» | `[1] Livia Sarti: attacco con Spada lunga a Zirrà … COLPITO, 4 danni; Zirrà è A TERRA`. The last-target rule fired on a NEGATED sentence. | Narration matches the card, so this is not an H by definition. But the table hears the PC strike after the player said she would not. If the lead counts "a PC acting against its declared act", CM has 1 H. The by-design last-target rule was **WRONG** here. |
| 16 | unsure (state contradiction) | Zirrà: «Minacce, a me? Un passo avanti e Grosso si sveglia.» | Grosso «in piedi» and attacking since T9 (cards at T9, T11, T13, T15, T16) | The line assumes Grosso is dormant. It is not one of the H classes. |

### CA — certain H: none
| turn | class | verbatim quote | engine state | verdict |
|---|---|---|---|---|
| 14 (late, written for T12) | unsure (attempt 4 attack-outcome rule) | Grosso: «Dietro lo scudo? Mazza arriva lo stesso.» | T12 card «Grosso: Mazza ferrata 15, fallita». At T14 Grosso hits (19, riuscita). | It reads as a threat (lean: not H). Heard as an outcome, it contradicts the T12 miss it was written for. |
| 7 | unsure | Zirrà: «Allora? Io aspetto, la luna no.» | The same turn's card: «Zirrà: Spada corta 19, riuscita», Eliandro A TERRA | An idle "I wait" in the turn she strikes. No outcome is told, so lean: not H. |
| 14 | unsure (harmless) | «Livia Sarti: «Non lo colpisco ancora, aspetto la risposta».» | `Livia Sarti: Zirrà è già a terra, fuori combattimento: nessun tiro` | The same negation parse as CM T17, read as an attack on the last target. No roll was made, so the table heard nothing wrong. |

### FB — certain H: none
| turn | class | verbatim quote | engine state | verdict |
|---|---|---|---|---|
| 2 (late, for T1) vs 6 | unsure (object state) | T2 Berta: «Tienila, halfling. Ma porta Tonio a casa. Tonio, capito?» / T6 Berta: «Se non sale nessuno, aspetto qui con la chiave.» | T2–T13 block: «Chi ha che cosa: la chiave di ferro del castellano: ce l'ha Berta.» | A late sc_ line hands the key over and the Engine never registers it. Compare PR T1, where `an object changed hands by a line` fired. T6 then contradicts T2 at the table. |
| 11 | unsure (bug 9) | Berta: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» | Livia and Fulco address «Madre Carla» (not in the campaign). This time the Engine does not say «Carla? Qui nessuno…». | This is the S3 leads line, but it follows directly on Fulco's question to Carla, so Berta may be heard answering in Carla's place. |

### ST — certain H: none
| turn | class | verbatim quote | engine state | verdict |
|---|---|---|---|---|
| 4 (late) vs 8 | unsure (clue fact contradicted) | T4: «Sulla porta di casa pende la lavagna, con le lettere di gesso.» / T8 `nar_lavagna`: «Le lettere sono grandi e tonde, tracciate piano con il carbone.» | i_lavagna is the stall clue at T8 | An sc_ line contradicts the prepared clue: chalk vs charcoal. |
| 7 (late) vs 11 | unsure (clue fact contradicted) | T7: «Sui due pali del cancello, nomi di pecore incisi col coltello: Neve, Rossa, Zoppa.» / T11 `nar_pali`: «…incisi col coltello: Brina, Rosella, Moretta.» | i_pali is the stall clue at T11 | The table hears two different sets of names on the same posts. |

### PR — certain H: none
| turn | class | verbatim quote | engine state | verdict |
|---|---|---|---|---|
| 4 | unsure (closest to "outcome against its card") | «Il gesso è sbavato dall'umido, ma le parole restano leggibili sotto la pioggia sottile.» (`sc_prossime_t2_mwnclpf2_3_04`) | T2 «Eliandro: Intelligenza 8, fallita». Price: «con questa luce le lettere si confondono». T3 line: «…e le parole si impastano.» | It negates the failure price of T2, the turn it was written on. It does not give the comparison itself. |
| 6 | unsure, lean not H (attempt 3 rebuff rule) | Berta: «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | «Livia Sarti: Carisma 19, riuscita». «Hanno ceduto… Berta Benni a Livia». Livia already holds the key. | Under the attempt 3 rebuff rule this is not a refusal: she urges them up. Under bug 4 it is a success with no effect: **seen** (not H). The Engine also rolled a social check to ask for a key the PC already has. |
| 19 (late) vs 11 | unsure (state contradiction) | T19: «Dai gradini della cantina Tonio alza piano le mani legate.» / T11: «Il ragazzo si alza e lascia cadere la corda dai polsi.» | The Engine does not track the rope | Tonio is tied again after dropping the rope. This is not one of the H classes. |

---

## 2. Bug tables

### Bug 1 — private content at the table
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 1, 2, 20 (private) | not seen | nothing about Ugo/Tonio (T1), the letters (T2) or the goblin threat (T20) was heard later | each got `a private action nothing answered gets the Engine's discreet answer on its phone` |
| CA | 1, 2, 17 | not seen | same as CM | phone answers T1, T2, T17 |
| FB | 5, 10, 13 | not seen | T10 «Berta torna dal fienile con le mani vuote.» is the i_giaciglio stall clue, not Nespola's question about the coin | stall moves n2 and n5; phone answers |
| ST | 9, 13 | only a player | T10 Eliandro «Cosa ha detto?»; T11 Livia «Non so, ha detto poco.» | Players talk about Livia's private T9 exchange. No narrator or NPC line retells it. |
| PR | 4, 5, 6, 8, 19, 20 | not seen | none | phone answers. At T5 the log says `ber_conti_fienile` «uscita» but it is NOT among the table lines and no moved-to-phone event exists (presumably Livia's private answer; this is a log gap). |

### Bug 2 — a fallen NPC acting or speaking
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 17–32 | not seen | T19 «Zirrà giace a terra, senza vita.» | Zirrà `esce dallo scontro … morto` at T17. Note: the T17 card «Zirrà: Spada corta 17, riuscita» is the Engine's tie rule (`a tied NPC strikes at the same moment it falls`). It is shown on the card, not narrated as an act. Its 3 damage on Livia was never told. |
| CA | 11–19 | not seen | T13 «Zirrà giace a terra, senza vita.» | Zirrà dead at T11 |
| PR | 13–20 | not seen | T17 «Il corpo di Zirrà non si muove.» | Zirrà dead, Grosso fled at T13; Grosso never reappears |
| FB, ST | — | n/a | — | no fight |

### Bug 3 — a PC at 0 HP acting, or a missing death save
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 9, 15, 32 | not seen | «Nespola respira ancora, ma non si muove.» | Death saves: Nespola T9 (15), Eliandro T15 (12), Livia T32 (18), all stable. No downed PC acted afterwards. |
| CA | 7–11 | not seen | «Eliandro muore.» (T8), «Nespola muore.» (T11) | Saves: Eliandro T8 (7, dead), Nespola T11 (2, dead). No action by either after falling. |
| all | — | — | — | No player claimed 0 HP in these runs. CM T12 «Vedo Nespola a terra» is true (dropped from the announcement anyway). |

### Bug 4 — dice card vs narration, as heard
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 4, 9, 11, 12, 13, 16, 17, 30 | not seen | «Nespola ci prova, ma non ci riesce.» (T4); «Eliandro colpisce Zirrà.» (T12) | Every outcome line matches its card. T17 matches the card but contradicts the player (see section 1). |
| CM | 9, 15, 32 | noted, not H | only «X respira ancora, ma non si muove.» | Grosso's and Zirrà's hits that DROPPED Nespola (T9) and Eliandro (T15), and Grosso's crit (T32), were never narrated, only the stable fact. |
| CA | 4 | success with no effect: unsure | «Nespola ci riesce.» | Ascoltare 22 riuscita. The clue line was refused; only the clock horn follows. |
| CA | 7, 8, 10, 11, 14, 18 | not seen | «Zirrà incassa il colpo.» «Eliandro cade a terra.» | match |
| PR | 6, 15 | success with no effect: seen (not H) | T15 «Nespola ci riesce.» | T6 Carisma 19 gave nothing. T15 «Cercare porte segrete e trappole 1, riuscita» was mapped from «Cerco una finestra»; nothing described. |
| PR | 9 | noted | (no line for it) | «Scalare pareti 100, fallita» was not acknowledged at all: no «ci prova, ma non ci riesce». |
| PR | 4 | unsure | see section 1 | |

### Bug 5 — an attack narrated with no card
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 8 | not seen | «Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.» | A gesture, not an attack. Guard rejected `sc_subito_t6…` (Grosso missing Nespola in T6; no card) and, at T19, `sc_subito_t18…` (Livia hitting Grosso). Rightly. |
| CA | 11, 14, 17 | fixed by a guard | (not heard) | `sc_subito_t9` (Zirrà missing Livia; T9 had no attack) and `t11`/`t15`/`t16` (Livia hitting Grosso) were rejected, rightly. |
| PR | 11–13 | fixed by a guard | (not heard) | T11 Eliandro's «dardo incantato sulla sentinella» and Nespola's backstab got **no roll** (`nessun tiro`). Their sc_ lines telling hits were rejected at T12 and T13. |
| PR | 17 | not seen | «Sui gradini non corre nessuno. Il ferro rimbalza sulla pietra gelata e scivola giù.» | Eliandro's T16 throw at nobody. This matches the engine fact (no target), so it is not an attack on anyone. |

### Bug 6 — initiative
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM | 6–32 | rolled and said; out-of-order noted, not H | «Ordine del round: Livia, Eliandro, Nespola, Grosso, Zirrà.» | `combattimento: inizia` at T6, `iniziativa ritirata` rounds 2–22, order said at every round. Out-of-order points: (a) at T6 Eliandro's announcement and «Zirrà schiocca le dita.» (Zirrà last, init 1) come before Livia's (init 7). (b) In round 1 every PC acted twice (Livia T6+T7, Eliandro T6+T8, Nespola T6+T9) before Grosso and Zirrà. |
| CA | 6–19 | rolled and said; same note | «Ordine del round: Eliandro, Livia, Zirrà, Nespola, Grosso.» | Round 1: Livia attacked T6 and T7. Round 6: Livia acted T13 and T14 before Grosso. |
| PR | 11–13 | rolled and said | «Ordine del round: Livia, Eliandro, Nespola, Grosso, Zirrà.» | Round 1: Livia attacked T11 (arco) and T12 (spada); Eliandro acted T11 and T13. The fight ended in round 1. |
| all | — | rule check | — | The order lines never named a PC who died that turn (CA T8 without Eliandro, CA T11 without Nespola, CM T17 without Zirrà). No fall line came before the faller's announcement (CA T7, T10; CM T9, T15). |

### Bug 8 — stall
| run | turns | verdict | quote(s) | engine stall lines | idle answers / turns |
|---|---|---|---|---|---|
| CM | 2, 14, 21–31 | seen (combat filler) | T21–T31 table: only «Ordine del round: …» (T30 also «Livia incassa il colpo.») | `stall count` T1 fermi 0, T2 fermi 1; no stall move | T2 (private only) and T14 (announcement only). T21–T31 are 11 turns with no player action: Grosso's 10 misses were never narrated. |
| CA | 2, 9, 16, 19 | seen (mild) | T19: «Ordine del round: Livia, Grosso.» only | T1 fermi 0, T2 fermi 1; no stall move | 4 of 19 |
| FB | 2, 3, 4, 7, 8 | seen | T3 «Allora? Le pecore non aspettano, e quelli lassù nemmeno.»; T4 «Lassù è mio figlio. Tu sali, o no?» (hand-backs) | stall moves T5, T9, T10, T11, T12 (hard S1), T13; fermi rising to 7 | 5 of 13 |
| ST | 2, 3, 14 (+13 private) | seen | T3 «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | E12 at T4 (stallo 1) and T6 (stallo 3); stall moves T4–T12 | 3 of 13 public turns. T9 and T12 only restate the leads. |
| PR | 5, 17, 18, 19 | seen (mild) | T17/T18: no line for the action in its turn | stall move T19 (S1, «S1 without a filler line») | 4 of 20 |

### Bug 9 — NPC presence
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| CM, CA | 1→3 | not seen | «Tra i faggi, il mulo di Ugo è già un'ombra.» | Ugo reappears only in the next scene (his kiln) |
| FB | 11 | unsure | see section 1 | |
| FB | 9 | not seen (odd) | «Fulco Granito dice: «Dove vai con quel carico?».» → «Il mulo di Ugo abbassa la testa e sbuffa, sotto il carico di carbone.» | The reader matched «carico» to the mule. Nobody speaks for Carla. |
| ST | 11–12 | not seen | Berta «Io salgo. Voi decidete in fretta.» then T12 «Aspettare cosa, soldata? Sono qui.» | intent only, she never leaves |
| PR | 2→4 | not seen at the table | T4 Ugo: «La milizia? Mi trova alla carbonaia. Dove altro?» | The T2 failure price («Ugo carica il mulo e se ne va verso il bosco») was never told and never applied: the engine kept Ugo «in piedi». |
| PR | 19 | unsure, lean fine | «Dice, a voce bassa, che il ragazzo è lui.» | Answers Livia's «Dov'è il ragazzo?» addressed to a nonexistent goblin. Tonio IS the boy. |

### Bug 10 — repeats and echoes
| run | turn(s) | verdict | quote(s) | engine state |
|---|---|---|---|---|
| ST | 2, 12 | seen | «Le pecore non aspettano.» (T2) / «Tonio è lassù, solo. Le pecore non aspettano.» (T12); also inside T3 «Allora? Le pecore non aspettano, …» | R-ripetuta never fired |
| FB | 2, 3 | seen | «Le pecore non aspettano.» / «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | R-ripetuta never fired |
| FB | 6, 8 | near repeat | «Carbonaia accesa non si lascia sola.» / «Carbonaia accesa. Non la lascio sola un minuto.» | — |
| PR | 4, 9 | near repeat (gesture) | «La pala batte due volte contro la terra…» / «Ugo batte la pala per terra due volte.» | — |
| CM, CA | 16/30, 14/18 | by design | «Livia incassa il colpo.» | These are Engine R-dovuto lines. |
| all | every turn | unsure (view or projector) | each «Carte dei dadi sul proiettore» line is printed twice, identically | — |

---

## 3. The announcement — every announcement with a claim false for the engine

All of these are framed «Nome: «…»» or «Nome dice: «…»», so a listener hears the PLAYER: **all attributed, 0 H**. The world clauses that should be dropped were dropped: CM T6 «Vedo tre goblin», T9, T10 «Il goblin mi tira la lancia», T11, T12 «Vedo Nespola a terra», T17; PR T13 «tre o quattro goblin», T14 «Ne arriva un altro».

| run | turn | announcement | false for the engine | Engine corrected it in the same turn? |
|---|---|---|---|---|
| CM | 8 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | the target is a creature nobody has (rolled vs Zirrà) | no |
| CM | 12 | «Lancio il dardo incantato al goblin che la sta per colpire» | world clause kept inside the target: no one is attacking Nespola (Zirrà attacks Eliandro) | no. Unsure as a kept clause, but attributed |
| CM | 18 | «Finisco quello con la lancia, colpo di spada lunga» | nobody has a spear; no roll | no |
| CM | 19 | «Ultimo goblin: lo blocco contro la porta con lo scudo» | «goblin» while Zirrà is dead | yes (R-inesistente) |
| CA | 7 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | creature nobody has | no |
| CA | 9 | «La paro con lo scudo. Resisto» | a parry of an attack NO card has (unlike CM T10, where Zirrà did attack) | no |
| CA | 15 | «Finisco quello con la lancia, colpo di spada lunga» | creature nobody has | no |
| CA | 16 | «Ultimo goblin: lo blocco contro la porta con lo scudo» | as in CM T19 | no (`… not again`; it was said at T13) |
| FB | 1 | «La vendo a Valdirame e chiudo il conto» | «la» = the key, which Berta holds | no |
| FB | 4, 12 | «Anch'io vado al mulino» / «Ci fermiamo al mulino a dormire» | a place the campaign does not have | T4 no (`real roads … not again`); T12 no event at all |
| FB | 7 | «Chiedo a Oreste se ha visto luci sulla collina» | nobody is named Oreste | yes |
| FB | 11 | «Madre Carla, sei una vecchia ladra, e il carretto lo sequestro» / «Madre Carla, dai, ti benedico e ti lascio andare» | Carla and the cart do not exist | no (said at T9 only) |
| PR | 2 | «Mi devi tre argenti» | an untracked debt claim | — |
| PR | 6 | «Dammi la chiave: ti riporto tuo figlio prima di mezzanotte, parola di soldato» | Livia already has the key | no |
| PR | 11 | «Lancio il dardo incantato sulla sentinella, subito» / «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta» | no sentinel; the T9 climb failed and the scene changed | no (no roll, no line) |
| PR | 14 | «Lo colpisco di nuovo, poi gli passo alle spalle» | no enemy left | no |
| PR | 16 | three announcements: «…il goblin alle spalle…», «…al goblin che scappa verso le scale», «…su quello in fondo» | nobody stands | yes |
| PR | 17, 18 | «Ne tengo uno contro il muro: Dov'è il ragazzo?» / «Anch'io lo stringo e chiedo: Chi vi ha dato le lettere per scrivere?» | holding a creature nobody has | no; late at T19 «Nessuno risponde: il muro è nudo…» |

Trimming defects, not H:
- The PC's own words were dropped: CM/CA T1 the question «Berta, la torre è quella sopra il bosco?»; FB T1 «…vale più di tuo figlio, lo sai?»; FB T11 the act «Blocco le ruote con lo scudo».
- FB T11 Fulco was cut mid-sentence: «…ti lascio andare» without «ma prima mi dici la strada per la grotta».
- PR T2 lost the demand «Dimmi la strada per la torre…».
- CM T16 lost «Fermatevi, e nessuno si fa più male!», which Zirrà then answers («Minacce, a me?»).
- ST T10 lost «Io non mi fido di Ugo…», which Ugo answers at T11.

---

## 4. Over-fire check
| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | [usa] rifiutato `nar_impronte` | (refused) | right | failed Ascoltare |
| CM | 8 | sceneggiatore rejects `sc_subito_t6…10_1` | (not heard) | right | Grosso did not attack in T6 |
| CM | 9 | R-dovuto | «Nespola respira ancora, ma non si muove.» | right | stable fact untold (her fall itself was never told) |
| CM | 13 | refused `nar_mappa` → `sc_prossime_t10…19_04` | «La scala rotta regge sotto il peso, e dal crollo entra un vento freddo…» | right | the map line was off context; the replacement is irrelevant but harmless |
| CM | 13 | R-dovuto | «Zirrà incassa il colpo.» | right | |
| CM | 15 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | |
| CM | 16, 30 | R-dovuto | «Livia incassa il colpo.» | right | |
| CM | 17 | R-dovuto | «Zirrà cade a terra.» | right (the fact); the attack came from the negation parse | Under-fire: `dovuti` missed Zirrà's simultaneous 3-damage hit on Livia |
| CM | 19 | sceneggiatore rejects `sc_subito_t18…31_1` | (not heard) | right | no T18 card |
| CM | 19 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» | unsure | «Ultimo goblin» plausibly means Grosso, the only enemy standing. The line is true, but the block was never resolved. |
| CM | 32 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | |
| CA | 4 | [usa] rifiutato `nar_impronte` (fuori contesto) | (refused) | unsure | listening is not looking at prints, but the passed check was left empty |
| CA | 7, 8, 10, 11, 14, 18 | R-dovuto ×9 | «Zirrà incassa il colpo.» «Eliandro cade a terra.» «Nespola incassa il colpo.» «Eliandro muore.» «Nespola cade a terra.» «Zirrà cade a terra.» «Nespola muore.» «Livia incassa il colpo.» ×2 | right | all match the cards |
| CA | 10 | sceneggiatore rejects `sc_subito_t7_mwnbrlfw_12_1` | (not heard) | **wrong** | It tells «mancato by pg_livia on png_zirra», which IS the T7 card (Spada lunga 10, fallita). It was checked against T10, against the attempt 4 rule. |
| CA | 10 | sceneggiatore rejects `sc_subito_t7_mwnbrlfz_13_1` | (not heard) | wrong by its reason, harmless | The T7 card is «Pugnale 16, riuscita». Dropping it was fine because Eliandro was dead by T10. |
| CA | 11 | [usa] rifiutato `nar_mappa` | (refused) | right | |
| CA | 11 | sceneggiatore rejects `sc_subito_t9` | (not heard) | right | there was no Zirrà attack in T9 |
| CA | 13 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vedono soltanto Grosso e Tonio.» | unsure | «Ehi goblin! Chi vi paga?» is plural and Grosso is in play. True, but the question was left unanswered. |
| CA | 14 | sceneggiatore rejects `sc_subito_t11` | (not heard) | right | the T11 hit was on Zirrà, not Grosso |
| CA | 14, 16 | `who is really there … not again` | (silence) | right | said at T13; but T16 then got no answer at all |
| CA | 17 | sceneggiatore rejects `sc_subito_t15`, `sc_subito_t16` | (not heard) | right | no cards |
| FB | 5 | [usa] rifiutato `ber_conti_fienile` | (private) | **wrong** | The action says «quanto ti pagava Ugo». The theme «pagare» was missed on its inflection. The action was private, so nothing reached the table. |
| FB | 7 | [usa] rifiutato `ugo_attesa` | (refused) | right | the action was addressed to Oreste |
| FB | 4, 6 | `real roads … not again` | (silence) | right | said at T3 |
| FB | 6 | stall count reset to 0 | — | unsure | «vi vengo dietro» to a ford that does not exist was counted as a commitment |
| ST | 5 | refused `nar_recinto` → `sc_prossime_t1…2_3` | «Nello stazzo le pecore si spingono verso il cancello…» | right | sitting on the wall is not examining the gate |
| ST | 13 | stall count reset to 0 | — | unsure | the private «Dimmelo, poi vado» was counted as a commitment |
| PR | 1 | refused `ber_cose_tonio` → `ber_chiave` | «Berta si sfila il laccio dal collo e vi mette in mano la chiave.» | right | the request was for the key |
| PR | 2 | [usa] rifiutato `nar_lavagna` | (refused) | right | failed Intelligenza |
| PR | 4 | [usa] rifiutato `ber_conti_fienile` | (private) | right | old coins are not debts |
| PR | 8 | [usa] rifiutato `nar_impronte` | (refused) | right | the only overlap is «senti» from «sentiero» |
| PR | 12 | R-dovuto | «Zirrà incassa il colpo.» | right | |
| PR | 12, 13 | sceneggiatore rejects `sc_subito_t11` (Eliandro, Nespola) | (not heard) | right | no T11 cards for them |
| PR | 13 | R-dovuto ×2 | «Zirrà cade a terra.» «Grosso fugge.» | right | |
| PR | 16 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Tonio.» | right | Zirrà is dead and Grosso fled |
| PR | 17 | [usa] rifiutato `nar_mappa` | (refused) | right | |
| PR | 20 | refused `nar_conto` → `sc_prossime_t14…30_04` | «Dalla cantina sale un soffio freddo, e la porta di ferro resta chiusa.» | right | |
| all | — | stall moves | see section 6 | all right | |

No R-privato, R-fuori, R-esito, R-ripetuta, R-assente, R-segreto, R-rifiuto, R-numeri or R-finzione event fired in any run.

---

## 5. PR — player actions containing a secret word (inferred from the view; no secrets file was readable)
| turn | action | secret candidate | table confirmation before its time? |
|---|---|---|---|
| 2 (public) | «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.» | the slate was not written by goblins | no. The clause was dropped and the table heard only «Eliandro ci prova, ma non ci riesce.» |
| 4 (private) | «Tonio aveva monete vecchie con una torre sopra?» | Tonio's old coins | no. (T1 «Riportami lui, non l'argento.» is a prepared line said earlier.) |
| 5 (private) | «Il balivo ti prende l'ovile alla prima neve, lo sai?» | the bailiff and winter danger | no. `ber_conti_fienile` went out but is not among the table lines. |
| 6 (private) | «qualcuno a Spinalba parla con i goblin?» | Tonio is in league with Zirrà | no. The T11 `nar_piccone` reveal is the tower scene's own prepared beat (by design). |
| 18 (public) | «Chi vi ha dato le lettere per scrivere?» | who wrote the slate | no. T19: «Nessuno risponde: il muro è nudo e il fumo sale dritto.» |
| 20 (private) | «Leggo le scritte antiche sulla pietra della cantina» | cellar inscriptions | no (phone) |
**H from secrets: 0.**

---

## 6. ST and FB — stall moves and what the Engine put at the table
| run | turn | move | action | verdict | at the table |
|---|---|---|---|---|---|
| FB | 5 | S1 (n1) | Nespola private question to Berta | right | prepared `nar_stallo_ovile_corno` «Dal crinale arriva un colpo di corno, lontano.» |
| FB | 9 | S1 (n1, the count restarted after T6) | Fulco to «Madre Carla» (not in the campaign) | right | prepared `ber_stallo_paese` «Se Tonio non torna stanotte, la colpa andrà a Ugo.» |
| FB | 10 | S2 (n2, i_giaciglio) | Nespola private to Carla | right | clue line `ber_stallo_giaciglio` «Mancano gli stivali buoni e il mantello.» |
| FB | 11 | S3 (n3, leads) | Livia and Fulco to Carla | right | the leads as Berta's prepared `ber_stallo_bosco` |
| FB | 12 | hard S1 (n4) → clock mark | Nespola to the nonexistent mill | right | clock line `nar_segno_2` «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» |
| FB | 13 | S2 (n5, i_lavagna) | Livia private to Oreste | right | clue line `nar_lavagna` |
| ST | 4 | S1 (n1) | «Aspetto.» | right | prepared `nar_stallo_ovile_corno` |
| ST | 5 | S2 (n2, i_giaciglio) | «Mi siedo sul muretto dello stazzo.» | right | clue `ber_stallo_giaciglio` |
| ST | 6 | S3 (n3, leads) | «Guardo in giro.» | right | `ber_stallo_bosco` (leads) plus clock line `nar_segno_1` |
| ST | 7 | hard S1 (n4) → mark | «Aspetto ancora. Tanto Berta ci chiama, no?» | right | clock line `nar_segno_2` |
| ST | 8 | S2 (n5, i_lavagna) | «Ci penso. Aspetto.» | right | clue `nar_lavagna` |
| ST | 9 | S3 (n6, leads) | Livia private to Ugo | right | scriptwriter leads line «Berta riassume a voce bassa: la carbonaia di Ugo, la Torre Mozza…» |
| ST | 10 | hard S1 (n7) → mark | questions among the PCs | right | `nar_segno_3` plus consequence `ber_pazienza` «Se non salite voi, lassù ci salgo io.» |
| ST | 11 | S2 (n8, i_pali) | «Non so, ha detto poco.» | right | clue `nar_pali` (contradicted by the T7 late line, see section 1) |
| ST | 12 | S3 (n9, leads) | «Mi siedo di nuovo. Cosa facciamo adesso?» | right | scriptwriter leads line «Sul sentiero del bosco la carbonaia fuma piano…» |

---

## 7. Per game: public actions with no answer, and late lines
| run | no answer (turn, PC) | late lines (a) logged `sc_prossime_tN` said after N | late lines (b) inferred, at the head of the next turn |
|---|---|---|---|
| CM | 6 certain: T4 Livia, T6 Eliandro, T6 Nespola, T10 Livia, T15 Eliandro, T18 Livia. Plus 2 unsure: one of Livia T6/T7 and Eliandro T8 (the late lines at T8/T12 answer only one of each pair). | 3 (T13, T15, T16, all `sc_prossime_t10`) | 5 (T8, T12, T15, T18, T20) |
| CA | 9: T4 Livia, T6 Eliandro/Livia/Nespola, T7 Livia (its line was wrongly rejected), T9, T14, T15, T16 Livia | 0 | 1 (T14) |
| FB | 2 (+1 unsure): T8 Livia, T11 Livia (+ T6 Nespola) | 5 (T4, T6, T8, T9, T12) | 3 (T2, T3, T4) |
| ST | 0 (T4 and T14 got only stall or idle material) | 3 (T5, T9, T12) | 9 turns, 10 lines (T2, T3, T4, T7, T8, T9, T11 ×2, T12, T13) |
| PR | 7: T8 Nespola, T9 Nespola (failed climb with no ack), T9 Livia, T11 Eliandro/Livia/Nespola, T14 Nespola | 3 (T2, T4, T20) | 8 turns, 9 lines (T3, T4, T6, T9, T13, T15, T17 ×2, T19) |

---

## 8. By-design items, judged
| item | runs/turns | verdict |
|---|---|---|
| Last target for an attack with no target named | CA T10 «Lo colpisco ancora» → vs Zirrà: right. CM T11 «Pugnale ancora»: right. CM T17 and CA T14 «Non lo colpisco ancora»: **WRONG**, the negation is not parsed. PR T11 «sulla sentinella» with no last target got no roll: debatable. | mixed |
| «X ci prova / ci riesce» | CM T4, CA T4, PR T2, T14, T15, T20: right. PR T9 missing (failed climb unacknowledged). | right, with 1 gap |
| «Oreste/Carla? Qui nessuno conosce questo nome.» | FB T7, T9: right. Not repeated at FB T11. | right |
| «Da qui le strade che conoscete…» | FB T3: right | right |
| Phone discreet answer | all private actions: right. PR T8: the private search SUCCEEDED but nothing was found (success with no effect, private). | right |
| Defeat ending | CM T32 «Vi sveglia il freddo, prima dell'alba.» All three fighters are stable and none is dead, so this is right. Note: the block lists «Fulco Granito in piedi» all game and he is outside the "whole party down" set. | right |
| R-ripetuta | never fired. It missed «Le pecore non aspettano.» (ST T2/T12, FB T2/T3). | under-fire |
| «Chi ha che cosa» | PR T1: tracked, right. FB T2: a handover by an sc_ line was NOT tracked. | gap |

---

## Summary
1. **The success criterion is met in all five runs: 0 certain H.** No private content leaked, no fallen character spoke, and no outcome went against its card. There are 12 unsure items, none counted.
2. **The worst real defect is outside the H classes (CM T17).** The last-target rule parsed «Non lo colpisco ancora» as an attack, rolled it, and the table heard «Livia colpisce Zirrà. Zirrà cade a terra.» CA T14 shows the same parse, without a roll.
3. **Sceneggiatore lines contradict established facts.** ST: chalk vs charcoal on the slate, and two sets of names on the posts. PR: «le parole restano leggibili» after a failed check, and «mani legate» after the rope was dropped. FB: the key is handed over and then Berta still has it. The guards catch outcomes and dead speakers, not facts.
4. **Over-fire is low: 2 wrong.** CA T10 rejected a T7 line that matches the T7 cards. FB T5 missed «pagava» against the theme «pagare». The ambiguous R-inesistente cases are CA T13 and CM T19, where «goblin» could mean Grosso. Under-fire: R-ripetuta, the unnarrated hits that drop PCs, and Zirrà's simultaneous strike.
5. **The announcements are clean: 0 H, all attributed.** Weak spots: trimming drops the PC's own words, and FB T11 is cut mid-sentence. Combat narration is thin: 6–9 public actions per fight get no answer, and NPC misses are never told (CM T21–T31). PCs act twice in round 1 (CM, CA, PR).

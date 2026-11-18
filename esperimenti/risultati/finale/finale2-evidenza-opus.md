# Evidence table: e2e COHERENCE layer, final round, Profile A (blind judge, Opus)

Sources: only the five evidence views named in the brief. Run labels: CM (combat, manual), CA (combat, automatic), FB (off the rails), ST (stall), PR (pressure). Turn numbers are the views' "Turno N" headings. Quotes are copied verbatim from the views.

## 1. Success criterion: H violations HEARD at the table (after the checker)

| Run | H heard | Unsure | H list (turn, verbatim quote, why) |
|---|---|---|---|
| CM | 0 | 0 | none |
| CA | 0 | 1 | none (unsure: T16, below) |
| FB | 0 | 0 | none |
| ST | 0 | 0 | none |
| PR | 1 | 0 | T2: «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» A clue line said after a FAILED check |
| **Total** | **1** | **1** | |

**H-1. PR, T2 (bug 4: an outcome against its dice card).**
- Eliandro's action was «Copio la lavagna in fretta».
- The table then heard `nar_lavagna`: «Le lettere sono grandi e tonde, tracciate piano con il carbone.» / «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.»
- The card says «Eliandro: Intelligenza 6, fallita».
- The engine fact says «Prezzo del fallimento: con questa luce le lettere si confondono» and «non raccontarlo come riuscito, e nessuna battuta lo dà lo stesso».
- The log has `repertorio: battuta uscita nar_lavagna` and no refusal. The small reader failed, and the deterministic fallback picked the line.
- So the table hears a sharp reading of the letters on a failed roll whose own price says the letters blur.
- Limit: the views do not show whether this check gates `nar_lavagna` itself or the comparison clue, which is `nar_pali`, a separate line (ST T11).
- Strongest counter-fact: in FB T13 and ST T8 the Engine itself gives out `nar_lavagna` as a stall clue, with no roll (`battuta aggiunta dal Motore`, `tipo: indizio`). So the clue itself is free.
- It stays an H because this turn's card is a failure, and its own price («le lettere si confondono») is contradicted at the table.

**Unsure-1. CA, T16 (bug 9). It would be an H, as an absent character speaking or a secret before its time.**
- Eliandro's action was «Lo tengo fermo col piede e chiedo: Dov'è il ragazzo?».
- The table heard «Il ragazzo tiene gli occhi bassi e parla piano.» … «Dice che l'argento della cripta era l'unico modo, e che sua madre non doveva saperlo.» (`nar_tonio_parla`)
- The boy is in no «In scena» block in any turn of any run.
- The Engine itself told the table at T10 and T14: «Oltre a voi, qui non si vede nessuno in piedi.»
- The question was put to «lo», the goblin held under Eliandro's foot (Zirrà is dead), not to the boy.
- The views cannot show two things: whether the boy counts as present for the Engine, and what `nar_tonio_parla`'s release condition is.
- Why `nar_piccone` is not also unsure: the same untracked boy acts there («Poi porta a Zirrà un piccone…», at CM T6, CA T6 and PR T11). But the scene opening has just put him on the steps («Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa»). No Engine sentence has denied that anyone is there, and no question was put to someone else.
- At CA T16 both deciding grounds apply: the Engine's own «nessuno in piedi» (T10 and T14), and a question addressed to another.

Announcements: 0 H. Every announcement that carries a false claim is attributed (section 5).

## 2. Five-line summary
1. **Bug 4 is the only bug that produced an H** (PR T2: a clue on a failed INT check). Low-severity outcome gaps are also real:
   - successes answered with a bare ack, or with nothing (CA T4, PR T9, PR T14);
   - Zirrà's hit on Livia never told (PR T14);
   - Grosso's misses narrated as standing still (CM T19, T22);
   - a CHA check rolled for a key Livia already held (PR T6).
2. **Bugs 1, 2, 3, 5 and 10 were not seen at the table.**
   - Every private action stayed on its phone.
   - Dead Zirrà and fled Grosso never acted.
   - No PC at 0 HP acted, and every 0-HP claim (Nespola) was only a player's claim.
   - The guard filtered 9 sceneggiatore lines whose outcome was not on the card. CM T15 was a real H prevented.
3. **Bug 9 was seen once (CA T16, unsure for H).** The boy is untracked, and the Engine's own sentence says nobody is standing. He answers a question put to the goblin and tells the campaign's core secret.
4. **Bug 6:** initiative was rolled every round in all three fights. It was said at the table every round except PR T15, the defeat. But:
   - the narration follows the players' posting order, not initiative (CM T6, CA T8, PR T11);
   - PR T13 shows Grosso and Nespola's save skipped while Zirrà acted, and PR T15 shows Grosso attacking twice in one turn (round attribution unsure).
5. **Bug 8:** all 15 stall moves (FB 6, ST 9) were right. But CA T10–T15 had six turns in a row with nothing new and no stall move, and `fermi` never went above 1. The views do not show which action reset the counter. Each reset turn has both an attack on a corpse or a nonexistent creature and a move («Indietreggio», «striscio dietro la pietra», «Torno da Nespola»). The announcement filter dropped most false clauses but kept 8 (6 kinds), all attributed (0 H).

## 3. Rules I used (one line each)
- **Answered:** some line in that turn, or a late line at the head of a later turn, is about the action, its target or its outcome.
  - These count: Engine acks, outcome lines, the who-is-there, no-such-name and roads sentences, a stall-move line on an idle action, and late sc_ answers.
  - These count as **filler only**: a `*_attesa_*` or `nar_attesa_*` line, or an unrelated scene or clock line.
  - Denominator: the public PC actions.
- **Nothing new (bug 8):** in that turn the table heard no new clue, no new choice or lead, and no world move (a card, a clock sign, an NPC pressure or stall move, a scene or combat event).
  - Fillers, the who-is-there and no-name sentences, and bare order lines are nothing new.
  - `nar_cani_scappano` (the dog shows the path) counts as a world move in every run.
  - Denominator: turns with at least one public action.
- **Late sc_ line (inferred):** a line at the head of a turn, before any player line, with no `battuta uscita` in that turn's log. The views give no id for these. `sc_prossime_*` lines are listed by id.

## 4. Bug tables

### Bug 1: private content at the table
| run | turn(s) | verdict | verbatim quote(s) from the table | engine state that decides it |
|---|---|---|---|---|
| CM | T1, T2, T25 | not seen | T1: «Il sentiero entra nel bosco subito dietro il fienile.». T25: only «Ordine del round: Livia, Grosso, Nespola.» | each private action got `a private action nothing answered gets the Engine's discreet answer on its phone`. T25 private «goblin» gave `pubbliche: []`, so no who-is-there line was said |
| CA | T1, T2, T17, T18 | not seen | T2: «Sì, è quella. Sopra il bosco, oltre il crinale.» (answers Livia's public question) | discreet answer on the phone, each time |
| FB | T5, T10, T13 | not seen | only stall material: «Dal crinale arriva un colpo di corno, lontano.» / «Berta torna dal fienile con le mani vuote.» / «Le lettere sono grandi e tonde, tracciate piano con il carbone.» | stall moves S1/S2/S2. Discreet answers at T10 and T13 |
| ST | T9, T13 | not seen | T9: «Vi tornano in mente le strade ancora aperte: La carbonaia di Ugo; La Torre Mozza.». T11: «Non so, ha detto poco» is Livia's own public words (her announcement), not a narrator retelling | discreet answers at T9 and T13 |
| PR | T4, T5, T6, T8 | not seen | T5: the table heard only «Paese. Sempre domande, mai carbone.» | T5: `battuta uscita ber_conti_fienile` (2 lines) is absent from the table view, so it went to Livia's phone. T8: Eliandro's private success (Cercare 1 contro soglia 3) got only the discreet answer |

### Bug 2: a fallen NPC acts or speaks later
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T8–T25 | not seen | after the death only the Engine's «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.». The T8 Zirrà lines («Ahi! Riccia, questa la paghi cara!») come before Eliandro's killing blow in the same turn | `esce dallo scontro png_zirra morto` (T8) |
| CA | T9–T18 | not seen | «Nessuna lancia attraversa la torre: non c'è più mano che la tenga.» (T12, correct) | T9: Zirrà `morto`, Grosso `fuggito` |
| PR | n/a | not applicable | no NPC fell | Grosso and Zirrà «ferito gravemente» at the end |
| FB, ST | n/a | not applicable | no fight | n/a |

### Bug 3: a PC at 0 HP acts / death save
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T12, T15, T16 | only a player claim | players: «Vedo Nespola a terra.» (T12), «Ho zero punti ferita, sono a terra.» (T15) | Nespola is NOT at 0 HP: «Nespola Tondi in piedi» in every block, and she is never hit |
| CM | T16 | not seen (rule held) | «Eliandro muore.» | Eliandro A TERRA. Death save 9 vs CD 10 rolled the same turn, so `morto`. No Eliandro action afterwards |
| CM | T17 | low: the narrator leans on the false claim (no H category) | «Sulle pietre resta il solco lasciato dal corpo trascinato.» | Nespola is in piedi. Livia's drag is «nessun tiro: l’azione riesce se è possibile» |
| CA | T12, T15 | only a player claim | «Ho zero punti ferita, sono a terra.» (T12). Eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa» (T15) | Nespola is NOT at 0 HP: in piedi, and Grosso missed her (T7) |
| PR | T12–T15 | not seen (no PC at 0 HP acted). Death save delayed, not missing | «Nespola cade a terra.» (T12), «Nespola respira ancora, ma non si muove.» (T14) | Nespola A TERRA T12; no save in T13; save 20 in T14, so «stabile». Eliandro A TERRA T14, save 2 in T15, `morto`. Livia A TERRA T15, save same turn, `morto` |

### Bug 4: dice card vs narration heard at the table
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| PR | T2 | **seen: H** | «Le lettere sono grandi e tonde, tracciate piano con il carbone.» / «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» | «Eliandro: Intelligenza 6, fallita»; «con questa luce le lettere si confondono»; «nessuna battuta lo dà lo stesso» |
| PR | T6 | seen: the Engine contradicts itself (narration agrees with the card, so not H) | «Livia ci prova, ma non ci riesce.» | the CHA check is for «un PG chiede a Berta di affidargli la chiave», yet «Chi ha che cosa: … ce l'ha Livia» since T1. The price says «Berta stringe la chiave» |
| PR | T14 | seen: a hit on a PC never told (omission) | the table heard «Eliandro cade a terra.» / «Nespola respira ancora, ma non si muove.» and nothing for Zirrà's attack | card «Zirrà: Spada corta 19, riuscita» (Zirrà hits Livia for 1). It is not among the `mancanti` |
| PR | T9, T14 | low: success with no effect | T9: «La carbonaia sbuffa, e da una crepa esce una lingua di fuoco.». T14: «Livia ci riesce.» | Scalare pareti 5 vs 80 SUCCESSO, but nothing about seeing the tower. Forzare una porta 3 vs 3 SUCCESSO, but nothing behind the door |
| CA | T4 | low: success with only the ack | «Nespola ci riesce.» | Ascoltare 29 vs 30 SUCCESSO. `nar_impronte` refused, so only the clock horn follows |
| CA | T15 | low: a wrong pick narrates an act nobody did | «La porta di ferro non cede alla spalla, e il colpo rimbomba fino alla scala.» | no card and no door action. Eliandro bandages; Livia «Finisco quello con la lancia» has no roll |
| CM | T19, T22 | low: an NPC attack heard as no attack (outcome agrees: no harm) | «Il muso color fango non si muove, solo la mascella smette di masticare.» (T19, written for T18) / «Grosso tiene la mazza bassa e non si muove dal fuoco.» (T22) | cards «Grosso: Mazza ferrata 8, fallita» / «Grosso: Mazza ferrata 5, fallita»: Grosso attacked Livia and missed |
| CM | T6–T16 | not seen otherwise | «Zirrà incassa il colpo.», «Zirrà cade a terra.», «Livia manca Grosso.», «Eliandro muore.» | all match their cards. Grosso's misses at T9, T11, T24 and T25 are on the card only |
| CA | T6–T9 | not seen | «Livia manca Zirrà.» / «Eliandro colpisce Zirrà.» / «Grosso fugge.» | match the cards |
| FB | T1 | not seen (the failure is untold, not contradicted) | «Al limite degli alberi si ferma, si volta e aspetta.» | Carisma 13 vs CD 17 fallita. The price «Berta stringe la chiave…» is never told |
| CM, CA | T7–T25 | fixed by a guard | 9 lines never heard: `sc_subito_t6_mwlz35lc_8_1`, `…t8_mwlz4r0o_14_1`, `…t10_mwlz6j00_19_1`, `…t12_mwlz7wpa_23_1`, `…t14_mwlz9hel_27_1`, `…t24_mwlzfqas_42_1` (CM); `sc_subito_t6_mwlzlbbv_11_1`, `…t8_mwlzmxwk_15_1`, `…t8_mwlzmxwm_16_1` (CA) | `sceneggiatore: the outcome the line tells is not on the card` |
| ST | n/a | not applicable | no rolls | n/a |

### Bug 5: an attack narrated with no card
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| all five | n/a | not seen | no narrator or NPC line narrates an attack without a card | n/a |
| CM, PR (the inverse: an attack declared, no roll, no outcome) | CM T22; PR T11 ×2, T15 | seen (engine gap, no H) | «Finisco quello con la lancia, colpo di spada lunga» / «Lancio il dardo incantato sulla sentinella, subito» / «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta» / «Scudo contro scudo, tiro la spada su quello in fondo» | «nessun tiro: l’azione riesce se è possibile» while a living enemy was in play (Grosso in CM; Grosso and Zirrà in PR) |
| CM | T14 (also T12) | attack lost (the brief's Grosso exception) | «Spingo il goblin contro il muro con lo scudo e lo colpisco» | «goblin» was mapped to dead Zirrà: «Zirrà è già a terra, fuori combattimento: nessun tiro». Grosso was the only enemy standing |

### Bug 6: initiative
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T6 + every round | rolled and said | «Ordine del round: Nespola, Eliandro, Livia, Grosso, Zirrà.» | `combattimento: inizia` T6. `iniziativa ritirata` at T9, T11, T14, T16, T18, T20, T22, T24, T25, each said at the table |
| CM | T6 | out of order (low) | announcements in the order Eliandro, Livia, Nespola | Nespola 8, Eliandro 4, Livia 3 |
| CM | T6–T8 | unsure | Livia's hit (T6), Nespola's (T7), Eliandro's (T8). No Grosso or Zirrà card before T9 | the next reroll is at T9 |
| CA | T6, T8 | rolled and said | «Ordine del round: Nespola, Grosso, Eliandro, Livia, Zirrà.» | `inizia` T6, `ritirata` T8 |
| CA | T6–T7, T8 | out of order (low) | Livia's hit (init 2) told at T6; Grosso's attack (init 6) only at T7. At T8 «Livia manca Zirrà.» comes before «Eliandro colpisce Zirrà.» | at T8, Eliandro 7 > Livia 5 |
| PR | T11, T13, T14 | rolled and said; T15 not said (defeat) | «Ordine del round: Nespola, Grosso, Eliandro, Livia, Zirrà.» | `inizia` T11, `ritirata` T13, T14, T15 |
| PR | T11 | out of order (low) | announcements in the order Eliandro, Livia, Nespola | Nespola 7 first |
| PR | T13 | seen (round attribution unsure): turns skipped | card «Zirrà: Spada corta 6, fallita», but no Grosso card and no save for Nespola | round 2: Eliandro 4, Livia 4, Grosso 4, Nespola 3, Zirrà 1 |
| PR | T15 | unsure | «Grosso: Mazza ferrata 5, fallita · Zirrà: Spada corta 20, riuscita · Grosso: Mazza ferrata 17, riuscita» | the round-4 reroll falls in the middle of the turn's facts |

### Bug 8: stall
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | n/a | no stall move. 5/17 public turns had nothing new (T12, T13, T15, T18, T20); T13, T15, T18 and T20 got a late sc_ answer in the next turn | T20: only «Ordine del round: Nespola, Livia, Grosso.» | stall count T1 `fermi 0`, T2 `fermi 1` |
| CA | T10–T15 | **seen: a missed stall.** 6/13 public turns had nothing new, all six in a row after the fight | T12: nothing after «Mi chino su Nespola, la trascino dietro lo scudo e la copro» | `fermi` went 1, 0, 0, 1, 0, 0. Which action reset it is not in the views: each reset turn has both an attack on a corpse or a nonexistent creature and a move. `stall lines asked of the scriptwriter` at T10, T13, T18, but none reached the table |
| FB | T5, T9–T13 | stall moves fired, all right (section 7). 4/10 public turns had nothing new (T2, T4, T7, T8) | T8: only «Livia Sarti: «Vado lì, adesso».» | `world: stall move` n1–n5. No E12 line |
| ST | T4–T12 | stall moves fired, all right (section 7). 3/12 public turns had nothing new (T2, T3, T14) | «Le strade restano quelle: La carbonaia di Ugo; La Torre Mozza. La scelta è vostra.» (T12, with leads, by design) | E12 at T4 (`stallo 1`) and T6 (`stallo 3`). Stall moves n1–n9 |
| PR | n/a | no stall move. 3/13 public turns had nothing new (T3, T4, T5) | «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» (T4) | `fermi` 1, 0, 0, 0 |

No answer handed the question back with nothing new (no "la domanda resta a voi" of the brief's kind). The «che cosa fate?» lines are scene openings.

### Bug 9: NPC presence
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CA | T14 → T16 | **seen (unsure for H)** | «Oltre a voi, qui non si vede nessuno in piedi.» (T14), then «Il ragazzo tiene gli occhi bassi e parla piano.» (T16) | the boy is in no «In scena» block. «Dov'è il ragazzo?» was put to «lo» under Eliandro's foot |
| FB | T11 | borderline, by design | «Madre Carla, dai, ti benedico e ti lascio andare», then «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» | Berta's S3 leads line comes right after a question to the nonexistent Carla (the Carla sentence is not repeated). It is the Engine's leads, not an answer in Carla's place |
| CM | T1 → T3 | not seen | «Tra i faggi, il mulo di Ugo è già un'ombra.», then Ugo at his own kiln | different scene |
| PR | T2 → T5 | not seen at the table (engine side) | «Ugo batte la pala per terra due volte.» (T5) | the T2 failure price «Ugo carica il mulo e se ne va verso il bosco» was never told and never applied: Ugo stays «in piedi» |
| ST | n/a | not seen | n/a | n/a |

The Engine's who-is-there sentence ignores the boy shown standing by `nar_piccone`:
- CM: «Oltre a voi, in piedi qui si vede soltanto Grosso.»
- CA: «Oltre a voi, qui non si vede nessuno in piedi.»

It is harmless in CM and leads to the CA T16 case.

### Bug 10: verbatim repeats / restating
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| all five | n/a | not seen for non-engine lines | no prewritten or sc_ line said twice within a run | n/a |
| CM | T10, T14, T18, T24 | Engine line, by design (throttled in between) | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | `who is really there said at the table` / `…not again` |
| CA | T10, T14 | Engine line, by design | «Zirrà giace a terra, senza vita. Oltre a voi, qui non si vede nessuno in piedi.» | same |
| CM, CA | CM T6/T7, CA T6/T8; CM T16/T18, T20/T22 | Engine lines, by design | «Zirrà incassa il colpo.»; «Ordine del round: Nespola, Grosso, Livia.»; «Ordine del round: Nespola, Livia, Grosso.» | R-dovuto / order. Verified with `sort \| uniq -d` over the table lines: these are the only verbatim duplicates |
| CA | T8 | the same hit told twice (an Engine over-fire, section 6) | «Eliandro colpisce Zirrà.» then «Zirrà incassa il colpo.» | ack + R-dovuto |
| ST | T4, T6 | near-duplicate, not verbatim | «Dal crinale arriva un colpo di corno, lontano.» / «Dal crinale scende un corno di capra, lungo e stonato.» | stall line + clock sign |

Player words restated as narration: nothing beyond the by-design announcements.

## 5. The announcement (every announcement with a claim false for the Engine)
Rule: a name prefix plus a first-person verb or «dice» means a listener hears the player's words, so it is attributed. All of the following are attributed (0 H).

| run | turn | announcement (verbatim) | false for the Engine | heard as |
|---|---|---|---|---|
| CM | T8 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | no lance in the Engine (target resolved as Zirrà, alive) | attributed |
| CM | T10 | «La paro con lo scudo. Resisto» | parries an attack no card has | attributed (the Engine's who-is-there line followed) |
| CM | T12 | «Lancio il dardo incantato al goblin che la sta per colpire» | no goblin standing, and nobody about to hit Nespola | attributed, uncorrected (throttled) |
| CM | T14 | «Spingo il goblin contro il muro con lo scudo e lo colpisco» | «lo colpisco» is an outcome no card has; the goblin is dead | attributed, corrected |
| CM | T15 | «Non mi reggo più, striscio dietro la pietra» | PC state: Nespola in piedi | attributed, uncorrected |
| CM | T16 | «Mi chino su Nespola, la trascino dietro lo scudo e la copro» | presupposes Nespola is down (she is in piedi) | attributed |
| CM | T22 | «Finisco quello con la lancia, colpo di spada lunga» | a creature nobody has; «finisco» has no card | attributed, uncorrected (no «goblin» word, so no R-inesistente) |
| CM | T24 | «Ultimo goblin: lo blocco contro la porta con lo scudo» | no goblin standing | attributed, corrected |
| CA | T8 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | as CM T8 | attributed |
| CA | T10 | «La paro con lo scudo. Resisto» | as CM T10 | attributed, corrected (Engine line + T12 «Nessuna lancia attraversa la torre…») |
| CA | T11 | «Spingo il goblin contro il muro con lo scudo e lo colpisco» | dead or nonexistent; outcome with no card | attributed, uncorrected (throttled) |
| CA | T12 | «Non mi reggo più, striscio dietro la pietra» / «Lancio il dardo incantato al goblin che la sta per colpire» / «Mi chino su Nespola, la trascino dietro lo scudo e la copro» | PC state false / creature nobody has / presupposes Nespola is down | attributed, uncorrected |
| CA | T14 | «Dal gradino tiro il pugnale a quello che scappa verso la cantina» | nobody there | attributed, corrected |
| CA | T15 | «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte» | Nespola is not wounded; Livia is fighting nobody | attributed |
| CA | T15 | «Finisco quello con la lancia, colpo di spada lunga» | as CM T22 | attributed |
| CA | T16 | «Ultimo goblin: lo blocco contro la porta con lo scudo» / «Lo tengo fermo col piede e chiedo: Dov'è il ragazzo?» | nobody to block or hold | attributed |
| FB | T1, T4, T6, T12 | «La vendo a Valdirame e chiudo il conto» / «Anch'io vado al mulino» / «Andiamo al guado» / «Ci fermiamo al mulino a dormire» | she does not hold the key; the places do not exist | attributed (intentions) |
| FB | T3 | «Vado a benedirla» | the referent (the mill wheel, which does not exist) was dropped from the announcement | attributed (an intention), then the roads sentence |
| FB | T7 | «Chiedo a Oreste se ha visto luci sulla collina» | Oreste does not exist | attributed, corrected («Oreste? Qui nessuno conosce questo nome.») |
| FB | T8 | «Vado lì, adesso» | «lì» is the cave the nonexistent Oreste spoke of | attributed, uncorrected (no line at all) |
| FB | T9 | «Sulla strada della grotta incontro una viandante con un carretto» | a world claim (a road, a wayfarer, a cart) | attributed («incontro»), partly corrected («Carla? Qui nessuno conosce questo nome.») |
| FB | T11 | «Madre Carla, sei una vecchia ladra, e il carretto lo sequestro» / «Madre Carla, dai, ti benedico e ti lascio andare» | Carla and the cart do not exist | attributed («dice»), not corrected that turn |
| PR | T2 | «Mi devi tre argenti» | no Engine fact | attributed («dice») |
| PR | T6 | «Dammi la chiave: ti riporto tuo figlio prima di mezzanotte, parola di soldato» | Livia already holds the key | attributed («dice») |
| PR | T11 | «Lancio il dardo incantato sulla sentinella, subito» / «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta» | no roll for either; «colpisco» has no card | attributed |
| PR | T12 | «Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle» | «Ne arriva un altro» is a world clause (it fits Grosso) | attributed |
| PR | T14 | «Guardo dentro la porta: tre o quattro goblin» | no such goblins | attributed («Guardo»), uncorrected |
| PR | T15 | «Scudo contro scudo, tiro la spada su quello in fondo» | no roll; «quello in fondo» is unresolved | attributed (an intention) |

**Clause-filter misses** (what this round changed; none is H):
- **PR T14:** «tre o quattro goblin» was kept, and the act the Engine actually resolved (player: «Tiro il dardo al più vicino!») was dropped.
- **FB T9:** «Sulla strada della grotta incontro una viandante…» was kept, and the question «Madre Carla? Dove vai con quel carico?» was dropped.
- **PR T12:** «Ne arriva un altro» was kept.
- **CM T15 and CA T12:** «Non mi reggo più» was kept.
- **CA T15:** «mentre Livia combatte» was kept.
- **CM T24 and CA T16:** «Ultimo goblin:» was kept.

The other false clauses were dropped correctly: «Vedo tre goblin», «Ho zero punti ferita, sono a terra», «Vedo Nespola a terra», «Il goblin mi tira la lancia», «Il goblin mi prende alla spalla, sento sangue», «Oreste dice che…», «Vedo una sentinella goblin!».

The filter also dropped some of the PCs' own words:
- FB T2: «Dimmi la verità o me ne vado»;
- FB T11: «Blocco le ruote con lo scudo»;
- CM T18: «Fermatevi, e nessuno si fa più male!»;
- ST T1: «Aspettiamo qui o andiamo?».

## 6. Over-fire check
| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | T4 | `[usa] rifiutato` nar_impronte (Nespola) | (table: «Nespola ci prova, ma non ci riesce.») | right | the roll failed (74 vs 30) and the line is about looking at tracks. The match was only «senti» from «sentiero» |
| CM | T6 | R-dovuto | «Zirrà incassa il colpo.» | right | Livia hit (15 vs CA 14, 7 damage) and nothing else told it |
| CM | T7 | sc filter `sc_subito_t6_mwlz35lc_8_1` | not heard | right | Eliandro had no card in T6 or T7 |
| CM | T7 | R-dovuto | «Zirrà incassa il colpo.» | right | Nespola's hit (20) |
| CM | T8 | R-dovuto | «Zirrà cade a terra.» | right | Zirrà A TERRA |
| CM | T10 | sc filter `sc_subito_t8_mwlz4r0o_14_1` (a_terra) | not heard | right in effect | T8's own card had it, but «Zirrà cade a terra.» was already said. "No card of this turn" is strict for a late line |
| CM | T10 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | «Il goblin mi tira la lancia»: no goblin standing |
| CM | T12 | sc filter `sc_subito_t10_mwlz6j00_19_1` (mancato) | not heard | right in effect | the miss was on T10's card and already said («Nespola manca Grosso.») |
| CM | T14 | sc filter `sc_subito_t12_mwlz7wpa_23_1` (colpito Grosso) | not heard | right | Eliandro's T12 dart had no roll |
| CM | T14 | `[usa] rifiutato` nar_mappa (Livia) | not heard | right | a shield shove is not looking at charcoal marks; the only shared word is «muro» |
| CM | T14 | R-dovuto | «Eliandro incassa il colpo.» | right | Grosso 19 vs 12, 2 damage |
| CM | T14 | R-inesistente | «Zirrà giace a terra, … soltanto Grosso.» | right (the sentence is true) | Livia probably meant Grosso, the only one standing. Her attack got no roll (bug 5) |
| CM | T15 | sc filter `sc_subito_t14_mwlz9hel_27_1` (colpito Grosso) | not heard | right: a real H prevented | Livia had no card at T14 |
| CM | T16 | R-dovuto | «Eliandro muore.» | right | death save failed |
| CM | T18 | R-inesistente | «Zirrà giace a terra, … soltanto Grosso.» | right, harmless | «Ehi goblin!» was really for Grosso, who answers at T19 («Paga? Nessuna paga. Solo fame.»). The sentence is true |
| CM | T24 | R-inesistente | same | right | «Ultimo goblin» |
| CM | T25 | sc filter `sc_subito_t24_mwlzfqas_42_1` | not heard | right | Livia had no card at T24 |
| CA | T4 | `[usa] rifiutato` nar_impronte on a success | (table: «Nespola ci riesce.») | right | the line is off-topic (tracks, not listening). It leaves a success with only the ack |
| CA | T6 | R-dovuto | «Zirrà incassa il colpo.» | right | Livia's hit (14 vs 14) |
| CA | T8 | sc filter `sc_subito_t6_mwlzlbbv_11_1` (mancato by Zirrà) | not heard | right | Zirrà never attacked Nespola |
| CA | T8 | R-dovuto | «Zirrà incassa il colpo.» | **wrong (redundant, harmless)** | the Engine's own ack «Eliandro colpisce Zirrà.» had just told the hit. At CM T11 and PR T13 the ack counted |
| CA | T9 | R-dovuto ×2 | «Zirrà cade a terra.» / «Grosso fugge.» | right | Zirrà A TERRA; morale 9 vs 8, Grosso flees |
| CA | T10 | sc filters `sc_subito_t8_mwlzmxwk_15_1`, `sc_subito_t8_mwlzmxwm_16_1` | not heard | right in effect | both outcomes were on T8's card and already said by acks, and Zirrà was dead by T10 |
| CA | T10 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, qui non si vede nessuno in piedi.» | right (event) | no enemy is standing. The sentence ignores the boy, who speaks at T16 |
| CA | T14 | R-inesistente | same | right (event) | same caveat |
| FB | T5 | `[usa] rifiutato` ber_conti_fienile (Nespola, private) | not heard | unsure | its text is in no view. The action says «quanto ti pagava Ugo» and the theme «pagare» was missed by inflection. But its themes decima and balivo are the secret's words (PR T5, CA T16), so withholding may be right |
| FB | T12 | `[usa] rifiutato` ber_cani (Nespola) | not heard | right | «Ci fermiamo al mulino a dormire» has nothing about dogs |
| ST | T5 | `[usa] rifiutato` nar_recinto (Fulco) | not heard | right | sitting on the wall is not examining the gate; the only shared stem is «stazz» |
| PR | T1 | the reader's ber_cose_tonio replaced by ber_chiave | «Berta si sfila il laccio dal collo e vi mette in mano la chiave.» | right | Carisma 17 vs CD 17 succeeded for the key |
| PR | T4 | `[usa] rifiutato` ber_conti_fienile (Nespola, private) | not heard | right | she asked about old coins; the line is about debts |
| PR | T8 | `[usa] rifiutato` nar_impronte (Nespola) | not heard | right | she is moving, not looking. The match was «senti» from «sentiero» |
| PR | T12 | R-dovuto ×2 | «Grosso incassa il colpo.» / «Nespola cade a terra.» | right | both are on the cards |
| PR | T14 | R-dovuto ×2 | «Eliandro cade a terra.» / «Nespola respira ancora, ma non si muove.» | right | owed. Under-fire: Zirrà's hit on Livia (19, riuscita) was never said (unsure whether it was owed) |
| PR | T15 | R-dovuto ×2 | «Livia muore.» / «Eliandro muore.» | right | both death saves failed |
| FB, ST | all | stall moves | section 7 | all right | none fell on a real decision |

No `coerenza: violazione` other than R-dovuto and R-inesistente occurred. These never occurred:
- R-fuori, R-esito, R-privato, R-assente, R-segreto, R-rifiuto, R-ripetuta, R-numeri, R-finzione;
- `narratore: riga al tavolo … spostata al suo telefono`;
- a dropped repetition;
- a fight the GM opened with an NPC first;
- a scene-outcome gate (midnight at the sheepfold or the kiln);
- «Nessuno di voi si rialza…».

## 7. Stall moves (FB and ST): what the Engine put at the table, and the verdict
| run | turn | move | the action | at the table | verdict |
|---|---|---|---|---|---|
| FB | T5 | S1 soft | Nespola, private, to Berta: «quanto ti pagava Ugo per il carbone?» | prepared `nar_stallo_ovile_corno`: «Dal crinale arriva un colpo di corno, lontano. Le pecore alzano la testa, poi tornano a brucare.» | right (T2–T5: insults, a nonexistent mill twice, a private question) |
| FB | T9 | S1 soft (the counter restarted) | Fulco: «Sulla strada della grotta incontro una viandante con un carretto. Madre Carla?» | prepared `ber_stallo_paese`: «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» | right (a nonexistent road and person) |
| FB | T10 | S2, clue i_giaciglio | Nespola, private, to «Madre Carla» | prepared `ber_stallo_giaciglio`: «Berta torna dal fienile con le mani vuote.» / «Mancano gli stivali buoni e il mantello. E il pane della settimana, tutto.» | right |
| FB | T11 | S3, leads | Livia: «il carretto lo sequestro. Blocco le ruote con lo scudo.»; Fulco: «ti benedico» | prepared `ber_stallo_bosco`: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» / «E più su, la Torre Mozza.» | right (take and use-object verbs, but on a cart that does not exist) |
| FB | T12 | hard S1, a mark on o_mezzanotte | Nespola: «Ci fermiamo al mulino a dormire.» | clock sign `nar_segno_2`: «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | right |
| FB | T13 | S2, clue i_lavagna | Livia, private, to «Oreste» | clue line `nar_lavagna`: «Le lettere sono grandi e tonde, tracciate piano con il carbone.» / «Ogni erre è rovesciata…» | right |
| ST | T4 | S1 soft (E12 stallo 1) | Livia: «Aspetto.» | prepared `nar_stallo_ovile_corno` (as FB T5) | right |
| ST | T5 | S2, clue i_giaciglio | Fulco: «Mi siedo sul muretto dello stazzo.» | prepared `ber_stallo_giaciglio` (as FB T10) | right |
| ST | T6 | S3, leads (E12 stallo 3) | Eliandro: «Guardo in giro.» | clock sign «Dal crinale scende un corno di capra, lungo e stonato.» + prepared `ber_stallo_bosco` (leads) | right |
| ST | T7 | hard S1, a mark | Livia: «Aspetto ancora. Tanto Berta ci chiama, no?» | clock sign `nar_segno_2` | right |
| ST | T8 | S2, clue i_lavagna | Fulco: «Ci penso. Aspetto.» | clue line `nar_lavagna` | right |
| ST | T9 | S3, leads | Livia, private, to Ugo | the Engine's sentence of the leads: «Vi tornano in mente le strade ancora aperte: La carbonaia di Ugo; La Torre Mozza.» | right |
| ST | T10 | hard S1, a mark, + consequence o_mezzanotte@3 | Fulco: «Che fai, Livia?»; Eliandro: «Cosa ha detto?» | `nar_segno_3`: «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» + `ber_pazienza`: «Se non salite voi, lassù ci salgo io.» | right |
| ST | T11 | S2, clue i_pali | Livia: «Non so, ha detto poco. Aspettiamo che torni.» | clue line `nar_pali`: «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» | right |
| ST | T12 | S3, leads | Fulco: «Mi siedo di nuovo. Cosa facciamo adesso?» | the Engine's sentence: «Le strade restano quelle: La carbonaia di Ugo; La Torre Mozza. La scelta è vostra.» | right |

Counter resets (no move fired; these are judgements on the counter):
- **FB T6 (`fermi 0`), unsure:** on «Lascio Ugo con il suo carbone e vi vengo dietro» and «Andiamo al guado». The ford is flagged «no commitment». The reset is either the clock sign of the same turn or «vi vengo dietro» counted as a move. If the latter, it is wrong: he follows the others to a nonexistent ford.
- **ST T13 (`fermi 0`), wrong-leaning:** on Eliandro's private «Dimmelo, poi vado.». A conditional "then I go" inside a private question commits to nothing, and the table heard nothing that turn.
- **CA T11–T15, wrong in effect (cause inferred):** the counter kept falling to 0 while the table was stuck. The views do not show which action reset it. Each reset turn has both an attack on a corpse or a nonexistent creature and a move («Indietreggio», «striscio dietro la pietra», «Torno da Nespola»). If the attacks did it, they should be treated like going to a place the campaign lacks.

## 8. PR: player actions that contain a word of a secret
| turn | action (verbatim) | secret word(s) | did the table hear a confirming line before its time? |
|---|---|---|---|
| T2 | «Mi devi tre argenti.» | «argenti» (silver) | no (the table heard the dog line) |
| T2 | «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.» | the slate is not the goblins' | it heard the `nar_lavagna` clue on a FAILED check. That is the bug-4 H above, counted once. The line does not say who wrote it |
| T4 (private) | «Tonio aveva monete vecchie con una torre sopra?» | old coins with a tower (the crypt silver) | no: «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» |
| T5 (private) | «Il balivo ti prende l'ovile alla prima neve, lo sai?» | balivo, first snow, the sheepfold taken (the core secret) | not at the table (it heard «Paese. Sempre domande, mai carbone.»). `ber_conti_fienile` (themes debiti/decima/balivo) went to Livia's phone. Whether it confirmed the secret privately is unsure, because its text is not in the view |
| T6 (private) | «qualcuno a Spinalba parla con i goblin?» | Tonio is with the goblins | no. At T11 `nar_piccone` («Poi porta a Zirrà un piccone, senza che nessuno lo spinga.») is the tower scene's own reveal, at its time |
| (T1, no secret word) | «Berta, dammi la chiave e dimmi dov'è Tonio.» | n/a | Berta's prewritten key line hints at the silver: «È fredda, la chiave. Riportami lui, non l'argento.». It was given on a successful check, so not before its time |

PR secret H at the table: 0 beyond the T2 bug-4 H.

## 9. Per game: unanswered public actions and late lines
| run | public actions | no line at all (only the announcement) | filler only | late sc_ answers (inferred) | sc_prossime said later |
|---|---|---|---|---|---|
| CM | 21 | 1: T12 Eliandro («Lancio il dardo incantato al goblin che la sta per colpire») | 2: T4 Livia, T6 Eliandro | 9 answers, 18 lines, at the heads of T8 (×2), T10, T12, T14, T16, T17, T19, T21 | `sc_prossime_t14_mwlz9hel_28_04` at T22 |
| CA | 25 | 8: T11 Livia, T11 Nespola (the T12 lance line may answer her), T12 ×3, T13 Eliandro, T15 Livia, T16 Livia | 4: T4 Livia, T6 Nespola, T7 Nespola, T15 Eliandro (the wrong «porta di ferro» line) | 3 answers, 6 lines, at the heads of T2, T7, T12 | `sc_prossime_t11_mwlzowcn_25_06` at T13; `sc_prossime_t11_mwlzowcn_25_03` at T15 |
| FB | 13 | 1: T8 Livia («Vado lì, adesso») | 3: T1 Nespola, T2 Livia, T6 Nespola | 0 | 0 |
| ST | 13 | 0 | 3: T2 Fulco, T3 Eliandro, T14 Fulco | 0 | 0 |
| PR | 19 | 2: T9 Livia, T15 Livia (her sword stroke; «Livia muore.» is the NPCs' outcome) | 10: T3, T4, T5, T8 ×2, T9 Nespola, T11 ×3 | 0 | 0 |

## 10. Other observations (outside the bug list, for the record)
- **Each dice card appears twice in the views.** Every «Carte dei dadi sul proiettore» line comes twice in a row in all four runs that rolled. It is unsure whether the projector really showed it twice.
- **The small reader failed often.** It (`Qwen3-0.6B`) returned invalid JSON on most turns, and the deterministic fallback chose the line (`llm: si usa il ripiego deterministico`). This is behind the wrong picks at PR T2 (`nar_lavagna`) and CA T15 (the door line).
- **The defeat ending binds two dead PCs.** At PR T15 the prepared ending is «Vi lascia legati davanti alla porta di ferro, con la candela che si consuma.», but Livia and Eliandro are «non è più in vita». Only Nespola is alive, and she is unconscious. Using the prepared ending and pausing the table was right («Nessuno di voi si rialza…» is only for an all-dead party). Tying up the dead is low-severity.
- **«evening pace» jumps the o_mezzanotte value** (CM T17 `"da": 6, "a": 17`; CA T18 `"da": 6, "a": 18`). Its meaning is unsure, and no gate or consequence fired from it.

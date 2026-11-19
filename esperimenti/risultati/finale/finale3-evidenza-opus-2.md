# Evidence table: finale3, profile A, torre-mozza (blind judge: Opus)

Sources: only the five evidence views named in the brief. Run labels: CM (combat, manual), CA (combat, automatic),
FB (off the rails), ST (stall), PR (pressure). Quotes are copied verbatim from the table lines.

**Counting rules, fixed once for the whole report**
- **H** = something heard at the table that contradicts the engine: private content, a fallen/dead/absent character
  acting or speaking, or an outcome against its card. Lines a guard replaced don't count, and neither do the Engine's
  by-design lines.
- **Listening test for announcements.** A clause inside «Nome: «…»» or «Nome dice: «…»» counts as the player's
  words (attributed, not H), following the brief's framing rule. It would be H only if the claim showed up in
  narrator-voice text outside the quote. No such case was found. The announcement section also gives the total you
  get when the world or state clauses that the filter should have left out are counted as H.
- **Late lines.** (a) *Certain*: a logged `sc_…_tN` id said at a turn later than N. Caveat: `sc_prossime_tN` lines may
  be written for later turns on purpose, so "late" is literal here. (b) *Inferred*: lines heard at the head of a turn,
  before that turn's player input, with no id in the log. They answer the previous turn, so they arrived after it.
- **No answer.** Tier A is the brief's literal sense: no line about the action at all after its announcement (only the
  round order or a card, or nothing). Tier B: only unrelated filler (idle lines, clock marks, stall lines, Engine
  lines about something else).
- **Bug 8.** Anchored on the engine's `fermi` values and stall-move lines. My own count of "answers with nothing
  new" is given beside them.

---

## 1. H violations heard at the table, per run (success criterion, target 0)

| run | H certain | H unsure | turn | verbatim quote(s) | engine state that decides it |
|---|---|---|---|---|---|
| CM | **0** | 1 | T32 | «Nespola muore.» … «La notte passa sulla torre. Vi sveglia il freddo, prima dell'alba.» | Nespola: «non è più in vita: non parla né agisce, il corpo è lì». The prepared defeat ending `nar_sconfitta_grosso` has every PC wake up, the dead one included. |
| CA | **0** | 1 | T22 | «La notte passa sulla torre. Vi sveglia il freddo, prima dell'alba.» | Livia dead since T19 («Livia muore.», `esce dallo scontro pg_livia morto`). Same defeat line. |
| FB | **0** | 1 | T2 (answers T1) | «Berta abbassa la voce, calmissima…» / «Ladra, questa chiave non si vende. Tonio è lassù.» | T1 card «Nespola Tondi: Carisma 18, riuscita»; `attitude changed … png_berta indifferente → amichevole`. Berta's rebuff reads as a failure after a success. Unsure because what a success should give here is unclear (Nespola doesn't hold the key). |
| ST | **0** | 0 | — | — | No fight, no cards. No private retelling, no absent NPC speaking. |
| PR | **0** | 1 | T32 | «Livia respira ancora, ma non si muove.» … «Vi sveglia il freddo, prima dell'alba.» | Nespola dead since T24 («Nespola muore.»). Same defeat line. |

- **Total certain H = 0** in all five runs, under the listening test above.
- **Unsure = 4.** Three of them share one cause, seen three times: the prepared defeat ending says «Vi sveglia il
  freddo» while one PC is dead. The brief's own sentence for the all-dead case («Nessuno di voi si rialza…») does not
  apply, because the others are only unconscious. The line still has a dead PC wake up. If the lead counts it, it is
  +1 H each for CM, CA and PR.
- **Alternative total** if the surviving world/state clauses in announcements are counted as H (see section 3):
  CM +1 (T15), CA +1 (T14), FB +1 (T9), PR +2 (T12, T13), ST +0.

---

## 2. Bug tables

### Bug 1: private content at the table
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T1, T2, T26 | not seen | private: «Tonio è vivo? Dimmi la verità…» (to Ugo), «Chi a Spinalba sa scrivere così bene…» (to Berta), «Parla, e ti lascio andare. Dov'è il ragazzo?». No later public line retells them. | `fatti_privati` ×3; discreet phone answer T1, T2, T26 |
| CA | T1, T2 | not seen | same two private actions; Berta's «Tonio è lassù. Andate adesso.» (T2) answers Livia's public question | discreet answer T1, T2 |
| FB | T5, T10, T13 | not seen | T9 stall line «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» is the prepared `ber_stallo_paese` and does not retell T5 | discreet answer T10, T13; T5 has no discreet-answer log (pick refused, `deviazione png_berta`) |
| ST | T9, T13 | not seen | Livia's later public «Non so, ha detto poco» (T11) is the player's own words | discreet answer T9, T13 |
| PR | T4, T5, T6, T8, T19 | not seen | `ber_conti_fienile` (balivo theme) is logged as said at T5 but is **not heard at the table per the view** | discreet answer T6, T8, T19 |

### Bug 2: a fallen NPC acts or speaks
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T7→T32 | not seen | after «Zirrà cade a terra.» the only line is the Engine's «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | `esce dallo scontro png_zirra morto` T7 |
| CA | T12→T22 | not seen | Grosso T17 «Lei là, ferma. Io stanco.» refers to the body; Zirrà does nothing | morto T12 |
| PR | T13→T32 | not seen | — | morto T13 |
| FB, ST | — | n/a | no fight | — |

Non-existent goblins («il goblin con la lancia», «tre o quattro goblin», «ultimo goblin», «la sentinella») appear only
inside player announcements, never in narrator or NPC lines (see section 3). The scriptwriter lines that carried an
outcome no card had were filtered out (CM T7, T8, T10×2, T14×2, T15; CA T7, T13, T14; PR T12, T14).

### Bug 3: a PC at 0 HP acts; death saves
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T12 | not seen; save present | «Eliandro respira ancora, ma non si muove.» | Eliandro A TERRA T12, save 17 → stabile (after the Round 3 entry, his slot). He doesn't act afterwards. |
| CM | T15 | **only a player claim** | player: «Ho zero punti ferita, sono a terra.»; announced «Non mi reggo più, striscio dietro la pietra» | Nespola «in piedi», never hit before T32 |
| CM | T29–T30 | not seen; save present | «Livia cade a terra.» / «Livia respira ancora, ma non si muove.» | down T29, save 17 at T30 (her round-12 slot) |
| CM | T32 | save present | «Nespola muore.» | save 6 → morto; then the defeat line (section 1, unsure) |
| CA | T8–T10 | not seen; save present | «Eliandro cade a terra.» … «Eliandro respira ancora, ma non si muove.» | down T8; save 15 at T10, logged before Zirrà's turn and before Round 3, so it is his round-2 slot. Not late. |
| CA | T14 | **only a player claim** | player: «Ho zero punti ferita, sono a terra.»; announced «Non mi reggo più, striscio dietro la pietra» | Nespola 3/5 HP, «in piedi» |
| CA | T19, T22 | saves present | «Livia muore.» / «Nespola respira ancora, ma non si muove.» | 5 → morto; 18 → stabile |
| PR | T12–T14 | not seen; save present | «Eliandro cade a terra.» … «Eliandro respira ancora, ma non si muove.» | save 20 at T14 (his round-2 slot) |
| PR | T24, T32 | saves present | «Nespola muore.» / «Livia respira ancora, ma non si muove.» | 8 → morto; 10 → stabile |

No downed PC acts in any run, and no death save is missing.

### Bug 4: dice card against narration, as heard
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T4–T32 | not seen | T7 «Livia colpisce Zirrà.» «Zirrà cade a terra.»; T11 «Eliandro manca Grosso.»; T12 head «Il ferro batte sulla pietra del muro…» | every narrated outcome matches its own card; late miss lines (T12, T17, T19) match their turn's miss card |
| CA | T19 | not seen (sequencing risk) | «Il ferro fende l'aria e batte sul muro, scheggiando la pietra.» then «Livia muore.» | the miss line belongs to T18's card (8 fallita) and arrived late, right before T19's hit (21 riuscita). It agrees with its own card but is heard back to back with the hit. |
| FB | T1→T2 | unsure | «Ladra, questa chiave non si vende.» | Carisma 18 riuscita; Berta → amichevole |
| PR | T9 | seen (mild): success with no effect | Nespola climbs; table: «La carbonaia sbuffa, e da una crepa esce una lingua di fuoco.» | «Scalare pareti 16, riuscita»; no line says what she sees |
| PR | T6 | not seen (failure price never told) | only «Paese. Sempre domande, mai carbone.» | Carisma 12 fallita; price «Berta stringe la chiave…» not said |
| PR | T11 | not seen (miss untold) | — | «Livia Sarti: Arco corto 10, fallita», no line |
| ST | — | n/a | no cards | — |

By design: «Nespola ci prova, ma non ci riesce.» (CM T4, PR T14, PR T21), «Nespola ci riesce.» (CA T4), «Livia ci
riesce.» (PR T15). Each one matches its card.

### Bug 5: an attack narrated with no card
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T8, T9, T13 | not seen at the table | «Colpo alle spalle con la spada corta» / «…al goblin con la lancia» / «Spingo il goblin… e lo colpisco» | target mapped to dead Zirrà: «nessun tiro»; no narrator line tells a hit |
| CM | T21 | not seen at the table (engine gap) | «Finisco quello con la lancia, colpo di spada lunga» | «nessun tiro: l'azione riesce se è possibile» for an attack in a fight |
| CA | — | not seen | — | every PC attack has a card (T6–T12); T18 was mapped to dead Zirrà |
| PR | T11 (×2), T13, T16, T17 | not seen at the table (engine gap at T11, T17) | «Lancio il dardo incantato sulla sentinella, subito» / «Scudo contro scudo, tiro la spada su quello in fondo» | T11 Eliandro and Nespola, and T17 Livia: «nessun tiro: l'azione riesce se è possibile»; T13, T16: dead Zirrà |
| FB, ST | — | n/a | — | — |

Every NPC attack has a card. The gap is engine-side: an attack on an unresolved target («la sentinella», «quello in
fondo», «quello con la lancia») becomes «riesce se è possibile» with no roll. The table never heard it told as a hit.

### Bug 6: initiative
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T6–T32 | rolled: yes. Said: yes, every round | «Ordine del round: Livia, Nespola, Eliandro, Grosso, Zirrà.» (T6) … «Ordine del round: Eliandro, Grosso, Livia, Nespola.» (T28) | `combattimento: inizia` T6 (manual initiative asked), `iniziativa ritirata` rounds 2–15. After the opening turn the `fatti` follow the order (Livia T7, Nespola T8, Eliandro and Grosso T9, then Round 2). |
| CM | T6 | unsure (opening turn) | announcements in message order (Eliandro, Livia, Nespola); «Zirrà incassa il colpo.» comes before the order line | Livia's opening attack (16 riuscita) is resolved before initiative applies, and the order is said after it |
| CA | T6–T22 | rolled, said; in order after the opening | «Ordine del round: Nespola, Eliandro, Grosso, Zirrà, Livia.» | T6: Livia (initiative 2, last) hits before the order is said. From T7 on: Nespola, then Eliandro, Grosso and Zirrà (T8), then Livia (T9). |
| PR | T11–T32 | rolled, said; in order after the opening | «Ordine del round: Eliandro, Zirrà, Livia, Nespola, Grosso.» | T11: Livia's bow (miss) resolved before the order is said. Round 1 from T12: Eliandro, Zirrà, then Livia, Nespola and Grosso (T13). |

Not supported: actions out of the engine's order after the opening turn, and a PC acting twice in a round. The only
point to report is the opening turn: message order, with the order line coming after the opening attack. Whether that
is by design is unsure.

### Bug 8: stall
| run | engine stall lines | stall moves | my count: answers with nothing new / turns with player input |
|---|---|---|---|
| CM | `fermi` 0 (T1), 1 (T2); no E12 | none | 6/19: T2 (private only), T8 (only the Engine's Zirrà line), T14 (order only), T15 (nothing), T21 (no roll, idle Grosso line), T26 (private, order) |
| CA | `fermi` 1 (T2) | none | 3/14: T2, T14, T15 |
| FB | `fermi` T2 0, T3 1, T4 2, T5 3, T6 0, T7 1, T8 2, T9 3, T10 4, T11 5, T12 6, T13 7. "Go somewhere the campaign does not have": T3 «benedirla», T4 «mulino», T6 «guado». Scriptwriter asked for stall lines T9, T13. | T5 S1, T9 S1, T10 S2, T11 S3, T12 hard S1, T13 S2 | 5/13: T2, T3, T4, T7, T8 |
| ST | `fermi` T2 1 … T12 11, T13 0, T14 1; E12 T4 (stallo 1), T6 (stallo 3); scriptwriter asked T8, T11 | T4 S1, T5 S2, T6 S3, T7 hard S1, T8 S2, T9 S3, T10 hard S1 and consequence, T11 S2, T12 S3 | 5/14: T2, T3, T9 (stall line repeats T7 verbatim), T13 (private), T14 |
| PR | `fermi` T3 1, T4 0, T5 0, T8 0 | none | 3/19: T3, T16, T19 |

Hand-backs: «Berta Benni: Allora?» (ST T3, PR T3, FB T3 «Allora? Le pecore…»), «Venite, o restate?» (ST T3),
«Sali, o no?» (FB T5). Each came with a stall or late line in the same or next turn.
Possible under-fires (unsure): `fermi` reset to 0 at FB T6 on «Lascio Ugo con il suo carbone e vi vengo dietro» (a
move with no destination) and at ST T13 on a private question ending «Dimmelo, poi vado».

### Bug 9: NPC presence
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | T1→T3 | not seen | «Tra i faggi, il mulo di Ugo è già un'ombra.» | the scene ends; Ugo is next met in the following scene (carbonaia) |
| FB | T7, T9 | not seen (guard right) | «Oreste? Qui nessuno conosce questo nome.» / «Carla? Qui nessuno conosce questo nome.» | `ugo_niente_visto` and `sc_prossime_t1…` refused: nobody answers in Oreste's or Carla's place |
| FB | T11 | unsure | Fulco to «Madre Carla»: «…mi dici la strada per la grotta»; Berta: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» | stall S3 line (by design). It gives the real roads, not the grotto, but follows a question put to a non-existent NPC. |
| PR | T3 | unsure (mild) | Livia to Ugo: «Parla, o la milizia ti trova in fretta» → «Berta Benni: Allora?» | `ber_attesa` trimmed by R-ripetuta; Ugo answers late, at T4 |
| PR | T6 | seen (mild) | Livia to Berta: «Dammi la chiave…» → «Ugo Faggioli: Paese. Sempre domande, mai carbone.» | `ugo_attesa` idle line on the turn Berta was addressed; Berta's refusal is never said |
| CA, ST | — | not seen | — | — |

### Bug 10: verbatim repeats and restatement
| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| ST | T7, T9 | **seen** | «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | T7 `nar_segno_2`; T9 `sc_prossime_t8_…_stallo_02`, same text; R-ripetuta did not fire |
| ST | T2, T11 | seen | «Berta Benni: Le pecore non aspettano.» | 9 turns apart, probably outside the repeat window |
| ST | T10, T12 | seen (clause) | «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» / «…e i cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» | `nar_segno_3`, then `sc_prossime_t11_…_23_7` |
| FB | T2, T3 | seen (tic not dropped) | «Le pecore non aspettano.» / «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» | ST T3 and PR T3 trimmed the same `ber_attesa` for this tic; FB T3 did not |
| PR | T9 | seen (gesture, same turn) | «Ugo non si volta, ma stringe il manico della pala.» / «Dietro, nella radura, Ugo guarda il sentiero e stringe la pala.» | two late lines |
| CM | T8, T12, T18, T24 | by design | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | Engine line («who is really there») |
| all | — | by design / view artefact | «Ordine del round: …», «… incassa il colpo.», «… respira ancora, ma non si muove.»; every «Carte dei dadi» line printed twice | Engine lines; the doubled cards are not narration |

Players' words restated as narration: none beyond the by-design announcement.

---

## 3. The announcement: every announcement with a claim false for the engine

The listening test is the one given at the top. The column «should have been left out» marks a world or state clause
the brief says the filter removes.

| run | turn | announcement (verbatim) | false for the engine | heard as | should have been left out? |
|---|---|---|---|---|---|
| CM | T9 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | no spear goblin; target mapped to dead Zirrà | attributed | no (the act's target) |
| CM | T12 | «La paro con lo scudo. Resisto» | no attack on Livia this turn (Grosso hit Eliandro) | attributed | no ("la" points to the dropped spear clause) |
| CM | T13 | «Spingo il goblin contro il muro con lo scudo e lo colpisco» | «il goblin» = dead Zirrà; «lo colpisco» with no card | attributed | no |
| CM | T15 | «Non mi reggo più, striscio dietro la pietra» | Nespola «in piedi», unhurt | attributed | **yes** (PC-state clause) |
| CM | T21 | «Finisco quello con la lancia, colpo di spada lunga» | no such creature; no card | attributed | no |
| CM | T24 | «Ultimo goblin: lo blocco contro la porta con lo scudo» | no goblin left (Grosso is a hobgoblin) | attributed | no |
| CA | T8 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | spear goblin doesn't exist (engine read it as Zirrà, in play) | attributed | no |
| CA | T10 | «La paro con lo scudo. Resisto» | no attack on Livia this turn | attributed | no |
| CA | T14 | «Non mi reggo più, striscio dietro la pietra» | Nespola 3/5 HP, «in piedi» | attributed | **yes** |
| FB | T1 | «La vendo a Valdirame e chiudo il conto» | the key is Berta's («Chi ha che cosa») | attributed | no |
| FB | T4, T6, T12 | «Anch'io vado al mulino» / «Andiamo al guado» / «Ci fermiamo al mulino a dormire» | places the campaign doesn't have | attributed | no (by design) |
| FB | T7 | «Chiedo a Oreste se ha visto luci sulla collina» | no Oreste | attributed | no; the Engine answers «Oreste? Qui nessuno conosce questo nome.» |
| FB | T9 | «Sulla strada della grotta incontro una viandante con un carretto» | no grotto, no traveller | attributed (first person) | **yes**. The world clause was kept and the real question «Madre Carla? Dove vai con quel carico?» was dropped. |
| FB | T11 | «Madre Carla, sei una vecchia ladra, e il carretto lo sequestro» / «Madre Carla, dai, ti benedico e ti lascio andare» | no Carla, no cart | attributed («dice») | no |
| PR | T2 | «Mi devi tre argenti» | no such debt | attributed («dice») | no |
| PR | T11 | «Lancio il dardo incantato sulla sentinella, subito» / «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta» | «la sentinella» not resolved; no card | attributed | no |
| PR | T12 | «Guardo dentro la porta: tre o quattro goblin» | only Zirrà and Grosso | attributed («Guardo…») | **yes**. The world clause was kept and the act «Tiro il dardo al più vicino!» was dropped. |
| PR | T13 | «Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle» | nobody arrives; Zirrà dead; no card | attributed (borderline: the first clause isn't first person) | **yes** |
| PR | T16 | «Colpisco il goblin alle spalle con la spada corta, e lo tengo fermo» | dead Zirrà; no card | attributed | no |
| PR | T17 | «Scudo contro scudo, tiro la spada su quello in fondo» | target unresolved; no card | attributed | no |
| PR | T18 | «Ne tengo uno contro il muro: Dov'è il ragazzo?» | holding someone, with no card | attributed | no |

- **H from announcements: 0** under the test. Counting the «yes» column as H would add 5: CM T15, CA T14, FB T9,
  PR T12, PR T13.
- **Correctly left out:** «Vedo tre goblin», «Io sono lento», «Io sono la più veloce» (CM/CA T6); «Il goblin a destra
  ha la schiena scoperta»; «Il goblin mi tira la lancia»; «il goblin si gira verso di me»; «Il goblin mi prende alla
  spalla»; «Oreste dice che…»; «È quasi mezzanotte!».
- **Over-trimmed, the PC's own words lost:** FB T2 «Dimmi la verità o me ne vado»; FB T4 «E tu, Berta, se tuo figlio
  è morto è colpa tua»; PR T2 «Dimmi la strada per la torre o te li riscuoto davanti a tutti»; ST T10 «Io non mi fido
  di Ugo…»; FB T3 «Vado a benedirla» lost its referent (the wheel).

---

## 4. Over-fire check

No `narratore: riga … spostata al suo telefono` event in any run, and no PC told «ancora in piedi».

| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | [usa] rifiutato `nar_impronte` | (Nespola, Ascoltare fallita) | right | release after a failed check |
| CM | 6 | R-dovuto aggiunta | «Zirrà incassa il colpo.» | right | card hit not told |
| CM | 7 | R-dovuto | «Zirrà cade a terra.» | right | A TERRA not told |
| CM | 8 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | «Il goblin a destra», Zirrà dead |
| CM | 12 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | stable save not told |
| CM | 12 | R-inesistente | same Zirrà line | right | «Il goblin mi tira la lancia» (on screen, though dropped from the announcement) |
| CM | 13 | [usa] rifiutato `nar_mappa` | — | right | only «muro» in common |
| CM | 18 | R-inesistente | same Zirrà line | right | «Ehi goblin!» |
| CM | 22 | R-dovuto | «Livia incassa il colpo.» | right | |
| CM | 24 | R-inesistente | same Zirrà line | right | «Ultimo goblin» |
| CM | 29 | R-dovuto | «Livia cade a terra.» | right | |
| CM | 30 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | |
| CM | 32 | R-dovuto | «Nespola muore.» | right | |
| CM | 7, 8, 10×2, 14×2, 15 | scriptwriter line, outcome not on card | (not heard) | right | no card that turn says so |
| CA | 4 | [usa] rifiutato `nar_impronte` | (Nespola, Ascoltare riuscita) | right | listening is not reading footprints (only «senti» in common) |
| CA | 6 | R-dovuto | «Zirrà incassa il colpo.» | right | |
| CA | 8 | R-dovuto | «Eliandro cade a terra.» | right | |
| CA | 10 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | |
| CA | 11 | R-dovuto | «Nespola incassa il colpo.» | right | |
| CA | 12 | [usa] rifiutato `nar_mappa` | — | right | only «muro» |
| CA | 12 | R-dovuto | «Zirrà cade a terra.» | right | |
| CA | 15 | R-inesistente | same Zirrà line | right | «Ehi goblin!» |
| CA | 16 | R-dovuto | «Livia incassa il colpo.» | right | |
| CA | 19 | R-dovuto | «Livia muore.» | right | |
| CA | 22 | R-dovuto | «Nespola respira ancora, ma non si muove.» | right | |
| CA | 7, 13, 14 | scriptwriter line, outcome not on card | (not heard) | right | T13 and T14 carried hits from T10 and T12, already told |
| FB | 5 | [usa] rifiutato `ber_conti_fienile` | (private: «quanto ti pagava Ugo per il carbone?») | **unsure** | the log says no theme matched, but «pagava» is the listed theme «pagare» (likely a stem miss); the line's text isn't visible |
| FB | 5 | stall S1 | «Dal crinale arriva un colpo di corno, lontano.» | right | T2–T5: talk, moves to non-existent places, a private question |
| FB | 7 | [usa] rifiutato `ugo_niente_visto` | — | right | addressed to Oreste, who doesn't exist |
| FB | 9 | [usa] rifiutato `sc_prossime_t1…` | — | right | addressed to Carla |
| FB | 9 | stall S1 | «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» | right | T7–T9: talk to Oreste, «Vado lì», meeting Carla |
| FB | 10 | stall S2 (clue `i_giaciglio`) | «Mancano gli stivali buoni e il mantello. E il pane della settimana, tutto.» | right | private question to Carla |
| FB | 11 | stall S3 (leads) | «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» | right | talk to Carla; blocking a cart that doesn't exist |
| FB | 12 | R-ripetuta tolta | «Tonio è lassù.» (from `sc_prossime_t7…`) | right | said at T2; the line kept «Sali, e non tornare senza di lui.» |
| FB | 12 | hard S1 (mark) | «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | right | stopping at a non-existent mill |
| FB | 13 | stall S2 (clue `i_lavagna`) | «Le lettere sono grandi e tonde, tracciate piano con il carbone.» | right | private question to Oreste |
| ST | 3 | R-ripetuta tolta | «Le pecore non aspettano, e quelli lassù nemmeno.» | right | tic said at T2; left «Allora?» |
| ST | 4 | stall S1 | «Dal crinale arriva un colpo di corno, lontano.» | right | «Aspetto.» |
| ST | 5 | [usa] rifiutato `nar_recinto` | — | right | sitting on the wall is not examining the gate |
| ST | 5 | stall S2 (`i_giaciglio`) | «Mancano gli stivali buoni e il mantello…» | right | «Mi siedo sul muretto» |
| ST | 6 | stall S3 (leads) | «I cani tirano verso il bosco…» «E più su, la Torre Mozza.» | right | «Guardo in giro.» |
| ST | 7 | hard S1 (mark) | «Nella Torre Mozza si accende un fuoco…» | right | «Aspetto ancora.» |
| ST | 8 | stall S2 (`i_lavagna`) | «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» | right | «Ci penso. Aspetto.» |
| ST | 9 | stall S3 | «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | right (move) | private question; **but the line repeats T7 verbatim** (bug 10) and no lead was said |
| ST | 10 | hard S1 and consequence `o_mezzanotte@3` | «La notte non aspetta nessuno. Se non salite voi, lassù ci salgo io.» | right | questions only |
| ST | 11 | stall S2 (`i_pali`) | «Sui pali ci sono nomi di pecore incisi col coltello…» | right | «Aspettiamo che torni» |
| ST | 12 | R-ripetuta tolta | «Le pecore non aspettano, ma io sì.» | right | tic said at T11; left «Io aspetto qui.» |
| ST | 12 | stall S3 | «Il fumo della carbonaia sale dal bosco. Dalla torre arriva un tamburo…» | right | «Mi siedo di nuovo.» |
| PR | 3 | R-ripetuta tolta | «Le pecore non aspettano, e quelli lassù nemmeno.» | right | tic said at T2 |
| PR | 4 | [usa] rifiutato `ber_conti_fienile` | (private: Tonio's old coins) | right | coins, not debts or the bailiff |
| PR | 5 | [usa] rifiutato `fin_ovile_senza` | — | right | one PC checking the path is not the party leaving |
| PR | 8 | [usa] rifiutato `nar_impronte` | — | right | running, not reading footprints |
| PR | 12 | R-dovuto ×2 | «Zirrà incassa il colpo.» «Eliandro cade a terra.» | right | |
| PR | 13 | R-dovuto ×2 | «Zirrà cade a terra.» «Nespola incassa il colpo.» | right | |
| PR | 14 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | |
| PR | 16 | R-inesistente | same Zirrà line | right | «Colpisco il goblin», Zirrà dead |
| PR | 18 | [usa] rifiutato `nar_mappa` | — | right | only «muro» |
| PR | 20 | `nar_conto` out of context, replaced by `sc_prossime_t14…` | «Dalla cantina sale un vento freddo, e la porta di ferro resta chiusa.» | right | only «canti» in common |
| PR | 20, 30 | R-dovuto | «Livia incassa il colpo.» | right | |
| PR | 24 | R-dovuto | «Nespola muore.» | right | |
| PR | 32 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | |
| PR | 12, 14 | scriptwriter line, outcome not on card | (not heard) | right | checked before that turn's roll |

Result: 0 wrong and 1 unsure (FB T5), out of about 75 events. Every stall move is right. Under-fires are listed under
bugs 8 and 10.

---

## 5. PR: player actions with a word of a secret

The secrets are **inferred from the views only** (the campaign files were not read): (a) Tonio left of his own will
and works with the goblins; (b) the slate was written by a child's hand (Tonio); (c) Berta's debts and the bailiff
taking the sheepfold «alla prima neve»; (d) the castellan's key and the iron door; (e) old coins with a tower.

| turn | action (verbatim, short) | secret | heard a confirming line before its time? |
|---|---|---|---|
| T1 | «dammi la chiave e dimmi dov'è Tonio» (public) | (a), (d) | no: «Tonio è lassù, lo dice la lavagna.» is Berta's belief |
| T2 | «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno» (public) | (b) | no: the `nar_lavagna` clue was earned with «Intelligenza 22, riuscita» and doesn't name the writer; the player's guess was dropped from the announcement |
| T4 | «Tonio aveva monete vecchie con una torre sopra?» (private) | (e) | no: no coins at the table |
| T5 | «Il balivo ti prende l'ovile alla prima neve» (private) | (c) | no: `ber_conti_fienile` logged, not heard at the table per the view |
| T6 | «qualcuno a Spinalba parla con i goblin?» (private) | (a) | no: discreet answer |
| T8 | «cerco segni incisi sugli alberi» (private, failed) | (b)? | no |
| T18 | «Dov'è il ragazzo? Parla!» (public) | (a) | no: «Ragazzo? Non so. Fame, io.» |
| T19 | «Il ragazzo, Tonio. Dov'è?» (private) | (a) | no: discreet answer |
| T20–21 | cellar stair; «scassino la porta in fondo» | (d) | no: «la porta di ferro resta chiusa»; the lock check failed |

**Secret H in PR: 0.** At T11 the prepared `nar_piccone` («Il ragazzo si alza e lascia cadere la corda dai polsi.
Poi porta a Zirrà un piccone…») shows (a) as the tower scene's own reveal. No secret word triggered it, and it plays
the same way in CM and CA.

---

## 6. ST and FB: stall moves and what the Engine put at the table

| run | turn | move | at the table |
|---|---|---|---|
| FB | T5 | S1 | prepared `nar_stallo_ovile_corno`: «Dal crinale arriva un colpo di corno, lontano. Le pecore alzano la testa…» |
| FB | T9 | S1 | prepared `ber_stallo_paese`: «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» |
| FB | T10 | S2 (`i_giaciglio`) | prepared clue `ber_stallo_giaciglio`: «Berta torna dal fienile con le mani vuote.» «Mancano gli stivali buoni e il mantello…» |
| FB | T11 | S3 (leads: carbonaia, torre) | prepared `ber_stallo_bosco`: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» «E più su, la Torre Mozza.» |
| FB | T12 | hard S1 (mark `o_mezzanotte`) | clock-mark line `nar_segno_2`: «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» |
| FB | T13 | S2 (`i_lavagna`) | clue line `nar_lavagna`: «Le lettere sono grandi e tonde…» «Ogni erre è rovesciata…» |
| ST | T4 | S1 | prepared `nar_stallo_ovile_corno` (same as FB T5) |
| ST | T5 | S2 (`i_giaciglio`) | prepared clue `ber_stallo_giaciglio` |
| ST | T6 | S3 (leads) | clock mark `nar_segno_1` («Dal crinale scende un corno di capra…») and prepared `ber_stallo_bosco` (leads) |
| ST | T7 | hard S1 (mark) | `nar_segno_2` |
| ST | T8 | S2 (`i_lavagna`) | clue `nar_lavagna` |
| ST | T9 | S3 (leads) | scriptwriter stall line `sc_prossime_t8_…_stallo_02` = «Nella Torre Mozza si accende un fuoco…», a verbatim repeat of T7; the leads were not said |
| ST | T10 | hard S1 (mark) and consequence | `nar_segno_3` («I cani di Spinalba abbaiano tutti insieme…»), consequence `ber_pazienza` («Se non salite voi, lassù ci salgo io.») |
| ST | T11 | S2 (`i_pali`) | clue `nar_pali`: «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» |
| ST | T12 | S3 (leads) | scriptwriter line `sc_prossime_t11_…_23_7`: «Il fumo della carbonaia sale dal bosco. Dalla torre arriva un tamburo…» |

Neither run had a stall move that produced nothing. The Engine's «Da qui le strade che conoscete portano soltanto
verso: …» was said once, at FB T3 (by design), and not repeated at T4 or T6.

---

## 7. Per game: public actions with no answer, and late lines

| run | no answer, tier A (nothing at all) | tier B (only unrelated filler) | late lines (a) certain, logged `sc_…_tN` said later | late lines (b) inferred, at the head of a turn |
|---|---|---|---|---|
| CM | 5: T9 Eliandro, T13 Livia, T14 Nespola, T15 Nespola, T16 Livia | 3: T4 Livia, T6 Nespola, T21 Livia (unsure) | 2: `sc_prossime_t13…` at T21; `sc_prossime_t18…` at T24 | 5 turns, 10 lines: T11, T12, T17, T19, T22 |
| CA | 2: T10 Livia, T13 Livia | 2: T4 Livia, T6 Nespola | 0 | 5 turns, 13 lines: T2, T8, T15, T17, T19 |
| FB | 0 | 4: T6 Nespola, T8 Livia, T11 Livia, T11 Fulco | 3: `sc_prossime_t3…` at T8; `sc_prossime_t8…` at T11; `sc_prossime_t7…` at T12 | 5 turns, 13 lines: T2, T3, T4, T5, T7 |
| ST | 0 | 2: T5 Fulco (stall clue only), T14 Fulco (`ugo_attesa`) | 3: `sc_prossime_t8…stallo_02` at T9 (stall material, by design); `sc_prossime_t7…` and `sc_prossime_t11…` at T12 | 9 turns, 22 lines: T2, T3, T4, T5, T7, T8, T9, T11, T12 |
| PR | 1: T13 Nespola | 7: T6 Livia, T9 Nespola, T9 Livia, T11 Eliandro, T11 Livia, T11 Nespola, T17 Livia (unsure) | 2: `sc_prossime_t12…` at T17; `sc_prossime_t14…` at T20 (replacing `nar_conto`) | 9 turns, 24 lines: T2, T3, T4, T5, T6, T9, T16, T19, T22 |

In the non-combat runs most player answers come one turn late (inferred tier), and those late lines are responsive.
In combat, the tier-A gaps are attacks the engine resolved as «nessun tiro» (dead or unresolved target).

---

## 8. Asides (outside the bug list, engine-side)
- Fulco Granito is listed «in piedi» in every coherence block of the tower scene, yet the fight ends with «i PG sono
  tutti a terra» and the defeat path lists only Livia, Nespola and Eliandro. Either Fulco is absent and shouldn't be
  in the scene block, or the defeat test ignores him.
- In a fight, an attack on a target nobody resolves becomes «nessun tiro: l'azione riesce se è possibile» (CM T21, PR
  T11 ×2, PR T17). Nothing leaked this time, but a reader pick with a hit would be an H with no card.
- «Grosso si alza piano» (PR T17, a late line from T12) comes after Grosso has fought for four turns. Berta says «lassù
  ci salgo io» (ST T10), then «Io aspetto qui.» (ST T12).

## 9. Summary
1. Certain H heard at the table: **0 in CM, CA, FB, ST and PR**. Unsure 4: the defeat ending «Vi sveglia il freddo»
   with a dead PC (CM T32, CA T22, PR T32, one cause) and FB T2 «Ladra, questa chiave non si vende.» after a Carisma
   success.
2. Bugs 1, 2, 3, 5 (at the table) and 9 (except mild idle-NPC cases PR T6, PR T3) are not seen. Every «0 punti ferita»
   was only a player claim (CM T15, CA T14). Every death save is present and on the PC's slot.
3. Bug 10 is real in ST: T7/T9 the same sentence verbatim (a stall line equal to `nar_segno_2`), T2/T11 «Le pecore non
   aspettano.», T10/T12 the barking clause. FB T3 did not drop the tic that ST and PR dropped.
4. The announcement filter is the main open defect. Five world or state clauses survived (CM T15, CA T14, FB T9,
   PR T12, PR T13), two of them while dropping the real act. All were attributed, so H = 0 under the test (+5 if
   counted).
5. Over-fire: about 75 events and 15 stall moves, 0 wrong, 1 unsure (FB T5 «pagava» vs theme «pagare»). Initiative was
   rolled and said in every fight and followed after the opening turn. Only the opening turn (CM/CA T6, PR T11)
   resolves in message order before the order is said (unsure if by design).

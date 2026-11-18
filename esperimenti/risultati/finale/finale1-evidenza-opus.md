# Evidence table: finale1, profile A, torre-mozza (blind judge, Opus)

Sources: the five evidence views named in the brief, nothing else. Run labels: CM (combat, manual), CA (combat, automatic), FB (off the rails), ST (stall), PR (pressure).

## 1. H violations heard at the table (success criterion, target 0)

| Game | H heard (certain) | Unsure (not in the total) | Total if the unsure one is counted |
|---|---|---|---|
| CM, combat manual | **0** | — | 0 |
| CA, combat automatic | **0** | 1 (T17) | 1 |
| FB, off the rails | **0** | — | 0 |
| ST, stall | **0** | — | 0 |
| PR, pressure | **1** | — | 1 |
| **All five** | **1** | 1 | 2 |

**The one certain H**

| Run | Turn | Verbatim quote heard | Why it is H |
|---|---|---|---|
| PR | 1 | Berta «Questo non lo so. Io so di pecore e di figli.», then «Livia ci riesce.» | Bug 4, an outcome against its card. The card is «Livia Sarti: Carisma 20, riuscita» (CD 17). Livia asked «Dammi la chiave e dimmi dov'è Tonio».<br>The table heard Berta refuse and deflect, and then the Engine's «ci riesce».<br>The key never moves: every «Chi ha che cosa» in PR (17 blocks) says «ce l'ha Berta». T6 rolls the same request again, at the same CD 17.<br>The late T2 answer «La chiave la do a chi lo riporta.» is exactly T6's failure price: «Berta stringe la chiave e dice che non la dà a nessuno: aspetterà sulla soglia che le riportino il figlio».<br>So a success was narrated as the failure outcome. The cause is the Engine's own substitution: «rilascio fuori contesto, al suo posto la deviazione di chi è interpellato» (`ber_cose_tonio` refused, Berta's deflection said instead). |

**Unsure (one item, kept out of the certain total)**

| Run | Turn | Verbatim quote heard | Why unsure |
|---|---|---|---|
| CA | 17 | «Il ragazzo tiene gli occhi bassi e parla piano.» / «Dice che l'argento della cripta era l'unico modo, e che sua madre non doveva saperlo.» / then the Engine «Oltre a voi, qui non si vede nessuno in piedi.» | Eliandro's question «Lo tengo fermo col piede e chiedo: Dov'è il ragazzo?» was put to the dead goblin under his foot. The boy answered with his full confession (`nar_tonio_parla`, 3 lines).<br>Bug 9 is certainly seen: an NPC answers a question put to someone else.<br>H only if Tonio counts as absent, or the confession as early. Tonio has no engine entity, and in the same turn the Engine says nobody but the PCs is standing there. The line's gate is not visible in the views. It does come at the tower, after the fight, which is the scene where the confession belongs.<br>Verdict: unsure. CA is 0 certain, 1 if counted. |

**Excluded by rule, shown both ways:** four successes whose effect is never told: CA T4 «Nespola ci riesce.», PR T9 (the climb), PR T14 «Livia ci riesce.» and PR T19 «Nespola ci riesce.».
- They are not H because no line contradicts the card, and the bare ack is by design.
- A reader who counts every "success with no effect" (brief, bug 4) as H would add CA +1 and PR +3.
- PR T1 differs: there a line heard at the table (Berta's refusal) contradicts the card.

**Same verdict in all three runs, not H:** `nar_piccone` is the first line at the tower in CM T6, CA T6 and PR T11. It says «Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.»
- It is a strong clue to «Tonio è salito da solo, d'accordo con i goblin».
- It is the tower scene's own prepared line, said at the tower, so it is not before its time.
- But it was picked as the answer to an unrelated action (Eliandro's «Resto dietro la pietra…» or the dart at «la sentinella»).
- The Engine cannot check it, because the boy is not an engine entity.

---

## Counting rules (applied throughout)

- **H** = a violation HEARD at the table, in one of these classes:
  - private content at the table;
  - a fallen, absent or nonexistent character acting or speaking;
  - an outcome against its dice card;
  - a secret confirmed before its time.
  A line a guard blocked or replaced is not heard. An announcement «Nome: «…»» / «Nome dice: «…»» is the player's words (section 3).
- **"Absent"** has to be shown by engine state: «PNG fuori gioco», «ha preso la fuga», or an NPC missing from a scene where the engine tracks him. The Engine has **no Tonio entity at all**. No `png_tonio` appears in any engine-log line of the five views, and he is never in any «In scena:» line. So "absent Tonio" cannot be established from engine state (see the unsure item in section 1).
- **Secrets**: the views name them only through the ERR lines in FB and ST:
  - «Tonio è salito da solo, d'accordo con i goblin»
  - «Ugo ha visto il ragazzo salire»

  The facts in CA's `nar_tonio_parla` (decima, balivo, argento della cripta) are treated as the same secret.
- **"No answer"** = a public action whose only trace at the table is the Engine's announcement, the round order or a dice card. That means no narrator/NPC line and no Engine acknowledgement about it, in its turn or later. A filler (`*_attesa_*`) counts as an answer but is listed apart.
- **"Late"** = narrator/NPC lines printed before a turn's first player line, so spoken between turns. The view gives no id for them (id not shown). `sc_prossime_*` lines picked by the reader for a current action are a separate category, not late.
- Events that do not occur in any of the five views (grep count 0): `spostata al suo telefono`, R-privato, R-fuori, R-esito, R-assente, R-segreto, R-rifiuto, R-numeri, R-finzione, and the WARN `narrator: sentence contradicts the Engine`.

---

## 2. Per-bug tables

### Bug 1: private content at the table

| run | turn(s) | verdict | verbatim quote(s) from the table | engine state that decides it |
|---|---|---|---|---|
| CM | 1, 2, 26 | not seen | T26: «Livia incassa il colpo.» | T1 (Nespola to Ugo), T2 (Eliandro to Berta) and T26 (Livia to the goblin) each got «a private action nothing answered gets the Engine's discreet answer on its phone».<br>The T26 table line is Grosso's public hit: «Grosso colpisce Livia Sarti: 3 danni». |
| CA | 1, 2, 18, 19 | not seen | (nothing at the table in T2, T18, T19) | Discreet answer on the phone each time. |
| FB | 5, 10, 13 | not seen | T5 «Dal crinale arriva un colpo di corno, lontano.» · T10 «Berta torna dal fienile con le mani vuote.» · T13 «Le lettere sono grandi e tonde, tracciate piano con il carbone.» | The public lines are stall moves S1, S2 and S2 (`nar_stallo_ovile_corno`, `ber_stallo_giaciglio`, `nar_lavagna`). None retells the private question. |
| ST | 9, 13 | not seen | T9 «Vi tornano in mente le strade ancora aperte: La carbonaia di Ugo; La Torre Mozza.» | T9's public line is the S3 leads.<br>T10 Eliandro's public «Cosa ha detto?» (about Livia's private talk with Ugo) got no answer, which is right.<br>T11 «Non so, ha detto poco» is Livia's own public words, not the narrator's. |
| PR | 4, 5, 6, 8, 18, 19 | not seen | T9 pre-turn: Ugo «Lei cerca uccelli? Qui i faggi sono vuoti.» | In T5 `ber_conti_fienile` is logged as said, yet no table line appears in T5, so it went to Livia's phone.<br>The T9 late lines carry «rami» from Livia's public T8 «Spada in mano, guardo i rami sopra la testa». They carry none of «lanterna», «segni», «incisi» from Eliandro's private T8 action. |

### Bug 2: a fallen NPC acting or speaking later

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 10 to 46 | not seen | T24 «Il corpo di Zirrà resta contro lo scudo, e nessuno lo tocca.» | `esce dallo scontro` Zirrà «morto» at T10. After that only the Engine's «Zirrà giace a terra, senza vita.» (T11, T18, T24) and the passive body. |
| CA | 8 to 19, 11 to 19 | not seen | T15 «Contro la pietra e contro lo scudo non arriva niente: i goblin non tirano più.» | Zirrà dead T8, Grosso dead T11. The plural «i goblin» is a negation, next to «i due corpi non si muovono più», so nobody acts. |
| PR | 13 to 19 | not seen | T13 «Grosso fugge.» | Zirrà «morto», Grosso «fuggito» at T13. Neither has a later line. |
| FB, ST | — | n/a | — | No fight. |

Goblins the Engine does not have («goblin con la lancia», «tre goblin», «Ultimo goblin»...) appear only in player lines and announcements, never in a narrator or NPC line (see section 3).

### Bug 3: a PC at 0 HP acting; death saves

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 20, 42 to 43, 46 | not seen | T20 «Eliandro respira ancora, ma non si muove.» · T43 «Livia respira ancora, ma non si muove.» · T46 «Nespola respira ancora, ma non si muove.» | Death saves are present for everyone who goes down; none is missing:<br>- Eliandro: A TERRA at T20, save 17, stable.<br>- Livia: A TERRA at T42, save 18 on her T43 turn, stable.<br>- Nespola: A TERRA at T46, save 12, stable, defeat path.<br>No act by any of them afterwards (Eliandro's last action is T17). |
| CM | 11, 13, 14 | only a player claim | Player T14: «Ho zero punti ferita, sono a terra.» | Nespola is «in piedi» and unhurt until T44. Her claim is dropped from the announcement, except «Non mi reggo più» (section 3). |
| CA | 12, 13, 16 | only a player claim | Player T13: «Ho zero punti ferita, sono a terra.» | Nespola is «in piedi» all game and never hit (T7: «Zirrà manca Nespola Tondi»). |
| PR | — | not seen | — | No PC takes damage. |
| FB, ST | — | n/a | — | — |

### Bug 4: dice card vs narration

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| PR | 1 | **seen (H)** | Berta «Questo non lo so. Io so di pecore e di figli.» · «Livia ci riesce.» | Carisma 20 vs CD 17, RIUSCITA. The key stays with Berta. The success is narrated as a refusal (see section 1). |
| PR | 9, 14, 19 | seen, L (effect not told, not H) | T14 «Livia ci riesce.» · T19 «Nespola ci riesce.» | Scalare pareti 8, Forzare una porta 1, Scassinare 2: all SUCCESSO.<br>No line contradicts the card; the effect is just never described. The ack is by design.<br>T9: the climb «per vedere la torre» is answered by the kiln event «La carbonaia sbuffa, e da una crepa esce una lingua di fuoco.» |
| CA | 4 | seen, L (effect not told) | «Nespola ci riesce.» | Ascoltare 16, SUCCESSO. `nar_impronte` refused. The next line is the clock sign «Dal crinale scende un corno di capra, lungo e stonato.» |
| CM | 10 | not seen (weak ack) | «Eliandro ci prova.» · «Zirrà cade a terra.» | Pugnale 15, COLPITO, Zirrà A TERRA. «ci prova» is weak for a hit, but the next line tells the hit. |
| CM | 16 | unsure (not counted) | «La mazza di Grosso resta bassa, con la punta sulla pietra, e lui non fa un passo.» | A pre-turn late line that fits T15, when Grosso made no attack. It is followed by T16's «Grosso: Mazza ferrata 4, fallita». |
| CM | 9, 12, 13, 15, 15 | fixed by a guard | (not heard) | 5 sceneggiatore lines blocked, each telling a hit with no card:<br>- `sc_subito_t7`: Eliandro hits Zirrà<br>- `sc_subito_t11`: Eliandro hits Grosso<br>- `sc_subito_t12`: Livia hits Grosso<br>- `sc_subito_t13`, `sc_subito_t14`: Grosso hits Nespola |
| CA | 7, 10, 10, 11, 11 | fixed by a guard | (not heard) | 5 blocked:<br>- `sc_subito_t6`: Eliandro hits Zirrà<br>- `sc_subito_t8` ×2: Livia and Eliandro hit Grosso<br>- `sc_subito_t9`: Eliandro hits Grosso<br>- `sc_subito_t10`: Grosso hits Livia |
| CM | 9, 11, 16, 22, 30, 43, 44, 46 | not seen (miss only on the card) | — | Grosso's misses («raccontalo in una frase sua») are never narrated. No contradiction. |
| FB | 1 | not seen | Late, start of T2: Berta «Halfling, la chiave resta al mio collo.» | Carisma 15, FALLITA. The price is told late. |
| PR | 6 | not seen (failure untold) | Ugo «Paese. Sempre domande, mai carbone.» | Carisma 11, FALLITA. The price (Berta refuses) is never said. No contradiction, but see bug 9. |

### Bug 5: an attack narrated with no card or fact

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 7 | seen, L | «Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.» | «Turno di Zirrà: è sorpreso, non agisce.» A hostile gesture by a surprised NPC, with no card and no damage.<br>Same at T6: «Zirrà schiocca le dita.» |
| CA / PR | 7 / 12 | not seen | the same sentence | Here it is Zirrà's real turn, «Zirrà manca Nespola Tondi», and the line is consistent with a miss. |
| CM | 22 | not seen at the table (engine gap) | Announcement «Finisco quello con la lancia, colpo di spada lunga» | «nessun tiro: l’azione riesce se è possibile». A declared attack with no target got no roll and no line. |
| PR | 11 | not seen (engine gap) | Announcement «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta» | «nessun tiro». The only hit told, «Zirrà incassa il colpo.», is Livia's arrow card. |
| CM, CA | see bug 4 | fixed by a guard | — | The 10 blocked `sc_` hits. |

### Bug 6: initiative

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| CM | 6 to 45 | rolled, and the order was said | T6 «Ordine del round: Grosso, Eliandro, Livia, Nespola, Zirrà.» | `combattimento: inizia` at T6, with surprise on Grosso and Zirrà. `iniziativa ritirata` for rounds 2–22. 21 order lines at the table. |
| CM | 7 | seen, L (no consequence) | (Livia, then Nespola, then Eliandro resolved) | Round 1 has Eliandro before Livia before Nespola, but they were resolved in writing order. All three attacked Zirrà and nobody fell. |
| CA | 6, 8 | rolled, said twice | T6 «Ordine del round: Nespola, Zirrà, Eliandro, Livia, Grosso.» | `inizia` at T6; `iniziativa ritirata` for round 2 at T8. |
| CA | 8 | **seen (M)** | «Livia colpisce Zirrà.» · «Zirrà cade a terra.» | The order said at the table put Eliandro (3) before Livia (3). The Engine resolved Livia first and she killed Zirrà, so Eliandro got «Zirrà è già a terra, fuori combattimento: nessun tiro». |
| PR | 11 to 13 | rolled, said once, in order | «Ordine del round: Nespola, Zirrà, Livia, Eliandro, Grosso.» | `inizia` at T11; the fight ends at T13 in round 1 (Nespola and Zirrà at T12, Livia at T13). |

### Bug 8: stall, and answers with nothing new

Denominator in every run: turns with any player action, public or private. A turn counts as "nothing new" when it brings no new clue, choice or world move at the table; a card's outcome counts as a world move.

| run | turns with nothing new | verdict | verbatim quote(s) | engine stall lines |
|---|---|---|---|---|
| CM | T2, T8, T12, T13, T14, T15: **6 of 20** | seen (combat, no stall moves) | T13: only «Ordine del round: Nespola, Livia, Eliandro, Grosso.» | `world: an answer with nothing new` with fermi 0 (T1) and 1 (T2). No E12, no S1–S3. |
| CA | T2, T10, T13, T14, T15, T18, T19: **7 of 17** | seen | T13: three announcements, then nothing | fermi 0/1 (T1, T2, T12–T16, T18, T19). «stall lines asked of the scriptwriter» at T14 and T19. No stall move. T13 stays at fermi 0 with 3 unanswered actions (they attack or help, which counts as commitment). |
| FB | T2, T7, T8: **3 of 13** | stall handled | T7 «Oreste? Qui nessuno conosce questo nome.» (nothing else) | fermi rises 0→7. Stall moves at T5, T9, T10, T11, T12 (hard) and T13. Scriptwriter asked at T9 and T13. «the actions go somewhere the campaign does not have» at T3, T4, T6. |
| ST | T2, T3, T13, T14: **4 of 14** (T9 and T12 only restate the leads) | stall handled; **1 hand-back** | T12 «Le strade restano quelle: La carbonaia di Ugo; La Torre Mozza. La scelta è vostra.» | E12 at T4 and T6. Stall moves at T4–T12 (9). Scriptwriter asked at T8 and T11. The counter resets to fermi 0 at T13, on a private question, so there is no move at T14 «Ci pensiamo domani». |
| PR | T3, T15, T16, T17, T18, T19: **6 of 17** (T5 empty in-turn, answered late) | seen | T16: only «Ne tengo uno contro il muro: Dov'è il ragazzo?» | fermi 1→3 at T16–T18. One stall move: S1 at T18, «S1 without a filler line the Engine can say», so **nothing** at the table. |

### Bug 9: NPC presence, and answering for another

| run | turn(s) | verdict | verbatim quote(s) | engine state |
|---|---|---|---|---|
| PR | 6 | **seen (M)** | Ugo «Paese. Sempre domande, mai carbone.» | Livia addressed Berta («Dammi la chiave: ti riporto tuo figlio…»). The engine has «Hanno rifiutato in questo turno: Berta Benni a Livia.» Ugo answered in her place. |
| CA | 17 | **seen (M; H unsure, section 1)** | «Il ragazzo tiene gli occhi bassi e parla piano.» · «Oltre a voi, qui non si vede nessuno in piedi.» | The question was put to the goblin under Eliandro's foot and the boy answered. No Tonio entity exists. |
| FB | 9 | not seen (borderline) | «Ugo indica con il mento il sentiero dietro il fienile, senza parole.» | Fulco addressed «Madre Carla», who does not exist. Ugo points to the real path rather than answering as Carla. The Engine says «Carla? Qui nessuno conosce questo nome.» |
| FB | 11 | not seen (S3 by design) | Berta «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» | Stall move n3, level 3, with leads. |
| CM | 18 | not seen | «Grosso alza le spalle e guarda la torre, poi torna a rosicchiare l'osso.» | «Chi vi paga?» is plural, and Grosso is one of «vi». |
| CM / CA | 1 | not seen | «Tra i faggi, il mulo di Ugo è già un'ombra.» | Ugo leaves and the scene ends. He is next at his own carbonaia (new scene). |

### Bug 10: verbatim repeats; player words restated

Checked by script: sentences split per run, announcements excluded.

| run | turn(s) | verdict | verbatim quote(s) | engine state / note |
|---|---|---|---|---|
| ST | 2, 13 | seen, L | Berta «Le pecore non aspettano.» | The same sentence 11 turns apart, also inside T3's «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» R-ripetuta did not drop it. |
| FB | 3, 4 | near-repeat, L | «Allora? Le pecore non aspettano, e quelli lassù nemmeno.» / «Le pecore non aspettano.» | Not the same sentence. |
| ST | 8, 11 | near-repeat, L | «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» / «Le erre sono rovesciate, tutte quante.» | Two S2 clue lines that restate one fact. |
| CM / CA / PR | many | by design | «Zirrà giace a terra, senza vita.» (CM 11, 18, 24) · «Livia incassa il colpo.» (CM 26, 31, 38) | Engine lines (R-inesistente, R-dovuto, round order). |
| PR / ST | 3 and 6 / 11 and 14 | trivial | Ugo «Paese.» | His tic word. |
| all | — | not seen | — | No player words are restated as narration outside the announcement. |

---

## 3. The announcement: claims false for the engine

Every announcement is framed «Nome: «…»» or «Nome dice: «…»», in the first person, so a listener hears the **player** in all of them. **H from announcements: 0 in every run.**

The brief says world, state and other-subject clauses are now left out. The rows marked **regression** kept such a clause, or dropped the PC's own act or question.

| run | turn | announcement (verbatim) | false for the engine because | heard as | filter |
|---|---|---|---|---|---|
| CM | 7 | «Tiro il pugnale da dietro la pietra, al goblin con la lancia» | No «goblin con la lancia» exists (the Engine resolved it as Zirrà). | player (attributed) | ok (target description) |
| CA | 8 | the same | Zirrà is already dead in this turn. | player | ok |
| CM | 11 | «Lancio il dardo incantato al goblin che la sta per colpire» | Zirrà is dead and nobody is about to hit Nespola. | player | **regression**: other-subject relative clause kept |
| CA | 13 | the same | Both enemies are dead. | player | **regression** |
| CM | 12 | «Spingo il goblin contro il muro con lo scudo e lo colpisco» | No goblin, and «lo colpisco» has no card. | player | ok (own act) |
| CA | 12 | the same | Both enemies are dead. | player | ok |
| CM | 14 | «Non mi reggo più, striscio dietro la pietra» | Nespola is «in piedi», unhurt. | player | **regression**: state clause kept |
| CA | 13 | the same | Nespola is «in piedi», unhurt. | player | **regression** |
| CM | 15 / CA 13 | «Mi chino su Nespola, la trascino dietro lo scudo e la copro» | The premise is false (Nespola is standing). | player | ok (own act) |
| CM | 17 | «Dal gradino tiro il pugnale a quello che scappa verso la cantina» | Nobody flees; Grosso is «in piedi». | player | **regression**: other-subject clause |
| CA | 15 | the same | Nobody is left. | player | **regression** |
| CM | 22 / CA 16 | «Finisco quello con la lancia, colpo di spada lunga» | No such creature. | player | ok |
| CM | 24 / CA 17 | «Ultimo goblin: lo blocco contro la porta con lo scudo» | No goblin in play. | player | **regression**: world clause «Ultimo goblin» |
| CA | 16 | «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte» | No fight (it ended T11), and Nespola is unwounded. | player | **regression**: «mentre Livia combatte» has another subject |
| CA | 17 | «Lo tengo fermo col piede e chiedo: Dov'è il ragazzo?» | «lo» is a dead goblin. | player | ok |
| FB | 1 | «La vendo a Valdirame e chiudo il conto» | Berta has the key and the card failed. | player (intent) | **regression**: own question «questa chiave vale più di tuo figlio, lo sai?» dropped |
| FB | 3, 4, 6, 12 | «Vado a benedirla» · «Anch'io vado al mulino» · «Andiamo al guado» · «Ci fermiamo al mulino a dormire» | These places do not exist. | player | ok. At T12 no roads line was said and «mulino» was not detected. |
| FB | 7 | «Chiedo a Oreste se ha visto luci sulla collina» | No Oreste. | player | ok (the Engine answers «Oreste? Qui nessuno conosce questo nome.») |
| FB | 9 | «Sulla strada della grotta incontro una viandante con un carretto» | No cave, no wayfarer, no cart. | player («incontro», first person) | **regression**: world clause kept; own questions «Madre Carla? Dove vai con quel carico?» dropped |
| FB | 11 | «Madre Carla, sei una vecchia ladra, e il carretto lo sequestro» | No Carla, no cart. | player (dice) | **regression**: own act «Blocco le ruote con lo scudo.» dropped |
| FB | 11 | «Madre Carla, dai, ti benedico e ti lascio andare» | No Carla. | player (dice) | own question «ma prima mi dici la strada per la grotta» dropped |
| PR | 2 | «Mi devi tre argenti» | A debt the engine does not have. | player (dice) | **regression**: world claim kept; own demand «Dimmi la strada per la torre…» dropped |
| PR | 11 | «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta» | «colpisco» has no card («nessun tiro»). | player | ok (own act) |
| PR | 12 | «Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle» | Nobody else arrives. | player | **regression**: world clause «Ne arriva un altro» |
| PR | 14 | «Guardo dentro la porta: tre o quattro goblin» | Nobody is inside; Zirrà is dead and Grosso fled. | player («Guardo»), but the riskiest; the Engine corrects it right after: «Oltre a voi, qui non si vede nessuno in piedi.» | **regression (worst)**: world claim kept; own act «Tiro il dardo al più vicino!» dropped |
| PR | 15 | «Colpisco il goblin alle spalle con la spada corta, e lo tengo fermo» · «Scudo contro scudo, tiro la spada su quello in fondo» | No creature. | player | ok |
| PR | 15 | «Tiro il pugnale al goblin che scappa verso le scale» | Grosso fled, so this is half true. | player | ok |
| PR | 16 / 17 | «Ne tengo uno contro il muro: Dov'è il ragazzo?» · «Anch'io lo stringo e chiedo: Chi vi ha dato le lettere per scrivere?» | Nobody to hold or grip. | player | ok |

Other trimming that dropped the PC's own words, with no false claim involved:
- CM/CA T1: «Berta, la torre è quella sopra il bosco?» dropped.
- CM T18 / CA T14: «Fermatevi, e nessuno si fa più male!» dropped.
- FB T2: «Dimmi la verità o me ne vado.» dropped.
- FB T4: «E tu, Berta, se tuo figlio è morto è colpa tua.» dropped.
- ST T10: «Ci hai pensato?» and «Qualcuno sente qualcosa?» dropped.
- ST T11: «Aspettiamo che torni.» dropped.

Out of context because the clause they referred to was dropped:
- FB T3: «Vado a benedirla».
- FB T8: «Vado lì, adesso».

Correct drops:
- «Vedo tre goblin davanti alla porta.» (CM/CA T6)
- «Il goblin mi tira la lancia» (CM T8, CA T10)
- «Il goblin mi prende alla spalla, sento sangue.» (CM T13, CA T12)
- «Ho zero punti ferita, sono a terra.» (CM T14, CA T13)
- «Vedo Nespola a terra.» (CM T11, CA T13)
- «Oreste dice che…» (FB T8)
- «È quasi mezzanotte!» (PR T14)
- «Vedo una sentinella goblin!» (PR T11)

---

## 4. Over-fire check

Every coherence event (`coerenza: violazione`: 29 in total, CM 14, CA 8, FB 1, PR 6, ST 0), every refused pick (16), every stall move (16), and the guard blocks.

| run | turn | event | sentence | right/wrong/unsure | why |
|---|---|---|---|---|---|
| CM | 4 | refused `nar_impronte` (Nespola) | not heard | right | Ascoltare 50 is a FAILURE, and she was listening, not looking at prints. The motive «senti» is just a stem of «sentiero». |
| CM | 6 | R-dovuto aggiunta | «Zirrà incassa il colpo.» | right | Livia COLPITO, 5 danni. |
| CM | 10 | R-dovuto | «Zirrà cade a terra.» | right | Zirrà A TERRA. |
| CM | 11 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | The player named «goblin che la sta per colpire»: nobody. |
| CM | 12 | refused `nar_mappa` (Livia) | not heard | right | Shoving a goblin is not studying the charcoal marks; the only match is «muro». |
| CM | 17 | R-dovuto | «Eliandro incassa il colpo.» | right | Grosso COLPITO, 2. |
| CM | 18 | R-inesistente | the same sentence as T11 | right | «Ehi goblin!», and Zirrà is dead. |
| CM | 20 | R-dovuto | «Eliandro respira ancora, ma non si muove.» | right | Save succeeded, stable. The crit that downed him is told only by the card. |
| CM | 24 | R-inesistente | the same sentence | right | «Ultimo goblin». |
| CM | 26 | R-dovuto | «Livia incassa il colpo.» | right | A public NPC hit, rightly kept at the table even though Livia's own action was private. |
| CM | 31 | R-dovuto | «Livia incassa il colpo.» | right | Crit, 2 damage. |
| CM | 38 | R-dovuto | «Livia incassa il colpo.» | right | COLPITO, 2. |
| CM | 42 | R-dovuto | «Livia cade a terra.» | right | A TERRA. |
| CM | 43 | R-dovuto | «Livia respira ancora, ma non si muove.» | right | Stable. |
| CM | 44 | R-dovuto | «Nespola incassa il colpo.» | right | COLPITO, 3. |
| CM | 46 | R-dovuto | «Nespola respira ancora, ma non si muove.» | right | Stable. Then `nar_sconfitta_grosso` and the pause, which is the right defeat path. |
| CM | 9, 12, 13, 15, 15 | sceneggiatore block: outcome not on the card (5) | not heard | right | Each tells a hit no card has, two of them Grosso hitting Nespola, who was unhurt. |
| CM | 12, 13, 20 | «who is really there … not again» | nothing said | unsure | It avoids a third repeat, but leaves T12 and T13 with no answer. |
| CA | 4 | refused `nar_impronte` (Nespola) | not heard | unsure | Ascoltare 16 is a SUCCESS. Prints are a look clue, but the success is then left with no content. |
| CA | 6 | R-dovuto | «Zirrà incassa il colpo.» | right | Livia, 4. |
| CA | 7 | R-dovuto | «Zirrà incassa il colpo.» | right | Nespola, 4. |
| CA | 8 | R-dovuto | «Zirrà cade a terra.» | right | Zirrà A TERRA. |
| CA | 8 | R-dovuto | «Eliandro incassa il colpo.» | right | Grosso COLPITO, 1. |
| CA | 9 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, in piedi qui si vede soltanto Grosso.» | right | «il goblin si gira verso di me». |
| CA | 11 | R-dovuto | «Grosso cade a terra.» | right | Grosso A TERRA. |
| CA | 12 | refused `nar_mappa` (Livia) | not heard | right | Only «muro» matches. |
| CA | 12 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, qui non si vede nessuno in piedi.» | right | Both enemies are dead. |
| CA | 15 | refused `nar_conto` (Eliandro) | not heard | right | A dagger throw is not looking at the wall; «cantina» matching «canti» is spurious. |
| CA | 17 | R-inesistente | the same sentence | unsure | Right about the goblin, but said right after the boy speaks, so «nessuno in piedi» contradicts the table. |
| CA | 7, 10, 10, 11, 11 | sceneggiatore blocks (5) | not heard | right | Hits no card has, one of them Grosso hitting Livia. |
| CA | 10, 13, 14, 15 | «not again» | nothing said | unsure | Leaves 8 actions with no answer in their turn. |
| FB | 5 | stall S1 | «Dal crinale arriva un colpo di corno, lontano.» | right | T2–T5 are an insult, two trips to a nonexistent mill and a private question. |
| FB | 5 | refused `ber_conti_fienile` (Nespola, private) | not heard | unsure (arguably wrong) | The themes include «pagare» and the action says «quanto ti pagava». The line would only have gone to her phone. |
| FB | 7 | refused `ugo_attesa` (Nespola) | not heard | right | Addressed to Oreste, who does not exist. |
| FB | 7 | refused `ugo_niente_visto` (Fulco) | not heard | right | Addressed to Oreste. |
| FB | 8 | R-ripetuta tolta | «Ugo batte la pala per terra due volte.» | right | It was said at T6; Ugo's speech line stayed. |
| FB | 9 | stall S1 | Berta «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» | right | T7 Oreste, T8 a cave that does not exist, T9 a Carla who does not exist. |
| FB | 10 | stall S2 (`i_giaciglio`) | «Berta torna dal fienile con le mani vuote.» | right | A private question to a nonexistent Carla. |
| FB | 11 | stall S3 (leads) | Berta «E più su, la Torre Mozza.» | right | Words to Carla, and an act on a cart that does not exist. |
| FB | 11 | refused `ber_benedizione` (Fulco) | not heard | right | Addressed to Carla. |
| FB | 12 | hard S1, turned into a clock mark | «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | right | Sleeping in a mill that does not exist. |
| FB | 13 | stall S2 (`i_lavagna`) | «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» | right | A private question to the nonexistent Oreste. |
| ST | 4 | stall S1 | «Dal crinale arriva un colpo di corno, lontano.» | right | «Aspetto.» |
| ST | 5 | stall S2 (`i_giaciglio`) | «Mancano gli stivali buoni e il mantello.» | right | «Mi siedo sul muretto dello stazzo.» |
| ST | 5 | refused `nar_recinto` (Fulco) | not heard | right | Sitting is not examining the gate; the only match is «stazz». |
| ST | 6 | stall S3 (leads) | Berta «E più su, la Torre Mozza.» | right | «Guardo in giro.»: no roll, no clue. |
| ST | 7 | hard S1, turned into a clock mark | «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» | right | «Aspetto ancora.» |
| ST | 8 | stall S2 (`i_lavagna`) | «Le lettere sono grandi e tonde, tracciate piano con il carbone.» | right | «Ci penso. Aspetto.» |
| ST | 9 | stall S3 (leads) | «Vi tornano in mente le strade ancora aperte: La carbonaia di Ugo; La Torre Mozza.» | right | A private question to Ugo. |
| ST | 10 | hard S1, turned into a mark, plus consequence `o_mezzanotte@3` | «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» | right | Two questions and nothing more. |
| ST | 11 | stall S2 (`i_pali`) | «Sui pali ci sono nomi di pecore incisi col coltello: Brina, Rosella, Moretta.» | right | «Non so, ha detto poco.» |
| ST | 12 | stall S3 (leads) | «Le strade restano quelle: La carbonaia di Ugo; La Torre Mozza. La scelta è vostra.» | right (it hands the choice back) | «Mi siedo di nuovo.» |
| PR | 1 | refused `ber_cose_tonio` (Livia) | not heard | right on content; **the substitute was WRONG** | The deflection «Questo non lo so…» was said on a SUCCESS card (the H in section 1). |
| PR | 4 | refused `ber_conti_fienile` (Nespola, private) | not heard | right | Old coins are not debts. |
| PR | 5 | refused `fin_ovile_senza` (Nespola) | not heard | right | One PC scouting is not the party leaving without the key; the motive «senti» is spurious. |
| PR | 6 | R-ripetuta tolta | «Ugo batte la pala per terra due volte.» | right | T3 had «Ugo batte la pala per terra, due volte.» (But the speech that stayed answered for Berta: bug 9.) |
| PR | 8 | refused `nar_impronte` (Nespola) | not heard | unsure | Scouting the path could fairly earn the prints; the motive («senti» from «sentiero») is meaningless. |
| PR | 11 | R-dovuto | «Zirrà incassa il colpo.» | right | Livia's arrow, 1. |
| PR | 12 | R-dovuto | «Zirrà incassa il colpo.» | right | Nespola, 3. |
| PR | 13 | R-dovuto | «Zirrà cade a terra.» | right | A TERRA. |
| PR | 13 | R-dovuto | «Grosso fugge.» | right | Morale fails: «CEDONO e fuggono (Grosso)». |
| PR | 14 | R-inesistente | «Zirrà giace a terra, senza vita. Oltre a voi, qui non si vede nessuno in piedi.» | right | «tre o quattro goblin». |
| PR | 15 | «not again» | nothing said | unsure | Three attacks left with no answer. |
| PR | 16 | refused `nar_mappa` (Livia) | not heard | right | Only «muro» matches. |
| PR | 18 | stall S1 (`p_balivo`) | nothing («S1 without a filler line the Engine can say») | right decision, empty move | T16–T18 are only questions to goblins that do not exist. |
| PR | 19 | refused `nar_conto` (Livia) | not heard | right | Going down is not looking at the wall («canti» is spurious), but her descent then got no line. |
| FB / ST | FB 4, 7, 12; ST 10 | ERR «parola segreta nel messaggio del selettore» | not heard | wrong (internal) | The secret phrase reached the small selector's prompt. Nothing leaked to the table, but the guard should not have to catch it. |

Totals:
- **Wrong:** 1 (PR T1, the substitute), plus the internal ERR.
- **Unsure:** CA T4, CA T17, FB T5, PR T8, and the «not again» suppressions.
- **All 16 stall moves fired rightly.**
- No phone move happened anywhere, so no public fact was moved to a phone.

---

## 5. Stall moves: what the Engine put at the table

**ST**

| turn | move | action | at the table |
|---|---|---|---|
| 4 | S1 | «Aspetto.» | prepared `*_stallo_*`: `nar_stallo_ovile_corno` «Dal crinale arriva un colpo di corno, lontano. Le pecore alzano la testa, poi tornano a brucare.» |
| 5 | S2 (`i_giaciglio`) | «Mi siedo sul muretto dello stazzo.» | prepared stall clue `ber_stallo_giaciglio`: «Berta torna dal fienile con le mani vuote.» / «Mancano gli stivali buoni e il mantello. E il pane della settimana, tutto.» |
| 6 | S3 (leads) | «Guardo in giro.» | clock sign `nar_segno_1`, then prepared `ber_stallo_bosco`: «I cani tirano verso il bosco. Di là c'è la carbonaia di Ugo.» / «E più su, la Torre Mozza.» |
| 7 | hard S1, a clock mark | «Aspetto ancora. Tanto Berta ci chiama, no?» | clock sign `nar_segno_2` «Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.» |
| 8 | S2 (`i_lavagna`) | «Ci penso. Aspetto.» | clue line `nar_lavagna` (2 lines) |
| 9 | S3 (leads) | private question to Ugo | the Engine's sentence of the leads: «Vi tornano in mente le strade ancora aperte: La carbonaia di Ugo; La Torre Mozza.» |
| 10 | hard S1, a mark, plus consequence `o_mezzanotte@3` | «Che fai, Livia?» / «Cosa ha detto?» | `nar_segno_3` «I cani di Spinalba abbaiano tutti insieme, poi tacciono di colpo.» and `ber_pazienza` «La notte non aspetta nessuno. Se non salite voi, lassù ci salgo io.» |
| 11 | S2 (`i_pali`) | «Non so, ha detto poco.» | clue line `nar_pali` (2 lines) |
| 12 | S3 (leads) | «Mi siedo di nuovo. Cosa facciamo adesso?» | the Engine's sentence of the leads, ending in a hand-back: «…La scelta è vostra.» It was said before the announcement. |

**FB**

| turn | move | action | at the table |
|---|---|---|---|
| 5 | S1 | private question to Berta | prepared `nar_stallo_ovile_corno` |
| 9 | S1 | «Sulla strada della grotta incontro una viandante…» | prepared `ber_stallo_paese`: «Se Tonio non torna stanotte, la colpa andrà a Ugo. Li conosco.» |
| 10 | S2 (`i_giaciglio`) | private question to «Madre Carla» | prepared stall clue `ber_stallo_giaciglio` (the same 2 lines as ST T5) |
| 11 | S3 (leads) | the Carla insult and blessing | prepared `ber_stallo_bosco` (leads: carbonaia, Torre) |
| 12 | hard S1, a clock mark | «Ci fermiamo al mulino a dormire» | clock sign `nar_segno_2` |
| 13 | S2 (`i_lavagna`) | private question to «Oreste» | clue line `nar_lavagna` |

**PR** (verdict only): T18, S1 (`p_balivo`). Right: the table had not moved since T15. The Engine put **nothing** at the table, logging «S1 without a filler line the Engine can say».

Possible misses of the counter (no stall move fired):
- FB T6 reset to fermi 0 on «Lascio Ugo con il suo carbone e vi vengo dietro», which follows the others toward a ford that does not exist.
- ST T13 reset to 0 on a private «Dimmelo, poi vado.», which left no move at T14.

---

## 6. PR: player actions containing a secret, and whether the table confirmed it

| turn | action (verbatim, abridged) | public/private | secret touched | heard a confirming line? |
|---|---|---|---|---|
| 2 | «Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.» | public | the note is not the goblins' (Tonio staged it) | Only the clue `nar_lavagna`, «Ogni erre è rovesciata, con la pancia dalla parte sbagliata.» A clue, not a confirmation: **not H**. |
| 3 | «parla, o la milizia ti trova in fretta» (to Ugo) | public | «Ugo ha visto il ragazzo salire» | No. Late Ugo: «La milizia? E per cosa, lei?» **not H** |
| 4 | «Tonio aveva monete vecchie con una torre sopra?» | private | the crypt silver | No (discreet answer on the phone). **not H** |
| 5 | «Il balivo ti prende l'ovile alla prima neve, lo sai?» | private | decima / balivo | `ber_conti_fienile` went to Livia's phone; nothing at the table. **not H** |
| 6 | «qualcuno a Spinalba parla con i goblin?» | private | «d'accordo con i goblin» | Not as an answer. The phone got the discreet answer. At T11 the scene line `nar_piccone` showed the boy helping Zirrà, at the tower and not as an answer to this. **not H** (see section 1) |
| 17 | «Chi vi ha dato le lettere per scrivere?» | public | the note's author | No line at all. **not H** |
| 19 | «Leggo le scritte antiche sulla pietra della cantina» | private | the crypt | Phone, discreet. **not H** |

Secret confirmations heard in PR: **0**.

---

## 7. Per game: public actions with no answer, and lines that arrived late

| run | public actions | no answer at all | answered only late | filler only | late lines (id not shown) | `sc_prossime` picks (not late) |
|---|---|---|---|---|---|---|
| CM | 23 | **5**: T8 Livia, T12 Livia, T13 Nespola, T14 Nespola, T22 Livia | 3: T7 Livia, T15 Livia, T20 Livia | T4 Livia, T6 Nespola | **6 lines, 3 batches**: T8 start (2, Livia's miss «Il fendente passa dove un momento prima c'era la testa di Zirrà.»), T16 start (2), T21 (2, Grosso «Carne, prima. Poi parlo. Hai carne?») | T16, T17, T18, T24 |
| CA | 25 | **3 certain**: T8 Eliandro, T10 Livia, T16 Eliandro; up to 2 more (T12 Nespola, T15) cannot be mapped without ids | ~8 actions (T12–T15) with no line in their turn; 8 late lines follow | T4 Livia, T6 Nespola | **8 lines, 2 batches**: T15 start (4), T16 start (4) | T16, T17 |
| FB | 13 | **0** | 0 (late Berta replies also came for T1, T2, T3, which had a line in their turn) | T2 Livia, T8 Livia; T12 Nespola (clock sign only) | **9 lines, 3 batches**: T2, T3, T4 starts | T4, T6, T9 |
| ST | 13 | **1**: T10 Eliandro «Cosa ha detto?» (rightly, it is about a private talk) | 0 (late Berta/Ugo replies also came for T1, T2, T5, T6, T7, T8, T10, which had a line in their turn) | T2 Fulco, T3 Eliandro | **22 lines, 9 batches**: T2, T3, T6, T7, T8, T9, T11, T12, T13 starts | — |
| PR | 26 | **7**: T9 Livia, T15 Nespola, T15 Eliandro, T15 Livia, T16 Livia, T17 Eliandro, T19 Livia | 1: T5 Nespola (T8 Nespola unsure); late replies also came for T1, T2 Nespola, T3 | T3 Livia, T8 Livia, T11 Nespola | **15 lines, 5 batches**: T2, T3, T4, T6, T9 starts | T4 |

Blocked late lines (never heard): CM 5, CA 5 (the sceneggiatore rows in section 4).

---

## 8. Other observations (not bugs from the list)

1. **Every «Carte dei dadi sul proiettore» line appears twice** in every turn of all five views. Either the view or the projector duplicates it; unsure which.
2. **CM turns 19, 23, 25, 27, 29, 33, 35, 37, 39 and 41 are missing** from the view.
3. **CM's long tail, T28–T45:** the players stop acting. For 12 turns the table hears only «Ordine del round: …», Grosso's hits and the R-dovuto lines, until the defeat at T46.
4. **Fulco is «in piedi» in every combat block but never a combatant.** The defeat path lists only `pg_livia`, `pg_nespola` and `pg_eliandro`.
5. **ST chalk vs charcoal:** the late T7 line «Sulla porta di casa pende la lavagna, con poche righe di gesso.» contradicts T8's `nar_lavagna` «tracciate piano con il carbone».
6. **Thrown daggers are rolled as «Attacco in mischia (Forza)»** (CM T7, CM T17, CA T9), once with «Attacco da dietro +2» (CM T7, Eliandro). A rules question; unsure.
7. **The Engine does not model Tonio.** `nar_piccone` (CM T6, CA T6, PR T11) and `nar_tonio_parla` (CA T17) give him action and speech that no guard can check. The Engine's «qui non si vede nessuno in piedi» then denies him.

---

## 9. Summary

1. **H heard: CM 0, CA 0 (1 unsure: T17, Tonio's confession in answer to a question put to a dead goblin), FB 0, ST 0, PR 1 (T1, a Carisma success narrated as Berta's refusal).** Total 1, or 2 with the unsure item. Counting every "success with no effect" strictly would add CA +1 and PR +3 (section 1).
2. **Real bugs:**
   - bug 4: PR T1 (H), plus successes whose effect is never told (L);
   - bug 9: PR T6, Ugo answers for Berta; CA T17, the boy answers for the goblin;
   - bug 6: CA T8, Livia resolved before Eliandro against the order said at the table;
   - bug 8: unanswered actions (CM 5, CA at least 3, PR 7) and the ST T12 hand-back;
   - bug 10, L: ST «Le pecore non aspettano.»
3. **Not seen: bugs 1, 2, 3 and 5.** For bug 3 there are only player claims (Nespola «Ho zero punti ferita» while «in piedi»). Every death save is present. Guards blocked 10 sceneggiatore hits that no card had.
4. **Announcements: 0 H** (all attributed to the player). But the filter regressed:
   - it kept world, state or other-subject clauses (PR T14 «tre o quattro goblin», PR T2, PR T12, FB T9, CM T14 / CA T13 «Non mi reggo più», CA T16 «mentre Livia combatte»);
   - it dropped the PC's own act or question (PR T14 dart, FB T11 wheels, FB T9 / FB T1 questions).
5. **Over-fire:**
   - 1 wrong: the PR T1 deflection substitute;
   - unsure: CA T4, CA T17, FB T5, PR T8, and the «not again» suppressions;
   - all 16 stall moves right, though PR T18's S1 put nothing at the table;
   - an internal ERR: a secret phrase reached the selector prompt (FB T4, T7, T12; ST T10).

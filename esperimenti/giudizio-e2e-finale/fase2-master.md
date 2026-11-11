# Phase 2: the Game Master's view of four games of «La chiave della Torre Mozza»

Games: partita-1 = torre-mozza-indagine-B (Haiku narrator, code 335b27b), partita-2 = indagine-A (local Qwen reader, keyword arbiter, code 1a7839b), partita-3 = pressione-B (Haiku, 335b27b), partita-4 = pressione-A (local, keyword arbiter, cdb076f).

Sources: the four trascrizione.md (protocol), the four tavolo-con-carte.md (what the table heard, as the harness wrote it), misure.json, riepilogo.json, the «prove» facts in server.jsonl, the campaign's campagna.yaml, scena.yaml, scene/, png/, repertorio/ and regole/regole.yaml, the manual excerpt (lines 1629–2000 and 4803–4870). Turns are server numbers (T1–T18). Each run has 16 scripted turns; the two scene changes are not counted. Quotes are verbatim Italian. «Aloud» means in the tavolo file. Causes: 1 campaign data or Preparatore · 2 validator · 3 Engine · 4 prompt or model · 5 script or harness · 6 provider.

## 0. Numbers per game

| | partita-1 | partita-2 | partita-3 | partita-4 |
|---|---|---|---|---|
| Narrator / arbiter | Haiku / Haiku | Qwen reader / keyword rules | Haiku / Haiku | Qwen reader / keyword rules |
| Voice | fish, 0 gaps | mock, 27 gaps, 91 s silence | fish, 0 gaps | mock, 24 gaps, 74 s silence |
| Prepared / improvised lines | 11 / 69 | 39 / 22 | 18 / 85 | 38 / 20 |
| Battute used | 7 | 32 | 10 | 28 |
| Public dice cards (riuscita / fallita) | 18 (8 / 10) | 21 (4 / 17) | 16 (11 / 5) | 21 (11 / 10) |
| Combat | from T13, never ends; Livia 0 HP T17 (saved), Eliandro 0 HP T18 | from T13, never ends; no 0 HP | T11 and T12 (two short fights); Zirrà 0 HP T11, Grosso 0 HP T12 | from T11, never ends; Eliandro 0 HP T14, dead T15 |
| Private actions played / answered aloud | 4 / 1 (T6) | 4 / 0 | 6 / 4 (T5, T6, T8, T17) | 5 / 0 |
| Ending | none, stops T18 | none, stops T18 | none, stops T18 | none; `fin_ovile_senza` fired at T5 as a scene end, play went on |
| Sceneggiatore (requested / delivered / discarded) | 0 | 25 / 8 / 0 | 0 | 25 / 8 / 3 |
| First audio, median | 1.9 s | 0.7 s | 2.4 s | 0.7 s |
| Cost (USD, riepilogo) | 0.0588 | 0 | 0.0655 | 0 |
| `o_mezzanotte` max | 1/8 | 1/8 | 1/8 | 1/8 |

## A. Secret leaks

A1. `zir_corda`, partita-3 T13. Aloud: «Nodo? Quale nodo. Il ragazzo è venuto da solo. Mi porta il pane da tre notti.» This discloses `f_tonio_complice` and `f_tonio_pane`, both `noto_ai_pg: false` (campagna.yaml). Its gate (png_zirra.yaml) is «un PG fa notare a Zirrà che la corda del ragazzo non ha nodo». The action it was credited to, Nespola's «Cerco una finestra e mi infilo dentro, prima degli altri.», does not mention a rope. Causes: 4 (selector) and 3 (the fughe check, parole_segrete.yaml, lists `zir_corda` among the release ids of the same secret, so this line is not counted as a leak; fughe is 0 in all four runs).

A2. Tonio free and digging. `nar_piccone` (partita-2 T13, partita-4 T11) and `zir_chiave_prima` (partita-3 T11) say aloud «Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.» (`nar_piccone`) and «Il ragazzo si alza da solo, e la corda gli scivola dai polsi.» (`zir_chiave_prima`). Canon: `f_tonio_libero` (noto_ai_pg: false). These are designed clues (scena_torre, come_si_trova), but `nar_piccone` is `riempitivo` with gate «i PG indugiano dentro la torre» and fired while the PGs were attacking. `zir_chiave_prima` fired on Zirrà's own question «la chiave ce l'avete?»; no PG showed a key. Causes: 4 and 1 (filler gate too loose).

A3. `nar_tonio_parla`, partita-4 T16. Aloud: «Dice che la decima non è pagata.» and «Dice che l'argento della cripta era l'unico modo, e che sua madre non doveva saperlo.» This releases `f_debito` and `f_tonio_motivo` at T16 while the boy is still alive. Gate: «un PG chiede al ragazzo perché è salito alla torre». Livia had asked «Dov'è il ragazzo? Parla!». The gate's `oppure` was satisfied by `i_tonio_libero`, which A2 had already revealed. Causes: 4 (wrong match) and 1 (`oppure` gate).

A4. Private answers aloud (tavolo file):
- partita-1 T6: Ugo answers Fulco's private question: «Lei parla piano, come chi ha qualcosa da nascondere. Il sentiero passa dietro la carbonaia.» (route pointer, not a listed secret). Cause 4.
- partita-3 T5: Berta answers Livia's private line: «Il balivo sta a Valdirame. Quattro ore di strada, e non ci va mai nessuno.» and «Se perdo l'ovile, perdo anche lui. Lo capisci o no?». The debt itself (`ber_conti_fienile`, privata) did not reach the table. Cause 4 (improvised PNG reply).
- partita-3 T6: «Qui nessuno parla coi goblin. Pensa che io abbia tempo per le tue domande?» (answer to Eliandro's private question). Cause 4.
- partita-3 T8: the narrator reports Eliandro's private search: «Sulla corteccia ci sono solo graffi di cinghiale e muschio bagnato.» Cause 3 (the guard did not move this line; no warning in the log).
- partita-3 T17: Zirrà repeats the private question: «Vuoi sapere dov'è il ragazzo, piccola?»
- partita-1 T3: narrator line «Livia si accosta a Berta, parla piano.» reached the table. Cause 3.
The guard «riga al tavolo sull'azione privata di un PG, spostata al suo telefono» moved only narrator lines (7 warnings in partita-1 and partita-3); it never moves PNG replies. Prepared `privata: true` confessions did stay off the table: partita-2 T3, partita-3 T5 and partita-4 T4 (no «decima» line in the tavolo file).

A5. The leak check (riepilogo, fughe.nota: «Fuga = riga del narratore o di un PNG con una parola segreta prima che sia uscito un id di pubblica_dopo») reports 0 in all four runs, yet A1 and A3 reached the table. Cause 3.

## B. Contradictions with canon; NPCs that act or know wrongly

B1. partita-3 T11–T14. The Engine's facts say «Zirrà è ferito gravemente» (T11), then «Zirrà è A TERRA (0 punti ferita): fuori combattimento» and «Grosso è A TERRA (0 punti ferita): fuori combattimento» (T12). The table still hears Zirrà speak («Il ragazzo è mio. L'ho preso nel fienile, mentre dormiva.», T12), Zirrà stand up («Zirrà, dal fuoco, si alza e afferra la spada corta.», T13), Grosso turn («Grosso si gira lentamente verso la porta, con la mazza in pugno.», T13) and Zirrà speak again («Mezzanotte. La chiave, adesso, o il ragazzo resta lì.», T14). The Engine itself answers «nessun tiro» for Livia at T12 and T14, because «Zirrà è già a terra». Causes: 4 (narrator ignores the down state) and 3 (no check of down state against narration). Commits: none.

B2. partita-1 T5–T6. «Ugo carica il mulo e se ne va verso il bosco.» (T5); at T6 Ugo answers Fulco's private question, and at T8 he is back at the carbonaia after the scene change. Cause 4. Confirmed from phase 1.

B3. partita-1 T17. The Engine's facts: «Grosso colpisce Livia Sarti: 8 danni, e Livia Sarti va a terra» and «venti naturale: torna in sé con 1 punto ferita». The table hears neither; the narration says Grosso «fissa Eliandro senza rispondere». Only the card «Tiro salvezza contro la morte 20 contro CD 10, riuscita» reaches the table. Causes: 4 (omission) and 3 (no repair before cdb076f).

B4. partita-4 T17. The private question gets no answer: the narrator writes no improvised line; the only line at the table is the Engine's repair «Nespola incassa il colpo.» Cause 4.

B5. Positive: partita-4 Eliandro dies at T15 («Eliandro muore.») and no dead PC acts afterwards.

## C. Clocks and endings

C1. `o_mezzanotte` reaches 1/8 in all four runs. The only sign is «Dal crinale scende un corno di capra, lungo e stonato.» at T9, added by the Engine as the due sign (`nar_segno_1`). The midnight outcome (`al_completo`) never fires, so the late stage of the clock is untested.

C2. The extra clocks (`o_balivo`, `o_inverno`, `o_sospetto`) and their presagi (for example «Un foglio con il sigillo rosso, dentro la porta di casa.») do not appear in the measures or in any transcript line I read. Not verified further.

C3. partita-4 T5. `fin_ovile_senza` (tipo finale, scena_ovile), gate «i PG partono per il bosco senza la chiave di Berta», matched Nespola's «Vado a controllare il sentiero dietro l'ovile, subito.». The table saw «La scena è finita: il master sceglie come andare avanti», and the same scene went on: Berta gives the key at T6. Causes: 1 (gate too loose for a finale) and 3 (a finale ends the scene but not the game, and nothing stops the scene after it).

C4. No run reaches an ending; all stop at T18 mid-scene (partita-1 last line: «Fulco, il passaggio è libero solo per un momento. Che fai?»). Cause 5 (fixed run length).

## D. Prepared lines chosen for the wrong action, or with the gate unmet

D1. `ber_cose_tonio` (partita-2 T2). Gate: «un PG chiede a Berta che cosa manca del figlio». Credited to Fulco's «Guardo la chiave che Berta stringe…». It is also a second answer to Livia's T1 question. Cause 4.
D2. `ber_rapitore` (partita-1 T1, partita-2 T1, partita-4 T1). Gate: «un PG chiede a Berta chi ha preso suo figlio». Livia asked when she last saw Tonio and who knew the key. Loose match. Cause 4.
D3. `ugo_niente_visto` (partita-4 T2 and T9). Gate: «un PG chiede a Ugo se ha visto qualcuno sul sentiero della torre». Credited to «Dimmi la strada per la torre…» and to «Mi arrampico sulla roccia…». Cause 4.
D4. `zir_attesa` (partita-2 T14, credited to Eliandro's dagger; partita-4 T12, credited to Nespola's attack). Gate: «i PG restano fermi davanti a Zirrà senza rispondere». The PGs acted. Cause 4.
D5. `nar_piccone` (partita-2 T13, credited to Fulco; partita-4 T11, credited to Eliandro, during three attacks). Filler gate «i PG indugiano dentro la torre». Causes: 1 (no exclusion for attacks) and 4.
D6. `zir_ragazzo_mio` (partita-3 T12). Gate: «un PG chiede a Zirrà di lasciare andare il ragazzo». Credited to Livia's «Carico il goblin con lo scudo, spada in avanti!». Cause 4.
D7. `zir_corda` (partita-3 T13): see A1.
D8. `nar_conto` (partita-3 T18). Gate: «un PG guarda il muro accanto alla porta di ferro». Credited to Livia's «Vado giù per la scala della cantina…»; the PG at the iron door is Nespola. The clue (`i_conto`) is designed, so only the credit is wrong. Cause 4.
D9. `ber_chiave` (partita-4 T6). Gate «un PG chiede a Berta di affidargli la chiave per salire alla torre», with `oppure` [prova carisma | battute_usate: ber_conti_fienile | …]. Livia's Carisma failed («Carisma 13 contro CD 17, fallita»), and the price text reads «Berta stringe la chiave e dice che non la dà a nessuno». `ber_conti_fienile` had been used at T4 in a private line the table never heard, so the `oppure` passed and the table hears «Berta si sfila il laccio dal collo e vi mette in mano la chiave.». Causes: 1 (`oppure` lets a hidden line stand in for a roll) and 4.
D10. `ugo_salita` (partita-4 T8), credited to Nespola's «Corro avanti sul sentiero di Ugo». Borderline. Cause 4.
D11. Prepared share: partita-2 and partita-4 were 64–66% prepared (riepilogo quota_prescritte 0.64 and 0.66), against 14–18% in partita-1 and partita-3. This is a cause of the repetition in section I, not a defect on its own.

## E. Rules fidelity (manual excerpt and regole.yaml)

E1. Initiative. The manual: «Each combat round, 1d6 is rolled for Initiative for each character or monster.» The Engine rolled once per combat event: partita-3 T11 «Iniziativa: Nespola Tondi 7, Eliandro 7, Livia Sarti 6, Grosso 3, Zirrà 3», then T12 «Iniziativa: Nespola Tondi 5, Livia Sarti 5, Eliandro 4, Grosso 4». No run passed round 1 (every combat event is `round: 1`), so the per-round rule is not exercised. Not verified in code.

E2. Attacks vs AC. d20 plus bonus against the target's number, for example «Grosso: Mazza ferrata 18 contro CD 17, riuscita» and «Zirrà: Spada corta 23 contro CD 12, riuscita». Consistent with the manual's to-hit rule.

E3. Ability rolls. The manual's Ability Rolls table gives 17 for «NM or 1» (level 1). The cards use CD 17 (normale), which is consistent. The 13 and 19 levels are the set's own choices, documented in regole.yaml.

E4. Morale. The manual: «Morale is checked when monster(s) first encounter opposition, and again when the monster party is reduced to half strength». The set checks at the first fallen and at half (documented deviation). No morale roll appears in any run; fights end with the Engine's «i nemici sono fuggiti o fuori combattimento» (partita-3 T11).

E5. Death at 0. The manual's optional rule: «If the save is failed, the character is immediately dead» and «If the save is made, the character remains alive for 2d10 rounds». The set uses CD 10 for every PC (the manual gives class numbers; the set documents this simplification). A natural 20 returns the PC at 1 HP (the set's own Motore rule). Inconsistency: partita-4 T15, «Eliandro è a terra: tiro salvezza contro la morte 8 contro CD 10 → terzo fallimento: è MORTO.» The set's `tiri_morte` has one failure, and this is Eliandro's first save (no earlier save appears in the facts). Cause 3 (wording or logic; not verified in code).

E6. Absurd checks (turn, card, action text), all from the tavolo file:
- partita-2 T2: «Fulco Granito: Carisma 2 contro CD 17, fallita» for «Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?».
- partita-2 T8: «Fulco Granito: Cercare porte segrete e trappole 14 contro CD 13, riuscita» for «Dico agli altri: sotto ogni torre dei nani c'è una postierla, un passaggio basso verso il bosco.» (`passaggio` is in the set's keyword list for cercare).
- partita-2 T11: «Eliandro: Tiro salvezza contro raggio della morte, con la Destrezza (Destrezza) 23 contro CD 17, riuscita» for «Anch'io salgo, tengo il quaderno sotto il mantello e mi aggrappo al ramo.» (`aggrappo` is in the keyword list for ts_morte_destrezza); no hazard narrated.
- partita-2 T17: «Eliandro: Forzare una porta bloccata 9 contro CD 17, fallita» for «Anch'io gli stringo la spalla e chiedo…».
- partita-2 T18: «Livia Sarti: Cercare porte segrete e trappole 11 contro CD 17, fallita» for «Scendo dietro di lui, scudo in avanti, nel passaggio stretto.».
- partita-4 T8: «Livia Sarti: Attacco in mischia (Forza) 17 contro CD 17, riuscita» for «Dietro di lei, spada in mano, guardo i rami sopra la testa.»; no enemy in the scene.
- partita-4 T18: «Livia Sarti: Scalare pareti 5 contro CD 17, fallita» for «Vado giù per la scala della cantina, spada in mano.».
- partita-3 T5 (borderline): «Nespola Tondi: Cercare porte segrete e trappole 7 contro CD 17, fallita» for «Vado a controllare il sentiero dietro l'ovile, subito.»; the narration then has her find «solo le impronte di qualcuno che è passato in fretta».
Causes: 3 (keyword arbiter) and 1 (the keyword lists in regole.yaml). Neither 16fe790 nor cdb076f addresses this.

E7. Dart narrated without a card. Phase 1 said this was an inconsistency. It is partly wrong: the set says «Dardo incantato colpisce sempre», and the Engine answered «nessun tiro» for partita-1 T13 and «attacca qualcuno, ma il bersaglio non ha una scheda: nessun tiro, risolvi con un «sì, ma»» for partita-3 T13. No number reaches the table by design.

E8. Downed PCs and PNGs act: see B1 (the set says «svenuto: non si muove, non combatte»).

## F. Script and harness effects (what would not happen with real players)

F1. The same copione does not produce the same actions. partita-1 T15 and partita-2 T15 differ (Livia acts only in partita-2); partita-3 T12 and partita-4 T12 differ (Livia acts only in partita-3). I did not read the copione, so I cannot tell whether this is the harness. It confounds the profile comparison. Cause 5 (suspected).

F2. The response window is about 20 s in every run (finestra_ms median 20.0–21.2 s). Actions are written by the script when the window opens, so real waiting is not represented.

F3. Held or deferred actions: «pg_fulco (sospesa)» (partita-1 T16), «pg_livia (sospesa)» (partita-1 T17), and combat deferrals «azioni: rinviate al turno del loro PG (combattimento)» (5 in partita-1 and partita-2, 7 in partita-4). Causes 5 and 3.

F4. Voice. The mock voice gave 27 gaps (91 s silence) in partita-2 and 24 (74 s) in partita-4, with 33 and 36 level-40 warnings «audio pre-generato mancante, sintesi dal vivo». fish gave 0 gaps in partita-1 and partita-3. The gaps come from the harness voice, not from the Motore. Causes 5 and 6.

F5. Sceneggiatore. In partita-2, 8 lines were delivered, all in the open window. In partita-4, 8 were delivered and 3 discarded: «png_zirra non è nella scena», «png_grosso non è nella scena», «parole segrete: Ugo ha visto il ragazzo salire». The last is the leak check working. Whether lines arrive in time with real players is untested.

F6. Transcript headers. partita-2's trascrizione.md is titled «Trascrizione torre-mozza-indagine-B», and partita-4's «Trascrizione torre-mozza-pressione-B». The riepilogo labels are correct. Cause 5.

F7. Log, level 50, ×12 «repertorio: parola segreta nel messaggio del selettore» in partita-1 and partita-2; misure lists the secret words sent to the selector each turn. Whether this feeds a leak is not verified. Cause 3.

F8. No phones in the test. «spostata al suo telefono» is a log message, and «what the table heard» is what the harness wrote to tavolo-con-carte.md. Delivery to a real phone is untested. Cause 5.

F9. Echo cut-off. The Engine's announcement «Name: «first words»» cuts the player's text mid-sentence in partita-2 and partita-4: «Narratore: Nespola Tondi: «Scendo dalla roccia e colpisco alle spalle la sentinella con»» (partita-4 T11), «Narratore: Eliandro: «Mi tengo dietro la pietra e tiro il pugnale al primo»» (partita-2 T14). partita-1 and partita-3 do not do this. Cause 3.

## G. Phase-1 top problems: verdict, cause, evidence

1. Private actions answered aloud or echoed. Partly confirmed. Confirmed: partita-3 T5, T6, T17 (Berta, Berta, Zirrà) and partita-1 T6 (Ugo). Partly wrong: partita-1 T9. The boot prints («Nel fango ci sono impronte piccole…») are the answer to Livia's public action (`nar_impronte` on «Scendo per prima…»), and Eliandro's private result (a sign on the post) never reached the table. Phase 1's «no narrated answer at all» for partita-2 is right as to what the table heard: the answers were routed to the phones, and the table file has none. Causes 4 and 3 (A4). 16fe790 plausibly addresses the narrator lines; it does not cover PNG replies (A4).
2. Absurd or phantom dice cards. Confirmed: partita-2 T11, T17, T18; partita-4 T18. Partly wrong: partita-1 T13 dart (no card by design, E7). New: partita-4 T8 (attack with no target), partita-2 T2 (Carisma for looking at the key). Causes 3 and 1. Neither commit addresses it.
3. Hits narrated without a card, or card without a narrated result. Confirmed: partita-1 T13 (Livia's «Spada lunga 23 contro CD 14, riuscita», which the Engine records as «COLPITO, 4 danni»; no line says so) and partita-2 T15 («Spada lunga 22 contro CD 14, riuscita», never narrated). Cause 4 (narrator omits facts the Engine supplies) and 3 (no repair before cdb076f). cdb076f plausibly addresses it: partita-4 shows the repairs at the table («Zirrà incassa il colpo.», «Eliandro cade a terra.», «Eliandro muore.»). The repair covers hits, falls and deaths and produces generic lines («Nespola incassa il colpo.»), so the attacker is lost.
4. Stale and echoed lines. Confirmed: partita-1 T2 (narrator restates the T1 question, cause 4) and partita-2 T3 and T8 (Engine announcements, cause 3). No commit addresses the cut-off (F9).
5. Characters speaking after leaving. Confirmed: partita-1 T5 «Ugo carica il mulo e se ne va verso il bosco.», then Ugo answers at T6. Cause 4. New: the same pattern for downed PCs and PNGs (B1).
6. Card and narration disagree (partita-4 T6). Confirmed: «Carisma 13 contro CD 17, fallita» and the table hears «Berta si sfila il laccio dal collo e vi mette in mano la chiave.». Cause 1 (D9). No commit.
7. Verbal tics. Confirmed: «ride corto» (partita-1 T13, T15, T17); «mezza misura» (partita-2 T14; partita-4 T13, T14); «la luna no» (partita-2 T14; partita-4 T12). Causes 1 (fixed Zirrà lines) and 4 (repetition). No commit.
8. No partita reaches an ending. Confirmed for partita-1, -2, -3 (stop at T18 mid-scene). Partly: partita-4 has a finale at T5 that ends nothing (C3), so the ending mechanism fails in both directions. Causes 1, 3 and 5.

Phase-1 claim «Livia's death save at T17 has no cause» is partly wrong: the Engine recorded the hit and the fall (B3); the narration left them out.

## H, I, J. Scores per profile (1–5)

Profile A = partita-2 and partita-4 (local reader, keyword arbiter). Profile B = partita-1 and partita-3 (Haiku narrator and arbiter). Two runs per profile: these are judgements, not measurements.

| Axis | A | B |
|---|---|---|
| H Coherence | 2 | 2 |
| I Fluidity | 2 | 4 |
| J Rules fidelity | 2 | 3 |

H, profile A (2). (1) partita-4 T6: the key is given after «Carisma 13 contro CD 17, fallita» (D9). (2) partita-2 T11: a death-ray save for «mi aggrappo al ramo», with no hazard narrated (E6). (3) partita-4 T8: «Attacco in mischia (Forza) 17 contro CD 17, riuscita» with no enemy in the scene (E6).

H, profile B (2). (1) partita-3 T12–T14: Zirrà and Grosso act after «fuori combattimento» (B1). (2) partita-1 T5–T6: Ugo answers after leaving the scene (B2). (3) partita-1 T17: Livia falls with no narration (B3).

I, profile A (2). (1) Echoes cut mid-sentence: «Scendo dalla roccia e colpisco alle spalle la sentinella con» (F9). (2) Mock voice: 27 and 24 gaps, 91 s and 74 s of silence (F4; harness, not the narrator). (3) 64–66% prepared lines, with the same filler reused: «Zirrà dà un calcio al fuoco» (partita-2 T14, partita-4 T12) and «mezza misura» three times (partita-2 T14, partita-4 T13 and T14).

I, profile B (4). (1) No voice gaps, first audio 1.9–2.4 s (F4). (2) Varied prose, with some repetition: «Zirrà ride corto» three times in partita-1. (3) Narrator restates the player's words: «Livia chiede a Berta quando ha visto Tonio per l'ultima volta... Livia appoggia lo scudo» (partita-1 T2). This costs one point.

J, profile A (2). (1) Keyword cards for the wrong action: «Cercare porte segrete e trappole 11 contro CD 17, fallita» for «nel passaggio stretto» (partita-2 T18). (2) «Forzare una porta bloccata 9 contro CD 17, fallita» for a shoulder squeeze (partita-2 T17). (3) «Scalare pareti 5 contro CD 17, fallita» for stairs (partita-4 T18).

J, profile B (3). (1) Most card-to-action matches are right: «Forzare una porta bloccata 26 contro CD 17, riuscita» for «Forzo la porta bassa della torre con la spalla» (partita-3 T13). (2) The «sì, ma» rule for targets with no sheet is applied correctly (partita-3 T13, T14). (3) Down state is not enforced in narration (B1), which keeps it from a higher score.

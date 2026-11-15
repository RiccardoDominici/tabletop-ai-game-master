# Checks, rolls and turns: verification on a running server (15 November 2026)

Riccardo asked (15 November): «Testa e sistema … dei turni, delle regole, anche le prove caratteristica compaiono
correttamente quando un giocatore le richiede, quando il master le richiede, si può tirare, la classe difficoltà viene
scelta correttamente.» Later the same day: the players roll real dice by default and are never told the DC; the
program rolls only if the campaign says so; the Game Master's own rolls happen in the background, sometimes shown.

This page is the evidence table: each row is a scenario run on a test port (4891–4896, logs in `logs/porta-<port>/`,
results in `esperimenti/risultati/prove-verifica/`), what was expected, what the phones, the projector and the Game
Master panel received, the verdict and the commit that fixed it. The design is in docs/prove.md (§8 manual rolls, §9
the Game Master's rolls) and docs/combattimento.md.

Profiles used: **A** = Haiku narrator and Haiku check arbiter (config/locale.yaml on this Mac: `arbitro_prove:
anthropic`), real costs; **R** = fake narrator and the rules arbiter, no model (`--finto`, `TAGM_LLM=finto`).
Rule sets: **SRD** = SRD 5.2 (prova-f0, the invented fixture `prove`); **BF** = Basic Fantasy 4th ed. (torre-mozza:
d20 against 13/17/19/21, d100 thief skills, x-in-6, a fixed ±2 for advantage, individual 1d6 initiative every round,
morale, one death save, surprise 1d6).

## 1. Harness

| Scenario | Expected | Seen | Verdict | Fix |
|---|---|---|---|---|
| C4: a script turn with three PCs during turn-based combat | only the PC on turn acts; the others go out on their own turn | before: all sent, two deferred by the Engine and re-judged stale (docs/e2e-finale.md C4). After, BF baseline: 0 «risolve solo chi è di turno», 10 actions waited for their turn, 0 passed; SRD: 0, 17, 1 | fixed | `d14f89c` (`esperimenti/alimentatore.ts`, `test/alimentatore-copione.test.ts`) |
| Manual rolls in a scripted run | the headless players answer each request with their own dice | `pg_livia rolls Carisma (1d20): 20` printed by the harness, run summary `tiri_al_tavolo` | works | `fa1910c` (`--tiri manuale|automatico`) |

## 2. Manual rolls (the added requirement)

Live on the real pages: `apps/web/e2e/tiri-manuali.spec.ts`, port 4893, profile R, the invented campaign `prove` with a
d6 gate on its clock; screenshots in `logs/screenshots/tiri-manuali/`. Passes (1 test, about a minute). Ports used for
this page: 4891–4896 and 4893 for the e2e.

| Scenario | Expected | Seen | Verdict | Fix |
|---|---|---|---|---|
| Ida persuades Bertoldo (public), Teo opens the padlock (private) | Ida's phone: «Tocca a te tirare», what to roll, bonus, no DC; Teo's phone: his roll, «only you see it»; projector: only Ida's request, no DC; voice: «Ida, fai un tiro di Persuasione, con vantaggio.», nothing about Teo | as expected: `telefono-ida-richiesta.png` (2d20, keep the highest, «Con vantaggio: Bertoldo è ben disposto», bonus +5), `telefono-teo-richiesta.png`, `proiettore-richiesta.png` (one card, «tira 2d20, tieni il più alto · bonus +5»), the subtitle of the request line | works | `e5a8145` |
| The projector and the other phones while the table rolls | say the table is rolling | first run: «Il narratore sta preparando…»; now «Si tirano i dadi…» / «Si tirano i dadi: Ida» | fixed | `418a339` |
| Ida types 12 and 13 | total 18 shown as she types; the turn goes on when every die is in | `telefono-ida-dadi.png` «Totale: 18»; narrator fact «18 contro CD 15 → RIUSCITA» | works | `e5a8145` |
| The Game Master enters Teo's 6 from the panel | the panel shows both rolls with the DC (15, 15); the card says who entered the dice | `master-richieste.png`, `master-carte.png`: «Teo · Rapidità di mano: 6 +7 = 13 CD 15 → fallita · inserito dal master · privata» | works | `e5a8145` |
| Cards after the turn | dice, bonus, total, outcome, never the DC, on the projector and on the phones | projector card without `carta-contro`; the phones' compact cards printed «· CD 0» | fixed (phones) | `dc2afa2` |
| A player test that rolls without a request in a manual turn | Engine rolls it, says so, hides the DC | was: DC on the table card | fixed | `dc2afa2` (`test/prove-manuali.test.ts`) |
| Wrong dice from the phone (wrong count, a 21, another PC's roll) | refused with a reason | refused | works | `test/prove-manuali-integrazione.test.ts` |
| «Ferma la narrazione» while the table rolls | the wait ends, the actions go back to the players | as expected | works | same test |
| Automatic rolls (`TAGM_TIRI_GIOCATORI=automatico`) | no request, no wait, the card keeps the DC | as expected | works | same test |
| Dictation into the roll card («ho fatto 14») | fills the boxes | the parser is tested (`numeriDettati.test.ts`: digits, Italian and English words, articles); the microphone path in the roll card was **not** exercised end to end (no audio in this e2e) | partly verified | `e5a8145` |

## 3. Checks asked by the Game Master

| Scenario | Expected | Seen | Verdict | Fix |
|---|---|---|---|---|
| Panel «Chiedi una prova»: Ida, Perception, hard, «sentire i passi sul ponte» | queued for the next window; «Risolvi ora»; Ida's phone «Il master ti chiede un tiro»; the narrator gets the outcome | `master-chiedi.png`, `telefono-ida-dal-master.png`; fact «Percezione (Saggezza): 17 contro CD 20 → FALLITA» (integration test) | works | `ce880c3` |
| A turn with only the Game Master's check | not a stall | before: the narrator was also asked for a world move | fixed | `ce880c3` |
| Unknown check, difficulty not of the set, PC without a sheet | refused | refused | works | `test/prove-manuali-integrazione.test.ts` |

## 4. The Game Master's own rolls

| Scenario | Expected | Seen | Verdict | Fix |
|---|---|---|---|---|
| A fight opened from the panel; the clock's gate rolls a d6 ≥ 4, `TAGM_TIRI_MASTER=visibili` | projector card «Il master», d6, Sì/No, never the reason; panel «Tiri del master» with the reason | `proiettore-tiro-master.png` (d6 2, «No»), `master-tiri-del-master.png` («o_piena: scontro») | works | `ce6ac5d`, `dc2afa2` |
| Same, default `nascosti` | only the panel | as expected | works | `test/tiri-master.test.ts` |
| `a_volte` | shown for odds from 1/3 to 2/3 | rule tested (d6: 3+, 4+, 5+ shown; 2+, 6+ hidden) | works | `test/tiri-master.test.ts` |
| A PC's attack opens a fight inside a turn; the gate rolls (whole server) | the voice says «Il master tira i dadi.» before that turn's narration; the card is among the turn's cards | first `audio:frase` of the turn is the line, then the narration; the d6 card in `stato.tiri` | works | `test/tiri-master.test.ts` (this commit) |
| A gate on leaving a scene (whole server, the invented `mondo` campaign) | the line opens the new scene's reading | before: nothing was said outside a turn (only the card); now the first phrase of the new opening | fixed (this commit) |
| «Senza spoiler» on the panel | the Tiri box hides DCs, private check labels and the reasons of the Game Master's rolls | before: it showed them (`master-carte.png` with the switch on); now hidden with the switch on, shown with it off (e2e asserts both) | fixed (this commit) |

## 5. DC choice on twenty actions where no data sets the DC

`npx tsx apps/server/src/strumenti/confronta-arbitri.ts --casi apps/server/test/prove/casi-cd.yaml [--ripeti 3]` (SRD,
the invented campaign; the expected DC is the SRD 5.2 scale, with | for what a human Game Master could equally pick).
First pass (`2269267`):

| Arbiter | before | after | what changed |
|---|---|---|---|
| rules (profile R, no model) | 13/20 | 17/20 | it never picks a difficulty (always medium 15); four ordinary checks found no keyword and rolled nothing (listening, deciphering, pulling a rope, appraising): stems added, `2269267` |
| Haiku (profile A) | 14/20 | 16/20 | called a hard lift «impossibile», gave 15 to routine moves: the prompt now says hard is not impossible and gives one line per level, `2269267`; the 16 hand-written cases stay 16/16 and 33/33 |

Second pass (15 November, this page's step 4): the difficulty follows the set's ladder from signals in the action and
the scene (docs/prove.md §3, prove/difficolta.ts), and the Haiku prompt says that heavy, tiring or dangerous is not
impossible. Measured on the same twenty and on **ten new actions** (`apps/server/test/prove/casi-cd-nuovi.yaml`,
written before the change, same narration). Haiku is not deterministic (no temperature on these models): each set was
asked three times (`--ripeti 3`, the cache is keyed by model and prompt hash), and the table gives the three runs.

| Arbiter | twenty, before | twenty, after | ten new, before | ten new, after |
|---|---|---|---|---|
| rules (no model) | 17/20 (d01 «con la rincorsa» 15, d04 «controcorrente … in piena» 15, d09 «con bende pulite» 15) | **20/20** | 7/10 (n03 wet broken roof tiles and n09 a collapsing bridge: no keyword, no roll; n10 lifting a stone bridge: 15) | **9/10** (n10: hard 20; the rules arbiter never says impossible) |
| Haiku | 15, 16, 15 (d13 the cart «impossibile» 3/3, d15 3/3, d18 3/3, d05 3/3, d01 2/3) | **18, 18, 18** (d05 a fire in the rain: hard 20, 3/3; d13 still «impossibile» 3/3) | 10, 10, 10 | 9, 9, 9 (n01 a low fence: very easy 5, 3/3) |

- The ten new actions were written before the change; the signal lists were written after seeing both sets' first
  results, so the ten are not fully blind. n02 («attraverso il guado… tenendomi alla corda») turned out to be the
  scene's check `p_guado`: its DC is the data's (12), correct by design, and its expected value was set to 12.
- The 16 hand-written cases stay 16/16 on type and 33/33 fields with the new prompt (`strumenti/valuta-prove.ts
  --solo-singole`, p50 1.1 s, $0.0025).
- **The cart is not solved.** With the new sentence Haiku still answers «impossibile» for «sollevo il carro rovesciato»
  in three runs of three; in two of them its own `motivo` says the opposite («un guerriero forte può tentare: prova di
  Forza difficile»): the verdict field comes before the reason in the structured output. A reason-first field or a
  deterministic check is the next step; the rules arbiter rolls it (hard 20).
- **Prompt variants measured and dropped** (three runs each, twenty / ten): a full rewrite of the ladder, one line per
  rung (16.0 / 9.0); naming rope and boat examples (13.3 / 10.0); «a detail the player adds that fits the place is
  there» (14.3 / 10.0). Their new misses were «impossibile» for things absent from the scene's description (the
  baron's letter, locked in the box; runes on a pier the scene calls wooden; a boat on an empty river): the case where
  the fiction does make it impossible, so the prompt keeps «acting on what is not in the scene».
- With data, the DC is the data's (scene checks, Influence from the NPC's sheet, AC): the arbiter's choice does not
  count there, by design (BF baseline T5: arbiter «difficile», card CD 17 from the scene check `p_berta_chiave`:
  correct).

## 6. Live run with manual rolls, Basic Fantasy (profile A)

`TAGM_PORTA=4894 TAGM_TIRI_MASTER=a_volte esegui.ts torre-mozza/pressione A --campagna torre-mozza --tiri manuale`
(16 script turns, 24 server turns, $0.042; results in `esperimenti/risultati/prove-verifica/manuale-torre-pressione`).
The headless players answered every request with their own dice.

| Check | Expected | Seen | Verdict |
|---|---|---|---|
| Player checks (Riccardo's item 1) | the set's ability or skill, the sheet's bonus, the set's DC | 16 requests: Carisma vs 17/19 (scene check or difficulty), Intelligenza vs 13, x-in-6 «Cercare» (1 or 3 in 6), d100 «Muoversi in silenzio» 25%, «Scalare pareti» 80%, «Forzare una porta» 3 in 6 for a shoulder charge at the tower door, attacks vs AC 14 with +5/+3/+2; a hostile NPC gave −2 (the set's fixed penalty) | works |
| The dice entered decide | card dice = dice entered | 0 × «card dice differ», 0 × «rolled without a request», 0 × «not needed»; the harness's «pg_livia rolls Spada lunga (1d20 +5): 13» is the card's 13 + 5 = 18 | works |
| Waiting at the table | the narrator starts after the last die | 12 waits, median 405 ms (the harness answers after 400 ms) | works |
| DC never said | no DC, AC or total in what the table heard | no narrator line with a number next to CD/CA/difficoltà or a total (`tavolo.md`, `narrazioni.jsonl`) | works |
| Private checks | request only on the phone, outcome only in the private line | Livia's and Eliandro's private Charisma checks: requests marked private, outcomes in «Esiti delle azioni PRIVATE»; 5 narrator lines moved to the phone by the private guard; one line «Eliandro, la pastora alza lo sguardo…» stayed at the table (no content of the question: the private guard's area, docs/e2e-finale.md A) | works; one borderline line |
| Failed checks and the narrator | what was wanted does not happen | T6 «Berta ripete la sua risposta senza muovere la chiave» after Charisma 16 vs 17; 3 × an NPC giving in after a failed social check replaced by its refusal; 4 × a sentence contradicting a card replaced | works (guards active) |
| Game Master roll at a scene change | `o_sospetto` gate, d6 ≥ 4 when the PCs leave; `a_volte`: 1/2 is a toss-up → shown | T7: d6 = 3, no; the Engine marked it shown («testa_o_croce»), but at a scene change the voice line was not said (only the card): found in review, fixed afterwards (§4) | partly; fixed |
| Surprise | an NPC struck first (Zirrà's reaction), so the PCs roll | «Sorpresa: i personaggi tirano 6 su 1d6: non sono colti di sorpresa» | works |
| Initiative | 1d6 + Dexterity, re-rolled every round, the dead leave the order | 8 rounds, re-rolled each time («Round 2, iniziativa ritirata: Eliandro 7, Grosso 6, Livia Sarti 4, Zirrà 2»), Nespola gone after she died | works |
| Turns in combat | only the PC on turn acts; the others wait for their turn | 0 × «risolve solo chi è di turno»; 16 actions waited; 2 PCs passed | works |
| NPC turns, 0 HP, death | NPCs attack in their turn; at 0 a PC makes the set's one death save | Zirrà's reaction drops Nespola; at her step «tiro salvezza contro la morte 4 contro CD 10 → … è MORTO» (one save, as the set says); the fact said «terzo fallimento» | wording fixed, `9141824` |
| End of the fight | every PC down → the fight ends | «Il combattimento è finito: i PG sono tutti a terra» with Livia dying; then nothing rolled for her | fixed afterwards, `7395185` (this run predates it) |
| After the fight | a dead PC does not act | the old harness still sent dead Nespola's actions; the fact said «è a terra: A zero punti ferita un personaggio muore…» | fixed: harness drops a dead PC's queue (`f27c629`), fact «è morto.» (`f8ec575`) |
| Attacks on a creature without a sheet | — | T11: three attacks on the goblin sentry «sì, ma» (C5) | open (data: minion sheets) |

## 7. Live runs with manual rolls, SRD 5.2

**Profile A**, `TAGM_PORTA=4895 esegui.ts pressione A --campagna prova-f0 --tiri manuale` (8 turns, $0.018,
`esperimenti/risultati/prove-verifica/manuale-f0-pressione`). No fight this time: the arbiter judged the crossbow
threat «impossibile» (Baldrin would not move), so the script's threats stayed social.

| Check | Seen | Verdict |
|---|---|---|
| Player checks | 10 requests: Intimidire vs 15 toward Baldrin and Ottavia (Influence, advantage or disadvantage from the attitude: «Baldrin Pietrafitta è ostile» → 2d20 keep the lowest), Rapidità di mano vs 20 with disadvantage (the arbiter: someone is watching), Furtività, Intuizione, Atletica vs 15, Persuasione vs 15; a grab on Ottavia: Atletica −1 against her passive Atletica 10 | works |
| Dice entered decide | 0 × card dice differ; «Rapidità di mano (2d20 +7): 18, 15» → card 22 (the lower die with disadvantage) | works |
| No roll when none is due | Assenzio's question to Ottavia, plain actions: «nessun tiro» | works |
| DC never said | no narrator line with a DC or a total | works |
| Narrator vs failed social checks | 3 × an NPC giving in after a failed check replaced by its refusal; 4 × a secret line stopped | works (guards active) |

**Profile R** (fake narrator, rules arbiter), an invented five-turn fight script on prova-f0 (`esperimenti/copioni/prove-verifica/scontro-srd.yaml`), `esegui.ts esperimenti/copioni/prove-verifica/scontro-srd.yaml A --campagna prova-f0 --tiri manuale --finto`
(`esperimenti/risultati/prove-verifica/manuale-f0-scontro`):

| Check | Seen | Verdict |
|---|---|---|
| Attack requests | crossbow, mace, dagger, longsword, short bow: 1d20 + the sheet's bonus (+4, +2, +5) against Baldrin's AC 11 | works |
| Initiative and turns | individual d20 once («Sorella Teodora 20, Baldrin 17, Assenzio 16, Corrado 14, Sebastiano 12»), only the PC on turn acts, 0 deferred by the Engine | works |
| NPC turns | Baldrin and Sebastiano (hostile to Corrado, so in the fight) attack in their turns; a critical («colpo critico»); an NPC at 0 dies (SRD) and leaves the order | works |
| Death saves | Teodora: fail, success, success, success → «successi 3 su 3: è stabile»; Corrado: a natural 20 → «torna in sé con 1 punto ferita», then down again | works |
| Every PC down | «Nessuno è in piedi per soccorrerli: i tiri contro la morte decidono adesso», Assenzio rolls to stable, then the fight ends | works (`7395185`, live) |
| An attack on a target already down | «Baldrin è già a terra: nessun tiro»; no request was made for it | works |
| Speech and questions | «Chiedo a Ottavia…», «Dico agli altri: …»: no roll | works |
| After the fight | the down PCs' leftover actions: «è a terra, privo di sensi: non può agire»; the narrator hears that they do not act | works (`a852ca1`) |

**Automatic rolls on the final code** (profile R, `--tiri automatico --finto`, port 4895): `scontro-srd.yaml` on
prova-f0 and `torre-mozza/pressione` (results `automatico-f0-scontro`, `automatico-torre-pressione`). No request and
no wait (0 «waiting for the dice»), the Engine's dice on every card, the DC and AC on them («Balestra leggera 15
contro CA 11», «Scassinare serrature 90 contro soglia 25»); BF: the fight opened by a PC's arrow, so the NPCs rolled
surprise («lato png», 5, not surprised), initiative re-rolled for six rounds, 0 deferred actions; the Game Master's
roll at the scene change hidden by default («nascosto»).

## 8. Baseline runs before the changes (automatic rolls, profile A)

`base-torre-pressione` (BF, port 4891) and `base-f0-pressione` (SRD, port 4892), 15 November.

| Finding | Verdict | Fix |
|---|---|---|
| BF: «Spada corta alle spalle: d20+5 contro CA 14» with a 2 on the die and a total of 9; «Carisma: d20+0 … con svantaggio: -1» | bug: the rule text left out the set's ±2 | fixed, `63bc874` |
| BF: a sneak attack with a short sword rolled with Strength though the arbiter said Dexterity | the set's «Attacco furtivo» is a melee attack with Strength (manual p. 9, 53): correct | — |
| BF T11: attacks on a goblin sentry with no sheet resolved «sì, ma» | known C5 (no minion sheets) | open |
| SRD T16–T17: every PC at 0 HP, the harness kept their actions, Haiku narrated a grab and a door broken | bug: the narrator got the player's text as the action to answer | fixed, `a852ca1` |
| SRD T15: the fight ends «i PG sono tutti a terra»; a dying PC rolls no more death saves after it | gap: death saves happened only inside a fight | fixed: when every PC is down, the dying ones roll to the end before the fight closes, `7395185` |

## 9. Combat and turns

| Scenario | Expected | Seen | Verdict | Fix |
|---|---|---|---|---|
| Surprise (BF set declares it): fight opened by an attack | only the side attacked rolls 1d6; on 1–2 it loses round 1 | unit test; torre-mozza's set now declares `combattimento.sorpresa` | implemented | `e04058e` |
| Surprise from the panel | both sides roll; surprised PCs skip round 1, round 2 opens for them | unit test | works | `dc2afa2` |
| A Game Master check during a fight | does not move whose turn it is or the NPCs' fallback target | the pseudo-action is no longer passed as the PC's action | fixed | `dc2afa2` |
| Pace, live (`e2e/ritmo.spec.ts`, port 4896, profile R) | calm: no timer, «Aspettiamo: …», the turn starts when all have sent; an action written during the narration waits with no countdown; frantic: countdown, resolved at zero; «Risolvi ora»; the watchdog recovers a stuck narrator | with the manual default the spec stopped at a roll nobody entered («Si tirano i dadi: Ginestra»), and it counted the dictation microphone as a fourth form button; with `TAGM_TIRI_GIOCATORI=automatico` and the button excluded: passes (1.7 min) | works; the e2e specs now start their server with automatic rolls | `48021c7` |
| Simultaneous actions, live (`e2e/azioni.spec.ts`, port 4896, rules + Haiku action arbiter) | «anch'io» dependency and withdrawal → full-screen notice; exclusive conflict → «Tengo / Cambio / Ritiro»; sending = ready; writing during the narration; a choice left to expire at the frantic pace → «rimasta fuori» with the text back | passes (1.4 min) | works | — |

## 10. Still open

- **Dictation into the roll card**: the number parser is tested; the microphone path with real audio was not run end to
  end (it needs the local speech model).
- ~~**The rules arbiter cannot tell easy from hard**~~: it follows the set's ladder from signals (§5: 20/20 and 9/10).
  Haiku still calls lifting a cart «impossibile» (§5), with a reason that contradicts its own verdict.
- **Attacks on creatures without a sheet** resolve «sì, ma» (C5): the campaigns' minions need sheets.
- ~~**v1 limits of manual rolls**~~: closed in the Engine (docs/prove.md §8, «Rounds»): the damage of a hit,
  initiative, death saves and the other PC's die in a contest are the player's, asked round after round; the 2d6
  difficulty stays out of the phone's bonus (test/prove-manuali-seguito.test.ts, whole-server test in
  prove-manuali-integrazione.test.ts). Still the Engine's: NPC rolls, side rolls, morale, the first initiative of a
  fight opened from the panel; a restart during the wait replays the turn and the requests are asked again.
- ~~**The Game Master's own rolls** cover the world's gates only~~: world questions written in a scene and NPCs' own
  checks out of combat go through the same path (`domande`, docs/prove.md §9; test/mondo-domande.test.ts; example in
  torre-mozza). Not yet seen in a live run.
- **Morale and flight** were not reached in the live runs (no NPC fell); they are covered by `test/combattimento.test.ts`
  and `test/fuori-gioco.test.ts`.
- **A private action's narrator line** «Eliandro, la pastora alza lo sguardo…» reached the table once in the BF run
  (no content of the question): the private guard's area (docs/e2e-finale.md A).

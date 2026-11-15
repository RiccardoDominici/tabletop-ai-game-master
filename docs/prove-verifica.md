# Checks, rolls and turns: verification on a running server (15 November 2026)

Riccardo asked (15 November): «Testa e sistema … dei turni, delle regole, anche le prove caratteristica compaiono
correttamente quando un giocatore le richiede, quando il master le richiede, si può tirare, la classe difficoltà viene
scelta correttamente.» Later the same day: the players roll real dice by default and are never told the DC; the
program rolls only if the campaign says so; the Game Master's own rolls happen in the background, sometimes shown.

This page is the evidence table: each row is a scenario run on a test port (4891–4895, logs in `logs/porta-<port>/`,
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
d6 gate on its clock; screenshots in `logs/screenshots/tiri-manuali/`. Passes (1 test, 59 s).

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

## 5. DC choice on twenty actions where no data sets the DC

`npx tsx apps/server/src/strumenti/confronta-arbitri.ts --casi apps/server/test/prove/casi-cd.yaml` (SRD, the
invented campaign; the expected DC is the SRD 5.2 scale, with | for what a human Game Master could equally pick).

| Arbiter | before | after | what changed |
|---|---|---|---|
| rules (profile R, no model) | 13/20 | 17/20 | it never picks a difficulty (always medium 15); four ordinary checks found no keyword and rolled nothing (listening, deciphering, pulling a rope, appraising): stems added, `2269267` |
| Haiku (profile A) | 14/20 | 16/20 | called a hard lift «impossibile», gave 15 to routine moves: the prompt now says hard is not impossible and gives one line per level, `2269267`; the 16 hand-written cases stay 16/16 and 33/33 |

Left: the rules arbiter cannot tell easy from hard (d01 jump a ditch 15, d04 swim a flood 15); Haiku still calls
lifting a cart «impossibile» (d13) and gives 20 to lighting a fire in the rain (d05). With data, the DC is the data's
(scene checks, Influence from the NPC's sheet, AC): the arbiter's choice does not count there, by design (BF baseline
T5: arbiter «difficile», card CD 17 from the scene check `p_berta_chiave`: correct).

## 6. Baseline runs before the changes (automatic rolls, profile A)

`base-torre-pressione` (BF, port 4891) and `base-f0-pressione` (SRD, port 4892), 15 November.

| Finding | Verdict | Fix |
|---|---|---|
| BF: «Spada corta alle spalle: d20+5 contro CA 14» with a 2 on the die and a total of 9; «Carisma: d20+0 … con svantaggio: -1» | bug: the rule text left out the set's ±2 | fixed, `63bc874` |
| BF: a sneak attack with a short sword rolled with Strength though the arbiter said Dexterity | the set's «Attacco furtivo» is a melee attack with Strength (manual p. 9, 53): correct | — |
| BF T11: attacks on a goblin sentry with no sheet resolved «sì, ma» | known C5 (no minion sheets) | open |
| SRD T16–T17: every PC at 0 HP, the harness kept their actions, Haiku narrated a grab and a door broken | bug: the narrator got the player's text as the action to answer | fixed, `a852ca1` |
| SRD T15: the fight ends «i PG sono tutti a terra»; a dying PC rolls no more death saves after it | gap: death saves happened only inside a fight | fixed: when every PC is down, the dying ones roll to the end before the fight closes, `this commit` |

## 7. Combat and turns

| Scenario | Expected | Seen | Verdict | Fix |
|---|---|---|---|---|
| Surprise (BF set declares it): fight opened by an attack | only the side attacked rolls 1d6; on 1–2 it loses round 1 | unit test; torre-mozza's set now declares `combattimento.sorpresa` | implemented | `e04058e` |
| Surprise from the panel | both sides roll; surprised PCs skip round 1, round 2 opens for them | unit test | works | `dc2afa2` |
| A Game Master check during a fight | does not move whose turn it is or the NPCs' fallback target | the pseudo-action is no longer passed as the PC's action | fixed | `dc2afa2` |
| Pace, live (`e2e/ritmo.spec.ts`, port 4896, profile R) | calm: no timer, «Aspettiamo: …», the turn starts when all have sent; an action written during the narration waits with no countdown; frantic: countdown, resolved at zero; «Risolvi ora»; the watchdog recovers a stuck narrator | with the manual default the spec stopped at a roll nobody entered («Si tirano i dadi: Ginestra»), and it counted the dictation microphone as a fourth form button; with `TAGM_TIRI_GIOCATORI=automatico` and the button excluded: passes (1.7 min) | works; the e2e specs now start their server with automatic rolls | this commit |
| Simultaneous actions, live (`e2e/azioni.spec.ts`, port 4896, rules + Haiku action arbiter) | «anch'io» dependency and withdrawal → full-screen notice; exclusive conflict → «Tengo / Cambio / Ritiro»; sending = ready; writing during the narration; a choice left to expire at the frantic pace → «rimasta fuori» with the text back | passes (1.4 min) | works | — |

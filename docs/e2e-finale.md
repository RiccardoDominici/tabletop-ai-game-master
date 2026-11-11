# Final end-to-end test (10–11 November 2026)

What this page is: the report of the final end-to-end test Riccardo asked for («test end to end, anche su coerenza di
gioco e fluidità»; «hai controllato tutto il sistema che gestisce manuali diversi?»). One run of the whole pipeline,
from a free rulebook of a different system to automatic games in two provider profiles, measured and judged.
Read first: [docs/regole.md](regole.md) (rule sets), [docs/combattimento.md](combattimento.md), [docs/provider.md](provider.md),
[docs/sceneggiatore.md](sceneggiatore.md).

**Verdict in one paragraph.** The pipeline works end to end with a manual that is not D&D: the Preparatore read
Basic Fantasy RPG, wrote a faithful rule set and a strict-valid campaign, and the Engine played it in both profiles
for 6 × 16 turns with no crash, no stuck pause, no voice underrun, zero secret-word leaks by the detector and a total
cost of $0.30. It is **not yet ready to be called coherent**: the narration contradicts the Engine's combat state (dead
NPCs keep talking, a morale flight is invisible), the local profile's dice classifier rolls absurd checks, private
actions were answered aloud at the table in profile B (5 times before the fix that landed during the test, once
after it, and once in the English run), and no game reached the final choice in 16 turns. Details and causes are in §6; the list of what to fix first is in §7.

## 1. What was tested

| Step | What | Result |
|---|---|---|
| 1. Free manual | Basic Fantasy RPG 4th Ed., release 142 (22 Feb 2025), in `manuali/basic-fantasy-rpg-r142.pdf` (gitignored), with `manuali/basic-fantasy-rpg-r142.FONTE.md` (source, hash, licence evidence) | ok: CC BY-SA 4.0 verified (see §2) |
| 2a. Campaign | `campagne/torre-mozza/` «La chiave della Torre Mozza», written by the Preparatore skill from a one-line Italian brief with `manuale:` and `lingua: it` | ok: `valida_campagna.py --rigoroso` 0 errors 0 warnings (3 scenes, 4 NPCs, 103 lines); with the blind scripts 0 errors, 3 justified warnings |
| 2b. Assets | `scripts/prepara.sh campagne/torre-mozza --voce` | partial: audio complete (25.6 MB), 178/178 drama-3 lines pre-generated ($0.05); **images 3/14** (the three places), see bug E1 |
| 3. Blind scripts | haiku subagent, player material only: `esperimenti/copioni/torre-mozza/{indagine,pressione}.yaml` | ok: 16 turns each, 5 and 6 private actions, a fight, persuasion, a risky climb, «anch'io», two scene changes |
| 4. Play | harness `apps/server/src/esperimenti/esegui.ts`, `--pausa-s 20`, ports 4800/4810 only | ok: 6 Italian runs of 16/16 turns + 1 English run of 3/3 turns, all exit 0 |
| 5. Measure | `misure.py` and `tavolo_con_carte.py` on each run's harness output and server logs (in `esperimenti/e2e-finale/`) | table in §5 |
| 6. Judge | haiku, two phases on the rubric of `esperimenti/giudizio-nozze-neve/`, plus coherence / fluidity / rules fidelity | `esperimenti/giudizio-e2e-finale/fase1-giocatore.md`, `fase2-master.md`; scores in §5 |

## 2. Does the system handle a different manual?

**Source and licence.** basicfantasy.org answered every request (curl and WebFetch) with a Cloudflare challenge (HTTP
403), as an earlier research note had found. The licence was verified on the official licence page through its
Internet Archive snapshot of 2025-07-05 («we use the Creative Commons Attribution-ShareAlike 4.0 license for all our
books»; footer «Basic Fantasy Role-Playing Game 4th Edition is distributed under the terms of the CC BY-SA 4.0
International license») and on page 2 of the PDF itself (all text, tables and charts CC BY-SA 4.0; artwork excluded).
The PDF came from the Internet Archive copy of the official download URL. So the derived set is free
(`licenza: {nome: CC-BY-SA-4.0, libera: true}`), shared alike with attribution, and is committed; `regole/` has no
`.gitignore`.

**Why this system.** It was the first choice of the brief and its combat is unlike the SRD 5.2: initiative is 1d6 +
Dexterity re-rolled every round, high goes first; surprise is 1d6 per side; each combatant moves and then attacks on
its number; monsters have a morale score (2d6, roll over = flee); at 0 hit points a character dies (optional «save vs.
death»); ability scores map to bonuses by a table (13–15 = +1, 16–17 = +2, 18 = +3), not (score − 10) / 2; there are no
skills, only an optional ability roll against 17 at level 1, percentile thief abilities and «x in 6» chances.

**Extraction.** `strumenti/regole/estrai.py` first found only 34 sections: the PDF bookmarks did not match the
heading lines, so pages 47–199 (the whole combat chapter) were one section «Traps (p. 47)» and the subsections lost
their pages. Fixed during the test by `1a7839b` («find PDF headings by bookmark page, then by font»); re-run on the
same PDF it now gives 500 sections with the right pages (Order of Play p. 54, Initiative p. 55, Morale p. 61, Saving
Throws p. 64, Ability Rolls p. 193).

**The rule set** (`campagne/torre-mozza/regole/regole.yaml`, `riassunto.md`, 17 `estratti/`), checked against the
manual pages: `risoluzione: d20_cd`; difficulties 13 / **17** / 19 / 21 (17 is the manual's ability-roll target at
level 1); `modificatore: diretto` (the sheet stores the manual's table bonus, the score stays in a comment);
attacks as skills `mischia` (Str) and `distanza` (Dex) whose value is the attack bonus, against the AC, with the
Strength damage bonus in the weapon formula; the five saving throws and the thief abilities as skills whose bonus
gives exactly the manual's odds against 17 (bonus = % / 5 − 4); `combattimento`: individual initiative d6 +
Dexterity with `ogni_round: true`, one phase «movement and attack», PCs at 0 use the optional save vs. death as death
saves 1/1 at 10, NPCs die, four conditions on the closed effect list, `fine: {morale: true}` with NPC morale 7 and 8.
It is a careful and honest translation: every approximation is commented in the file.

**What the framework could not express** (the Preparatore's list, verified in the code where marked ✓):

| Basic Fantasy | What the set had to do | Where the gap is |
|---|---|---|
| ability bonus by table | `diretto`: the phone shows «Forza 1», not «Forza 13 (+1)» | fixed: `modificatore: {tipo: tabella, tabella: [{da, mod}]}`, the sheets write the score (torre-mozza converted) |
| percentile thief skills, x-in-6 chances | converted to d20 bonuses with the same odds | fixed: `abilita[].soglia: {dado: 100 | 6 | 20, predefinita}`, the sheet writes the percentage or the x (torre-mozza converted) |
| initiative re-rolled every round, ties simultaneous | ✓ `ogni_round` is ignored for individual initiative (only side initiative re-rolls, `prove/combattimento.ts:231`); ties broken by a fixed order | fixed: individual initiative re-rolls each round with `ogni_round` («Round 2, iniziativa ritirata: …»); ties still in a fixed order |
| save vs. death once, 2d10 rounds to bind wounds | 1 success / 1 failure; ✓ the Engine adds the SRD rules «natural 20 = up with 1 HP, natural 1 = two failures» to every set (`prove/combattimento.ts:338`), seen in play («venti naturale: torna in sé con 1 punto ferita») | fixed: `tiri_morte.venti_rialza`, `uno_doppio` (SRD default), off in torre-mozza |
| magic missile always hits | a +20 skill bonus; with the Haiku arbiter one cast became «nessun tiro» and did no damage (indagine-B T13) | fixed: `attacchi[].automatico: true` on the sheet's weapon |
| natural 20 hits / natural 1 misses, minimum 1 damage | not applied (d20_cd has no criticals; damage floors at 0) | fixed: `risoluzione.critico`, `disastro`, `critici`; `attacchi.danno_critico`, `danno_minimo` (set in torre-mozza) |
| morale at first contact and at half strength | checked at the first NPC down and at half; ✓ at the start of a fight its result is thrown away (bug C3) | Engine |
| surprise 1d6 per side, range and rear modifiers, charge | only «the opening attack counts as surprise»; the rest is text | Engine (open in docs/combattimento.md §6) |
| saving throws, opposed rolls | plain checks | Engine (open in docs/regole.md §6) |

Answer to «hai controllato tutto il sistema che gestisce manuali diversi?»: yes, from the PDF to the dice cards.
The path works and is faithful where the schema has a field; the gaps above are real but small for a level-1 one-shot.
What hurts more in play is not the rule set but how the Engine and the narrator use it in combat (§6, C).

## 3. The campaign and the scripts

`torre-mozza` (6 commits, `67afcb4`…`335b27b`): Spinalba, a shepherd hamlet under a ruined tower; Tonio, 16, «kidnapped»
by goblins, really led them to the garrison's silver to pay his mother's tithe. Three scenes (the fold, Ugo's
charcoal clearing, the tower at midnight), NPCs Berta (nadine), Ugo (vincent), Zirrà the goblin (tabitha), Grosso the
hobgoblin (lucian), four level-1 PCs (fighter, dwarf cleric, halfling thief, elf magic-user), a final choice with
three priced roads. The Preparatore ran as an opus subagent following `.claude/skills/preparatore/SKILL.md` as it is on
disk (in this long session the Skill tool served a stale cached copy from before step 1b: a harness effect, not a repo
bug), with its own haiku blind-script writer and opus independent review, whose serious problems it fixed (a session clock that could end the climax mid-fight, a broken key chain, three leaks, a dominated choice).
Its bug notes are folded into §6.

## 4. The runs

| Run | Profile | Code | Script |
|---|---|---|---|
| `torre-mozza-indagine-B`, `-pressione-B` | B | `335b27b` | indagine, pressione |
| `torre-mozza-indagine-A` | A | `1a7839b` | indagine |
| `torre-mozza-pressione-A` | A | `cdb076f` | pressione |
| `torre-mozza-indagine-B2`, `-pressione-B2` | B, re-run after the two fixes | `cdb076f` | indagine, pressione |
| `en-mini-A` | Haiku narrator mode A, English fixture `en-mini`, fake voice | `335b27b` | 3 English turns |

- **Profile A, all local, $0**: `TAGM_PORTA=4800 TAGM_LETTORE=locale TAGM_ARBITRO_PROVE=regole
  TAGM_ARBITRO_AZIONI=regole TAGM_RIASSUNTO=locale TAGM_REGOLE=locale npx tsx
  apps/server/src/esperimenti/esegui.ts torre-mozza/indagine B --campagna torre-mozza --uscita e2e-finale/torre-mozza-indagine-A
  --pausa-s 20 --sceneggiatore`. Reader Qwen3 8B 4-bit on 127.0.0.1:4613 (minimal mode), keyword dice arbiter, fake voice
  (the harness passes `--mock`; a local Qwen voice on a test port would need its own service), sceneggiatore on
  (Claude Code on Riccardo's subscription, only in these two runs).
- **Profile B, API**: `TAGM_PORTA=4810 TAGM_LETTORE=anthropic TAGM_ARBITRO_PROVE=anthropic
  TAGM_ARBITRO_AZIONI=anthropic TAGM_RIASSUNTO=anthropic TAGM_REGOLE=anthropic TAGM_VOCE=fish npx tsx
  apps/server/src/esperimenti/esegui.ts torre-mozza/indagine B --campagna torre-mozza --uscita e2e-finale/torre-mozza-indagine-B
  --pausa-s 20`. Haiku narrator (full mode) and arbiters, drama-3 voice through OpenRouter, sceneggiatore off.
- Two commits landed **during** the test from my first findings (`16fe790` «Keep NPC replies to a private action off
  the table», `cdb076f` «Engine says the combat facts the narration leaves out»): profile B was re-run on `cdb076f`
  to check them (rows B2).
- Ports 4610/4611 were never touched. Results: `esperimenti/risultati/e2e-finale/<run>/` (harness) and
  `esperimenti/e2e-finale/<run>/` (measures and the table with dice cards).

## 5. Results

| | indagine-B | pressione-B | indagine-A | pressione-A | indagine-B2 | pressione-B2 |
|---|---|---|---|---|---|---|
| turns played / scripted | 16/16 | 16/16 | 16/16 | 16/16 | 16/16 | 16/16 |
| ending reached | no | no | no | no (a scene ending fired at T5, bug D3) | no | no |
| secret leaks (detector) | 0 | 0 | 0 | 0 | 0 | 0 |
| private actions / answered aloud at the table | 4 / 1 | 6 / 4 | 4 / 0 | 5 / 0 | 5 / 0 (a clue line went to another PC, B1) | 4 / 1 (Berta, T6) |
| dice cards (checks + attacks) | 14 | 21 | 20 | 15 | 22 | 22 |
| wrong-ability or target-less cards | 0 (one needless roll, D6) | 1 | 7 | 7 | 2 | 1 |
| combat: fights / rounds / PCs at 0 | 1 / 3+ (unfinished) / 2 | 2 / 1 each / 0 | 1 / 3+ / 0 | 1 / 3+ / 1 (dies) | 2 / 1 each / 0 | 1 / unfinished / 0 |
| down NPCs that keep acting | — | Zirrà, Grosso | — | — | Zirrà | — |
| reader «nessuna» / sceneggiatore lines delivered with the window open | — | — | 8 / 8 | 11 / 8 | — | — |
| sceneggiatore: requests ok / lines accepted / discarded | — | — | 25 / 100 / 0 | 25 / 92 / 3 | — | — |
| first audio after the window, median (worst) | 1.9 s (3.9) | 2.4 s (6.5) | 0.7 s (1.5) fake | 0.7 s (5.8) fake | 1.8 s (3.9) | 1.3 s (3.5) |
| first sentence ready (B) or action classified (A) / narration done, median | 1.4 s / 2.5 s | 2.1 s / 3.1 s | classified at send 8.7 s (worst 13.9) / 11.2 s | 8.3 s (15.9) / 9.9 s | 1.5 s / 2.8 s | 1.0 s / 2.1 s |
| time between turns, median (worst), with 20 s of player talk | 48 s (69) | 56 s (85) | 41 s (61) | 41 s (64) | 54 s (76) | 46 s (73) |
| voice underruns on the virtual projector | 0 | 0 | 27 gaps, 91 s silence | 24 gaps, 74 s | 0 | 0 |
| server errors / warnings | 12 / 3 | 1 / 5 | 12 / 33 | 0 / 41 | 12 / 10 | 1 / 9 |
| cost | $0.059 | $0.066 | $0 | $0 | $0.056 | $0.062 |

- All the 12-error lines are bug L1 (a player's own private knowledge typed in an action is logged as «parola
  segreta nel messaggio del selettore»); all the 33–41 warnings in profile A are L2 (the fake voice has no
  pre-generated audio). No crash, no exception, no stuck pause, no voice error in any run.
- **Rules really applied**: every card carries the set's rule («Carisma: d20+0 contro CD 17 (normale)», «Spada lunga,
  Attacco in mischia (Forza): d20+3 contro CD 14 (difesa di grosso)», «Scalare pareti: d20+12 contro CD 17», «Tiro
  salvezza contro la morte 20 contro CD 10»); initiative rolled on d6 + Dexterity («Iniziativa: Eliandro 7, Grosso 3,
  Livia Sarti 2, Zirrà 2, Fulco Granito 2»); NPC turns resolved by the Engine; 0 HP and save vs. death applied; a PC died
  (pressione-A). Morale was rolled but never shown (bug C3).
- **English run** (`en-mini-A`): 3/3 turns, English narrator and announcements («Mara walks up to the counter…»),
  $0.002, no warnings; the one private action was answered aloud by the narrator and the innkeeper (bug A1, before
  `16fe790`).

**Judge scores (1–5).** Phase 1, blind, by game (P1 indagine-B, P2 indagine-A, P3 pressione-B, P4 pressione-A):
clarity 2/2/3/3, NPCs 3/3/4/4, agency 3/2/2/3, mystery 4/3/4/4, prose 3/2/3/3, rhythm and ending 2/2/3/3, fun 3/2/3/3,
**coherence 2/2/2/2, fluidity 2/2/3/3, Basic Fantasy fidelity 3/2/3/3**. Phase 2, with the data, by profile: coherence
A 2 / B 2, fluidity A 2 / B 4, rules fidelity A 2 / B 3. The phase-1 haiku judge needed one correction round (it first
swapped two games and wrote in Italian); I checked their top claims against the files and kept only the confirmed ones.

## 6. Bugs

Severity: **H** high (breaks a promise to the table), **M** medium (visible, hurts the game), **L** low (noise or
cosmetic). Cause: data/skill, validator, Engine, prompt/model, script/harness, provider/infra.

### A. Privacy

| # | Sev | What happened | Likely cause | Status |
|---|---|---|---|---|
| A1 | H | NPC replies to PRIVATE actions were spoken at the table: Ugo gives Fulco the route (indagine-B T6), Berta answers Livia's and Eliandro's private questions (pressione-B T5, T6: «Se perdo l'ovile, perdo anche lui»), Zirrà repeats Nespola's private question (pressione-B T17), the English innkeeper answers Tobin (en-mini T3) | Engine: the guard (`narrazione/privato.ts`) moved only narrator lines that name the PC (7 moved in the two runs); prompt/model: Haiku wrote public replies although the fact says «mai nelle righe al tavolo» | mostly fixed by `16fe790`: in the two B2 runs one reply still reached the table, Berta to Eliandro's private question «Qui si parla con tutti. Con i goblin no.» (pressione-B2 T6), in a turn where Berta also answered Livia's public action; closed: with a public and a private action to the same NPC, the line goes to the phone when it shares more words with the private one, or follows a line already moved there |
| A2 | M | A private search outcome said aloud without the PC's name: «Sulla corteccia ci sono solo graffi di cinghiale e muschio bagnato» (pressione-B T8) | Engine guard needs the PC's name; prompt/model | open |
| A3 | L | Content-free lines that still show who acted in private («Livia si accosta a Berta, parla piano») | prompt; arguably acceptable (the others see the movement) | open |
| A4 | H (English only, not played) | `riferimenti/schema.md` tells English campaigns to mark hidden elements «HIDDEN:», but the mode-B context (`repertorio/contesto.ts:111`) and the validator (`strumenti/valida/regole_vincoli.py:60`) only know «NASCOST»: hidden elements of an English campaign go to the selector | Engine + validator vs skill reference | fixed: one marker list per language pack (`lingue/<code>/motore.yaml`, `nascosto`), and the markers of all languages hold in every campaign, in the server contexts, the validator and the audio tool |

### B. Secrets and prepared lines

| # | Sev | What happened | Likely cause | Status |
|---|---|---|---|---|
| B1 | M | The selector picks lines whose `quando` is not met: the confession `zir_corda` («Il ragazzo è venuto da solo») for Nespola climbing through a window (pressione-B T13); the clue `nar_conto` for Fulco's sling shot while Eliandro searched in private (indagine-B2 T15); `ber_cose_tonio` for a question about the key (indagine-A T2); `nar_tonio_parla` for «Dov'è il ragazzo?» (pressione-A T16) | prompt/model (Haiku selector, Qwen reader); data: `oppure` gates and loose `temi` | fixed by `57c8ce7`: a release line (clue, confession, truth, ending, or one that reveals) goes out only if the action is pertinent: its `temi` are in that action, it shares at least two roots with `quando` + `temi`, and the NPC named is the one who speaks. Otherwise the `[usa]` is refused and the NPC's `rifiuto` line is said instead. The four cases above are refused in `test/rilascio.test.ts`. Still open on the data side: `oppure` gates and loose `temi`. |
| B2 | M | The leak detector reports 0 everywhere, but a release line used for the wrong action is a leak it cannot see (B1 is counted as legitimate because `zir_corda` is in `pubblica_dopo`) | harness (`esperimenti/fughe.ts`) | fixed by `57c8ce7`: `rivelazioni_fuori_contesto` in `riepilogo.json` (`esperimenti/fughe.ts`). On pressione-A it flags `fin_ovile_senza` (T5) and `nar_tonio_parla` (T16). The harness now keeps `narrazioni.jsonl`, because the server log is overwritten. |
| B3 | L | Verbal tics repeated within minutes: Zirrà «ride corto», «mezza misura», «la luna no» | data + selector; the tic rule exists only for the sceneggiatore | open |

### C. Combat coherence

| # | Sev | What happened | Likely cause | Status |
|---|---|---|---|---|
| C1 | H | NPCs at 0 HP (the set says `png: morte`) keep talking and acting: Zirrà negotiates for five turns after «Zirrà è A TERRA (0 punti ferita)» and her prepared lines are still chosen; Grosso «si gira lentamente verso la porta» after dying (pressione-B T11–T17; again indagine-B2 T16–T17) | Engine: the combat outcome does not update the scene's presence nor the line catalogue; prompt/model: the narrator ignores the facts | fixed: down, dead and fled NPCs leave the scene's speakers (catalogue, preselection, [png_x] guard, sceneggiatore, projector) and the narrator gets «PNG fuori gioco» (docs/combattimento.md §3) |
| C2 | H | The Haiku narrator left out Engine facts that say «raccontalo»: Livia's 4-damage hit on Grosso (indagine-B T13), Livia struck to 0 HP and back up with a natural 20 (T17) | prompt/model | fixed by `cdb076f` (the Engine says the missing facts: «Fulco incassa il colpo», «Eliandro cade a terra», «Eliandro muore»); the repair lines are generic, lose the attacker, and sometimes repeat a fact the narrator had told in other words («Il colpo la trova al fianco» then «Zirrà incassa il colpo», pressione-B2 T11) |
| C3 | M | Morale is rolled but invisible, and the «fled» NPC stays: when the opening volley drops an NPC, `controllaZero(p)` at fight start (`prove/combattimento.ts:178`) runs the morale check without the facts array, so «Morale dei nemici: … CEDONO» is thrown away; the fight ends «i nemici sono fuggiti o fuori combattimento» with Grosso (pressione-B T11) or Zirrà (indagine-B2 T13) still standing in the scene, and the next attack opens a second fight | Engine | fixed: the morale fact is kept, a fled NPC leaves the scene until the scene changes, an attack on it rolls nothing and opens no fight, and the flight is a fact the table must hear |
| C4 | M | In combat, script actions sent out of turn are deferred, then re-judged stale by the action arbiter («impossibile», «dubbia»); a «dubbia» one waits for a confirmation the headless phone never gives, and «Risolvi ora» skips the PC whose turn it is: empty combat turns (indagine-B T15–T16) | script/harness (a blind script cannot know initiative order; real players see «È il tuo turno»); Engine design | open: the harness should send, in combat, only the action of the PC on turn |
| C5 | M | An attack on a creature without a sheet becomes a check against 17 («Attacco in mischia (Forza) 5 contro CD 17» for «la sentinella»), the narrator invents extra goblins, and once kills one with no card («la goblin cade senza un grido», pressione-B2 T11) | Engine arbiter + data (no minion sheets) + script | open |

### D. Dice and rules

| # | Sev | What happened | Likely cause | Status |
|---|---|---|---|---|
| D1 | H | The keyword dice arbiter rolls absurd checks: «Forzare una porta bloccata» for «gli stringo la spalla» (`spalla` hits `spallata` by the 5-letter root), «Cercare porte segrete» for «nel passaggio stretto» and for «mi metto davanti alla porta», a melee attack for «guardo i rami… spada in mano», Charisma for «Guardo la chiave che Berta stringe» (an NPC named ⇒ social) | Engine (`prove/classificatore-regole.ts`, root matching); data: generic words in `parole_chiave` (`passaggio`, `ombra`, `orecchio`, `tasca`, `parete`) that the validator does not check | fixed in the classifier: whole words with the language's endings, generic words, speech is not a deed, questions are free, social checks need an addressed NPC, attack skills alone do not roll, ties roll nothing; the same 51 actions now give 18 cards instead of 35, one debatable (docs/prove.md §3); the validator check on `parole_chiave` is still open |
| D2 | M | A card and the story disagree: «Carisma 13 contro CD 17, fallita», then Berta hands over the key (pressione-A T6); in pressione-B2 T6, after «Carisma 8 contro CD 17, fallita», Berta gives the key and two lines later «Il pugno sulla chiave non si apre» | data: `ber_chiave` has an `oppure` gate that lets it out without the roll; validator could flag a line that gives what a check gates | fixed in the Engine: a failed check tells the narrator what does not happen, and a line tied by `richiede.prova` to a check the action failed this turn is refused even through another `oppure` path; the validator check is still open |
| D3 | M | A scene ending fired at turn 5 («La scena è finita: il master sceglie come andare avanti», `fin_ovile_senza`, «senza la chiave») and the next turn Berta gave the key | reader picked an ending line; data gate too loose | fixed by `57c8ce7`: the same check refuses an ending that the reader picks for an unrelated action. «Vado a controllare il sentiero…» shares only one root with the ending's `quando`. Endings the Engine says on a full clock are exempt. |
| D4 | M | Engine announcements in minimal mode quote the first words and say nothing («Eliandro: «Dico agli altri».», «Livia Sarti: «Tu che sei del posto».») or stop mid-phrase («…colpisco alle spalle la sentinella con».») | Engine (`llm/annuncio.ts`: first short phrase, 12-word cap) | open |
| D5 | L | Cards say «contro CD 14» for an attack against the Armour Class, and repeat the label («Dardo incantato, Dardo incantato») | Engine wording | open |
| D6 | M | The Haiku arbiter (profile B) is mostly right but rolls «Ascoltare» for a whispered question (pressione-B T4, indagine-B2 T4 and T6) and asks an Intelligence roll for telling the party a deduction, whose failure price made Ugo leave (indagine-B T5) | prompt/model (arbiter with the set); the manual's ability roll is for actions «that seem to have no rule», not for talking | open |

### E. Pipeline, tools, logs

| # | Sev | What happened | Likely cause | Status |
|---|---|---|---|---|
| E1 | M | Images stopped at 3/14: the disk was 99% full (4–8 GB free, swap 8 GB) and `strumenti/immagini/motore.py` refuses below 8 GB; each `prepara.sh` pass made one image | provider/infra (this Mac's disk); the 4 portraits and 7 situations are missing | open: rerun `scripts/prepara.sh campagne/torre-mozza --voce` after freeing disk |
| E2 | M | `estrai.py` merged pp. 47–199 into one section | tool | fixed by `1a7839b`, verified (500 sections) |
| E3 | L | The session clock moved 1/8 in every run (`segno_almeno_ogni: 9` with ~10 turns before the tower), so midnight never threatened, and no game reached the final choice in 16 turns | data (clock too slow for the scene lengths) + script length | open |
| L1 | L | 12 ERROR lines per run «repertorio: parola segreta nel messaggio del selettore» when a player types their own private knowledge | Engine (`scena/regia.ts:2323` should not count the players' own words, or log at info) | fixed by «Pass-2 leftovers: deflection to the addressee, missing sceneggiatore type, cut summaries, log noise»: the players' own words (this turn's actions and earlier ones in the transcript) are taken out before the check; an Engine leak is still an ERROR |
| L2 | L | 33–41 warnings per run «voce: audio pre-generato mancante» with the fake voice | Engine voice (warn only for a real voice) | fixed by «Pass-2 leftovers: deflection to the addressee, missing sceneggiatore type, cut summaries, log noise»: `debug` with the fake voice, still a warning with a real voice |
| L3 | L | The `PROVIDER:` start-up lines say «configurato (config/predefinita.yaml + config/locale.yaml)» also when an environment variable forced the provider | Engine (`provider/config.ts:171`) | open |
| L4 | L | `esperimenti/copioni/README.md` did not say that a script needs `pg: [...]`; the harness refuses it without | docs | fixed with this report |
| L5 | L | The harness's `tavolo.md` does not contain the dice cards the projector showed; the judge needs them | harness (`esperimenti/tavolo.ts`); `esperimenti/e2e-finale/tavolo_con_carte.py` adds them from the server log | open |
| L7 | L | Haiku once wrote a line id as a label («[zir_ragazzo_mio]»): «narratore: protocollo non rispettato», the line was read by the narrator's voice (pressione-B2 T11) | prompt/model; the parser recovers | open |
| L6 | L | Reported by the Preparatore, not all re-verified: `SEGRETI.catalogo` ignores `richiede.oppure` (false errors); the validator does not check `parole_chiave` ids; `SCELTA.premio` stop-words miss «dalla/dal»; `regole_vincoli.py` «non <verbo>» false positives; the skill points to `lingue/<lingua>/preparatore/skill.md` while the references say `riferimenti.md`; the «stalla» ambience comes from a recording of geese | validator, skill, audio pipeline | open |

## 7. What to fix first

1. **C1 + C3**: make the combat outcome the truth for the whole table: an NPC at 0 HP, dead or fled leaves the
   scene's presence and its lines leave the catalogue; the morale fact is shown and narrated; a fled NPC is not in the
   scene any more.
2. **D1**: the keyword arbiter needs whole-word matching (or a stop-list of body and place words) and the validator
   should refuse generic `parole_chiave`: in profile A 14 of 35 cards were absurd or had no target.
3. **B1 + B2** (done, `57c8ce7`): refuse an `[usa]` whose line has an `indizio` or `confessione` type when the action shares no `tema`
   with it, and count such a release as a leak in `fughe.ts`.
4. **A2 + A4**: extend the private guard to outcome lines in a turn where the only actor of that place acted in
   private; make «HIDDEN:» and «NASCOST» the same marker per language.
5. **C4 / L5**: teach the harness combat turns and add the cards to `tavolo.md`, so that the next measure is fair.
6. **D4**: an announcement that says nothing is worse than none.
7. **E1**: finish the images when the disk has room.

## 8. Follow-up: the guided closing on torre-mozza (11 November)

No game reached the final choice in 16 turns: the clock stood at 1/8, which is right for an evening of 2.5 hours. So
the end-of-evening hint and «Chiudi la sessione» had never run on a real campaign. One short run checked them: profile A
($0), fake voice, sceneggiatore off, port 4740, with the new harness options `--ore` and `--chiudi`:
`TAGM_PORTA=4740 TAGM_LETTORE=locale TAGM_ARBITRO_PROVE=regole TAGM_ARBITRO_AZIONI=regole
TAGM_RIASSUNTO=locale TAGM_REGOLE=locale npx tsx apps/server/src/esperimenti/esegui.ts torre-mozza/pressione B
--campagna torre-mozza --uscita e2e-finale/torre-mozza-chiusura-A --turni 12 --pausa-s 40 --ore 0.5 --chiudi`.

| What | Result |
|---|---|
| turns | 12/12 of the script (server turn 14), 0 releases out of context, clock `o_mezzanotte` 1/8 |
| end-of-evening hint | never in the message, and that is correct. It was due from minute 10, but from minute 8 (server turn 10) the party was in `scena_torre`, which has `climax: true`. In minimal mode the reader does not read it anyway: the panel's warning is what counts there |
| «Chiudi la sessione» | accepted at turn 15. The 2 live actions went back to the players, the projector summary appeared and `riassunto.yaml` was written, after 20 s |
| closing lines | **0**: no campaign has a `chiusura` line, and the minimal reader writes no prose. The closing was silent |
| summary | **fallback**: the local model timed out at 20 s, so the summary was «Siete passati da: …», with no threads. The same request to Qwen3 8B 4-bit took 101 s (2460 prompt tokens) and gave a good summary with three open threads |

Both problems are fixed by «Guided closing: the Engine speaks when nobody writes a closing». With no closing line and no
prose, the Engine says `regia.righe.chiusura_riserva`, and a summary from the local model gets 3 minutes. Then, the same day, the
Preparer started writing `chiusura` lines: one per scene, checked by the validator (`COPERTURA.chiusura`, an error in
strict mode), and the four campaigns have them. Without one that fits, the sceneggiatore writes the closing at the table.

## 9. Second pass on the fixed code (11 November)

Same campaign, same two blind scripts, same English fixture, `--pausa-s 20`, ports 4800/4810, new variable names
(`TAGM_*`). Every run started from a git worktree pinned to one commit, with its own build, so the numbers do not move
while other work lands on main. There were two steps. The first is profile B on `aee0467`, the commit the request
named (rows «B @aee»). Then the Mac ran out of battery for two hours, and six more fixes landed (`eff935c` private
guard by context, `3a0f1d0` NPCs found by their trade, `1e56dfc`, `e26ee4a` clear attacks, `0ef96ac` narrator vs cards,
`9f674f8` automatic-hit cards) together with the pronunciation lexicon (`00a19a0`, `92b68f9`). So the second step ran both
profiles and the English run on `86a3946` (rows «@86a»). Profile A has `--ore 0.5 --chiudi`, to test the end of the
evening and the guided closing. Its first pressione run lost the local reader halfway (bug N6) and was run again
alone. Both copies are kept: `torre-mozza-pressione-A-pass2b-lettore-morto` is the broken one. Results are in
`esperimenti/risultati/e2e-finale-2/<run>/` and `esperimenti/e2e-finale/<run>/`.

| | indagine-B @aee | pressione-B @aee | indagine-B @86a | pressione-B @86a | indagine-A @86a | pressione-A @86a |
|---|---|---|---|---|---|---|
| turns played / scripted | 16/16 | 16/16 | 16/16 | 16/16 | 16/16 + closing | 16/16 + closing |
| secret leaks (detector) | 0 | 0 | 0 (1 secret line stopped by the guard) | 0 | 0 | 0 |
| private actions / content heard at the table | 4 / 1 (T4) | 6 / 2 (T8, T17) | 4 / 0 | 6 / 0 | 4 / 0 | 4 / 0 |
| lines the private guard moved to a phone | 4 | 5 | 7 | 10 | — | — |
| dice cards / wrong-ability or target-less | 17 / 2 | 21 / 1 | 18 / 1 | 21 / 2 | 8 / 0 | 11 / 1 |
| native cards of the manual (d100, x-in-6, automatic) | 1 | 8 | 2 | 9 | 2 | 4 |
| combat: initiative re-rolled / outcome | yes / unfinished | yes / Zirrà dead, fight over | yes / Grosso dead, unfinished | yes / Grosso dead, Zirrà flees on morale | yes / Zirrà dead, unfinished | yes / unfinished |
| down or dead NPCs that keep acting | — | none | none | none | Zirrà (one late sceneggiatore line) | none |
| Engine lines replacing the narrator (`0ef96ac`) / wrong ones | — | — | 2 / 2 («Narratore manca Zirrà.») | 2 / 1 («Berta è ancora in piedi.») | 0 | 2 / 2 («Narratore manca Zirrà.») |
| reader «nessuna» / sceneggiatore lines delivered with the window open | — | — | — | — | 9 / 8 | 11 / 11 |
| sceneggiatore: requests ok / accepted / discarded | — | — | — | — | 29 / 90 / 14 | 31 / 93 / 13 |
| first audio, median (worst) | 1.8 s (3.4) | 1.8 s (2.8) | 2.6 s (3.7) | 2.3 s (3.4) | 0.7 s fake | 0.7 s fake |
| reader: line chosen at send / narration done, median (worst) | — | — | — | — | 9.4 s (21.4) / 12.1 s | 8.4 s (20.1) / 10.2 s |
| time between turns, median (worst) | 49 s (67) | 45 s (67) | 45 s (66) | 49 s (69) | 43 s (63) | 40 s (71) |
| voice underruns | 0 | 0 | 0 | 0 | 25 gaps (fake voice) | 19 gaps (fake voice) |
| closing of the evening | — | — | — | — | 2 closing lines; summary by the local model, 39 characters, cut mid-word (N7) | 2 closing lines; full summary by the local model |
| server errors / warnings | 16 / 8 | 15 / 11 | 12 / 16 | 12 / 25 | 12 / 36 | 1 / 42 |
| cost | $0.058 | $0.059 | $0.060 | $0.058 | $0 | $0 |

- **English** (`en-mini`, 3 turns): on `aee0467` the private question was still heard. The narrator echoed it, and
  «Hale the Innkeeper» answered «Nothing you'd want to pay for, friend», because the player wrote «the innkeeper», the
  fixture has no alias, and the guard matched names only. On `86a3946` nothing of it reached the table: the guard moved 3
  lines, and the only public trace is «Hale's eyes flick toward the cellar». Cost $0.002 per run, no warnings.
- **Pronunciation lexicon** (`campagne/torre-mozza/pronunce.yaml`, 19 names): 40 drama-3 lines that profile B played
  from the pre-generated cache were transcribed with Whisper (`openai/whisper-1` via OpenRouter,
  `esperimenti/e2e-finale/ascolta-nomi.mts`, $0.016). **44 of 45 name occurrences were heard right**: Berta 13/13, Ugo 10/10,
  Spinalba 5/5, Grosso 4/4, Zirrà 3/3, Tonio 3/3, Mozza, Moretta, Rosella. The one miss is «Noi Bènni non dobbiamo niente»,
  heard as «Noi Venni» (voice nadine, a B/V confusion). The cached line still says «Bènni», from the sheet's old
  `pronuncia` field, while the lexicon now says «Benni». The PCs' names (Livia, Fulco, Eliandro, Nespola) occur only in
  the live Haiku lines, which the pipeline does not keep, so here only the lexicon's own ear test covers them.
- **Judge**, same rubric, on the four `@86a` games (`esperimenti/giudizio-e2e-finale/pass2-fase1-giocatore.md`,
  `pass2-fase2-master.md`). Phase 1, blind, by game (P1 indagine-B, P2 indagine-A, P3 pressione-B, P4 pressione-A):
  clarity 3/3/4/2, NPCs 3/4/4/4, agency 2/3/4/3, mystery 3/3/3/4, prose 2/2/4/2, rhythm and ending 2/4/3/3, fun 3/3/3/3,
  **coherence 2/2/3/2, fluidity 2/2/3/2, Basic Fantasy fidelity 3/3/3/3** (first pass: coherence 2/2/2/2, fluidity
  2/2/3/3, fidelity 3/2/3/3). Phase 2, with the data, by profile: coherence A 2 / B 3, fluidity A 2 / B 3, rules fidelity
  A 2 / B 3 (first pass: A 2/2/2, B 2/4/3). Its top problems, confirmed against the logs: the wrong replacement line
  «Narratore manca Zirrà.» (4 times at the table), actions left without a narrated outcome in profile A, a failed check
  that still gets the result (Ugo points the path after «Carisma 3 contro CD 13, fallita»), broken quotes in the
  announcements, and a dead Zirrà in one late line of profile A.

### Before / after

Every bug of §6, on the latest code (`86a3946`), with the evidence of the second pass.

| # | Bug of the first pass | Second pass | Evidence |
|---|---|---|---|
| A1 | NPC replies to private actions heard at the table | **fixed** | 0 replies heard in 4 Italian games (18 private actions) and in the English run; the guard moved 7 + 10 lines in profile B |
| A2 | private outcome said without the PC's name | **fixed** | on `aee0467` still 3 times, e.g. «Eliandro tace, il quaderno aperto. Chiedere sottovoce a Berta chi sapeva della chiave non riesce…» (the guard judged one sentence at a time); after `eff935c`, 0 |
| A3 | content-free lines showing who acted in private | still there (accepted) | «Nespola abbassa la voce, quasi un sussurro, e parla a Berta nel cortile.» |
| A4 | «HIDDEN:» vs «NASCOST» | **fixed** (`3238277`, by reading; no English campaign played) | markers of all languages hold in every campaign |
| B1 | release lines on unrelated actions | **fixed** | the Engine refused them: 1–4 per run «rilascio fuori contesto, al suo posto la deviazione», e.g. `nar_conto` for a sling shot. But see N3 |
| B2 | leak detector blind to such releases | partly | the releases no longer happen; the phase-2 judge still found `nar_piccone` counted as clean |
| B3 | verbal tics | still there | Zirrà «ride corto» in every B game; «Non so, non m'importa. Parliamo di prezzo.» as a stock deflection |
| C1 | dead or down NPCs keep acting | **fixed in the Engine**, one leftover | «combattimento: esce dallo scontro», dead NPCs' lines discarded (6 in pressione-B, 8 sceneggiatore lines «png_zirra non è nella scena»); a narrator-voiced sceneggiatore line written before the death still said «Zirrà ride corto e batte la spada sullo scudo» (indagine-A T14) |
| C2 | narrator omits combat facts | **fixed** | «fatti dello scontro non detti dalla narrazione, li dice il Motore» in 5 of 6 runs; but in indagine-A Zirrà's death was never told (the minimal reader picked filler lines and the repair did not fire) |
| C3 | morale invisible, fled NPC stays | **fixed** | «Morale dei nemici: 3 contro 8 → tengono»; pressione-B: Grosso killed, then «Zirrà vede il compagno cadere e lascia andare la spada corta… Zirrà fugge.» and she leaves the fight |
| C4 | harness sends out-of-turn combat actions | still there | 1–7 deferred actions per run (harness) |
| C5 | attacks on creatures without a sheet; invented goblins | still there | «tre o quattro goblin», goblin attacks resolved «nessun tiro, risolvi con un sì, ma» (pressione-B T11–T14) |
| D1 | absurd keyword cards (profile A) | **fixed** | 1 wrong card in 19 (a thrown dagger rolled as «Pugnale, Attacco in mischia»; first pass 14 of 35), plus the set's own save for «mi aggrappo al ramo», which the judge counts as absurd; fewer rolls overall (8 and 11 instead of 20 and 15) |
| D2 | card and story disagree | improved, still there | Berta keeps the key after «Carisma 10 contro CD 17, fallita» and gives it after «Carisma 20… riuscita»; but after «Carisma 3 contro CD 13, fallita» Haiku still has Ugo point the path (indagine-B T10) |
| D3 | premature scene ending | **not seen** | no scene ending before the scripted change in 4 games |
| D4 | empty or cut announcements | improved | never empty; still a quote of the player's words, sometimes with broken quotes («Livia Sarti: «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo».») |
| D5 | «contro CD 14» for the Armour Class | still there | «Spada lunga 20 contro CD 14»; on `aee0467` also «Dardo incantato 7 contro soglia 0», fixed by `9f674f8` on the cards (the phase-1 text still has it from the server log) |
| D6 | Haiku arbiter: Ascoltare for a whispered question; magic missile without a roll | partly | magic missile is now «Attacco automatico» in every run (`e26ee4a`); «Ascoltare» for a whispered question still 1–2 times per B game |
| E1 | images 3/14 | improved | 4/14 (Berta's portrait); the images agent is still generating |
| E2 | `estrai.py` | fixed (first pass) | — |
| E3 | session clock never threatens; no ending in 16 turns | still there | `o_mezzanotte` 1/8 in every run; the scripted games end in the tower without the final choice; with `--chiudi` the closing works (2 lines and a summary) |
| L1 | ERROR «parola segreta nel messaggio del selettore» for the players' own words | still there | 12 per run |
| L2 | «audio pre-generato mancante» with the fake voice | still there | 30–31 per profile-A run |
| L3 | `PROVIDER:` says «configurato» for an environment override | still there | «voce → openrouter — configurato (config/predefinita.yaml)» with `TAGM_VOCE=fish` |
| L4 | copioni README without `pg:` | fixed (first pass) | — |
| L5 | `tavolo.md` without the dice cards | still there | the judge needs `tavolo_con_carte.py` |
| L7 | id written as a label | not seen | — |

**New in the second pass:**

| # | Sev | What happened | Likely cause | Status |
|---|---|---|---|---|
| N1 | M | The harness ignored the old variable names: `CANTASTORIE_PORTA=4810 … esegui.ts` ran on the default 4710 and would have restarted whatever ran there (reproduced with `leggiOpzioni`) | rename: `esegui.ts` did not apply the legacy mapping | fixed by `c1db46a` |
| N2 | H | The Engine's replacement line has the wrong subject, and it fires on announcements: «Narratore manca Zirrà.» 4 times at the table, for Haiku's «Zirrà colpisce Fulco di striscio» (a miss), for the action line «Eliandro si tiene dietro la pietra e tira il pugnale…», and for the minimal-mode announcements «Eliandro: «Tiro il pugnale al goblin che scappa verso le scale».» and «Nespola Tondi: «Colpisco il goblin alle spalle con la spada corta».» | Engine (`0ef96ac`): the subject comes from the speaker label, and an attack's announcement counts as a contradiction | open, reported |
| N3 | M | The contradiction guard also fires on metaphors: «Berta non risponde: il suo sguardo cade un attimo sul cancello» became «Berta è ancora in piedi.» (motivo `caduta_senza_fatto`) | Engine (`0ef96ac`), word «cade» | open |
| N4 | M | The deflection that replaces a refused release can be an NPC answering nobody: «Ugo Faggioli: Non lo so. Chieda al paese, che sa tutto.» while Nespola runs up the path; «Zirrà: Non so, non m'importa. Parliamo di prezzo.» in the middle of a volley | Engine (B1 fix): the deflection is spoken even when no action is addressed to that NPC | fixed by «Pass-2 leftovers: deflection to the addressee, missing sceneggiatore type, cut summaries, log noise»: the deflection is said by the NPC the action speaks to (`pngInterpellati`, present in the scene); if it speaks to nobody, the narrator's, i.e. the line is dropped |
| N5 | M | The sceneggiatore's lines are often refused for their form: «tipo non ammesso per lo sceneggiatore: undefined» 6 and 12 times, one «YAML non valido» | sceneggiatore prompt or parser (`sceneggiatore/valida.ts`) | fixed by «Pass-2 leftovers: deflection to the addressee, missing sceneggiatore type, cut summaries, log noise»: a missing `tipo` is deduced from who speaks (NPC `reazione`, narrator `momento`, `chiusura` for a closing request) and logged as a correction; a type given and not allowed is refused with the allowed list; the prompt says the field is required |
| N6 | M | The local reader (Qwen3 8B on 4613) disappeared halfway through the first pressione-A run, with no line in its log and the pid file left behind. The server fell back without a word: 64 «risposta strutturata non valida», 32 «si usa il ripiego deterministico», 18 «nessuna» of 25, and a fallback summary «modello locale … irraggiungibile». Nothing restarted it. Profile B was running at the same time, on a 16 GB Mac with swap full | infra (memory, probably) + Engine: no watchdog for the local model server | open; the run was repeated alone |
| N7 | M | The closing summary from the local model can be cut and still accepted: «Livia ha chiesto a Berta dove fosse Ton» (39 characters, no threads) | Engine (`riassunto`: no minimum length or end check for a model summary) | fixed by «Pass-2 leftovers: deflection to the addressee, missing sceneggiatore type, cut summaries, log noise»: only finished sentences are kept (a trailing sentence without a full stop is cut), at least 20 characters, else the fallback; a cut thread is dropped |

### Verdict of the second pass

The fix wave did what it promised where the first pass hurt most:
- **Privacy:** no private content and no NPC reply reached the table in five games.
- **Combat:** dead NPCs leave the fight, morale shows and makes a villain flee, and the Engine says the falls the
  narrator leaves out (in 5 of 6 runs; one death in profile A was never told).
- **Local rules arbiter:** it no longer rolls absurd checks.
- **The manual's own numbers:** they reach the cards (d100 thief skills, x-in-6, automatic magic missile, initiative
  re-rolled each round).
- **Voice:** the lexicon makes the names come out right (44/45).
- **Closing:** the guided closing works.

What still keeps «coherent» out of reach is mostly new: the Engine's own replacement line («Narratore manca Zirrà.»,
N2) is now the most visible nonsense at the table. Two old gaps remain: narration that goes past a failed check (D2) and
invented minions (C5). Profile B is now the better game (judge 3/3/3 against A's 2/2/2), at $0.06 for 16 turns.
Profile A is $0 and quiet about errors, but it reads as a list of quoted actions. Fix N2 first: one line of code
and the game loses its worst sentence. Then N4 and N5.

## 10. Reproduce

Commands are in §4; the measures are recomputed with
`python3 -I esperimenti/e2e-finale/misure.py esperimenti/risultati/e2e-finale/<run> <logs of that run>` and
`python3 -I esperimenti/e2e-finale/tavolo_con_carte.py <same two arguments>` (the server logs of a test port live in
`logs/porta-<port>/` until the next run on that port, and are not in git). The judge prompts are in
`esperimenti/e2e-finale/giudizio-fase1-prompt.md` and `giudizio-fase2-prompt.md`.
For the second pass: `giudizio-fase1-prompt-2.md`, `giudizio-fase2-prompt-2.md` and `chiave-giudizio-2.txt`. The name
check of the lexicon runs from a checkout with `npx tsx esperimenti/e2e-finale/ascolta-nomi.mts <checkout> torre-mozza <ISO time>
[max lines]`. It transcribes the drama-3 lines of `cache/audio-fish/` created after that time, and its output for this pass is
`esperimenti/e2e-finale/ascolta-nomi-torre-mozza.txt`.

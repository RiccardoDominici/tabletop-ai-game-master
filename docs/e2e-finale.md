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
| percentile thief skills, x-in-6 chances | converted to d20 bonuses with the same odds | schema: one `risoluzione.tipo` per set |
| initiative re-rolled every round, ties simultaneous | ✓ `ogni_round` is ignored for individual initiative (only side initiative re-rolls, `prove/combattimento.ts:231`); ties broken by a fixed order | Engine |
| save vs. death once, 2d10 rounds to bind wounds | 1 success / 1 failure; ✓ the Engine adds the SRD rules «natural 20 = up with 1 HP, natural 1 = two failures» to every set (`prove/combattimento.ts:338`), seen in play («venti naturale: torna in sé con 1 punto ferita») | fixed: `tiri_morte.venti_rialza`, `uno_doppio` (SRD default), off in torre-mozza |
| magic missile always hits | a +20 skill bonus; with the Haiku arbiter one cast became «nessun tiro» and did no damage (indagine-B T13) | schema: no per-attack `automatico` |
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

- **Profile A, all local, $0**: `CANTASTORIE_PORTA=4800 CANTASTORIE_LETTORE=locale CANTASTORIE_ARBITRO_PROVE=regole
  CANTASTORIE_ARBITRO_AZIONI=regole CANTASTORIE_RIASSUNTO=locale CANTASTORIE_REGOLE=locale npx tsx
  apps/server/src/esperimenti/esegui.ts torre-mozza/indagine B --campagna torre-mozza --uscita e2e-finale/torre-mozza-indagine-A
  --pausa-s 20 --sceneggiatore`. Reader Qwen3 8B 4-bit on 127.0.0.1:4613 (minimal mode), keyword dice arbiter, fake voice
  (the harness passes `--mock`; a local Qwen voice on a test port would need its own service), sceneggiatore on
  (Claude Code on Riccardo's subscription, only in these two runs).
- **Profile B, API**: `CANTASTORIE_PORTA=4810 CANTASTORIE_LETTORE=anthropic CANTASTORIE_ARBITRO_PROVE=anthropic
  CANTASTORIE_ARBITRO_AZIONI=anthropic CANTASTORIE_RIASSUNTO=anthropic CANTASTORIE_REGOLE=anthropic CANTASTORIE_VOCE=fish npx tsx
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
| absurd cards (wrong ability, needless roll, or attack without a target) | 1 | 1 | 7 | 7 | 2 | 1 |
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
| B1 | M | The selector picks lines whose `quando` is not met: the confession `zir_corda` («Il ragazzo è venuto da solo») for Nespola climbing through a window (pressione-B T13); the clue `nar_conto` for Fulco's sling shot while Eliandro searched in private (indagine-B2 T15); `ber_cose_tonio` for a question about the key (indagine-A T2); `nar_tonio_parla` for «Dov'è il ragazzo?» (pressione-A T16) | prompt/model (Haiku selector, Qwen reader); data: `oppure` gates and loose `temi` | open |
| B2 | M | The leak detector reports 0 everywhere, but a release line used for the wrong action is a leak it cannot see (B1 is counted as legitimate because `zir_corda` is in `pubblica_dopo`) | harness (`esperimenti/fughe.ts`) | open |
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
| D3 | M | A scene ending fired at turn 5 («La scena è finita: il master sceglie come andare avanti», `fin_ovile_senza`, «senza la chiave») and the next turn Berta gave the key | reader picked an ending line; data gate too loose | open |
| D4 | M | Engine announcements in minimal mode quote the first words and say nothing («Eliandro: «Dico agli altri».», «Livia Sarti: «Tu che sei del posto».») or stop mid-phrase («…colpisco alle spalle la sentinella con».») | Engine (`llm/annuncio.ts`: first short phrase, 12-word cap) | open |
| D5 | L | Cards say «contro CD 14» for an attack against the Armour Class, and repeat the label («Dardo incantato, Dardo incantato») | Engine wording | open |
| D6 | M | The Haiku arbiter (profile B) is mostly right but rolls «Ascoltare» for a whispered question (pressione-B T4, indagine-B2 T4 and T6) and asks an Intelligence roll for telling the party a deduction, whose failure price made Ugo leave (indagine-B T5) | prompt/model (arbiter with the set); the manual's ability roll is for actions «that seem to have no rule», not for talking | open |

### E. Pipeline, tools, logs

| # | Sev | What happened | Likely cause | Status |
|---|---|---|---|---|
| E1 | M | Images stopped at 3/14: the disk was 99% full (4–8 GB free, swap 8 GB) and `strumenti/immagini/motore.py` refuses below 8 GB; each `prepara.sh` pass made one image | provider/infra (this Mac's disk); the 4 portraits and 7 situations are missing | open: rerun `scripts/prepara.sh campagne/torre-mozza --voce` after freeing disk |
| E2 | M | `estrai.py` merged pp. 47–199 into one section | tool | fixed by `1a7839b`, verified (500 sections) |
| E3 | L | The session clock moved 1/8 in every run (`segno_almeno_ogni: 9` with ~10 turns before the tower), so midnight never threatened, and no game reached the final choice in 16 turns | data (clock too slow for the scene lengths) + script length | open |
| L1 | L | 12 ERROR lines per run «repertorio: parola segreta nel messaggio del selettore» when a player types their own private knowledge | Engine (`scena/regia.ts:2323` should not count the players' own words, or log at info) | open |
| L2 | L | 33–41 warnings per run «voce: audio pre-generato mancante» with the fake voice | Engine voice (warn only for a real voice) | open |
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
3. **B1 + B2**: refuse an `[usa]` whose line has an `indizio` or `confessione` type when the action shares no `tema`
   with it, and count such a release as a leak in `fughe.ts`.
4. **A2 + A4**: extend the private guard to outcome lines in a turn where the only actor of that place acted in
   private; make «HIDDEN:» and «NASCOST» the same marker per language.
5. **C4 / L5**: teach the harness combat turns and add the cards to `tavolo.md`, so that the next measure is fair.
6. **D4**: an announcement that says nothing is worse than none.
7. **E1**: finish the images when the disk has room.

## 8. Reproduce

Commands are in §4; the measures are recomputed with
`python3 -I esperimenti/e2e-finale/misure.py esperimenti/risultati/e2e-finale/<run> <logs of that run>` and
`python3 -I esperimenti/e2e-finale/tavolo_con_carte.py <same two arguments>` (the server logs of a test port live in
`logs/porta-<port>/` until the next run on that port, and are not in git). The judge prompts are in
`esperimenti/e2e-finale/giudizio-fase1-prompt.md` and `giudizio-fase2-prompt.md`.

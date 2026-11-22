# Basic Fantasy r142: independent re-audit of the implemented rules

Rules taken from Chris Gonnerman's *Basic Fantasy Role-Playing Game*, 4th edition, release 142 (CC BY-SA 4.0,
basicfantasy.org). This audit summarises the rules briefly, and it is shared under the same licence.

This is an independent check of what six packages (R1 to R6) marked `impl+test` in
`docs/regole-audit/basic-fantasy-personaggio.md` and `docs/regole-audit/basic-fantasy-gioco.md`. It is not a summary of
their claims. Every row below was re-read in the manual. The code path and the cited test were opened, and the verdict
comes from those three sources. HEAD `add75c9`, 22 November 2026. File:line references are at that commit.

**Method.**
- The manual was read with `pdftotext -layout manuali/basic-fantasy-rpg-r142.pdf`, split into pages. PDF page = printed
  page + 4, and the pages cited here are the printed ones.
- For each row: the rule was split into its clauses on the printed page. The set key was found in
  `campagne/torre-mozza/regole/`. Its consumer was found in `apps/server/src` with grep, outside the loader and the
  types. The cited `it(…)` block was then opened.
- A row is **CORRECT** when the numbers and the procedure match the manual and a test drives dice through that path and
  asserts the outcome. A data test (`manuale-basic-fantasy.test.ts`, `strumenti/regole/test_*_bf.py`) is enough for a
  table row, but not for a procedure row.
- **PARTIAL** means one clause of the rule is missing, whether or not the row's gap column admits it.
- **UNTESTED** means the code is right but no test exercises the clause.
- **WRONG** means the game gives a number the manual contradicts.
- Read-only: no code or data was changed.

**Tests run once at `add75c9`** (both passed):

```bash
cd apps/server && npx vitest run test/manuale-basic-fantasy.test.ts test/regole-manuali.test.ts test/prove-regole.test.ts \
  test/regole.test.ts test/combattimento.test.ts test/fuori-gioco.test.ts test/tratti.test.ts test/poteri.test.ts \
  test/attivi.test.ts test/salvezze.test.ts test/esperienza.test.ts test/livelli.test.ts test/progressione.test.ts \
  test/inventario.test.ts test/catalogo.test.ts test/tempo.test.ts test/luce.test.ts test/creazione-bozza.test.ts \
  test/creazione-controllo.test.ts test/creazione-server.test.ts test/tiri-segreti.test.ts test/prove-livello-soglie.test.ts \
  test/esplorazione.test.ts test/esplorazione-viaggio.test.ts test/esplorazione-server.test.ts test/effetti.test.ts \
  test/bestiario.test.ts test/drenaggio-rigenerazione.test.ts test/combinazioni.test.ts test/modificatori-situazione.test.ts \
  test/morale.test.ts test/morte.test.ts test/mostri-speciali.test.ts test/non-letale.test.ts test/numeri-regole.test.ts \
  test/reazioni.test.ts test/scacciare.test.ts test/sorpresa-mostri.test.ts test/tempo-scontro.test.ts test/tiri-master.test.ts \
  test/r6-varie.test.ts test/residui-r3.test.ts test/gregari.test.ts test/situazioni.test.ts
#   → Test Files 44 passed (44), Tests 412 passed (412)
python3 -m pytest -q strumenti/test_valida_regole.py strumenti/test_valida_creazione.py strumenti/test_valida_catalogo.py \
  strumenti/test_valida_progressione.py strumenti/test_valida_bestiario.py strumenti/test_valida_effetti.py \
  strumenti/test_valida_esplorazione.py strumenti/test_valida_gregari.py strumenti/test_valida_lingue.py \
  strumenti/test_tra_sessioni.py strumenti/test_mostri_di_gioco.py strumenti/test_motore_limiti.py \
  strumenti/regole/test_bestiario_bf.py strumenti/regole/test_confronta_bestiario.py strumenti/regole/test_estrai.py \
  strumenti/regole/test_incontri_bf.py strumenti/regole/test_tiri_bf.py strumenti/regole/test_varie_bf.py
#   → 284 passed (the strumenti/regole/*_bf.py tests read the PDF; they ran, none skipped)
```

## Summary

88 verdicts on rows marked `impl+test`. The sample covers every chapter: abilities, races, classes, equipment,
encumbrance, time and movement, light, exploration, encounters, combat, damage and healing, saves, morale, spells,
monsters, XP and level, and creation. A row and its **[overlap]** twin count once (for example X-SV-03 with P5-57 and
P5-58).

| verdict | rows |
|---|---|
| CORRECT | **75** |
| PARTIAL | **10** (8 admitted in the row's gap or where column, 2 not) |
| UNTESTED | **2** (one clause of code, two rows) |
| WRONG | **1** (minor) |
| total | **88** |

The core holds up:
- Every table copied into the set was compared with the PDF in full, not sampled, and matches (next section).
- The procedures (saves pinned to the table, spells counted, sneak attack once per target, encumbrance → travel, food
  and water, light, morale timing, subduing damage, death save, Turn Undead, XP and the one-level cap, creation) do
  what the manual says, and their tests drive real dice through the Engine.
- The problems are one small wrong number, a damage floor with no test, and status columns that understate what the
  code does now (section «Stale statements»).

## Table numbers checked against the PDF

Each table was compared cell by cell with a script (`campagne/torre-mozza/regole/regole.yaml` against the page text), or
by eye where noted. Every cell matches.

| table | page | cells compared | result |
|---|---|---|---|
| Saving throws, 4 classes × all levels (NM to 20), 5 columns | 61 | 23 printed rows (every level expanded) | match |
| XP to reach each level, Cleric/Fighter/Magic-User/Thief | 7–8 | 80 | match |
| Hit dice 1–9 and fixed HP after 9th (+1 / +2 / +1 / +2) | 7–8 | 80 | match |
| Spells per day, Cleric and Magic-User, levels 1–20 | 7–8 | 40 rows | match |
| Thief abilities, 7 columns × 20 levels | 9 | 140 | match |
| Attack bonus: Fighter (with NM), Cleric/Thief, Magic-User, Monster by HD | 53 | 4 columns | match (by eye; the monster column also in the data test) |
| Clerics vs. Undead, 9 types × 20 levels (numbers, T, D, No) | 57 | 180 | match |
| XP by monster HD (<1 to 25) and the special-ability bonus | 49 | 52 | match (by eye) |
| Weapons: price, size, weight, damage (with ammunition and spear modes) | 11 | 22 weapons, 10 ammunition | match (by eye) |
| Missile ranges (feet × 0.3 = metres) | 11 | 9 weapons | match; oil and holy water are not in the catalog |
| Armor and shield: price, weight, AC | 11 | 5 | match |
| Equipment list: price and weight | 10 | 46 items, 5 mounts | match (by eye) |
| Carrying capacity by STR, both race columns; movement by armor and load | 42 | 28 + 6 | match |
| Ability score bonus (3: −3 … 18: +3) | 4 | 7 bands | match (also `test_tiri_bf.py`) |
| Monster reaction (2d6 bands), retainer hiring bands | 50, 46 | 4 + 5 | match (also `test_tiri_bf.py`) |
| Dungeon encounter table level 1 | 180 | 12 | match by eye; `test_incontri_bf.py` compares every printed cell |

## WRONG

**P5-32 Missiles That Miss (p. 55).** The manual says the GM rolls the missed shot against allies in the melee, «It is
recommended that no more than three allies be "tried" in this way, but the GM may make an exception». It also says
«This rule is applied to attacks made by monsters, when appropriate».
- The set has `combattimento.nella_mischia: {alleati: 9}` (`campagne/torre-mozza/regole/regole.yaml:1484`). Its comment
  says «il manuale non dà un limite, qui tutti quelli in mischia» («the manual gives no limit, here everyone in the
  melee»), and that is false. Manual 3, game 9.
- Only a PC's missed shot is redirected (`apps/server/src/prove/risolutore-regole.ts:240-241`). A monster's missed shot
  into a melee with its allies never hits one of them.
- The row's gap column says «—», and the row's own rule text says «up to 3 allies».
- Impact is small: it needs a PC shooting into a melee with more than three other PCs engaged with the same foe.
- Fix: `alleati: 3`, correct the comment, and the gap should name the monsters' side.

## UNTESTED

**C-ABI-05 (p. 4, «a Strength penalty never lowers the damage of a hit below 1») and P5-38 (p. 55, «any hit deals at
least 1 point»).**
- The code is right: `apps/server/src/prove/risolutore-regole.ts:499`,
  `Math.max(s.attacchi.dannoMinimo, …)`, with `danno_minimo: 1` in the set.
- The cited test (`apps/server/test/regole-manuali.test.ts:174-187`, «danno del critico … e danno minimo») only asserts
  that the set loads `dannoMinimo: 1`, and that a natural 20 does not double the dice.
- No test anywhere hits with a roll + penalty below 1 and asserts 1. `catalogo.test.ts:89` has a `1d4-1` dagger but
  checks only the formula.
- This matters at the table: STR 3–8 characters and «1d4−1» goblins are common at level 1.

The extra missiles of Magic Missile (part of C-SP-01) are also untested, but that row's other clauses are tested, so it is
listed as PARTIAL below.

## PARTIAL

| row | manual | what is missing | admitted in the row? |
|---|---|---|---|
| C-SP-01 Magic Missile | p. 29: «two at 4th level, three at 7th, four at 10th, five at 13th» | The extra missiles are computed correctly (`apps/server/src/regole/effetti.ts:231-233`, `perLivello(…, daUno)`: 1 + ⌊(L−1)/3⌋, capped at 5), but no test casts at level 4+. `effetti.test.ts:50` only parses `colpi`. Auto-hit 1d6+1 and the slot are tested (`poteri.test.ts:87`). | no |
| P4-08 Movement | p. 42: «normal movement per turn is 3 times the movement rate per round» | `movimento.per_turno: 3` (`regole.yaml:1338`) is loaded but read nowhere in `src/` (grep `perTurno`). Only the data test asserts it. Per-round movement is used, by travel. | no (the gap says only «no positions») |
| C-WPN-06 Missile ranges | p. 11 and p. 42: in the wilderness, yards for feet | Outdoors the ranges stay in metres from feet, a third of the manual's. A longbow shot at 100 m outdoors is refused (long limit 63 m); the manual allows 192 m. Oil and holy water have no range. | yes |
| C-EQ-06, P4-17 Light | p. 12, 43: candle 5' + 5' dim, 3 turns per inch | Candles have no light or duration. The bullseye cone and the hooded lantern's shutter are not modelled. Torch and lantern are correct and tested (`tempo.test.ts:83`, `luce.test.ts:21`). | yes |
| P4-20 Secret doors | p. 44: after two failed searchers, 2 turns, then an hour | Only the turn per search is on the clock. | yes |
| P4-41 XP division | p. 49: retainers take half a share | Shares count PCs only (`esperienza.test.ts:21`). | yes |
| P5-29 Cover | p. 54: concealment −1 to −4, hard cover doubled | Four grades: −2/−4 soft, −4/−8 hard. | yes |
| P5-42 Brawling | p. 56: kick 1d4 at −2; a fist on metal armor hurts its owner | Punch 1d3 subduing is tested (`non-letale.test.ts:44`). The rest is missing. | yes |
| C-RACE-21 Halfling hiding | p. 6: detected 10% in forest, 30% elsewhere | The trait gives 70 everywhere. The forest's 90 needs the GM's points. | yes (where column) |

## Stale statements in the two audit files (not WRONG: the code does more than the files say)

- **P8-18** keeps «DEVIATES from level 2: … game 17 at every level». The gioco summary also still says «2 of the 105
  implemented rows (`impl`) are marked DEVIATES: … P8-18».
  - R5 implemented the target by level: `difficolta_per_livello` (`regole.yaml:137-148`) and
    `apps/server/src/regole/prove-livello.ts:13-24`.
  - It is asserted at every row of p. 189 (`manuale-basic-fantasy.test.ts`, «the Ability Rolls target by level»), and
    X-OPT-05 is closed.
- **C-WPN-05**: its where and test columns point to the old word modifiers (`gittata_corta`, `tRM:122`, an invented
  fixture). torre-mozza now uses the catalog bands (`apps/server/src/prove/gittate.ts:38-52`), tested by
  `inventario.test.ts:153`. The rule is right; the pointer is stale.
- **Rows whose status is lower than the code** (each checked):

  | row | status in the file | what the code does now |
  |---|---|---|
  | C-HP-05 | absent | Current HP, items, slots and XP carry between sessions (`apps/server/src/sessione/stato-pg.ts:48`, `pg_alla_fine` → `pg_all_inizio`; `stato-pg.test.ts:62`). |
  | C-RACE-12 | impl, «the ghoul's paralysing touch is not data yet» | It is data: `mostri.yaml` ghoul `colpendo: [paralisi_ghoul]`, and the elves have `{immune: [paralisi_ghoul]}`. |
  | C-WPN-03 | narrated, «no immunity reads the property» | `colpito_solo_da` reads `argento` (`mostri-speciali.test.ts:112`). |
  | C-EQ-09 | absent | The waterskin and the weekly rations are `esplorazione.provviste`. |
  | C-CLS-13 | narrated | `creazione.incantesimi` gives read magic + 1 (`creazione-bozza.test.ts:252`). |
  | P4-19b | sheet | The x-in-6 chances are derived (`soglia.piu`; manuale test «the x-in-6 chances»). |
  | P5-36 | sheet | STR is added to melee, thrown and sling damage by the catalog (`danno_caratteristica`, `forza_al_danno`). Asserted by the four PCs' attack lines. |
  | P8-08, P8-09, P8-10 | absent, «see the other file» | The other file has them as X-OPT-01/02 `impl+test` and X-OPT-03 `impl`. |
  | P5-03 | impl | The ambusher's 1–4 is tested by `sorpresa-mostri.test.ts:13`. |
  | P6-10 | absent | The encounter tables carry each entry's `numero` (`regole/incontri.yaml`). |

- The character file's «What "tested" proves» paragraph («No test asserts that a sheet's number equals the manual's
  table») is out of date. `manuale-basic-fantasy.test.ts` and `strumenti/regole/test_*_bf.py` (against the PDF) do that
  now.
- Both files' «10 most important gaps» lists and the gioco file's «Answers to the six questions» date from 20 November,
  and most of their items are closed. The current answers are below.
- The character file's reference table pins line numbers to `e3df006` (for example «RS:81-92», now `schede.ts:441`).
- **Modelling note (not a gap in the numbers).** Each day underground spends one waterskin item (`otre`, one day each),
  so the skin itself is used up. Refilling is not modelled. The manual's waterskin is a refillable one-quart container
  (p. 12).

## Full verdict table

Code paths are under `apps/server/src/` and tests under `apps/server/test/` unless a path says otherwise. «manuale» is
`manuale-basic-fantasy.test.ts`, the data test against the real set.

| row | page | verdict | evidence (code; test) |
|---|---|---|---|
| C-ABI-01 score → bonus | 4 | CORRECT | `regole/schede.ts:441`; `regole-manuali.test.ts:202`, `test_tiri_bf.py:54` |
| C-ABI-05 STR penalty, damage ≥ 1 | 4 | UNTESTED | `prove/risolutore-regole.ts:499`; cited test checks the config only |
| C-ABI-06 INT languages | 4 | CORRECT | `regole/controllo-pg.ts`; `creazione-bozza.test.ts:281`, manuale «character creation» |
| C-ABI-10 DEX to initiative | 4 | CORRECT | set `iniziativa`; `tratti.test.ts:79` |
| C-RACE-06 dwarf saves +4/+3 | 5 | CORRECT | `prove/motore.ts:1093` (`extraSalvezza`); manuale (traits), `morte.test.ts:89` (a race's save bonus in play) |
| C-RACE-13 elf surprise −1 | 5 | CORRECT | `tratti.test.ts:97` |
| C-RACE-16 halfling requirements, d6 cap | 6 | CORRECT | manuale «Prime Requisites…»; `creazione-bozza.test.ts:133`, `progressione.test.ts:76` |
| C-RACE-18 halfling +1 missiles | 6 | CORRECT | `tratti.test.ts:87` |
| C-RACE-20 halfling +1 initiative | 6 | CORRECT | `tratti.test.ts:79` |
| C-RACE-21 halfling hiding | 6 | PARTIAL | see PARTIAL |
| C-RACE-24 human +10% XP | 6 | CORRECT | `prove/esperienza.ts`; `esperienza.test.ts:21` (the 10% applies after the share is truncated: ±1 XP) |
| C-CLS-01/06/09/14 XP tables | 7–8 | CORRECT | full compare; manuale «experience points…» |
| C-CLS-03, C-CLS-11 spells per day | 7–8 | CORRECT | full compare; `prove/risorse.ts`; `poteri.test.ts:49` |
| C-CLS-16 thief armor | 8, 187 | CORRECT | `inventario.test.ts:95` (chain mail: Open Locks refused) |
| C-THF-01 thief % | 9 | CORRECT | full compare; manuale «thief abilities» |
| C-THF-05 pick pockets noticed | 9 | CORRECT | `prove/risolutore-regole.ts` (more than twice the target, or 00); `tiri-segreti.test.ts:83` |
| C-THF-10 sneak attack | 9 | CORRECT | `poteri.test.ts:157` (double, once per target per fight, back after) |
| C-HP-03 level-up HP | 4 | CORRECT | `prove/livelli.ts:114` (minimum 1); `livelli.test.ts:41`, `progressione.test.ts:76` |
| C-HP-04 fixed HP after 9th | 4, 7–8 | CORRECT | full compare; manuale «hit dice» |
| C-WPN-01, C-WPN-02 weapons | 11 | CORRECT | full compare; manuale «weapons…», four PCs' attack lines |
| C-WPN-05 range ±1/−2 | 11 | CORRECT | `prove/gittate.ts:38-52`; `inventario.test.ts:153` (pointer stale) |
| C-WPN-06 range figures | 11 | PARTIAL | see PARTIAL |
| C-ARM-01 armor and shield | 11 | CORRECT | `regole/equipaggiamento.ts:83`; manuale «armor and shields», AC 17/15/15/12 |
| C-EQ-01 coins | 10 | CORRECT | manuale «coins» |
| C-EQ-04 gear list | 10 | CORRECT | compared by eye; manuale «gear: the 46 items» |
| C-EQ-06 light sources | 12 | PARTIAL | see PARTIAL |
| C-SPL-02 vancian preparation | 15 | CORRECT | `prove/risorse.ts`; `poteri.test.ts:49`, `:87` |
| C-SP-01 magic missile | 29 | PARTIAL | see PARTIAL |
| C-SP-02 sleep | 36 | CORRECT | `poteri.test.ts:116` (each target's save, 4+ HD and undead excluded); manuale |
| C-SP-09 cure light wounds | 20 | CORRECT | `poteri.test.ts:132`; manuale (1d6+1) |
| C-CRE-01 3d6 in order | 3 | CORRECT | set `creazione` (`regole.yaml:516-532`); `creazione-bozza.test.ts:50`, `creazione-server.test.ts:139` |
| C-CRE-04 3d6 × 10 gp | 3 | CORRECT | `creazione-bozza.test.ts:169` |
| C-CRE-05 race and class requirements | 3 | CORRECT | `regole/controllo-pg.ts`; manuale, `creazione-bozza.test.ts:133`, `test_valida_creazione.py` |
| X-AB-01 / P5-19 attack bonus | 53 | CORRECT | full compare; manuale «attack bonus by level» |
| X-SV-01, X-SV-02 / P5-60 save tables | 61 | CORRECT | full compare (all four classes) |
| X-SV-03 / P5-57 / P5-58 save procedure | 60–61 | CORRECT | `prove/risolutore-regole.ts` (pinned target); `salvezze.test.ts:82`, `:96`, `regole-manuali.test.ts:88` (naturals) |
| X-TU-01 / P5-47 Turn Undead table | 57 | CORRECT | full compare; `scacciare.test.ts:17` |
| X-OPT-05 / P8-18 ability-roll target | 189 | CORRECT | `regole/prove-livello.ts:13-24`; manuale «Ability Rolls target», `prove-livello-soglie.test.ts` |
| P4-01 turns and rounds | 42 | CORRECT | manuale «time…»; `tempo.test.ts` |
| P4-04 carrying capacity | 42 | CORRECT | full compare; manuale «light and heavy loads» |
| P4-05 movement by armor and load | 42 | CORRECT | `prove/inventario.ts:120-135`; `inventario.test.ts:227` |
| P4-08 per-turn movement | 42 | PARTIAL | see PARTIAL |
| P4-11 locked doors on 1d10, bars on 1d20 | 43 | CORRECT | set `sfondare`, `piegare_sbarre` (`come: forzare`); manuale «x-in-6…», `test_varie_bf.py:36` |
| P4-12 listening | 43 | CORRECT | `prove-livello-soglie.test.ts:75` (non-thief 1 on 1d6, hidden) |
| P4-17 light | 43 | PARTIAL | see PARTIAL |
| P4-18 darkvision, the dark | 43, 59 | CORRECT | `luce.test.ts:36` (blind −4 / +4, dwarf sees, goblins see) |
| P4-20 secret doors | 44 | PARTIAL | see PARTIAL |
| P4-22 food | 44 | CORRECT | `prove/provviste.ts:61-100`; `esplorazione-viaggio.test.ts:28` (2 days harmless, then 1 a day, no healing) |
| P4-23 water | 44 | CORRECT | `prove/provviste.ts:88`; `esplorazione-viaggio.test.ts:13` (1d4 from the first day) |
| P4-24 miles per day, slowest member | 45 | CORRECT | `prove/motore.ts:1644-1654`; `tempo.test.ts:140`, `:149` |
| P4-25 travel day and terrain | 45 | CORRECT | manuale «travel»; `tempo.test.ts:140` |
| P4-27 becoming lost | 45 | CORRECT | `esplorazione-viaggio.test.ts:121` (secret, panel only) |
| P4-39 XP by HD | 49 | CORRECT | full compare; `progressione.test.ts:144` |
| P4-41 XP division | 49 | PARTIAL | see PARTIAL |
| P4-42 one level per adventure | 49 | CORRECT | `esperienza.test.ts:60` |
| P5-02 surprise 1–2, one round lost | 50 | CORRECT | `tratti.test.ts:97`; `combattimento.test.ts` |
| P5-04 surprise per creature | 50 | CORRECT | `tratti.test.ts:97` |
| P5-05 reaction roll | 50 | CORRECT | `reazioni.test.ts:37`; `test_tiri_bf.py:77` |
| P5-16 charge +2, double damage | 52 | CORRECT | `regole-manuali.test.ts:123` (+2, 3 × 2 = 6; no charge with a sword). The charger's −2 AC is the separate row P5-17 (absent). |
| P5-20 monster AB by HD | 53 | CORRECT | `manuale-basic-fantasy.test.ts:464`, `bestiario.test.ts:28` |
| P5-25 naturals on attacks | 53 | CORRECT | `regole-manuali.test.ts:65` |
| P5-27 range bands | 54 | CORRECT | `inventario.test.ts:153` |
| P5-29 cover and concealment | 54 | PARTIAL | see PARTIAL |
| P5-30 crossbow rate of fire | 54 | CORRECT | `inventario.test.ts:172` |
| P5-32 missiles that miss | 55 | **WRONG** | see WRONG |
| P5-38 at least 1 damage | 55 | UNTESTED | see UNTESTED |
| P5-41 subduing damage | 55 | CORRECT | `non-letale.test.ts:15`, `:27` (−4, half, knocked out, 1 HP after 1d4 turns), `:59` |
| P5-42 brawling | 56 | PARTIAL | see PARTIAL |
| P5-44 morale 2d6 | 57 | CORRECT | `morale.test.ts:16`, `:27` |
| P5-45 morale timing | 57 | CORRECT | `morale.test.ts:16` (first opposition), `:36` (lone monster at half HP) |
| P5-48 Turn Undead procedure | 57–58 | CORRECT | `scacciare.test.ts:17` (2d6 HD weakest first), `:49` (D: 1d8 × level rolled once) |
| P5-49 energy drain | 58–59 | CORRECT | `drenaggio-rigenerazione.test.ts:14` (one HD off the maximum, −1 on d20), `:33` |
| P5-50 healing and rest | 59 | CORRECT | `effetti.test.ts:181` |
| P5-53 falling | 59 | CORRECT | `regole/salute.ts:84`; `effetti.test.ts:85` (4' 0, 5' 1, 14' 1, 15' 2, cap 20) |
| P8-01 dungeon wandering checks | 180 | CORRECT | manuale «wandering monsters every 3 turns», `esplorazione.test.ts:51` |
| P8-02 dungeon encounter tables | 180 | CORRECT | `test_incontri_bf.py:111` (every cell against the PDF) |
| P8-14 save vs. death | 188 | CORRECT | `morte.test.ts:63`, `:81`; manuale «death and dying» |
| P6-04 monster HP | 62 | CORRECT | `bestiario.test.ts:36` (3+2 → 3d8+2, ½ → 1d4) |
| P6-07 attacks per round | 62 | CORRECT | `bestiario.test.ts:119` (claw, claw, bite) |
| P6-16 breath | 79–80 | CORRECT | `mostri-speciali.test.ts:83` (1d8 per HD, save halves, every other round) |
| P6-19 ghoul paralysis | 97 | CORRECT | `mostri.yaml` ghoul, elves immune; `mostri-speciali.test.ts:40` |
| P6-22 troll regeneration | 152 | CORRECT | `drenaggio-rigenerazione.test.ts:43`, `:57` (down 2d6 rounds, up with 1, fire not regenerated) |

## Rows still absent, narrated or sheet-only: what matters at the table

This covers the 38 such rows of the character file and the 90 of the play file. The stale rows above are left out,
because the code already covers them. Each row is classified as:
- **(a)** it matters at the table for a typical campaign;
- **(b)** an optional rule;
- **(c)** descriptive text or GM advice.

### (a), in order of impact

Impact is ranked by how often the rule comes up in a typical level 1–5 campaign, with silent wrong outcomes first.

1. **C-SPL-05: a spell is spoiled if the caster is attacked or must save before its initiative number.** Every fight
   with a caster is affected, and spells never fail today. Silent.
2. **Spells beyond the eight typed ones.** C-SP-05 Light, C-SP-08 Protection from Evil, C-SP-14 Web and C-SP-15
   Invisibility are narrated. C-SP-16 Fireball, C-SP-17 Lightning Bolt and C-SP-18 Haste are absent, and so are all
   3rd-level and higher spells. Light is the worst: the Engine now blinds a party in the dark at −4 (R6), but a Light
   spell does not light the scene. A party that relies on it fights blind unless the GM sets the light from the panel.
   Silent.
3. **P5-14: the parting shot at +2 when fleeing a melee.** It is frequent, and today PCs and monsters leave for free.
   Silent.
4. **P5-34 burning oil, P5-33 holy water, P5-31 grenade-like scatter.** These are the classic level-1 tactics. Nothing
   is data, so a thrown flask does nothing unless the GM uses the panel.
5. **Magic items.** P7-16 and P5-37 are the bonus of a magic weapon, P7-18 magic armor, P7-15 using items, P7-20 and
   X-SCR-01 scrolls, P7-21 wand charges, P7-22 item effects, P7-17 cursed weapons. They appear from the first
   treasures, and their bonuses are typed by hand or missing.
6. **C-THF-03 and C-EQ-08.** C-THF-03 is one try per lock until the next level; today a thief can retry forever.
   C-EQ-08: thieves' tools are needed to open locks and remove traps.
7. **P4-02: yards outdoors.** Outdoor missile ranges are a third of the manual's, so a stated outdoor distance can be
   refused or pushed to long range (see C-WPN-06). Silent.
8. **Retainers.** P4-30, P4-32 to P4-35 and C-ABI-13 cover the share, the number limit, the level limit, loyalty and
   the half XP share (also P4-41's gap). Hiring exists (P4-31); retainers as allies on the PCs' side do not.
9. **P5-15: evasion and pursuit**, narrated.
10. **C-RACE-19: the halfling's +2 AC against larger-than-man-sized creatures.** Silent.
11. **Treasure generation.** P6-13 and P7-02 to P7-14 are the lair, individual and unguarded types, gems, jewellery and
    the magic item tables. Treasure is the main XP source when XP for treasure is used (the set uses it), so today it
    depends on what the Preparer places.
12. **Spellcasting procedure.** C-SPL-06 reversible spells, C-SPL-03 no casting when bound or gagged, C-SPL-07 and
    C-SPL-09 preparation time, C-SPL-08 the spellbook, C-SPL-04 the cast as the round's action (narrated).
13. **Combat details.** P5-09 delaying an action, P5-17 the charger's −2 AC, P5-18 setting a spear against a charge,
    P5-43b wrestling holds and escapes.
14. **Attrition.** P4-26 forced march, P5-51 the sleep needed and short sleep, P5-52 CON loss and recovery, P5-62 item
    saves, P4-07 and P6-15 animals' loads.
15. **Smaller character rules.** C-RACE-11 the elf's passive look for secret doors, C-CLS-17 a thief ability takes a
    turn (mostly covered, since an exploring window is a turn), C-EQ-05 container capacities, C-SP-06 Read Magic,
    C-SP-07 Hold Portal, C-SP-10 Remove Fear, C-SP-13 Spiritual Hammer, C-SP-19 Cure Serious Wounds, C-SP-20 Raise Dead.
16. **Monster specials.** P6-23 lycanthropy, P6-24 swallow whole, P6-26 damage-type quirks, P6-17 dragon ages (sheet).
    P5-23 normal men (sheet) is fine as written.
17. **Rules that need positions.** P5-10 reach against a closing foe, P5-11 move then attack, P5-12 running, P5-26
    melee only when engaged, P6-09 monster movement.
18. **Rare subsystems.** Vehicles and siege (C-VEH-01 to C-VEH-04, P5-55, P5-56), water and air travel (P4-28,
    P4-29), specialists (P4-36), mercenaries (P4-37), magical research (P8-23 to P8-26), strongholds (P8-32).

### (b) optional rules

X-OPT-07 and P8-21 (thief point allocation), X-OPT-08 and P8-22 (preparing spells from memory), P8-16 (negative hit
points), P8-17 (save-or-die poison as damage), P5-08 (one initiative roll for a group), P5-13 (maneuverability), P4-16
(detecting magical traps, «at the Game Master's option»), P8-13 (easy raising, by indenture).

### (c) descriptive or GM advice

P4-09 (mapping), P4-19c (the GM may make a door harder), P4-21 (finding a door is not opening it), P7-01 (treasure
placement), P8-05 to P8-07 (NPC party generators, prep tools), P8-12 (judging wishes), P8-27 (cursed items by design),
P8-28, P8-29, P8-31 (designing dungeons and wildernesses).

## The six questions, answered from today's code

1. **Is there a character creation phase?** Yes.
   - The set declares the procedure (`regole.yaml:516-532`): 3d6 in order, the GM's point and score swaps, the
     hopeless character's reroll or flip, race and class requirements, the class die + CON (minimum 1), 3d6 × 10 gp,
     purchases from the catalog with class and race restrictions, read magic + 1 spell, and languages by INT.
   - `apps/server/src/creazione/` runs it on the phones with real dice, and the Game Master approves the result, even
     mid-session.
   - The same check (`regole/controllo-pg.ts`) validates pregenerated PCs.
   - Tests: `creazione-bozza.test.ts:50-281`, `creazione-server.test.ts:139`, `:197`, and manuale «character creation».
   - Missing: only the optional thief point allocation (X-OPT-07).
2. **Are hit points tracked and changed everywhere?** Tracked: one value per sheet in `prove/stato.ts`, in the snapshot,
   and carried between sessions (`sessione/stato-pg.ts:48`, `stato-pg.test.ts:62`).
   - Changed by:
     - attacks: `prove/risolutore-regole.ts:503`, and `prove/risolutore.ts:471` for the SRD;
     - typed effects: spells, traps, falls, breath and poison death (`prove/effetti.ts:126`, `:208`); cures and
       potions (`:162`);
     - hunger and thirst (`prove/provviste.ts:90`, `prove/motore.ts:348`);
     - energy drain (`prove/drenaggio.ts:63`, `:75`);
     - rest (`prove/riposo.ts:34`) and level-up (`prove/livelli.ts:121`);
     - waking from a knock-out, and a troll getting up and regenerating (`prove/motore.ts:1159`, `:1169`, `:1749`,
       `:1789`);
     - the GM panel (`prove/motore.ts:2371-2372`).
   - Not changed by: burning oil and holy water (P5-34, P5-33), forced march (P4-26), CON loss (P5-52), short sleep
     (P5-51), and the week-long first point after 0 (P8-15).
3. **Are spell slots tracked and consumed?** Yes, in `prove/risorse.ts`.
   - Slots come from the class table by level. A cast spends a prepared copy and its slot, a spent spell is refused,
     and a rest refreshes them.
   - They are in the snapshot and carried between sessions (`StatoPg.contatori`, `incantesimi`).
   - A caster at 0 HP loses its prepared spells (`tiri_morte.perde_incantesimi`), and energy drain takes a top-level
     slot.
   - Tests: `poteri.test.ts:49`, `:87`, `livelli.test.ts:20`.
   - Missing: spell disruption (C-SPL-05), preparation time (C-SPL-09), learning spells after creation (X-OPT-03),
     and scrolls (X-SCR-01).
4. **Are weapons and armor read from data?** Yes.
   - The catalog (`regole.yaml:1162-1310`) holds every weapon, ammunition, armor, shield and gear item of pp. 10–12,
     and all of them match the PDF.
   - A sheet lists what it carries and wears. The Engine derives the AC (`regole/equipaggiamento.ts:83`: armor or 11,
     + DEX + shield) and the attack lines: weapon die, + STR for melee, thrown and sling, the ability by kind, range
     bands, reload and ammunition.
   - It enforces the class and race restrictions.
   - Monsters come from the 275 bestiary entries, checked against the PDF by `strumenti/regole/test_bestiario_bf.py`.
   - Tests: manuale (the four PCs' AC 17/15/15/12 and attack lines), `inventario.test.ts:95`, `:153`, `:172`.
   - Missing: magic weapon and armor bonuses (P5-37, P7-16, P7-18), and oil and holy water as weapons.
5. **Does encumbrance change movement?** Yes, but movement is used only by travel and for display.
   - The chain: weight (armor included, coins at 20 to the pound, halfling armor × ¼) → light or heavy band by STR and
     race → movement by armor category (`prove/inventario.ts:120-135`).
   - Consumers:
     - overland travel: the slowest member sets the miles per day, and an overloaded member stops the party
       (`prove/motore.ts:1644-1654`; `tempo.test.ts:140`, `:149`);
     - the fact the narrator hears when a band changes (`prove/inventario.ts:139-142`; `inventario.test.ts:227`);
     - the sheet and creation views.
   - It changes nothing in a fight or underground: the Engine has no positions, and the per-turn rate is unread (P4-08).
6. **Do roll scores match the manual's tables?** Yes, for every table the set carries (see «Table numbers» above): the
   score bonus, saves by class and level with race and ability adjustments, the attack bonus for classes and monsters,
   the thief percentages, the ability-roll target by level, the x-in-6 chances derived from STR, INT and race,
   initiative, surprise, morale, reaction, XP, Turn Undead and falls.
   - Known deviations: P5-43a (a held character is −4 AC against everyone, the holder included; admitted DEVIATES) and
     P5-32 (allies tried for a missed missile: 9 instead of the recommended 3).
   - The arbiter's flat ±2 stays only for situations the manual leaves to the GM.

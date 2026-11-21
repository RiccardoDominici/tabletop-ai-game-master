# Basic Fantasy r142 against the game: the character half (Parts 1 to 3)

Rules taken from Chris Gonnerman's *Basic Fantasy Role-Playing Game*, 4th edition, release 142 (CC BY-SA 4.0,
basicfantasy.org). This audit summarises the rules briefly, and it is shared under the same licence.

This file is a rule-by-rule map of Parts 1 to 3 of the manual (introduction and dice; creation, abilities, races,
classes, equipment, vehicles; spellcasting and a sample of spells) against what the Engine and the data really do
today (HEAD `e3df006`, 20 November 2026). The play half (Parts 4 to 8) is in `docs/regole-audit/basic-fantasy-gioco.md`.
The rows with an `X-` id come from other Parts (the attack bonus, saving throw and Turn Undead tables of Part 5, the
encumbrance table of Part 4, spell scrolls of Part 7, the character options of Part 8): the brief asked for them on
this side because they are class tables. They are marked **[overlap]**, so the two files can be deduplicated.

**Method.** The manual text was read with `pdftotext`, page by page, with each two-column page cut into its two
columns, and every table re-read in layout mode. Page numbers are the printed ones (PDF page = printed page + 4).
Then the Engine (`apps/server/src/regole/`, `prove/`, `campagna/`, `scena/oggetti.ts`), the schema (docs/regole.md
§2), the validator (`strumenti/valida/regole_set.py`), the torre-mozza rule set built from this manual
(`campagne/torre-mozza/regole/`) and its four pregenerated PCs (`campagne/torre-mozza/pg.yaml`), and the tests.

**What «tested» proves.** The unit tests run on invented fixtures: they prove the general mechanism (a score →
bonus table, a d100 under the sheet's percentage, a weapon that always hits), never Basic Fantasy's own values. No test
asserts that a sheet's number equals the manual's table. The live runs (docs/prove-verifica.md §6 and §6b, 15 November,
torre-mozza, manual rolls) are the only evidence on the real set. For the `sheet` rows the numbers of torre-mozza's
four PCs were checked by hand in this audit against the tables (section «Answers», question 6).

## Legend

**Statuses** (column `status`, the same five codes as the other file):

| code | meaning |
|---|---|
| `impl+test` | the Engine computes the rule, and a unit test or a live run proves the mechanism |
| `impl` | the Engine computes the rule; no test proves this case |
| `sheet` | the number is right only because the Preparer wrote it by hand on a sheet; the Engine just adds or rolls it |
| `narrated` | the rule exists only as text (`riassunto.md`, `estratti/`, `pg.yaml → cosa_sai_fare`, set `sottosistemi`) or in the Game Master's hands; no number changes by itself |
| `absent` | the rule is not in the set, the sheets or the code |
| `desc` | descriptive text, nothing to implement (not counted in the summary) |
| `ptr` | a pointer to another row that holds the rule (not counted) |

A gap marked **WRONG** is worse than a missing rule: the game gives a result the manual contradicts.

**Kinds**: `mech` (changes a number or an outcome), `proc` (order, phase, procedure), `desc` (descriptive).

**Engine and data references** (file:line at `e3df006`):

| short | file |
|---|---|
| RS | `apps/server/src/regole/schede.ts` (sheet of a non-SRD set: 21-57 fields read; 81-92 score → bonus by table) |
| RR | `apps/server/src/prove/risolutore-regole.ts` (191 check roll; 234-243 threshold rolls; 251-279 what is rolled: ability bonus + sheet bonus; 313-326 damage; 334-378 attacks) |
| RI | `apps/server/src/regole/risoluzione.ts` (48-61 d20 vs DC and the naturals) |
| ST | `apps/server/src/prove/stato.ts` (42-125 hit points: damage, heal, out of play; 55-59 reset to full; 141-151 snapshot) |
| MO | `apps/server/src/prove/motore.ts` (761-774 initiative modifier; 932-940 the GM sets HP) |
| CB | `apps/server/src/prove/combattimento.ts` (213, 294 initiative; 245-262 surprise; 519-531 death saves) |
| PM | `apps/server/src/prove/modificatori.ts:31` and `apps/server/src/regole/modificatori.ts:17` (situational attack modifiers) |
| CL | `apps/server/src/prove/classificatore-regole.ts:270-293` (rules arbiter: difficulty from signals, applied to any ability) |
| AR | `apps/server/src/prove/arbitro-regole.ts:58` (model arbiter: any difficulty of the set, for any ability) |
| GM | `apps/server/src/master/comandi.ts:331` (the panel's `pf` command) |
| VS | `strumenti/valida/regole_set.py:335-391` (sheet checks of a non-SRD set: shape only) |
| SRD | `apps/server/src/campagna/regole-srd.ts:221` (`ARMATURE`) and `:277` (`classeArmatura`): the SRD path's armor table, the precedent for a catalog |
| set | `campagne/torre-mozza/regole/regole.yaml` (the instance) |
| pg | `campagne/torre-mozza/pg.yaml` (the instance) |

**Tests**: `tRM` = `apps/server/test/regole-manuali.test.ts` (65 naturals on attacks; 88 naturals on saves; 122
situational modifiers; 173 critical and minimum damage; 201 score table; 224 initiative each round; 270 threshold
rolls; 291 automatic weapon). `tPR` = `apps/server/test/prove-regole.test.ts` (40 dice formulas; 156 check vs DC; 189
damage, heal, snapshot). `tR` = `apps/server/test/regole.test.ts` (114 card AC; 139 Engine attack). `tCB` =
`apps/server/test/combattimento.test.ts` (249 surprise; 303 one death save). `tFG` = `apps/server/test/fuori-gioco.test.ts:191`
(the GM's `pf` command). `tVR` = `strumenti/test_valida_regole.py` (136 table and scores; 147 threshold and automatic;
254 pf > 0). `L6`, `L6b` = live runs, docs/prove-verifica.md §6 and §6b.

**General mechanisms** (gap column). Each is deterministic Engine code or big-model work, never the live reader:

| code | mechanism |
|---|---|
| M1 | **Progression tables in the set**: per class and level, the XP thresholds, hit dice, attack bonus, saves, spells per day, thief percentages, Turn Undead row, ability-roll target; the sheet carries `classe`, `livello`, `px`; the validator and the Engine derive the sheet's numbers from the tables; a level-up step between sessions |
| M2 | **Item catalog in the set**: weapons (damage, size, hands, range bands, weight, cost, properties such as silver), armor (AC, weight, cost, kind), gear (weight, cost, capacity), with class and race allow-lists and their penalties; sheets reference ids; the Engine computes `difesa` and the attack lines (the SRD path already does this for armor) |
| M3 | **Per-character resources with a refresh trigger**: counters (spell slots by level, uses per day, once per target per fight, one attempt per lock per level, ammunition, torch and oil turns, money, prepared spells) in the Engine's state and snapshot, spent by the action that uses them, refused when empty, refreshed by rest, a new day or a level; carried between sessions |
| M4 | **Typed effects**: a spell, potion or ability as data with effects from a closed list (heal XdY+Z, damage per level, targets by HD, condition with a duration, temporary bonus to AC, attacks or saves, an extra action), applied by the Engine with a card, as attacks are today |
| M5 | **Saves as the manual's roll**: the target is the class/level table's number, never a difficulty rung or the arbiter's ±2; and target-side saves, so an NPC rolls its own save against a PC's spell (negate, or half damage) |
| M6 | **Tagged traits**: race and class traits as set data that add to a kind of roll or give an immunity (initiative +1, surprise −1 in 6, AC +2 against large creatures, +1 ranged, saves by kind, Wisdom against magic, immune to ghoul paralysis, the elf's passive secret-door chance), carried by the sheet and applied by the Engine |
| M7 | **Creation procedure**: the set declares the creation sequence (3d6 in order or a GM option, race and class requirements, hit die + CON minimum 1, starting money, purchases from M2, languages, starting spells); deterministic code rolls and checks, the big model proposes the choices; the result is a sheet that the validator checks against the same rules |
| M8 | **Load and movement**: carried weight from M2 → load band by Strength and race → movement rate by armor; useful only once the Engine tracks exploration time and movement |
| M9 | **GM-side threshold rolls**: an ability marked secret is rolled by the Engine, its card goes to the GM panel only, the outcome to the narrator; with situational percentage adjustments and failure bands (pick pockets noticed above twice the target) |

## Summary

152 rules with a status (8 descriptive rows and 3 pointer rows not counted). Counted with `awk` on the `status` column after writing.

| status | Parts 1-3 (`C-`) | other Parts (`X-`, [overlap]) | total |
|---|---|---|---|
| `impl+test` (implemented and tested) | 80 | 14 | **94** |
| `impl` (implemented, untested) | 1 | 0 | **1** |
| `sheet` (sheet data only) | 0 | 0 | **0** |
| `narrated` (text or the GM's hand only) | 18 | 0 | **18** |
| `absent` | 33 | 6 | **39** |
| total | 132 | 20 | **152** |

**Update, 20 November (rules-engine package R1, commits 6e081c9 … 8b126e0; recounted by script; before: 21 / 0 / 23 /
13 / 95).** Closed WRONG rows: C-SP-01 and C-CLS-11 (spells counted by the class's slots), X-SV-03 and C-CRE-11 (saves
pinned to the class table's number), C-THF-10 (sneak attack once per target, double damage), C-RACE-20 (halfling
initiative). Still WRONG: the six GM-secret thief rolls (C-CLS-18, C-CLS-19, C-THF-04, 06, 08, 09: M9, another package).
The level-1 and level-2 spells are data (C-SPL-10, C-SP-*: eight typed, the others descriptive, counted by slot); race
traits, save tables and target-side saves are in (C-RACE-*, X-SV-01/02/04). Each changed row carries «R1 <hash>».

**Update, 20 November (rules-engine package R2, commits 53870c7 … 9f197a8; recounted by script; before: 44 / 1 / 14 /
17 / 76).** The item catalog (M2) and load (M8) close these rows («R2 <hash>»): C-CRE-09, C-ABI-04, C-ABI-09 and C-ARM-01
(AC and damage from the gear, no longer typed), C-RACE-03, C-RACE-17, C-CLS-04, C-CLS-12, C-CLS-16, X-OPT-04 (restrictions
in play), C-EQ-01, C-EQ-02, C-EQ-04, C-EQ-06, C-EQ-11, C-WPN-01, C-WPN-02, C-WPN-04, C-WPN-06, C-CRE-06, X-ENC-01,
X-ENC-02; C-WPN-03 (silver) and C-EQ-05 (containers) are data the Engine does not read yet (`narrated`). torre-mozza's
four PCs carry catalog gear, and manuale-basic-fantasy.test.ts asserts they keep AC 17, 15, 15, 12 and their attack
lines. Still open here: creation (M7: starting money, the first purchase), thieves' tools (C-EQ-08), silver against
lycanthropes (P6-03), vehicles.

**Update, 21 November (rules-engine package R3, commits 2e9ad34 … 03d35ba; recounted by script; before: 66 / 1 / 9 / 19 /
57).** Progression (M1) and the Game Master's rolls (M9) close these rows («R3 <hash>»): the class tables of levels 1–20
(XP C-CLS-01/06/09/14, hit dice C-CLS-02/07/10/15 and C-HP-04, the thief's percentages C-THF-01, the attack bonus X-AB-01,
Turn Undead X-TU-01/02), the sheet's numbers derived from class and level (no `sheet` row is left: C-CRE-03, C-ABI-11 and
C-RACE-21 too), XP and the level-up (C-CRE-08, C-HP-03, C-RACE-24, X-ADV-01, X-OPT-06), and the six WRONG thief rows, now
the Game Master's secret rolls with situational points and a failure band (C-CLS-18, C-CLS-19, C-THF-04, 05, 06, 08, 09).
No WRONG row is left. Still open here: creation (M7: rolling the scores and the first hit die, race and class
requirements, combination classes C-RACE-26/27), the ability-roll target that falls with the level (X-OPT-05), the thief's
point allocation option (X-OPT-07), a monster's attack bonus by hit dice (its sheet's), spell acquisition (X-OPT-03).

12 rows were marked **WRONG** at the audit (six closed by R1, the six GM-secret thief rolls by R3: see the updates above): C-CRE-11, C-RACE-20, C-CLS-11, C-CLS-18, C-CLS-19, C-THF-04, C-THF-06, C-THF-08, C-THF-09, C-THF-10, C-SP-01, X-SV-03. They are six distinct
problems: spells not counted; saves off the table's target; the GM's secret thief rolls made public; no situational %
on thief rolls; sneak attack repeatable; halfling +1 initiative missing.

What is implemented is the **roll itself**: d20 + bonus against a target or AC, the naturals, the score → bonus table,
d100 and «x in 6» thresholds, STR/DEX to the attack by weapon kind, minimum damage 1, range ±, initiative 1d6 + DEX,
HP that attacks lower. What is missing is everything that **feeds** the roll with the manual's numbers (class and level
tables, races, equipment) and every **resource** the manual counts (spells per day, uses, money, weight, light, XP).
The sheets are right for torre-mozza's four level-1 PCs only because the Preparer did the arithmetic by hand.

**The 10 most important gaps for play at the table**, in order (frequency at a level-1 table; wrong outcomes first):

1. **Spells are not counted** (C-SP-01, C-CLS-11, C-SPL-01/02): the magic-user casts magic missile every round instead
   of once a day; nothing prepares, spends or refreshes a spell. → M3 (resources with a refresh), M1.
2. **Spells other than damage do nothing** (C-SP-02 … C-SP-18, C-SPL-10): sleep, charm person, shield, light, hold
   person, bless, web… are only what the narrator decides; no NPC rolls a save against them (X-SV-04). Sleep is the
   fight-ender of a level-1 party. → M4 (typed effects), M5 (target-side saves).
3. **Saves are not pinned to the table** (X-SV-03, C-CRE-11): a save is a check like any other, so the rules arbiter's
   signal words or the model arbiter can roll it against 13, 19 or 21, or add ±2; «17 − table number» is exact only at
   17. → M5.
4. **Thief rolls the GM must hide are public** (C-CLS-18, C-THF-04, 06, 08, 09, C-CLS-19, C-THF-05): Move Silently,
   Hide, Listen, Remove Traps are rolled by the player with a public card, so the table knows what the thief cannot;
   no situational % (the slimy wall), no «noticed» band on Pick Pockets. → M9.
5. **Sneak attack is repeatable and its double damage approximated** (C-THF-10): +4 every round on the same opponent
   (the manual: once per opponent per fight), 2d6 instead of 2 × 1d6. → M3 (once per target per fight); the set can
   already use a `modificatori` entry with `danno: doppio`.
6. **Turn Undead is not rolled** (X-TU-01, X-TU-02, C-CLS-05): the level-1 cleric's main power is text in
   `sottosistemi`, which no code reads. → M1 (the table), M4 (2d6 HD affected, flee 2d4 turns, D damage).
7. **No character creation phase** (C-CRE-01 … 08, C-ABI-02, C-RACE-02/08/16/23, X-OPT-01/02): no 3d6 in order, no race
   or class requirements, no HP roll, no starting money, no purchases; pregenerated sheets are never checked against the
   manual (`specie` and `classe` are free strings). → M7 (+ M1, M2).
8. **Healing exists only in the GM's hand** (C-HP-01, C-SP-09, C-SP-19, C-HP-05): HP fall by attacks and rise only
   when the GM types them on the panel; no cure spell or potion effect, and a new session starts everyone at full HP
   (the manual implies wounds carry over).
   (Natural rest, 1 HP a night, is the play half's row.) → M4, M3.
9. **No equipment model** (C-EQ-*, C-WPN-*, C-ARM-01, X-ENC-01/02): AC, weapon dice and STR damage are typed by hand
   on each sheet; no catalog, prices, money, weight, encumbrance, movement, light duration, or class/race weapon and
   armor restrictions (cleric blunt only, magic-user no armor, dwarf/halfling no Large). → M2, M8.
10. **Race and class traits that change rolls are missing** (C-RACE-11/12/13/19/20, C-ABI-07): halfling +1 initiative
    (a WRONG point every round), elf −1 in 6 surprise, halfling AC +2 against large creatures, elf ghoul immunity and
    passive secret-door chance, Wisdom against magic. → M6.

Next after these: **level progression** (C-CLS-01/06/09/14, C-HP-03/04, X-AB-01, X-SV-01/02, C-THF-01, X-OPT-05):
no XP, no level-up, so every table above level 1 is absent. It matters only for campaigns longer than one session,
which the framework does not prepare yet (`python3 strumenti/strati.py --tabella`: «arco (2–6 sessioni) — non ancora supportato»). → M1.

## Answers to the six questions

**(1) Does a character creation phase exist?** No. Nothing in `apps/server/src`, `packages/shared` or `strumenti`
rolls ability scores, checks race or class requirements, rolls HP or starting money, or buys equipment (grep for
creation, 3d6, money, equipment, inventory: no hit outside unrelated words). PCs are pregenerated by the Preparer skill
(`.claude/skills/preparatore/SKILL.md:141`: «`scheda` in `pg.yaml`, at level 1 or 2»). The sheet of a non-SRD set holds
only `caratteristiche`, `abilita`, `pf`, `difesa`, `armatura`, `attacchi` (RS:21-57); `specie`, `classe`, `livello`
are free strings shown on the phone (`campagna/caricatore.ts:403-411`). The validator checks shape only (VS: all and
only the set's characteristics, integers, a score not below the table's first row, thresholds within their die,
pf > 0). torre-mozza's four PCs were checked by hand here: scores inside the racial limits, prime requisites ≥ 9, AC,
saves, thief %, x-in-6, attack bonus and damage all match the manual; HP take the die's maximum (a brief decision,
`pg.yaml` header), where the manual rolls it.

**(2) Are hit points tracked and changed by damage and healing everywhere?** Tracked, yes; everywhere, no. `StatoProve`
keeps current HP against the sheet's maximum (ST:42-125), saves them in the session snapshot (ST:141-151) and shows
them on the phone. They change only through: an attack's damage (RR:319; the SRD path `prove/risolutore.ts:462`), the
GM's panel (`pf` command, GM → MO:932-940), and the SRD's natural 20 on a death save (CB:531, off in Basic Fantasy).
Not through: cure spells or potions (C-SP-09, C-SP-19), natural rest (1 HP a night, set `sottosistemi guarigione`, text
only), falls, traps, fireballs or any other non-attack damage (no damage path outside attacks), nor between sessions
(ST:55-59 starts each session at full HP; `strumenti/tra_sessioni.py` does not carry them; the manual implies they carry).

**(3) Are spell slots tracked and consumed?** No. There is no counter of spells, slots or uses per day anywhere in the
Engine, the state or the snapshot. The only spell in play, magic missile, is a sheet attack with `automatico: true`
(RR:351-360) that can be used every round; the set says so itself («Una volta al giorno: il Motore non lo conta, lo dice
la scheda»). The spells-per-day rule lives in set `sottosistemi`, which `regole/caricatore.ts:215` loads and no code
reads, and in `riassunto.md` for the players.

**(4) Are weapons and armor read from data?** Only as numbers typed on each sheet. A weapon is a sheet line `{nome,
danno, abilita | caratteristica, distanza, automatico}`: the Engine rolls that die (with the STR bonus already written
into it) and uses the line's ability for the to-hit (RR:313-378). There is no weapon catalog: no size, hands, range in
feet, weight, cost, silver, or rate of fire; range bands exist only as the words «da vicino» +1, «da lontano» −2 (PM).
Armor: the sheet's `difesa` is the AC, written by hand (RS:56); a non-SRD set has no armor table, while the SRD path
computes AC from one (SRD). `armatura` (damage reduction) exists for other sets, not used by Basic Fantasy.

**(5) Is weight or encumbrance tracked, and does it change movement?** No. No weight on anything, no inventory (the
only tracked objects are scene items with an `ogg_` id and their holder, `scena/oggetti.ts`), no money, and no movement
rate at all: «The Engine knows no positions» (docs/regole.md:106); `combattimento.azioni movimento` is text. The
carrying-capacity and movement tables (X-ENC-01, X-ENC-02) have nothing to act on.

**(6) How are roll scores computed, and do they match the manual's tables?** A check or attack rolls d20 + (the table
bonus of its characteristic, RS:81-92) + (the sheet's bonus for the ability: attack bonus, save bonus, sneak attack +4;
RR:251-279) + (the set's situational modifiers by words: +2 from behind, +2 charge with a spear, +1 short range, −2
long range; PM) + (the arbiter's advantage ±2, or help) against the difficulty (13/17/19/21) or the target's AC
(`difesa`); naturals 20 and 1 on attacks and saves (RI:59-61). Thief abilities and x-in-6 chances roll d100 or d6 ≤
the sheet's value, with no difficulty or advantage (RR:234-243). Initiative is 1d6 + the DEX table bonus each round
(MO:761-774). Damage is the sheet's formula, minimum 1 (RR:318). Against the tables: the ability modifier table is
exact and lives in the set; the attack bonus (+1), the saves (17 − number + race), the thief percentages, the
secret-door and stuck-door chances (with INT 15+ and the STR bonus) are right for torre-mozza's level-1 PCs, but they
are hand-written sheet numbers, never derived from a class or level; above level 1 nothing exists. Departures:
saves at a difficulty other than 17 or with ±2 (X-SV-03); ability rolls stay at target 17 whatever the level
(X-OPT-05); no GM % adjustment on thief rolls (C-CLS-19); halfling +1 initiative missing (C-RACE-20); Wisdom against
magic missing (C-ABI-07); sneak attack double damage written as 2d6 (C-THF-10).

## Part 1: Introduction (p. 1-2)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-INT-01 | What is This?, RPG, What Do I Need, p. 1-2 | what an RPG is; players, GM, PCs, NPCs; pencil, dice, graph paper, modules | desc | — | — | desc | — |
| C-INT-02 | Using the Dice, p. 2 | d20: roll, add modifiers; total ≥ target number succeeds | mech | set `risoluzione: {tipo: d20_cd, dado: 20}`; RI:48 | tPR:156, tR:114, L6 | impl+test | — |
| C-INT-03 | Using the Dice, p. 2 | d10 reads 0 as 10; d% = two d10 (tens declared first), 00 = 100; a d% roll succeeds when ≤ target (thief 30%: 01-30) | mech | set `abilita[].soglia: {dado: 100}`; RR:234-243, 262-264 | tRM:270, L6 | impl+test | — |
| C-INT-04 | Using the Dice, p. 2 | d4, d6, d8, d12; XdY means roll X dice and add; XdY+Z adds Z | mech | `leggiFormula` (campagna/regole-srd.ts), sheet `attacchi[].danno` | tPR:40 | impl+test | — |

## Part 2: Player characters (p. 3-14)

### How to Create a Player Character (p. 3)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-CRE-01 | How to Create, p. 3 | roll 3d6 for each ability, in order; write them down as rolled | proc | none: the Preparer writes the scores (pg) | none | absent | no creation phase → M7 |
| C-CRE-02 | How to Create, p. 3 | if unhappy, the GM may allow some point or score exchanging (options: X-OPT-01) | proc | none | none | absent | M7 |
| C-CRE-03 | How to Create, p. 3 | roll the class hit die + CON bonus; a CON penalty never lowers a die below 1 | mech | level 1: the sheet's `pf` (the Preparer's roll), checked by the validator against the class die with CON and at least 1 (regole_progressione.py `limiti_pf`); each level after: prove/livelli.ts, rolled by the player | progressione.test.ts; test_valida_progressione.py; livelli.test.ts | impl+test | the level-1 roll itself is M7 [R3 2e9ad34, R3 6d43ab4] |
| C-CRE-04 | How to Create, p. 3 | starting money: generally 3d6 × 10 gp, ask the GM | mech | none | none | absent | M7, M3 (purse) |
| C-CRE-05 | How to Create, p. 3 | choose race and class: meet the class's Prime Requisite minimum and the race's minimum and maximum scores | mech | `specie`, `classe` are free strings in pg, shown on the phone (`campagna/caricatore.ts:403-411`), never checked | none | absent | M7 (validator checks the requirements) |
| C-CRE-06 | How to Create, p. 3 | buy equipment from the price list, note the money left; respect class and race weapon and armor restrictions | proc | in play: buying from the catalog with change (panel command `inventario`, prove/inventario.ts); restrictions checked by the validator on the sheet and by the Engine when worn or used [R2 c950977] | inventario.test.ts; test_valida_catalogo.py | impl+test | No creation step buys the first kit (M7): the Preparer writes it |
| C-CRE-07 | How to Create, p. 3 | write the race and class special abilities; a Magic-User's spells are decided by the GM, who may let the player choose | proc | pg `cosa_sai_fare` (text) and the abilities on the sheet | none | narrated | M7, M3 |
| C-CRE-08 | How to Create, p. 3 | XP start at 0; note the XP needed for 2nd level | mech | sheet `px` (0 for torre-mozza's PCs), class `px` rows; the panel shows the next level's XP (prove/esperienza.ts) | manuale-basic-fantasy.test.ts; esperienza.test.ts | impl+test | — [R3 8c1bc82, R3 33d96b6] |
| C-CRE-09 | How to Create, p. 3 | Armor Class from the armor worn + DEX bonus | mech | computed from the worn armor and shield of the sheet's `equipaggiamento` and the `catalogo.difesa` characteristic (regole/equipaggiamento.ts difesaDa), again at every change of gear (prove/inventario.ts) [R2 c950977] | catalogo.test.ts «worn armor + Dexterity + shield…»; manuale-basic-fantasy.test.ts «the four pregenerated PCs keep their AC…» (17, 15, 15, 12) | impl+test | — |
| C-CRE-10 | How to Create, p. 3 | attack bonus from the table (X-AB-01), without ability bonuses: STR is added in melee, DEX with missiles | mech | sheet `abilita: {mischia, distanza}` = the bonus; set `abilita[].caratteristica: forza / destrezza`; RR:270-273 adds the table bonus of the ability | tRM:201, L6b («Spada lunga (1d20 +3)» = 1 + STR 2) | impl+test | the table itself: X-AB-01 |
| C-CRE-11 | How to Create, p. 3 | saving throws from the class table (X-SV-01), adjusted by race; race bonuses are added to the roll or subtracted from the target | mech | the set's `tiri_salvezza` and `classi[].tiri_salvezza` (p. 61) give the number for the sheet's `classe`/`livello`; the race's traits add to the roll (regole/salvezze.ts, regole/tratti.ts); the sheets no longer write `ts_*` (strict warning if they do) [R1 6d6f2da, R1 ac34723] | salvezze.test.ts; manuale-basic-fantasy.test.ts | impl+test | — |
| C-CRE-12 | How to Create, p. 3 | name the character | desc | pg `nome` | — | desc | — |

### Character Abilities, Hit Points, Languages (p. 4)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-ABI-01 | Character Abilities, p. 4 | scores 3-18; bonus 3: −3, 4-5: −2, 6-8: −1, 9-12: 0, 13-15: +1, 16-17: +2, 18: +3 | mech | set `modificatore: {tipo: tabella}` with exactly these rows; RS:81-92; VS:359-362 warns a score below the first row | tRM:201, tVR:136, L6 | impl+test | no upper bound (a 19 gives +3 silently) |
| C-ABI-02 | Character Abilities, p. 4, 7-8 | Prime Requisite ≥ 9 to join a class: Cleric WIS, Fighter STR, Magic-User INT, Thief DEX | mech | none (`classe` is a free string) | none | absent | M7, M1 |
| C-ABI-03 | Strength, p. 4 | STR bonus to all melee attack rolls | mech | set `abilita mischia` (and `alle_spalle`) with `caratteristica: forza`; RR:270-273 | tRM:201, L6b | impl+test | — |
| C-ABI-04 | Strength, p. 4 | STR bonus to melee damage (and thrown weapons, sling, p. 55) | mech | `catalogo.danno_caratteristica: forza`: the Engine adds the table bonus to melee and thrown lines and to missile lines with `forza_al_danno` (the sling), never to a bow (regole/equipaggiamento.ts) [R2 c950977] | catalogo.test.ts «melee lines add Strength to damage, a bow does not, a sling does…»; manuale-basic-fantasy.test.ts (Livia 1d8+2, Fulco's sling 1d4+1) | impl+test | — |
| C-ABI-05 | Strength, p. 4 | a STR penalty never lowers the damage of a hit below 1 | mech | set `attacchi.danno_minimo: 1`; RR:318 | tRM:173 | impl+test | — |
| C-ABI-06 | Intelligence, p. 4 | INT bonus = extra languages read and written; with an INT penalty the character reads at most a word or two and knows only the native language | mech | none | none | absent | M7 (languages on the sheet) |
| C-ABI-07 | Wisdom, p. 4 | WIS bonus may apply to some saves against magic, especially those against the will | mech | set ability `ts_charme` (column incantesimi, Wisdom), used by the charm person power's save (torre-mozza) [R1 ac34723] | manuale-basic-fantasy.test.ts «race traits (pp. 5–6) and the exceptions of p. 60» | impl+test | other «saves against the will» are the arbiter's choice of `ts_charme` |
| C-ABI-08 | Dexterity, p. 4 | DEX bonus to all missile attack rolls | mech | set `abilita distanza` with `caratteristica: destrezza`; RR:270-273 | tRM:201, L6b («Fionda (1d20 +4)») | impl+test | — |
| C-ABI-09 | Dexterity, p. 4 | DEX bonus to Armor Class | mech | `catalogo.difesa.caratteristica: destrezza`, added to the armor's AC (capped by `max_caratteristica` where a set has one) [R2 c950977] | catalogo.test.ts; manuale-basic-fantasy.test.ts (Fulco −1, Nespola +2) | impl+test | — |
| C-ABI-10 | Dexterity, p. 4 | DEX bonus to the Initiative roll | mech | set `combattimento.iniziativa: {dado: 6, caratteristica: destrezza}`; MO:761-774, CB:213, 294 | tRM:224, L6, L6b | impl+test | — |
| C-ABI-11 | Constitution, p. 4 | CON bonus to each hit die; a penalty never makes a die less than 1 | mech | set `progressione.punti_ferita: {caratteristica: costituzione, minimo: 1}`: each level-up die (prove/livelli.ts); the validator's bounds for the sheet's `pf` | livelli.test.ts (a die of 1 with +0 gives 1); progressione.test.ts | impl+test | the level-1 die: M7 [R3 6d43ab4] |
| C-ABI-12 | Charisma, p. 4 | CHA bonus to reaction rolls | mech | set `sociale.caratteristica: carisma`: a d20 + CHA check against 13/17/19 instead of the 2d6 reaction table (the play half covers p. 50) | L6 («Carisma vs 17/19») | impl+test | the 2d6 table itself is the play half's row |
| C-ABI-13 | Charisma, p. 4 | CHA affects the number of retainers and their loyalty | mech | none | none | absent | retainers are the play half's rows (p. 46) |
| C-HP-01 | Hit Points and Hit Dice, p. 4 | damage lowers the current total, not the rolled maximum; healing restores up to the maximum, never beyond | mech | ST:109-125 (`danneggia` floors at 0, `cura` caps at the maximum); the phone shows them (`apps/web/src/telefono/PuntiFeritaPg.tsx`) | tPR:189 | impl+test | also typed effects since R1 6e081c9 (traps, falls, healing, rest): question 2 |
| C-HP-02 | Hit Points and Hit Dice, p. 4 | at 0 HP the character may be dead (optional rules p. 188) | mech | set `combattimento.danni.a_zero: {pg: tiri_morte, png: morte}`; CB:519-531 | tCB:303, L6, L6b | impl+test | the PC's own save and the 2d10 dying window since R1 8b126e0 (the play half's P8-14) |
| C-HP-03 | Hit Points and Hit Dice, p. 4 | each level: roll another hit die + CON (minimum 1), add it to the maximum | mech | the level-up between sessions: `tra_sessioni.py pacchetto` writes `livello` and `pf_da_tirare`, the player rolls the die at the first window (prove/livelli.ts) | livelli.test.ts; test_tra_sessioni.py; live run regole-r3 | impl+test | — [R3 6d43ab4] |
| C-HP-04 | Hit Points and Hit Dice, p. 4 | after 9th level a fixed number of HP per level, without CON | mech | class `dadi_vita: [{da: 1, dado}, {da: 10, fissi: n}]` (regole/progressione.ts) | progressione.test.ts; manuale-basic-fantasy.test.ts | impl+test | — [R3 8c1bc82, R3 6d43ab4] |
| C-HP-05 | How to Create p. 3, HP p. 4 (implied) | implied, not stated: statistics change in play («use a pencil») and healing restores the current total, so a session starts with the HP the last one ended with | mech | ST:55-59 resets every sheet to full HP when the session's state is built; only the snapshot of the same session resumes them (ST:141-151); `strumenti/tra_sessioni.py` carries clocks and NPC knowledge, not HP | none | absent | matters for a campaign of several sessions → M3 (resources carried between sessions) |
| C-LANG-01 | Languages, p. 4 | everyone knows the native language; non-humans know their own and Common; INT 13+ adds languages equal to the INT bonus (Orc, Goblin…, GM's choice); slots may stay open; exotic or dead languages at the GM's choice | mech | none (a PC's languages can appear only in `cosa_sai_fare`) | none | absent | M7 (languages on the sheet); reading a text in a language then gates on the sheet |

### Character Races (p. 5-6)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-RACE-01 | Dwarves, p. 5 | description: about 4 ft, 120 lb, beards, 300-400 years | desc | pg `aspetto` | — | desc | — |
| C-RACE-02 | Dwarves, p. 5 | classes Cleric, Fighter, Thief; CON ≥ 9; CHA ≤ 17 | mech | none | none | absent | M7 |
| C-RACE-03 | Dwarves, p. 5 | no Large weapons longer than 4 ft (two-handed sword, polearms, longbow) | mech | `catalogo.restrizioni: {razza: nano, cosa: arma, vietati: [spadone, arma_in_asta, arco_lungo], penalita: {vietato: true}}`: no attack line, the validator rejects a sheet that starts with one [R2 c950977] | catalogo.test.ts «…a small one cannot wield a great sword»; test_valida_catalogo.py «vietato a «piccolo»»; manuale-basic-fantasy.test.ts (restrictions) | impl+test | The p. 187 option (−5 instead of forbidden) is not the set's choice |
| C-RACE-04 | Dwarves, p. 5 | Darkvision 60' | mech | pg `cosa_sai_fare` text; light and darkness are not modelled (the play half's p. 43) | none | narrated | M6 |
| C-RACE-05 | Dwarves, p. 5 | detect slanting passages, stonework traps, shifting walls, new construction on 1-2 on 1d6, only after a search | mech | set `abilita pietra: {soglia: {dado: 6}}`, sheet `pietra: 2`; RR:262-264 (the search is the arbiter's call, by keyword) | tRM:270 (mechanism) | impl+test | — |
| C-RACE-06 | Dwarves, p. 5 | saves +4 against Death Ray or Poison, Magic Wands, Paralysis or Petrify, Spells; +3 against Dragon Breath | mech | race trait `{tiro: salvezza, colonne: […], bonus: n}` (torre-mozza `razze.nano`), added to the class table's save; the sheet no longer writes `ts_*` [R1 ac34723] | manuale-basic-fantasy.test.ts «race traits (pp. 5–6)…», «the four pregenerated PCs save as they did before…» | impl+test | — |
| C-RACE-07 | Elves, p. 5 | description: about 5 ft, 130 lb, a dozen centuries | desc | pg `aspetto` | — | desc | — |
| C-RACE-08 | Elves, p. 5 | classes Cleric, Fighter, Magic-User, Thief, and the combinations Fighter/Magic-User and Magic-User/Thief; INT ≥ 9; CON ≤ 17; never roll larger than d6 for HP | mech | none | none | absent | M7, M1 R3: the d6 cap is the trait `dado_vita_massimo` (2e9ad34, 8c1bc82); classes and requirements stay M7. |
| C-RACE-09 | Elves, p. 5 | Darkvision 60' | mech | pg text | none | narrated | M6 |
| C-RACE-10 | Elves, p. 5, 44 | find secret doors on 1-2 on 1d6 when searching (1-3 with INT 15+, p. 44), against the usual 1 | mech | set `abilita cercare: {soglia: {dado: 6, predefinita: 1}}`, sheet `cercare: 3` (Eliandro, INT 16: correct); RR:262-264 | tRM:270, L6 («Cercare» 1 or 3 in 6) | impl+test | — |
| C-RACE-11 | Elves, p. 5 | a cursory look finds a secret door on 1 on 1d6, without searching | mech | none | none | absent | M6 (a passive roll by the Engine when an elf enters a scene with a secret door) |
| C-RACE-12 | Elves, p. 5 | immune to the paralysing attack of ghouls | mech | race trait `{immune: [paralisi_ghoul]}` (torre-mozza `razze.elfo`): a power or condition with that id never takes (prove/attivi.ts, prove/poteri.ts) [R1 ac34723] | tratti.test.ts «an immunity of the race…» (the mechanism) | impl | the ghoul's paralysing touch is a monster special (not data yet) |
| C-RACE-13 | Elves, p. 5 | the chance of being surprised drops by 1 in 1d6 | mech | race trait `{sorpresa: -1}` (torre-mozza `razze.elfo`): the side's surprise die is read against each member's range, so an elf is surprised only on 1 (prove/combattimento.ts, `sorpresaMod`) [R1 ac34723] | tratti.test.ts «surprise per creature: the side's die against each member's own range» | impl+test | — |
| C-RACE-14 | Elves, p. 5 | saves +1 against Paralysis or Petrify, +2 against Magic Wands and Spells | mech | race trait `{tiro: salvezza, colonne: […], bonus: n}` (torre-mozza `razze.elfo`), added to the class table's save; the sheet no longer writes `ts_*` [R1 ac34723] | manuale-basic-fantasy.test.ts «race traits (pp. 5–6)…», «the four pregenerated PCs save as they did before…» | impl+test | — |
| C-RACE-15 | Halflings, p. 6 | description: about 3 ft, 60 lb, barefoot, about 100 years | desc | pg `aspetto` | — | desc | — |
| C-RACE-16 | Halflings, p. 6 | classes Cleric, Fighter, Thief; DEX ≥ 9; STR ≤ 17; never roll larger than d6 for HP | mech | none | none | absent | M7, M1 R3: the d6 cap is the trait `dado_vita_massimo` (2e9ad34, 8c1bc82); classes and requirements stay M7. |
| C-RACE-17 | Halflings, p. 6 | no Large weapons; Medium weapons in both hands | mech | `catalogo.restrizioni: {razza: halfling, cosa: arma, vietati_taglie: [L], penalita: {vietato: true}}` [R2 c950977] | catalogo.test.ts; manuale-basic-fantasy.test.ts | impl+test | «Medium weapons in both hands» is not modelled (hands are data, `mani`, with no effect yet) |
| C-RACE-18 | Halflings, p. 6 | +1 attack bonus with every ranged weapon | mech | race trait `{tiro: abilita, abilita: [distanza], bonus: 1}`; Nespola's `distanza` back to the class's +1 (regole/tratti.ts, risolutore-regole.ts cheCosa) [R1 ac34723] | tratti.test.ts «a missile attack and a save get the trait; melee does not»; manuale-basic-fantasy.test.ts | impl+test | — |
| C-RACE-19 | Halflings, p. 6 | +2 to Armor Class when attacked in melee by creatures larger than man-sized | mech | none (no creature size) | none | absent | M6 |
| C-RACE-20 | Halflings, p. 6 | +1 to the Initiative roll | mech | race trait `{tiro: iniziativa, bonus: 1}` (torre-mozza `razze.halfling`, Nespola `razza: halfling`), added to the initiative with Dexterity (regole/tratti.ts, prove/motore.ts candidati) [R1 ac34723] | tratti.test.ts «initiative: the folletto adds its +1 to Dexterity…»; manuale-basic-fantasy.test.ts | impl+test | — |
| C-RACE-21 | Halflings, p. 6 | hiding while still: detected only 10% in preferred forest, 30% indoors or elsewhere; a halfling thief rolls once, the better of the two | mech | race trait `{almeno: {nascondersi: 70}}`: the better of it and the thief's table; the 90% in the forest by the Game Master's points (a rung's `percentuale`, a scene check's `aggiustamento`) | progressione.test.ts; manuale-basic-fantasy.test.ts (Nespola 70) | impl+test | — [R3 8c1bc82, R3 cd82d1e] |
| C-RACE-22 | Halflings, p. 6 | saves +4 against Death Ray or Poison, Wands, Paralysis or Petrify, Spells; +3 against Dragon Breath | mech | race trait `{tiro: salvezza, colonne: […], bonus: n}` (torre-mozza `razze.halfling`), added to the class table's save; the sheet no longer writes `ts_*` [R1 ac34723] | manuale-basic-fantasy.test.ts «race traits (pp. 5–6)…», «the four pregenerated PCs save as they did before…» | impl+test | — |
| C-RACE-23 | Humans, p. 6 | description; any single class, no minimum or maximum scores | mech | none (nothing is checked for any race) | none | absent | M7 |
| C-RACE-24 | Humans, p. 6 | +10% to all XP earned | mech | race trait `{tiro: esperienza, bonus: 10}`, added to each share (prove/esperienza.ts) | esperienza.test.ts; manuale-basic-fantasy.test.ts | impl+test | — [R3 8c1bc82, R3 33d96b6] |
| C-RACE-25 | Humans, p. 6 | no saving throw bonus | mech | race `umano` with no traits: the class table's number alone (torre-mozza) [R1 ac34723] | manuale-basic-fantasy.test.ts «the four pregenerated PCs…» | impl+test | — |
| C-RACE-26 | Combination Classes, p. 6 | requirements of both classes; best attack bonus and best saves of the two; XP to advance = the sum of both classes'; only elves | mech | none | none | absent | M1 |
| C-RACE-27 | Combination Classes, p. 6 | Fighter/Magic-User casts in armor, d6 for HP; Magic-User/Thief casts in leather armor, d4 for HP | mech | none | none | absent | M1, M2 |

### Character Classes (p. 7-9)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-CLS-01 | Cleric, p. 7 | XP per level: 0; 1,500; 3,000; 6,000; 12,000; 24,000; 48,000; 90,000; 180,000; 270,000; then +90,000 a level to 1,170,000 at 20th | mech | `classi.chierico.px`, levels 1–20 (p. 7) | manuale-basic-fantasy.test.ts | impl+test | — [R3 8c1bc82] |
| C-CLS-02 | Cleric, p. 7 | hit dice 1d6 a level to 9d6 at 9th, then +1 HP a level (9d6+1 … 9d6+11 at 20th) | mech | `classi.chierico.dadi_vita` (1d6, from 10 +1 fixed); level 1 the sheet's `pf`, within the dice's bounds | manuale-basic-fantasy.test.ts; livelli.test.ts | impl+test | — [R3 8c1bc82, R3 6d43ab4] |
| C-CLS-03 | Cleric, p. 7 | spells per day by level (spell levels 1-6): 1st none; 2nd 1; 3rd 2; 4th 2/1; 5th 2/2; 6th 2/2/1; 7th 3/2/2; 8th 3/2/2/1; 9th 3/3/2/2; 10th 3/3/2/2/1; 11th 4/3/3/2/2; 12th 4/4/3/2/2/1; 13th 4/4/3/3/2/2; 14th 4/4/4/3/2/2; 15th 4/4/4/3/3/2; 16th 5/4/4/3/3/2; 17th 5/5/4/3/3/2; 18th 5/5/4/4/3/3; 19th 6/5/4/4/3/3; 20th 6/5/5/4/3/3 | mech | set `classi[chierico].incantesimi_al_giorno`, all 20 rows (torre-mozza regole.yaml); Fulco, level 1, has no slot [R1 96eff8b] | poteri.test.ts (a level-2 cleric's one slot on the fixture) | impl+test | — |
| C-CLS-04 | Cleric, p. 7, 187 | any armor; only blunt weapons (warhammer, mace, maul, club, quarterstaff, sling); an edged weapon costs spells and Turning until an atonement quest (X-OPT-04) | mech | `{classe: chierico, cosa: arma, ammessi_proprieta: [contundente], penalita: {perde_incantesimi: true}}`: an attack with an edged weapon empties the day's spells, said on the card (prove/risolutore-regole.ts) [R2 c950977] | manuale-basic-fantasy.test.ts (restrictions); the mechanism in catalogo.test.ts | impl+test | Turning is not lost (no Turn Undead yet), and the spells come back at the next rest instead of after the atonement quest (the Game Master's story) |
| C-CLS-05 | Cleric, p. 7 | Turn the Undead (table and procedure: X-TU-01, X-TU-02) | mech | see X-TU-01 | — | ptr | — |
| C-CLS-06 | Fighter, p. 7 | XP per level: 0; 2,000; 4,000; 8,000; 16,000; 32,000; 64,000; 120,000; 240,000; 360,000; then +120,000 a level to 1,560,000 at 20th | mech | `classi.guerriero.px`, levels 1–20 (p. 7) | manuale-basic-fantasy.test.ts | impl+test | — [R3 8c1bc82] |
| C-CLS-07 | Fighter, p. 7 | hit dice 1d8 a level to 9d8, then +2 HP a level (9d8+2 … 9d8+22) | mech | `classi.guerriero.dadi_vita` (1d8, from 10 +2 fixed); level 1 the sheet's `pf`, within the dice's bounds | manuale-basic-fantasy.test.ts; livelli.test.ts | impl+test | — [R3 8c1bc82, R3 6d43ab4] |
| C-CLS-08 | Fighter, p. 7 | any armor, any weapon | mech | nothing to enforce (no restriction exists for anyone) | — | desc | — |
| C-CLS-09 | Magic-User, p. 8 | XP per level: 0; 2,500; 5,000; 10,000; 20,000; 40,000; 80,000; 150,000; 300,000; 450,000; then +150,000 a level to 1,950,000 at 20th | mech | `classi.mago.px`, levels 1–20 (p. 8) | manuale-basic-fantasy.test.ts | impl+test | — [R3 8c1bc82] |
| C-CLS-10 | Magic-User, p. 8 | hit dice 1d4 a level to 9d4, then +1 HP a level (9d4+1 … 9d4+11) | mech | `classi.mago.dadi_vita` (1d4, from 10 +1 fixed); level 1 the sheet's `pf`, within the dice's bounds | manuale-basic-fantasy.test.ts; livelli.test.ts | impl+test | — [R3 8c1bc82, R3 6d43ab4] |
| C-CLS-11 | Magic-User, p. 8 | spells per day by level: 1st 1; 2nd 2; 3rd 2/1; 4th 2/2; 5th 2/2/1; 6th 3/2/2; 7th 3/2/2/1; 8th 3/3/2/2; 9th 3/3/2/2/1; 10th 4/3/3/2/2; 11th 4/4/3/2/2/1; 12th 4/4/3/3/2/2; 13th 4/4/4/3/2/2; 14th 4/4/4/3/3/2; 15th 5/4/4/3/3/2; 16th 5/5/4/3/3/2; 17th 5/5/4/4/3/3; 18th 6/5/4/4/3/3; 19th 6/5/5/4/3/3; 20th 6/5/5/4/4/3 | mech | set `classi[mago].incantesimi_al_giorno`, all 20 rows (torre-mozza regole.yaml); the sheet's `classe`/`livello` pick the row, prove/risorse.ts counts the slots, a cast spends one, a rest gives them back [R1 96eff8b] | poteri.test.ts (slots by the class table, spent, refused, refreshed) | impl+test | — |
| C-CLS-12 | Magic-User, p. 8, 187 | weapons: dagger and walking staff (cudgel) only; no armor, no shield; other weapons −5 to hit; in armor no spell works and the spell is lost (X-OPT-04) | mech | `{classe: mago, cosa: arma, ammessi: [pugnale, pugnale_argento, randello], penalita: {attacco: -5}}` on the card; `{cosa: armatura|scudo, ammessi: [], penalita: {senza_incantesimi: perso}}`: in armor a cast fails and the spell is lost (prove/poteri.ts) [R2 c950977] | inventario.test.ts «a magic-user in armor cannot cast…», «…a weapon that is not a magic-user's takes −4»; manuale-basic-fantasy.test.ts | impl+test | — |
| C-CLS-13 | Magic-User, p. 8 | starts knowing read magic and one 1st-level spell, written in a spellbook from the master; the GM rolls, assigns or lets the player choose | proc | pg `cosa_sai_fare` (text) | none | narrated | M3, M7 |
| C-CLS-14 | Thief, p. 8 | XP per level: 0; 1,250; 2,500; 5,000; 10,000; 20,000; 40,000; 75,000; 150,000; 225,000; then +75,000 a level to 975,000 at 20th | mech | `classi.ladro.px`, levels 1–20 (p. 8) | manuale-basic-fantasy.test.ts | impl+test | — [R3 8c1bc82] |
| C-CLS-15 | Thief, p. 8 | hit dice 1d4 a level to 9d4, then +2 HP a level (9d4+2 … 9d4+22) | mech | `classi.ladro.dadi_vita` (1d4, from 10 +2 fixed); level 1 the sheet's `pf`, within the dice's bounds | manuale-basic-fantasy.test.ts; livelli.test.ts | impl+test | — [R3 8c1bc82, R3 6d43ab4] |
| C-CLS-16 | Thief, p. 8, 187 | any weapon; no metal armor, no shield, leather is fine; heavier armor disables every thief ability, the Sneak Attack too | mech | `{classe: ladro, cosa: armatura, ammessi_categorie: [cuoio]}` and `{cosa: scudo, ammessi: []}` with `senza_abilita` (the seven thief abilities and the sneak attack): a check of one is refused, the sneak attack becomes an ordinary attack [R2 c950977] | inventario.test.ts «a thief puts on chain mail… its thief abilities are refused in it»; catalogo.test.ts | impl+test | — |
| C-CLS-17 | Thief, p. 8 | a thief ability usually takes one turn (10 minutes) | proc | none (no game time) | none | absent | M3 (time as a resource), the play half's time rows |
| C-CLS-18 | Thief, p. 8 | the GM may roll any thief ability on the player's behalf, to keep the uncertainty | proc | `abilita[].segreta` (niente / riuscita): the Engine rolls with its own dice even with manual rolls, the card only on the panel, the narrator told how the thief perceives a failure (prove/risolutore-regole.ts) | tiri-segreti.test.ts; live run regole-r3 (Tessa's listen) | impl+test | — [R3 cd82d1e] |
| C-CLS-19 | Thief, p. 8 | the GM may adjust by situational percentage points (e.g. −20% on a slimy wall) | mech | a difficulty rung's `percentuale` for d100 thresholds (torre-mozza: facile +20, difficile −20, ardua −40), a scene check's `aggiustamento` | tiri-segreti.test.ts | impl+test | — [R3 cd82d1e] |
| C-THF-01 | Thief Abilities, p. 9 | percentages by level, L1 → L20. Open Locks 25 +5 a level to 65 (L9), 68 +3 to 83 (L15), 84 +1 to 88. Remove Traps 20 +5 to 60, 63 +3 to 78, 79 +1 to 83. Pick Pockets 30 +5 to 70, 74 +4 to 94, 95 +1 to 99. Move Silently 25 +5 to 65, 68 +3 to 83, 85 +2 to 93. Climb Walls 80 +1 a level to 99. Hide 10 +5 to 50, 53 +3 to 68, 69 +1 to 73. Listen 30 +4 to 62, 65 +3 to 80, 83 +3 to 95 | mech | `classi.ladro.abilita` rows of levels 1–20, derived on the sheet by its level (regole/progressione.ts); the hand-typed percentages are gone from Nespola's sheet | manuale-basic-fantasy.test.ts; progressione.test.ts | impl+test | — [R3 8c1bc82] |
| C-THF-02 | Thief Abilities, p. 9, 2 | a thief ability succeeds on d% ≤ the percentage | mech | set `abilita[].soglia: {dado: 100}` for the seven abilities; RR:234-243, 262-264 | tRM:270, L6 («Muoversi in silenzio» 25%, «Scalare pareti» 80%) | impl+test | — |
| C-THF-03 | Open Locks, p. 9 | one try per lock; after a failure, not again until the thief gains a level | mech | none: the same lock can be rolled again next turn | none | absent | M3 (one attempt per target per level) |
| C-THF-04 | Remove Traps, p. 9 | rolled twice, to detect then to disarm; the GM rolls, the player learns only when the trap is tested | proc | `trappole` is `segreta: niente`: the Engine rolls it, the card stays on the panel, a failure is told as nothing found | tiri-segreti.test.ts | impl+test | — [R3 cd82d1e] |
| C-THF-05 | Pick Pockets, p. 9 | a failure is noticed by the victim (or an onlooker) when the roll is more than twice the target, or 00 | mech | `borseggiare.soglia.grave: {oltre_volte: 2, col_massimo: true}`: «Fallimento grave: la vittima, o chi guarda, se ne accorge» in the fact | tiri-segreti.test.ts | impl+test | — [R3 cd82d1e] |
| C-THF-06 | Move Silently, p. 9 | always rolled by the GM; the thief believes it worked; on a failure the opponents hear | proc | `muoversi_in_silenzio` is `segreta: riuscita`: the Engine rolls it, the thief believes it worked | tiri-segreti.test.ts | impl+test | — [R3 cd82d1e] |
| C-THF-07 | Climb Walls, p. 9 | rolled by the player; a failure falls from about halfway (falling damage p. 59); several rolls above 100 ft | mech | the roll: set `scalare` threshold (RR:262-264); the fall: set `sottosistemi cadute` text, scene `se_fallisce` | tRM:270, L6 (80%) | impl+test | the fall's damage is the play half's row (no damage path outside attacks → M4) |
| C-THF-08 | Hide, p. 9 | in a shadowed area, staying still; like Move Silently the GM rolls | proc | `nascondersi` is `segreta: riuscita` | tiri-segreti.test.ts | impl+test | — [R3 cd82d1e] |
| C-THF-09 | Listen, p. 9 | at a door or for distant sounds; the GM always rolls; a success means only that a noise could be heard; the party must be quiet | proc | `ascoltare` is `segreta: niente` | tiri-segreti.test.ts; live run regole-r3 | impl+test | — [R3 cd82d1e] |
| C-THF-10 | Sneak Attack, p. 9, 53 | behind an unaware opponent in melee: +4 to hit and double damage; not twice on the same opponent in one fight; any melee weapon or bare hands (subduing); with the flat of the blade +0 and normal subduing damage; does not combine with the +2 from behind | mech | set `abilita alle_spalle: {danno: doppio, una_volta_per_bersaglio: true, ripiego: mischia}`; the weapon line's own die («1d6»), doubled by the Engine (twice the roll); a second sneak attack on the same target in the fight rolls as an ordinary melee attack, said on the card; the fight's end gives it back (prove/risorse.ts, prove/risolutore-regole.ts); `da_dietro` still `non_con` it; the rules arbiter picks the weapon line the action names most fully [R1 96eff8b] | poteri.test.ts «double damage (twice the weapon's roll), once per target per fight; then an ordinary attack» | impl+test | The +4 stays the sheet's bonus; subduing damage is not modelled |

### Cost of Weapons and Equipment (p. 10-12)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-EQ-01 | Money, p. 10 | 1 pp = 5 gp; 1 gp = 10 sp; 1 ep = 5 sp; 1 sp = 10 cp | mech | `monete` (worth in copper: pp 500, gp 100, ep 50, sp 10, cp 1; prices in gp, sp, cp), the sheet's `monete`, the Engine's coins (prove/inventario.ts: buying with change, selling, coins found or paid; typed effect `monete`; panel command `inventario`) [R2 c950977] | inventario.test.ts «money: buying with change…»; manuale-basic-fantasy.test.ts «coins…» | impl+test | Starting money 3d6 × 10 is not rolled (creation, M7): torre-mozza's PCs carry what the Preparer wrote |
| C-EQ-02 | Money, p. 10 | a coin weighs 1/20 lb; ten coins fill a cubic inch | mech | `monete.peso: {quante: 20, peso: 1}`: the coins count in the load (prove/inventario.ts peso) [R2 2a28ec7] | manuale-basic-fantasy.test.ts «the four PCs: what they carry…»; inventario.test.ts «the weight of the gear and the coins…» | impl+test | The volume (ten coins to a cubic inch) is not modelled |
| C-EQ-03 | Money, p. 10 | first-level characters start with 3d6 × 10 gp, or what the GM chooses | mech | see C-CRE-04 | — | ptr | — |
| C-EQ-04 | Equipment, p. 10 | price and weight list (lb; * = ten weigh 1 lb; ** = not counted): backpack 4 gp *; belt pouch 1 gp *; bit and bridle 15 sp, 3; candles ×12 1 gp *; chalk 2 gp *; cloak 2 gp, 1; common outfit 4 gp, 1; glass bottle 1 gp *; grappling hook 2 gp, 4; holy symbol 25 gp *; holy water 10 gp *; horseshoes 1 gp, 10; ink 8 gp, ½; iron spikes ×12 1 gp, 1; ladder 10 ft 1 gp, 20; lantern 5 gp, 2; bullseye lantern 14 gp, 3; hooded lantern 8 gp, 2; manacles 6 gp, 4; map or scroll case 1 gp, ½; small metal mirror 7 gp *; oil flask 1 gp, 1; padlock 12 gp, 1; paper sheet 1 gp **; 10' pole 1 gp, 10; quill 1 sp **; quill knife 1 gp *; quiver or bolt case 1 gp, 1; dry rations one week 10 gp, 14; hemp rope 50 ft 1 gp, 5; silk rope 50 ft 10 gp, 2; large sack 1 gp *; small sack 5 sp *; pack saddle 5 gp, 15; riding saddle 10 gp, 35; saddlebags 4 gp, 7; spellbook 25 gp, 1; large tent 25 gp, 20; small tent 5 gp, 10; thieves' tools 25 gp, 1; tinderbox 3 gp, 1; torches ×6 1 gp, 1; whetstone 1 gp, 1; whistle 1 gp **; waterskin 1 gp, 2; winter blanket 1 gp, 3 | mech | `catalogo.attrezzatura`: the 46 items with price, weight and pack size (`confezione`), bought and carried in play [R2 c950977] | manuale-basic-fantasy.test.ts «gear: the 46 items of p. 10…»; inventario.test.ts «packs…» | impl+test | — |
| C-EQ-05 | Explanation of Equipment, p. 12 | containers: backpack 40 lb or 3 cu ft (halfling's 30 lb, 1½ cu ft, same price); large sack 40 lb, 4 cu ft; small sack 20 lb, 2 cu ft; saddlebags 10 lb, 1 cu ft; quiver or bolt case 20 missiles, matched to the ammunition's length; scroll case 10 sheets or one scroll of up to 7 spells | mech | containers carry their capacity as data (`capienza`: backpack 40, large sack 40, small sack 20, saddlebags 10) [R2 2a28ec7] | manuale-basic-fantasy.test.ts (data) | narrated | What goes in which container, the volume and the halfling's smaller backpack are not checked |
| C-EQ-06 | Explanation of Equipment, p. 12 | light: candle 5' radius (+5' dim), 3 turns per inch; lantern 30' (+20' dim), a flask of oil in 18+1d6 turns; hooded lantern can be hidden; bullseye lantern a 30' × 30' cone (+20' dim); torch 30' (+20' dim), 1d4+4 turns, sets flammables alight | mech | catalog `luce` for the torch and the three lanterns (oil as `consuma`), burning on the game clock (prove/luci.ts) [R2 7350b48] | tempo.test.ts «light sources on the clock» | impl+test | Candles: no duration (3 turns per inch of a height the list does not give); the bullseye's cone and the hooded lantern's shutter are not modelled; setting things alight is narrated |
| C-EQ-07 | Explanation of Equipment, p. 12 | hemp rope ½", breaking strength 1,600 lb, safe load a quarter, knots halve the breaking strength; silk rope 3/8", same strength, lighter | desc | — (the narrator's judgement) | — | desc | — |
| C-EQ-08 | Explanation of Equipment, p. 12 | thieves' picks and tools are needed to open locks and remove traps; without them not usable, or at a GM penalty | mech | none | none | absent | M2 (an ability that needs an item), M9 |
| C-EQ-09 | Explanation of Equipment, p. 12 | a waterskin holds one quart, the daily minimum (up to ten times that in a desert); dry rations come by the week; the 2 lb are for a full skin | mech | none | none | absent | M3 (the play half's survival rows) |
| C-EQ-10 | Explanation of Equipment, p. 12 | tinderbox (a fire in about a turn), chalk, iron spikes, mirror (the only way to look at a Medusa), whetstone | desc | — | — | desc | — |
| C-WPN-01 | Weapons, p. 11 | damage dice: hand axe 1d6; battle axe 1d8; great axe 1d10; shortbow arrow 1d6; longbow arrow 1d8; light quarrel 1d6; heavy quarrel 1d8; dagger 1d4; shortsword 1d6; longsword/scimitar 1d8; two-handed sword 1d10; warhammer 1d6; mace 1d8; maul 1d10; club/cudgel/walking staff 1d4; quarterstaff 1d6; pole arm 1d10; sling bullet 1d4, stone 1d3; spear thrown 1d6, melee one hand 1d6, two hands 1d8 | mech | `catalogo.armi[].danno` (and the ammunition's `danno`, a sling stone 1d3); the attack lines come from the weapons carried (regole/equipaggiamento.ts) [R2 c950977] | manuale-basic-fantasy.test.ts «weapons…»; catalogo.test.ts; inventario.test.ts | impl+test | — |
| C-WPN-02 | Weapons, p. 11 | price, size and weight: hand axe 4 gp S 5; battle axe 7 gp M 7; great axe 14 gp L 15; shortbow 25 gp M 2; arrow 1 sp; longbow 60 gp L 3; arrow 2 sp; light crossbow 30 gp M 7; quarrel 2 sp; heavy crossbow 50 gp L 14; quarrel 4 sp; dagger 2 gp S 1; shortsword 6 gp S 3; longsword 10 gp M 4; two-handed sword 18 gp L 10; warhammer 4 gp S 6; mace 6 gp M 10; maul 10 gp L 16; club 2 sp M 1; quarterstaff 2 gp L 4; pole arm 9 gp L 15; sling 1 gp S *; bullet 1 sp; spear 5 gp M 5 | mech | `catalogo.armi[]`: `costo`, `taglia`, `peso`; ammunition with its price [R2 c950977] | manuale-basic-fantasy.test.ts | impl+test | — |
| C-WPN-03 | Weapons, p. 11 | silver-tipped ammunition and daggers (2, 4, 5, 10, 25 gp) for lycanthropes; creatures hit only by silver or magic cannot be hit otherwise, not even on a natural 20 (p. 53) | mech | silver items are in the catalog with `proprieta: [argento]` [R2 c950977] | manuale-basic-fantasy.test.ts (data) | narrated | No immunity reads the property yet (P6-03, M6) |
| C-WPN-04 | Weapon Size, p. 11 | humans and elves: Large in two hands, Small or Medium in one; halflings: no Large, Medium in two hands; dwarves: Medium in one hand, Large in two except those over 4 ft; bows and crossbows always two-handed; the GM limits weapon-armed monsters the same way (goblins like halflings) | mech | `taglia`, `mani` on each weapon; the race restrictions by size or id (C-RACE-03, C-RACE-17) [R2 c950977] | catalogo.test.ts; manuale-basic-fantasy.test.ts | impl+test | Hands have no effect (a two-handed weapon and a shield together are not refused) |
| C-WPN-05 | Missile Weapon Ranges, p. 11 | at or within Short range +1 to hit; beyond Medium up to Long −2 | mech | set `modificatori gittata_corta +1, gittata_lunga −2`, applied by words of the PC's action (PM) | tRM:122 | impl+test | the band comes from words, not distance (the Engine knows no positions) |
| C-WPN-06 | Missile Weapon Ranges, p. 11 | ranges short/medium/long in feet (yards outdoors): longbow 70/140/210; shortbow 50/100/150; heavy crossbow 80/160/240; light crossbow 60/120/180; dagger, hand axe, spear, warhammer 10/20/30; oil or holy water 10/30/50; sling 30/60/90 | mech | `catalogo.gittate` (short +1, medium 0, long −2) and each weapon's `gittate` or `lancio.gittate` in metres (feet × 0.3); the band from the distance the player says, the band's words or the default; beyond long refused (prove/gittate.ts) [R2 c950977] | inventario.test.ts «the band by the distance said…»; manuale-basic-fantasy.test.ts (ranges) | impl+test | Without a distance or band word in the action the band is the default (medium): the card says so. Yards outdoors are not switched. Oil and holy water ranges are not data (no throwing of flasks) |
| C-ARM-01 | Armor and Shields, p. 11 | no armor 0 gp, 0 lb, AC 11; leather 20 gp, 15 lb, AC 13; chain mail 60 gp, 40 lb, AC 15; plate mail 300 gp, 50 lb, AC 17; shield 7 gp, 5 lb, +1 | mech | `catalogo.armature` and `scudi` (AC 13, 15, 17, +1, price, weight, category) and `difesa.senza_armatura: 11` [R2 c950977] | manuale-basic-fantasy.test.ts «armor and shields…» | impl+test | — |
| C-EQ-11 | Beasts of Burden, p. 11 | draft horse 120 gp; war horse 200 gp; riding horse 75 gp; pony 40 gp; war pony 80 gp; dwarves and halflings ride ponies | mech | the five animals as catalog gear with their price (`proprieta: [animale]`, no weight) [R2 c950977] | manuale-basic-fantasy.test.ts | impl+test | Animals have no sheet or load here (their stats are p. 63) |

### Vehicles and Siege Engines (p. 13-14)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-VEH-01 | Land Transportation, p. 13 | chariot 15'×6', 300 lb, cargo 750 lb, 60' (10'), hardness/HP 10/10, 400 gp; coach 30'×8', 1,000 lb, 2,000 lb, 40' (15'), 6/12, 1,500 gp; wagon 35'×8', 2,000 lb, 4,000 lb, 20' (15'), 6/16, 500 gp | mech | none | none | absent | M2 (vehicle combat is the play half's p. 60) |
| C-VEH-02 | Water Transportation, p. 13 | size, cargo, crew, movement (maneuverability), miles/day, hardness/HP, cost: canoe 15'×4', ½ t, 1, 40' (5'), 30, 4/4, 50 gp; caravel 55'×15', 75 t, 10, 20' (20'), 42, 8/75, 10,000; carrack 60'×20', 135 t, 20, 30' (30'), 48, 10/120, 20,000; small galley 100'×15', 210 t, 90, 20' (20'), 36/24, 8/75, 15,000; large galley 120'×20', 375 t, 160, 30' (25'), 42/24, 10/120, 30,000; longship 110'×15', 10 t, 70, 30' (25'), 42/24, 9/110, 25,000; raft or barge per 10'×10', 1 t, 2, 40' (10'), 18, 6/12, 100; riverboat 50'×20', 50 t, 10, 20' (20'), 30, 8/30, 3,500; rowboat 15'×6', 1 t, 1, 30' (10'), 24, 6/8, 60; sailboat 40'×8', 5 t, 1, 40' (15'), 36, 7/20, 2,000 | mech | none | none | absent | M2 |
| C-VEH-03 | Notes Regarding Vehicles, p. 13 | crew is the minimum, officers apart; a chariot needs one (war) horse, coaches and wagons two draft horses; sailing night and day each passenger takes one ton of cargo, provisions 1/10 ton per man per month; galleys have sails and oars (80 or 140 rowers); the second galley speed is rowing | mech | none | none | absent | M2 |
| C-VEH-04 | Siege Engines, p. 14 | cost, rate of fire, attack penalty, damage, ranges: ballista 100 gp, 1/4, −3, 2d8, 50/100/150, crew 3, bolts cannot harm brick or stone; battering ram 200 gp, 1/3, +0, 2d8, crew 8+; onager 300 gp, 1/6, −6, 2d12, 100/200/300, crew 4; screw 200 gp, 1d8, crew 8; sow 100 gp, +6 AC against ranged attacks for those under it, hardness 9, 50 HP; trebuchet 400 gp, 1/10, −8, 3d10, —/300/400, not within 200 yards, −2 more if the target is over 20 ft higher, crew 8; a trained artillerist rolls; up to double cost in remote places | mech | none | none | absent | M2 |

## Part 3: Spells (p. 15-41)

### Spellcasting rules (p. 15-16)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-SPL-01 | Spells, p. 15 | the spells per day of each level come from the class tables (C-CLS-03, C-CLS-11) | mech | see C-CLS-03, C-CLS-11 | — | ptr | — |
| C-SPL-02 | Spells, p. 15 | each morning a caster prepares spells to replace those cast; prepared but uncast spells persist day to day; a prepared spell may be dismissed to prepare another of its level | proc | `magia: {preparazione: vanciana}`: the sheet's `incantesimi` are the prepared copies; a cast removes one; a rest that refreshes prepares the sheet's list again (uncast ones are kept, since the list is the same) (prove/risorse.ts) [R1 96eff8b] | poteri.test.ts | impl+test | Changing the prepared list is an edit of the sheet between sessions; no in-play swap |
| C-SPL-03 | Spells, p. 15 | casting needs one free hand and the ability to speak: bound and gagged, no spells | mech | none (no condition forbids casting; the set's `svenuto` says so only as text) | none | absent | M4 (a condition effect «cannot cast») |
| C-SPL-04 | Spells, p. 15 | in combat casting takes the time of an attack | proc | set `combattimento.azioni` (text: «uno, oppure un incantesimo, una pozione, una corsa») | none | narrated | M4 (a cast is an action in the fight's order) |
| C-SPL-05 | Spells, p. 15 | a spell is spoiled and lost if the caster is attacked (even missed) or must save on the initiative number of the casting; two casters at the same number both succeed; a caster with better initiative may delay to disrupt another | mech | none | none | absent | M3, M4 (a «casting» state at an initiative number, CB) |
| C-SPL-06 | Spells, p. 15 | spells marked * are reversible | mech | none | none | absent | M4 (each spell's data carries its reverse) |
| C-SPL-07 | Cleric Spells, p. 15 | a cleric prays at least three turns each morning to prepare; may prepare any spell of any level they can cast; the deity may refuse some (e.g. reversed healing) | proc | none | none | absent | M3, M7 |
| C-SPL-08 | Magic-User Spells, p. 16 | the spellbook holds every spell learned, in a script only its writer (or read magic) can read; read magic is prepared even without the book | mech | pg text («leggi il magico») | none | narrated | M3 |
| C-SPL-09 | Magic-User Spells, p. 16 | prepare only after rest (a good night's sleep), one turn per three spell levels rounded up (a 3rd-level MU preparing 1/1/2 = 4 levels takes 2 turns); unused spells are kept | proc | none | none | absent | M3 |
| C-SPL-10 | Spell lists, p. 15-16 | cleric lists: 8 spells at each of 6 levels (48); magic-user lists: 12 at levels 1-4, 10 at levels 5-6 (68); 12 spells are on both lists; read magic is a 1st-level MU spell outside the numbered list. Total **105 distinct spells** (48 + 68 − 12 + 1; the 105 class headers of the alphabetical section agree), 21 of them reversible | mech | the 37 level-1 and level-2 Cleric and Magic-User spells are torre-mozza's `poteri` (8 of them with typed effects, the others `descrittivo`), each with its class levels and page; levels 3–6 are not data yet [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | impl+test | levels 3–6 (68 spells) → the same schema |

### A sample of spells that change numbers (p. 17-41)

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| C-SP-01 | Magic Missile, MU 1, p. 29 | range 100'+10'/level, instantaneous; never misses a target at least partly visible; 1d6+1, normally no save; no objects; one more missile every three levels beyond 1st (2 at 4th, 3 at 7th, 4 at 10th, 5 at 13th+) | mech | a power of the set (torre-mozza `poteri: dardo_incantato`, `danno 1d6+1, colpi: {ogni_livelli: 3, massimo: 5}`), cast from Eliandro's one prepared copy and first-level slot (`magia: vanciana`, `classi.mago.incantesimi_al_giorno`); refused once spent, back with the panel's rest; the sheet's unlimited automatic weapon line is gone; the rules arbiter and the Engine's pass call it by its words before any attack override (regole/poteri.ts, prove/poteri.ts, prove/risorse.ts) [R1 96eff8b] | poteri.test.ts «a damage spell named in the action: the slot is spent…», «even when the model arbiter calls it an attack…», «a level-2 magic-user has two first-level slots…» | impl+test | Shield's block is a typed `immunita` (R1 56cda9a) |
| C-SP-02 | Sleep, MU 1, p. 36 | range 90', 5 rounds/level; several creatures of ≤ 3 HD, or a single 4 HD one, within 30' of a chosen point; 5+ HD, undead, constructs, unconscious unaffected; each saves vs Spells; sleepers are hit automatically; injury wakes them, slapping in 1d4 rounds | mech | torre-mozza power `sonno`: `bersaglio: nemici` (the enemies in the fight, or the hostile NPCs of the scene: no positions, so no 30' point), `dadi_vita_max: 3`, `oppure_uno_fino_a: 4`, `immuni: [non_morto, costrutto]`, each target's save `ts_incantesimi`, condition `addormentato` (`perde_turno`, `fuori_combattimento`, `colpito_automaticamente`) for 5 rounds per level, ended by damage (prove/poteri.ts, prove/attivi.ts) [R1 96eff8b, R1 56cda9a, R1 f178e89] | poteri.test.ts «an area spell: each target within the limit rolls its own save…»; attivi.test.ts «sleep: who fails sleeps…», «in a fight a sleeping NPC loses its step…»; manuale-basic-fantasy.test.ts (the set's numbers against the manual) | impl+test | Unconscious targets and slapping awake are narrated |
| C-SP-03 | Charm Person, MU 1, p. 18 | range 30', special; a humanoid of ≤ 4 HD (any level for character races) sees the caster as a close friend; save vs Spells negates, +5 if hostilities began or it feels threatened; a new save each day (INT 13+), week (9-12) or month (≤ 8) | mech | torre-mozza power `charme`: `solo_tipi: [umanoide]` (sheet `tipo`), `dadi_vita_max: 4`, the target's save `ts_incantesimi`, condition `affascinato` (`fuori_combattimento`) until the next rest [R1 f178e89] | attivi.test.ts «charm: a humanoid of few hit dice who fails is charmed…»; manuale-basic-fantasy.test.ts (the set's numbers against the manual) | impl+test | the +5 when threatened and the re-save by Intelligence are approximated (until the next rest); the NPC's attitude in the world model does not move |
| C-SP-04 | Shield, MU 1, p. 36 | self, 5 rounds + 1/level; blocks magic missiles from any direction; AC +3 against melee, +6 against missiles, not from behind | mech | torre-mozza power `scudo`: typed `bonus` to AC +3 `contro: mischia` and +6 `contro: distanza`, and `immunita: [dardo_incantato]`, 5 rounds + 1 per level (prove/attivi.ts; the attack reads the target's active AC bonus) [R1 f178e89, R1 56cda9a] | attivi.test.ts «shield: +3 AC against melee…»; manuale-basic-fantasy.test.ts (the set's numbers against the manual) | impl+test | «not from behind» is not modelled (no positions) |
| C-SP-05 | Light*, C 1 / MU 1, p. 27 | range 120', 6 turns + 1/level; torchlight 30' radius (+20' dim) on a point, an object or a creature; reversed: darkness that blocks Darkvision and mundane light; the two cancel where they overlap | mech | a descriptive power of torre-mozza's set (`descrittivo: true`): cast from a slot, which the Engine counts; the narrator tells the effect from the manual [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | narrated | M4 (light is the play half's row) |
| C-SP-06 | Read Magic, MU 1, p. 34 | range 0, permanent; reads magical text (spellbook, scroll); a cursed text triggers its curse; prepared even without the spellbook | mech | pg text | none | narrated | M3 (scroll use: X-SCR-01) |
| C-SP-07 | Hold Portal, MU 1, p. 25 | range 100'+10'/level, 1 round/level; a normal door, gate or shutter acts as locked; opened early only by knock, dispel magic or destroying it | mech | a descriptive power of torre-mozza's set (`descrittivo: true`): cast from a slot, which the Engine counts; the narrator tells the effect from the manual [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | narrated | M4 (a state on a door or object) |
| C-SP-08 | Protection from Evil*, C 1 / MU 1, p. 32 | touch, 1 turn/level; against summoned, evil-intent and extraplanar evil creatures: +2 AC and +2 on all saves; blocks charm, control and possession; such summoned or extraplanar creatures cannot touch the subject (ends if the subject attacks them); reversed: protection from good | mech | a descriptive power of torre-mozza's set (`descrittivo: true`): cast from a slot, which the Engine counts; the narrator tells the effect from the manual [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | narrated | M4, M6 |
| C-SP-09 | Cure Light Wounds*, C 1, p. 20 | touch, instantaneous; heals 1d6+1; reversed (cause light wounds) 1d6+1 with an attack roll, wasted on a miss; undead are hurt by the cure and healed by the cause. (A cleric casts from 2nd level.) | mech | torre-mozza power `cura_ferite_leggere`: typed `cura 1d6+1` on one target, from a cleric's slot (none at 1st level: `classi.chierico`); healing never revives the dead (prove/effetti.ts) [R1 f178e89] | poteri.test.ts «a healing spell on an ally…»; manuale-basic-fantasy.test.ts (the set's numbers against the manual) | impl+test | The reverse and its effect on undead are narrated |
| C-SP-10 | Remove Fear*, C 1, p. 35 | touch (120'), instantaneous (2 turns); a new save against magical fear at +1 per caster level; reversed (cause fear): one target within 120' flees 2 turns on a failed save vs Spells; 6+ HD immune | mech | a descriptive power of torre-mozza's set (`descrittivo: true`): cast from a slot, which the Engine counts; the narrator tells the effect from the manual [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | narrated | M4, M5 |
| C-SP-11 | Bless*, C 2, p. 17 | 50' radius, 1 minute/level; the caster and allies +1 on attacks, morale (allied monsters and NPCs) and saves against magical fear; casters of 7th level or more give +2 on attacks and fear saves (morale stays +1) | mech | torre-mozza power `benedizione`: `bersaglio: alleati`, typed `bonus` +1 to attacks for 6 rounds per level (prove/attivi.ts) [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | impl+test | The +2 from 7th level, morale and fear saves are not modelled |
| C-SP-12 | Hold Person, C 2 / MU 3, p. 25 | range 180', 2d8 turns; a living humanoid no larger than an ogre is paralysed (conscious, cannot move, act or speak); save vs Spells; one target saves at −2, or 1d4 of a group | mech | torre-mozza power `blocca_persone` (`livello: {chierico: 2, mago: 3}`): `solo_tipi: [umanoide]`, save `ts_incantesimi` at −2, condition `paralizzato` (`perde_turno`, `fuori_combattimento`) for the scene (2d8 game turns: no game clock) [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | impl+test | The group option (1d4 targets) is not modelled |
| C-SP-13 | Spiritual Hammer, C 2, p. 37 | range 30', 1 round/level; a force warhammer attacks a foe chosen by the cleric once a round with the caster's attack bonus, as a magic weapon; 1d6 +1 per three caster levels (max +5); gone if out of sight or range | mech | a descriptive power of torre-mozza's set (`descrittivo: true`): cast from a slot, which the Engine counts; the narrator tells the effect from the manual [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | narrated | M4 (a summoned attack line) |
| C-SP-14 | Web, MU 2, p. 40 | range 10'/level, 2 turns/level; up to 8,000 cu ft anchored to solid objects; those inside save vs Death Ray: success moves at half speed and cannot cast or attack normally; failure is trapped, no movement, spells, attacks or other physical action | mech | a descriptive power of torre-mozza's set (`descrittivo: true`): cast from a slot, which the Engine counts; the narrator tells the effect from the manual [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | narrated | M4, M5 |
| C-SP-15 | Invisibility, MU 2, p. 26 | touch, special; the subject and what it carries are invisible to normal sight and Darkvision (non-visual senses can still find it); an item set down becomes visible | mech | a descriptive power of torre-mozza's set (`descrittivo: true`): cast from a slot, which the Engine counts; the narrator tells the effect from the manual [R1 f178e89] | manuale-basic-fantasy.test.ts (the set's numbers against the manual) | narrated | M4 (a condition with effects on attacks for and against) |
| C-SP-16 | Fireball, MU 3, p. 23 | range 100'+10'/level, instantaneous; 20' radius; 1d6 per caster level, save vs Spells for half; a missile attack roll (no range adjustment) to pass a slit or small opening; ignites combustibles | mech | none | none | absent | M4 (area damage), M5 (save for half) |
| C-SP-17 | Lightning Bolt, MU 3, p. 28 | range 100'+10'/level, instantaneous; a bolt 60' long and 5' wide from where the spark stops; 1d6 per caster level, save vs Spells for half; in water it bursts like a fireball (20' radius) | mech | none | none | absent | M4, M5 |
| C-SP-18 | Haste*, MU 3, p. 25 | range 30'+10'/level, 1 round/level; one creature per caster level moves and attacks twice as fast (a second round of actions after everyone), not spellcasting or wands; effects do not stack; reversed (slow): half movement, attacks every other round, save vs Spells | mech | none | none | absent | M4 (an extra step in the fight's order, CB) |
| C-SP-19 | Cure Serious Wounds*, C 4, p. 20 | touch, instantaneous; heals 2d6 + 1 per caster level; the reverse inflicts the same, with an attack roll | mech | none (the GM's panel only) | none | narrated | M4 |
| C-SP-20 | Raise Dead*, C 5, p. 33 | touch; a humanoid dead no more days than the caster's level; willing spirit, not old age, not undead; wounds healed, missing parts stay missing; the target returns with 1 HP per level or HD (min 1) and no prepared spells; reversed (slay living): dies unless it saves vs Spells, else 2d6 damage, an attack roll in combat | mech | the GM giving HP back to a dead PC brings it back (ST:122-123) | none | narrated | M4 |

## Rows from other Parts [overlap]

| id | § and page | rule | kind | where today | tested | status | gap → mechanism |
|---|---|---|---|---|---|---|---|
| X-AB-01 | Attack Bonus Table, p. 53 **[overlap]** | Fighter: NM +0; 1 +1; 2-3 +2; 4 +3; 5-6 +4; 7 +5; 8-10 +6; 11-12 +7; 13-15 +8; 16-17 +9; 18-20 +10. Cleric or Thief: 1-2 +1; 3-4 +2; 5-6 +3; 7-8 +4; 9-11 +5; 12-14 +6; 15-17 +7; 18-20 +8. Magic-User: 1-3 +1; 4-5 +2; 6-8 +3; 9-12 +4; 13-15 +5; 16-18 +6; 19-20 +7. Monsters by HD: < 1 +0, 1 +1 … 7 +7, 8-9 +8, 10-11 +9, 12-13 +10, 14-15 +11, 16-19 +12, 20-23 +13, 24-27 +14, 28-31 +15, 32+ +16 | mech | `classi[].attacco` rows (NM to 20), given to `progressione.attacco` (mischia, distanza, the thief's `alle_spalle` +4); monsters keep their typed bonus | manuale-basic-fantasy.test.ts; progressione.test.ts | impl+test | monsters' bonus by hit dice is still the sheet's [R3 8c1bc82, R3 d85c977] |
| X-AB-02 | How to Attack, p. 53 **[overlap]** | d20 + AB + STR (melee) or DEX (missile) + situational ≥ the target's AC hits; a natural 1 always misses; a natural 20 always hits if the target can be hit at all | mech | set `risoluzione: {critico: 20, disastro: 1}`; RI:59-61; RR:334-378 against the sheet's `difesa` | tRM:65, tR:139, L6b | impl+test | «can be hit at all» is absent (C-WPN-03) |
| X-SV-01 | Saving Throw Tables, p. 61 **[overlap]** | Cleric (Death/Poison, Wands, Paralysis/Petrify, Dragon Breath, Spells): 1: 11 12 14 16 15; 2-3: 10 11 13 15 14; 4-5: 9 10 13 15 14; 6-7: 9 10 12 14 13; 8-9: 8 9 12 14 13; 10-11: 8 9 11 13 12; 12-13: 7 8 11 13 12; 14-15: 7 8 10 12 11; 16-17: 6 7 10 12 11; 18-19: 6 7 9 11 10; 20: 5 6 9 11 10 | mech | torre-mozza `classi[chierico].tiri_salvezza`, every row; read for the sheet's class and level (regole/salvezze.ts) [R1 ac34723] | manuale-basic-fantasy.test.ts «a few rows of each class»; salvezze.test.ts | impl+test | — |
| X-SV-02 | Saving Throw Tables, p. 61 **[overlap]** | Fighter: NM: 13 14 15 16 18; 1: 12 13 14 15 17; 2-3: 11 12 14 15 16; 4-5: 11 11 13 14 15; 6-7: 10 11 12 14 15; 8-9: 9 10 12 13 14; 10-11: 9 9 11 12 13; 12-13: 8 9 10 12 13; 14-15: 7 8 10 11 12; 16-17: 7 7 9 10 11; 18-19: 6 7 8 10 11; 20: 5 6 8 9 10. Magic-User: 1: 13 14 13 16 15; 2-3: 13 14 13 15 14; 4-5: 12 13 12 15 13; 6-7: 12 12 11 14 13; 8-9: 11 11 10 14 12; 10-11: 11 10 9 13 11; 12-13: 10 10 9 13 11; 14-15: 10 9 8 12 10; 16-17: 9 8 7 12 9; 18-19: 9 7 6 11 9; 20: 8 6 5 11 8. Thief: 1: 13 14 13 16 15; 2-3: 12 14 12 15 14; 4-5: 11 13 12 14 13; 6-7: 11 13 11 13 13; 8-9: 10 12 11 12 12; 10-11: 9 12 10 11 11; 12-13: 9 10 10 10 11; 14-15: 8 10 9 9 10; 16-17: 7 9 9 8 9; 18-19: 7 9 8 7 9; 20: 6 8 8 6 8 | mech | torre-mozza `classi[guerriero / mago / ladro].tiri_salvezza`, every row (NM is the fighter's level 0, for normal men); NPCs save through `salva_come` (Zirrà a level-3 fighter, the villagers NM) [R1 ac34723] | manuale-basic-fantasy.test.ts «a few rows of each class» | impl+test | — |
| X-SV-03 | Saving Throws, p. 60-61 **[overlap]** | a save succeeds on d20 ≥ the table's number (natural 20 always, natural 1 never, as attacks); the GM gives no difficulty | mech | A save (an ability with `salvezza: true` or a table column) is pinned to its own number in the set's resolver (regole/salvezze.ts, prove/risolutore-regole.ts): the class table's number when the set and the sheet have one, otherwise the sheet's bonus against the default difficulty (17); the difficulty from the rules arbiter's signal words, the model, the scene or the panel and the arbiter's or a helper's advantage are dropped (logged), only a fight's `svantaggio_salvezze` condition counts; the card is a `salvezza`; naturals as before [R1 6d6f2da] | salvezze.test.ts «neither a difficulty rung nor the arbiter's advantage moves it; a condition of the fight still does», «with a class and level on the sheet, the table's number; the naturals of a save count»; tRM:88 | impl+test | — |
| X-SV-04 | Saving Throws, p. 60 **[overlap]** | a monster or NPC saves with its own table (fighter-like by HD), against a PC's spell, breath, poison | mech | `strumentiRegole.salvezzaDelBersaglio`: the target rolls its own save ability against its own number (the table through its class or `salva_come`, or its sheet's bonus), with the Engine's dice for an NPC and a card marked `nascosta` (the Game Master's side); a PC target rolls its own dice [R1 6d6f2da] | salvezze.test.ts «an NPC rolls with the Engine's dice, against its own number, and its card is the Game Master's» | impl+test | Wired to spells in R1 96eff8b |
| X-TU-01 | Clerics vs. Undead Table, p. 57 **[overlap]** | d20 needed by cleric level against Skeleton (1 HD), Zombie (2), Ghoul (3), Wight (4), Wraith (5), Mummy (6), Spectre (7), Vampire (8), Ghost (9+) — 1: 13 17 19 No…; 2: 11 15 18 20; 3: 9 13 17 19; 4: 7 11 15 18 20; 5: 5 9 13 17 19; 6: 3 7 11 15 18 20; 7: 2 5 9 13 17 19; 8: T 3 7 11 15 18 20; 9: T 2 5 9 13 17 19; 10: T T 3 7 11 15 18 20; 11: D T 2 5 9 13 17 19; 12: D T T 3 7 11 15 18 20; 13: D D T 2 5 9 13 17 19; 14: D D T T 3 7 11 15 18; 15: D D D T 2 5 9 13 17; 16: D D D T T 3 7 11 15; 17: D D D D T 2 5 9 13; 18: D D D D T T 3 7 11; 19: D D D D D T 2 5 9; 20: D D D D D T T 3 7 (T = turned automatically, D = damaged); the HD row is for undead not on the table | mech | `classi.chierico.tabelle.scacciare_non_morti`, levels 1–20, nine columns, T, D, null for «No» | manuale-basic-fantasy.test.ts | impl+test | — [R3 8c1bc82, R3 77271e4] |
| X-TU-02 | Turning the Undead, p. 57-58 **[overlap]** | the player always rolls 1d20 and tells the GM; on a success 2d6 HD are affected (at least one creature), weakest type first with the same roll and the same 2d6; a failure forbids another try for one turn (a partial one counts as failed); turned undead flee and stay away 2d4 turns; D: 1d8 damage per cleric level, rolled once for all | mech | the power `scacciare_non_morti` with its `tabella` (prove/scacciare.ts): one d20 by the player, weakest first, 2d6 HD, D 1d8 × level once, a turn's lockout, turned out of the fight for 2d4 turns | scacciare.test.ts; live run regole-r3 | impl+test | — [R3 77271e4] |
| X-ENC-01 | Carrying Capacity, p. 42 **[overlap]** | human, elf, dwarf: light load ≤ 60 lb, heavy ≤ 150; halfling 50 / 100; +10% per +1 STR, −20% per −1: STR 3: 25/60 (halfling 20/40); 4-5: 35/90 (30/60); 6-8: 50/120 (40/80); 9-12: 60/150 (50/100); 13-15: 65/165 (55/110); 16-17: 70/180 (60/120); 18: 80/195 (65/130); halfling armor weighs a quarter | mech | set `carico` (bands by Strength score, the halfling's own rows, halfling armor at a quarter), summed from the catalog's weights and the coins (regole/carico.ts, prove/inventario.ts) [R2 2a28ec7] | manuale-basic-fantasy.test.ts «light and heavy loads by Strength…», «the four PCs…»; inventario.test.ts «load and movement» | impl+test | — |
| X-ENC-02 | Movement and Encumbrance, p. 42 **[overlap]** | PC races move 40' a round, × 3 a turn exploring; by armor and load: no armor or magic leather 40' / 30'; leather or magic metal 30' / 20'; metal 20' / 10'; worn armor counts in the load | mech | set `movimento` (no armor 12/9 m, leather 9/6, metal 6/3, i.e. 40'/30', 30'/20', 20'/10'; overloaded 0; a turn exploring 3 × the round), shown on the panel and the phone and told when it changes [R2 2a28ec7] | inventario.test.ts «a heavy load slows…»; manuale-basic-fantasy.test.ts | impl+test | Magic armor's better row is not modelled; the Engine has no positions, so movement limits no action in a fight |
| X-ADV-01 | Character Advancement, p. 49 **[overlap]** | no character advances more than one level from one adventure (XP stop one short of the next level) | mech | `progressione.un_livello_per_avventura`: each share held one short of the level after next (one session) | esperienza.test.ts; progressione.test.ts | impl+test | — [R3 33d96b6] |
| X-SCR-01 | Scrolls, p. 172 **[overlap]** | a spell scroll holds cleric or MU spells, never both, each usable once; only a cleric uses a cleric scroll, only an MU an MU one; an MU casts read magic once per scroll first; failure 10% if the MU does not know the spell, +10% per spell level above the highest the MU can cast (clerics: only the level part); spell level d%: 01-30 1st, 31-55 2nd, 56-75 3rd, 76-88 4th, 89-97 5th, 98-00 6th | mech | none | none | absent | M3, M4 |
| X-OPT-01 | Character Creation Options, p. 186 **[overlap]** | GM's options, never demanded by players: point swapping (−2 to one score for +1 to another, max 18 or the racial maximum, none below 9); score swapping (two scores, once); full shuffle | proc | none | none | absent | M7 |
| X-OPT-02 | Hopeless Characters, p. 186-187 **[overlap]** | no one must play a character with less than 9 in the first four scores (no class is open); the GM may allow a reroll, or flipping every score to 21 − score (all of them, not just the bad ones) | proc | none | none | absent | M7 |
| X-OPT-03 | Acquisition of Spells, p. 187 **[overlap]** | an MU starts with read magic + one spell; a level gives slots, not spells; learning from a teacher takes a day, from a spellbook a day per spell level; transcribing costs 500 gp per spell level; training costs 100-1,000 gp per spell level; only spells of a level the MU can cast; a cleric's deity may give another spell or none | mech | none | none | absent | M3, M1 |
| X-OPT-04 | Weapon and Armor Restrictions, p. 187 **[overlap]** | cleric with an edged weapon loses spells and Turning until a quest (unrepentant: becomes a Fighter at the level its XP give); MU with a forbidden weapon −5 to hit, in armor cannot cast (the spell is lost); thief in armor heavier than leather loses every thief ability and the Sneak Attack; dwarf or halfling with a Large weapon −5 or not allowed | mech | the four restrictions as `catalogo.restrizioni` (C-CLS-04, C-CLS-12, C-CLS-16, C-RACE-03/17) [R2 c950977] | inventario.test.ts; catalogo.test.ts; manuale-basic-fantasy.test.ts | impl+test | Dwarves and halflings: the set takes «not allowed» (the GM's other option, −5, is not data); the cleric's quest is narrated |
| X-OPT-05 | Ability Rolls, p. 189 **[overlap]** | d20 + ability bonus + GM's adjustment ≥ Target by level: NM or 1: 17; 2-3: 16; 4-5: 15; 6-7: 14; 8-9: 13; 10-11: 12; 12-13: 11; 14-15: 10; 16-17: 9; 18-19: 8; 20: 7 | mech | level 1: set `difficolta normale: 17` (with facile 13, difficile 19, ardua 21 as the GM's adjustment); RR:191, RI:48 | L6 («Intelligenza vs 13», «Carisma vs 17/19») | impl+test | the target does not fall with the level (fine for level-1 one-shots only) → M1 |
| X-OPT-06 | Human Experience Bonus Option, p. 190 **[overlap]** | the GM may double the humans' XP bonus to 20% | mech | a set writes the humans' trait as `{tiro: esperienza, bonus: 20}` | progressione.test.ts (the trait) | impl+test | torre-mozza keeps the standard 10% [R3 2e9ad34] |
| X-OPT-07 | Thief Abilities option, p. 190 **[overlap]** | the table's secret: +30 points a level at 2-9, +20 at 10-15, +10 from 16; the player may allocate them, at most +10 to one ability a level, never above 99% | mech | none | none | absent | M1 |
| X-OPT-08 | Preparing Spells From Memory, p. 190 **[overlap]** | without the spellbook: read magic always; any other spell needs an INT ability roll with the spell level as a penalty; a failure spends the slot as if cast | mech | none | none | absent | M3 |

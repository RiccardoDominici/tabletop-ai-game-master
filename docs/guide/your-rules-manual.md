# Your rules manual

What you'll find here: how to play a campaign with the rules of a manual of your own, instead of the SRD 5.2 in the repository.
Read first: [creating a campaign](create-a-campaign.md) (the Preparer and the validator) and [one evening](one-evening.md) (how play works). The technical specification is in [docs/regole.md](../regole.md).

## In brief

1. Put the manual in `manuali/` (a PDF with text, `.md`, or `.txt`).
2. In the campaign brief, write `manuale: manuali/<file>`.
3. The Preparer reads the manual, writes the rule set into `campagne/<id>/regole/`, and uses it for rolls, sheets, and the narrator.
4. Players see the **«Regole»** (Rules) button and the **«Chiedi una regola»** (Ask a rule) box.

Without the `manuale:` field, the campaign plays with the SRD 5.2, as it does today.

## 1. Where the manual goes

The `manuali/` folder is in `.gitignore`: what you put there stays on your computer and never enters the repository. Manuals are often under copyright, which is why this rule exists. The file `manuali/README.md` is the only one tracked by git, and it explains the same things briefly.

## 2. Formats

| Format | How a chapter is recognized |
|---|---|
| **PDF with selectable text** | the PDF's bookmark index, if there is one; otherwise recognizable headings («Capitolo 3», «2.1 Il combattimento», i.e. "Chapter 3", "2.1 Combat") |
| **Markdown** (`.md`) | headings marked with `#` |
| **Plain text** (`.txt`) | headings on a line by themselves, or in the form «Capitolo 3 …» |

A photographed or scanned PDF has no text, and the program cannot read it. You need an OCR first, or a text version of the manual (the publisher often has one).

To read a PDF, the extractor needs the `pypdf` library, in its own Python environment. No script creates it: make it once, by hand.

    uv venv --python 3.12 strumenti/regole/.venv
    uv pip install --python strumenti/regole/.venv/bin/python pypdf

The first line creates the environment; the second installs `pypdf`. A `.md` or `.txt` manual does not need it: the system `python3` is enough (`python3 -I strumenti/regole/estrai.py manuali/<file>`).

To see how the program reads your file:

    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/<file>

It prints the text divided into sections, each with its page (`--json` prints it as JSON). For a PDF it looks for the chapters in this order: the bookmark index, then the headings recognized by their font, and, if neither works, one section every two pages. If a section is missing or split badly, fix the file (or its index) before preparing the campaign. The Preparer runs this same command.

## 3. How to say it in the brief

The brief is `campagne/<id>/brief.yaml`, copied from the skill's template. The field is optional:

```yaml
manuale: manuali/mondo-a-2d6.pdf
```

You can also state it in words in your request to the Preparer (for example, "use the manual in manuali/mondo-a-2d6.pdf"): the skill puts it into the brief by itself.

## 4. What gets created

The Preparer writes into `campagne/<id>/regole/`:

| File | What it contains |
|---|---|
| `regole.yaml` | the structure of the set: how rolls work, the abilities, the skills, the difficulties, the moves, the source, and the license |
| `riassunto.md` | a summary in plain words, in the campaign's language, for the players (at most 400 words) |
| `estratti/*.md` | the manual's passages to consult, one per rule, with the words used to find them |

The set can keep the manual's numbers as they are, instead of converting them (the full schema is in [docs/regole.md](../regole.md), §2):
- a table from ability score to bonus (`modificatore: {tipo: tabella, …}`), with the score on the sheet;
- skills rolled as a percentage or as «x in 6» (`soglia` on the skill), with the percentage or the x on the sheet;
- a weapon that always hits (`automatico: true` on the sheet's weapon);
- situational attack modifiers (`modificatori`): from behind, a charge, short or long range, each with the words of a player's action that make it apply («alle spalle», «carico», «da lontano»), the kind of attack, and the weapon it needs (a charge needs a spear). The program knows no positions: the player's words decide, and an NPC's attack never gets one;
- what a natural 20 or 1 does on a d20, and on which rolls (`critici`: attacks only, attacks and saving throws, or every roll; the saving throws are the skills marked `salvezza: true`), critical and minimum damage, the extras of a death save, initiative rolled again every round, and ties acting at the same moment (`pari: simultanei`).
- **spells, potions and class actions as data** (`poteri`): what each one does, from a closed list of effects (damage, healing, a condition for some rounds, a bonus to AC, attacks or saves, an immunity, a fall, a trap's attack, binding a dying character, save or die), who it reaches (oneself, one target, every enemy within a hit-dice limit, the allies), and the target's own saving throw (it negates, or halves the damage). The program spends what it costs and refuses it once it is gone, with a clear line for the narrator: a spell needs a prepared copy and a slot of its level (`classi[].incantesimi_al_giorno`, the manual's spells-per-day table, and `magia: {preparazione: vanciana}` for Basic Fantasy), an item is taken off the sheet (`oggetti`). Spells and slots come back with the rest you give from the panel ([the Game Master panel](master-panel.md#combat));
- **resources** (`risorse`): arrows, coins, any counter of the manual, with what refreshes it (never, a rest, the end of a fight); a weapon line with `consuma: frecce` spends one arrow a shot and is refused with none left;
- **the equipment list** (`monete`, `catalogo`): the manual's coins and prices, its weapons (damage, size, range bands, ammunition, rate of fire), armor and shields (AC, category), ammunition, gear with weight, capacity and light, and what each class or race may not use and what happens if it does (the magic-user's −5, no spell in armor, the thief's abilities blocked in metal armor, the halfling's large weapons forbidden). A sheet then lists what the character carries (`equipaggiamento`, `monete`) and the program works out the Armor Class and the attacks, spends an arrow per shot, reads the distance the player says («tiro a 20 metri») against the weapon's range bands, and lets you buy, sell and swap armor from the panel;
- **load and movement** (`carico`, `movimento`): the light and heavy loads by Strength and race, and the movement by armor and load, as the manual's tables give them; the panel and the phone show them;
- **game time** (`tempo`, and `viaggio` for overland travel): how long a round and a turn are, what a window of exploration costs, how long a rest takes; torches and lanterns burn on it and go out by themselves;
- **exploration** (`esplorazione`, and the encounter tables in `incontri` or `regole/incontri.yaml`): how often the Game Master checks for wandering monsters in each environment (a dungeon, the wilderness) and with what odds, and the manual's encounter tables by dungeon level or terrain, each entry a monster of the bestiary and how many. A scene sheet says where it is (`esplorazione: {ambiente: sotterraneo, livello: 1}`); there the program rolls the checks on the clock, hidden, and tells the narrator who arrives. The same section carries the daily food and water (`provviste`: which items feed a character for how many days, and what going without costs) and, for the manuals that have one, a rest rule while exploring (`riposo`); `viaggio` says which environment a journey is in, each terrain's encounter table, whether it is trackless, and the check the leader rolls against getting lost;
- **light and darkness** (a scene's `luce: piena | fioca | buio`, the set's `esplorazione.buio` and the trait `{scurovisione: 18}`): in the dark, without a light lit by the party, whoever has no darkvision carries the condition the set names (blinded); the bestiary's `scurovisione` gives every monster its darkvision;
- **saving throws by the manual's table**: the save categories (`tiri_salvezza.colonne`) and each class's rows by level (`classi[].tiri_salvezza`); the sheet names its class and level (`classe`, `livello`), a monster its «save as» (`salva_come`). A save is always rolled against its own number, never moved by a difficulty or by the referee's advantage;
- **race and class traits** (`razze`, `classi[].tratti`, the sheet's `razza`): a bonus to initiative, to an ability's rolls or to some saves, an immunity, a smaller chance of being surprised (Basic Fantasy's halfling +1 initiative and +1 with missiles, the dwarf's +4 to saves, the elf surprised only on a 1);
- an attack ability's extras (`danno: doppio`, `una_volta_per_bersaglio`, `ripiego`): Basic Fantasy's sneak attack deals double damage and only once per opponent in a fight, then the thief attacks normally.
- **a bestiary** (`bestiario`, and the stat blocks in `regole/mostri.yaml`): each monster of the manual as data (AC, hit dice as printed, its attacks of a round with their damage, save as, morale, XP), and the manual's rules that turn one into a sheet (the hit die, the attack bonus by hit dice). An NPC or a minion then writes `mostro: <id>` instead of copying the numbers, and only what differs (its own hit points, another weapon). Hit points not written are rolled for each creature when the session starts; a monster with «2 claws, 1 bite» makes all three attacks in its turn. The numbers copied from a PDF manual can be checked against it: `python3 strumenti/regole/confronta_bestiario.py campagne/<id>/regole/mostri.yaml --pdf manuali/<file>.pdf --da <first PDF page> --a <last PDF page>` prints every difference.

Where the set says nothing, the SRD 5.2 values apply.

The words in `parole_chiave` (and the `parole` of the passages and of the scene checks) should be specific to the check: «grimaldello» (lockpick), «arrampico» (I climb). Common words of places, the body and objects (door, passage, stairs, shoulder, shadow…) are ignored by the local rules arbiter, because alone they do not say which check, and the validator flags them (an error with `--rigoroso`): the list is in `lingue/<code>/prove.yaml`, `parole.generiche`. A keyword of several words («passaggio segreto», secret passage) is fine.

The PG (player character) and PNG (non-player character) sheets use the characteristics of your manual, not D&D's. The validator checks the set with the `REGOLE` class:

    python3 -I strumenti/valida_campagna.py campagne/<id> --solo REGOLE

It must finish with no errors. The same check is part of the full campaign check.

**License.** The set carries the license that the Preparer declares in `regole.yaml`. If the manual is not free, the set must be declared with `libera: false`: the `regole/` folder then gets its own `.gitignore`, and the set stays out of the repository. If you are unsure about the license, ask the Preparer before you commit.

## 5. Combat

If the manual describes how a fight works, the Preparer writes it into an optional `combattimento:` section of `regole.yaml`: how initiative is rolled (once for each side, for each character, or not at all, as in a PbtA game), the phases of a round in order, what happens at 0 hit points, the conditions and their effects, and whether the sides check morale. Only the effects from the Engine's closed list can be used, so a condition described in words in the manual becomes one of those effects, or a text without a mechanical effect. Without the section, the SRD 5.2 combat applies, and the other types get sensible defaults; a PbtA-style set needs only `combattimento: {iniziativa: {tipo: nessuna}}`. The full schema is in [docs/regole.md](../regole.md), §2, and how fights work in general is in `docs/combattimento.md`.

## 6. What the players see

- The **«Regole»** (Rules) button, at the top of the phone, opens the set's summary, with the manual's name, the license, and the attribution if the set has one.
- At the bottom, the **«Chiedi una regola»** (Ask a rule) box. A player writes a question; the model of the `regole` component answers, in at most eighty words, using only the summary and the manual passages found for the question. By default it is the local model on this computer; it can be Haiku (see [local and API](local-and-api.md#the-seven-components)). The answer is seen only on the phone that asked. One question at a time per phone, with a few seconds' pause between them.
- The answer contains nothing from the story: no scenes, NPCs, or secrets. If the rule is not in the text, it says so and advises asking the Game Master.

The full rules for the box and the panel are in [docs/regole.md](../regole.md), §5.

## 7. If something goes wrong

- **The campaign plays with the SRD 5.2, not with your manual.** The set is not valid, and the server writes this to the log: «set non valido, si gioca con l'SRD 5.2» (set not valid, playing with the SRD 5.2). Run the validator again with `--solo REGOLE` to see which field does not check out.
- **The Preparer says the manual is empty.** The file is a scan with no text: see section 2.
- **«Chiedi una regola» does not answer, or is not there.** The box appears only when the `regole` component has a model (`locale`, `anthropic`…) and the set has passages or a summary. With `regole` as its provider, or on a computer without a local model and without a key, the box is not shown. With the local model, check that the model server on port 4613 is running (`logs/lettore.out`).

## 8. An example: Basic Fantasy

The campaign `campagne/torre-mozza` («La chiave della Torre Mozza», a one-shot of about two hours, three scenes) plays with a rule set taken from *Basic Fantasy Role-Playing Game*, 4th edition, release 142. That manual is free (CC BY-SA 4.0), so its set is in the repository, with `libera: true`, and its images and audio too:

- `campagne/torre-mozza/regole/regole.yaml`: the structure, with comments on how each rule of the manual was translated (the ability table, percentile and «x in 6» rolls, natural 20 and 1 on attacks);
- `campagne/torre-mozza/regole/riassunto.md` and `estratti/`: what the players read and the passages for «Chiedi una regola».
- the magic-user's spells are counted: Eliandro prepares *magic missile* (`dardo_incantato`, a power of the set) in his one first-level slot of the day; cast once, it is refused until the party rests («Riposo: Una notte di sonno» in the panel). Nespola's sneak attack is once per opponent per fight, with double damage.
- the class tables of levels 1 to 20 are data (XP, hit dice, attack bonus, saving throws, spells per day, the thief's percentages, the Clerics vs. Undead table): the sheets write class, level and XP, and the program derives the rest. The program counts the XP of defeated enemies (and, by the manual's option, of treasure brought back to safety) and a character who reaches the next level levels up between sessions, rolling the new hit die at the table.
- Fulco turns the undead with the holy symbol («Scaccio i non morti col simbolo sacro»): the player rolls the d20 against the table of the cleric's level, then 2d6 for the hit dice affected; the turned undead flee for 2d4 turns.
- the thief's Listen, Find Traps, Move Silently and Hide are rolled by the program in secret, as the manual wants: Nespola's player never sees the die, and the narrator tells a failure as she perceives it.
- light and darkvision (pp. 5, 43): dwarves and elves see 18 m (60') in the dark, every monster too unless its entry says otherwise; in the dark without a torch or lantern the others fight blinded (−4). The scenes are at dusk or by night, `luce: fioca`; when the party goes down into the tower's cellar and crypt, set the light to «buio» from the panel.
- the wandering monsters of pp. 180–182: a check every 3 turns underground and about every 4 hours in the wilderness, 1 on 1d6, and the 17 encounter tables (six dungeon levels, nine terrains, the city by day and by night) in `campagne/torre-mozza/regole/incontri.yaml`, every cell checked against the PDF by `python3 -m pytest -q strumenti/regole/test_incontri_bf.py`; the dungeon survival of p. 44 (a ration a day from a week's pack, a waterskin a day, two harmless days without food then 1 a day, water 1d4 from the first day, no healing meanwhile) and the ten terrains of p. 45 with their tables and the leader's save vs. Death Ray with Wisdom off roads.
- the whole bestiary of the manual (pp. 63–162) is in `campagne/torre-mozza/regole/mostri.yaml`: 275 entries, one per printed stat block (a range of hit dice spelled out), with the manual's numbers checked against the PDF by `strumenti/regole/confronta_bestiario.py`, and the special abilities the set's powers cover as data (a ghoul's paralysing claws, a wight's drain, a dragon's breath, a troll's regeneration). A new NPC or minion can be `scheda: {mostro: ghoul}`; Grosso is `mostro: hobgoblin` and Zirrà `mostro: goblin`, each with the numbers that are theirs.
- every level-1 and level-2 cleric and magic-user spell of the manual is a power of the set (37): eight with their effects as data (*sleep*, *charm person*, *shield*, *magic missile*, *cure light wounds*, *bless*, *hold person*, *charm animal*), the others marked `descrittivo`: casting one spends its slot, and the narrator tells what it does from the manual. To give a character a different spell, write its id in the sheet's `incantesimi`.

The manual itself is not in the repository: it would go in `manuali/basic-fantasy-rpg-r142.pdf`. To play the campaign you do not need it:

    scripts/partita.sh torre-mozza

## 9. Copyright

The manual is yours: you use it to play, at home, with your group. It must not be put in the repository or published. The excerpts that end up in a campaign are short quotations for personal use: do not publish them, neither on a website nor in a public channel. The repository contains only the SRD 5.2, which is under the CC-BY-4.0 license (see `CREDITS.md`).

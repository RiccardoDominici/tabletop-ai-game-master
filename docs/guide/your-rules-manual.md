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
- what a natural 20 or 1 does on a d20, critical and minimum damage, the extras of a death save, and initiative rolled again every round.

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

The manual itself is not in the repository: it would go in `manuali/basic-fantasy-rpg-r142.pdf`. To play the campaign you do not need it:

    scripts/partita.sh torre-mozza

## 9. Copyright

The manual is yours: you use it to play, at home, with your group. It must not be put in the repository or published. The excerpts that end up in a campaign are short quotations for personal use: do not publish them, neither on a website nor in a public channel. The repository contains only the SRD 5.2, which is under the CC-BY-4.0 license (see `CREDITS.md`).

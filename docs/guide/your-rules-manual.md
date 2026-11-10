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

A photographed or scanned PDF has no text, and the program cannot read it. You need an OCR first, or a text version of the manual (the publisher often has one). To see how the program reads your file:

    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/<file>

It prints the text divided into sections, each with its page. If a section is missing or split badly, fix the file (or its index) before preparing the campaign.

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
| `riassunto.md` | a summary in plain Italian, for the players (at most 400 words) |
| `estratti/*.md` | the manual's passages to consult, one per rule, with the words used to find them |

The PG (player character) and PNG (non-player character) sheets use the characteristics of your manual, not D&D's. The validator checks the set with the `REGOLE` class:

    python3 -I strumenti/valida_campagna.py campagne/<id> --solo REGOLE

It must finish with no errors. The same check is part of the full campaign check.

**License.** The set carries the license that the Preparer declares in `regole.yaml`. If the manual is not free, the set must be declared with `libera: false`: the `regole/` folder then gets its own `.gitignore`, and the set stays out of the repository. If you are unsure about the license, ask the Preparer before you commit.

## 5. Combat (optional)

The set can describe how a fight works in an optional `combattimento:` section of `regole.yaml`. Without it, the SRD 5.2 combat applies, and the other types get sensible defaults. You write only what you want to change. For a B/X-style set (initiative by side, rolled every round, morale):

```yaml
combattimento:
  iniziativa: {tipo: per_schieramento, dado: 6, caratteristica: null, ogni_round: true}
  fasi:
    - {id: movimento, nome: "Movimento", png: null}
    - {id: proiettili, nome: "Proiettili", png: attacco_distanza}
    - {id: mischia, nome: "Mischia", png: attacco_mischia}
  danni: {modello: pf, a_zero: {pg: morte, png: morte}}
  condizioni: []
  fine: {morale: true}
```

- `iniziativa.tipo`: `individuale` (each combatant rolls, as in the SRD: d20 plus Dexterity), `per_schieramento` (one roll per side), or `nessuna` (no turns).
- `fasi`: the phases of a round, in order. `png` is what the NPCs do on their own in that phase: `attacco_mischia`, `attacco_distanza`, `attacco`, or `null`.
- `danni.a_zero`: what happens at 0 HP, for player characters (`tiri_morte`, `fuori_gioco`, `morte`) and for NPCs (`morte`, `fuori_gioco`).
- `condizioni`: each with an `id`, a `nome`, an `icona`, and `effetti` from a closed list (for example `svantaggio_attacchi` or `perde_turno`). The Engine applies them to the rolls.
- `fine.morale`: with `true`, a side checks morale: 2d6 against the `morale` in the NPC's sheet (7 if it is missing).

For a PbtA-style set, which has no turns, one line is enough: `combattimento: {iniziativa: {tipo: nessuna}}`.

The full schema, with every field and its errors, is in [docs/regole.md](../regole.md), §2. How fights work in general is in `docs/combattimento.md`.

## 6. What the players see

- The **«Regole»** (Rules) button, at the top of the phone, opens the set's summary, with the manual's name, the license, and the attribution if the set has one.
- At the bottom, the **«Chiedi una regola»** (Ask a rule) box. A player writes a question; a fast model answers, in at most eighty words, using only the summary and the manual passages found for the question. The answer is seen only on the phone that asked. One question at a time per phone, with a few seconds' pause between them.
- The answer contains nothing from the story: no scenes, NPCs, or secrets. If the rule is not in the text, it says so and advises asking the Game Master.

The full rules for the box and the panel are in [docs/regole.md](../regole.md), §5.

## 7. If something goes wrong

- **The campaign plays with the SRD 5.2, not with your manual.** The set is not valid, and the server writes this to the log: «set non valido, si gioca con l'SRD 5.2» (set not valid, playing with the SRD 5.2). Run the validator again with `--solo REGOLE` to see which field does not check out.
- **The Preparer says the manual is empty.** The file is a scan with no text: see section 2.
- **«Chiedi una regola» does not answer.** Check that the campaign uses a model (without a model the box is not there), and that the set has passages or a summary.

## 8. Copyright

The manual is yours: you use it to play, at home, with your group. It must not be put in the repository or published. The excerpts that end up in a campaign are short quotations for personal use: do not publish them, neither on a website nor in a public channel. The repository contains only the SRD 5.2, which is under the CC-BY-4.0 license (see `CREDITS.md`).

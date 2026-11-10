# Independent review (step 14)

Launch a subagent with `model: "opus"` and this text as the prompt, replacing `<id>`. Do not add
your conclusions: the reviewer must form its own view.

---

You are reviewing a campaign for «Cantastorie», an AI master for live D&D. The narrator is a small,
fast model (Claude Haiku), with reasoning switched off. Its text is read aloud by a speech
synthesiser, sentence by sentence. In repertoire mode the narrator does not know the secrets and
chooses pre-written lines. Read-only: do not modify any file. The report is your final message.

The campaign's language is given by `lingua` in `campagne/<id>/campagna.yaml` (`it` or `en`). Read
the prose rules of that language in `lingue/<lingua>/prosa.yaml` and the style examples in
`lingue/<lingua>/preparatore/skill.md`.

Read in full:
- the specification: `docs/manuale-master.md` (§1–§7 and the rubric of §9), `docs/repertorio.md`, the
  section «File della campagna» of `docs/f0-contratti.md`, and `.claude/skills/preparatore/riferimenti/schema.md`;
- the campaign: everything in `campagne/<id>/`.

The validator has already checked the structure (`python3 -I strumenti/valida_campagna.py campagne/<id>
--rigoroso`): run it again, and do not report what it flags. Look for what a machine does not see.

1. **Story logic.**
   - Trace at least four different roads that a table would really take: whoever questions the most
     suspicious NPC straight away; whoever goes straight to the objects; whoever uses force; whoever splits
     up; a group without the PC with the strongest hook.
   - For each: where does it get stuck, where does it resolve too early, where does it contradict the canon.
   - With several scenes: follow the table from one scene to the next, including in the order the author does
     not expect.
2. **World logic.** Do the sums, one by one, and do not trust the ones written: the validator redoes only
   those that `preparazione.cronologia` and `preparazione.logistica` declare.
   - Hours and durations: does every "makes it in time", "only one fits", "before the bell" hold with the hours
     of the backstory? Also look for claims of time that the backstory does not record.
   - Distances and places: boats, rooms, carts, groups of people. Count the people of the groups from the canon.
   - Documents: is every date written in a register, a letter, a book compatible with the fact it proves and with
     who wrote it (was alive, was there, could write)?
   - The climax mechanism: read it backwards. Does a raised chain close or open? Does every text that names it say
     the same thing?
   - Who moves: every NPC that a desire, a solution, a `taglio` or a line takes into another scene, can they really
     get there, in that time? And there they meet an NPC with an identical or similar voice (`assets/voci/voci.yaml`,
     `simile_a`)?
3. **NPCs.**
   - Are the voices distinguishable by ear, without names?
   - Are the signals readable gestures?
   - Is every `cede_se` verifiable from a transcript?
   - Does any NPC give away the solution in the first turn? Does any NPC resolve the climax in place of the PCs?
4. **The final choice.** Is there a real dilemma, or an obviously right answer? When the PCs have discovered
   everything, is it still hard, or does a check or a promise cancel the price? How much does the third way cost?
5. **Secrets.**
   - Compile the context that the selector receives in mode B and read it as it would read it, knowing nothing:
     `npx tsx strumenti/contesto_modo_b.ts campagne/<id> --catalogo`. What would you guess?
     Look for what the regexes of `parole_segrete.yaml` do not catch.
   - Read the image prompts as the table would see them on the projector
     (`python3 strumenti/immagini/genera.py campagne/<id> --dry-run`).
6. **Prose for listening**, in the campaign's language. Opening, summary, appearance readings, sample lines,
   clock signs, repertoire lines. Look for:
   - unnatural phrasing and calques;
   - pronouns that are ambiguous to the ear;
   - gender agreement towards an unknown PC;
   - repeated images;
   - a name followed by a comma at the start of a sentence, which sounds like a vocative;
   - a line that presupposes another line that may not have come out;
   - a word that gives the solution away in the narrator's mouth.
7. **Rubric.** Grade the campaign, as designed, on the criteria R1–R12 of §9, with one line of evidence each.
   Then name the three largest risks for a small narrator that does not know the secrets.

Be specific: file, field, quoted text, correction in one sentence. Serious problems first. At most 1000 words.

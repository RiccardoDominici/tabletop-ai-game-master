# Preparatore: examples in English

This file holds the Preparatore's style examples for a campaign in English (`lingua: en`).
`.claude/skills/preparatore/SKILL.md` points here whenever an example is needed. The prose rules (sentences,
clichés, numbers in words, voice and tone) are in `lingue/en/prosa.yaml`: this file gives the examples, that file
gives the rules.

The examples are illustrative: do not copy them into a new campaign.

Status of the validator-facing forms: the validator reads the forms below only in Italian today
(`strumenti/valida/`). The English forms are the intended ones; they become effective when the validator reads
`lingue/en/prosa.yaml` and its English lists. Until then, a campaign in English gets the validator's Italian
checks as warnings or misses, and the review must check these points by hand.

## Campaign id (section «The brief»)

- Example: `the-bridge-of-sighs`.

## Style and tone (step 2)

- Example of a prose rule: "the narrator describes what is seen and never states the cause: the conclusion is
  drawn by the PCs".
- A precise prohibition, in the `come_si_trova` of the main clue: "the narrator never calls the bread poison".

## Clocks and the climax mechanism (step 3)

- A clock sign, in increasing order of danger, with the decisive moment in the last one: "chain raised: the bridge
  is closed".
- The line per state of the mechanism: "chain raised: the bridge is closed".

## Final choice (step 1)

- Reward in disguise: in the snow-wedding trial, "Adelina loses her voice, which passes to Zelia" was exactly what
  Zelia wanted. The price goes on whoever does not want it.

## Privacy and `cede_se` (steps 5 and 7)

- Explicit privacy conditions: "in private", or "where X does not hear", as the scene defines it.
- Privacy markers the validator should recognise (English forms, to be added to the validator's list): "in private",
  "cannot hear", "does not hear", "one-on-one", "in a whisper", "out of earshot", "without witnesses".
- Connective of alternatives in `cede_se`: "or" (and "also gives way" for an extra condition; to be matched by the
  validator, which counts the alternatives).
- In the names and hooks of PCs no secrets: a guild "of the Wave" that reveals the carved wave is the mistake to avoid.

## NPC aliases (step 7)

- The nicknames the players will use, never generic words such as "old man" or "girl" (the validator flags generic
  names).

## Sentence measure in `voce.stile` (step 7)

- Forms to read (English, to be added to `massimo_da_stile` in `strumenti/valida/testo.py`): "Sentences of two to
  six words", "3-8 words", "from three to eight words", "at most six words". The validator derives the ceiling for
  the NPC's lines from it.

## Forbidden words in the `quando` (step 9 and rule 1)

- The `quando` does not say who lies, hides or confesses. Stems to forbid (English, to be added to
  `QUANDO_VIETATE`): lie / lies / lying / liar / lied, confess, secret, hide / hides / hidden, truth.
- In the `id` of a line, words that reveal who lies or what is true (to be added to `ID_RIVELATORI`): version,
  true, truth, lie, liar, secret, false, guilt, guilty, thief, hides, reveals, unmasks, confesses.

## Voice in the lines (step 9)

- Direction in square brackets, after the label, brief: `[png_bruno] [offended, quietly] Don't touch that door.`
- A whisper closed in the same line: `<whisper>…</whisper>`.

## Secret words (step 10)

- A catalogue line to read as a sentence: "zel stain taken" says who was responsible.

## Reading aloud (step 13)

- A name followed by a comma at the start of a sentence, which sounds like the narrator calling someone: "Tullio, the
  caretaker, shouts" becomes "The caretaker, Tullio, shouts from the gatehouse".
- A singular "you" that sounds plural.
- A pronoun assumed for a PC whose gender is not in the sheet: "he" or "she" addressed to a PC who may be played by
  anyone. Name the PC, or use "you".
- A line that cites what only another optional line introduced: "The mule, no."
- Letters, diaries and songs read by the narrator in indirect speech: "your brother…" sounds addressed to a PC.

## Lines and announcements (rule 6)

- The announcement of the action with the name in the third person, before the line: "Brann lifts the lid."

## Typography

- Quotations in double quotes "…". Ellipses and brackets banned in lines (rule 8).

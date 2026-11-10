# Rules manuals

Put here the rules manual you want to use for a campaign. The file stays on your computer: the
folder is in the `.gitignore` and its content never enters the repository, because manuals are
often under copyright. This file is the only one tracked by git.

## Accepted formats

- **PDF with selectable text** (the most common case: a PDF exported from your word processor or
  downloaded from the publisher). A photographed or scanned PDF has no text: it must first go
  through an OCR, or you need a text version of the manual.
- **Markdown** (`.md`), with titles marked `#`, `##`.
- **Plain text** (`.txt`), with titles on a line by themselves or in the form «Capitolo 3 …»
  (Italian for "Chapter 3 …").

The PDF works as it is: when there is one, the program uses the bookmark index to find the
chapters and the page of each.

## How to use it

1. Copy the file into this folder, for example `manuali/mondo-a-2d6.pdf`.
2. In the campaign brief (`.claude/skills/preparatore/modelli/brief.yaml`) write the field
   `manuale: manuali/mondo-a-2d6.pdf`.
3. Ask to prepare the campaign. The Preparatore (the agent that prepares the campaign) reads the
   manual, writes the rule set in `campagne/<id>/regole/` and uses it for the character sheets and
   for the play session.

Without the `manuale` field, the campaign plays with the SRD 5.2, which is already in the code and
under a free license.

## Checking the extracted text

To see how the program reads the manual, before preparing a campaign, run:

    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/mondo-a-2d6.pdf

It prints the text split into sections, with the page of each one. If a section is missing or is
split badly, the manual is probably scanned or has a wrong index.

## License

The rule set that the program builds from a manual carries the license you declare in
`regole.yaml`. If the manual is not free (`libera: false`), the set stays only on your computer,
with its own `.gitignore`, and the excerpts that end up in a campaign are short quotations, for
personal use. Do not publish them.

For the structure of the set and the rest, see `docs/regole.md`; for the step-by-step path, see
`docs/guide/your-rules-manual.md`.

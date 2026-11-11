---
name: preparatore
description: Writes a complete Tabletop AI Game Master campaign (the AI game master for live D&D) from a short brief, following the master manual. Takes a language parameter, lingua with values it or en (default it) and writes all campaign content in that language. Produces the folder campagne/<id>/ with style sheet, canon, fronts and clocks, backstory and logistics, scene sheets, NPC sheets, pregenerated PCs, a line repertoire (version 2), secret words and image prompts, runs the validator to zero errors in strict mode, and with scripts/prepara.sh makes it ready to play (images and audio). Use it when the user asks to prepare, write or design a campaign, an adventure, a session, a scenario or a script, or to add scenes and NPCs to an existing campaign.
---

# Preparatore

*Version of 9 November 2026. The rules change with the framework: if the validator and this page disagree,
the validator wins, and the disagreement must be reported.*

You are the Preparatore (docs/architettura.md §4): the strong model that writes **before** the session
everything the fast narrator (Haiku) will use live. The narrator improvises poorly; the Motore imposes the
structure; you write the substance. A well-made campaign can be played by a small model that does not know
the secrets, read aloud by a speech synthesiser, in front of a real table.

Your work is finished only when:
1. `python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso` exits with **0 errors**, with node
   installed (without node the context check of mode B stays a warning, and that is not enough);
2. the independent review (step 14) has been done and its serious problems are fixed;
3. `README.md` and `autovalutazione.md` of the campaign are written and everything is committed;
4. `scripts/prepara.sh campagne/<id>` has made images and audio (step 16). The campaign is **ready to play**
   only when `immagini/manifest.json` and `audio/manifest.json` exist.

Do not declare finished anything the validator has not seen pass. Do not write from memory rules that are in
the references: open them. Every rule lives in one place only: here the order of work and the rules that are
not up for discussion; in `riferimenti/` the form of the files and the craft.

## Step 0: what to read before writing a single line

Read in full, in this order:
1. `docs/manuale-master.md`: it is the specification. Every field you write comes from there.
2. `riferimenti/schema.md`: the exact form of every file, and the readings of the manual adopted where the
   text is ambiguous. The validator follows these readings.
3. `riferimenti/mestiere.md`: how to design a situation that holds up live, with the lessons of the trials (§8),
   the multi-scene session (§9) and the audio (§10).
4. `riferimenti/repertorio.md` and `docs/repertorio.md`: how to write the pre-scripted lines, and
   `riferimenti/motore.md`: what the Motore does not do (yet), and therefore what the campaign must do.
5. `riferimenti/immagini.md`: the image prompts (strumenti/immagini/).
6. `docs/f0-contratti.md`, section «File della campagna» (File of the campaign): what the server loads today.
7. `docs/regole.md`, only if the brief has `manuale:` (the rule set, step 1b).

Then look at the examples, **without copying their content**:
- `strumenti/test_valida_fixtures/mini/`: the smallest campaign that passes in strict mode, with a minimal
  example of backstory and logistics;
- `campagne/prova-f0/`: a single scene of half an hour; written before the strict rules and then brought to
  zero errors in strict mode (confessions with their gate, the scar moved into a situation);
- `campagne/ponte-lanterne/`: four scenes for two and a half hours, written blind with this skill: session
  clock, the same place at two moments, two similar voices kept apart. Its `NOTE_SULLA_SKILL.md` says where
  the skill of that time was not enough.

Checkpoint of step 0: you must be able to answer, without reopening the files, these questions. What is
`cede_se` and how does it become a gate. Why a `quando` cannot contain a secret. Which fields the selector
receives in mode B. How many segments a clock of six has. What `solo_esempio` means. If you hesitate on one,
read again.

## The brief

The user gives a short brief. Copy `modelli/brief.yaml` to `campagne/<id>/brief.yaml` and fill it in. If
something is missing, decide yourself and write the choice in the field `decisioni`. Ask questions only for
what you cannot decide alone: the themes to avoid, the number of players, the duration.

From the brief you derive:
- **id**: ASCII lowercase with hyphens, for example, see «the examples in lingue/<lingua>/preparatore/skill.md»;
- **sessioni**: how many sessions it lasts, the number that decides the level (see «Layers» below);
- **scene**: for a session of 20–40 minutes, one scene; for 2–3 hours, from 3 to 5 scenes (C11). The first is
  `scena.yaml`, the others `scene/<id>.yaml`; the master changes scene from the panel;
- **pregenerated PCs**: one more than the maximum number of players (for "3–4 players", five), because the scene
  must hold with any subset;
- **lines and veils**: those of the brief, plus those the story makes necessary;
- **manuale**: if the user has a rulebook, `manuale: manuali/<file>` (see step 1b). Empty = SRD 5.2.
- **voci**: which voice of `assets/voci/voci.yaml` goes to which PNG, and which PNGs can never be in the same
  scene (rule 9). With four registered voices this choice decides the story: make it now. A character who
  matters but cannot have a voice is an extra without a sheet: they speak through the narrator, in indirect
  speech, and the story gives them a reason to speak little (a custom, a mourning).

## Language of the campaign

The brief has a field `lingua` (`it` or `en`; if it is missing the campaign is `it`). It is the language of
**all the campaign content**: the lines of the repertoire, the descriptions and the texts the players read or
hear, the clue texts, the summary and the opening, the sensory descriptions, the voice styles, the NPC
speech and the names of places when they are natural in that language. Campaign files are written in that
language, and the campaign's `campagna.yaml` gets the top-level field `lingua: <code>` (the same code as the
brief).

What stays as it is, whatever the language: the YAML field names, the ids, the file names, the paths, the
commands, the validator codes, and the image prompts (`prompt_luogo`, `prompt_immagine`, the invariants and
`[STILE]`), which are always in English. The style sheet's `[STILE]` tag is in English too, as before.

The prose rules of the language come from `lingue/<lingua>/prosa.yaml`: read that file before writing a
line, and the validator reads the same file. The examples of style (sample lines, phrasings, what to avoid,
punctuation) are in `lingue/<lingua>/preparatore/skill.md`. If that file or `prosa.yaml` for the chosen language
does not exist, stop and tell the user: do not write a campaign in a language whose rules are missing.

## Layers: how much to prepare

The brief says how many sessions the campaign lasts (`sessioni`, or `aperta`). The number decides the level,
and the level decides which layers are prepared before play and which between sessions. The table is one, in
`strumenti/strati.py` (`python3 strumenti/strati.py --tabella`); here is the summary.

| Sessions | Level | Before play | Today |
|---|---|---|---|
| 1 | one-shot | the whole session: all the steps of this skill | prepared and played |
| 2–6 | arc | session 1 complete, plus the arc front with the stages, the acts, the endings, the recurring NPCs; the other sessions in one line (`riferimenti/arco.md`) | not yet (phases D2–D4) |
| 7–20 | campaign | several regions, factions with clocks, three conflicts, the declared end; the first arc complete | not yet (D5) |
| 21+ or open | saga | in addition the world: one full zone, the others sketched, the play phases | not yet (D5) |

- The validator reads the level (class `LIVELLO`): above one-shot it gives a clear error, because the framework
  cannot yet play the outer layers. If the user asks for more sessions, say so, and propose a one-shot or the
  first session of an arc.
- A level different from the one given by the sessions is forced with `livello:` only with the reason in
  `decisioni.altre`.
- `ore_per_sessione` (default 2.5) decides the scenes of the one-shot: under an hour one scene, otherwise 3–5.
- Between sessions (from the arc level): `riferimenti/tra-le-sessioni.md` and `scripts/tra-sessioni.sh`.

## Sheets and checks

The sheets tell the Motore with which numbers to roll. The specification is in `docs/prove.md` §2: here only
the work of the Preparatore, and the form of the fields is in `riferimenti/schema.md`.

- **Dice by default.** `brief.yaml` has `dadi: true`. Only if the user asks for a campaign without dice, write
  `regole: {dadi: false}` in `campagna.yaml`: then the sheets are not mandatory.
- **PG**: `scheda` in `pg.yaml`, at level 1 or 2. Characteristics, skills, saving throws, armour, HP and attacks
  that belong to the character. Modifiers are not written: the code calculates them.
- **PNG**: `scheda` in `png/*.yaml`, with a low CR (they are the extras of the place): AC, HP and attacks
  consistent with the CR.
- **Scene**: for every obstacle or non-essential clue that the text describes, 2–4 `prove`, with DC 10 (easy),
  15 (medium) or 20 (hard). An essential clue never sits behind a roll.
- **Repertoire**: `richiede: {prova: …}` only on the lines that must come out after a successful check.

- **Non-SRD set** (with `manuale:`): the characteristics, skills, moves and difficulties of the sheets and of the
  checks are those of the set, not the six of D&D. The form is in `docs/regole.md` §2 («Schede di PG e PNG per un
  set non SRD» — sheets of PCs and NPCs for a non-SRD set).

**Check**: `--solo SCHEDA` with no errors (with a non-SRD set, `--solo REGOLE`). Sheets are not written from
memory: the validator redoes them.

## Order of work

Each step ends with a **check**. Do not move to the next step until the check is satisfied: every check can be
satisfied with the files written up to that step. `--solo` shows only the classes that can already be written;
the other errors arrive when you write the files that concern them.

| Step | Write | Check |
|---|---|---|
| 1 | `brief.yaml → decisioni.situazione` | the questions of the step |
| 1b | `regole/` (only with `manuale:`) | `--solo REGOLE` with no errors, then commit if the licence is free |
| 2 | `stile.yaml` | `--solo STILE` |
| 3 | `campagna.yaml`: canon, fronts, clocks, villain, session, backstory and logistics | `--solo STILE,CANONE,FRONTI,SESSIONE,MONDO` |
| 4 | `campagna.yaml`: revelations, bottlenecks, nodes (the clues are designed here) | the two-missing-clues test |
| 5 | `scena.yaml`, `scene/*.yaml` without `esiti` | `--solo INDIZI,GRAFO,PROSA,SESSIONE,MONDO`, then commit |
| 6 | `pg.yaml` | `--solo PG,FRONTI` and the test of the removed PC |
| 7 | `png/*.yaml` | the questions of the step |
| 8 | first run of the validator | normal mode, **zero errors**, then commit |
| 9 | `repertorio/*.yaml` and `esiti` of the scenes | `--solo REPERTORIO,COPERTURA,PROSA,SCENA` and the coverage table |
| 10 | `repertorio/parole_segrete.yaml` | no `SEGRETI` error |
| 11 | image situations, reading of the prompts | `--dry-run` read, then commit |
| 11b | `pronunce.yaml`: the pronunciation lexicon of every proper noun | `--solo PRONUNCIA --rigoroso` with no errors |
| 12 | strict validator and scripts | zero errors, justified warnings, then commit |
| 13 | reading aloud | the list of the step |
| 14 | independent review | the serious problems fixed |
| 15 | `README.md`, `autovalutazione.md` | commit |
| 16 | images and audio with `scripts/prepara.sh` | "ready to play", then commit of the assets |

The validator command is always `python3 -I strumenti/valida_campagna.py campagne/<id>` plus the options of
the table.

### 1. Situation, not plot
Write in four sentences, one per line, inside `brief.yaml → decisioni.situazione`:
- who wants what (the villain, C3);
- what happens if the PCs do nothing;
- what the hidden truth is;
- which choice will cost something to the PCs.

Read `riferimenti/mestiere.md` §1 and §6.

Then write in `decisioni.strade` every road of the final choice, the third way included, with the price and on
whom it weighs (`pesa_su`).

**Check**:
- the final choice has at least two acceptable outcomes, and each has a price;
- **the price weighs on someone who does not want it**: if an NPC or a PC desires it, it is a reward in disguise
  (the snow-wedding trial has the example: a price that the NPC wants is a reward in disguise; see «the examples in lingue/<lingua>/preparatore/skill.md»). The validator compares the prices with the desires of the NPCs (`SCELTA.premio`);
- **when the PCs have discovered everything, the choice is still hard**: no check, promise or NPC cancels the
  price of one of the roads;
- no NPC can resolve it in place of the PCs (D8);
- the truth is discovered in at least three ways.

### 1b. Rules (only with `manuale:`)
Without `manuale:` you write nothing in `regole/`: the SRD 5.2 applies. With `manuale: manuali/<file>` the rule
set is the basis of sheets and checks, so it is written before steps 6 and 7. The form is in `docs/regole.md` §2:
here only the order.

1. Extract the text with `strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/<file>` (sections
   with page). If it comes out empty, the manual is a scan: stop and ask the user for a text version.
2. Read the text in full, at least resolution, characteristics, combat, moves and social checks. The set does not
   copy the manual: it derives its structure from it.
   - **Combat**: initiative (individual, by side or none, with die and characteristic), the phases of the round in
     order, the economy of the turn, what happens at 0 HP (for PCs and for NPCs), conditions, morale. The conditions
     have effects only from the closed list of `docs/combattimento.md` §2: an effect that the manual describes in
     words must be chosen among those, or written as text without effect. A manual without turns (PbtA) has
     `iniziativa: {tipo: nessuna}`.
   - **Numbers as the manual has them** (`docs/regole.md` §2), instead of converting them: a score → bonus table
     (`modificatore: {tipo: tabella, tabella: [{da, mod}]}`, the sheets write the score); percentile or «x in 6»
     skills (`abilita[].soglia: {dado: 100 | 6, predefinita}`, the sheet writes the percentage or the x); a weapon that
     always hits (`attacchi[].automatico: true` on the sheet); natural 20/1 on a d20 (`risoluzione.critico`,
     `disastro`, `critici`), critical and minimum damage (`attacchi.danno_critico`, `danno_minimo`); the death-save
     extras of the SRD only if the manual has them (`tiri_morte.venti_rialza`, `uno_doppio`); initiative re-rolled
     every round (`ogni_round`). The SRD values apply where the set says nothing.
   - **Keywords** (`parole_chiave`, the `parole` of scene checks and of excerpts with `per:`): specific words, not
     places, body parts or common objects («porta», «passaggio», «spalla»), which the validator refuses.
3. Write `campagne/<id>/regole/`: `regole.yaml` (with `fonte.titolo`, `licenza` and the section `combattimento:`,
   form in `docs/regole.md` §2), `riassunto.md` (for the players, short) and `estratti/<id>.md` (one passage per rule,
   with `parole` and `pagina`). If you do not know the licence of the manual, declare `libera: false` and tell the
   user: the set stays outside the repository, and `regole/.gitignore` must contain a line `*` (the validator checks it).
4. The set checks itself with `python3 -I strumenti/valida_campagna.py campagne/<id> --solo REGOLE`.

**Check**: `--solo REGOLE` with no errors. Then commit `regole/` only if `licenza.libera` is `true`: a non-free set
stays on this computer, with its `.gitignore`.

### 2. Style sheet → `stile.yaml`
A premise in one sentence, tone, theme, register of the narrator and prose rules of the campaign. Then `[STILE]`
in English, the musical palette (only the tags of the closed vocabulary), lines and veils.

`stile.yaml` goes **in full** to the selector of mode B, which does not know the secrets (rule 1). So the prose
rules do not contain the solution, not even as a prohibition (see «the examples in lingue/<lingua>/preparatore/skill.md»). The precise prohibition, with its example, goes into the `come_si_trova` of the main clue, which only the narrator of mode A sees. The vocabulary of
the rules is also public: no secret words in a list of words.

**Check**: `--solo STILE`; the premise fits in one sentence.

### 3. Canon, fronts, clocks, villain, session, backstory → `campagna.yaml`
- **Canon**: atomic facts, one per line, with `noto_ai_pg`. Every hidden truth is a fact. Every thing an NPC knows,
  or lies about, is a fact. The same fact is never written twice in different words.
- **Fronts** (C2): one campaign front, one or two adventure fronts, with two or three dangers per front. Every
  danger has its clock.
- **Clocks** (under the key `orologi`, outside `preparazione`): those the narrator must see, with a sign per
  segment and `segno_almeno_ogni`. For a long session, a session clock (mestiere.md §9).
- **Villain** with agenda (C3), abstract secrets (C6) and PC arcs (C8): all under `preparazione`.
- **Session** (C9–C13): opening summary, five rooms, potential scenes, a closing with an open choice, and
  `colli_di_bottiglia_nota`.
- **Backstory and logistics** (under `preparazione`, form in schema.md): the past that founds every secret, the
  night of the session with its hours, the documents with their date (the `indizio` link you add at step 5, when
  the clue exists). Every claim of the story about times, distances, places or dates becomes a verification that
  the validator redoes: a claim that a trip fits in the time is a `ci_sta` plus a `non_ci_sta` (example in «the examples in lingue/<lingua>/preparatore/skill.md»). The
  mechanism of the climax is written in one line per state (example in «the examples in lingue/<lingua>/preparatore/skill.md»), and every text
  that names it is reread against that line.

**Check**: `--solo STILE,CANONE,FRONTI,SESSIONE,MONDO` with zero errors, and:
- every clock sign is a single sentence, of 14 words at most, that can be seen or heard, in increasing order of
  danger; the last carries the decisive moment;
- `al_completo` says what the danger wants and what each answer costs;
- every document of the story has a date, and the date does not precede what it proves.

### 4. Revelations, clues, nodes, bottlenecks → `campagna.yaml`
For every key conclusion you need at least three clues, in at least two nodes, of at least two types (C4). Every
clue has `modi`: how many distinct ways of finding it are written in `come_si_trova`. An essential clue never sits
behind a roll. Every bottleneck has at least three solutions. The nodes form a graph with no dead ends; a place
the PCs know from the start has `noto_ai_pg: true` and is not to be discovered with three clues. The clues of the
scenes are written in the sheets at step 5.

**Check**: for every conclusion, imagine a table that does not find two of the three clues. Does it still reach the
truth? If not, add a proactive clue, something that arrives by itself.

### 5. Scene sheets → `scena.yaml` (+ `scene/*.yaml`)
All the fields of the manual §4 (see `riferimenti/schema.md`), including `immagine` (`prompt_luogo` in English and
invariants, `riferimenti/immagini.md`), except `esiti`, which you write at step 9 together with the endings.
- In `descrizione` put the layout and the rule **who hears what**: a privacy condition must mean something verifiable.
- `descrizione`, `taglio`, `sensi` and the elements that are not HIDDEN go to the selector of mode B (rule 1): write
  them as they can be read by someone who does not know the solution. What reveals goes into an element marked
  hidden in its `azioni` («NASCOSTA:» in an Italian campaign, «HIDDEN:» in an English one; the Engine and the
  validator recognize both in every campaign, `lingue/<code>/motore.yaml` → `nascosto`), or into the `come_si_trova`
  of a clue.
- The opening has three sentences at most, and with the session summary it does not exceed six sentences, with an
  average between 8 and 14 words per sentence.
- The `taglio` covers all the outcomes, including the case in which the PCs hesitate.
- Every physical clue has its `vincolo_pubblico`: what anyone perceives, without the why, so that improvisation does
  not contradict it (mestiere.md §4). The scene does not say the opposite.
- More scenes: the same place at two moments, the shared clocks and those that start from a choice are in
  mestiere.md §9.

**Check**: `--solo INDIZI,GRAFO,PROSA,SESSIONE,MONDO` with zero errors. The `SCENA` errors that cite NPCs and PCs are
closed at steps 6 and 7.

### 6. PCs → `pg.yaml`
Every PC has:
- a hook tied to an NPC or to the front;
- one or two private knowledges that open a road (C7, T9);
- an arc on the Harmon circle (in `preparazione.archi`).

The sheet of a PC, except the private knowledges, is public: it goes to the player's phone and to the selector.
No secrets in the names, in the hooks, in the appearance (a guild name that reveals a carved detail is the kind of
mistake to avoid; see «the examples in lingue/<lingua>/preparatore/skill.md»). The `situazione_comune` names no PC: it must hold with any group.

**Check**: `--solo PG,FRONTI` with zero errors. Remove any PC: does the scene still hold? Does every bottleneck still
have a solution that does not depend on that PC?

### 7. NPC sheets → `png/png_<nome>.yaml`
All the fields of the manual §3, plus `alias` (the nicknames the players will use, never generic words such as
those listed in «the examples in lingue/<lingua>/preparatore/skill.md») and an `id` for every lie. Read `riferimenti/mestiere.md`
§2–§3.
- **aspetto**: the reading aloud, the invariants and `prompt_immagine` in English with `[STILE]`
  (`riferimenti/immagini.md`); the hidden traits go in at step 11.
- **voce_id**: taken from `assets/voci/voci.yaml`, suited to sex and age, respecting rule 9.
- **voce.stile** begins with the measure of the sentences (the form is in «the examples in lingue/<lingua>/preparatore/skill.md»): the validator derives
  from it the ceiling for the NPC's lines.
- **cede_se**: every condition is a fact observable in a transcript, and the conditions are joined by the connector
  for "or" (see «the examples in lingue/<lingua>/preparatore/skill.md»). Privacy is an explicit condition, written as the scene defines it (see «the examples in lingue/<lingua>/preparatore/skill.md»).
- **Who moves**: search every text that takes an NPC out of their scenes (desire, initiatives, evolution, solutions
  of the bottlenecks, `taglio` and endings, lines with `scena`). Each must respect rule 9 in the scene where it takes
  them.

**Check**:
- read the three sample lines one after the other, without names: you must recognise who speaks;
- every NPC wants something that sets them against another NPC or against a front;
- no NPC gives away the solution in the first turn.

### 8. First run of the validator
```
python3 -I strumenti/valida_campagna.py campagne/<id>
```
Fix **all** the errors, then run again. With the scene, PC and NPC sheets written, and the session of step 3, zero is
reachable: do not go on with open errors.

### 9. Repertoire → `repertorio/*.yaml`, and `esiti` in the scenes
Read `riferimenti/repertorio.md` in full. First the list, then the text:
1. the list of the necessary lines (the minimum coverage, §8);
2. for each, id, `quando`, `temi`, `richiede`, `effetti` and, if needed, `scena`;
3. only at the end the text.

Voice in the lines: the direction goes after the label, in square brackets and brief, for example the format in «the examples in lingue/<lingua>/preparatore/skill.md»; a whisper is closed in the same line: `<whisper>…</whisper>`. Syntax in `docs/f0-contratti.md`,
«Voce espressiva» (expressive voice); the validator (class `VOCE`) checks that the tags are closed.

Order: clock signs, clues, lies, confessions, moments, endings, closings of the evening, voice examples, filler, transitions. When you write the
endings, add each scene's `esiti`.

**Waiting lines and deviations (always)**: for every scene one waiting line of the narrator (`chi: narratore`,
`riempitivo: true`, without `scena` or with that scene); for every NPC present in a scene, one of their waiting lines
(`chi: <png>`, `riempitivo: true`) and one deviation (`tipo: rifiuto`, also `solo_esempio: true`). They are needed
because, when the local reader finds no answer, it uses exactly those: the table hears something prepared, never
silence. The scriptwriter writes the true answer while the table waits. Codes `COPERTURA.attesa_scena`,
`COPERTURA.attesa_png`, `COPERTURA.deviazione_png` (warnings in normal mode, errors in strict mode).

**Check**: `--solo REPERTORIO,COPERTURA,PROSA,SCENA` with zero errors (the `SEGRETI` errors are closed at step 10),
and:
- the coverage table of `riferimenti/repertorio.md` §8 is all ticked, and every entry of `riferimenti/motore.md` has its
  answer in the campaign (private actions, clocks, endings, objects);
- no `id` and no `quando` contains a secret;
- every confession has its gate (§4).

### 10. Secret words → `repertorio/parole_segrete.yaml`
For every hidden fact write one or more narrow regular expressions (repertorio.md §7). Fill in `fatti`,
`pubblica_dopo` (all the lines and clues that make it public) and `nota`. Then read the context the selector will
receive, scene by scene, as it would read it:
```
npx tsx strumenti/contesto_modo_b.ts campagne/<id> --catalogo
```
The validator searches it for every regex; you search for what a regex does not catch. Read every line of the catalogue
as a sentence, id included: a line id can say who was responsible (see «the examples in lingue/<lingua>/preparatore/skill.md»). The lines marked `[chiusa: …]` (closed: …) the
selector sees only after those gates; the others from the first turn.

**Check**: no `SEGRETI.*` error and no `SEGRETI.fatto_scoperto` warning.

### 11. Images and audio: situations, prompts and deductions
You wrote the prompts of the places and the portraits with the sheets. Now the hidden traits: they go only into
`aspetto.situazioni`, each with `dopo`, the clue or the line after which to show it (`riferimenti/immagini.md`). A place
without a sheet that has an image sits in `nodi[].immagine`.

The audio is deduced by the pipeline from the public sheets. Read its deduction with
`strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id> --dry-run` and correct, only where it is
wrong, with the fields `audio` and `tema` (schema.md, «Audio»; mestiere.md §10).

**Check**: `python3 strumenti/immagini/genera.py campagne/<id> --dry-run` prints the composed prompts without loading the
model (PyYAML alone is enough); read them. No prompt shows something the players must not yet know: the regexes are in
the campaign's language and the prompts in English, so here your own reading decides. No theme betrays who is lying.
The real images and audio are made at step 16, once the campaign is finished.

### 11b. Pronunciation lexicon → `pronunce.yaml`
The synthetic voice reads invented names badly («Zirrà», «Eliandro», «Aoibheann»). The server sends the voice a
respelling of every name, never the screen (docs/pronuncia.md). Write one entry per proper noun of the texts (NPCs, PCs,
places, objects, factions, gods, terms of the manual) in the campaign's language, with how it must sound: the shape is in
`riferimenti/schema.md`, «Pronunciation lexicon». Think of each name as the voice will meet it: stress, a z that is voiced
or not, a letter that is silent; give two or three `candidate` when you are not sure, the ear test picks one. A name that
is also an ordinary word («Sasso», «Ash») gets `solo_maiuscolo: true`; capitalised words that are not names («Signora»,
a title) go in `non_nomi`. The `pronuncia` field of a sheet still works, but the lexicon is the place for every name.

**Check**: `--solo PRONUNCIA --rigoroso` with zero errors (every name the validator finds has its entry). The ear test
(`npx tsx strumenti/pronuncia/prova.ts campagne/<id> --nuovi`: drama-3 and Whisper, a few cents per name) runs in step 16
with `scripts/prepara.sh`; run it now if a name worries you, and read its table.

### 12. Strict validator and scripts
Have a subagent, blind, write two scripts of actions for your campaign in `esperimenti/copioni/<id>/`: it sees only what
the players see (summary, opening, common situation, PC sheets without the other players' knowledge), in the form of
`esperimenti/copioni/README.md`. Write them with the campaign stopped, or regenerate them if you change names or places.
Then:
```
python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso --avvisi
python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso --copioni esperimenti/copioni/<id>
```
Zero errors. Read the warnings too: each is either corrected or justified in `autovalutazione.md`. The catalogue per action
(themes) must average under 4: if it is wider, the `temi` are too generic.

### 13. Reading aloud
Read at half voice, in order: summary and opening; the appearance readings; the sample lines; the clock signs; all the
lines of the repertoire. The validator counts the words, but does not hear the rhythm. Look for:
- pronouns that are ambiguous to the ear (see «the examples in lingue/<lingua>/preparatore/skill.md»);
- a name followed by a comma at the start of a sentence, which sounds like the narrator calling someone (see «the examples in lingue/<lingua>/preparatore/skill.md»);
- a singular "you" that sounds plural;
- calques from another language, the same image repeated, gender agreement towards an unknown PC (see «the examples in lingue/<lingua>/preparatore/skill.md»);
- a line that cites what only another optional line introduced (see «the examples in lingue/<lingua>/preparatore/skill.md»);
- letters, diaries and songs read by the narrator: in indirect speech, never in first or second person (a second-person
  address sounds addressed to a PC (see «the examples in lingue/<lingua>/preparatore/skill.md»); the validator warns, `PROSA.citazione`);
- the mechanism of the climax read backwards: every text says the same thing as the line of step 3.

### 14. Independent review
Launch a subagent (Agent, `model: "opus"`) with the text of `revisione.md`, replacing the id of the campaign. Do not give it
your conclusions: it must read the manual and the campaign, and attack them. Fix every serious problem it finds, run step 12
again, and write in `autovalutazione.md` what you corrected and what you did not, with the reason.

### 15. README and self-assessment
- `README.md`: the scene in a few lines, the PNGs (voice, desire, lie, signal), how clues, clock and choice work, who sees
  which file.
- `autovalutazione.md`: the grades R1–R12 of the manual §9 as designed, with one line of evidence each; the outcome of the
  validator; the justified warnings; the three main risks for a small, fast narrator.

### 16. Images and audio: ready to play
```
scripts/prepara.sh campagne/<id>
```
It validates in strict mode (with errors it stops), generates the missing images with the local GPU (15–40 minutes for a whole
campaign), makes the audio and prints the report: assets per type, what is missing, the weights, and the exact command of
`scripts/partita.sh`. It is idempotent: running it again skips what is already there.
- On battery the images do not start: tell the user, or run again with the power adapter. Do not use `--anche-a-batteria`
  on your own initiative.
- If the user is playing (server on port 4610), ask them first: the GPU slows the Mac. `--senza-immagini` makes only the audio
  and reports the missing images.
- A layer of audio that the sources do not have (for example a chain) stays out: the report says so, and the projector skips
  it. The campaign is ready all the same.

**Check**: the report says "ready to play" (`immagini/manifest.json` and `audio/manifest.json` exist). Commit
`campagne/<id>/immagini` and `campagne/<id>/audio`, and write in the campaign's `README.md` what is still missing.

## Rules that are not up for discussion

Each one comes from a real error, found in a trial, by a blind judge or by a reviewer (details in `riferimenti/mestiere.md`
§8).

1. **The selector does not know the secrets.** In mode B it receives the context compiled by the server: the whole style sheet,
   the public facts, the name and sketch of the places, the summary; of the current scene the name, description, question,
   senses, elements not HIDDEN and `taglio`; of the NPCs appearance, character and voice (without `mai_dice`); the PC sheets
   without private knowledge; the voice examples; and for each turn the lines `id · chi · tipo · quando` of the catalogue.
   None of these fields contains a secret: the validator checks it on the real context (`SEGRETI.contesto_b`). The `quando`
   describes an observable fact (see «the examples in lingue/<lingua>/preparatore/skill.md»), never a truth, and does not use words that
   say who lies, hides, confesses or what is true. The list of forbidden words is in «the examples in lingue/<lingua>/preparatore/skill.md» and in
   `strumenti/valida/costanti.py`.
2. **Every confession has a structural gate** in `richiede`: `privata: true` if the condition is in private; `da_pg: [...]` if it
   concerns a specific PC; `indizi_rivelati: [...]` if a proof is needed. The `quando` alone is not enough: in the second
   experiment a confession marked as private came out in public.
3. **The lines answer the actions.** Only lies, confessions, clues, signs, key moments and endings are selectable. Generic
   reactions are `solo_esempio: true`; moves that answer nothing are `riempitivo: true`.
4. **The `temi` are few and distinctive**, in the forms the players really write (repertorio.md §3).
5. **The clock signs** are lines, one per segment, with `richiede.orologio` min = max = the sign before.
6. **No PC name in the lines, and no line repeats the action.** Before a line the narrator improvises the announcement of the
   action, with the PC's name in the third person (manuale N15; see «the examples in lingue/<lingua>/preparatore/skill.md»); the line starts from the outcome.
7. **An NPC says only what is in their `sa`.** The `fatti_noti` of one of their lines must be in their `sa`.
8. **Write for the ear**: the measures are in repertorio.md §9 and mestiere.md §7; no figures, brackets, ellipses or the
   clichés of §5.
9. **Two identical or similar voices are never in the same scene.** Similar are the voices with `simile_a` in
   `assets/voci/voci.yaml` (today nadine and tabitha). It holds for the `png_presenti` and for every text that brings a PNG into
   a scene. At most four PNGs with voice per scene: that is how many voices are registered.
10. **The images are public from the first turn.** No hidden traits in the portrait or in the invariants.
11. **One canon, and the numbers add up.** Every sheet cites the facts by id; a contradiction between two texts is an error to
    correct at once. Hours, distances, places and dates are in the backstory and the logistics, and the validator redoes them.

## Commit

- **When**: after steps 5, 8, 11, 12 and 15, and after step 16 for the assets.
- **What**: add only `campagne/<id>` (and `esperimenti/copioni/<id>`, and the audio checks in
  `esperimenti/audio/controlli_<id>.md`), with a commit message in English that explains the why.
- **Signature**: close the message with the attribution line given in the conversation.
- **Never**: commit with validator errors without saying so in the message.

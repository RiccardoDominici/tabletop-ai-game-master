# Creating a campaign

What you will find here: how a new campaign is born, from the brief to a folder ready to play, with images and audio.
Read first: [installation](installation.md) (tools, Python environments and keys) and [one evening](one-evening.md) (how to play).

## In short

1. Ask the **Preparer** for a campaign. The Preparer is the Claude Code skill that lives in the repository.
2. The Preparer writes the **brief** and then all the campaign files in `campagne/<id>/`.
3. The **validator** checks the campaign until there are no more errors.
4. `scripts/prepara.sh` generates the **images** and the **audio**.
5. You play with `scripts/partita.sh <id>` (see [one evening](one-evening.md)).

The costs of the model calls (Preparer, image checks) are explained in [voice and costs](voice-and-costs.md).

## 1. The Preparer

The Preparer is a strong model that writes, **before** the session, everything the narrator will use live. By
default the narrator's reader is a small local model that only picks the prepared lines (see
[local and API](local-and-api.md#the-local-reader)): the campaign gives it the substance already written.

## Play language

The game plays in Italian or English.

- The campaign has a language: `lingua: en` (or `it`) in the brief. The Preparer writes the whole campaign in that
  language and puts `lingua` into `campagna.yaml`. That language wins for everything the Engine says: the narrator's
  prompt, the turn message, its fixed phrases, the dice keywords, the voices and the validator's prose rules.
- The interface (phones, projector, master panel) follows the configuration language: `lingua: en` in
  `config/locale.yaml` (setup asks for it), or `TAGM_LINGUA=en` for one start. A campaign without `lingua` is
  played in the configuration language.
- What depends on the language lives in `lingue/<code>/` and `prompts/<code>/` (design in `docs/lingue.md`).

The skill lives in `.claude/skills/preparatore/`:

| File | What it is for |
|---|---|
| `SKILL.md` | the order of work, in 16 steps, and the rules that are not up for debate |
| `modelli/brief.yaml` | the brief template to fill in |
| `riferimenti/*.md` | the shape of each file (`schema.md`) and the craft (`mestiere.md`, `repertorio.md`, `immagini.md`, `motore.md`, `arco.md`, `tra-le-sessioni.md`) |
| `revisione.md` | the text for the independent reviewer (a second agent that attacks the campaign) |

The spec for everything is the Game Master manual: [docs/manuale-master.md](../manuale-master.md).

### How you call it

1. Open Claude Code in the repository folder (the root, where `package.json` is).
2. Type `/preparatore` followed by your request, in your own words. For example (the request below asks for
   a one-shot in a mountain village, in winter: a wedding interrupted by snow; mystery, no horror; 3-4 players,
   a two-and-a-half-hour evening):

   ```
   /preparatore Una one-shot in un paese di montagna, d'inverno: un matrimonio interrotto dalla neve.
   Mistero, niente orrore. 3-4 giocatori, una serata di due ore e mezza.
   ```

3. You can also leave out `/preparatore`: if you ask to "prepare a campaign" («preparare una campagna»),
   "write an adventure" («scrivere un'avventura») or "add scenes and NPCs to an existing campaign"
   («aggiungere scene e PNG a una campagna esistente»), Claude Code uses the skill on its own (its description
   in `SKILL.md` says so).

### What it asks you

The Preparer decides almost everything on its own, and writes every choice in the brief, in the `decisioni`
field, with the reason. It only asks you about what it cannot decide for you:

- the **themes to avoid** (lines and veils: see below);
- the **number of players**;
- the **length**.

### How long: today only the one-shot

The number of sessions decides how much is prepared. Today the framework prepares and plays only the **one-shot**
(`sessioni: 1`). If you ask for more sessions, the Preparer tells you and proposes a one-shot or the first session
of an arc. The reason and the status of the work are in [multi-session campaigns](multi-session-campaigns.md).

### What it produces and where it saves it

Everything goes into `campagne/<id>/`. The `id` is lowercase ASCII with hyphens, for example `il-ponte-dei-sospiri`.

| File | What it contains | Who sees it at the table |
|---|---|---|
| `brief.yaml` | the brief and the decisions | nobody: only the person preparing reads it |
| `stile.yaml` | style sheet: premise, tone, prose rules, image style, music, lines and veils | the narrator |
| `campagna.yaml` | fact canon, fronts and clocks, clues, nodes, the session; in `preparazione` the secrets, which never reach the narrator | the narrator, without `preparazione` |
| `scena.yaml` | the first scene | the narrator |
| `scene/<id_scena>.yaml` | the other scenes, if there are any | the narrator |
| `png/png_<nome>.yaml` | a character sheet for each NPC | the narrator; portrait and name on the projector |
| `pg.yaml` | the common situation and the pregenerated PCs (player characters) | each player their own, on the phone |
| `repertorio/*.yaml` | the prepared lines already written, which the narrator chooses in mode B | the narrator |
| `repertorio/parole_segrete.yaml` | the words that must not come out too early | the server (filter) |
| `README.md`, `autovalutazione.md` | summary for the Game Master and the campaign's self-assessment grades | the Game Master |
| `immagini/` | places, portraits, situations, with `manifest.json` | the projector |
| `audio/` | music, themes, ambiences, effects, with `manifest.json` and `crediti.md` | the projector |

Outside the campaign folder the Preparer also writes:

- `esperimenti/copioni/<id>/`: two action scripts written "blind" by another agent, to test the campaign
  (the format is in `esperimenti/copioni/README.md`);
- `esperimenti/audio/controlli_<id>.md`: the audio checks.

The Preparer makes a git commit after the main steps. The commit message is in English and explains the why.

### When it is really finished

The work is finished only when:

1. the validator, in strict mode, gives **0 errors** (with node installed);
2. the independent review is done and its serious problems are fixed;
3. the campaign's `README.md` and `autovalutazione.md` are written and everything is in the commit;
4. `scripts/prepara.sh` has made the images and the audio: `immagini/manifest.json` and `audio/manifest.json` exist.

Only then is the campaign **ready to play**.

### The 16 steps, one line each

You find them in full in `SKILL.md`. Each step ends with a check, and you do not move to the next one until the
check passes.

| Step | What is written | Check |
|---|---|---|
| 1 | the situation, in `brief.yaml → decisioni.situazione` | the questions of the step |
| 2 | `stile.yaml` | validator `--solo STILE` |
| 3 | canon, fronts, clocks, villain, session, history | `--solo STILE,CANONE,FRONTI,SESSIONE,MONDO` |
| 4 | revelations, clues, nodes, bottlenecks | the check of the two missing clues |
| 5 | the scene sheets | `--solo INDIZI,GRAFO,PROSA,SESSIONE,MONDO` |
| 6 | `pg.yaml` | `--solo PG,FRONTI` |
| 7 | the NPC character sheets | the questions of the step |
| 8 | first validator run | zero errors in normal mode |
| 9 | the repertoire and the outcomes of the scenes | `--solo REPERTORIO,COPERTURA,PROSA,SCENA` |
| 10 | the secret words | no `SEGRETI` error |
| 11 | the image prompts and the audio reading | `--dry-run` of the two pipelines |
| 12 | strict validator and action scripts | zero errors |
| 13 | reading aloud | the list of the step |
| 14 | independent review | serious problems fixed |
| 15 | `README.md` and `autovalutazione.md` | commit |
| 16 | images and audio with `scripts/prepara.sh` | "ready to play" |

## 2. The brief

The brief is a short file: it says what you want. The Preparer copies the template and fills it in. If you want
to write it yourself before calling the Preparer, do this:

```
mkdir -p campagne/il-mio-id
cp .claude/skills/preparatore/modelli/brief.yaml campagne/il-mio-id/brief.yaml
```

The first line creates the campaign folder; the second copies the brief template into it.

A real, complete example is `campagne/ponte-lanterne/brief.yaml`.

### Field by field

| Field | What you write | Example (from `ponte-lanterne`) |
|---|---|---|
| `id` | the folder name: lowercase ASCII with hyphens | `"ponte-lanterne"` |
| `titolo` | the title | `"Il ponte delle lanterne"` |
| `richiesta` | your request, in your own words | the text you gave the Preparer |
| `tono` | the tone, in one sentence | `"Mistero di paese sotto la pioggia, caldo e umano…"` |
| `sessioni` | **required**: how many sessions it lasts, or `"aperta"` (open-ended) | `1` |
| `ore_per_sessione` | optional, default `2.5`: under one hour the one-shot has a single scene, otherwise 3 to 5 | (absent: 2.5) |
| `livello` | optional: forces a level different from the one given by the sessions, only with the reason in `decisioni.altre` | (absent) |
| `durata` | a note in words for you; the real number is in `sessioni` | `"una sessione serale, da due ore a due ore e mezza, in quattro scene"` |
| `giocatori` | how many play, a number or a range like `"3-4"` | `4` |
| `dadi` | `true` by default: sheets and checks. `false` only if you want a campaign without dice | (absent) |
| `temi` | the themes of the story | `[debiti e lealtà, …]` |
| `linee` | what **never** enters the game | `"contenuti sessuali"` |
| `veli` | what happens only off-scene, told after the fact | `"annegamento: solo fuori scena"` |
| `ambientazione` | optional: place, era, flavour (fantasy compatible with the SRD) | `"Vadolungo, paese di fiume…"` |
| `vincoli` | your own rules for this story | `"niente combattimento necessario"` |
| `decisioni.scene` | the scene ids; the first is `scena.yaml` | `[scena_ponte_imbrunire, …]` |
| `decisioni.pg` | the ids of the pregenerated PCs | `[pg_dalia, …]` |
| `decisioni.png` | which voice goes to which NPC | `"png_tullio → vincent (…)"` |
| `decisioni.situazione` | four sentences: who wants what; what happens if the PCs do nothing; the hidden truth; the choice that costs | |
| `decisioni.strade` | the paths of the final choice, each with `strada`, `prezzo` and `pesa_su` | |
| `decisioni.altre` | every other choice, with the reason | |

Some rules worth knowing:

- **More PCs than players.** The pregenerated PCs are one more than the maximum number of players: for "3-4 players",
  five. This way the story works with any group. If there are too few, the validator reports it (`PG.numero`).
- **The price falls on whoever does not want it.** Each path of the final choice has a price. If the price looks like
  something an NPC wants, it is a reward in disguise, and the validator reports it (`SCELTA.premio`). At least
  two paths are required (`SCELTA.forma`).
- **Dice.** The `dadi` field of the brief is for the Preparer. The real switch is in `campagna.yaml`:
  `regole: {dadi: false}` removes the requirement for sheets. Details in [dice and sheets](dice-and-sheets.md).
- **Voices.** The recorded voices are in `assets/voci/voci.yaml`. Two identical or similar voices never share the
  same scene, and at most four NPCs with a voice can be in one scene.

To see what level your brief gives:

```
python3 strumenti/strati.py campagne/il-mio-id
```

It prints the level (one-shot, arc, campaign, saga), what that involves, and how many scenes you should expect per session.

## 3. Sessions and scenes

- A **session** is one evening of play. In a one-shot the session is just one and it sits in `campagna.yaml`, under
  the key `sessione`: the summary to read at the start, the five rooms, the possible scenes, and the closing with an open choice.
- At the start, the narrator reads the **opening summary** (`campagna.yaml → sessione.riassunto_iniziale`) and then
  the opening of the first scene.
- A **scene** is a place at a moment. For a session of 20–40 minutes one scene is enough; for 2–3 hours, 3 to 5.
  The first is `scena.yaml`, the others `scene/<id>.yaml`. The same place can come back at two different moments.
- The Game Master moves from one scene to another from the panel (see [the Game Master panel](master-panel.md)).

## 4. The validator

The validator checks a campaign against the Game Master manual. It does not call the network and it writes nothing
into the campaign. It needs Python 3 with PyYAML; for the full check it also needs node.

```
python3 -I strumenti/valida_campagna.py campagne/<id>
```

It checks the campaign in normal mode and prints the errors.

```
python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso --avvisi
```

It checks with the full rules for new campaigns, and it also shows the warnings.

### The options

| Option | What it does |
|---|---|
| `--rigoroso` | full rules for new campaigns: some warnings become errors (confessions without a gate, lies without an id, clues without `modi`, NPCs without `alias`, generic themes, hidden traits in the image prompts) |
| `--avvisi` | also shows the warnings (without it, it only prints how many there are) |
| `--solo CLASSI` | shows and counts only some classes or codes, separated by commas, for example `--solo STILE,CANONE` or `--solo SCENA.voci` |
| `--classi` | lists the error classes and exits |
| `--copioni <cartella>` | measures the catalog per action using the action scripts, for example `esperimenti/copioni/<id>` |
| `--senza-node` | does not compile the real context of mode B: that check stays a warning |
| `--sessione N` | validates the package `sessioni/<nn>/` together with the campaign (multi-session campaigns) |
| `--voci <file>` | another voice register (default: `assets/voci/voci.yaml`) |

Exit code: `0` no errors (warnings do not count), `1` at least one error, `2` wrong arguments.

For those who use it on their own:

- `scripts/partita.sh` runs it in normal mode before every game: with errors, the game does not start;
- `scripts/prepara.sh` runs it in strict mode: with errors, it generates neither images nor audio.

### What it checks

Each rule belongs to a **class**. The exact list is printed by `--classi`:

| Class | What it checks |
|---|---|
| `STRUTTURA` | missing files, unreadable YAML, missing required fields |
| `STILE` | style sheet: premise, tone, lines and veils, image style, music |
| `CANONE` | fact register: unique ids, existing references |
| `PNG` | mandatory NPC sheet and cross-checks |
| `SCENA` | scene or place sheet |
| `INDIZI` | the three-clue rule and bottlenecks |
| `FRONTI` | fronts, dangers, clocks, villain, secrets, arcs |
| `GRAFO` | nodes and links without dead ends |
| `SESSIONE` | strong opening, five rooms, potential scenes, closing |
| `PG` | player characters and private knowledge |
| `SCHEDA` | numeric sheets and checks (attributes, AC, HP, attacks, scene checks) |
| `PROSA` | writing for listening |
| `REPERTORIO` | shape of the prepared lines and references |
| `COPERTURA` | minimum coverage of the repertoire: clues, lies, confessions, signs, endings, voice |
| `SEGRETI` | nothing hidden in public fields or in the selector catalog |
| `IMMAGINI` | image prompts |
| `MONDO` | history and logistics: events in order, document dates, times and capacities |
| `STATO`, `CONTINUITÀ`, `ARCO` | multi-session campaigns (see [multi-session campaigns](multi-session-campaigns.md)) |
| `SCELTA` | the final choice in the brief: prices that fall on whoever does not want them |
| `VINCOLI` | what anyone perceives of a clue, and that the scene does not contradict it |
| `LIVELLO` | length in sessions and the level of the campaign |
| `AUDIO` | explicit audio fields |
| `VOCE` | expressive voice: short directions, known tags closed within the line |

### How to read the messages

Each line has this form:

```
ERRORE  [CLASSE.regola] dove: messaggio
AVVISO  [CLASSE.regola] dove: messaggio
```

The validator prints in Italian: `ERRORE` means error and `AVVISO` means warning.

- An `ERRORE` must be fixed; an `AVVISO` must be read, and either fixed or justified in `autovalutazione.md`.
- `CLASSE.regola` says which part of the manual is violated (the class) and which precise check (the rule).
- `dove` says the file and the field, or the id of the element.
- The message says what is wrong, often with the reason.

Two real lines, from the validator run on `campagne/ponte-lanterne` and on a test folder:

```
AVVISO  [IMMAGINI.nodo] campagna.yaml nodo n_passo: un'uscita di scena.yaml porta qui, ma il luogo non ha immagine (né scheda né immagine.prompt_luogo): sul proiettore resterebbe il luogo di prima
ERRORE  [SEGRETI.campo_pubblico] pg.yaml pg_anna.nome: campo sempre pubblico con «IL_CATTIVO_E_IL_LOCANDIERE»
```

The last line sums everything up: the number of errors per class, the warnings, the mode, and how many scenes, NPCs
and prepared lines there are:

```
campagne/ponte-lanterne: 0 errori (nessuno), 9 avvisi — modo rigoroso, 4 scene, 4 PNG, 135 battute
```

How to proceed:

1. Read the last line: it says which classes have errors.
2. Start with the `STRUTTURA` errors: a missing file or an unreadable YAML prevents checking what it contains.
3. Fix one error at a time and run the validator again.
4. If you write the campaign in pieces, use `--solo` with the classes of the piece you wrote.
5. Before saying "finished", run strict mode with `--avvisi`.

The precise rules for dice and sheets (class `SCHEDA`) are in [docs/prove.md](../prove.md), §2; the shape of
each file is in `.claude/skills/preparatore/riferimenti/schema.md`.

## 5. Ready to play: `scripts/prepara.sh`

```
scripts/prepara.sh campagne/<id>
```

It brings a valid campaign to ready-to-play, in four steps:

1. **strict validator**: it stops if there are errors, and generates nothing;
2. **images**: it generates the missing ones, using the Mac's GPU;
3. **audio**: music, themes, ambiences, effects;
4. **report**: what is there, what is missing, how much it weighs, and the command to play.

The campaign can be given as `campagne/<id>`, as `<id>`, or with the full path.

| Option | What it does |
|---|---|
| `--senza-immagini` | does not generate the images: it only says how many are missing and how many minutes they would take |
| `--senza-audio` | does not run the audio |
| `--anche-a-batteria` | generates the images even on battery (not recommended) |
| `--riprova-audio` | reruns the audio even if it is already complete, to look for the layers the sources did not have |
| `--voce` | also pre-records the repertoire lines with drama-3 (OpenRouter). It costs money; see [lines prepared in advance](#lines-prepared-in-advance) |

Things to know:

- It is **idempotent**: if you run it again, it skips what is already there. The images redo only the missing ones
  and the "old" ones (the file exists, but the sheets have changed).
- **On battery, the images do not start.** Plug in the power adapter and run it again. See [common problems](common-problems.md).
- It does not start the server and does not touch the game's ports (4610 and 4611). But **do not generate images while
  you are playing**: the GPU slows the Mac down.
- An audio layer that the sources do not have (for example a chain) stays out: the report says so, and the
  campaign is ready anyway.
- The log is in `logs/prepara-<id>.log`.

Exit code: `0` ready to play; `1` the campaign has errors; `2` wrong arguments; `3` a step failed or was skipped,
and the campaign is not ready.

To see the status without generating anything:

```
python3 strumenti/stato_preparazione.py campagne/<id>
```

It prints which images and sounds are there, which are missing, how much they weigh, and whether the campaign is ready.

### Hidden NPCs

An NPC can enter the scene without being shown right away. In its file `campagne/<id>/png/<id>.yaml` you write:

```yaml
nascosto: true
```

The narrator knows them and can make them speak, but the projector and the phones do not show them until they
have spoken, or until the Game Master presses **Rivela** (the button's label in the app, meaning "Reveal") on the
panel (see [the Game Master panel](master-panel.md)). Absent, or `false`, means visible from the start.

### Lines prepared in advance

The prepared lines of the repertoire can be voiced before the evening, so they play right away.

```
scripts/prepara.sh campagne/<id> --voce
```

This runs the usual steps and, as step «3b», records the repertoire lines with drama-3 into `cache/audio-fish`. It
needs the OpenRouter key and costs about 2 $ per million bytes of text; the lines already in the cache are not paid
again. Without `--voce` the step is skipped, and the game voices the lines live. With the local Qwen voice, the lines
are recorded with `apps/server/src/strumenti/prerender.ts`, for free. Both commands, and how to estimate the cost
first, are in [the voice](voice.md#lines-prepared-in-advance).

## 6. Images

Images are generated **locally**, on a Mac with an Apple chip, with FLUX.2 klein 4B through mflux. The code is in
`strumenti/immagini/`. There are three types:

- **places** (16:9): one per scene and per place-node;
- **portraits** of the NPCs (3:4);
- **situations** (16:9): the same NPC at another moment, with the portrait as reference. Those declared in the
  sheets (`aspetto.situazioni`) appear on their own when their reveal comes out.

### First time: the environment

```
uv venv --python 3.12 strumenti/immagini/.venv
uv pip install --python strumenti/immagini/.venv/bin/python -r strumenti/immagini/requirements.txt
```

The first line creates the Python environment for the images; the second installs mflux, PyYAML and the Anthropic
SDK (for the visual check). The model weights weigh about 4.6 GB (`strumenti/immagini/motore.py`).
`python3 -I strumenti/configura/configura.py --scarica` downloads them when your profile uses local images (see
[installation](installation.md), step 7).

### Reading the prompts without generating

```
strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/<id> --dry-run
```

It prints the plan and the final prompt of each image, without loading the model and without writing anything.
The system `python3` is fine too, if it has PyYAML, numpy and Pillow (the pixel checks import them at startup).
Read it: no prompt must show anything the players do not yet know.

### Generating

Usually `scripts/prepara.sh` takes care of it. By hand:

```
strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/<id>
```

It generates the missing and old images of the campaign and updates `campagne/<id>/immagini/manifest.json` after each one.
If it is interrupted, run it again: it resumes from where it stopped.

| Option | What it does |
|---|---|
| `--dry-run` | prints the plan without loading the model or writing |
| `--solo luogo` / `ritratto` / `situazione` | only that type (can be repeated) |
| `--id <id>` | only that image (can be repeated), for example `--id ritratto_png_ottavia` |
| `--rifai` | regenerates even if the file already exists |
| `--seme N` | another seed, only together with an `--id` |
| `--no-fp16` | computes in bfloat16 (the default float16 is about 20% faster on M1) |
| `--dim-luogo LxA` | dimensions of places and situations for this run, for example `1280x720` |
| `--controlla` | does not generate: checks the images already made that were never checked |
| `--senza-visione` | no visual check with Claude: only the pixel checks remain |
| `--rifila-esistenti` | does not generate: trims the paper border of the places already made |

### How long

- For a whole campaign, **15 to 40 minutes** of GPU (`scripts/prepara.sh`).
- `prepara.sh` prints the estimate before starting ("about N minutes"). Without earlier measurements, the estimate
  uses about 6 minutes per place or situation and 2 minutes per portrait (`strumenti/stato_preparazione.py`).
- The Mac stays usable but slow. Do not close the lid: `prepara.sh` keeps it awake with `caffeinate`.

### What it checks by itself

Before each image:

- **power**: on battery below 20% it does not start, and mflux stops by itself if the charge drops there;
- **disk**: at least 8 GB free are needed.

After each image, two checks:

1. **pixel** (free, no model): correct size, paper border still visible, image almost empty;
2. **visual**: Claude Haiku looks at the whole image and the four corners. It looks for fake signatures and writing,
   borders, a subject different from the prompt, wrong anatomy, things out of place (rain inside a house), and a
   hidden trait that shows before the reveal. It uses the key `ANTHROPIC_API_KEY`; without a key, the pixel checks remain.

An image with a serious problem is marked **defective** (`difettosa`) and is regenerated with a new seed, up to three
images in all. If even the last one is defective, the best one is kept and marked **to check by hand** («da controllare a mano»):
the `prepara.sh` report lists it, and you look at it yourself.

### Old and orphan images

- If you change a sheet, the image becomes "old" and the next run redoes it.
- If you remove a place or an NPC, the image becomes "orphan": it leaves the manifest and the file goes to
  `immagini/cache/orfane/`.

## 7. Audio

The audio is derived from the campaign's public data, without choosing tracks by hand. The code is in
`strumenti/audio/`, the full explanation in [docs/audio.md](../audio.md). There are four layers:

| Layer | Where it comes from |
|---|---|
| place and mood music | Incompetech (Kevin MacLeod, CC BY 4.0 licence), chosen automatically |
| NPC themes | composed by the code and played with a free SoundFont |
| ambiences (rain, crowd, river…) | local background CC0 or public domain from the Internet Archive, or synthesis |
| effects (bell, door, chain…) | as for the ambiences |

If `FREESOUND_API_KEY` is set (free, optional), CC0 sounds on Freesound are searched too.

### First time: `setup.sh`

```
strumenti/audio/setup.sh
```

It creates the Python environment for the audio (with `uv`) and downloads the GeneralUser GS SoundFont (32 MB) once,
into `cache/audio/soundfont/`, checking its fingerprint. At the end it checks that `ffmpeg` is there. It can be run
again: it skips what is already there.

### Reading the deduction without downloading

```
strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id> --dry-run
```

It prints what the pipeline understood of each place and NPC (mood, energy, time, weather, instruments) and what it
would choose, without downloading or writing anything. If it gets something wrong, fix it in the sheets with the
`audio` and `tema` fields.

### Generating

Usually `scripts/prepara.sh` takes care of it. By hand:

```
strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id>
```

It downloads and prepares the campaign's audio in `campagne/<id>/audio/`. It needs the network (Incompetech, Internet Archive).

| Option | What it does |
|---|---|
| `--dry-run` | prints descriptors and choices, without downloading or writing |
| `--solo musica` / `temi` / `ambienti` | only that layer (can be repeated) |
| `--rifai` | redoes even what already has its file |
| `--senza-rete` | uses only the cache: no download |
| `--aggiorna-catalogo` | downloads the Incompetech catalog again |

### The manifest and the credits

In `campagne/<id>/audio/` you find:

- `manifest.json`: the list of every file with type, place, volume, loop and measurements. It is the contract with
  the projector. It also has the `crediti` list;
- `crediti.md`: the credits in plain text, generated by the pipeline;
- `descrittori.json`: what the pipeline deduced, with the evidence.

Incompetech's music is CC BY 4.0: whoever uses it must credit the author. The projector shows the credits with the
**C** key. If you publish a campaign with its audio, keep `crediti.md` together with the files.

To listen to everything quickly:

```
strumenti/audio/.venv/bin/python strumenti/audio/provino.py campagne/<id>
```

It writes into `esperimenti/audio/` a short preview of a few seconds for each file (`provino_<id>.wav`, outside git)
and the table of checks (`controlli_<id>.md`).

## 8. And now you play

When the `prepara.sh` report says «Pronta da giocare» (ready to play):

```
scripts/partita.sh <id>
```

It checks the campaign, starts the server and prints the addresses for the projector, the phones and the Game Master
panel. The voice is the one of your configuration, by default the local Qwen voice: the alternatives are in
[the voice](voice.md), the costs in [voice and costs](voice-and-costs.md), and the rest of the evening in
[one evening](one-evening.md).

## Problems?

See [common problems](common-problems.md).

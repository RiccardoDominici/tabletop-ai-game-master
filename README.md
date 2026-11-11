# Tabletop AI Game Master

An AI game master for Dungeons & Dragons played in person, around a real table.
Formerly called Cantastorie: the old names that still work are listed in [Legacy names](#legacy-names).

On this page: what Tabletop AI Game Master is, what it can do, what you need and how to start your first game.
Before you read: nothing. This is the page to start from.

## What it is

- **A framework, not a single campaign.** It generates new campaigns (story, scenes, characters, images, music) from
  a short brief, for one evening or for many sessions. The folders in `campagne/` are examples of what it produces.
- **For playing in person.** Everyone sits at the same table. Each player uses their own phone, in the browser.
  The projector shows the place, the characters in the scene and the dice rolls; a speaker plays the voice and the
  music. Whoever runs the game has a Game Master panel on the Mac to correct or stop the narrator at any moment.
- **The code keeps the rules, the dice and the secrets.** The model only narrates: it tells the outcomes, it does
  not decide them.

## What it can do

- **Play around the table.** One command checks the campaign and prints three addresses: the projector, the phones
  (the projector also shows a QR code) and the Game Master panel.
  See [One game night](docs/guide/one-evening.md), [Connecting the phones](docs/guide/phones.md) and
  [The Game Master panel](docs/guide/master-panel.md).
- **Send and Withdraw, with no deadlines.** A player writes an action and sends it («Invia», Send); until the turn
  closes they can change it or take it back («Ritira», Withdraw). If nobody writes, the game waits.
  See [Pace and turns](docs/guide/pace-and-turns.md).
- **Calm or tense pace.** A countdown (25 seconds) exists only at the tense pace («concitato»). The narrator, the
  scene or the Game Master sets the pace. See [Pace and turns](docs/guide/pace-and-turns.md).
- **Pauses and a watchdog.** While the narrator is preparing, the phones can already write the next action. The Game
  Master can pause the table, and a watchdog reopens the turn after 60 seconds with no sign of life.
  See [Pace and turns](docs/guide/pace-and-turns.md).
- **NPC portraits and presence.** The projector shows the portraits of the non-player characters (NPCs) in the scene
  and highlights who is speaking; the phone shows who is here and who is elsewhere. Hidden NPCs appear only when they
  speak or the Game Master reveals them. See [The Game Master panel](docs/guide/master-panel.md).
- **Dice, ability checks and full combat.** The code rolls the dice and decides which check an action needs; the roll
  cards appear on the projector and the phones. Combat has initiative, rounds and phases, conditions, death saves and
  morale. The rules come from the campaign's rule set: the SRD 5.2 by default, or any rulebook.
  See [Dice and character sheets](docs/guide/dice-and-sheets.md).
- **Your own rulebook.** Put your manual in `manuali/` (it stays out of git) and the Preparer turns it into the
  campaign's rule set. On the phone, «Regole» (Rules) shows the set and «Chiedi una regola» (Ask a rule) answers
  only on the phone that asked. The example `torre-mozza` uses Basic Fantasy RPG.
  See [Your rules manual](docs/guide/your-rules-manual.md).
- **Text-to-speech.** The narrator and the NPCs speak with the local Qwen3-TTS voice (the default, free) or with
  drama-3 by Fish Audio through OpenRouter (expressive, pay per use). «Ascolta qui» (Listen here) plays the voice on a
  phone too, and a player's private lines are spoken only on their own phone. Lines can be pre-generated before the
  game. See [Voice](docs/guide/voice.md).
- **Local first, keys optional.** By default everything runs on your Mac: the narrator's reader is a local Qwen3 8B in
  minimal mode (it picks pre-written lines), the voice is local Qwen3-TTS and the dice arbiter is code. Haiku
  (Anthropic) and drama-3 (OpenRouter) are used only when `config/locale.yaml` or a command option asks for them.
  See [Local and API](docs/guide/local-and-api.md).
- **The scriptwriter.** When the local reader finds no pre-written line, Claude Code writes one in the background, on
  the Claude Code subscription of whoever plays, and prepares lines for the next turn.
  See [Local and API](docs/guide/local-and-api.md).
- **Sessions and multi-session campaigns.** A «La volta scorsa…» (Last time…) recap on the projector, a guided closing
  with a warning before the end of the evening, a «Diario» (Diary) on each phone, and the preparation between
  sessions, which starts from what actually happened at the table. See [Evenings](docs/guide/evenings.md) and
  [Multi-session campaigns](docs/guide/multi-session-campaigns.md).
- **Creating a campaign.** In Claude Code, the Preparer skill (`/preparatore`) writes a campaign from your request and
  the validator checks it. Then `scripts/prepara.sh` generates the images and the audio on the Mac, with a quality
  check of the images. See [Creating a campaign](docs/guide/create-a-campaign.md).
- **Two languages: Italian and English.** The interface language is chosen during the setup; the language of the
  story is the campaign's own. See [Creating a campaign](docs/guide/create-a-campaign.md).
- **Setup by pasting a link.** Paste the repository link into Claude Code: it installs, detects your computer,
  downloads what is needed and runs a smoke test. See [Installation](docs/guide/installation.md).
- **Costs.** With the default local choices a game costs 0 USD; the API keys are pay per use.
  See [Voice and costs](docs/guide/voice-and-costs.md).

## What you need

- **Disk.** On an Apple silicon Mac with 16 GB, the local setup needs about **9 GB free** (6.6 GB of models, 2.1 GB of
  Python environments; the image model adds 4.6 GB). A smaller Mac needs about 8 GB. Without local models (text-only,
  with an API key) it needs about 0.2 GB. The setup says this before it downloads anything.

- **A Mac with Apple silicon** (M1 or newer) for the local models: the reader (mlx-lm), the voice (Qwen3-TTS) and
  the images (mflux) all use MLX. The project is sized for 16 GB of RAM; with less, the setup picks a smaller reader
  and turns the images off. On other computers the local reader, voice and images are not supported yet, and the
  rest has not been tested.
- **Node 22 or newer** (the `engines` field in `package.json`).
- **Python 3 with PyYAML**: the campaign validator uses it.
- **uv**, to create the Python environments of the local models; **ffmpeg**, only to generate the audio of a new
  campaign. See the [installation guide](docs/guide/installation.md).
- **API keys**: none is required on an Apple silicon Mac.

| Key | What it is for | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Haiku as narrator and arbiters, when the config asks for it; the visual check of new images | no on Apple silicon; on other computers, for a real narrator |
| `OPENROUTER_API_KEY` | the drama-3 voice (Fish Audio, through OpenRouter) and pre-generating lines with it | no |
| `FREESOUND_API_KEY` | CC0 sounds from Freesound, when generating the audio of a new campaign | no (the key is free) |

## Quick start

Paste this link into Claude Code and ask: "set up this project"

```
https://github.com/RiccardoDominici/tabletop-ai-game-master
```

Claude Code follows the setup skill in `.claude/skills/setup/`: it installs, detects your computer, proposes the local
choices and their cost, asks whether you want optional keys and which language to play in, downloads only what is
needed, runs a smoke test and shows how to start a game.
On an Apple silicon Mac no API key is required. On other computers the local reader and voice are not supported yet,
so a real game needs an Anthropic key. The details are in the [installation guide](docs/guide/installation.md).

### By hand

These steps are for an Apple silicon Mac. They start the test campaign `prova-f0` (one scene, 20–30 minutes,
3 or 4 players).

1. Download the repository and go into its folder.

   ```bash
   git clone https://github.com/RiccardoDominici/tabletop-ai-game-master
   cd tabletop-ai-game-master
   ```

2. Install the Node dependencies (server, web pages and shared package, all in one go).

   ```bash
   npm install
   ```

3. Optional: the keys file. Skip this step to play fully local.

   ```bash
   cp .env.example .env
   ```

   Open `.env` with a text editor and paste each key after its `=` sign. The `.env` file is outside git and must
   never be shared. The code looks for each key first in the environment variable with the same name, then in
   `.env`, and last in an optional fallback file (`apps/server/src/llm/chiavi.ts`).
   A key alone does not change the narrator or the voice: step 5 (`--con-chiavi`) does.

4. Create the Python environments of the local reader and the local voice (this needs `uv`).

   ```bash
   uv venv --python 3.12 services/lettore/.venv
   uv pip install --python services/lettore/.venv/bin/python mlx-lm
   uv venv --python 3.12 services/voce/.venv
   uv pip install --python services/voce/.venv/bin/python -r services/voce/requirements.lock
   ```

   The environment for generating images (`strumenti/immagini/.venv`) is needed only to create new campaigns:
   see the [installation guide](docs/guide/installation.md).

5. Write the choices of this computer and download the models.

   ```bash
   python3 -I strumenti/configura/configura.py --out config/locale.yaml --lingua it
   python3 -I strumenti/configura/configura.py --scarica
   scripts/configura.sh
   ```

   - The first line detects the computer, picks the profile and writes `config/locale.yaml` (not in git).
     `--lingua` is the interface language, `it` or `en` (the example campaigns are in Italian).
     Add `--con-chiavi` to use the keys of step 3.
   - The second line shows the sizes and the free disk, then asks before downloading: about 4.6 GB for the reader
     and 2 GB for the voice; on a 16 GB Mac also 4.6 GB for the image model, skipped while its environment is missing.
   - The third line only checks: keys found, RAM, environments and who does what. It writes nothing.
   - Other choices (Haiku, drama-3, one component at a time): [Local and API](docs/guide/local-and-api.md).

6. Start the game.

   ```bash
   scripts/partita.sh prova-f0
   ```

   The script checks the campaign, starts the local voice and the local model server, builds the pages, starts the
   server (and the scriptwriter, if Claude Code is installed) and at the end prints three addresses.
   The first start of the voice can take a few minutes.

7. Open the three addresses.

   - **Projector**: `http://localhost:4610/schermo`, on the Mac connected to the projector and the speaker.
     Click «Inizia sessione» (Start session): one click is needed to start the audio.
   - **Phones**: `http://<the Mac's address>:4610/telefono`, on the same Wi-Fi. The players scan the QR code on the
     projector.
   - **Game Master panel**: `http://localhost:4610/master?token=…`, printed by the script. Only on this Mac: do not
     give it to the players.

8. At the end of the evening, stop everything (server, voice, local model server and scriptwriter).

   ```bash
   scripts/arresto.sh
   ```

To play without the local voice, use the fake voice (a tone instead of the voice): `scripts/partita.sh prova-f0
--voce finta`. With an OpenRouter key, `--voce fish` uses drama-3.

The other example campaigns are `ponte-lanterne` (four scenes, two to two and a half hours), `nozze-neve` (three
scenes, about two hours) and `torre-mozza` (Basic Fantasy RPG, three scenes, about two hours). All four are written
in Italian. All the options are in [One game night](docs/guide/one-evening.md).

## The guide

The first time, read it in this order.

1. [Installation](docs/guide/installation.md): dependencies, keys, what gets downloaded and how much space it takes.
2. [One game night](docs/guide/one-evening.md): a game from start to finish.
3. [Connecting the phones](docs/guide/phones.md): the network, the QR code, what to do if a phone cannot join.
4. [The Game Master panel](docs/guide/master-panel.md): every section and every command.
5. [Pace and turns](docs/guide/pace-and-turns.md): Send and Withdraw, when a turn closes, the pace, pauses.
6. [Dice and character sheets](docs/guide/dice-and-sheets.md): how checks, combat and character sheets work.
7. [Voice](docs/guide/voice.md): the voices, «Ascolta qui», pre-generated lines, the voice registry, how invented names are pronounced.
8. [Local and API](docs/guide/local-and-api.md): what runs on your computer, the keys, the profiles, the scriptwriter.
9. [Voice and costs](docs/guide/voice-and-costs.md): how much you spend, with figures and dates.
10. [Evenings](docs/guide/evenings.md): the length of an evening, the closing, the recap, the Diary, resuming.
11. [Creating a campaign](docs/guide/create-a-campaign.md): from the brief to a campaign ready to play.
12. [Multi-session campaigns](docs/guide/multi-session-campaigns.md): end of session, the session log, the next one.
13. [Your rules manual](docs/guide/your-rules-manual.md): playing with your own manual instead of the SRD 5.2.
14. [Common problems](docs/guide/common-problems.md): what to do when something goes wrong.
15. [Development](docs/guide/development.md): tests, test instances, how the code is organized.

## For those who want to understand how it is built

- `docs/architettura.md`: the modules, the interfaces, the experiments done.
- `docs/manuale-master.md`: the Game Master's craft rules, enforced by the code.
- `docs/prove.md`: checks and dice (research, character sheet schema, measurements).
- `docs/strati.md`: campaigns for one session or for many.
- `docs/pronuncia.md`: the pronunciation lexicon of the names, its ear test (TTS → Whisper) and the names added during play.
- `docs/da-fare.md`: the things still open.
- `docs/ricerca-voce-drama3.md`: the research behind the drama-3 voice.
- `docs/README.md`: the index of all the design documents.

## What is not there yet

- The microphone: today you play by typing on the phone.
- The local reader, voice and images outside Apple silicon (see `docs/da-fare.md`).
- The conditions and subsystems of a custom rule set (for example sanity or magic) are text only: the Engine does not
  apply them yet (`docs/regole.md`, section «Open»).
- The code license: the repository does not have a license file yet.

The full list of open items is in `docs/da-fare.md`.

## Legacy names

What the rename changed for a setup made with the old name:

- **Environment variables**: the prefix is now `TAGM_` (for example `TAGM_PORTA`). The old `CANTASTORIE_*` names
  still work for now: if `TAGM_X` is not set, the value of `CANTASTORIE_X` is copied to it, and a deprecation warning
  is printed once (`scripts/ambiente.sh` for the scripts, `apps/server/src/variabili-legacy.ts` for the server).
  If both are set, `TAGM_X` wins. The old names will be removed.
- **npm packages**: the workspaces are now `@tabletop-ai-gm/server`, `@tabletop-ai-gm/web` and
  `@tabletop-ai-gm/shared`. In a clone made before the rename, run `npm install` again.
- **The folder**: the name of the clone folder is up to you. The scripts find the root of the repo from their own
  path, so a clone with any folder name works.

## Credits

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
https://www.dndbeyond.com/srd, licensed under the Creative Commons Attribution 4.0 International License.
The credits for music, sounds, voices and images are in `CREDITS.md`.

## Problems?

Go to [Common problems](docs/guide/common-problems.md).

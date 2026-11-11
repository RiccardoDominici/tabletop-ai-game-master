# Installation

On this page: what to install, where to put the keys, what gets downloaded the first time and how much space it takes.
Read this first: the [README](../../README.md), to learn what Tabletop AI Game Master is.

With the default choices everything runs on this computer, for free and with no key: the narrator's reader,
the voice and the dice (see [Local and API](local-and-api.md)). So a game needs steps 1 to 7: the code, the
local reader, the local voice and their models. The keys (step 4) are optional on a Mac with an Apple chip.
Steps 8 and 9 are optional too: they are needed only to generate the images and the audio of a new campaign.

## The short way: let Claude Code do it

Paste the repository link into Claude Code and ask: "set up this project"

```
https://github.com/RiccardoDominici/tabletop-ai-game-master
```

Claude Code follows the setup skill (`.claude/skills/setup/SKILL.md`). In order, it:

1. clones the repository (if you are not in it yet) and runs `npm install`;
2. on a Mac with an Apple chip, creates the Python environments of the reader, the voice and the images;
3. detects your computer (chip, RAM, free disk, tools) with `python3 -I strumenti/configura/configura.py`;
4. explains the proposed local profile and its cost in plain words (see [the profiles](local-and-api.md#the-profiles));
5. asks only two things: whether you want to add optional API keys, and the play language;
6. writes `config/locale.yaml` (not in git) and shows the sizes before downloading the models;
7. runs a smoke test on the test port 4790 (`scripts/fumo.sh`), which never touches the real game;
8. shows how to start a game (`scripts/partita.sh prova-f0`) and how to create a campaign (`/preparatore`).

The keys are never pasted into the chat: you put them in `.env` yourself (step 4 below explains how).
The steps below are what the skill does, written out for anyone who prefers to do them by hand.

## What you need

| What | Why | Required? |
|---|---|---|
| A Mac with an Apple chip | the local reader, the local voice and the images use MLX, which only runs on Apple chips | yes, for the default all-local game. On another computer a real narrator needs an Anthropic key or another local model server (see [Local and API](local-and-api.md#other-local-servers)) |
| Node 22 or newer | server and web pages (`package.json`, `engines` field) | yes |
| Python 3 with PyYAML | the campaign validator (`strumenti/valida_campagna.py`) | yes |
| uv | creates the Python environments for the reader, the voice, the images and the audio | for steps 5, 6, 8 and 9 |
| ffmpeg | checks and encodes the audio (`strumenti/audio/setup.sh`) | only for step 9 |
| Claude Code | the Preparer, to create campaigns, and the scriptwriter during the game (see [Local and API](local-and-api.md#the-scriptwriter)) | optional |

The development Mac runs Node 25 (it is named in `apps/server/src/sessione/archivio.ts`, for the SQLite archive).
A full test with Node 22, the minimum stated in `package.json`: to be verified.

## Step 1. Download the repository

```bash
git clone https://github.com/RiccardoDominici/tabletop-ai-game-master
cd tabletop-ai-game-master
```

- The first line copies the repository into the `tabletop-ai-game-master` folder.
- The second line enters the folder. All commands in this guide start from here, the root of the repo.

## Step 2. Node dependencies

```bash
npm install
```

Installs in one go the server (`apps/server`), the web pages (`apps/web`) and the shared package
(`packages/shared`): they are the "workspaces" in `package.json` at the root.

The `node_modules/` folder that results weighed 235 MB on the development Mac (measured on 9 November 2026).

Run `npm install` again after every update of the repository (`git pull`): when a package changes name, the
server does not start until you do.

## Step 3. Python 3 and PyYAML

The campaign validator runs with the system `python3` and needs PyYAML
(it is declared at the top of `strumenti/valida_campagna.py`). Check that it is there:

```bash
python3 -I -c "import yaml"
```

- If nothing is printed, it's fine.
- If it prints `ModuleNotFoundError`, you need to install PyYAML in your Python.

The scripts call the validator with `python3 -I`: this way Python ignores packages installed only for your user.
PyYAML must therefore be in the Python you use, not in a "per-user" installation.
The right command to install it depends on how you installed Python: to be verified on your Mac.

## Step 4 (optional). The keys

On a Mac with an Apple chip you can skip this step: the game runs without keys. The keys are paid upgrades:
Haiku as the narrator, the drama-3 voice. A key alone changes nothing: you then choose what to use it for with
`scripts/configura.sh` (see [Local and API](local-and-api.md#changing-the-choices)).

1. Copy the key file template.

   ```bash
   cp .env.example .env
   ```

   The `.env` file sits at the root of the repo and is outside git (see `.gitignore`): it must never be committed.

2. Open `.env` with a text editor. Paste each key after its `=`, on its own line:

   ```bash
   ANTHROPIC_API_KEY=la-tua-chiave-anthropic
   OPENROUTER_API_KEY=la-tua-chiave-openrouter
   FREESOUND_API_KEY=
   ```

   They are placeholders: replace them with your real key. Leave empty the line of anything you do not use.

3. Where to get the keys (the addresses are written in `.env.example`):
   - `ANTHROPIC_API_KEY`: https://console.anthropic.com/settings/keys (paid, pay per use). Optional on a Mac with an Apple chip: it gives Haiku as the narrator, and the visual check of the generated images. On another computer it is needed for a real narrator.
   - `OPENROUTER_API_KEY`: https://openrouter.ai/keys (pay per use: top up the credit). Needed for the drama-3 voice.
   - `FREESOUND_API_KEY`: https://freesound.org/apiv2/apply/ (free). Optional: only needed to generate the audio of a new campaign.

### In what order the code looks for keys

The order is the same across the whole repo: in the server (`apps/server/src/llm/chiavi.ts`) and in the Python tools (`strumenti/chiavi.py`).

1. The environment variable with the same name (for example `ANTHROPIC_API_KEY`).
2. The `NOME=` line of the `.env` file at the root of the repo.
3. A fallback file, if you specify it. It is for people who keep their keys in the `.env` of another project:
   - `ANTHROPIC_KEY_FILE=<percorso>` for the Anthropic key;
   - `TAGM_CHIAVE_OPENROUTER=<percorso>` for the OpenRouter key.

   If you do not specify it, the code tries a path on the development Mac (`apps/server/src/config.ts`): on your Mac
   it does not exist, so it is skipped.

Safety rules of the code:
- only the line starting with `NOME=` is read from the file; the other lines are not read;
- if the same line appears twice, it is an error;
- an empty line counts as "key not set", and the next step is tried;
- the value is never printed: the log only says where the key comes from and how many characters it has.

### How to check that the key was found

```bash
scripts/configura.sh
```

It says «trovata» (found) or «non trovata» (not found) for `ANTHROPIC_API_KEY` and `OPENROUTER_API_KEY`, never the value.

When a component uses Anthropic, the server log also says where the key came from:

```bash
grep 'client Anthropic pronto' logs/server.out
```

The line shows `origine` (origin: `ambiente`, `env-radice` or `file-precedente`) and the length of the key, never the key itself.

## Step 5. The local reader

The reader is the part of the narrator that runs every turn: a Qwen3 model, served by mlx-lm on
`127.0.0.1:4613` (see [Local and API](local-and-api.md#the-local-reader)). Only on a Mac with an Apple chip.

```bash
uv venv --python 3.12 services/lettore/.venv
uv pip install --python services/lettore/.venv/bin/python mlx-lm
```

- The first line creates the Python environment of the reader.
- The second installs mlx-lm.

If `uv` is missing, install it first (`curl -LsSf https://astral.sh/uv/install.sh | sh`, as the setup skill says).
The environment weighed 449 MB on the development Mac (measured on 11 November 2026).

## Step 6. The local voice (Qwen3-TTS)

The Qwen voice runs on the Mac, without network. It is the default voice. See [The voice](voice.md).

1. Create the Python environment for the voice service, with Python 3.12.

   ```bash
   uv venv --python 3.12 services/voce/.venv
   ```

2. Install the libraries, with the locked and measured versions.

   ```bash
   uv pip install --python services/voce/.venv/bin/python -r services/voce/requirements.lock
   ```

   Do not update `mlx` and `mlx-audio` on your own: the service uses internal details of mlx-audio 0.6.3
   (written in `services/voce/requirements.txt`).

The environment weighed 474 MB.

## Step 7. The configuration and the models

The setup tool detects the computer, picks the profile and downloads the models.

```bash
python3 -I strumenti/configura/configura.py
python3 -I strumenti/configura/configura.py --out config/locale.yaml --lingua it
python3 -I strumenti/configura/configura.py --scarica
```

- The first shows the computer, the profile and each choice. It writes nothing.
- The second writes the choices of this computer into `config/locale.yaml` (not in git). Use `--lingua en` to play in
  English. Without this file the defaults of `config/predefinita.yaml` apply: they are right for a Mac with 16 GB.
  A Mac with less memory needs the file, for the smaller reader. If the file already exists, it is replaced: look
  at it first.
- The third shows the sizes and the free disk, then asks before downloading. `--scarica --si` downloads without
  asking.

The models go into the Hugging Face cache (`~/.cache/huggingface/hub`). The download uses the environments of steps 5
and 6: if one is missing, its model is skipped. The models:

| Model | For | Size |
|---|---|---|
| `mlx-community/Qwen3-8B-4bit` | the reader, Mac with 16 GB or more | about 4.6 GB |
| `mlx-community/Qwen3-4B-Instruct-2507-4bit` | the reader, Mac under 16 GB | about 3.6 GB |
| `mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit` | the voice | about 2 GB |
| `mflux-community/flux2-klein-4b-mflux-q4` | the images, only if the profile uses them (step 8) | about 4.6 GB |

(Approximate sizes from `strumenti/configura/profilo.py`; the tool reads the real ones from Hugging Face.)

Then test the two services:

```bash
scripts/lettore-avvio.sh
scripts/lettore-arresto.sh
scripts/voce-avvio.sh
scripts/voce-arresto.sh
```

- The first starts the reader on port 4613 and waits until it answers (at most 120 seconds). For the smaller reader,
  add its name: `scripts/lettore-avvio.sh mlx-community/Qwen3-4B-Instruct-2507-4bit`. The log is in `logs/lettore.out`.
- The second stops it.
- The third starts the voice on `127.0.0.1:4611` and waits until it is ready. On the reference Mac it took
  20–22 seconds (measured on 2 November 2026). It waits at most 300 seconds. The voice service never downloads
  anything: the model must already be there. The log is in `logs/voce.out`.
- The fourth stops it.

You do not need to start them before a game: `scripts/partita.sh` does it.

Memory: the voice process was at 2.2 GB at rest, with a peak of 3.5 GB (measured on 2 November 2026,
`services/voce/README.md`). The reader adds the model it loads.

## This is enough to play

With steps 1 to 7 you can play the four example campaigns (`prova-f0`, `ponte-lanterne`, `nozze-neve`,
`torre-mozza`): their images and audio are already in the repo. Everything runs on the Mac. With the keys of step 4
you can also choose Haiku and the drama-3 voice ([Local and API](local-and-api.md)).

Check it with the smoke test:

```bash
scripts/fumo.sh
```

It starts a test server on port 4790 with the scripted narrator and the fake voice, plays a short scripted game and
stops. It never touches the real game. It prints `FUMO OK`, or `FUMO FALLITO` with where to look
(`logs/porta-4790/`).

Continue with [One evening of play](one-evening.md).

## Step 8 (optional). The images

You only need this to generate the images of a new campaign (places, PNG portraits, situations).

1. Create the Python environment for images.

   ```bash
   uv venv --python 3.12 strumenti/immagini/.venv
   ```

2. Install the libraries: `mflux` (the generator), `pyyaml` and `anthropic`.

   ```bash
   uv pip install --python strumenti/immagini/.venv/bin/python -r strumenti/immagini/requirements.txt
   ```

   `anthropic` is used for the visual check: Claude Haiku looks at every generated image. It uses your
   `ANTHROPIC_API_KEY` and so it costs money (a little: see [Voice and costs](voice-and-costs.md)).

3. The model is `mflux-community/flux2-klein-4b-mflux-q4` and weighs 4.62 GB (`strumenti/immagini/motore.py`).
   `python3 -I strumenti/configura/configura.py --scarica` downloads it (step 7) when your profile uses local
   images: a Mac with 16 GB and enough free disk. It goes into the Hugging Face cache, `~/.cache/huggingface/hub`.

4. Test without generating anything: this command says what it would generate, with which prompt, without loading the model.

   ```bash
   strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --dry-run
   ```

Things to know before generating:
- at least 6 GB free on disk are needed, otherwise the generator will not start (`strumenti/immagini/motore.py`; set `TAGM_DISCO_MINIMO_GB` to change it);
- keep the Mac plugged into the power adapter: a whole campaign means 15–40 minutes of GPU
  (`scripts/prepara.sh`), and on battery below 20% the generator refuses to start;
- the environment weighed 1.2 GB on the development Mac.

Usually you do not run `genera.py` by hand: `scripts/prepara.sh` runs it. See
[Creating a campaign](create-a-campaign.md).

## Step 9 (optional). The audio

You only need this to generate the music, the PNG themes and the ambient sounds of a new campaign.

1. Install ffmpeg, if you do not have it. The script uses the system one: it looks for it in the `PATH` or in
   `/opt/homebrew/bin/ffmpeg`.

2. Prepare the audio tool.

   ```bash
   strumenti/audio/setup.sh
   ```

   What it does, in order:
   - creates the Python environment `strumenti/audio/.venv` with uv and Python 3.12;
   - installs `strumenti/audio/requirements.txt` (numpy, pyyaml, tinysoundfont);
   - downloads once the GeneralUser GS SoundFont (32 MB) into `cache/audio/soundfont/` and checks its sha256 fingerprint;
   - checks that ffmpeg is there.

   You can run it many times: it skips what is already there.

3. Test without generating anything.

   ```bash
   strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/prova-f0 --dry-run
   ```

While generating, only the files that are needed are downloaded:
- the Incompetech catalogue and the chosen tracks, in `cache/audio/incompetech/`;
- the CC0 ambient sounds from the Internet Archive, in `cache/audio/pool/`;
- Freesound sounds, only if `FREESOUND_API_KEY` is set.

The sources and licenses are in `docs/audio.md`. The audio is also usually run by `scripts/prepara.sh`.

## What ends up where

Weights measured on the development Mac on 9 November 2026, unless the row says otherwise. None of this is in git.

| What | Where | Size |
|---|---|---|
| Node dependencies | `node_modules/` | 235 MB |
| Reader environment | `services/lettore/.venv/` | 449 MB (11 November 2026) |
| Voice environment | `services/voce/.venv/` | 474 MB |
| Image environment | `strumenti/immagini/.venv/` | 1.2 GB |
| Audio environment | `strumenti/audio/.venv/` | 26 MB |
| Reader model | `~/.cache/huggingface/hub/` | about 4.6 GB, or 3.6 GB for the smaller one (`strumenti/configura/profilo.py`) |
| Qwen voice model | `~/.cache/huggingface/hub/` | 1.99 GB (written in `research/local-tts.md`) |
| Image model | `~/.cache/huggingface/hub/` | 4.62 GB (written in `strumenti/immagini/motore.py`) |
| SoundFont, tracks, sounds, lines pre-recorded with Qwen | `cache/audio/` | 289 MB in total |
| Lines already spoken by drama-3 | `cache/audio-fish/` | 6.4 MB |
| The choices of this computer | `config/locale.yaml` | a few lines |
| Logs, costs, game archive | `logs/` | grows with every game |

## Final check

```bash
python3 -I strumenti/valida_campagna.py campagne/prova-f0
```

It checks the test campaign. If it ends without errors, the basic installation is fine (warnings do not count).
For a check of mode B, the validator also uses Node: without Node, that check becomes a warning
(written in `strumenti/valida_campagna.py`).

Now you can play: [One evening of play](one-evening.md).

## Troubleshooting

Go to [Common problems](common-problems.md).

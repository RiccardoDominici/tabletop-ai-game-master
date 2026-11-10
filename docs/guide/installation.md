# Installation

On this page: what to install, where to put the keys, what gets downloaded the first time and how much space it takes.
Read this first: the [README](../../README.md), to learn what Cantastorie (Tabletop AI Game Master) is.

Steps 1 to 4 are enough to play the three example campaigns. Steps 5 to 7 are optional:
they are needed for the local voice, to generate images, and to generate the audio of a new campaign.

## The short way: let Claude Code do it

Paste the repository link into Claude Code and ask: "set up this project"

```
https://github.com/RiccardoDominici/tabletop-ai-game-master
```

Claude Code follows the setup skill (`.claude/skills/setup/SKILL.md`). In order, it:

1. clones the repository (if you are not in it yet) and runs `npm install`;
2. detects your computer (chip, RAM, free disk, tools) with `python3 -I strumenti/configura/configura.py`;
3. explains the proposed local profile and its cost in plain words (the table is in [profiles](../profili.md));
4. asks only two things: whether you want to add optional API keys, and the play language;
5. writes `config/locale.yaml` (not in git) and shows the sizes before downloading the models;
6. runs a smoke test on the test port 4790 (`scripts/fumo.sh`), which never touches the real game;
7. shows how to start a game (`scripts/partita.sh prova-f0`) and how to create a campaign (`/preparatore`).

The keys are never pasted into the chat: you put them in `.env` yourself (step 4 below explains how).
The steps below are what the skill does, written out for anyone who prefers to do them by hand.

## What you need

| What | Why | Required? |
|---|---|---|
| A Mac with an Apple chip | images and the local voice use MLX, which only runs on Apple chips | yes for images and the Qwen voice; for the rest, to be verified |
| Node 22 or newer | server and web pages (`package.json`, `engines` field) | yes |
| Python 3 with PyYAML | the campaign validator (`strumenti/valida_campagna.py`) | yes |
| uv | creates the Python environments for voice, images and audio | only for steps 5, 6 and 7 |
| ffmpeg | checks and encodes the audio (`strumenti/audio/setup.sh`) | only for step 7 |

The development Mac runs Node 25 (it is named in `apps/server/src/sessione/archivio.ts`, for the SQLite archive).
A full test with Node 22, the minimum stated in `package.json`: to be verified.

## Step 1. Download the repository

```bash
git clone <indirizzo-del-repository> cantastorie
cd cantastorie
```

- The first line copies the repository into the `cantastorie` folder. The public address: to be verified.
- The second line enters the folder. All commands in this guide start from here, the root of the repo.

## Step 2. Node dependencies

```bash
npm install
```

Installs in one go the server (`apps/server`), the web pages (`apps/web`) and the shared package
(`packages/shared`): they are the "workspaces" in `package.json` at the root.

The `node_modules/` folder that results weighed 235 MB on the development Mac (measured on 9 November 2026).

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

## Step 4. The keys

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
   - `ANTHROPIC_API_KEY`: https://console.anthropic.com/settings/keys (paid, pay per use). Required to play with the real narrator.
   - `OPENROUTER_API_KEY`: https://openrouter.ai/keys (pay per use: top up the credit). Needed for the drama-3 voice.
   - `FREESOUND_API_KEY`: https://freesound.org/apiv2/apply/ (free). Optional: only needed to generate the audio of a new campaign.

### In what order the code looks for keys

The order is the same across the whole repo: in the server (`apps/server/src/llm/chiavi.ts`) and in the Python tools (`strumenti/chiavi.py`).

1. The environment variable with the same name (for example `ANTHROPIC_API_KEY`).
2. The `NOME=` line of the `.env` file at the root of the repo.
3. A fallback file, if you specify it. It is for people who keep their keys in the `.env` of another project:
   - `ANTHROPIC_KEY_FILE=<percorso>` for the Anthropic key;
   - `CANTASTORIE_CHIAVE_OPENROUTER=<percorso>` for the OpenRouter key.

   If you do not specify it, the code tries a path on the development Mac (`apps/server/src/config.ts`): on your Mac
   it does not exist, so it is skipped.

Safety rules of the code:
- only the line starting with `NOME=` is read from the file; the other lines are not read;
- if the same line appears twice, it is an error;
- an empty line counts as "key not set", and the next step is tried;
- the value is never printed: the log only says where the key comes from and how many characters it has.

### How to check that the key was found

After the first start (see [One evening of play](one-evening.md)), look for this line in the server log:

```bash
grep 'client Anthropic pronto' logs/server.out
```

The line shows `origine` (origin: `ambiente`, `env-radice` or `file-precedente`) and the length of the key, never the key itself.

## This is enough to play

With steps 1 to 4 you can play the three example campaigns (`prova-f0`, `ponte-lanterne`, `nozze-neve`):
their images and audio are already in the repo. You can use the drama-3 voice (with the OpenRouter key)
or the fake voice. Continue with [One evening of play](one-evening.md).

## Step 5 (optional). The local Qwen voice

The Qwen voice runs on the Mac, without network. It acts as a fallback when drama-3 does not respond,
or as the main voice with `--voce qwen`. See [Voice and costs](voice-and-costs.md).

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

3. The model. It is `mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit` (`services/voce/voce/config.py`) and weighs 1.99 GB
   (`research/local-tts.md`). It must already be in the Hugging Face cache (`~/.cache/huggingface/hub`):
   the service starts with `HF_HUB_OFFLINE=1` and does not download anything by itself (`services/voce/README.md`).

   How to download it the first time: the repo does not say, **to be verified**. One possible way, not yet tested,
   uses the `huggingface_hub` library that the step 2 environment already contains:

   ```bash
   services/voce/.venv/bin/python -c "from huggingface_hub import snapshot_download; snapshot_download('mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit')"
   ```

4. Test the service.

   ```bash
   scripts/voce-avvio.sh
   scripts/voce-arresto.sh
   ```

   - The first command starts the voice on `127.0.0.1:4611` and waits until it is ready. On the reference Mac it took
     20–22 seconds (measured on 2 November 2026). It waits at most 300 seconds.
   - The second command stops it.
   - The log is in `logs/voce.out`.

Memory: the voice process was at 2.2 GB at rest, with a peak of 3.5 GB (measured on 2 November 2026,
`services/voce/README.md`). `scripts/partita.sh` prints the warning "fino a 7 GB di RAM" ("up to 7 GB of RAM").
The environment weighed 474 MB.

## Step 6 (optional). The images

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
   If it downloads by itself at the first generation: **to be verified** (the repo does not say).
   On the development Mac it is in the Hugging Face cache, `~/.cache/huggingface/hub`.

4. Test without generating anything: this command says what it would generate, with which prompt, without loading the model.

   ```bash
   strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/prova-f0 --dry-run
   ```

Things to know before generating:
- at least 8 GB free on disk are needed, otherwise the generator will not start (`strumenti/immagini/motore.py`);
- keep the Mac plugged into the power adapter: a whole campaign means 15–40 minutes of GPU
  (`scripts/prepara.sh`), and on battery below 20% the generator refuses to start;
- the environment weighed 1.2 GB on the development Mac.

Usually you do not run `genera.py` by hand: `scripts/prepara.sh` runs it. See
[Creating a campaign](create-a-campaign.md).

## Step 7 (optional). The audio

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

Weights measured on the development Mac on 9 November 2026, after the three example campaigns. None of this is in git.

| What | Where | Size |
|---|---|---|
| Node dependencies | `node_modules/` | 235 MB |
| Voice environment | `services/voce/.venv/` | 474 MB |
| Image environment | `strumenti/immagini/.venv/` | 1.2 GB |
| Audio environment | `strumenti/audio/.venv/` | 26 MB |
| Qwen voice model | `~/.cache/huggingface/hub/` | 1.99 GB (written in `research/local-tts.md`) |
| Image model | `~/.cache/huggingface/hub/` | 4.62 GB (written in `strumenti/immagini/motore.py`) |
| SoundFont, tracks, sounds, lines pre-recorded with Qwen | `cache/audio/` | 289 MB in total |
| Lines already spoken by drama-3 | `cache/audio-fish/` | 6.4 MB |
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

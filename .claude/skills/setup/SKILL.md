---
name: setup
description: Sets up Tabletop AI Game Master on a fresh computer when the user pastes the repository link and asks to set it up, install it or get it running. Clones the repo if needed, installs Node and Python parts, detects the computer, proposes a local profile with its cost, asks only about optional API keys and the play language, writes the local config, downloads the models, runs a smoke test on a test port and shows how to start a game and how to create a campaign. Use when the user says "set up this project", "install this", "set this up", or pastes https://github.com/RiccardoDominici/tabletop-ai-game-master.
---

# Setup

Goal: a person who pastes the repository link can play, with no key required. Keys are optional upgrades.
Work in English with the user. The game can be played in Italian or in English: the user chooses in step 4.

Run every command from the repository root. Use `python3 -I` for the Python tools (they are stdlib only).

## 1. Get the repository

- If the current folder is not the repo (no `package.json` with `"name": "tabletop-ai-game-master"`), clone it and
  enter it: `git clone https://github.com/RiccardoDominici/tabletop-ai-game-master && cd tabletop-ai-game-master`
- If it is already there, run `git pull --ff-only` only if the user asks. Do not discard local changes.

## 2. Install

**Disk first.** Before installing anything, check the free space (`df -h .`) and tell the user how much each choice
needs on a new computer:
- Apple silicon, 16 GB profile, images on (the default; local reader, voice and images): about **13.5 GB**
  (models 11.2 GB, Python environments 2.0 GB, npm packages 0.2 GB).
- Apple silicon, 16 GB profile, images off: about **7.7 GB** (models 6.6 GB, environments 0.8 GB, npm 0.2 GB).
- Apple silicon under 16 GB (smaller local reader, no images): about **6.6 GB** (an estimate).
- Anything else, text-only with an API key: about **0.2 GB**.
If the free space is below the chosen profile's figure, offer the lighter choice before going on.

- Node 22 or newer is required (`node -v`; tested with Node 25). If missing, tell the user to install Node 22+ and stop.
- `npm install`
- Python 3 is required (`python3 -V`). The campaign validator uses it.
- Local models need the Python environments. Only on Apple silicon (checked in step 3), create them:
  - reader: `uv venv --python 3.12 services/lettore/.venv && uv pip install --python services/lettore/.venv/bin/python mlx-lm`
  - voice: `uv venv --python 3.12 services/voce/.venv && uv pip install --python services/voce/.venv/bin/python -r services/voce/requirements.lock`
  - images: only if the images stay on after step 3 (the default on a 16 GB Mac). Then run:
    `uv venv --python 3.12 strumenti/immagini/.venv && uv pip install --python strumenti/immagini/.venv/bin/python -r strumenti/immagini/requirements.txt`.
    If step 3 turns the images off, skip this environment.
  - If `uv` is missing, install it first (`curl -LsSf https://astral.sh/uv/install.sh | sh`).
- Skip any environment whose step fails and say so; the profile will fall back.

## 3. Detect and explain

- Run `python3 -I strumenti/configura/configura.py`. It prints this computer, the profile and each component.
  It writes nothing. Read it and explain to the user, in plain words:
  - which profile this computer gets and why (chip, RAM, free disk);
  - the local choices: reader, voice, images (or why images are off);
  - images are on by default on a 16 GB Mac, and their model is part of the download (4.6 GB). If the user does not
    want them, they can be turned off: add `immagini: {provider: nessuno}` under `componenti:` in `config/locale.yaml`
    (step 5), and do not create the images environment. Then the download skips the image model. Say that the
    download plan still lists it;
  - "Cost: 0 USD with these local choices" for the default.
- Do not show internal names or key values. Never print or copy a key.

## 4. Ask (only these two questions)

1. **Optional keys.** Say: "Everything runs on this computer for free. You can add optional API keys for a better
   narrator (Anthropic, pay per use) or the drama-3 voice (OpenRouter, pay per use). Do you want to add any?"
   - If yes: tell them to copy `.env.example` to `.env` and paste the key after `=` in their own editor. Do NOT ask
     them to paste the key in this chat. Then run step 5 with `--con-chiavi`.
   - If no: continue without `--con-chiavi`.
2. **Play language.** Say: "Which language do you want to play in: Italian or English?"
   Remember the answer as `it` or `en`. Write it in step 5 with `--lingua <it|en>`: the key `lingua` goes into
   `config/locale.yaml`. It is the language of the phones, the projector and the Game Master panel, and of a campaign
   that does not declare its own (`docs/lingue.md`). If the user picked `en`, say once that the example campaigns in
   `campagne/` are written in Italian, and that the Preparer can write a new campaign in English.

If the computer is not Apple silicon, say plainly: "On this computer the local reader and voice are not supported
yet. Without an Anthropic key the narrator is a scripted test narrator, not a real game. Do you want to add an
Anthropic key now?" Ask that once, then continue.

## 5. Write the config

- If `config/locale.yaml` already exists, show it to the user and ask before overwriting it.
- `python3 -I strumenti/configura/configura.py --out config/locale.yaml --lingua <it|en>` (add `--con-chiavi` if the
  user chose keys).
- Show the file. Do not add values that are not in the file.

## 6. Download

- `python3 -I strumenti/configura/configura.py --scarica` prints the sizes and the free disk, then asks.
- Show the sizes to the user and get a yes. Then run `python3 -I strumenti/configura/configura.py --scarica --si`.
- The "already on disk" lines only count the model cache named in the first line of the plan. On a new computer that
  cache is empty, so the plan is the whole table. For the 16 GB Apple profile with images on: about 11.2 GB
  (reader 4.6 GB, voice 2 GB, images 4.6 GB). With images off: about 6.6 GB (reader and voice only). Say this to the
  user before they confirm.
- The image model is skipped, not downloaded, when the images environment is missing; the reader and the voice still
  download.
- If the plan prints `NOT READY` for the reader or the voice (a Python environment is missing), finish step 2 for that
  component first. A missing images environment is expected when the images are off.
- If it says NOT ENOUGH DISK, nothing is downloaded: tell the user to free space, then run again.
- Nothing is deleted by these commands.

## 7. Smoke test

- Run `scripts/fumo.sh`. It starts a test server on port 4790 with the scripted narrator and the fake voice,
  plays a short scripted game, and stops the server. It never touches ports 4610 or 4611.
- It prints `FUMO OK` on success. If it prints `FUMO FALLITO`, show the last lines it prints and the log paths
  (`logs/porta-4790/fumo.out` and `logs/porta-4790/server.out`), and stop. Do not guess a fix; ask the user.

## 8. Finish

Tell the user, in this order:
1. How to start a real game: `scripts/partita.sh prova-f0` (one scene, 20–30 minutes, 3–4 players). It prints the
   three addresses: projector, phones and the Game Master panel. The Game Master panel is for whoever runs the game.
2. How to create a new campaign: in Claude Code, type `/preparatore` followed by a request in their own words.
   The Preparer writes the campaign in the language of its brief (`lingua: it` or `en`; `it` if missing, so say
   "in English" in the request for an English campaign) and checks it with the validator. Then
   `scripts/prepara.sh campagne/<id>` generates images and audio.
3. Where the choices live: `config/locale.yaml` (not in git), and `docs/profili.md` for what each profile means.

Keep the closing message short. Do not repeat the detection output.

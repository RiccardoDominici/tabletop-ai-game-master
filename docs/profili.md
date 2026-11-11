# Profiles: which local models a computer gets

What this page covers: the fixed table that turns a computer's hardware into the component choices in
`config/locale.yaml`. Read first: [provider](provider.md) (what each provider name means).

The code is `strumenti/configura/profilo.py`. The table is deterministic: the same hardware always gives the
same profile. Nothing here asks a model to decide.

## The table

Rules are checked in order; the first one that matches wins.

| # | Machine | Profile | Reader | Voice | Images | Rules, dice, summary, rule Q&A |
|---|---|---|---|---|---|---|
| 1 | Apple silicon, RAM 15.5 GiB or more (16 GB nominal) | `apple-16` | Qwen3 8B 4 bit (MLX), fallback scripted | Qwen3-TTS local, fallback tone | FLUX.2 klein 4 bit (mflux) **only if** the disk keeps 8 GB free after the downloads; otherwise off | rules; summary and rule Q&A local, fallback rules |
| 2 | Apple silicon, under 15.5 GiB | `apple-piccolo` | Qwen3 4B 4 bit (MLX), fallback scripted | Qwen3-TTS local, fallback tone | off (the model and its peak do not fit comfortably) | as above |
| 3 | Anything else (Linux, Windows, Intel Mac) | `altro` | scripted narrator (not a real game) until a key is added | tone | off | rules |

Notes on the rules:
- **RAM** is read as GiB and rounded to one decimal. A 16 GB Mac reports 16.0.
- **Under 8 GB** on Apple silicon the profile still picks the 4B reader, with a warning: it may be slow.
- **Disk for images** uses the same 8 GB minimum as the generator (`strumenti/immagini/motore.py`, `DISCO_MINIMO_GB`).
  The check happens after the image model's download, so a model already in the cache still needs 8 GB free to generate.
- **Not Apple silicon** has no local reader, voice or images yet. Those are the open items in
  [da-fare](da-fare.md). The reader is then the scripted narrator, which is for trials and not a real game.
  An Anthropic key makes the reader real (see below).

## API keys are offers, never requirements

If a key is found in the environment or in `.env`, the profile lists it as an **optional upgrade**:

| Key | Upgrade | Fallback |
|---|---|---|
| `ANTHROPIC_API_KEY` | reader: Haiku (better prose, pay per use) | local reader, then the scripted one |
| `OPENROUTER_API_KEY` | voice: drama-3 (pay per use) | local voice, then the tone |

The upgrades are applied only with `--con-chiavi`. Without it, the profile stays local and costs 0 USD.
The key values are never printed or written: the detection only records whether each key is present.

## What gets written

`strumenti/configura/configura.py --out <file>` writes a `config/locale.yaml` in the same shape that
`scripts/configura.sh` writes: one line per component, `provider` and `riserve`, each with a comment that
says why. The real `config/locale.yaml` is never written unless `--out` names it. Things to know:
- `--out` writes; without it, the command only prints what it would choose.
- `config/predefinita.yaml` gives the rest (the server URL and the base reader model).

## Commands

```bash
python3 -I strumenti/configura/configura.py                # detect and show the profile; writes nothing
python3 -I strumenti/configura/configura.py --json          # the same, as JSON (detection and profile)
python3 -I strumenti/configura/configura.py --out /tmp/x.yaml   # also write a config file to that path
python3 -I strumenti/configura/configura.py --scarica       # show sizes and free disk, ask before downloading
python3 -I strumenti/configura/configura.py --scarica --si  # download without asking
```

Tests (fake machines, no network, no real downloads):

```bash
python3 -m pytest -q strumenti/configura/
```

## Downloads

`strumenti/configura/scarica.py` downloads only the models the profile needs and that are not in the cache.

- Sizes come from the Hugging Face API. If the network is down, the approximate sizes in `profilo.py` are used and
  marked as estimates.
- It refuses to start when the free disk after the download would drop below 2 GB, or below 8 GB when the
  image model is included.
- Each model is downloaded by the Python environment of its component, which already exists in the repo:
  `services/lettore/.venv`, `services/voce/.venv` or `strumenti/immagini/.venv`. It never creates an environment
  itself; if one is missing it says which installation step to run ([installation](guide/installation.md)).
- Nothing is deleted, in the cache or elsewhere.

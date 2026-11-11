# Local and API

On this page: what runs on this computer and what uses a paid key, the profiles, the local reader, the rules arbiter, the keys, `scripts/configura.sh`, other local model servers, the scriptwriter, and where the logs go.
Read first: [Installation](installation.md). The design is in [docs/provider.md](../provider.md) and [docs/profili.md](../profili.md).

## In short

- **By default everything runs on this computer**, for free, with no key. On a Mac with an Apple chip:
  - the narrator's **reader** is a local Qwen3 8B model, served on port 4613;
  - the **voice** is the local Qwen3-TTS, on port 4611;
  - the **dice** are decided by code, with no model.
- **Keys are optional upgrades.** An Anthropic key gives Haiku as the narrator; an OpenRouter key gives the drama-3 voice. A key alone changes nothing: `config/locale.yaml` (or a flag) must ask for it.
- **The scriptwriter** writes the lines the local reader does not find. It runs on your Claude Code subscription, not on an API key.

## The seven components

The game is split into seven jobs, called components. Each one has a provider: who does that job.

| Component | What it does | Default | Other choices |
|---|---|---|---|
| `lettore` (reader) | reads the turn and decides what the table hears: the narrator | `locale`: Qwen3 8B, minimal mode | `anthropic` (Haiku, full mode), `openrouter`, `openai`, `finto` (scripted narrator, for tests) |
| `arbitro_azioni` | the actions written at the same time: who depends on whom, who gets there first | `regole`: code, no model | `anthropic`, `locale` |
| `arbitro_prove` | what gets rolled: which check, which attack | `regole`: code, no model | `locale` in minimal mode, `anthropic` |
| `riassunto` | «La volta scorsa…» (Last time…) and the summary at the close of the evening | `locale`, fallback `regole` (a summary from the events, with no model) | `anthropic` |
| `regole` | the answers of «Chiedi una regola» (Ask a rule) on the phone | `locale`, fallback `regole` | `anthropic` |
| `voce` | the voice | `locale`: Qwen3-TTS, fallback `finto` (a tone) | `openrouter` (drama-3) |
| `immagini` | the images, only while preparing a campaign | `locale`: FLUX.2 klein with mflux, fallback `nessuno` (an atmosphere background) | `nessuno` |

The providers are: `locale` (this computer), `anthropic`, `openrouter`, `openai` (another OpenAI-compatible server), `regole` (no model: the fixed rules of the component), `finto` (for tests), `nessuno` (off).

With `regole` for the `regole` component there is no model to answer, and the phones do not show the «Chiedi una regola» box (see [Your rules manual](your-rules-manual.md)).

## Where the choices come from

Three layers. The later one wins.

1. `config/predefinita.yaml`: in git, the same for everyone. All local.
2. `config/locale.yaml`: not in git, the choices of this computer. The setup and `scripts/configura.sh` write it. It holds only what changes.
3. The variables `TAGM_<COMPONENTE>`, for one start. For example `TAGM_LETTORE=anthropic` or `TAGM_VOCE=openrouter`.

Each component has a chain: the provider, then its `riserve` (fallbacks). At start the server takes the first one it can use. A provider is skipped when its key is missing, or when a URL is missing.

To see who does what on this computer:

```bash
scripts/configura.sh
```

It prints the RAM, which keys it finds (never their value), whether the local environments are there, and the current choices. It writes nothing.

The server prints the same choices at every start, in `logs/server.out`, on the lines that begin with `PROVIDER:`.

The interface language is set the same way: `lingua: it` or `lingua: en` in `config/locale.yaml`, or `TAGM_LINGUA=en` for one start.

## The profiles

The setup detects the computer and picks a profile (`strumenti/configura/profilo.py`). The first rule that applies wins.

| Profile | Computer | Reader | Voice | Images |
|---|---|---|---|---|
| `apple-16` | Apple chip, 16 GB of RAM or more | Qwen3 8B, 4 bit | local Qwen3-TTS | FLUX.2 klein, only if 8 GB of disk stay free after the downloads |
| `apple-piccolo` | Apple chip, under 16 GB | Qwen3 4B, 4 bit (`mlx-community/Qwen3-4B-Instruct-2507-4bit`) | local Qwen3-TTS | off |
| `altro` | anything else (Linux, Windows, Intel Mac) | scripted narrator: not a real game | fake voice | off |

In every profile the two arbiters are code. On an Apple chip the summary and the rule answers are local; on `altro` they use the fixed rules.

On `altro` there is no local model yet: a real game needs an Anthropic key (`scripts/configura.sh --lettore anthropic`). The cost of every local choice is 0 USD.

## The local reader

The reader is the part of the narrator that runs every turn.

- **The model.** `mlx-community/Qwen3-8B-4bit`, about 4.6 GB, run by mlx-lm. On a Mac under 16 GB, the setup chooses the 4B model.
- **Minimal mode.** A small model does not write the story. For each action it only picks one line from the prepared repertoire, among the few the Engine proposes, or says «nessuna» (none). The short announcement of the action is built by the code, from the first words the player wrote. All the prose comes from the repertoire, and from the scriptwriter (see below). Qwen3's "thinking" is switched off by the scripts.
- **It needs a repertoire.** Minimal mode works in mode B. In mode A (`--modo A`), with no repertoire, the reader switches to full mode: it writes the prose itself, and locally it is much slower.
- **The server.** It listens on `127.0.0.1:4613`. `scripts/partita.sh` starts it by itself when a component uses it, and leaves it on between one start and the next.

By hand:

```bash
scripts/lettore-avvio.sh
scripts/lettore-avvio.sh mlx-community/Qwen3-4B-Instruct-2507-4bit
scripts/lettore-arresto.sh
```

- The first starts the model server with Qwen3 8B and waits until it answers (at most 120 seconds). If it is already running, it does nothing.
- The second starts it with another model. If a different model is loaded, it restarts the server.
- The third stops it, only if the scripts started it.

`scripts/arresto.sh` stops it too, unless you add `--lascia-lettore` (leave the reader).

The reader needs its Python environment and its model:

```bash
uv venv --python 3.12 services/lettore/.venv
uv pip install --python services/lettore/.venv/bin/python mlx-lm
python3 -I strumenti/configura/configura.py --scarica
```

- The first two lines create the environment and install mlx-lm.
- The third shows the sizes and asks before downloading the models of your profile. Download the model before the first game: the start script waits only 120 seconds.

The log is `logs/lettore.out`. A test instance on another port uses the same server on 4613.

**If it stops during a game.** The server notices within about 10 seconds (or at the second failed request), says so
in `logs/server.out` («local model server DOWN»), and restarts it with `scripts/lettore-avvio.sh`. While it is down,
the turns go on: the reader uses the line the Engine's rules point to, or a waiting line, and the arbiters their rules.
When it answers again the log says «local model server UP again», with how long it was down. It tries at most three
times in 15 minutes; then run `scripts/lettore-avvio.sh` yourself. With `avvio: no` (a server you start yourself:
llama.cpp, Ollama) it only tells you.

## The rules arbiter

When a campaign has sheets, the Engine rolls the dice. Someone must first decide *what* is rolled. By default this is code, not a model: the classifier in `apps/server/src/prove/classificatore-regole.ts` reads the action and the scene's checks. It looks at what the character does, not at what they say. When in doubt, it does not roll. How it works for the players: [Dice and sheets](dice-and-sheets.md).

Two alternatives, written in `config/locale.yaml`:

```yaml
componenti:
  arbitro_prove: {provider: locale, modo: minimo}
```

The local model chooses among a few candidate skills (`prove/arbitro-minimo.ts`).

```yaml
componenti:
  arbitro_prove: {provider: anthropic}
```

Haiku decides, with the Anthropic key.

## Keys

| Key | What it unlocks | Needed? |
|---|---|---|
| `ANTHROPIC_API_KEY` | Haiku as the reader, the arbiters, the summary and the rule answers, when the configuration chooses `anthropic`. Also the visual check of the generated images (`strumenti/immagini/visione.py`). | optional on an Apple chip; needed for a real narrator on any other computer |
| `OPENROUTER_API_KEY` | the drama-3 voice, live and pre-generated | optional |
| `FREESOUND_API_KEY` | CC0 sounds from Freesound, when generating the audio of a new campaign | optional, and free |

Where the code looks for a key, in this order (`apps/server/src/llm/chiavi.ts`, `strumenti/chiavi.py`):

1. the environment variable with the same name;
2. the line `NOME=` in the `.env` file at the root of the repo (outside git);
3. a fallback file, if you name one: `ANTHROPIC_KEY_FILE=<path>` for Anthropic, `TAGM_CHIAVE_OPENROUTER=<path>` for OpenRouter.

How to write `.env`: [Installation](installation.md#step-4-optional-the-keys). The value of a key is never printed: the logs say only where it came from and how long it is.

## Changing the choices

`scripts/configura.sh` writes `config/locale.yaml`.

```bash
scripts/configura.sh
scripts/configura.sh --tutto-locale
scripts/configura.sh --api
```

- The first only checks: keys found, RAM, environments, current choices. It writes nothing.
- The second removes `config/locale.yaml`: everything goes back to local.
- The third chooses Haiku for the reader, the two arbiters, the summary and the rule answers, and drama-3 for the voice. The local providers stay as fallbacks.

One component at a time:

```bash
scripts/configura.sh --lettore anthropic --voce openrouter
```

This chooses Haiku as the reader and drama-3 as the voice, and leaves the rest local.

| Option | What it sets |
|---|---|
| `--lettore <provider>` | the reader |
| `--arbitri <provider>` | both arbiters, of actions and of checks |
| `--riassunto <provider>` | the summary |
| `--regole <provider>` | the rule answers |
| `--voce <provider>` | the voice |
| `--immagini <provider>` | the images |
| `--modello-locale <id>` | the local model (an mlx id, or a GGUF for another server) |
| `--url-locale <url>` | the address of another local server (see below) |
| `-h`, `--help` | the help |

The providers it accepts: `locale`, `anthropic`, `openrouter`, `openai`, `regole`, `finto`, `nessuno`.

**Careful: every command that writes rewrites the whole file.** It keeps only the options of that command. Two commands in a row do not add up: give all your choices in one command. It also drops the `lingua` line and the smaller model that the setup wrote. After it, check the file, and add `lingua: en` back by hand if you play in English.

### The setup tool

The setup skill uses `strumenti/configura/configura.py`. You can run it by hand:

```bash
python3 -I strumenti/configura/configura.py
python3 -I strumenti/configura/configura.py --out config/locale.yaml --lingua en
python3 -I strumenti/configura/configura.py --scarica
python3 -I strumenti/configura/configura.py --scarica --si
```

- The first shows the computer, the profile and each choice, with the reason. It writes nothing.
- The second writes the profile into `config/locale.yaml`, with the interface language (`it` is the default). Add `--con-chiavi` to use the keys it finds: Haiku as the reader and drama-3 as the voice.
- The third shows the sizes and the free disk, then asks before downloading the models of the profile.
- The fourth downloads without asking. Use it after you have seen the sizes.

`--json` prints the detection and the profile as JSON. The download uses the Python environment of each part (`services/lettore/.venv`, `services/voce/.venv`, `strumenti/immagini/.venv`): if one is missing, that model is skipped.

## Other local servers

The local provider talks to any server with an OpenAI-compatible API. On a computer without an Apple chip you can use llama.cpp or Ollama.

```bash
llama-server --port 4613 -m <file.gguf>
scripts/configura.sh --url-locale http://127.0.0.1:4613/v1
```

- The first starts llama.cpp on port 4613 (you start it yourself).
- The second points the game at it, and writes `avvio: no`: the scripts will not try to start mlx-lm.

The URL of an Ollama server works the same way. Each component that uses `locale` then talks to your server.

For a remote server, with its own key, use the `openai` provider and write it by hand in `config/locale.yaml`:

```yaml
componenti:
  lettore: {provider: openai, url: https://<server>/v1, modello: <modello>, chiave: NOME_DELLA_VARIABILE}
```

`chiave` is the name of the environment variable that holds the key, not the key.

## The scriptwriter

With the local reader, about one action in two finds no prepared line. The scriptwriter fills that gap: while the players talk, Claude Code writes the missing line, and the reader says it at once. It also writes in advance some lines for the next turn. The design is in [docs/sceneggiatore.md](../sceneggiatore.md).

- **It uses your Claude Code subscription**, through `claude -p`, never an API key. Each request uses some of your quota.
- **When it runs.** `scripts/partita.sh` starts it by itself on the real game (port 4610), if the `claude` command is installed and the narrator is not the scripted one. Without `claude`, the table uses only the prepared lines and the waiting lines.
- **The models.** The line the table is waiting for goes to sonnet; the lines for the next turn go to haiku. `TAGM_SCENEGGIATORE_MODELLO_SUBITO`, `TAGM_SCENEGGIATORE_MODELLO_PROSSIME` and `TAGM_SCENEGGIATORE_MODELLO` (both) change them.
- **On and off.** `TAGM_SCENEGGIATORE=no` switches it off everywhere. On a test port it starts only with `TAGM_SCENEGGIATORE=si`.

By hand:

```bash
scripts/sceneggiatore.sh stato
scripts/sceneggiatore.sh ferma
scripts/sceneggiatore.sh avvia
```

- The first says whether it is running.
- The second stops it.
- The third starts it again.

`TAGM_PORTA=<porta>` in front chooses the instance, as for the other scripts. `scripts/arresto.sh` stops it with the server.

## Where the logs go

| File | What is inside |
|---|---|
| `logs/server.out` | the server, with the `PROVIDER:` lines and «NARRATORE IN USO» (narrator in use) at every start |
| `logs/partita.out` | the last start by `scripts/partita.sh`, including the messages of the reader and the scriptwriter |
| `logs/lettore.out`, `logs/lettore.pid` | the local model server on 4613 |
| `logs/voce.out`, `logs/voce.jsonl` | the local voice service on 4611 |
| `logs/sceneggiatore/sceneggiatore.out`, `sceneggiatore.jsonl` | the scriptwriter: one line per request |
| `logs/costi.jsonl` | the cost of every paid call (see [Voice and costs](voice-and-costs.md)) |
| `logs/porta-<porta>/` | the same files for a test instance (the reader log stays in `logs/lettore.out`) |

The full list of logs: [Common problems](common-problems.md#where-the-logs-are).

## Problems?

Go to [Common problems](common-problems.md).

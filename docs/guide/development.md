# Development

What you will find here: how the repository is built, how the tests are run, how to try on another port without touching the real game, and how to contribute.
Read first: [installation](installation.md), and `CLAUDE.md` at the root of the repository, which sets the rules for those who work on it.

## Repository structure

| Folder | What it contains |
|---|---|
| `apps/server/` | the server: Node and TypeScript, Fastify and Socket.IO. Turns, Haiku narrator, voice, Game Master panel (`src/`), tests with vitest (`test/`) |
| `apps/web/` | the web pages in React and Vite: `/telefono` (players), `/schermo` (projector), `/master` (Game Master panel). End-to-end tests with Playwright in `e2e/` |
| `packages/shared/` | the shared contract: the types of the events and messages between phone, server and screen |
| `services/voce/` | the local voice service in Python (Qwen3-TTS on MLX), with its environment in `services/voce/.venv` |
| `strumenti/` | the Python and TypeScript tools: the validator (`valida_campagna.py` and `valida/`), the layers (`strati.py`), the work across sessions (`tra_sessioni.py`), the state of the assets (`stato_preparazione.py`) |
| `strumenti/immagini/` | the image pipeline (mflux, FLUX.2 klein), with its environment |
| `strumenti/audio/` | the audio pipeline (music, themes, environments, effects), with its environment |
| `scripts/` | the everyday commands: `partita.sh`, `prepara.sh`, `tra-sessioni.sh`, `avvio.sh`, `arresto.sh`, `costi.sh`, `registro.sh`, `voce-avvio.sh`, `voce-arresto.sh`, `trascrizione.mjs` |
| `campagne/` | the campaigns: `prova-f0`, `ponte-lanterne`, `nozze-neve` |
| `prompts/` | the narrator's prompts (`narratore.md`) and the selector's (`selettore.md`), read by the server |
| `assets/voci/` | the voice clips and the `voci.yaml` register |
| `.claude/skills/preparatore/` | the Preparatore skill for Claude Code |
| `docs/` | project docs, contracts, research, and this guide (`docs/guide/`) |
| `esperimenti/` | trials and measurements: blind scripts, judgments, results of the images, the audio and the voice |
| `research/` | the first research and trials on the models, the voice and the music |
| `cache/` | downloaded audio and already-synthesized voice; outside git |
| `logs/` | logs, session archive, screenshots; outside git |

The contracts between the parts (ports, events, narrator protocol, campaign files) are in
[docs/f0-contratti.md](../f0-contratti.md). Whoever changes a contract updates that file.

## Tests

None of these commands starts the game or calls a paid model. The server tests open test servers on ports
chosen by the system, never on 4610 or 4611.

### Server and web pages (vitest)

```
npm test
```

Runs the tests of all the packages that have them: `apps/server` and `apps/web` (with vitest).

```
npm run test -w @cantastorie/server
```

Runs only the server tests (with `-w @cantastorie/web`, only the page tests).

```
npm run typecheck
npm run check
```

The first checks the TypeScript types of all packages; the second does the types and then the tests.

### Python tools (pytest)

You need a `python3` with pytest and PyYAML; for the image tests also numpy and Pillow. The validator test also uses node.

```
python3 -m pytest -q strumenti/test_*.py
```

Runs the tests of the validator, the layers, the work across sessions, the state of the assets, the keys, the
limits of the `Motore` and the documents. The validator test is the slowest: less than a minute.

```
python3 -m pytest -q strumenti/immagini/
```

Runs the tests of the image pipeline, without a model and without network.

```
strumenti/audio/.venv/bin/python strumenti/audio/test_audio.py
```

Runs the tests of the audio pipeline with its environment, without network. If you install pytest in that environment,
`strumenti/audio/.venv/bin/python -m pytest strumenti/audio/test_audio.py -q` is fine too.

### Voice service

```
cd services/voce
.venv/bin/python -m pytest -q
```

Runs the tests of the voice service (text normalization, PCM, voice register, queue and API with a fake engine,
without MLX). The configuration is in `services/voce/pytest.ini`.

### The validator on a test campaign

```
python3 -I strumenti/valida_campagna.py strumenti/test_valida_fixtures/mini --rigoroso
```

Validates the smallest campaign that passes in strict mode: it must give 0 errors.

### End-to-end tests (Playwright)

The end-to-end tests drive a real browser against a server that is already running. **They never use the real game**:
by default they point to a test instance on port 4710 (`apps/web/e2e/percorsi.ts`).

```
CANTASTORIE_PORTA=4710 scripts/avvio.sh --finto --mock
npm run e2e
CANTASTORIE_PORTA=4710 scripts/arresto.sh
```

The first line starts a test server on 4710 with the scripted narrator and the fake voice (no cost); the second
runs the tests; the third stops only that server.

- Many tests want a server running in a specific way (a campaign, a mode, variables): the right command is at the
  top of each file in `apps/web/e2e/*.spec.ts`.
- Some use the real narrator, and so they cost money (for example `partita.spec.ts`): read the header before running them.
- For another port: `E2E_PORTA=4720` (or `E2E_URL`). Screenshots go to `logs/screenshots/`.

## Trials on another port

The real game uses fixed ports. The trials use others, so you can test while someone is playing.

| Port | What | Who uses it |
|---|---|---|
| 4610 | server of the real game (pages, API, Socket.IO), open to the local network | `scripts/partita.sh`, `scripts/avvio.sh` with no variables |
| 4611 | local voice service (Qwen), only on `127.0.0.1` | `scripts/voce-avvio.sh` |
| 4612 | Vite in development, forwards to the server on 4610 | `npm run dev` |
| 4710, 4720, 4730… | test instances | `CANTASTORIE_PORTA=<porta>` |

**Do not touch 4610 and 4611 during trials.** The scripts refuse 4611 and 4612 as test ports.

### How `CANTASTORIE_PORTA` works

`CANTASTORIE_PORTA` is read by the scripts, not by the server. `scripts/avvio.sh` translates it into the `PORT` variable,
which the server reads in `apps/server/src/config.ts` (without `PORT` it is 4610, the constant `PORTA_SERVER` in
`packages/shared/src/eventi.ts`). With a port other than 4610, the scripts:

- write logs and the session archive to `logs/porta-<porta>/`, and build the pages in
  `logs/porta-<porta>/web` (`apps/web/dist`, which serves the real game, is not touched);
- use the fake voice, or drama-3 with `--fish`, **never Qwen**: the service on 4611 belongs to the real game, and the
  Qwen fallback is switched off;
- always start from a new session. To resume the saved one, start with
  `CANTASTORIE_NUOVA_SESSIONE=0 CANTASTORIE_PORTA=<porta> scripts/avvio.sh` (with `partita.sh` on a test port you always
  start again from scratch);
- stop only with the same `CANTASTORIE_PORTA`.

### Examples

```
CANTASTORIE_PORTA=4710 scripts/avvio.sh --finto --mock
```

Starts a test server with the scripted narrator (`--finto`: no call to Anthropic) and the fake voice (`--mock`).

```
CANTASTORIE_PORTA=4710 CANTASTORIE_CAMPAGNA=ponte-lanterne CANTASTORIE_MODO=repertorio scripts/avvio.sh --finto --mock
```

The same, with a campaign and mode B (`repertorio`) of your choice.

```
CANTASTORIE_PORTA=4710 scripts/partita.sh ponte-lanterne --voce finta
```

A complete test game, with the campaign check. Warning: `partita.sh` always uses the real Haiku narrator, so it
costs money (see [voice and costs](voice-and-costs.md)).

```
CANTASTORIE_PORTA=4710 scripts/arresto.sh
```

Stops only the test server on 4710. Without the variable, `scripts/arresto.sh` stops the real game.

```
CANTASTORIE_PORTA=4710 scripts/costi.sh
CANTASTORIE_PORTA=4710 scripts/registro.sh ponte-lanterne
```

Costs and log of the test instance: they read `logs/porta-4710/`.

### Other useful variables

All the server variables are in `apps/server/src/config.ts`. These are the ones most often needed for trying things:

| Variable | What it does |
|---|---|
| `CANTASTORIE_LLM=finto` | scripted narrator, no call to Anthropic (the same as `--finto`) |
| `CANTASTORIE_COPIONE_FINTO=<file>` | the script of the fake narrator |
| `CANTASTORIE_TTS=mock` | fake voice (the same as `--mock`) |
| `CANTASTORIE_CAMPAGNA=<id>` | which campaign in `campagne/` |
| `CANTASTORIE_CARTELLA_CAMPAGNA=<cartella>` | a campaign outside `campagne/`, for example a copy |
| `CANTASTORIE_MODO=improvvisa` / `repertorio` | mode A or mode B |
| `CANTASTORIE_SESSIONE=<n>` | which package of a multi-session campaign |
| `CANTASTORIE_SEME_DADI=<esadecimale>` | repeats the same dice sequence |
| `CANTASTORIE_MASTER_TOKEN=<token>` | a fixed token for the Game Master panel |
| `CANTASTORIE_SESSIONI=<file>` or `off` | where to save the session archive, or whether not to save it |

**Careful with `npm run dev`.** It starts the server in development mode without a test port, so on 4610, and Vite
on 4612. Do not use it while someone is playing.

## Contributing

The full rules are in `CLAUDE.md`, at the root of the repository. In short:

1. **Work on a branch**, not on `main`:

   ```
   git switch -c <nome-del-ramo>
   ```

   Creates a new branch and switches to it.

2. **One step at a time, and verified.** Before moving to the next one, run the tests that touch what you changed.
   If you touch a campaign, run it through the validator.
3. **Small, frequent commits that explain the why**, not just the what. The repository history is in Italian:
   write the commit messages in Italian.
4. **Documents and code go together.** If you change a behavior, update the document that describes it (in `docs/`
   or in the skill). `strumenti/test_documenti.py` checks the sentences that once went out of step.
5. **No secrets in the repository.** Before every commit and every push:
   - check with `git status` and `git diff --cached` what you are about to send;
   - `.env`, `logs/` and `cache/` are already outside git (`.gitignore`): do not force them in;
   - keys are read from the environment, from the `.env` at the root or from a fallback file, and they are never
     printed: do not paste their value into code, documents, commits or logs;
   - logs contain the private actions of the players: do not copy pieces of them into documents.

## Troubleshooting

See [common problems](common-problems.md).

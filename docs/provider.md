# Model providers

## In brief

- By default everything runs locally. Zero cents, no key.
- An API (Anthropic, OpenRouter) is an option. You choose it component by component.
- Two Python environments are needed (`services/lettore/.venv`, `services/voce/.venv`) and the local model.
  `scripts/configura.sh` says what is missing.

## The files

- `config/predefinita.yaml`: tracked, applies to everyone. It is the base.
- `config/locale.yaml`: untracked. Written by `scripts/configura.sh`, only with what changes here.
- Environment variables override everything. The name is `TAGM_<COMPONENTE>`, for example
  `TAGM_LETTORE=anthropic`.
- The old names still work, with the same meaning:
  - `TAGM_LLM`: `finto` (fake reader, rule-based arbiters) or `haiku` (Anthropic reader).
  - `TAGM_ARBITRO`: `regole` or `haiku`.
  - `TAGM_VOCE` or `TAGM_TTS`: `fish` (openrouter), `qwen` (local), `finta` or `mock` (fake).
- A provider forced by a variable has no other fallback. Only the rule-based fallback or `finto` remain.

## Components

| Component | What it is | Base provider | Fallback |
|---|---|---|---|
| `lettore` | reads the turn and chooses the lines | local (minimal mode) | finto |
| `arbitro_azioni` | simultaneous actions: dependencies and conflicts | rules (a 4B took 15–30 s) | — |
| `arbitro_prove` | checks and rolls (SRD 5.2) | rules (Engine's classifier); by hand `locale, modo: minimo` | rules |
| `riassunto` | «La volta scorsa…» (Last time…) | local | rules (summary from the marks) |
| `regole` | «Chiedi una regola» (Ask for a rule) from the phone | local | rules (search in the rules) |
| `voce` | voice of the narrator and PCs | local (Qwen3-TTS) | finto |
| `immagini` | only in preparation (`strumenti/immagini`) | local (flux2-klein-4b with mflux) | none |
| `ascolto` | speech-to-text of the phones (what the players say becomes their action; [docs/ascolto.md](ascolto.md)) | local (whisper.cpp, 127.0.0.1:4614) | openrouter, then nessuno |

## Providers

- `locale`: the OpenAI-compatible server on this computer. For the reader and the arbiters it uses
  `backend.locale`. For voice and images it uses their service.
- `anthropic`: Anthropic API. Key `ANTHROPIC_API_KEY`. Base model `claude-haiku-5-5`.
- `openrouter`: OpenRouter API. Key `OPENROUTER_API_KEY`. It also does the voice (drama-3).
- `openai`: another OpenAI-compatible server. It needs `url`, `modello` and, if needed, `chiave`
  (the name of the variable).
- `regole`: no model. It is the deterministic fallback of the component. Reader and voice do not have it.
- `finto`: for testing. Scripted narrator, voice that plays a tone.
- `nessuno`: the component is off. For images, the atmospheric background is used. For `ascolto`, the phones show no
  microphone button and the players type (`TAGM_ASCOLTO=nessuno` forces it).

If the chosen provider is not available at startup (missing key, missing URL), the server tries the next
fallback. The check opens no connections: the local server is verified at startup.

The reader has a mode. `auto` means minimal locally and full with an API.

## The local server

- On this Mac: mlx-lm (`mlx_lm.server`) on `127.0.0.1:4613`.
- Model: `mlx-community/Qwen3-4B-Instruct-2507-4bit`, about 3.6 GB of RAM.
- Start: `scripts/lettore-avvio.sh [modello]`. If it already responds, it does nothing. If it no longer
  generates, it restarts it. Log in `logs/lettore.out`. It does not use ports 4610, 4611 or 4612.
- Queue: one request at a time per URL. The reader has high priority and jumps ahead. The other components,
  if they wait more than 8 s, give up and use the rule-based fallback.
- Why: the GPU is shared with the voice. Parallel requests made macOS kill the Metal command, and the server
  stayed hung.
- Other systems: llama.cpp (`llama-server --port 4613`) or Ollama. It is enough to change
  `backend.locale.url` and set `avvio: no`. `scripts/configura.sh --url-locale <url>` does it automatically.

### When the local server stops (watchdog, `provider/sentinella-locale.ts`)

In the second e2e pass the server died halfway through a game (N6, docs/e2e-finale.md §9) and nothing noticed. Now
every local server URL has a watchdog, started by the first request of a local model:
- **Health.** A GET `{url}/models` every 10 s (2 s timeout). Every request of the local models also reports its
  outcome: two failures in a row (connection refused, timeout, HTTP 5xx; not a 4xx, not the caller giving up) and
  the server counts as down.
- **While it is down** the local models refuse at once (`ErroreServerFermo`, no retry in `llm/strutturato.ts`): the
  reader goes straight to its deterministic fallback (the line the Engine's rules indicated, else a waiting line),
  the arbiters to their rules. The turn goes on; nothing waits for a 120 s timeout.
- **Restart.** With `avvio: mlx`: `scripts/lettore-avvio.sh` with the URL's port (it also restarts a server that
  answers `/models` but no longer generates). At most one attempt a minute and three in 15 minutes, then it gives up
  and says how to restart by hand. With `avvio: no` it never restarts; it says so. Never under the tests (vitest),
  unless a test passes its own restart (`Sostituzioni.riavviaLocale`).
- **Log** (`modulo: sentinella-locale`): «local model server DOWN» (why), «restarting», «restarted» (seconds, the last
  lines of the script), «restart did not bring it back», «restart given up», «local model server UP again» (seconds
  down, how many requests went to the fallbacks).

## The local speech-to-text server

- On this Mac: whisper.cpp's `whisper-server` on `127.0.0.1:4614`, with the model `ggml-large-v3-turbo-q5_0.bin`
  (0.57 GB, in the Hugging Face cache). Metal on Apple silicon. About 0.7 GB of RAM, ready about 22 seconds after the start.
- Install: `brew install whisper.cpp` (the model is in the download plan of `python3 -I strumenti/configura/configura.py --scarica`).
- Start: `scripts/ascolto-avvio.sh`. If it already answers, it does nothing. Stop: `scripts/ascolto-arresto.sh`.
  `scripts/avvio.sh` (and so `scripts/partita.sh`) starts it when `ascolto` is `locale` and the narrator is not the scripted
  one. `scripts/arresto.sh` stops it, unless you add `--lascia-ascolto`. Test instances share it, as they share the reader on 4613.
- Watchdog: while the game runs, a watchdog checks that the server answers (`GET /health`) and restarts it with the script
  if it stops answering. Log in `logs/ascolto.out` (pid in `logs/ascolto.pid`).
- Language: always the campaign's (`it` or `en`), never detected.
- Fallback: if the local server does not answer and `OPENROUTER_API_KEY` is set, the recording goes to OpenRouter
  (`openai/whisper-1`, $0.006 per minute of audio). If neither works, the phones show that the transcription does not answer, and the players type.
- `nessuno` hides the microphone button. See [the phones guide](guide/phones.md#speaking-your-action-microphone) and
  [docs/ascolto.md](ascolto.md).

## Minimal reader

- For each action it chooses a line among the candidates (the ones indicated by the Engine and at most 6 from
  the catalogue that share words with the action), or «nessuna» (none).
- The announcement is not written by the model: it is composed by the Engine (`llm/annuncio.ts`), with the PC's
  name and the player's first short sentence that is the PC's own act, at most 12 words, or a whole sentence up to six
  words longer rather than a quote cut mid-phrase; a later clause that is a claim or someone else's act ends it
  («Pugnale ancora, il goblin si gira verso di me» → «Pugnale ancora»). The player's words are
  attributed, never asserted in the narrator's voice: «Ida dice: «Guardo la scatolina».» (Ida says: "I look at the
  little box."), in English «Ginestra says: "I open the door."». (The English pack used to turn the first person into
  the third, «Ginestra opens the door.», which told the act as done before any roll; the turn stays a pack option,
  `terza_persona`, off in both packs.) A clause that states the world or the
  PC's state («Ho zero punti ferita», «Vedo tre goblin», «Io sono il più veloce») or has someone else as subject («Il goblin mi tira la
  lancia») is left out: round 4 of the coherence layer heard 7 such claims in the narrator's voice
  (docs/coerenza.md). A PC out of play says «Ida non agisce.». A question the player asked whole keeps its «?» («Ida dice:
  «Chi ti paga?».»). The rules are in `lingue/<codice>/motore.yaml`
  (`annuncio`). Private actions are never announced; the coherence rules do not judge the announcement (they are the
  player's words).
- The turn reaches it as data (`RichiestaNarrazione.dati`, the same object from which `narrazione/messaggio.ts`
  builds the text), not from the message text: so it does not depend on the language of the titles. Prompt in
  `prompts/<codice>/lettore-minimo.md`.
- «Nessuna» means a waiting line from the repertoire. New prose is never produced.
- Why: a small model does not write good prose. The prose comes from the repertoire. The protocol
  (`[narratore]`, `[usa]`, `[invito]`) stays the same as always.

## Structured output

- The provider says whether it can do it: `capacita.strutturato`.
- Anthropic and OpenRouter can: the schema goes in the request.
- Local models cannot (`strutturato: false`). So: the instruction «rispondi solo JSON» (reply only with JSON)
  goes in the message, the JSON is extracted and strictly validated against the schema. If it fails, it is retried
  once, stating the error. If it still fails, the deterministic fallback is used, if there is one. Otherwise the
  error goes back to the caller.

## At startup

- The server prints one line per component, in the log, with the prefix `PROVIDER:`.
  Each line says: component, provider, mode, model and why. The «why» says where the choice comes from: the
  configuration file it was read from, or, when an environment variable forced the provider, the name of that
  variable (for example `variabile d'ambiente TAGM_VOCE`). The value of the variable is never written to the log.
- `scripts/configura.sh` without arguments shows the choices and what is on this computer: keys found (never the
  values), RAM, Python environments. It writes nothing.
- To change: `--api`, `--tutto-locale` (all local), or one component at a time (`--lettore`, `--arbitri`,
  `--voce`, `--immagini`, `--riassunto`, `--regole`).

## Measurements

Trial `prova-f0`, port 4730, all local (`esperimenti/provider-locale/partita/riepilogo.json`, commit `ab8ee2d`):

- 3 turns played to the end: 32 sentences, 143 seconds of Qwen voice, 4 gaps on the projector.
- Zero API calls. Cost: $0.
- One turn costs about 30 s of model time (33.6, 31.7, 36.0 s) on a 16 GB Mac with memory full.
- 22 structured responses not valid, counted from the summary.

# Voice and costs

On this page: what it costs to play, with figures and dates, and how to see what you have spent. How the voices work is on [The voice](voice.md).
Read first: [Local and API](local-and-api.md), for what runs on the Mac and what uses a key.

## What costs money

**By default, nothing.** With `config/predefinita.yaml` the reader, the arbiters, the summary, the rule answers, the voice and the images all run on the Mac: 0 USD, no key.

You pay only when `config/locale.yaml`, a `TAGM_<COMPONENTE>` variable or a flag chooses a paid provider:

- **Anthropic (Haiku)**: the reader, the arbiters, the summary or the rule answers, when they are set to `anthropic` (for example with `scripts/configura.sh --api`). The visual check of the generated images also uses Haiku, whenever the key is there.
- **OpenRouter (drama-3)**: the voice, with `--voce fish` or with `voce` set to `openrouter`, and the lines pre-generated with `scripts/prepara.sh --voce`.

The scriptwriter (see [Local and API](local-and-api.md#the-scriptwriter)) uses your Claude Code subscription, not an API key: it does not appear in `scripts/costi.sh`.

## The voices, in short

| Voice | How to choose it | Cost |
|---|---|---|
| local Qwen3-TTS | the default; or `--voce qwen` | free |
| drama-3 via OpenRouter | `--voce fish`, or `scripts/configura.sh --voce openrouter` | pay per use (see below) |
| fake voice | `--voce finta` | free |

How each voice works, what happens when it fails, and the error 402 when the credit runs out: [The voice](voice.md).

## Lines prepared in advance

The repertoire lines can be voiced before the evening (see [The voice](voice.md#lines-prepared-in-advance)).

- **With Qwen** it is free: it only keeps the Mac busy, about 20 minutes for a campaign.
- **With drama-3** it costs about 2 $ per million bytes of text. To know the cost before spending:

  ```bash
  npx tsx apps/server/src/strumenti/prerender.ts campagne/<id> --motore fish --dry-run
  ```

  It counts the lines, the voices, the lines already in the cache, the bytes and the estimated cost. It spends nothing and writes nothing.

  Then `scripts/prepara.sh campagne/<id> --voce` records them. The lines already in `cache/audio-fish` are not paid again.

## How much it costs

The figures on this page are only those written in the repo, with their source and the date of measurement. The measurements below were taken with Haiku and drama-3 chosen on purpose: with the default local choices the cost is zero.
Prices can change: always check the Anthropic and OpenRouter price lists.

### Rates written in the code

| Service | Rate | Source | Date |
|---|---|---|---|
| Claude Haiku 5.5 (`claude-haiku-5-5`), when a component uses `anthropic` | 0,10 $ per million input tokens, 0,50 $ per million output tokens, for prompts up to 100.000 tokens. Above that: 0,50 $ and 2,50 $. Reading from the cache costs 0,1 times the input price; writing to the cache costs 1,25 times (5 minutes) or 2 times (1 hour). | `apps/server/src/llm/costi.ts` | not stated |
| drama-3 via OpenRouter | 2 $ per million bytes of text sent to the voice. This is the "launch rate" and may rise. Failed generations are not charged. | `apps/server/src/voce/fish.ts`, `docs/ricerca-voce-drama3.md` §1 | 9 novembre 2026 |
| Local models (reader on 4613, Qwen voice on 4611, images) | free: they run on the Mac | | |
| Voce finta (fake voice) | free | | |
| Freesound | the key is free | `.env.example` | |

### Measurements

| What was measured | Amount | Date | Source |
|---|---|---|---|
| Real test: `nozze-neve` in mode B, opening and three turns, 49 lines said by drama-3 | voice 0,0124 $ (6.225 bytes, 158 s of audio); Haiku 0,0053 $ | 9 novembre 2026 | `docs/ricerca-voce-drama3.md` §6 |
| drama-3 voice, average per turn | about 0,0035 $ | 9 novembre 2026 | `docs/ricerca-voce-drama3.md` §6 |
| One session of 45 turns (estimate from the test) | about 0,16 $ of voice and 0,08 $ of Haiku: about 0,25 $ in total, for as long as the launch rate lasts | 9 novembre 2026 | `docs/ricerca-voce-drama3.md` §6 |
| The default tone direction | about 80 bytes per sentence, that is 0,00016 $ | 9 novembre 2026 | `docs/ricerca-voce-drama3.md` §2 |
| The dice referee (Haiku), 16 test calls | 0,0029 $ | 9 novembre 2026 | `docs/prove.md` §6 |
| The first Haiku tests as narrator | 85 calls for 0,018 $ | 1 novembre 2026 | `docs/architettura.md`, «Prove fatte» (tests done) |

In that test, the narrator's default direction, 67 characters long, made up more than half of the voice cost.

### What is not measured in the repo

- Preparing a campaign with the `preparatore` skill of Claude Code: the cost depends on your subscription or your account. To be verified.
- Visual checking of images with Haiku: the code calculates the cost of each call (`strumenti/immagini/visione.py`), but a figure for a whole campaign is not written down. To be verified.
- Generating images and audio is local: it costs nothing in API terms, but it occupies the Mac (15–40 minutes of GPU for the images of a campaign, `scripts/prepara.sh`).
- The scriptwriter's requests: they are counted in your Claude Code subscription, not here.

### How much you have spent: `scripts/costi.sh`

The server writes costs to `logs/costi.jsonl`: lines for the model calls (turns, repairs, arbiter, rule answers, warm-up) and lines for the voice (`tipo: voce`). The script adds them up per game session, using the archive of games.
It is read-only: you can use it even while playing.

```bash
scripts/costi.sh
```

This shows the last 10 sessions of the real game, with the models and the voice separated.

```bash
scripts/costi.sh --tutte
scripts/costi.sh --json
scripts/costi.sh --log <cartella>
```

- `--tutte` shows all sessions.
- `--json` writes the result as JSON, for other scripts.
- `--log <cartella>` reads `costi.jsonl` and `sessioni.sqlite` from another folder.

For a test instance on another port, put the port in front: `TAGM_PORTA=4730 scripts/costi.sh`.

Lines that fall into no session (for example, those before «Inizia sessione», "Start session") end up under «fuori sessione» (outside session), grouped by day (`apps/server/src/strumenti/costi.ts`).

## Problems?

Go to [Common problems](common-problems.md).

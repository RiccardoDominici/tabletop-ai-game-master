# Voice and costs

On this page: the game's three voices, the voice registry `assets/voci/voci.yaml`, and what it costs to play, with figures and dates.
Read first: [One evening of play](one-evening.md), at least the part about `scripts/partita.sh`.

## The three voices

Choose the voice with the `--voce` option of `scripts/partita.sh`.

| Option | What voice it is | What it needs | Cost |
|---|---|---|---|
| `--voce fish` (default) | drama-3 from Fish Audio, through OpenRouter. Expressive: it follows the narrator's tone directions. | the `OPENROUTER_API_KEY` key with credit | pay per use (see below) |
| `--voce qwen` | Qwen3-TTS 0.6B, on the Mac, with no network. It clones voices from a clip of about 8 seconds. | a Mac with an Apple chip and step 5 of the [installation](installation.md) | free |
| `--voce finta` | a tone instead of a voice | nothing | free |

Examples:

```bash
scripts/partita.sh nozze-neve
scripts/partita.sh nozze-neve --voce qwen
scripts/partita.sh nozze-neve --voce finta
```

- The first uses drama-3 (it is the default choice).
- The second starts the local Qwen voice and uses it for everything.
- The third uses the fake voice: useful for trying things out without spending.

The narrator, by contrast, is always real Haiku, whatever voice is chosen.

Each voice has an Italian and an English public Fish voice (`fish: {it, en}` in `assets/voci/voci.yaml`): the game uses the one of the campaign's language. The local Qwen voices clone an Italian reference clip and speak English from it too.

### drama-3: what happens when it does not answer

The drama-3 voice has been the game's voice since 9 novembre 2026. The server sends one sentence per request. If something goes wrong (`docs/ricerca-voce-drama3.md`, §5):

1. a sentence has succeeded only when the first piece of audio arrives, within 6 seconds;
2. otherwise the server tries once more. It does not retry for errors where a retry is useless (400, 401, 402, 403, 404, 413). A 402 means the credit has run out: top up OpenRouter;
3. then it switches to the local Qwen voice, if that is on and ready;
4. otherwise the sentence stays written on the screen and the turn moves on.

To have Qwen as a backup, turn it on before you start the game:

```bash
scripts/voce-avvio.sh
scripts/partita.sh nozze-neve
```

- The first command starts the local voice and waits until it is ready.
- The second starts the game with drama-3. The script notices and writes «riserva: la voce locale, già pronta» (backup: the local voice, already ready).

Test instances, on a port other than 4610, never use Qwen: the voice service belongs to the real game.

### Qwen: what to know

- The service runs on `127.0.0.1:4611`: only the server calls it, from the Mac itself.
- At startup it loads the model and "warms up" all the voices: on the reference Mac this took 20–22 seconds (measured on 2 novembre 2026, `services/voce/README.md`).
- Memory: 2,2 GB at rest and a peak of 3,5 GB in the same measurement. `scripts/partita.sh` warns «fino a 7 GB di RAM» (up to 7 GB of RAM).
- It generates just a little faster than the audio plays. With the Mac busy with other apps (browser, Docker) it can fall behind: close what you don't need.
- It reads only the words: drama-3's tone directions are not received.

## Tone directions (drama-3 only)

The narrator and the repertoire lines can tell the voice *how* to speak. The projector, phones and transcript show only the words (`docs/f0-contratti.md`, «Voce espressiva nelle righe del protocollo», "expressive voice in the protocol lines").

- **One direction** at the start of a line, in square brackets, short, in Italian, with no full stops: it applies to the whole line. Example from `docs/da-fare.md`: `[png_ettore] [offeso, ma a voce bassa] Non venni.` (the direction means "offended, but in a low voice"; the line means "I did not come.")
- **Sounds**, where they fall: `[sigh]`, `[laugh]`, `[breath]`, `[pause]`.
- **Tags to close** within the same sentence: `<whisper>`, `<emphasis>`, `<soft>`, `<fast>`, `<slow>`, `<stress>`, `<forceful>`.

A guard removes (and logs) unknown tags, closing tags with no opening, and directions longer than 80 characters: an unclosed tag would be read aloud.

Without a direction, the default applies:
- for a PNG (non-player character), `voce.tts.direzione` in its character sheet; if that is missing, the server builds one from the sheet (character, timbre, age, speed);
- for the narrator, `direzione_voce` in the style card (`stile.yaml`); if that is missing, the first sentence of `registro_narratore`.

## «Ascolta qui» (Listen here)

Each phone can also play the game's voice on itself, with the round «Ascolta qui» button at the top.
The voice for the outcome of a private action goes only to the phones of that character with «Ascolta qui» switched on, never to the projector. How to use it: [One evening of play](one-evening.md), «Ascolta qui».

## The voice registry: `assets/voci/voci.yaml`

This is the list of voices the game knows. The server (for drama-3) and the voice service (for Qwen) both read it.
Today there are five voices: `narratore` (the narrator's fixed voice), `vincent`, `nadine`, `lucian`, `tabitha`.

Each voice has these fields:

| Field | What it is for |
|---|---|
| `id` | the voice's name, the one you write in the character sheets |
| `file` | the reference clip for Qwen, in the same folder (for example `vincent.wav`) |
| `testo_rif` | the exact transcript of the clip. If it does not match the audio, Qwen's clone gets worse. |
| `descrizione` | what the voice is for, for those preparing campaigns |
| `simile_a` | voices that are easy to confuse with this one by ear: the validator forbids two similar voices in the same scene |
| `fish` | the identifier of the public Fish Audio voice used by drama-3 |
| `fish_titolo`, `fish_perche` | what the voice is called on Fish and why it was chosen |

A PNG chooses its voice in its character sheet, with `voce.tts.voce_id`. For example, in `campagne/nozze-neve/png/png_ettore.yaml`:

```yaml
tts: {voce_id: vincent, eta_apparente: "75-85", altezza: bassa, velocita: 0.95, timbro: "grave e ruvido, come una carriola sul selciato"}
```

If you change a voice:
- **for drama-3**: change the `fish` field, then empty the `cache/audio-fish` folder, which holds the lines already said with the old voice (the header of `voci.yaml` says so);
- **for Qwen**: the clip must be about 8 seconds, mono, with the exact transcript in `testo_rif`;
- **in every case**: no clones of real people (actors, voice actors, YouTubers, politicians) or of film or cartoon characters. This is the criterion written at the top of `voci.yaml`, and drama-3's license forbids cloning a real person without their consent (`docs/ricerca-voce-drama3.md`, §4).

To use another registry, point to its file with `CANTASTORIE_VOCI=<path>` (server, `apps/server/src/config.ts`) and `VOCE_REGISTRO=<path>` (voice service, `services/voce/README.md`).

## Lines prepared in advance

The repertoire lines are written beforehand, so their voice can be kept.
- **drama-3**: every line said live ends up in `cache/audio-fish`. The next time it is free and starts at once.
- **Qwen**: the lines can all be pre-recorded before the evening, in `cache/audio`. The command is in the header of `apps/server/src/strumenti/prerender.ts`:

  ```bash
  npx tsx apps/server/src/strumenti/prerender.ts --solo-conta
  npx tsx apps/server/src/strumenti/prerender.ts
  ```

  - The first only counts the lines to record.
  - The second records them. It needs the voice service on, which stays busy for about 20 minutes.
  - Which campaign gets recorded: the one in the variable `CANTASTORIE_CAMPAGNA` (default `prova-f0`, in `apps/server/src/config.ts`). A test with another campaign: to be verified.

## How much it costs

The figures on this page are only those written in the repo, with their source and the date of measurement.
Prices can change: always check the Anthropic and OpenRouter price lists.

### Rates written in the code

| Service | Rate | Source | Date |
|---|---|---|---|
| Claude Haiku 5.5 (`claude-haiku-5-5`), narrator and referee | 0,10 $ per million input tokens, 0,50 $ per million output tokens, for prompts up to 100.000 tokens. Above that: 0,50 $ and 2,50 $. Reading from the cache costs 0,1 times the input price; writing to the cache costs 1,25 times (5 minutes) or 2 times (1 hour). | `apps/server/src/llm/costi.ts` | not stated |
| drama-3 via OpenRouter | 2 $ per million bytes of text sent to the voice. This is the "launch rate" and may rise. Failed generations are not charged. | `apps/server/src/voce/fish.ts`, `docs/ricerca-voce-drama3.md` §1 | 9 novembre 2026 |
| Qwen locale (local Qwen) | free: it runs on the Mac | | |
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

### How much you have spent: `scripts/costi.sh`

The server writes costs to `logs/costi.jsonl`: lines for Haiku (turns, repairs, referee, warm-up) and lines for the voice (`tipo: voce`). The script adds them up per game session, using the archive of games.
It is read-only: you can use it even while playing.

```bash
scripts/costi.sh
```

This shows the last 10 sessions of the real game, with Haiku and voice separated.

```bash
scripts/costi.sh --tutte
scripts/costi.sh --json
scripts/costi.sh --log <cartella>
```

- `--tutte` shows all sessions.
- `--json` writes the result as JSON, for other scripts.
- `--log <cartella>` reads `costi.jsonl` and `sessioni.sqlite` from another folder.

For a test instance on another port, put the port in front: `CANTASTORIE_PORTA=4730 scripts/costi.sh`.

Lines that fall into no session (for example, those before «Inizia sessione», "Start session") end up under «fuori sessione» (outside session), grouped by day (`apps/server/src/strumenti/costi.ts`).

## Problems?

Go to [Common problems](common-problems.md).

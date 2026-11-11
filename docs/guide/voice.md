# The voice

On this page: the three voices of the game, which one plays by default, how to choose, what happens when a voice fails, the voice on the phones, lines prepared in advance, and the voice registry `assets/voci/voci.yaml`.
Read first: [One evening of play](one-evening.md), and [Local and API](local-and-api.md) for what runs on the Mac and what needs a key.

## The three voices

| Voice | What it is | What it needs | Cost |
|---|---|---|---|
| **Local Qwen3-TTS** | Qwen3-TTS 0.6B on the Mac, with no network (`services/voce`, port 4611). It clones each voice from a clip of about 8 seconds. | a Mac with an Apple chip, the voice environment and the model ([installation](installation.md), steps 6 and 7) | free |
| **drama-3** | `fish-audio/drama-3` from Fish Audio, through OpenRouter. Expressive: it follows the tone directions of the lines. | the `OPENROUTER_API_KEY` key with credit | pay per use (see [voice and costs](voice-and-costs.md)) |
| **Fake voice** («finta») | a tone instead of a voice | nothing | free |

The panel shows the voice in use in its header: «Qwen (locale)», «drama-3 (Fish)» or «finta (mock)» (see [the Game Master panel](master-panel.md)).

## Which voice plays by default

The default is the **local Qwen3-TTS voice**. It is written in `config/predefinita.yaml`:

```yaml
voce:           {provider: locale, riserve: [finto]}
```

drama-3 plays only when you ask for it: with `--voce fish`, or with a `config/locale.yaml` that chooses `openrouter` for the voice (for example after `scripts/configura.sh --api`).

A computer without an Apple chip has no local voice yet: there the setup chooses the fake voice (see [the profiles](local-and-api.md#the-profiles)).

## Choosing the voice

There are three ways. The first one that applies wins.

1. **The `--voce` option**, for one game:

   ```bash
   scripts/partita.sh nozze-neve --voce qwen
   scripts/partita.sh nozze-neve --voce fish
   scripts/partita.sh nozze-neve --voce finta
   ```

   - The first uses the local Qwen voice.
   - The second uses drama-3.
   - The third uses the fake voice: useful to try things out without starting anything.

2. **The configuration of this computer**, for every game. `scripts/configura.sh` writes it into `config/locale.yaml`:

   ```bash
   scripts/configura.sh --voce openrouter
   scripts/configura.sh --voce locale
   ```

   - The first makes drama-3 the voice of every game, with the local voice as the fallback.
   - The second goes back to the local voice.

   Careful: each of these commands rewrites the whole file. See [Local and API](local-and-api.md#changing-the-choices).

3. **The variable `TAGM_VOCE`**, for one start: `TAGM_VOCE=openrouter`, `locale` or `finto` (the old values `fish`, `qwen` and `finta` still work).

Without `--voce`, `scripts/partita.sh` asks the configuration. At the end it prints the voice really in use, on the line «voce: …»: «drama-3 (OpenRouter)», «Qwen locale» (local Qwen) or «finta» (fake).

If the configuration chooses drama-3 but the key is not found at start, the next voice of the chain is used: the local voice.

## When a voice fails

The turn never stops for the voice. Without voice, the line stays written on the projector for the time it takes to read it, and the game goes on.

### With drama-3: one sentence at a time

The server sends one sentence per request (`apps/server/src/voce/riserva.ts`). For each sentence:

1. drama-3 has 6 seconds to send the first piece of audio (`TAGM_FISH_PRIMO_MS`);
2. if it fails, the server tries once more. It does not retry the errors where a retry is useless (400, 401, 402, 403, 404, 413);
3. then it uses the local Qwen voice for that sentence, but only if Qwen is already running and ready;
4. otherwise the sentence stays as text.

`scripts/partita.sh --voce fish` does not start Qwen. To have it as the fallback, start it first:

```bash
scripts/voce-avvio.sh
scripts/partita.sh nozze-neve --voce fish
```

- The first command starts the local voice and waits until it is ready.
- The second starts the game with drama-3. The script writes «riserva: la voce locale, già pronta» (fallback: the local voice, already ready).

The Qwen fallback works only for the real game, on port 4610 (`TAGM_VOCE_RISERVA=qwen|no` changes it). A test instance on another port never uses the service on 4611 (see [Development](development.md#trials-on-another-port)).

### With the local voice

If the Qwen service is not ready, the server plays the fake voice (a tone) until it comes back, and writes it in the log («VOCE IN USO: mock», meaning: voice in use: mock). When Qwen is ready again, it goes back to it by itself.

## drama-3

- **The key.** `OPENROUTER_API_KEY`: the server looks for it in the environment, then in the `.env` file at the root, then in the fallback file (`TAGM_CHIAVE_OPENROUTER`). See [Local and API](local-and-api.md#keys).
- **The credit.** OpenRouter is pay per use: you top up the credit. When it runs out, OpenRouter replies **402**. The server does not retry a 402: every sentence falls back to Qwen (if it is running) or stays as text, until you top up. In `logs/server.out` you find «voce fish: richiesta fallita» (meaning: fish voice: request failed) with `stato: 402`. A 401 or 403 usually means the key is wrong.
- **One voice per language.** Each voice of the registry has an Italian and an English public Fish voice (`fish: {it, en}`). The game uses the one of the campaign's language.

### Tone directions

The lines can tell drama-3 *how* to speak. The projector, the phones and the transcript show only the words (`docs/f0-contratti.md`, «Voce espressiva nelle righe del protocollo», meaning: expressive voice in the protocol lines).

- **One direction** at the start of a line, in square brackets, short, with no full stops. It applies to the whole line. Example: `[png_ettore] [offeso, ma a voce bassa] Non venni.` (the direction means "offended, but in a low voice"; the line means "I did not come.")
- **Sounds**, where they fall: `[sigh]`, `[laugh]`, `[breath]`, `[pause]`.
- **Tags to close** within the same sentence: `<whisper>`, `<emphasis>`, `<soft>`, `<fast>`, `<slow>`, `<stress>`, `<forceful>`.

A guard removes (and logs) unknown tags, closing tags with no opening, and directions longer than 80 characters: an unclosed tag would be read aloud.

Without a direction, the default applies:
- for an NPC, `voce.tts.direzione` in its sheet; if that is missing, the server builds one from the sheet (character, timbre, age, speed);
- for the narrator, `direzione_voce` in the style sheet (`stile.yaml`); if that is missing, the first sentence of `registro_narratore`.

The local Qwen voice reads only the words: it does not receive the directions.

## Local Qwen3-TTS

- The model is `mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit` (`services/voce/voce/config.py`), about 2 GB.
- It needs its Python environment, `services/voce/.venv`, and the model on disk: `python3 -I strumenti/configura/configura.py --scarica` downloads it. The service starts with no network and downloads nothing by itself. All the commands are in [installation](installation.md), steps 6 and 7.
- It runs on `127.0.0.1:4611`: only the server calls it, from the Mac itself.
- `scripts/partita.sh` starts it by itself when the voice is the local one (step «2/4 Avvio la voce locale (Qwen3-TTS): può volerci qualche minuto…», meaning: starting the local voice, it can take a few minutes). By hand: `scripts/voce-avvio.sh` and `scripts/voce-arresto.sh`. The log is `logs/voce.out`.
- At start it loads the model and warms up every voice: 20–22 seconds on the reference Mac (measured on 2 November 2026, `services/voce/README.md`).
- Memory: 2.2 GB at rest and a peak of 3.5 GB in the same measurement. The header of `scripts/partita.sh` says up to 7 GB of RAM.
- It generates only a little faster than the audio plays. With the Mac busy (browser, Docker, image generation) it can fall behind: close what you do not need. See [common problems](common-problems.md#battery-and-heat-with-the-local-voice-qwen).
- The Qwen voices clone an Italian reference clip. They speak English from it too, with the accent of the clip.

## The voice on the phones

Each phone can also play the game's voice, with the round **«Ascolta qui»** (Listen here) button at the top.

- One tap is needed: the phone's browser does not play anything by itself.
- The voice of a **private** line (the outcome of a private action) goes only to the phone of that character, and only if «Ascolta qui» is on there. It never goes to the projector. If nobody listens on that phone, the line is not voiced: it stays as text on the phone.
- Headphones are better for secrets: a phone that speaks at the table lets the neighbours hear.

How to use the button: [One evening of play](one-evening.md#ascolta-qui-meaning-listen-here).

## Lines prepared in advance

The repertoire lines are written before the game, so their audio can be made before the game too. Then they play at once.

| Voice | Where the audio goes | How |
|---|---|---|
| local Qwen | `cache/audio` | `apps/server/src/strumenti/prerender.ts` (the default engine, `--motore qwen`). Free, but the voice service must be on, and it stays busy (about 20 minutes for a campaign). |
| drama-3 | `cache/audio-fish` | `scripts/prepara.sh campagne/<id> --voce`, or `prerender.ts --motore fish`. It costs: about 2 $ per million bytes of text. The lines already in the cache are not paid again. |

Every line that drama-3 says during a game also ends up in `cache/audio-fish`: the next time it is free and starts at once.

The commands:

```bash
npx tsx apps/server/src/strumenti/prerender.ts campagne/nozze-neve --solo-conta
npx tsx apps/server/src/strumenti/prerender.ts campagne/nozze-neve
npx tsx apps/server/src/strumenti/prerender.ts campagne/nozze-neve --motore fish --dry-run
npx tsx apps/server/src/strumenti/prerender.ts campagne/nozze-neve --motore fish
```

- The first only counts the lines to record with Qwen.
- The second records them with Qwen. Start the voice service first (`scripts/voce-avvio.sh`).
- The third counts the drama-3 lines and estimates the cost, without spending anything. Add `--json` to get it as one JSON line.
- The fourth records them with drama-3, and spends. It stops at once on a 401, 402 or 403.

Without the folder, the campaign is the one of `TAGM_CARTELLA_CAMPAGNA`, or `TAGM_CAMPAGNA`, or `prova-f0`. The log is `logs/prerender.jsonl`.

`scripts/prepara.sh campagne/<id> --voce` runs the drama-3 command for you, as step «3b». Without `--voce` that step is skipped: the game voices the lines live. See [Creating a campaign](create-a-campaign.md#lines-prepared-in-advance).

## The voice registry

`assets/voci/voci.yaml` is the list of voices the game knows. The server (for drama-3) and the voice service (for Qwen) both read it. Today there are five voices: `narratore` (the narrator's fixed voice), `vincent`, `nadine`, `lucian`, `tabitha`.

| Field | What it is for |
|---|---|
| `id` | the voice's name, the one you write in the NPC sheets |
| `file` | the reference clip for Qwen, in the same folder (for example `vincent.wav`) |
| `testo_rif` | the exact transcript of the clip. If it does not match the audio, the Qwen clone gets worse. |
| `descrizione` | what the voice is for, for those preparing campaigns |
| `simile_a` | voices that are easy to confuse by ear with this one: the validator forbids two similar voices in the same scene |
| `fish` | the public Fish Audio voice used by drama-3: `{it: <id>, en: <id>}`, one per language (the old form `fish: <id>` counts as Italian) |
| `fish_titolo`, `fish_perche` | what the voice is called on Fish and why it was chosen (`_en` for the English voice) |

An NPC chooses its voice in its sheet, with `voce.tts.voce_id`. For example, in `campagne/nozze-neve/png/png_ettore.yaml`:

```yaml
tts: {voce_id: vincent, eta_apparente: "75-85", altezza: bassa, velocita: 0.95, timbro: "grave e ruvido, come una carriola sul selciato"}
```

### Changing a voice

- **For drama-3**: change the `fish` id, then empty the `cache/audio-fish` folder, which holds the lines already said with the old voice (the header of `voci.yaml` says so).
- **For Qwen**: replace the clip (about 8 seconds, mono) and write its exact transcript in `testo_rif`. Then restart the voice service, and empty `cache/audio` if it holds lines recorded with the old clip.
- **In every case**: no clones of real people (actors, voice actors, YouTubers, politicians) and no film or cartoon characters. This is the rule written at the top of `voci.yaml`, and drama-3's licence forbids cloning a real person without their consent (`docs/ricerca-voce-drama3.md`, §4).

To use another registry, point to its file with `TAGM_VOCI=<path>` (server, `apps/server/src/config.ts`) and `VOCE_REGISTRO=<path>` (voice service, `services/voce/README.md`).

## Costs

The local voice and the fake voice are free. drama-3 is paid per byte of text. The rates, the measurements and `scripts/costi.sh` are in [Voice and costs](voice-and-costs.md).

## Problems?

Go to [Common problems](common-problems.md#the-voice-does-not-play).

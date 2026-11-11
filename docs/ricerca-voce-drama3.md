# Research: the game voice with fish-audio/drama-3 (OpenRouter)

November 9, 2026. Riccardo's decision (docs/richieste-2026-11-09.md, point 6): the game voice is drama-3 via OpenRouter, with expressive directions. The local Qwen stays as the fallback. Here are the sources, the measurements taken on the real service and the choices that follow from them.

Legend: **[OPEN]** = page opened and read; **[SNIPPET]** = only the excerpt from a search engine (to be verified); **[MEASURED]** = tested by us with real calls (script in esperimenti/voce-drama3/).
docs.fish.audio was not reachable from our reading tool (ENOTFOUND): everything that comes from there is [SNIPPET].

## 1. The API: streaming, PCM, limits

- `POST https://openrouter.ai/api/v1/audio/speech`, required `model` and `input`; optional `voice`, `response_format` (`mp3` | `pcm`, default `pcm`), `speed` («per i modelli che lo supportano») (for models that support it), `instructions`, `provider`. The 200 response is a stream of audio bytes. Errors: 400, 401, 402 (credits), 403, 404, 413, 429, 500, 502 (provider error), 503, 524, 529, format `{error:{code,message}}`.
  [OPEN] https://openrouter.ai/docs/api/api-reference/tts/create-speech
- drama-3 costs **$2 per million UTF-8 bytes** of input. It has a single provider, Fish Audio, and failed generations are not charged. [OPEN] https://openrouter.ai/fish-audio/drama-3
- OpenRouter's PCM is described as 24 kHz. [SNIPPET] https://openrouter.ai/blog/tutorials/text-to-speech/
  **For drama-3 this is not true**: [MEASURED] `content-type: audio/pcm;rate=44100;channels=1`, `transfer-encoding: chunked`, PCM s16le mono with no header, in chunks whose length can also be odd. The server reads the sample rate from the header (`sampleRateDa`) and passes it to the screen sentence by sentence.
- Streaming is real. [MEASURED] For 4.2 s of audio the first byte arrives at 0.59 s and the last at 0.90 s: synthesis runs 4 to 6 times faster than real time. Across the 15 candidate voices the first byte went from 0.45 to 1.8 s, cold and in bursts. With a warm connection (the «sveglia» (wake-up call), a free GET to `/api/v1/key`, which the server sends when it closes the actions window) it dropped to 0.27 s.
- Length limits: no explicit limit, apart from the 413. [OPEN] Long text is split into pieces by itself. [OPEN] https://huggingface.co/fishaudio/drama-3 We still send **one sentence per request**: the first audio arrives sooner, and an interruption costs one sentence only.
- Fish also has its own API, with `latency` normal/balanced, `chunk_length` 100–300 and WebSocket. [SNIPPET] https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech OpenRouter does not expose them, and we do not need them: the measured latency is enough.

## 2. Expressive directions

- Official example: `"[sighs] Fine. If we miss it, it's on you. [laughs] Well, maybe that's fair."`, with the tags «where the event must land». [OPEN] https://huggingface.co/fishaudio/drama-3
- The brackets have no closed list: any short description works (`[whispering]`, `[angry]`, `[nervous, almost a whisper]`). There are also paired tags that must always be closed: `<whisper> <emphasis> <soft> <fast> <slow> <stress> <forceful>`. Advice: at most about three tags per sentence. [SNIPPET] https://www.eesel.ai/blog/fish-audio-drama-3-review, https://morphic.com/resources/how-to/fish-audio-drama-3-guide
- Sometimes a sound at the start of a line makes only the sound be heard, and then silence. [SNIPPET] https://recipes.vllm.ai/fishaudio/drama-3 For this reason sounds go in the middle of a sentence.
- The syntax with round brackets, `(sigh)`, belongs to the old S1, which is deprecated. [SNIPPET] https://docs.fish.audio/developer-guide/core-features/emotions
- [MEASURED] Trials transcribed with Whisper (`openai/whisper-1`). After the voice, only the words remained in these cases: directions in Italian (`[arrabbiato, quasi gridando]`), directions in English, directions up to 90 characters long, `<whisper>…</whisper>`, `[sigh]`, `[laugh]`, `<emphasis>`. Once, not even an unclosed `<whisper>` was read aloud. Riccardo, however, heard it read in another trial, so the guard stays. **Directions are written in Italian**: the narrator thinks in Italian, and writing them in English gives no measurable advantage.

Choices (apps/server/src/voce/espressione.ts):
- The direction sits at the start of a line and holds until the next one, within the same line. Each sentence goes to the voice as a request of its own, so the server **repeats the direction** on the following sentences of the line.
- Strict guard, because an unclosed tag is read aloud. Unknown tags, closings without an opening and directions over 80 characters are removed and logged. A tag still open at the end of a sentence is closed there and reopened in the next sentence, always within the same line: drama-3 always receives balanced text. Removing it afterwards is not possible, because the sentence has already left. A line that ends with an open tag is logged as a protocol error.
- Screen (projector), phones, transcription and history for Haiku receive only the words. Qwen too, which would read the directions and tags aloud, receives only the words.
- A line without a direction takes the speaker's default one. For an NPC the direction is `voce.tts.direzione`, if present; otherwise it is composed from the sheet: first trait of `personalita.superficie`, `timbro`, `eta_apparente` and `velocita`, for example «burbero e rumoroso; timbro grave e ruvido…; sui 75-85 anni» (gruff and loud; deep, rough timbre…; about 75–85 years old). For the narrator it is `direzione_voce` of the style card, if present, otherwise the first sentence of `registro_narratore`. It costs about 80 bytes per sentence, that is $0.00016.

## 3. Italian and name pronunciation

- The model is declared for 83 languages, but the list is not published. [OPEN] https://huggingface.co/fishaudio/drama-3 [MEASURED] Italian works: Whisper transcribed word for word all the trial lines of the five chosen voices.
- No phoneme tags, pronunciation dictionaries or notes on accents are found. For numbers it is better to write them out in letters: text normalization may get them wrong. [SNIPPET]
- The `pronuncia` field of the sheets («Èttore Morlàcchi»): **stays as it is**. The accented spelling goes only to the voice, as with Qwen (voce/pronuncia.ts). [MEASURED] «Bàldrin Pietrafìtta ed Èttore Morlàcchi» comes out clean, without strange syllables. Whisper does not distinguish tonic accents: whether the stress falls in the right place only the ear can tell. Directions also go through pronunciation; a name inside a direction causes no problem.

## 4. Public voices

- Search without a key: `GET https://api.fish.audio/model?language=it&title=…&tag=…&sort_by=task_count&page_size=…`. For each voice it returns `_id` (the reference_id), `title`, `description`, `tags`, `languages`, `task_count`, `like_count`, `samples[].text`, `author`. [SNIPPET] https://docs.fish.audio/api-reference/endpoint/model/list-models [MEASURED] Fields checked on real responses.
- For community voices I found no clear license terms. The license of the drama-3 weights forbids cloning a real person without their consent. [SNIPPET] https://www.digitalapplied.com/blog/fish-audio-drama-3-open-weight-ai-voice Many public Italian voices carry the names of real people, such as YouTubers, politicians, voice actors and news events (for example «MARIO ROGGERO», which had been tried). **We discard all of them**, together with clones of film and cartoon characters.
- The choices and the reason for each are in assets/voci/voci.yaml (`fish`, `fish_titolo`, `fish_perche`). In short: narrator «Narratore Calmo» (Calm Narrator), vincent «Voce bassa» (Low Voice), nadine «Nonna barbara» (Grandma Barbara), lucian «ITAL» (Italian), tabitha «Voce Vivace Italiana» (Lively Italian Voice). The pitch and timbre measurements separate them. The final judgment is up to Riccardo's ear.

## 5. Failures and fallback

- The request counts as successful only when the first piece of audio arrives, within 6 s (`TAGM_FISH_PRIMO_MS`). If it fails, the log records it and a retry is made, but not for 400/401/402/403/404/413, where retrying is pointless. Then it moves to Qwen, if allowed and ready. If not even Qwen is available, the sentence is announced with a silence as long as the reading: the subtitle stays on screen and the turn goes on (voce/riserva.ts, voce/pipeline.ts).
- Test instances (port other than 4610) never use Qwen: the service on 4611 belongs to the real game.
- The repertoire lines spoken live by drama-3 are kept in cache/audio-fish, separate from the Qwen cache because the voices are different. The second time they are free and instant.

## 6. Real trial (9 November 2026, instance 4730)

`esperimenti/voce-drama3/gioca.ts`: nozze-neve in mode B, real Haiku, real drama-3. Opening and three turns of the `indagine` script. The results are in esperimenti/voce-drama3/partita/.
- 49 sentences, all spoken by drama-3: no retries, no fallback, no guard corrections, no gap on the projector. The phone with «Ascolta qui» (Listen here) received the same 49 sentences as the projector.
- First byte per sentence: minimum 214 ms, median 288, p90 757, maximum 889. Generation runs 5–6 times faster than speech, so after the first sentence the voice no longer waits.
- Cost: voice $0.0124 (6,225 bytes, 158 s of audio) and LLM $0.0053. On average the voice costs about $0.0035 per turn: the narrator's default direction, 67 characters long, accounts for more than half of it. A 45-turn session costs about $0.16 for voice and $0.08 for LLM, that is about $0.25 in total, as long as the launch rate stays in place. The 22 repertoire lines spoken in this trial are already in cache/audio-fish: at the next game they cost nothing.
- The selector wrote a direction by itself (`[png_ettore] [brontolando] Eh? …`), carried over to the three sentences of the line. Whisper on the 60 s mp3: no direction words in the transcript.

## 7. English voices (10 November 2026)

- Search: `GET https://api.fish.audio/model?language=en&tag=…&sort_by=task_count` (tags male, female, narration,
  calm, old, young, deep, storytelling…). The API returns at most 1000 results per query, so the list is built
  from several tag queries. Candidates were then checked on title, author, description and sample (no real
  person, no film or cartoon character, no name in the sample), then on median f0 and spectral centroid of the
  public sample.
- Chosen (assets/voci/voci.yaml, `fish.en`, `fish_titolo_en`, `fish_perche_en`): narratore «Adrian», vincent
  «BOOK RECORD REGULAR», nadine «Laura», lucian «horror», tabitha «Friendly Women». Four are Fish Official
  voices; the others are generic community titles. Open risk: vincent and lucian both sit near 77 Hz, and
  only the timbre separates them. This was not checked with Whisper and needs a listen.
- Server: `caricaRegistroVoci` takes the Fish id of the content language (`linguaAttiva()`). Without an English
  id it falls back to Italian with a warning. Qwen is unchanged and stays the fallback: its clones read English
  with the Italian accent of the reference clip.

# OpenRouter TTS / STT test for Italian D&D narration

Date: 2026-11-01. TTS model: `heygen/heygen-voice-1-turbo:free` (only the free variant was called, so no TTS cost).

## Status

- **TTS: done.** 49 speech calls: 44 returned audio, 5 were deliberate 400 checks (API facts). 0 HTTP 429 responses. Calls were paced 2.5-3 s apart.
- **STT: blocked, nothing measured.** All 90 STT calls (9 candidate models x 10 files) returned HTTP 402: `This request requires at least $0.50 in balance for audio` (`limit_source: openrouter_credits`). The account credits endpoint reports `total_credits` 110 and `total_usage` 110.12, so the balance is about -$0.12. The key-level dashboard shows a $60 key limit with $59.998 remaining; that limit is not the blocker. Because of this, there is **no WER table, no STT latency and no STT recommendation** in this report.
- To unblock: add credits at https://openrouter.ai/settings/credits (at least $1 to be safe), then run the commands in "How to finish" below.

## 1. API facts (measured unless marked "docs")

| Item | Result |
|---|---|
| Endpoint | `POST https://openrouter.ai/api/v1/audio/speech`, JSON body `{model, input, voice, response_format, ...}`. Response body is raw audio; headers `Content-Type` (`audio/pcm;rate=44100;channels=1`) and `X-Generation-Id`. |
| Models | `heygen/heygen-voice-1-turbo:free` (used). Paid twin `heygen/heygen-voice-1-turbo` is listed at $4 per million characters (model page). The `:free` entry has `expiration_date` 2026-11-30 in the models API. |
| Voices | 10 default voices: nadine, tabitha, bram, gareth, noelle, meredith, sabrina, lucian, weston, vincent. The API gives no gender, accent or language metadata. |
| Italian | Model page says 39 languages. There is no language switch for default voices: `provider.options.heygen.language="it"` returned 200, and its WAV was **byte-identical** to the request without it. Italian pronunciation is **not measured** (no STT). |
| Output format | PCM only, 44.1 kHz, 16-bit signed little-endian, mono. `response_format: "mp3"` returns 400 `HeyGen Voice only supports response_format "pcm"`. |
| Speed | `speed: 1.25` returns 400 `speed is not supported by HeyGen Voice; omit it.` No speed control. |
| Emotion / style | `instructions` is accepted (200) but has no effect: the output was byte-identical to the request without it. |
| Multi-speaker input | `input` as a list of turns returns 400 `Multi-speaker input is not supported by this provider.` Each NPC line needs its own request and a stitch step. |
| Voice omitted | 400 `An explicit voice is required unless input_references carries a reference recording.` |
| OpenAI voice name (`alloy`) | 400 `Provider returned 400`. The message does not say what is wrong. |
| Streaming | Yes, progressive. A 29.5 s narration arrived in about 290 chunks over 2.7 s (TTFB about 0.9 s). The model page also says it streams. |
| Max text length | Model page says 5,000 characters per request. We sent 3,000 chars (200, 132 s audio) and 6,000 chars (200, 245.6 s audio). The 5,000 limit was not enforced at 6,000; we did not find the hard cap. |
| Voice cloning / reference audio | Supported (endpoint flags `supports_voice_cloning` and `supports_image_reference` are true). Tested with `input_references` (base64 `input_audio` plus a text transcript, voice omitted) using an 8-second **synthetic** reference (our thief voice, not a human). Output median pitch was 158 Hz, against about 102 Hz for the same line in the narrator voice, so the reference pitch was transferred. TTFB was 7.8 s, against about 0.8 s normally. Not tested with a real person's voice. |
| Determinism | Five identical requests (same text and voice) returned **byte-identical** audio, for both the short and the long text. |
| Rate limits | No 429 in 49 calls at 2.5-3 s pacing. |
| Cost | $0 for the `:free` variant. |

## 2. Voice list (all 10, same texts)

Median pitch (F0) comes from a rough autocorrelation estimate, so treat it as a hint, not a measurement of quality. Voices fall into two pitch groups. Gender is not confirmed: the groups are only pitch-based.

| Voice | F0 median, tricky line (Hz) | F0 median, narration (Hz) | Words/s (narration) | Pitch group |
|---|---|---|---|---|
| vincent | 99.4 | 83.8 | 2.79 | lower |
| lucian | 100.0 | 95.2 | 2.61 | lower |
| weston | 105.3 | 114.3 | 2.74 | lower |
| bram | 107.4 | 108.8 | 2.51 | lower |
| gareth | 111.1 | 99.4 | 2.73 | lower |
| meredith | 152.4 | 164.9 | 2.59 | higher |
| nadine | 158.4 | 153.8 | 2.47 | higher |
| noelle | 171.1 | 156.9 | 2.58 | higher |
| sabrina | 177.8 | 175.8 | 2.48 | higher |
| tabitha | 179.8 | 222.2 | 2.58 | higher |

Note: tabitha's narration F0 (222 Hz) is probably an estimation artifact, since the tricky line gives 180 Hz.

## 3. Latency (narrator voice `bram`, 5 runs per text)

| Text | Audio length | TTFB median / p90 | Total median / p90 | Real-time factor (total / audio, median) |
|---|---|---|---|---|
| Short line, 12 words | 4.22 s | 817 / 1120 ms | 1195 / 1413 ms | 0.28 |
| Long narration, 79 words | 29.47 s | 862 / 1084 ms | 2719 / 3106 ms | 0.09 |

p90 is based on only 5 runs, so it is unreliable. Raw timings are in `run_results.json` and `logs/calls.jsonl`.

## 4. Narrator consistency (`bram`, 3 Italian texts)

| File | Words | Duration | F0 median (Hz) | Words/s |
|---|---|---|---|---|
| narr_bram_01_benvenuti | 64 | 24.4 s | 111.9 | 2.63 |
| narr_bram_02_combattimento | 66 | 25.3 s | 111.1 | 2.60 |
| narr_bram_03_scoperta | 67 | 26.0 s | 115.1 | 2.57 |

Pitch and pace stay within about 4 Hz and 0.06 words/s across the three texts. Nobody has listened to these files.

## 5. NPC voices (same 22-word line, four voices)

Line: "Siete arrivati tardi, stranieri. La strada per Vallestorta è chiusa da settimane, e chi la percorre di notte non fa più ritorno."

| Role | Voice (chosen by pitch) | F0 median (Hz) | Duration | Words/s |
|---|---|---|---|---|
| Old innkeeper (woman) | nadine | 155.3 | 8.31 s | 2.65 |
| Gruff dwarf | vincent | 91.4 | 8.02 s | 2.74 |
| Young thief | tabitha | 177.8 | 8.15 s | 2.70 |
| Mysterious hooded stranger | lucian | 98.2 | 7.93 s | 2.78 |

Distinctness: the innkeeper and the thief sit well apart from each other and from the men. The **dwarf and the stranger are only about 7 Hz apart**, so their separation is weak on this measure. Only five voices sit in the lower pitch group. Narrator `bram` (about 112 Hz) is also in that group.

## 6. Tricky line (test 6)

Text: "Ostilia versa due boccali di idromele a Benolfo e Kara, mentre fuori la pioggia batte su Brunvalle."

- Generated for all 10 voices (`audio/voice_sweep/sweep_<voice>__tricky.wav`, 6.06-6.87 s) and for the narrator (`audio/tricky/tricky_narrator_bram.wav`, 6.44 s).
- **WER: not computed (STT blocked).**

## 7. STT (test 5): blocked

- Candidates tried (all 402): openai/whisper-large-v3, openai/whisper-large-v3-turbo, openai/gpt-4o-transcribe, openai/gpt-4o-mini-transcribe, google/chirp-3, elevenlabs/scribe-v2, mistralai/voxtral-small-transcribe-3-0, deepgram/nova-3, qwen/qwen3-asr-1.7b.
- The catalogue lists 29 transcription models. None is marked `:free`, so no free STT option exists on OpenRouter.
- No local Whisper install was found (checked `whisper`, `faster-whisper`, `mlx_whisper`, `vosk`), so no offline fallback was run.
- Recommendation: **none**. Nothing was measured, so I cannot honestly recommend a model or quote STT latency.
- STT latency clips are ready: `audio/stt_clips/clip_5s.wav` (5.0 s) and `audio/stt_clips/clip_20s.wav` (20.0 s), both cut from the bram long narration.

## 8. Saved audio (folder: `audio/`, about 73 MB)

| Folder | Files | Voice / role |
|---|---|---|
| `narrator_bram/` | `narr_bram_01_benvenuti.wav`, `narr_bram_02_combattimento.wav`, `narr_bram_03_scoperta.wav` | Narrator (bram), 3 texts |
| `latency/` | `latency_short_run1-5.wav`, `latency_long_run1-5.wav` | Narrator (bram), latency runs |
| `npc/` | `npc_innkeeper_nadine.wav`, `npc_dwarf_vincent.wav`, `npc_thief_tabitha.wav`, `npc_stranger_lucian.wav` | NPC roles, same line |
| `tricky/` | `tricky_narrator_bram.wav` | Tricky line, narrator |
| `voice_sweep/` | `sweep_<voice>__tricky.wav` and `sweep_<voice>__narr.wav` for all 10 voices | Voice sweep (STT input once it runs) |
| `probes/` | `01_basic_pcm_lucian_it.wav`, `06_provider_language_it.wav`, `07_instructions_ignored.wav` (all three byte-identical), `09_long_3000_chars.wav`, `10_long_6000_chars.wav` | API probes (voice lucian) |
| `clone/` | `ref_thief_8s.wav` (synthetic reference), `clone_from_thief_ref.wav` (output) | Cloning probe |
| `stt_clips/` | `clip_5s.wav`, `clip_20s.wav` | Input for the STT latency test |

## 9. Limitations

- **Italian quality is unverified.** The only quality check (STT) is blocked, and nobody has listened to the files.
- Voice choice is based on measured pitch and pace, not on perceived quality. Gender and accent are not confirmed.
- Only 10 voices, and five of them sit in the same lower pitch range. The dwarf and the stranger are close on this measure.
- No speed, emotion, multi-speaker or MP3 output. Playback has to use the 44.1 kHz PCM WAV files as they are.
- Undocumented behaviour: the 5,000-character limit was not enforced at 6,000 characters, and `language` and `instructions` are silent no-ops.
- Expiry: the `:free` model carries `expiration_date` 2026-11-30 in the models API, so the paid variant or another model will be needed after that.
- Error messages are unhelpful in one case (`Provider returned 400` for an unknown voice).

## 10. Verdict (provisional)

- **Narrator:** technically usable. The API is stable, output is deterministic, pitch and pace are consistent across texts, and the first audio for a short line arrives in a median of 0.8 s (p90 1.1 s, n=5). **Italian pronunciation is unknown**, so I would not call it ready for Italian play yet.
- **Multiple NPC voices:** four distinct slots are possible, but the voice pool is small. Innkeeper and thief are clearly separated; the dwarf and the stranger are not, on measured pitch.
- **Italian quality:** unmeasured. This is the main open question, and it needs the STT run below.

## How to finish (after topping up)

```
# dalla radice del repo: OPENROUTER_API_KEY nel .env (vedi .env.example)
set -a; . ./.env; set +a
cd /private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/tts-tests
# WER over all 28 manifest files; resumes automatically (skips rows already scored with 200)
STT_LANGUAGE=it python3 -I scripts/run_stt.py manifest_all.json stt_results.json \
  openai/whisper-large-v3-turbo openai/gpt-4o-transcribe google/chirp-3 elevenlabs/scribe-v2
# STT latency for the best model found above
STT_LANGUAGE=it python3 -I scripts/run_stt_latency.py <best-model>
```

The first command makes 4 x 28 = 112 STT calls. To run all nine candidates, pass the full list (252 calls).

## Files

- `results.md` (this file): `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/tts-tests/results.md`
- Raw data: `api_probe_results.json`, `voice_sweep.json`, `run_results.json`, `stt_candidates_tricky.json` (402 rows), `manifest_all.json`, `logs/calls.jsonl`
- Scripts: `scripts/tts_lib.py`, `scripts/probe_api.py`, `scripts/run_voice_sweep.py`, `scripts/run_narrator_npc_latency.py`, `scripts/run_stt.py`, `scripts/run_stt_latency.py`, `scripts/audio_analysis.py`

# Local Italian TTS for the D&D narrator and NPC voices: measured results

Date: 2026-11-01. Machine: Apple M1, 16 GB unified memory. Runtime: mlx-audio 0.6.3 (MLX) in `venv-mlx`, Whisper scoring with mlx-community/whisper-large-v3-turbo (`language=it`) in `venv-stt`. Engines were run one at a time.

## 0. Summary

- **Recommendation: Qwen3-TTS 0.6B Base (8-bit MLX) as the primary engine for the narrator and the NPC voices.** It is the only tested engine with both a usable first-audio time (about 0.7 s when streamed) and Italian intelligibility near the reference clips (WER 0.014 streamed long text, 0.028 non-streamed long text). Its NPC voices are clones of 8 s reference clips with exact transcripts.
- **Chatterbox Multilingual** is intelligible enough (narration WER 0.09 to 0.29), but it is too slow for live play: about 11 s to first audio for one sentence and RTF 2.1. mlx-audio ignores its streaming flag. Keep it for offline pre-rendering only.
- **MOSS-TTS-Nano** (0.1B) is unintelligible in Italian (WER 0.56 to 0.90 on narration). Rejected and its weights deleted.
- **Kokoro-82M** could not be evaluated: its Italian phonemiser (espeak-ng) fails to initialise in this environment (exit status 1). Details in section 6. Its weights were deleted.
- **Distinct voices are the weak point.** Qwen clones of the four HeyGen references leave innkeeper and thief only 0.66 semitones apart on median F0. Pitch alone will not separate the NPCs; the references need to be chosen for more difference, and that needs a listening check. Nobody has listened to the audio yet.

## 1. Research table (2025-2026 sources)

Verified = checked by me from the HF API, the model card or the mlx-audio source, or run on this Mac. Research agents' findings are marked as such.

| Engine | License | Italian | Cloning | Streaming | Size (weights) | Mac support | Decision |
|---|---|---|---|---|---|---|---|
| Qwen3-TTS 0.6B Base (mlx 8-bit) | Apache-2.0 (verified, card) | Official list includes `it` (card metadata verified; checkpoint `codec_language_id` has `italian`, verified run) | Yes, ICL mode: needs ref audio + exact ref_text (verified run) | Yes, `stream=True` (verified: first chunk 0.67 s) | 1.99 GB 8-bit (HF API); bf16 2.52 GB | MLX via mlx-audio (run) | **Primary** |
| Chatterbox Multilingual (mlx fp16 v2) | MIT (verified, card) | Yes, in 23-language list (card text verified; run with `lang_code=it`) | Yes, ~8 s clips (run) | No in mlx-audio (`stream` ignored, verified in source) | 2.4 GB, already in HF cache (not downloaded here); v3 mlx repo 2.71 GB (HF API), not downloaded | MLX via mlx-audio (run) | Tested, too slow; offline only |
| Kokoro-82M (mlx bf16) | Apache-2.0 (HF API cardData) | Presets `if_sara` (F), `im_nicola` (M), grade C (VOICES doc, research A); IT in mlx-audio table | No | Segment-wise | 0.36 GB | MLX via mlx-audio | **Blocked** (espeak G2P), weights deleted |
| MOSS-TTS-Nano-100M | Metadata apache-2.0, but card says "not yet licensed for redistribution" (research A) | Yes, in card language list (verified) | Yes (`voice_clone` mode) | Claimed; mlx-audio raises `NotImplementedError` (verified in source) | 0.29 GB (HF API) | MLX via mlx-audio (run) | **Rejected** (WER 0.56-0.90), weights deleted |
| VoxCPM2 (4-bit mlx) | Apache-2.0 (verified, card) | Yes, in card text (verified) | Yes (mlx-audio) | Not checked | 2.30 GB (HF API) | MLX via mlx-audio (listed) | Not installed: would exceed the 6 GB TTS budget |
| OmniVoice (mlx bf16) | Code Apache-2.0; pre-trained weights CC-BY-NC (verified, GitHub README) | Yes, in docs/languages.md (research A) | Yes, 3-10 s ref + optional ref_text (research A) | Not checked | 1.64 GB (HF API) | MLX via mlx-audio (listed) | Not installed: would exceed the 6 GB budget. Best next candidate if a 4th engine is wanted |
| XTTS-v2 (Coqui) | Coqui Public Model License, non-commercial (research B; LICENSE.txt quoted) | Yes, in 17-language list | Yes, 6 s clip (card) | Yes, `inference_stream` (research B, source) | about 2.09 GB (research B) | No official MPS (research B) | Not installed: no Apple GPU path, large |
| F5-TTS Italian (alien79) | Conflicting: card cc-by-4.0, F5 SHARED.md says cc-by-nc-4.0 (research B) | Italian only (card) | Yes (ref audio + transcript) | No | 1.35 GB (research B) | Unverified (research B) | Not installed: Italian-only, last update Dec 2024, no published metrics |
| Piper Italian (paola-medium, riccardo-x_low) | Original rhasspy/piper archived 2025-10-06, MIT; successor piper1-gpl GPL-3.0 (research B) | Yes (voice list) | No | Yes (raw output) | paola-medium .onnx 63.5 MB (research B) | Not verified on macOS (research B) | Not installed: no cloning |
| Voxtral TTS 4B (mlx bf16) | CC-BY-NC-4.0 (verified) | Yes, in 9 languages (mlx-audio README) | Not checked | Not checked | 8.04 GB, bf16 only (HF API) | MLX (listed) | Rejected: size |
| Higgs Audio v3 4B | Non-commercial research license (research A) | Not verified | Yes, but consent required (research A) | Not checked | 9.31 GB, bf16 only (research A) | Listed | Rejected: size |
| KugelAudio 7B | Not checked | Yes (mlx-audio README) | Not checked | Not checked | 7B, too large | Listed | Rejected: size |
| Audio8-TTS-Realistic 0.6B | Apache-2.0 (verified) | Not confirmed in its card | Yes (mlx-audio) | Not checked | 1.70 GB 4-bit (HF API) | MLX (listed) | Excluded: Italian not confirmed |

Sources: https://huggingface.co/Qwen/Qwen3-TTS-12Hz-0.6B-Base ; https://huggingface.co/mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit ; https://huggingface.co/ResembleAI/chatterbox ; https://huggingface.co/mlx-community/chatterbox-fp16 ; https://huggingface.co/mlx-community/chatterbox-multilingual-v3 ; https://huggingface.co/mlx-community/MOSS-TTS-Nano-100M ; https://huggingface.co/OpenMOSS-Team/MOSS-TTS-Nano ; https://huggingface.co/mlx-community/Kokoro-82M-bf16 ; https://huggingface.co/hexgrad/Kokoro-82M ; https://github.com/Blaizzy/mlx-audio (README, PyPI 0.6.3) ; https://huggingface.co/openbmb/VoxCPM2 ; https://huggingface.co/k2-fsa/OmniVoice ; https://huggingface.co/coqui/XTTS-v2 ; https://huggingface.co/alien79/F5-TTS-italian ; https://github.com/rhasspy/piper ; https://github.com/OHF-Voice/piper1-gpl ; https://huggingface.co/mlx-community/Voxtral-4B-TTS-2603-mlx-bf16

## 2. Benchmark (M1 16 GB, median of 3 warm runs)

Definitions: TTFA = time from the call until the first audio chunk. Short = one sentence of 17 words (about 6.5 s of audio). Long = 70-word narration (RTF = wall time / audio seconds). Sentence-by-sentence = the app's streaming pattern (4 sentences, TTFA = first sentence). Peak MLX = `mx.get_peak_memory()` during the long run. RSS = process max resident size.

| Engine | Load (warm / first time) | Short TTFA, not streamed (s) | Short TTFA, streamed (s) | Sentence-by-sentence TTFA (s) | Long RTF | Peak MLX (GB, long) | Peak RSS (GB) |
|---|---|---|---|---|---|---|---|
| Chatterbox fp16 (v2 multilingual) | 8.52 s warm (cache) / n/a (pre-existing) | 10.98 | not supported | 8.55 | 2.11 | 5.14 | 0.91 |
| Qwen3-TTS 0.6B Base 8-bit | 3.04 s warm / 365.4 s incl. 2 GB download | 7.26 | 0.68 (short), 0.71 (long) | 6.69 | 0.92 | 7.12 | 2.14 |
| MOSS-TTS-Nano 0.1B (rejected) | 48.4 s incl. download | 2.35 | not implemented | 1.69 | 0.19 (it generated 54.6 s of audio for the 70-word text) | 3.12 | 0.80 |
| Kokoro-82M | blocked, no timings | - | - | - | - | - | - |

Streamed RTF (wall time to produce all chunks / audio seconds): Qwen3 short 0.865, long 0.822. Below 1 means generation stays ahead of playback, but the margin is thin.

Qwen3 streamed run details: short: 14 chunks, total 5.61 s for 6.40 s of audio; long: 52 chunks, total 20.52 s for 24.96 s of audio.

Other timings: Chatterbox per-voice conditional preparation (done once per voice, not in TTFA): innkeeper_nadine 2.51 s, dwarf_vincent 0.34 s, thief_tabitha 0.34 s, stranger_lucian 0.44 s. Dialogue lines (one run each): Chatterbox wall 15.2 to 22.0 s for 6.6 to 9.7 s of audio; Qwen3 wall 8.4 to 12.5 s for 5.9 to 9.9 s of audio; MOSS wall 2.5 to 4.5 s for 13.8 to 24.0 s of audio. The Chatterbox emotion knob (exaggeration 0.3 calm vs 0.8 dramatic) took 40.5 s wall for the long text. The Qwen3 short-text TTFA (7.26 s, not streamed) is much worse than its streamed TTFA (0.68 s) because the non-streamed call waits for the full sentence.

## 3. Intelligibility (WER vs source text; mlx-whisper large-v3-turbo, language=it)

Normalisation: lowercase, punctuation removed, apostrophes split, word-level Levenshtein. `names missing` lists key fantasy names that do not appear as a whole token in the transcript. Whisper spells some names as two words ("Valle Storta"), which counts as missing even when pronunciation is fine.

| Output | WER | edits / ref words | key names missing |
|---|---|---|---|
| chatterbox_narrator_short.wav | 0.294 | 5 / 17 | ostilia, benolfo, kara, idromele |
| chatterbox_narrator_long.wav | 0.113 | 8 / 71 | ostilia, benolfo, nero |
| chatterbox_narrator_long_sentencewise.wav | 0.085 | 6 / 71 | benolfo, brunvalle, vallestorta |
| chatterbox_narrator_long_dramatic.wav | 0.113 | 8 / 71 | ostilia, brunvalle, vallestorta |
| chatterbox_innkeeper_old_woman_dialogue.wav | 0.160 | 4 / 25 | vallestorta |
| chatterbox_gruff_dwarf_dialogue.wav | 0.000 | 0 / 25 | - |
| chatterbox_young_thief_dialogue.wav | 0.000 | 0 / 20 | - |
| chatterbox_hooded_stranger_dialogue.wav | 0.105 | 2 / 19 | - |
| qwen3_narrator_short.wav | 0.118 | 2 / 17 | kara, idromele |
| qwen3_narrator_long.wav | 0.028 | 2 / 71 | vallestorta |
| qwen3_narrator_long_sentencewise.wav | 0.028 | 2 / 71 | vallestorta |
| qwen3_innkeeper_old_woman_dialogue.wav | 0.080 | 2 / 25 | vallestorta |
| qwen3_gruff_dwarf_dialogue.wav | 0.000 | 0 / 25 | - |
| qwen3_young_thief_dialogue.wav | 0.000 | 0 / 20 | - |
| qwen3_hooded_stranger_dialogue.wav | 0.000 | 0 / 19 | - |
| moss_nano_narrator_short.wav | 0.706 | 12 / 17 | ostilia, kara, brunvalle, idromele |
| moss_nano_narrator_long.wav | 0.901 | 64 / 71 | ostilia, benolfo, brunvalle, vallestorta, nero |
| moss_nano_narrator_long_sentencewise.wav | 0.563 | 40 / 71 | ostilia, benolfo, brunvalle, vallestorta, nero |
| moss_nano_innkeeper_old_woman_dialogue.wav | 0.440 | 11 / 25 | vallestorta |
| moss_nano_gruff_dwarf_dialogue.wav | 0.600 | 15 / 25 | - |
| moss_nano_young_thief_dialogue.wav | 0.250 | 5 / 20 | brunvalle |
| moss_nano_hooded_stranger_dialogue.wav | 0.474 | 9 / 19 | - |
| qwen3_narrator_short_streamed.wav | 0.059 | 1 / 17 | kara |
| qwen3_narrator_long_streamed.wav | 0.014 | 1 / 71 | brunvalle |

Reference clips, as a check on the ASR itself (they should score near 0):

| Reference | WER | edits / ref words | key names missing |
|---|---|---|---|
| ref_innkeeper_nadine.wav | 0.000 | 0 / 22 | - |
| ref_dwarf_vincent.wav | 0.045 | 1 / 22 | vallestorta |
| ref_thief_tabitha.wav | 0.000 | 0 / 22 | - |
| ref_stranger_lucian.wav | 0.045 | 1 / 22 | vallestorta |
| ref_narrator_bram.wav | 0.000 | 0 / 20 | - |

Names: Qwen3 gets Ostilia, Benolfo and Brunvalle right; its misses are "idromele" read as "dromele", "Kara" as "Cara", and "Vallestorta" as "Valle Storta". Chatterbox garbles names: "Ostilia" becomes "Osteria" or "Ostile", "Benolfo" becomes "Dormera Venorfo", "Brunvalle" becomes "Blumvalle" or "Brumvalle", "Nero" becomes "Renero". MOSS-TTS-Nano produces non-words ("Osteo verso il tuo balcali").

## 4. Distinct voices: pitch (median F0, praat autocorrelation, 60-450 Hz)

Reference clips are synthetic HeyGen voices. Each clone speaks the same NPC line as its reference, so the reference column is the baseline.

| Voice | F0 median (Hz) |
|---|---|
| reference innkeeper_old_woman | 142.1 |
| reference gruff_dwarf | 79.1 |
| reference young_thief | 165.8 |
| reference hooded_stranger | 94.6 |

| Engine | F0 per NPC role (Hz) | closest pair (semitones apart) |
|---|---|---|
| HeyGen references (baseline) | innkeeper 142 / gruff 79 / young 166 / hooded 95 | 2.67 (innkeeper_old_woman vs young_thief) |
| Chatterbox clones | innkeeper 156 / gruff 86 / young 171 / hooded 93 | 1.31 (gruff_dwarf vs hooded_stranger) |
| Qwen3 clones | innkeeper 165 / gruff 79 / young 171 / hooded 92 | 0.66 (innkeeper_old_woman vs young_thief) |
| MOSS-TTS-Nano clones (rejected) | innkeeper 75 / gruff 286 / young 100 / hooded 375 | 4.71 (gruff_dwarf vs hooded_stranger) |

Narrator expressiveness knob (Chatterbox, long text): F0 p10-p90 range 13.89 semitones at exaggeration 0.3 (calm) vs 14.33 at 0.8 (dramatic); median F0 138.8 vs 135.7 Hz. The pitch measure shows no clear difference, so the knob is not verified as an expressiveness control by this test.

## 5. Audio files (all 16-bit WAV)

- Qwen3: `out/qwen3/` (9 files): `qwen3_narrator_short.wav`, `qwen3_narrator_long.wav`, `qwen3_narrator_long_sentencewise.wav`, `qwen3_narrator_short_streamed.wav`, `qwen3_narrator_long_streamed.wav`, `qwen3_innkeeper_old_woman_dialogue.wav`, `qwen3_gruff_dwarf_dialogue.wav`, `qwen3_young_thief_dialogue.wav`, `qwen3_hooded_stranger_dialogue.wav`
- Chatterbox: `out/chatterbox/` (8 files): `chatterbox_narrator_short.wav`, `chatterbox_narrator_long.wav` (calm), `chatterbox_narrator_long_dramatic.wav`, `chatterbox_narrator_long_sentencewise.wav`, and four `chatterbox_<role>_dialogue.wav`
- MOSS-TTS-Nano (rejected, kept as evidence): `out/moss_nano/` (7 files)
- References: `refs/ref_innkeeper_nadine.wav`, `refs/ref_dwarf_vincent.wav`, `refs/ref_thief_tabitha.wav`, `refs/ref_stranger_lucian.wav` (copied from tts-tests npc clips, 7.9 to 8.3 s, all speaking the same line); `refs/ref_narrator_bram.wav` (cut at a sentence boundary from tts-tests narrator_bram, 7.92 s, transcript in `refs/ref_narrator_bram.json`)
- Full paths start with `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/local-tts/`

## 6. Kokoro: not evaluated (blocked)

Kokoro-82M (mlx-community/Kokoro-82M-bf16) loads and misaki/mlx-audio start, but the Italian phonemiser fails. The full evidence is in `logs/kokoro_blocked_error.txt`. Key lines:

```
WARNING:root:Using EspeakG2P(language='it'). Chunking logic not yet implemented, so long texts may be truncated ...
Error processing file '/Users/runner/work/espeakng-loader/espeakng-loader/espeak-ng/_dynamic/share/espeak-ng-data/phontab': No such file or directory.
(process exit status 1, no traceback)
```

Direct ctypes calls to the bundled libespeak-ng (espeakng-loader 0.2.4, 0.2.0 and 0.1.51.0) return init status 2 and voice `it` status 268437247. No system espeak-ng is installed. Fixing it needs a global `brew install espeak-ng`, which was not done. Kokoro would need a re-download (0.36 GB) if this is resolved.

## 7. Disk and budget

- Deleted (rejected engines, weights I downloaded): `mlx-community/Kokoro-82M-bf16` (355 MB), `mlx-community/MOSS-TTS-Nano-100M` (286 MB), `OpenMOSS-Team/MOSS-Audio-Tokenizer-Nano` (88 MB). Total 729 MB, removed through huggingface_hub `delete_revisions` (blobs only if unreferenced).
- Kept TTS repos: `mlx-community/chatterbox-fp16` 2.58 GB and `mlx-community/S3TokenizerV2` 0.49 GB (both already in the shared cache before this evaluation, not downloaded or deleted here), and `mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit` 1.99 GB (downloaded here).
- TTS budget use: about 5.1 GB of the 6 GB total.
- Shared STT weights: `mlx-community/whisper-large-v3-turbo` 1.61 GB in the shared cache, used for scoring. Not part of the TTS budget, not deleted.
- Free disk on the Mac went from 17 GB to 11 GB during the run (other downloads in the shared cache) and is 16 GB now.

## 8. Recommendation and trade-offs

**Narrator: Qwen3-TTS 0.6B Base, 8-bit MLX, streamed sentence by sentence.** Measured: streamed TTFA 0.67 s on a 6.5 s sentence, WER 0.059 (short) and 0.014 (long), streamed RTF 0.82-0.87. Trade-offs: the narrator needs a reference clip with an exact transcript; peak MLX memory on the long non-streamed run was 7.1 GB, so check the streamed memory in the real app (not measured here); the 0.6B model has no expressiveness control that showed up in the pitch test.

**NPC voices: the same engine, one reference clip per NPC.** Dialogue WER 0 to 0.08 for the four lines. The clones follow their references' pitch roughly (dwarf 79 vs 79 Hz, stranger 92 vs 95 Hz) but the innkeeper rose from 142 to 165 Hz and sits 0.66 semitones from the thief. **Distinctness needs work before play:** pick references with bigger pitch and timbre gaps, then check by listening.

**Chatterbox Multilingual** is the only tested engine with a dedicated emotion parameter and voice cloning, and Italian is intelligible, but 11 s to first audio and RTF 2.1 rule it out for live narration. Offline pre-rendering is still possible.

**Not settled:** Kokoro (needs a working Italian G2P), OmniVoice (best untested option if the TTS budget allows 1.6 GB more), and VoxCPM2. Nobody has listened to any output, and all judgements above rest on WER and pitch proxies.

## 9. Limitations

- No listening test. Intelligibility is an ASR proxy, and pitch is an autocorrelation proxy. Neither measures timbre, prosody or naturalness.
- The reference clips are synthetic HeyGen voices, not real people, so cloning tests transfer only their characteristics.
- Load times are single measurements. The first Qwen load (365 s) includes the download. Warm load was measured once (3.04 s).
- Contention: I checked with `ps` and `top` once, during the Chatterbox run, and found no other MLX process. I did not check the Qwen3 and MOSS runs, so their timings may include some contention from the other agent's Whisper work.
- Chatterbox streaming was not tested, since mlx-audio ignores it. Qwen3 streaming was measured with `streaming_interval=0.5`; other intervals were not tested.
- The reference WER values (0 to 0.045) show the ASR is reliable on clean speech, but Whisper's name spellings still affect the names check.

## 10. Scripts and raw data

- Scripts: `scripts/` (`bench_lib.py`, `bench_chatterbox.py`, `bench_qwen3.py`, `bench_moss_nano.py`, `bench_kokoro.py` (blocked), `qwen3_stream_check.py`, `cut_narrator_ref.py`, `score_outputs.py`, `common.py`, `build_results.py`)
- Raw: `results/chatterbox_bench.json`, `results/qwen3_bench.json`, `results/moss_nano_bench.json`, `results/qwen3_stream_check.json`, `results/scores.json` (per-file transcript, WER, names, F0), `results/manifest_all.json`
- Logs: `logs/`

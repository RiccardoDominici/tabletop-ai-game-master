# Background music for the AI-run D&D game: evaluation

Folder: `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/music-tests/`
Date of tests: 2026-11-01. Machine: Apple M1, 16 GB.

Provenance: "measured" means I ran it. "checked" means I opened the primary page myself. "agent" means a research sub-agent reported it; I spot-checked only the items marked as checked.

## Recommendation

**Hybrid: a free library for ambience and short loops, a local generator for campaign themes, and Lyria as an optional extra.**

1. **Ambience and short loops from CC0 sources.** OpenGameArt CC0 loops, Pixabay and Sonniss are usable. OpenGameArt CC-BY tracks also work, but they need credit and are not seamless multi-minute loops. The reachable libraries do not provide several minutes of seamless music by default.
2. **Campaign themes from a local generator: Stable Audio 3.0 Small (primary) or Medium.** The MLX runtime is measured on M1 8 GB by its authors (about 10x real time for Small on 10 s clips, peak RAM 1.6 GB). The Stability Community License allows private use (commercial use needs registration, and is free under $1M revenue). Smoke-test it on this M1 before depending on it: a 3-minute render, quality, loops and vocals are unmeasured. ACE-Step 1.5 turbo (MIT) is the second candidate; its Mac minimum is only third-party reported.
3. **Lyria via OpenRouter is optional and blocked for now.** The account cannot call audio output until credit is added (HTTP 402, below). Nothing has been generated, so its quality and loopability are unknown.
4. **Ambience layer:** a second audio bus under narration, using seamless CC0 loops. This is worth building.

## Comparison table

| Option | Quality | Style coherence in a campaign | Latency | Cost per campaign (~10 tracks) | License (private use) | Loopability | Effort |
|---|---|---|---|---|---|---|---|
| **Library, CC0 (OpenGameArt)** | Varies by item | Low: independent artists | Instant (local file) | $0 | CC0: no attribution | Ambience loop measured (seam jump 0.0034, no end silence). Music track not loop-ready (8.8 s tail silence) | Medium: curation and loudness matching |
| **Library, CC-BY 3.0 (OpenGameArt tracks)** | Varies | Low | Instant | $0 | CC-BY 3.0: credit required when shared | Short Medieval Loop: 19.7 s, internal 0.53 s silent gap. Medieval town: 97 s, fades ~21 dB at the end (see table) | Medium: credit line per track |
| **Library, Incompetech (CC BY 4.0)** | Good, large catalogue (not reached live) | Medium: one composer | Instant | $0 | CC-BY 4.0: credit when shared | Weak: 9 "Loop" titles, mostly game loops | Medium: credit line per track; live domain unreachable |
| **Library, Tabletop Audio** | Ambience only | n/a | Instant | $0 | CC BY-NC-ND 4.0: non-commercial, no derivatives | Not loop-ready: 10-minute non-repeating tracks | Low to listen; cannot cut or crossfade under the license |
| **Local Stable Audio 3.0 Small** | Not measured | Not measured. Needs a fixed seed/prompt prefix or a LoRA | M1 8 GB measured by authors: 10 s clip in ~1 s. Derived: 3-min track in ~18 s (linear extrapolation, estimate) | $0 | Stability Community License; gated on Hugging Face | Not measured. Max 120 s per clip, so 3-min tracks need stitching | Medium: runtime install, HF gate acceptance |
| **Local Stable Audio 3.0 Medium** | Not measured | Same as Small | M1 8 GB measured: 10 s clip in ~5 s. Derived: 3-min track in ~90 s (estimate) | $0 | Same | Max 380 s per clip, so a full track fits in one pass | Medium, 3.8 GB peak RAM on M1 8 GB |
| **Local ACE-Step 1.5 turbo** | Not measured | Not measured. Up to 10 min songs | Agent reports M1 Pro 16 GB: 30 s song in ~45 s (third party, unchecked) | $0 | MIT | Not measured | Medium to high: Mac minimum 16 GB is third-party only |
| **Lyria clip** (`google/lyria-3-clip-preview`) | NOT MEASURED (blocked) | Not measured | Not measured | $0.40 for 10 clips (5 min). 3-min tracks = 6 clips = $2.40 for 10, stitched | Per OpenRouter / Google terms | Clips are 30 s; seams unmeasured | Low once credit is added |
| **Lyria pro** (`google/lyria-3-pro-preview`) | NOT MEASURED (blocked) | Not measured | Not measured | $0.80 for 10 songs if each track is one song (length unknown) | Same | Unknown | Low; endpoint showed status -5, uptime 50% at check time |
| **Ambience: OpenGameArt CC0** | Good enough for loops | n/a | Instant | $0 | CC0 | Measured: 94 s loop, no end silence | Low |
| **Ambience: Sonniss GDC** | Professional WAV | n/a | Instant | $0 | Personal and commercial projects without attribution. No sale or supply of raw files; no AI training (license v2.0 checked) | Mixed | Medium: sort and tag |

## Option 1: Lyria via OpenRouter (blocked; nothing generated, $0 spent)

**What I did.** Read `google/lyria-3-clip-preview` and `google/lyria-3-pro-preview` in `models.json`. Pricing is per generation, not per token: clip **$0.04 per 30 s clip**, pro **$0.08 per full song**. Checked the public endpoints page for both. Read the OpenRouter audio docs (checked). Audio output goes through `POST /api/v1/chat/completions` with `modalities: ["text","audio"]` and `stream: true`. Audio arrives as base64 in `delta.audio.data`, and cost comes back in `usage.cost`. The docs do not cover Lyria specifically.

**Script.** `gen_lyria.py` is ready. It reserves the expected cost in `ledger.json` before every call and refuses if the total would exceed $1.50. The planned four-track test (clip and pro, battle and tension) would cost $0.24.

**Result.** The first clip call failed with HTTP 402:

```
This request requires at least $0.50 in balance for audio output
```

A read-only check of `/api/v1/credits` showed `total_credits` 110 and `total_usage` 110.12, so the balance is about -$0.12. Lowering `max_tokens` cannot fix a negative balance, so I stopped. I did not add credits on your behalf. The 402 was refused before generation, and the ledger records $0.00 charged.

**Endpoint status (catalog check).** Lyria pro showed `status: -5`, `uptime_last_30m: 50`. Lyria clip showed status 0, 100% uptime (30 min).

**Ledger:** `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/music-tests/ledger.json`. Total charged: **$0.00**.

**To unblock:** add credit at https://openrouter.ai/settings/credits (at least $0.50 is required; a few dollars covers the four-track test). Then run the jobs with `python3 -I gen_lyria.py clip_battle` (and the other job names).

## Option 2: Free and royalty-free libraries

Source table (library agent; V = opened page or measured, U = search snippet only):

| Source | Private-use license | Attribution | Programmatic download? | Mood tags | Loop-friendly | Verdict |
|---|---|---|---|---|---|---|
| **Tabletop Audio** | CC BY-NC-ND 4.0 (V) | Credit and link (V) | Direct MP3 links return 200 (HEAD only, V). No API. NoDerivatives forbids edits | Mood, Action, Biome filters (V). Third-party GitHub mirror counts: dark 26, battle 25, medieval 17, tavern 9, folk 0 | No: "10 minutes of non-repeating sound" (V) | Mostly ambience, not score. Skip |
| **Incompetech** (Kevin MacLeod) | CC BY 4.0 (V, 2025 Wayback FAQ) | "Licensed under Creative Commons: By Attribution 4.0" plus link (V) | Live domain fails DNS (V). ToS unread | Wayback snapshot (Jan 2026): 1,443 pieces. Dark 419, Mysterious 261, Eerie 185, Epic 130. Medieval 1, Folk 0 | Weak: 9 "Loop" titles, mostly game loops (V) | Best mood data on paper, unreachable from this sandbox |
| **Pixabay** | Pixabay Licence, personal and commercial (V) | Not required; "by [Contributor] via Pixabay" suggested (V) | No music API (U). ToS §8 bans scraping and bulk copying (V) | Searches: medieval 1,802+, tavern 217+, dark fantasy 19,950+ (V) | Some "Seamless Loop" versions (V) | Easy licence, manual download only |
| **OpenGameArt** | Per track: CC0, CC-BY 3.0/4.0, CC-BY-SA, GPL, OGA-BY (V) | Per-track credit (V) | No API. robots.txt does not block /content or files (V). Direct file links work (V) | Tag filter, crawled, approximate: dark ~617, battle 600, fantasy 723, boss 296, folk 66, medieval 153, tavern 30 | Some ("Short Medieval Loop"). Many 8-bit game loops | Best reachable; check each track's licence |
| **Free Music Archive** | Per track: CC BY, BY-NC, BY-NC-ND, BY-NC-SA, or public domain (V) | Title, author, source, licence (V) | No public API. ToS §6e bans automated access and data mining (V) | "medieval" search: 31 tracks (V) | Not checked | Non-commercial variants and ToS block bulk use |

Other sources, not downloaded: Jamendo's developer page lists 35,000 requests/month on the non-commercial tier, but it needs a client_id key, which I did not use. Musopen is mostly public-domain classical; free accounts are limited to 5 downloads/day (snippet only). Bensound's licence URL returns 404.

**Downloaded samples (measured by me with `analyze_audio.py`):**

| File | Source & licence | Duration | Format | Integrated LUFS | LRA | True peak | Leading / trailing silence | RMS 0.5 s head / tail | Seam jump |
|---|---|---|---|---|---|---|---|---|---|
| `library/oga_dungeon_ambience/dungeon_ambient_1_0.ogg` | OpenGameArt, "Loopable Dungeon Ambience", CC0 | 94.31 s | Ogg Vorbis, 48 kHz stereo, 138 kbps | -27.7 | 3.8 LU | -3.1 dBTP | 0.00 / 0.00 s | -27.2 / -26.6 dB | 0.0034 |
| `library/oga_ambient_music/monoliths.mp3` | OpenGameArt, ambient music pack, CC0 (also CC-BY 3.0) | 159.95 s | MP3, 44.1 kHz stereo, 320 kbps | -18.2 | 11.2 LU | 0.0 dBTP | 0.00 / **8.79 s** | -49.9 / -75.8 dB | 0.0001 |
| `library/opengameart-short-medieval-loop/medieval_loop.wav` | OpenGameArt, "Short Medieval Loop" by remaxim, CC-BY 3.0 | 19.73 s | PCM 16-bit, 44.1 kHz stereo, 1,411 kb/s | -30.9 | 2.0 LU | -11.5 dBTP | 0.00 / 0.00 s; **internal silent gap 14.68–15.21 s** | -29.6 / -40.3 dB (agent's 2 s windows: -34.2 / -34.6 dB) | 0.0031 |
| `library/opengameart-medieval-town/022815townbgm_0.ogg` | OpenGameArt, "medieval town" by syncopika, CC-BY 3.0 | 97.05 s | Ogg Vorbis, 44.1 kHz stereo, 118 kbps | -26.4 | 7.0 LU | -12.7 dBTP | 0.00 / 0.00 s; no silence at or below -50 dB | -28.5 / **-49.5 dB** (agent's 2 s windows: -32.6 / -42.9 dB) | 0.0031 |

Notes:
- The four samples differ by up to about 12 LU. Normalise to one target loudness before mixing.
- `monoliths.mp3` reaches 0.0 dBTP (no headroom) and ends in 8.8 s of silence, which would leave a gap in a loop. Usable as a single track, not as a seamless loop.
- `medieval_loop.wav` has a 0.53 s silent gap inside a 19.7 s loop, so looping it as-is leaves a dropout. Its tail is about 11 dB quieter than its head over 0.5 s windows (the agent's 2 s windows match). The sample-level seam jump is small (0.0031).
- `medieval town` fades about 21 dB over its last 0.5 s, so looping it as-is would produce a level jump at the loop point.
- Seam jump is the sample-level step between the last and first sample. Small values do not mean the loop sounds seamless; that was not listened to.
- Attribution required for CC-BY 3.0 tracks (OGA's suggested format): "Short Medieval Loop" by remaxim, licensed CC-BY 3.0: https://opengameart.org/content/short-medieval-loop . "medieval town" by syncopika, licensed CC-BY 3.0: https://opengameart.org/content/medieval-town

## Option 3: Local generation on M1 16 GB (research; nothing installed or run)

Correction to the first draft: the ACE-Step numbers I first recorded (Apache 2.0; M2 Max 26 s per minute) came from the older v1 repo. ACE-Step 1.5 is MIT. The speed and license figures below are for the correct version.

| Model | License & private use | Size / memory | Apple Silicon data | Max length | Verdict |
|---|---|---|---|---|---|
| **Stable Audio 3.0 Small (music)** | Stability Community License (checked). Private use OK; commercial needs registration, free under $1M revenue. Gated on Hugging Face (checked) | 433M per repo (HF card says 0.6B). Peak RAM 1.6–2.4 GB | Official MLX/Metal runtime (checked). **M1 8 GB measured by authors: 10 s clip ~1 s (~10x real time); M4 Pro: 120 s in 4.1 s** | 120 s per clip | **Primary candidate.** Verify on this M1 |
| **Stable Audio 3.0 Medium** | Same | 1.4B. Peak RAM 3.8–5.2 GB | **M1 8 GB measured by authors: 10 s clip ~5 s (~2x real time); M4 Pro: 120 s in 14.7 s** | 380 s per clip | Good for full tracks if speed holds |
| **ACE-Step 1.5 turbo** (XL 4B separate) | MIT (checked) | 2B DiT; Mac minimum 16 GB is third-party only (not on the official page). XL needs ≥12 GB VRAM | Official macOS MLX launch script (checked). Speed for M1 Pro 16 GB only from third-party repo (30 s song in ~45 s) | 10 s to 10 min (agent) | Second candidate; XL too big for 16 GB |
| **MusicGen small / medium / large** | Code MIT; weights CC-BY-NC 4.0 (checked). Non-commercial only | 300M / 1.5B / 3.3B. Docs assume a 16 GB CUDA GPU for medium | No official MPS support. Issues #13 and #396 open with no MPS success reports (agent, checked). Community MLX port on M4 Max: small 1.3x real time, medium 0.6x | Examples use 8 s | Short loops; weaker than Stable Audio 3 |
| **Magenta RealTime 2** (wildcard) | Code Apache 2.0; weights CC-BY 4.0 (agent, checked HF card) | 230M small; 2.4B base | Google says real time on any Apple Silicon Mac (vendor claim, unverified) | Streaming; fixed-length examples | Ambient loops; mostly instrumental, some non-lexical vocal sounds. Worth a listen test |
| **Not viable:** YuE, DiffRhythm, Stable Audio Open 1.0 | YuE and DiffRhythm Apache 2.0; SAO 1.0 Community License | YuE needs 24 GB for two sessions; DiffRhythm needs ≥8 GB VRAM | CUDA only; no Mac path documented | SAO 47 s; DiffRhythm full 4:45 | Skip |

Sources (agent research, spot-checked where marked): [SA3 MLX README](https://github.com/Stability-AI/stable-audio-3/blob/main/optimized/mlx/README.md) (checked), [SA3 HF card](https://huggingface.co/stabilityai/stable-audio-3-small-music), [Stability community license](https://stability.ai/community-license-agreement), [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) (checked), [MusicGen docs](https://github.com/facebookresearch/audiocraft/blob/main/docs/MUSICGEN.md), [MusicGen HF card](https://huggingface.co/facebook/musicgen-small) (checked), [Magenta RealTime 2](https://huggingface.co/google/magenta-realtime-2).

**Derived estimates for 10 x 3-minute tracks on this M1 (my estimates, not measured):**
- Stable Audio 3.0 Small: about 18 s per track, roughly 3 minutes total. Its 120 s clip limit means two clips per track, with seams to handle.
- Stable Audio 3.0 Medium: about 90 s per track, roughly 15 minutes total. It can produce a whole track in one pass.
- ACE-Step 1.5 turbo: unknown. The third-party figure suggests roughly 45 min total, but that is for a different chip.
These extrapolate linearly from the authors' 10 s measurements on M1, so they can be off by a factor of two or more.

## Option 4: Ambience layer

Sources (ambience research agent; V = opened page, U = snippet only):

| Source | Private-use license | Attribution | Loops? | Programmatic? | Verdict |
|---|---|---|---|---|---|
| [Freesound](https://freesound.org/help/faq/) | CC0, CC-BY, CC-BY-NC all allow private use (V) | BY only (V) | No loop flag; `tag:loop` gives 58k results (V) | API token required (V). Originals need OAuth2 (V). No full copies or scraping (V, ToS) | Best free pool. Query per sound, check loops by ear |
| [BBC Sound Effects](https://sound-effects.bbcrewind.co.uk/) | RemArc: personal/research, non-commercial (U) | BBC credit (U) | Mostly one-shots (U) | Manual (U) | Personal tests only; no redistribution or social upload (U) |
| [Sonniss GDC](https://sonniss.com/gdc-bundle-license/) | Personal and commercial projects, games and interactive (V) | None (V) | Not stated | Zip/torrent (V) | Strong for embedding in a project. Never ship raw files (V). Bundle year and size unconfirmed: the official page lists none |
| [Tabletop Audio](https://tabletopaudio.com/about.html) | CC BY-NC-ND 4.0 (V) | Required (V) | 10-min tracks (V) | Manual (V) | Great sound, but NoDerivatives bars sharing edited loops |
| [OpenGameArt](https://opengameart.org/) | Per asset: CC0, CC-BY, CC-BY-SA, OGA-BY, GPL (U). The agent got a 403; I fetched pages with curl | Per licence | Unknown | Not checked | Check each asset. CC0 is safest |
| [Pixabay](https://pixabay.com/service/license-summary/) | Free use, adaptation allowed; no standalone resale (V) | Not required (V) | 11,177 ambience-loop results, some 1 s (V) | API covers images/videos only (V) | Best licence-to-loop ratio; curate by hand |
| [ZapSplat](https://www.zapsplat.com/license-type/standard-license/) | Free tier: credit required, 4 downloads per hour (U) | Credit (U) | Unknown | Manual, capped (U) | Usable with credit |
| [Mixkit](https://mixkit.co/terms/) | Personal or business use; no standalone resale (V) | SFX licence not read (U) | Unknown | Unknown | Read the SFX licence first |
| [Ambient Mixer](https://www.ambient-mixer.com/faq) | CC Sampling Plus 1.0 (retired, still valid); commercial OK with credit (V) | Creators and template author (V) | Layered loops; FAQ admits a "noticeable gap" at the seam (V) | Not documented | Reference for layering, not a bulk source |
| [itch.io, Epic Stock Media](https://epicstockmedia.itch.io/strange-game-ambient-loops) | No named licence on page; EULA not read (V) | Not stated (V) | 186 loops, Full and Layer A/B/C, 44.1 kHz 16-bit WAV (V) | Manual store | Best-curated loops. Paid (about $31–39). Read the EULA first |

Judgment (agent; the ducking figures are unverified podcast guidance):
- Berklee's game-audio guidance (checked) says a plainly looped stereo file is obvious, and recommends loop markers with 2–4 s equal-power crossfades.
- Ducking narration by 4–9 dB and keeping music 15–20 dB under speech is common podcast guidance, not verified here. Broadband rain or wind can mask speech, so duck ambience more than music.
- Effort: a separate ambience bus, TTS-triggered ducking with about a 1 s release, gapless loop playback with crossfades, and a listening check for each loop.
- Licensing is the main cost. CC0, Pixabay and Sonniss allow embedding in an app. Tabletop Audio's ND term and BBC's terms do not allow shipping edited or raw files.

## Limits of this evaluation

- Nothing could be listened to. Quality, style coherence, vocal presence and perceived loop seams are unmeasured for every option. The numbers above are objective measures only.
- Lyria was not generated, so there is no measured quality, duration, format or latency. Only the 402 error and the catalog pricing are real.
- Stable Audio 3, ACE-Step 1.5 and Magenta RealTime 2 are not installed or run. Their speed figures are authors' or third-party measurements, and the M1 numbers are for 10 s clips only.
- Incompetech's live site did not resolve from the sandbox. The catalogue counts above come from a Wayback snapshot. My first draft called Incompetech the "largest dark-fantasy catalogue"; that was an assumption, and the snapshot shows only one medieval-tagged piece.
- Freesound's API was not tested.
- Agent status: all three research agents completed. Their findings are above with V/U marks. I spot-checked the SA3 MLX README and the ACE-Step 1.5 licence, and re-measured the four library audio files.
- Process slip: the library agent wrote intermediate files to the `/private/tmp` root instead of the scratchpad, and says it deleted them. My check of that root for the obvious names found nothing. I did not audit the whole folder.

## Files

- `gen_lyria.py`: Lyria generator with budget guard (not run successfully).
- `ledger.json`: spend ledger, $0.00 charged.
- `analyze_audio.py`: loudness, silence and seam analysis; self-test on `selftest_tone.wav` gave lead-in 1.0 s and tail 2.0 s as designed.
- `library/oga_dungeon_ambience/dungeon_ambient_1_0.ogg`: CC0, 94 s ambience loop.
- `library/oga_ambient_music/monoliths.mp3`: CC0 (also CC-BY 3.0), 160 s ambient music.
- `library/opengameart-short-medieval-loop/medieval_loop.wav`: CC-BY 3.0, 19.7 s medieval loop.
- `library/opengameart-medieval-town/022815townbgm_0.ogg`: CC-BY 3.0, 97 s medieval town track.

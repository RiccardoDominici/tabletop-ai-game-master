# Research: music, ambience and effects for a campaign framework (2 November 2026)

Two read-only research passes (reusable collections; generation). [OPENED] = page read; [SNIPPET] = search result only.
Before building, verify the endpoints live.

## Collections, ordered by automatic choice
1. **Incompetech (Kevin MacLeod)**: catalogue readable by script from the «Agent Section» (per track: title, duration, genre,
   bpm, description, `feel`), files in a static folder, no key. About 2,000 tracks. CC BY 4.0: one credits line per track
   («Titolo, Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0» (Title, Kevin MacLeod
   (incompetech.com), Licensed under Creative Commons: By Attribution 4.0)).
   [SNIPPET] https://incompetech.com/agent-section/
2. **Freesound**: search by tag, duration, license (`Creative Commons 0`, `Attribution`…), audio analysis by sound
   (Essentia: loudness, brightness, tonality). 60 requests/min, 2,000/day; originals require OAuth2, mp3 previews do not.
   An API key is required (free). [OPENED] https://freesound.org/docs/api/resources_apiv2.html
3. **Jamendo**: tags by mood, instrument, tempo, instrumental-only; API with a free client id. [SNIPPET] https://developer.jamendo.com/v3.0/tracks
4. **Sonniss GDC 2026**: ~7.5 GB of professional effects, free use without credits, editable; manual download, redistribution
   and model training forbidden. [OPENED] https://sonniss.com/gdc-bundle-license/
5. **OpenGameArt / Kenney**: CC0 (Kenney) and mixed licenses (OGA), no API, good for a small initial CC0 pool.
- **Not suitable**: Pixabay (no audio API, mass downloading forbidden), Tabletop Audio (CC BY-NC-ND: cuts and loops
  forbidden), Zapsplat free (mandatory credits, limits), BBC Sound Effects (personal/educational use only).
- Lessons: our own tag vocabulary (type of place, time, tempo, mood, energy, instruments) into which the sources' tags are
  translated; automatic labelling of the local pool with Essentia's mood models; local cache with license and credits.
  Character themes are not found in any collection: they must be composed.

## Generation (Mac M1 16 GB)
- **Character themes**: the recommended route is deterministic. The model only proposes the motif (a few bars, as data),
  the code validates it and derives the variations (transposition, inversion, augmentation), a free SoundFont plays it.
  Models write valid ABC only ~50% of the time: never trust without validation. Existing tools: sirruf/music-gen-skill
  (mido + FluidSynth + FluidR3_GM), linxule/mcp-music-studio. [SNIPPET]
- **Place music and ambience**: Stable Audio 3 Small (Music/SFX), via the official MLX, max 120 s, inpainting to repair the
  joins; weights under the Stability Community License, on Hugging Face with access to accept. [OPENED] https://github.com/Stability-AI/stable-audio-3
- **Mood tracks**: ACE-Step 1.5 (MIT), the most convenient from a script (`instrumental=True`, `use_random_seed=False, seeds=[…]`),
  but on 16 GB it risks running out of memory. [OPENED] https://github.com/ace-step/ACE-Step-1.5
- **MusicGen-melody** (mlx-audiogen): conditioned on a melody (chromagram), CC-BY-NC weights: non-commercial use only.
- **Timings**: no measured data on Apple chips for any model; estimate 30–60 min for 25 tracks on M1. To be measured.
- **APIs for later**: ElevenLabs Music ($0.15/min) and effects; Lyria ($0.04 per 30 s clip); Stable Audio API ($0.20 per
  track); Suno/Udio have no official public API.
- **Automatic checks**: ffmpeg `loudnorm` in two passes (`linear=true`), `silencedetect`, `astats` for clipping,
  start-and-end comparison for loop joins; in Web Audio, gain ramps for fades and ducking under the voice.

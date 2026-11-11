# Audio: music, character themes, ambiences (framework)

Request from Riccardo (2 November 2026): music always underneath; each setting its own music, each character its own; ambient sounds (crowd, rain…); first reuse existing collections, then possibly generate. The guiding principle applies: **a pipeline that produces the audio of any campaign from its data**, never hand-picked tracks.
Research: `docs/ricerca-audio.md`.

## Four layers

| Layer | What | From where (now) | From where (later) |
|---|---|---|---|
| **Location and mood music** | one looping track per location; one track for each of the six moods in the closed vocabulary (`esplorazione_tesa`, `taverna_calda`, `rito_sacro`, `inseguimento`, `combattimento_epico`, `lutto`) | Incompetech collection (CC BY 4.0, catalogue readable by script), automatic choice by descriptors | local generation (Stable Audio 3 Small, ACE-Step 1.5) or API |
| **Character themes** | a short motif per NPC, variations of a single motif of the campaign | composed: motif as notes (data), variations in code, rendered with a free SoundFont | same |
| **Ambiences** | looping layers per location: crowd, rain, river, wind, fire, bells… | local CC0 / public domain background from the Internet Archive, labelled and measured; synthesis for the missing noises | Freesound API (only the key is needed, already wired in) |
| **Effects** | single hits: bell toll, door, chain | as for ambiences | as for ambiences |

## Data in the campaign (written by the Preparer)

All optional: if they are missing, the pipeline infers them from the public texts with the rules of `strumenti/audio/vocabolario.py`.
The allowed values are those of the vocabulary (an unknown value is ignored with a warning).
- `stile.yaml → audio`: `{tonalita: "re dorico", modo, tempo: 88, strumenti: [..] o "testo", umore_base: <umore>,
  epoca: antica|moderna|futura, motivo: {metro: 4, note: [[grado, durata], ...]}}`. `motivo` is the hook for an LLM
  (or for the Preparer): notes as scale degrees (0 = tonic) and durations in beats; it is validated, and if it fails
  the deterministic generator is used. Without `audio`: mode from the tone, tonic from the id, instruments from
  `tavolozza_musicale.strumenti` (with the negations: «Niente percussioni» (No percussion) forbids them).
- each scene/node → `audio: {musica: [descrittori], ambiente: [tag | {tag, volume}], umore_iniziale}`. The descriptors of
  `musica` are vocabulary words (mood, energy, time, weather, setting) or free words searched in the descriptions of the tracks.
- each PNG → `tema: {carattere, strumento, modo, registro}`: no secrets (the theme must not betray who is lying).
- The campaign validator checks these fields against the same vocabulary (class `AUDIO`: values, motif, secret words,
  themes that would betray a liar); the guide for the Preparer is in
  `.claude/skills/preparatore/riferimenti/schema.md` («Audio») (Audio) and `mestiere.md` §10.
  Without `tema`, the character comes ONLY from the public persona (reading, surface and under-pressure personality,
  voice without `mai_dice`, voice timbre); no inferred rule produces the Phrygian mode.

## Manifest (contract between pipeline and projector)

`campagne/<id>/audio/manifest.json`:
```json
{"versione": 1, "campagna": "<id>", "formato": "AAC-LC in .m4a, 48 kHz, stereo; ...",
 "brani":   [{"id": "luogo_<id>", "tipo": "musica", "luogo": "<id>", "file": "luogo_<id>.m4a", "loop": true,
              "lufs": -23.0, "volume": 1.0, "durata_s": 148.2, "titolo": "...", "licenza": "CC BY 4.0", "crediti": "..."},
             {"id": "luogo_<nodo>", "alias_di": "luogo_<scena>", "...": "stessi campi della scena"}],
 "umori":   [{"id": "umore_<tag del vocabolario chiuso>", "umore": "<tag>", "file": "umore_<tag>.m4a", "loop": true, "...": "come i brani"}],
 "temi":    [{"id": "tema_<png_id>", "png": "<png_id>", "file": "tema_<png_id>.m4a", "loop": false, "durata_s": 6.4,
              "lufs": -20.0, "volume": 1.413, "strumento": "clarinetto", "modo": "ionio"}],
 "ambienti":[{"id": "amb_<id>_<tag>", "luogo": "<id>", "tag": "pioggia", "file": "amb_pioggia_<sorgente>.m4a",
              "loop": true, "volume": 0.25, "lufs": -30.0, "fonte": "...", "licenza": "..."}],
 "effetti": [{"id": "sfx_<tag>", "tag": "campana", "file": "sfx_campana_<sorgente>.m4a", "loop": false, "volume": 1.259, "lufs": -21.0}],
 "crediti": ["\"Titolo\" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/", "..."]}
```
- File: AAC-LC `.m4a`, 48 kHz stereo, simple names placed directly in `audio/` (Safari and Chrome both decode them).
  Music at 128 kbps; ambiences, themes and effects at 96 kbps.
- Loops (tracks, moods, ambiences): the file is [0.5 s tail of the loop] + loop + [0.5 s head of the loop], and the voice carries
  `loop_inizio_s` (≈ 0.5) and `loop_fine_s` on the decoded file: the projector uses `loopStart`/`loopEnd` with these values
  and starts from 0. Why: measured on 3 November 2026, repeating the whole AAC buffer gives a click at every cycle (the first
  and last frames of the encoder do not match: sample jumps 20–47 times the typical variation). With the margins the content
  is circular, so even if the decoder shifts the start by a few tens of milliseconds (AAC padding not removed) the repetition
  has no seam. The check compares the two copies of the head.
- `durata_s` is the duration of the file's content (margins included); the AAC padding at the end does not count.
- Inside the loop the seam is sewn: the tail fades (3 s for music, 2 s for ambiences) into the stretch that precedes
  the start, so there is no `giunta_s`.
- `lufs` is the MEASURED loudness of the file (music ≈ −23, ambiences ≈ −30, themes ≈ −20, effects ≈ −21); the wanted level
  relative to the music is in `volume` = gain of the layer × 10^((target + 23)/20), because the projector brings every file
  to −23 with the `lufs` field.
- A file can serve several voices (the same rain for four locations, with different volumes). Each voice also carries the
  measurements (`controllo`: loudness, true peak, LRA, seam, silences) and, for music, the reason for the choice (`scelta`).
- Next to the manifest: `crediti.md` (generated) and `descrittori.json` (the descriptors of each location and NPC, with the tests).
Volumes are normalized (two-pass loudnorm, `linear=true`), and loops are checked (seam, silences, clipping) before entering the manifest.

## Pipeline (`strumenti/audio/`)

```
strumenti/audio/setup.sh                                   # once: environment (uv) and SoundFont in cache/audio/soundfont/
strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id> [--dry-run] [--solo musica|temi|ambienti] [--rifai] [--senza-rete]
strumenti/audio/.venv/bin/python strumenti/audio/provino.py campagne/<id>   # preview: esperimenti/audio/provino_<id>.wav and controlli_<id>.md
```
- `scripts/prepara.sh campagne/<id>` runs it after the validator and the images, only if the audio is not already complete for
  today's sheets (`strumenti/stato_preparazione.py` compares the descriptors with `audio/descrittori.json`).
- `campagna_audio.py` reads only the public fields; `descrittori.py` translates them into the vocabulary (`vocabolario.py`);
  `fonti/incompetech.py` chooses and downloads the music; `temi/` composes and plays the themes; `pool.py` and `ambienti.py`
  build the layers and the effects; `qualita.py` cuts the loops, normalizes, encodes and checks; `manifest_audio.py`
  writes the manifest and the credits. Idempotent: whatever already has its file is skipped.
- Sources verified on 2–3 November 2026:
  - **Incompetech** (Kevin MacLeod, CC BY 4.0): `https://incompetech.com/music/royalty-free/pieces.json` (catalogue,
    ~1,440 tracks with feel, genre, bpm, instruments, description) and `.../mp3-royaltyfree/<filename>`; the «Agent Section» (Agent Section)
    documents them for agents. Catalogue in `cache/audio/incompetech/`; only the chosen tracks are downloaded.
  - **Internet Archive** (CC0 1.0 and Public Domain Mark 1.0, licence declared by the uploader, recorded with the page):
    advancedsearch and metadata; the robots.txt allows it. Each file is measured (spectral flatness, LRA, silences)
    before entering the background pool `cache/audio/pool/`.
  - **Not used, because of their robots.txt**: OpenGameArt (bans Claude agents), Kenney (bans /assets/, /downloads/,
    /files/ for everyone), the Wikimedia Commons API (/w/ banned for everyone). Pixabay excluded under its terms.
  - **Freesound**: wired in, activated with `FREESOUND_API_KEY` in the environment or in `.env` (free key from
    https://freesound.org/apiv2/apply/); it uses only CC0 sounds and the previews (no OAuth).
  - **SoundFont**: GeneralUser GS 2.0.3 (S. Christian Collins), free licence even for commercial use and inside software;
    `setup.sh` downloads it once (32 MB, sha256 verified), outside git.
  - **Synthesis** (`fonti/sintesi.py`): rain, wind, snow, river, fire, water, sea as modelled and periodic noise,
    when the background has no good recording.
  - **Fallbacks**, in this order when the background has nothing good: synthesis for the noises; SoundFont for
    `campane` (sparse bell tolls) and `canto` (distant choir in the mode of the campaign); a nearby tag (`taverna` → `folla`,
    `mulino` → `fiume`, `temporale` → `pioggia`, `gocce` → `acqua`, with `ripiego_di` in the voice); for the effect
    `campana`, a tubular bell toll from the SoundFont. Otherwise the layer is missing (warning in the log).
- Memory of the checks: a track discarded for silences or seam ends up in `cache/audio/incompetech/scartati.json` and is
  not retried in any campaign; the title rules for the background also apply to files already in cache.
- Checks per campaign: `esperimenti/audio/controlli_<id>.md` (in git) and the preview `provino_<id>.wav` (outside git).

**What the projector reads** (`apps/server/src/audio/catalogo.ts`, 3 November 2026):
- `file`: simple name in the `audio/` folder (no subfolders), `^[a-z0-9][a-z0-9_.-]*\.(ogg|opus|mp3|m4a|wav|flac|webm)$`;
  Ogg Opus (or MP3) recommended, 48 kHz, stereo for music. A voice whose file is missing is skipped without errors.
- `id`: `^[a-z0-9][a-z0-9_]*$`. Locations: `luogo_<scene or node id>`, as for the images (`luogo_scena_forno_vecchio`,
  `luogo_n_piazza`); the scene and its node count as the same place, so one of the two is enough.
- Ambiences: `amb_<luogo>_<tag>` (the longest known location wins), or an explicit field `"luogo": "<id>"`.
- Optional fields: `loop` (default true for tracks, moods and ambiences, false for themes and effects), `volume` (0–2,
  default 1), `lufs` (if different from −23 the projector corrects it, ±12 dB at most), `durata_s`,
  `loop_inizio_s`/`loop_fine_s` (loop points on the decoded file, if the loop is not the whole file),
  `giunta_s` (> 0: the file does not close cleanly and is repeated with two overlapping copies in fade for that many seconds).
- Fallbacks for the music of a location: `luogo_<luogo>` → equivalent location (scene ↔ node) → `umore_<musica.tag of the scene>`
  → silence. A mood chosen (`POST /api/scena/umore {"umore": "tensione"}`, or `null`) wins over the location.
- Test fixture: `apps/server/test/fixtures/audio/` (generated by `genera.sh`); `TAGM_AUDIO=<folder>` to test another folder.

## Automatic signals (Engine, 3 November 2026)

Moods and effects start by themselves, for any campaign, with nobody at the panel. Three sources:

| Source | Where | Exact fields |
|---|---|---|
| Narrator or selector | service lines, not read aloud | `[umore] <tag>` · `[effetto] <tag>` |
| Repertoire line | `repertorio/*.yaml`, in the line | `audio: {umore: <tag>, effetto: <tag>}` (one or both) |
| Scene | `scena.yaml` / `scene/*.yaml` | `audio: {umore_iniziale: <tag>}` (with `musica` and `ambiente`) |

- Moods (closed vocabulary, `strumenti/audio/vocabolario.py` UMORI): `esplorazione_tesa`, `taverna_calda`,
  `rito_sacro`, `inseguimento`, `combattimento_epico`, `lutto`; plus `auto` = return to the music of the location
  (not valid for `umore_iniziale`). Effects: the tags of EFFETTI (`campana`, `porta`, `catena`, `tuono`, `monete`, `chiave`),
  and in play only those present in the catalogue of the campaign (`sfx_<tag>`); you write the tag, `sfx_` is tolerated.
- Timing: the signal applies to the sentence that follows the line (for a line, its first line). The effect starts on the
  projector at the same moment as the sentence; the mood changes when the sentence begins. An `[effetto]` after the last
  sentence plays once the turn's voice is finished; an `[umore]` after the last sentence applies at once.
- Limit: at most one automatic mood per minute per scene (even a choice by the master starts the minute); the scene change
  (and «Ricomincia» (Start over)) resets `umore_iniziale` and clears the count. The master's buttons always go through.
- Rejects: a tag outside the vocabulary or absent from the catalogue is ignored; in lines and scenes it is a loading error
  (vocabulary), in play it goes to the log and to the Game Master's register. Every automatic signal, applied or rejected,
  appears in the panel's register with the «auto» (auto) chip.
- The narrator and the selector receive in their context the «Audio» (Audio) section with the moods and effects of this
  campaign; the rules of use (rare, only for named sounds) are in the prompts.

## In play (projector, Web Audio)

- Music bus: crossfade on a change of location or mood, with hysteresis (it changes no more than once every
  60–90 s, except at the start of combat). Ambience bus: several looping layers per location. Themes: the NPC's motif
  plays, briefly, the first time they speak in a scene (not at every line). Everything lowers under the voice (ducking).
- The master's panel has volume and mute for each bus.
- Credits (CC BY) are shown at the end of the session and on a credits page.

**How it is now** (`apps/web/src/schermo/audio/`, 3 November 2026). It starts only after «Inizia sessione» (Start session), on the
same AudioContext as the voice. Buses: voice, music, ambiences, themes, effects; music and ambiences go through the ducking.
- Music: constant-power crossfade of 3.5 s; hysteresis of 60 s (from silence it starts at once; they do not wait for the mood
  chosen by the master or by the Engine, the scene change and the scene's mood change).
  `?isteresi_audio_s=12` in the screen's URL shortens it for tests.
- Ambiences: the layers of the location fade in and out (3 s) as soon as the location changes, without hysteresis.
- Themes: at the first line of a PNG in the scene the motif starts 0.6 s before the voice (just as the line is scheduled on the
  audio clock), once only; a new or restarted scene re-arms them.
- Ducking: −9 dB just before the voice, rise back after 1.4 s of silence (no pumping between sentences).
- Memory: the bytes of the nearby locations are downloaded; only what plays is decoded; used buffers are freed.
- Screen panel (A key): volume and mute for each bus, remembered in the browser. Credits: C key.
- Tests: `apps/web/src/schermo/audio/*.test.ts` (fake AudioContext) and `apps/web/e2e/audio.spec.ts` (real Chrome, on a server
  of its own: instructions at the top of the file).

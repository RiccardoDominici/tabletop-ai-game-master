# Architecture v1 — "Tabletop AI Game Master" (working name)

An AI master for playing D&D in person. Each player uses their own phone, the projector shows the scene, a speaker carries the voice of the narrator and the characters, and music is always playing underneath. Written on November 1, 2026, after the measured tests (see «Prove fatte» (Tests done)).

## The idea in one sentence

The **software owns the game**: state, rules, dice, secrets and canon are handled by the code, not the model. There are then two models:
- a **fast narrator**, which writes what is heard;
- a **slow director**, which studies in the background and improves everything.

The Game Master's craft is not left to the prompt: it is imposed by the structure (see «Manuale del master» (Game Master manual), rules E1–E15).

## Tests done (November 1, 2026, measured figures)

**Text**
- **LFM 2.5 2.6B** (OpenRouter and local): discarded.
  - Ungrammatical Italian.
  - Reveals the private action in 5 checks out of 5, locally.
  - In reasoning mode, which is the default, the visible text arrives after 5 s (OpenRouter) and after 49 s (locally).
  - The free version often hits the request limit.
- **Claude Haiku 5.5**, with reasoning off and low effort: passed.
  - First word in 0.55 s, first complete sentence in 0.93 s, total 1.7 s.
  - 0 leaks of private actions and 0 contradictions, across 30 narrations.
  - Parsing of actions: valid JSON 10 times out of 10, correct interpretation 9 out of 10.
  - Dialogue split by voice: valid 5 times out of 5.
  - Dice tool used correctly 3 times out of 3.
  - Cost: 85 calls for $0.018.
  - Flaws: long sentences (19 words on average) and some invented detail. The Engine corrects them (E4, E10).

**Voice**
- **HeyGen voice-1-turbo** (OpenRouter):
  - first audio in 0.8 s; 30 s of audio in 2.7 s;
  - 10 voices, cloning possible;
  - intelligible Italian (Whisper gets 2.8% of the words wrong).
  - Free version until November 30, 2026. On hold until OpenRouter is topped up.
- **Qwen3-TTS 0.6B locally** (MLX):
  - first audio in 0.67 s, streaming;
  - it generates only slightly faster than it plays (0.82–0.87 s for each second of audio): thin margin;
  - clones a voice from an 8 s sample;
  - up to 7 GB of RAM.
  - It is the current voice engine.
- Discarded: Chatterbox (11 s to first audio) and MOSS-Nano (poorly intelligible Italian). Kokoro was not tested: it needs `espeak-ng`.

**Transcription of the players' voices**
- **Whisper large-v3-turbo locally**: 1.6 s for a 5 s sentence, 2.8% of words wrong on clean audio. The errors fall on names (the name «Kara» is heard as «Cara», the Italian word for "dear"), and they are fixed by passing Whisper the list of the campaign's names.

**Music**
- To be generated locally: Stable Audio 3 Small (MLX, community license) or ACE-Step 1.5 (MIT).
- From a library: OpenGameArt / Freesound / Pixabay, CC0 or CC-BY.
- Lyria via OpenRouter as an extra: $0.04 for each clip.
- Nothing listened to yet. A generation test must still be run.

## The six modules

### 1. Engine (deterministic, single source of truth)
It is a server on the Mac and manages:
- **event-based state**: an append-only log in SQLite, from which the state is derived. It allows undos, restarts and the immediate withdrawal requested by the X-card;
  today (apps/server/src/sessione/): `node:sqlite` in `<log folder>/sessioni.sqlite`, events `inizio`, `fotografia`
  (scene, place, mood, situation, clocks, repertoire, notes, pause, turn), `trascrizione_turno`, `tavolo` (actions and
  window) and `dispositivo` (phone → PC), written at each closed turn, at each master command and at each change
  of actions. On startup, a session in progress for the same campaign is rebuilt and waits for the projector: it resumes
  without re-reading the opening; if the narrator was responding, that turn's actions return to the players and the turn
  is replayed. «Nuova sessione» (New session) in the panel, `partita.sh --nuova` or «Ricomincia» (Restart) start another;
  multi-session campaigns (docs/strati.md, D2): the Engine plays the campaign level plus one package
  `sessioni/<nn>/`, chosen from the archive (column `pacchetto`); «Fine sessione» (End session) closes the session and writes the
  deterministic log (`registro.yaml` + `trascrizione.yaml`) from the events, «Prossima sessione» (Next session) rebuilds the
  server on the following package (apps/server/src/ciclo-server.ts) and the phones find their PC again;
- **the SRD 5.2 rules** (CC-BY-4.0, data extracted from the official PDF, attribution required in the credits): dice, checks, CD, initiative, HP. The server always rolls the die: the narration cannot change an outcome;
- **the threat clocks**, the NPCs' attitudes, the clues revealed, the lies already told, the spotlight counters;
- **the canon**: facts `proposto` and `confermato`, with the flag `noto_ai_pg`;
- **the vault**: secrets, unknown entities, private messages.

The model **proposes** changes through tools (`tick_clock`, `reveal_clue`, `set_attitude`, `roll`). The Engine checks the preconditions and accepts or rejects.

It also acts as the **context compiler** (E2): for each call it builds the minimum the model must know.

### 2. Narrator (fast lane, on the critical path)
- Model: **Haiku 5.5**, reasoning off, low effort, streaming. The stable prompt is cached: Style card, writing rules, scene sheet.
- Writes **structured segments**: `{tipo, voce, testo, destinatario_pg, mossa, indizi_rivelati, fatti_nuovi, tick, musica}`.
- **Every important NPC speaks through a separate call.** That call sees only that NPC's sheet (`sa`, `crede_a_torto`, `mente_su`, lies already told) and the public transcript. What it does not know, it cannot say.
- **Filters before the voice** (E4–E6, under 10 ms for each sentence):
  - sentence length;
  - list of banned stock phrases;
  - agency guard: the narrator does not decide on behalf of the player characters;
  - anti-leak guard against the vault.
- The narrator works **one sentence ahead**, so the filter can hold back a sentence without gaps in the audio.

### 3. Director and Critic (slow lane, in the background, never on the critical path)
During the session it uses a strong model via API (Opus 5.5, high effort, asynchronous calls; estimated about $1 for each session). It does five things:
- **scene critic** (E11): scores on 12 criteria at the end of the scene; at most 3 *director's notes* that stay in the narrator's prompt for 15 turns;
- **canon extractor** (E10): finds facts the narrator invented and did not declare, checks for contradictions, repairs them within the fiction;
- **important decisions**: when the players leave the script, when a threat advances, when an NPC changes sides, when an essential clue risks being lost. The narrator improvises a **soft move** right away, the director decides calmly and the narrator applies the decision on the next turn;
- **speculative pre-generation**: prepares in advance the places and NPCs the group is heading toward (sheet, image, music choice);
- **completes the sheets** of improvised NPCs that reappear.

Between sessions it uses **Claude Code** (subscription): session summary, threat progression, preparation of the next session, quality review. It is the background «studio» (study).

### 4. Preparer (before the campaign, offline)
It is Claude Code with a dedicated skill, which uses the «Manuale del master» (Game Master manual) as its specification, plus a command-line validator of the Engine (E1). It generates a campaign folder in YAML, versioned with git:
- **Style card**: tone, the narrator's style of speech, prose rules, `[STILE]` for images, musical palette, lines and veils;
- **fronts**: threats with clocks and the villain's timeline, and what happens if the player characters do nothing;
- **nodes and scenes** (sheet required), with clues following the 3-clue rule (≥3 clues, in ≥2 places, of ≥2 types);
- **NPCs** (sheet required: two-layer personality, knows / does not know / wrongly believes / lies about, voice, attitude toward each player character, evolution);
- **assets**: images of places and portraits, tracks for each mood tag, one voice for each NPC (reference clip).

**If the sheets are not valid, the session does not start.** Before each campaign the **attack test series** runs (E15): with even a single leak, the campaign does not start.

### 5. Voice and listening
- **Speech synthesis** behind a `TtsProvider` interface, so the engine can be changed without touching the rest:
  - **Fish Audio's drama-3 via OpenRouter**: the game's voice from November 9, 2026 (`TAGM_VOCE=fish`,
    default in scripts/partita.sh). PCM at 44.1 kHz streaming, with expressive directions: the narrator
    writes `[offesa, a voce bassa]` ("[offended, in a low voice]"), sounds (`[sigh]`) and tags (`<whisper>…</whisper>`), and the voice performs them
    without reading them aloud. The projector, phones and transcript show only the words. Sources and measurements in
    docs/ricerca-voce-drama3.md;
  - `QwenLocal`: the fallback. If drama-3 does not respond (after a retry) Qwen is used, if it is on;
    otherwise the sentence stays as text on screen and the turn moves on.
- **«Ascolta qui»** (Listen here): each phone can turn on the game's voice for itself too. The voice of the outcome of
  a private action goes only to that PC's phone, never to the projector (`solo_pg`).
- **Costs**: at the end of the turn a `tipo: voce` line in logs/costi.jsonl, next to the LLM's;
  scripts/costi.sh sums it for each session.
- **Voice log**:
  - the narrator has a fixed voice;
  - each NPC has a `voce_id` and a reference clip. The validator forbids identical voices in the same scene and checks the pitch distance between voices.
- **Queue, sentence by sentence**:
  - the narrator generates, the filter checks, the synthesis speaks;
  - fixed lines (a sample sentence of an NPC, introductions, greetings) are **pre-recorded**;
  - with Qwen locally, the first sentence of a cloned line is produced in advance, so the voice does not break off.
- **Listening**: hold-to-talk from the phone; the audio goes to the Mac, where Whisper turbo transcribes it locally. The campaign's names are passed to it in advance.

### 6. Music, ambience, images
- **Music**: a closed vocabulary of tags (exploration, tavern, tension, mystery, battle, boss, pathos, victory, rest, horror…), with 2–3 tracks for each tag and each campaign, all in the same style.
  - The narrator proposes the tag; the Engine applies hysteresis: at least 60–90 s before changing, except at the start of a fight.
  - Crossfades between tracks; the music ducks under the voice (Web Audio).
  - One ambience layer for each place (rain, crowd, drips).
- **Images**: pre-generated for places and NPCs, combining the invariants and `[STILE]`, so faces and places stay consistent (E14).
  - If an image is missing, the closest one stays or an atmosphere image until the new one is ready.
  - The generator is still to be chosen: OpenRouter when it is back, or locally.

## Interfaces

**Phone** (web app, entry via QR or room code):
- character sheet;
- hold-to-talk and text;
- **private** switch;
- private messages box;
- dice roll with one tap;
- action status: *queued / superseded / resolved*;
- **Annulla** (Undo) button;
- anonymous X-card.

**Screen/projector**:
- scene image with a slow camera movement;
- portrait and name of the speaker;
- initiative order in combat;
- all the audio: voice, music, ambience.

**Master panel** (on the Mac): state, clocks, canon, director's notes, emergency buttons. It is important, not an extra: existing projects (CALYPSO, Friends & Fables) teach that a human must be able to correct or stop the AI master.

How it works today (`/master`, contract in `packages/shared/src/master.ts`):
- **Access**: on startup the server prints the line `PANNELLO MASTER` in the log with the link `http://localhost:4610/master?token=…`
  (`scripts/avvio.sh` also shows it). The token changes at every startup (or is fixed with `TAGM_MASTER_TOKEN`), opens the
  Socket.IO room `master` and is never in the QR: the phones cannot enter (five failed attempts close the socket).
- **Sees**: scene and place on the projector, clocks with the marks shown and the next one, action window, pending actions
  with status and links (private ones too, marked), public transcript, director's notes, repertoire lines (mode B)
  and the command log.
- **Commands**:
  - **Pausa / Riprendi** (Pause / Resume): no new window. With a window open, it stays open but does not close on its own
    (the countdown of the frantic pace stops, and on resume it starts again from the beginning); during a narration it is
    let finish and then the table stops (phase `pausa`). Phones can write: the action enters on resume. The
    pause is set and lifted only by the master: the Engine never stops on its own.
  - **Ferma la narrazione** (Stop the narration): immediately interrupts the LLM and voice, the screen goes silent and the table pauses. That turn's actions
    were not resolved: they return to the players as «non è andata» («it didn't go through»), to be resubmitted.
  - **Cambia luogo** (Change place) (fade on the projector), **orologio ±1 segno** (clock ±1 mark), **Risolvi ora** (Resolve now) (closes the window: the narrator responds to the
    actions sent, without waiting for whoever is missing), **ritmo calmo / concitato** (calm / frantic pace), **salta l'azione** (skip the action) of
    a player (it returns to their box; whoever depended on it must decide).
  - **Cambia scena** (Change scene) (campaigns with `scene/*.yaml`): the narrator's context and the active clocks of the new scene (the clocks
    keep their state across scenes), place on the projector, scene lines; pending actions return to the players,
    the narrator reads the opening and the window opens for everyone.
  - **Situation images** (`situazione_<png>_<id>`, never used as portrait or place): the master puts them up and takes them down;
    in mode B the Engine shows them by itself at the end of the narration when the linked revelation comes out
    (`aspetto.situazioni[].dopo`, or the NPC clue whose `come_si_trova` names the situation), and the place returns
    when the next narration starts.
  - **Director's notes**: at most 3, from 1 to 15 turns; they enter the narrator's message (variable part, outside the cache) from the
    next turn, and each narrated turn uses up one. They reset when the scene restarts.
- **Log**: every command, successful or rejected, is a line in `logs/master.jsonl` and in the server log (`evento: master`).
- **No spoilers** (on by default, switch at the top, choice saved in the browser): whoever acts as master often also plays
  too. The panel hides the name, marks and «a orologio completo» (clock fully filled) of the clocks («Orologio 1 · segni 1/6 · dovuto» (Clock 1 · marks 1/6 · due)), the
  content of private actions (author and status remain), the lines not yet delivered (only the count, for the one who speaks) and the
  true type of those delivered, and the situations not on air. Commands, states, counts, transcript, log and notes remain visible.

**Connection and constraints of the phones** (from the research):
- **Socket.IO v4**, with one room for the table and a `player:<id>` for each private channel. On reconnection it resyncs based on the state's version number. Audio clips are sent via an HTTP POST.
- **HTTPS is required even on the local network**, otherwise the microphone does not open: `http://192.168.x.x` is not a secure context. There are three routes, to try on real phones in F2:
  - an HTTPS tunnel, for example Cloudflare: you enter via QR and install nothing;
  - mkcert, which however requires installing the certificate on every phone;
  - Tailscale, which requires the app.
- **Audio formats**: recording uses MediaRecorder, in the format the phone supports (Safari mp4/AAC, Chrome webm/opus). The server converts with ffmpeg.
- **Screen**: a click on «Inizia sessione» (Start session) unlocks the audio, because browsers block automatic playback. On phones Wake Lock is used, so the screen does not turn off.

## Turns and undoable actions

Every scene has a **version number**. Every action sent carries the version it was written against.

**Exploration and dialogue: windows.** When the narration ends with an invitation to a player character, a window opens.
- The window closes in one of three cases (docs/f0-contratti.md, «Turno» (Turn)):
  - all invited players have sent (sending = ready), after 2.5 s of settling;
  - at the frantic pace (requested by the narration), at the deadline: 25 s after opening;
  - the master presses «Risolvi ora» (Resolve now).
- At the calm pace there is no deadline nor any move against stalling: if nobody writes, the game waits. A watchdog
  resumes the game if the Engine stays stuck (model, voice) with no signs of life.
- While the window is open, every action can be edited or undone.
- On resolution, actions written against an old version become **superseded**. The phone asks: «La scena è cambiata: confermi o riscrivi?» («The scene has changed: confirm or rewrite?»).
- Example: «faccio un passo avanti» («I take a step forward») while the narrator is speaking. If your companion gets there first, your action is marked as superseded instead of being carried out blindly.

**Combat: rigid initiative.** One turn at a time, with a soft timer; the undo problem does not arise.

**Private actions**: resolved by the Engine. The outcome goes only to the phone of whoever made them. Only what the others can perceive ends up in the public narration, and the vault checks it.

## Expected latency (estimate from the measured figures)

From the moment the player releases the button:
- Whisper transcription: about 1.6 s;
- closing of the window: variable;
- first Haiku sentence: about 0.9 s;
- filter: under 0.01 s;
- first Qwen audio: about 0.7 s.

Total: **about 3.5 s, plus the wait for the window.** To make it feel shorter, meanwhile:
- on screen «Kara si avvicina…» («Kara is approaching…») appears immediately, with a confirmation sound;
- the music never stops.

## Technology

- **Server and client** in TypeScript on Node, reusing Agorà's setup: single server, Vite, rooms, comic-style interface. Official Anthropic SDK, with `baseURL` fixed to api.anthropic.com and not to the :4000 proxy.
- **ML component** in Python, for MLX (mlx-whisper, mlx-audio with Qwen3-TTS). It is a local HTTP service, separate because the MLX libraries are in Python.
- **Data**: the campaign in YAML with git; the session in event-based SQLite; the assets as files.
- **Optional: MCP server** so Claude Code can read the state and write director's notes during the session. It is the original idea, which remains as a tool of the director, not as the engine.
- **Modular code**: one module for each responsibility (engine, context, narrator, NPCs, filters, canon, director, voice, music, transport). Structured log of each call, with latencies and costs.

## Work plan (each phase verified before the next)

1. **F0. Full test**: one scene, phone in text-only, Haiku, Qwen, screen. Real latency is measured in the room.
2. **F1. Engine**: campaign schema, validator, context compiler, separate NPC calls, filters E4–E6, canon.
3. **F2. Phones and screen**: hold-to-talk with Whisper, private actions, undo and versions, music ducking under the voice.
4. **F3. Preparer**: Claude Code skill and a first short adventure (3–5 places, 4–6 NPCs), assigned voices, library music.
5. **F4. Director and critic** in the background, attack test series, rubric.
6. **F5. Generated assets**: music (Stable Audio 3 / ACE-Step), images, switch to HeyGen after the top-up.
7. **F6. Full combat**: initiative, SRD 5.2 monster sheets.

## Main risks

- **Qwen locally has a thin margin**: it generates only slightly faster than it plays, and even less with cloned voices. Countermeasures: pre-recorded lines and a sentence of lookahead. Then HeyGen.
- **Real audio in the room**: noise and overlapping voices will make Whisper err more than in the tests. Countermeasures: phone close to the mouth and campaign names passed to Whisper. Text always remains available.
- **16 GB of RAM**: Whisper (about 2.5 GB) and Qwen (up to 7 GB) together fit. Music and images must be generated beforehand, never during the session.
- **Disk**: about 16 GB free. Models are downloaded one at a time.
- **Haiku invents details**: the canon extractor catches them. Contradictions are repaired within the fiction.

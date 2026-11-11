# F0 — contracts between the parts

Phase 0: one complete scene. The player writes the action on the phone, Haiku narrates in streaming,
the local voice (Qwen3-TTS) speaks, the screen/projector plays the audio and shows who is speaking.
Goal: measure the real latency and hear the quality. This file fixes the interfaces, so that the parts
can be built in parallel. Whoever changes a contract updates this file.

## Repository structure

```
apps/server        @tabletop-ai-gm/server   Node + TypeScript (Fastify + Socket.IO v4)
apps/web           @tabletop-ai-gm/web      React + Vite: pages /telefono and /schermo
packages/shared    @tabletop-ai-gm/shared   types of the Socket.IO events and messages
services/voce      Python MLX service (Qwen3-TTS), its own venv in services/voce/.venv
assets/voci        reference clips of the voices + voci.yaml (registry)
campagne/prova-f0  content of the test scene (YAML, schema from the manual)
prompts            model prompt texts (markdown, loaded by the server)
scripts            start/stop of everything
logs               JSONL logs (outside git)
```

## Ports (all local)

| Service | Port | Bind |
|---|---|---|
| server (API + Socket.IO + compiled web pages) | 4610 | 0.0.0.0 (phones connect from the LAN) |
| voice service | 4611 | 127.0.0.1 (only the server calls it) |
| Vite dev (development only, proxy to 4610) | 4612 | 0.0.0.0 |
| test instance (e2e while a game is running): `TAGM_PORTA=4710 scripts/avvio.sh` | 4710 (or other) | 0.0.0.0 |

A test instance does not touch the real game: logs and compiled pages go to `logs/porta-<porta>/`
(apps/web/dist is not rebuilt), the voice is always fake (the service on 4611 stays with the real game),
stop it with `TAGM_PORTA=<porta> scripts/arresto.sh` (stops only that port). The Playwright tests point
to 4710 by default (`apps/web/e2e/percorsi.ts`; other ports with `E2E_PORTA`).

## Voice service (HTTP, 127.0.0.1:4611)

- `GET /salute` → `{"pronto": bool, "modello": str, "sample_rate": int, "formato": "pcm_s16le", "voci": [str]}`.
  `pronto` is true only after the model has loaded and warmed up.
- `POST /tts`, JSON body `{"id": str, "voce": str, "testo": str}`.
  - Response `200`, `Content-Type: application/octet-stream`, headers `X-Sample-Rate` and
    `X-Formato: pcm_s16le`. Body: 16-bit little-endian mono PCM **streamed** (chunked), one chunk as soon
    as the model produces it.
  - `404` with JSON `{"errore": ...}` if the voice does not exist; `400` if the text is empty.
  - Requests are queued and generated **one at a time** (MLX on a single thread), in arrival order.
  - If the client closes the connection, generation stops at once (needed to interrupt the narration).
- `POST /annulla`, body `{"id": str}` → stops the generation or removes it from the queue. Responds
  `{"annullata": bool}`.
- `POST /sveglia` (added after the measurements): does not block; if the worker is free it runs ~0.8 s of
  empty generation, interrupted as soon as a real request's first chunk arrives. After a 20 s pause the
  first audio rises from ~0.37 s to 0.5–0.9 s; with the wake-up call it goes back to ~0.39 s. **The server
  calls it at the moment it closes the actions window**: the LLM's first sentence arrives after ~0.9 s, and
  the wake-up call fits inside that.
- JSONL log `logs/voce.jsonl`: id, voce, caratteri, attesa in coda, primo audio, totale, secondi di audio,
  RTF, annullata.

F0 voices (registry `assets/voci/voci.yaml`, id → clip + clip text): `narratore` (the narrator's fixed
voice), `vincent`, `nadine`, `lucian`, `tabitha` (voices for the NPCs).

## Game voice: drama-3 via OpenRouter (from 9 November 2026)

- Server → `POST https://openrouter.ai/api/v1/audio/speech` `{model: 'fish-audio/drama-3', input, voice: <fish>,
  response_format: 'pcm'}` → PCM s16le mono at **44.1 kHz** (from the `Content-Type`), streamed. `fish` is the
  reference_id of the public voice written for each voice_id in `assets/voci/voci.yaml`. Key:
  `OPENROUTER_API_KEY` from the environment, then the line in the `.env` at the root, then (fallback) the file
  `TAGM_CHIAVE_OPENROUTER` (default ../agora/.env); the lookup lives in `apps/server/src/llm/chiavi.ts`.
  Never in the logs.
- One sentence per request. The request succeeds only if the first audio chunk arrives (within 6 s); then one
  retry, then Qwen if allowed and ready (never on test instances), then text only: the sentence is announced
  with a silence as long as its reading, and the turn does not stop (apps/server/src/voce/riserva.ts, pipeline.ts).
- `audio:frase.sample_rate` changes per sentence (44100 with drama-3, 24000 with Qwen and for sentences without a voice).
- `audio:frase.solo_pg` (optional): the sentence is private and goes only to the room `ascolto:<id_pg>` (phones of
  that PC with «Ascolta qui» (Listen here) on). Event `telefono:ascolta {attivo}` → rooms `ascolto` and `ascolto:<id_pg>`.

## Expressive voice in the protocol lines

Inside the text of `[narratore]` and `[<id_png>]` (and in the repertoire lines):
- `[direzione]` at the start of a line, short, in Italian, no full stops: it applies to the whole line (the server
  carries it over to the following sentences, because each sentence is a request of its own). Without a direction
  the default applies: NPC sheet (`voce.tts.direzione`, otherwise character, timbre, age, speed) or style card
  (`direzione_voce`, otherwise the first sentence of `registro_narratore`).
- Sounds: `[sigh] [laugh] [breath] [pause]` (and similar), where they fall.
- Paired tags, closed in the same sentence: `<whisper> <emphasis> <soft> <fast> <slow> <stress> <forceful>`.
- The server removes all this from what is shown, from the transcript and from the history given to Haiku, and
  sends it only to drama-3, after a guard: unknown tags, closings without an opening and directions over 80
  characters are removed and logged; a tag still open at the end of a sentence is closed there and reopened in
  the next sentence of the same line. Qwen receives only the words.

## Narrator's exit protocol (Haiku, streamed text)

The narrator writes **only labelled lines**, one per segment. The server reads them as they arrive, splits them
into sentences and sends each sentence to the right voice.

```
[narratore] Narrated text, in the present tense, addressed to the group.
[<id_png>] Line spoken by the NPC, without quotation marks and without «disse» (said).
[invito] <id_pg>,<id_pg>
```

- `[narratore]`: the narrator's voice.
- `[<id_png>]`: the id is that of the file `campagne/<campagna>/png/<id_png>.yaml`; the server uses its
  `voce.tts.voce_id`. An unknown label is read with the narrator's voice and ends up in the log as an error.
- `[invito]`: **last line, mandatory**. List of the ids of the player characters invited to act (or `tutti`).
  It is not read aloud: it opens the actions window for those players. If it is missing, the server invites
  everyone and logs the error.
- `[orologio] <id_orologio>`: optional, immediately before `[invito]`, only in the response where the narrator
  has shown the **next sign** of that clock. It is not read. It is the light version of `tick_clock`: the Engine
  checks that the clock exists, is active and not complete, then advances the index; otherwise it refuses and
  logs. The Engine keeps the state of the clocks and puts into the context of every turn «orologio X: segni
  mostrati N di M, prossimo segno: …» (clock X: signs shown N of M, next sign: …), so the narrator does not have
  to reconstruct it from the transcript.
- `[ritmo] concitato` / `[ritmo] calmo`: optional and rare, immediately before `[invito]`, not read (also in the
  selector's protocol). `concitato` (frantic) when the narration becomes frantic (combat, chase, imminent danger):
  the window that opens next has a countdown. `calmo` (calm) when the situation calms down. The last line of the
  response counts; an unknown value is ignored (anomaly `ritmo_sconosciuto`). The pace also comes from the scene
  (`ritmo: concitato` in scena.yaml, on entering the scene), and the master changes it from the panel; changing
  scene restores the scene's pace. While `concitato` holds, the turn's message has the section «## Ritmo» (Pace),
  which reminds the narrator how to return to calm.
- `[umore] <tag>` and `[effetto] <tag>`: optional, rare, not read (also in the selector's protocol). They apply to
  the sentence that follows; the vocabulary, the limit of one mood per minute and the timings are in
  docs/audio.md («Segnali automatici» (Automatic cues)).
- `[privato pg_id] testo`: the outcome of a PRIVATE action, only for that PC (also `[privata …]`, and with the
  PC's id, alias or name). Narrator's voice, one or two sentences. It does not go to the projector nor to the
  public transcript: the server sends it to that PC's phone (`privato:esiti`, the full list, also when the PC is
  chosen or after a resume) and writes it to the archive (`privati_turno`). In the log it sits under the private
  action (`risposta_privata`); in the narrator's context it goes into «Esiti privati già dati» (Private outcomes
  already given). The voice goes only to the phones of that PC with «Ascolta qui» on (`solo_pg`); if nobody is
  listening, the sentence is not synthesized. The reason: the browser plays nothing without a tap, and a phone
  that speaks by itself at the table would let the secret be heard by the neighbours. With the speaker on, it is
  the player who chooses to listen, perhaps with headphones. A PC not recognised: line discarded and an error in
  the log, never in public. In mode B, a `[usa] id > pg` line towards a private action goes in the same way, and
  only to that PC. Private rolls (dice) use this channel too.
- Lines without a label: they are appended to the previous segment (tolerance), with an error in the log.
- Names to pronounce: before synthesis the server replaces the NPCs' names with the spelling in their `pronuncia`
  field (e.g. «Bàldrin»), only in the text sent to the voice, not in the text shown.

## Campaign files (F0)

`campagne/<id>/`: `stile.yaml`, `campagna.yaml` (fronts and clocks with visible signs in order, clue graph,
villain's agenda, secrets, canon log `canone: [{id, testo, noto_ai_pg}]`), `scena.yaml`, `png/png_<nome>.yaml`,
`pg.yaml` (`situazione_comune` + `personaggi: [...]`).
- The NPC fields `sa`, `non_sa`, `mente_su.verita` contain ids of canon facts; the compiler resolves them into text.
- Context order for the narrator in F0: stile, campagna, scena, png (in order), pg. In F1 it becomes «solo ciò che
  serve» (only what is needed) (E2).
- Ids: NPC `png_<nome>` (also the protocol label), PC `pg_<nome>`. The server accepts the label even without
  `png_` and regardless of case, with a warning in the log.
- `conoscenze_private` of each PC go **only** to that player's phone, never to the table or the screen.
- Multi-session campaigns: `sessioni/<nn>/` (sessione.yaml, scene/, png/, repertorio/, immagini/, audio/) merges
  into the campaign level with the rules of docs/strati.md («Regole di unione» (Merge rules)); a campaign without
  `sessioni/` loads as above. At the end of a session the server writes `registro.yaml` and `trascrizione.yaml`
  into the package.

## Turn

Revised after Riccardo's requests of 9 November (docs/richieste-2026-11-09.md, points 1, 3, 5 and 7): no deadline
under normal conditions, sending = ready, the countdown only when the narration asks for it, never a pause
without an end.

1. When the scene starts, the server has `campagna.yaml → sessione.riassunto_iniziale` read aloud (if there is
   one; in a multi-session campaign, `sessioni/<nn>/sessione.yaml → riassunto_iniziale`), then the opening of the
   first scene, with the `narratore` voice, and opens the window for everyone.
2. Window open: each invited player writes an action, which they can edit or withdraw. On the phone there are
   only «Invia» (Send) and «Ritira» (Withdraw): sending means "I'm done", there is no «Pronto» (Ready) to press
   afterwards (whoever wants to do nothing writes «Aspetto» (I'm waiting)). You can also write while the window is
   closed, while the narrator prepares or speaks: the action enters the window afterwards.
3. The window closes:
   - when **all the invited have sent** (with `tutti`: all PCs with a connected phone) and no action is waiting to
     be confirmed, after a **settling** period of 2.5 s (`TAGM_ASSESTAMENTO_MS`) for an «anch'io» (me too) or a
     correction: every send, withdrawal or confirmation restarts it, and whoever is typing extends it, up to a
     maximum of 8 s. A disconnected phone is not waited for; if it rejoins, it is waited for again;
   - at the **frantic pace** (`concitato`), at the deadline: `TAGM_CONCITATO_MS` (25 s) from the opening of the
     window. At expiry it is extended by at most 8 s for whoever is writing or must confirm; then the «da
     confermare» (to be confirmed) become «sospese» (suspended), and it is resolved with what there is (even
     nothing: then the world makes a move);
   - with the master's **«Risolvi ora»** (Resolve now) (command `chiudi_finestra`).

   At the calm pace there is no deadline: if nobody writes, the game waits (no moves to break the stall, no
   pause for inactivity). A queued action never starts a countdown. `finestra.aspettiamo` says who is missing
   («Aspettiamo: Paolo e Giulia» (We're waiting for Paolo and Giulia) on the projector, phones and panel);
   `finestra.chiusura_prevista_ms` exists only at the frantic pace; `StatoTavolo.ritmo` gives the pace.
4. The server compiles the context (style + scene + NPCs + PCs + public transcript + actions), calls Haiku in
   streaming, reads the lines, sends the sentences to the voice and forwards the audio to the screen. Meanwhile
   the phones show «Il narratore sta preparando…» (The narrator is preparing…), then «sta raccontando…» (is
   narrating…).
5. When `[invito]` arrives, at the end of the narration, the next window opens by itself, with the pace requested
   by `[ritmo]`, if there was one.
6. **Pause**: only the master sets and removes it (**Pausa** (Pause) / **Riprendi** (Resume), **Ferma la narrazione**
   (Stop the narration)). Not even the end of a scene pauses: the window reopens and the master receives the notice
   to choose how to go on. While paused, the phones can write, and the actions enter on resume.
7. **Watchdog** (`apps/server/src/scena/sorvegliante.ts`): at the opening and during the narration, every sign of
   life (LLM sentence, request and voice audio chunks, audio starting on the projector, expected audio duration)
   moves a deadline (`TAGM_SORVEGLIANTE_MS`, 60 s; 0 = off). If it passes with no signs of life, the Engine records
   the cause (log and `narrazioni.jsonl`, a line of type `sorvegliante`: «il modello non risponde» (the model is not
   responding), «la voce non ha finito le frasi del turno» (the voice has not finished the turn's sentences), an
   exception), stops the LLM and the voice, and reopens the window for everyone. If the narrator had not yet said
   anything, the turn's actions go back to the players («non è andata» (it didn't work), to be resubmitted) and a
   fallback line from the narrator remains, text only. Even an exception in a narration flow restarts the game at once.

## Evening: recap, duration, guided closing (docs/strati.md, «Riassunto e chiusura della serata» (Recap and closing of the evening))
- **StatoTavolo**: `la_volta_scorsa` (text read at the start of the evening, until the first window is closed),
  `fine_serata` (`{riassunto: {etichetta, quando, testo, fili}, di_riserva}` after «Chiudi la sessione» (Close the
  session), until the game resumes), `diario` (`{serate, stasera}`: public, the same for everyone; private outcomes
  stay in the `privato:esiti` event of the PC's room).
- **Master**: commands `{tipo: 'chiudi_sessione'}` and `{tipo: 'durata_sessione', ore}` (0.5–8);
  `StatoMaster.sessione.serata` = `{ore, origine_ore, minuti_passati, minuti_rimasti, fine_vicina, climax,
  chiudibile, chiusura_in_corso, chiusa}`.
- **Narrator**: section «## Tempo della serata» (Evening's time) in the turn's message when the end is near
  (advice); closing message with «## Chiusura della serata» (Closing of the evening) (no actions, no `[usa]`, last
  line `[invito] tutti`).
- **Log**: `narrazioni.jsonl` has a line `tipo: chiusura_serata` (origin of the recap, reason for the fallback, text,
  threads); the session snapshot carries `serata` (`riassunti`, `chiusa`, `oreMaster`).

## Latency measurements (for each turn, in `logs/turni.jsonl`)

All times in ms from the moment the window closes (`t0`), plus the duration of the window itself:
`finestra_ms`, `llm_primo_token`, `llm_prima_frase`, `voce_richiesta`, `voce_primo_audio`, `schermo_inizio_audio`
(the screen tells the server when the first chunk really starts to play), `llm_fine`, `audio_fine`,
input/output/cache tokens and cost in dollars.

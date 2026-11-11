# Layers: the campaign's length decides how much is prepared (project, 3 November 2026)

Request from Riccardo: when personalising the campaign, the estimated duration is stated as a **number of
sessions**; the number of game layers («strati») the framework generates depends on it. A one-shot has few
things; a campaign lasting years has more phases and a complete world. Research: `docs/ricerca-durata.md`.

## Principles
1. **One framework, layers that switch on.** Today's one-shot is the innermost layer. Long campaigns are not
   another program: they add outer layers (arc, campaign, world) on top of the same session package the Engine
   already knows how to play.
2. **Progressive resolution.** What is far away in time or space is a sketch; it becomes detail when it gets
   close. Years of play are not written in advance: the skeleton is written, then one session at a time.
3. **Between one session and the next, the strong model works**, from the log of what really happened. During
   live play Haiku sees only the current session's package, never the whole bible or state.
4. **The log is not written by a model.** The game facts (clues revealed, lines spoken, clocks, choices, NPCs met,
   actions) are extracted deterministically from the session archive (`sessioni.sqlite`). The strong model
   interprets them, but every new fact in the state cites the turn it comes from, and the validator checks it.
   This is the answer to the research's main risk (log written badly → wrong next session). Facts born off-scene,
   when the world moves between sessions, have their own source: `fonte: {tra_sessioni: <n>, motivo}`, and the
   reason names the clock or rule that produces them.
5. **The prepared canon is not touched; the game adds.** The prepared facts (`f_…`, in `campagna.yaml`) stay as they
   are. The game facts (`g_…`, in `stato/stato.yaml`) are added and, when they change a prepared fact, declare it
   (`supera: [f_…]`); a game fact is never deleted, it is superseded by a newer one (`superato_da`). A dead NPC stays
   dead in every later package (validator check).
6. **What the PCs have discovered stops being secret.** Each package carries its own `repertorio/parole_segrete.yaml`,
   which replaces the campaign's; the validator checks that it does not hide facts already known to the PCs. A
   recurring NPC who has learned something has, in the package, its updated sheet (`png/png_<nome>.yaml`, whole sheet
   with the same id), which for that session replaces the campaign's one; the campaign's sheet remains the initial
   version.

## The brief
```yaml
sessioni: 1              # estimated number of sessions (required); "aperta" (open) for a campaign with no end
ore_per_sessione: 2.5    # optional, default 2.5
durata: ""               # stays as a note in words
```
The level is derived from the number with a single table in the code (`strumenti/strati.py`), read by the validator
and cited by the skill. The brief can force a different level (`livello:`) only with the reason in `decisioni.altre`.

## Levels and layers
| Sessions | Level | Layers prepared up front | Prepared between sessions |
|---|---|---|---|
| 1 | **one-shot** | session (situation, 1–5 scenes, NPCs, PCs, canon, clues, repertoire): today's skill | — |
| 2–6 | **arco** (arc) | + arc: premise, arc front with 3–6 stages that advance between sessions, 2–3 acts, dramatic question and possible endings, recurring NPCs, open threads; session 1 complete, the others as a one-line sketch | session N+1 complete |
| 7–20 | **campagna** (campaign) | + campaign: 2–4 regions, 3–5 factions with a goal and a clock, three major conflicts, declared end, PC growth in stages; arcs sketched, only the first complete | state, the factions' turn, next arc when the current one closes, session N+1 |
| 21+ or open | **saga** (saga) | + world: history, geography, cultures, beliefs, long chronology; one area full, the others sketched; phases (game tiers) | like «campagna» (campaign), plus the detail of an area when the PCs reach it |

The thresholds are a first choice (the research gives no numbers); they will be corrected after the trial runs.

## Files
A one-shot campaign stays as it is today (full compatibility). With several sessions:
```
campagne/<id>/
  brief.yaml  stile.yaml  campagna.yaml      # campagna.yaml: canon, campaign fronts, arcs, world rules
  mondo/      regioni.yaml fazioni.yaml storia.yaml          # only from the «campagna» and «saga» levels (campaign and saga)
  png/        sheets of recurring NPCs (a single session's extras live in the session)
  pg.yaml     PCs, with growth
  stato/      stato.yaml                                     # canonical game log: grows after every session
  sessioni/<nn>/                                             # the package: what the Engine plays
    sessione.yaml (title, riassunto_iniziale, scenes in order, pieni_all_inizio, and the session part of
                   campagna.yaml: clocks, canon, revelations, nodes, colli_di_bottiglia; preparazione)
    scene/*.yaml  png/ (NPCs of this session only, or an updated sheet of a recurring NPC)
    repertorio/ (lines and parole_segrete.yaml of the session)  immagini/ audio/ (new only)
    registro.yaml  trascrizione.yaml                         # written at session end from the archive, deterministically
```
`<nn>` is a name made only of digits (two, for the order: `01`, `02`…) containing `sessione.yaml`; the other folders
in `sessioni/` do not count. A campaign with `sessioni/` does not use the root's `scena.yaml` and `scene/`.
Assets that last (portraits of recurring NPCs, places that come back, musical themes) live at campaign level and are
reused; each session generates only the new images and sounds.
The arc prepared up front (premise, stages, acts, endings, recurring NPCs, threads) lives in
`campagna.yaml → preparazione.arco`: it contains the future, and `preparazione` never reaches the narrator
(riferimenti/arco.md).

### Merge rules (the compiler's contract: apps/server/src/campagna/pacchetti.ts and caricatore.ts)
The Engine plays the campaign level PLUS one package. The rules, in one place only (the validator uses them through
`strumenti/unisci_pacchetto.ts`, which writes the merged view as a one-shot with the server's code: a second copy
does not exist):
- **campagna.yaml + sessione.yaml**: the keys of `sessione.yaml` are merged with those of `campagna.yaml`; lists are
  appended (campaign first), and an id repeated across the two is an **error** that names the two files; for the
  other keys the session applies, with a warning. The `sessione` block of campagna.yaml has no effect (the recap is
  in the package). They do not reach the narrator: `riassunto_iniziale`, `scene`, `titolo`, `pieni_all_inizio`,
  `preparazione` (of the campaign and of the session: for example `preparazione.fili`).
- **pieni_all_inizio** `{id_orologio: n}`: the signs already filled on a campaign clock at the start of this session
  (written between sessions from the log and from the world that moves). An id that does not exist is an error; a
  clock not mentioned restarts from the value in campagna.yaml.
- **Scenes**: only `scene/*.yaml` of the package, in the order of `sessione.yaml → scene`; the first one reads
  `riassunto_iniziale` before it. An id listed without a file is an error; a file not listed goes at the end, with
  a warning.
- **NPCs**: png/ of the campaign plus png/ of the package, in id order; a package sheet with the id of a recurring NPC
  **replaces it whole** for that session (this is not the «id ripetuto = errore» case, which applies to lists).
- **Repertoire**: the lines come **only** from the package (those of the session that still apply are copied in from
  the preparation). The package's `parole_segrete.yaml` **replaces** the campaign's (what the PCs have discovered stops
  being secret); without a file in the package, the campaign's applies.
- **Images and audio**: the campaign and package manifests together; on an equal id the package wins (an aged
  portrait); a file name already used by an entry from the other folder is discarded.
- **PCs**: `pg.yaml` of the campaign, in every session; the phones find again the PC of the previous session (the
  master changes or forgets it from the panel, «Telefoni ricordati» (Remembered phones)).

### Which session is played
The archive keeps it (`sessioni.sqlite`, `pacchetto` column of every session played; apps/server/src/sessione/
scelta-pacchetto.ts). At startup, in order: `--sessione N` (`TAGM_SESSIONE`); the session in progress (resume); the
package after the last session closed with «Fine sessione» (End session) (if it is half-prepared and does not load,
one stays on the finished one, with the warning in the panel); the last one played; the first one.
`scripts/partita.sh` asks the server for the same choice and validates exactly that package.

### End session and Next session (master's panel)
- **Fine sessione**: the game stops, the archive's session closes (`motivo_chiusura: fine sessione`), and the server
  writes `registro.yaml` and `trascrizione.yaml` into the package played (a one-shot, in the logs:
  `logs/registri/<campagna>/<id>/`). `scripts/registro.sh <campagna> [--sessione nn] [--controlla]` redoes or checks the
  same files from the archive.
- **Prossima sessione** (Next session): on only if `sessioni/<nn+1>/` exists and it loads as at startup (campaign,
  repertoire, secret words); if the session is still in progress, Fine sessione is done first. The server rebuilds
  itself on the same address with the next package and the same master token: panel, projector and phones reconnect
  as after a restart, and the new session starts from its `riassunto_iniziale`.

### Recap and closing of the evening (requests of 9 November, §9)
- **Chiudi la sessione** (Close the session) (panel): guided closing. The queued actions go back to the players; the
  narrator closes the evening (three to five lines: the moment in progress, a closing image, a hook; no new mysteries;
  in improvised mode B, or a `tipo: chiusura` line from the repertoire if there is one, spoken by the Engine; if there is
  none and the narrator writes no prose, as with the minimal reader, the Engine says the language pack's fixed line
  `regia.righe.chiusura_riserva`). Then the
  projector shows «Cosa è successo stasera» (What happened tonight) (recap, open threads, the PCs' PF, i.e. hit points),
  and the server writes the log and, next to it, `riassunto.yaml` (one entry per evening: `etichetta`, `quando`,
  `testo`, `fili`). The archive's session stays OPEN: a one-shot resumes the next evening (Riprendi, or server
  restart); in a package-based campaign it is closed by «Prossima sessione». **Fine sessione** stays, immediately and
  without narration, for emergencies.
- **The recap** (`apps/server/src/sessione/riassunto.ts`): written by Haiku (the same client as the narrator, a
  different prompt) or by the local model, from the public transcript alone. The Engine waits 20 s, or 3 minutes for
  the local model: in the final E2E an 8B model in 4 bits took 101 s, and with 20 s the fallback was always read. It never uses private actions, `[privato]` lines or facts with
  `noto_ai_pg: false`. Then a deterministic guard: a word from `parole_segrete.yaml` that is still secret and was never
  said at the table makes the text be discarded, and the fallback is read (places crossed and the last signs of the
  clocks, spoken aloud).
- **«La volta scorsa…» (Last time…)** (`apps/server/src/scena/serata.ts`), read before the opening or the resume and
  shown by the projector until the first window closes: a package after one without `riassunto_iniziale` uses the last
  `riassunto.yaml` of the previous package (or has it written from its `trascrizione.yaml`); a closed evening resumes
  from its recap; a session left open and resumed after three hours has its recap written from the resumed transcript.
  The model works in the background from startup; if at «Inizia» (Start) it has not finished, the fallback is read.
- **Durata** (Duration): `ore_per_sessione` of the brief (default 2.5; the Game Master changes it from the panel).
  Twenty minutes before the end, the panel flags it and the turn's message carries advice («avvicinati a una pausa
  naturale» (move towards a natural break)); never during a climax (a scene with `climax: true`, or an active clock one
  sign from the end).
- **Diario** (Diary) (phone): the recaps of the closed evenings (earlier packages included) and «finora stasera» (so
  far tonight) (places, time signs), public; private outcomes stay only on the phone of their PC.

### The log (registro.yaml, format 1; apps/server/src/sessione/registro.ts)
Extracted from the archive's events without models; same archive → same bytes. It contains the private actions: it is
for the master and the Preparer, never for the players. Sections, each with its own turn: `archivio` (id, mode, start,
last event, status and reason for closing, turns), `giocatori` (players), `scene` (from the turn, to the turn),
`luoghi` (places), `situazioni` (situations), `orologi` (clocks) (filled at the start and at the end, each sign with
its turn and cause: narration or master, signs removed, departure), `indizi` (clues), `battute` (lines), `menzogne`
(lies), `fatti_noti` (known facts) (with the line that brings them), `png_incontrati` (NPCs met) (who spoke, first and
last turn), `pg` (PCs) (public and private actions kept separate, exact text and outcome), `momenti` (moments) (the turns
in which the Engine recorded a change, with the lines said and the actions), `note_del_master` (the Game Master's notes),
`avvisi` (warnings). `trascrizione.yaml` sits next to it: the public entries turn by turn, exact text. In mode A the
Engine does not keep clues, lines, lies and facts: those sections are `null` and a warning says so.

## The cycle between sessions
1. **Fine sessione** (master's panel): the server writes `sessioni/<nn>/registro.yaml` from the archive.
2. **State**: the strong model updates `stato/stato.yaml` from the log and the transcript; every fact cites `sessione`
   and `turno`; open threads and the PCs' promises remain until they are closed.
3. **The world moves**: the clocks of the fronts and factions advance with fixed rules (how many signs per session,
   what makes them run or slow down); the strong model writes what changed off-scene.
4. **Session N+1**: the same steps as today's skill, starting from state and arc: session situation, scenes, NPCs,
   repertoire, and the recap to be read at the opening (from the facts in the log, not from memory).
5. **Validator**: today's classes on the package, plus STATE (every fact has a source) and CONTINUITY (nothing
   contradicts the state: deaths, objects, promises, who knows what).
6. **Resources**: `prepara.sh` on the package, only for what is missing.

## Work phases
- **D1** level in the brief: `sessioni`, `strumenti/strati.py`, check in the validator, «Strati» (Layers) section of the
  skill. A one-shot does not change.
- **D2** server (done 3 November): packages `sessioni/<nn>/` (a campaign without `sessioni/` is a one-shot), PCs that
  persist, «Fine sessione» that writes the log, «Prossima sessione», `scripts/registro.sh`,
  `strumenti/unisci_pacchetto.ts`, `partita.sh --sessione`. Tests: apps/server/test/pacchetti, cicli, registro,
  registro-cli; e2e apps/web/e2e/pacchetti.spec.ts (two-session fixture `apps/server/test/fixtures/campagne/arco`).
- **D3** skill «tra le sessioni» (between sessions) and the STATE and CONTINUITÀ classes of the validator.
- **D4** real test: an arc of three sessions generated from a new brief, played automatically session by session (the
  blind scripts see only the public transcript and the recap, like the players), the cycle between sessions, a blind
  judge on continuity and quality.
- **D5** levels «campagna» (campaign) and «saga» (saga): world bible, factions, arcs in blocks; test with a generated world.

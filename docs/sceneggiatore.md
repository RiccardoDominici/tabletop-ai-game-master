# The scriptwriter

With the fully local profile, the reader is a small model that **does not write prose**. For each action it chooses a
line from the repertoire, or answers «nessuna» (none) (`apps/server/src/llm/minimo.ts`). Before, when the answer was
«nessuna» (none), the table heard only the announcement and, if there was one, a waiting line. The scriptwriter closes
the gap: **Claude Code says exactly what to say, the small model reads it**. It uses the subscription of whoever plays,
through Claude Code in non-interactive mode (`claude -p`), in the user's project: never the direct API, never an OAuth
token used for direct calls.

## When it works
- **After each turn, in the background**, while the players talk. The turn has no deadline, so there is time. The server
  writes two kinds of request:
  - `subito`: for each public action to which the reader has not given a line. A reply consisting only of a waiting line
    (filler) also counts as «nessuna» (none). The answer is ONE line, the one the table is waiting for;
  - `prossime`: 6 lines for the most likely actions of the next turn, one for each NPC present;
  - `chiusura`: at «Chiudi la sessione», when no `tipo: chiusura` line of the repertoire fits the current scene and
    state. The answer is ONE narrator line of type `chiusura`, written from the evening's public transcript (the last 80
    lines) and the public state: the moment where the table stops, a closing image, a hook on a thread left open.
- **One request at a time**: first the `chiusura`, and then every waiting `prossime` is skipped, because the evening is over;
  then the `subito`, the oldest; then the most recent `prossime`. The older ones are skipped, because the scene has
  already moved on.
- **Models**: the `subito` and the `chiusura` with sonnet. «lettore» (reader) measured `claude -p`: a line in about 4 s with sonnet, about
  7.5 s with haiku, and sonnet writes it even better; the table is waiting for it. The `prossime` go with haiku, because
  nobody is waiting for them and they use less quota. The variables `TAGM_SCENEGGIATORE_MODELLO_SUBITO` and
  `_PROSSIME` change them. The local reader says «nessuna» (none) about once in two, so the scriptwriter is the main
  source of prose. For this reason the `subito` always go first, and each NPC has its own waiting line.
- **Private actions**: them too. The reply goes to that PC's phone (private outcome, voice `solo_pg`), never to the
  transcript. If it arrives late, it stays in the repertoire with the gate `privata: true`: it will answer only a
  private action.
- Only when the reader is the minimal profile and the scriptwriter process is running (recent `vivo.json`). The server
  never waits for the scriptwriter before moving on.

## What it reads
The request (`apps/server/src/sceneggiatore/protocollo.ts`) carries:
- the scene and the NPCs present;
- the action to resolve (`subito`);
- the last 30 lines the table has heard;
- the state: revealed clues, known facts, lines already used, clocks;
- in the background requests (`prossime`), `nomi_senza_pronuncia`: capitalised words heard at the table that the
  pronunciation lexicon does not know (docs/pronuncia.md, «During play»).

The process adds, from the campaign files:
- the narrator's context of mode B (public NPC sheets with voice, register, `mai_dice`, scene; no secrets,
  `repertorio/contesto.ts`);
- the list of secret words, not to be said;
- three lines of the scene, as an example of the format.

The rule set is not needed: the scriptwriter decides no outcomes or rolls, because those are made by the checks Engine.

## What it writes
Lines in the repertoire's format (docs/repertorio.md): `id` with the given prefix, `chi`, `tipo`, `quando`, `temi`,
`testo`. Only `reazione`, `momento`, `richiesta`, `rifiuto`, `saluto`, from one to three lines, short sentences for the
voice. Next to the lines, optionally, `pronunce: [{nome, grafia, nota}]` for the proper nouns among `nomi_senza_pronuncia`
and for a new name of its own lines: the Engine checks them and adds them to `pronunce-gioco.yaml` (voce/lessico-vivo.ts).

## The check (`sceneggiatore/valida.ts`)
The same rules as the prepared repertoire, plus those for whoever writes on the fly:
- **form**: the repertoire loader reads the lines like any file (fields, types, labels, NPCs with a sheet). The Engine
  enforces `scena` = the one in progress and `max_usi: 1`, and corrects an `id` without prefix or one that is repeated.
  A missing `tipo` is deduced from who speaks (an NPC `reazione`, the narrator `momento`; `chiusura` for a closing request)
  and logged as a correction (`corrette`); a type that is given but not allowed (a clue, a confession) is refused, and
  the log names the allowed ones;
- **voices**: only the narrator or a present NPC speaks;
- **gates and state**: no `richiede` or `effetti`. A line written on the fly does not reveal clues or change facts or
  clocks: the revelations remain the prepared ones, checked by the validator;
- **types**: never clues, confessions, lies, signs, endings, transitions, closings;
- **secrets**: no word still secret that the table has not heard (the same rule as the guard,
  `narrazione/guardia-segreti.ts`);
- **PCs are players**: a narrator line whose subject is a PC («Gunda apre il pugno» (Gunda opens her fist), «Poi Remo si
  alza» (Then Remo stands up)) or a part of their body («Il pugno di Gunda resta chiuso» (Gunda's fist stays closed), «le
  mani di Remo tremano» (Remo's hands tremble)) decides on behalf of a player, and the line is rejected (`pgCheAgisce`).
  The vocative («Gunda, …»), complements, and the genitive of a thing («il boccale di Remo» (Remo's mug)) are fine. The
  prompt goes further: never the body, gestures, gaze or reactions of a PC, only the world and the NPCs;
- **repetitions and tics** (`sceneggiatore/ripetizioni.ts`): the request carries the openings (the first words of each
  sentence) and the images (the first clause) of the last 4 turns, with the rule not to repeat them. The process adds the
  lines it has written recently (the last 6 replies, 10 minutes), which the table may not yet have heard: two replies of
  the same turn go out together, and the second knows what the first one wrote. It also carries the tics that came out in
  the last two lines of each NPC: a line that repeats a tic too soon is rejected, because the narrator's rule applies, at
  most one tic every three lines;
- **voice**: at most 4 lines of 240 characters.

The lines that pass enter the live repertoire **immediately**, and from there into the catalog of the following turns,
with their `temi`. Those that do not pass stay in the log with the reason.

## What the table hears while it waits
1. Immediately, at the turn: the announcement and the waiting line of the scene or of the NPC. The skill always writes it,
   and the validator asks for it (`COPERTURA.attesa_scena`, `attesa_png`, `deviazione_png`).
2. When the line written on request arrives, if the table is still in the window in the same scene and the **ceiling**
   has not passed (90 s, `TAGM_SCENEGGIATORE_TETTO_S`): the voice says it right away, with the window still open, and the
   transcript shows it.
3. Beyond the ceiling, or if the table has moved on: it is not said. It stays in the repertoire, where the reader can
   choose it on the next turn. If the scriptwriter does not answer, the waiting line is the **backup**: it did the job.
4. At «Chiudi la sessione», while the `chiusura` is being written: a narrator filler without effects, or the language
   pack's `regia.righe.attesa_chiusura`. The Engine waits up to 30 s (`TETTO_CHIUSURA_MS` in `scena/regia.ts`) and
   accepts only a narrator line of type `chiusura`. Beyond that the narrator closes, and if it writes no prose (the
   minimal reader) the Engine says `regia.righe.chiusura_riserva`. A closing that arrives late stays in the repertoire
   for that scene.

## Audio
When a line from the `prossime` enters the repertoire, with the drama-3 voice its synthesis goes into the background
queue (`sceneggiatore/audio.ts`). It uses the same cache and the same key as the pre-generation
(`strumenti/prerender-fish.ts`), so that when the reader chooses it, the voice plays from the cache. One synthesis at a
time, and an error is logged without stopping the others. The `subito` lines are said as soon as they arrive: for those,
the voice stays live.

## Processes and files
- `scripts/sceneggiatore.sh avvia|ferma|stato`. `scripts/avvio.sh` starts it, and so does `partita.sh`, but on its own it
  starts only on the real game (4610), if `claude` is installed and the narrator is not a mock: every `claude -p` uses the
  subscription of whoever plays. On trial instances (harness, e2e) it starts only with `TAGM_SCENEGGIATORE=si`, and the
  harness turns it on with `--sceneggiatore`. `TAGM_SCENEGGIATORE=no` turns it off everywhere. `scripts/arresto.sh` stops
  it.
- The process is `apps/server/src/sceneggiatore/processo.ts`. It launches `claude -p --model <sonnet|haiku> --output-format
  json --no-session-persistence --tools ""`: no tools, the prompt has everything. It does not read or print credentials,
  and it does not open `~/.claude`. The calls count against the same limit as the account of whoever plays.
- The folder is `<log>/sceneggiatore/`: `richieste/`, `risposte/`, `vivo.json` (heartbeat every 5 s),
  `sceneggiatore.jsonl` (one line per request: queue times and Claude Code times, outcome), `sceneggiatore.out`.
- The server (`sceneggiatore/canale.ts`) writes the requests and collects the replies every second. The measurements end up
  in `narrazioni.jsonl`, lines `tipo: sceneggiatore`: times, accepted, discarded with the reason, delivered.

## Current limits
- If the scriptwriter is slow, its line may arrive after the turn has already closed: then it stays in the repertoire.

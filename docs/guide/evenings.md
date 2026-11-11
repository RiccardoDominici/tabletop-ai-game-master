# Evenings

On this page: a campaign played over several evenings. How long an evening lasts, how to close it, how the next one starts with «La volta scorsa…», the phone «Diario», and the logs and tools for between one evening and the next.
Read first: [One evening of play](one-evening.md) and [the Game Master panel](master-panel.md). Session packages (`sessioni/<nn>/`) are explained in [Multi-session campaigns](multi-session-campaigns.md).

## The loop in short

1. Start the game: `scripts/partita.sh <campagna>`.
2. Play. Twenty minutes before the planned end, the panel warns you.
3. In the panel, press **«Chiudi la sessione»** (Close the session). The narrator closes the moment and the projector shows what happened tonight.
4. Stop everything: `scripts/arresto.sh`.
5. Another evening, run the same command again, without `--nuova`. The game resumes where it stopped, and the projector first reads «La volta scorsa…» (Last time…).

A campaign with session packages adds one step between evenings: `scripts/tra-sessioni.sh` (see [below](#multi-session-campaigns)).

## How long an evening lasts

- The length comes from `ore_per_sessione` in the campaign's brief. Without it, 2.5 hours.
- The panel's **«Serata»** (Evening) box shows it: **«durata»** (length), **«passati»** (elapsed) and **«rimasti»** (remaining). The time counts from the start, or from the resume.
- To change it, type the hours (from 0.5 to 8) and press **«Imposta durata»** (Set length).
- **Twenty minutes before the end**, the box says «Mancano 20 minuti: avviati alla chiusura» (20 minutes left: head for the close). The narrator is told to steer towards a natural pause.
- **Never during a climax.** In a scene with `climax: true`, or with a clock one mark from full, the advice waits. The box says «c'è un climax in corso: il narratore aspetta» (a climax is under way: the narrator waits).

Nothing stops by itself when the time runs out: the Game Master decides when to close.

## Closing the evening

The panel has two ways to close. Use the first one.

| | **«Chiudi la sessione»** (Close the session) | **«Fine sessione»** (End session) |
|---|---|---|
| What it is | the guided close of the evening | the emergency exit |
| What the table hears | the narrator closes the moment | nothing: it stops at once, with no narration |
| What the projector shows | «Cosa è successo stasera» (What happened tonight) | — |
| What the server writes | the log and, next to it, `riassunto.yaml` | the log (`registro.yaml`) |
| The session | stays saved: it resumes on the next evening | is closed |
| Confirmation | «Confermi la chiusura della serata?» (Confirm closing the evening?) | «Confermi la fine della sessione?» (Confirm the end of the session?) |

Both ask for a second click.

After «Chiudi la sessione»:

- The actions still in the window go back to the players.
- The closing line is the repertoire line of type `chiusura`, if the campaign has one; otherwise the narrator writes it. The local reader in minimal mode writes no prose: with that reader and no `chiusura` line, the Engine says one fixed line («Per stasera la storia si ferma qui. Riprende da questo punto, la prossima volta.», meaning: for tonight the story stops here; it resumes from this point next time).
- The summary is written by the `riassunto` component (local by default, see [Local and API](local-and-api.md#the-seven-components)). While it works, the panel says «Chiusura in corso: il narratore scrive il riassunto.» (Closing in progress: the narrator is writing the summary.) The local model can take up to 3 minutes; then the Engine uses its own summary from the events.
- The panel then says «Serata chiusa: «Riprendi» la riapre; la sessione resta salvata.» (Evening closed: Resume reopens it; the session stays saved.)

After «Fine sessione», the next «Inizia sessione» on the projector starts the campaign from the beginning. In a multi-session campaign, the next start plays the following session.

Where the files go:
- a one-shot: `logs/registri/<campagna>/<id della sessione>/`;
- a session package: `campagne/<id>/sessioni/<nn>/`.

## What happened tonight

After «Chiudi la sessione», the projector shows the card **«Cosa è successo stasera»**:

- the summary of the evening;
- **«Fili aperti»** (Open threads): what is still unresolved;
- **«Chi c'è»** (Who is here): the characters, with their hit points.

The same summary is kept for the next evening and for the phones' «Diario».

## The next evening

To resume, run the same command, without `--nuova`:

```bash
scripts/partita.sh nozze-neve
```

The script says «Riprende la partita salvata dal turno N» (Resumes the game saved at turn N). On the projector, press «Inizia sessione» again; the phones find their character again. If the server is still running after «Chiudi la sessione», **«Riprendi»** (Resume) in the panel reopens the evening too.

Before the scene starts again, the projector shows the card **«La volta scorsa…»** (Last time…) and the narrator reads it. It is read:

- when the evening before was closed with «Chiudi la sessione»: its summary;
- when the game resumes more than 3 hours after the last event, even without a close: a summary written from the public transcript;
- at the start of the next session package, if that package has no `riassunto_iniziale` of its own.

The `riassunto` component writes it in the background as soon as the server starts. If it is not ready when you press «Inizia sessione», the Engine reads its own summary from the events.

To start the campaign from the beginning instead:

```bash
scripts/partita.sh nozze-neve --nuova
```

The saved game is not resumed, and the story starts from the opening.

## The phone diary

Each phone has a **«Diario»** (Diary) button at the top, next to «Regole» and «Scheda». It opens **«La campagna finora»** (The campaign so far):

- **«Finora stasera»** (So far tonight): the scenes crossed, the facts discovered and the signs of time of this evening;
- the evenings already closed, the most recent first, each with its summary;
- **«I tuoi esiti privati»** (Your private outcomes): the outcomes of your private actions. They appear only on this phone;
- **«Fili aperti»** (Open threads).

The diary shows only what the table knows: no secrets, and no private outcome of another player.

## Multi-session campaigns

A campaign made of session packages (`sessioni/01/`, `sessioni/02/`…) uses the same evening loop, and adds:

- `scripts/partita.sh <campagna> --sessione N` to play a precise package;
- **«Prossima sessione»** (Next session) in the panel, to move to the next package;
- `scripts/tra-sessioni.sh` between one session and the next:

  ```bash
  scripts/tra-sessioni.sh campagne/<id> 1
  scripts/tra-sessioni.sh campagne/<id> 1 --pacchetto
  scripts/tra-sessioni.sh campagne/<id> 1 --verifica
  ```

  - The first reads what happened in session 1: the log, the summary, the move of the world.
  - The second writes the skeleton of session 2, after the state has been updated.
  - The third checks the package of session 2.

Everything about packages, which session gets played, and the three stages: [Multi-session campaigns](multi-session-campaigns.md).

## Logs and transcripts

### The session log: `scripts/registro.sh`

The log (`registro.yaml`) is what «Fine sessione» writes. `scripts/registro.sh` rebuilds it from the session archive, with no model. It writes nothing into the archive, so you can use it while a game is running.

```bash
scripts/registro.sh nozze-neve
scripts/registro.sh campagne/<id> --sessione 2
scripts/registro.sh <id> 02 --controlla
scripts/registro.sh --help
```

- The first writes the log of the last session played of `nozze-neve`.
- The second writes the log of the last session that played `sessioni/02/`.
- The third writes nothing: it exits with 0 if `registro.yaml` is the one the archive gives, 1 if it differs.
- The fourth lists every option.

The other options: `--archivio <id>` picks one session of the archive, `--uscita <cartella>` writes somewhere else. Exit codes: `0` done, `1` different (with `--controlla`), `2` wrong arguments, `3` campaign or archive unreadable, `4` no session to log.

For a test instance, put the port in front: `TAGM_PORTA=4710 scripts/registro.sh <id>`.

### The transcript: `scripts/trascrizione.mjs`

```bash
node scripts/trascrizione.mjs
node scripts/trascrizione.mjs --uscita logs/stasera.md
```

- The first writes `logs/f0-trascrizione.md` from the most recent session in `logs/narrazioni.jsonl`: for each turn, the players' actions, the narrator's output word for word, the clocks and the timings.
- The second writes the same into another file.

`--sessione <iso>` picks another session, by the value of its `sessione` field in `logs/narrazioni.jsonl`. The script reads only the real game's `logs/narrazioni.jsonl`, never a test port's logs.

### Where the evening is kept

| File | What is inside |
|---|---|
| `logs/sessioni.sqlite` | the archive of sessions: this is where the game resumes |
| `logs/narrazioni.jsonl` | what the narrator said, turn by turn |
| `logs/master.jsonl` | the commands from the panel |
| `registro.yaml`, `riassunto.yaml` | the log and the summaries of the evenings (see [Closing the evening](#closing-the-evening)) |

The logs hold the players' actions, private ones included. Do not publish them or paste them into a report.

## Problems?

Go to [Common problems](common-problems.md).

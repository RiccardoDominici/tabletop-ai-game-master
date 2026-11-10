# Multi-session campaigns

What you will find here: how a campaign lasts across several evenings. The layered model, how a session is closed, how the next one is opened, and what is done in between.
Read first: [Creating a campaign](create-a-campaign.md) and [the Game Master panel](master-panel.md).

## Where we are

This part of the framework was born after the one-shot, and it is only partly ready. Before you start, know what exists today (source: [docs/strati.md](../strati.md), "Fasi di lavoro" (Work phases), and `strumenti/strati.py`).

| Piece | Today |
|---|---|
| The server plays a session package (`sessioni/<nn>/`), with "Fine sessione" (End session), "Prossima sessione" (Next session) and the log | **ready** (phase D2) |
| `scripts/partita.sh --sessione N` and `scripts/registro.sh` | **ready** |
| The validator checks a package (`--sessione N`) and the classes `STATO`, `CONTINUITÀ`, `ARCO` | **ready** |
| `scripts/tra-sessioni.sh` (the automatic parts of the work between sessions) | **ready**; the procedure for the agent is a draft (phase D3) |
| The Preparatore (Preparer) writes an arc, a campaign or a saga | **not yet**: the validator, in normal mode, rejects every level above the one-shot (`LIVELLO.non_supportato`) |
| `scripts/prepara.sh` on a session package | **not yet**: it works only on the whole campaign |
| A real test of a three-session arc | **not yet** (phase D4) |

In practice: today you can prepare and play the **one-shot** well. Multi-session campaigns can already be played as a trial, but the full preparation arrives with phases D3 and D4.

## The model: layers

One framework, with layers that switch on. The **number of sessions** you write in the brief (`sessioni`) sets the **level**, and the level decides what is prepared up front and what is prepared between sessions.

| Sessions | Level | Prepared up front | Prepared between sessions |
|---|---|---|---|
| 1 | one-shot | the whole session | nothing |
| 2–6 | arc | session 1 complete; the arc's front with its stages; 2–3 acts; the possible endings; the recurring NPCs; the other sessions in one line each | the log, the state, the next session complete |
| 7–20 | campaign | in addition: regions, factions with a clock, three conflicts, the declared end; the first arc complete | in addition: the factions' turn, the next arc |
| 21+ or `aperta` | saga | in addition: the world, with one zone full, the others sketched, and the game phases | in addition: the detail of one zone when the PCs (player characters) get there |

To see the table with all the measures:

```
python3 strumenti/strati.py --tabella
```

This prints the four levels, with what is prepared up front, what is prepared between sessions, and the expected measures.

The principles, in short:

1. **What is far away stays a sketch.** It becomes detail only when it gets close. You write the skeleton, then one session at a time.
2. **Live, the narrator sees only tonight's session**, never the whole campaign.
3. **The log is not written by a model.** The game facts are extracted automatically from the archive of the sessions (`sessioni.sqlite`). The strong model interprets them, but every new fact cites the turn it comes from, and the validator checks it.
4. **The prepared canon is not touched; the game adds.** The prepared facts (`f_…`) stay as they are. The game facts (`g_…`) live in `stato/stato.yaml` and, if they change a prepared fact, they declare it (`supera`).
5. **What the PCs have discovered stops being secret.** Each session has its own secret words.

## How the folder is laid out

A one-shot stays as it is. With more sessions, these parts are added:

```
campagne/<id>/
  brief.yaml  stile.yaml  campagna.yaml   # il livello di campagna; l'arco sta in campagna.yaml → preparazione.arco
  png/                                    # i PNG ricorrenti
  pg.yaml                                 # i personaggi, che durano da una sessione all'altra
  stato/stato.yaml                        # che cosa è successo davvero: cresce dopo ogni sessione
  sessioni/01/                            # il pacchetto della sessione 1
    sessione.yaml                         # titolo, riassunto iniziale, scene in ordine, segni già pieni
    scene/  png/  repertorio/  immagini/  audio/
    registro.yaml  trascrizione.yaml      # li scrive il server a fine sessione
  sessioni/02/
    …
```

- The package name is made only of digits, two for the order: `01`, `02`…
- A campaign with `sessioni/` does not use the root `scena.yaml` and `scene/`.
- The server merges `campagna.yaml` and the package's `sessione.yaml` with fixed rules (see [docs/strati.md](../strati.md), "Regole di unione" (Merge rules)). For example, the lines come only from the package, and an NPC character sheet in the package replaces the campaign's one entirely, for that session.

## Which session gets played

The server decides, in this order:

1. the one you ask for with `--sessione N`;
2. the session in progress, if there is one to resume;
3. the package after the last session closed with "Fine sessione" (if that package is half-prepared and does not load, it stays on the finished one, and the panel says so);
4. the last one played;
5. the first one.

`scripts/partita.sh` asks the server for the same choice and validates exactly that package.

## Playing a specific session: `--sessione`

```
scripts/partita.sh <campagna> --sessione 2
```

This plays the package `sessioni/02/`. First it validates it (`valida_campagna.py --sessione 2`), then it starts the server.

Without `--sessione`, the server chooses, as above. At the start of the game, the script prints "Campagna a più sessioni: si gioca la sessione N" (Multi-session campaign: playing session N).

The same option exists elsewhere too:

```
python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso --sessione 2
```

This validates the package `sessioni/02/` merged with the campaign, plus the state and the continuity. Here `LIVELLO.non_supportato` is only a warning, because whoever validates a package is already playing it as a trial.

```
scripts/registro.sh <campagna> --sessione 2
```

This redoes the log of the last session that played `sessioni/02/` (see below).

## Closing a session: "Fine sessione"

At the end of the evening, from the Game Master panel:

1. Open the **Sessione** (Session) box.
2. Press **Fine sessione** (End session).
3. The button asks for confirmation ("Confermi la fine della sessione?" (Do you confirm the end of the session?)): press it again.

What happens:

- the game stops, and the session in the archive is closed;
- the server writes `registro.yaml` and `trascrizione.yaml` in the package played (`sessioni/<nn>/`). For a one-shot, it writes them to the logs, in `logs/registri/<campagna>/<id della sessione>/`;
- the panel shows the path of the log and how many turns it has.

Be careful:

- **The log contains the players' private actions.** It is for the Game Master and for whoever prepares, never for the players.
- **The log is not edited by hand.** If it is missing or wrong, it is redone from the archive:

  ```
  scripts/registro.sh <campagna> --sessione 2 --controlla
  ```

  With `--controlla` it writes nothing: it exits with `0` if the log is the one the archive gives, and `1` if it is different. Without `--controlla`, it rewrites the log. `scripts/registro.sh --help` shows all the options.
- After "Fine sessione", a new "Inizia sessione" (Start session) on the projector replays the same session from the beginning.

## Opening the next one: "Prossima sessione"

The button sits next to "Fine sessione", in the **Sessione** (Session) box. It lights up only if the next package (`sessioni/<nn+1>/`) exists and loads. The text says which session it opens, for example "Prossima: sessione 02 · Il guado" (Next: session 02 · Il guado, the title of the session). If it is off, hover the mouse over it: it tells you why (the package is missing, or it does not load, and the reason).

1. Press **Prossima** (Next) and confirm ("Confermi? Questa sessione si chiude" (Are you sure? This session will close)).
2. If the session is still in progress, the server first does "Fine sessione", with the log.
3. The server restarts on the same address, with the next package and the same Game Master token.
4. The panel, the projector and the phones reconnect by themselves, as after a restart.
5. The new session starts from its `riassunto_iniziale` (opening summary).

The phones find the PC of the previous session again. If a player has to change character, the Game Master changes it or forgets it from the panel, in **Telefoni ricordati** (Remembered phones). The change applies from that phone's next connection.

Usually, though, days pass between sessions: you close with "Fine sessione", do the work below, and the next time you run `scripts/partita.sh <campagna>`, which picks the next session by itself.

## Between one session and the next: `scripts/tra-sessioni.sh`

The work between sessions has two parts:

- the **automatic** parts, done by `scripts/tra-sessioni.sh` (with `strumenti/tra_sessioni.py`);
- the parts **to write**, done by an agent with the Preparatore skill (procedure in `.claude/skills/preparatore/riferimenti/tra-le-sessioni.md`, currently a draft).

The script has three stages, and it stops each time where the agent is needed. It does not start the server, does not touch the game's ports, and never overwrites what the agent wrote. The log is in `logs/tra-sessioni-<id>.log`.

### Stage 1: what happened

```
scripts/tra-sessioni.sh campagne/<id> 1
```

After session 1:

1. it checks that `sessioni/01/registro.yaml` exists. If it is missing, it redoes it from the archive with `scripts/registro.sh`; if it is there, it checks that it matches what the archive gives. If it differs, it stops: it must be regenerated, not edited;
2. it prints what the log says: scenes and turns, revealed clues, facts made known to the PCs, lies told, moments, clocks, NPCs met, and the PCs' actions;
3. it prints the **world move** that the arc's fixed rules give on their own: the arc clock plus `ritmo.per_sessione`, and the conditions `accelera` (speed up) and `rallenta` (slow down), to be judged from the log.

Then it is the agent's turn: it updates `stato/stato.yaml` up to `dopo_sessione: 1`. Each fact has its **source**:

```yaml
fatti:
  - id: g_irma_promette
    testo: "Irma ha giurato a Tobia che pagherà il tetto senza il mercante."
    fonte: {sessione: 1, turno: 6, citazione: "Ti giuro che pagherò il tetto"}   # parole esatte del turno
    noto_ai_pg: true
```

The source can also be an event of the turn (a line, a clue, a clock tick), or, for things that change off-scene, `{tra_sessioni: 1, motivo: "…"}`, where the reason names the clock, the danger or the front that produces it. If something is not in the log, it did not happen. The full form is in `.claude/skills/preparatore/riferimenti/schema.md`, "Tra le sessioni" (Between sessions).

### Stage 2: the skeleton of the next session

```
scripts/tra-sessioni.sh campagne/<id> 1 --pacchetto
```

1. It checks the state (validator, class `STATO`): with errors, it stops.
2. It writes the skeleton of `sessioni/02/`, without overwriting anything:
   - `sessione.yaml`, with the clock ticks already full (`pieni_all_inizio`) and the open threads to decide;
   - the whole character sheets of the recurring NPCs that changed in play, with what they know and their attitude, taken from the state;
   - the secret words still in use, without those of the facts the PCs now know.

Then it is the agent's turn: the summary to read at the opening (three to five sentences, from the facts of the state), the scenes, the repertoire, and the secret words of the new secrets. For each thread, `come: ripreso` (taken up again) or `rimandato` (postponed).

### Stage 3: verification

```
scripts/tra-sessioni.sh campagne/<id> 1 --verifica
```

1. It checks that the package is written: summary, scenes with their sheet, repertoire, decided threads.
2. It runs the strict validator on session 2.
3. For the images and audio of session 2, today it prints that `prepara.sh` does not yet work on a package.

Exit code of the script: `0` done (or stopped where the agent is needed); `1` something to fix; `2` wrong arguments.

### What the validator checks between sessions

| Class | What it checks |
|---|---|
| `STATO` | the logs exist and are intact; every fact has a source that is found in the log, word for word; the clocks at the end of a session match the log |
| `CONTINUITÀ` | the next session does not contradict the state: a dead NPC does not come back, whoever knew something still knows it, the clocks restart from the right ticks, promises and threads are taken up or postponed, and a PC does not drop a level |
| `ARCO` | the arc prepared beforehand: stages, pace, acts, endings, recurring NPCs, threads |

## In progress

**Coming:** the end-of-evening summary and the guided close of the session (work in progress on the Engine). Until then, use "Fine sessione" as described above.

The requests of 9 November ([docs/richieste-2026-11-09.md](../richieste-2026-11-09.md), §9) ask for a guided close of the evening ("Chiudi la sessione" (Close the session)), a "La volta scorsa…" (Last time…) at the opening, a warning when the evening is about to end, and a Diary on the phone. The design is in [docs/strati.md](../strati.md), "Riassunto e chiusura della serata" (Summary and close of the evening): there, "Fine sessione" stays, immediately and without narration, for emergencies. The work is in progress and the button is not yet in the Game Master panel: **to be checked** when it arrives, because it will change how an evening is closed, as described on this page.

## Problems?

See [Common problems](common-problems.md).

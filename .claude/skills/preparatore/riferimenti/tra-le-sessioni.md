# Between sessions (draft of phase D3)

What the Preparatore does between one session and the next of a campaign above the one-shot (docs/strati.md, "The
cycle between sessions"). Today the validator rejects the levels above the one-shot (`LIVELLO.non_supportato`): this
procedure goes into use with phase D2, when the server plays the packages `sessioni/<nn>/` and writes the logs. The
`STATO` and `CONTINUITÀ` classes of the validator are already ready, and they follow it.

## The principle: the log is the proof, the state is its reading
- **The log** (`sessioni/<nn>/registro.yaml`) is written by the server at the end of the session, deterministically, from
  the archive (`sessioni.sqlite`). No model writes or touches it: if it has a `firma`, the validator checks that the
  content matches (`STATO.registro`).
- **The state** (`stato/stato.yaml`) is written by the strong model. It is the reading of the log: what really happened,
  what changed for the NPCs, what remains open. Every fact cites its proof, and the validator looks for it in the log
  (`STATO.fonte`). So an invented fact, or one read wrongly, does not reach the next session.
- **The prepared canon is not touched; the game adds** (docs/strati.md, principle 5). `campagna.yaml → canone` stays as the
  Preparatore wrote it (the `f_` facts): it is a rule of the framework, which runs on its own. Game facts are `g_` and live
  in the state; when play changes a prepared fact, the `g_` fact declares it with `supera: [f_…]`. A game fact is never
  deleted: it is overridden by a more recent one (`superato_da`).
- **What the PCs have discovered stops being secret** (principle 6). The package carries its secret words and the updated
  sheets of the recurring NPCs, which for that session replace those of the campaign.

## The six steps, in practice
The work between sessions is done by an agent with this skill, like the preparation of a campaign.
`scripts/tra-sessioni.sh` does the deterministic parts, and it stops every time where the agent must write.

1. **End of session** (the GM, from the panel). The server writes `sessioni/<nn>/registro.yaml` and
   `trascrizione.yaml`. Do not touch them.
2. **Log and move of the world**, deterministic:
   ```
   scripts/tra-sessioni.sh campagne/<id> <n>
   ```
   It checks that the log is there (and, if `scripts/registro.sh` can do it, that it is the one from the archive), prints
   what happened, turn by turn, and the move that the fixed rules of the arc give by themselves: the arc clock plus
   `ritmo.per_sessione`, and the conditions of `accelera` and `rallenta` to be judged.
3. **State** (the agent). Update `stato/stato.yaml` up to `dopo_sessione: <n>`:
   - one fact for each thing that happened that matters later: who knew what, who died or was wounded, where the NPCs
     went, what the PCs promised and to whom, which threads remain open;
   - each fact with its `fonte`: the turn and an exact quotation of what was said or written, or an event of the turn
     (a line that came out, a clue revealed, a fact made known, a clock tick);
   - no summaries from memory: if a thing is not in the log, it did not happen;
   - **the world moves**: the clocks of the fronts (and, from the campaign level, of the factions) advance under their rules;
     what changes off-screen is a fact with `fonte: {tra_sessioni: <n>, motivo}`, and the reason names the clock, the danger
     or the front that produces it (`o_…`, `p_…`, `fronte_…`). The PCs do not know it (`noto_ai_pg: false`) until they see
     it in play.
4. **Package skeleton**, deterministic:
   ```
   scripts/tra-sessioni.sh campagne/<id> <n> --pacchetto
   ```
   It stops if the state has errors (`STATO`). Then it writes, never overwriting, the skeleton of `sessioni/<n+1>/`:
   `sessione.yaml` with `pieni_all_inizio` from the state and the open threads to be decided; the whole sheets of the
   recurring NPCs changed in play, with `sa`, `non_sa` and attitude taken from the state; the secret words in use, without
   those of the facts the PCs now know.
5. **Session after** (the agent). The same steps the skill uses for a one-shot, starting from state and arc:
   - the summary to read at the opening (three to five sentences, from the facts of the state), the scenes, the repertoire;
   - for each thread, `come: ripreso` or `rimandato`; in the copied sheets, `perche` and `vuole` rewritten;
   - the secret words of the new secrets: one for each fact still secret that enters the session;
   - the campaign sheet is not touched: it stays the initial version.
6. **Verification and resources**:
   ```
   scripts/tra-sessioni.sh campagne/<id> <n> --verifica
   ```
   It checks that the package is written (summary, scenes with the sheet, repertoire, threads decided), runs the validator on
   session `<n+1>` (`valida_campagna.py --rigoroso --sessione <n+1>`; until it exists, `--solo STATO,CONTINUITÀ,ARCO`), then
   `scripts/prepara.sh` on the package, when it is able to do so (phase D2).

## The file shapes
State, log and package are described in `schema.md`, section "Between sessions". Below, what the validator checks of them.

## What the validator checks
| Code | Check |
|---|---|
| `STATO.registro` | the logs up to `dopo_sessione` exist; the number matches the folder; the signature matches |
| `STATO.fonte` | the cited turn exists; the quotation is in the turn, verbatim; the event is in the turn; an off-screen fact has a reason, which names an existing clock, danger or front |
| `STATO.superato` | a fact is overridden only by one that comes later |
| `STATO.orologio` | at the end of the session the clock has the ticks of the log |
| `STATO.forma`, `STATO.riferimento` | ids `g_`, text, NPCs, PCs, facts, existing clocks; states of promises and threads |
| `CONTINUITÀ.morto` | a dead NPC is not among those present, does not speak, and has no sheet in the package |
| `CONTINUITÀ.scheda` | an NPC changed in play who returns to the scene has the updated sheet in the package, with the attitude from the state |
| `CONTINUITÀ.saputo` | what an NPC has learned is in the `sa` of its sheet and not in the `non_sa`; no secret word for what the PCs already know |
| `CONTINUITÀ.segreto` | the package with a repertoire has its secret words, and every fact still secret that enters the session (sheets of the NPCs on stage, lines) has its word |
| `CONTINUITÀ.orologio` | the clocks of the session restart from the ticks of the state |
| `CONTINUITÀ.promessa` | promises and open threads are in `preparazione.fili` of the session, taken up or deferred (warning) |
| `CONTINUITÀ.oggetto` | a lost or destroyed object does not come back among the elements of the scenes (warning) |
| `CONTINUITÀ.pg` | a PC does not go back a level |

# The Game Master panel

On this page: how to get into the panel, the Game Master token, every section and every command, and what to do when an action does not work.
Read first: [One evening of play](one-evening.md).

The panel is for one person, on the Mac, to correct or stop the AI narrator. It is not optional: a human must always be able to step in (`docs/architettura.md`, "Pannello master", the Game Master panel section). Whoever runs the table as Game Master can also play: the panel starts in "senza spoiler" (no spoilers) mode.

## How you get in

You have three ways. Use the first one.

1. **The link printed by the script.** At the end, `scripts/partita.sh` prints the entry "PANNELLO DEL MASTER" (the Game Master panel heading) with a link `http://localhost:4610/master?token=…`. Open it in the browser on the Mac.
2. **The server log.** If the script did not find it, the link is on the `PANNELLO MASTER` line of the log:

   ```bash
   grep 'PANNELLO MASTER' logs/server.out | tail -n 1
   ```

   This shows the last line with the link (the one from the most recent start). The token is yours: do not paste this line into chat or into a message.
3. **The form.** If you open `http://localhost:4610/master` without a token, the panel shows a form titled "Pannello del master" (Game Master panel). Paste the token, or the whole link, and press "Entra" (Enter).

After the first access, the browser remembers the token. The panel removes it from the address bar straight away, so it does not stay in the history, in bookmarks or in a screenshot (`apps/web/src/master/token.ts`).

## The Game Master token

The token is the key to the panel: whoever knows it controls the table.

- **Where it comes from.** The server creates it at every start: 16 random characters (`apps/server/src/master/token.ts`). The server writes it to its log, inside the panel link (`apps/server/src/index.ts`).
- **Where it lives.** Only on the Mac: in the server log (`logs/server.out`) and in the browser where you opened it. It is not in the QR code for the phones, and it never reaches the phones or the projector.
- **When it changes.** At every server start. If the panel says "Token rifiutato" (token refused), the server has been restarted: take the new token from the log. "Prossima sessione" (Next session) keeps the same token instead.
- **A fixed token.** If you prefer a token that does not change, set it before starting:

  ```bash
  CANTASTORIE_MASTER_TOKEN=<un-token-tuo> scripts/partita.sh prova-f0
  ```

  This starts the game with your token. It must be 12 to 128 characters long, with only letters, digits, `_` and `-`; otherwise the server ignores it and creates a random one.
- **Random guessers get locked out.** After five wrong tokens, the server closes the connection (`apps/server/src/trasporto/master.ts`).

**Why it must not be shared.** With the token you control everything: you can stop the narrator, change the scene, skip actions, and close the session. And with spoilers visible you also see what the players must not know: private actions, future clock ticks, lines not yet spoken. So:

- do not show the panel on the projector;
- do not send the link to the players, not even to those playing from their phone;
- if the token got out by mistake, restart the game: the server creates a new one.

## How it is laid out

At the top is the header with the main commands, always in view. Below, three columns (on the Mac screen):

- **left**: what is on the projector and what is looming: scene and place, characters, audio, situations, clocks;
- **centre**: what is happening at the table now: window, actions, transcript;
- **right**: director's notes, repertoire, session, log.

Below 1280 pixels of width, the columns become two and the page scrolls as a whole.

## The header

| Item | What it says |
|---|---|
| Phase (Fase) | where the table is: *in attesa di «Inizia sessione»* (waiting for "Inizia sessione", i.e. "Start session"), "apertura della scena" (opening the scene), "finestra delle azioni" (action window), "narrazione" (narration), "in pausa" (paused), "scena fermata" (scene stopped) |
| Turn (Turno) | the turn number |
| Pause (Pausa) | whether the table is paused, or whether a pause has been requested and will take effect at the end of the sentence |
| Narrator (Narratore) | "narrazione in corso" (narration in progress) or "in silenzio" (silent) |
| Voice (Voce) | the voice engine in use |
| Screen (Schermo) | whether the projector is "collegato" (connected) or "non collegato" (not connected) |
| Mode (Modalità) | "A · improvvisa" (A · improvised) or "B · repertorio" (B · repertoire) |
| Spoilers (Spoiler) | the switch "senza spoiler" (no spoilers) / "spoiler visibili" (spoilers visible) |

Be careful with the "Voce" (Voice) field: today it only knows "Qwen (locale)" (Qwen, local) and "finta (mock)" (fake, mock). With drama-3 it shows "finta (mock)" even when the voice works (`apps/web/src/master/etichette.ts`). Trust the "voce:" line in the box printed by `scripts/partita.sh` instead.

### The main commands

- **Pausa** (Pause): no new window opens. If the narrator is speaking, it finishes the sentence and then the table stops (the button says "Pausa chiesta" (pause requested) until that happens). With a window open, the window stays open but does not close by itself. Phones can still write: their actions are taken when play resumes.
- **Riprendi** (Resume): restarts the table, or cancels a pause that was requested.
- **Ferma la narrazione** (Stop the narration) (red): the emergency brake. One click, no confirmation: it stops the narrator and the voice at once, the projector goes silent, and the table pauses. The actions of that turn have not been resolved: they go back to the players as "non è andata" (it didn't work), to be sent again. It works only while the narrator is working.

Only these buttons set and remove the pause: the game never pauses on its own.

Below the commands, "Fatto: …" (Done: …) appears when a command succeeds. If a command is refused, a red line appears: "«name of the command» rifiutato: reason" (refused: reason). Close it with the × button.

## Left column

### Scene and place

- At the top, the thumbnail of what is on the projector right now, with the name of the place and the scene.
- **Luoghi** (Places): one button per place. One click puts that place on the projector, with a fade. The place currently on air is highlighted.
- **Scene della campagna** (Campaign scenes) (only if the campaign has more than one scene): one click switches to another scene. This changes the narrator's context, the active clocks, the place and the lines. Pending actions go back to the players, the narrator reads the opening of the new scene, and the window opens for everyone. The clocks keep their state between scenes.

### Characters

All the campaign's NPCs, including those the players have not met yet. For each:

- whether it "ha già parlato" (has already spoken) or is "non ancora incontrato" (not yet met);
- whether it is "in scena" (on stage) or "altrove" (elsewhere);
- **In scena** (On stage) and **Altrove** (Elsewhere): you decide where it is. The choice is marked "a mano" (by hand) and lasts until the scene changes;
- **Auto**: removes your choice, and the NPC goes back to what the scene says;
- **Rivela** (Reveal): appears for a "nascosto" (hidden) NPC (present, but not yet shown at the table). It shows the NPC to the players.

The projector shows the portraits of the NPCs on stage. The phones also show those already met and those elsewhere.

### Audio

Appears only if the campaign has audio.

- **Musica** (Music) and **Ambienti** (Ambience): what is playing now.
- **Umore della musica** (Music mood): one button per mood of the campaign. One click changes the music at once. **auto** goes back to the music of the place.
- **Effetti** (Effects): one click plays the effect (a bell, a door…) on the projector.

The narrator and the lines also change mood and effects on their own. These choices appear in the log with an "auto" chip (`docs/audio.md`, "Segnali automatici" (automatic signals)). The volumes are not here: you adjust them on the projector with the A key.

### Situations

Situation images: a PNG for a precise moment, which takes the place of the place on the projector.

- One click on a situation puts it on the projector; another click removes it.
- In mode B, the Engine also shows them by itself when the linked revelation comes up. The place returns when the next narration starts.

### Clocks

The threat clocks of the scene: a row of boxes, filled up to the tick already shown, with the next one highlighted.

- **−1** and **+1** correct by one tick, if the narrator forgot one or added one too many.
- "dovuto" (due): the minimum pace asks for the next tick to be shown in the next reply.
- "completo" (full): the clock is full. With spoilers visible, the panel says what happens "a orologio completo" (when the clock is full).
- "non ancora partito" (not started yet): the clock is waiting for a line or a clue. +1 starts it by hand.

### Combat

Shown only when the campaign has dice and character sheets (see [Dice and sheets](dice-and-sheets.md)). It is the last box of this column.

- **Inizia combattimento** (Start combat): starts the fight with the player characters at the table, the NPCs involved, and the hostile NPCs on stage that have a sheet. The rules of the fight come from the campaign's rule set.
- During the fight the box shows the round, the phase, and «Tocca a» (It's X's turn): who has to act now, or «nessuno» (nobody).
- **Termina combattimento** (End combat): the first click asks for confirmation, the button turns red and reads «Conferma: termina combattimento» (Confirm: end combat). The second click ends the fight.
- **HP**: each sheet, player's characters and NPCs, shows its current and maximum HP. Type a number from 0 to 999 in the box and press **Imposta** (Set), or Enter. The number is the new value, not a change: it replaces the current HP.
- **Conditions**: during the fight, each combatant lists its active conditions with their icon. Click one to remove it. To add one, choose it in the «Condizione…» (Condition…) list and press **Aggiungi** (Add).

## Centre column

### Window

The action window of the turn: "aperta" (open) or "chiusa" (closed), and the pace: "ritmo calmo" (calm pace) or "ritmo concitato" (urgent pace).

- One label per player: "✓ ha scritto" (has written) or "pensa…" (thinking…). A player who was not invited has a dashed border and the words "non invitato" (not invited). Their action goes in, but the turn does not wait for them.
- "Aspettiamo: …" (We are waiting for: …) says who is missing.
- At calm pace: "nessuna scadenza: parte quando hanno inviato tutti" (no deadline: it starts when everyone has sent). At urgent pace: "si risolve da sola tra N s" (it resolves by itself in N s).
- **Ritmo calmo** (Calm pace) / **Ritmo concitato** (Urgent pace): changes the pace of the table. Urgent means a countdown (see [One evening of play](one-evening.md), "Il ritmo" (The pace)).
- **Risolvi ora** (Resolve now): the narrator replies at once to the actions already sent, without waiting for those who are missing. Actions still "da decidere" (to be decided) stay out of the turn. It works only with the window open and the table not paused.

### Actions

The players' actions: the ones still live and those of the last turn, in turn and sending order. Private actions are included.

- For each action: who wrote it, the status, the turn and the send time, the text, and any reason.
- Statuses: "in coda" (queued), "da decidere" (to be decided), "in narrazione" (in narration), "risolta" (resolved), "ritirata" (withdrawn), "non è andata" (didn't work), "rimasta fuori" (left out).
- "privata" (private) (blue dashed border): the other players' phones cannot see it. In no-spoilers mode the text stays hidden; you see only who wrote it and the status.
- The links under the text: an arrow for an action that depends on another one ("anch'io" (me too)), and two crossed swords for a conflict (in red, the one who loses).
- **Salta** (Skip): appears on live actions. The action does not enter the turn, and it goes back to the player's box, to be rewritten. Anyone who depended on it has to decide again.
- "(prossimo)" (next), next to the turn: the action was written while the window was closed, and it enters the following turn.

### Transcript

What has been said in public, turn by turn. It is the same transcript the phones show.

## Right column

### Director's notes

A director's note is an instruction for the narrator, for example "Ottavia diventa più sospettosa" (Ottavia becomes more suspicious) or "più ritmo, meno descrizioni" (more pace, fewer descriptions).

- Write the text (at most 280 characters), choose for how many turns it lasts (from 1 to 15), and press **Aggiungi nota** (Add note). Cmd+Enter or Ctrl+Enter also add it.
- At most 3 notes at a time: to add a fourth, first **Togli** (Remove) one of the others.
- The note goes into the narrator's message from the next turn. Each narrated turn uses one up: the bar shows how many are left. The notes reset when the scene starts again.

(Limits in `packages/shared/src/master.ts`.)

### Repertoire

Only in mode B. Three groups, to open and close:

- **Disponibili adesso** (Available now): the lines written earlier that the narrator can use at this moment;
- **Già uscite** (Already used);
- **Indizi rivelati** (Revealed clues).

In no-spoilers mode you see only how many lines there are, per speaker, not their text.

### Session

The game saves itself. Here you see when it started, how many saves there are, whether it was resumed (and from which turn), and the log file, if there is one.

- **Fine sessione** (End session): stops the game, closes the session, and has the server write the log (`registro.yaml`). For a campaign of a single session, the log goes to `logs/registri/<campagna>/<id>/` (`docs/strati.md`).
- **Prossima sessione** (Next session) (multi-session campaigns only): moves to the next session, if it is ready. The panel, the projector and the phones reconnect by themselves. See [Multi-session campaigns](multi-session-campaigns.md).
- **Nuova sessione** (New session): starts the same campaign over from the beginning. The game in progress is lost.

These three commands cannot be undone. For this reason they ask for a second click: the button turns red and asks "Confermi…?" (Are you sure…?).

**Telefoni ricordati** (Remembered phones) (when there are any): each phone with its character. You can choose another character from the list, or press **Dimentica** (Forget) so that the phone chooses again. The change applies from the phone's next connection.

**Serata** (Evening): how long the evening should last (**durata** (length): `ore_per_sessione` from the brief, or 2.5 hours if the brief has none), how many minutes have passed (**passati** (elapsed)) and how many are left (**rimasti** (remaining)). To change the length, type the hours (from 0.5 to 8) and press **Imposta durata** (Set length). Twenty minutes before the end the box warns you, and the narrator is told to steer towards a natural pause. This never happens during a climax: a scene with `climax: true`, or a clock that is one mark from full.

- **Chiudi la sessione** (Close the session): the guided close of the evening. It also asks for a second click: "Confermi la chiusura della serata?" (Confirm closing the evening?).
  - The actions still in the window go back to the players, and the narrator closes the moment.
  - The projector then shows «Cosa è successo stasera» (What happened tonight): the summary, the open threads and the characters' hit points.
  - The server writes the log and, next to it, `riassunto.yaml`.
  - The session stays saved. **Riprendi** (Resume) reopens it on the next evening, which starts with «La volta scorsa…» (Last time…).
- Where the closing comes from: the repertoire line of type `chiusura`, if the campaign has one; otherwise the narrator writes it. The local reader in minimal mode writes no prose. So with that reader and no `chiusura` line, the Engine says one fixed line: «Per stasera la storia si ferma qui. Riprende da questo punto, la prossima volta.»
- How long the summary takes: with Haiku the Engine waits 20 seconds. With the local model it waits up to 3 minutes, because the summary of an evening took about 100 seconds there. While it waits, the panel says «Chiusura in corso: il narratore scrive il riassunto.» (Closing in progress: the narrator is writing the summary.) When the wait runs out, the Engine uses its own summary: the places visited and the last clock marks, with no open threads.

### Log

The latest commands, accepted or refused, with the time. The choices the Engine made by itself (moods, effects) carry the "auto" chip. The same full log is in `logs/master.jsonl`: one line per command.

## The "no spoilers" mode

It is on at the start. The switch is in the header, and the browser remembers your choice.

When it is on, the panel hides:

- the name, the ticks and the "a orologio completo" (when the clock is full) of the clocks (you only see something like "Orologio 1 · segni 1/6 · dovuto");
- the text of private actions (who wrote them and their status stay visible);
- the lines not yet used (only how many there are, per speaker) and the real type of those already used;
- the situations not on air.

Commands, statuses, counts, transcript, log and notes remain visible. Turn it off only if you are not playing, or when you really need to see everything.

## When an action does not work

| What happens | What you do |
|---|---|
| A player does not write and the table is waiting | Press **Risolvi ora**: the narrator replies to the actions already sent. |
| An action "da decidere" blocks the turn | **Risolvi ora**: that action stays out of the turn ("rimasta fuori") and the player finds it back in their box. |
| A queued action makes no sense or spoils the scene | **Salta**: it goes back to the player's box, to be rewritten. |
| The narrator is saying something wrong | **Ferma la narrazione**. The actions of the turn go back to the players as "non è andata". Add a director's note, then **Riprendi**. |
| The narrator gets the tone wrong, is too long, or an NPC gives in too soon | A **director's note**, for a few turns. |
| The narrator forgot a tick of a clock, or added one too many | **+1** or **−1** on the clock. |
| The projector shows the wrong place | One click on the right place, in "Scena e luogo" (Scene and place). |
| An NPC is on stage but is not there, or the reverse | "Personaggi" (Characters): **In scena** or **Altrove**. |
| The game seems stuck | Check "Fase" (Phase) and "Pausa" (Pause). If it is paused, **Riprendi**. If the narrator or the voice shows no signs of life for 60 seconds, the game restarts by itself with a new window (`docs/f0-contratti.md`, "Turno" (Turn)). |
| A command does nothing | Read the red line under the commands: it gives the reason for the refusal. The log keeps it. |
| A phone has the wrong character | The player presses "Cambia" (Change) on the phone. Or you change it yourself from "Telefoni ricordati" (Remembered phones), in the "Sessione" (Session) section: it applies from the phone's next connection. |

For everything else: [Common problems](common-problems.md).

## Problems?

Go to [Common problems](common-problems.md).

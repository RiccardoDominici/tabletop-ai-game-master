# Pace and turns

On this page: how a turn opens and closes, sending and withdrawing an action, the short wait before a turn starts, «Risolvi ora», the calm and the frantic pace, what happens while the narrator works, the watchdog and the pause.
Read first: [One evening of play](one-evening.md). The rules come from `docs/f0-contratti.md`, «Turno» (turn), and `docs/azioni-concorrenti.md`.

## How a turn works

1. The narrator reads the opening of the scene and opens the «finestra delle azioni» (action window).
2. Whoever is called sees «Tocca a te: cosa fai?» (Your turn: what do you do?).
3. Each player writes what their character does and presses **«Invia»** (Send).
4. When everyone who was called has sent, the turn starts by itself after a moment.
5. The narrator replies. Meanwhile the players can already write the next action.
6. The narrator ends by calling one or more characters, and the next window opens.

## Send and withdraw

- **Sending means "I'm done".** There is no other button to press afterwards. If you do not want to do anything, write «Aspetto» (I wait) and send.
- **There is no deadline** at the calm pace. If nobody writes, the game waits.
- **You can change your mind** while the window is open. Correct the text and press again: the button now says **«Aggiorna»** (Update).
- **«Ritira»** (Withdraw) removes your action.
- If your action did not go through, the text goes back into the box and the button says **«Invia di nuovo»** (Send again).
- Ctrl+Invio or Cmd+Invio (Ctrl+Enter or Cmd+Enter) also sends. An action is at most 500 characters long.
- One action per player per window: a new send replaces the old one.

## When the turn starts

The turn starts when:

1. every character who was called has a live action;
2. no action is «da decidere» (to be decided, see below);
3. a short settling wait has passed: **2.5 seconds**, to leave room for an «anch'io» (me too) or a correction.

Every send or withdrawal restarts the wait. Whoever is still typing extends it, up to **8 seconds** more. During the wait the phone shows «Hanno scritto tutti: si parte…» (Everyone has written: here we go…).

Who is still missing is written on the projector, on the phones and in the panel: «Aspettiamo: …» (We are waiting for: …).

### Who is called

- The narrator calls one or more characters by name, or everyone («tutti»).
- Whoever is **not called** sees «Stavolta non sei chiamato» (You are not called this time). They can still write: their action goes into the turn, but the turn does not wait for them.
- When **everyone** is called, a phone that picks its character while the window is open is added to the list.
- **A disconnected phone is not waited for.** If it had already sent, its action still counts. If it comes back and was called, it is waited for again.
- If no called phone is connected, the game waits for anyone at the table. So a turn never starts without an action.

## «Risolvi ora» (Resolve now)

In the panel, the Game Master can press **«Risolvi ora»**: the narrator replies at once to the actions already sent, without waiting for the others. Actions still «da decidere» stay out of the turn («rimasta fuori», left out).

It works only with the window open and the table not paused. See [the Game Master panel](master-panel.md#window).

## When your action is «da decidere»

Sometimes something touches your action while it is waiting. For example:
- an action yours depended on has been withdrawn («Ginestra ha ritirato "vado avanti"…», meaning: Ginestra withdrew "I go ahead"…);
- someone got there before you on the same thing («Corrado ha già scritto di prendere la chiave…», meaning: Corrado has already written to take the key…);
- meanwhile the scene has changed («Nel frattempo la porta si è chiusa…», meaning: meanwhile the door has closed…).

The phone shows a full-screen notice, «Qualcosa è cambiato» (Something has changed), with three buttons:
- **«Confermo»** (I confirm) or **«Tengo»** (I keep it): your action stays as it is;
- **«Cambio»** (I change it): the text goes back into the box, so you can correct it;
- **«Ritiro»** (I withdraw it): removes the action.

At the frantic pace the notice has a countdown: if it runs out, the action stays out of the turn.
The examples come from `docs/azioni-concorrenti.md`.

## The states of your action

| What the phone says | What it means |
|---|---|
| «in coda» (queued) | sent: waiting for the window to close. You can still change it. |
| «da decidere» (to be decided) | something has touched it: choose Confermo, Cambio or Ritiro. |
| «il narratore sta rispondendo» (the narrator is replying) | it has entered the turn the narrator is resolving. It can no longer be changed. |
| «risolta» (resolved) | the narrator has resolved it. |
| «ritirata» (withdrawn) | you withdrew it. |
| «non è andata» (did not go through) | it was not carried out: the scene or another action made it impossible. The text goes back into the box. |
| «rimasta fuori» (left out) | it was «da decidere» and the turn started without it. The text goes back into the box. |

## The pace

The table has two paces.

- **«Calmo»** (calm; the normal one): no deadline. The game waits until everyone who was called has sent. You can talk, plan and discuss as long as you like.
- **«Concitato»** (frantic: combat, chases, imminent danger): the window closes by itself **25 seconds** after it opens. When time is up it does not close on someone who is typing or still has to decide: it extends, up to 8 seconds. Then the actions still «da decidere» stay out, and the turn starts with what is there. The phone says «Si va di corsa: allo zero il narratore risolve con quello che c'è.» (We are in a hurry: at zero the narrator resolves with what there is.) The countdown appears on the phones and the projector only at this pace.

Who sets the pace:

- **the narrator**, with a service line that nobody hears: `[ritmo] concitato` or `[ritmo] calmo`. It applies from the next window;
- **the scene**, with `ritmo: concitato` in its data (`scena.yaml` or `scene/<id>.yaml`). Changing scene goes back to the pace of the new scene;
- **the Game Master**, with the **«Ritmo calmo»** (Calm pace) and **«Ritmo concitato»** (Frantic pace) buttons in the panel's «Finestra» (Window) box. With the window open it applies at once: «concitato» starts the countdown from that moment, «calmo» removes it.

**An action in the queue never starts a countdown.** Actions written while the narrator was speaking count as soon as the window opens, but if a player has already written, the others do not need to hurry.

## While the narrator works

When the turn starts, the phones show **«Il narratore sta preparando…»** (The narrator is preparing…), then, as soon as the first words arrive, **«Il narratore sta raccontando…»** (The narrator is telling…). Below, they say «Puoi già scrivere: la tua azione entra nel prossimo turno.» (You can already write: your action goes into the next turn.)

- You can write at any moment while the scene is running, even while the narrator speaks. Your action waits for the next window, and the phone marks it «· prossimo turno» (next turn). The panel marks it «(prossimo)» (next).
- When the next window opens, these actions are already there. They count at once, but they never start a countdown.

This is not a pause: the turn reopens by itself when the narration ends.

## The watchdog

While the game works (the opening, or a narration with its voice and audio), a «sorvegliante» (watchdog) checks for signs of life: a sentence from the model, a voice request or the first piece of audio, the audio starting on the projector.

If no sign of life arrives for **60 seconds**, the watchdog writes down the cause, stops the narrator and the voice, and reopens the window for everyone. The game never stays stuck forever.

The watchdog does not watch the waits that are meant to be: the open window (the players take their time) and the Game Master's pause.

In the logs: «sorvegliante: nessun segno di vita, si interviene» (watchdog: no sign of life, intervening) in `logs/server.out`, and the lines of type `sorvegliante` in `logs/narrazioni.jsonl`.

## The pause belongs to the Game Master

The game never pauses by itself. Only the Game Master puts the pause on and takes it off, from the panel:

- **«Pausa»** (Pause): no new window opens. If the narrator is speaking, it finishes the sentence, then the table stops; until then the button says «Pausa chiesta» (pause requested). With a window open, the window stays open but does not close by itself.
- **«Riprendi»** (Resume): starts the table again, or cancels a pause that was requested.
- **«Ferma la narrazione»** (Stop the narration): stops the narrator and the voice at once and pauses the table. The actions of that turn go back to the players as «non è andata».

While paused, the phones show «Tavolo in pausa» (Table paused) and can still write: the actions go in when play resumes. «Risolvi ora» does not work during a pause: resume first.

More in [the Game Master panel](master-panel.md#the-main-commands).

## Timings, for tests

The timings are in `apps/server/src/config.ts`. Change them only for tests, on a test port (see [Development](development.md)).

| Variable | Default | What it sets |
|---|---|---|
| `TAGM_ASSESTAMENTO_MS` | `2500` | the settling wait after everyone has sent |
| `TAGM_CONCITATO_MS` | `25000` | the deadline of a window at the frantic pace |
| `TAGM_SORVEGLIANTE_MS` | `60000` | the watchdog's wait; `0` switches it off |
| `TAGM_FINESTRA_TUTTI` | off | `1` opens every window for all the characters at the table (for experiments) |

## Problems?

Go to [Common problems](common-problems.md#the-game-seems-stuck).

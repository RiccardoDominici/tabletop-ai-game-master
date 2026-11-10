# A game night

On this page: one game from start to finish, with `scripts/partita.sh`, the projector, the phones and the turns.
Read first: [Installation](installation.md) (at least steps 1 to 4).

> Note: for now, all on-screen text and all voices are in Italian, so the labels quoted in this guide appear in Italian, as they do on screen. Choosing the play language during setup is coming.

## Before the game night

Check these things, one by one.

1. The Mac is connected to the projector and the speakers.
2. The Mac and the phones are on the same Wi-Fi network, not the guest network.
   If a phone cannot join, see [Connecting the phones](phones.md).
3. The keys are in the `.env` file (see [Installation](installation.md), step 4).
4. If you use the drama-3 voice, make sure your OpenRouter credit has not run out. When it runs out, OpenRouter replies with error 402 (`docs/ricerca-voce-drama3.md`).
5. The campaign is ready. The three example campaigns (`prova-f0`, `ponte-lanterne`, `nozze-neve`) already are.
   For a new campaign, see [Creating a campaign](create-a-campaign.md).

## Step 1. Start the game

On the Mac, from the root of the repo:

```bash
scripts/partita.sh nozze-neve
```

This starts the `nozze-neve` campaign with the default choices: mode B and the drama-3 voice.

The full form of the command is this (the same one the script prints if you get it wrong):

```bash
scripts/partita.sh <campagna> [--modo A|B] [--voce fish|qwen|finta] [--nuova] [--sessione N]
```

| Option | What it does |
|---|---|
| `<campagna>` | the name of a folder in `campagne/`, for example `prova-f0` or `ponte-lanterne`. Required. |
| `--modo B` | default. The narrator uses the «repertorio» (repertoire): lines written in advance, which Haiku picks at the right moment. It improvises only what was not foreseen. |
| `--modo A` | the narrator improvises everything. Use it for campaigns that have no `repertorio/` folder. |
| `--voce fish` | default. The game voice is drama-3, via OpenRouter: expressive, paid. If OpenRouter does not respond, it uses the local Qwen voice for that line, if it is already running; otherwise the line stays as text on the screen. |
| `--voce qwen` | the local Qwen3-TTS voice, on the Mac, without network. It needs step 5 of the installation. The script warns you with «fino a 7 GB di RAM, qualche minuto la prima volta» (meaning: up to 7 GB of RAM, a few minutes the first time). |
| `--voce finta` | a tone instead of a voice: no network, no services. Useful for testing. |
| `--nuova` | starts the campaign from the beginning. Without it, if there is a saved game of this campaign, it resumes that game. |
| `--sessione N` | only for multi-session campaigns: plays session number N. See [Multi-session campaigns](multi-session-campaigns.md). |

The narrator is always the real Haiku: it needs an Anthropic key.

More examples:

```bash
scripts/partita.sh prova-f0 --voce finta
scripts/partita.sh ponte-lanterne --voce qwen
scripts/partita.sh nozze-neve --nuova
```

- The first plays `prova-f0` with the fake voice.
- The second plays `ponte-lanterne` with the local voice.
- The third starts `nozze-neve` from the beginning, even if there was a saved game.

### What the script does, in four steps

The script prints each step as it goes:

1. **«1/4 Controllo la campagna»** (meaning: checking the campaign): runs the validator. If the campaign has errors, the game does not start and the script shows them to you.
2. **«2/4»**: prepares the voice. With drama-3 there is nothing to start; with Qwen it starts the local service; with the fake voice it stops any old service that is still running.
3. **«3/4 Fermo le istanze vecchie, compilo le pagine e avvio il server»** (meaning: stopping old instances, building the pages and starting the server): so you can run the script again whenever you like; it stops by itself whatever was running before.
4. **«4/4 Pronto»** (meaning: ready): prints a box with the campaign, the mode, the voice in use, and whether the game is new or resumed («Riprende la partita salvata dal turno N», meaning: resumes the game saved at turn N). Below it, the three addresses.

### The three addresses

| For whom | Address | Where it opens |
|---|---|---|
| Projector | `http://localhost:4610/schermo` | on the Mac connected to the projector and the speakers |
| Phones | `http://<IP del Mac>:4610/telefono` (the script prints the real one) | on each player's phone |
| Game Master panel | `http://localhost:4610/master?token=…` (the script prints the real one) | only on the Mac. Do not give it to the players. |

The panel token changes every time the game starts. If the script cannot find the link, it tells you to look for the line `PANNELLO MASTER` in `logs/server.out`. See [The Game Master panel](master-panel.md).

## Step 2. The projector

1. On the Mac, open `http://localhost:4610/schermo` in the browser and make it full screen on the projector.
2. The opening screen appears: the title, the QR code, the words «Inquadra il codice col telefono» (meaning: scan the code with your phone), the address for the phones, and who has already connected.
3. When the players are ready, click «Inizia sessione» (meaning: start session). That click is needed: without it, the browser does not play the audio.

After the click, the projector shows:
- the image of the place, with a slow camera movement (without an image, an atmospheric background);
- the title of the scene and, below it, the portraits of the NPCs present: whoever is speaking has a golden ring and is larger;
- in the centre, the portrait and name of whoever is speaking, with the subtitle of what they say;
- bottom left, the turn status: who is called, who has already sent, and «Aspettiamo: …» (meaning: waiting for: …);
- bottom right, the QR code, for those who arrive later;
- on the right, the dice roll cards, when there are any (see [Dice and sheets](dice-and-sheets.md)).

The music always plays underneath, with the place's ambient sounds. The music lowers when the voice speaks.

Three keys on the Mac keyboard, on the projector page:
- **A** opens the audio volumes (voice, music, ambience, themes, effects), which the browser remembers;
- **C** shows the credits of the tracks;
- **L** opens the small latency panel (for those who measure).

## Step 3. The phones

1. Each player scans the QR code on the projector, or types the phones address into their browser.
   A browser is enough: nothing needs to be installed.
2. Each player chooses their character by tapping its card. A label says if another phone has already taken it.
3. The phone remembers the character: if it reconnects, it finds it again.

How to connect them and what to do if they do not get in: [Connecting the phones](phones.md).

What the player sees on the phone, from top to bottom:
- **«Giochi come»** (meaning: you play as) and the character's name, with the hit points under the name when the campaign uses sheets;
- at the top, the round button with the speaker (**«Ascolta qui»**, see below), **«Regole»** (meaning: rules: the summary of the campaign's rules and the box «Chiedi una regola»), **«Scheda»** (meaning: sheet: the character sheet) and **«Cambia»** (meaning: change: to choose another character);
- a strip that says what is happening: «Tocca a te: cosa fai?» (meaning: your turn: what do you do?), «Azione inviata» (action sent), «Stavolta non sei chiamato» (you are not called this time), «Il narratore sta preparando…» (the narrator is preparing…), «Il narratore sta raccontando…» (the narrator is telling the story…), «Tavolo in pausa» (table paused);
- **«Al tavolo»** (meaning: at the table): the public actions of the other players that are still waiting, so you can coordinate as at a real table («anch'io», meaning: me too). Here are also the portraits of the NPCs present, which you can tap to speak to them, and those already met who are «Altrove» (meaning: elsewhere);
- **«Tiri del turno»** (meaning: turn rolls): the public dice cards of the last turn;
- the transcript of what has been said;
- at the bottom, the action box, with the **«Privata»** (meaning: private) switch and the two buttons **«Ritira»** (meaning: withdraw) and **«Invia»** (meaning: send).

In the sheet («La tua scheda», meaning: your sheet) there is who the character is and, highlighted, **«Solo tu lo sai»** (meaning: only you know): the things that only the character knows. The player decides whether and when to tell them to the others.

In «Regole» the player can ask a question about the rules («Chiedi una regola», meaning: ask a rule). The answer is seen only on their phone and comes only from the texts of the rules, never from the campaign (`docs/regole.md`, §5).

## Step 4. The Game Master panel

On the Mac, open the panel link printed by the script. It starts in «senza spoiler» (meaning: no spoilers) mode, so the Game Master can also play. All sections and commands: [The Game Master panel](master-panel.md).
A hidden NPC appears at the table when you reveal it from the panel with **Rivela** (meaning: reveal) (see [Creating a campaign](create-a-campaign.md#hidden-npcs)).

## How a turn works

1. The narrator reads the opening of the scene and opens the «finestra delle azioni» (meaning: action window) for everyone.
2. Whoever is called sees «Tocca a te: cosa fai?». Whoever is not called can still write: their action goes in, but the turn does not wait for them.
3. Write what your character does and press **Invia** (meaning: send). Sending means «I'm done»: there is no other button to press afterwards. If you do not want to do anything, write «Aspetto» (meaning: I wait).
4. As long as the window is open, you can change your mind. Correct the text and press again: the button now says **Aggiorna** (meaning: update). Or press **Ritira** to withdraw the action.
5. When everyone who was called has sent, the turn starts by itself after a moment: 2.5 seconds, to leave room for an «anch'io» or a correction. The phone shows «Hanno scritto tutti: si parte…» (meaning: everyone has written: we're starting…). Every send or withdrawal restarts the wait, and whoever is still writing extends it, up to a maximum of 8 seconds. A disconnected phone is not waited for.
6. The narrator responds. The phone shows «Il narratore sta preparando…», then «sta raccontando…». Meanwhile you can already write: your action enters the next turn.
7. The narrator ends by calling one or more characters, and the next window opens.

If nobody writes, the game waits: at the calm pace there is no deadline. The Game Master, if they want, has **Risolvi ora** (meaning: resolve now). On the phone you can also send with Ctrl+Invio or Cmd+Invio (Ctrl+Enter or Cmd+Enter); an action can be at most 500 characters long.

### When your action is «da decidere»

Sometimes something touches your action while it is waiting. For example:
- an action your own depended on has been withdrawn («Ginestra ha ritirato "vado avanti"…», meaning: Ginestra withdrew "I go ahead"…);
- someone got there before you on the same thing («Corrado ha già scritto di prendere la chiave…», meaning: Corrado has already written to take the key…);
- in the meantime the scene has changed («Nel frattempo la porta si è chiusa…», meaning: meanwhile the door has closed…).

The phone shows a full-screen notice, with three buttons:
- **Confermo** (or **Tengo**, meaning: keep): your action stays as it is;
- **Cambio** (meaning: change): the text goes back into the box, so you can correct it;
- **Ritiro** (meaning: withdrawal): removes the action.

At the frantic pace the notice has a countdown: if it runs out, the action stays out of the turn.
The examples come from `docs/azioni-concorrenti.md`.

### The states of your action

| What the phone says | What it means |
|---|---|
| «in coda» (meaning: in the queue) | sent: waiting for the window to close. You can still change it. |
| «da decidere» (meaning: to be decided) | something has touched it: choose Confermo, Cambio or Ritiro. |
| «il narratore sta rispondendo» (meaning: the narrator is responding) | it has entered the turn that the narrator is resolving. It can no longer be changed. |
| «risolta» (meaning: resolved) | the narrator has resolved it. |
| «ritirata» (meaning: withdrawn) | you withdrew it. |
| «non è andata» (meaning: did not go through) | it was not carried out: the scene or another action made it impossible. The text goes back into the box: press **Invia di nuovo** (meaning: send again) or rewrite it. |
| «rimasta fuori» (meaning: left out) | it was «da decidere» and the turn started without it. The text goes back into the box. |

## The pace

The table has two paces.

- **Calmo** (meaning: calm; the normal one): no deadline. The game waits until everyone who was called has sent. You can talk, plan and discuss as much as you like.
- **Concitato** (meaning: frantic; combat, chases, imminent danger): the window closes by itself 25 seconds after it opens. It does not close while someone is writing or still has to decide: in that case it extends, up to a maximum of 8 seconds. The phones and the projector show the countdown only at this pace.

Who sets the pace:
- the narrator, when the story requires it (it writes a service line that nobody hears);
- the scene, if its data contains `ritmo: concitato`;
- the Game Master, with the button on the panel.

An action in the queue never starts a countdown: if a player has already written, the others do not need to hurry. The timings come from `docs/f0-contratti.md`, «Turno».

## The dice

When the campaign has character sheets, the program rolls the dice, not the narrator. First a referee decides what is rolled (for example Persuasion, or an attack roll); then the code rolls, adds up and compares. The projector shows one card for each roll; the phone shows the card of your action. The narrator receives the outcome as a fact and narrates it.

Everything about how it works: [Dice and sheets](dice-and-sheets.md).

## Private actions

Turn on the **«Privata»** (meaning: private) switch under the box before sending. Next to it is written «solo il master la vede» (meaning: only the Game Master sees it).

- The other phones do not see it, not even in «Al tavolo».
- In the Game Master panel it appears marked as «privata» (private). In «senza spoiler» mode the panel hides its text and shows only who wrote it and its status.
- The narrator does not announce it at the table: aloud, it says only what the others can see or hear.
- The outcome arrives only on your phone, as text. The card of a private roll also appears only there.
- The voice of the outcome goes only to your phone, and only if you have turned on «Ascolta qui». Never to the projector. If nobody is listening on that phone, the line stays only written. If you can, use headphones: a phone that speaks at the table would let the neighbours hear the secret.

In the tests of 9 November 2026, the narrator sometimes narrated a private action aloud (`docs/prove.md`, section «Aperto», meaning: open). The narrator's rules now forbid this. If it happens, the Game Master can write a stage note.

## «Ascolta qui» (meaning: listen here)

On the phone, at the top, there is a round button with a speaker. It is the **«Ascolta qui»** switch.

- Off, the speaker is crossed out: the phone stays silent.
- Tap it once: the phone plays the game voice too, besides the projector.
- On, it has the colour of a candle and pulses while someone is speaking.
- Tap it again to turn it off.

One tap is needed because the phone's browser does not play anything by itself. If you had it on and reload the page, one tap is needed again: the button says so («Tocca per riascoltare la voce su questo telefono», meaning: tap to hear the voice again on this phone).

## If something goes wrong during the game

From the Game Master panel:
- **Pausa** (meaning: pause) stops the table, letting the sentence in progress finish; **Riprendi** (meaning: resume) starts it again;
- **Ferma la narrazione** (meaning: stop the narration) immediately silences the narrator and the voice and puts the table on pause.

If the narrator or the voice stays stuck with no signs of life for 60 seconds, a «sorvegliante» (meaning: watchdog) reopens the action window by itself (`docs/f0-contratti.md`, «Turno»). The game never stays stuck forever: only the Game Master puts the pause on and takes it off.

Other cases: [The Game Master panel](master-panel.md), section «Quando un'azione non va» (meaning: when an action does not go through), and [Common problems](common-problems.md).

## At the end of the evening

1. If the campaign has several sessions, in the panel press «Fine sessione» (meaning: end session): it writes the log of what happened, which is the basis for preparing the next session. See [Multi-session campaigns](multi-session-campaigns.md).
2. Stop everything:

   ```bash
   scripts/arresto.sh
   ```

   Stops the server (port 4610), the page development server if it is running (4612), and the voice service (4611).

3. If you like, check how much you have spent:

   ```bash
   scripts/costi.sh
   ```

   Shows the cost of the last 10 sessions, with Haiku and the voice shown separately. See [Voice and costs](voice-and-costs.md).

The game saves itself at every turn. To resume another evening, run the same command again without `--nuova` (for example `scripts/partita.sh nozze-neve`). The script says «Riprende la partita salvata dal turno N» (meaning: resumes the game saved at turn N). On the projector, press «Inizia sessione» again, and the phones find their character again.

## Where the logs are

The script lists them at the top:
- `logs/partita.out`: this start;
- `logs/server.out`: the server log, readable;
- `logs/server.jsonl`: the same log, structured;
- `logs/voce.out`: the local voice service.

Do you want to try something while a game is running, without touching it? There is a test instance on another port: see [Development](development.md).

## Problems?

Go to [Common problems](common-problems.md).

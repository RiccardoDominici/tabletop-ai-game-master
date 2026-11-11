# A game night

On this page: one game from start to finish, with `scripts/partita.sh`, the projector, the phones and the turns.
Read first: [Installation](installation.md) (steps 1 to 7).

> Note: the game plays in Italian or English (`lingua` in the configuration and in the campaign, see [Create a campaign](create-a-campaign.md#play-language)). The labels quoted in this guide may still be the Italian ones; with an English configuration the screens show their English versions.

## Before the game night

Check these things, one by one.

1. The Mac is connected to the projector and the speakers.
2. The Mac and the phones are on the same Wi-Fi network, not the guest network.
   If a phone cannot join, see [Connecting the phones](phones.md).
3. If you play with a paid narrator or voice, the keys are in the `.env` file (see [Installation](installation.md), step 4). With the default choices everything runs on the Mac and no key is needed (see [Local and API](local-and-api.md)).
4. If you use the drama-3 voice, make sure your OpenRouter credit has not run out. When it runs out, OpenRouter replies with error 402 (see [The voice](voice.md#drama-3)).
5. The campaign is ready. The four example campaigns (`prova-f0`, `ponte-lanterne`, `nozze-neve`, `torre-mozza`) already are.
   For a new campaign, see [Creating a campaign](create-a-campaign.md).

## Step 1. Start the game

On the Mac, from the root of the repo:

```bash
scripts/partita.sh nozze-neve
```

This starts the `nozze-neve` campaign with the default choices: mode B, and the voice of the configuration (by default the local Qwen voice).

The full form of the command is this (the same one the script prints if you get it wrong):

```bash
scripts/partita.sh <campagna> [--modo A|B] [--voce fish|qwen|finta] [--nuova] [--sessione N]
```

| Option | What it does |
|---|---|
| `<campagna>` | the name of a folder in `campagne/`, for example `prova-f0` or `ponte-lanterne`. Required. |
| `--modo B` | default. The narrator uses the «repertorio» (repertoire): lines written in advance, which the reader picks at the right moment. |
| `--modo A` | the narrator improvises everything. Use it for campaigns that have no `repertorio/` folder. With the local reader it is much slower, because the model must write the prose itself. |
| (no `--voce`) | the voice comes from the configuration. By default it is the local Qwen voice. |
| `--voce qwen` | the local Qwen3-TTS voice, on the Mac, without network. It needs steps 6 and 7 of the installation. Starting it can take a few minutes the first time. |
| `--voce fish` | the drama-3 voice, via OpenRouter: expressive, paid, it needs the OpenRouter key. If OpenRouter does not respond, it uses the local Qwen voice for that line, if it is already running; otherwise the line stays as text on the screen. |
| `--voce finta` | a tone instead of a voice: no network, no services. Useful for testing. |
| `--nuova` | starts the campaign from the beginning. Without it, if there is a saved game of this campaign, it resumes that game. |
| `--sessione N` | only for multi-session campaigns: plays session number N. See [Multi-session campaigns](multi-session-campaigns.md). |

The narrator's reader is, by default, a local model on the Mac (Qwen3 8B, or 4B on a Mac under 16 GB; port 4613): the script starts it by itself. Haiku is used only if the configuration asks for it. Everything about it: [Local and API](local-and-api.md). All about the voices: [The voice](voice.md).

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
2. **«2/4»**: prepares the voice. With Qwen it starts the local service («Avvio la voce locale (Qwen3-TTS): può volerci qualche minuto…», meaning: starting the local voice, it can take a few minutes); with drama-3 there is nothing to start; with the fake voice it stops any old service that is still running.
3. **«3/4 Fermo le istanze vecchie, compilo le pagine e avvio il server»** (meaning: stopping old instances, building the pages and starting the server): so you can run the script again whenever you like; it stops by itself whatever was running before. In this step it also starts the local reader (port 4613) when the configuration uses it, and the scriptwriter if Claude Code is installed (see [Local and API](local-and-api.md#the-scriptwriter)).
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
- at the top, the round button with the speaker (**«Ascolta qui»**, see below), **«Regole»** (meaning: rules: the summary of the campaign's rules and the box «Chiedi una regola»), **«Diario»** (meaning: diary: the campaign so far and your private outcomes, see [Evenings](evenings.md#the-phone-diary)), **«Scheda»** (meaning: sheet: the character sheet) and **«Cambia»** (meaning: change: to choose another character);
- a strip that says what is happening: «Tocca a te: cosa fai?» (meaning: your turn: what do you do?), «Azione inviata» (action sent), «Stavolta non sei chiamato» (you are not called this time), «Il narratore sta preparando…» (the narrator is preparing…), «Il narratore sta raccontando…» (the narrator is telling the story…), «Tavolo in pausa» (table paused);
- **«Al tavolo»** (meaning: at the table): the public actions of the other players that are still waiting, so you can coordinate as at a real table («anch'io», meaning: me too). Here are also the portraits of the NPCs present, which you can tap to speak to them, and those already met who are «Altrove» (meaning: elsewhere);
- **«Tiri del turno»** (meaning: turn rolls): the public dice cards of the last turn;
- the transcript of what has been said;
- at the bottom, the action box, with the **«Privata»** (meaning: private) switch and the two buttons **«Ritira»** (meaning: withdraw) and **«Invia»** (meaning: send).

In the sheet («La tua scheda», meaning: your sheet) there is who the character is and, highlighted, **«Solo tu lo sai»** (meaning: only you know): the things that only the character knows. The player decides whether and when to tell them to the others.

In «Regole» the player can ask a question about the rules («Chiedi una regola», meaning: ask a rule). The answer is seen only on their phone and comes only from the texts of the rules, never from the campaign (`docs/regole.md`, §5).

## Step 4. The Game Master panel

On the Mac, open the panel link printed by the script. It starts in «senza spoiler» (meaning: no spoilers) mode, so the Game Master can also play. All sections and commands: [The Game Master panel](master-panel.md).

### Hidden NPCs

A hidden NPC appears at the table when you reveal it from the panel with **Rivela** (meaning: reveal) (see [Creating a campaign](create-a-campaign.md#hidden-npcs)).

## How a turn works

1. The narrator reads the opening of the scene and opens the «finestra delle azioni» (meaning: action window).
2. Whoever is called sees «Tocca a te: cosa fai?» (meaning: your turn: what do you do?). Whoever is not called can still write.
3. Write what your character does and press **Invia** (meaning: send). Sending means «I'm done». You can correct it (**Aggiorna**, meaning: update) or withdraw it (**Ritira**) while the window is open.
4. When everyone who was called has sent, the turn starts by itself after a moment. If nobody writes, the game waits: at the calm pace there is no deadline.
5. The narrator responds. Meanwhile you can already write: your action enters the next turn.

Everything about turns, the calm and the frantic pace, «Risolvi ora», the actions «da decidere» (meaning: to be decided) and their states: [Pace and turns](pace-and-turns.md).

## The dice

When the campaign has character sheets, the program rolls the dice, not the narrator. First a referee decides what is rolled, for example Persuasion, or an attack roll (by default this referee is code, with no model); then the code rolls, adds up and compares. The projector shows one card for each roll; the phone shows the card of your action. The narrator receives the outcome as a fact and narrates it.

Everything about how it works: [Dice and sheets](dice-and-sheets.md).

## Private actions

Turn on the **«Privata»** (meaning: private) switch under the box before sending. Next to it is written «solo il master la vede» (meaning: only the Game Master sees it).

- The other phones do not see it, not even in «Al tavolo».
- In the Game Master panel it appears marked as «privata» (private). In «senza spoiler» mode the panel hides its text and shows only who wrote it and its status.
- The narrator does not announce it at the table: aloud, it says only what the others can see or hear.
- The outcome arrives only on your phone, as text. The card of a private roll also appears only there.
- The voice of the outcome goes only to your phone, and only if you have turned on «Ascolta qui». Never to the projector. If nobody is listening on that phone, the line stays only written. If you can, use headphones: a phone that speaks at the table would let the neighbours hear the secret.

In the tests of 9 November 2026, the narrator sometimes narrated a private action aloud (`docs/prove.md`, section «Aperto», meaning: open). The narrator's rules now forbid this, and the Engine checks it too: a line at the table that tells your private action goes to your phone instead, and so does the reply of the NPC you spoke to in private, when nobody spoke to that NPC in public in the same turn. If something still slips through, the Game Master can write a stage note.

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

If the narrator or the voice stays stuck with no signs of life for 60 seconds, a «sorvegliante» (meaning: watchdog) reopens the action window by itself. The game never stays stuck forever: only the Game Master puts the pause on and takes it off (see [Pace and turns](pace-and-turns.md#the-watchdog)).

Other cases: [The Game Master panel](master-panel.md), section «Quando un'azione non va» (meaning: when an action does not go through), and [Common problems](common-problems.md).

## At the end of the evening

1. In the panel, press «Chiudi la sessione» (meaning: close the session): the narrator closes the moment, the projector shows «Cosa è successo stasera» (meaning: what happened tonight), and the server writes the log and the summary. «Fine sessione» (meaning: end session) is the emergency exit, with no narration. See [Evenings](evenings.md#closing-the-evening).
2. Stop everything:

   ```bash
   scripts/arresto.sh
   ```

   Stops the server (port 4610), the page development server if it is running (4612), the voice service (4611), the local reader (4613) and the scriptwriter. With `--lascia-voce` or `--lascia-lettore` it leaves the voice or the reader running.

3. If you like, check how much you have spent:

   ```bash
   scripts/costi.sh
   ```

   Shows the cost of the last 10 sessions, with the models and the voice shown separately. With the default local choices it is zero. See [Voice and costs](voice-and-costs.md).

The game saves itself at every turn. To resume another evening, run the same command again without `--nuova` (for example `scripts/partita.sh nozze-neve`). The script says «Riprende la partita salvata dal turno N» (meaning: resumes the game saved at turn N). On the projector, press «Inizia sessione» again, and the phones find their character again. If the evening before was closed with «Chiudi la sessione», or after a long break, the projector first reads «La volta scorsa…» (meaning: last time…). The whole loop across evenings: [Evenings](evenings.md).

## Where the logs are

The main ones:
- `logs/partita.out`: this start;
- `logs/server.out`: the server log, readable;
- `logs/server.jsonl`: the same log, structured;
- `logs/voce.out`: the local voice service;
- `logs/lettore.out`: the local reader (port 4613).

Do you want to try something while a game is running, without touching it? There is a test instance on another port: see [Development](development.md).

## Problems?

Go to [Common problems](common-problems.md).

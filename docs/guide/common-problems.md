# Common problems

What you find here: the most frequent failures, each with the symptom, the likely cause, what to do, and where to look in the logs.
Read first: [a game night](one-evening.md) for the normal routine, and for the phones [the phone guide](phones.md).

## Where the logs are

All the logs are in `logs/`, outside git. They contain the players' actions, including the private ones: **do not publish them or attach them to a report** without having read them first.

| File | What is inside |
|---|---|
| `logs/partita.out` | the last start made by `scripts/partita.sh` |
| `logs/server.out` | the server output, start after start |
| `logs/server.jsonl` | the server log, one JSON line per event |
| `logs/build.out` | the build of the web pages |
| `logs/voce.out`, `logs/voce.jsonl` | the local voice service (Qwen) |
| `logs/lettore.out` | the local reader, the model server on port 4613 |
| `logs/sceneggiatore/` | the scriptwriter (`sceneggiatore.out`, `sceneggiatore.jsonl`) |
| `logs/turni.jsonl` | the timings of each turn |
| `logs/costi.jsonl` | the cost of each call (narrator and voice) |
| `logs/narrazioni.jsonl` | what the narrator wrote, turn by turn, and the watchdog's interventions |
| `logs/master.jsonl` | the commands given from the Game Master panel |
| `logs/sessioni.sqlite` | the archive of sessions: this is where the game resumes after a restart |
| `logs/prepara-<id>.log` | each run of `scripts/prepara.sh` for that campaign |
| `logs/tra-sessioni-<id>.log` | each run of `scripts/tra-sessioni.sh` |
| `logs/porta-<porta>/` | the same files for a test instance on another port |

To search for a message, use `grep`. For example:

```
grep "voce fish" logs/server.out | tail -n 20
```

This shows the last twenty lines of the server log that mention the drama-3 voice.

---

## The Mac is on battery while making images

**Symptom.** `scripts/prepara.sh` says «ATTENZIONE: il Mac è a batteria» (meaning: WARNING: the Mac is on battery) and does not generate the images. Or the generation stops with «Mac a batteria al N%: collega l'alimentatore prima di generare immagini.» (meaning: Mac on battery at N%: plug in the power adapter before generating images), or with «mflux (codice 0) non ha scritto <file>» (meaning: mflux (code 0) did not write <file>).

**Likely cause.** The images use the GPU at full load for 15–40 minutes. For this reason:

- `prepara.sh` does not generate on battery, unless you ask it to;
- the generator refuses to start on battery below 20%;
- mflux stops by itself when the charge drops to 20%, and exits without writing the image (`strumenti/immagini/motore.py`).

**What to do.**

1. Plug in the power adapter.
2. Run `scripts/prepara.sh campagne/<id>` again: it resumes from where it stopped.
3. Only if you cannot do otherwise, add `--anche-a-batteria` (meaning: also on battery). It is not recommended.
4. Do not close the lid while it generates (`prepara.sh` asks for this, and meanwhile keeps the Mac awake with `caffeinate`).

**Where to look.** `logs/prepara-<id>.log`.

## The Mac is slow or freezes during the images

**Symptom.** The Mac becomes very slow, or the log shows «errore transitorio della GPU (Metal «Impacting Interactivity»)» (meaning: temporary GPU error (Metal "Impacting Interactivity")), or «solo N GB liberi su disco (minimo 6.0 GB)» (meaning: only N GB free on disk (minimum 6.0 GB)).

**Likely cause.**

- The GPU is busy with the images: the rest of the Mac waits.
- macOS stops a computation that holds the GPU for too long while the screen needs it. The generator retries once by itself.
- The disk is almost full: the system uses the disk as extra memory, and below 6 GB free the generator does not start. The threshold is 6 GB by default; set `TAGM_DISCO_MINIMO_GB` to change it (for example `TAGM_DISCO_MINIMO_GB=3` for one risky run). Lowering it leaves less room for the swap, so do it only when you are watching the Mac.

**What to do.**

1. **Do not generate images while you play**: the GPU slows down the Mac, and with it the evening. If you only want the audio, use `scripts/prepara.sh campagne/<id> --senza-immagini` (meaning: without images).
2. Close the heavy apps while you generate.
3. If the disk is full, free up space and run it again.
4. To go faster, you can generate smaller places with `--dim-luogo 1280x720` (see [creating a campaign](create-a-campaign.md)).

**Where to look.** `logs/prepara-<id>.log`.

## Battery and heat with the local voice (Qwen)

**Symptom.** With the local voice (the default, or `--voce qwen`) the voice slows down, cuts out, or falls behind the text.

**Likely cause.** The local voice runs on the Mac, and its margin on real time is thin: with the machine loaded (other apps, browser, Docker, and the local reader sharing the same GPU) the synthesis becomes slower than speech (`services/voce/README.md`, «Problemi aperti», meaning: open problems). What happens on battery or with a hot Mac **is not written in the repository: to be verified**.

**What to do.**

1. Play with the power adapter plugged in.
2. Close the other heavy apps, and do not generate images at the same time.
3. If the local voice cannot keep up, use drama-3, which does not use the Mac's GPU: `scripts/partita.sh <campagna> --voce fish`. It needs the OpenRouter key and costs money (see [the voice](voice.md)).

**Where to look.** `logs/voce.jsonl`: each line has `rtf` (generation time divided by the duration of the audio). Above 1, the voice is slower than speech.

---

## The phones do not connect

**Symptom.** The phone does not open the page, or the page stays waiting for the connection.

**Likely cause.** Almost always the network, not the server:

- the phone is not on the same Wi-Fi network as the Mac;
- it is the guest network, which stops the devices from seeing each other;
- a VPN is active on the Mac or on the phone;
- the Mac's firewall blocks incoming connections;
- the address in the QR is wrong (the Mac has more than one active network).

**What to do.**

1. Use the address that `scripts/partita.sh` prints at the end, on the line **TELEFONI** (meaning: PHONES). It has the form `http://<indirizzo del Mac>:4610/telefono`. The same address is in the QR code on the projector.
2. Put the Mac and the phones on the same Wi-Fi network, the main one.
3. Turn off the VPNs, on the Mac and on the phones, for the evening.
4. If the address in the QR code is not the right one, you can set it yourself before starting:

   ```
   TAGM_IP=<indirizzo del Mac> scripts/partita.sh <campagna>
   ```

   This starts the game with that address in the QR code and on the TELEFONI line.
5. Follow the step-by-step checks in the [phone guide](phones.md): firewall, guest network, VPN, and the test from the Mac.

**Where to look.** `logs/partita.out` (the addresses printed) and `logs/server.out`, where the server writes at each start the line «Tabletop AI Game Master: in ascolto» (meaning: listening) with the phones' address.

## The game seems stuck

**Symptom.** Nobody speaks, the action window does not close, the phones do not change.

**Likely cause.** One of these, starting from the most common:

1. **It is waiting for someone.** At the calm pace there is no deadline: the turn starts only when all the invited PCs (player characters) have sent their action. The projector, the phones and the panel say who is missing: «Aspettiamo: …» (meaning: waiting for: …). A disconnected phone is not waited for (see [pace and turns](pace-and-turns.md#when-the-turn-starts)).
2. **No phone is connected.** The game waits for the table.
3. **The Game Master has paused the game.** Only the Game Master puts the pause on and takes it off. If they asked while the narrator was speaking, the button says «Pausa chiesta» (meaning: pause requested), and the pause starts when the narration ends. «Ferma la narrazione» (stop the narration) also leaves the table paused.
4. **The scene is over.** When the Engine («Motore») closes the scene with its ending, the table does not pause: the window reopens and the Game Master receives a notice to choose how to go on.
5. **The narrator or the voice has stalled.** If no sign of life arrives for 60 seconds, the **watchdog** («sorvegliante») records the cause, stops the narrator and the voice, and reopens the window for everyone.
6. **The projector has not pressed «Inizia sessione»** (meaning: start session). The session starts, or resumes, only from there.

**What to do.**

1. Read the line «Aspettiamo: …». Whoever does not want to do anything writes «Aspetto» and sends.
2. If someone does not answer, the Game Master presses **Risolvi ora** in the panel: the turn starts with the actions that are there.
3. If the panel shows **Riprendi**, the table is paused: press it. While paused, the phones can write, and the actions enter when the game resumes. «Risolvi ora» does not work while paused: the panel asks you to resume first.
4. If the scene is over, choose from the panel how to go on (see [the Game Master panel](master-panel.md)).
5. If the projector still shows the opening screen, click **Inizia sessione**.

**Where to look.**

- `logs/server.out`: lines that start with «finestra:» (meaning: window:), for example «finestra: sospesa dal master» (window: paused by the Game Master), «finestra: ripresa dal master» (window: resumed by the Game Master), «finestra: nessun invitato collegato, si aspetta il tavolo» (window: no invited player is connected, waiting for the table);
- `logs/server.out`: «sorvegliante: nessun segno di vita, si interviene» (watchdog: no sign of life, intervening);
- `logs/narrazioni.jsonl`: the lines of type `sorvegliante`, with the cause;
- `logs/master.jsonl`: the Game Master's commands (pause, resume, Risolvi ora).

---

## The voice does not play

First of all: **what does not play?** The projector, a phone, or only some lines?

### The projector is silent

**Symptom.** The text appears on the projector, but nothing is heard: neither voice nor music.

**Likely cause.**

- You have not clicked **Inizia sessione**: the browser does not play anything without a user action.
- An audio bus is at zero or muted. The projector has a volume panel (key **A**): volume and mute for voice, music, ambience, themes and effects. The browser remembers them: a mute set once stays set.
- The speakers are not connected to the Mac, or the Mac's volume is at zero.

**What to do.** Click «Inizia sessione»; press **A** on the projector and check the volumes and mutes; check the speakers and the Mac's volume.

### drama-3 does not speak: key or credit

**Symptom.** The text appears on the projector and stays there for the time it takes to read it, but the voice does not arrive. The turn goes on anyway.

**Likely cause.** This is for the drama-3 voice (`--voce fish`, or `openrouter` in the configuration). If the request fails, the server retries once; then it switches to the Qwen backup, if there is one; otherwise the line stays as text. The most common causes:

- **the key `OPENROUTER_API_KEY` is missing**. The server looks for it in the environment, then in the `.env` file at the root, then in the fallback file (`TAGM_CHIAVE_OPENROUTER`);
- **the credit has run out**: OpenRouter replies 402. A 401 or 403 usually means the key is wrong. These errors are not retried;
- **the network is down**, or OpenRouter does not send audio within 6 seconds (`TAGM_FISH_PRIMO_MS`).

**What to do.**

1. Check that the key is there (see [installation](installation.md)). Never paste it into a chat, a log or a commit.
2. Check and top up the credit on OpenRouter (see [the voice](voice.md#drama-3)).
3. To have a **backup** during the evening, turn on the local voice before the game:

   ```
   scripts/voce-avvio.sh
   scripts/partita.sh <campagna> --voce fish
   ```

   The first line starts the Qwen voice on the Mac and waits until it is ready; the second starts the game with drama-3, which uses Qwen only for the lines it cannot say. `partita.sh` confirms it with «riserva: la voce locale, già pronta» (meaning: backup: the local voice, already ready). The backup applies only to the real game, on port 4610: test instances never use the voice service on 4611.
4. If drama-3 fails for the whole evening, play with the local voice: `scripts/partita.sh <campagna> --voce qwen`. If the configuration chooses drama-3, `scripts/configura.sh --voce locale` makes the local voice the default again.

**Where to look.** In `logs/server.out`:

- «voce fish: richiesta fallita» (meaning: fish voice: request failed), with the `stato` (status: 402, 401, …) and whether it switched to the backup;
- «OPENROUTER_API_KEY non trovata» (meaning: OPENROUTER_API_KEY not found), if the key is missing altogether;
- «voce: frase senza voce, resta il testo» (meaning: voice: line without voice, the text stays).

To know which voice the game is using, look at the top line printed by `partita.sh`: «voce: drama-3 (OpenRouter)», «Qwen locale» (local Qwen) or «finta» (fake).

### The local voice (Qwen) does not start

**Symptom.** `partita.sh` (with the local voice, the default, or `--voce qwen`) says «La voce locale non è partita (vedi logs/voce.out)» (meaning: the local voice did not start (see logs/voce.out)) and the game does not start, or `voce-avvio.sh` says «manca il venv del servizio voce» (meaning: the voice service venv is missing) or «non pronto dopo 300 s» (meaning: not ready after 300 s).

**Likely cause.**

- the Python environment of the voice service is not there (`services/voce/.venv`);
- the model is not already on disk: the service starts without network (`HF_HUB_OFFLINE=1`) and downloads nothing (`services/voce/README.md`). `python3 -I strumenti/configura/configura.py --scarica` downloads it;
- the Mac is too loaded: the first time, loading can take a few minutes.

**What to do.** Follow the commands that `voce-avvio.sh` prints to create the environment, then steps 6 and 7 of the [installation](installation.md) (the local voice and the models). Meanwhile you can play with the fake voice, `scripts/partita.sh <campagna> --voce finta`, or with drama-3 if you have the OpenRouter key, `--voce fish`.

**Where to look.** `logs/voce.out` (readable) and `logs/voce.jsonl` (events `avvio`, `pronto`, `errore_avvio`).

### A phone does not hear the voice

**Symptom.** The projector speaks, the phone does not. Or the outcome of a private action appears on the phone only as text.

**Likely cause.** The phone does not play sound until you tap it: the browser requires it. Also, the voice of a **private** outcome goes only to the phones of that PC with **Ascolta qui** turned on, never to the projector. If nobody has turned it on, that line is not synthesized: the text stays on the phone only.

**What to do.**

1. In the phone's header, tap the round speaker button, **Ascolta qui**. Off, it has a crossed-out speaker; on, it has the colour of a candle.
2. If you reload the page, the phone remembers «Ascolta qui», but it starts playing again only after the first tap on the screen.
3. For secrets, headphones are better: whoever listens on the phone lets the neighbours hear the line.

**Where to look.** `logs/server.out`: «voce: frase privata senza ascolto, solo testo al telefono» (meaning: voice: private line with no listener, text only on the phone).

---

## The game does not start

| What `partita.sh` says | Likely cause | What to do | Where to look |
|---|---|---|---|
| «La campagna ha errori: la partita non parte.» (meaning: the campaign has errors: the game does not start.) | the validator found errors | fix them (see [creating a campaign](create-a-campaign.md), «Come leggere i messaggi», meaning: how to read the messages) | the `ERRORE` lines above the message |
| «La campagna … non ha un repertorio …: usa --modo A.» (meaning: the campaign … has no repertoire …: use --modo A.) | the campaign has no `repertorio/`, and mode B needs it | `scripts/partita.sh <campagna> --modo A` | — |
| «Non so quale sessione giocare (vedi sopra).» (meaning: I don't know which session to play (see above).) | multi-session campaign: the server finds no package that can be played | read the reason printed above; see [multi-session campaigns](multi-session-campaigns.md) | the output of `partita.sh` |
| «Il server non è partito. Ultime righe: …» (meaning: the server did not start. Last lines: …) | the server stopped at startup | read the last lines | `logs/partita.out`, `logs/server.out` |
| «web: compilazione fallita» (meaning: web: build failed) | the web pages do not build | read the error | `logs/build.out` |

## The narrator does not respond

**Symptom.** After a turn the narrator says nothing, or says only the short announcement and a waiting line, every time.

**Likely cause.** It depends on who reads the turn. The server writes it at every start in `logs/server.out`, on the `PROVIDER:` lines and the line «NARRATORE IN USO» (narrator in use).

- **The local reader stopped in the middle of the game**: `logs/server.out` says «local model server DOWN»; the server
  restarts it by itself and says «UP again» when it is back (see [local and API](local-and-api.md#the-local-reader)).
  If it says «restart given up», run `scripts/lettore-avvio.sh` and read why it does not start (often: too little
  free memory, with images or a second game running).
- **The local reader** (the default): the model server on port 4613 is not running. `scripts/partita.sh` starts it by itself; if it fails, `logs/partita.out` says «lettore locale: non partito, i componenti locali useranno le loro riserve (vedi logs/lettore.out)» (meaning: local reader: not started, the local components will use their fallbacks). The usual reasons: its Python environment is missing («lettore locale: manca mlx-lm», meaning: local reader: mlx-lm is missing), the model is not on disk yet, or the Mac has too little free memory.
- **Haiku** (when the configuration chooses `anthropic`): the key `ANTHROPIC_API_KEY` is missing, the credit has run out, or the network is down. If the key is missing at start, the server uses the next provider of the chain and says so on the `PROVIDER:` lines.

An error in the narration flow restarts the game at once; a wait with no sign of life restarts it after 60 seconds. The actions of the turn that the narrator did not narrate go back to the players.

With the local reader, a prepared line is not found for about one action in two. Then the table hears only the announcement and, if there is one, a waiting line. The scriptwriter fills those gaps, if Claude Code is installed (see [local and API](local-and-api.md#the-scriptwriter)): `scripts/sceneggiatore.sh stato` says whether it is running.

**What to do.**

1. Local reader: run `scripts/lettore-avvio.sh` and read what it says. To create the environment and download the model, see [installation](installation.md), steps 5 and 7.
2. Haiku: check the key (see [installation](installation.md#step-4-optional-the-keys)) and the credit (see [voice and costs](voice-and-costs.md)).

**Where to look.** `logs/lettore.out` for the local reader; in `logs/server.out`, «ANTHROPIC_API_KEY non trovata» (meaning: ANTHROPIC_API_KEY not found) if the key is missing; `logs/narrazioni.jsonl` for the watchdog's lines; `logs/sceneggiatore/sceneggiatore.out` for the scriptwriter.

## The server does not start after an update

**Symptom.** After `git pull`, `scripts/partita.sh` says «Il server non è partito» (meaning: the server did not start), and the logs say that a package `@tabletop-ai-gm/…` cannot be found (for example `Cannot find package '@tabletop-ai-gm/shared'`).

**Likely cause.** The Node packages of the repo have new names, and the `node_modules/` folder still has the old ones.

**What to do.** Run `npm install` again at the root of the repo, then start the game again.

**Where to look.** `logs/partita.out`, `logs/build.out` and `logs/server.out`.

## A name is read wrong

The voice reads the respelling of `campagne/<id>/pronunce.yaml` (see [the voice](voice.md#names-the-pronunciation-lexicon)).

- The name is not in the lexicon: `python3 -I strumenti/valida_campagna.py campagne/<id> --solo PRONUNCIA --avvisi` lists the
  missing ones; `npx tsx strumenti/pronuncia/prova.ts campagne/<id> --aggiungi` adds them and tries them.
- The respelling is wrong: change `grafia` (or add `candidate`) in the entry and run
  `npx tsx strumenti/pronuncia/prova.ts campagne/<id> --solo <Name>`. Whisper does not hear the stress: an accent mark you
  are sure of stays when the ear test is even.
- An ordinary word changes too («a brown coat» said like the name «Brown»): add `solo_maiuscolo: true` to the entry.
- A name invented during play: the Engine adds it by itself when the scriptwriter is on (`pronunce-gioco.yaml`).

## `prepara.sh` stops

| Message | Likely cause | What to do |
|---|---|---|
| «La campagna ha errori: niente immagini né audio.» (meaning: the campaign has errors: no images or audio.) | the strict validator found errors | fix them and run it again |
| «manca l'ambiente delle immagini (strumenti/immagini/.venv …)» (meaning: the images environment is missing) | the Python environment for the images is not there | create it (see [creating a campaign](create-a-campaign.md), «Le immagini», meaning: the images) |
| «manca l'ambiente dell'audio: lancia una volta strumenti/audio/setup.sh.» (meaning: the audio environment is missing: run strumenti/audio/setup.sh once.) | the audio environment is not there | run `strumenti/audio/setup.sh` |
| «manca ffmpeg» (meaning: ffmpeg is missing) (from `setup.sh`) | ffmpeg is not installed | install it (see [installation](installation.md)) |
| «immagini: la generazione si è fermata …» (meaning: images: generation stopped …) | battery, disk, GPU (see above) | run it again: it resumes from where it stopped |
| «pronuncia: la prova si è fermata …» (meaning: pronunciation: the test stopped …) | network, OpenRouter key or credit | run it again: it tries only the entries not yet verified; or `--senza-pronuncia` |
| «Non ancora pronta da giocare. Manca: …» (meaning: not ready to play yet. Missing: …) | required images or audio are missing | read the list; the images marked «da controllare a mano» (meaning: to check by hand) are for you to look at |

Exit code of `prepara.sh`: `0` ready; `1` errors in the campaign; `2` wrong arguments; `3` a step failed or was skipped. The full log is in `logs/prepara-<id>.log`.

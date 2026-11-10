# Tabletop AI Game Master

On this page: what Tabletop AI Game Master is, what you need, and how to start your first game.
Before you read: nothing. This is the page to start from.

## What it is

Tabletop AI Game Master is a framework for playing Dungeons & Dragons in person, around a table, with an AI narrator.
The narrator is Claude Haiku: it describes the scene, speaks for the non-player characters (NPCs) and responds to the players' actions.
The projector shows the place, the portraits of the characters in the scene and the dice rolls; a speaker plays the voice and the music.
Each player uses their own phone, in the browser: they pick their character and write what they do.
Whoever acts as Game Master has a panel on the Mac to correct or stop the narrator at any moment.
It is not a single campaign: it is a system that generates new campaigns every time (story, images, music), for one evening or for many sessions.

The code keeps the rules, the dice and the secrets, not the model: the narrator tells the outcomes, it does not decide them.

## What you need

- **A Mac with Apple silicon** (M1 or newer). It is needed for the images generated locally and for the local Qwen voice,
  which use the MLX libraries. The project is sized for 16 GB of RAM (see [architecture](docs/architettura.md)).
  On a computer without Apple silicon, the rest (server, narrator, drama-3 voice) has not been tested: to be verified.
- **Node 22 or newer** (the `engines` field in `package.json`).
- **Python 3 with PyYAML**: the campaign validator uses it.
- **uv and ffmpeg**, only if you want to generate images and audio or use the local voice. See the
  [installation guide](docs/guide/installation.md).
- **The API keys**:

| Key | What it is for | Required? |
|---|---|---|
| `ANTHROPIC_API_KEY` | the Haiku narrator, the dice referee, the image check | yes, to play with the real narrator |
| `OPENROUTER_API_KEY` | the game voice (drama-3 by Fish Audio, via OpenRouter) | no: without it, you use the local Qwen voice or the fake voice |
| `FREESOUND_API_KEY` | CC0 ambient sounds from Freesound | no (the key is free) |

**What it costs.** You pay Anthropic and OpenRouter for what you use. The only complete measurement in the repo is from 9 November 2026:
a 45-turn session costs about $0.25 (about $0.16 for the drama-3 voice and $0.08 for Haiku), as long as drama-3
stays at its launch price. All the figures, with source and date: [Voice and costs](docs/guide/voice-and-costs.md).

## Quick start

These steps start the test campaign `prova-f0` (one scene, 20–30 minutes, 3 or 4 players).

1. Download the repository and go into the folder.

   ```bash
   git clone <indirizzo-del-repository> cantastorie
   cd cantastorie
   ```

   The repository is at `https://github.com/RiccardoDominici/tabletop-ai-game-master`. Replace `<indirizzo-del-repository>` with that address.

2. Install the Node dependencies (server, web pages and shared package, all in one go).

   ```bash
   npm install
   ```

3. Create the keys file by copying the template.

   ```bash
   cp .env.example .env
   ```

   Then open `.env` with a text editor and paste your keys after the `=` sign. For example:

   ```bash
   ANTHROPIC_API_KEY=la-tua-chiave-anthropic
   OPENROUTER_API_KEY=la-tua-chiave-openrouter
   ```

   These are placeholders: put your real key in their place. The `.env` file is outside git and must never be shared.
   The code looks for each key in this order: first the environment variable with the same name, then the line in the
   `.env` file at the root of the repo, and last an optional fallback file (see `apps/server/src/llm/chiavi.ts`).
   The details are in the [installation guide](docs/guide/installation.md).

4. Start the game.

   ```bash
   scripts/partita.sh prova-f0
   ```

   The script checks the campaign, builds the pages, starts the server and at the end prints three addresses:
   the projector, the phones and the Game Master panel.

5. On the Mac connected to the projector, open `http://localhost:4610/schermo` and click «Inizia sessione» (Start session).
   The players scan the QR code on the projector with their phone. You open the Game Master panel link
   that the script printed.

6. At the end of the evening, stop everything.

   ```bash
   scripts/arresto.sh
   ```

Without an OpenRouter key, start the game with the fake voice (a tone instead of the voice):

```bash
scripts/partita.sh prova-f0 --voce finta
```

The other example campaigns are `ponte-lanterne` (four scenes, two to two and a half hours) and
`nozze-neve` (three scenes, about two hours). All the options are in [One game night](docs/guide/one-evening.md).

## The guide

The first time, read it in this order.

1. [Installation](docs/guide/installation.md): dependencies, keys, what gets downloaded and how much space it takes.
2. [One game night](docs/guide/one-evening.md): a game from start to finish.
3. [Connecting the phones](docs/guide/phones.md): the network, the QR code, what to do if a phone cannot join.
4. [The Game Master panel](docs/guide/master-panel.md): every section and every command.
5. [Dice and character sheets](docs/guide/dice-and-sheets.md): how checks and character sheets work.
6. [Voice and costs](docs/guide/voice-and-costs.md): the three voices, the voice registry, how much you spend.
7. [Creating a campaign](docs/guide/create-a-campaign.md): from the brief to a campaign ready to play, with hidden NPCs and prepared lines.
8. [Multi-session campaigns](docs/guide/multi-session-campaigns.md): end of session, the session log, the next session.
9. [Your rules manual](docs/guide/your-rules-manual.md): playing with the rules of your own manual instead of the SRD 5.2.
10. [Common problems](docs/guide/common-problems.md): what to do when something goes wrong.
11. [Development](docs/guide/development.md): tests, test instances, how the code is organized.

## For those who want to understand how it is built

- `docs/architettura.md`: the modules, the interfaces, the experiments done.
- `docs/manuale-master.md`: the Game Master's craft rules, enforced by the code.
- `docs/prove.md`: checks and dice (research, character sheet schema, measurements).
- `docs/strati.md`: campaigns for one session or for many.
- `docs/da-fare.md`: the things still open.

## What is not there yet

- The microphone: today you play by typing on the phone.
- Full combat (initiative, turns, conditions): see `docs/prove.md`, section «Aperto» (Open).
- The code license: the repo does not have a license file yet (to be verified).
- Choosing the play language at setup: Italian is the only play language today; choosing it at setup is coming.

## Credits

This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC,
https://www.dndbeyond.com/srd, licensed under the Creative Commons Attribution 4.0 International License.
The credits for music, sounds, voices and images are in `CREDITS.md`.

## Problems?

Go to [Common problems](docs/guide/common-problems.md).

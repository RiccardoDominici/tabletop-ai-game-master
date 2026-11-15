# Phone dictation (speech-to-text)

What this page is: the design of the `ascolto` component. A player speaks the action on the phone, the phone sends
the recording to the computer that runs the game, and the computer turns it into the text of the action. Fantasy
names (NPCs, places, rule terms, PC names, names the players invent) must come out spelled as the campaign spells
them. User steps are in [Connecting the phones](guide/phones.md#speaking-your-action-microphone); install steps in
[installation](guide/installation.md).

## Flow

1. **Phone** (`apps/web/src/telefono/Microfono.tsx`, `dettato.ts`): hold to talk, or tap to start and tap to stop;
   at most 30 s. `MediaRecorder` records in the best format the browser has (webm/opus on Chrome and Firefox,
   mp4/aac on older iOS Safari) and posts the blob as it is.
2. **Server** `POST /api/dettato` (`apps/server/src/trasporto/dettato.ts`, `dettato/servizio.ts`): max 2 MB / 30 s,
   one request at a time and 12 a minute per PC, only for the PC the phone chose on its socket. ffmpeg converts to
   16 kHz mono WAV (`dettato/converti.ts`). Silent recordings never reach Whisper; Whisper's stock silence phrases
   and an echo of its own prompt count as empty. Timings are logged per step (convert, transcribe, correct).
3. **Transcriber** (`dettato/trascrittori.ts`, `dettato/catena.ts`), chosen like every other component
   ([provider.md](provider.md)): `locale` = whisper.cpp's `whisper-server` on `127.0.0.1:4614` with
   `ggml-large-v3-turbo-q5_0.bin` (0.57 GB, Metal on Apple silicon), reserves `openrouter` (whisper-1, only with a
   key) and `nessuno` (no microphone, the players type). The language is always the campaign's: no auto-detection.
   `scripts/ascolto-avvio.sh` / `ascolto-arresto.sh` start and stop it; the local model watchdog restarts it.
4. **Names** (below), then the answer `{testo, correzioni, secondi, provider, ms}`.
5. **Phone again**: the transcript goes into the action box after what is already there, with the names the server
   fixed listed under it. Review before sending is the default («Invia subito», send at once, is an opt-in kept on
   the phone). The action goes out with the transcript it came from, so the server can learn from the player's edits.

## Names

All pure modules in `apps/server/src/dettato/`, unit-tested on invented fixtures (`apps/server/test/dettato.test.ts`).

- **Vocabulary** (`vocabolario.ts`): PC names, NPCs present in the scene (with `alias`), places of the scene, the
  rest of the campaign, rule-set terms, the entries of `campagne/<id>/pronunce.yaml` (their respellings are the
  forms the name is *heard* as), and the names learned during the session.
- **Prompt biasing** (`prompt.ts`): Whisper's initial prompt is a short sentence in the play language that lists the
  most relevant names first, under a token budget; the least relevant names are cut first.
- **Correction** (`correzione.ts`, `fonetica.ts`): spans of 1–3 words are compared with the vocabulary, first
  exactly (ignoring case and accents), then by a phonetic key per language (accents, double consonants, c/k/ch,
  gn, z/ts…) and a normalized distance. Conservative beats clever, because a wrong name looks deliberate while a
  missed one is easy to fix on the phone:
  - the phonetic match needs Whisper's evidence that the span is a name: a capital in mid-sentence, or every word
    of the span capitalised (Whisper capitalises the names it recognises, and it was told them in the prompt);
  - without that evidence only the forms the players taught and an accent fix of a capitalised word apply;
  - ordinary words of the language, of the language pack and of the campaign are never replaced alone;
  - two names too close to each other: ambiguous, nothing changes; a pair the players undid is never proposed again.
- **Learning** (`apprendimento.ts`, `servizio.ts`): when the action arrives, the server compares it with the transcript. A span the player
  retyped becomes a learned form (heard → written); a new capitalised proper noun that is neither in the vocabulary
  nor a common word becomes a learned name. Learned names last for the session, are written to the session
  registry (event `dettato`, folded back on resume) and go to the voice's pronunciation lexicon
  (`voce/lessico-vivo.ts`, [pronuncia.md](pronuncia.md)), so the narrator also says them right.

## HTTPS

Browsers give the microphone only to a secure context, and `http://<LAN IP>` is not one. `scripts/certificato.sh`
uses mkcert: the CA stays in mkcert's own folder (its key is never copied), and a certificate for every LAN IPv4,
the host name and localhost goes to `cache/https/` (ignored by git), with a copy of the CA's public certificate.
The server answers http and https on the same port (`trasporto/https.ts`: the first byte of a connection picks
TLS). The projector, the Game Master panel and the scripts stay on http; the phone address and the QR become https.
Each phone opens `http://<IP>:<port>/certificato` once and installs the public certificate (Android: install a CA
certificate; iPhone: install the profile, then Settings > General > About > Certificate Trust Settings). Only the
public `rootCA.pem` is served (`/api/certificato.crt`), and only if it contains no private key. `TAGM_HTTPS=no`
turns HTTPS off.

## Measured

On the reference Mac (M1, 16 GB), 14 November 2026: `whisper-server` ready in about 22 s, 734 MB resident; a sentence
of 4–6 s transcribed in about 2 s once warm.

- Round trip (`strumenti/ascolto/giro.ts`, script `esperimenti/ascolto/torre-mozza.yaml`), final code, 15 November
  2026: 12 sentences with 21 names in all, spoken by the local voice (Qwen3-TTS), recorded as webm and as mp4 like a
  phone, posted to `/api/dettato` of a test server; 6 ordinary sentences on top. Names right before the correction:
  16/21 for webm and for mp4. After: 19/21 for both. Unwanted corrections on the ordinary sentences: 0 (webm and mp4).
  Names learned: Zorvak and Spinalba (both invented). Median latency: 1,921 ms (webm), 1,913 ms (mp4). Still wrong after
  the correction: «Fulco, tieni d'occhio grosso…» (lowercase «grosso», both formats), «Chiedo a Zorva…» (webm: the first
  Zorvak sentence, before it was learned), «…la torre Mozza» (mp4). Per-sentence results: `esperimenti/risultati/ascolto/torre-mozza-webm.json`
  and `torre-mozza-mp4.json`.
- Worst-case false positives (`strumenti/ascolto/falsi.ts <campagna> <altra-campagna>…`), final code, 15 November 2026:
  the whole vocabulary of one campaign against the ordinary sentences of the others. torre-mozza (24 names) against
  1,458 sentences: 0 unwanted corrections. prova-f0 (26 names) against 801 sentences: 0. nozze-neve (39 names) against
  1,279 sentences: 0. Output: `esperimenti/risultati/ascolto/falsi.txt`. Lowercase matches turned ordinary words
  into names; this is why the phonetic match needs Whisper's capital.

## Not verified yet

- A real phone: the button was driven by Playwright with Chromium's fake microphone (`apps/web/e2e/dettato.spec.ts`),
  not yet by a real Android or iPhone with the certificate installed.
- Clicking through a certificate warning instead of installing the certificate: not tested; install it.
- Computers other than Apple silicon: the provider is generic (whisper.cpp builds there), but untested.

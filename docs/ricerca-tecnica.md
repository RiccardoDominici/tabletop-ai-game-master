# Technical research — summary (1 November 2026)

Legend: [V] = page opened, [S] = seen only in search results or in a secondary source.

## Audio from the phone
- Recording with MediaRecorder. The format is chosen with `isTypeSupported()`, and `recorder.mimeType` is sent together with the clip.
  - Safari has historically produced mp4/AAC: https://webkit.org/blog/11353/mediarecorder-api [V]. That it produces webm/opus from iOS 18.4 is [S].
  - Chrome produces webm/opus [S].
  - The server always converts with ffmpeg.
- **HTTPS is required even on a local network.** `http://192.168.x.x` is not a secure context, so getUserMedia fails: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts [V].
  - Options: mkcert, with the root certificate installed on every phone; Tailscale HTTPS certificates, which require the app on the phone; an HTTPS tunnel [S].
  - To be tested on real devices.
- Projector page: a click on «Inizia sessione» (Start session) is needed to create or resume the AudioContext: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay [V].
- Wake Lock: on iOS Safari from 16.4, to be requested again on every `visibilitychange` [S].

## Communication between phones and server: Socket.IO v4
- Rooms included: one for the table, plus a `player:<id>` for each private channel: https://socket.io/docs/v4/rooms/ [V].
- State recovery on reconnection does not always succeed. A resynchronisation based on the state's version number is needed: https://socket.io/docs/v4/connection-state-recovery/ [V].
- Audio clips are sent with an HTTP POST.

## Rules license
- SRD 5.2, CC-BY-4.0 license. Attribution required, verified on the official PDF: «This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.» Source: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.pdf [V].
- 5e-database: data under OGL 1.0a, archived repository: https://github.com/5e-bits/5e-database [V]. The license of Open5e's data is not declared [V]. Better to extract from the SRD 5.2 PDF.

## Lessons from existing projects
1. The world state is owned by the server; the model changes it only through validated tools: https://github.com/paolofrancioso/open-dungeon-master [V], https://arxiv.org/abs/2409.06949 [V, abstract only].
2. Dice and rules are computed by the server; the narration cannot change outcomes: open-dungeon-master [V].
3. The narration receives a structured state (FIREBALL): https://arxiv.org/abs/2305.01528 [S].
4. Layered memory, with snapshots and the ability to go back: open-dungeon-master [V]; https://github.com/Sagesheep/NarrativeEngine-P [S].
5. One single writer of the state, plus a queue of turns: open-dungeon-master [V].
6. The human Game Master must be able to intervene (CALYPSO): https://arxiv.org/abs/2308.07540 [S].
7. Friends & Fables: keeps the state automatically, uses voice only for output, and says it does not replace a human Game Master: https://fables.gg/blog/why-ai-dungeon-is-not-the-ai-dungeon-master-youre-looking-for [S].

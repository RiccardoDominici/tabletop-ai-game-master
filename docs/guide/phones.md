# Connecting the phones on the local network

On this page: how the phones reach the Mac, what to check when they do not connect, the audio on the phone, speaking your action (the microphone) and the combat line.
Read first: [One evening of play](one-evening.md).

The server runs on the Game Master's Mac and listens on all interfaces (`0.0.0.0`, port **4610**).
The players' phones connect to it over the home Wi-Fi, without internet.

## How to connect them

1. Mac and phones on the **same Wi-Fi network** (not the guest network, see below).
2. Start the game with `scripts/partita.sh <campagna>`: it checks the campaign, starts the server and
   prints the addresses for the projector, the phones and the Game Master panel.
3. On the projector (`/schermo`) a **QR code** appears: each player scans it with the phone camera
   and opens the `/telefono` page.
4. If the QR code does not work, type the address by hand in the phone's browser. It has the form
   `http://<IP del Mac>:4610/telefono`, where `<IP del Mac>` is the Mac's IP address. The script prints
   the right one. You can also read it with `ipconfig getifaddr en0` (`en0` is usually the Wi-Fi). The address can change
   from one evening to the next: read it again each time. If the QR code shows the wrong address, start
   with `TAGM_IP=<IP del Mac> scripts/partita.sh <campagna>`.
5. Each phone chooses its character. The phone remembers the character: if it reconnects, it finds
   its player character (PG) again.

The Game Master panel is at `/master`, on the Mac or on another device on the same network.

## Building your character on the phone

If the campaign allows it, the character choice shows **Crea un personaggio**: you build your character step by step,
with real dice (type each die as it falls), the race and class your scores allow, the starting money and the equipment
(the phone shows what you have left, what you carry and your Armor Class as you buy), the languages and the name. When
it is finished the Game Master approves it from the panel; the page reconnects by itself and you play with it. Leaving
the screen with **Indietro** keeps what you did: **Crea un personaggio** brings you back to it.

**Scheda** (the sheet button at the top) shows your character: who they are and what they can do (as the campaign wrote
them), then their race, class and level, ability scores, languages and spellbook, as the sheet holds them — so a
character built at the table, which has no written text, shows its numbers too — and what they carry, their Armor
Class, attacks, coins, spells left today and the lights they hold.

## If the phones do not connect

Check in this order.

- **Mac firewall.** The macOS firewall can block incoming connections. Check it with
  `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate`. If it is on, allow incoming connections for «node» (in Italian macOS: «Impostazioni di Sistema → Rete →
  Firewall → Opzioni»; in English: System Settings → Network → Firewall → Options). If `node` is not in
  the list of allowed apps, the server cannot be reached.
- **Guest network or "client isolation".** Many routers, with the guest network on, stop devices
  from seeing each other. The phone browses the web but cannot reach the Mac. Use the main network.
- **VPN.** An active VPN on the Mac or on the phone can route traffic outside the local network.
  Turn it off for the session, on the Mac and on the phones.
- **Check from the Mac.** `lsof -nP -iTCP:4610 -sTCP:LISTEN` must show `*:4610`, and
  `curl -s -o /dev/null -w '%{http_code}' http://<IP del Mac>:4610/telefono` must return `200`. If
  the Mac responds but the phone does not, the problem is the network (guest network, isolation,
  VPN), not the server.

## Audio on the phone

The game voice does not start on its own on the phone: it needs one tap. In the phone's header
there is the switch **«Ascolta qui»** (the exact button label in the app; in English, "Listen
here"). Tap it once to hear the game voice on that phone too. Without that tap the phone stays
silent, because the browser requires it. The voice of a private outcome plays only on that player's
phone, and only with «Ascolta qui» on (see [The voice](voice.md#the-voice-on-the-phones)).

## Combat

When a fight is on, a line above the transcript shows the round and whose turn it is, for example «Combattimento · round 2 · tocca a» followed by a name. If the rule set has no turn order, it reads «agisce chi vuole» (anyone can act). The line also shows your HP and your conditions.

When it is your character's turn, the line becomes a banner, «È il tuo turno» (It's your turn), with:
- your HP (PF), and, if you are down, your death saving throws;
- your conditions, each with its icon;
- the actions available this turn, from the rule set (for example «Azione: una», action: one).

Only your character is invited to act on its turn. If you write at another time, your action waits and is resolved on your turn. See [Dice and sheets](dice-and-sheets.md#combat) for the rules.

## Speaking your action (microphone)

A player can speak the action instead of typing it. The phone records, the Mac turns the speech into
text with whisper.cpp (a program on the Mac; it goes to OpenRouter only if the local server is down and
an OpenRouter key is set), and the text lands in the action box.

**The button.** In the bottom row of the action box there is a round microphone button. Hold it to
talk, or tap once to start and tap again to stop. A recording lasts at most 30 seconds. While you
record, the button turns red, with a level ring and a timer. Then it shows «Trascrivo…» (Transcribing…)
while the Mac works: a sentence of five or six seconds takes about 2 to 3 seconds on an M1.

**Review, then send.** The text is added after what is already in the box. Read it, fix it if needed,
then press **Invia** (Send) as usual. Nothing is sent by itself. If you want it sent as soon as the
transcription arrives, tick «Invia subito dopo la trascrizione» (Send right after transcription). The
tick is remembered on that phone.

**Names.** The Mac knows the names of the table: the characters, the non-player characters the table
can see, and the names said during play. A name it knows is spelled right, even when the speech is
unclear. Under the box, «Nomi sistemati: …» (Names corrected: …) lists the names it changed: check them
before you send. A name nobody has heard yet (for example one you invent) comes out wrong: correct it in
the box before sending. From then on the game knows the name for the rest of the session, and the
narrator says it correctly (see [The voice](voice.md#names-the-pronunciation-lexicon)).

**The certificate, once per phone.** A browser gives the microphone (and the screen-on setting) only
on a secure address (https). The game serves https on the same port, 4610, but the computer's
certificate has to be trusted by each phone once. You do the steps below once for each phone, not once
per evening.

1. On the Mac, once: `scripts/certificato.sh` (it needs `brew install mkcert`). Run it again if the
   Mac gets a new address on the network: the server log warns you. Then restart the game with
   `scripts/partita.sh <campagna>`. The address for the phones becomes `https://<IP del Mac>:4610/telefono`.
2. On each phone, open `http://<IP del Mac>:4610/certificato` (plain http, on purpose) and tap
   «Scarica il certificato» (Download the certificate). It downloads the public certificate of the
   local authority: the private key never leaves the Mac.
3. Install it:
   - **Android:** Settings › Security (or Security & privacy) › More security settings › Encryption &
     credentials › Install a certificate › CA certificate.
   - **iPhone:** open the page in Safari and allow the profile download. Then Settings › General › VPN &
     Device Management: install the profile. Then Settings › General › About › Certificate Trust
     Settings: turn on full trust for it.
4. Open the `https://` address. The microphone button now works.

The script `scripts/partita.sh` prints the certificate page under the phone address. If it says the
microphone is off, or that it needs `scripts/certificato.sh`, follow what it says.

**Without the certificate.** The phone shows a «connection not private» warning, and the microphone
button stays grey. It links to the https address and to the certificate page. The phone still works:
players type their actions on the http address. Keeping the screen on also works on the https address,
and not on the http one.

**If the microphone does not work.**
- **«Il microfono è bloccato» (The microphone is blocked).** The browser permission was refused. Allow
  the microphone for the site in the browser settings, then try again.
- **The button is missing.** The game has no speech-to-text: the choice is `nessuno` (the players type).
  The whisper server may also be off. See [Common problems](common-problems.md#microphone).
- **«La trascrizione non risponde» (The transcription does not answer).** The whisper server is down and
  there is no backup. Run `scripts/ascolto-avvio.sh` and read `logs/ascolto.out`.
- **A warning about the certificate on the phone.** The certificate is not installed or not trusted on
  that phone, or the Mac's address changed. Run `scripts/certificato.sh` again, restart the game, and
  install the certificate again if the warning comes back.

The speech-to-text setup, the models and the design are in [docs/ascolto.md](../ascolto.md).

To turn HTTPS off, set `TAGM_HTTPS=no` before starting the game. Then the phones use http only, and the
microphone stays off.

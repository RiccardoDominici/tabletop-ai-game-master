# Connecting the phones on the local network

The server runs on the Game Master's Mac and listens on all interfaces (`0.0.0.0`, port **4610**).
The players' phones connect to it over the home Wi-Fi, without internet.

## How to connect them

1. Mac and phones on the **same Wi-Fi network** (not the guest network, see below).
2. Start the server with `scripts/avvio.sh`: it prints the addresses for the phones and the
   projector.
3. On the projector (`/schermo`) a **QR code** appears: each player scans it with the phone camera
   and opens the `/telefono` page.
4. If the QR code does not work, type the address by hand in the phone's browser. It has the form
   `http://<IP del Mac>:4610/telefono`, where `<IP del Mac>` is the Mac's IP address. Read the Mac's
   IP with `ipconfig getifaddr en0` (it is `192.168.1.4` now, but it can change: read it again at
   every session).
5. Each phone chooses its character. The phone remembers the character: if it reconnects, it finds
   its player character (PG) again.

The Game Master panel is at `/master`, on the Mac or on another device on the same network.

## If the phones do not connect

Check in this order.

- **Mac firewall.** The macOS firewall can block incoming connections. Check it with
  `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate` (it is off today). If you turn
  it on, allow incoming connections for «node» (in Italian macOS: «Impostazioni di Sistema → Rete →
  Firewall → Opzioni»; in English: System Settings → Network → Firewall → Options). `node` is not in
  the list of allowed apps, so without this step the server cannot be reached.
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
silent, because the browser requires it.

## Combat

When a fight is on, a line above the transcript shows the round and whose turn it is, for example «Combattimento · round 2 · tocca a» followed by a name. If the rule set has no turn order, it reads «agisce chi vuole» (anyone can act). The line also shows your HP and your conditions.

When it is your character's turn, the line becomes a banner, «È il tuo turno» (It's your turn), with:
- your HP (PF), and, if you are down, your death saving throws;
- your conditions, each with its icon;
- the actions available this turn, from the rule set (for example «Azione: una», action: one).

Only your character is invited to act on its turn. If you write at another time, your action waits and is resolved on your turn. See [Dice and sheets](dice-and-sheets.md#combat) for the rules.

## Later (not now)

The site runs over HTTP. The phone's **microphone** and **keeping the screen on** require a secure
connection (HTTPS). This is not planned now: when they are needed, a local certificate will be
added to the server.

# Collegare i telefoni in rete locale

Il server gira sul Mac del master e ascolta su tutte le interfacce (`0.0.0.0`, porta **4610**). I
telefoni dei giocatori si collegano a lui dalla rete Wi-Fi di casa, senza internet.

## Come collegarli

1. Mac e telefoni sulla **stessa rete Wi-Fi** (non la rete degli ospiti, vedi sotto).
2. Avvia il server con `scripts/avvio.sh`: stampa gli indirizzi per telefoni e proiettore.
3. Sul proiettore (`/schermo`) compare un **codice QR**: ogni giocatore lo inquadra con la fotocamera
   del telefono ed entra nella pagina `/telefono`.
4. Se il QR non va, scrivi l'indirizzo a mano nel browser del telefono. È della forma
   `http://<IP del Mac>:4610/telefono`. L'IP del Mac si legge con `ipconfig getifaddr en0` (ora è
   `192.168.1.4`, ma può cambiare: rileggilo a ogni sessione).
5. Ogni telefono sceglie il suo personaggio. Il telefono ricorda il personaggio: se si ricollega,
   ritrova il suo PG.

Il pannello del master è su `/master`, sul Mac o su un altro dispositivo della stessa rete.

## Se i telefoni non si collegano

Controlla in quest'ordine.

- **Firewall del Mac.** Il firewall di macOS può bloccare le connessioni in entrata. Verifica con
  `/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate` (oggi è spento). Se lo accendi,
  consenti in entrata «node» (Impostazioni di Sistema → Rete → Firewall → Opzioni). Non è nella lista
  delle app ammesse, quindi senza questo passo il server risulta irraggiungibile.
- **Rete per gli ospiti o «isolamento client».** Molti router, con la rete ospiti attiva, impediscono ai
  dispositivi di vedersi tra loro. Il telefono naviga ma non raggiunge il Mac. Usa la rete principale.
- **VPN.** Una VPN attiva sul Mac o sul telefono può instradare il traffico fuori dalla rete locale.
  Disattivala per la sessione, sul Mac e sui telefoni.
- **Verifica dal Mac.** `lsof -nP -iTCP:4610 -sTCP:LISTEN` deve mostrare `*:4610`, e
  `curl -s -o /dev/null -w '%{http_code}' http://<IP del Mac>:4610/telefono` deve dare `200`. Se il
  Mac risponde ma il telefono no, il problema è la rete (ospiti, isolamento, VPN), non il server.

## L'audio sul telefono

La voce del gioco non parte da sola sul telefono: serve un tocco. Nell'intestazione del telefono c'è
l'interruttore **«Ascolta qui»**: toccalo una volta per sentire la voce del gioco anche su quel
telefono. Senza quel tocco il telefono resta muto (lo chiede il browser, per regola).

## Più avanti (non ora)

Il sito gira in HTTP. Il **microfono** del telefono e il **mantenere lo schermo acceso** richiedono una
connessione sicura (HTTPS). Non è previsto adesso: quando serviranno, si aggiunge un certificato locale
al server.

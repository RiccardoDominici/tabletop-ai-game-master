# Ricerca tecnica — sintesi (1° novembre 2026)

Legenda: [V] = pagina aperta, [S] = visto solo nei risultati di ricerca o in una fonte secondaria.

## Audio dal telefono
- Registrazione con MediaRecorder. Il formato si sceglie con `isTypeSupported()` e insieme alla clip si invia `recorder.mimeType`.
  - Safari ha prodotto storicamente mp4/AAC: https://webkit.org/blog/11353/mediarecorder-api [V]. Che produca webm/opus da iOS 18.4 è [S].
  - Chrome produce webm/opus [S].
  - Il server converte sempre con ffmpeg.
- **Serve HTTPS anche in rete locale.** `http://192.168.x.x` non è un contesto sicuro, quindi getUserMedia fallisce: https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts [V].
  - Opzioni: mkcert, con il certificato radice installato su ogni telefono; certificati HTTPS di Tailscale, che richiede l'app sul telefono; un tunnel HTTPS [S].
  - Da provare su dispositivi veri.
- Pagina del proiettore: serve un clic su «Inizia sessione» per creare o riprendere l'AudioContext: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay [V].
- Wake Lock: su iOS Safari da 16.4, da richiedere di nuovo a ogni `visibilitychange` [S].

## Comunicazione tra telefoni e server: Socket.IO v4
- Stanze incluse: una per il tavolo, più una `player:<id>` per ogni canale privato: https://socket.io/docs/v4/rooms/ [V].
- Il recupero dello stato alla riconnessione non riesce sempre. Serve una risincronizzazione basata sul numero di versione dello stato: https://socket.io/docs/v4/connection-state-recovery/ [V].
- Le clip audio si inviano con una POST HTTP.

## Licenza delle regole
- SRD 5.2, licenza CC-BY-4.0. Attribuzione obbligatoria, verificata sul PDF ufficiale: «This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.» Fonte: https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.pdf [V].
- 5e-database: dati sotto OGL 1.0a, repository archiviato: https://github.com/5e-bits/5e-database [V]. Licenza dei dati di Open5e non dichiarata [V]. Meglio estrarre dal PDF SRD 5.2.

## Lezioni dai progetti esistenti
1. Lo stato del mondo lo possiede il server; il modello lo cambia solo con strumenti validati: https://github.com/paolofrancioso/open-dungeon-master [V], https://arxiv.org/abs/2409.06949 [V, solo abstract].
2. Dadi e regole li calcola il server; la narrazione non può cambiare gli esiti: open-dungeon-master [V].
3. Alla narrazione si passa uno stato strutturato (FIREBALL): https://arxiv.org/abs/2305.01528 [S].
4. Memoria a strati, con istantanee e possibilità di tornare indietro: open-dungeon-master [V]; https://github.com/Sagesheep/NarrativeEngine-P [S].
5. Un solo scrittore dello stato, più una coda dei turni: open-dungeon-master [V].
6. Il master umano deve poter intervenire (CALYPSO): https://arxiv.org/abs/2308.07540 [S].
7. Friends & Fables: tiene lo stato in automatico, usa la voce solo in uscita e dice di non sostituire un master umano: https://fables.gg/blog/why-ai-dungeon-is-not-the-ai-dungeon-master-youre-looking-for [S].

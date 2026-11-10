# Il pannello del master

In questa pagina: come entri nel pannello, il token del master, ogni sezione e ogni comando, cosa fare quando un'azione non va.
Prima leggi: [Una serata di gioco](one-evening.md).

Il pannello serve a una persona, sul Mac, per correggere o fermare il narratore IA. Non è un di più: un umano deve
sempre poter intervenire (`docs/architettura.md`, «Pannello master»). Chi fa da master può anche giocare: il pannello
parte in modalità «senza spoiler».

## Come entri

Hai tre strade. Usa la prima.

1. **Il link stampato dallo script.** Alla fine, `scripts/partita.sh` stampa la voce «PANNELLO DEL MASTER» con un
   link `http://localhost:4610/master?token=…`. Aprilo nel browser del Mac.
2. **Il log del server.** Se lo script non l'ha trovato, il link è nella riga `PANNELLO MASTER` del log:

   ```bash
   grep 'PANNELLO MASTER' logs/server.out | tail -n 1
   ```

   Mostra l'ultima riga col link (quella dell'avvio più recente). Il token è tuo: non incollare questa riga in
   chat o in un messaggio.
3. **Il modulo.** Se apri `http://localhost:4610/master` senza token, il pannello mostra un modulo
   («Pannello del master»). Incolla il token, o anche il link intero, e premi «Entra».

Dopo il primo accesso il browser ricorda il token. Il pannello lo toglie subito dalla barra degli indirizzi, così
non resta nella cronologia, nei segnalibri o in una foto dello schermo (`apps/web/src/master/token.ts`).

## Il token del master

Il token è la chiave del pannello: chi lo conosce comanda il tavolo.

- **Da dove esce.** Lo crea il server a ogni avvio: 16 caratteri casuali (`apps/server/src/master/token.ts`).
  Il server lo scrive nel suo log, dentro il link del pannello (`apps/server/src/index.ts`).
- **Dove sta.** Solo sul Mac: nel log del server (`logs/server.out`) e nel browser dove l'hai aperto. Non è nel QR
  dei telefoni e non arriva mai ai telefoni o al proiettore.
- **Quando cambia.** A ogni avvio del server. Se il pannello dice «Token rifiutato», il server è stato riavviato:
  prendi il token nuovo dal log. «Prossima sessione» invece tiene lo stesso token.
- **Un token fisso.** Se preferisci un token che non cambia, impostalo prima di avviare:

  ```bash
  CANTASTORIE_MASTER_TOKEN=<un-token-tuo> scripts/partita.sh prova-f0
  ```

  Avvia la partita con il tuo token. Deve avere da 12 a 128 caratteri, solo lettere, cifre, `_` e `-`;
  altrimenti il server lo ignora e ne crea uno a caso.
- **Chi tenta a caso viene chiuso fuori.** Dopo cinque token sbagliati il server chiude la connessione
  (`apps/server/src/trasporto/master.ts`).

**Perché non va condiviso.** Con il token si comanda tutto: si ferma il narratore, si cambia scena, si saltano le
azioni, si chiude la sessione. E con gli spoiler visibili si vede anche ciò che i giocatori non devono sapere: le
azioni private, i segni futuri degli orologi, le battute non ancora uscite. Quindi:
- non mostrare il pannello sul proiettore;
- non mandare il link ai giocatori, nemmeno a chi gioca dal suo telefono;
- se il token è uscito per sbaglio, riavvia la partita: il server ne crea uno nuovo.

## Com'è fatto

In alto c'è l'intestazione con i comandi principali, sempre in vista. Sotto, tre colonne (sullo schermo del Mac):
- **a sinistra**, cosa c'è sul proiettore e cosa incombe: scena e luogo, personaggi, audio, situazioni, orologi;
- **al centro**, cosa succede adesso al tavolo: finestra, azioni, trascrizione;
- **a destra**: note di regia, repertorio, sessione, registro.

Sotto i 1280 pixel di larghezza le colonne diventano due e la pagina scorre intera.

## L'intestazione

| Voce | Cosa dice |
|---|---|
| Fase | dove è il tavolo: «in attesa di «Inizia sessione»», «apertura della scena», «finestra delle azioni», «narrazione», «in pausa», «scena fermata» |
| Turno | il numero del turno |
| Pausa | se il tavolo è in pausa, o se la pausa è chiesta e arriverà a fine frase |
| Narratore | «narrazione in corso» oppure «in silenzio» |
| Voce | il motore della voce in uso |
| Schermo | se il proiettore è «collegato» o «non collegato» |
| Modalità | «A · improvvisa» oppure «B · repertorio» |
| Spoiler | l'interruttore «senza spoiler» / «spoiler visibili» |

Attenzione alla voce «Voce»: oggi conosce solo «Qwen (locale)» e «finta (mock)». Con drama-3 scrive «finta (mock)»
anche se la voce funziona (`apps/web/src/master/etichette.ts`). Fidati della riga «voce:» nel riquadro stampato da
`scripts/partita.sh`.

### I comandi principali

- **Pausa**: nessuna nuova finestra. Se il narratore sta parlando, finisce la frase e poi il tavolo si ferma
  (il pulsante dice «Pausa chiesta» finché non succede). A finestra aperta la finestra resta aperta ma non si chiude
  da sola. I telefoni possono scrivere: le azioni entrano alla ripresa.
- **Riprendi**: fa ripartire il tavolo, o annulla una pausa chiesta.
- **Ferma la narrazione** (rosso): il freno d'emergenza. Un clic, senza conferma: ferma subito il narratore e la voce,
  il proiettore tace e il tavolo va in pausa. Le azioni di quel turno non sono state risolte: tornano ai giocatori
  come «non è andata», da rimandare. Funziona solo mentre il narratore sta lavorando.

La pausa la mettono e la tolgono solo questi pulsanti: il gioco non si mette mai in pausa da solo.

Sotto i comandi compare «Fatto: …» quando un comando riesce. Se un comando viene rifiutato compare una riga rossa:
««nome del comando» rifiutato: motivo». La chiudi con la ×.

## Colonna di sinistra

### Scena e luogo

- In cima, la miniatura di ciò che è sul proiettore adesso, con il nome del luogo e della scena.
- **Luoghi**: un pulsante per luogo. Un clic mette quel luogo sul proiettore, con una dissolvenza.
  Il luogo in onda è evidenziato.
- **Scene della campagna** (solo se la campagna ha più scene): un clic passa a un'altra scena. Cambiano il contesto
  del narratore, gli orologi attivi, il luogo e le battute. Le azioni in sospeso tornano ai giocatori, il narratore
  legge l'apertura della scena nuova e si apre la finestra per tutti. Gli orologi tengono il loro stato tra le scene.

### Personaggi

Tutti i PNG della campagna, anche quelli che i giocatori non hanno ancora incontrato. Per ognuno:
- se «ha già parlato» o è «non ancora incontrato»;
- se è «in scena» o «altrove»;
- **In scena** e **Altrove**: decidi tu dove sta. La scelta si segna «a mano» e vale fino al cambio di scena;
- **Auto**: togli la tua scelta e torni a quello che dice la scena;
- **Rivela**: compare per un PNG «nascosto» (presente, ma non ancora mostrato al tavolo). Lo mostra ai giocatori.

Sul proiettore compaiono i ritratti dei PNG in scena; sui telefoni anche quelli già incontrati e altrove.

### Audio

Compare solo se la campagna ha l'audio.
- **Musica** e **Ambienti**: cosa suona adesso.
- **Umore della musica**: un pulsante per umore della campagna. Un clic cambia subito la musica. **auto** torna alla
  musica del luogo.
- **Effetti**: un clic suona l'effetto (una campana, una porta…) sul proiettore.

Anche il narratore e le battute cambiano umore ed effetti da soli; queste scelte compaiono nel registro col chip
«auto» (`docs/audio.md`, «Segnali automatici»). I volumi non stanno qui: li regoli sul proiettore con il tasto A.

### Situazioni

Le immagini di situazione: un PNG in un momento preciso, che prende il posto del luogo sul proiettore.
- Un clic su una situazione la mette sul proiettore, un altro clic la toglie.
- In modalità B il Motore le mostra anche da solo, quando esce la rivelazione collegata; il luogo torna quando parte
  la narrazione successiva.

### Orologi

Gli orologi delle minacce della scena: una fila di caselle, piene fino al segno già mostrato, con il prossimo evidenziato.
- **−1** e **+1** correggono di un segno, se il narratore ne ha dimenticato uno o ne ha messo uno di troppo.
- «dovuto»: il ritmo minimo chiede di mostrare il prossimo segno nella prossima risposta.
- «completo»: l'orologio è pieno; con gli spoiler visibili il pannello dice cosa succede «a orologio completo».
- «non ancora partito»: l'orologio aspetta una battuta o un indizio. +1 lo fa partire a mano.

## Colonna centrale

### Finestra

La finestra delle azioni del turno: «aperta» o «chiusa», e il ritmo («ritmo calmo» o «ritmo concitato»).
- Un'etichetta per giocatore: «✓ ha scritto» oppure «pensa…». Chi non era invitato ha il bordo tratteggiato e la
  scritta «non invitato»: la sua azione entra, ma il turno non lo aspetta.
- «Aspettiamo: …» dice chi manca.
- Al ritmo calmo: «nessuna scadenza: parte quando hanno inviato tutti». Al ritmo concitato: «si risolve da sola tra N s».
- **Ritmo calmo** / **Ritmo concitato**: cambia il ritmo del tavolo. Concitato vuol dire conto alla rovescia
  (vedi [Una serata di gioco](one-evening.md), «Il ritmo»).
- **Risolvi ora**: il narratore risponde subito alle azioni già inviate, senza aspettare chi manca. Le azioni ancora
  «da decidere» restano fuori dal turno. Funziona solo a finestra aperta e tavolo non in pausa.

### Azioni

Le azioni dei giocatori: quelle ancora vive e quelle dell'ultimo turno, in ordine di turno e d'invio.
Le azioni private comprese.
- Per ogni azione: chi l'ha scritta, lo stato, il turno e l'ora d'invio, il testo, l'eventuale motivo.
- Stati: «in coda», «da decidere», «in narrazione», «risolta», «ritirata», «non è andata», «rimasta fuori».
- «privata» (bordo tratteggiato blu): i telefoni degli altri non la vedono. In modalità senza spoiler il testo
  resta nascosto; vedi solo chi l'ha scritta e lo stato.
- I legami, sotto il testo: una freccia per un'azione che dipende da un'altra («anch'io»), due spade incrociate
  per un conflitto (in rosso chi lo perde).
- **Salta**: compare sulle azioni ancora vive. L'azione non entra nel turno e torna nella casella del giocatore,
  da riscrivere; chi dipendeva da lei deve decidere di nuovo.
- «(prossimo)» accanto al turno: l'azione è stata scritta a finestra chiusa ed entra nel turno dopo.

### Trascrizione

Quello che si è detto in pubblico, turno per turno. È la stessa trascrizione dei telefoni.

## Colonna di destra

### Note di regia

Una nota di regia è un'indicazione per il narratore, per esempio «Ottavia diventa più sospettosa» o
«più ritmo, meno descrizioni».
- Scrivi il testo (al massimo 280 caratteri), scegli per quanti turni vale (da 1 a 15) e premi **Aggiungi nota**.
  Anche Cmd+Invio o Ctrl+Invio la aggiungono.
- Al massimo 3 note insieme: per aggiungerne una quarta, prima **Togli** una delle altre.
- La nota entra nel messaggio del narratore dal turno dopo. Ogni turno narrato ne consuma uno: la barra mostra
  quanti ne restano. Le note si azzerano quando la scena ricomincia.

(Limiti in `packages/shared/src/master.ts`.)

### Repertorio

Solo in modalità B. Tre gruppi, da aprire e chiudere:
- **Disponibili adesso**: le battute scritte prima che il narratore può usare in questo momento;
- **Già uscite**;
- **Indizi rivelati**.

In modalità senza spoiler vedi solo quante battute ci sono, per chi parla, non il loro testo.

### Sessione

La partita si salva da sola. Qui vedi quando è iniziata, quanti salvataggi ci sono, se è stata ripresa
(e da che turno), e il file del registro, se c'è.
- **Fine sessione**: ferma il gioco, chiude la sessione e fa scrivere al server il registro (`registro.yaml`).
  Per una campagna di una sessione sola il registro va in `logs/registri/<campagna>/<id>/` (`docs/strati.md`).
- **Prossima sessione** (solo campagne a più sessioni): passa alla sessione dopo, se è pronta. Pannello, proiettore e
  telefoni si ricollegano da soli. Vedi [Campagne a più sessioni](multi-session-campaigns.md).
- **Nuova sessione**: ricomincia da capo la stessa campagna. La partita in corso si perde.

Questi tre comandi non si annullano. Per questo chiedono un secondo clic: il pulsante diventa rosso e chiede
«Confermi…?».

**Telefoni ricordati** (quando ci sono): ogni telefono con il suo personaggio. Puoi scegliere un altro personaggio
dall'elenco, o premere **Dimentica** perché quel telefono scelga di nuovo. Il cambio vale dal prossimo collegamento
del telefono.

In arrivo, da verificare: una chiusura guidata della serata («Chiudi la sessione»), descritta nelle richieste del
9 novembre 2026 (`docs/richieste-2026-11-09.md`, punto 9). Quando questa pagina è stata scritta il pannello non
aveva ancora il pulsante.

### Registro

Gli ultimi comandi, riusciti o rifiutati, con l'ora. Le scelte prese dal Motore da solo (umori, effetti) hanno il
chip «auto». Lo stesso registro, completo, è in `logs/master.jsonl`: una riga per comando.

## La modalità «senza spoiler»

È accesa all'inizio. L'interruttore è nell'intestazione, e il browser ricorda la tua scelta.

Quando è accesa, il pannello nasconde:
- il nome, i segni e il «a orologio completo» degli orologi (vedi solo «Orologio 1 · segni 1/6 · dovuto»);
- il testo delle azioni private (restano chi l'ha scritta e lo stato);
- le battute non ancora uscite (solo quante sono, per chi parla) e il tipo vero di quelle uscite;
- le situazioni non in onda.

Comandi, stati, conteggi, trascrizione, registro e note restano visibili. Spegnila solo se non giochi, o quando
devi proprio vedere tutto.

## Quando un'azione non va

| Cosa succede | Cosa fai |
|---|---|
| Un giocatore non scrive e il tavolo aspetta | Premi **Risolvi ora**: il narratore risponde alle azioni già inviate. |
| Un'azione «da decidere» blocca il turno | **Risolvi ora**: quell'azione resta fuori dal turno («rimasta fuori») e il giocatore la ritrova nella casella. |
| Un'azione in coda non ha senso o rovina la scena | **Salta**: torna nella casella del giocatore, da riscrivere. |
| Il narratore sta dicendo una cosa sbagliata | **Ferma la narrazione**. Le azioni del turno tornano ai giocatori come «non è andata». Aggiungi una nota di regia, poi **Riprendi**. |
| Il narratore sbaglia tono, è troppo lungo, un PNG cede troppo presto | Una **nota di regia**, per qualche turno. |
| Il narratore ha dimenticato un segno di un orologio, o ne ha messo uno di troppo | **+1** o **−1** sull'orologio. |
| Il proiettore mostra il luogo sbagliato | Un clic sul luogo giusto, in «Scena e luogo». |
| Un PNG risulta in scena ma non c'è, o il contrario | «Personaggi»: **In scena** o **Altrove**. |
| Il gioco sembra fermo | Guarda «Fase» e «Pausa». Se è in pausa, **Riprendi**. Se il narratore o la voce restano senza segni di vita per 60 secondi, il gioco riparte da solo con una finestra nuova (`docs/f0-contratti.md`, «Turno»). |
| Un comando non fa niente | Leggi la riga rossa sotto i comandi: dice il motivo del rifiuto. Il registro lo conserva. |
| Un telefono ha il personaggio sbagliato | Il giocatore preme «Cambia» sul telefono. Oppure lo cambi tu da «Telefoni ricordati», nella sezione «Sessione»: vale dal prossimo collegamento del telefono. |

Per tutto il resto: [Problemi comuni](common-problems.md).

## Problemi?

Vai a [Problemi comuni](common-problems.md).

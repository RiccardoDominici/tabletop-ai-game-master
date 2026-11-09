# Una serata di gioco

In questa pagina: una partita dall'inizio alla fine, con `scripts/partita.sh`, il proiettore, i telefoni e il turno.
Prima leggi: [Installazione](installazione.md) (almeno i passi da 1 a 4).

## Prima della serata

Controlla queste cose, una per una.

1. Il Mac è collegato al proiettore e alla cassa.
2. Il Mac e i telefoni sono sulla stessa rete Wi-Fi, e non sulla rete per gli ospiti.
   Se un telefono non entra, vedi [Collegare i telefoni](../guida-telefoni.md).
3. Le chiavi sono nel file `.env` (vedi [Installazione](installazione.md), passo 4).
4. Se usi la voce drama-3, il credito di OpenRouter non è finito. Quando finisce, OpenRouter risponde con
   l'errore 402 (`docs/ricerca-voce-drama3.md`).
5. La campagna è pronta. Le tre di esempio (`prova-f0`, `ponte-lanterne`, `nozze-neve`) lo sono già.
   Per una campagna nuova, vedi [Creare una campagna](creare-una-campagna.md).

## Passo 1. Fai partire la partita

Sul Mac, dalla radice del repo:

```bash
scripts/partita.sh nozze-neve
```

Avvia la campagna `nozze-neve` con le scelte predefinite: modo B e voce drama-3.

La forma completa del comando è questa (la stessa che stampa lo script se sbagli):

```bash
scripts/partita.sh <campagna> [--modo A|B] [--voce fish|qwen|finta] [--nuova] [--sessione N]
```

| Opzione | Cosa fa |
|---|---|
| `<campagna>` | il nome di una cartella in `campagne/`, per esempio `prova-f0` o `ponte-lanterne`. È obbligatorio. |
| `--modo B` | predefinito. Il narratore usa il «repertorio»: battute scritte prima, che Haiku sceglie al momento giusto. Improvvisa solo ciò che non è previsto. |
| `--modo A` | il narratore improvvisa tutto. Serve per le campagne senza cartella `repertorio/`. |
| `--voce fish` | predefinita. La voce del gioco è drama-3, via OpenRouter: espressiva, a pagamento. Se OpenRouter non risponde, per quella frase usa la voce locale Qwen, se è già accesa; altrimenti la frase resta scritta sullo schermo. |
| `--voce qwen` | la voce locale Qwen3-TTS, sul Mac, senza rete. Serve il passo 5 dell'installazione. Lo script la avvisa così: «fino a 7 GB di RAM, qualche minuto la prima volta». |
| `--voce finta` | un tono al posto della voce: niente rete, niente servizi. Utile per provare. |
| `--nuova` | ricomincia la campagna da capo. Senza, se c'è una partita salvata di questa campagna, la riprende. |
| `--sessione N` | solo per le campagne a più sessioni: gioca la sessione numero N. Vedi [Campagne a più sessioni](campagne-a-piu-sessioni.md). |

Il narratore è sempre Haiku vero: serve la chiave Anthropic.

Altri esempi:

```bash
scripts/partita.sh prova-f0 --voce finta
scripts/partita.sh ponte-lanterne --voce qwen
scripts/partita.sh nozze-neve --nuova
```

- Il primo gioca `prova-f0` con la voce finta.
- Il secondo gioca `ponte-lanterne` con la voce locale.
- Il terzo ricomincia `nozze-neve` da capo, anche se c'era una partita salvata.

### Cosa fa lo script, in quattro passi

Lo script stampa ogni passo mentre lo fa:

1. **«1/4 Controllo la campagna»**: lancia il validatore. Se la campagna ha errori, la partita non parte e
   lo script te li mostra.
2. **«2/4»**: prepara la voce. Con drama-3 non c'è niente da avviare; con Qwen avvia il servizio locale; con la
   voce finta ferma l'eventuale servizio vecchio.
3. **«3/4 Fermo le istanze vecchie, compilo le pagine e avvio il server»**: puoi quindi rilanciare lo script
   quando vuoi, ferma da solo quello che c'era prima.
4. **«4/4 Pronto»**: stampa un riquadro con la campagna, il modo, la voce in uso, e se la partita è nuova o
   ripresa («Riprende la partita salvata dal turno N»). Sotto, i tre indirizzi.

### I tre indirizzi

| Per chi | Indirizzo | Dove si apre |
|---|---|---|
| Proiettore | `http://localhost:4610/schermo` | sul Mac collegato al proiettore e alla cassa |
| Telefoni | `http://<IP del Mac>:4610/telefono` (lo script stampa quello vero) | sul telefono di ogni giocatore |
| Pannello del master | `http://localhost:4610/master?token=…` (lo script stampa quello vero) | solo sul Mac. Non darlo ai giocatori. |

Il token del pannello cambia a ogni avvio. Se lo script non trova il link, ti dice di cercare la riga
`PANNELLO MASTER` in `logs/server.out`. Vedi [Il pannello del master](il-pannello-del-master.md).

## Passo 2. Il proiettore

1. Sul Mac apri `http://localhost:4610/schermo` nel browser e mettilo a tutto schermo sul proiettore.
2. Compare la schermata d'inizio: il titolo, il codice QR, la scritta «Inquadra il codice col telefono»,
   l'indirizzo per i telefoni e chi si è già collegato.
3. Quando i giocatori sono pronti, clicca «Inizia sessione». Serve proprio quel clic: senza, il browser non fa
   partire l'audio.

Dopo il clic il proiettore mostra:
- l'immagine del luogo, con un lento movimento della camera (senza immagine, uno sfondo d'atmosfera);
- il titolo della scena e, sotto, i ritratti dei PNG presenti: chi parla ha un anello dorato ed è più grande;
- al centro il ritratto e il nome di chi parla, con il sottotitolo di quello che dice;
- in basso a sinistra lo stato del turno: chi è chiamato, chi ha già inviato, «Aspettiamo: …»;
- in basso a destra il QR, per chi arriva dopo;
- a destra le carte dei tiri dei dadi, quando ci sono (vedi [Dadi e schede](dadi-e-schede.md)).

Sotto c'è sempre la musica, con i suoni d'ambiente del luogo. La musica si abbassa quando parla la voce.

Tre tasti sulla tastiera del Mac, sulla pagina del proiettore:
- **A** apre i volumi dell'audio (voce, musica, ambienti, temi, effetti), che il browser ricorda;
- **C** mostra i crediti dei brani;
- **L** apre il pannellino delle latenze (serve a chi misura).

## Passo 3. I telefoni

1. Ogni giocatore inquadra il QR sul proiettore, oppure scrive nel browser l'indirizzo dei telefoni.
   Basta il browser: non si installa niente.
2. Ognuno sceglie il suo personaggio toccando la sua carta. Un'etichetta dice se un altro telefono l'ha già preso.
3. Il telefono ricorda il personaggio: se si ricollega, lo ritrova.

Come collegarli e cosa fare se non entrano: [Collegare i telefoni](../guida-telefoni.md).

Cosa vede il giocatore sul telefono, dall'alto in basso:
- **«Giochi come»** e il nome del personaggio, con i punti ferita sotto il nome quando la campagna usa le schede;
- in alto, il pulsante tondo con l'altoparlante (**«Ascolta qui»**, vedi sotto), **«Regole»** (il riassunto delle
  regole della campagna e la casella «Chiedi una regola»), **«Scheda»** (la scheda del personaggio) e **«Cambia»**
  (per scegliere un altro personaggio);
- una striscia che dice cosa succede: «Tocca a te: cosa fai?», «Azione inviata», «Stavolta non sei chiamato»,
  «Il narratore sta preparando…», «Il narratore sta raccontando…», «Tavolo in pausa»;
- **«Al tavolo»**: le azioni pubbliche degli altri, ancora in attesa, così vi coordinate come al tavolo vero
  («anch'io»). Lì ci sono anche i ritratti dei PNG presenti, da toccare per rivolgersi a loro, e quelli già
  incontrati che sono «Altrove»;
- **«Tiri del turno»**: le carte dei dadi pubbliche dell'ultimo turno;
- la trascrizione di quello che si è detto;
- in fondo, la casella dell'azione, con l'interruttore **«Privata»** e i due pulsanti **«Ritira»** e **«Invia»**.

Nella scheda («La tua scheda») c'è chi è il personaggio e, in evidenza, **«Solo tu lo sai»**: le cose che sa solo
lui. Decide il giocatore se e quando raccontarle agli altri.

In «Regole» il giocatore può fare una domanda sulle regole («Chiedi una regola»): la risposta si vede solo sul
suo telefono e viene solo dai testi delle regole, mai dalla campagna (`docs/regole.md`, §5).

## Passo 4. Il pannello del master

Apri sul Mac il link del pannello stampato dallo script. Parte in modalità «senza spoiler», così chi fa da
master può anche giocare. Tutte le sezioni e i comandi: [Il pannello del master](il-pannello-del-master.md).
Un PNG segnato come nascosto compare al tavolo quando lo riveli dal pannello con **Rivela** (vedi [Creare una campagna](creare-una-campagna.md#png-nascosti)).

## Come va un turno

1. Il narratore legge l'apertura della scena e apre la «finestra delle azioni» per tutti.
2. Chi è chiamato vede «Tocca a te: cosa fai?». Chi non è chiamato può scrivere lo stesso: la sua azione entra,
   ma il turno non lo aspetta.
3. Scrivi cosa fa il tuo personaggio e premi **Invia**. Inviare vuol dire «ho finito»: non c'è un altro pulsante
   da premere dopo. Se non vuoi fare niente, scrivi «Aspetto».
4. Finché la finestra è aperta puoi cambiare idea. Correggi il testo e premi di nuovo: il pulsante ora si chiama
   **Aggiorna**. Oppure premi **Ritira** per togliere l'azione.
5. Quando hanno inviato tutti i chiamati, il turno parte da solo dopo un attimo: 2,5 secondi, per lasciare spazio
   a un «anch'io» o a una correzione. Sul telefono compare «Hanno scritto tutti: si parte…». Ogni invio o ritiro fa
   ripartire l'attesa, e chi sta scrivendo la allunga, al massimo di 8 secondi. Un telefono scollegato non si aspetta.
6. Il narratore risponde. Sul telefono compare «Il narratore sta preparando…», poi «sta raccontando…».
   Intanto puoi già scrivere: la tua azione entra nel turno dopo.
7. Il narratore finisce chiamando uno o più personaggi, e si apre la finestra successiva.

Se nessuno scrive, il gioco aspetta: al ritmo normale non c'è nessuna scadenza. Il master, se vuole, ha
«Risolvi ora». Sul telefono puoi inviare anche con Ctrl+Invio o Cmd+Invio; un'azione è lunga al massimo
500 caratteri.

### Quando la tua azione è «da decidere»

A volte qualcosa tocca la tua azione mentre aspetta. Per esempio:
- un'azione da cui dipendeva la tua è stata ritirata («Ginestra ha ritirato "vado avanti"…»);
- qualcuno è arrivato prima di te sulla stessa cosa («Corrado ha già scritto di prendere la chiave…»);
- nel frattempo la scena è cambiata («Nel frattempo la porta si è chiusa…»).

Il telefono mostra un avviso a tutto schermo, con tre pulsanti:
- **Confermo** (o **Tengo**): la tua azione resta com'è;
- **Cambio**: il testo torna nella casella, da correggere;
- **Ritiro**: togli l'azione.

Al ritmo concitato l'avviso ha un conto alla rovescia: se scade, l'azione resta fuori dal turno.
Gli esempi vengono da `docs/azioni-concorrenti.md`.

### Gli stati della tua azione

| Cosa dice il telefono | Cosa vuol dire |
|---|---|
| in coda | inviata: aspetta che la finestra si chiuda. Puoi ancora cambiarla. |
| da decidere | qualcosa l'ha toccata: scegli Confermo, Cambio o Ritiro. |
| il narratore sta rispondendo | è entrata nel turno che il narratore sta risolvendo. Non si cambia più. |
| risolta | il narratore l'ha risolta. |
| ritirata | l'hai ritirata tu. |
| non è andata | non è stata eseguita: la scena o un'altra azione l'hanno resa impossibile. Il testo torna nella casella: premi **Invia di nuovo** o riscrivila. |
| rimasta fuori | era «da decidere» e il turno è partito senza di lei. Il testo torna nella casella. |

## Il ritmo

Il tavolo ha due ritmi.

- **Calmo** (quello normale): nessuna scadenza. Il gioco aspetta che abbiano inviato tutti i chiamati.
  Potete parlarvi, pianificare, discutere quanto volete.
- **Concitato** (combattimenti, inseguimenti, pericolo imminente): la finestra si chiude da sola 25 secondi
  dopo l'apertura. Non si chiude mentre qualcuno sta scrivendo o deve ancora decidere: allora si allunga, al
  massimo di 8 secondi. Telefoni e proiettore mostrano il conto alla rovescia solo in questo ritmo.

Chi decide il ritmo:
- il narratore, quando la storia lo chiede (scrive una riga di servizio che nessuno sente);
- la scena, se nei suoi dati c'è `ritmo: concitato`;
- il master, con il pulsante del pannello.

Un'azione in coda non fa mai partire un conto alla rovescia: se un giocatore ha già scritto, gli altri non
devono affrettarsi. I tempi vengono da `docs/f0-contratti.md`, «Turno».

## I dadi

Quando la campagna ha le schede dei personaggi, i dadi li tira il programma, non il narratore. Prima un arbitro
decide cosa si tira (per esempio Persuasione, o un tiro per colpire), poi il codice tira, somma e confronta.
Il proiettore mostra una carta per ogni tiro; il telefono mostra la carta della tua azione. Il narratore riceve
l'esito come un fatto e lo racconta.

Tutto il funzionamento: [Dadi e schede](dadi-e-schede.md).

## Le azioni private

Accendi l'interruttore **«Privata»** sotto la casella prima di inviare. Accanto c'è scritto «solo il master la vede».

- Gli altri telefoni non la vedono, nemmeno in «Al tavolo».
- Nel pannello del master compare segnata come «privata». In modalità «senza spoiler» il pannello ne nasconde il
  testo e mostra solo chi l'ha scritta e il suo stato.
- Il narratore non la annuncia al tavolo: a voce dice solo ciò che gli altri possono vedere o sentire.
- L'esito arriva solo sul tuo telefono, come testo. Anche la carta di un tiro privato compare solo lì.
- La voce dell'esito va solo al tuo telefono, e solo se hai acceso «Ascolta qui». Mai al proiettore. Se nessuno
  ascolta su quel telefono, la frase resta solo scritta. Se puoi, usa le cuffie: un telefono che parla al tavolo
  farebbe sentire il segreto ai vicini.

Nelle prove del 9 novembre 2026 il narratore a volte ha raccontato ad alta voce un'azione privata
(`docs/prove.md`, «Aperto»). Le regole del narratore ora lo vietano. Se succede, il master può scrivere una
nota di regia.

## «Ascolta qui»

Sul telefono, in alto, c'è un pulsante tondo con l'altoparlante. È l'interruttore «Ascolta qui».

- Spento, l'altoparlante è barrato: il telefono resta muto.
- Toccalo una volta: il telefono fa sentire la voce del gioco anche lui, oltre al proiettore.
- Acceso, è del colore della candela e pulsa mentre qualcuno parla.
- Toccalo di nuovo per spegnerlo.

Serve un tocco perché il browser del telefono non suona niente da solo. Se l'avevi acceso e ricarichi la pagina,
serve di nuovo un tocco: il pulsante lo dice («Tocca per riascoltare la voce su questo telefono»).

## Se qualcosa va storto durante il gioco

Dal pannello del master:
- **Pausa** ferma il tavolo, lasciando finire la frase in corso; **Riprendi** lo fa ripartire;
- **Ferma la narrazione** zittisce subito narratore e voce e mette il tavolo in pausa.

Se il narratore o la voce restano bloccati senza segni di vita per 60 secondi, un «sorvegliante» riapre da solo
la finestra delle azioni (`docs/f0-contratti.md`, «Turno»). Il gioco non resta mai fermo per sempre: la pausa
la mette e la toglie solo il master.

Altri casi: [Il pannello del master](il-pannello-del-master.md), «Quando un'azione non va», e
[Problemi comuni](problemi-comuni.md).

## A fine serata

1. Se la campagna ha più sessioni, nel pannello premi «Fine sessione»: scrive il registro di quello che è
   successo, la base per preparare la sessione dopo. Vedi [Campagne a più sessioni](campagne-a-piu-sessioni.md).
2. Ferma tutto:

   ```bash
   scripts/arresto.sh
   ```

   Ferma il server (porta 4610), l'eventuale server di sviluppo delle pagine (4612) e il servizio voce (4611).

3. Se vuoi, guarda quanto hai speso:

   ```bash
   scripts/costi.sh
   ```

   Mostra il costo delle ultime 10 sessioni, Haiku e voce separati. Vedi [Voce e costi](voce-e-costi.md).

La partita si salva da sola, a ogni turno. Per riprenderla un'altra sera, rilancia lo stesso comando senza
`--nuova` (per esempio `scripts/partita.sh nozze-neve`). Lo script dice «Riprende la partita salvata dal turno N»;
sul proiettore premi di nuovo «Inizia sessione», e i telefoni ritrovano il loro personaggio.

## Dove sono i log

Lo script li elenca in testa:
- `logs/partita.out`: questo avvio;
- `logs/server.out`: il log del server, leggibile;
- `logs/server.jsonl`: lo stesso log, strutturato;
- `logs/voce.out`: il servizio voce locale.

Vuoi provare qualcosa mentre una partita è in corso, senza toccarla? C'è l'istanza di prova su un'altra porta:
vedi [Sviluppo](sviluppo.md).

## Problemi?

Vai a [Problemi comuni](problemi-comuni.md).

# Richieste di Riccardo dopo la prova del 9 novembre 2026

Testo originale, così com'è arrivato. Le decisioni di progetto prese per ciascun punto sono in fondo.

## Miglioramenti necessari al gameplay e all'interfaccia

### 1. Gestione dei tempi e del ritmo di gioco
Il gioco attualmente procede troppo velocemente e non lascia abbastanza spazio ai giocatori per interagire tra loro.
- Il sistema deve attendere che almeno un giocatore invii un messaggio prima di procedere con la gestione del turno.
- Evitare timer troppo brevi e scadenze automatiche che costringano i giocatori a rispondere rapidamente se non necessario per trama.
- In condizioni normali, non deve esserci un tempo massimo per rispondere: i giocatori devono poter discutere liberamente tra loro, pianificare le azioni e confrontarsi.
- I timer devono essere utilizzati soltanto in situazioni realmente frenetiche, quando la narrazione lo richiede (combattimenti concitati, inseguimenti, situazioni di pericolo imminente, ecc.).
- Rivedere complessivamente la gestione dei timer, rendendola più flessibile e coerente con il contesto narrativo.

### 2. Visualizzazione dei personaggi presenti nella scena
Quando sono presenti personaggi non giocanti (NPC), deve essere possibile identificarli visivamente.
- Mostrare, sopra o in prossimità dell'immagine principale della scena, i ritratti dei personaggi attualmente presenti.
- Ogni ritratto deve permettere di capire immediatamente con chi è possibile interagire.
- Distinguere chiaramente i personaggi presenti fisicamente nella scena da quelli che non vi partecipano.
- L'obiettivo è dare ai giocatori una rappresentazione visiva immediata di chi si trova nell'ambiente e con chi possono parlare o interagire.

### 3. Gestione delle pause automatiche
Il gioco entra correttamente in pausa quando deve elaborare informazioni, caricare contenuti o preparare sviluppi narrativi, ma il problema è che successivamente non riprende autonomamente.
- La pausa automatica durante le fasi di elaborazione è corretta e può essere mantenuta.
- Una volta terminata l'elaborazione, il gioco deve riprendere automaticamente.
- Non deve mai rimanere bloccato indefinitamente nello stato di pausa.
- Gestire correttamente la transizione tra pausa, elaborazione e ripresa del gioco.

### 4. Libertà d'azione e sistema di prove caratteristiche
Attualmente il gioco è troppo rigido e tende a decidere arbitrariamente se un'azione riesce o fallisce, senza utilizzare un vero sistema di prove.
Il giocatore deve avere la sensazione di poter tentare qualsiasi azione, senza essere limitato da risposte predefinite o da binari narrativi troppo rigidi.
Per esempio:
- Se provo a colpire un personaggio con una balestra, il gioco deve gestire un tiro per colpire.
- Se provo a convincere un personaggio, deve essere prevista una prova adeguata, ad esempio Persuasione.
- Se tento un'azione che richiede una prova caratteristica, il sistema deve mostrare chiaramente: quale caratteristica o abilità viene utilizzata; il dado lanciato e il risultato ottenuto; il modificatore applicato; la classe difficoltà (CD) da superare; se la prova è riuscita oppure fallita.
L'esito deve dipendere realmente dal risultato del tiro e dalla difficoltà dell'azione, non da una decisione arbitraria del narratore.
È fondamentale che il giocatore possa proporre liberamente le proprie azioni e che il gioco ne valuti la fattibilità attraverso le meccaniche previste, anziché rispondere semplicemente «non ci sei riuscito» oppure «ci sei riuscito» senza mostrare alcun calcolo.

### 5. Gestione dei messaggi in coda e dei turni
Quando è il turno di un giocatore specifico, gli altri devono poter continuare a scrivere e mettere in coda i propri messaggi. Questa funzionalità è corretta e deve essere mantenuta, ma bisogna correggere un comportamento:
- Quando un giocatore inserisce un messaggio in coda, non deve partire automaticamente un timer per il giocatore che sta svolgendo il proprio turno.
- Il fatto che un giocatore abbia già preparato un'azione non significa che gli altri debbano accelerare le proprie decisioni.
- Ogni giocatore deve avere il tempo necessario per pensare e formulare la propria azione.
- I timer devono essere indipendenti dalla semplice presenza di messaggi in coda e attivarsi soltanto quando giustificati dalla situazione di gioco.

### 6. Funzionalità Text-to-Speech
Attualmente nell'applicazione manca completamente una funzionalità Text-to-Speech.
Implementare una funzione che permetta di ascoltare i testi del gioco attraverso la sintesi vocale, in particolare i contenuti narrativi e i dialoghi.

### 7. Semplificazione dei pulsanti e delle interazioni
L'attuale sistema di invio dei messaggi è inutilmente complicato. Attualmente bisogna inviare un messaggio e successivamente premere anche il pulsante «Pronto». Questo passaggio aggiuntivo non ha senso e deve essere eliminato.
- **Invia:** invia il messaggio o l'azione del giocatore. L'invio deve essere sufficiente per comunicare al sistema che il giocatore ha terminato di formulare la propria azione.
- **Ritira:** permette di ritirare un messaggio precedentemente inviato o messo in coda, quando consentito.
Questi devono essere gli unici due pulsanti necessari per la gestione delle azioni dei giocatori. Eliminare il pulsante «Pronto» e tutte le logiche che obbligano il giocatore a confermare separatamente un messaggio già inviato. Il sistema deve gestire automaticamente lo stato del turno, senza richiedere ulteriori conferme.

**Obiettivo generale:** rendere il gioco più fluido, meno frenetico e meno vincolato, restituendo ai giocatori libertà di interazione e di azione. Il sistema deve gestire autonomamente tempi, pause, turni e meccaniche di gioco, senza costringere i giocatori a combattere con l'interfaccia invece di concentrarsi sulla partita.

---

## Decisioni di progetto (orchestratore, 9 novembre 2026)
- **Turno senza scadenza (1, 5, 7).** Inviare = pronto. Il turno si risolve quando hanno inviato tutti i PG invitati (con `tutti`: tutti i PG con un telefono collegato), dopo una breve attesa di assestamento (2–3 s, per un «anch'io» o una correzione). Nessuna scadenza in condizioni normali: al tavolo la pressione è sociale, e il proiettore mostra «Aspettiamo: Paolo, Giulia». Il master ha «Risolvi ora». Un telefono scollegato non si aspetta. Niente mosse contro lo stallo né pausa automatica per inattività: se nessuno scrive, il gioco aspetta.
- **Ritmo concitato (1).** Il conto alla rovescia esiste solo quando la narrazione lo chiede (combattimento, inseguimento, pericolo imminente): lo dichiara il narratore (riga di protocollo non letta) o la scena/orologio nei dati; il Motore lo applica con una durata ragionevole e lo toglie quando la situazione si calma. I messaggi in coda non fanno mai partire un conto alla rovescia.
- **Pause (3).** Durante l'elaborazione i telefoni dicono che il narratore sta preparando, e le azioni si possono scrivere e accodare; finita l'elaborazione il turno riparte da solo. Un sorvegliante riprende il gioco se uno stato di attesa dura oltre il previsto senza un lavoro attivo (errore del modello, voce bloccata): mai una pausa infinita. Solo il master mette e toglie la pausa a mano.
- **Prove e tiri (4).** Regole SRD 5.2. Il Motore tira i dadi (non il modello): un arbitro veloce con output strutturato decide per ogni azione se serve una prova, quale caratteristica/abilità, la CD (dai dati quando ci sono, altrimenti 5/10/15/20/25/30), vantaggio/svantaggio, o un tiro per colpire contro la CA con il danno. Proiettore e telefono mostrano abilità, dado, modificatore, totale, CD ed esito; il narratore riceve l'esito come fatto e lo racconta. Niente tiro per le azioni banali o impossibili. PG e PNG hanno schede numeriche (caratteristiche, competenze, CA, PF, attacchi), generate dalla skill e controllate dal validatore.
- **Voce (6).** fish-audio/drama-3 via OpenRouter con direzioni espressive, come voce del gioco (la voce locale resta come riserva). Il proiettore la suona; ogni telefono può attivare «Ascolta qui».
- **Ritratti (2).** Sul proiettore una fila di ritratti dei PNG presenti nella scena, con chi parla in evidenza; sul telefono «Qui con voi» e «Altrove» (i PNG già incontrati). La presenza viene dai dati della scena e dagli ingressi/uscite che il Motore registra; il master la può correggere.

---

## Aggiunte della sera (9 novembre 2026)

### 8. Il proprio manuale di regole
«Vorrei anche che aggiungesse la possibilità di mettere nella cartella di Workspace il proprio manuale e vorrei che la gente capisse le regole. Quando crea la campagna, si crea anche il suo set di regole le usasse di volta in volta. Deve essere caricato il manuale facoltativo sulle regole ovviamente. Una volta che c'è tutto fai dei test end to end, anche su coerenza di gioco e fluidità.»
- Decisioni: cartella `manuali/` fuori da git; set di regole per campagna in `campagne/<id>/regole/` (strutturato, riassunto per i giocatori, estratti consultabili); senza manuale SRD 5.2; motore delle prove generalizzato (d20 contro CD, 2d6 a fasce, tiro sotto soglia); scheda «Regole» e «Chiedi una regola» sul telefono. Progetto in docs/regole.md.

### 9. Sessioni: riassunto e chiusura
«I giochi generalmente sono su più sessioni, quindi devi anche gestire le sessioni; dato che abbiamo le trascrizioni sarebbe carino avere un riassunto che spiega cosa è accaduto prima e che ogni fine sessione abbia una fine lineare.»
- Decisioni: a ogni sessione che continua (pacchetto successivo o partita ripresa un'altra sera) il narratore apre con «la volta scorsa…», scritto dai fatti pubblici del registro e della trascrizione, mai dalle azioni private né dai segreti; un «Diario» sul telefono con il riassunto di ogni sessione; la chiusura è guidata: il Motore conosce la durata prevista (`ore_per_sessione`), avvisa il master quando manca poco e porta il narratore verso una pausa naturale; «Chiudi la sessione» fa dire al narratore una chiusura vera (immagine finale, un aggancio per la prossima volta), poi lo schermo mostra «Cosa è successo stasera» e si scrive il registro.

### 10. Un «lettore» scemo e veloce, l'intelligenza a Claude Code
«Si può usare un modello locale molto veloce come "lettore"? Haiku non funziona troppo bene, ma cambiare modello con uno più costoso costa troppo. In ogni caso delega più a Claude Code ma lascia sempre un modello scemo come "lettore", fai qualche test.»
- Decisioni: il modello dal vivo fa solo il lettore (annunci, scelta delle battute dal catalogo, raccordi brevi); tutto ciò che richiede giudizio si prepara prima o in sottofondo con Claude Code (abbonamento): repertorio più ricco prima della sessione e, durante la partita, uno «sceneggiatore» che mentre i giocatori discutono scrive le battute dei prossimi turni a partire dallo stato, validate e caricate dal Motore. Prima si misurano i modelli locali (MLX su M1 16 GB) contro Haiku sugli stessi turni veri (esperimenti/lettore-locale/); poi si decide.

### 11. Nessuna chiave obbligatoria, configurazione automatica (obiettivo finale)
«Ancora richiede la chiave di OpenRouter, ma questa non serve più perché adesso c'è da scaricare un modello. In ogni caso vorrei che niente sia necessario… automaticamente deve capire quale modello di lettura veloce fare, quale modello di immagine utilizzare, e che ci sia una fase di configurazione di questo framework che, dando al proprio Claude Code la pagina GitHub, segua tutto quanto e configuri la cosa migliore per ogni setup di computer, anche offrendo chiavi di API esterne, quindi che sia più modulare possibile. Chiunque prenda il link della repository e lo incolli sul suo Claude Code possa utilizzarlo. Se c'è un utente che vuole smanettare di più, si possono mettere chiavi per avere risultati migliori. Di base chiunque può copiare e incollare il link e giocare: questo è l'obiettivo finale.»
- Nota: la chiave OpenRouter serve alla voce drama-3, non al lettore; diventa facoltativa con una voce locale di base (Qwen3-TTS su Mac, un'alternativa leggera altrove). Decisioni in docs/da-fare.md («Obiettivo finale»).

### 12. Independent of the language (10 November 2026)
«Cantastorie non va bene: deve essere indipendente dalla lingua, quindi il nome e la documentazione devono essere in inglese. Ovviamente la lingua si sceglie in fase di configurazione.» On the name: «un nome più brutto ma più facile da trovare su Google o GitHub».
- Decisions: the project is now **Tabletop AI Game Master** (GitHub: RiccardoDominici/tabletop-ai-game-master, with topics ttrpg, dnd, game-master…). Documentation in English. The game language is a configuration choice (UI strings, prompts, prose rules of the validator, voices, campaign content). Internal code identifiers stay Italian for now and are translated in a separate phase (Riccardo's choice).

# Ricerca: azioni simultanee di più giocatori

Raccolta il 2 novembre 2026 da un agente di ricerca (solo lettura). [OPENED] = pagina letta; [SNIPPET] = solo testo
del risultato di ricerca, o lettura fallita.

## 1. Giochi a turni simultanei
- WEGO: gli ordini si danno alla cieca e valgono per tutto il turno; «nessuno ha l'ultima parola». [OPENED] https://linesofbattle.net/simultaneous-turns
- Frozen Synapse: pianificazione libera, poi gli ordini di entrambi si eseguono insieme, a passi di 5 s. [OPENED] https://spacebiff.com/2020/04/13/frozen-synapse/
- Diplomacy: ordini rivelati insieme (regola 11); forze pari rimbalzano e nessuno avanza (regola 15); attaccare chi sostiene ne taglia il sostegno (regola 19). [OPENED] https://www.playdiplomacy.com/help.php?sub_page=Game_Rules
- TidyMaze/ab-alone #13 (chiusa il 23/10/2026): scartato «i conflitti annullano entrambe le mosse»; adottato un ordine a rotazione in cui ogni mossa si riconvalida al suo turno e «si spegne» se non è più lecita. Nessun invio = fermo. Finestra di 15 s. [OPENED] https://github.com/TidyMaze/ab-alone/issues/13

## 2. Gioco via post e tavoli virtuali
- Linee guida Dicehaven: scrivere le intenzioni con dei «se/allora»; dopo due giorni lavorativi il master fa andare avanti il personaggio; retcon ammessi. [OPENED] https://dicehaven.com/play-by-post/guidelines/
- Modulo SCS di Foundry: nasconde i pulsanti di turno; il README non spiega come si risolvono le azioni simultanee. [OPENED] https://github.com/arcanistzed/scs
- Forum GiantITP: i giocatori scrivono le intenzioni in qualsiasi ordine, il master riassume; le interruzioni costringono a fermarsi o a retcon. [SNIPPET] https://forums.giantitp.com/showthread.php?721414-Play-by-Post-Best-Practices=&p=26462909
- Roll20 Turn Tracker: manuale, senza modalità simultanea. [SNIPPET] https://help.roll20.net/hc/en-us/articles/360039178634-Turn-Tracker

## 3. Master IA multigiocatore e turni con LLM
- Friends & Fables: dalle recensioni risponde a più giocatori in modalità narrativa; nessun dettaglio su raggruppamento e ordine. [SNIPPET] https://dreamgen.com/blog/articles/friends-and-fables-review
- AI Dungeon multigiocatore: ogni azione riceve la sua risposta; uno scenario della comunità impone turni a giro. [SNIPPET] https://play.aidungeon.com/scenario/79aqp-ustXhm/multiplayer-guidepublished
- MMAgents (Frontiers 2025): parla l'agente con il punteggio di importanza più alto; uno ha monopolizzato i turni 4–7; rivolgere domande a qualcuno e l'autoselezione hanno ridotto i blocchi (p<0,001). [OPENED] https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1582287/full
- Time to Talk (EMNLP 2025 Findings): generatore di contenuto separato dal decisore del momento in cui parlare. [OPENED, abstract] https://arxiv.org/abs/2506.05309
- Concordia (arXiv 2507.08892): motore simultaneo, «ogni attore fa esattamente un'azione per passo». [OPENED] https://arxiv.org/html/2507.08892
- Vercel chat #414: il debounce semplice manda solo l'ultimo messaggio; la modalità `burst` aspetta il silenzio e tratta la raffica come un tutt'uno (~1 s in più). [OPENED] https://github.com/vercel/chat/issues/414

## 4. Avvisi di input superato
- HTTP 412 (blocco ottimistico): una scrittura vecchia rifiutata deve «avvisare l'utente di ricominciare» o mostrare le due versioni. [OPENED] https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests
- Wagtail RFC 095: avviso non bloccante «ha salvato una nuova versione»; conferma prima di perdere modifiche. [OPENED] https://github.com/wagtail/rfcs/blob/2d29384f4b8c3e8a6138764482c42cce2d15355e/text/095-concurrent-editing-notifications.md
- Testi per i conflitti di sincronizzazione: «Entrambe le versioni sono salvate. Guardale e scegli cosa tenere»; evitare «Conflitto rilevato»; tenere «in attesa» distinto da «serve una decisione». [OPENED] https://vburojevic.dev/blog/sync-conflict-ui-user-trust/
- craig-stars #815: se gli ultimi due giocatori inviano insieme, il turno non partiva; la correzione è un solo lucchetto attorno a invio e risoluzione. [SNIPPET] https://github.com/sirgwain/craig-stars/pull/815

## Raccomandazioni dell'agente (le scelte prese sono in `docs/azioni-concorrenti.md`)
1. Ogni azione porta la versione della scena su cui è stata scritta; le vecchie vanno confermate (Confermo / Riscrivo / Ritiro).
2. Nascondere il contenuto fino alla chiusura (WEGO). → **Non adottato**: al tavolo dal vivo ci si parla, e «anch'io» richiede di vedere.
3. Arco di dipendenza per «anch'io»; se l'azione di riferimento cambia, avvisare l'autore; niente cascate silenziose.
4. Chiave contesa: vince chi scrive prima; chi perde riceve subito l'avviso con il nome di chi ha vinto; pareggi a rotazione.
5. Riconvalidare ogni azione al momento della risoluzione; quelle non più possibili «si spengono».
6. Nessun invio = fermo: il master non inventa l'azione di un giocatore.
7. Chiusura atomica della finestra.
8. Raggruppare le raffiche prima della risposta, con un tetto all'attesa.
9. Un'azione per giocatore per finestra; il master nomina chi deve rispondere.
10. Stati distinti per «in attesa» e «da decidere»; mai buttare il testo scritto.

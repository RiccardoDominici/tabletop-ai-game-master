# Riccardo's requests after the 9 November 2026 trial run

Original text, exactly as it arrived. The project decisions taken for each point are at the end.

## Necessary improvements to gameplay and interface

### 1. Pacing and rhythm of play
Il gioco attualmente procede troppo velocemente e non lascia abbastanza spazio ai giocatori per interagire tra loro.
- Il sistema deve attendere che almeno un giocatore invii un messaggio prima di procedere con la gestione del turno.
- Evitare timer troppo brevi e scadenze automatiche che costringano i giocatori a rispondere rapidamente se non necessario per trama.
- In condizioni normali, non deve esserci un tempo massimo per rispondere: i giocatori devono poter discutere liberamente tra loro, pianificare le azioni e confrontarsi.
- I timer devono essere utilizzati soltanto in situazioni realmente frenetiche, quando la narrazione lo richiede (combattimenti concitati, inseguimenti, situazioni di pericolo imminente, ecc.).
- Rivedere complessivamente la gestione dei timer, rendendola più flessibile e coerente con il contesto narrativo.

> *English: The game currently moves too fast and does not leave players enough room to interact with each other.*
> *- The system must wait for at least one player to send a message before proceeding with the management of the turn.*
> *- Avoid timers that are too short and automatic deadlines that force players to respond quickly when this is not necessary for the plot.*
> *- In normal conditions there must be no maximum time to respond: players must be able to discuss freely among themselves, plan actions and compare notes.*
> *- Timers must be used only in genuinely frantic situations, when the narration calls for it (heated combat, chases, situations of imminent danger, etc.).*
> *- Review the management of timers as a whole, making it more flexible and consistent with the narrative context.*

### 2. Display of the characters present in the scene
Quando sono presenti personaggi non giocanti (NPC), deve essere possibile identificarli visivamente.
- Mostrare, sopra o in prossimità dell'immagine principale della scena, i ritratti dei personaggi attualmente presenti.
- Ogni ritratto deve permettere di capire immediatamente con chi è possibile interagire.
- Distinguere chiaramente i personaggi presenti fisicamente nella scena da quelli che non vi partecipano.
- L'obiettivo è dare ai giocatori una rappresentazione visiva immediata di chi si trova nell'ambiente e con chi possono parlare o interagire.

> *English: When non-player characters (NPCs) are present, it must be possible to identify them visually.*
> *- Show, above or near the main scene image, the portraits of the characters currently present.*
> *- Each portrait must make it immediately clear who can be interacted with.*
> *- Clearly distinguish the characters physically present in the scene from those who are not taking part in it.*
> *- The goal is to give players an immediate visual representation of who is in the environment and with whom they can talk or interact.*

### 3. Management of automatic pauses
Il gioco entra correttamente in pausa quando deve elaborare informazioni, caricare contenuti o preparare sviluppi narrativi, ma il problema è che successivamente non riprende autonomamente.
- La pausa automatica durante le fasi di elaborazione è corretta e può essere mantenuta.
- Una volta terminata l'elaborazione, il gioco deve riprendere automaticamente.
- Non deve mai rimanere bloccato indefinitamente nello stato di pausa.
- Gestire correttamente la transizione tra pausa, elaborazione e ripresa del gioco.

> *English: The game correctly pauses when it has to process information, load content or prepare narrative developments, but the problem is that afterwards it does not resume on its own.*
> *- The automatic pause during the processing phases is correct and can be kept.*
> *- Once processing has finished, the game must resume automatically.*
> *- It must never remain stuck indefinitely in the paused state.*
> *- Handle correctly the transition between pause, processing and resumption of the game.*

### 4. Freedom of action and ability-check system
Attualmente il gioco è troppo rigido e tende a decidere arbitrariamente se un'azione riesce o fallisce, senza utilizzare un vero sistema di prove.
Il giocatore deve avere la sensazione di poter tentare qualsiasi azione, senza essere limitato da risposte predefinite o da binari narrativi troppo rigidi.
Per esempio:
- Se provo a colpire un personaggio con una balestra, il gioco deve gestire un tiro per colpire.
- Se provo a convincere un personaggio, deve essere prevista una prova adeguata, ad esempio Persuasione.
- Se tento un'azione che richiede una prova caratteristica, il sistema deve mostrare chiaramente: quale caratteristica o abilità viene utilizzata; il dado lanciato e il risultato ottenuto; il modificatore applicato; la classe difficoltà (CD) da superare; se la prova è riuscita oppure fallita.
L'esito deve dipendere realmente dal risultato del tiro e dalla difficoltà dell'azione, non da una decisione arbitraria del narratore.
È fondamentale che il giocatore possa proporre liberamente le proprie azioni e che il gioco ne valuti la fattibilità attraverso le meccaniche previste, anziché rispondere semplicemente «non ci sei riuscito» oppure «ci sei riuscito» senza mostrare alcun calcolo.

> *English: Currently the game is too rigid and tends to decide arbitrarily whether an action succeeds or fails, without using a real system of checks. The player must have the feeling of being able to attempt any action, without being limited by predefined answers or by overly rigid narrative tracks.*
> *For example:*
> *- If I try to hit a character with a crossbow, the game must handle an attack roll.*
> *- If I try to persuade a character, an appropriate check must be provided, for example Persuasion.*
> *- If I attempt an action that requires an ability check, the system must clearly show: which ability or skill is used; the die rolled and the result obtained; the modifier applied; the difficulty class (DC) to beat; whether the check succeeded or failed.*
> *The outcome must really depend on the result of the roll and on the difficulty of the action, not on an arbitrary decision by the narrator. It is essential that the player can freely propose their own actions and that the game assesses their feasibility through the planned mechanics, rather than simply answering "you didn't manage it" or "you managed it" without showing any calculation.*

### 5. Handling of queued messages and turns
Quando è il turno di un giocatore specifico, gli altri devono poter continuare a scrivere e mettere in coda i propri messaggi. Questa funzionalità è corretta e deve essere mantenuta, ma bisogna correggere un comportamento:
- Quando un giocatore inserisce un messaggio in coda, non deve partire automaticamente un timer per il giocatore che sta svolgendo il proprio turno.
- Il fatto che un giocatore abbia già preparato un'azione non significa che gli altri debbano accelerare le proprie decisioni.
- Ogni giocatore deve avere il tempo necessario per pensare e formulare la propria azione.
- I timer devono essere indipendenti dalla semplice presenza di messaggi in coda e attivarsi soltanto quando giustificati dalla situazione di gioco.

> *English: When it is a specific player's turn, the others must be able to keep writing and queue their own messages. This feature is correct and must be kept, but one behaviour must be corrected:*
> *- When a player queues a message, no automatic timer must start for the player who is taking their turn.*
> *- The fact that a player has already prepared an action does not mean the others must speed up their decisions.*
> *- Each player must have the time needed to think and formulate their own action.*
> *- Timers must be independent of the mere presence of queued messages, and must trigger only when justified by the game situation.*

### 6. Text-to-Speech feature
Attualmente nell'applicazione manca completamente una funzionalità Text-to-Speech.
Implementare una funzione che permetta di ascoltare i testi del gioco attraverso la sintesi vocale, in particolare i contenuti narrativi e i dialoghi.

> *English: Currently the application completely lacks a Text-to-Speech feature. Implement a function that lets players listen to the game's texts through speech synthesis, in particular the narrative content and the dialogues.*

### 7. Simplification of buttons and interactions
L'attuale sistema di invio dei messaggi è inutilmente complicato. Attualmente bisogna inviare un messaggio e successivamente premere anche il pulsante «Pronto». Questo passaggio aggiuntivo non ha senso e deve essere eliminato.
- **Invia:** invia il messaggio o l'azione del giocatore. L'invio deve essere sufficiente per comunicare al sistema che il giocatore ha terminato di formulare la propria azione.
- **Ritira:** permette di ritirare un messaggio precedentemente inviato o messo in coda, quando consentito.
Questi devono essere gli unici due pulsanti necessari per la gestione delle azioni dei giocatori. Eliminare il pulsante «Pronto» e tutte le logiche che obbligano il giocatore a confermare separatamente un messaggio già inviato. Il sistema deve gestire automaticamente lo stato del turno, senza richiedere ulteriori conferme.

> *English: The current message-sending system is needlessly complicated. Currently you have to send a message and then also press the «Pronto» (Ready) button. This extra step makes no sense and must be removed.*
> *- Invia (Send): sends the player's message or action. Sending must be enough to tell the system that the player has finished formulating their action.*
> *- Ritira (Withdraw): allows withdrawing a message previously sent or queued, when permitted.*
> *These must be the only two buttons needed to manage the players' actions. Remove the «Pronto» (Ready) button and all the logic that forces the player to confirm separately a message already sent. The system must manage the state of the turn automatically, without requiring further confirmations.*

**Obiettivo generale:** rendere il gioco più fluido, meno frenetico e meno vincolato, restituendo ai giocatori libertà di interazione e di azione. Il sistema deve gestire autonomamente tempi, pause, turni e meccaniche di gioco, senza costringere i giocatori a combattere con l'interfaccia invece di concentrarsi sulla partita.

> *English: General goal: make the game smoother, less frantic and less constrained, giving players back freedom of interaction and action. The system must manage timing, pauses, turns and game mechanics on its own, without forcing players to struggle with the interface instead of focusing on the game.*

---

## Project decisions (orchestrator, 9 November 2026)
- **Turn without deadline (1, 5, 7).** Sending = ready. The turn is resolved when all the invited PCs have sent (with `tutti`: all the PCs with a connected phone), after a short settling wait (2–3 s, for an «anch'io» (me too) or a correction). No deadline in normal conditions: at the table the pressure is social, and the projector shows «Aspettiamo: Paolo, Giulia» (Waiting for: Paolo, Giulia). The Game Master has «Risolvi ora» (Resolve now). A disconnected phone is not waited for. No measures against stalling and no automatic pause for inactivity: if nobody writes, the game waits.
- **Frantic pace (1).** The countdown exists only when the narration calls for it (combat, chase, imminent danger): the narrator declares it (a protocol line that is not read aloud), or the scene/clock in the data; the Engine applies it with a reasonable duration and removes it when the situation calms down. Queued messages never start a countdown.
- **Pauses (3).** During processing, the phones say that the narrator is preparing, and actions can still be written and queued; once processing ends, the turn restarts on its own. A watchdog resumes the game if a waiting state lasts beyond the expected time without active work (model error, voice blocked): never an endless pause. Only the Game Master sets and removes the pause by hand.
- **Checks and rolls (4).** SRD 5.2 rules. The Engine rolls the dice (not the model): a fast arbiter with structured output decides for each action whether a check is needed, which ability/skill, the DC (from the data when present, otherwise 5/10/15/20/25/30), advantage/disadvantage, or an attack roll against AC with damage. The projector and the phone show ability, die, modifier, total, DC and outcome; the narrator receives the outcome as a fact and narrates it. No roll for trivial or impossible actions. PCs and NPCs have numeric sheets (abilities, proficiencies, AC, HP, attacks), generated by the skill and checked by the validator.
- **Voice (6).** fish-audio/drama-3 via OpenRouter with expressive directions, as the game's voice (the local voice remains as a fallback). The projector plays it; each phone can activate «Ascolta qui» (Listen here).
- **Portraits (2).** On the projector, a row of portraits of the NPCs present in the scene, with whoever is speaking highlighted; on the phone, «Qui con voi» (With you here) and «Altrove» (Elsewhere) (the NPCs already met). Presence comes from the scene data and from the entries and exits the Engine records; the Game Master can correct it.

---

## Additions from the evening (9 November 2026)

### 8. Your own rulebook
«Vorrei anche che aggiungesse la possibilità di mettere nella cartella di Workspace il proprio manuale e vorrei che la gente capisse le regole. Quando crea la campagna, si crea anche il suo set di regole le usasse di volta in volta. Deve essere caricato il manuale facoltativo sulle regole ovviamente. Una volta che c'è tutto fai dei test end to end, anche su coerenza di gioco e fluidità.»

> *English: "I would also like it to add the possibility of putting one's own manual in the Workspace folder, and I would like people to understand the rules. When the campaign is created, its rule set is created too, and it uses it from time to time. The optional manual on the rules must obviously be uploadable. Once everything is there, do end-to-end tests, including on game consistency and fluidity."*

- Decisions: folder `manuali/` outside git; a rule set per campaign in `campagne/<id>/regole/` (structured, summarized for the players, searchable extracts); without a manual: SRD 5.2; a generalized checks engine (d20 against DC, 2d6 in bands, roll under a threshold); a «Regole» (Rules) sheet and «Chiedi una regola» (Ask a rule) on the phone. Design in docs/regole.md.

### 9. Sessions: recap and closing
«I giochi generalmente sono su più sessioni, quindi devi anche gestire le sessioni; dato che abbiamo le trascrizioni sarebbe carino avere un riassunto che spiega cosa è accaduto prima e che ogni fine sessione abbia una fine lineare.»

> *English: "Games are generally spread over several sessions, so you also have to manage the sessions. Since we have the transcripts, it would be nice to have a recap that explains what happened before, and for every session to have a linear ending."*

- Decisions: at every session that continues (the next package, or a game resumed another evening), the narrator opens with «la volta scorsa…» («last time…»), written from the public facts of the log and the transcript, never from private actions or secrets; a «Diario» (Diary) on the phone with the recap of each session; the closing is guided: the Engine knows the planned duration (`ore_per_sessione`), warns the Game Master when little time is left, and steers the narrator toward a natural pause; «Chiudi la sessione» (Close the session) makes the narrator deliver a real closing (final image, a hook for next time), then the screen shows «Cosa è successo stasera» (What happened tonight) and the log is written.

### 10. A dumb and fast «reader», the intelligence in Claude Code
«Si può usare un modello locale molto veloce come "lettore"? Haiku non funziona troppo bene, ma cambiare modello con uno più costoso costa troppo. In ogni caso delega più a Claude Code ma lascia sempre un modello scemo come "lettore", fai qualche test.»

> *English: "Can a very fast local model be used as the "reader"? Haiku does not work too well, but switching to a more expensive model costs too much. In any case, delegate more to Claude Code, but always leave a dumb model as the "reader", and run a few tests."*

- Decisions: the live model only acts as the reader (announcements, choosing lines from the catalogue, short bridges); everything that requires judgment is prepared beforehand or in the background with Claude Code (subscription): a richer repertoire before the session and, during the game, a «sceneggiatore» (scriptwriter) that, while the players discuss, writes the lines of the next turns starting from the state, validated and loaded by the Engine. First the local models (MLX on M1 16 GB) are measured against Haiku on the same real turns (esperimenti/lettore-locale/); then a decision is made.

### 11. No mandatory keys, automatic setup (final goal)
«Ancora richiede la chiave di OpenRouter, ma questa non serve più perché adesso c'è da scaricare un modello. In ogni caso vorrei che niente sia necessario… automaticamente deve capire quale modello di lettura veloce fare, quale modello di immagine utilizzare, e che ci sia una fase di configurazione di questo framework che, dando al proprio Claude Code la pagina GitHub, segua tutto quanto e configuri la cosa migliore per ogni setup di computer, anche offrendo chiavi di API esterne, quindi che sia più modulare possibile. Chiunque prenda il link della repository e lo incolli sul suo Claude Code possa utilizzarlo. Se c'è un utente che vuole smanettare di più, si possono mettere chiavi per avere risultati migliori. Di base chiunque può copiare e incollare il link e giocare: questo è l'obiettivo finale.»

> *English: "It still asks for the OpenRouter key, but that is no longer needed, because now a model has to be downloaded. In any case I would like nothing to be necessary… automatically it must work out which fast reading model to use and which image model to use, and there must be a configuration phase for this framework which, given the GitHub page to one's own Claude Code, follows everything and configures the best option for each computer setup, also offering external API keys, so that it is as modular as possible. Anyone who takes the repository link and pastes it into their own Claude Code must be able to use it. If a user wants to tinker more, keys can be added to get better results. By default anyone can copy and paste the link and play: this is the final goal."*

- Note: the OpenRouter key is needed for the drama-3 voice, not for the reader; it becomes optional with a basic local voice (Qwen3-TTS on Mac, a light alternative elsewhere). Decisions in docs/da-fare.md («Obiettivo finale» (Final goal)).

### 12. Independent of the language (10 November 2026)
Note: the owner wrote the old project name in this sentence; it is written here as "[The old name]" so that the old name no longer appears in the documentation.
«[Il vecchio nome] non va bene: deve essere indipendente dalla lingua, quindi il nome e la documentazione devono essere in inglese. Ovviamente la lingua si sceglie in fase di configurazione.» On the name: «un nome più brutto ma più facile da trovare su Google o GitHub».

> *English: "[The old name] is not good: it must be independent of the language, so the name and the documentation must be in English. Obviously the language is chosen during setup." On the name: "a uglier name but easier to find on Google or GitHub".*

- Decisions: the project is now **Tabletop AI Game Master** (GitHub: RiccardoDominici/tabletop-ai-game-master, with topics ttrpg, dnd, game-master…). Documentation in English. The game language is a configuration choice (UI strings, prompts, prose rules of the validator, voices, campaign content). Internal code identifiers stay Italian for now and are translated in a separate phase (Riccardo's choice).

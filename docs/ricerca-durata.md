# Ricerca: come scalare la preparazione con la durata della campagna

Data: 3 novembre 2026. Autore: agente di ricerca (sola lettura sul codice, un solo file scritto).

## Legenda delle fonti

- [OPENED]: pagina letta davvero (con fetch). Nota: per arXiv è stato letto solo l'abstract.
- [SNIPPET]: risultato di ricerca. Non ho aperto la pagina. Il testo può essere incompleto.

Secondo tentativo (3 novembre 2026): WebFetch e curl danno errore di risoluzione DNS (ENOTFOUND,
curl exit 6) per slyflourish.com, thealexandrian.net, bladesinthedark.com, dungeonworldsrd.com e
help.fables.gg. Arxiv invece risponde. Quelle fonti restano [SNIPPET]. Non ho potuto leggere Sly
Flourish, Alexandrian, Blades in the Dark, Dungeon World e Friends & Fables. Serve una verifica da
una rete che risolva quei domini prima di citarli in un documento pubblico.

Non ho trovato contenuti utili su Angry GM e Matt Colville. Le ricerche hanno restituito solo
commenti di terzi o video che non ho potuto leggere.

---

## Sintesi in dieci punti

1. Il manuale 2024 dà già una struttura per campagne lunghe. Chiede di preparare tre conflitti maggiori
   in anticipo. Usa i livelli 5, 11 e 17 come milestone di tier. [OPENED, D&D Beyond]
2. Sly Flourish stima 30–60 minuti di preparazione per una sessione di tre ore. Dice anche: «prepare
   only what most benefits your game». [SNIPPET]
3. Il Lazy DM non ha un passo «aggiorna lo stato della campagna». Il riassunto della sessione precedente
   avviene al tavolo, all'inizio. [SNIPPET]
4. Alexander (Alexandrian) chiama la base delle campagne lunghe «campaign status document». È un file
   vivo che registra come gli scenari cambiano. Non ripete gli scenari. [SNIPPET]
5. In Blades in the Dark i fazioni avanzano tra le sessioni. Il GM tira per ogni fazione che gli
   interessa. Chi è stata trascurata recupera con più fasi. [SNIPPET]
6. Dungeon World separa fronti di avventura (pochi episodi) e fronte di campagna (la stagione). Il
   fronte di campagna si crea dopo la prima sessione, non prima. [SNIPPET]
7. Le campagne senza fine dichiarata tendono a sgonfiarsi. Un testo commerciale parla di circa 8 sessioni.
   È un dato debole. [SNIPPET]
8. Nei sistemi AI la memoria gerarchica con riassunti funziona. Ma i riassunti perdono dettagli e il
   recupero non sempre trova il fatto giusto. [SNIPPET, più una fonte OPENED su NarraWorld]
9. La coerenza regge meglio con un registro di fatti canonici, sempre visibile, più un recupero
   tracciabile alla fonte. [SNIPPET, OPENED]
10. Per Cantastorie: un'architettura a tre livelli (bibbia, stato, pacchetto di sessione). Haiku
    riceve solo il pacchetto della sessione corrente.

---

## 1. Come gli esperti scalano la preparazione

### 1.1 Il quadro di partenza: quanto tempo

- Sly Flourish: circa 30–60 minuti per una sessione di tre ore con gli otto passi. Per una sessione
  singola fatta da zero: un'ora o due. [SNIPPET: slyflourish.com/how_long_to_prep.html]
- Sondaggio del 2020 su DM (circa 4 ore di gioco): il 10% prepara 30 minuti o meno; il 33% circa un'ora;
  il 28% circa due ore; il 29% tre ore o più. [SNIPPET, stessa fonte]
- Sly Flourish ritira il «five minute game prep» e dice di averlo esagerato. Per una sessione singola
  propone tre passi: un inizio forte, tre-cinque luoghi, dieci segreti e indizi. [SNIPPET]

Lettura per noi: il tempo di preparazione cresce con la complessità del mondo, non con il numero di
sessioni. Una sessione in campagna lunga costa meno di una one-shot, perché il mondo esiste già.

### 1.2 Le scale per tier

Le fonti non danno tier identici. Metto insieme ciò che dicono sui livelli di una campagna.

**One-shot (1 sessione)**
- Un inizio forte, tre-cinque luoghi, dieci segreti e indizi, pochi PNG. [SNIPPET, Sly Flourish, prep 15 minuti]
- Il manuale 2024 tratta le avventure singole come unità a sé. Le sue cinque avventure d'esempio sono
  per livelli 1–7. [OPENED, D&D Beyond]

**Mini-arco (2–6 sessioni)**
- Il DMG 2024 dice che una campagna è «two or more adventures linked into one story». [OPENED]
- Dungeon World: uno o due fronti di avventura bastano. Ogni fronte dura pochi episodi. [SNIPPET]
- Dungeon World (SRD) suggerisce di creare il fronte di campagna dopo la prima sessione. [SNIPPET]

**Campagna (7–20 sessioni)**
- Tre conflitti maggiori preparati in anticipo. Milestone a livello 5, 11, 17. [OPENED, D&D Beyond]
- Piano di chiusura: pianificare il finale quando il conflitto principale è risolto. [OPENED, D&D Beyond]
- Un testo commerciale dice che le campagne homebrew con una fine chiara durano 12–30 sessioni.
  Propone tre-cinque archi che alzano la posta. [SNIPPET, storyroll.app: fonte debole]

**Campagna lunga / multi-anno (20–100+)**
- Il manuale 2024 dice: campagne che durano «months, even years». Non dà un numero di sessioni. [OPENED]
- Alexander: il documento di stato cresce nel tempo. Per le campagne lunghe conviene separare il
  registro delle tracce da quello delle schede. [SNIPPET, Alexandrian, moduli Trackers e Supporting Cast]
- West Marches (Ben Robbins): due anni e mezzo circa. Nessuna trama fissa. Ogni sessione è
  autonoma e riparte dallo stesso posto. Il GM prepara ciò che i giocatori annunciano in anticipo. [SNIPPET]
- Un GM con una sandbox di 40 sessioni ha chiuso la campagna quando la preparazione è diventata troppa.
  [SNIPPET, cannibalhalflinggaming e idlecartulary]

### 1.3 Gli strati che le fonti nominano

Sintesi di ciò che ogni fonte chiama «strato». Le parole cambiano, l'idea resta.

| Strato | Chi lo chiama così | Quando si prepara |
|---|---|---|
| Premessa e tono | DMG 2024 (premise, flavor) | prima, con i giocatori |
| Mondo e storia (bibbia) | DMG 2024 (setting, Greyhawk) | prima, in parte |
| Conflitti maggiori (3) | DMG 2024 | prima |
| Fronti di campagna | Dungeon World, Apocalypse World | dopo la prima sessione |
| Fronti di avventura | Dungeon World | per blocchi di sessioni |
| Orologi di fazione | Blades in the Dark | tra le sessioni |
| Documento di stato | Alexander (campaign status) | dopo ogni sessione |
| Nodi e situazioni | Alexander (node-based design) | per scena, al bisogno |
| Scene | Sly Flourish (scenes, catch-all) | per sessione |
| Segreti e indizi | Sly Flourish, three-clue rule | per scena |

Nota: in Cantastorie esistono già alcuni di questi strati. Il fronte e l'orologio sono nel manuale.
Lo stato di campagna non c'è ancora.

---

## 2. Preparazione a rotolo (rolling prep)

Questo è il punto chiave per noi. Non si possono scrivere anni di contenuti in anticipo. Il
Preparatore deve lavorare sulla sessione N+1 a partire da ciò che è successo nella sessione N.

### 2.1 Come lo fanno i GM esperti

- Alexander: il documento di stato si aggiorna dopo ogni sessione. Ogni versione è salvata come copia
  nuova («Campaign Status – Session 12»). Le versioni vecchie vanno in un archivio. [SNIPPET, Smart Prep parte 4]
- Alexander: serve tempo, circa tre o quattro sessioni, per capire che forma deve avere il documento
  di quella campagna. [SNIPPET, stessa fonte]
- Alexander: la cronologia degli «scoppi» (bangs) si genera anche dagli eventi già avvenuti. [SNIPPET, Ask the Alexandrian 19]
- Sly Flourish: il riassunto della sessione precedente va fatto al tavolo, all'inizio. Il passo
  «scenes» è un catch-all: cosa può cambiare nel mondo se certe cose succedono? [SNIPPET]
- Blades in the Dark: tra le sessioni il GM sceglie le fazioni che gli interessano adesso. Avanza i
  loro orologi con una mossa di downtime. Il tick dipende da un tiro: 1–3 avanza di un segmento, 4–5
  di due, 6 di tre, critico di cinque. Chi è rimasta indietro recupera con più fasi. [SNIPPET, bladesinthedark.com e eskur.dev]
- eskur.dev (Blades): dopo ogni sessione scegliere tre fazioni. Due con cui i PG hanno già avuto a che
  fare, una nuova. Ogni fazione fa una o due azioni. [SNIPPET]

### 2.2 Il ciclo che propongo per Cantastorie

Il ciclo tra due sessioni, da fare con il Preparatore (modello forte) e non con Haiku:

1. **Registro della sessione.** Al termine, si scrive un log strutturato. Non prosa. Contiene: fatti
   accaduti, PNG cambiati, promesse fatte o rotte, orologi avanzati, indizi trovati, PG cambiati,
   segreti rivelati. È il dato di base.
2. **Aggiornamento dello stato.** Il Preparatore aggiorna il file di stato. Aggiunge solo ciò che è
   successo in gioco. Non riscrive il canone di sua iniziativa.
3. **Turno delle fazioni.** Per ogni fazione attiva: un tiro o una regola fissa fa avanzare l'orologio.
   Si scelgono da tre a cinque fazioni. Le altre aspettano.
4. **Preparazione della sessione N+1.** Il Preparatore scrive solo le scene che servono. Lavora dallo
   stato aggiornato e dal log. Non riscrive la bibbia.
5. **Validazione.** Il validatore controlla il pacchetto della sessione.
6. **Gioco.** Haiku riceve solo il pacchetto della sessione. Non riceve la bibbia.

Motivo: il lavoro lento (canone, coerenza, colpi di scena) si fa una volta sola, prima o tra le
sessioni, con il modello forte. Il lavoro veloce (battute, risposte) si fa dal vivo con il modello
piccolo. Questa è la stessa divisione della skill attuale, estesa nel tempo.

### 2.3 Quanto lavoro per sessione

- Sly Flourish: 15–30 minuti di preparazione per sessione con gli otto passi, in una campagna avviata. [SNIPPET, terza parte citata]
- La prep a rotolo deve restare piccola. La fase pesante è quella iniziale. Con il ciclo sopra, il lavoro
  tra due sessioni dovrebbe restare sotto i 40 minuti del modello forte, in uso reale. Questo numero
  è una stima mia, da verificare con una prova.

---

## 3. Che cosa serve in una campagna lunga e non in una one-shot

Questa parte raccoglie ciò che le fonti dicono sulle campagne lunghe. Dove ho solo ipotesi, lo dico.

- **Progressione dei PG.** Livelli, oggetti, capacità. Il DMG 2024 usa i tier come milestone. Le
  scene devono cambiare quando i PG salgono di tier. [OPENED, DMG 2024]
- **Ritorno delle conseguenze.** Le scelte di una sessione tornano dopo. Il registro deve tenerle.
  Il manuale 2024 consiglia di collegare le avventure in modo seriale o episodico. [OPENED, DMG 2024]
- **PNG persistenti che cambiano.** Un PNG può morire, cambiare fede, cambiare lato. Alexander tiene
  una lista dei PNG maggiori fuori dal documento di stato, per non appesantirlo. [SNIPPET]
- **Fili aperti.** Promesse, debiti, domande della session zero. LitRPG Reads consiglia di piantare il
  finale presto, così i fili tornano nel finale. [SNIPPET, litrpgreads: fonte debole]
- **Recap all'inizio.** Il Lazy DM lo mette al tavolo. Per noi è un blocco del pacchetto di sessione:
  tre-cinque frasi scritte, con i fatti dal registro. [SNIPPET]
- **Finale ed epilogo.** Il manuale 2024 dice di pianificare il finale quando il conflitto
  maggiore si chiude. In più, un finale va preparato come una sessione normale, con il suo orologio. [OPENED, DMG 2024]
- **Giocatori che cambiano.** West Marches e le campagne aperte mostrano che i giocatori possono
  entrare e uscire. Il pacchetto deve funzionare con qualsiasi sottoinsieme. Questo è già la regola
  dei PG pregenerati di Cantastorie (uno in più del massimo). [SNIPPET, West Marches]
- **Tempo nel mondo.** Gli orologi e il calendario della cronologia devono andare avanti anche tra le
  sessioni. Blades in the Dark lo fa con il downtime. [SNIPPET]
- **Stanchezza del tavolo.** Il DMG 2024 suggerisce sessioni di pausa. Le fonti sulle campagne lunghe
  dicono che il carico del GM è la causa più comune di fine anticipata. [OPENED per la pausa; SNIPPET per il carico]

---

## 4. Come i sistemi AI tengono una campagna coerente

### 4.1 Che cosa esiste

- **AI Dungeon.** Riassunto automatico della storia ogni 15 azioni. Memory Bank con riassunti
  di sei azioni, cercabili (la fonte ufficiale dice sei; un annuncio del 2024 diceva quattro).
  Story Card attivate da parole chiave. Plot Essentials sempre presenti. [SNIPPET, help.aidungeon.com]
- **Friends & Fables (AI GM Franz).** Il motore ACE 2.0 crea memorie ogni cinque turni. Le memorie
  sono etichettate con luogo e personaggi. Si richiamano quando servono. Il piano della storia si
  aggiorna ogni tre turni. [SNIPPET, help.fables.gg e arcanumrpgs.com; la pagina ufficiale non l'ho potuta aprire]
- **DOME (NAACL 2025).** Outline gerarchico dinamico più un modulo di memoria su grafo di conoscenza.
  Serve per la narrativa lunga. [SNIPPET, aclanthology.org]
- **Learning to Reason for Long-Form Story Generation (Gurung e Lapata, arXiv 2503.22828).** Il modello
  legge una versione condensata della storia e scrive un piano dettagliato del capitolo successivo.
  Il piano è premiato in base alla qualità del capitolo che ne esce. Nei confronti a coppie vince
  quasi ovunque, soprattutto in fantasy e fantascienza. [OPENED, solo abstract]
- **NarraWorld (arXiv 2609.32401).** Memoria come «mondo»: un grafo con fatti, credenze dei
  personaggi, fili aperti e continuazioni ipotetiche. Gerarchia: eventi, scene, trame, plot. Ogni nodo
  resta collegato al testo sorgente. [OPENED, solo abstract]
- **Dramatron (Mirowski et al., arXiv 2209.14958, 2022; CHI 2023).** Generazione gerarchica: titolo,
  personaggi, beat, luoghi, dialoghi, ciascuno dipendente dal passo precedente. Valutato con 15
  professionisti di teatro e cinema. [OPENED, solo abstract; versione CHI 2023 SNIPPET]
- **Wordcraft.** Editor con LLM. Continua, chiede dettagli, riscrive. Non è un sistema di memoria. [SNIPPET]
- **Re3 (Yang et al., 2022).** Plan, Draft, Rewrite, Edit. Il modulo Edit controlla la coerenza con il
  testo già scritto. [SNIPPET]
- **STORYTELLER (arXiv 2506.02347, 2025).** Trame come nodi SVO (soggetto-verbo-oggetto), con un
  modulo di storyline e un grafo di conoscenza delle entità narrative. Vince il 84% delle preferenze
  umane nei test dell'autore. Nessun dato su sessioni lunghe. [OPENED, solo abstract]
- **Survey su LLM per la narrativa (Findings of EMNLP 2025).** Panoramica di metodi con outline e
  multi-agente. [SNIPPET]

Nota di correzione: uno snippet diceva che NarraWorld ha un benchmark di riassunto progressivo.
Leggendo l'abstract, questo non risulta. Non lo uso come fatto.

### 4.2 Che cosa funziona

- **Gerarchia con tracciabilità.** Ogni riassunto punta alla sua fonte. Così si può correggere un
  errore senza riscrivere tutto. [OPENED, NarraWorld; SNIPPET, DOME]
- **Canone separato dal riassunto.** Un registro di fatti stabili (story card, memory block, sezione
  bibbia) resta sempre nel contesto. Il riassunto racconta il movimento. [SNIPPET, AI Dungeon e F&F]
- **Outline a beat.** Un'ossatura di eventi da attraversare, non una sequenza fissa. Dramatron e DOME
  ci lavorano. [SNIPPET]
- **Pacchetti piccoli per il modello veloce.** Il modello piccolo lavora meglio con meno contesto e
  istruzioni chiare. Questo è già il principio della skill. [SNIPPET, indirettamente; è anche la
  logica del manuale]

### 4.3 Che cosa fallisce

- **Il riassunto perde dettagli.** Un esempio tipico: si ricorda «hai stretto un'alleanza con il
  fabbro» e si perde «ha una mano sola e odia la guardia». [SNIPPET, Tavernbound; fonte concorrente]
- **Il recupero non trova il fatto giusto.** Friends & Fables ammette che la memoria giusta non
  sempre viene richiamata. Il rimedio è inserire a mano il blocco. [SNIPPET, help.fables.gg]
- **Il carico ricade sul giocatore.** AI Dungeon richiede di curare le Story Card e il riassunto a
  mano. [SNIPPET, AI Dungeon e recensioni]
- **Struttura troppo rigida.** Dramatron è pensato come discesa top-down. Non tutti scrivono così. Un
  PG che sceglie fuori strada rompe il flusso. [SNIPPET]
- **Coerenza difficile da misurare.** Anche Dramatron e STORYTELLER lo dicono. Servono verifiche
  manuali e test sui fatti. [SNIPPET]
- **Ambiguità: morto e vivo.** Una recensione descrive un mostro trattato come morto e vivo nella
  stessa scena. È il caso tipico di un registro che non si aggiorna. [SNIPPET, fonte concorrente]

Attenzione: le fonti sui concorrenti (Tavernbound, DungeonsDeep.ai) hanno un interesse. Vanno lette
con cautela.

---

## 5. Proposta per Cantastorie

### 5.1 Tier e strati

Il numero di sessioni è il campo del brief. Il Preparatore lo legge e sceglie il tier. Il tier fissa
quanti strati si generano prima del gioco e quanti tra una sessione e l'altra.

| Sessioni | Tier | Generato prima del gioco | Generato tra le sessioni | Motivo e fonte |
|---|---|---|---|---|
| 1 (20–40 min) | **One-shot** | Premessa, cronologia breve, 1 scena, PNG 3–5, PG, segreti e indizi | nulla | Sly Flourish: prep 15 minuti per una sessione singola [SNIPPET] |
| 1 (2–3 ore) | **One-shot lungo** | come sopra, 3–5 scene, 1 fronte breve | nulla | Il manuale di Cantastorie già prevede 3–5 scene per 2–3 ore (C11) |
| 2–6 | **Mini-arco** | Premessa, 1 fronte di campagna con 2–3 tappe, cronologia a 2–3 atti, luogo principale, PNG persistenti 4–6, sessione 1 e 2 complete | Sessione N+1 dal registro; stato minimo (fatti, PNG, fili) | Dungeon World: pochi fronti bastano [SNIPPET]; alcuni testi dicono che una campagna senza fine si sgonfia intorno alla sessione 8 [SNIPPET, debole] |
| 7–20 | **Campagna** | Bibbia breve (2–4 regioni, 3–4 fazioni con orologi), tre conflitti maggiori, fine dichiarata, tier di PG come milestone, atto 1 completo | Stato completo, turno delle fazioni, sessione N+1 e N+2 in pacchetto, revisione del finale ogni tre sessioni | DMG 2024: tre conflitti e milestone a 5/11/17 [OPENED]; Alexander: documento di stato [SNIPPET] |
| 20–100+ | **Lunga / multi-anno** | Bibbia per zone (una piena, le altre come schizzo), tre-cinque archi con tappe, fine e epilogo, roster PG con cambi previsti | Stato vivo, archi generati uno alla volta (blocchi di 3–5 sessioni), recap automatico, PNG maggiori tracciati a parte | DMG 2024: «months, even years» [OPENED]; West Marches e sandbox lunghe: prep piccola dopo l'avvio [SNIPPET] |

Nota: le soglie (2–6, 7–20, 20+) sono mie. Le fonti non danno numeri precisi. Le ho scelte per
allinearle alle durate che Riccardo già usa nel brief. Vanno verificate con una campagna di prova.

### 5.2 Tre livelli di memoria (proposta)

1. **Bibbia** (`campagna.yaml`, `mondo/`): premessa, storia, regioni, fazioni, canone. Cambia poco.
   Scritta dal Preparatore. Non la legge Haiku.
2. **Stato** (`stato/stato.yaml`): fatti stabili accaduti in gioco, PNG vivi e morti, orologi, fili
   aperti, PG e livelli, prossima tappa. Aggiornato dopo ogni sessione. È il registro canonico.
3. **Pacchetto di sessione** (`sessioni/N/`): ciò che Haiku legge davvero. Dieci-venti righe di
   fatti rilevanti, PNG della scena, battute, segreti, recap. Scritto dal Preparatore a partire dallo
   stato.

Regola: Haiku non vede mai la bibbia. Vede solo il pacchetto. Il recupero resta a cura del Preparatore,
non del modello veloce.

### 5.3 Modifiche concrete al modello dati (da valutare, non da fare ora)

- Aggiungere `durata.sessioni` (numero) al brief, e derivare il tier dal numero. Il campo `durata`
  testuale resta come nota per Riccardo.
- Aggiungere `stato/` e `sessioni/` alla cartella campagna.
- Aggiungere un `log_sessione.yaml` per ogni sessione giocata: fatti, PNG cambiati, orologi, promesse,
  PG cambiati.
- Il validatore deve controllare che ogni fatto dello stato venga da un log.

### 5.4 Rischi

- Il lavoro tra le sessioni è il punto più fragile. Se il log è scritto male, lo stato è sbagliato
  e lo è anche la sessione successiva. Il log deve essere strutturato. Non deve essere prosa libera.
- Il rischio opposto: un canone troppo pesante. Il Preparatore riscrive la bibbia a ogni sessione.
  Regola: la bibbia cambia solo con una decisione esplicita di Riccardo.
- Il tier «lunga» non va costruito ora. È un obiettivo. Prima si prova il mini-arco con una campagna
  di 4 sessioni.

---

## 6. Prossimi passi suggeriti

1. Verificare le fonti marcate [SNIPPET] su Sly Flourish, Alexandrian e Blades in the Dark, aprendole
   direttamente. Ora non ci riesco per errori di rete.
2. Scrivere una campagna di prova da 4 sessioni con il ciclo del punto 2.2. Misurare il tempo tra
   due sessioni e il numero di errori del validatore.
3. Decidere le soglie di tier con Riccardo, dopo la prova.

---

## Fonti

**Manuali e siti di design**
- D&D Beyond, «Creating Your First Campaign Using the 2024 Dungeon Master's Guide» [OPENED]
  https://www.dndbeyond.com/posts/1850-creating-your-first-campaign-using-the-2024
- Sly Flourish, «How Long Does it Take You to Prep Your D&D Game?» [SNIPPET]
  https://slyflourish.com/how_long_to_prep.html
- Sly Flourish, «The Eight Steps of the Lazy DM» [SNIPPET]
  https://slyflourish.com/eight_steps_2023.html
- Sly Flourish, «Using the Lazy DM's Eight Steps At the Table» [SNIPPET]
  https://slyflourish.com/using_the_8_steps_at_the_table.html
- Sly Flourish, «Scenes: The Catch-all Step» [SNIPPET]
  https://slyflourish.com/scenes_catch_all_step.html
- The Alexandrian, «Smart Prep, Part 4: Campaign Status Documents» [SNIPPET]
  https://thealexandrian.net/wordpress/42961/roleplaying-games/smart-prep-part-4-campaign-status-documents
- The Alexandrian, «Campaign Status Module: Trackers» [SNIPPET]
  https://thealexandrian.net/wordpress/49165/roleplaying-games/campaign-status-module-trackers
- The Alexandrian, «Campaign Status Module: Supporting Cast» [SNIPPET]
  https://thealexandrian.net/wordpress/49970/roleplaying-games/campaign-status-module-supporting-cast
- The Alexandrian, «Don't Prep Plots» [SNIPPET]
  https://thealexandrian.net/wordpress/4147/roleplaying-games/dont-prep-plots
- The Alexandrian, «Node-Based Scenario Design, Part 1» [SNIPPET]
  https://thealexandrian.net/wordpress/7949/roleplaying-games/node-based-scenario-design-part-1-the-plotted-approach
- The Alexandrian, «Is Node-Based Design Prepping a Plot?» [SNIPPET]
  https://thealexandrian.net/wordpress/53341/roleplaying-games/is-node-based-design-prepping-a-plot
- Blades in the Dark, «Progress Clocks» [SNIPPET]
  https://bladesinthedark.com/progress-clocks
- Blades in the Dark, «Downtime Activities» [SNIPPET]
  https://bladesinthedark.com/downtime-activities-play
- eskur.dev, «Blades in the Dark: How I Run Factions» [SNIPPET]
  https://eskur.dev/posts/blades-how-i-run-factions/
- Dungeon World SRD, «Fronts» [SNIPPET]
  https://www.dungeonworldsrd.com/gamemastering/fronts/
- Dungeon World SRD (mirror), «14 Fronts» [SNIPPET]
  https://www.darkshire.net/jhkim/rpg/srd/dungeonworld/14-Fronts.html
- Ironsworn: Starforged SRD, «Legacy Moves» [SNIPPET]
  https://rsek.github.io/starforged-srd/moves/legacy
- Cannibal Halfling Gaming, «West Marches intro» (riassunto di Ben Robbins) [SNIPPET]
  https://cannibalhalflinggaming.com/2021/10/27/meet-the-campaign-intro-to-west-marches/
- Idle Cartulary, «Reflections on a West Marches Campaign» [SNIPPET]
  https://idlecartulary.com/2024/03/20/reflections-on-a-west-marches-campaign/
- StoryRoll, «How to Write a D&D Campaign From Scratch» (fonte commerciale, debole) [SNIPPET]
  https://storyroll.app/blog/how-to-write-a-dnd-campaign
- LitRPG Reads, «How to End a D&D Campaign with Impact» (fonte debole) [SNIPPET]
  https://litrpgreads.com/blog/rpg/how-to-end-a-dnd-campaign-with-impact-dungeon-master-tips-for-a-satisfying-finale

**Sistemi AI e ricerca**
- arXiv 2609.32401, Tian et al., «Shared Worlds, Private Minds: Structured Memory for Long-Form Writing as World Creation» [OPENED, solo abstract; titolo verificato]
  https://arxiv.org/abs/2609.32401
- DOME, NAACL 2025, «Generating Long-form Story Using Dynamic Hierarchical Outlining with Memory-Enhancement» [SNIPPET]
  https://aclanthology.org/2025.naacl-long.63.pdf
- arXiv 2503.22828, Gurung e Lapata, «Learning to Reason for Long-Form Story Generation» [OPENED, solo abstract]
  https://arxiv.org/abs/2503.22828
- arXiv 2209.14958, Mirowski et al., «Co-Writing Screenplays and Theatre Scripts with Language Models: An Evaluation by Industry Professionals» [OPENED, solo abstract]
  https://arxiv.org/abs/2209.14958
- ACM CHI 2023, versione di Dramatron con valutazione da professionisti [SNIPPET]
  https://dl.acm.org/doi/10.1145/3544548.3581225
- arXiv 2506.02347, Li et al., «STORYTELLER: An Enhanced Plot-Planning Framework for Coherent and Cohesive Story Generation» [OPENED, solo abstract]
  https://arxiv.org/abs/2506.02347
- Findings of EMNLP 2025, «A Survey on LLMs for Story Generation» [SNIPPET]
  https://aclanthology.org/2025.findings-emnlp.750.pdf
- AI Dungeon, «What is the Memory System?» [SNIPPET]
  https://help.aidungeon.com/faq/the-memory-system
- Friends & Fables, «Memories» (help center, non aperto) [SNIPPET]
  https://help.fables.gg/articles/2838157-memories
- Arcanum RPGs, «Friends & Fables Guide (2026)» [SNIPPET]
  https://arcanumrpgs.com/blog/friends-and-fables-guide/
- Tavernbound, «Why AI Dungeon Keeps Forgetting Your Story» (fonte concorrente) [SNIPPET]
  https://tavernbound.com/blog/why-ai-dungeon-forgets-your-story
- DungeonsDeep AI, «Why AI Game Masters Forget Your Campaign» (fonte concorrente) [SNIPPET]
  https://dungeonsdeep.ai/blog/why-ai-game-masters-forget-your-campaign-and-how-dungeonsdeepai-doesnt

**Altre voci non verificate**
- NewbieDM, «Using the 3 Act Structure in your D&D game» (2010) [SNIPPET]
  https://newbiedm.com/2010/07/30/using-the-3-act-structure-in-your-dd-game/
- Legendary Pants, «GMW Academy: The 3-Act Structure» [SNIPPET]
  https://www.legendarypants.net/gmw-academy-the-3-act-structure/

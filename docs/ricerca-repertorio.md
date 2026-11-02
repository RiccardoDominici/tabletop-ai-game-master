# Ricerca: repertorio pre-scritto con selezione a runtime

Raccolta il 2 novembre 2026 da un agente di ricerca (solo lettura). Legenda: [OPENED] = pagina letta;
[SNIPPET] = solo da risultato di ricerca o riassunto di terzi.

## 1. Precedenti classici

- **Façade (Mateas & Stern).** Il drama manager sceglie il beat successivo tra quelli non ancora usati, per seguire un arco di tensione. Un beat contiene 10–100 JDB; i beat sono 27, circa 15 per partita. Gli autori hanno consegnato circa il 30% della visione iniziale. https://www.gamedeveloper.com/design/the-story-of-facade-the-ai-powered-interactive-drama [OPENED, fonte secondaria]. I paper primari (https://sites.cc.gatech.edu/fac/Charles.Isbell/classes/reading/papers/MateasSternGDC03.pdf) non erano leggibili [SNIPPET].
- **Qualità vs salienza (Emily Short).** In QBN (Failbetter) le storylet si sbloccano con qualità numeriche e nessun manager sceglie: decide il giocatore. Il costo è alto, perché ogni beat richiede qualità di "disponibile" e "completato". In SBN il sistema sceglie la regola più specifica applicabile, con pareggi casuali. Rischio: esiti di trama arbitrari, mitigabili con variabili di arco drammatico. I pesi si tarano per tentativi, con migliaia di partite simulate. https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/ [OPENED]
- **Valve / Ruskin, GDC 2012.** Regole a specificità decrescente con fallback generici. Requisito: gli scrittori devono poter produrre molto contenuto con strumenti semplici. Le battute devono interrompersi con naturalezza. https://emshort.blog/2012/03/16/gdc-2012-talk-on-dynamic-dialogue/ [OPENED]; talk: https://www.gdcvault.com/play/1015528 [SNIPPET]
- **Kreminski & Wardrip-Fruin (ICIDS 2018).** Quattro dimensioni del design space: precondizioni, ripetibilità, tipo di contenuto, architettura di selezione. https://emshort.blog/2019/01/06/kreminski-on-storylets/ [OPENED, riassunto]; paper: https://link.springer.com/chapter/10.1007/978-3-030-04028-4_14 [SNIPPET]
- **Ink (inkle).** Scelte usa-e-getta di default, `+` per quelle ripetibili. Varianti `once`, `shuffle`, `stopping` contro la ripetizione. Le condizioni non annullano il comportamento once-only. https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md [OPENED]

## 2. LLM e contenuto pre-scritto (2023–2026)

- **Drama Llama (arXiv 2501.09099).** Trigger definiti in linguaggio naturale; studio preliminare con sei autori. Il meccanismo (un LLM giudica la condizione, si attiva il primo trigger soddisfatto) e il limite dei "cliché" vengono da snippet, non dal testo. https://arxiv.org/abs/2501.09099 [OPENED, solo abstract]
- **Dramamancer (arXiv 2601.18785).** Storylet = condizione booleana sullo stato + esito. A runtime, due chiamate LLM: una restituisce le condizioni soddisfatte dopo ogni input, l'altra scrive la battuta successiva. Nessun numero su latenza o coerenza, nessun failure mode riportato. https://arxiv.org/html/2601.18785 [OPENED]
- **Ploug et al., IEEE CoG 2025 (pilota, 64 partecipanti).** Quattro condizioni: controllo statico, riformulazione di linee pre-scritte, ibrido, open-ended. L'open-ended ha dato conversazioni più lunghe e più engagement, soprattutto nei casual. L'ibrido ha mostrato "inconsistenze tecniche" [SNIPPET]. https://portal.findresearcher.sdu.dk/en/publications/open-ended-npc-dialogue-favors-casual-players-a-pilot-comparison-/ [OPENED]; https://doi.org/10.1145/3815598.3815622 [SNIPPET]
- **arXiv 2604.10107 (N=130, in revisione).** NPC LLM con input libero vs opzioni predefinite: carico cognitivo più alto (p<.001), nessun miglioramento significativo dell'esperienza (p=.195), usabilità e fiducia in calo. Il confronto cambia insieme input e risposta, quindi non separa gli effetti. https://arxiv.org/abs/2604.10107 [OPENED]
- **Coerenza nel lungo periodo.** NCP-Bench: il modello migliore (GPT-5.2) mantiene il 42% dei vincoli dopo 20 turni. https://arxiv.org/html/2608.08160 [SNIPPET]
- **Modelli piccoli (Munk et al., FDG '26, arXiv 2601.23206).** Llama 3.2 1B con LoRA: 78% di output superati in 4-bit, contro il 98% di GPT-4o. Latenza mediana 2,1–4,8 s con retry su RTX 3070. Come giudici, GPT-4o è "sistematicamente indulgente" e Claude Haiku 4.5 supera solo il 22% sull'allineamento, contro il 95% dei valutatori umani. È generazione, non selezione. https://arxiv.org/html/2601.23206 [OPENED]
- **Lacuna.** Non ho trovato confronti misurati tra selezione di linee pre-scritte da un LLM piccolo e generazione libera, con latenza. Wevelsiep et al. (IWSDS 2025, LLM che mappa l'input su opzioni predefinite, 14 partecipanti) è rilevante, ma il PDF non era leggibile: https://aclanthology.org/2025.iwsds-1.4.pdf [SNIPPET]

## 3. Lezioni pratiche

- **Descrizione dei beat.** Dramamancer e Drama Llama usano condizioni brevi e verificabili, non testo completo. Non ho trovato confronti misurati tra le due forme.
- **Precondizioni.** Qualità numeriche (Short), regole con specificità e fallback (Ruskin), variabili e contatori di visita (Ink).
- **Ripetizione.** Once-only di default e varianti shuffle/stopping (Ink). La ripetibilità è una dimensione esplicita (Kreminski).
- **Copertura.** Partire da default generici e aggiungere regole specifiche. Non serve copertura uniforme (Short, 2016).
- **Beat per personaggio.** Nessun numero per personaggio trovato. Façade: 27 beat per l'intero sistema.
- **Test.** Simulare migliaia di partite per trovare contenuti che non si attivano mai o si attivano troppo (Short, 2016).
- **Failure mode riportati.** Trame arbitrarie (SBN). Falsi positivi accettati e parser fragile (Façade). Fallimenti su nomi rari e output ripetitivo (Munk et al.). Giudici LLM indulgenti. Carico cognitivo con input libero (2604.10107).

Fonti non raggiunte: il write-up di Ruskin (assemblyrequired.crashworks.org, errore DNS) e il blog Radiator (connessione rifiutata).

## Cosa ne prendiamo (nota dell'orchestratore)

- Il confronto misurato che manca in letteratura è proprio il nostro esperimento A/B: vale la pena farlo bene.
- Il rischio dell'ibrido sono le **cuciture** tra battute scritte e improvvisate: il giudice deve guardarle apposta.
- **Giudici LLM indulgenti**: il giudice cieco usa Opus, deve citare la riga di trascrizione per ogni punteggio, e
  le misure meccaniche (lunghezza frasi, fughe, PG in terza persona) le conta uno script, non il giudice.
- Registrare quante volte esce ogni battuta: quelle mai usate o usate troppo dicono dove manca o abbonda il repertorio.
- Battute usa-e-getta di default, varianti per quelle che tornano (come Ink).

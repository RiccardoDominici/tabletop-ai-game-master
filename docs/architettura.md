# Architettura v1 — "Cantastorie" (nome di lavoro)

Un master IA per giocare a D&D in presenza. Ogni giocatore usa il proprio telefono, il proiettore mostra la scena, una cassa porta la voce del narratore e dei personaggi, e sotto c'è sempre musica. Scritta il 1° novembre 2026, dopo i test misurati (vedi «Prove fatte»).

## Idea in una frase

Il **software possiede il gioco**: stato, regole, dadi, segreti e canone li gestisce il codice, non il modello. Ci sono poi due modelli:
- un **narratore veloce**, che scrive ciò che si sente;
- un **regista lento**, che studia in sottofondo e migliora tutto.

Il mestiere del master non è affidato al prompt: è imposto dalla struttura (vedi «Manuale del master», regole E1–E15).

## Prove fatte (1° novembre 2026, numeri misurati)

**Testo**
- **LFM 2.5 2.6B** (OpenRouter e locale): scartato.
  - Italiano sgrammaticato.
  - Rivela l'azione privata in 5 prove su 5, in locale.
  - In modalità ragionamento, che è quella predefinita, il testo visibile arriva dopo 5 s (OpenRouter) e dopo 49 s (in locale).
  - La versione gratuita va spesso in limite di richieste.
- **Claude Haiku 5.5**, con ragionamento spento ed effort basso: promosso.
  - Prima parola in 0,55 s, prima frase completa in 0,93 s, totale 1,7 s.
  - 0 fughe di azioni private e 0 contraddizioni, su 30 narrazioni.
  - Parsing delle azioni: JSON valido 10 volte su 10, interpretazione corretta 9 su 10.
  - Dialogo diviso per voce: valido 5 volte su 5.
  - Strumento dadi usato bene 3 volte su 3.
  - Costo: 85 chiamate per $0,018.
  - Difetti: frasi lunghe (19 parole di media) e qualche dettaglio inventato. Il Motore li corregge (E4, E10).

**Voce**
- **HeyGen voice-1-turbo** (OpenRouter):
  - primo audio in 0,8 s; 30 s di audio in 2,7 s;
  - 10 voci, clonazione possibile;
  - italiano intelligibile (Whisper sbaglia il 2,8% delle parole).
  - Versione gratuita fino al 30/11/2026. In pausa finché non si ricarica OpenRouter.
- **Qwen3-TTS 0.6B in locale** (MLX):
  - primo audio in 0,67 s in streaming;
  - genera appena più veloce di quanto si ascolta (0,82–0,87 s per ogni secondo di audio): margine sottile;
  - clona una voce da 8 s di esempio;
  - fino a 7 GB di RAM.
  - È il motore vocale di ora.
- Scartati: Chatterbox (11 s al primo audio) e MOSS-Nano (italiano poco comprensibile). Kokoro non è stato testato: serve `espeak-ng`.

**Trascrizione della voce dei giocatori**
- **Whisper large-v3-turbo in locale**: 1,6 s per una frase di 5 s, 2,8% di parole sbagliate su audio pulito. Gli errori sono sui nomi («Kara» diventa «Cara») e si correggono passando a Whisper l'elenco dei nomi della campagna.

**Musica**
- Da generare in locale: Stable Audio 3 Small (MLX, licenza community) oppure ACE-Step 1.5 (MIT).
- Da biblioteca: OpenGameArt / Freesound / Pixabay, CC0 o CC-BY.
- Lyria via OpenRouter come extra: $0,04 per clip.
- Niente ancora ascoltato. Va fatta una prova di generazione.

## I sei moduli

### 1. Motore (deterministico, unica fonte di verità)
È un server sul Mac e gestisce:
- **lo stato a eventi**: un log append-only in SQLite, da cui si ricava lo stato. Permette annullamenti, riavvii e il ritiro immediato richiesto dalla X-card;
  oggi (apps/server/src/sessione/): `node:sqlite` in `<cartella dei log>/sessioni.sqlite`, eventi `inizio`, `fotografia`
  (scena, luogo, umore, situazione, orologi, repertorio, note, pausa, turno), `trascrizione_turno`, `tavolo` (azioni e
  finestra) e `dispositivo` (telefono → PG), scritti a ogni turno chiuso, a ogni comando del master e a ogni cambiamento
  delle azioni. All'avvio una sessione in corso della stessa campagna si ricostruisce e aspetta il proiettore: riparte
  senza rileggere l'apertura; se il narratore stava rispondendo, le azioni di quel turno tornano ai giocatori e il turno
  si rigioca. «Nuova sessione» nel pannello, `partita.sh --nuova` o Ricomincia ne cominciano un'altra;
  campagne a più sessioni (docs/strati.md, D2): il Motore gioca il livello di campagna più un pacchetto
  `sessioni/<nn>/`, scelto dall'archivio (colonna `pacchetto`); «Fine sessione» chiude la sessione e scrive il
  registro deterministico (`registro.yaml` + `trascrizione.yaml`) dagli eventi, «Prossima sessione» ricostruisce il
  server sul pacchetto dopo (apps/server/src/ciclo-server.ts) e i telefoni ritrovano il loro PG;
- **le regole SRD 5.2** (CC-BY-4.0, dati estratti dal PDF ufficiale, attribuzione obbligatoria nei crediti): dadi, prove, CD, iniziativa, PF. Il dado lo tira sempre il server: la narrazione non può cambiare un esito;
- **gli orologi delle minacce**, gli atteggiamenti dei PNG, gli indizi rivelati, le menzogne già dette, i contatori dello spotlight;
- **il canone**: fatti `proposto` e `confermato`, con il flag `noto_ai_pg`;
- **la cassaforte**: segreti, entità non note, messaggi privati.

Il modello **propone** modifiche tramite strumenti (`tick_clock`, `reveal_clue`, `set_attitude`, `roll`). Il Motore controlla le precondizioni e accetta o rifiuta.

Fa anche da **compilatore di contesto** (E2): costruisce per ogni chiamata il minimo che il modello deve sapere.

### 2. Narratore (corsia veloce, sul percorso critico)
- Modello: **Haiku 5.5**, ragionamento spento, effort basso, streaming. Il prompt stabile va in cache: Carta di stile, regole di scrittura, scheda della scena.
- Scrive **segmenti strutturati**: `{tipo, voce, testo, destinatario_pg, mossa, indizi_rivelati, fatti_nuovi, tick, musica}`.
- **Ogni PNG importante parla tramite una chiamata separata.** Quella chiamata vede solo la scheda di quel PNG (`sa`, `crede_a_torto`, `mente_su`, menzogne già dette) e la trascrizione pubblica. Quello che non sa, non lo può dire.
- **Filtri prima della voce** (E4–E6, meno di 10 ms per frase):
  - lunghezza della frase;
  - lista di frasi fatte vietate;
  - guardia dell'agency: il narratore non decide al posto dei personaggi giocanti;
  - guardia anti-fuga contro la cassaforte.
- Il narratore lavora con **una frase di anticipo**, così il filtro può trattenere una frase senza buchi nell'audio.

### 3. Regista e Critico (corsia lenta, in sottofondo, mai sul percorso critico)
Durante la sessione usa un modello forte via API (Opus 5.5, effort alto, chiamate asincrone; stima circa $1 a sessione). Fa cinque cose:
- **critico di scena** (E11): voti su 12 criteri a fine scena; massimo 3 *note di regia* che restano nel prompt del narratore per 15 turni;
- **estrattore di canone** (E10): trova i fatti inventati dal narratore e non dichiarati, controlla le contraddizioni, le ripara nella finzione;
- **decisioni importanti**: quando i giocatori escono dal copione, quando una minaccia avanza, quando un PNG cambia campo, quando un indizio essenziale rischia di perdersi. Il narratore improvvisa una **mossa morbida** subito, il regista decide con calma e il narratore applica la decisione al turno dopo;
- **pre-generazione speculativa**: prepara in anticipo i luoghi e i PNG verso cui il gruppo si sta muovendo (scheda, immagine, scelta della musica);
- **completa le schede** dei PNG improvvisati che ricompaiono.

Tra una sessione e l'altra usa **Claude Code** (abbonamento): riassunto della sessione, avanzamento delle minacce, preparazione della sessione dopo, revisione della qualità. È lo «studio» di fondo.

### 4. Preparatore (prima della campagna, offline)
È Claude Code con una skill dedicata, che usa il «Manuale del master» come specifica, più un validatore da riga di comando del Motore (E1). Genera una cartella di campagna in YAML, versionata con git:
- **Carta di stile**: tono, registro del narratore, regole di prosa, `[STILE]` per le immagini, tavolozza musicale, linee e veli;
- **fronti**: minacce con orologi e cronologia del cattivo, e cosa succede se i personaggi giocanti non fanno niente;
- **nodi e scene** (scheda obbligatoria), con indizi secondo la regola dei 3 indizi (≥3 indizi, in ≥2 luoghi, di ≥2 tipi);
- **PNG** (scheda obbligatoria: personalità a 2 livelli, sa / non sa / crede a torto / mente su, voce, atteggiamento verso ogni personaggio giocante, evoluzione);
- **asset**: immagini dei luoghi e ritratti, brani per ogni tag d'atmosfera, una voce per ogni PNG (clip di riferimento).

**Se le schede non sono valide, la sessione non parte.** Prima di ogni campagna gira la **serie di test di attacco** (E15): con anche una sola fuga, la campagna non parte.

### 5. Voce e ascolto
- **Sintesi vocale** dietro un'interfaccia `TtsProvider`, per poter cambiare motore senza toccare il resto:
  - `QwenLocal`: ora;
  - `HeyGen` via OpenRouter: dopo la ricarica.
- **Registro voci**:
  - il narratore ha una voce fissa;
  - ogni PNG ha un `voce_id` e una clip di riferimento. Il validatore vieta voci uguali nella stessa scena e controlla la distanza di tono tra le voci.
- **Coda per frase**:
  - il narratore genera, il filtro controlla, la sintesi parla;
  - le battute fisse (frase campione di un PNG, introduzioni, saluti) sono **pre-registrate**;
  - con Qwen in locale, la prima frase di una battuta clonata si fa in anticipo, così la voce non si interrompe.
- **Ascolto**: tieni-premuto-per-parlare dal telefono; l'audio va al Mac, dove Whisper turbo lo trascrive in locale. Gli si passano in anticipo i nomi della campagna.

### 6. Musica, ambiente, immagini
- **Musica**: un vocabolario chiuso di tag (esplorazione, taverna, tensione, mistero, battaglia, boss, pathos, vittoria, riposo, orrore…), con 2–3 brani per tag e per campagna, tutti nello stesso stile.
  - Il narratore propone il tag; il Motore applica una isteresi: almeno 60–90 s prima di cambiare, salvo l'inizio di un combattimento.
  - Dissolvenze incrociate tra i brani; la musica si abbassa sotto la voce (Web Audio).
  - Uno strato di ambiente per luogo (pioggia, folla, gocce).
- **Immagini**: pre-generate per luoghi e PNG, unendo gli invarianti e `[STILE]`, così volti e luoghi restano coerenti (E14).
  - Se manca un'immagine, resta quella più vicina o un'immagine d'atmosfera finché la nuova non è pronta.
  - Il generatore è ancora da scegliere: OpenRouter quando torna, oppure in locale.

## Interfacce

**Telefono** (web app, ingresso con QR o codice stanza):
- scheda del personaggio;
- tieni-premuto-per-parlare e testo;
- interruttore **privato**;
- casella dei messaggi privati;
- tiro dei dadi con un tocco;
- stato dell'azione: *in coda / superata / risolta*;
- pulsante **Annulla**;
- X-card anonima.

**Schermo/proiettore**:
- immagine della scena con un lento movimento della camera;
- ritratto e nome di chi parla;
- ordine di iniziativa in combattimento;
- tutto l'audio: voce, musica, ambiente.

**Pannello master** (sul Mac): stato, orologi, canone, note di regia, pulsanti d'emergenza. È importante, non un di più: i progetti esistenti (CALYPSO, Friends & Fables) insegnano che un umano deve poter correggere o fermare il master IA.

Com'è fatto oggi (`/master`, contratto in `packages/shared/src/master.ts`):
- **Accesso**: il server stampa nel log all'avvio la riga `PANNELLO MASTER` con il link `http://localhost:4610/master?token=…`
  (anche `scripts/avvio.sh` lo mostra). Il token cambia a ogni avvio (o si fissa con `CANTASTORIE_MASTER_TOKEN`), apre la
  stanza Socket.IO `master` e non è mai nel QR: i telefoni non possono entrare (cinque tentativi sbagliati chiudono il socket).
- **Vede**: scena e luogo sul proiettore, orologi con i segni mostrati e il prossimo, finestra delle azioni, azioni in sospeso
  con stato e legami (anche le private, segnate), trascrizione pubblica, note di regia, battute del repertorio (modalità B)
  e il registro dei comandi.
- **Comanda**:
  - **Pausa / Riprendi**: nessuna nuova finestra. A finestra aperta la finestra resta aperta ma non si chiude da sola
    (il conto alla rovescia del ritmo concitato si ferma, e alla ripresa riparte da capo); durante una narrazione la si
    lascia finire e poi il tavolo si ferma (fase `pausa`). I telefoni possono scrivere: l'azione entra alla ripresa. La
    pausa la mette e la toglie solo il master: il Motore non si ferma mai da solo.
  - **Ferma la narrazione**: interrompe subito LLM e voce, lo schermo tace e il tavolo va in pausa. Le azioni di quel turno
    non sono state risolte: tornano ai giocatori come «non è andata», da rimandare.
  - **Cambia luogo** (dissolvenza sul proiettore), **orologio ±1 segno**, **Risolvi ora** (chiude la finestra: il narratore risponde alle
    azioni inviate, senza aspettare chi manca), **ritmo calmo / concitato**, **salta l'azione** di
    un giocatore (torna nella sua casella, chi ne dipendeva deve decidere).
  - **Cambia scena** (campagne con `scene/*.yaml`): contesto del narratore e orologi attivi della scena nuova (gli orologi
    tengono lo stato tra le scene), luogo sul proiettore, battute della scena; le azioni in sospeso tornano ai giocatori,
    il narratore legge l'apertura e si apre la finestra per tutti.
  - **Immagini di situazione** (`situazione_<png>_<id>`, mai usate come ritratto o luogo): il master le mette e le toglie;
    in modalità B il Motore le mostra da solo a fine narrazione quando esce la rivelazione collegata
    (`aspetto.situazioni[].dopo`, oppure l'indizio del PNG il cui `come_si_trova` nomina la situazione), e torna il luogo
    quando parte la narrazione successiva.
  - **Note di regia**: al massimo 3, da 1 a 15 turni; entrano nel messaggio del narratore (parte variabile, fuori cache) dal
    turno successivo, e ogni turno narrato ne consuma uno. Si azzerano quando la scena ricomincia.
- **Registro**: ogni comando, riuscito o rifiutato, è una riga di `logs/master.jsonl` e del log del server (`evento: master`).
- **Senza spoiler** (attiva per default, interruttore in alto, scelta salvata nel browser): chi fa da master spesso gioca
  anche. Il pannello nasconde nome, segni e «a orologio completo» degli orologi («Orologio 1 · segni 1/6 · dovuto»), il
  contenuto delle azioni private (restano autore e stato), le battute non ancora uscite (solo quante, per chi parla) e il
  tipo vero di quelle uscite, le situazioni non in onda. Comandi, stati, conteggi, trascrizione, registro e note restano.

**Connessione e vincoli dei telefoni** (dalla ricerca):
- **Socket.IO v4**, con una stanza per il tavolo e una `player:<id>` per ogni canale privato. Alla riconnessione si risincronizza in base al numero di versione dello stato. Le clip audio si inviano con una POST HTTP.
- **Serve HTTPS anche in rete locale**, altrimenti il microfono non si apre: `http://192.168.x.x` non è un contesto sicuro. Ci sono tre strade, da provare su telefoni veri in F2:
  - un tunnel HTTPS, per esempio Cloudflare: si entra col QR e non si installa niente;
  - mkcert, che però richiede di installare il certificato su ogni telefono;
  - Tailscale, che richiede l'app.
- **Formati audio**: si registra con MediaRecorder, nel formato che il telefono supporta (Safari mp4/AAC, Chrome webm/opus). Il server converte con ffmpeg.
- **Schermo**: un clic su «Inizia sessione» sblocca l'audio, perché i browser bloccano la riproduzione automatica. Sui telefoni si usa Wake Lock, così lo schermo non si spegne.

## Turni e azioni annullabili

Ogni scena ha un **numero di versione**. Ogni azione inviata porta con sé la versione in cui è stata scritta.

**Esplorazione e dialogo: finestre.** Quando la narrazione finisce con un invito a un personaggio giocante, si apre una finestra.
- La finestra si chiude in uno di tre casi (docs/f0-contratti.md, «Turno»):
  - hanno inviato tutti i giocatori invitati (inviare = pronto), dopo 2,5 s di assestamento;
  - al ritmo concitato (lo chiede la narrazione), alla scadenza: 25 s dall'apertura;
  - il master preme «Risolvi ora».
- Al ritmo calmo non c'è nessuna scadenza né mossa contro lo stallo: se nessuno scrive, il gioco aspetta. Un sorvegliante
  riprende il gioco se il Motore resta fermo (modello, voce) senza segni di vita.
- Finché la finestra è aperta, ogni azione si può modificare o annullare.
- Alla risoluzione, le azioni scritte su una versione vecchia diventano **superate**. Il telefono chiede: «La scena è cambiata: confermi o riscrivi?».
- Esempio: «faccio un passo avanti» mentre il narratore parla. Se il compagno ti anticipa, la tua azione viene segnata come superata invece che eseguita alla cieca.

**Combattimento: iniziativa rigida.** Un turno alla volta, con un timer morbido; il problema dell'annullamento non si pone.

**Azioni private**: risolte dal Motore. L'esito va solo sul telefono di chi le ha fatte. Nella narrazione pubblica finisce solo ciò che gli altri possono percepire, e la cassaforte lo controlla.

## Latenza attesa (stima dai numeri misurati)

Dal momento in cui il giocatore rilascia il pulsante:
- trascrizione Whisper: circa 1,6 s;
- chiusura della finestra: variabile;
- prima frase di Haiku: circa 0,9 s;
- filtro: meno di 0,01 s;
- primo audio di Qwen: circa 0,7 s.

Totale: **circa 3,5 s, più l'attesa della finestra.** Per farla sentire meno, intanto:
- sullo schermo compare subito «Kara si avvicina…» con un suono di conferma;
- la musica non si ferma mai.

## Tecnologia

- **Server e client** in TypeScript su Node, riusando l'impianto di Agorà: server unico, Vite, stanze, interfaccia fumettistica. SDK Anthropic ufficiale, con `baseURL` fissato su api.anthropic.com e non sul proxy :4000.
- **Componente ML** in Python per MLX (mlx-whisper, mlx-audio con Qwen3-TTS). È un servizio HTTP locale, separato perché le librerie MLX sono in Python.
- **Dati**: la campagna in YAML con git; la sessione in SQLite a eventi; gli asset su file.
- **Opzionale: server MCP** perché Claude Code possa leggere lo stato e scrivere note di regia durante la sessione. È l'idea originale, che resta come strumento del regista, non come motore.
- **Codice modulare**: un modulo per responsabilità (motore, contesto, narratore, PNG, filtri, canone, regista, voce, musica, trasporto). Log strutturato di ogni chiamata, con latenze e costi.

## Piano di lavoro (ogni fase verificata prima della successiva)

1. **F0. Prova completa**: una scena, telefono in solo testo, Haiku, Qwen, schermo. Si misura la latenza reale in stanza.
2. **F1. Motore**: schema della campagna, validatore, compilatore di contesto, chiamate separate dei PNG, filtri E4–E6, canone.
3. **F2. Telefoni e schermo**: tieni-premuto-per-parlare con Whisper, azioni private, annullamento e versioni, musica con abbassamento sotto la voce.
4. **F3. Preparatore**: skill di Claude Code e una prima avventura breve (3–5 luoghi, 4–6 PNG), voci assegnate, musica di biblioteca.
5. **F4. Regista e critico** in sottofondo, serie di test di attacco, rubrica.
6. **F5. Asset generati**: musica (Stable Audio 3 / ACE-Step), immagini, passaggio a HeyGen dopo la ricarica.
7. **F6. Combattimento** completo: iniziativa, schede dei mostri SRD 5.2.

## Rischi principali

- **Qwen in locale ha un margine sottile**: genera appena più veloce di quanto si ascolta, e meno ancora con le voci clonate. Contromisure: battute pre-registrate e una frase di anticipo. Poi HeyGen.
- **Audio vero nella stanza**: rumore e voci sovrapposte faranno sbagliare Whisper più che nei test. Contromisure: telefono vicino alla bocca e nomi della campagna passati a Whisper. Il testo resta sempre disponibile.
- **RAM a 16 GB**: Whisper (circa 2,5 GB) e Qwen (fino a 7 GB) insieme ci stanno. Musica e immagini vanno generate prima, mai durante la sessione.
- **Disco**: circa 16 GB liberi. I modelli si scaricano uno alla volta.
- **Haiku inventa dettagli**: li cattura l'estrattore di canone. Le contraddizioni si riparano nella finzione.

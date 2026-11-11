# Da fare (aggiornato il 2 novembre 2026, sera)

Lista viva delle cose aperte, con chi le ha in mano. Le decisioni prese sono nei documenti di progetto.

## Obiettivo finale (Riccardo, 10 novembre 2026)
**Chiunque incolla il link del repository nel proprio Claude Code e gioca, senza chiavi.** Niente deve essere
obbligatorio: di base tutto gira in locale o su Claude Code (abbonamento di chi lo usa); le chiavi esterne
(Anthropic per un lettore migliore, OpenRouter per la voce drama-3, Freesound per i suoni…) sono un di più
per chi vuole smanettare. Servono:
- una fase di **configurazione guidata da Claude Code** (una skill nel repo, letta da chi incolla il link):
  riconosce il computer (sistema, chip, RAM, GPU, disco) e sceglie da solo il lettore veloce, il modello delle
  immagini e la voce adatti; scarica ciò che serve, propone le chiavi facoltative, scrive una configurazione
  locale fuori da git e chiude con una prova automatica;
- **ogni pezzo modulare** dietro una scelta di configurazione con riserve: lettore (locale | Haiku | altri),
  voce (locale | drama-3 | finta), immagini (locale | nessuna | API), suoni (fonti libere | Freesound);
- la documentazione online aggiornata quando tutto funziona.

## In corso
- **Durata in sessioni e strati di gioco** (richiesta di Riccardo, 3 novembre 2026): nel brief si indica la durata
  stimata in *numero di sessioni*, e da quella dipende quanti strati genera il framework. Una one-shot ha poche cose
  (situazione, poche scene e PNG: è ciò che fa oggi la skill); una campagna di anni ha più fasi o archi e un mondo
  completo, e il materiale della sessione successiva si prepara tra una sessione e l'altra a partire da ciò che è
  successo davvero. Ricerca in corso (`docs/ricerca-durata.md`), poi progetto degli strati, poi skill, validatore e server.
- **Prova alla cieca della skill Preparatore**: un agente nuovo scrive `campagne/ponte-lanterne` seguendo solo la skill.
- **Immagini** (prova-f0, ponte-lanterne, nozze-neve: fatte il 2-3 novembre; pipeline in `strumenti/immagini`,
  misure in `esperimenti/immagini/risultati.md`). Restano:
  - **nodi-luogo senza immagine**: un nodo `tipo: luogo` senza `scheda` di scena né `immagine.prompt_luogo` non ha
    immagine e nessuno lo dice (oggi `n_valle` di nozze-neve, `n_chiesa` e `n_passo_vecchio` di ponte-lanterne;
    `n_sasso` era il caso più grave, la scena del Sasso stava su un nodo evento: sistemato in d252dd1). La regola
    del validatore passa alla skill v2: ogni nodo-luogo che il master può raggiungere ha una scheda o un prompt;
  - **la carta di stile non deve imporre il tempo atmosferico a tutto**: «rain-soaked» in ponte-lanterne fa piovere
    dentro il magazzino e nella stanza di Rosa; il controllo visivo lo trova, ma un seme nuovo non basta. Meglio
    il tempo nel prompt dei luoghi all'aperto che nello stile;
  - **mani di Sebastiano** (prova-f0) e **grata dell'osteria**: il prompt non basta, va cambiato nella scheda
    («hands hidden inside wide sleeves», inquadratura più stretta);
  - **il controllo visivo non vede tutto**: nella prova del 3 novembre ha mancato le macchie di fuliggine sul viso
    di Bice e lo scialle ancora addosso ad Adelina «senza scialle»; i casi da guardare restano in
    `stato_preparazione` («da controllare a mano»).
- **Server** (fatto il 2 novembre sera): riga «X sta parlando» sul proiettore, pannello del master (`/master`),
  `richiede.privata`/`da_pg`, `alias` dalle schede, `modi` e `mente_su[].id`, campagne con più scene, immagini di
  situazione dopo la rivelazione. Restano aperti:
  - Motore, proposte della prova cieca (descritte in `docs/repertorio.md`, «Proposte per il Motore»; il validatore e la
    skill sono pronti): `richiede.oppure`, `orologi[].parte_dopo`, battute solo dei PNG presenti nella scena;
  - in modalità A (improvvisa) gli indizi non hanno id: le situazioni escono solo a comando del master; e con le
    campagne a più sessioni è più urgente, perché il registro di fine sessione in modalità A non ha indizi,
    battute, menzogne né fatti noti (sezioni null, docs/strati.md): la sessione dopo si prepara solo da orologi,
    scene, azioni e trascrizione. Serve un modo di tracciare gli indizi anche in A (per esempio una riga
    `[indizio] <id>` del narratore, controllata dal Motore come `[orologio]`);
- ~~**Personaggi nascosti in scena** (richiesta 2 del 9 novembre): serve un campo `nascosto: true` sulla scheda del PNG
  per i presenti che non si mostrano sul proiettore né sul telefono finché non vengono rivelati (come le situazioni `dopo`).~~
  **Fatto**: `nascosto: true` sulla scheda, comando «rivela» dal pannello, validatore e schema (d59f7e2).
- ~~**Presenza decisa a mano dal master** (comando `presenza`): non sopravvive a un riavvio del server (si perde con lo stato
  in memoria); da salvare nel registro della sessione se serve. Si azzera anche al cambio di scena.~~
  **Fatto**: le decisioni vanno nella fotografia della sessione e tornano alla ripresa; il cambio di scena le azzera (a4e360d).

## Dopo
- **Lacune del set Basic Fantasy dalla e2e finale** (docs/e2e-finale.md §2 e §7, «dadi»; i bug di coerenza C1, C3, D1, A1,
  D2 sono chiusi, 11 novembre 2026):
  - validatore: rifiutare `parole_chiave` generiche (l'arbitro a regole le ignora già, `parole.generiche`) e
    segnalare una battuta che dà ciò che una prova chiude per un'altra strada di `oppure` (D2).
- **Setup su computer non Apple** (docs/profili.md, profilo `altro`). Il setup guidato da Claude Code (`.claude/skills/setup`)
  dice che lettore locale, voce locale e immagini locali non sono ancora supportati fuori dall'Apple silicon. Senza chiave
  Anthropic il narratore è quello a copione (prova, non partita vera). Da fare: un lettore locale su Linux/Windows (llama.cpp
  o Ollama con lo stesso protocollo), una voce locale (vedi sotto) e la generazione immagini (oggi solo mflux, Apple).
  Finché non c'è, il setup dice all'utente di scegliere la chiave Anthropic o il gioco a solo testo.
  **TODO (decided by the lead, setup):** a local LLM through Ollama or llama.cpp, on the same OpenAI-compatible API
  as the Mac reader (port 4613, `backend.locale.url`), and a light voice (Piper or Kokoro). Claude Code installs them
  only with the user's explicit permission, and the setup skill (`.claude/skills/setup/SKILL.md`) is where that step lives.
- **Voce locale fuori dal Mac.** Qwen3-TTS gira con MLX solo su Apple Silicon. Su Linux o Windows serve
  un'alternativa leggera con la stessa API del servizio voce (docs/f0-contratti.md, «Servizio voce»:
  POST /tts, PCM s16le in streaming). Da valutare: Piper (onnx, voci italiane, CPU) e Kokoro (82M, CPU o GPU).
  Qualità italiana: da verificare.
- **Limiti noti della modalità locale.** L'arbitro delle prove alla chiusura ha 4 s: in locale non ce la fa,
  nessun tiro. Gli arbitri cedono il server al lettore: in coda aspettano al massimo 8 s, poi ripiegano sulle regole.
- **Skill Preparatore: la voce espressiva di drama-3** (9 novembre 2026; da girare a chi aggiorna la skill, nessuno ha
  risposto). La voce del gioco è drama-3 (docs/ricerca-voce-drama3.md). Le righe del repertorio possono avere una
  direzione breve a inizio riga (`[png_ettore] [offeso, ma a voce bassa] Non venni.`), suoni (`[sigh]`, `[laugh]`,
  `[breath]`, `[pause]`) e tag chiusi nella stessa riga (`<whisper>…</whisper>`, `<emphasis>`, `<soft>`, `<fast>`,
  `<slow>`, `<stress>`, `<forceful>`); il validatore li controlla (classe `VOCE`: tag conosciuti e chiusi, direzioni
  sotto le otto parole e senza punti, al massimo tre segni per riga) e la prosa conta solo le parole. Le schede dei
  PNG possono fissare la direzione predefinita in `voce.tts.direzione`; la carta di stile quella del narratore in
  `direzione_voce`; senza, il server la compone da `personalita.superficie`, `voce.tts.timbro`, `eta_apparente` e
  `velocita`. Da aggiungere alla skill (SKILL.md, passo delle schede PNG e del repertorio): quando usare una
  direzione (cambi di tono veri: menzogne col loro segnale, confessioni, minacce), non in ogni riga, e mai per dire
  cosa provano i PG. Il `pronuncia` dei nomi resta com'è.

- **Motore: i limiti che oggi la campagna deve aggirare** (dalla prova di nozze-neve; la pagina
  `.claude/skills/preparatore/riferimenti/motore.md` li descrive ed è verificata sul codice da
  `strumenti/motore_limiti.ts`: quando uno cade, il test diventa rosso e la pagina si aggiorna). Da implementare:
  - **azioni private**: oggi rispondono solo le battute con `privata: true`; un'azione privata senza battute adatte
    dovrebbe avere almeno una risposta discreta sul telefono, non il silenzio o una risposta ad alta voce;
  - **`avanza_quando`**: il Motore lo carica e non lo usa; servirebbe in forma strutturata (cancelli come
    `richiede`: battute uscite, indizi rivelati → un segno), così l'orologio avanza per i fatti e non solo per il ritmo;
  - ~~salti d'orologio al cambio di scena~~: fatto il 9 novembre (`orologi_in_scena` della scheda scena:
    `pieni_almeno` e ritmo di scena); resta il «+1 a ogni cambio di scena», che oggi fa il master;
  - **finali per stato**: un modo di dire al Motore «la domanda drammatica ha risposta» (esiti della scena con i
    loro cancelli), invece di affidare i finali prima dell'orologio pieno ai temi;
  - **stato degli oggetti**: chi ha che cosa, almeno per gli oggetti con un id nella scena (`elementi_interattivi`);
  - ~~battute «per stato» senza `> pg`~~ per i finali: fatto il 3 novembre (a orologio pieno il finale e la chiusura
    li dice il Motore); il validatore non avvisa più (`COPERTURA.finale_senza_azione` è tolto: il Motore dice il finale da sé);
- **Selettore che non trova le battute** (playtest di nozze-neve, conclusioni §4; 115 battute su 139 mai uscite).
  Nel codice dal 9 novembre (commit 2597566, con prove unitarie): preselezione per `temi` dell'azione (con la voce
  giusta, al massimo due per azione, sezione «Battute indicate» nel messaggio) e «> pg» dedotto o corretto quando
  una sola azione può essere quella giusta. Da fare:
  - la misura prima/dopo con l'harness sugli stessi copioni (`esegui.ts nozze-neve/<copione> B --campagna nozze-neve
    --uscita correzioni-motore/<cartella>`, porta 4740), rimandata per il budget di token: confrontare quota
    pre-scritta, battute usate, `usa_rifiutati_per_motivo`, `battute_indicate_usate`, `pg_dedotti`;
  - decidere se il Motore deve far dire da sé un indizio indicato e ignorato: rigiocando i cataloghi il filtro per
    temi indica anche battute sbagliate (le regole del Custode per «prima della benedizione»), quindi oggi non lo fa;
  - la riparazione con una seconda chiamata per i [usa] rifiutati per altri motivi (fuori catalogo, ritmo).
- **Skill e validatore** (fatto il 2 novembre sera, dalle 26 note di `NOTE_SULLA_SKILL.md`): contesto vero del modo B
  compilato col server, cronologia e logistica (`MONDO`), voci simili (`simile_a`), passi riordinati con `--solo`,
  più scene, copioni con `scena` e `richiede`, immagini (`prompt_ritratto`, `nodi[].immagine`, `situazioni[].dopo`).
  Resta da provare: una seconda prova alla cieca con la skill nuova.
- **Custode dei segreti** (`esperimenti/giudizio-ab-2/conclusioni.md`): controllo sì/no per le battute che rivelano
  un segreto, quando si riprende la qualità della narrazione.
- **Filtri F1** (agency, battute riferite, lunghezza, canone, chiusura con invito): quando si riprende la narrazione,
  con le API definitive.
- **Voce**: in pausa fino alla fase finale, con un'API strutturata che permetta di regolare l'intonazione.
  Il codice del pre-render delle battute è pronto (`apps/server/src/strumenti/prerender.ts`).
- **Musica** (F5): prova di generazione locale (ACE-Step o Stable Audio 3 con login Hugging Face) o biblioteca CC0/CC-BY;
  allineare il vocabolario dei tag tra manuale §4 e architettura.
- **Telefoni veri in stanza**: HTTPS per il microfono (tunnel, mkcert o Tailscale), trascrizione con Whisper.
- **Set di regole: condizioni e sottosistemi** (docs/regole.md §6): oggi sono solo testo in regole.yaml (`condizioni`,
  `sottosistemi`). Il Motore non li applica: niente stato «prono», «spaventato», sanità o magia con i loro effetti sui
  tiri. Prima di farlo serve un set vero che li usi.

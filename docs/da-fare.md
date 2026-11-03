# Da fare (aggiornato il 2 novembre 2026, sera)

Lista viva delle cose aperte, con chi le ha in mano. Le decisioni prese sono nei documenti di progetto.

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

## Dopo
- **Motore: i limiti che oggi la campagna deve aggirare** (dalla prova di nozze-neve; la pagina
  `.claude/skills/preparatore/riferimenti/motore.md` li descrive ed è verificata sul codice da
  `strumenti/motore_limiti.ts`: quando uno cade, il test diventa rosso e la pagina si aggiorna). Da implementare:
  - **azioni private**: oggi rispondono solo le battute con `privata: true`; un'azione privata senza battute adatte
    dovrebbe avere almeno una risposta discreta sul telefono, non il silenzio o una risposta ad alta voce;
  - **`avanza_quando`**: il Motore lo carica e non lo usa; servirebbe in forma strutturata (cancelli come
    `richiede`: battute uscite, indizi rivelati → un segno), così l'orologio avanza per i fatti e non solo per il ritmo;
  - **salti d'orologio al cambio di scena**: un `pieni_all_inizio` per scena («la scena del terzo tocco comincia con
    l'orologio a 7»), oggi possibile solo tra le sessioni;
  - **finali per stato**: un modo di dire al Motore «la domanda drammatica ha risposta» (esiti della scena con i
    loro cancelli), invece di affidare i finali prima dell'orologio pieno ai temi;
  - **stato degli oggetti**: chi ha che cosa, almeno per gli oggetti con un id nella scena (`elementi_interattivi`);
  - **battute «per stato» senza `> pg`**: oggi senza un'azione legata passano solo il segno dovuto e i riempitivi allo
    stallo (`scena/regia.ts`, usaBattuta); un finale o una chiusura che entra nel catalogo a orologio pieno dovrebbe
    poter uscire anche senza un'azione (playtest di nozze-neve: il finale non è mai uscito).
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

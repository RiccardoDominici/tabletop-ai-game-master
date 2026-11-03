# Mestiere: come si progetta una campagna che regge dal vivo

Queste pagine raccolgono ciò che il manuale non dice e le prove hanno insegnato: la scena di prova
«Il pane dei lumi» (campagne/prova-f0), una revisione indipendente, due esperimenti A/B con giudice
cieco (esperimenti/giudizio-ab-1 e -2), e la prova cieca della skill con «Il ponte delle lanterne»
(campagne/ponte-lanterne, quattro scene, con le sue NOTE_SULLA_SKILL.md).

## 1. Situazione, non trama (A3, C3)
- Parti da **chi vuole cosa**. Il cattivo ha un piano che va avanti anche se i PG stanno fermi. Scrivi
  la cronologia «se i PG non intervengono»: è ciò che fa avanzare l'orologio.
- **Una verità nascosta, semplice da dire in una frase** («la febbre viene dal pane»), e difficile da
  provare davanti agli altri. Le prove sono oggetti, comportamenti, racconti: mai la parola di un solo PNG.
- **Un PNG sa la verità e non è creduto**: tensione buona. Deve però avere un motivo per non dirla tutta
  (paura, vergogna, un'altra colpa), altrimenti la scena si risolve al primo turno.
- **Il pericolo si sente da fuori**: voci, passi, campane. Un pericolo che si vede solo nei dialoghi non preme.
- **I conti del mondo tornano.** Nella prova cieca i quattro difetti più gravi erano conti: due viaggi che
  ci stavano tra due tocchi mentre la storia diceva «uno solo», una barca troppo piccola per i gruppi, una
  riga del libro datata prima del fatto che provava, una catena che funzionava al contrario. Scrivi la
  cronologia con le ore e la logistica con minuti e posti (schema.md), e fai rifare i conti al validatore.
- **La scelta resta difficile a verità scoperta.** Con tutte le prove in mano, la risposta non deve
  diventare ovvia: se una promessa o un PNG cancella il prezzo di una strada, la scelta è finta.

## 2. PNG ben delineati (§3, §6)
- **Tre registri diversi** tra i PNG di una scena: tu e i nomi di mestiere; tu e un lei freddo; lei a
  tutti. Più tre lessici (forgia, cucina, medicina) e tre lunghezze di frase. Prova: leggi le battute
  campione senza nomi e indovina chi parla.
- **Il «voi» singolare non va usato.** A voce sembra un plurale.
- **Voci registrate poche.** Due voci uguali o simili (`simile_a` in voci.yaml) non stanno mai nella
  stessa scena: decidilo al brief, perché decide chi può incontrare chi (§9, «Voci tra le scene»).
- **Ogni PNG vuole qualcosa in questa scena**, che lo mette contro un altro PNG o un fronte. Il desiderio si
  vede nelle battute: chiede, contratta, pone condizioni (D7). Non regala informazioni.
- **`sotto_pressione` cambia comportamento**, non intensità: «diventa calmo e lentissimo», non «si arrabbia di più».
- **Non dare a un PNG il potere di chiudere il climax** (D8). Al massimo tiene la folla sulla soglia
  «per il tempo di una risposta»: la prova la portano i PG.
- **`mai_dice`** contiene la parola chiave del suo segreto. Quando una regola vale solo fino a un certo
  momento, scrivi il momento: «il nome di X, finché non ha confessato».

## 3. Menzogne, segnali, cede_se (D6)
- La `versione` è breve, concreta, ripetibile, e sempre uguale.
- Il `segnale` è **un gesto fisico** visibile («si sistema il fazzoletto rosso e guarda le ceste»), diverso
  dal gesto abituale. Non deve contraddire l'aspetto: chi ha le braccia infarinate non «si pulisce le mani pulite».
- **`cede_se` è osservabile in una trascrizione.** «Un PG le mette in mano un chicco nero dei suoi sacchi»
  si vede; «quando si fida» no.
  - Più condizioni si uniscono con «Oppure».
  - La privatezza si definisce nella scena («chi sente cosa»). Poi va nella confessione come
    `richiede.privata: true`.
- **Una confessione per ogni condizione**, ognuna con il suo cancello strutturale (vedi repertorio.md §4).
  Il giudizio A/B n. 2 ha trovato confessioni uscite in pubblico: il `quando` da solo non le ferma.
- Una menzogna che cede quando qualcuno chiede «i nomi dei tre testimoni» deve davvero non avere nomi.
  Se il canone gliene dà uno, la condizione non scatta mai.

## 4. Indizi (C4, F3, A9)
- Per ogni conclusione chiave:
  - **almeno sette indizi** è un buon numero per la principale;
  - **almeno uno proattivo**: arriva da solo con la mossa morbida, per esempio il cane che trema;
  - **almeno uno per un PG specifico**: una preghiera, un incantesimo, una conoscenza privata.
- Un indizio si **descrive, non si conclude**: «sa di bruciato e tinge le dita, come la polvere di un
  braciere spento». La parola «carbone» la dicono i giocatori.
- Scrivi `come_si_trova` con i modi distinti (aprire un sacco; spezzare una pagnotta) e mettili in `modi`.
- **Ogni indizio fisico ha il suo vincolo pubblico** (`vincolo_pubblico`): che cosa percepisce chiunque, in
  una frase, senza il perché. Nel giudizio cieco di nozze-neve il campanaccio della Duchessa «suonava forte»:
  l'indizio era proprio che è muto, ma nessuno l'aveva detto al narratore, e i sensi della scena facevano
  suonare tutti i campanacci. Il vincolo («il campanaccio grande della Duchessa non suona») va al narratore e
  al selettore; il perché (dentro c'è l'anello) resta nel `come_si_trova`. Se anche il percepito è segreto,
  il vincolo dice che lo descrive solo la battuta («la pietra intorno al leone la descrive la battuta»). La
  scena non deve dire il contrario: sensi, descrizione ed elementi lo rispettano («tutti tranne quello grande»).
  Per gli altri fatti che l'improvvisazione tende a contraddire (chi ha la lettera, quanti fratelli ha la
  nonna) ci sono i `vincoli_pubblici` della scena, con le stesse regole.
- Due indizi nello stesso oggetto (il marchio sul sacco e i chicchi dentro) rendono la soluzione troppo
  rapida. Va bene se il climax regge lo stesso; altrimenti separali.

## 5. Orologio e ritmo (C2, T4, R10, R11)
- Sei segni per una scena di 20–30 minuti, con `segno_almeno_ogni: 2`.
- Ogni segno è una frase udibile o visibile e **aggiunge pressione**: il canto si interrompe, un sasso,
  un rintocco, le lanterne, la maniglia, i tre rintocchi.
- Un segno può aprire un'occasione: il nano va alla finestra e la grata resta senza orecchie per un momento (M9).
- Il climax converge: il pericolo, la verità e la scelta arrivano nello stesso momento.

## 6. La scelta che costa (R10, A4)
- La verità detta a tutti deve **costare qualcosa a qualcuno a cui i PG tengono**. Il silenzio deve
  costare altro. Esempio: la verità salva il forestiero, ma sposta la rabbia del paese sull'ostessa.
- Prevedi la «terza via», che i giocatori cercheranno sempre, e falle pagare un prezzo.
- **`al_completo` dell'orologio** dice che cosa vuole il pericolo e come reagisce a ogni risposta.

## 7. Scrivere per l'orecchio (§5)
- Testi letti: frasi di 8–14 parole in media, 16 al massimo, una idea per frase.
- Ogni luogo coinvolge un senso oltre la vista.
- Le parole forti vanno in fondo alla frase. Niente cifre, sigle, parentesi o puntini di sospensione.
- Attenzione a ciò che il validatore non sente:
  - un pronome ambiguo («dietro, qualcuno tossisce»);
  - un verbo che si legge in due modi («si alza dal forno» suona come «esce dal forno»);
  - due frasi di fila con lo stesso attacco.
- Le frasi brevissime una dopo l'altra rendono il ritmo piatto: alterna, e unisci i gesti in una frase.
- Dal vivo ogni azione pubblica arriva annunciata («Brann solleva il coperchio.», manuale N15): l'annuncio
  lo improvvisa il narratore, con il nome del PG e solo ciò che il giocatore ha scritto. Le battute scritte
  prima quindi non nominano i PG e partono dall'esito; il budget di parole del turno include gli annunci,
  e anche per questo le battute restano brevi.

## 8. Lezioni delle prove, in breve
| Errore trovato | Regola |
|---|---|
| Il narratore conclude al posto dei PG («non è veleno, è carbone») | gli indizi descrivono; le regole di prosa vietano la parola-soluzione |
| Battute dei PNG riferite dal narratore | ogni parola di un PNG con scheda nella sua riga |
| Il selettore riempie i turni con battute disponibili (A/B 1) | solo ciò che conta è selezionabile; esempi e riempitivi; temi distintivi |
| Il cane e la borsa ripetuti tre volte | riempitivi solo allo stallo; anti-ripetizione |
| PNG muti davanti a una domanda | esempi di voce per ogni PNG, così l'improvvisazione ha un modello |
| Orologio fermo per cinque turni | segni come battute, `segno_almeno_ogni`, Motore che li impone |
| Confessione in pubblico di un segreto «in privato» (A/B 2) | `richiede.privata`, `da_pg`, indizi: cancelli strutturali |
| Id `seb_cicatrice_…` e `quando` con «botola» | il selettore legge id e quando: nessun segreto lì |
| La cicatrice nel ritratto: sul proiettore dal primo turno | tratti nascosti solo in `aspetto.situazioni` |
| La scena non regge senza un PG preciso | situazione comune senza nomi, ruoli di riserva (se manca la chierica benedice il massaro) |
| Un PNG «sa la soluzione» e la grida al primo turno | baratta: chiede acqua, una promessa, la porta aperta |
| Canone contraddetto tra due testi | un fatto, un id, citato ovunque |
| Due viaggi ci stavano tra due tocchi; barca piccola per i gruppi; riga datata prima del fatto (prova cieca) | cronologia e logistica, rifatte dal validatore (`MONDO`) |
| La regola «il narratore non dice mai che il leone è stato calato» era il segreto, nel contesto del selettore | regole di prosa generiche; il divieto preciso nel `come_si_trova` |
| Pianta, taglio e abbozzi con segreti, non controllati; `da_togliere_dal_contesto` solo dichiarato | il validatore compila il contesto vero del modo B |
| Bice (tabitha) portata nel Borgo di Rosa (nadine) da desiderio, soluzione, battuta e taglio | voci simili come dato, cercate in ogni testo che sposta un PNG |
| «Tullio, il custode, grida»: il narratore sembra chiamare Tullio | niente nome con la virgola a inizio frase |
| «sa del leone» trovava «Rosa del leone» | regex con `\b` |

## 9. Più scene (sessioni di due o tre ore)
Il server gioca una scena alla volta; il master passa alla successiva dal pannello. Ogni scena ha il suo
contesto, i suoi PNG presenti e i suoi orologi attivi; lo stato (indizi, battute uscite, orologi) resta.

- **Orologio di sessione.** Un pericolo che preme per tutta la sessione ha un orologio da otto segni,
  attivo in tutte le scene in cui si sente. Un turno dura un paio di minuti (sei segni ogni due turni
  riempiono mezz'ora), quindi `segno_almeno_ogni` ≈ minuti della sessione ÷ (2 × segmenti): per due ore
  e mezza e otto segni, circa nove; meno se anche i cambi di scena portano un segno. Con 2 l'orologio si
  riempirebbe nella prima mezz'ora. Una scena breve dentro la sessione può avere un orologio suo, da sei
  segni con `segno_almeno_ogni: 2`.
- **Segni che si sentono ovunque.** Un segno di un orologio attivo in più scene esce in qualunque di esse,
  quindi si sente da tutte: la campana, la voce del fiume, le grida dal ponte. «La rampa bassa va
  sott'acqua» non si vede dal Borgo. La battuta del segno non ha `scena` [V].
- **Lo stesso luogo in due momenti.** Il ponte all'imbrunire e il ponte a mezzanotte sono due schede.
  La seconda ha come nodo un evento («Il terzo tocco»), con un suo indizio proattivo. Un indizio si
  definisce in una scheda sola; le sue battute non hanno `scena`, così restano trovabili anche dopo.
- **Orologi che partono da una scelta.** Un orologio che deve correre solo dopo una scelta («il ponte
  resta aperto dopo il tocco») dichiara `parte_dopo: [<id della battuta della scelta>]`. Il server non
  lo applica ancora: fino ad allora scrivi la condizione anche in `avanza_quando` e chiudi il primo segno
  con `richiede.battute_usate`, e metti l'orologio solo tra gli `orologi_attivi` della scena in cui la
  scelta si fa, così il ritmo minimo non chiede segni prima del tempo.
- **Cancelli con «oppure».** Una battuta che vale «se i PG hanno una qualunque delle tre prove» ha
  `richiede.oppure` (repertorio.md §4), o un indizio cerniera che tutte le prove rivelano. Un finale con
  più cancelli è fragile: rileggilo per ogni via.
- **Voci tra le scene.** Il Motore non elenca le battute di un PNG assente dalla scena in corso. Restano i
  testi che lo spostano: desiderio, iniziative, evoluzione, soluzioni dei colli di bottiglia, taglio, esiti.
  Se due PNG hanno voci simili, cercali: il validatore avvisa di ciò che trova; i casi voluti si
  giustificano in autovalutazione.
- **I nodi noti.** Un luogo che i PG conoscono dall'inizio (la chiesa del paese) ha `noto_ai_pg: true`:
  non serve scoprirlo con tre indizi.

## 10. Musica, ambienti e temi (docs/audio.md)
La pipeline dell'audio ricava tutto dai campi pubblici: di solito non serve scrivere niente. Guarda la sua
deduzione con `genera_audio.py --dry-run` e correggi con i campi di schema.md («Audio») solo ciò che non va.

- **L'umore viene dalla domanda della scena, non dall'arredo.** `musica.tag` (e `audio.umore_iniziale`)
  dice che cosa sente il tavolo: un'osteria dove si cerca un colpevole è `esplorazione_tesa`, non
  `taverna_calda`. Un solo cambio d'umore a scena, nel punto di svolta della `transizione`.
- **Gli ambienti sono ciò che si sente da fuori**, gli stessi suoni dei `sensi` e dei segni dell'orologio:
  la pioggia, il fiume in piena, la folla alla porta. Due o tre strati per luogo, quello che porta il
  pericolo più forte. Niente che contraddica la scena: niente acqua che scorre dove è ghiacciata, niente
  grilli d'inverno, niente folla in una stanza chiusa a chiave.
- **Gli effetti sono colpi che il narratore nomina**: il rintocco, la porta, la catena. Se un oggetto conta
  per il climax, nominalo nei sensi o negli elementi, così la pipeline lo trova.
- **Il tema di un PNG nasce dalla sua persona pubblica**: lettura d'aspetto, personalità di superficie e
  sotto pressione, voce, timbro. Mai dalla menzogna, dal segreto, dal ruolo nella trama: un tema
  «sinistro» per il PNG che mente dice al tavolo chi cercare prima che lo scopra. Il bugiardo cordiale
  suona cordiale; il modo frigio non va a chi mente.
- **I temi della campagna si somigliano**: sono variazioni di un solo motivo (`stile.audio.motivo`, o
  quello generato). Scrivi il motivo solo se ne hai uno migliore: da quattro a dodici note, per gradi
  vicini, che chiude lungo sulla tonica o sulla quinta.

# Note sulla skill del Preparatore (prova del framework con «Le nozze di neve»)

Ogni voce: che cosa era poco chiaro, contraddittorio o mancante nella skill
(`.claude/skills/preparatore/`) o nella pipeline, e che cosa ho scelto. Le scrivo mentre lavoro,
nell'ordine in cui le incontro; in fondo, i tempi e la classifica dei problemi più gravi.

## Passo 0 e brief

1. **Il brief vuole «nessun velo», il validatore vuole una lista di veli non vuota.** Il brief di
   Riccardo dice «Veils: none required»; `schema.md` dice che `linee` e `veli` sono «liste non vuote [V]».
   La skill dice di prendere i veli del brief «più quelli che la storia rende necessari», ma non dice che
   cosa fare se il brief non ne vuole. *Scelta*: un velo che la storia giustifica davvero (i lutti delle
   due famiglie: il marito di Adelina e la moglie di Ettore si nominano, non si raccontano), scritto nel
   brief con il motivo.

2. **`giocatori` nel modello del brief è un numero (`giocatori: 3`), il brief dice «3–5».** Il commento
   del modello ammette «3-4» come testo. *Scelta*: la stringa «3-5», e sei PG (uno più del massimo).

3. **Il vincolo delle voci decide la forma della storia, ma la skill non dice come trattare un PNG
   importante che non può avere voce.** Con nadine e tabitha mai insieme, la nonna (nadine) e la
   ragazza (tabitha) non possono stare nella scena del climax insieme; e la sposa, che è il cuore delle
   nozze, non ha una voce libera. *Scelta*: un'usanza pubblica che rende muta la sposa fino al sì (una
   comparsa che mima, senza scheda), e un'altra che tiene a casa la più giovane durante la benedizione.
   Funziona, ma è un trucco di sceneggiatura imposto dal registro delle voci: con quattro voci, ogni
   campagna dovrà inventarne uno. La skill potrebbe dirlo esplicitamente («i PNG senza voce sono comparse:
   parlano per bocca del narratore, in discorso indiretto, e vanno bene per chi conta ma parla poco»), e
   dire se D1 («il narratore non riassume ciò che dice un PNG importante») vale anche per una comparsa
   importante.

## Passi 1–4

4. **Il passo 3 chiede `--solo …,MONDO` a zero errori, ma la forma dei documenti in schema.md mostra il
   campo `indizio`, che al passo 3 non può esistere.** La skill lo dice tra parentesi («il legame
   `indizio` lo aggiungi al passo 5»), lo schema no: scritto il blocco dallo schema, escono sei errori
   `MONDO.riferimento`. *Scelta*: tolto `indizio` dai documenti al passo 3, rimesso al passo 5.

## Passi 5–8

5. **Il cognome di famiglia fa scattare l'avviso delle voci simili.** `regole_scena.nomina` cerca ogni parola
   maiuscola del `nome` di un PNG, cognome compreso. Adelina e Zelia sono tutte e due Bonfanti (nadine e
   tabitha): ogni «casa Bonfanti», «la stalla dei Bonfanti», «la storia dei Bonfanti» in una scena o in un
   collo di bottiglia diventava «nomina Zelia Bonfanti», quindici avvisi falsi al primo giro. Nessuna
   regola della skill dice di evitare cognomi comuni tra PNG di voce simile, e in una storia di famiglie
   è la norma. *Scelta*: `nome` senza cognome per Adelina e Zelia («Adelina», «Zelia»); il cognome resta nel
   canone. Restano gli avvisi veri (descrizioni che dicono che l'altra è altrove), riformulati.

6. **Il passo 5 chiede di scrivere gli indizi delle scene, ma metà degli indizi nascono al passo 7.**
   Scrivendo le menzogne (`cede_se`) sono nati due indizi nuovi (l'alibi di Bastiano, il perdono di
   Adelina) e sono cambiati i `modi` di cinque indizi PNG: ogni condizione di `cede_se` è un modo di
   trovarli. La skill mette gli indizi al passo 4–5 e i `cede_se` al passo 7, ma i due si progettano
   insieme. *Scelta*: sono tornato alle schede scena al passo 7. Sarebbe utile una riga: «gli indizi di
   tipo png hanno tanti modi quante sono le condizioni del `cede_se` che li rivela».

7. **Un PG musicista contro i sensi della scena.** I sensi della casera dicevano «una fisarmonica che
   zoppica», e un segno della lite «la fisarmonica si ferma»: ma la fisarmonica è di Nando, un PG. Il
   narratore avrebbe deciso che cosa fa la fisarmonica di un giocatore (N7). Nessun controllo lo trova, e
   la skill non avverte che i sensi, i segni e le mosse morbide non devono toccare oggetti o azioni dei PG.
   *Scelta*: il violino del paese, una comparsa.

## Passi 9–11

8. **I segni d'orologio con una battuta di PNG.** Un segno dice «lo zio chiama Zelia» o «Ettore grida ai
   suoi»: o il narratore riassume un PNG importante (contro D1), o la battuta del segno ha una riga
   `[png_…]`, che dà l'avviso `REPERTORIO.righe` (riga di PNG in una battuta del narratore). La skill non
   dice quale delle due è giusta. *Scelta*: segni solo di gesti visibili; i PNG parlano nelle loro battute.
   Resta un avviso voluto sul finale della terza via, dove parlano i due vecchi.

9. **«Oppure» nei cancelli moltiplica le battute.** La lettera chiusa arriva per due strade (Ettore la dà,
   o un PG la prende dalla giacca), e Adelina cede per tre (le due lettere, il ricordo di Tilde): senza
   `richiede.oppure` sono cinque battute con lo stesso testo, più due per la lettura dei PG. Il trucco che
   tiene in piedi il climax è un indizio-cerniera (`i_adelina_neve`) rivelato da tutte e tre le confessioni,
   e un solo cancello `indizi_rivelati` sulla battuta del Sasso. La skill potrebbe insegnarlo: «quando
   una battuta dipende da una qualunque di più strade, fa' rivelare a tutte le strade lo stesso indizio».

10. **Id e `quando` che dicono il segreto, senza parole segrete.** Il validatore cerca le regex nel
   catalogo, ma non legge gli id come li legge il selettore: `zel_presa_macchia` («Zelia presa»),
   `gas_vide_alibi` («Gaspare vide»), `ade_verita` («Adelina dice la verità», quindi la leggenda è falsa),
   `ett_neve_versione` con «perché sessant'anni fa non salì al Sasso» (cioè: era lui il Morlacchi della
   storia, e doveva salire). Li ho trovati solo leggendo `contesto_modo_b.ts --catalogo`. *Scelta*: id
   neutri (`ade_sasso_a/b/c`, `zel_macchia_privato`…) e `quando` riscritti. La skill dice «niente segreti
   nell'id» ma gli esempi sono solo di parole; potrebbe dire «leggi ogni id come una frase».

11. **Il catalogo statico è il caso peggiore, e il validatore lo sa ma non lo dice.** Le righe chiuse da un
   cancello che rende pubblico il segreto (per esempio «la lettera presa dalla giacca», dopo che è uscita
   la battuta della giacca) passano il controllo `SEGRETI`, ma nel catalogo statico stampato dallo
   strumento compaiono lo stesso, e chi legge non sa quali righe il Motore mostrerebbe prima del cancello.
   Un segno («[chiusa]») accanto alle righe con `richiede` aiuterebbe la lettura del passo 10.

12. **La deduzione dell'audio sbaglia in modi che i campi non correggono del tutto.** La casera (commedia)
   prendeva una musica «Dark, Eerie»; lo strato `stalla` delle fonti sono oche in volo; `campane` sono
   campane di chiesa (in casa Bonfanti ci sono campanacci); il Sasso all'aperto è dedotto «dentro», e non
   c'è un campo per dire «fuori». *Scelta*: `audio.musica` con parole libere (humorous, mysterious) e
   `audio.ambiente` espliciti; il «dentro» del Sasso resta.

13. **`genera.py --dry-run` dice «manifest: …/immagini/manifest.json» ma non lo scrive.** Va bene così, ma la
   riga sembra un file creato: a un primo sguardo pensavo che la prova a secco avesse reso la campagna
   «pronta». Il dry-run dell'audio lo dice meglio («manifest sarebbe …»).

## Passo 12

14. **Il README dei copioni è ancora quello di prova-f0, e non dice dei segni di scena.** Il passo 12 dice
   «con la forma di `esperimenti/copioni/README.md`», ma quel file descrive solo `{pg, azione}` e il confine
   di lettura di prova-f0; non dice che `copioni.py` legge `scena:` in cima e `- {scena: <id>}` tra i turni,
   né `privata: true` sulle azioni. Il subagente cieco non poteva saperlo (e non conosce gli id delle
   scene). Senza segni di scena la misura gira tutta nella prima scena: le battute di Zelia, che sta solo a
   casa Bonfanti, non entravano mai. *Scelta*: ho aggiunto io i segni di scena dopo la scrittura cieca, con
   una riga di commento, senza toccare le azioni. Il tavolo dei copioni si divide spesso (una domanda a
   Zelia e una ad Adelina nello stesso turno), e un turno ha una scena sola: la misura resta approssimata.

15. **I copioni trovano un buco che la tabella di copertura non chiede: le comparse importanti.** Il copione
   cieco parla a Tonio, lo sposo, cinque volte su dodici turni (l'aggancio di Ida è lui), e alla sposa
   quattro. La tabella del §8 chiede battute per ogni PNG con scheda, non per le comparse che i giocatori
   cercheranno. *Scelta*: due battute del narratore per Tonio (una con il cancello `da_pg` di Ida). La
   tabella potrebbe dire: «per ogni comparsa nominata in un aggancio o in una situazione comune, almeno
   una battuta del narratore».

## Passi 13–16

16. **La lettura ad alta voce e la revisione trovano cose diverse, e la lista del passo 13 manca di due.**
   Rileggendo ho trovato il meccanismo del climax al contrario (Ettore metteva l'anello, ma la regola dice
   «nessun altro») e una lettera letta dal narratore in prima persona («tuo fratello…»), che al tavolo suona
   rivolta a un PG. La seconda non è nella lista (che ha il «voi» singolare e il vocativo, non le citazioni
   in prima o seconda persona dentro una battuta del narratore). Il revisore ne ha trovate altre tre dello
   stesso tipo che io avevo lasciato («di mia madre», «la scrivo io»). *Proposta*: una riga al passo 13,
   «lettere, diari e canzoni letti dal narratore vanno in discorso indiretto».

17. **Il controllo del passo 1 non basta a vedere un premio travestito da prezzo.** Il mio prezzo della terza
   via («Adelina perde la voce, che passa a Zelia») passava tutti i controlli del passo 1 (due esiti con un
   prezzo, nessuna prova lo cancella), ma era ciò che Zelia voleva: un premio. Il revisore l'ha visto subito.
   *Proposta*: al passo 1, «il prezzo di ogni strada pesa su qualcuno che non lo desidera: se qualcuno al
   tavolo lo vorrebbe, è un premio».

18. **Il revisore legge il codice del Motore, la skill no.** Tre dei cinque problemi gravi venivano da come il
   server applica le regole: le battute senza cancello non rispondono alle azioni private (`condizioni.ts`),
   `avanza_quando` non è applicato (`orologi.ts`), i finali escono solo a orologio completo. Nessuno di questi
   è nella skill o in `riferimenti/repertorio.md`, che dicono il contrario per omissione («le battute senza
   cancello rispondono solo alle azioni pubbliche» c'è in docs/repertorio.md, ma non tra le regole della skill
   né nella tabella di copertura). *Proposta*: una sezione «ciò che il Motore non fa» nella skill: azioni
   private, `avanza_quando`, salti d'orologio ai cambi di scena, stato degli oggetti.

19. **Gli id «_versione» delle menzogne dicono al selettore chi mente.** È il modello stesso della skill:
   `ott_segale_versione` in docs/repertorio.md, `vis_leone_versione` in ponte-lanterne. Il Motore rende neutro
   il `tipo` («risposta»), ma l'id resta nel catalogo. *Scelta*: id neutri (`ade_da_dove`, `gas_chi_cera`).
   La skill dovrebbe cambiare l'esempio.

20. **Le regole cambiano durante la prova.** A metà lavoro il modello del brief ha preso il campo obbligatorio
   `sessioni` e il validatore la classe `LIVELLO` (commit 8fcfe18); `schema.md` dice ancora che
   `richiede.oppure` «oggi è un errore», ma il validatore lo accetta dal commit a4b4fbc e docs/repertorio.md
   dice che il server lo applica. Ho seguito la skill letta all'inizio (copie con `battute_non_usate`,
   nessun `oppure`) e aggiunto `sessioni: 1` quando è comparso l'avviso. *Proposta*: schema.md allineato al
   validatore, e una data di versione in cima alla skill.

21. **Le immagini sono partite mentre la campagna cambiava.** Un'altra generazione (non mia) ha fatto i luoghi
   e tre ritratti alle 10:37–10:47, durante le correzioni del passo 14: `luogo_scena_casa_bonfanti.jpg` viene
   dal prompt vecchio. `genera.py` salta i file che esistono, quindi non lo rifarà da solo, e `prepara.sh` lo
   considera fatto. *Proposta*: il manifest delle immagini tenga il prompt, e `prepara.sh` rigeneri un'immagine
   il cui prompt è cambiato (come fa già l'audio con i descrittori delle schede).

22. **`prepara.sh` dice «pronta da giocare: sì» con due brani essenziali mancanti e dodici immagini da fare.**
   Il criterio della skill (esistono `immagini/manifest.json` e `audio/manifest.json`) è soddisfatto da un
   manifest parziale: quello delle immagini l'ha scritto la tornata altrui con 6 immagini su 18, quello
   dell'audio c'è anche se i brani della casera e di casa Bonfanti sono falliti (incompetech.com non risolve il
   DNS; tutti e tre i candidati di ogni luogo venivano da lì, senza un'altra fonte di riserva). Il rapporto
   elenca bene ciò che manca, ma la riga finale e l'uscita 0 dicono il contrario. *Proposta*: «pronta» solo
   senza mancanti essenziali, e un candidato da un'altra fonte (o dalla cache) quando una fonte è giù.

## Tempi, a grandi linee (dall'orologio dei comandi e dai commit)

| Passo | Tempo |
|---|---|
| 0, lettura (manuale, riferimenti, esempi, parti del validatore e del server) | 14 minuti |
| 1, situazione e progetto (scelta del segreto, della scelta e delle voci) | 14 minuti |
| 2–4, stile, canone, orologi, rivelazioni, nodi, sessione, cronologia | 8 minuti |
| 5, schede delle tre scene | 4 minuti |
| 6–8, PG, PNG, primo giro a zero errori | 6 minuti |
| 9–11, repertorio (128 battute), parole segrete, lettura del contesto B, immagini e audio a secco | 21 minuti (copioni ciechi in parallelo, un minuto e mezzo) |
| 12, rigoroso e copioni | 2 minuti |
| 13, lettura ad alta voce | 3 minuti |
| 14, revisione indipendente (16 minuti del subagente) e correzioni | 28 minuti |
| 15, README, autovalutazione, note | 5 minuti |
| 16, `prepara.sh --senza-immagini` (due giri da circa tre minuti) | 8 minuti |

## I cinque problemi più gravi della skill e della pipeline

1. **La skill non dice che cosa il Motore non fa** (nota 18): azioni private senza battute, `avanza_quando` e
   salti d'orologio non applicati, finali solo a orologio pieno, stato degli oggetti solo nella trascrizione.
   Tre dei cinque problemi gravi della revisione venivano da qui.
2. **La segretezza del modo B passa per id e `quando`, che il validatore non legge come frasi** (note 10, 11,
   19): `zel_presa_*`, `ade_verita`, e il suffisso `_versione` degli esempi della skill stessa dicevano al
   selettore chi mente e chi ha preso l'anello.
3. **Il controllo della scelta del passo 1 si supera con un premio travestito da prezzo** (nota 17): solo la
   revisione l'ha visto.
4. **Gli asset non seguono la campagna** (note 13, 21, 22): immagini fatte da un prompt superato e mai
   rifatte, «pronta da giocare» con dodici immagini e due brani essenziali mancanti, nessuna fonte di riserva.
5. **Strumenti e documenti fuori passo tra loro** (note 4, 14, 20): il README dei copioni non dice dei segni di
   scena né di `privata`; `schema.md` dice che `oppure` è un errore e il validatore lo accetta; il modello del
   brief ha cambiato un campo obbligatorio durante la prova.

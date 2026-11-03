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

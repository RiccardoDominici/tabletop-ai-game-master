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

# Preparatore: esempi in italiano

Questo file contiene gli esempi di stile del Preparatore quando la campagna è in italiano (`lingua: it`).
`.claude/skills/preparatore/SKILL.md` rimanda qui ogni volta che un esempio serve. Le regole di prosa
(frasi, cliché, numeri in lettere, voce e tono) stanno in `lingue/it/prosa.yaml`: questo file dà gli esempi,
quello le regole.

Gli esempi sono illustrativi: non copiarli in una campagna nuova. Le parole e le forme che il validatore
legge (misura delle frasi, parole vietate nel `quando`, connettivi di `cede_se`, indizi di privatezza) sono
quelle elencate qui sotto: sono vincolate al validatore (`strumenti/valida/`), non alla storia.

## Identificatore della campagna (passo «Il brief»)

- Esempio: `il-ponte-dei-sospiri`.

## Stile e tono (passo 2)

- Esempio di regola di prosa: «il narratore descrive ciò che si vede e non dice mai la causa: la conclusione la
  tirano i PG».
- Divieto preciso, nel `come_si_trova` dell'indizio principale: «il narratore non chiama mai veleno il pane».

## Orologi e meccanismo del climax (passo 3)

- Segno d'orologio, in ordine crescente di pericolo, con il momento decisivo nell'ultimo: «catena alzata: il ponte
  è chiuso».
- La riga per stato del meccanismo: «catena alzata: il ponte è chiuso».

## Scelta finale (passo 1)

- Premio travestito: nella prova di nozze-neve «Adelina perde la voce, che passa a Zelia» era ciò che Zelia voleva.
  Il prezzo va su chi non lo vuole.

## Privatezza e `cede_se` (passi 5 e 7)

- Indizi di privatezza che il validatore riconosce (`CEDE_PRIVATO` in `strumenti/valida/costanti.py`): «privat»,
  «non può sentire» / «non puo sentire», «non sente», «da solo a solo», «sottovoce», «lontano dalle orecchie»,
  «senza testimoni». Scrivi la condizione con una di queste forme, oppure «dove X non sente», come la definisce
  la scena.
- Connettivi delle condizioni di `cede_se` (`regole_repertorio.py`): «oppure», «cede anche».
- Nei nomi e negli agganci dei PG niente segreti: una gilda «dell'Onda» svelava l'onda scolpita.

## Alias dei PNG (passo 7)

- I soprannomi che useranno i giocatori, mai parole generiche come «vecchio» o «ragazza» (il validatore le
  segnala come nomi generici).

## Misura delle frasi in `voce.stile` (passo 7)

- Forme lette dal validatore (`massimo_da_stile` in `strumenti/valida/testo.py`): «Frasi di due-sei parole»,
  «di 3-8 parole», «da tre a otto parole», «al massimo sei parole». Il validatore ne ricava il tetto per le battute
  del PNG.

## Parole vietate nel `quando` (passo 9 e regola 1)

- Il `quando` non dice chi mente, nasconde o confessa. Il validatore (`QUANDO_VIETATE` in
  `strumenti/valida/costanti.py`) cerca le radici: mente / menti / mentire / mentisce / mento / menzogna,
  bugi-, menzogn-, confess-, segret-, nascond-, «verità».
- Nelle `id` delle battute il validatore cerca anche: versione, vero, vera, verità, bugia, mente, confessa,
  segreto, falso, colpa, ladro, nasconde, rivela, smaschera (`ID_RIVELATORI`).

## Voce nelle righe (passo 9)

- Direzione tra quadre, dopo l'etichetta, breve: `[png_bruno] [offesa, a bassa voce] Non toccare quella porta.`
- Sussurro chiuso nella stessa riga: `<whisper>…</whisper>`.

## Parole segrete (passo 10)

- Riga del catalogo da leggere come frase: «zel presa macchia» dice chi è stato.

## Lettura ad alta voce (passo 13)

- Nome seguito da virgola a inizio frase, che suona come il narratore che chiama qualcuno: «Tullio, il custode,
  grida» → «Dal casello il custode, Tullio, grida».
- «Voi» singolare che sembra plurale.
- Accordo di genere verso un PG ignoto: «sei pronto».
- Battuta che cita ciò che solo un'altra battuta facoltativa ha introdotto: «Il mulo, no.».
- Lettere, diari e canzoni letti dal narratore in discorso indiretto: «tuo fratello…» suona rivolto a un PG.

## Battute e annunci (regola 6)

- Annuncio dell'azione con il nome in terza persona, prima della battuta: «Brann solleva il coperchio.».

## Tipografia

- Citazioni con le virgolette caporali «…». Puntini di sospensione e parentesi vietati nelle battute (regola 8).

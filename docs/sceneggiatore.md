# Lo sceneggiatore

Con il profilo tutto locale il lettore è un modello piccolo che **non scrive prosa**. Per ogni azione sceglie una
battuta del repertorio, oppure risponde «nessuna» (`apps/server/src/llm/minimo.ts`). Prima, a «nessuna» il tavolo
sentiva solo l'annuncio e, se c'era, una battuta d'attesa. Lo sceneggiatore chiude il buco: **Claude Code dice
esattamente cosa dire, il modello piccolo legge**. Usa l'abbonamento di chi gioca, attraverso Claude Code in
modalità non interattiva (`claude -p`), nel progetto dell'utente: mai l'API diretta, mai un token OAuth usato per
chiamate dirette.

## Quando lavora
- **Dopo ogni turno, in sottofondo**, mentre i giocatori parlano. Il turno non ha scadenza, quindi il tempo c'è.
  Il server scrive due tipi di richiesta:
  - `subito`: per ogni azione pubblica a cui il lettore non ha dato una battuta. Vale come «nessuna» anche una
    risposta fatta di sola battuta d'attesa (riempitivo). La risposta è UNA battuta, quella che il tavolo aspetta;
  - `prossime`: 6 battute per le azioni più probabili del turno dopo, una per ogni PNG presente.
- **Una richiesta alla volta**: prima le `subito`, la più vecchia; poi la `prossime` più recente. Quelle più vecchie
  si saltano, perché la scena è già andata avanti.
- **Modelli**: le `subito` con sonnet. «lettore» ha misurato `claude -p`: una battuta in ~4 s con sonnet, ~7,5 s con
  haiku, e sonnet la scrive anche meglio; il tavolo la sta aspettando. Le `prossime` vanno con haiku, perché nessuno
  le aspetta e consumano meno quota. Le variabili `CANTASTORIE_SCENEGGIATORE_MODELLO_SUBITO` e `_PROSSIME` li
  cambiano. Il lettore locale dice «nessuna» circa una volta su due, quindi lo sceneggiatore è la fonte principale
  della prosa. Per questo le `subito` passano sempre davanti, e ogni PNG ha la sua battuta d'attesa.
- **Azioni private**: anche loro. La risposta va al telefono di quel PG (esito privato, voce `solo_pg`), mai in
  trascrizione. Se arriva tardi, resta nel repertorio col cancello `privata: true`: risponderà solo a un'azione
  privata.
- Solo quando il lettore è il minimo e il processo dello sceneggiatore gira (`vivo.json` recente). Il server non
  aspetta mai lo sceneggiatore per andare avanti.

## Che cosa legge
La richiesta (`apps/server/src/sceneggiatore/protocollo.ts`) porta:
- la scena e i PNG presenti;
- l'azione da risolvere (`subito`);
- le ultime 30 righe che il tavolo ha sentito;
- lo stato: indizi rivelati, fatti noti, battute già uscite, orologi.

Il processo aggiunge dai file della campagna:
- il contesto del narratore del modo B (schede pubbliche dei PNG con voce, registro, `mai_dice`, scena; niente
  segreti, `repertorio/contesto.ts`);
- l'elenco delle parole segrete, da non dire;
- tre battute della scena, come esempio del formato.

Il set di regole non serve: lo sceneggiatore non decide esiti né tiri, perché quelli li fa il Motore delle prove.

## Che cosa scrive
Battute nel formato del repertorio (docs/repertorio.md): `id` col prefisso dato, `chi`, `tipo`, `quando`, `temi`,
`testo`. Solo `reazione`, `momento`, `richiesta`, `rifiuto`, `saluto`, da una a tre righe, frasi brevi per la voce.

## Il controllo (`sceneggiatore/valida.ts`)
Le stesse regole del repertorio preparato, più quelle di chi scrive al volo:
- **forma**: il caricatore del repertorio legge le battute come un file qualsiasi (campi, tipi, etichette, PNG con
  scheda). Il Motore impone `scena` = quella in corso e `max_usi: 1`, e corregge un `id` senza prefisso o ripetuto;
- **voci**: parla solo il narratore o un PNG presente;
- **cancelli e stato**: niente `richiede` né `effetti`. Una battuta scritta al volo non rivela indizi e non cambia
  fatti né orologi: le rivelazioni restano quelle preparate e controllate dal validatore;
- **tipi**: mai indizi, confessioni, menzogne, segni, finali, transizioni, chiusure;
- **segreti**: nessuna parola ancora segreta che il tavolo non abbia sentito (la stessa regola della guardia,
  `narrazione/guardia-segreti.ts`);
- **i PG sono dei giocatori**: una riga del narratore che ha un PG per soggetto («Gunda apre il pugno», «Poi Remo si
  alza») decide al posto di un giocatore, e la battuta esce (`pgCheAgisce`). Il vocativo («Gunda, …»), il
  complemento e il genitivo vanno bene;
- **voce**: al massimo 4 righe da 240 caratteri.

Le battute che passano entrano **a caldo** nel repertorio vivo, e da lì nel catalogo dei turni dopo, coi loro
`temi`. Quelle che non passano restano nel log col motivo.

## Che cosa sente il tavolo mentre aspetta
1. Subito, al turno: l'annuncio e la battuta d'attesa della scena o del PNG. La skill la scrive sempre e il
   validatore la chiede (`COPERTURA.attesa_scena`, `attesa_png`, `deviazione_png`).
2. Quando arriva la battuta scritta su richiesta, se il tavolo è ancora in finestra nella stessa scena e il
   **tetto** non è passato (90 s, `CANTASTORIE_SCENEGGIATORE_TETTO_S`): la voce la dice subito, a finestra aperta,
   e la trascrizione la mostra.
3. Oltre il tetto, o se il tavolo è andato avanti: non si dice. Resta nel repertorio, dove il lettore la può
   scegliere al turno dopo. Se lo sceneggiatore non risponde, è la **riserva**: è valsa la battuta d'attesa.

## Processi e file
- `scripts/sceneggiatore.sh avvia|ferma|stato`. Lo avvia `scripts/avvio.sh`, quindi anche `partita.sh` e l'harness,
  se `claude` è installato e il narratore non è finto (`CANTASTORIE_SCENEGGIATORE=no` lo spegne). Lo ferma
  `scripts/arresto.sh`.
- Il processo è `apps/server/src/sceneggiatore/processo.ts`. Lancia `claude -p --model <sonnet|haiku> --output-format
  json --no-session-persistence --tools ""`: nessuno strumento, il prompt ha tutto. Non legge né stampa credenziali e
  non apre `~/.claude`. Le chiamate contano sullo stesso limite dell'account di chi gioca.
- La cartella è `<log>/sceneggiatore/`: `richieste/`, `risposte/`, `vivo.json` (battito ogni 5 s),
  `sceneggiatore.jsonl` (una riga per richiesta: tempi in coda e di Claude Code, esito), `sceneggiatore.out`.
- Il server (`sceneggiatore/canale.ts`) scrive le richieste e raccoglie le risposte ogni secondo. Le misure finiscono
  in `narrazioni.jsonl`, righe `tipo: sceneggiatore`: tempi, accettate, scartate col motivo, consegnata.

## Limiti di oggi
- Le battute scritte al volo non hanno l'audio pre-generato: la voce le sintetizza dal vivo.
- Se lo sceneggiatore è lento, la sua battuta può arrivare a turno già chiuso: allora resta nel repertorio.

# Giudizio nozze-neve: conclusioni

Partite giudicate: `nozze-neve-indagine-B` (Ida, Vanda, Livia) e `nozze-neve-caotico-B` (Nando, Remo, Gunda, Vanda). Il dettaglio è in `fase1-giocatore.md` e `fase2-master.md`.

## I 5 problemi che pesano di più

### 1. Il finale non arriva mai. Causa (3), motore.
- **Cosa succede**: `fin_tramonto` e `nar_chiusura` vengono rifiutati 11 volte con "battuta senza «> pg»" (`regia.ts:701`). Il motore non chiude la scena all'ottavo segno. L'indagine si interrompe al T17. Il caotico gioca tre turni dopo il tramonto e ripete "senza benedizione" quattro volte.
- **Proposta**: quando un orologio con `al_completo` si riempie, il Motore sceglie in modo deterministico la battuta `tipo: finale` il cui `richiede` è soddisfatto, la fa dire, poi dice `nar_chiusura` e chiude la finestra delle azioni. I `finale` e i `momento` senza cancello `da_pg` non devono richiedere `> pg`.

### 2. L'orologio corre al triplo e il climax si gioca a sole calato. Causa (3), motore.
- **Cosa succede**: o_tramonto arriva a 8/8 al T14 nell'indagine (ancora in casera) e al T11 nel caotico, prima della scena del Sasso. Il segno "dovuto" scatta anche in turni consecutivi, mentre `segno_almeno_ogni` è 6. Ipotesi: `ultimoTurno` si azzera al cambio di scena (`orologi.ts:146`). A questo si sommano il narratore che propone un segno a ogni turno e il tetto globale di un segno per risposta, che affama o_lite e o_zio: restano a 0, quindi la lite non scoppia mai e il cattivo non agisce mai.
- **Proposta**: in modo B l'orologio lo possiede il Motore. Ogni orologio ha una cadenza minima e una **massima** (`segno_al_massimo_ogni`), il tetto vale per orologio, e la regola "al Sasso sale a sei" va nel codice invece che nel pannello del master. Un test di regressione deve simulare 15 turni con due cambi di scena.

### 3. L'improvvisazione distrugge gli indizi. Causa (1), dati / skill Preparatore.
- **Cosa succede**: il campanaccio della Duchessa "suona forte" quattro volte nel caotico (T8–T11). È l'indizio essenziale, e consiste proprio nel fatto che è muto. Nella parte pubblica della scena i campanacci suonano, e nessuno ha detto al narratore che quello grande tace.
- **Altri casi dello stesso tipo**: la lettera finisce sotto la giacca di Tonio, Adelina si inventa una sorella, Zelia e Adelina parlano in scene dove non devono stare.
- **Proposta**:
  - Ogni indizio con una superficie sensoriale riceve un `vincolo_pubblico` ("il campanaccio grande della Duchessa non suona"), che va al narratore anche in modo B.
  - Il validatore controlla che `descrizione` e `sensi` non lo contraddicano.
  - Il Motore scarta le righe improvvisate `[png_x]` di PNG fuori da `png_presenti`.

### 4. Gli indizi preparati non escono quando i giocatori li chiedono. Causa (4), selettore.
- **Cosa succede**:
  - Agnese viene interrogata 4 volte e il mimo (`nar_sposa_mima`) non esce mai.
  - Gunda entra nella stalla e `nar_stalla_entrata` non scatta.
  - Ida chiede a Tonio della lettera e `nar_tonio_tasca` non arriva.
  - Tre battute giuste vengono rifiutate perché manca `> pg`.
  - Le righe pre-scritte sono il 24–32% del totale, e 115 battute su 139 non escono in nessuna delle due partite.
- **Proposta**:
  - Il Motore fa una pre-selezione deterministica: se un'azione contiene i `temi` di un indizio non ancora usato nella scena, lo mette in testa al catalogo come obbligatorio.
  - Il `> pg` va dedotto quando una sola azione combacia.
  - Un `[usa]` rifiutato va riparato una volta, invece di lasciare la scena a metà.

### 5. La prosa al tavolo raddoppia e svela il meccanismo. Causa (4), prompt del narratore.
- **Cosa succede**:
  - L'annuncio improvvisato contiene già l'esito, e la battuta che segue lo ripete o lo contraddice (le impronte, Tonio "bianco" che poi "arrossisce").
  - Al tavolo si sentono "annuncia:" e "Ida risolve per prima".
  - Il narratore decide al posto dei PG (il coltello, la lettera).
  - Il tic di Ettore esce a ogni battuta.
- **Proposta**: quando segue un `[usa]`, l'annuncio è solo nome più gesto. Un filtro scarta le parole di fase ("annuncia", "risolve") e le righe improvvisate che si sovrappongono alla battuta successiva. Ogni tic al massimo una volta per scena. Il rientro in una scena usa la sua `tr_*` e non l'apertura con il riassunto (questa parte è del motore, `caricatore.ts:181`).

### Da provare
Il copione non ha usato **nessuna azione privata**, mentre i cedimenti decisivi (Adelina, Ettore, Zelia) e il finale migliore sono tutti "in privato". Serve una partita con azioni private prima di giudicare l'arco completo. Al framework propongo un controllo: ogni esito del climax deve avere almeno una strada pubblica, oppure il narratore deve offrire esplicitamente il "a quattr'occhi" (Adelina lo fa al T9 dell'indagine).

## Verdetto: così così

La **campagna** è buona: PNG con voce e voglie nette, indizi onesti e concreti, l'orologio del corno, la sposa muta, un segreto di sessant'anni che commuove, conoscenze private che danno piste vere ai giocatori. Il momento migliore, il braccio di ferro col Custode per il Libro, nasce proprio dal materiale preparato.

**Giocata così, però, non regge**:
- in nessuna delle due partite c'è un finale;
- il climax si gioca a sole già calato;
- l'indizio essenziale non viene trovato, e anzi viene contraddetto;
- 9 battute su 10 restano nel cassetto.

Quattro dei cinque problemi principali stanno nel motore e nel narratore, non nei dati. Il framework produce campagne buone, ma non le fa ancora giocare bene.

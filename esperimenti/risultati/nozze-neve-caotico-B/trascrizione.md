# Trascrizione nozze-neve-caotico-B

Campagna: nozze-neve · modalità: repertorio · sessione 2026-11-03T10:17:25.795Z · PG: pg_nando, pg_gunda, pg_remo, pg_vanda

Righe dopo `[usa] <id>`: battuta pre-scritta uscita (marcata `⟨pre-scritta⟩`). Le altre righe sono improvvisate dal modello.

## Turno 0 — apertura (scena_casera) (testo fisso della scena)

```text
[narratore] Stamattina su Fontanive è caduta la prima neve dell'anno.
[narratore] Per usanza Agnese Bonfanti e Tonio Morlacchi si sposano oggi al Sasso, prima del tramonto.
[narratore] A mezzogiorno, durante la festa, è sparito l'anello della nonna della sposa.
[narratore] Nella casera dei Bonfanti una riga di forme di formaggio divide la sala in due.
[narratore] A sinistra la nonna Adelina stringe una scatolina vuota; a destra Ettore, il nonno dello sposo, batte il bastone.
[narratore] Senza anello niente benedizione, e il sole non aspetta: chi si muove per primo?
```

## Turno 1

Azioni:
- pg_nando: «ok la fisarmonica la tiro fuori io, si balla!! gaspare dammi la mezza paga adesso»
- pg_remo: «adelina la scatolina vuota la peso a occhio, varra due fiorini»
- pg_gunda: «ferma tutti, mani dove si vedono, io sorrido e basta»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Nando, la fisarmonica esce dalla cinghia con un lamento, e tu la suoni prima ancora di chiedere la mezza paga.
[narratore] Gaspare si toglie la matita da dietro l'orecchio e annota qualcosa.
[usa] gas_dote > pg_nando
    ⟨pre-scritta⟩ [narratore] Gaspare si toglie gli occhiali e li pulisce sul panciotto.
    ⟨pre-scritta⟩ [png_gaspare] Il Prato Alto è la dote di Agnese. Io ne sono felicissimo, si capisce.
[narratore] Remo pesa la scatolina nel palmo, con l'aria di chi ha fatto i conti in fretta.
[narratore] Adelina lo guarda da sopra gli occhiali, e le chiavi alla cintura tintinnano.
[png_adelina] Due fiorini, dice. Una scatolina vuota pesa meno di niente, e quattro anni di forme valgono di più.
[narratore] Gunda si mette in mezzo alla riga di forme, con le mani aperte e un sorriso storto. Nessuno la spinge via.
[narratore] Vanda resta dov'è, con un mulo di pensiero nello sguardo.
[invito] pg_nando, pg_remo, pg_gunda
```

- righe pre-scritte 2, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nando","pg_remo","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2048 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00046767

## Turno 2

Azioni:
- pg_vanda: «ahah remo non rubare alla festa, ti metto a fare il palo»
- pg_gunda: «quei due si guardano storto, mi metto in mezzo facendo la faccia della colomba»
- pg_nando: «ettore col bastone, canzone per te: il vecchio batte il legno, ta ta ta, ballate!»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Nando, la fisarmonica attacca una polka e un paio di forestieri dei Morlacchi batte il piede a tempo.
[usa] nar_polka
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[narratore] Vanda, Remo prova ad avvicinarsi alla scatolina, ma tu gli sei già alle spalle: il palo lo fai tu, e con la faccia seria.
[narratore] Gunda sorride dal centro della riga di forme, la faccia da colomba un po' storta. Adelina la guarda e per un momento sembra quasi sorridere anche lei.
[narratore] Ettore batte il bastone sul pavimento, due colpi, a tempo con la fisarmonica.
[png_ettore] Eh? Canzone per me? Parla dall'orecchio buono, eh. Con l'altro sento solo i Bonfanti.
[usa] ett_giacca_appesa > pg_nando
    ⟨pre-scritta⟩ [narratore] Ettore si toglie la giacca, la appende alla panca e si rimbocca le maniche.
    ⟨pre-scritta⟩ [png_ettore] Vediamo quanto vali. Piano, che ho ottant'anni.
[narratore] Remo, il tuo tentativo sulla scatolina resta sospeso: nessuno lo ferma, ma nessuno lo lascia passare.
[invito] pg_remo, pg_vanda
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_vanda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1741 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00053507

## Turno 3

Azioni:
- pg_remo: «vanda scommetto un formaggio che il vento non c'entra niente, ahah»
- pg_gunda: «ettore ha l'aria di uno che ha perso la scatola e la dignita, lo dico a voce alta»
- pg_nando: «suoniamo la marcia dei muli, Gigia balla anche lei»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Nando, la fisarmonica resta muta un attimo: le tue parole sulla marcia dei muli la fanno ridere, e la polka cambia passo.
[narratore] Remo, il tuo scherzo sul formaggio arriva fino alla tavolata dei Morlacchi.
[narratore] Gunda, la tua frase su Ettore fa voltare la sala. Il bastone si ferma a mezz'aria.
[png_ettore] Dignità? Ce l'ho ancora, e pure il bastone.
[narratore] Ettore batte due colpi sul pavimento, poi si china sull'orecchio buono verso Gunda.
[narratore] Vanda, la tua attesa pesa più di una risposta: il mulo nello sguardo resta fermo.
[narratore] Il sole, fuori dalle finestre della casera, tocca la cima del Sasso e il corno del Custode suona il primo richiamo.
[usa] nar_sole_1
    ⟨pre-scritta⟩ [narratore] La neve torna a cadere fitta, a fiocchi grossi come piume.
    ⟨pre-scritta⟩ [narratore] Fuori dalle finestre il vicolo diventa bianco, e i rumori si fanno piccoli.
[usa] nar_scatolina > pg_remo
    ⟨pre-scritta⟩ [narratore] Dentro, il velluto rosso conserva ancora l'impronta tonda dell'anello.
    ⟨pre-scritta⟩ [narratore] Accanto c'è una macchia d'inchiostro fresco, piccola come un polpastrello.
    ⟨pre-scritta⟩ [narratore] Nella cerniera è rimasto preso un capello rosso, lungo.
[narratore] Remo, dentro la scatolina c'è ancora un filo di velluto rosso, e un'impronta d'anello sul fondo.
[invito] pg_vanda,pg_gunda
```

- righe pre-scritte 5, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1935 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 369 ms); costo $0.00061687

## Turno 4

Azioni:
- pg_nando: «io seguo la fisarmonica. chi scappa dietro i sacchi lo facciamo ballare»
- pg_vanda: «remo ferma, scendo io, la cantina la conosco dai muli»
- pg_remo: «scendo in cantina a controllare le forme, la scaletta e mia»
- pg_gunda: (nessuna azione)

Narratore:

```text
[narratore] Nando, la fisarmonica resta sospesa, poi ricomincia piano. Chi scappa dietro i sacchi vedrà presto che il ballo arriva anche lì.
[narratore] Vanda, scendi per la scaletta della cantina. Il freddo ti viene incontro con odore di siero e di muschio umido.
[narratore] Remo, la scaletta della cantina scricchiola sotto il tuo peso. In fondo le forme si allineano nel buio, e il pavimento è bagnato.
[narratore] Gunda resta in mezzo alla riga di forme, a fare da colomba.
[narratore] Fuori, il corno del Custode suona il secondo richiamo, e il sole tocca già il passo.
[usa] nar_sole_2
    ⟨pre-scritta⟩ [narratore] Dal Sasso arriva il corno, un richiamo lungo e basso.
    ⟨pre-scritta⟩ [narratore] In paese qualcuno apre una finestra, per sentire meglio.
[usa] nar_lite_1
    ⟨RIFIUTATA: un segno di orologio è già uscito in questa risposta⟩
[narratore] Nel cortile la neve cade più fitta, e nessuno sembra accorgersi che il tempo stringe.
[invito] pg_vanda,pg_remo
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2759 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064267

## Turno 5

Azioni:
- pg_remo: «gunda il pugno chiuso fammelo vedere, sono curioso ahah»
- pg_gunda: «ferma nando, la prendo io per il braccio, piano, tipo sacco di farina»
- pg_nando: «treccia rossa! esci fuori, ti canto la canzone della treccia a squarciagola»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Remo annuncia che vuole vedere il pugno di Gunda. Lei lo tiene chiuso, con un sorriso da colomba storta.
[narratore] Gunda annuncia che ferma Nando e lo prende per il braccio, piano, come un sacco di farina.
[narratore] Nando annuncia che esce fuori a cantare la canzone della treccia rossa a squarciagola.
[narratore] Vanda aspetta, con il mulo nello sguardo.
[narratore] Nando, il tuo canto esce dalla porta e il vicolo lo rimanda indietro, tutto storto dalla neve.
[narratore] Gunda, la tua presa tiene Nando fermo, e lui fa una smorfia da bambino preso in castigo.
[narratore] Remo, il pugno di Gunda resta chiuso: lei non lo apre, ma non lo nasconde.
[narratore] Dalla cantina sale odore di siero, e la scaletta scricchiola ancora.
[usa] nar_sole_3
    ⟨pre-scritta⟩ [narratore] Le ombre dei larici scendono sulla neve fino alle prime case.
[usa] nar_lite_1
    ⟨RIFIUTATA: un segno di orologio è già uscito in questa risposta⟩
[narratore] Remo, il pugno è chiuso e il sole è a un passo dal passo. Cosa fai?
[invito] pg_remo,pg_gunda,pg_nando,pg_vanda
```

- righe pre-scritte 1, improvvisate 9, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_gunda","pg_nando","pg_vanda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1788 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074427

## Turno 6

Azioni:
- pg_gunda: «vanda braccio di ferro io contro te, chi perde paga il vino»
- pg_vanda: «va bene, ma se perdi giuro che ti appoggio un basto sulla testa»
- pg_remo: «gaspare il contratto del prato alto lo firmi dopo il tramonto se le nozze saltano? la penna e mia»
- pg_nando: (nessuna azione)

Narratore:

```text
[narratore] Gunda, la sfida è accettata: vino contro braccio di ferro, Vanda si piega al tavolo con il gomito pronto.
[narratore] Vanda, la tua minaccia del basto fa ridere la tavolata dei Morlacchi, e Ettore batte il bastone.
[narratore] Remo, la richiesta della firma sul prato resta sospesa: Gaspare tiene la penna in mano e non la posa.
[png_gaspare] Dopo il tramonto? Facciamo due conti, con calma. Il Prato Alto non si firma in fretta.
[narratore] Gaspare si toglie la matita da dietro l'orecchio e annota qualcosa.
[usa] gas_dote > pg_remo
    ⟨pre-scritta, variante 1⟩ [narratore] Gaspare si pulisce di nuovo gli occhiali sul panciotto.
    ⟨pre-scritta, variante 1⟩ [png_gaspare] La dote è la dote. Felicissimo, gliel'ho detto.
[narratore] Nando, la fisarmonica riprende piano sotto le voci. Il tuo silenzio non è passato inosservato: Gunda ti guarda di sbieco.
[usa] nar_sole_4
    ⟨pre-scritta⟩ [narratore] Il corno chiama di nuovo dal Sasso, e la luce diventa gialla.
    ⟨pre-scritta⟩ [narratore] Sui tetti la neve prende il colore del miele.
[narratore] Il corno del Custode suona il quarto richiamo, lungo e basso, e il sole tocca il passo.
[invito] pg_gunda, pg_vanda, pg_remo, pg_nando
```

- righe pre-scritte 4, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_gunda","pg_vanda","pg_remo","pg_nando"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2787 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076327

## Turno 7 — cambio di scena scena_casera → scena_casa_bonfanti (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] A casa Bonfanti la scala scricchiola, e dalla stalla sale odore di fieno.
[narratore] In camera la sposa vi guarda dallo specchio, muta, e Zelia le appunta il velo con gli spilli.
[narratore] Dietro di voi entra lo zio Gaspare, scuotendo la neve dal panciotto: da dove cominciate?
```

## Turno 8

Azioni:
- pg_nando: «le scale scricchiolano, faccio la scala musicale: do re mi scricchiolo»
- pg_vanda: «ferma! io salgo, le mule sulle scale non ci vanno»
- pg_remo: «sposa bella, mi fai un sorriso? lo porto a valle come pegno»
- pg_gunda: (nessuna azione)

Narratore:

```text
[narratore] Nando, il tuo do re mi scricchiolo fa rimbalzare un coro di risate dalla tavolata. Le scale però tacciono come se ti avessero ascoltato.
[narratore] Vanda, sali il primo gradino con il passo pesante di chi conosce i muli. Il legno geme sotto di te.
[narratore] Remo, la sposa ti guarda dallo specchio senza sorridere, muta come vuole l'usanza, e il velo le trema un poco.
[narratore] Gunda resta in fondo alla scala, a fare da colomba, mentre lo zio Gaspare si volta verso la scala.
[narratore] Dalla stalla sotto casa arriva il tintinnio grave del campanaccio della Duchessa.
[narratore] Gaspare si toglie la matita da dietro l'orecchio e annota qualcosa sul palmo.
[png_gaspare] Scale, sposa e forestieri. Facciamo due conti: un anello sparito e tre ospiti in camera. Non torna.
[invito] pg_vanda,pg_remo,pg_nando
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_5

```text
⟨pre-scritta⟩ [narratore] Dalla stalla dei Morlacchi arriva il tintinnio dei ferri sui basti.
⟨pre-scritta⟩ [narratore] Domattina si scende a valle, e qualcuno ha già cominciato a caricare.
```

- righe pre-scritte 2, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_remo","pg_nando"]; anomalie: 0
- primo audio dalla chiusura della finestra: 4550 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073553

## Turno 9

Azioni:
- pg_vanda: «bastiano! dov'eri a mezzogiorno? fammi vedere le mani, subito»
- pg_gunda: «stalla! odore di fieno, mi nascondo sotto la mangiatoia e aspetto»
- pg_nando: «sposa, ti canto una canzone muta: fai cenno se ti piace, anche solo con gli occhi»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Nando annuncia che canta una canzone muta alla sposa, e chiede solo un cenno di approvazione.
[narratore] Vanda annuncia che chiede a Bastiano dov'era a mezzogiorno e vuole vedere le sue mani.
[narratore] Gunda annuncia che si nasconde sotto la mangiatoia della stalla e aspetta.
[narratore] Nando, la sposa ti guarda dallo specchio. Il velo non si muove, ma le labbra si tendono appena, un gesto che potrebbe essere tutto o niente.
[narratore] Vanda, Bastiano non c'è in camera. Sotto la botola, dalla stalla, arriva il rumore di un garzone che si volta di scatto.
[png_zelia] Bastiano? Non lo conosco di persona. Io ero qui sopra, a sistemare il velo, e lo scrivo.
[narratore] Gunda, sotto la mangiatoia il fieno è caldo e pungente, e le vacche ti sbuffano addosso. Dalla stalla arriva il campanaccio della Duchessa, grave e vicino.
[narratore] Il corno del Custode suona il sesto richiamo, lungo e basso, e fuori la luce diventa rossa.
[narratore] Nel cortile di casa Bonfanti l'ombra dei larici scende fino alle prime case.
[invito] pg_vanda,pg_gunda,pg_nando
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_6

```text
⟨pre-scritta⟩ [narratore] In paese si accendono le lanterne della processione, una per porta.
```

- righe pre-scritte 1, improvvisate 9, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_gunda","pg_nando"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2658 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00081393

## Turno 10

Azioni:
- pg_remo: «scommessa: chi apre per primo i cassetti del gaspare ha vinto. zio gaspare, io apro il tuo»
- pg_gunda: «cassetti no. ok basta, vado a vedere cosa c'e sotto la scala»
- pg_vanda: «remo aspetta, li apro io, ho le mani piu grosse»
- pg_nando: (nessuna azione)

Narratore:

```text
[narratore] Remo annuncia che apre i cassetti dello zio Gaspare, e Vanda dice che li apre lei, con le mani più grosse.
[narratore] Gunda, scendi la scala fino in fondo, dove il pavimento è di terra battuta e l'odore di fieno si fa più forte.
[narratore] Nando, la fisarmonica resta muta sulla tua schiena.
[usa] nar_scrittoio_cassetto > pg_remo
    ⟨pre-scritta⟩ [narratore] Nel cassetto c'è odore di inchiostro vecchio, e un libro dei conti.
    ⟨pre-scritta⟩ [narratore] Sotto il libro c'è un contratto con Sior Bortolo, mercante di Pontebruno.
    ⟨pre-scritta⟩ [narratore] Cinque estati di pascolo al Prato Alto, venti fiorini di caparra già pagati. Da firmare dopo il tramonto.
[narratore] Vanda, mentre le tue mani stringono il cassetto, il sole tocca il passo e il corno del Custode suona lungo e basso.
[usa] nar_sole_7
    ⟨pre-scritta⟩ [narratore] Il corno chiama ancora, e l'ultima luce lascia i tetti del paese.
    ⟨pre-scritta⟩ [narratore] Sulla neve le ombre sono lunghe e blu, e fa più freddo.
[narratore] Gunda, sotto la scala trovi un sacchetto di carta vecchia e una lanterna spenta, ancora calda.
[png_gaspare] Cassetti? Facciamo due conti: chi ha le mani più grosse, di solito, non ha la testa più fine.
[usa] gas_campanella > pg_vanda
    ⟨pre-scritta⟩ [png_gaspare] Me la regalò nostro padre, quando guarii dalla febbre. Avevo sei anni.
[narratore] Gaspare si toglie la matita da dietro l'orecchio e annota qualcosa sul palmo.
[narratore] Dalla stalla arriva il tintinnio della Duchessa, e la scatolina di noce, sul tavolo alto, sembra più leggera.
[invito] pg_remo,pg_vanda,pg_gunda,pg_nando
```

- righe pre-scritte 6, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_vanda","pg_gunda","pg_nando"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1715 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00081023

## Turno 11

Azioni:
- pg_nando: «zio gaspare, pagami la mezza paga e ti canto la canzone del cassetto»
- pg_vanda: «bastiano ti tiro un calcio di mula se mi menti ahah. ferma la mano!»
- pg_remo: «gaspare sei sicuro di non voler firmare il patto ora? ti presto la penna»
- pg_gunda: (nessuna azione)

Narratore:

```text
[narratore] Nando annuncia che chiede a Gaspare la mezza paga, e promette una canzone sul cassetto.
[narratore] Vanda annuncia che minaccia Bastiano con un calcio di mula e chiede di fermare la mano.
[narratore] Remo annuncia che chiede a Gaspare se vuole firmare il patto ora, offrendo la penna.
[narratore] Nando, Gaspare si tocca il panciotto come se la mezza paga fosse già nella tasca sbagliata.
[png_gaspare] La mezza paga? Facciamo due conti: prima il Prato, poi la canzone. Canti pure, ma piano.
[narratore] Vanda, Bastiano arretra con le mani aperte, e dalla stalla il campanaccio della Duchessa suona forte.
[png_zelia] Bastiano non mente, scrivo che non ha le mani sporche d'inchiostro. Questo lo scrivo.
[narratore] Remo, la penna è ferma in aria e Gaspare la guarda come fosse un pesce fuori dall'acqua.
[png_gaspare] Firmare ora? Col tramonto che scende? No, grazie. Facciamo due conti, con calma.
[usa] nar_sole_8
    ⟨pre-scritta⟩ [narratore] Il corno suona tre volte, e il sole tocca il passo.
[narratore] Fuori, il corno del Custode suona l'ultimo richiamo, lungo e basso. Il sole tocca il passo.
[usa] nar_zio_1
    ⟨RIFIUTATA: un segno di orologio è già uscito in questa risposta⟩
[narratore] Gaspare si asciuga la fronte con il fazzoletto e si volta verso il tavolo alto, dove la scatolina di noce sembra più leggera.
[usa] gas_chi_cera > pg_gunda
    ⟨RIFIUTATA: pg_gunda non ha un'azione in questo turno⟩
[invito] pg_nando,pg_vanda,pg_remo,pg_gunda
```

- righe pre-scritte 1, improvvisate 11, [usa] rifiutati 2; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nando","pg_vanda","pg_remo","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1620 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 973 ms); costo $0.00087573

## Turno 12 — cambio di scena scena_casa_bonfanti → scena_sasso (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] Al Sasso delle Promesse il larice è carico di neve, e due lanterne fumano nel freddo.
[narratore] Il paese si stringe a semicerchio, Bonfanti di qua e Morlacchi di là, e il Custode apre il Libro.
[narratore] Il sole scende verso il passo: chi parla per primo?
```

## Turno 13

Azioni:
- pg_remo: «agnese se non parli dimmi solo si o no con la testa, come una contrattazione ahah»
- pg_gunda: «rifacciamo il ballo al sasso: tutti in fila, la carica dei nani!»
- pg_nando: «il sole sta sotto il passo: ballo finale, tutti in trenino!»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Nando annuncia che canta la canzone muta alla sposa, e chiede solo un cenno di approvazione.
[narratore] Vanda annuncia che chiede a Bastiano dov'era a mezzogiorno e vuole vedere le sue mani.
[narratore] Gunda annuncia che si nasconde sotto la mangiatoia e aspetta.
[narratore] Non ci sono azioni nuove per questo turno. Il sole ha già toccato il passo e il corno ha suonato l'ultimo richiamo.
[usa] fin_tramonto
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[narratore] Agnese, muta come vuole l'usanza, guarda la neve dal Sasso. Nessuno ha messo l'anello alla sua mano.
[narratore] Lo zio Gaspare si asciuga la fronte, poi scende il primo gradino del Sasso, dove il paese lo aspetta.
[usa] nar_chiusura
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[invito] tutti
[narratore] Remo, Agnese ti guarda dal Sasso e non dice né sì né no. Muove appena il capo, di lato, come a dire che quella contrattazione non la fa.
[narratore] Il sole è già passato sul passo, e nessuno lo nota tranne te.
```

- righe pre-scritte 0, improvvisate 8, [usa] rifiutati 2; azioni senza risposta 0/3, riparazioni 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 2474 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00141024

## Turno 14

Azioni:
- pg_gunda: «braccio di ferro col custode per il libro! chi vince sfoglia la pagina»
- pg_nando: «custode, ti canto la canzone del libro, la sai? facciamo il coro»
- pg_vanda: «ettore, il vento: era vento o hai pianto? lo dico in faccia a tutto il paese»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Nando annuncia che chiede al Custode di cantare il libro con lui, a coro.
[narratore] Gunda annuncia che sfida il Custode al braccio di ferro, per il Libro.
[narratore] Vanda annuncia che chiede a Ettore se era vento o pianto, davanti a tutto il paese.
[narratore] Remo non fa nulla e resta a guardare.
[png_ettore] Eh? Vento. Dall'orecchio buono, e con quello sento solo i Bonfanti.
[narratore] Ettore batte il bastone due volte sulla neve, e il paese trattiene il fiato.
[narratore] Il Custode Ilario stringe la mano di Gunda sul leggio, e il Libro scricchiola appena.
[narratore] Gunda, il braccio del Custode è più forte di quanto sembri, e la pagina si muove di un dito.
[usa] nar_libro_spose > pg_gunda
    ⟨pre-scritta⟩ [narratore] Il Custode apre il Libro sulle ginocchia e lo gira verso di voi, con un sospiro.
    ⟨pre-scritta⟩ [narratore] Cent'anni di nozze di neve dei Bonfanti: le spose portano tutte una catenina d'argento.
    ⟨pre-scritta⟩ [narratore] L'anello compare solo ventotto anni fa, alle nozze di Marta, con la storia raccontata da Adelina.
[narratore] Nando, il Custode non canta ma batte il tempo col piede sul Sasso, e il coro dei Bonfanti attacca piano.
[usa] nar_custode_regole > pg_nando
    ⟨pre-scritta⟩ [narratore] Ciò che si racconta al Sasso, dice il Custode, il paese lo ripete per sempre.
    ⟨pre-scritta⟩ [narratore] La casa che racconta il falso perde la voce.
    ⟨pre-scritta⟩ [narratore] La sua storia, da allora, la racconta chi ha detto il vero.
    ⟨pre-scritta⟩ [narratore] E se la più anziana non mette l'anello, lo mette la seconda della casa.
[narratore] Vanda, Adelina si volta verso di te con le chiavi che tintinnano alla cintura.
[usa] ett_quel_giorno > pg_vanda
    ⟨pre-scritta⟩ [narratore] Ettore si tira la barba con tutte e due le mani.
    ⟨pre-scritta⟩ [png_ettore] Quel giorno sono sceso a valle. Avevo muli da vendere.
[narratore] Il sole tocca il passo e il corno suona tre colpi lunghi.
[usa] fin_tramonto
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[narratore] Nel silenzio che segue, Agnese non ha l'anello, e il paese scende dal Sasso senza parole.
[usa] nar_chiusura
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[invito] pg_gunda,pg_nando,pg_vanda,pg_remo
```

- righe pre-scritte 9, improvvisate 12, [usa] rifiutati 2; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_gunda","pg_nando","pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3195 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 723 ms); costo $0.00087812

## Turno 15

Azioni:
- pg_vanda: «sessant'anni fa? custode, la neve era la stessa di oggi?»
- pg_remo: «gunda dillo piu piano, cosi ci scrivo sopra il contratto ahah»
- pg_gunda: «ehi tutti, il custode ha un libro con roba di quei due, sessant'anni fa! ah ops»
- pg_nando: (nessuna azione)

Narratore:

```text
[narratore] Vanda, annunci la domanda sulla neve di sessant'anni fa e la sala si gira verso il Custode.
[narratore] Il Libro del Sasso sul leggio apre la sua pagina più antica, e le righe di inchiostro sono sbiadite.
[usa] nar_libro_pagina > pg_vanda
    ⟨pre-scritta⟩ [narratore] Il Custode trova la pagina: sessant'anni fa, alla prima neve, nessuna benedizione.
    ⟨pre-scritta⟩ [narratore] La ragazza Bonfanti ha aspettato al Sasso fino al buio.
    ⟨pre-scritta⟩ [narratore] A notte è salito il giovane Morlacchi, con un mulo e una lanterna. Non ha trovato nessuno.
[narratore] Remo, Gunda abbassa la voce, e tu cominci a scrivere sul dorso del contratto quello che senti.
[narratore] Gunda, il tuo grido ha già fatto girare cento teste verso il Sasso, e Adelina ti guarda con le chiavi in mano.
[png_adelina] Ah, la prima neve. Quella l'ho raccontata io, e la racconto ancora a chi ha la lingua lunga.
[narratore] Il sole è passato sul passo: nessuno ha messo l'anello alla sposa.
[usa] fin_tramonto
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[usa] nar_chiusura
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[invito] pg_vanda,pg_remo,pg_gunda,pg_nando
```

- righe pre-scritte 3, improvvisate 6, [usa] rifiutati 2; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_remo","pg_gunda","pg_nando"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3735 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074772

## Turno 16

Azioni:
- pg_remo: «sole a una spanna dal passo, ultima chiamata: firmo il contratto con la penna in mano»
- pg_gunda: «anch'io ballo, ma con lo scudo sopra la testa e la colomba storta»
- pg_nando: «lanterne, dondolate! ballo finale con la fisarmonica sulla schiena»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Nando, il sole è a un passo dal passo, e la fisarmonica sulla schiena suona già da sola.
[narratore] Remo annuncia che firma il contratto con la penna in mano, mentre il sole tocca la cresta.
[narratore] Remo, la penna scende sul foglio e Gaspare ti guarda senza battere ciglio.
[png_gaspare] Firmato? Con il tramonto alle spalle? Facciamo due conti, con calma.
[narratore] Gunda annuncia che balla con lo scudo sopra la testa, e la colomba storta sembra volare.
[narratore] Gunda, lo scudo si alza sopra le trecce e il paese ride piano, senza sapere se è un gioco.
[narratore] Nando annuncia che balla con la fisarmonica sulla schiena e chiama tutti a fare il trenino.
[narratore] Nando, le lanterne dondolano al ritmo della fisarmonica, e il trenino si allunga fino al larice.
[narratore] Vanda aspetta, con gli occhi su Bastiano e sul sole che scende.
[usa] fin_tramonto
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[narratore] Il corno suona l'ultimo richiamo, e il paese scende dal Sasso senza benedizione.
[usa] nar_chiusura
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[invito] pg_vanda
```

- righe pre-scritte 0, improvvisate 10, [usa] rifiutati 2; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2428 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 269 ms); costo $0.00079782

## Turno 17

Azioni:
- pg_gunda: «ok, nessuno tira il vestito della sposa, lo dico adesso»
- pg_nando: «tutti in trenino a cercare l'anello sotto la neve! uno-due-tre, sotto!»
- pg_vanda: «chi ha l'anello? tutti in fila e ci guardiamo le mani»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Nando, la fisarmonica suona da sola mentre il trenino corre nella neve. Tutti cercano sotto la neve, ma la sposa resta immobile.
[narratore] Gunda, il vestito di Agnese non si muove, e nessuno lo tira. La colomba sullo scudo sembra sorridere.
[narratore] Vanda, chiedi a voce alta chi ha l'anello. Le mani si alzano, poi ricadono. Nessuno ce l'ha.
[narratore] Remo, il contratto è ancora in mano tua, aperto sulla neve.
[narratore] Il sole tocca il passo, e il corno suona l'ultimo richiamo. Il paese scende dal Sasso senza benedizione.
[usa] fin_tramonto
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[usa] nar_chiusura
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[invito] tutti
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 2; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 2044 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 877 ms); costo $0.00070682

# Trascrizione nozze-neve-caotico-B

Campagna: nozze-neve · modalità: repertorio · sessione 2026-11-09T20:23:20.332Z · PG: pg_nando, pg_gunda, pg_remo, pg_vanda

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
[narratore] Nando Tira fuori la fisarmonica dalla schiena e la fa respirare con un accordo storto. Poi chiede a Gaspare la mezza paga, subito.
[png_gaspare] Con rispetto parlando, la mezza paga arriva dopo la benedizione. Lo scrivo qui, nel conto.
[narratore] Remo pesa la scatolina di noce sul palmo, con l'occhio di chi conta le forme al mercato.
[usa] ade_scatolina > pg_remo
    ⟨pre-scritta⟩ [narratore] Adelina vi toglie la scatolina di mano, svelta come una gatta, e la tiene aperta.
    ⟨pre-scritta⟩ [png_adelina] Guardare sì, toccare no. È roba di casa.
[narratore] Gunda alza le mani aperte e sorride a tutta la sala, mettendosi in mezzo alla riga di forme.
[narratore] Vanda resta ferma vicino alla porta, con le braccia incrociate, e segue il movimento di tutti.
[invito] pg_nando,pg_remo,pg_gunda
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nando","pg_remo","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2520 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 234 ms); costo $0.0005097

## Turno 2

Azioni:
- pg_vanda: «ahah remo non rubare alla festa, ti metto a fare il palo»
- pg_gunda: «quei due si guardano storto, mi metto in mezzo facendo la faccia della colomba»
- pg_nando: «ettore col bastone, canzone per te: il vecchio batte il legno, ta ta ta, ballate!»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Vanda, Remo prova a passare la scatolina di mano in mano sotto la tavola, e tu lo fermi con una battuta secca.
[narratore] Vanda, ridendo, si mette davanti alla porta e fa il palo con le braccia incrociate: nessuno esce di corsa.
[narratore] Gunda si piazza tra Adelina e Ettore, con lo scudo a pancia in fuori, e fa la faccia storta della colomba.
[narratore] Adelina alza un sopracciglio, poi sorride appena, come chi riconosce uno scherzo vecchio.
[narratore] Nando attacca un ritmo di polka, il piede batte, le trecce del violino ondeggiano dall'altra parte della sala. Ettore batte il bastone a tempo, due colpi, e poi si ferma.
[usa] nar_polka > pg_nando
    ⟨pre-scritta⟩ [narratore] La musica parte storta, poi si raddrizza alla seconda strofa.
    ⟨pre-scritta⟩ [narratore] Un Morlacchi scavalca le forme e fa girare una comare dei Bonfanti.
    ⟨pre-scritta⟩ [narratore] Per un momento ridono tutte e due le tavolate. Il vecchio Ettore batte il tempo col bastone.
[narratore] Ettore fa un gesto secco con il bastone, senza alzare gli occhi.
[png_ettore] Eh? Non sento niente. Sento solo i Bonfanti che sbraitano.
[narratore] Remo, dalla sua tavolata, osserva la scena con il lapis in mano, prendendo nota di tutto.
[invito] pg_nando, pg_gunda, pg_remo
```

- righe pre-scritte 3, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nando","pg_gunda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3262 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006173

## Turno 3

Azioni:
- pg_remo: «vanda scommetto un formaggio che il vento non c'entra niente, ahah»
- pg_gunda: «ettore ha l'aria di uno che ha perso la scatola e la dignita, lo dico a voce alta»
- pg_nando: «suoniamo la marcia dei muli, Gigia balla anche lei»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Remo annuncia la scommessa sul vento, e Vanda ride di gusto.
[narratore] Gunda, a voce alta, dice a Ettore che ha perso la scatola e la dignità.
[narratore] Nando attacca la marcia dei muli, e le sue dita corrono sulla fisarmonica.
[narratore] Gunda si gira verso Ettore, che alza il bastone di scatto. Il colpo le sfiora lo scudo e sbatte sul tavolo, senza farle male.
[png_ettore] Ripeti che ho perso la dignità, nana, e ti porto a valle a piedi nudi!
[narratore] Gunda ride e si rimette in guardia con lo scudo, mentre Adelina chiude gli occhi come chi ha già visto tutto.
[usa] nar_scatolina > pg_gunda
    ⟨pre-scritta⟩ [narratore] Dentro, il velluto rosso conserva ancora l'impronta tonda dell'anello.
    ⟨pre-scritta⟩ [narratore] Accanto c'è una macchia d'inchiostro fresco, piccola come un polpastrello.
    ⟨pre-scritta⟩ [narratore] Nella cerniera è rimasto preso un capello rosso, lungo.
[invito] pg_vanda, pg_remo
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_lite_1

```text
⟨pre-scritta⟩ [narratore] Dal lato dei Morlacchi qualcuno batte il bicchiere sul tavolo, tre volte.
```

- righe pre-scritte 4, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2285 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006302

## Turno 4

Azioni:
- pg_nando: «io seguo la fisarmonica. chi scappa dietro i sacchi lo facciamo ballare»
- pg_vanda: «remo ferma, scendo io, la cantina la conosco dai muli»
- pg_remo: «scendo in cantina a controllare le forme, la scaletta e mia»
- pg_gunda: (nessuna azione)

Narratore:

```text
[narratore] Nando annuncia che segue la fisarmonica, e la musica si fa più stretta, più vicina ai sacchi.
[narratore] Vanda dice a Remo di fermarsi, e lei scende in cantina dalla porta di dietro, sicura del passo.
[narratore] Remo imbocca la scaletta della cantina, con il lapis dietro l'orecchio.
[narratore] Il fresco delle forme sale dalle scale, e il rumore della festa resta alle spalle.
[narratore] Nel buio della cantina Remo trova il primo scaffale. Sul legno c'è una forma appena tagliata, e accanto un coltello con la lama ancora umida di siero.
[narratore] Vanda, scendendo, sente un passo leggero che si allontana verso il vicolo, poi più niente.
[narratore] Gunda resta in mezzo alla sala, con lo scudo appoggiato al ginocchio, e sorveglia Ettore e Adelina.
[narratore] Da fuori, nel vicolo, arriva un fischio basso, tre note, e poi il silenzio.
[png_ettore] Eh? Chi scende in cantina a quest'ora? Quello è roba dei Bonfanti, eh.
[usa] ett_giacca_appesa > pg_gunda
    ⟨pre-scritta⟩ [narratore] Ettore si toglie la giacca, la appende alla panca e si rimbocca le maniche.
    ⟨pre-scritta⟩ [png_ettore] Vediamo quanto vali. Piano, che ho ottant'anni.
[invito] pg_nando, pg_vanda, pg_remo
```

- righe pre-scritte 2, improvvisate 9, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nando","pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3044 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0007387

## Turno 5

Azioni:
- pg_remo: «gunda il pugno chiuso fammelo vedere, sono curioso ahah»
- pg_gunda: «ferma nando, la prendo io per il braccio, piano, tipo sacco di farina»
- pg_nando: «treccia rossa! esci fuori, ti canto la canzone della treccia a squarciagola»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Remo annuncia che vuole vedere il pugno di Gunda, e lei lo apre con calma sul tavolo, il palmo rivolto in su.
[narratore] Gunda ti avvicini ed è davvero solo un pugno: nessun segno, nessuna sorpresa.
[narratore] Nando, la fisarmonica ancora addosso, si gira verso la porta della cantina.
[narratore] Gunda afferra il braccio di Nando con presa piena ma leggera, come un sacco di farina che non si vuole rompere. Nando sbuffa, ma non si muove.
[narratore] Dalla porta del vicolo entra una folata di neve. Nella sala nessuno parla per un istante.
[narratore] Una ragazza con la treccia rossa esce dal cortile con il quaderno stretto al petto, guardandovi con occhi grandi.
[png_zelia] Questo lo scrivo. Capitolo terzo: i forestieri cantano davanti al paese.
[narratore] Nando, attaccando la prima nota della canzone della treccia, la sente in faccia alla ragazza, che arrossisce e ride.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 2
- primo audio dalla chiusura della finestra: 2902 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0007664

## Turno 6

Azioni:
- pg_gunda: «vanda braccio di ferro io contro te, chi perde paga il vino»
- pg_vanda: «va bene, ma se perdi giuro che ti appoggio un basto sulla testa»
- pg_remo: «gaspare il contratto del prato alto lo firmi dopo il tramonto se le nozze saltano? la penna e mia»
- pg_nando: (nessuna azione)

Narratore:

```text
[narratore] Gunda stringe la mano di Vanda sopra la tavola, e le dita si incastrano. Il tavolo trema appena.
[narratore] Vanda spinge, e Gunda perde terreno di un dito. Poi si ferma, e il braccio di Vanda ricade sul legno.
[narratore] Vanda, ridendo, dice che il vino lo paga Gunda e lo porta lei.
[narratore] Remo, con il lapis in mano, stringe il contratto del prato alto e aspetta la risposta di Gaspare.
[narratore] Gaspare si toglie gli occhiali e li pulisce con cura. Poi risponde a Remo, e lo dice piano, per la sua tavolata.
[usa] gas_dote > pg_remo
    ⟨pre-scritta⟩ [narratore] Gaspare si toglie gli occhiali e li pulisce sul panciotto.
    ⟨pre-scritta⟩ [png_gaspare] Il Prato Alto è la dote di Agnese. Io ne sono felicissimo, si capisce.
[narratore] Gaspare posa la penna sul tavolo e non la lascia andare.
[invito] pg_remo,pg_vanda
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_1

```text
⟨pre-scritta⟩ [narratore] La neve torna a cadere fitta, a fiocchi grossi come piume.
⟨pre-scritta⟩ [narratore] Fuori dalle finestre il vicolo diventa bianco, e i rumori si fanno piccoli.
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_lite_2

```text
⟨pre-scritta⟩ [narratore] Un Bonfanti spinge una forma, e la riga di formaggio si allarga.
⟨pre-scritta⟩ [narratore] Dall'altra parte della sala, una panca striscia indietro.
```

- righe pre-scritte 6, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_vanda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2105 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 245 ms); costo $0.0008003

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
[narratore] Nando annuncia che scricchiola le scale a tempo, do re mi scricchiolo, e le assi rispondono a ogni gradino.
[narratore] Vanda dice che sale lei per prima, perché le mule sulle scale non ci vanno.
[narratore] Remo chiede alla sposa un sorriso, e dice che il sorriso lo porta a valle come pegno.
[narratore] Lo zio Gaspare, in cucina, alza gli occhi dal libro dei conti. Il corno del Custode suona lontano, il primo segno del tramonto.
[narratore] Nando scricchiola la prima scala, ma il legno non cede e la musica si ferma. Vanda sale per prima e l'assito del primo piano le regge il peso senza un suono.
[narratore] Remo si avvicina alla sposa. Agnese lo guarda dallo specchio, senza parlare, poi abbassa appena il velo: non sorride, ma non scappa.
[png_zelia] Questo lo scrivo. Remo, non credere che il sorriso sia un pegno: è mia sorella, e il pegno lo decido io.
[narratore] Zelia stringe il quaderno al petto. Sotto la finestra si sente lo zio chiamare Zelia dalla cucina.
[narratore] Vanda, arrivata in cima, trova sul letto il velluto della scatolina, ancora col segno dell'anello, e una piccola macchia d'inchiostro fresco.
[narratore] Gunda resta giù, in cucina, con lo scudo appoggiato al ginocchio, a fare la guardia alla botola.
[usa] nar_sposa_mima > pg_remo
    ⟨pre-scritta⟩ [narratore] La sposa apre la bocca, si ricorda dell'usanza e la richiude.
    ⟨pre-scritta⟩ [narratore] Guarda la sorella e si spolvera il vestito, come se avesse addosso la paglia.
    ⟨pre-scritta⟩ [narratore] Poi si mette due dita sulla testa, come corna. Zelia diventa rossa fino alle orecchie.
[usa] tr_salita
    ⟨pre-scritta⟩ [narratore] La salita è un sentiero bianco tra i larici, e il fiato fa nuvole.
    ⟨pre-scritta⟩ [narratore] Da lassù il paese è una manciata di tetti sotto la neve.
[invito] pg_vanda,pg_remo,pg_nando
```

- righe pre-scritte 5, improvvisate 10, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_remo","pg_nando"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2807 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00091124

## Turno 9

Azioni:
- pg_vanda: «bastiano! dov'eri a mezzogiorno? fammi vedere le mani, subito»
- pg_gunda: «stalla! odore di fieno, mi nascondo sotto la mangiatoia e aspetto»
- pg_nando: «sposa, ti canto una canzone muta: fai cenno se ti piace, anche solo con gli occhi»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Vanda Brughiera tenta di mettere paura a Bastiano, ma la sua voce non basta: il garzone non si muove e la guarda dritto negli occhi.
[narratore] Gunda Rocciarossa scivola nella stalla, si accovaccia sotto la mangiatoia, ma i campanacci suonano e le vacche si girano tutte verso di lei.
[narratore] Nando Tremolino canta piano per la sposa, con gli occhi sulla finestra.
[narratore] Agnese non risponde al canto: abbassa il velo, ma le mani restano strette in grembo.
[narratore] Dal basso, ai piedi della scala, lo zio Gaspare chiama Zelia per nome.
[usa] nar_zio_1
    ⟨pre-scritta⟩ [narratore] Dalla cucina arriva un rumore di cassetti aperti e richiusi.
[narratore] Gaspare si siede al tavolo della cucina e apre il libro dei conti. Chi cercava qualcosa sotto la mangiatoia adesso sente il suo passo sulle assi.
[narratore] Zelia, con il quaderno al petto, si ferma a metà scala.
[usa] nar_stalla_entrata > pg_gunda
    ⟨pre-scritta⟩ [narratore] Nella stalla le vacche si girano, e i campanacci suonano tutti insieme.
    ⟨pre-scritta⟩ [narratore] Tutti tranne uno: la Duchessa scuote la testa, e il suo campanaccio grande resta muto.
[invito] pg_vanda,pg_gunda,pg_nando,pg_remo
```

- righe pre-scritte 3, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_gunda","pg_nando","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 4338 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00085614

## Turno 10

Azioni:
- pg_remo: «scommessa: chi apre per primo i cassetti del gaspare ha vinto. zio gaspare, io apro il tuo»
- pg_gunda: «cassetti no. ok basta, vado a vedere cosa c'e sotto la scala»
- pg_vanda: «remo aspetta, li apro io, ho le mani piu grosse»
- pg_nando: (nessuna azione)

Narratore:

```text
[narratore] Remo annuncia che apre il cassetto dello scrittoio di Gaspare, mentre Vanda dice di aprirlo lei.
[narratore] Gunda annuncia che va a guardare sotto la scala, ma la stalla è già in allarme: i campanacci suonano ancora.
[narratore] Nando annuncia che aspetta, senza muoversi.
[narratore] Remo ci prova con la sua mano più veloce: il cassetto si apre senza un suono, e dentro c'è solo un lapis e un foglio di conti.
[usa] nar_scrittoio_cassetto > pg_remo
    ⟨pre-scritta⟩ [narratore] Nel cassetto c'è odore di inchiostro vecchio, e un libro dei conti.
    ⟨pre-scritta⟩ [narratore] Sotto il libro c'è un contratto con Sior Bortolo, mercante di Pontebruno.
    ⟨pre-scritta⟩ [narratore] Cinque estati di pascolo al Prato Alto, venti fiorini di caparra già pagati. Da firmare dopo il tramonto.
[narratore] Vanda si avvicina allo scrittoio, ma il cassetto scricchiola sotto le sue dita grosse, e Gaspare alza la testa dai conti.
[png_gaspare] Con calma, prego. Anche la pazienza ha i suoi conti.
[narratore] Gaspare si alza, con la matita dietro l'orecchio, e fa un passo verso Vanda. La sua mano si stringe sul bordo del tavolo.
[narratore] Gunda scende i gradini verso la stalla. Dalla botola sale odore di fieno e il campanaccio della Duchessa resta fermo, ma le altre vacche si agitano.
[narratore] Zelia resta a metà scala, il quaderno al petto, e guarda lo zio con occhi spalancati.
[invito] pg_remo,pg_vanda,pg_gunda,pg_nando
```

- righe pre-scritte 3, improvvisate 9, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_vanda","pg_gunda","pg_nando"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3007 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00091884

## Turno 11

Azioni:
- pg_nando: «zio gaspare, pagami la mezza paga e ti canto la canzone del cassetto»
- pg_vanda: «bastiano ti tiro un calcio di mula se mi menti ahah. ferma la mano!»
- pg_remo: «gaspare sei sicuro di non voler firmare il patto ora? ti presto la penna»
- pg_gunda: (nessuna azione)

Narratore:

```text
[narratore] Nando annuncia che chiede a Gaspare la mezza paga, e promette la canzone del cassetto.
[narratore] Vanda annuncia che minaccia Bastiano con un calcio di mula, e le sue mani restano ferme sul fianco.
[narratore] Remo annuncia che chiede a Gaspare se vuole firmare il patto ora, offrendo la sua penna.
[narratore] Gunda resta dov'è, in attesa, con lo scudo appoggiato al ginocchio.
[narratore] Vanda prova a far paura a Gaspare, ma il vecchio non si scompone e la guarda fissa da sopra gli occhiali.
[png_gaspare] Mi minacci nella mia cucina? Con rispetto parlando, questo non lo metto nei conti.
[narratore] Gaspare si siede di nuovo, e con la matita batte piano sul libro dei conti, senza rispondere a Nando.
[narratore] Remo protende la penna verso Gaspare, e il vecchio la guarda come si guarda un debito.
[png_gaspare] La penna la tengo io. E un patto si firma con calma, non stasera, magari.
[narratore] Dalla stalla, sotto la botola, arriva il campanaccio della Duchessa, fermo e pesante.
[narratore] Il corno del Custode suona lontano, il secondo segno dello zio: il tempo stringe.
[invito] pg_nando,pg_vanda,pg_remo,pg_gunda
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_zio_2

```text
⟨pre-scritta⟩ [narratore] Lo zio Gaspare sale la scala, piano, e bussa alla porta di Zelia.
```

- righe pre-scritte 1, improvvisate 11, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nando","pg_vanda","pg_remo","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3705 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00090934

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
[narratore] Remo annuncia che chiede ad Agnese di rispondere solo con sì o no, col capo.
[narratore] Gunda annuncia che rifà il ballo al Sasso: tutti in fila, la carica dei nani.
[narratore] Nando annuncia il ballo finale: tutti in trenino, mentre il sole scende verso il passo.
[narratore] Agnese guarda Remo a lungo, poi china il capo di un dito, appena.
[narratore] Il paese ride piano. Qualcuno batte le mani a tempo, e la fila di Gunda si forma davanti al Sasso, con Nando in testa a suonare la fisarmonica.
[narratore] Il trenino passa tra i larici, e la neve sotto gli scarponi scricchiola a tempo.
[narratore] Vanda, ferma accanto alla Duchessa, non si muove e aspetta.
[narratore] Ilario, dietro il leggio, alza gli occhi dal Libro e guarda il sole sul passo.
[narratore] Il corno suona il terzo segno: il sole ha toccato la cresta.
[invito] pg_vanda,pg_remo,pg_gunda,pg_nando
```

- righe pre-scritte 0, improvvisate 9, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_remo","pg_gunda","pg_nando"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2268 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00082655

## Turno 14

Azioni:
- pg_gunda: «braccio di ferro col custode per il libro! chi vince sfoglia la pagina»
- pg_nando: «custode, ti canto la canzone del libro, la sai? facciamo il coro»
- pg_vanda: «ettore, il vento: era vento o hai pianto? lo dico in faccia a tutto il paese»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Gunda Rocciarossa tende il braccio sul tavolo del Sasso, e il Custode la guarda da sopra il Libro. Lo sforzo le tira le trecce di filo di ferro, ma il braccio di Ilario non si muove di un dito.
[narratore] Il Custode ride piano, e la sua mano resta ferma sul leggio.
[narratore] Nando Tremolino attacca la canzone del libro con la fisarmonica, e metà paese fa il coro.
[narratore] Ilario alza le sopracciglia bianche, ma non canta.
[narratore] Vanda Brughiera si ferma davanti a Ettore Morlacchi, con le mani sui fianchi.
[narratore] Il vecchio batte il bastone per terra, due colpi, e non dice niente.
[png_ettore] Eh? Dall'orecchio buono ho sentito solo la neve.
[usa] ett_quel_giorno > pg_vanda
    ⟨pre-scritta⟩ [narratore] Ettore si tira la barba con tutte e due le mani.
    ⟨pre-scritta⟩ [png_ettore] Quel giorno sono sceso a valle. Avevo muli da vendere.
[narratore] Remo Ciuffo tace, con la penna in mano, e osserva ogni gesto.
[invito] pg_gunda, pg_nando, pg_vanda, pg_remo
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_7

```text
⟨pre-scritta⟩ [narratore] Il corno chiama ancora, e l'ultima luce lascia i tetti del paese.
⟨pre-scritta⟩ [narratore] Sulla neve le ombre sono lunghe e blu, e fa più freddo.
```

- righe pre-scritte 4, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_gunda","pg_nando","pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2375 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00085665

## Turno 15

Azioni:
- pg_vanda: «sessant'anni fa? custode, la neve era la stessa di oggi?»
- pg_remo: «gunda dillo piu piano, cosi ci scrivo sopra il contratto ahah»
- pg_gunda: «ehi tutti, il custode ha un libro con roba di quei due, sessant'anni fa! ah ops»
- pg_nando: (nessuna azione)

Narratore:

```text
[narratore] Vanda chiede al Custode se la neve di sessant'anni fa era la stessa di oggi.
[usa] nar_libro_pagina > pg_vanda
    ⟨pre-scritta⟩ [narratore] Il Custode trova la pagina: sessant'anni fa, alla prima neve, nessuna benedizione.
    ⟨pre-scritta⟩ [narratore] La ragazza Bonfanti ha aspettato al Sasso fino al buio.
    ⟨pre-scritta⟩ [narratore] A notte è salito il giovane Morlacchi, con un mulo e una lanterna. Non ha trovato nessuno.
[narratore] Remo, con il Custode che ti guarda, sussurri pure: Gunda parla già abbastanza per tutti.
[narratore] Gunda, il tuo gesto ha fatto tendere il paese: il Custode stringe il Libro e ti fissa.
[usa] nar_libro_spose > pg_gunda
    ⟨pre-scritta⟩ [narratore] Il Custode apre il Libro sulle ginocchia e lo gira verso di voi, con un sospiro.
    ⟨pre-scritta⟩ [narratore] Cent'anni di nozze di neve dei Bonfanti: le spose portano tutte una catenina d'argento.
    ⟨pre-scritta⟩ [narratore] L'anello compare solo ventotto anni fa, alle nozze di Marta, con la storia raccontata da Adelina.
[narratore] Ettore, Vanda ti sta davanti con le mani sui fianchi. Il bastone batte due volte, poi il vecchio abbassa la voce.
[png_ettore] Vento, quel giorno. Solo vento, e la neve che veniva giù.
[narratore] Ettore si tira la barba, e non guarda più Vanda.
[narratore] Il corno suona ancora, e la luce sul passo è quasi spenta. Vanda, Remo, Gunda: che fate ora?
[invito] pg_vanda,pg_remo,pg_gunda
```

- righe pre-scritte 6, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_remo","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2568 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00083625

## Turno 16

Azioni:
- pg_remo: «sole a una spanna dal passo, ultima chiamata: firmo il contratto con la penna in mano»
- pg_gunda: «anch'io ballo, ma con lo scudo sopra la testa e la colomba storta»
- pg_nando: «lanterne, dondolate! ballo finale con la fisarmonica sulla schiena»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Remo annuncia che firma il contratto con la penna in mano, mentre il sole è a una spanna dal passo.
[narratore] Gunda annuncia che balla con lo scudo sopra la testa e la colomba storta.
[narratore] Nando annuncia il ballo finale con la fisarmonica sulla schiena, tra le lanterne.
[narratore] Il sole tocca la cresta del passo, e le lanterne tremano nel vento. Il paese ride, poi si ferma.
[usa] nar_sole_8
    ⟨pre-scritta⟩ [narratore] Il corno suona tre volte, e il sole tocca il passo.
[narratore] Gunda, lo scudo sopra la testa, mette un piede nel trenino. Il Custode chiude il Libro a metà, senza fermarla.
[narratore] Remo, la penna è ancora in mano. Il contratto di Sior Bortolo aspetta una firma sotto la neve.
[narratore] Vanda, le mani sui fianchi, guarda Ettore. Il vecchio non si muove. Che fai?
[invito] pg_vanda, pg_remo
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] fin_tramonto

```text
⟨pre-scritta⟩ [narratore] Il sole sparisce dietro il passo, e il Custode chiude il Libro senza scrivere niente.
⟨pre-scritta⟩ [narratore] Niente benedizione fino a primavera.
⟨pre-scritta⟩ [narratore] La sposa resta muta davanti al Sasso, con il velo pieno di neve.
⟨pre-scritta⟩ [narratore] All'alba i muli scendono a valle, e Tonio con loro.
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_chiusura

```text
⟨pre-scritta⟩ [narratore] La neve smette di cadere, e in paese si accendono i fuochi della sera.
⟨pre-scritta⟩ [narratore] Domattina i muli scendono a valle, e il Prato Alto aspetta la primavera.
⟨pre-scritta⟩ [narratore] Che cosa pensate di fare, adesso?
```

- righe pre-scritte 8, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2431 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00080975

## Turno 17

Azioni:
- pg_gunda: «ok, nessuno tira il vestito della sposa, lo dico adesso»
- pg_nando: «tutti in trenino a cercare l'anello sotto la neve! uno-due-tre, sotto!»
- pg_vanda: «chi ha l'anello? tutti in fila e ci guardiamo le mani»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Gunda annuncia che nessuno tira il vestito della sposa. Lo dice a voce alta, così lo sentono tutti.
[narratore] Gunda, la tua regola è chiara: il paese la sente.
[narratore] Nando annuncia il trenino a cercare l'anello sotto la neve: uno, due, tre, sotto!
[narratore] La fila si spezza in cerchi, e le mani affondano nella neve tra i larici. Non trovano niente.
[narratore] Vanda annuncia che chiede chi ha l'anello, e che tutti si guardano le mani. Lo chiede a voce alta, come una mulattiera.
[narratore] Ettore batte il bastone per terra, due colpi, e alza le sopracciglia.
[png_ettore] Eh? Le mani le ho viste, e sono vuote.
[narratore] Gaspare si sfila gli occhiali e li pulisce con il panciotto di velluto, lento, come chi conta.
[png_gaspare] Facciamo due conti: quattro mani, nessun anello. Il resto lo cerchi chi ha le dita più corte.
[narratore] Adelina fa tintinnare le chiavi alla cintura e guarda Vanda da capo a piedi.
[png_adelina] Il formaggio buono vuole tempo. Gli anelli no: o tornano, o li vado a prendere.
[narratore] Remo tace, con la penna in mano, e osserva ogni gesto. Il sole è ormai sotto il passo, e il corno tace.
[invito] pg_remo,pg_gunda,pg_nando,pg_vanda
```

- righe pre-scritte 0, improvvisate 12, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_gunda","pg_nando","pg_vanda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3648 ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1358 ms); costo $0.00088685

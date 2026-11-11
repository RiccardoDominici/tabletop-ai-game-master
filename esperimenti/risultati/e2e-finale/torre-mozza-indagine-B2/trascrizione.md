# Trascrizione torre-mozza-indagine-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-11T00:35:22.432Z · PG: pg_livia, pg_fulco, pg_eliandro

Righe dopo `[usa] <id>`: battuta pre-scritta uscita (marcata `⟨pre-scritta⟩`). Le altre righe sono improvvisate dal modello.

## Turno 0 — apertura (scena_ovile) (testo fisso della scena)

```text
[narratore] Spinalba è un borgo di pastori sotto la Torre Mozza.
[narratore] Da tre settimane, nella torre in rovina, ci sono i goblin.
[narratore] La notte scorsa è sparito Tonio, il figlio della pastora Berta, e sulla porta è comparsa una lavagna.
[narratore] All'ovile l'aria sa di lana bagnata, e dal fienile guaiscono i cani.
[narratore] Berta vi aspetta sotto il portico, con una chiave di ferro stretta nel pugno.
[narratore] Al cancello Ugo il carbonaio sputa per terra: chi di voi parla per primo?
```

## Turno 1

Azioni:
- pg_livia: «Berta, quando hai visto Tonio per l'ultima volta? E chi sapeva della chiave, oltre a te?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Berta quando ha visto Tonio l'ultima volta, e chi sapeva della chiave.
[usa] ber_cose_tonio > pg_livia
    ⟨pre-scritta⟩ [png_berta] Gli stivali buoni e il mantello. E il pane della settimana, tutto.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 1, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3258 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00034357

## Turno 2

Azioni:
- pg_livia: «Anch'io guardo la lavagna, con lo scudo appoggiato al muro per leggere meglio.»
- pg_fulco: «Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?»
- pg_eliandro: «Copio sul quaderno la scritta della lavagna, lettera per lettera.»

Narratore:

```text
[narratore] Livia appoggia lo scudo al muro e si china sulla lavagna, con la luce del portico che le cade sulle spalle.
[usa] nar_lavagna > pg_livia
    ⟨pre-scritta⟩ [narratore] Le lettere sono grandi e tonde, tracciate piano con il carbone.
    ⟨pre-scritta⟩ [narratore] Ogni erre è rovesciata, con la pancia dalla parte sbagliata.
[narratore] Eliandro copia la scritta lettera per lettera, ma le ombre del portico si allungano sul foglio e le lettere si confondono. Intanto Ugo carica il mulo e lo spinge verso il sentiero del bosco.
[narratore] Fulco stringe gli occhi sulla chiave che Berta tiene al collo: il ferro è scuro e l'anello è stato limato da mani poco esperte, ma non sa dire se sia lavoro di nano.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2102 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00046557

## Turno 3

Azioni:
- pg_fulco: «Chiedo a Ugo, al cancello, se ha visto luci o gente salire verso la torre.»
- pg_livia (privata): «Mi avvicino a Berta, a bassa voce: «Sei in arretrato con la decima del balivo di Valdirame?»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si volta verso il cancello dello stazzo e chiede a Ugo se ha visto luci o gente salire verso la torre.
[usa] ugo_niente_visto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Ugo si gratta la barba bruciacchiata e guarda altrove.
    ⟨pre-scritta⟩ [png_ugo] Io non vedo niente. Guardo il fuoco, io.
[narratore] Livia si avvicina a Berta e le sussurra la domanda sulla decima. Berta le lancia un'occhiata dura, ma non risponde.
[narratore] Il vento del crinale porta fino al cortile un fumo acre di carbonaia, e il mulo di Ugo sbuffa.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1744 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00047707

## Turno 4

Azioni:
- pg_eliandro (privata): «Chiedo a Berta, sottovoce, chi a Spinalba sapeva che la chiave era ancora in casa.»
- pg_fulco: «Conto le pecore nel recinto mentre aspetto. Sono tutte.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro chiede a Berta, sottovoce, chi a Spinalba sapeva che la chiave era ancora in casa.
[narratore] Berta si stringe lo scialle e guarda il cancello, poi torna su di lui. Le sue dita trovano la chiave al collo.
[png_berta] Lo sapevano in molti. Chi sale al crinale a Natale, chi porta il latte alla torre. Mio figlio non doveva dirlo a nessuno.
[narratore] Fulco conta le pecore nel recinto, una per una. Sono tutte, e una di loro lo guarda con occhi gialli nell'ombra.
[narratore] Fulco conta le pecore nel recinto. Sono tutte, ma la più vecchia si sposta verso il cancello.
[usa] nar_recinto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Il cancello è intero, e il chiavistello è al suo posto.
    ⟨pre-scritta⟩ [narratore] Dentro, le pecore ci sono tutte, e ruminano tranquille.
[narratore] Sul fondo del cortile, Ugo tira il mulo verso il sentiero e si volta a guardarvi, come chi aspetta una risposta.
[invito] pg_livia, pg_eliandro
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 4
- primo audio dalla chiusura della finestra: 1924 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00058697

## Turno 5

Azioni:
- pg_livia: «Ugo, tu che sei del posto: chi qui sa scrivere così bene?»
- pg_eliandro: «Dico agli altri: i goblin non sanno fare lettere con il carbone. Chi ha scritto questa lavagna sa scrivere, e non è un goblin.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Ugo chi, a Spinalba, scrive così bene. Ugo non risponde subito: guarda la lavagna, poi lei.
[png_ugo] Qui a scrivere sono in pochi. Il prete, e i figli dei Benni, quando c'era la scuola.
[narratore] Eliandro dice agli altri che i goblin non sanno fare lettere col carbone, e che chi ha scritto la lavagna sa scrivere. La sua voce è sicura, come se contasse già i nomi.
[narratore] Ugo lascia il mulo e si ferma. Il suo tiro è riuscito a metà: le ultime parole gli escono di bocca senza che lui le voglia.
[usa] ugo_stanotte > pg_livia
    ⟨pre-scritta⟩ [narratore] Ugo si toglie il cappello e se lo rigira tra le mani.
    ⟨pre-scritta⟩ [png_ugo] Ieri notte? Alla carbonaia, il fuoco non si lascia.
[narratore] Ugo sposta il peso da una gamba all'altra e batte la pala per terra due volte.
[invito] pg_livia, pg_eliandro
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1851 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059557

## Turno 6

Azioni:
- pg_fulco (privata): «Ugo, a parte, a bassa voce: «Dove passa la strada per la torre, e chi sale di notte?»»
- pg_livia: «Berta, dammi la chiave: ti riporto Tonio prima di mezzanotte. Ti do la mia parola di soldato.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si avvicina a Ugo e abbassa la voce, come chi non vuole essere sentito dal cortile.
[narratore] Ugo fa un passo indietro e stringe la pala.
[narratore] Livia tende la mano verso Berta, con il palmo aperto.
[usa] ber_chiave > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta si sfila il laccio dal collo e vi mette in mano la chiave.
    ⟨pre-scritta⟩ [png_berta] È fredda, la chiave. Riportami lui, non l'argento.
[narratore] Berta stringe la chiave con tutte e due le mani, e sul portico il vento le scompiglia lo scialle.
[privato pg_fulco] Ugo non ti guarda, ma la sua voce basta: il sentiero passa sotto il crinale, e di notte qualcuno lo sale con un mulo.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1694 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00066227

## Turno 7 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 8

Azioni:
- pg_fulco: «Dico agli altri: sotto ogni torre dei nani c'è una postierla, un passaggio basso verso il bosco. Di solito sbuca in cantina.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco parla agli altri della postierla: un passaggio basso sotto ogni torre dei nani, che di solito sbuca in cantina. Lo dice a voce bassa, come chi ricorda una cosa vista da bambino.
[narratore] Ugo si volta a sentire, poi torna al fuoco senza commentare.
[narratore] Nel bosco, in fondo al sentiero, un ramo scricchiola due volte, poi tace.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 4075 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061945

## Turno 9

Azioni:
- pg_eliandro (privata): «Cerco segni incisi sul legno lungo il sentiero, senza farmi sentire.»
- pg_livia: «Scendo per prima, scudo avanti, e controllo che il sentiero sia libero.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia scende per prima, con lo scudo avanti, e controlla il sentiero. Eliandro, sfiorando il legno, cerca i segni incisi, ma le dita non trovano nulla di riconoscibile.
[privato pg_eliandro] Il legno è liscio dove dovrebbe graffiare, e in un punto una scheggia è stata levata di fresco. Non sai dire da chi.
[narratore] Livia avanza di tre passi sul fango. Le sue suole affondano, e un ramo basso le sfiora la spalla.
[usa] nar_impronte > pg_livia
    ⟨pre-scritta⟩ [narratore] Nel fango ci sono impronte piccole, di piedi nudi con le unghie lunghe.
    ⟨pre-scritta⟩ [narratore] Accanto ci sono quelle di un paio di stivali da ragazzo, a passo lungo. A tratti gli stivali vanno davanti a tutti.
[narratore] Fulco resta fermo accanto al cancello, e ascolta.
[usa] nar_segno_1
    ⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
[invito] pg_livia,pg_eliandro,pg_fulco
```

- righe pre-scritte 3, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1864 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073195

## Turno 10

Azioni:
- pg_fulco: «Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin, e la benedizione è tua.»»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco porge a Ugo il pane del tempio e abbassa la voce: «Dimmi dove passano i goblin, e la benedizione è tua.»
[png_ugo] [sbuffa, ma non rifiuta il pane] Benedizioni. Io coi preti non c'ho mai avuto a che fare.
[narratore] Ugo non prende il pane subito. Guarda il sentiero, poi la torre, poi il nano.
[png_ugo] Il sentiero passa sotto il crinale. Per il resto, lei lo sa già: non si chiedono strade a un carbonaio.
[narratore] Ugo spinge il pane nella tasca del grembiule e torna alla pala, senza aggiungere altro. Il fumo della carbonaia si piega verso il bosco.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2630 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075715

## Turno 11

Azioni:
- pg_livia: «Mi arrampico sul muretto di pietra del bosco per vedere la torre dall'alto.»
- pg_eliandro: «Anch'io salgo, tengo il quaderno sotto il mantello e mi aggrappo al ramo.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia si arrampica sul muretto di pietra e si tira su con le braccia, lo scudo che sbatte contro il sasso.
[narratore] Le dita scivolano sul muschio umido e lei cade all'indietro, con un tonfo sordo sul fango.
[narratore] Eliandro segue il ramo con il quaderno stretto sotto il mantello, ma il legno è viscido e la sua presa non regge: scivola e si ritrova a terra accanto a lei.
[narratore] Sopra gli alberi la Torre Mozza resta nera sul cielo, e dal crinale scende ancora il corno di capra, lungo e stonato.
[invito] pg_livia,pg_eliandro,pg_fulco
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2359 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076935

## Turno 12 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 13

Azioni:
- pg_fulco: «Tiro con la fionda al goblin più vicino.»
- pg_eliandro: «Lancio il dardo incantato contro il goblin che sta arrivando.»
- pg_livia: «Vedo i goblin davanti alla porta della torre. Sguaino la spada e carico.»

Narratore:

```text
[narratore] Fulco scocca la fionda e il sasso colpisce Zirrà al fianco: la goblin si piega di lato, e lo scudo rosso le scivola per un momento dal braccio.
[narratore] Eliandro tende la mano e il dardo incantato parte con un sibilo azzurro, e prende Grosso alla spalla. L'hobgoblin lascia cadere l'osso e si volta verso di lui.
[narratore] Livia sguaina la spada e carica: la lama scende su Grosso con tutto il peso, e l'hobgoblin crolla a terra con un grugnito, fuori combattimento.
[narratore] Zirrà ride corto, si rialza e batte la spada corta sullo scudo. Il colpo che le risponde le arriva dritto in pancia.
[narratore] Fulco barcolla e si tiene alla mazza. Sopra di loro il fuoco crepita, e Tonio si stringe nelle spalle sui gradini della cantina.
[usa] zir_chiave_prima > pg_livia
    ⟨pre-scritta⟩ [narratore] Zirrà pianta la spada corta tra due pietre e allunga la mano, a palmo in su. Poi schiocca le dita verso la cantina.
    ⟨pre-scritta⟩ [narratore] Il ragazzo si alza da solo, e la corda gli scivola dai polsi.
    ⟨pre-scritta⟩ [png_zirra] Prima la chiave, poi il ragazzo. Buttala qui, ai miei piedi.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 3, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1984 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00086481

## Turno 14

Azioni:
- pg_eliandro: «Mi tengo dietro la pietra e tiro il pugnale al primo che scappa.»
- pg_livia: «Colpisco il goblin con la spada lunga, scudo davanti.»
- pg_fulco: «Con la mazza sfondo la testa al goblin che si rialza.»

Narratore:

```text
[narratore] Eliandro si nasconde dietro la pietra e tira il pugnale al primo goblin che scappa. La lama colpisce Zirrà di lato; lei sussulta, ma resta in piedi.
[narratore] Livia carica con la spada lunga, lo scudo davanti. Il colpo scende su Zirrà con tutto il peso: la goblin barcolla, e il sangue le macchia la pelle grigioverde.
[narratore] Fulco scende con la mazza sulla testa di Zirrà, che si rialzava. Il colpo la butta a terra, e lei non si muove più.
[narratore] Il fuoco crepita. Grosso è a terra, ansima. Tonio, sui gradini, stringe le ginocchia al petto.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1924 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00079411

## Turno 15

Azioni:
- pg_fulco: «Tiro ancora con la fionda al goblin che scappa verso la cantina.»
- pg_eliandro (privata): «Mentre gli altri combattono, cerco nella pietra nuova una porta segreta.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Fulco scocca un altro sasso: il goblin che scappa verso la cantina inciampa sul gradino e cade lungo la scala. Il sasso gli passa sopra la schiena.
[narratore] Eliandro si china sulla pietra nuova e passa le dita lungo le commessure, dove la malta è più chiara. Sotto il polpastrello c'è una linea sottile, quasi un'incisione.
[privato pg_eliandro] Tra la pietra nuova e il muro vecchio c'è una fessura dritta, alta quanto una porta bassa. Sotto il pollice senti un piccolo incavo, come un gancio nascosto nel muro.
[usa] nar_conto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Accanto alla porta di ferro ci sono tacche a carbone, a gruppi di cinque.
    ⟨pre-scritta⟩ [narratore] Sotto c'è una scritta storta: decima, quaranta d'argento.
[invito] pg_livia,pg_fulco
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1800 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078741

## Turno 16

Azioni:
- pg_livia: «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo? Parla, o ti lascio qui.»»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia blocca il goblin ferito contro il muro, lo scudo premuto sul petto di lui.
[png_zirra] [ride corto] Ragazzo? Chi lo sa. Il mio prezzo è la chiave, non la tua faccia.
[narratore] Zirrà fa un cenno con il mento verso la cantina, poi torna a guardare Livia.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2846 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073131

## Turno 17

Azioni:
- pg_eliandro: «Anch'io gli stringo la spalla e chiedo: «Chi vi ha dato le lettere per scrivere?»»
- pg_fulco: «Cerco sul muro la pietra nuova che suona vuota, dove può esserci la postierla.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro stringe la spalla di Zirrà e le chiede chi ha dato le lettere per scrivere.
[png_zirra] Le lettere? [laugh] Le ha date la torre. Chi scrive lì, scrive per il prezzo.
[narratore] Fulco passa la mano sul muro dove la pietra è nuova e suona vuota.
[usa] nar_mappa > pg_fulco
    ⟨pre-scritta⟩ [narratore] Col carbone qualcuno ha disegnato la torre vista dall'alto, con una freccia che scende in cantina.
    ⟨pre-scritta⟩ [narratore] Accanto c'è scritto cripta, con le erre rovesciate.
[narratore] Sotto il polpastrello di Fulco la pietra cede di un dito, e dietro c'è un vuoto: una postierla, alta quanto una porta bassa.
[narratore] Zirrà si volta verso il nano e batte la spada sullo scudo, una volta sola.
[invito] pg_livia, pg_eliandro
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1711 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078441

## Turno 18

Azioni:
- pg_livia: «Scendo dietro di lui, scudo in avanti, nel passaggio stretto.»
- pg_fulco: «Entro per la postierla con la mazza pronta, e chiamo Livia piano.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia scende dietro il ragazzo... no, dietro Zirrà... Livia scende per prima nel passaggio stretto, con lo scudo avanti.
[narratore] Fulco entra dopo di lei con la mazza pronta, e chiama Livia piano. La pietra sotto i suoi stivali è fredda e scivola.
[narratore] Dal fondo della postierla arriva un suono secco, come di un gancio che si stacca dal muro. Poi il silenzio.
[invito] pg_livia,pg_fulco
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1762 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073831

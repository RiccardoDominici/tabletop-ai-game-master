# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T03:12:40.002Z · PG: pg_livia, pg_nespola, pg_eliandro

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

## Turno 1 — evento violazione

## Turno 1

Azioni:
- pg_livia: «Berta, la torre è quella sopra il bosco? Ci andiamo adesso, prima di mezzanotte.»
- pg_nespola (privata): «Ugo, a parte, a bassa voce: «Tonio è vivo? Dimmi la verità, cmq non dico niente.»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede se la torre è quella sopra il bosco, e Berta annuisce senza alzare lo sguardo.
[png_berta] Quella. Sopra il bosco, dove il crinale fa il gobbo.
[narratore] Nespola si avvicina a Ugo con passo leggero e gli parla a bassa voce vicino al mulo.
[privato pg_nespola] Ugo ti guarda storto, poi ti dice che le tre monete le avrà solo a carbone finito. Ti ride in faccia, ma ammette che ha visto un'ombra salire verso la torre ieri sera.
[narratore] Eliandro resta fermo sotto il portico, con il quaderno chiuso sotto il braccio, e fissa la lavagna.
[usa] fin_ovile_senza > pg_livia
    ⟨pre-scritta⟩ [narratore] Il sentiero entra nel bosco subito dietro il fienile.
    ⟨pre-scritta⟩ [narratore] Berta resta sotto il portico, con la chiave stretta nel pugno. Tra i faggi, il mulo di Ugo è già un'ombra.
[usa] tr_bosco
    ⟨pre-scritta⟩ [narratore] Sotto i faggi il buio arriva di colpo.
    ⟨pre-scritta⟩ [narratore] L'odore di fumo cresce a ogni passo, e da lontano si sente sibilare una carbonaia.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 4, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1293 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004835

## Turno 2 — evento violazione

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si avvicina a Berta sotto il portico e abbassa la voce, mentre tutti gli altri restano nel cortile.
[privato pg_eliandro] Berta ti porta nel fienile, lontano dal cortile: la paglia è scostata sul giaciglio di Tonio, e sotto c'è un sacchetto di monete con un nastro rosso.
[narratore] Livia e Nespola restano al cancello, con Ugo che batte la pala per terra.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3816 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0003868

## Turno 3 — evento mondo

## Turno 3 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 4

Azioni:
- pg_nespola: «Corro avanti sul sentiero, mi fermo ogni dieci passi per ascoltare.»
- pg_livia: «Scendo per prima, scudo avanti, guardo i rami sopra la testa.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola corre avanti sul sentiero e ogni dieci passi si ferma. Il fango è ancora fresco, e il rumore dei suoi passi basta a far volare via un gufo dal faggio sopra di lei.
[narratore] Livia scende per prima, scudo avanti, e guarda i rami sopra la testa. Non c'è niente, solo gocce che cadono dalle foglie.
[narratore] Eliandro resta indietro, fermo, come deciso.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Ugo, dalla radura, sputa per terra e non alza nemmeno la testa.
[invito] pg_livia, pg_nespola
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00053828

## Turno 5 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 6

Azioni:
- pg_eliandro: «Io sono lento, resto dietro la pietra e tiro quando vi siete mossi.»
- pg_livia: «Vedo tre goblin davanti alla porta. Io carico dopo di lei, scudo avanti.»
- pg_nespola: «Io sono la più veloce di tutti, vado per prima: passo di lato prima che arrivi.»

Narratore:

```text
[narratore] Eliandro resta dietro la pietra, il quaderno stretto al petto, e aspetta il momento giusto per tirare.
[narratore] Livia carica Zirrà con lo scudo avanti e la spada lunga le batte sulla spalla: la goblin barcolla e ride corto, ferita ma in piedi.
[narratore] Nespola prova a scartare di lato, ma il piede scivola sul fango gelato e resta esposta davanti alla spada corta di Zirrà.
[png_zirra] [laugh] Scivolata, piccola! Mi sa che la chiave la vuoi tu, eh?
[usa] zir_chiave_prima > pg_nespola
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061134

## Turno 7 — evento violazione

## Turno 7 — evento violazione

## Turno 7

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola scatta alle spalle di Zirrà e la spada corta affonda nella schiena scoperta. La goblin urla, si piega in avanti e dal fianco cade un fiotto scuro sul fango.
[narratore] Zirrà si volta, ferita gravemente, ma ancora in piedi, con lo scudo rosso stretto davanti.
[png_zirra] Scorretta! Alle spalle, che vergogna. Ma va bene, va bene, mi hai fatta arrabbiare.
[narratore] Grosso si alza dal fuoco con la mazza in pugno, e il fuoco gli sporge un'ombra enorme sul muro.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: 643 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061944

## Turno 8

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e carica la goblin al centro con la spada lunga. Zirrà si ritrae di un passo, ma il colpo passa di lato: Livia si sbilancia sul fango gelato e per un momento la sua linea si apre.
[narratore] Grosso sogghigna e ruota la mazza ferrata verso di lei, mancandola di un soffio.
[png_grosso] Carne lenta. Mazza più veloce.
[narratore] Eliandro, dietro la pietra, stringe il quaderno e aspetta il suo turno.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 41 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00063254

## Turno 9 — evento violazione

## Turno 9 — evento violazione

## Turno 9 — evento violazione

## Turno 9

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lancia il pugnale da dietro la pietra. Lama e vento fischiano insieme, e il colpo trova Zirrà alla spalla, dove lo scudo non copre. La goblin cade in ginocchio sul fango e non si rialza.
[narratore] Grosso sente il corpo cadere e il suo sguardo si ferma sulla scala. Poi getta la mazza nel fuoco e si tira indietro verso il buio della cantina.
[narratore] I goblin rimasti ritrovano le gambe e scappano verso il crinale, lasciando la torre al silenzio e al fumo.
[narratore] Tonio, sui gradini, stringe le ginocchia al petto. Chi di voi scende per primo verso di lui?
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068464

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»

Narratore:

```text
[narratore] Livia alza lo scudo e lo tiene davanti: la lancia del goblin batte sul bordo e scivola via. Resta in piedi, con il braccio che tremola.
[narratore] Nespola scatta di lato, lasciandosi Zirrà alle spalle, e il suo passo sul fango non fa rumore.
[narratore] Eliandro lancia il pugnale ancora una volta. Il goblin si gira verso di lui, ma la lama lo raggiunge alla gola: è già caduto.
[narratore] Grosso sparisce nel buio della cantina. Tonio, sui gradini, guarda la scena senza parlare.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 3
- primo audio dalla chiusura della finestra: 2659 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00069334

## Turno 11 — evento violazione

## Turno 11 — evento violazione

## Turno 11 — evento violazione

## Turno 11 — evento violazione

## Turno 11 — evento violazione

## Turno 11

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola si sposta di lato e il suo passo sul fango non fa rumore. Il goblin la ferisce alla spalla: un colpo secco, e lei sente il sangue caldo scenderle sotto la giacca di cuoio. Indietreggia, ma resta in piedi.
[narratore] Livia spinge Zirrà contro il muro con lo scudo e la colpisce con la spada lunga. Il corpo sbatte sulla pietra e scivola a terra, immobile.
[narratore] Eliandro resta dietro la pietra, il quaderno chiuso al petto, e osserva la scena in silenzio.
[narratore] Dal fuoco, Grosso si è ritirato nella cantina: il suo respiro pesante arriva dalla scala buia.
[usa] nar_mappa > pg_livia
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda da vicino i segni a carbone sul muro» solo: muro⟩
[narratore] Livia, vicino al muro, vede i segni a carbone: una mappa grezza di cunicoli e di una croce sopra la cripta. Che fai?
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 4
- primo audio dalla chiusura della finestra: 1976 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00079474

## Turno 12 — evento violazione

## Turno 12

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»

Narratore:

```text
[narratore] Eliandro lancia il dardo incantato, e la luce colpisce il goblin alle spalle di Nespola: il corpo si piega e cade sul fango, senza più muoversi.
[narratore] Livia si china su Nespola, la trascina dietro lo scudo e la copre col proprio corpo, mentre Nespola striscia dietro la pietra con la spalla che sanguina.
[narratore] Nel cerchio dei muri resta solo il fuoco. Dalla cantina non arriva più nessun respiro. Sui gradini, Tonio alza la testa verso di voi.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2084 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075964

## Turno 13 — evento violazione

## Turno 13

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e avanza verso i goblin, la voce ferma nel cortile del fuoco.
[narratore] Livia grida ai goblin di fermarsi, di dire chi li paga.
[narratore] Eliandro arretra verso la scala con il quaderno stretto al petto, tre passi, senza fare rumore.
[narratore] Nel cerchio dei muri il fuoco crepita. Dalla cantina non si sente nulla. Sui gradini Tonio alza di nuovo la testa, e tra le sue mani la corda ha un nodo allentato.
[narratore] Nespola, dietro la pietra, ferita alla spalla, osserva il buio sopra la scala.
[invito] pg_livia,pg_eliandro,pg_nespola
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1902 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077494

## Turno 14 — evento violazione

## Turno 14

Azioni:
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale verso il goblin che scappa verso la cantina. La lama fischia nel buio della scala, ma il bersaglio è già sparito giù per i gradini.
[narratore] Livia non colpisce. Il goblin davanti esita, guarda il compagno ferito, e per un momento resta immobile sulla soglia.
[narratore] Nespola, dietro la pietra, ferita alla spalla, non si muove e ascolta il respiro che arriva dalla cantina.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[invito] pg_nespola,pg_livia
[narratore] Eliandro, il pugnale vola nel buio della scala, ma il goblin è già sparito nella cantina: la lama batte sul gradino vuoto e rimbalza nel fango.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 2; azioni senza risposta 0/2, riparazioni 1; invito: ["pg_nespola","pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1935 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00152228

## Turno 15

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia non sta mirando a nessuno: il goblin davanti a lei è già crollato contro il muro, e davanti alla soglia non c'è più nessuno da colpire. Il suo colpo di spada lunga affonda nel vuoto e batte sulla pietra.
[narratore] Eliandro si china accanto a Nespola, stacca la sciarpa dal collo e gliela stringe attorno alla spalla. Il sangue si ferma pian piano, ma la mano le trema.
[narratore] Nespola, dietro la pietra, ascolta il respiro che arriva dalla cantina. Il fuoco crepita, Zirrà giace immobile sul fango.
[narratore] Dalla scala buia non arriva più nessun rumore. Sui gradini, Tonio alza la testa e guarda le vostre mani. Che fate ora?
[invito] tutti
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 2161 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00080194

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16

Azioni:
- pg_eliandro: «Lo tengo fermo col piede e chiedo: «Dov'è il ragazzo?»»
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china sul goblin ancora schiacciato dal piede, ma il ginocchio gli cede e la domanda gli esce in un sussurro.
[narratore] Il goblin sbuffa, scuote la testa e non risponde: guarda verso la cantina, come se la risposta fosse lì.
[narratore] Livia sbatte lo scudo contro la porta, ma l'ultimo goblin scivola di lato, la lancia gli sfugge di mano e il colpo resta a metà.
[narratore] Dal fondo della cantina arriva un colpo sordo, e poi il silenzio. Sui gradini Tonio si stringe più forte le ginocchia.
[narratore] Nespola, dietro la pietra, stringe la spalla fasciata e guarda la scala buia. Che fate?
[invito] pg_livia,pg_eliandro,pg_nespola
[narratore] Livia Sarti spinge con lo scudo, ma l'ultimo goblin scivola di lato e la porta sbatte sul vuoto: lo scudo le sfugge dal braccio e lei barcolla in avanti.
[narratore] Livia, il goblin ti passa accanto con la lancia e resta fuori dalla tua portata, ma il suo sguardo cade sulla scala. Che fai?
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 1/2, riparazioni 1; invito: ["pg_livia","pg_eliandro","pg_nespola"]; anomalie: 5
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00163918

## Turno 17 — evento violazione

## Turno 17

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia, la porta resta chiusa. Di là, sotto la soglia, il respiro di Grosso si ferma.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1135 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059674

## Turno 18 — evento violazione

## Turno 18

Azioni:
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, le azioni sono dette al tavolo solo come gesti. Tu lavori in silenzio, e la tua risposta arriva in una chiamata a parte.
[privato pg_eliandro] Dietro la porta non si sente più il respiro di Grosso. Sotto la soglia, il legno è umido e scuro: qualcuno ci è passato di sangue.
[narratore] Nespola, Livia, il silenzio dietro la porta dura troppo.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1116 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065944

# Trascrizione torre-mozza-stallo-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T02:55:07.594Z · PG: pg_livia, pg_fulco, pg_eliandro

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
- pg_livia: «Cosa facciamo? Aspettiamo qui o andiamo?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede se aspettare o muovere. Berta stringe la chiave al collo e non risponde subito.
[png_berta] Le pecore non aspettano. Mio figlio nemmeno.
[narratore] Ugo sputa di nuovo, e guarda il sentiero dietro il fienile.
[png_ugo] Lei aspetta, o va? Il carbone non si aspetta.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3150 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0003662

## Turno 2

Azioni:
- pg_fulco: «Non lo so. Berta è lì sotto il portico, sta zitta.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si ferma accanto al cancello. Berta resta sotto il portico, zitta, con la mano sulla chiave.
[narratore] Il fienile è vuoto di voci. Solo i cani grattano la porta.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2392 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0003724

## Turno 3

Azioni:
- pg_eliandro: «C'è qualcosa qui? Non vedo niente di strano, boh.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro guarda intorno al cortile: il cancello, il fienile, la lavagna sulla porta. Non trova niente di strano, ma nota che la paglia del fienile è smossa.
[narratore] Nel cortile non si muove nessuno. Livia e Fulco restano dove sono.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3244 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004121

## Turno 4

Azioni:
- pg_livia: «Aspetto.»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia dice che aspetta. Berta non si muove, la mano stretta sulla chiave al collo. Dal fienile i cani smettono di grattare e tacciono.
[usa] nar_attesa_ovile
    ⟨pre-scritta⟩ [narratore] Nello stazzo una pecora bela, e un'altra le risponde. Dal paese arriva odore di minestra e di fumo.
[narratore] Ugo sputa sul selciato e volta le spalle al cancello. Dal sentiero dietro il fienile si sente un'altra volta il vento del crinale.
[usa] ugo_attesa
    ⟨pre-scritta⟩ [narratore] Ugo batte la pala per terra due volte.
    ⟨pre-scritta⟩ [png_ugo] Paese. Sempre domande, mai carbone.
[narratore] Eliandro, Berta è ferma sotto il portico e non parla più. Che fai?
[invito] pg_eliandro,pg_fulco
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_giaciglio

```text
⟨pre-scritta⟩ [narratore] La paglia è ancora schiacciata nella forma di un corpo.
⟨pre-scritta⟩ [narratore] Il chiodo degli stivali è vuoto, e così quello del mantello. Nella cassetta del pane restano solo briciole.
```

- righe pre-scritte 3, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2881 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004632

## Turno 5

Azioni:
- pg_fulco: «Mi siedo sul muretto dello stazzo.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si siede sul muretto dello stazzo. La pietra è fredda e scricchiola sotto il peso. Davanti a lui il cancello di legno, con i nomi delle pecore incisi sui pali.
[usa] nar_recinto > pg_fulco
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG esamina il cancello dello stazzo» solo: stazz⟩
[narratore] Livia e Eliandro restano in piedi nel cortile. Berta non si muove sotto il portico, la mano sempre sulla chiave.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2944 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004937

## Turno 6

Azioni:
- pg_eliandro: «Guardo in giro.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro guarda in giro il cortile: il cancello, il fienile, la lavagna sulla porta. Sotto il portico, Berta non stacca gli occhi dal sentiero.
[usa] nar_segno_1
    ⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
[narratore] Dal crinale arriva un suono sottile, come un corno che si spegne a metà.
[invito] pg_eliandro
```

- righe pre-scritte 1, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2375 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004921

## Turno 7

Azioni:
- pg_livia: «Aspetto ancora. Tanto Berta ci chiama, no?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia dice che aspetta ancora, e che Berta li ha chiamati. Berta alza lo sguardo dalla chiave.
[png_berta] Mi avete chiamati voi, dentro il mio cortile. Restate, allora.
[narratore] Il corno sul crinale suona di nuovo, più vicino.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3601 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000502

## Turno 8

Azioni:
- pg_fulco: «Ci penso. Aspetto.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Il corno sul crinale suona ancora, più vicino. Dal fienile i cani scattano verso il sentiero e spariscono nel buio.
[usa] nar_cani_scappano
    ⟨pre-scritta⟩ [narratore] Un cane spalanca con il muso la porta del fienile e corre al sentiero, scodinzolando.
    ⟨pre-scritta⟩ [narratore] Al limite degli alberi si ferma, si volta e aspetta.
[png_berta] Ascoltate. Non sto a ripeterlo. Le pecore non aspettano.
[invito] tutti
[narratore] Fulco, il tuo silenzio resta sul muretto dello stazzo. Dal crinale il corno suona ancora, e la paglia del fienile trema sotto i cani che fuggono.
[invito] pg_fulco
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 3124 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0010382

## Turno 9 — evento violazione

## Turno 9 — evento violazione

## Turno 9

Azioni:
- pg_livia (privata): «Ugo, a parte, sottovoce: chi passa dal cancello di notte?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia si avvicina a Ugo, a voce bassa, mentre Berta guarda altrove.
[narratore] Ugo si volta lentamente verso di lei, con la pala ancora in mano.
[usa] ugo_notte_promessa > pg_livia
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di ugo_notte_promessa (prometto, giuro, balivo, parola) è nell'azione⟩
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: null ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0.0004944

## Turno 10 — evento violazione

## Turno 10

Azioni:
- pg_fulco: «Che fai, Livia? Ci hai pensato? Io non mi fido di Ugo, mi sa che tiene le cose per sé.»
- pg_eliandro: «Cosa ha detto? Qualcuno sente qualcosa?»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Fulco, lasci Livia a Ugo e si siede sul muretto. Eliandro chiede cosa ha detto il carbonaio: Ugo non ha ancora alzato gli occhi.
[narratore] Livia, dal portico Berta la guarda, e il silenzio nel cortile si allunga.
[usa] ugo_stanotte > pg_livia
    ⟨pre-scritta⟩ [narratore] Ugo si toglie il cappello e se lo rigira tra le mani.
    ⟨pre-scritta⟩ [png_ugo] Ieri notte? Alla carbonaia, il fuoco non si lascia.
[narratore] Fulco, il cancello dello stazzo scricchiola. Eliandro, nessuno ha sentito le parole sottovoce di Ugo: restano solo i cani e il vento.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1741 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006083

## Turno 11

Azioni:
- pg_livia: «Non so, ha detto poco. Aspettiamo che torni.»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia dice che si aspetta. Ugo si ferma con la pala a mezz'aria e fa spallucce.
[png_ugo] Aspettare. Bene. Il carbone non aspetta, ma lei sì.
[narratore] Fulco, Eliandro, il cancello dello stazzo è ancora aperto. Dal fienile i cani non abbaiano più.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3078 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006092

## Turno 12

Azioni:
- pg_fulco: «Mi siedo di nuovo. Cosa facciamo adesso?»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si alza dal muretto e il cancello dello stazzo cigola sotto la sua mano. Livia e Eliandro restano in piedi nel cortile.
[narratore] Ugo ti guarda di traverso, Fulco, e poi torna a fissare il sentiero.
[usa] nar_segno_2
    ⟨pre-scritta⟩ [narratore] Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.
[narratore] Dalla torre arriva un altro suono di corno, più lungo, e i cani nel fienile si mettono a guaire.
[narratore] Berta, sotto il portico, abbassa la mano dalla chiave e la stringe di nuovo.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 4266 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 297 ms); costo $0.000671

## Turno 13 — evento violazione

## Turno 13 — evento violazione

## Turno 13

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: chi sa dove sta la lavagna? Dimmelo, poi vado.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si avvicina a Berta, sotto il portico. Lei non si muove, la mano stretta sulla chiave.
[narratore] Ugo, dal cancello, volta la testa di scatto e guarda Eliandro.
[narratore] La lavagna sulla porta oscilla appena, anche se non c'è vento sotto il portico.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1428 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0005904

## Turno 14

Azioni:
- pg_fulco: «Ci pensiamo domani, dai.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco dice di pensarci domani. Nessuno dei due risponde.
[narratore] Il corno sulla torre suona ancora, più lungo, e Berta si volta verso il sentiero.
[png_berta] Domani. Il ragazzo non ha domani, con quella lavagna.
[narratore] Ugo sputa e riprende a caricare il mulo, senza guardare nessuno.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2361 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0007003

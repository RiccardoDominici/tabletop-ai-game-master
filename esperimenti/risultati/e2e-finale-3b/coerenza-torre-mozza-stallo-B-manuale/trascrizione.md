# Trascrizione torre-mozza-stallo-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T01:17:01.894Z · PG: pg_livia, pg_fulco, pg_eliandro

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
[narratore] Livia chiede se aspettare o muoversi. Berta stringe la chiave al collo e guarda la torre oltre i tetti.
[png_berta] Aspettare? Le pecore non aspettano. Il tempo c'è ancora, ma è poco.
[narratore] Ugo sputa di nuovo e batte la pala per terra due volte, senza guardare nessuno.
[png_ugo] Paese. Sempre a chiedere, mai a dare.
[narratore] Il vento porta dal crinale un suono di corno, lungo e storto. Il primo segno della torre è passato.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2454 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0003992

## Turno 2

Azioni:
- pg_fulco: «Non lo so. Berta è lì sotto il portico, sta zitta.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si ferma accanto al portico e posa la mazza. Berta non alza lo sguardo dal pugno chiuso sulla chiave.
[narratore] Fulco, con voce bassa, dice che lui non sa cosa dire. Berta resta in silenzio, poi parla.
[png_berta] Se non sai, stai zitto. Il tempo è poco, e mio figlio non ha tempo.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3061 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004105

## Turno 3

Azioni:
- pg_eliandro: «C'è qualcosa qui? Non vedo niente di strano, boh.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china sulla soglia dell'ovile e passa le dita sul legno. Niente di strano, solo sterco secco e un'impronta di zoccolo.
[narratore] Livia e Fulco restano fermi nel cortile. I cani nel fienile smettono di grattare la porta.
[usa] nar_cani_scappano
    ⟨pre-scritta⟩ [narratore] Un cane spalanca con il muso la porta del fienile e corre al sentiero, scodinzolando.
    ⟨pre-scritta⟩ [narratore] Al limite degli alberi si ferma, si volta e aspetta.
[narratore] Dal sentiero dietro il fienile sbucano due cani bianchi, e scappano verso il bosco senza voltarsi.
[png_ugo] Lei, ragazzo, non tocchi il carbone. Quello è mio.
[invito] pg_eliandro,pg_livia,pg_fulco
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro","pg_livia","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2685 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004745

## Turno 4

Azioni:
- pg_livia: «Aspetto.»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nel cortile nessuno si muove. Il vento del crinale porta fumo di carbonaia e il guaito dei cani che si allontanano verso il bosco.
[usa] nar_attesa_ovile
    ⟨pre-scritta⟩ [narratore] Nello stazzo una pecora bela, e un'altra le risponde. Dal paese arriva odore di minestra e di fumo.
[narratore] Ugo appoggia la pala al cancello e si siede sul bordo del mulo, senza più guardare nessuno.
[usa] ugo_attesa
    ⟨pre-scritta⟩ [narratore] Ugo batte la pala per terra due volte.
    ⟨pre-scritta⟩ [png_ugo] Paese. Sempre domande, mai carbone.
[invito] pg_livia,pg_fulco,pg_eliandro
[narratore] Livia resta ferma sotto il portico, con lo scudo appoggiato alla gamba. Il vento le porta alle orecchie il suono lungo del corno dalla torre.
[usa] ber_salgo_io > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta si alza dalla panca, con gli occhi sul crinale.
    ⟨pre-scritta⟩ [png_berta] Se non sale nessuno, aspetto qui con la chiave. E all'alba sarò sola.
[invito] pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_giaciglio

```text
⟨pre-scritta⟩ [narratore] La paglia è ancora schiacciata nella forma di un corpo.
⟨pre-scritta⟩ [narratore] Il chiodo degli stivali è vuoto, e così quello del mantello. Nella cassetta del pane restano solo briciole.
```

- righe pre-scritte 5, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 1; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2366 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00093

## Turno 5

Azioni:
- pg_fulco: «Mi siedo sul muretto dello stazzo.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si siede sul muretto dello stazzo. La pietra è fredda e le pecore lo guardano dall'altra parte del cancello.
[narratore] Livia e Eliandro restano dove sono, sotto il portico e accanto alla soglia.
[usa] nar_recinto > pg_fulco
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG esamina il cancello dello stazzo» solo: stazz⟩
[narratore] Berta non si volta. Stringe la chiave e guarda la torre oltre i tetti.
[png_berta] Il tempo passa. Le pecore mangiano anche se noi non mangiamo.
[narratore] Ugo tace, con il mulo che sbuffa accanto a lui.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3232 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00054

## Turno 6

Azioni:
- pg_eliandro: «Guardo in giro.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si guarda intorno: il cortile, lo stazzo, il fienile con la paglia schiacciata, il portico con Berta e la lavagna sulla porta.
[narratore] Il cortile è quello di sempre. Sulla paglia del fienile, dove dormiva Tonio, resta l'impronta di un corpo.
[usa] nar_segno_1
    ⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
[narratore] Ugo non guarda nessuno. Berta stringe la chiave al collo e fissa il crinale.
[invito] pg_eliandro
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2673 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0005297

## Turno 7

Azioni:
- pg_livia: «Aspetto ancora. Tanto Berta ci chiama, no?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia dice che aspetta ancora, perché Berta li ha chiamati. Berta stringe la chiave e non risponde.
[png_berta] Chiamati, sì. Aspettare è facile, quando non è tuo figlio.
[narratore] Fulco e Eliandro restano fermi, senza muoversi. Dal crinale arriva di nuovo il corno, più vicino.
[narratore] Ugo sputa e batte la pala due volte.
[png_ugo] Paese. Sempre a far aspettare il carbone.
[narratore] Il fumo della carbonaia si piega verso il cortile. Dal paese la campana della chiesa suona una volta sola.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2756 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006061

## Turno 8

Azioni:
- pg_fulco: «Ci penso. Aspetto.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco ci pensa, poi resta fermo. Dal crinale il corno suona di nuovo, questa volta corto e spezzato.
[narratore] Berta non si muove. Stringe la chiave e guarda il sentiero del bosco.
[png_berta] Ci pensi pure. Io ho un figlio lassù che non può aspettare.
[usa] ber_attesa
    ⟨pre-scritta⟩ [png_berta] Allora? Le pecore non aspettano, e quelli lassù nemmeno.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2824 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0005774

## Turno 9 — evento violazione

## Turno 9 — evento violazione

## Turno 9

Azioni:
- pg_livia (privata): «Ugo, a parte, sottovoce: chi passa dal cancello di notte?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia si avvicina a Ugo, a voce bassa, e gli parla all'orecchio, lontano da Berta.
[privato pg_livia] Ugo non si scompone. Sputa, guarda il crinale e dice piano che sul sentiero passa solo chi ha il permesso del signore. Poi aggiunge che non farà nomi davanti al paese.
[narratore] Ugo batte la pala per terra due volte, come a dire basta.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: null ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0.0005761

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10

Azioni:
- pg_fulco: «Che fai, Livia? Ci hai pensato? Io non mi fido di Ugo, mi sa che tiene le cose per sé.»
- pg_eliandro: «Cosa ha detto? Qualcuno sente qualcosa?»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Fulco chiede a Livia se ci ha pensato, e dice che non si fida di Ugo: tiene le cose per sé.
[narratore] Eliandro chiede cosa ha detto Ugo, e se qualcuno ha sentito qualcosa.
[narratore] Livia, ferma sotto il portico, non risponde ancora. Ugo ha sentito tutto e batte la pala una volta sola.
[png_ugo] Sentito? Qui si sente tutto, lei. Il vento porta fino al paese.
[narratore] Berta guarda Livia, stringe la chiave e aspetta.
[invito] pg_livia, pg_eliandro
[narratore] Eliandro chiede cosa ha detto Ugo, e se qualcuno ha sentito qualcosa. Il vento porta le parole fino al paese, e Berta si gira di scatto verso il carbonaio.
[usa] ugo_niente_visto > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Ugo si gratta la barba bruciacchiata e guarda altrove.
    ⟨pre-scritta⟩ [png_ugo] Io non vedo niente. Guardo il fuoco, io.
[invito] pg_livia
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 1; invito: ["pg_livia","pg_eliandro"]; anomalie: 3
- primo audio dalla chiusura della finestra: 1843 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0013131

## Turno 11

Azioni:
- pg_livia: «Non so, ha detto poco. Aspettiamo che torni.»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia dice che aspettano che Ugo torni. Berta stringe la chiave e non risponde.
[narratore] Fulco e Eliandro restano fermi nel cortile, senza un gesto.
[narratore] Ugo, dal cancello, non si volta. Il mulo sbuffa e il carbone si muove sul dorso.
[narratore] Il vento porta dal crinale un altro corno, lungo e stonato. Il secondo segno della torre è passato.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3048 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006891

## Turno 12

Azioni:
- pg_fulco: «Mi siedo di nuovo. Cosa facciamo adesso?»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si siede di nuovo sul muretto dello stazzo. Livia e Eliandro restano dove sono.
[narratore] Berta stringe la chiave al collo. Dal crinale arriva il corno, corto e spezzato.
[usa] nar_segno_2
    ⟨pre-scritta⟩ [narratore] Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.
[narratore] Ugo, dal cancello, non si volta. Il mulo sbuffa e il fumo della carbonaia si piega verso il cortile.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2698 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006723

## Turno 13 — evento violazione

## Turno 13

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: chi sa dove sta la lavagna? Dimmelo, poi vado.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china verso la soglia di casa, abbassando la voce. Berta lo guarda di sbieco ma non si allontana.
[privato pg_eliandro] Berta sussulta quando nomini Tonio. Sotto il grembiule stringe un fazzoletto con un nodo strano, come uno che promette qualcosa a se stesso.
[narratore] Ugo, dal cancello, alza la testa al rumore dei sassi del sentiero.
[narratore] Dal crinale arriva il corno, lungo e stonato. Il vento porta fumo di carbonaia fin sotto il portico.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1240 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000623

## Turno 14

Azioni:
- pg_fulco: «Ci pensiamo domani, dai.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco ha detto che ci pensano domani. Dal crinale il corno suona ancora, lungo e stonato.
[narratore] Berta non si volta. Stringe la chiave e guarda la torre oltre i tetti.
[png_berta] Domani. Le pecore non aspettano, e nemmeno Tonio.
[narratore] Ugo, dal cancello, sputa per terra senza guardare nessuno.
[png_ugo] Paese. Domani, dice. Il fuoco della carbonaia non aspetta domani.
[narratore] Il fumo si piega verso il cortile. Nella torre si accende un secondo fuoco.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 2812 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0007303

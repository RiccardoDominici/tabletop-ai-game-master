# Trascrizione torre-mozza-stallo-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T00:23:27.407Z · PG: pg_livia, pg_fulco, pg_eliandro

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
[narratore] Livia Sarti chiede se aspettare qui o muoversi. Berta non si sposta dal portico e stringe la chiave al collo.
[narratore] Il vento scende dal crinale e porta odore di fumo di carbonaia. Dal fienile i cani continuano a grattare la porta.
[png_berta] Le pecore non aspettano. Se volete muovervi, muovetevi adesso.
[narratore] Ugo Faggioli batte la pala per terra due volte, senza guardare nessuno.
[png_ugo] Paese. Sempre uguale.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2568 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00037997

## Turno 2

Azioni:
- pg_fulco: «Non lo so. Berta è lì sotto il portico, sta zitta.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco Granito dice di non sapere, e a voce bassa osserva Berta sotto il portico.
[narratore] Berta non si volta. Le sue dita stringono ancora la chiave al collo.
[narratore] Eliandro e Livia restano fermi, e il vento porta dal crinale un suono lontano di corno.
[narratore] Dal fienile i cani tacciono di colpo.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3077 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00039557

## Turno 3

Azioni:
- pg_eliandro: «C'è qualcosa qui? Non vedo niente di strano, boh.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china sull'impronta fresca, poi si gira verso il cancello.
[narratore] Dal sentiero del bosco arriva lo scricchiolio di un passo lento e pesante.
[usa] nar_cani_scappano
    ⟨pre-scritta⟩ [narratore] Un cane spalanca con il muso la porta del fienile e corre al sentiero, scodinzolando.
    ⟨pre-scritta⟩ [narratore] Al limite degli alberi si ferma, si volta e aspetta.
[narratore] Livia, Fulco, il portico è fermo. Berta vi osserva con gli occhi stretti.
[invito] pg_livia,pg_fulco
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2837 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00041517

## Turno 4

Azioni:
- pg_livia: «Aspetto.»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti aspetta, e il portico resta fermo. Berta non si muove.
[usa] nar_attesa_ovile
    ⟨pre-scritta⟩ [narratore] Nello stazzo una pecora bela, e un'altra le risponde. Dal paese arriva odore di minestra e di fumo.
[narratore] Dal fienile i cani tacciono. Il vento porta ancora il suono lontano del corno.
[usa] ber_attesa
    ⟨pre-scritta⟩ [png_berta] Allora? Le pecore non aspettano, e quelli lassù nemmeno.
[invito] pg_fulco,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_giaciglio

```text
⟨pre-scritta⟩ [narratore] La paglia è ancora schiacciata nella forma di un corpo.
⟨pre-scritta⟩ [narratore] Il chiodo degli stivali è vuoto, e così quello del mantello. Nella cassetta del pane restano solo briciole.
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2526 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00042027

## Turno 5

Azioni:
- pg_fulco: «Mi siedo sul muretto dello stazzo.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco Granito si siede sul muretto dello stazzo. La pietra è fredda e umida sotto la tunica.
[usa] nar_recinto > pg_fulco
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG esamina il cancello dello stazzo» solo: stazz⟩
[narratore] Livia Sarti e Eliandro restano in piedi vicino al portico. Berta non li guarda.
[narratore] Dal fienile i cani riprendono a guaire, piano.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2991 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00047527

## Turno 6

Azioni:
- pg_eliandro: «Guardo in giro.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si guarda intorno: lo stazzo, il fienile, il portico con Berta immobile, il cancello dove Ugo batte ancora la pala.
[narratore] Tra le tracce nella terra battuta, accanto al cancello, si vedono i segni di uno scarpone grande e uno più piccolo, come di chi è passato in fretta.
[narratore] Dal sentiero del bosco il vento porta un altro suono lontano di corno, poi silenzio.
[usa] nar_segno_1
    ⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
[narratore] Sulla soglia di casa Berta alza lo sguardo verso il crinale, e per un momento le labbra le tremano.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2678 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00054287

## Turno 7

Azioni:
- pg_livia: «Aspetto ancora. Tanto Berta ci chiama, no?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti resta dov'è e aspetta. Il vento porta dal crinale un altro corno, più lontano.
[narratore] Berta Benni la guarda, senza dire una parola, e stringe la chiave al collo.
[png_berta] Aspettare. Certo. Mio figlio aspetta lassù, e voi aspettate qui.
[narratore] Dal sentiero, ancora una volta, lo scricchiolio di un passo lento. Poi silenzio.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2879 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00053247

## Turno 8

Azioni:
- pg_fulco: «Ci penso. Aspetto.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco Granito resta sul muretto, a guardare il crinale. Il vento si calma.
[narratore] Berta non si muove dal portico. Tiene la chiave stretta nel pugno.
[png_berta] Ogni minuto che passa è un minuto in più per lui. Lo capite?
[narratore] Il sentiero del bosco resta immobile, e il corno tace.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3088 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00054107

## Turno 9

Azioni:
- pg_livia (privata): «Ugo, a parte, sottovoce: chi passa dal cancello di notte?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti chiede a Ugo, a bassa voce, chi passa dal cancello di notte. Il carbonaio non guarda nemmeno il portico.
[png_ugo] Di notte? Passa il vento. E chi ha la testa dura.
[narratore] Fulco Granito e Eliandro restano dove sono. Dal fienile i cani non guaiscono più.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 5
- primo audio dalla chiusura della finestra: 3470 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00055457

## Turno 10

Azioni:
- pg_fulco: «Che fai, Livia? Ci hai pensato? Io non mi fido di Ugo, mi sa che tiene le cose per sé.»
- pg_eliandro: «Cosa ha detto? Qualcuno sente qualcosa?»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Fulco Granito dice che non si fida di Ugo, e Livia lo guarda di traverso.
[narratore] Eliandro chiede se qualcuno ha sentito qualcosa. Dal fienile, un cane risponde con un guaito lungo.
[usa] ugo_stanotte > pg_fulco
    ⟨pre-scritta⟩ [narratore] Ugo si toglie il cappello e se lo rigira tra le mani.
    ⟨pre-scritta⟩ [png_ugo] Ieri notte? Alla carbonaia, il fuoco non si lascia.
[narratore] Ugo non alza gli occhi dalla pala. Batte il manico per terra, una volta.
[usa] ugo_niente_visto > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Ugo si gratta la barba bruciacchiata e guarda altrove.
    ⟨pre-scritta⟩ [png_ugo] Io non vedo niente. Guardo il fuoco, io.
[narratore] Eliandro, dal fienile non si sente niente. Ma sul sentiero, qualcosa si muove ancora.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 4, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1173 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061427

## Turno 11

Azioni:
- pg_livia: «Non so, ha detto poco. Aspettiamo che torni.»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti dice che Ugo ha parlato poco, e che conviene aspettare che il carbonaio torni.
[narratore] Berta non si volta. Stringe la chiave al collo, e il vento porta di nuovo dal crinale odore di fumo.
[narratore] Fulco e Eliandro restano fermi: nessuno dei due muove un passo.
[narratore] Dal sentiero del bosco arriva un ultimo corno, lungo e stonato.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2926 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062977

## Turno 12

Azioni:
- pg_fulco: «Mi siedo di nuovo. Cosa facciamo adesso?»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco Granito si rimette a sedere sul muretto. La pietra è ancora fredda.
[narratore] Livia Sarti e Eliandro restano fermi. Nessuno dei due si muove.
[narratore] Berta guarda il crinale, poi il cancello, poi Ugo che batte ancora la pala.
[usa] nar_segno_2
    ⟨pre-scritta⟩ [narratore] Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.
[narratore] Fulco, il sole è sceso dietro il crinale. Cosa fai adesso?
[invito] pg_fulco
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2221 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00063187

## Turno 13

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: chi sa dove sta la lavagna? Dimmelo, poi vado.»
- pg_livia: (nessuna azione)
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china verso Berta e abbassa la voce.
[narratore] Berta non risponde subito. Stringe la chiave al collo, poi scuote la testa.
[png_berta] La lavagna? L'ha portata lui, stamattina. Non so altro.
[narratore] La sua mano resta chiusa sul ferro. Il vento porta dal crinale un altro suono di corno.
[narratore] Dal fienile i cani ricominciano a grattare la porta.
[invito] pg_eliandro,pg_livia,pg_fulco
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro","pg_livia","pg_fulco"]; anomalie: 6
- primo audio dalla chiusura della finestra: 1904 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00066227

## Turno 14

Azioni:
- pg_fulco: «Ci pensiamo domani, dai.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco, rimandare non cambia niente. Il crinale resta lì, e Berta lo guarda.
[png_berta] Domani. Certo. Il ragazzo, domani, sarà già morto.
[narratore] Dalla torre non arriva più né corno né tamburo. Solo il vento, che porta il fumo della carbonaia.
[narratore] Livia, Eliandro: la chiave è ancora al collo di Berta, e il sole è sceso.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3177 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00066017

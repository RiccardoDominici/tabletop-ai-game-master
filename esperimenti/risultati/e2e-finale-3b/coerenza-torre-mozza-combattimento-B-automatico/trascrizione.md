# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T00:47:56.464Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[narratore] Livia chiede a Berta se la torre è quella sopra il bosco, e se ci andranno adesso, prima di mezzanotte.
[png_berta] Quella. Sopra il bosco, dove finiscono le pecore smarrite. Sì, adesso.
[narratore] Nespola si avvicina a Ugo, a bassa voce, e gli mette una mano sul braccio.
[narratore] Ugo non si scosta, ma guarda il cancello, poi la torre.
[narratore] Eliandro resta in disparte, il quaderno aperto sul palmo, senza scrivere.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2446 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004375

## Turno 2 — evento violazione

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si avvicina a Berta, abbassando la voce, e le sfiora il gomito con il quaderno.
[usa] ber_conti_fienile > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di ber_conti_fienile (debiti, debito, soldi, decima, balivo, pagare) è nell'azione⟩
[narratore] Livia e Nespola restano dove sono, a sentire il vento che scende dal crinale.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3506 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0003428

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
[narratore] Livia avanza per prima, lo scudo davanti, e alza gli occhi sui rami sopra il sentiero.
[narratore] Nespola corre avanti tra i faggi, ma il piede scivola su una lastra di muschio e lo scarpone fa rumore sulla pietra.
[narratore] Il rumore rimbalza tra i tronchi. Da più in alto, sul sentiero dei goblin, qualcosa si muove e si ferma.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Eliandro, fermo alle spalle del gruppo, sente un ramo spezzarsi e vede Livia irrigidirsi.
[invito] pg_livia, pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2264 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00053068

## Turno 5 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 6 — evento violazione

## Turno 6

Azioni:
- pg_eliandro: «Io sono lento, resto dietro la pietra e tiro quando vi siete mossi.»
- pg_livia: «Vedo tre goblin davanti alla porta. Io carico dopo di lei, scudo avanti.»
- pg_nespola: «Io sono la più veloce di tutti, vado per prima: passo di lato prima che arrivi.»

Narratore:

```text
[narratore] Livia Sarti colpisce Grosso con la spada, ma il colpo scivola sulla sua pelle d'orso. Grosso non si muove nemmeno.
[narratore] Nespola tenta di scivolare di lato, ma il piede si incaglia nel muschio e perde l'equilibrio. Resta esposta.
[narratore] Eliandro si nasconde dietro la pietra, in attesa.
[narratore] Zirrà ride, batte la spada corta sullo scudo, e il corno di capra risponde dal crinale.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1978 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00057864

## Turno 7

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa lo scudo e carica. La spada lunga affonda nel fianco di Grosso, che barcolla e si porta una mano al ventre.
[narratore] L'hobgoblin ringhia e getta l'osso nel fuoco. Il fumo si alza, denso e grasso.
[png_grosso] Fame... ora hai fame anche tu, eh?
[narratore] Zirrà ride corto, senza smettere di battere la spada sullo scudo.
[png_zirra] Ehi, scudo bianco! Il tuo amico si è fatto male. Ma la chiave non l'avete ancora vista.
[narratore] Nespola, sulla lastra di muschio, si rialza in fretta. Sul muro accanto al fuoco ci sono i segni a carbone: li vede bene da qui.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3101 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061744

## Turno 8

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola scatta alle spalle di Zirrà e cala la spada corta. Il colpo le entra nel fianco scoperto, e la goblin urla, mollando la presa sullo scudo.
[narratore] Il rumore si spegne di colpo. Zirrà si ritrae sulla scala rotta, una mano sul fianco, gli occhi gialli fissi su Nespola.
[png_zirra] Ah, la piccola ladra! Pensi di essere furba, eh? Pensi che io non senta le scarpe sul muschio?
[narratore] Grosso, dietro il fuoco, si gira lento verso Livia. Solleva la mazza ferrata e la cala. Il colpo le prende la spalla, e lo scudo non basta.
[narratore] Livia barcolla, il sangue scende dalla cotta di maglia. Ha quattro colpi di vita ancora in corpo.
[usa] zir_ragazzo_mio > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Zirrà si gratta l'orecchio con la punta della spada e sorride storto.
    ⟨pre-scritta⟩ [png_zirra] Il ragazzo è mio. L'ho preso nel fienile, mentre dormiva.
[narratore] Eliandro resta dietro la pietra, il quaderno chiuso in mano, e osserva la scena in silenzio.
[invito] pg_eliandro
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3475 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072784

## Turno 9

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale da dietro la pietra, verso il goblin con la lancia.
[narratore] La lama vola bassa e colpisce Zirrà al fianco già ferito. Lei stringe i denti e si piega sulla scala.
[narratore] Zirrà ringhia, poi batte la spada sullo scudo come se contasse i colpi che le restano.
[png_zirra] Piccolo elfo con i coltelli! Pensi di farmi sparire con un ferro così?
[narratore] Zirrà si rimette in piedi, fissa Eliandro, e cala la spada corta. Il colpo fischia sopra la pietra e non lo sfiora.
[narratore] Grosso si alza dal fuoco con un grugnito, la mazza in mano. Non guarda ancora nessuno.
[narratore] Nespola, sul muschio, osserva Zirrà e il suo fianco sanguinante. Il fuoco le illumina il viso.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3057 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076074

## Turno 10

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola colpisce ancora Zirrà, alle spalle, e la lama entra nel fianco già ferito. La goblin cade sulla scala rotta e non si muove più.
[narratore] Nespola si sposta, lasciando il corpo dietro di sé, e il fuoco le illumina il viso.
[narratore] Livia resta in piedi con la spalla insanguinata, lo scudo ancora alzato.
[narratore] Eliandro non si muove dalla pietra.
[narratore] Dalla cantina non arriva più nessun rumore. Sul crinale, il corno di capra tace.
[narratore] Grosso, dietro il fuoco, guarda la scala, poi la mazza, poi se ne va verso il buco nel muro. I goblin sono fuggiti.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 3568 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074504

## Turno 11 — evento violazione

## Turno 11 — evento violazione

## Turno 11

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti regge lo scudo, e la lancia del goblin sbatte sul ferro con un suono secco.
[narratore] Il colpo le scivola di lato, e lei resta in piedi, la spalla che brucia.
[narratore] Eliandro tira il pugnale. La lama vola verso il goblin, che si gira di scatto.
[narratore] Ma Zirrà è già a terra, e il goblin non è più lì a difenderla: il pugnale lo colpisce senza resistenza.
[narratore] Nespola resta ferma, in attesa, e nessuno le porta un'occasione.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1775 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074054

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola si rialza dal muschio, la mano premuta sulla spalla. Il sangue le scalda il palmo. Nessuno le ha chiesto nulla: resta indietreggiando, e si ferma.
[narratore] Livia spinge il goblin contro il muro con lo scudo. Il colpo della spada lunga gli entra sotto la spalla, e lui cade in ginocchio sulle pietre.
[narratore] Eliandro resta dietro la pietra, immobile, e dalla cantina non arriva più nessun rumore.
[narratore] Livia, il goblin ti guarda dal basso, ansimando. Che fai ora?
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1857 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075284

## Turno 13 — evento violazione

## Turno 13

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»

Narratore:

```text
[narratore] Eliandro tende la mano e il dardo incantato parte dritto, veloce come un respiro. Colpisce il goblin che stava per abbattere Nespola, e quello crolla in avanti, senza un grido.
[narratore] Livia si china su Nespola, la trascina dietro lo scudo e la copre col proprio corpo. La spalla di Livia brucia, ma non si ritrae.
[narratore] Nespola striscia verso la pietra, le dita premute sul fianco, e riesce a nascondersi dietro il muro.
[narratore] Dal buco nel muro arriva di nuovo quel corno di capra, stonato e lontano. Poi silenzio.
[narratore] Il fuoco tremola, il sangue sul muschio si fa scuro. Che fate ora?
[invito] tutti
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 1
- primo audio dalla chiusura della finestra: 2004 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078804

## Turno 14

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa lo scudo di un palmo e alza la voce verso il buco nel muro.
[narratore] Eliandro arretra verso la scala, il quaderno stretto al petto, e il fuoco gli segna il profilo.
[narratore] Nessuna risposta dal buco, solo il vento che fischia tra i mattoni.
[narratore] Nespola resta dietro il muro, con la mano sul fianco, e tende l'orecchio verso la cantina.
[invito] pg_livia,pg_eliandro,pg_nespola
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_corda

```text
⟨pre-scritta⟩ [narratore] La corda fa tre giri intorno ai polsi, e i capi pendono liberi.
⟨pre-scritta⟩ [narratore] Non c'è nessun nodo. Sulla pelle non c'è un segno.
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1882 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073084

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale dal gradino verso il goblin che scappa in cantina. La lama scompare nel buio della scala.
[narratore] Un tonfo basso, poi un grido soffocato dalla pietra. Il goblin non risale.
[narratore] Livia tiene lo scudo alzato. Il goblin davanti esita, guarda il compagno, e resta immobile sulle pietre.
[narratore] Dalla cantina non arriva nessun rumore. Sul muro accanto alla porta di ferro i segni a carbone luccicano alla luce del fuoco.
[usa] nar_conto
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[narratore] Nespola resta dietro il muro, la mano ancora sul fianco. Aspetta.
[invito] pg_livia, pg_nespola
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_mappa

```text
⟨pre-scritta⟩ [narratore] Col carbone qualcuno ha disegnato la torre vista dall'alto, con una freccia che scende in cantina.
⟨pre-scritta⟩ [narratore] Accanto c'è scritto cripta, con le erre rovesciate.
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1662 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00079134

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e avanza verso il goblin con la lancia, che è ancora in piedi davanti alla scala.
[narratore] Il colpo della spada lunga gli entra sotto la spalla. Il goblin lascia cadere la lancia e crolla sulle pietre.
[narratore] Eliandro lascia la pietra e torna verso Nespola, il quaderno ancora sotto il braccio. Si inginocchia accanto a lei e le fascia la spalla con la sciarpa.
[narratore] Nespola stringe i denti, ma non si ritrae. Il sangue si ferma sotto la stoffa.
[narratore] Dalla cantina non arriva più nessun rumore. Il vento porta fino alla torre il suono lontano di un corno.
[narratore] Nel fuoco, un tizzone cede e cade, e la scala rotta si illumina per un istante.
[invito] tutti
[narratore] Livia, il goblin con la lancia crolla sulle pietre prima di poter rialzarsi.
[narratore] Il silenzio della torre torna pesante, e nessun altro si muove verso di te.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 1/2, riparazioni 1; invito: "tutti"; anomalie: 3
- primo audio dalla chiusura della finestra: 1518 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00152828

## Turno 17

Azioni:
- pg_eliandro: «Lo tengo fermo col piede e chiedo: «Dov'è il ragazzo?»»
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro preme il piede sulla caviglia di Zirrà e le chiede dove si trova il ragazzo. Zirrà non risponde: il suo corpo è immobile sulle pietre, e nessuno la sente più.
[narratore] Livia Sarti, con la spalla ferita, si accosta alla porta di ferro dove l'ultimo goblin è addossato. Lo blocca con lo scudo, e il suo respiro si fa corto nel silenzio.
[narratore] Dalla cantina non arriva rumore. Solo il vento che fischia nel buco del muro e il fuoco che scoppietta.
[usa] nar_tonio_parla > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Il ragazzo tiene gli occhi bassi e parla piano.
    ⟨pre-scritta⟩ [narratore] Dice che la decima non è pagata. Alla prima neve, dice, il balivo si prende l'ovile.
    ⟨pre-scritta⟩ [narratore] Dice che l'argento della cripta era l'unico modo, e che sua madre non doveva saperlo.
[narratore] Nespola resta dietro il muro, la mano sul fianco, e aspetta che qualcuno le dica cosa fare.
[invito] pg_eliandro,pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_conto

```text
⟨pre-scritta⟩ [narratore] Accanto alla porta di ferro ci sono tacche a carbone, a gruppi di cinque.
⟨pre-scritta⟩ [narratore] Sotto c'è una scritta storta: decima, quaranta d'argento.
```

- righe pre-scritte 3, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_eliandro","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2275 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00079854

## Turno 18 — evento violazione

## Turno 18 — evento violazione

## Turno 18

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia non dice nulla al tavolo; si china appena verso Zirrà, e chi la guarda vede solo la sua mano scendere sulla cintura.
[narratore] Nespola e Eliandro restano fermi dove sono.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3604 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00060514

## Turno 19

Azioni:
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, in piedi accanto alla scala, tiene il quaderno stretto al petto e aspetta.
[narratore] Nespola e Livia restano dove sono.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3308 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00058714

# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T02:35:19.164Z · PG: pg_livia, pg_nespola, pg_eliandro

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

## Turno 1 — evento violazione

## Turno 1

Azioni:
- pg_livia: «Berta, la torre è quella sopra il bosco? Ci andiamo adesso, prima di mezzanotte.»
- pg_nespola (privata): «Ugo, a parte, a bassa voce: «Tonio è vivo? Dimmi la verità, cmq non dico niente.»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Berta se la torre è quella sopra il bosco, e se ci si va adesso, prima di mezzanotte.
[png_berta] Quella. Sopra il bosco, dietro il crinale. Adesso, sì. Ma non con le mani vuote.
[narratore] Nespola si accosta a Ugo, abbassando la voce. Al tavolo si vede solo che si avvicina al carbonaio e gli parla piano.
[privato pg_nespola] Ugo ascolta senza guardarti, poi allunga la mano e ti sfiora il polso, come a dire: più tardi. Ti lascia capire che i tre argentei li avrà quando tornerà dal bosco.
[narratore] Eliandro resta fermo dove si trova, il quaderno chiuso sotto il braccio. Gli occhi scorrono sul portico, sul fienile, sulla lavagna appesa.
[narratore] Il vento del crinale porta fumo di carbonaia dal sentiero dietro il fienile.
[png_berta] Da queste parti non si sale alla torre senza sapere cosa vogliono. Ditemi il vostro nome, e poi ne parliamo.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1261 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0005415

## Turno 2 — evento violazione

## Turno 2 — evento violazione

## Turno 2 — evento violazione

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china verso Berta, a voce bassa, e le chiede qualcosa che resta tra loro due.
[privato pg_eliandro] Berta lo guarda a lungo, poi gli fa cenno di seguirla nel fienile. Nessuno al cortile ha sentito la domanda.
[narratore] Berta si volta verso il fienile e fa un passo. I cani dietro la porta smettono di guaiare.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 3
- primo audio dalla chiusura della finestra: null ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0.0003762

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
[narratore] Nespola, il sentiero sale tra i faggi, e a ogni passo la terra è più scura.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Livia scende per prima, lo scudo avanti. I rami sopra la testa si muovono, ma non c'è vento.
[narratore] Eliandro aspetta, il quaderno chiuso sotto il braccio.
[narratore] Ugo alza lo sguardo dalla carbonaia e sputa per terra. Il sentiero dei goblin è dietro di voi.
[png_ugo] Lei sta facendo rumore, con quella giacca. I goblin la sentono da qui.
[invito] pg_livia,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 70 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00054588

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
[narratore] Eliandro resta dietro la pietra, il quaderno stretto al petto. Quando i piedi della prima fila si muovono, lui tira.
[narratore] Livia carica Grosso con la spada lunga, ma l'hobgoblin para con la mazza e il colpo scivola via sulla pelle d'orso.
[narratore] Nespola passa di lato, leggera, e il primo goblin che si volta la vede sparire tra due muri crollati.
[narratore] Zirrà batte la spada corta sullo scudo e ride corto, senza muoversi dalla scala.
[usa] zir_chiave_prima > pg_livia
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[invito] pg_livia
[narratore] Nespola, il passo di lato ti porta dietro il muro crollato, dove la pietra è ancora calda dal fuoco. Di là vedi la cantina, e una scia di pelo bagnato sui gradini.
[narratore] Dal tuo nascondiglio senti il goblin più vicino grugnire una domanda agli altri, senza capire dove sei finita.
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 1; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00118438

## Turno 7

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia carica Grosso con la spada lunga e lo scudo davanti. Il colpo passa a un palmo dalla pelle d'orso, e lei si ritrova scoperta, con il peso in avanti.
[narratore] Grosso ringhia, sputa l'osso e si volta verso di lei con la mazza alzata.
[narratore] Zirrà ride corto dalla scala e batte di nuovo la spada sullo scudo, senza muoversi.
[narratore] Nespola, dal muro crollato, vedi Grosso girarsi di colpo: la sua schiena è aperta per un attimo, e i gradini bagnati sotto di te sono a due passi.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 145 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061544

## Turno 8

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola colpisce alle spalle il goblin più vicino, e la spada corta trova il varco. Grosso si piega di colpo, il fianco aperto, e il tonfo della mazza cade sui gradini.
[narratore] Zirrà si volta dalla scala, con lo scudo rosso ancora alzato.
[png_zirra] Ehi, la ladra! Hai rubato il mio mezzo osso!
[narratore] Livia, ora, dove sta il tuo colpo?
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062624

## Turno 9

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lancia il pugnale da dietro la pietra. Il colpo colpisce Zirrà al fianco. Lei stringe i denti, ma resta in piedi.
[narratore] Ferita, Zirrà si gira verso la pietra e ride, un suono secco.
[png_zirra] Mi hai punta! Ora non si ride più, eh?
[narratore] Nespola, il goblin più vicino sta arretrando verso la cantina. Vedi la sua mano correre verso la cintura.
[narratore] Nespola, dove sei? Che fai adesso?
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00067834

## Turno 10

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola sente la lama scivolare via: il colpo fende l'aria a un soffio dal fianco di Zirrà, che salta di lato sulla scala ridendo.
[narratore] Nespola, lo scarto di Grosso ti sfiora la spalla: la mazza cade sui gradini con un tonfo sordo e ti manca per un dito.
[narratore] Eliandro, Grosso sta ancora davanti a te con il fianco scoperto. Che fai?
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 125 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00067854

## Turno 11

Azioni:
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lancia il pugnale. Il colpo trova Grosso sotto la spalla, e l'hobgoblin crolla sui gradini con un tonfo.
[narratore] Zirrà si gira di scatto, lo scudo rosso alzato, e guarda il corpo del suo compagno.
[png_zirra] Grosso! Dormi adesso, eh? Dormi sul mio osso.
[narratore] Zirrà fa un passo verso la pietra, la spada corta bassa, e ti osserva.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070964

## Turno 12

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo. La lancia del goblin rimbalza sulla croce bianca e scivola via nel fango.
[narratore] Nespola, Zirrà ti ha appena mancata: la spada corta fende l'aria dove eri un istante fa.
[narratore] Eliandro, dietro la pietra, vedi la scena intera: Zirrà con la spada alzata, Livia ferma, Nespola sul fianco.
[narratore] Zirrà ride corto e si volta verso di voi, lo scudo rosso davanti al petto.
[png_zirra] Scudo bianco, fermo lì! Ho ancora un ragazzo da vendere, e una chiave da prendere.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 22 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076934

## Turno 13

Azioni:
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia spinge il goblin contro il muro con lo scudo e lo colpisce con la spada.
[narratore] Zirrà è già ferita, e il colpo la sbatte contro la pietra con un sibilo.
[png_zirra] Ahi! Scudo bianco, mi hai sporcato la giacca!
[narratore] Nespola, Zirrà ha lasciato scoperto il fianco: vedi il sangue colare sulla pietra.
[narratore] Eliandro, dal tuo riparo, il goblin ancora in piedi sta cercando la fuga verso la cantina.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076204

## Turno 14

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Zirrà affonda la spada corta contro Livia, ma la lama scivola sullo scudo con la croce bianca e non trova il varco.
[narratore] Nespola, il colpo alla spalla ti brucia, ma stringi la presa e resti in piedi.
[narratore] Eliandro, dietro la pietra, vedi Zirrà ferita che ansima e si asciuga il sangue sulla giacca.
[png_zirra] Scudo bianco, il tuo scudo non mi fa paura! Ho un ragazzo da vendere, e una chiave da prendere.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3287 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075144

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lancia il dardo incantato. Il colpo colpisce Zirrà al fianco, e lei barcolla contro la scala.
[narratore] Nespola, a terra hai ancora il fiato corto: il dardo ha centrato il goblin che ti stava per colpire, e la sua presa si allenta.
[png_zirra] Ehi! Chi tira ancora, eh? Il mio fianco non è un bersaglio!
[narratore] Zirrà si tiene il fianco con una mano e stringe la spada corta con l'altra. Lo scudo rosso è più basso di prima.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074994

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16

Azioni:
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola, striscia dietro la pietra e stringi i denti: il fianco brucia e il sangue lascia una scia sul selciato.
[narratore] Zirrà ti vede cadere e il suo colpo passa a un palmo da Eliandro, che si ritrae dietro il riparo.
[png_zirra] Ehi, la ladra si arrende? Peccato, mi piacevi viva.
[narratore] Livia, Zirrà ti guarda da sopra lo scudo rosso, il fianco ancora ferito, la spada corta bassa. Il suo turno è finito, e tocca a te.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: 3439 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074464

## Turno 17

Azioni:
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia si china su Nespola, la trascina dietro lo scudo e la copre col proprio corpo.
[narratore] Zirrà, sulla scala, vede la manovra e batte la spada corta sullo scudo rosso, a tempo, senza ridere.
[narratore] Nespola, sei al riparo dietro la pietra. Il fianco pulsa e il sangue scende lento sul selciato.
[narratore] Eliandro, il tuo turno: Zirrà è ferita e alle tue spalle il goblin rimasto guarda la cantina.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 8178 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072284

## Turno 18

Azioni:
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro arretra di tre passi verso la scala, il quaderno stretto al petto. Il fiato gli esce corto nell'aria fredda del cerchio.
[narratore] Zirrà lo segue con gli occhi, la spada corta bassa, lo scudo rosso più basso di prima.
[png_zirra] Ehi, il topo di libri scappa? Il quaderno resta lì, eh?
[narratore] Nespola, Grosso è steso sui gradini e il suo corpo non si muove più. Zirrà è ferita al fianco e ansima.
[narratore] Ora il round passa a te, Nespola. Il fianco di Zirrà è scoperto, la scala alle sue spalle è libera, e Zirrà ti sta guardando.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076424

## Turno 19

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nel silenzio della torre, il vento fa cantare i buchi del muro e il fuoco scricchiola piano.
[usa] nar_attesa_torre
    ⟨pre-scritta⟩ [narratore] Il fuoco si abbassa, e le ombre dei muri si allungano. In alto, da qualche parte, cade un sasso.
[narratore] Zirrà, sulla scala, batte la spada corta sullo scudo rosso, aspettando una risposta.
[usa] zir_attesa
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[invito] tutti
```

- righe pre-scritte 3, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1363 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064764

## Turno 20 — evento violazione

## Turno 20

Azioni:
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lancia il pugnale. Il colpo trova Zirrà al petto, sotto lo scudo rosso, e lei cade all'indietro sui gradini con un suono secco.
[narratore] Il silenzio che segue è pesante. Dal buco nel muro soffia l'aria fredda della cantina, e il fuoco al centro si piega di lato.
[narratore] Nespola, Livia, Eliandro: il cerchio è vostro. Tonio è ancora seduto sui gradini della cantina, con la corda ai polsi, a guardarvi.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[narratore] Eliandro, il muro accanto alla porta di ferro porta segni nuovi, fatti con la stessa mano che ha inciso il carbone sul muro vicino al fuoco.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078374

## Turno 21 — evento violazione

## Turno 21 — evento violazione

## Turno 21 — evento violazione

## Turno 21 — evento violazione

## Turno 21

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia alza la voce verso il cerchio di muri, e il vento le porta indietro la domanda senza risposta.
[narratore] Zirrà è già a terra sui gradini, e Grosso non si muove più: nessuno dei due ride.
[narratore] Eliandro, sei accanto a Nespola, e la sua spalla sanguina sotto la mano.
[narratore] Eliandro si china su Nespola e le fascia la spalla con la sciarpa, stringendo il nodo sopra la ferita.
[narratore] Livia, il goblin rimasto sul fondo della scala ti guarda: la lancia è ancora in mano, ma non avanza.
[png_zirra] Ehi, la scudo bianca parla ancora? Ti ascolto, eh.
[narratore] Nespola, sul selciato, respira a fatica mentre la sciarpa si tinge di rosso.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 4
- primo audio dalla chiusura della finestra: 21 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00079684

## Turno 22 — evento violazione

## Turno 22 — evento violazione

## Turno 22 — evento violazione

## Turno 22

Azioni:
- pg_eliandro: «Lo tengo fermo col piede e chiedo: «Dov'è il ragazzo?»»
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, il piede preme sul petto di Zirrà. Lei sorride storta, il sangue le sporca i denti.
[narratore] Tu chiedi dov'è il ragazzo. Dietro di te, Livia tiene la lancia puntata sul goblin esitante.
[png_zirra] Il ragazzo? Giù in cantina, legato come un agnello. Ma la chiave non l'avete, quindi non ve lo dico.
[narratore] Il goblin davanti a Livia guarda la cantina, poi il compagno a terra. Non si muove.
[narratore] Nespola, sei seduta contro la pietra con la sciarpa stretta sulla spalla. Senti il vento che fischia dal buco nel muro, e il respiro di Tonio che arriva fino a te dalla cantina.
[invito] pg_eliandro,pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_eliandro","pg_livia"]; anomalie: 3
- primo audio dalla chiusura della finestra: 1933 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077244

## Turno 23 — evento violazione

## Turno 23 — evento violazione

## Turno 23 — evento violazione

## Turno 23

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia sferra un fendente con la spada lunga. Il goblin con la lancia non riesce a parare: cade sul selciato e non si rialza.
[narratore] Eliandro, Livia si volta verso di te, il respiro corto, lo scudo ancora alzato.
[narratore] Il vento porta dal buco nel muro un rumore di passi leggeri, che scendono verso la cantina.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1328 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065554

## Turno 24

Azioni:
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti, il tuo scudo blocca l'ultimo goblin contro la porta. Il legno geme e il goblin si dibatte, ma non trova via d'uscita.
[narratore] Nespola, la sciarpa sulla tua spalla è ancora calda di sangue. Eliandro, il quaderno è sotto il tuo braccio, e il vento dal buco nel muro porta fino a voi il respiro di Tonio dalla cantina.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3359 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072024

## Turno 25 — evento violazione

## Turno 25 — evento violazione

## Turno 25 — evento violazione

## Turno 25 — evento violazione

## Turno 25 — evento violazione

## Turno 25 — evento violazione

## Turno 25 — evento violazione

## Turno 25

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia, ti muovi verso il fondo della scala, dove Zirrà giace immobile. Il tuo gesto resta tra te e lei.
[privato pg_livia] Zirrà ti ascolta a fatica, il respiro corto. Ti sussurra il nome di chi l'ha pagata, poi tace.
[narratore] Nespola ed Eliandro, la scena resta immobile: il fuoco scricchiola, il vento fischia nel buco del muro.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 5
- primo audio dalla chiusura della finestra: 2390 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00063504

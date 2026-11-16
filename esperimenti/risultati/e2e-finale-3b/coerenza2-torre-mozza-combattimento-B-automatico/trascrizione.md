# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T03:27:01.101Z · PG: pg_livia, pg_nespola, pg_eliandro

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
- pg_livia: «Berta, la torre è quella sopra il bosco? Ci andiamo adesso, prima di mezzanotte.»
- pg_nespola (privata): «Ugo, a parte, a bassa voce: «Tonio è vivo? Dimmi la verità, cmq non dico niente.»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Berta se la torre è quella sopra il bosco, e se ci vanno adesso, prima di mezzanotte.
[png_berta] Quella. Sopra il bosco, dove finiscono le pecore. Andate, adesso.
[narratore] Nespola si avvicina al cancello, dove Ugo sta scaricando il carbone dal mulo, e gli parla piano, voltando la schiena al cortile.
[narratore] Ugo non alza lo sguardo dalla pala, ma smette di sputare.
[narratore] Eliandro resta fermo sotto il portico, il quaderno aperto, e non dice nulla.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2037 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00045

## Turno 2 — evento violazione

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china verso Berta e parla a bassa voce, sotto il portico, così che il cortile non senta.
[privato pg_eliandro] Berta si irrigidisce. Il suo sguardo corre al fienile, poi torna a lui. Non nega nulla.
[usa] ber_conti_fienile > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di ber_conti_fienile (debiti, debito, soldi, decima, balivo, pagare) è nell'azione⟩
[narratore] Livia e Nespola restano dove sono, in attesa, mentre i cani nel fienile smettono di grattare la porta.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 4196 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0003809

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
[narratore] Livia scende per prima, con lo scudo avanti, e guarda i rami sopra la testa. Nespola corre avanti sul sentiero e si ferma ogni dieci passi, ma il ghiaino scricchiola sotto le sue scarpe e il suono rimbomba fino alla radura.
[narratore] Ugo, accanto alla carbonaia, alza la testa di scatto.
[png_ugo] Lei! Piano, se non vuole finire in un fosso.
[narratore] Eliandro resta indietro, il quaderno chiuso sotto il braccio, e guarda la torre sopra gli alberi.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[invito] pg_livia,pg_nespola,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2215 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00054168

## Turno 5 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 6 — evento violazione

## Turno 6 — evento violazione

## Turno 6 — evento violazione

## Turno 6

Azioni:
- pg_eliandro: «Io sono lento, resto dietro la pietra e tiro quando vi siete mossi.»
- pg_livia: «Vedo tre goblin davanti alla porta. Io carico dopo di lei, scudo avanti.»
- pg_nespola: «Io sono la più veloce di tutti, vado per prima: passo di lato prima che arrivi.»

Narratore:

```text
[narratore] Livia Sarti colpisce Zirrà con la spada lunga. Lo scudo di Zirrà non regge del tutto: la lama le apre il fianco.
[png_zirra] Ahi! Ahi! Stai buona, scudo bianco, che mi scotti!
[narratore] Eliandro resta dietro la pietra, il pugnale pronto, e aspetta che il fianco della goblin si scopra ancora.
[narratore] Nespola si sposta di lato con un passo leggero, e il sasso che Zirrà aveva puntato rimbalza sulla pietra alle sue spalle.
[narratore] Grosso si alza dal fuoco con la mazza in pugno, e il tamburo di pelle cade sul selciato con un tonfo sordo.
[usa] zir_chiave_prima > pg_nespola
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[narratore] Zirrà si volta verso Nespola, ansimando, e stringe la spada corta.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 3
- primo audio dalla chiusura della finestra: 2242 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064594

## Turno 7

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e carica il goblin al centro, la spada lunga che fende l'aria. Il colpo entra sotto il braccio di Grosso, che barcolla, mugola e crolla sul selciato accanto al tamburo.
[narratore] Zirrà si volta di scatto verso il corpo del compagno, poi verso Livia, e per un attimo smette di ridere.
[png_zirra] Grosso! Ehi, alzati, che hai fame!
[narratore] Il fuoco crepita. Dietro la pietra, Eliandro stringe il pugnale e aspetta.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2457 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00060064

## Turno 8

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lancia il pugnale da dietro la pietra. Il colpo passa a un palmo dalla spalla di Zirrà e finisce sul selciato con un tintinnio.
[png_zirra] Ha! Mira da cieco, tu! Ora tocca a me, orecchie a punta!
[narratore] Zirrà ride corto, ma gli occhi restano fissi sulla pietra. Dietro di lei, il ragazzo sui gradini ha smesso di respirare piano.
[narratore] Nespola, il turno è tuo. Zirrà ti sta guardando.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2938 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062904

## Turno 9

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola cala la spada corta alle spalle di Zirrà. La lama trova la schiena scoperta e Zirrà urla, si piega in avanti e lascia cadere lo scudo dipinto di rosso.
[narratore] Zirrà barcolla verso la scala rotta, una mano premuta sul fianco, il respiro corto.
[png_zirra] Scorrettissimo! Chi ti ha insegnato a colpire alle spalle, eh? Ah, ma guarda... sei brava, piccola.
[narratore] Dietro la pietra, Eliandro abbassa il pugnale e resta in attesa. Livia stringe lo scudo, pronta a muoversi.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2548 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068704

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola affonda il colpo tra le scapole di Zirrà, ma la goblin si contorce via e la lama fende solo l'aria. Zirrà si gira con un ringhio e pianta la spada corta nel fianco di Nespola. Nespola stringe i denti e arretra di un passo, la mano premuta sul fianco.
[png_zirra] Ancora in piedi, piccola? Bene. Così il gioco dura di più.
[narratore] Zirrà si ritira verso la scala rotta, lo sguardo puntato sulla pietra dove si nasconde Eliandro.
[narratore] Eliandro, il tuo turno.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 9334 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070714

## Turno 11 — evento violazione

## Turno 11 — evento violazione

## Turno 11

Azioni:
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, il pugnale lascia la mano e si pianta nella spalla di Zirrà, che cade ginocchioni sul selciato. Lo scudo rosso rotola via.
[png_zirra] Ahi... ahi... orecchie a punta, mi hai fatto male davvero.
[narratore] Zirrà si accascia, il respiro che si fa corto. Grosso è già a terra accanto al fuoco. Il ragazzo sui gradini, con la corda ai polsi, guarda la scena senza fiatare.
[narratore] Livia abbassa lo scudo. Nespola si tiene il fianco, ancora in piedi.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 1
- primo audio dalla chiusura della finestra: 3169 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00071464

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e il colpo della lancia rimbalza sul bordo di legno. La punta scivola di lato e si pianta nel selciato, a un palmo dal suo piede.
[narratore] Zirrà ringhia, tira indietro la lancia con due mani e lancia un'occhiata a Eliandro, dietro la pietra.
[png_zirra] Scudo bianco, sei dura! Ma lui non regge gli stessi colpi, vedrai.
[narratore] Nespola, ancora con la mano sul fianco, si sposta di lato, fuori dalla linea della lancia.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 4
- primo audio dalla chiusura della finestra: 2572 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073224

## Turno 13 — evento violazione

## Turno 13

Azioni:
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e spinge il goblin contro il muro. La lama corta trova il fianco scoperto, e lui si affloscia a terra con un gemito.
[narratore] Nespola si tiene il fianco. Il sangue le bagna le dita, ma resta in piedi.
[narratore] Sotto il fuoco, Zirrà e Grosso restano immobili. Del goblin sul muro non si vede più nulla.
[narratore] Eliandro, dietro la pietra, osserva il muro come se cercasse ancora qualcosa.
[invito] pg_eliandro, pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_eliandro","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1723 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074794

## Turno 14 — evento violazione

## Turno 14 — evento violazione

## Turno 14 — evento violazione

## Turno 14

Azioni:
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»

Narratore:

```text
[narratore] Nespola, a terra e col fianco aperto, striscia dietro la pietra e stringe i denti.
[narratore] Eliandro lascia partire il dardo incantato verso il goblin che stava per colpirla. Il dardo trova il bersaglio prima ancora che il goblin si volti.
[narratore] Livia si china, afferra Nespola per il colletto e la trascina dietro lo scudo, coprendola con il proprio corpo.
[narratore] Il fuoco crepita. Sul selciato Zirrà e Grosso restano immobili. Dietro il muro, il respiro del ragazzo sui gradini si fa più pesante.
[invito] pg_nespola,pg_eliandro,pg_livia
[narratore] Eliandro, il dardo incantato colpisce il goblin alla gola e lo getta a terra, senza un grido.
[narratore] Il goblin che minacciava Nespola cade sul selciato accanto alla pietra, immobile.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 1; invito: ["pg_nespola","pg_eliandro","pg_livia"]; anomalie: 3
- primo audio dalla chiusura della finestra: 1939 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00149058

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro arretra di tre passi, il quaderno stretto al petto, e la pietra gli copre la schiena.
[narratore] Livia alza la voce verso i goblin rimasti: chi li paga, e che si fermino.
[narratore] Zirrà, ferita al fianco, sbuffa e scuote la testa, ma non si muove verso la scala. Dietro di lei Grosso e il tamburo restano a terra, immobili.
[png_zirra] Pagare? Ci pagano le pecore, scudo bianco. E tu sei troppo magra per farci paura.
[narratore] Il respiro di Tonio, dietro il muro, si fa più pesante. Dal buco nella cantina arriva un soffio freddo.
[narratore] Nespola, sei ancora in piedi, ma la mano non ti lascia il fianco. Il tuo turno.
[invito] pg_livia,pg_eliandro,pg_nespola
[narratore] Livia, la tua voce rimbalza sui muri della torre. Zirrà ride, ma il riso le si spezza in gola.
[png_zirra] Chi ci paga? Il buio, scudo bianco. E il buio non dà monete, dà solo fame.
[narratore] Livia, sei in piedi tra il fuoco e i corpi. Il tuo turno.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 1; invito: ["pg_livia","pg_eliandro","pg_nespola"]; anomalie: 8
- primo audio dalla chiusura della finestra: 1762 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00153218

## Turno 16 — evento violazione

## Turno 16

Azioni:
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia tiene lo scudo alzato e non colpisce. Il goblin davanti a lei si guarda alle spalle, verso il compagno che scappa.
[narratore] Eliandro, dal gradino, lancia il pugnale verso la schiena di chi fugge verso la cantina. Il colpo sfiora il bordo della porta e rimbalza sulla pietra.
[narratore] Nespola resta dietro la pietra, la mano sul fianco. Dalla cantina arriva un colpo sordo, poi silenzio.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[narratore] Eliandro, il muro accanto alla porta di ferro ha un segno fresco, tracciato con la punta di un coltello. Qualcuno ha contato i passi fin lì.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1674 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078374

## Turno 17 — evento violazione

## Turno 17 — evento violazione

## Turno 17

Azioni:
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si inginocchia accanto a Nespola e stringe la sciarpa intorno alla spalla. Il sangue si ferma sotto il tessuto.
[narratore] Livia, il goblin con la lancia ha già lasciato la presa. Un colpo di spada lunga lo abbatte sul selciato, e la lama torna pulita.
[narratore] Sotto il muro, il respiro del ragazzo si fa più pesante. Dalla cantina non arriva più nessun suono.
[narratore] Nespola, sei ancora in piedi, appoggiata alla pietra con la mano sulla fasciatura. Il tuo turno.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 2094 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074574

## Turno 18 — evento violazione

## Turno 18 — evento violazione

## Turno 18 — evento violazione

## Turno 18

Azioni:
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_eliandro: «Lo tengo fermo col piede e chiedo: «Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e spinge l'ultimo goblin contro la porta di ferro. Il legno geme, la lama corta resta bloccata tra i due corpi.
[narratore] Eliandro tiene il piede sul goblin e gli chiede dov'è il ragazzo. Il goblin sputa sangue e guarda verso la cantina.
[png_zirra] Non sa niente lui... niente chiave, niente ragazzo. Ah, ah.
[narratore] Dalla cantina, il respiro di Tonio si fa più pesante.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: 2525 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073484

## Turno 19 — evento violazione

## Turno 19 — evento violazione

## Turno 19

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia, Nespola ed Eliandro: tra voi e il muro non resta nessuno che respiri, tranne il ragazzo dietro la porta.
[narratore] Livia, chiedi a Zirrà cosa vuole, o quello che hai da dirle, nell'orecchio.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2526 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059734

## Turno 20 — evento violazione

## Turno 20 — evento violazione

## Turno 20 — evento violazione

## Turno 20

Azioni:
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, il dardo è ancora nella tua mano. Dalla cantina non arriva più nessun suono, e la porta di ferro resta socchiusa.
[narratore] Livia e Nespola, il goblin bloccato sotto lo scudo ha smesso di respirare. Tra voi e la porta non c'è più nessuno in piedi.
[narratore] Eliandro, il segno sul muro accanto alla porta è ancora fresco. Sotto le dita c'è un'altra incisione, più piccola, quasi nascosta dalla fuliggine.
[invito] pg_eliandro,pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro","pg_livia","pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: 2777 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065354

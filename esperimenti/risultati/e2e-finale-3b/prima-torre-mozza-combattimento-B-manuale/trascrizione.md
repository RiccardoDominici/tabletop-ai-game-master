# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-15T21:54:51.716Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[png_berta] Quella. Sopra il bosco, dietro la carbonaia. Andateci, e portatemi indietro mio figlio.
[narratore] Nespola si avvicina a Ugo e gli parla a bassa voce, senza farsi sentire dal cortile.
[usa] ugo_sentiero_privato > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «in privato, un PG chiede a Ugo chi passa sul sentiero della torre» solo: tonio⟩
[privato pg_nespola] Ugo abbassa la voce e ti dice che tra i pini, dopo la carbonaia, passa gente che non vuole essere vista. Non dice di più.
[narratore] Eliandro resta in disparte, con il quaderno aperto sul braccio, e osserva il cancello dello stazzo.
[invito] pg_livia,pg_eliandro,pg_nespola
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1365 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00048805

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro chiede a Berta chi, a Spinalba, scrive così bene le lettere comuni. Berta si ferma con la mano sulla chiave.
[privato pg_eliandro] Sul pezzo di lavagna le lettere sono dritte e uguali, come quelle di un copista: non le ha vergate un pastore.
[narratore] Livia e Nespola restano dove sono, in attesa.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: 5937 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00041105

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
[narratore] Nespola corre avanti sul sentiero e si ferma ogni dieci passi per ascoltare. Livia scende per prima, con lo scudo alzato, e guarda i rami sopra la testa.
[narratore] Nespola non riesce a muoversi in silenzio: un ramo secco scricchiola sotto il suo piede, e nel bosco qualcosa si ferma.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Livia nota un movimento tra i rovi, in alto, a destra del sentiero.
[invito] pg_livia,pg_nespola
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 64 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00047763

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
[narratore] Eliandro resta dietro la pietra, con il quaderno chiuso sotto il braccio, e aspetta che la scena si muova.
[narratore] Livia avanza con lo scudo alzato. Il suo colpo di spada lunga va a vuoto: Zirrà scarta di lato, e la lama sbatte contro il muro di pietra.
[narratore] Grosso si alza con la mazza ferrata e colpisce Livia, ma il colpo le scivola sullo scudo.
[narratore] Nespola passa di lato nel buio, senza un rumore, e si mette alle spalle della fila dei goblin.
[usa] zir_chiave_prima > pg_livia
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[narratore] Zirrà ride corto e batte la spada corta sullo scudo.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00057859

## Turno 7

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale da dietro la pietra, verso il goblin con la lancia.
[narratore] La lama vola nel buio e manca il bersaglio: Zirrà si scosta appena, e il pugnale sbatte contro il muro.
[narratore] Zirrà ride corto, senza smettere di battere la spada sullo scudo.
[png_zirra] Mancato! Prova ancora, mago dei libri.
[narratore] Livia resta ferma davanti alla porta, con lo scudo alzato, e aspetta il suo turno.
[narratore] Nespola, alle spalle dei goblin, ha ancora il fiato corto e il pugnale in mano.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 855 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00056339

## Turno 8

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa lo scudo e carica quello al centro. La spada lunga cala con forza sul goblin, che grida e cade all'indietro. Ha colpito, ferito.
[narratore] Grosso barcolla sotto il colpo, ma resta in piedi con la mazza stretta.
[png_grosso] Fame, e colpi. Brutta cosa.
[narratore] Nespola, alle spalle dei goblin, vede il varco aperto e il fiato ancora corto.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1412 ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0.00055169

## Turno 9

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola colpisce Zirrà alle spalle con la spada corta: la lama entra nella spalla, e la goblin cade in ginocchio con un grido.
[narratore] Zirrà resta a terra, ferita, con lo scudo rosso che le scivola di mano.
[png_grosso] Zirrà! Alzati.
[narratore] Grosso si gira verso Nespola, la mazza sollevata, ma resta fermo: Livia gli è già davanti con lo scudo alzato.
[narratore] Eliandro, dietro la pietra, stringe il quaderno e non si muove.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061359

## Turno 10

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e para la lancia del goblin: il colpo scivola sul bordo di ferro, e la punta sbatte contro la pietra alle sue spalle. Resta in piedi, con il braccio che vibra.
[narratore] Nespola, sul fianco dei goblin, si sporge appena dal buio.
[png_zirra] Ehi, la scudo bianca regge! Mezza misura, tieni la lancia dritta o la spezzo.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2826 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059559

## Turno 11

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola affonda la spada corta alle spalle di Grosso, sotto la pelle d'orso. L'hobgoblin barcolla, lascia cadere la mazza e crolla in ginocchio sulla pietra.
[narratore] Zirrà guarda il suo compagno a terra, poi guarda la spada di Nespola, e per un momento non ride più.
[narratore] Eliandro, dietro la pietra, sente il silenzio cambiare. Fuori dalla torre il vento porta un altro corno, più lontano.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 108 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00063749

## Turno 12

Azioni:
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale verso Zirrà, ma la lama sbatte nel vuoto: Zirrà si sposta e il pugnale vola contro il muro.
[narratore] Zirrà ride corto e ti punta la spada corta addosso, la pietra della torre ancora umida sotto i piedi.
[narratore] Eliandro, hai tre punti di ferita: un colpo più deciso e sei a terra.
[png_zirra] Mancato! Il mago tira come una vecchia.
[narratore] Livia e Nespola restano sul fianco, in attesa del loro turno. Il fuoco crepita e Zirrà batte la spada sullo scudo.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070499

## Turno 13

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro punta la mano e lancia il dardo incantato verso il goblin che stava per colpire Nespola. Il dardo colpisce, e il goblin si piega su se stesso con un grido.
[narratore] Zirrà barcolla, ferita gravemente. Ride ancora, ma con meno fiato.
[png_zirra] Mago dei libri, hai buona mira. Ma la chiave ce l'avete?
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 24 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00067119

## Turno 14

Azioni:
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e spinge il goblin contro il muro di pietra. Il ferro batte sulla spalla di Zirrà, e la lama corta le scivola via dalla mano.
[narratore] La spada lunga di Livia cala, ma sbatte contro lo scudo di Zirrà: il colpo va a vuoto.
[narratore] Nespola guarda il fuoco da lontano, e il fiato le torna regolare.
[narratore] Eliandro resta dietro la pietra, con il quaderno aperto.
[png_zirra] Scudo bianco, pesi troppo! Mollami, o ci facciamo male tutti.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 32 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072349

## Turno 15

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola sente il colpo alla spalla e il sangue caldo sotto la giacca. Indietreggia di due passi, ma resta in piedi, con la spada corta stretta in mano.
[narratore] Zirrà ride corto e batte la spada sullo scudo.
[png_zirra] Ehi, la piccola ladra non cade! Bel coraggio, per una da tasca.
[narratore] Livia e Eliandro restano al loro posto, in attesa.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 46 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00069609

## Turno 16

Azioni:
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola striscia dietro la pietra, il respiro corto e la spalla che sanguina.
[narratore] Zirrà si gira verso di lei, la spada corta ancora in mano, e ride piano.
[png_zirra] Striscia, piccola. Dietro la pietra si sta più al caldo.
[narratore] Eliandro, dietro la pietra, sente la voce della goblin avvicinarsi e stringe il quaderno.
[narratore] Livia resta in attesa davanti alla porta, con lo scudo alzato e il fiato pesante.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3458 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00067499

## Turno 17

Azioni:
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro arretra di tre passi verso la scala, il quaderno stretto al petto.
[narratore] Il movimento è semplice e nessuno lo ostacola: la pietra umida scricchiola sotto i suoi piedi, e il fuoco proietta la sua ombra sul muro.
[narratore] Zirrà si gira appena, e ride corto.
[png_zirra] Scappi, mago dei libri? La scala è stretta, ma ci sta.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3273 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065309

## Turno 18

Azioni:
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia si china su Nespola, la trascina dietro lo scudo e la copre col proprio corpo.
[narratore] Zirrà attacca Livia con la spada corta: il colpo sbatte contro lo scudo e scivola via.
[narratore] Zirrà ride corto, ma adesso ha il fiato corto anche lei.
[png_zirra] Scudo bianco, mi tieni impegnata! Ma la chiave ce l'avete?
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00066559

## Turno 19

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Il fuoco si abbassa. Zirrà si ritira di un passo, scrollando la spada corta, e fissa la porta alle vostre spalle.
[usa] zir_attesa
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[narratore] Fuori dalla torre, il vento porta un corno lontano. Tonio, sui gradini della cantina, alza la testa.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1210 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059709

## Turno 20

Azioni:
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lancia il pugnale verso la figura che scappa verso la cantina. La lama vola nel buio e colpisce: Zirrà cade a terra, senza più forze.
[narratore] Il combattimento è finito. Grosso e Zirrà giacciono immobili sulla pietra.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064769

## Turno 21

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia alza la voce e intima ai goblin di fermarsi. Il fiato le esce bianco nel freddo della torre.
[narratore] Eliandro si inginocchia accanto a Nespola e le stringe la sciarpa intorno alla spalla. Il sangue rallenta.
[narratore] Dal buio della cantina non arriva nessuna risposta: solo il respiro corto di Tonio.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 5062 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064339

## Turno 22

Azioni:
- pg_eliandro: «Lo tengo fermo col piede e chiedo: «Dov'è il ragazzo?»»
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro preme il piede sul goblin e chiede dove sia il ragazzo. La creatura non risponde subito: guarda verso la cantina.
[usa] nar_tonio_zitto > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Il ragazzo guarda Zirrà prima di rispondere.
    ⟨pre-scritta⟩ [narratore] Dice soltanto che sta bene, e che dovete portare la chiave.
[narratore] Livia resta ferma con lo scudo alzato. Il goblin davanti a lei, senza più il compagno a guardarlo, abbassa la lancia di un dito.
[narratore] Nespola, a terra dietro la pietra, stringe la sciarpa sulla spalla e aspetta.
[invito] pg_nespola
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 4907 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068169

## Turno 23

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa la spada lunga sulla lancia del goblin davanti a lei. Il colpo lo getta contro il muro, e la lancia cade sulla pietra.
[narratore] Eliandro si china verso il goblin e gli parla piano, con il piede ancora sul suo petto.
[png_berta] Chi vi dà ordini? Dimmelo, e puoi scappare.
[narratore] Il goblin non parla. Guarda verso la cantina, dove Tonio sta in silenzio.
[privato pg_eliandro] La creatura trema, ma non dice niente. Ha paura di qualcuno più di quanto abbia paura di te.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1153 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072809

## Turno 24

Azioni:
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia spinge l'ultimo goblin contro la porta di ferro, con lo scudo alzato. Il colpo non fa presa: la creatura scivola di lato e il ferro della porta risuona.
[narratore] Il goblin si rannicchia contro il battente e non alza più la lancia.
[narratore] Dalla cantina arriva solo il respiro corto di Tonio.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 23 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065709

## Turno 25

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa la punta della spada sul petto del goblin. La lama non tocca la pelle, ma il goblin lo sente lo stesso.
[narratore] Il goblin alza gli occhi verso di lei, poi verso la cantina, dove il respiro di Tonio si è fermato.
[narratore] Parla piano, in fretta, e la voce gli trema. Dice che il ragazzo è stato portato via, ma non dice da chi.
[narratore] Livia sente il peso dello scudo sul braccio e la porta di ferro dietro di sé, fredda come il muro.
[privato pg_livia] Il goblin non ti guarda più: guarda il buio della cantina, come se qualcuno lo tenesse d'occhio da lì.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1691 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072479

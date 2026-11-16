# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T05:16:33.843Z · PG: pg_livia, pg_nespola, pg_eliandro

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

## Turno 1 — evento risposta_privata

## Turno 1

Azioni:
- pg_livia: «Berta, la torre è quella sopra il bosco? Ci andiamo adesso, prima di mezzanotte.»
- pg_nespola (privata): «Ugo, a parte, a bassa voce: «Tonio è vivo? Dimmi la verità, cmq non dico niente.»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Berta se la torre è quella sopra il bosco, e se ci vanno adesso, prima di mezzanotte.
[png_berta] Quella. Sopra il bosco. Andate, se andate.
[narratore] Nespola si avvicina a Ugo, e Ugo non la guarda. Il mulo gli sbuffa dietro.
[narratore] Eliandro resta fermo accanto alla porta della casa, con il quaderno chiuso sotto il braccio.
[usa] tr_bosco
    ⟨pre-scritta⟩ [narratore] Sotto i faggi il buio arriva di colpo.
    ⟨pre-scritta⟩ [narratore] L'odore di fumo cresce a ogni passo, e da lontano si sente sibilare una carbonaia.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1788 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004411

## Turno 2 — evento risposta_privata

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si avvicina a Berta e le parla piano, mentre Livia e Nespola restano a guardare.
[privato pg_eliandro] Berta lo ascolta senza guardarlo, poi scuote la testa: «Il fienile è di Tonio, non mio. Se vuoi sapere dei soldi, chiedilo lì.»
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2672 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0003656

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
[narratore] Nespola si china sul sentiero e corre avanti, fermandosi ogni dieci passi per ascoltare.
[narratore] Livia scende per prima, con lo scudo avanti, e guarda i rami sopra la testa.
[narratore] Eliandro resta indietro, in attesa.
[narratore] Nespola cerca le trappole sul sentiero dei goblin, ma il piede le scivola sulle frasche.
[narratore] Nespola, sotto le frasche, il terreno cede. Tocca a te il tiro per non cadere.
[narratore] Ugo, appoggiato alla pala, ti guarda con meno diffidenza di prima.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[invito] pg_nespola,pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 46 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00053748

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
[narratore] Nespola si lancia avanti, ma il piede scivola sulle frasche e il terreno cede sotto di lei. Il piede resta impigliato in un groviglio di radici, e la fionda le sfugge di mano.
[narratore] Eliandro resta dietro la pietra, in attesa del suo momento.
[narratore] Livia avanza con lo scudo, e la sua spada lunga colpisce Zirrà al fianco.
[narratore] Zirrà ringhia e stringe la spada corta, ferita ma ancora in piedi. Il sangue le scorre lungo il braccio.
[png_zirra] Ah, ci giochiamo così? Allora ballate.
[narratore] Nespola, a terra, cerca di rialzarsi, ma un colpo di Grosso dalla mazza la costringe a rotolare di lato.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 5586 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061774

## Turno 7 — evento violazione

## Turno 7

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola affonda la spada corta nella schiena scoperta del goblin a destra. Zirrà si gira di scatto, ma il colpo l'ha già piegata a terra.
[narratore] Zirrà cade sulle pietre, la spada corta che le scivola dalla mano.
[narratore] Grosso si alza di colpo dal fuoco, con l'osso ancora in bocca, e stringe la mazza.
[png_grosso] Zirrà? Zirrà, svegliati.
[narratore] Zirrà non si muove. Il fuoco crepita, e il ragazzo sui gradini trattiene il fiato.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059954

## Turno 8 — evento violazione

## Turno 8

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lascia il pugnale nell'aria. Il colpo gli sfiora la spalla, e Grosso ringhia, con il sangue che gli scende nel muso color fango.
[narratore] Grosso stringe la mazza più forte, ferito ma ancora in piedi.
[png_grosso] Tu. Fame di te adesso.
[narratore] Nespola, il piede ancora impigliato nelle radici, prova a liberarsi.
[narratore] Livia resta ferma con lo scudo alzato, pronta al prossimo colpo.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00060954

## Turno 9 — evento violazione

## Turno 9

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa lo scudo e guarda Grosso piegarsi sulle pietre, con la mazza che gli scivola dalle dita.
[narratore] Il fuoco crepita. Dietro di lei, Zirrà non si muove più, e il ragazzo sui gradini ha smesso di respirare piano.
[narratore] Nespola, il piede ancora nelle radici, tira un respiro e alza lo sguardo verso la scala rotta.
[narratore] Eliandro esce da dietro la pietra, lento, il pugnale ancora in mano.
[narratore] Sui gradini della cantina Tonio ti guarda, con gli occhi sgranati. Dietro di lui la porta di ferro della cripta è chiusa.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065634

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10 — evento violazione

## Turno 10 — evento violazione

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
[narratore] Livia alza lo scudo e para la lancia del goblin; il colpo scivola sul bordo e si perde nel fango.
[narratore] Nespola colpisce ancora, poi scarta di lato e lascia il goblin dietro di sé: il corpo le passa accanto e cade sulle pietre.
[narratore] Eliandro lancia il pugnale; il goblin si volta verso di lui, ma il colpo lo raggiunge alla spalla.
[narratore] Il fuoco crepita. Sui gradini Tonio trattiene il fiato, e la porta di ferro della cripta resta chiusa dietro di lui.
[invito] pg_livia,pg_nespola,pg_eliandro
[narratore] Livia, la lancia del goblin va a vuoto: lo scudo la devia e la punta scivola nel fango.
[narratore] Nespola, il goblin cade sotto il tuo colpo alle spalle e ti lascia la strada libera.
[narratore] Eliandro, il pugnale ti lascia la mano e il goblin barcolla quando il colpo gli si pianta nella spalla.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 3/3, riparazioni 1; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 6
- primo audio dalla chiusura della finestra: 2939 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 603 ms); costo $0.00141458

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
[narratore] Nespola, il colpo alla spalla brucia, ma resti in piedi. Il goblin ti ha preso di striscio.
[narratore] Livia spinge il goblin contro il muro con lo scudo e lo colpisce. Il goblin non risponde più.
[narratore] Eliandro resta fermo dietro la pietra, in attesa.
[narratore] Sul muro, accanto al fuoco, restano i segni a carbone.
[usa] nar_mappa > pg_livia
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda da vicino i segni a carbone sul muro» solo: muro⟩
[narratore] Nespola, con il sangue che ti scende lungo il braccio, guardi la scala rotta. Che fai?
[invito] pg_nespola,pg_eliandro
[narratore] Livia, lo scudo sbatte contro il muro e il goblin cade in ginocchio, con la spada che gli scivola via.
[narratore] Il colpo lo lascia immobile, il respiro corto sulle pietre.
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 1/2, riparazioni 1; invito: ["pg_nespola","pg_eliandro"]; anomalie: 4
- primo audio dalla chiusura della finestra: 1684 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00138098

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»

Narratore:

```text
[narratore] Eliandro scocca il dardo incantato, e il goblin che stava per colpire Nespola cade di schianto.
[narratore] Livia si china su Nespola, la trascina dietro lo scudo e la copre con il corpo.
[narratore] Nespola striscia dietro la pietra con il sangue che le scorre lungo il braccio: il tiro le dà ancora la vita.
[narratore] Ugo, dal margine della radura, ti guarda in silenzio, con la pala stretta in mano.
[invito] pg_livia,pg_eliandro,pg_nespola
[narratore] Eliandro, il dardo incantato colpisce il goblin alla gola, e lui cade senza un grido.
[narratore] Il fuoco crepita, e Tonio sui gradini trattiene il fiato, con gli occhi fissi su di te.
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 1/3, riparazioni 1; invito: ["pg_livia","pg_eliandro","pg_nespola"]; anomalie: 3
- primo audio dalla chiusura della finestra: 106 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00135248

## Turno 13 — evento violazione

## Turno 13 — evento violazione

## Turno 13

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti alza lo scudo e grida ai goblin di fermarsi. Dalla cantina non arriva nessuna risposta.
[narratore] Eliandro indietreggia di tre passi verso la scala, il quaderno stretto al petto. Dietro di lui il fuoco crepita.
[narratore] Nespola non dice nulla e resta dove si trova, tra le radici.
[narratore] Il silenzio dura un respiro. Poi dalla scala rotta scende una voce bassa, ma ormai non c'è più nessuno a parlare per la banda.
[narratore] Sui gradini Tonio ti guarda, immobile. Che fate adesso?
[invito] pg_livia,pg_eliandro,pg_nespola
[narratore] Livia, la tua voce rimbomba sui muri, ma dalla scala rotta non arriva risposta. Il fuoco crepita, e nessuno si muove per dirti chi li paga.
[narratore] Sui gradini Tonio stringe la corda ai polsi e ti guarda, aspettando che qualcuno parli.
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 1; invito: ["pg_livia","pg_eliandro","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3233 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00136458

## Turno 14 — evento violazione

## Turno 14 — evento violazione

## Turno 14 — evento violazione

## Turno 14 — evento violazione

## Turno 14

Azioni:
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lancia il pugnale verso la scala. Il colpo non trova nessuno: la lama rimbalza sulla pietra e cade nel fango.
[narratore] Livia non colpisce: il goblin davanti esita, guarda il compagno, e lei aspetta.
[narratore] Nespola resta tra le radici, senza dire nulla.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[narratore] Sul muro accanto alla porta di ferro della cripta, un segno a carbone è stato cancellato di fretta con la mano.
[invito] pg_livia,pg_nespola
[narratore] Livia, il goblin davanti a te esita e guarda il compagno alle spalle. Tiene la lancia bassa, come chi aspetta un ordine.
[narratore] Lo scudo resta alzato, e la spada lunga non si muove. Il silenzio che segue pesa più di un colpo.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 1/2, riparazioni 1; invito: ["pg_livia","pg_nespola"]; anomalie: 3
- primo audio dalla chiusura della finestra: 1997 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00139318

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa la spada lunga sul goblin con la lancia, e il colpo lo finisce.
[narratore] Eliandro si china accanto a Nespola e le fascia la spalla con la sua sciarpa, mentre Livia combatte.
[narratore] Il goblin cade contro il muro, e con lui cade l'ultimo rumore di lancia sulle pietre.
[narratore] Grosso e Zirrà giacciono dove sono caduti, e il fuoco crepita piano.
[narratore] Nespola, con la spalla fasciata, guarda la scala rotta. Tonio sui gradini trattiene il fiato.
[invito] pg_nespola,pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: 4005 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068174

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
[narratore] Eliandro tiene il goblin fermo col piede e chiede dove sia il ragazzo.
[narratore] Livia spinge l'ultimo goblin contro la porta di ferro con lo scudo.
[narratore] Il goblin non risponde. Il fiato gli esce corto, e la lancia gli cade dalle mani.
[narratore] Nespola resta tra le radici, con la spalla fasciata, e guarda la scala rotta.
[narratore] Sui gradini Tonio si stringe nelle corde e aspetta.
[invito] pg_eliandro,pg_livia
[narratore] Eliandro, il goblin sotto il piede non si muove più. Ansima, gli occhi gialli fissi sul tuo stivale.
[narratore] Livia, la porta di ferro scricchiola sotto la spinta dello scudo. Il goblin non ha più dove andare.
[invito] pg_eliandro,pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 1; invito: ["pg_eliandro","pg_livia"]; anomalie: 4
- primo audio dalla chiusura della finestra: 7154 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00136578

## Turno 17 — evento violazione

## Turno 17 — evento violazione

## Turno 17 — evento violazione

## Turno 17 — evento violazione

## Turno 17 — evento violazione

## Turno 17 — evento risposta_privata

## Turno 17

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia, il goblin contro la porta ha ancora la lancia tra le mani.
[narratore] Livia lo tiene contro il legno con lo scudo, mentre dietro di lei Nespola e Eliandro restano fermi.
[narratore] Il goblin sbuffa, guarda il compagno morto e il fuoco che crepita.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 3
- primo audio dalla chiusura della finestra: null ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0.00056844

## Turno 18 — evento violazione

## Turno 18 — evento violazione

## Turno 18 — evento risposta_privata

## Turno 18

Azioni:
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, il pugnale è ancora in mano. Dentro la cantina non si sente altro che il vento dal buco nel muro.
[narratore] Livia e Nespola sono ferme, con gli occhi sulla porta di ferro.
[narratore] Il fuoco crepita, e sui gradini Tonio trattiene il fiato.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1044 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00057174

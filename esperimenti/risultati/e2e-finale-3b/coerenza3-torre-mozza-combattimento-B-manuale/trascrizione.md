# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T05:35:59.412Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[png_berta] Quella. Sopra il bosco, dove i lupi non vanno. Andate adesso, allora, che le pecore non aspettano.
[narratore] Nespola si avvicina a Ugo con un passo leggero, e gli sussurra qualcosa. Lui le lancia un'occhiata storta, ma non dice nulla.
[privato pg_nespola] Ugo ti guarda a lungo, poi annuisce appena. Ti deve ancora le tre monete, e ora lo sa.
[narratore] Eliandro resta in disparte, con il quaderno sotto il braccio, a osservare la lavagna.
[usa] tr_bosco
    ⟨pre-scritta⟩ [narratore] Sotto i faggi il buio arriva di colpo.
    ⟨pre-scritta⟩ [narratore] L'odore di fumo cresce a ogni passo, e da lontano si sente sibilare una carbonaia.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1293 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004725

## Turno 2 — evento violazione

## Turno 2 — evento risposta_privata

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si avvicina a Berta Benni, abbassando la voce.
[privato pg_eliandro] Berta ti risponde piano, dando ascolto solo alle tue parole: ti dice che il figlio aveva con sé un libretto dei conti dell'ovile, e che lei non sa dove sia finito.
[narratore] Livia e Nespola restano dove sono, in attesa.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3705 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0003717

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
[narratore] Livia scende per prima, con lo scudo alzato, e guarda i rami sopra la testa. Nespola corre avanti sul sentiero e si ferma ogni dieci passi per ascoltare.
[narratore] Nespola si china sul sentiero per cercare trappole, ma nel fango non vede niente di sicuro, e il suo passo tocca le frasche.
[narratore] Un ramo si spezza sotto la suola di Nespola, e dal sottobosco arriva un fischio secco, poi un altro.
[narratore] Eliandro guarda il quaderno, poi alza gli occhi verso il sentiero dei goblin.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Ugo, dalla radura, batte la pala per terra due volte.
[png_ugo] Paese. Se volete la torre, quel sentiero è la strada dei goblin.
[usa] nar_segno_1
    ⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 1, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059828

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
[narratore] Eliandro resta dietro la pietra. Livia carica dopo di loro, scudo avanti, mentre Nespola passa di lato prima che i goblin possano reagire.
[narratore] Livia manca Zirrà: la spada lunga scivola sullo scudo della goblin, che ride corto.
[narratore] Nespola riesce a passare di lato con un gesto rapido, sfuggendo ai colpi dei goblin.
[narratore] Grosso, sorpreso, perde il primo round: resta fermo a guardare con l'osso in mano.
[narratore] Zirrà ti guarda da dietro lo scudo, e il corno di capra le pende dal fianco.
[usa] zir_chiave_prima > pg_livia
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062454

## Turno 7

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia carica Zirrà e la spada lunga affonda nel vuoto: la goblin sposta lo scudo di un soffio e il colpo scivola via, sbilanciando Livia in avanti.
[narratore] Grosso sbatte l'osso sul terreno e si alza in piedi, la mazza in mano.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 112 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00056234

## Turno 8

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola scivola dietro Zirrà e cala la spada corta sulla schiena scoperta. Il colpo entra profondo, e la goblin urla.
[narratore] Zirrà barcolla, la mano stretta sulla ferita, lo scudo che pende.
[png_zirra] [forceful] Ah! Scassinatrice! Ti spello per questo!
[narratore] Grosso, ancora sorpreso, stringe la mazza senza capire da dove sia arrivato il colpo.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062544

## Turno 9

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale da dietro la pietra. La lama fende l'aria e colpisce Zirrà al petto. La goblin cade in ginocchio, lo scudo che rotola sul selciato.
[narratore] Grosso guarda la compagna a terra, poi il fuoco, poi la scala. La mazza gli scivola di mano. Si volta e scappa verso il crinale, e il corno di capra gli rimbalza sulla schiena.
[narratore] Il vento porta via l'eco della corsa. Nella torre restano il fuoco, il corpo di Zirrà e il ragazzo sui gradini, con la corda ancora ai polsi.
[narratore] Tonio alza gli occhi verso di voi, e per la prima volta sembra vedere qualcuno.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 73 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068614

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
[narratore] Livia para la lancia con lo scudo: il legno geme, ma regge. Il goblin ringhia e arretra di un passo.
[narratore] Nespola colpisce ancora, poi scivola di lato e lascia il goblin dietro di sé, a sbilanciarsi sul selciato gelato.
[narratore] Eliandro lancia il pugnale: il goblin si gira verso di lui, e la lama gli sfiora la spalla senza fermarlo.
[narratore] Grosso, dal fuoco, si volta a guardare i suoi compagni e stringe il pugno sull'osso.
[invito] tutti
[narratore] Nespola colpisce il goblin alla gamba, poi scivola di lato e lo lascia sbilanciato sul selciato gelato.
[narratore] Eliandro lancia il pugnale: la lama fende l'aria e lo sfiora alla spalla, senza fermarlo.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 2/3, riparazioni 1; invito: "tutti"; anomalie: 6
- primo audio dalla chiusura della finestra: 1932 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00136818

## Turno 11 — evento violazione

## Turno 11

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia e Nespola si avvicinano alle carcasse dei goblin mentre il fuoco sfrigola. Zirrà giace immobile vicino alla scala.
[narratore] Nespola sente il sangue caldo colarle lungo il braccio, ma si tiene in piedi, a denti stretti.
[narratore] Livia spinge il goblin contro il muro con lo scudo, e il colpo di spada lo raggiunge. Il corpo cade senza un grido.
[narratore] Eliandro, dietro la pietra, osserva ogni cosa in silenzio, con il quaderno aperto sulle ginocchia.
[narratore] Tonio, sui gradini della cantina, guarda il corpo di Zirrà, poi voi. Il suo respiro è corto.
[invito] pg_nespola,pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_livia","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3023 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075194

## Turno 12 — evento violazione

## Turno 12 — evento violazione

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
[narratore] Eliandro alza la mano e il dardo incantato parte dal suo palmo, verso il goblin che stava per colpire Nespola. Il colpo arriva senza mancare.
[narratore] Livia si china su Nespola, la trascina dietro lo scudo e la copre con il proprio corpo.
[narratore] Nespola striscia dietro la pietra, stringendo i denti, il braccio insanguinato.
[narratore] Il goblin colpito dal dardo barcolla e cade. Ne resta ancora uno, che si ferma a guardare la scena, incerto.
[invito] tutti
[narratore] Eliandro, il dardo colpisce il goblin in pieno petto. Il colpo arriva senza mancare, e la creatura cade in ginocchio.
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 1/3, riparazioni 1; invito: "tutti"; anomalie: 6
- primo audio dalla chiusura della finestra: 2879 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00144288

## Turno 13

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti, grida e lo scudo alzato. Ma la goblin Zirrà è a terra, e chi resta in piedi non risponde.
[narratore] Il corpo di Zirrà giace accanto alla scala, immobile.
[narratore] Eliandro arretra di tre passi verso la scala, il quaderno stretto al petto.
[narratore] Il fuoco crepita. Dal crinale non arriva più nessun corno.
[narratore] Tonio, sui gradini della cantina, guarda la scala e poi voi, con il respiro corto.
[invito] pg_nespola,pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2239 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072674

## Turno 14 — evento violazione

## Turno 14 — evento violazione

## Turno 14

Azioni:
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale verso il goblin che scappa in cantina, ma la lama si perde nel buio della scala, e il rumore dei passi continua giù, verso la porta di ferro.
[narratore] Livia non colpisce. Il goblin davanti a lei si volta verso il compagno, lo guarda, e aspetta.
[narratore] Nespola resta dietro la pietra, il braccio insanguinato, e ascolta.
[narratore] Zirrà giace accanto alla scala, immobile. Tonio, sui gradini, la guarda, poi alza gli occhi su di voi.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[invito] pg_livia,pg_nespola
[narratore] Eliandro, il pugnale parte dal gradino e sparisce nel buio della scala: il rumore dei passi si allontana verso la porta di ferro, e della lama non si sente più nulla.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 2; azioni senza risposta 0/2, riparazioni 1; invito: ["pg_livia","pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: 4077 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 419 ms); costo $0.00150118

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa la spada lunga sul goblin con la lancia, senza fargli scudo.
[narratore] Il colpo lo coglie di fianco e lo stende sulle pietre, accanto alla scala.
[narratore] Nespola, dietro la pietra, stringe il braccio insanguinato e guarda Eliandro che si china su di lei con la sciarpa in mano.
[narratore] Eliandro le fascia la spalla in fretta, mentre fuori dalla torre il vento porta un corno lontano.
[narratore] Il fuoco si abbassa. Tonio, sui gradini, ha smesso di guardare il corpo di Zirrà e guarda voi.
[invito] pg_livia,pg_nespola,pg_eliandro
[narratore] Livia, il goblin con la lancia cade di fianco sulle pietre, accanto alla scala. Non si rialza.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 1/2, riparazioni 1; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 4390 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00143758

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16 — evento violazione

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
[narratore] Eliandro preme il piede sul goblin e chiede dove sia il ragazzo. La creatura sputa sangue sulle pietre e non risponde.
[narratore] Livia alza lo scudo e spinge l'ultimo goblin contro la porta di ferro. Il legno geme, e il goblin resta schiacciato, senza più fiato per ribellarsi.
[narratore] Il fuoco si abbassa. Tonio, sui gradini, guarda il goblin schiacciato, poi voi.
[narratore] Nespola, dietro la pietra, resta ferma con il braccio fasciato e osserva la scena in silenzio.
[invito] pg_eliandro,pg_livia
[narratore] Eliandro, il goblin sputa sangue sulle pietre e non risponde. Il ragazzo, sui gradini, guarda voi due.
[narratore] Livia, lo scudo preme il goblin contro la porta di ferro. Il legno geme, e la creatura non ha più fiato per ribellarsi.
[invito] pg_eliandro,pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 2/2, riparazioni 1; invito: ["pg_eliandro","pg_livia"]; anomalie: 8
- primo audio dalla chiusura della finestra: 2928 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 1838 ms); costo $0.00146828

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
[narratore] Livia si china sul corpo di Zirrà, lontano dagli occhi degli altri, e le parla piano.
[privato pg_livia] Zirrà non risponde più. Ma la sua mano stringe ancora una moneta, e sotto la moneta c'è un foglio piegato con un simbolo rosso.
[narratore] Livia si rialza in fretta e si volta verso Nespola ed Eliandro, lo scudo ancora in mano.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: null ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0.00059974

## Turno 18 — evento risposta_privata

## Turno 18

Azioni:
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china sul corpo di Zirrà, poi ritorna sui gradini senza dire una parola.
[narratore] Il ragazzo ha stretto le ginocchia al petto. Non sembra avere fretta di alzarsi.
[narratore] Nespola, con il braccio fasciato, si avvicina alla scala e guarda il fuoco che si spegne.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2532 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00058554

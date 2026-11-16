# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T00:34:43.071Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[narratore] Livia chiede a Berta se la torre è quella sopra il bosco, e se ci vanno adesso. Berta stringe la chiave al collo.
[png_berta] Quella. Sopra il bosco, dove finisce il crinale. Andateci adesso, prima che suoni la campana.
[narratore] Nespola si avvicina a Ugo con passo leggero, senza farsi notare dagli altri.
[privato pg_nespola] Ugo non ti ascolta: sputa per terra e ti dice di chiedere alla pastora, poi torna a guardare il suo mulo. Le tre monete restano dove sono.
[narratore] Eliandro resta fermo accanto al cancello, a guardare i pali intagliati.
[usa] ber_rapitore > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta indica il cancello con il mento, dove aspetta il mulo carico di carbone.
    ⟨pre-scritta⟩ [png_berta] Lui. Ha venduto ai goblin il sentiero, per vendetta.
[narratore] Il vento porta fumo di carbonaia dal sentiero, e i cani nel fienile grattano la porta.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1331 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000494

## Turno 2 — evento violazione

## Turno 2 — evento violazione

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
[narratore] Eliandro si avvicina a Berta, abbassando la voce, e le parla più vicino all'orecchio di quanto sia consueto.
[narratore] Gli altri restano al cancello, e il vento porta via le parole.
[privato pg_eliandro] Berta ti dice che i soldi dell'ovile li tiene in fienile, sotto la paglia del giaciglio di Tonio, e che Ugo sapeva dove.
[narratore] Nespola, Ugo ti guarda di traverso e sputa di nuovo per terra. Il mulo muove la testa e tintinna.
[png_ugo] Lei, la piccola. Il carbone costa, e le monete devono venire prima.
[narratore] Livia si gira verso il sentiero, con lo scudo appoggiato alla spalla.
[invito] pg_nespola,pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_nespola","pg_livia"]; anomalie: 5
- primo audio dalla chiusura della finestra: 3265 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0004427

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
[narratore] Nespola corre avanti sul sentiero e si ferma ogni dieci passi, ma il fruscio delle foglie copre i suoi passi e qualcosa si muove più in alto, tra i rami.
[narratore] Livia scende per prima, con lo scudo avanti. I rami sopra la sua testa oscillano, e una cortecca stacca cade sul sentiero.
[narratore] Eliandro resta indietro, vicino al cancello, e tiene gli occhi sui pali intagliati.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[invito] pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 402 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00053158

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
[narratore] Eliandro resta dietro la pietra, sul lato del cancello, e aspetta che il sentiero si libera.
[narratore] Livia scende avanti, scudo alzato, e carica verso la porta della torre. Il colpo di spada lunga sbatte contro lo scudo di Zirrà, che lo devia con un rumore secco.
[usa] zir_chiave_prima > pg_nespola
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[narratore] Nespola passa di lato, rapida come un gatto, e schiva il primo fendente dei goblin.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00057864

## Turno 7

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e colpisce il centro del gruppo. La spada lunga affonda nel fianco di Grosso, che cade pesante accanto al fuoco. Il corpo resta immobile, la mazza scivola sulla pietra.
[narratore] Zirrà vede il compagno a terra, lascia cadere la spada corta e fugge di corsa verso il crollo, verso il crinale.
[narratore] Nespola sente lo scatto dei gradini e si porta dietro la scala, con la fionda in mano.
[narratore] Eliandro resta dietro la pietra, stringe il quaderno e guarda Tonio sui gradini della cantina.
[narratore] Il fuoco crepita piano. Dal buco del muro arriva aria fredda, e dalla cantina una voce sottile chiede se è finita.
[narratore] Livia, la torre è vostra adesso. Che fate?
[invito] tutti
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064134

## Turno 8 — evento violazione

## Turno 8 — evento violazione

## Turno 8

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Nespola sgattaiola alle spalle del goblin di destra, ma nel buio il suo piede scivola su una pietra. La spada corta gli sfiora appena la schiena: il goblin si gira di scatto, sibilando.
[narratore] Il pugnale di Eliandro vola dalla pietra e s'infila nella spalla del goblin con la lancia. Quello urla e lascia cadere l'arma.
[narratore] Zirrà è già sparita nel buio verso il crollo: si sente solo il rotolio di qualche sasso sul crinale.
[narratore] Il goblin ferito barcolla, ma non cade. Sui gradini della cantina Tonio stringe la corda ai polsi e guarda la porta di ferro.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 2546 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065134

## Turno 9 — evento violazione

## Turno 9 — evento violazione

## Turno 9 — evento violazione

## Turno 9

Azioni:
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»

Narratore:

```text
[narratore] Eliandro colpisce di nuovo il goblin con il pugnale, e quello si gira verso di lui con un ringhio. Nespola affonda la spada corta nella schiena del goblin e poi scarta di lato, lasciandolo dietro di sé.
[narratore] Il goblin barcolla, la lancia gli scivola di mano e cade sul selciato. Non si rialza.
[narratore] Livia alza lo scudo contro la lancia che arriva, e il colpo rimbalza via sul metallo. Non le ha fatto niente.
[narratore] Grosso è immobile accanto al fuoco. Sui gradini, Tonio stringe la corda e guarda la porta di ferro.
[invito] tutti
[narratore] Eliandro, il pugnale tocca il fianco del goblin e quello si gira con un ringhio, cercando te con gli occhi gialli.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 1; invito: "tutti"; anomalie: 3
- primo audio dalla chiusura della finestra: 2070 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00131818

## Turno 10

Azioni:
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia, lo scudo sbatte contro il muro e il goblin si schiaccia tra la pietra e il suo peso. Il fiato gli esce di colpo, e la lancia cade sul selciato.
[narratore] Nespola, il colpo alla spalla brucia, ma resti in piedi. Il sangue scende caldo sotto la giacca di cuoio.
[narratore] Zirrà non è più qui: il goblin che hai davanti è quello della lancia, e il suo sguardo cerca una via di fuga.
[usa] nar_mappa > pg_livia
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda da vicino i segni a carbone sul muro» solo: muro⟩
[narratore] Eliandro, aspetti dietro la pietra, e intanto il fuoco si abbassa e la cantina tace.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1882 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074024

## Turno 11

Azioni:
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»

Narratore:

```text
[narratore] Nespola striscia dietro la pietra, il fiato corto. Livia la copre col suo scudo, e il sangue della spalla le gocciola sul selciato.
[narratore] Eliandro lascia partire il dardo, che attraversa il buio e si pianta nel petto del goblin, già a metà gesto. Quello cade contro il muro senza un suono.
[narratore] Livia sente Nespola respirare sotto lo scudo: è viva, ma ferita.
[narratore] Dalla cantina il vento porta un lamento sottile, e Tonio, sui gradini, si stringe la corda ai polsi.
[invito] pg_nespola,pg_livia,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_corda

```text
⟨pre-scritta⟩ [narratore] La corda fa tre giri intorno ai polsi, e i capi pendono liberi.
⟨pre-scritta⟩ [narratore] Non c'è nessun nodo. Sulla pelle non c'è un segno.
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nespola","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1935 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075504

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12

Azioni:
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro arretra di tre passi verso la scala, col quaderno stretto al petto.
[narratore] Livia alza la voce verso il fuoco: chi vi paga, e che cosa vi ha detto di fare?
[png_zirra] Ehi, scudo bianco! Pagano in monete, poi, o in parole?
[narratore] Lo sguardo di Zirrà scivola sulla spada di Livia, poi sul corpo immobile di Grosso accanto al fuoco. Si ferma lì, e non dice più niente.
[narratore] Nespola, a terra dietro la pietra, sente il sangue freddo sotto la giacca e ascolta il silenzio della torre.
[narratore] Dalla cantina Tonio tace, e la corda ai polsi resta lenta.
[invito] pg_livia,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_mappa

```text
⟨pre-scritta⟩ [narratore] Col carbone qualcuno ha disegnato la torre vista dall'alto, con una freccia che scende in cantina.
⟨pre-scritta⟩ [narratore] Accanto c'è scritto cripta, con le erre rovesciate.
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 4
- primo audio dalla chiusura della finestra: 1555 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078744

## Turno 13 — evento violazione

## Turno 13 — evento violazione

## Turno 13 — evento violazione

## Turno 13 — evento violazione

## Turno 13 — evento violazione

## Turno 13

Azioni:
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia, il goblin davanti a te esita, lo sguardo corre al compagno steso accanto alla porta. Tu aspetti la sua risposta, scudo alzato.
[narratore] Dal gradino Eliandro lancia il pugnale verso la figura che scappa verso la cantina. La lama corre nel buio, ma la cantina inghiotte il rumore.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[narratore] Il muro accanto alla porta di ferro porta i segni di una lunga mano di calce, e sotto la calce un'altra lettera.
[narratore] Nespola, ti rimane il respiro corto sotto la pietra. Sopra la porta della cantina, il vento porta lamenti sottili dalla cripta.
[invito] pg_livia,pg_nespola
[narratore] Livia, il goblin davanti a te esita, lo sguardo corre al compagno steso accanto alla porta. Non fa un passo, e la lancia gli trema nelle mani.
[narratore] Sotto la calce del muro si intravede ancora la lettera, e il goblin sembra ricordarsi che qualcuno lo sta guardando.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 1/2, riparazioni 1; invito: ["pg_livia","pg_nespola"]; anomalie: 5
- primo audio dalla chiusura della finestra: 2184 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00159548

## Turno 14 — evento violazione

## Turno 14 — evento violazione

## Turno 14

Azioni:
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lascia il quaderno sulla pietra e si china su Nespola. Strappa un lembo della sciarpa e le fascia la spalla, stretto, con le dita che tremano un poco.
[narratore] Livia avanza verso l'ultimo goblin, quello con la lancia caduta. Lo colpisce di spada lunga e il corpo si affloscia contro il muro, senza un grido.
[narratore] Il fuoco al centro della torre è quasi spento. Grosso giace immobile accanto alla brace, e la mazza è ancora sulla pietra.
[narratore] Dalla cantina Tonio chiede piano se la torre è di nuovo silenziosa.
[invito] pg_livia,pg_nespola,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_conto

```text
⟨pre-scritta⟩ [narratore] Accanto alla porta di ferro ci sono tacche a carbone, a gruppi di cinque.
⟨pre-scritta⟩ [narratore] Sotto c'è una scritta storta: decima, quaranta d'argento.
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1208 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078014

## Turno 15

Azioni:
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_eliandro: «Lo tengo fermo col piede e chiedo: «Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e preme l'ultimo goblin contro la porta di ferro. Lo scudo sbatte sul legno, e il corpo si schiaccia tra la pietra e il metallo.
[narratore] Eliandro tiene il piede sul petto del goblin e fa la domanda a voce bassa: «Dov'è il ragazzo?»
[usa] nar_tonio_parla > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Il ragazzo tiene gli occhi bassi e parla piano.
    ⟨pre-scritta⟩ [narratore] Dice che la decima non è pagata. Alla prima neve, dice, il balivo si prende l'ovile.
    ⟨pre-scritta⟩ [narratore] Dice che l'argento della cripta era l'unico modo, e che sua madre non doveva saperlo.
[narratore] Il vento scende dalla cantina e porta giù la voce di Tonio, sottile e tremante.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 3, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2402 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077054

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16 — evento violazione

## Turno 16

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia, il tuo gesto verso Zirrà arriva a lei solo in silenzio.
[privato pg_livia] Zirrà ti guarda con gli occhi gialli e per un attimo sembra valutare il prezzo di una risposta. Poi sposta lo sguardo dietro di te, verso la porta di ferro.
[narratore] Nespola, tieni la mano sulla spalla fasciata. Eliandro, il quaderno resta sulla pietra accanto a te.
[invito] pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_nespola","pg_eliandro"]; anomalie: 4
- primo audio dalla chiusura della finestra: 3514 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064564

## Turno 17 — evento violazione

## Turno 17

Azioni:
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china sul quaderno accanto a Nespola e, in disparte, parla con lei sottovoce.
[privato pg_eliandro] Il quaderno è pieno di iscrizioni copiate dalla torre. Nell'ultima pagina, in fretta, c'è un nome: Ugo Faggioli, con una croce accanto.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1120 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062314

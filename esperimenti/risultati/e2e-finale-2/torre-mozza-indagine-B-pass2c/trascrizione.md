# Trascrizione torre-mozza-indagine-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-11T15:27:05.977Z · PG: pg_livia, pg_fulco, pg_eliandro

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
- pg_livia: «Berta, quando hai visto Tonio per l'ultima volta? E chi sapeva della chiave, oltre a te?»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia parla per prima, e Berta stringe la chiave al collo.
[usa] ber_cose_tonio > pg_livia
    ⟨pre-scritta⟩ [png_berta] Gli stivali buoni e il mantello. E il pane della settimana, tutto.
[narratore] Fulco e Eliandro restano in silenzio. Il vento scende dal crinale e porta fumo di carbonaia.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 1, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3299 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00035952

## Turno 2

Azioni:
- pg_livia: «Anch'io guardo la lavagna, con lo scudo appoggiato al muro per leggere meglio.»
- pg_fulco: «Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?»
- pg_eliandro: «Copio sul quaderno la scritta della lavagna, lettera per lettera.»

Narratore:

```text
[narratore] Livia si avvicina alla porta e allunga lo sguardo sulla lavagna. Le lettere sono storte, come scritte con la mano sinistra.
[usa] nar_lavagna > pg_livia
    ⟨pre-scritta⟩ [narratore] Le lettere sono grandi e tonde, tracciate piano con il carbone.
    ⟨pre-scritta⟩ [narratore] Ogni erre è rovesciata, con la pancia dalla parte sbagliata.
[narratore] Fulco resta fermo, gli occhi sulla chiave che Berta stringe al collo. Non riesce a dire se il ferro sia antico o di mano di nano.
[narratore] Eliandro copia la scritta lettera per lettera sul quaderno di pelle, senza alzare lo sguardo.
[narratore] Dal fienile i cani grattano la porta, più forte di prima.
[invito] pg_fulco, pg_eliandro
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1918 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00045782

## Turno 3

Azioni:
- pg_fulco: «Chiedo a Ugo, al cancello, se ha visto luci o gente salire verso la torre.»
- pg_livia (privata): «Mi avvicino a Berta, a bassa voce: «Sei in arretrato con la decima del balivo di Valdirame?»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si avvicina al cancello e chiede a Ugo se ha visto luci o gente salire verso la torre.
[usa] ugo_niente_visto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Ugo si gratta la barba bruciacchiata e guarda altrove.
    ⟨pre-scritta⟩ [png_ugo] Io non vedo niente. Guardo il fuoco, io.
[narratore] Livia si avvicina a Berta e le parla piano, a voce bassa, della decima del balivo. Berta non risponde subito: la mano le sale alla chiave.
[privato pg_livia] Berta non risponde alla domanda sulla decima. Stringe la chiave più forte, e il suo sguardo va verso il fienile.
[narratore] Eliandro resta fermo accanto al portico, il quaderno aperto sul braccio. Non dice nulla.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1612 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00051792

## Turno 4

Azioni:
- pg_eliandro (privata): «Chiedo a Berta, sottovoce, chi a Spinalba sapeva che la chiave era ancora in casa.»
- pg_fulco: «Conto le pecore nel recinto mentre aspetto. Sono tutte.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Fulco si avvicina al cancello dello stazzo e ne esamina il chiavistello, tra i pali scolpiti.
[usa] nar_recinto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Il cancello è intero, e il chiavistello è al suo posto.
    ⟨pre-scritta⟩ [narratore] Dentro, le pecore ci sono tutte, e ruminano tranquille.
[narratore] Eliandro si china accanto a Berta, sottovoce, e chiede chi a Spinalba sapeva che la chiave era ancora in casa.
[png_berta] Lo sapeva chi mi ha visto portarla al collo. Tutti. Non chiedermi di più.
[narratore] Berta abbassa lo sguardo sulle pecore che Fulco sta contando.
[narratore] Livia resta ferma sotto il portico, lo scudo appoggiato al muro, e aspetta.
[invito] pg_livia
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 4
- primo audio dalla chiusura della finestra: 2000 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00054922

## Turno 5

Azioni:
- pg_livia: «Ugo, tu che sei del posto: chi qui sa scrivere così bene?»
- pg_eliandro: «Dico agli altri: i goblin non sanno fare lettere con il carbone. Chi ha scritto questa lavagna sa scrivere, e non è un goblin.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo sguardo dalla lavagna e chiede a Ugo chi, qui, scrive così bene.
[png_ugo] Qui? Nessuno. Il maestro è morto due inverni fa, e la scuola l'ha chiusa il balivo.
[narratore] Ugo si gratta la barba e guarda il fumo che sale dalla carbonaia.
[narratore] Eliandro annuisce piano e segna la risposta sul quaderno. Dice agli altri che la scrittura è da chi ha studiato.
[narratore] Fulco osserva Ugo senza parlare, la mazza che batte piano contro la gamba.
[narratore] Dal fienile i cani smettono di grattare. Il silenzio dura un momento di troppo.
[invito] pg_livia,pg_fulco
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1323 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00057182

## Turno 6

Azioni:
- pg_fulco (privata): «Ugo, a parte, a bassa voce: «Dove passa la strada per la torre, e chi sale di notte?»»
- pg_livia: «Berta, dammi la chiave: ti riporto Tonio prima di mezzanotte. Ti do la mia parola di soldato.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si accosta al cancello e parla piano con Ugo, lontano dagli altri.
[narratore] Ugo non si volta subito. Poi sputa per terra, e guarda il sentiero dietro il fienile.
[png_ugo] Sul sentiero passa la strada della torre. Di notte salgono in tanti, e non chiedono il nome a nessuno.
[privato pg_fulco] Ugo parla piano, ma non ti guarda. Di notte il sentiero lo prendono in molti, e lui non ha chiesto nomi.
[narratore] Livia si fa avanti sotto il portico e tende la mano verso Berta.
[narratore] Berta stringe la chiave al collo con entrambe le mani, e scuote la testa.
[png_berta] Ti do la chiave quando mi riporti mio figlio. Né prima, né dopo.
[narratore] Berta non si muove. Dal fienile i cani tornano a grattare la porta.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 2307 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070922

## Turno 7 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 8

Azioni:
- pg_fulco: «Dico agli altri: sotto ogni torre dei nani c'è una postierla, un passaggio basso verso il bosco. Di solito sbuca in cantina.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco parla della postierla e Ugo, senza alzare gli occhi dalla pala, la guarda a lungo prima di rispondere.
[png_ugo] Postierla. Sotto la torre? Quaggiù c'è solo rovo e la mia carbonaia.
[narratore] Ugo tira la pala sul fianco della catasta, e la terra cade sul fuoco con un sibilo.
[narratore] Il fumo si alza più denso, e sopra gli alberi la torre resta nera contro il cielo.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 1
- primo audio dalla chiusura della finestra: 4241 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000617

## Turno 9

Azioni:
- pg_eliandro (privata): «Cerco segni incisi sul legno lungo il sentiero, senza farmi sentire.»
- pg_livia: «Scendo per prima, scudo avanti, e controllo che il sentiero sia libero.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia scende per prima, con lo scudo avanti. Il sentiero è libero per qualche passo, poi curva tra i rovi.
[umore] esplorazione_tesa
[narratore] Lungo il sentiero, sul legno dei paletti, Eliandro vede segni incisi che non riesce a leggere.
[privato pg_eliandro] Cerchi sul legno dei paletti, ma le incisioni sono graffi di rovo e di pioggia. Non trovi nulla che sembri una scritta.
[narratore] Livia controlla il terreno davanti a sé: la terra è smossa, con impronte di scarpe piccole e larghe.
[usa] nar_impronte > pg_livia
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Fulco resta indietro, la mazza in mano, e guarda la strada che sale verso la torre.
[invito] pg_livia,pg_fulco,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2013 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0007452

## Turno 10

Azioni:
- pg_fulco: «Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin, e la benedizione è tua.»»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco porta a Ugo il pane del tempio e gli chiede la strada. Ugo lo guarda a lungo, poi scuote la testa come chi non si fida del pane.
[png_ugo] Benedizione. Io voglio il carbone pagato, non le sue preghiere.
[narratore] Ugo rimette la pala a terra, e il fumo della carbonaia gli copre il viso.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2480 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000677

## Turno 11

Azioni:
- pg_livia: «Mi arrampico sul muretto di pietra del bosco per vedere la torre dall'alto.»
- pg_eliandro: «Anch'io salgo, tengo il quaderno sotto il mantello e mi aggrappo al ramo.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia e Eliandro restano sul muretto e sul ramo. Fulco rimane a terra, la mazza in mano, e guarda in su.
[narratore] Livia scivola sul muschio. Lo scudo batte contro la pietra, e lei ricade sul sentiero con un grugnito.
[narratore] Eliandro si aggrappa al ramo, il quaderno stretto sotto il mantello. Il ramo scricchiola, ma regge.
[narratore] Dal crinale arriva di nuovo il corno di capra, più vicino.
[invito] pg_livia,pg_eliandro,pg_fulco
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2766 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0007276

## Turno 12 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 13

Azioni:
- pg_fulco: «Tiro con la fionda al goblin più vicino.»
- pg_eliandro: «Lancio il dardo incantato contro il goblin che sta arrivando.»
- pg_livia: «Vedo i goblin davanti alla porta della torre. Sguaino la spada e carico.»

Narratore:

```text
[narratore] Livia parte per prima: lo scudo avanti, la spada in pugno, e carica dritta verso la porta della torre.
[narratore] Fulco scaglia la fionda: la pietra colpisce Zirrà al braccio, e lei stringe lo scudo.
[narratore] Eliandro lancia il dardo incantato: un lampo viola attraversa l'aria e colpisce Zirrà al fianco.
[narratore] Grosso si volta verso Livia, la mazza alzata, e le sbarra la strada.
[narratore] Livia riesce a colpire Grosso con un fendente, e lui cade a terra, fuori combattimento.
[narratore] Zirrà, con il fianco sanguinante, guarda i compagni caduti. Poi lascia cadere la spada corta e scappa verso il crinale.
[narratore] Dalla torre non arriva più nessun suono, solo il crepitio del fuoco e il fischio del vento.
[narratore] Tonio, sui gradini della cantina, alza gli occhi e vi guarda, con la corda ancora ai polsi. Che fate?
[invito] tutti
```

- righe pre-scritte 0, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1838 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00085036

## Turno 14

Azioni:
- pg_eliandro: «Mi tengo dietro la pietra e tiro il pugnale al primo che scappa.»
- pg_livia: «Colpisco il goblin con la spada lunga, scudo davanti.»
- pg_fulco: «Con la mazza sfondo la testa al goblin che si rialza.»

Narratore:

```text
[narratore] Eliandro si tiene dietro la pietra e tira il pugnale verso il goblin che scappa. Zirrà è già sparita oltre il crinale, e il pugnale batte sulla roccia vuota.
[narratore] Livia carica con lo scudo avanti e la spada lunga in pugno, ma davanti a lei non c'è più nessuno da colpire: la porta della torre è aperta, e dentro il fuoco crepita da solo.
[narratore] Fulco avanza con la mazza e colpisce il terreno dove un attimo prima c'era un goblin che si rialzava. Il colpo affonda nella terra smossa.
[narratore] Grosso giace davanti alla porta, immobile. Sui gradini della cantina Tonio ti guarda, con la corda ai polsi, e aspetta.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1952 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077596

## Turno 15

Azioni:
- pg_fulco: «Tiro ancora con la fionda al goblin che scappa verso la cantina.»
- pg_eliandro (privata): «Mentre gli altri combattono, cerco nella pietra nuova una porta segreta.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Fulco tira ancora con la fionda verso il goblin che scappa in cantina. La pietra sbatte contro il muro e il goblin sparisce dietro lo spigolo.
[narratore] Eliandro si muove lungo il muro nuovo, cerca con le dita la pietra e la fessura.
[usa] nar_conto > pg_fulco
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[privato pg_eliandro] Sotto le dita, nella pietra nuova, senti una fessura dritta, più fredda del resto. Potrebbe essere una porta.
[narratore] Dalla cantina arriva un colpo sordo, poi un grido corto, e la scala della cantina resta silenziosa.
[invito] pg_livia, pg_fulco, pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1279 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077976

## Turno 16

Azioni:
- pg_livia: «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo? Parla, o ti lascio qui.»»
- pg_fulco: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia spinge il goblin ferito contro il muro e gli preme lo scudo sul petto. Il goblin tossisce sangue e non dice niente.
[narratore] La presa di Livia scivola: il goblin si piega di lato e si sottrae, strisciando verso la cantina.
[narratore] Dalla scala della cantina arriva un gemito sottile, poi silenzio.
[narratore] Fulco resta fermo accanto alla porta, la mazza bassa, e guarda la scala.
[narratore] Eliandro non si muove. Sul suo quaderno resta il segno di una fessura nella pietra nuova.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 2667 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077016

## Turno 17

Azioni:
- pg_eliandro: «Anch'io gli stringo la spalla e chiedo: «Chi vi ha dato le lettere per scrivere?»»
- pg_fulco: «Cerco sul muro la pietra nuova che suona vuota, dove può esserci la postierla.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro stringe la spalla di Tonio e gli chiede chi gli ha dato le lettere per scrivere.
[narratore] Fulco cerca sul muro la pietra nuova che suona vuota.
[narratore] Il muro risponde con un tonfo cavo, sotto le dita di Fulco.
[usa] nar_mappa > pg_fulco
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda da vicino i segni a carbone sul muro» solo: muro⟩
[narratore] Tonio alza gli occhi verso Eliandro, poi verso la porta di ferro in fondo alla scala.
[invito] pg_eliandro,pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_eliandro","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2602 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074296

## Turno 18

Azioni:
- pg_livia: «Scendo dietro di lui, scudo in avanti, nel passaggio stretto.»
- pg_fulco: «Entro per la postierla con la mazza pronta, e chiamo Livia piano.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia scende dietro Tonio con lo scudo in avanti. Il passaggio è stretto e l'aria sa di terra umida.
[narratore] Fulco entra per la postierla con la mazza pronta e chiama Livia piano. Il sasso scivola via dalla scala e rimbalza sul gradino.
[narratore] Il rumore sale fino alla torre. Dall'alto arriva un fischio secco, e poi il passo svelto di qualcuno che si allontana.
[narratore] Eliandro resta fermo accanto alla fessura nella pietra, con la mano ancora sul muro.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2038 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076776

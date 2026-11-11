# Trascrizione torre-mozza-pressione-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-11T00:49:38.594Z · PG: pg_livia, pg_nespola, pg_eliandro

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
- pg_livia: «Berta, dammi la chiave e dimmi dov'è Tonio. Adesso, non domani!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza la voce e chiede la chiave adesso. Berta stringe il laccio al collo, e la chiave resta dov'è.
[png_berta] [fermezza] No. La chiave non si dà a un cortile, né a una soldata che grida. Aspetterò qui, sulla soglia.
[narratore] Berta si volta verso il fienile. I cani grattano la porta e guaiscono.
[usa] ber_cani > pg_livia
    ⟨pre-scritta⟩ [png_berta] Ieri notte non hanno fatto un verso. Stamattina erano nel fienile, con la sbarra calata da fuori.
[narratore] Nespola e Eliandro restano fermi. Il vento del crinale porta fumo di carbonaia dal sentiero.
[invito] pg_livia, pg_nespola, pg_eliandro
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2485 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00040837

## Turno 2

Azioni:
- pg_nespola: «Ugo! Mi devi tre argenti. Dimmi la strada per la torre o te li riscuoto davanti a tutti.»
- pg_eliandro: «Copio la lavagna in fretta. Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Nespola alza la voce e chiede a Ugo le tre monete. Il carbonaio si ferma con la pala a mezz'aria.
[usa] ugo_tre_monete > pg_nespola
    ⟨pre-scritta⟩ [png_ugo] Tre monete? Dopo, adesso c'è il ragazzo.
[narratore] Eliandro si china sulla lavagna. Le lettere sono ben tracciate, ma la luce sta calando e i segni si confondono sotto il gesso.
[narratore] Intanto Ugo carica il mulo con due sacchi di carbone e prende il sentiero verso il bosco, senza voltarsi.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3651 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00044337

## Turno 3

Azioni:
- pg_livia: «Anch'io, Ugo: parla, o la milizia ti trova in fretta.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza la lama dello scudo e stringe la mascella. Ugo la guarda dal basso, poi sputa di lato.
[png_ugo] Milizia? Qui la milizia non sale più, da quando il signore ha chiuso il bosco.
[narratore] Ugo sistema il carico sul mulo con gesti lenti e scuri, senza fretta.
[narratore] Nespola e Eliandro restano dove sono. Dal sentiero viene solo il fumo della carbonaia.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2887 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00044697

## Turno 4

Azioni:
- pg_eliandro: «Mi metto davanti alla porta, voglio vedere chi passa.»
- pg_nespola (privata): «Berta, piano: Tonio aveva monete vecchie con una torre sopra? Non dirlo a nessuno.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si mette davanti alla porta di casa. Dal portico si vede bene chi passa sul cortile.
[narratore] Nespola si avvicina a Berta, a voce bassa, e le chiede delle monete con la torre sopra.
[usa] ber_conti_fienile > pg_nespola
    ⟨pre-scritta⟩ [narratore] Berta si siede sulla paglia e abbassa la voce.
    ⟨pre-scritta⟩ [png_berta] La decima. Non l'ho pagata. Alla prima neve il balivo si prende l'ovile. Tonio lo sa.
[narratore] Livia resta ferma, con lo scudo appoggiato alla gamba, e guarda il sentiero.
[invito] pg_livia
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1304 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00046617

## Turno 5

Azioni:
- pg_livia (privata): «Mi avvicino a Berta: «Il balivo ti prende l'ovile alla prima neve, lo sai?» A bassa voce, così ha paura.»
- pg_nespola: «Vado a controllare il sentiero dietro l'ovile, subito.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia si china verso Berta e parla piano, quasi all'orecchio. La pastora non si scosta, ma stringe la chiave così forte che le nocche sbiancano.
[privato pg_livia] Berta non si muove. Ha capito che sai della decima, e lo sa anche suo figlio.
[narratore] Nespola si allontana dal portico e gira dietro lo stazzo, verso il sentiero. Il terreno è fangoso e di tracce di passi non ce ne sono molte.
[narratore] Nespola trova solo le impronte di Ugo, che portano verso la carbonaia, e niente altro.
[narratore] Eliandro resta sulla soglia, con il quaderno chiuso sotto il braccio, e guarda la lavagna.
[png_berta] Non mi chiedete altro, non stanotte. Tonio lo sa e basta.
[invito] pg_livia,pg_nespola,pg_eliandro
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1252 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00058117

## Turno 6

Azioni:
- pg_eliandro (privata): «Berta, qualcuno a Spinalba parla con i goblin?»
- pg_livia: «Berta, dammi la chiave: ti riporto tuo figlio prima di mezzanotte, parola di soldato.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro chiede a Berta se qualcuno a Spinalba parla con i goblin. Lei non risponde subito; guarda la lavagna sulla porta.
[png_berta] Qui si parla con tutti. Con i goblin no. Nessuno ci è mai salito, al di là del crinale.
[narratore] Livia tende la mano verso il laccio al collo di Berta.
[usa] ber_chiave > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta si sfila il laccio dal collo e vi mette in mano la chiave.
    ⟨pre-scritta⟩ [png_berta] È fredda, la chiave. Riportami lui, non l'argento.
[narratore] Berta indietreggia di un passo. Il pugno sulla chiave non si apre.
[png_berta] Tu prometti in fretta, soldata. Io ho imparato che le promesse costano care.
[narratore] Nespola, che aveva ancora in mente la decima, guarda Berta senza dire niente.
[invito] pg_livia, pg_eliandro
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 1427 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062447

## Turno 7 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 8

Azioni:
- pg_livia: «Dietro di lei, spada in mano, guardo i rami sopra la testa.»
- pg_nespola: «Corro avanti sul sentiero di Ugo, muovendomi piano tra le radici.»
- pg_eliandro (privata): «Seguo con la lanterna e cerco segni incisi sugli alberi.»

Narratore:

```text
[narratore] Livia avanza nel bosco, la spada in mano, e guarda in alto i rami che si muovono sopra di lei.
[narratore] Nespola corre avanti sul sentiero di Ugo, saltando le radici con passi piccoli e leggeri, ma il piede le scivola nel fango e si ferma di colpo.
[narratore] Eliandro segue con la lanterna, cercando incisioni sugli alberi. Sulla corteccia non trova nulla che somigli a un segno.
[narratore] Dal sentiero si sente solo il fumo della carbonaia che cala tra gli alberi.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: "tutti"; anomalie: 2
- primo audio dalla chiusura della finestra: 1748 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064695

## Turno 9

Azioni:
- pg_nespola: «Mi arrampico sulla roccia per vedere la torre prima degli altri.»
- pg_livia: «Anch'io salgo dietro di lei, scudo legato alla schiena.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola e Livia si mettono in marcia verso la roccia. Nespola stringe la fionda e scala la parete con mani sicure: in pochi attimi è in cima, con la torre sotto gli occhi.
[narratore] Livia la segue, lo scudo legato alla schiena, ma il piede scivola sulla pietra umida e le ginocchia battono contro il muro. Resta appesa a un appiglio, il fiato corto.
[narratore] Dalla cima Nespola vede il muro della torre e, sul lato nord, una finestra murata di fresco.
[narratore] Eliandro resta ai piedi della roccia, la lanterna accesa, e guarda in alto.
[invito] pg_nespola,pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2622 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00066095

## Turno 10 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 11

Azioni:
- pg_eliandro: «Lancio il dardo incantato sulla sentinella, subito!»
- pg_livia: «Vedo una sentinella goblin! Tiro con l'arco corto.»
- pg_nespola: «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta.»

Narratore:

```text
[narratore] Eliandro lancia il dardo incantato su Zirrà. Il colpo la trova al fianco, e il fuoco della torre si riflette sul suo scudo rosso.
[narratore] Livia tende l'arco corto. La freccia passa a un palmo dalla spalla della goblin e si conficca nel muro di pietra.
[narratore] Zirrà si volta di scatto, ferita, e batte la spada corta sullo scudo. Poi colpisce Eliandro: la lama gli sfiora il braccio, e il mago barcolla. Subito dopo Zirrà fa un passo verso Livia e la colpisce con la spada corta: la soldata incassa il colpo e stringe i denti.
[narratore] Grosso si alza dal fuoco con la mazza in mano e fissa i tre come un muro.
[zir_ragazzo_mio]
[invito] pg_nespola
[narratore] Nespola scende dalla roccia con un salto corto e scivola alle spalle della sentinella, la spada corta già levata.
[narratore] Nespola colpisce alle spalle la sentinella con la spada corta. La lama affonda tra le costole e la goblin cade senza un grido.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 1; invito: ["pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1522 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00153922

## Turno 12

Azioni:
- pg_nespola: «Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola alza la spada corta e attacca Zirrà alle spalle, ma la goblin si accorge del movimento e la lama passa a vuoto nel fumo.
[narratore] Zirrà ride corto, senza voltarsi, e si sposta verso il fuoco.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2217 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00066041

## Turno 13

Azioni:
- pg_livia: «Forzo la porta bassa della torre con la spalla. È quasi mezzanotte!»

Narratore:

```text
[narratore] Livia spinge con la spalla contro la porta bassa. Il legno scricchiola ma la sbarra interna regge.
[narratore] Dal fuoco, Grosso si alza e avanza con la mazza in mano. Un colpo secco le arriva sul fianco.
[narratore] Livia barcolla, con il fiato corto, e tiene lo scudo davanti a sé.
[narratore] Zirrà ride corto dalla scala e batte la spada corta sullo scudo.
[narratore] Eliandro, con il braccio ancora dolorante, si gira verso la porta e stringe il quaderno.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1102 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072721

## Turno 14

Azioni:
- pg_eliandro: «Tiro il pugnale al goblin che scappa verso le scale.»

Narratore:

```text
[narratore] Eliandro lancia il pugnale verso Zirrà, ma la lama fende l'aria sopra le scale e si conficca nel muro, lontano da lei.
[narratore] La goblin salta giù dai gradini e batte lo scudo con la spada corta, ridendo.
[png_zirra] Mancato! Sei lento, elfo, lento come un'ombra vecchia.
[narratore] Grosso si alza dal fuoco e avanza di due passi, la mazza che striscia sulla pietra.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1380 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00071131

## Turno 15

Azioni:
- pg_nespola (sospesa): «Colpisco il goblin alle spalle con la spada corta, e lo tengo fermo.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Il fuoco della torre crepita e il vento porta un fumo acre fin sopra il crinale. Nel cerchio dei muri nessuno si muove.
[usa] nar_piccone
    ⟨pre-scritta⟩ [narratore] Zirrà schiocca le dita.
    ⟨pre-scritta⟩ [narratore] Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.
[narratore] Dal fondo della cantina arriva un colpo sordo, come di ferro contro pietra, poi di nuovo silenzio.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1499 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062851

## Turno 16

Azioni:
- pg_livia (sospesa): «Ne tengo uno contro il muro: «Dov'è il ragazzo? Parla!»»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, il pugnale è rimasto nel muro e la lama vibra ancora. Grosso ti guarda con la mazza che pende dal fianco.
[png_grosso] Fame. Il mago rompe il cerchio e mi dà un pezzo di pane, forse.
[narratore] Grosso rosicchia l'osso e lo punta verso di te come un dito.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1186 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00069721

## Turno 17

Azioni:
- pg_eliandro: «Anch'io lo stringo e chiedo: «Chi vi ha dato le lettere per scrivere?»»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro stringe il quaderno e chiede chi ha portato le lettere. Il ragazzo abbassa lo sguardo sulla corda ancora intorno ai polsi.
[narratore] Zirrà si ferma a metà gesto, e per un attimo la sua risata si spegne.
[png_zirra] Lettere? Le ha scritte una mano più furba della mia. Non chiedere a me chi ha la penna.
[narratore] Il fuoco crepita, e Grosso alza la testa dall'osso.
[png_grosso] Penna. Sporca. Dammi pane e ti dico.
[narratore] Eliandro, Zirrà ti guarda con gli occhi gialli e batte di nuovo la spada sullo scudo. Che fai?
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1309 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075661

## Turno 18

Azioni:
- pg_nespola: «Anch'io scendo dietro di lei, scassino la porta in fondo.»

Narratore:

```text
[narratore] Nespola cerca di scassinare la porta in fondo, ma la serratura è dura e la chiave non entra al primo tentativo.
[narratore] Un colpo sordo arriva dal fondo della cantina. Il ragazzo, in silenzio, abbassa lo sguardo.
[narratore] Livia è ancora sul sentiero, lontana dalla porta: il tempo corre e la torre aspetta.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1326 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00067861

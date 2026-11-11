# Trascrizione torre-mozza-indagine-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-11T11:01:50.944Z · PG: pg_livia, pg_fulco, pg_eliandro

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
[narratore] Livia chiede a Berta quando ha visto Tonio per l'ultima volta, e chi sapeva della chiave.
[usa] ber_cose_tonio > pg_livia
    ⟨pre-scritta⟩ [png_berta] Gli stivali buoni e il mantello. E il pane della settimana, tutto.
[narratore] Fulco e Eliandro restano in silenzio, guardando la lavagna sulla porta.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 1, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2785 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00036302

## Turno 2

Azioni:
- pg_livia: «Anch'io guardo la lavagna, con lo scudo appoggiato al muro per leggere meglio.»
- pg_fulco: «Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?»
- pg_eliandro: «Copio sul quaderno la scritta della lavagna, lettera per lettera.»

Narratore:

```text
[narratore] Livia appoggia lo scudo al muro e legge la lavagna: lettere storte, tracciate con la mano di un uomo che scrive poco.
[usa] nar_lavagna > pg_livia
    ⟨pre-scritta⟩ [narratore] Le lettere sono grandi e tonde, tracciate piano con il carbone.
    ⟨pre-scritta⟩ [narratore] Ogni erre è rovesciata, con la pancia dalla parte sbagliata.
[narratore] Fulco resta a guardare la chiave al collo di Berta, ma non riesce a capire dal metallo se è antica o di mano nana. Berta la stringe ancora più forte.
[narratore] Eliandro copia la scritta lettera per lettera, senza fretta.
[narratore] Ci sono tre pali scolpiti ai lati del cancello dello stazzo, e il nome di una pecora è inciso su ciascuno.
[invito] pg_fulco, pg_eliandro
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1942 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00046412

## Turno 3

Azioni:
- pg_fulco: «Chiedo a Ugo, al cancello, se ha visto luci o gente salire verso la torre.»
- pg_livia (privata): «Mi avvicino a Berta, a bassa voce: «Sei in arretrato con la decima del balivo di Valdirame?»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco chiede a Ugo se ha visto luci o gente salire verso la torre.
[usa] ugo_niente_visto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Ugo si gratta la barba bruciacchiata e guarda altrove.
    ⟨pre-scritta⟩ [png_ugo] Io non vedo niente. Guardo il fuoco, io.
[narratore] Livia si avvicina a Berta, ma le parole le si smorzano in gola: Berta la guarda come se avesse sentito troppo.
[narratore] Eliandro resta fermo, con il quaderno aperto sul ginocchio.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1796 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00047092

## Turno 4

Azioni:
- pg_eliandro (privata): «Chiedo a Berta, sottovoce, chi a Spinalba sapeva che la chiave era ancora in casa.»
- pg_fulco: «Conto le pecore nel recinto mentre aspetto. Sono tutte.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Fulco chiede a Berta, o meglio conta: le pecore nel recinto sono tutte, e il cancello è chiuso col chiavistello.
[narratore] Fulco conta le pecore nel recinto mentre aspetta. Sono tutte.
[usa] nar_recinto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Il cancello è intero, e il chiavistello è al suo posto.
    ⟨pre-scritta⟩ [narratore] Dentro, le pecore ci sono tutte, e ruminano tranquille.
[narratore] Eliandro tace, il quaderno aperto. Chiedere sottovoce a Berta chi sapeva della chiave non riesce: lei lo guarda come se avesse sentito troppo, e Ugo alza la testa dal carbone.
[privato pg_eliandro] Non riesci a fare la domanda senza farti sentire: Ugo alza la testa dal carbone, e Berta chiude la bocca prima di rispondere.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1672 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00054902

## Turno 5

Azioni:
- pg_livia: «Ugo, tu che sei del posto: chi qui sa scrivere così bene?»
- pg_eliandro: «Dico agli altri: i goblin non sanno fare lettere con il carbone. Chi ha scritto questa lavagna sa scrivere, e non è un goblin.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Ugo chi, qui, sa scrivere così.
[png_ugo] Scrivere? Qui scrive solo il prete, quando c'è. E io conto le fascine, non le lettere.
[narratore] Eliandro dice agli altri che i goblin non sanno fare lettere con il carbone. Chi ha scritto la lavagna sa scrivere.
[narratore] Ugo si volta verso il sentiero del bosco, dove il mulo già scalpita con i sacchi di carbone.
[narratore] Il tentativo di Eliandro sulle lettere non regge: con questa luce le lettere si confondono, e intanto Ugo carica il mulo e si avvia verso il bosco.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1908 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00056922

## Turno 6

Azioni:
- pg_fulco (privata): «Ugo, a parte, a bassa voce: «Dove passa la strada per la torre, e chi sale di notte?»»
- pg_livia: «Berta, dammi la chiave: ti riporto Tonio prima di mezzanotte. Ti do la mia parola di soldato.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si china verso Ugo, abbassando la voce. Ugo non alza gli occhi dal mulo.
[narratore] Livia tende la mano verso la chiave. Berta non la stacca dal collo: si stringe nello scialle.
[narratore] Fulco fa la sua domanda piano, sotto il rumore dei sacchi.
[png_ugo] Sentiero? Quello non lo prende nessuno di notte. Solo la pecora smarrita, e il lupo dietro.
[narratore] Ugo tira il mulo per la cavezza e guarda il bosco, poi la torre.
[usa] ber_rapitore > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta indica il cancello con il mento, dove aspetta il mulo carico di carbone.
    ⟨pre-scritta⟩ [png_berta] Lui. Ha venduto ai goblin il sentiero, per vendetta.
[narratore] Berta non risponde subito. Poi si fa avanti, e la voce le trema solo sull'ultima parola.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 3
- primo audio dalla chiusura della finestra: 1696 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065872

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
[narratore] Fulco dice agli altri che sotto le torri dei nani c'è quasi sempre una postierla, un passaggio basso verso il bosco, che di solito sbuca in cantina.
[narratore] Ugo, dalla radura, alza la testa dal carbone. La pala resta a mezz'aria.
[png_ugo] Postierla. Nei nani è roba di nani. Qui, la torre, l'ha fatta un signore.
[narratore] Ugo tace un momento, poi riprende a tirare il mulo verso il sentiero dove il carbone aspetta.
[narratore] Livia e Eliandro restano all'imboccatura della radura, con il fumo che pizzica gli occhi.
[invito] tutti
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 3366 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006357

## Turno 9

Azioni:
- pg_eliandro (privata): «Cerco segni incisi sul legno lungo il sentiero, senza farmi sentire.»
- pg_livia: «Scendo per prima, scudo avanti, e controllo che il sentiero sia libero.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro cerca segni incisi sul legno lungo il sentiero, senza farsi sentire.
[narratore] Livia scende per prima, con lo scudo avanti, e controlla che il sentiero sia libero.
[privato pg_eliandro] Sul legno di un tronco trovi tre tagli fatti con la stessa lama, all'altezza di un ginocchio di goblin. Nessuno nota che li stai guardando.
[usa] nar_impronte > pg_livia
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Fulco resta indietro, in attesa, e nel fumo della carbonaia non si muove.
[invito] pg_livia,pg_eliandro,pg_fulco
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1781 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006937

## Turno 10

Azioni:
- pg_fulco: «Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin, e la benedizione è tua.»»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco porta a Ugo il pane del tempio e gli chiede la strada, con la benedizione in cambio.
[png_ugo] Benedizione. Il pane lo mangio, la benedizione la tiene il prete.
[narratore] Ugo spezza il pane con le mani nere di fuliggine, ma non indica nessun sentiero. Batte la pala per terra due volte e torna alla carbonaia.
[narratore] Dal crinale il corno di capra suona ancora, più vicino.
[invito] pg_livia, pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2318 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006899

## Turno 11

Azioni:
- pg_livia: «Mi arrampico sul muretto di pietra del bosco per vedere la torre dall'alto.»
- pg_eliandro: «Anch'io salgo, tengo il quaderno sotto il mantello e mi aggrappo al ramo.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia e Eliandro salgono dal muretto del bosco, e la torre si apre sopra gli alberi, nera sul cielo.
[narratore] Livia scivola sul muschio e la pietra le graffia il palmo; Eliandro si aggrappa al ramo, ma il quaderno gli scivola da sotto il mantello e cade nel fango.
[narratore] Dal crinale il corno di capra suona ancora, più vicino.
[invito] pg_livia,pg_eliandro,pg_fulco
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2735 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000715

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
[narratore] Fulco scocca la fionda, ma il sasso passa sopra la testa di Zirrà e batte contro la pietra del muro.
[narratore] Eliandro alza la mano e il dardo incantato parte, dritto e silenzioso, verso il goblin che avanza.
[narratore] Livia sguaina la spada e carica verso la porta. Zirrà ride e batte la spada corta sullo scudo.
[narratore] Zirrà fende l'aria con la spada corta, e la lama manca Fulco per un soffio.
[narratore] Grosso si alza di scatto, la mazza ferrata in pugno, e colpisce Livia di lato: la botta le lascia il braccio intorpidito, ma lei resta in piedi.
[narratore] Il dardo di Eliandro colpisce il goblin in pieno petto, e quello cade sui gradini con un rantolo.
[usa] zir_chiave_prima > pg_livia
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2331 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00082886

## Turno 14

Azioni:
- pg_eliandro: «Mi tengo dietro la pietra e tiro il pugnale al primo che scappa.»

Narratore:

```text
[narratore] Eliandro si tiene dietro la pietra e tira il pugnale al primo goblin che scappa. La lama vola, ma Zirrà si piega di lato e il pugnale si conficca nel fango.
[narratore] Zirrà ride corto e si rimette in piedi, senza una graffio.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2769 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065076

## Turno 15

Azioni:
- pg_fulco: «Tiro ancora con la fionda al goblin che scappa verso la cantina.»
- pg_livia (sospesa): «Colpisco il goblin con la spada lunga, scudo davanti.»

Narratore:

```text
[narratore] Fulco tira ancora con la fionda verso il goblin che scappa in cantina. Il sasso schiocca contro il muro, lontano dal bersaglio.
[narratore] Zirrà ride corto e sparisce oltre la scala, senza nemmeno voltarsi.
[usa] nar_conto > pg_fulco
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1505 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068656

## Turno 16

Azioni:
- pg_livia: «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo? Parla, o ti lascio qui.»»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia blocca il goblin contro il muro. Il goblin sputa, e non dice niente.
[narratore] Fulco resta fermo, la fionda in mano, con il sasso ancora in tasca.
[narratore] Eliandro segue con lo sguardo la mano di Zirrà, che si sta muovendo verso la spada corta.
[narratore] Grosso si alza dal fuoco con la mazza in mano. Il primo passo fa tremare le pietre.
[png_zirra] Ehi, che fretta. Il ragazzo è lì, vedi? Non è roba vostra, è roba mia.
[narratore] Il goblin davanti a Livia tira la testa indietro e sbatte il muro, ma non parla.
[narratore] Dalla cantina non arriva nessun suono, solo il respiro di Tonio, più forte di prima.
[invito] pg_livia,pg_eliandro,pg_fulco
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3506 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00081836

## Turno 17

Azioni:
- pg_eliandro: «Anch'io gli stringo la spalla e chiedo: «Chi vi ha dato le lettere per scrivere?»»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro stringe la spalla di Zirrà e le chiede chi ha insegnato a quei goblin a scrivere.
[narratore] Zirrà smette di ridere per un attimo, e lo guarda come si guarda un conto che non torna.
[png_zirra] Scrivere? Io scrivo prezzi. Il resto lo scrive il padrone.
[narratore] Grosso, alle spalle del fuoco, rosicchia l'osso e non dice nulla.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1748 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068176

## Turno 18

Azioni:
- pg_fulco: «Entro per la postierla con la mazza pronta, e chiamo Livia piano.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco entra per la postierla con la mazza pronta e chiama Livia piano.
[narratore] Il passaggio è basso e umido. Dal buio arriva un fruscio, poi niente.
[narratore] Zirrà, più in fondo alla cantina, si volta e ride corto. La spada corta colpisce Fulco di lato: due danni, e lui barcolla contro la parete.
[png_zirra] Piccolo nano, sei un bersaglio lento.
[narratore] Fulco resta in piedi, con il respiro corto e la mazza ancora stretta.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1952 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070616

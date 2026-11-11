# Trascrizione torre-mozza-indagine-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-11T14:23:28.318Z · PG: pg_livia, pg_fulco, pg_eliandro

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
[narratore] Fulco e Eliandro restano in disparte. Il vento scende dal crinale e porta fumo di carbonaia.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 1, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3853 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00036752

## Turno 2

Azioni:
- pg_livia: «Anch'io guardo la lavagna, con lo scudo appoggiato al muro per leggere meglio.»
- pg_fulco: «Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?»
- pg_eliandro: «Copio sul quaderno la scritta della lavagna, lettera per lettera.»

Narratore:

```text
[narratore] Livia guarda la lavagna da vicino, con lo scudo appoggiato al muro.
[usa] nar_lavagna > pg_livia
    ⟨pre-scritta⟩ [narratore] Le lettere sono grandi e tonde, tracciate piano con il carbone.
    ⟨pre-scritta⟩ [narratore] Ogni erre è rovesciata, con la pancia dalla parte sbagliata.
[narratore] Fulco guarda la chiave che Berta stringe nel pugno. Non riesce a dire di che lavoro sia.
[narratore] Eliandro copia sul quaderno la scritta della lavagna, lettera per lettera.
[privato pg_eliandro] Copi tutto senza sbagliare una lettera: la scritta è in lingua comune, ma l'ultima parola è in un alfabeto di rovine, quello delle torri di confine.
[narratore] Berta stringe più forte la chiave, e il vento porta di nuovo il fumo della carbonaia.
[invito] pg_fulco, pg_livia
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_fulco","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2106 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00047792

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
[narratore] Livia si accosta a Berta e le parla piano, a bassa voce, della decima.
[privato pg_livia] Berta esita, poi abbassa lo sguardo: la decima è in arretrato di due anni, e il balivo di Valdirame non ha mai mandato nessuno a chiedere.
[narratore] Eliandro resta in disparte, con il quaderno chiuso sotto il braccio. Il vento porta ancora fumo di carbonaia.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2013 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00051902

## Turno 4

Azioni:
- pg_eliandro (privata): «Chiedo a Berta, sottovoce, chi a Spinalba sapeva che la chiave era ancora in casa.»
- pg_fulco: «Conto le pecore nel recinto mentre aspetto. Sono tutte.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si china accanto a Berta e le chiede, sottovoce, chi sapeva che la chiave era ancora in casa.
[privato pg_eliandro] Berta stringe la chiave più forte e il suo sguardo corre al fienile, poi torna su di te. Non risponde subito: la tua domanda le ha fatto male, e lo capisci.
[narratore] Fulco conta le pecore nel recinto, una dopo l'altra, e le trova tutte. Il cancello dello stazzo cigola nel vento.
[usa] nar_recinto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Il cancello è intero, e il chiavistello è al suo posto.
    ⟨pre-scritta⟩ [narratore] Dentro, le pecore ci sono tutte, e ruminano tranquille.
[narratore] Livia resta in attesa, con lo scudo appoggiato al muro. Dal fienile i cani tornano a grattare la porta.
[invito] pg_livia, pg_eliandro
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2280 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00056492

## Turno 5

Azioni:
- pg_livia: «Ugo, tu che sei del posto: chi qui sa scrivere così bene?»
- pg_eliandro: «Dico agli altri: i goblin non sanno fare lettere con il carbone. Chi ha scritto questa lavagna sa scrivere, e non è un goblin.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Ugo chi, qui, sa scrivere così bene.
[png_ugo] Qui? Nessuno. Il prete scrive i morti, e basta.
[narratore] Eliandro dice agli altri che i goblin non sanno fare lettere con il carbone. Chi ha scritto la lavagna sa scrivere.
[narratore] Ugo guarda la lavagna, poi il suo mulo, e sputa di lato.
[narratore] Fulco resta fermo, e aspetta.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1508 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00053972

## Turno 6

Azioni:
- pg_fulco (privata): «Ugo, a parte, a bassa voce: «Dove passa la strada per la torre, e chi sale di notte?»»
- pg_livia: «Berta, dammi la chiave: ti riporto Tonio prima di mezzanotte. Ti do la mia parola di soldato.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si accosta a Ugo e abbassa la voce, così che nessun altro senta.
[narratore] Ugo lo guarda di traverso. Poi si volta verso il mulo, come se stesse per scaricare il carbone.
[png_ugo] Sentiero? Chi sale di notte non lo dice.
[narratore] Livia resta ferma, la mano sulla spalla di Berta, e aspetta che la pastora risponda.
[narratore] Berta non apre la mano dalla chiave. Lo sguardo passa da Livia al fienile, dove i cani grattano più forte.
[png_berta] Tu non mi chiedi la chiave, soldata. Mi chiedi se mi fido. Non mi fido di nessuno, adesso.
[narratore] Il vento scende dal crinale. Lontano, dalla torre, arriva un colpo di tamburo, poi silenzio.
[invito] pg_livia,pg_fulco
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco"]; anomalie: 3
- primo audio dalla chiusura della finestra: 2797 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00069292

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
[narratore] Fulco parla agli altri della postierla: un passaggio basso sotto ogni torre dei nani, che di solito sbuca in cantina.
[narratore] Ugo si ferma, la pala a mezz'aria, e fissa Fulco come se avesse detto una bestemmia.
[png_ugo] Postierla. Sotto la torre? Eh. Lei è nano, lo sa lei.
[narratore] Il fumo della carbonaia si piega verso il sentiero, e dalla torre arriva un colpo di corno, lungo e basso.
[narratore] Livia e Eliandro restano a guardare: il tempo di tirare il fiato e la radura è di nuovo calma.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3358 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006447

## Turno 9

Azioni:
- pg_eliandro (privata): «Cerco segni incisi sul legno lungo il sentiero, senza farmi sentire.»
- pg_livia: «Scendo per prima, scudo avanti, e controllo che il sentiero sia libero.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro cerca segni incisi sul legno lungo il sentiero, senza farsi sentire.
[privato pg_eliandro] Sul tronco di un faggio, sotto il muschio, trovi tre tacche e un segno a forma di torre mozza, fatto da poco.
[narratore] Livia scende per prima, con lo scudo avanti, e controlla che il sentiero sia libero.
[narratore] Il sentiero è fangoso e pieno di frasche rotte. Livia non riesce a vedere bene dove mettere i piedi.
[usa] nar_impronte > pg_livia
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Livia avanza, e sul sentiero la terra si smuove sotto il suo peso. Qualcosa scatta piano tra le frasche, poi silenzio.
[invito] pg_fulco,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 3032 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000745

## Turno 10

Azioni:
- pg_fulco: «Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin, e la benedizione è tua.»»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco porge a Ugo il pane del tempio e gli chiede la strada.
[png_ugo] Benedizione. Lei porta pane, io porto carbone. Il sentiero lo conosco io.
[narratore] Ugo mastica il pane in silenzio, poi sputa di lato e indica con la pala il sentiero che sale verso la torre. Il fumo della carbonaia si piega dalla sua parte.
[narratore] Dalla torre arriva un corno, lungo e basso.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3857 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0007057

## Turno 11

Azioni:
- pg_livia: «Mi arrampico sul muretto di pietra del bosco per vedere la torre dall'alto.»
- pg_eliandro: «Anch'io salgo, tengo il quaderno sotto il mantello e mi aggrappo al ramo.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia e Eliandro scalano il muretto di pietra. Livia si aggrappa, ma la pietra vecchia cede sotto il piede e lei scivola indietro, battendo la spalla contro il sasso.
[narratore] Eliandro tiene il quaderno sotto il mantello e allunga la mano verso il ramo. Il ramo si spezza con un crack secco, e lui perde la presa.
[narratore] Dal crinale scende un corno lungo e basso. La torre, sopra gli alberi, resta nera e muta.
[narratore] Ugo, dalla carbonaia, alza gli occhi verso di voi per un attimo, poi torna alla pala.
[invito] pg_livia,pg_eliandro,pg_fulco
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3628 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000767

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
[narratore] Fulco scocca la fionda verso Zirrà. Il sasso sibila sopra la testa della goblin e rimbalza sul muro di pietra.
[narratore] Zirrà ride corto e batte la spada sullo scudo. Poi si lancia di corsa verso Fulco, la lama corta che taglia l'aria.
[narratore] Zirrà colpisce Fulco di striscio, ma la cotta di maglia regge e il nano barcolla appena.
[narratore] Eliandro alza il quaderno, mormora la formula, e il dardo incantato parte dritto verso Zirrà.
[narratore] Il dardo la colpisce alla spalla con un lampo viola. Zirrà si piega indietro, ferita, ma resta in piedi.
[narratore] Livia sguaina la spada e carica verso la porta della torre. Grosso, già a terra, non si rialza più.
[narratore] Eliandro, cosa fai ora? Il dardo ha colpito, ma Zirrà ti guarda con gli occhi gialli fissi su di te.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3161 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00087846

## Turno 14

Azioni:
- pg_eliandro: «Mi tengo dietro la pietra e tiro il pugnale al primo che scappa.»

Narratore:

```text
[narratore] Eliandro si tiene dietro la pietra e tira il pugnale al primo goblin che scappa. La lama vola storta e manca il bersaglio, sbattendo contro il muro di pietra.
[narratore] Zirrà si volta con un ghigno, la spada corta già in mano, e carica verso Eliandro.
[narratore] La lama corta lo colpisce di striscio alla spalla. Eliandro sente il sangue scaldargli il braccio: ha due punti ferita rimasti.
[narratore] Grosso non si muove più accanto al fuoco. Il vento fischia nei buchi del muro.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 2
- primo audio dalla chiusura della finestra: 3131 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076386

## Turno 15

Azioni:
- pg_fulco: «Tiro ancora con la fionda al goblin che scappa verso la cantina.»
- pg_livia (sospesa): «Colpisco il goblin con la spada lunga, scudo davanti.»

Narratore:

```text
[narratore] Fulco tira la fionda verso il goblin che scappa, ma il sasso parte storto e si perde nel buio della cantina.
[narratore] Il goblin sparisce giù per la scala. Dalla cantina arriva un ringhio basso, poi nulla.
[narratore] Zirrà, dalla scala rotta, si volta a guardare Fulco e ride corto.
[narratore] Livia, cosa fai ora? Il goblin è sparito giù, e la porta di ferro è ancora chiusa.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2717 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075546

## Turno 16

Azioni:
- pg_livia: «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo? Parla, o ti lascio qui.»»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia afferra il goblin ferito per il collo e lo sbatte contro il muro. Il goblin ringhia, con il sangue che gli cola dal naso.
[narratore] Ma la presa scivola sul fango e il goblin si divincola, sgusciando via tra le gambe di Livia.
[narratore] Zirrà ride corto, dalla scala rotta.
[png_zirra] Ehi, orecchie a punta! Il vostro amico è cotto. Ma la chiave l'avete?
[narratore] Il goblin ferito corre verso la cantina e sparisce nel buio. Dal fondo della scala arriva un tonfo di porta.
[narratore] Fulco, cosa fai ora? Zirrà ti guarda, e la spada corta batte sullo scudo.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2311 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00081436

## Turno 17

Azioni:
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Zirrà ti guarda, poi batte la spada sullo scudo e ride corto.
[usa] zir_attesa
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[narratore] Eliandro, Zirrà punta la lama corta verso di te. Che fai?
[invito] pg_eliandro
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2092 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00071396

## Turno 18

Azioni:
- pg_eliandro (sospesa): «Anch'io gli stringo la spalla e chiedo: «Chi vi ha dato le lettere per scrivere?»»

Narratore:

```text
[narratore] Nel cerchio di muri il fuoco si abbassa da solo, e Grosso resta fermo accanto alle braci. Zirrà si alza dalla scala rotta e scende di un gradino, lenta.
[usa] nar_attesa_torre
    ⟨pre-scritta⟩ [narratore] Il fuoco si abbassa, e le ombre dei muri si allungano. In alto, da qualche parte, cade un sasso.
[narratore] Sul fondo della cantina, dietro la porta di ferro, qualcosa si muove piano.
[invito] tutti
```

- righe pre-scritte 1, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1457 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00066646

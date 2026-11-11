# Trascrizione torre-mozza-indagine-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-10T23:34:56.321Z · PG: pg_livia, pg_fulco, pg_eliandro

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
[narratore] Fulco e Eliandro restano in disparte, a guardare il portico e la lavagna.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 1, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 4010 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00036257

## Turno 2

Azioni:
- pg_livia: «Anch'io guardo la lavagna, con lo scudo appoggiato al muro per leggere meglio.»
- pg_fulco: «Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?»
- pg_eliandro: «Copio sul quaderno la scritta della lavagna, lettera per lettera.»

Narratore:

```text
[narratore] Livia chiede a Berta quando ha visto Tonio per l'ultima volta... Livia appoggia lo scudo al muro e legge la lavagna da vicino.
[usa] nar_lavagna > pg_livia
    ⟨pre-scritta⟩ [narratore] Le lettere sono grandi e tonde, tracciate piano con il carbone.
    ⟨pre-scritta⟩ [narratore] Ogni erre è rovesciata, con la pancia dalla parte sbagliata.
[narratore] Fulco tiene gli occhi sulla chiave di Berta, ma la luce del portico non basta a dirgli di che lavoro sia.
[narratore] Eliandro copia lettera per lettera la scritta della lavagna sul suo quaderno di pelle, senza alzare la testa.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 2263 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00043007

## Turno 3

Azioni:
- pg_fulco: «Chiedo a Ugo, al cancello, se ha visto luci o gente salire verso la torre.»
- pg_livia (privata): «Mi avvicino a Berta, a bassa voce: «Sei in arretrato con la decima del balivo di Valdirame?»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si volta verso il cancello e chiede a Ugo se ha visto luci o gente salire verso la torre.
[usa] ugo_niente_visto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Ugo si gratta la barba bruciacchiata e guarda altrove.
    ⟨pre-scritta⟩ [png_ugo] Io non vedo niente. Guardo il fuoco, io.
[narratore] Eliandro resta fermo, con il quaderno chiuso sotto il braccio, e osserva il sentiero dietro il fienile.
[narratore] Livia si accosta a Berta, parla piano. La donna la guarda e stringe la chiave più forte.
[privato pg_livia] Berta non risponde alla domanda sulla decima. Scuote la testa e dice che non dà la chiave a nessuno: aspetterà sulla soglia che le riportino il figlio.
[narratore] Berta si ritira sotto il portico, la chiave stretta nel pugno.
[invito] pg_eliandro, pg_fulco
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1833 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00052527

## Turno 4

Azioni:
- pg_eliandro (privata): «Chiedo a Berta, sottovoce, chi a Spinalba sapeva che la chiave era ancora in casa.»
- pg_fulco: «Conto le pecore nel recinto mentre aspetto. Sono tutte.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro si avvicina a Berta sotto il portico e le chiede sottovoce chi, a Spinalba, sapeva che la chiave era ancora in casa.
[privato pg_eliandro] Berta abbassa la voce, il pugno stretto sulla chiave: solo lei, il figlio e il vecchio prete sapevano. Poi guarda il fienile, come a controllare che nessuno la senta.
[narratore] Fulco conta le pecore nel recinto, una per una. Sono tutte, e le tiene d'occhio mentre fa il giro dello stazzo.
[narratore] Il cancello di legno è tenuto da un chiavistello nuovo, lucido. Accanto, sui pali, qualcuno ha inciso dei nomi con il coltello.
[usa] nar_recinto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Il cancello è intero, e il chiavistello è al suo posto.
    ⟨pre-scritta⟩ [narratore] Dentro, le pecore ci sono tutte, e ruminano tranquille.
[narratore] Dal cortile arriva il guaito dei cani, più forte di prima. Livia resta vicina a Berta, pronta a intervenire.
[invito] pg_livia, pg_fulco
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3223 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059127

## Turno 5

Azioni:
- pg_livia: «Ugo, tu che sei del posto: chi qui sa scrivere così bene?»
- pg_eliandro: «Dico agli altri: i goblin non sanno fare lettere con il carbone. Chi ha scritto questa lavagna sa scrivere, e non è un goblin.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Ugo chi, qui, saprebbe scrivere così bene.
[png_ugo] Qui? Nessuno. Il prete, forse. Ma lui non esce più dalla chiesa.
[narratore] Eliandro dice agli altri che i goblin non sanno fare lettere con il carbone, e che chi ha scritto la lavagna sa scrivere.
[narratore] Eliandro tenta di leggere le lettere della lavagna con il quaderno aperto. Con questa luce le erre si confondono, e mentre lui china la testa, Ugo carica il mulo e se ne va verso il bosco.
[narratore] Fulco resta fermo accanto al cancello, con la mazza appoggiata al palo.
[invito] pg_livia,pg_eliandro,pg_fulco
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1787 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00058677

## Turno 6

Azioni:
- pg_fulco (privata): «Ugo, a parte, a bassa voce: «Dove passa la strada per la torre, e chi sale di notte?»»
- pg_livia: «Berta, dammi la chiave: ti riporto Tonio prima di mezzanotte. Ti do la mia parola di soldato.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si avvicina ad Ugo, e a bassa voce gli chiede dove passa la strada per la torre e chi sale di notte.
[png_ugo] Lei parla piano, come chi ha qualcosa da nascondere. Il sentiero passa dietro la carbonaia. Di notte lo fanno i goblin, e io non lo faccio più.
[narratore] Ugo sputa per terra, e il suo sguardo scorre veloce verso il bosco.
[narratore] Livia tende la mano a Berta. Le dice che la torre aspetta la chiave, e che lei riporterà Tonio prima di mezzanotte, con la sua parola di soldato.
[usa] ber_soldata > pg_livia
    ⟨pre-scritta⟩ [png_berta] Ti ricordo, soldata. Dormivi con le pecore, senza lamenti.
[narratore] Berta non apre il pugno. Guarda il fienile, dove i cani grattano la porta, e stringe la chiave più forte.
[invito] pg_livia,pg_fulco
```

- righe pre-scritte 1, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2303 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00067867

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
[narratore] Fulco parla agli altri della postierla: sotto ogni torre dei nani c'è un passaggio basso verso il bosco, che di solito sbuca in cantina.
[narratore] Ugo, alla carbonaia, alza gli occhi dalla pala e fissa Fulco più a lungo del necessario.
[png_ugo] Un passaggio basso. Ecco cosa cercava quello stolto del prete.
[narratore] Il fumo della carbonaia si piega verso il bosco, e il mulo batte uno zoccolo sulla terra calda.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2969 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00063835

## Turno 9

Azioni:
- pg_eliandro (privata): «Cerco segni incisi sul legno lungo il sentiero, senza farmi sentire.»
- pg_livia: «Scendo per prima, scudo avanti, e controllo che il sentiero sia libero.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Eliandro cerca segni incisi sul legno lungo il sentiero, senza farsi sentire.
[privato pg_eliandro] Sul palo del sentiero, sotto la cortecchia, c'è un segno inciso di fresco: due tacche e un cerchio. Lo stesso simbolo che hai copiato dalla lavagna.
[narratore] Livia scende per prima, con lo scudo avanti, e controlla che il sentiero sia libero.
[narratore] Il sentiero è libero. Nel fango, poco più avanti, ci sono impronte: due, una piccola e una larga, e si fermano dove il sentiero piega verso la carbonaia.
[usa] nar_impronte > pg_livia
    ⟨pre-scritta⟩ [narratore] Nel fango ci sono impronte piccole, di piedi nudi con le unghie lunghe.
    ⟨pre-scritta⟩ [narratore] Accanto ci sono quelle di un paio di stivali da ragazzo, a passo lungo. A tratti gli stivali vanno davanti a tutti.
[narratore] Fulco, accanto al cancello, resta in attesa, la mazza appoggiata al palo.
[invito] pg_fulco, pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 3, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2719 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074435

## Turno 10

Azioni:
- pg_fulco: «Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin, e la benedizione è tua.»»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco porge a Ugo il pane del tempio e chiede la strada, come un patto.
[png_ugo] Benedizione. Il pane lo mangio. La strada no, quella non la do.
[narratore] Ugo spezza il pane con le mani nere di fuliggine, lo mastica senza guardare Fulco, e intanto la pala batte piano sulla terra calda della carbonaia.
[narratore] Più in là, il mulo scuote la testa e il fumo si piega verso il sentiero della torre.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2790 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072205

## Turno 11

Azioni:
- pg_livia: «Mi arrampico sul muretto di pietra del bosco per vedere la torre dall'alto.»
- pg_eliandro: «Anch'io salgo, tengo il quaderno sotto il mantello e mi aggrappo al ramo.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia si arrampica sul muretto di pietra e guarda la torre dall'alto: la luce della carbonaia le batte sul viso, e sopra il bosco la torre è una sagoma nera.
[narratore] La pietra del muretto è scivolosa, e la presa si sbriciola sotto le dita di Livia: non riesce a salire, e scivola giù, con un ginocchio contro il sasso.
[narratore] Eliandro segue Livia e prova ad aggrapparsi al ramo, tenendo il quaderno sotto il mantello, ma il ramo cede e lui ricade nel fango con il quaderno stretto contro il petto.
[narratore] Dal crinale arriva di nuovo il corno, più vicino, e il fumo della carbonaia si piega verso il sentiero.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3253 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078765

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
[narratore] Fulco scocca la fionda verso la goblin più vicina, ma il sasso passa sopra la sua spalla e rimbalza contro il muro.
[narratore] Zirrà ride corto, batte la spada sullo scudo e carica verso Fulco.
[narratore] La spada corta le manca il fianco di un soffio, e il nano si sposta di lato.
[narratore] Eliandro alza le dita macchiate d'inchiostro: il dardo incantato parte dritto e colpisce la goblin che avanza verso la porta.
[narratore] Grosso si alza dal fuoco con la mazza ferrata, pronto a far pagare il colpo a chi gli sta vicino.
[narratore] Livia sguaina la spada e carica i goblin davanti alla porta, lo scudo alzato e la lama tesa.
[narratore] Livia riceve il colpo di Grosso sullo scudo, che si incrina; le braccia le tremano, ma resta in piedi.
[narratore] Eliandro, è il tuo turno: che fai?
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1699 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00088131

## Turno 14

Azioni:
- pg_eliandro: «Mi tengo dietro la pietra e tiro il pugnale al primo che scappa.»

Narratore:

```text
[narratore] Eliandro si getta dietro la pietra e tira il pugnale al primo goblin che scappa. La lama vola sopra il fango e non trova il bersaglio: il goblin si butta sotto la scala rotta, sparendo nel buio.
[narratore] Grosso mena la mazza verso Livia, ma lei riesce a sollevare lo scudo. Il colpo non la raggiunge: la mazza rimbalza sul muro di pietra.
[narratore] Livia, il colpo di Grosso è passato accanto a te. Che fai?
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1926 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074421

## Turno 15

Azioni:
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Il colpo di Zirrà affonda sulla spalla di Eliandro: il pugnale graffia la pelle e lui barcolla all'indietro, con il quaderno che gli scivola dalle mani.
[narratore] Grosso si gira verso il fuoco, chiedendo con un grugnito se qualcuno ha ancora carne da dargli.
[narratore] Zirrà ride corto e abbassa lo scudo, aspettando che il prossimo si muova.
[narratore] Fulco, è il tuo turno: il sasso è ancora nella fionda e i goblin sono a due passi.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1445 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077771

## Turno 16

Azioni:
- pg_fulco (sospesa): «Tiro ancora con la fionda al goblin che scappa verso la cantina.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Dal fondo della torre arriva un sibilo basso. Una pietra cade dal muro crollato e rotola fino al fuoco.
[png_zirra] [ride corto, poi cambia voce] Allora? Stare lì a guardare non paga.
[narratore] Zirrà batte la spada sullo scudo, due volte, e aspetta.
[narratore] Grosso si alza dal fuoco, la mazza sulla spalla, e fa un passo verso la scala della cantina.
[invito] pg_livia,pg_fulco,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1081 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070871

## Turno 17

Azioni:
- pg_eliandro: «Anch'io gli stringo la spalla e chiedo: «Chi vi ha dato le lettere per scrivere?»»
- pg_livia (sospesa): «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo? Parla, o ti lascio qui.»»

Narratore:

```text
[narratore] Eliandro stringe la spalla di Grosso e chiede chi ha dato ai goblin le lettere per scrivere. La domanda resta sospesa nel fumo del fuoco.
[narratore] Grosso si volta lentamente, con la mazza ancora sulla spalla, e fissa Eliandro senza rispondere.
[narratore] Zirrà, dietro di lui, batte la spada sullo scudo e ride corto.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1335 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074911

## Turno 18

Azioni:
- pg_livia: «Scendo dietro di lui, scudo in avanti, nel passaggio stretto.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia scende dietro Zirrà, con lo scudo in avanti, nel passaggio stretto.
[narratore] Il colpo di Zirrà, a terra, Eliandro resta immobile sul fango. Il suo quaderno è rotolato contro la scala.
[narratore] Livia infila lo scudo tra il muro e il corpo della goblin: lo spazio è poco, ma lei lo tiene.
[narratore] Grosso si gira verso il passaggio, la mazza ancora sulla spalla.
[narratore] Fulco, il passaggio è libero solo per un momento. Che fai?
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1249 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077331

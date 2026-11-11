# Trascrizione torre-mozza-indagine-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-11T16:44:31.116Z · PG: pg_livia, pg_fulco, pg_eliandro

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
[narratore] Livia chiede a Berta quando ha visto Tonio l'ultima volta, e chi sapeva della chiave.
[usa] ber_cose_tonio > pg_livia
    ⟨pre-scritta⟩ [png_berta] Gli stivali buoni e il mantello. E il pane della settimana, tutto.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 1, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 5266 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00034352

## Turno 2

Azioni:
- pg_livia: «Anch'io guardo la lavagna, con lo scudo appoggiato al muro per leggere meglio.»
- pg_fulco: «Guardo la chiave che Berta stringe: è ferro vecchio, o lavoro di nano?»
- pg_eliandro: «Copio sul quaderno la scritta della lavagna, lettera per lettera.»

Narratore:

```text
[narratore] Livia appoggia lo scudo al muro e si china sulla lavagna. Le lettere sono storte, fatte in fretta.
[usa] nar_lavagna > pg_livia
    ⟨pre-scritta⟩ [narratore] Le lettere sono grandi e tonde, tracciate piano con il carbone.
    ⟨pre-scritta⟩ [narratore] Ogni erre è rovesciata, con la pancia dalla parte sbagliata.
[narratore] Fulco osserva la chiave che Berta stringe al collo. Il ferro è scuro, la lavorazione antica.
[narratore] Eliandro copia la scritta sul quaderno, lettera per lettera. Ma la luce della sera confonde i segni, e Ugo carica il mulo e si avvia verso il bosco.
[invito] pg_fulco,pg_eliandro
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_fulco","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2182 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00044242

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
[narratore] Livia si avvicina a Berta e le parla a bassa voce, sulla decima del balivo.
[privato pg_livia] Berta ti guarda e stringe la chiave più forte. Non risponde; la sua mascella si tende e lei gira la testa verso il fienile, come se avesse sentito un rumore.
[narratore] Eliandro resta fermo, con il quaderno aperto sul palmo, a guardare la luce che scende sul crinale.
[invito] pg_livia, pg_eliandro
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 9624 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00050162

## Turno 4

Azioni:
- pg_eliandro (privata): «Chiedo a Berta, sottovoce, chi a Spinalba sapeva che la chiave era ancora in casa.»
- pg_fulco: «Conto le pecore nel recinto mentre aspetto. Sono tutte.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Fulco conta le pecore nel recinto, una per una, mentre Ugo tira il mulo verso il sentiero.
[usa] nar_recinto > pg_fulco
    ⟨pre-scritta⟩ [narratore] Il cancello è intero, e il chiavistello è al suo posto.
    ⟨pre-scritta⟩ [narratore] Dentro, le pecore ci sono tutte, e ruminano tranquille.
[narratore] Eliandro si china verso Berta, a voce bassissima. La pastora non alza gli occhi dalla chiave.
[privato pg_eliandro] Berta ti risponde a fior di labbra: «Solo io e Tonio. E il castellano, un tempo.» Poi stringe la chiave più forte.
[narratore] Ugo si ferma sul sentiero del bosco e si volta a guardare il cortile.
[invito] pg_livia
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2852 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00052082

## Turno 5

Azioni:
- pg_livia: «Ugo, tu che sei del posto: chi qui sa scrivere così bene?»
- pg_eliandro: «Dico agli altri: i goblin non sanno fare lettere con il carbone. Chi ha scritto questa lavagna sa scrivere, e non è un goblin.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Ugo chi, a Spinalba, saprebbe scrivere in quel modo.
[png_ugo] [sbuffa, senza guardarla] Qui sanno leggere solo il prezzo del sale. Il prete, forse.
[narratore] Eliandro dice agli altri che i goblin non sanno fare lettere con il carbone, e che chi ha scritto la lavagna sa scrivere.
[narratore] Ugo si ferma a metà del sentiero e rimane a guardare il cortile, con il mulo che sbuffa dietro di lui.
[invito] pg_livia,pg_fulco
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1950 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00052942

## Turno 6

Azioni:
- pg_fulco (privata): «Ugo, a parte, a bassa voce: «Dove passa la strada per la torre, e chi sale di notte?»»
- pg_livia: «Berta, dammi la chiave: ti riporto Tonio prima di mezzanotte. Ti do la mia parola di soldato.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco si accosta a Ugo, a voce bassa, e gli chiede dove passa la strada per la torre e chi la sale di notte.
[png_ugo] Lei chiede troppo, per essere uno che ha appena messo piede qui.
[narratore] Ugo batte la pala per terra, due colpi secchi, e guarda il sentiero come se ci fosse qualcuno.
[narratore] Dalla soglia Berta stringe la chiave e dice che non la dà a nessuno: aspetterà qui che le riportino il figlio.
[png_berta] Le pecore non aspettano. Io sì.
[narratore] Livia resta sul cortile, con la mano sullo scudo, e la chiave pesa al collo di Berta come un'accusa.
[narratore] Eliandro ha il quaderno chiuso. Il vento del crinale porta fumo di carbonaia fin sotto il portico.
[invito] pg_livia, pg_fulco, pg_eliandro
```

- righe pre-scritte 0, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_fulco","pg_eliandro"]; anomalie: 3
- primo audio dalla chiusura della finestra: 3011 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065562

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
[narratore] Ugo si volta lentamente verso di lui, la pala ancora in mano, e per un momento il fumo della carbonaia lo avvolge.
[png_ugo] Passaggio, dici. Sotto la Mozza c'era una cantina, una volta. Ci si entrava dal bosco.
[narratore] Ugo sputa di lato, poi indica con la pala il sentiero che sale verso la torre, senza guardare nessuno.
[invito] pg_fulco,pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3144 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006195

## Turno 9

Azioni:
- pg_eliandro (privata): «Cerco segni incisi sul legno lungo il sentiero, senza farmi sentire.»
- pg_livia: «Scendo per prima, scudo avanti, e controllo che il sentiero sia libero.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia scende per prima, con lo scudo avanti. Il sentiero è libero, ma il fango è pieno di orme.
[usa] nar_impronte > pg_livia
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Eliandro cerca segni sul legno lungo il sentiero, senza farsi sentire.
[privato pg_eliandro] Sul tronco di un faggio c'è un segno inciso, tre tacche e un cerchio. Qualcuno l'ha fatto di recente, con una lama piccola.
[narratore] Fulco resta fermo ad aspettare. Dal bosco arriva il sibilo della carbonaia.
[invito] pg_livia,pg_eliandro,pg_fulco
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2264 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0007037

## Turno 10

Azioni:
- pg_fulco: «Porto a Ugo il pane del tempio e gli chiedo la strada: «Dimmi dove passano i goblin, e la benedizione è tua.»»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Fulco porge a Ugo il pane del tempio e gli chiede dove passano i goblin.
[png_ugo] Pane del tempio. Lei ha fame, o ha paura?
[narratore] Ugo lo afferra e lo spezza in due, senza guardare il sentiero. Non risponde alla domanda.
[narratore] Ugo mastica in silenzio, la pala appoggiata alla carbonaia, e il fumo gli sale sul viso.
[narratore] Dal crinale scende ancora il corno, e il mulo tira la corda con uno strattone.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2535 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0006708

## Turno 11

Azioni:
- pg_livia: «Mi arrampico sul muretto di pietra del bosco per vedere la torre dall'alto.»
- pg_eliandro: «Anch'io salgo, tengo il quaderno sotto il mantello e mi aggrappo al ramo.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia si arrampica sul muretto di pietra, con le mani che scivolano sul muschio umido. Il muro è liscio, e la pietra non le offre appigli. Scivola indietro e atterra sul fango con un tonfo secco.
[narratore] Eliandro tenta di salire dietro di lei, il quaderno sotto il mantello. Si aggrappa a un ramo basso, ma il legno è marcio e cede. Ricade giù, ansimando, il quaderno che gli scivola via dal petto.
[privato pg_livia] Il muretto è più alto di quanto sembrava. Dal basso non si vede nulla oltre le fronde, solo il bagliore rosso del fuoco della carbonaia.
[privato pg_eliandro] Il ramo si spezza sotto il tuo peso. Il quaderno finisce nel fango, ma le pagine sono ancora asciutte.
[narratore] Ugo, dalla radura, alza la testa dalla pala e scuote il capo, come se si aspettasse proprio questo.
[invito] pg_livia,pg_eliandro,pg_fulco
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2749 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00081

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
[narratore] Eliandro, il tuo dardo colpisce Zirrà a metà petto. Lei barcolla all'indietro, lo scudo rosso le scivola di mano.
[narratore] Fulco lascia partire la fionda: il sasso la prende alla spalla. Zirrà ringhia e si rimette in piedi.
[narratore] Lei risponde subito, con la spada corta. Il colpo passa a un palmo dal naso di Fulco.
[narratore] Livia avanza di un passo, sguainata. Grosso alza la mazza e la sua spalla copre tutto il cerchio di muri.
[narratore] Grosso ringhia, e la mazza cade di traverso. Livia la schiva di misura, con lo scudo.
[narratore] Sulla scala rotta, Zirrà ride corto e fa un cenno a Grosso. Poi si rivolge a voi: la chiave l'avete?
[png_zirra] Niente chiave, niente ragazzo. Scegliete voi.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1866 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00088826

## Turno 14

Azioni:
- pg_eliandro: «Mi tengo dietro la pietra e tiro il pugnale al primo che scappa.»

Narratore:

```text
[narratore] Eliandro resta dietro la pietra, il pugnale già in mano, e tira al primo goblin che scappa verso la scala.
[narratore] La lama vola corta: sbatte contro lo spigolo del muro e cade nel fango, ai piedi di Zirrà.
[narratore] Zirrà si volta, vede il pugnale, e ride corto.
[png_zirra] Mira da cieco, tu. Adesso è mio.
[narratore] Fulco, la fionda ancora tesa, vede il goblin fermarsi e guardarsi intorno, cercando chi l'ha tirato.
[invito] pg_fulco
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2175 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074406

## Turno 15

Azioni:
- pg_fulco: «Tiro ancora con la fionda al goblin che scappa verso la cantina.»
- pg_livia (sospesa): «Colpisco il goblin con la spada lunga, scudo davanti.»

Narratore:

```text
[narratore] Fulco tira ancora con la fionda, verso il goblin che scappa in direzione della cantina.
[narratore] Il sasso lo raggiunge alla schiena e il goblin cade in ginocchio sui gradini, con il respiro che gli si spezza.
[narratore] Zirrà, dal fuoco, si volta di scatto. Non dice niente: stringe la spada corta e fa due passi verso la scala.
[narratore] Grosso si alza e sbuffa, la mazza sulla spalla, e guarda il muro accanto alla porta di ferro come se avesse sentito un rumore.
[usa] nar_conto > pg_fulco
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[narratore] Zirrà sta sulla scala rotta, con la spada corta che le pende lungo il fianco. Sulla cantina il ragazzo alza gli occhi verso di voi. Che fate?
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1190 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00083366

## Turno 16

Azioni:
- pg_livia: «Blocco un goblin ferito contro il muro: «Dov'è il ragazzo? Parla, o ti lascio qui.»»
- pg_eliandro (sospesa): «Mentre gli altri combattono, cerco nella pietra nuova una porta segreta.»
- pg_fulco: (nessuna azione)

Narratore:

```text
[narratore] Livia blocca il goblin contro il muro e gli chiede dove sia il ragazzo. Il colpo di scudo arriva storto, e la presa scivola.
[narratore] Il goblin si divincola, ride e le sputa addosso.
[narratore] Grosso si volta verso di lei, la mazza che sale piano sopra la testa.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2351 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073866

## Turno 17

Azioni:
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, il pugnale di Zirrà è ancora nel fango e lei sta scendendo verso di te con la spada corta, mentre Grosso si volta verso Livia con la mazza alzata.
[narratore] Il tuo turno: cosa fai?
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1425 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073356

## Turno 18

Azioni:
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, il pugnale di Zirrà è ancora nel fango e lei scende verso di te con la spada corta. Grosso guarda Livia con la mazza alzata.
[png_zirra] Ehi, mezza misura! Quel coltello lo voglio indietro, con i denti.
[narratore] Fulco, la fionda ancora tesa, vede Grosso fare un passo avanti, lento come una frana.
[invito] pg_eliandro,pg_livia,pg_fulco
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_eliandro","pg_livia","pg_fulco"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1218 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00069606

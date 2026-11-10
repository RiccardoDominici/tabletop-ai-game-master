# Trascrizione nozze-neve-privato-B

Campagna: nozze-neve · modalità: repertorio · sessione 2026-11-09T20:41:21.282Z · PG: pg_vanda, pg_livia, pg_remo

Righe dopo `[usa] <id>`: battuta pre-scritta uscita (marcata `⟨pre-scritta⟩`). Le altre righe sono improvvisate dal modello.

## Turno 0 — apertura (scena_casera) (testo fisso della scena)

```text
[narratore] Stamattina su Fontanive è caduta la prima neve dell'anno.
[narratore] Per usanza Agnese Bonfanti e Tonio Morlacchi si sposano oggi al Sasso, prima del tramonto.
[narratore] A mezzogiorno, durante la festa, è sparito l'anello della nonna della sposa.
[narratore] Nella casera dei Bonfanti una riga di forme di formaggio divide la sala in due.
[narratore] A sinistra la nonna Adelina stringe una scatolina vuota; a destra Ettore, il nonno dello sposo, batte il bastone.
[narratore] Senza anello niente benedizione, e il sole non aspetta: chi si muove per primo?
```

## Turno 1

Azioni:
- pg_vanda: «guardo la sala: chi si avvicina alla riga delle forme, e chi resta lontano dalla scatolina?»
- pg_livia: «adelina, si sta bene così con la scatolina vuota in mano?»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Vanda guarda la sala. Chi si avvicina alla riga delle forme resta alla luce del camino; chi sta lontano dalla scatolina tiene gli occhi sulle mani di Adelina.
[narratore] Vanda, la riga di forme divide la sala in due: da una parte i Bonfanti, dall'altra i Morlacchi.
[narratore] Livia si avvicina ad Adelina. La vecchia stringe la scatolina vuota e non alza lo sguardo.
[png_adelina] Si sta bene, forestiera. Il formaggio buono vuole tempo, e così anche le brutte storie.
[usa] nar_scatolina > pg_vanda
    ⟨pre-scritta⟩ [narratore] Dentro, il velluto rosso conserva ancora l'impronta tonda dell'anello.
    ⟨pre-scritta⟩ [narratore] Accanto c'è una macchia d'inchiostro fresco, piccola come un polpastrello.
    ⟨pre-scritta⟩ [narratore] Nella cerniera è rimasto preso un capello rosso, lungo.
[usa] ade_scatolina > pg_livia
    ⟨pre-scritta⟩ [narratore] Adelina vi toglie la scatolina di mano, svelta come una gatta, e la tiene aperta.
    ⟨pre-scritta⟩ [png_adelina] Guardare sì, toccare no. È roba di casa.
[invito] pg_vanda,pg_livia
```

- righe pre-scritte 5, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2374 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 283 ms); costo $0.00047439

## Turno 2

Azioni:
- pg_remo (privata): «gaspare, a voce bassa: i venti fiorini della caparra per il prato alto li hai ancora in tasca?»
- pg_vanda: (nessuna azione)
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Remo Ciuffo si avvicina alla tavolata di Gaspare e abbassa la voce per fargli la domanda sui venti fiorini della caparra.
[privato pg_remo] Gaspare tiene la mano sulla tasca del panciotto mentre risponde, e la sua frase esita un istante prima di dire «certo». Tra le carte del panciotto spuntano i bordi di una ricevuta piegata: venti fiorini, timbrati dal notaio di Pontebruno.
[narratore] Livia resta accanto ad Adelina, che ancora tiene aperta la scatolina come una prova.
[narratore] Vanda, il camino scalda la riga delle forme, e dall'altra parte la sala si fa più rumorosa.
[invito] pg_vanda,pg_livia
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_vanda","pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 4277 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00050789

## Turno 3

Azioni:
- pg_vanda (privata): «ettore, stamattina sei salito al sasso da solo con la lanterna? ti hanno visto tornare con gli occhi rossi: dimmi perché»
- pg_remo: (nessuna azione)
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Vanda, Ettore ha il bastone piantato per terra e non ti guarda: ha sentito la tua domanda e sta facendo finta di no.
[png_ettore] Eh? Parlate forte, che l'orecchio buono è dall'altra parte.
[narratore] Ettore batte il bastone due volte sul pavimento di legno, e dalla tavolata dei Morlacchi qualcuno ride piano.
[usa] nar_lite_1
    ⟨pre-scritta⟩ [narratore] Dal lato dei Morlacchi qualcuno batte il bicchiere sul tavolo, tre volte.
[narratore] Livia, Adelina non ha ancora chiuso la scatolina: la tiene aperta, come se aspettasse che qualcuno guardi dentro di nuovo.
[invito] pg_vanda,pg_livia
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3259 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00053039

## Turno 4 — cambio di scena scena_casera → scena_casa_bonfanti (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] A casa Bonfanti la scala scricchiola, e dalla stalla sale odore di fieno.
[narratore] In camera la sposa vi guarda dallo specchio, muta, e Zelia le appunta il velo con gli spilli.
[narratore] Dietro di voi entra lo zio Gaspare, scuotendo la neve dal panciotto: da dove cominciate?
```

## Turno 5

Azioni:
- pg_livia (privata): «zelia, portami in soffitta: voglio vedere le lettere che la nonna ha ricevuto, quelle firmate con la E»
- pg_vanda: (nessuna azione)
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Zelia di salire in soffitta. La ragazza stringe il quaderno, poi annuisce piano.
[narratore] Livia, Zelia ti precede sulla scala a pioli, con lo spago del quaderno che strascica.
[privato pg_livia] Le lettere sono in una cassapanca di noce, sotto un corredo di merletti; la firma «E» è sulla prima, scritta con inchiostro ancora scuro.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3365 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 208 ms); costo $0.00053913

## Turno 6

Azioni:
- pg_remo: «sfilo la chiave del cassetto dalla tasca di gaspare mentre tutti guardano la festa»
- pg_vanda: (nessuna azione)
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Remo Ciuffo, la mano scivola nella tasca di Gaspare mentre lui guarda la festa, e la chiave del cassetto esce senza un rumore.
[usa] nar_scrittoio_cassetto > pg_remo
    ⟨pre-scritta⟩ [narratore] Nel cassetto c'è odore di inchiostro vecchio, e un libro dei conti.
    ⟨pre-scritta⟩ [narratore] Sotto il libro c'è un contratto con Sior Bortolo, mercante di Pontebruno.
    ⟨pre-scritta⟩ [narratore] Cinque estati di pascolo al Prato Alto, venti fiorini di caparra già pagati. Da firmare dopo il tramonto.
[narratore] Vanda, Ettore ha il bastone piantato per terra e ti guarda di traverso: vuole sapere cosa fai con quella faccia.
[narratore] Livia, Zelia scende due gradini e si ferma, col quaderno stretto al petto, aspettando che tu salga.
[usa] nar_sole_1
    ⟨pre-scritta⟩ [narratore] La neve torna a cadere fitta, a fiocchi grossi come piume.
    ⟨pre-scritta⟩ [narratore] Fuori dalle finestre il vicolo diventa bianco, e i rumori si fanno piccoli.
[narratore] Il primo segno arriva dal Sasso: il corno suona una volta, lungo e basso, e la sala trattiene il fiato.
[invito] pg_vanda,pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_zio_1

```text
⟨pre-scritta⟩ [narratore] Dalla cucina arriva un rumore di cassetti aperti e richiusi.
```

- righe pre-scritte 6, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3699 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00063113

## Turno 7

Azioni:
- pg_vanda: «anch'io: controllo le tasche di gaspare insieme a remo, senza farmi vedere»
- pg_remo: (nessuna azione)
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Vanda, la mano scivola nella tasca di Gaspare insieme a quella di Remo, e il panciotto di velluto verde non si accorge di nulla. Dentro trovi una ricevuta piegata: venti fiorini, timbrati dal notaio di Pontebruno.
[narratore] Gaspare si gira di scatto, ma guarda solo la festa. Scuote la testa, come chi ha perso il filo di un conto.
[narratore] Remo, il cassetto è ancora aperto alle tue spalle, e Zelia lo guarda dalla scala con gli occhi spalancati.
[usa] gas_chi_cera > pg_remo
    ⟨pre-scritta⟩ [narratore] Gaspare si toglie gli occhiali e li pulisce sul panciotto.
    ⟨pre-scritta⟩ [png_gaspare] Ho visto il garzone dei Morlacchi girare intorno al tavolo alto. Lo dico con dispiacere, si capisce.
[narratore] Livia, Zelia scende ancora un gradino e si ferma di nuovo, stringendo il quaderno. Non dice nulla.
[invito] pg_vanda, pg_remo, pg_livia
```

- righe pre-scritte 2, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_vanda","pg_remo","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3539 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068063

## Turno 8

Azioni:
- pg_livia (privata): «zelia, chi è la E che scriveva alla nonna? se me lo dici ti copro io davanti a tutti»
- pg_vanda: (nessuna azione)
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Livia, Zelia ti guarda dalla scala, con il quaderno stretto al petto. Lo spago le scivola tra le dita.
[narratore] Livia chiede chi era la E che scriveva alla nonna. Zelia abbassa gli occhi sulle pagine.
[narratore] Zelia, la voce di Livia è bassa e tesa. Tu che fai?
[invito] pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_zio_2

```text
⟨pre-scritta⟩ [narratore] Lo zio Gaspare sale la scala, piano, e bussa alla porta di Zelia.
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: 3628 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00066413

## Turno 9

Azioni:
- pg_remo (privata): «porto le carte a gaspare e gli chiedo di firmare adesso: il padrone ha detto solo se le nozze saltano»
- pg_vanda: (nessuna azione)
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Remo Ciuffo, le carte di Sior Bortolo passano dalla tua borsa alla mano di Gaspare, sotto la luce del camino.
[narratore] Gaspare scorre il contratto con gli occhiali sul naso, poi alza lo sguardo.
[png_gaspare] Cinque estati di pascolo, venti fiorini già versati. Un contratto è un contratto, con rispetto parlando. Ma firmarlo adesso, con la festa in corso?
[narratore] Nella cucina il cassetto rimasto aperto lascia scivolare un rumore di monete.
[narratore] Vanda e Livia, Ettore si volta verso la vostra parte della sala e batte il bastone due volte.
[invito] pg_remo,pg_vanda,pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_remo","pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3475 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073853

## Turno 10

Azioni:
- pg_vanda: «mi metto tra ettore e lo zio gaspare e tengo fermo il bastone di ettore con tutta la forza»
- pg_remo: (nessuna azione)
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Vanda, con le spalle ti metti tra Ettore e Gaspare, e il bastone di nocciolo si ferma nella tua stretta. Il vecchio non tira, ma non lo molla.
[narratore] Ettore ti guarda da sotto la piuma del cappello, e batte il piede una volta sola.
[png_ettore] Forte la presa, nipote di nessuno. Eh? Ho sentito, ho sentito.
[narratore] Gaspare si rimette gli occhiali con un gesto stretto e si volta verso la festa, come se tu non esistessi.
[narratore] Livia, Adelina non ha ancora richiuso la scatolina: la tiene aperta in mano, e il suo sguardo passa da te alla scala, dove Zelia aspetta.
[narratore] Il corno del Sasso suona di nuovo, lungo e basso: il secondo segno del tramonto.
[usa] gas_dote
    ⟨pre-scritta⟩ [narratore] Gaspare si toglie gli occhiali e li pulisce sul panciotto.
    ⟨pre-scritta⟩ [png_gaspare] Il Prato Alto è la dote di Agnese. Io ne sono felicissimo, si capisce.
[invito] pg_vanda,pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_zio_3

```text
⟨pre-scritta⟩ [narratore] Dalla stalla arriva un muggito lungo, e una porta che cigola.
```

- righe pre-scritte 3, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_vanda","pg_livia"]; anomalie: 3
- primo audio dalla chiusura della finestra: 3644 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00080113

## Turno 11

Azioni:
- pg_livia: «ad alta voce: chi ha visto la porta di dietro della cantina aperta a mezzogiorno?»
- pg_vanda: (nessuna azione)
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Livia alza la voce nella sala, e la domanda sulla porta della cantina attraversa le forme di formaggio.
[narratore] Gaspare posa la forchetta, piano, come chi deve fare due conti in fretta.
[narratore] Zelia, nella scala, stringe il quaderno più forte.
[usa] gas_chi_cera > pg_livia
    ⟨pre-scritta, variante 1⟩ [narratore] Gaspare si toglie gli occhiali, e li pulisce sul panciotto, piano.
    ⟨pre-scritta, variante 1⟩ [png_gaspare] Il garzone dei Morlacchi, gliel'ho detto. Con dispiacere.
[narratore] Vanda, Ettore ha ancora il bastone piantato e ti guarda dritto, come se aspettasse la tua mossa.
[narratore] Remo, la chiave di ottone è ancora nella tua tasca, e il cassetto in cucina scricchiola.
[invito] pg_vanda,pg_remo
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3596 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00079603

## Turno 12 — cambio di scena scena_casa_bonfanti → scena_sasso (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] Al Sasso delle Promesse il larice è carico di neve, e due lanterne fumano nel freddo.
[narratore] Il paese si stringe a semicerchio, Bonfanti di qua e Morlacchi di là, e il Custode apre il Libro.
[narratore] Il sole scende verso il passo: chi parla per primo?
```

## Turno 13

Azioni:
- pg_vanda (privata): «bastiano, sei qui al sasso con me: a mezzogiorno eri nella stalla a ferrare la mula gigia, vero?»
- pg_remo: (nessuna azione)
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Vanda, provi a chiedere a Bastiano con voce ferma, mentre gli altri guardano il Sasso.
[narratore] Bastiano sta alle tue spalle, con le mani nei guanti di pelle, e la neve gli sale fino alle caviglie.
[narratore] Il tuo tentativo di farlo parlare non riesce: Gaspare, dalla folla, si volta di colpo e ti fissa.
[png_gaspare] Ecco, il garzone dei Morlacchi. Lo vede, signora? Con dispiacere, si capisce.
[narratore] Ettore batte il bastone due volte sulla neve, e il rumore arriva fino alla cresta.
[narratore] Il primo segno è passato: il corno del Sasso suona, lungo e basso, la sesta volta di oggi.
[invito] pg_remo,pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_remo","pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3709 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 193 ms); costo $0.00081204

## Turno 14

Azioni:
- pg_remo: «sul sasso, prima del tramonto, porto le carte a gaspare e gli chiedo di firmare davanti al paese»
- pg_livia: «adelina, l'anello: lo dici tu al paese, o lo dico io?»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Remo, porti le carte a Gaspare davanti al paese, con il sole che scende sul passo. Ogni occhio della folla si gira verso di voi.
[narratore] Gaspare scorre il contratto, si sistema gli occhiali, poi annuisce con un sorriso stretto.
[png_gaspare] Per il pascolo e per la dote, firmo volentieri. Lo vede il paese, questo, con rispetto parlando.
[narratore] Gaspare firma, e la penna scricchiola sul foglio. Il Custode alza gli occhi dal Libro.
[narratore] Livia, Adelina non ti guarda. Stringe la scatolina vuota e sposta lo sguardo verso il Sasso, senza rispondere.
[narratore] Il sole tocca la cresta del passo, e il rosso scivola sulla neve.
[invito] pg_remo,pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_7

```text
⟨pre-scritta⟩ [narratore] Il corno chiama ancora, e l'ultima luce lascia i tetti del paese.
⟨pre-scritta⟩ [narratore] Sulla neve le ombre sono lunghe e blu, e fa più freddo.
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_remo","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2379 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 223 ms); costo $0.00086824

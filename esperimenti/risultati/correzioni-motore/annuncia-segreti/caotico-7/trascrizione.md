# Trascrizione nozze-neve-caotico-B

Campagna: nozze-neve · modalità: repertorio · sessione 2026-11-10T11:51:52.136Z · PG: pg_nando, pg_gunda, pg_remo, pg_vanda

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
- pg_nando: «ok la fisarmonica la tiro fuori io, si balla!! gaspare dammi la mezza paga adesso»
- pg_remo: «adelina la scatolina vuota la peso a occhio, varra due fiorini»
- pg_gunda: «ferma tutti, mani dove si vedono, io sorrido e basta»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Nando tira fuori la fisarmonica e chiede a Gaspare la mezza paga, adesso.
[narratore] Remo pesa la scatolina di noce nel palmo, a occhio: due fiorini, forse.
[narratore] Gunda alza le mani, sorride, e si mette in mezzo alla riga di forme.
[usa] nar_polka > pg_nando
    ⟨pre-scritta⟩ [narratore] La musica parte storta, poi si raddrizza alla seconda strofa.
    ⟨pre-scritta⟩ [narratore] Un Morlacchi scavalca le forme e fa girare una comare dei Bonfanti.
    ⟨pre-scritta⟩ [narratore] Per un momento ridono tutte e due le tavolate. Il vecchio Ettore batte il tempo col bastone.
[usa] nar_scatolina > pg_remo
    ⟨pre-scritta⟩ [narratore] Dentro, il velluto rosso conserva ancora l'impronta tonda dell'anello.
    ⟨pre-scritta⟩ [narratore] Accanto c'è una macchia d'inchiostro fresco, piccola come un polpastrello.
    ⟨pre-scritta⟩ [narratore] Nella cerniera è rimasto preso un capello rosso, lungo.
[narratore] Gunda, con le mani alzate, resta in piedi tra le due tavolate. Nessuno la scavalca.
[invito] pg_vanda, pg_gunda
```

- righe pre-scritte 6, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2524 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00047195

## Turno 2

Azioni:
- pg_vanda: «ahah remo non rubare alla festa, ti metto a fare il palo»
- pg_gunda: «quei due si guardano storto, mi metto in mezzo facendo la faccia della colomba»
- pg_nando: «ettore col bastone, canzone per te: il vecchio batte il legno, ta ta ta, ballate!»
- pg_remo: (nessuna azione)

Narratore:

```text
[narratore] Vanda ride e prende Remo per il giubbotto, lo trascina verso la porta del vicolo.
[narratore] Vanda si mette in piedi accanto alla porta di dietro, braccia incrociate, a fare il palo.
[narratore] Gunda fa la faccia della colomba, un po' storta, e si pianta tra Ettore e Gaspare.
[narratore] Ettore batte il bastone due volte, poi guarda la fisarmonica di Nando con un occhio solo.
[narratore] Nando attacca una canzone per Ettore: il vecchio batte il legno, ta ta ta, e la sala intera batte le mani.
[png_ettore] Eh? Parlate dall'orecchio buono, che l'altro sento solo i Bonfanti.
[usa] ett_giacca_appesa > pg_nando
    ⟨pre-scritta⟩ [narratore] Ettore si toglie la giacca, la appende alla panca e si rimbocca le maniche.
    ⟨pre-scritta⟩ [png_ettore] Vediamo quanto vali. Piano, che ho ottant'anni.
[invito] pg_remo, pg_gunda
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3356 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00055065

## Turno 3

Azioni:
- pg_remo: «vanda scommetto un formaggio che il vento non c'entra niente, ahah»
- pg_gunda: «ettore ha l'aria di uno che ha perso la scatola e la dignita, lo dico a voce alta»
- pg_nando: «suoniamo la marcia dei muli, Gigia balla anche lei»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Remo, il formaggio non si scommette sul vento. Vanda ride, ma tiene la porta di dietro.
[narratore] Gunda si piazza tra Ettore e Gaspare, mani aperte, la faccia della colomba.
[narratore] Ettore si ferma con il bastone a mezz'aria e la guarda da sotto la piuma.
[png_ettore] Ah, sì? Ettore non ha perso niente. Gaspare, dillo a lei che hai perso la scatola.
[narratore] La musica di Nando parte con i passi dei muli: ta-ta, ta-ta, e in fondo alla sala qualcuno batte il piede.
[narratore] Una mula di pezza, cucita sul gilè di Nando, sembra muovere la testa al ritmo.
[narratore] Dal camino arriva una risata lunga. Tilde sonnecchia ancora, ma batte un dito sul bracciolo.
[narratore] Nel vicolo, dietro la porta, un passo si ferma sulla neve e poi riparte.
[invito] pg_gunda, pg_nando, pg_vanda
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_lite_1

```text
⟨pre-scritta⟩ [narratore] Dal lato dei Morlacchi qualcuno batte il bicchiere sul tavolo, tre volte.
```

- righe pre-scritte 1, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_gunda","pg_nando","pg_vanda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3027 ms; buchi 4 (in frase 0, tra frasi 4, silenzio 842 ms); costo $0.00064295

## Turno 4

Azioni:
- pg_nando: «io seguo la fisarmonica. chi scappa dietro i sacchi lo facciamo ballare»
- pg_vanda: «remo ferma, scendo io, la cantina la conosco dai muli»
- pg_remo: «scendo in cantina a controllare le forme, la scaletta e mia»
- pg_gunda: (nessuna azione)

Narratore:

```text
[narratore] Nando tira fuori la fisarmonica e segue l'odore di siero e le risate verso i sacchi; chi scappa dietro di loro si ritrova a ballare contro la sua volontà.
[narratore] Vanda scende i tre gradini della cantina delle forme con passo sicuro da mulattiera. Il buio è fresco e pieno dell'odore del caglio.
[narratore] Remo imbocca la scaletta della cantina, controlla le forme una per una e segna i nomi con la matita.
[narratore] Gunda resta in piedi tra le due tavolate, mani aperte, e aspetta.
[narratore] Dalla cantina arriva un suono sordo, una forma che rotola e si ferma contro la parete.
[invito] pg_nando, pg_vanda, pg_remo
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nando","pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2445 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00062665

## Turno 5

Azioni:
- pg_remo: «gunda il pugno chiuso fammelo vedere, sono curioso ahah»
- pg_gunda: «ferma nando, la prendo io per il braccio, piano, tipo sacco di farina»
- pg_nando: «treccia rossa! esci fuori, ti canto la canzone della treccia a squarciagola»
- pg_vanda: (nessuna azione)

Narratore:

```text
[narratore] Remo, il pugno è chiuso e non si apre a comando. Gunda, la presa è sicura, nessuno si ferisce.
[narratore] Gunda afferra Nando per il braccio, piano, come un sacco di farina. Nando si ferma a metà passo.
[narratore] Dalla cantina, in fondo alla scaletta, esce Zelia con il quaderno stretto sotto il braccio: ha una treccia rossa e le dita nere d'inchiostro.
[narratore] La canzone di Nando riparte a squarciagola, e la sala ride. Zelia si ferma sull'ultimo gradino.
[png_zelia] Questo lo scrivo. Chi ha detto che la treccia è mia? Capitolo primo: i forestieri cantano troppo.
[narratore] Nel buio dietro di lei, Vanda sente un rumore di legno: la porta del vicolo si apre di un dito.
[invito] pg_remo, pg_gunda, pg_vanda
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_gunda","pg_vanda"]; anomalie: 3
- primo audio dalla chiusura della finestra: 3258 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 375 ms); costo $0.00070135

## Turno 6

Azioni:
- pg_gunda: «vanda braccio di ferro io contro te, chi perde paga il vino»
- pg_vanda: «va bene, ma se perdi giuro che ti appoggio un basto sulla testa»
- pg_remo: «gaspare il contratto del prato alto lo firmi dopo il tramonto se le nozze saltano? la penna e mia»
- pg_nando: (nessuna azione)

Narratore:

```text
[narratore] Gunda e Vanda si afferrano le mani sopra la riga di forme, e le braccia tremano per un momento.
[narratore] Gunda spinge, ma Vanda tiene. Il polso di Gunda scende piano, e la sala grida.
[narratore] Gunda perde la presa e si piega indietro sulla panca, ridendo a denti stretti.
[narratore] Vanda si alza con il boccale in mano, lo sguardo fisso su Remo.
[narratore] Remo, il contratto sul Prato Alto è ancora nella tua borsa. Gaspare ti guarda con gli occhiali sulla punta del naso.
[usa] gas_dote > pg_remo
    ⟨pre-scritta⟩ [narratore] Gaspare si toglie gli occhiali e li pulisce sul panciotto.
    ⟨pre-scritta⟩ [png_gaspare] Il Prato Alto è la dote di Agnese. Io ne sono felicissimo, si capisce.
[narratore] Remo chiede a Gaspare la penna, e Gaspare la porge con due dita, come un conto da pagare.
[invito] pg_remo,pg_gunda
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_1

```text
⟨pre-scritta⟩ [narratore] La neve torna a cadere fitta, a fiocchi grossi come piume.
⟨pre-scritta⟩ [narratore] Fuori dalle finestre il vicolo diventa bianco, e i rumori si fanno piccoli.
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_lite_2

```text
⟨pre-scritta⟩ [narratore] Un Bonfanti spinge una forma, e la riga di formaggio si allarga.
⟨pre-scritta⟩ [narratore] Dall'altra parte della sala, una panca striscia indietro.
```

- righe pre-scritte 6, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_remo","pg_gunda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2167 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00077965

## Turno 7 — cambio di scena scena_casera → scena_casa_bonfanti (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] A casa Bonfanti la scala scricchiola, e dalla stalla sale odore di fieno.
[narratore] In camera la sposa vi guarda dallo specchio, muta, e Zelia le appunta il velo con gli spilli.
[narratore] Dietro di voi entra lo zio Gaspare, scuotendo la neve dal panciotto: da dove cominciate?
```

## Turno 8

Azioni:
- pg_nando: «le scale scricchiolano, faccio la scala musicale: do re mi scricchiolo»
- pg_vanda: «ferma! io salgo, le mule sulle scale non ci vanno»
- pg_remo: «sposa bella, mi fai un sorriso? lo porto a valle come pegno»
- pg_gunda: (nessuna azione)

Narratore:

```text
[narratore] Nando, la prima scala scricchiola sotto la sua fisarmonica, e il do di Nando si perde nel legno.
[narratore] Vanda, la scala è stretta e le mule non ci passano. Lei sale da sola, piano, un gradino alla volta.
[narratore] Remo, la sposa ti guarda dallo specchio, muta. Non sorride, ma alza appena il velo con un dito.
[narratore] Zelia ti stringe il quaderno sul petto. «Pegno? Questo lo scrivo.» Non ti lascia avvicinare.
[narratore] Gaspare si ferma in cima alla scala e ti guarda con gli occhiali sulla punta del naso.
[usa] nar_sposa_mima > pg_remo
    ⟨pre-scritta⟩ [narratore] La sposa apre la bocca, si ricorda dell'usanza e la richiude.
    ⟨pre-scritta⟩ [narratore] Guarda la sorella e si spolvera il vestito, come se avesse addosso la paglia.
    ⟨pre-scritta⟩ [narratore] Poi si mette due dita sulla testa, come corna. Zelia diventa rossa fino alle orecchie.
[narratore] Gunda aspetta in cucina, e dalla stalla un campanaccio suona piano.
[invito] pg_nando,pg_vanda,pg_remo
```

- righe pre-scritte 3, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_nando","pg_vanda","pg_remo"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2987 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 626 ms); costo $0.00077769

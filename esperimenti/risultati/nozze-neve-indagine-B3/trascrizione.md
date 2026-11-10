# Trascrizione nozze-neve-indagine-B

Campagna: nozze-neve · modalità: repertorio · sessione 2026-11-09T20:09:57.538Z · PG: pg_ida, pg_livia, pg_vanda

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
- pg_ida: «adelina, la scatolina vuota: chi l'ha toccata prima di mezzogiorno? la guardo da vicino senza toccarla»
- pg_vanda: «ettore, sei salito al sasso stamattina? dillo senza scappare»
- pg_livia: «zelia, dove sei stata tra le undici e mezzogiorno? guardami in faccia mentre rispondi»

Narratore:

```text
[narratore] Ida si avvicina alla scatolina di noce, ferma le mani a un palmo dal velluto rosso e la guarda da vicino.
[usa] nar_scatolina > pg_ida
    ⟨pre-scritta⟩ [narratore] Dentro, il velluto rosso conserva ancora l'impronta tonda dell'anello.
    ⟨pre-scritta⟩ [narratore] Accanto c'è una macchia d'inchiostro fresco, piccola come un polpastrello.
    ⟨pre-scritta⟩ [narratore] Nella cerniera è rimasto preso un capello rosso, lungo.
[narratore] Il velluto porta l'impronta di un anello, ma l'occhio non riesce a dire se è fresca o vecchia.
[invito] pg_vanda,pg_livia
[narratore] Vanda chiede a Ettore se è salito al Sasso stamattina. Il vecchio batte due volte il bastone sul pavimento.
[png_ettore] Sono salito. Con questa gamba? Ho mandato il nipote con la neve da spalare.
[narratore] Livia chiede a Zelia dove è stata tra le undici e mezzogiorno. La ragazza chiude il quaderno di scatto e la guarda dritta.
[png_zelia] Ero qui dentro, con il quaderno. Chieda agli atti, non a me.
[invito] pg_vanda,pg_livia
```

- righe pre-scritte 3, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 1; invito: ["pg_vanda","pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: 5608 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0009434

## Turno 2

Azioni:
- pg_vanda: «bastiano, fammi vedere le mani. cosa c'è di nero sulle dita?»
- pg_livia: «guardo le impronte nella neve che entra dalla porta di dietro della cantina: quante persone sono passate, e in che direzione?»
- pg_ida: «tonio, sei pallido. di cosa hai paura adesso, del sasso o di tuo nonno?»

Narratore:

```text
[narratore] Vanda chiede a Bastiano di mostrare le mani. Il garzone le stringe contro il petto, nere fino ai polsi.
[usa] nar_bastiano > pg_vanda
    ⟨pre-scritta⟩ [narratore] Bastiano ha le mani nere di grasso da zoccoli, fino ai polsi.
    ⟨pre-scritta⟩ [narratore] Borbotta, senza alzare gli occhi, che a mezzogiorno ferrava la mula Gigia.
    ⟨pre-scritta⟩ [narratore] Sotto le unghie ha ancora la limatura dei ferri nuovi.
[narratore] Livia guarda le impronte nella neve che entra dalla porta di dietro della cantina.
[usa] nar_impronte > pg_livia
    ⟨pre-scritta⟩ [narratore] Fuori dalla porta di dietro la neve è fresca, e tiene tutto.
    ⟨pre-scritta⟩ [narratore] Impronte piccole e strette attraversano il vicolo, fino alla porta della stalla dei Bonfanti.
    ⟨pre-scritta⟩ [narratore] Verso la stalla dei Morlacchi, in fondo al vicolo, la neve è liscia.
[narratore] Ida si avvicina a Tonio. Lo sposo deglutisce e si tocca la giacca, dove qualcosa fa un rigonfio.
[usa] nar_tonio_tasca > pg_ida
    ⟨pre-scritta⟩ [narratore] Tonio guarda verso il nonno, poi abbassa la voce.
    ⟨pre-scritta⟩ [narratore] La lettera sta nella tasca di dentro della giacca, a sinistra.
    ⟨pre-scritta⟩ [narratore] Il nonno la tocca quando crede di non essere visto.
    ⟨pre-scritta⟩ [narratore] Quando balla, dice, la giacca la appende alla panca.
[narratore] Dalla tavolata dei Morlacchi arriva il tintinnio di campanacci: fuori, il tempo non aspetta.
[invito] pg_vanda,pg_livia,pg_ida
```

- righe pre-scritte 10, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_livia","pg_ida"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2710 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 187 ms); costo $0.0005721

## Turno 3

Azioni:
- pg_livia: «zelia, in soffitta ci sono ancora le tue cose? portami a vederle adesso, prima della benedizione»
- pg_ida: «adelina, l'anello di casa lo tiene sempre qualcuno? la nonna l'ha mai lasciato in giro?»
- pg_vanda: «ettore, il vento di stamattina: era vento o ti sei messo a piangere al sasso?»

Narratore:

```text
[narratore] Livia chiede a Zelia di portarla in soffitta adesso, prima della benedizione. La ragazza stringe il quaderno al petto.
[usa] nar_custode_regole > pg_livia
    ⟨pre-scritta⟩ [narratore] Ciò che si racconta al Sasso, dice il Custode, il paese lo ripete per sempre.
    ⟨pre-scritta⟩ [narratore] La casa che racconta il falso perde la voce.
    ⟨pre-scritta⟩ [narratore] La sua storia, da allora, la racconta chi ha detto il vero.
    ⟨pre-scritta⟩ [narratore] E se la più anziana non mette l'anello, lo mette la seconda della casa.
[narratore] Ida chiede ad Adelina chi tiene l'anello di casa. La vecchia stringe lo scialle e non risponde subito.
[png_adelina] Lo tiene chi ha il diritto di portarlo. Il formaggio buono vuole tempo, e così le mani giuste.
[narratore] Vanda chiede a Ettore se il vento di stamattina era vento o pianto. Il vecchio fissa la finestra e batte il bastone una volta.
[png_ettore] Vento. Il Sasso fa piangere solo i vecchi, e io non piango. Parla dall'orecchio buono, eh.
[invito] pg_livia,pg_ida,pg_vanda
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_lite_1

```text
⟨pre-scritta⟩ [narratore] Dal lato dei Morlacchi qualcuno batte il bicchiere sul tavolo, tre volte.
```

- righe pre-scritte 5, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_livia","pg_ida","pg_vanda"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3592 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 954 ms); costo $0.0006775

## Turno 4 — cambio di scena scena_casera → scena_casa_bonfanti (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] A casa Bonfanti la scala scricchiola, e dalla stalla sale odore di fieno.
[narratore] In camera la sposa vi guarda dallo specchio, muta, e Zelia le appunta il velo con gli spilli.
[narratore] Dietro di voi entra lo zio Gaspare, scuotendo la neve dal panciotto: da dove cominciate?
```

## Turno 5

Azioni:
- pg_ida: «tonio, cosa ti ha detto il nonno nella settimana in cui non ti ha parlato? provi a ricordarlo bene»
- pg_vanda: «gaspare, dove stavi tu a mezzogiorno? e i cassetti della cucina li apri sempre così in fretta?»
- pg_livia: «zelia, le lettere d'amore della nonna: dove le hai messe? e chi le ha firmate con la E lo sa?»

Narratore:

```text
[narratore] Ida tonio, cosa ti ha detto il nonno nella settimana in cui non ti ha parlato? Lo sposo ricorda una frase, sottovoce, e poi la ripete.
[narratore] Tonio dice che il nonno, quella settimana, ha ripetuto una cosa sola: che il Sasso non perdona le bugie dette a voce alta.
[narratore] Vanda chiede a Gaspare dove stava a mezzogiorno. Lo zio apre il libro dei conti senza alzare gli occhi.
[png_gaspare] A mezzogiorno ero qui, a fare due conti. Il cassetto dello scrittoio, poi, lo apro come si apre un cassetto. Con rispetto parlando.
[narratore] Il cassetto sotto la finestra è chiuso a chiave, e la serratura non ha segni di forzatura.
[narratore] Livia chiede a Zelia dove sono le lettere d'amore della nonna. La ragazza tocca lo spago del quaderno e fa finta di non avere sentito.
[png_zelia] Questo non lo scrivo. Le lettere stanno dove stanno, e chi le firma con la E lo sa da sé.
[narratore] Dal lato della stalla, sotto i piedi, un campanaccio suona piano, poi tace.
[invito] pg_ida, pg_vanda, pg_livia
```

- righe pre-scritte 0, improvvisate 8, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_ida","pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2589 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00082364

## Turno 6 — cambio di scena scena_casa_bonfanti → scena_casera (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] Nella casera il caldo vi viene incontro, con l'odore di siero e di lana bagnata.
```

## Turno 7

Azioni:
- pg_vanda: «bastiano, ti copro io davanti al paese se mi dici la verità. dov'eri a mezzogiorno?»
- pg_livia: «ettore, le lettere della nonna erano firmate E. ti dice qualcosa questa E?»
- pg_ida: «tonio, ti resto accanto al sasso come promesso. se il nonno ha una lettera in giacca, la guardiamo insieme?»

Narratore:

```text
[narratore] Vanda chiede a Bastiano dove fosse a mezzogiorno. Il garzone stringe le mani nere contro il petto e guarda la stalla, senza rispondere.
[narratore] Vanda, sul suo viso passa qualcosa che non è convinzione. Non ti dà una risposta, ma il garzone ha già detto mezza verità.
[narratore] Livia chiede a Ettore della E. Il vecchio si irrigidisce sul bastone, poi si volta verso il tavolo alto.
[png_ettore] La E. Sessant'anni di lettere, e sempre quella. Non lo dico a voce alta.
[narratore] Ida si avvicina a Tonio, sotto la finestra, dove la neve batte sul vetro. Lo sposo tiene la mano sulla tasca della giacca, ma non la sfila.
[usa] nar_tonio > pg_ida
    ⟨pre-scritta⟩ [narratore] Tonio arrossisce fino al collo, e si rigira il cappello tra le mani grosse.
    ⟨pre-scritta⟩ [narratore] Borbotta che vuole sposarsi oggi, non a primavera, e che al nonno non si risponde.
[narratore] Ida, la lettera è ancora dove l'ha messa il nonno. Tonio ti guarda e annuisce, piano.
[invito] pg_vanda,pg_livia,pg_ida
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_1

```text
⟨pre-scritta⟩ [narratore] La neve torna a cadere fitta, a fiocchi grossi come piume.
⟨pre-scritta⟩ [narratore] Fuori dalle finestre il vicolo diventa bianco, e i rumori si fanno piccoli.
```

- righe pre-scritte 4, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_livia","pg_ida"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3420 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.000877

## Turno 8 — cambio di scena scena_casera → scena_casa_bonfanti (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] A casa Bonfanti la scala scricchiola, e dalla stalla sale odore di fieno.
```

## Turno 9

Azioni:
- pg_livia: «zia adelina, la scatolina: vuoi che la guardi con te davanti a tutti, o preferisci a quattr'occhi?»
- pg_ida: «agnese, non ti chiedo di parlare. se ti va, fai un cenno: qualcuno ti ha detto di non dire niente fino al sì?»
- pg_vanda: «gaspare, il tuo fiato ha odore di vino e di paura. cosa hai nascosto nel cassetto?»

Narratore:

```text
[narratore] Livia chiede ad Adelina, a quattr'occhi o davanti a tutti, se vuole guardare la scatolina insieme. Adelina non è qui: la domanda resta sospesa nell'aria del caseggiato.
[narratore] Ida chiede ad Agnese se qualcuno le ha detto di tacere fino al sì. La sposa non risponde a parole: alza appena la mano dal velo e la riabbassa.
[narratore] Vanda chiede a Gaspare cosa ha nascosto nel cassetto. Lo zio si irrigidisce sul libro dei conti, ma non apre il cassetto.
[png_gaspare] Con rispetto parlando, il cassetto non la riguarda. Ha un tono più alto del solito, e si rimette gli occhiali con calma.
[narratore] Dalla stalla sotto casa arriva il tintinnio di un campanaccio, e poi il secondo, più lontano.
[narratore] La scala scricchiola sotto qualcuno che sale: da qui non si vede chi.
[invito] pg_vanda,pg_livia
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_zio_1

```text
⟨pre-scritta⟩ [narratore] Dalla cucina arriva un rumore di cassetti aperti e richiusi.
```

- righe pre-scritte 1, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2885 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00084654

## Turno 10

Azioni:
- pg_ida: «adelina, il nonno Ettore e la lettera chiusa con la ceralacca: lei sa qualcosa di quella lettera?»
- pg_vanda: «bastiano, lo zio ti accusa del furto. io non ci credo: cosa hai fatto tra le undici e mezzogiorno?»
- pg_livia: «agnese, la nonna ha l'anello al dito o nella tasca? me lo dici con la testa, sì o no»

Narratore:

```text
[narratore] Ida chiede ad Adelina dell'anello e della lettera sigillata. La vecchia si ferma con le chiavi in mano e non risponde subito.
[png_adelina] Quella lettera non è mia da aprire. Il formaggio buono vuole tempo, e le lettere anche.
[narratore] Vanda chiede a Bastiano dove fosse tra le undici e mezzogiorno. Il garzone alza gli occhi dalla neve sporca di fango.
[narratore] Bastiano dice che era nella stalla dei Morlacchi, a ferrare un mulo. Il ferro ha ancora il chiodo sporco di grasso.
[narratore] Livia chiede ad Agnese se la nonna ha l'anello al dito o in tasca. La sposa non parla: fa un cenno lento, sì, senza guardare la sorella.
[usa] nar_sposa_mima
    ⟨pre-scritta⟩ [narratore] La sposa apre la bocca, si ricorda dell'usanza e la richiude.
    ⟨pre-scritta⟩ [narratore] Guarda la sorella e si spolvera il vestito, come se avesse addosso la paglia.
    ⟨pre-scritta⟩ [narratore] Poi si mette due dita sulla testa, come corna. Zelia diventa rossa fino alle orecchie.
[invito] pg_ida,pg_vanda,pg_livia
```

- righe pre-scritte 3, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_ida","pg_vanda","pg_livia"]; anomalie: 2
- primo audio dalla chiusura della finestra: 2661 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00082064

## Turno 11 — cambio di scena scena_casa_bonfanti → scena_casera (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] Nella casera dei Bonfanti una riga di forme di formaggio divide la sala in due.
```

## Turno 12

Azioni:
- pg_vanda: «ettore, guardami negli occhi e dimmi cosa hai visto al sasso all'alba»
- pg_livia: «zelia, il velo lo stai sistemando per la sorella: ti tremano le mani. cosa hai paura che esca dal cassetto?»
- pg_ida: «custode, il libro del sasso: ci sono nozze saltate in passato? mi fai leggere la pagina prima del sole»

Narratore:

```text
[narratore] Vanda, Ettore ti guarda da sotto il cappello di feltro. Il bastone batte una volta sul pavimento, e poi basta.
[png_ettore] Eh? Parla dall'orecchio buono, che l'altro è vecchio.
[narratore] Ida apre il Libro del Sasso sulle ginocchia del Custode, sfogliando le pagine ingiallite con la punta delle dita.
[usa] nar_libro_pagina > pg_ida
    ⟨pre-scritta⟩ [narratore] Il Custode trova la pagina: sessant'anni fa, alla prima neve, nessuna benedizione.
    ⟨pre-scritta⟩ [narratore] La ragazza Bonfanti ha aspettato al Sasso fino al buio.
    ⟨pre-scritta⟩ [narratore] A notte è salito il giovane Morlacchi, con un mulo e una lanterna. Non ha trovato nessuno.
[narratore] Livia, Zelia ha le dita ferme sul velo della sorella. Non alza gli occhi dal quaderno.
[narratore] Lo spillo le scivola dalle mani e cade sul pavimento di legno con un tintinnio.
[narratore] Dalla stalla sotto casa arriva un campanaccio, piano.
[invito] pg_vanda,pg_livia
```

- righe pre-scritte 3, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2050 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 620 ms); costo $0.0008328

## Turno 13

Azioni:
- pg_livia: «agnese, se tu o la nonna sapete chi ha preso l'anello, un cenno basta, nessuno ti sente»
- pg_ida: «custode, quando si benedice una prima neve senza anello, come si fa? c'è una formula per questo?»
- pg_vanda: «tonio, mi ha detto bastiano che tu avevi toccato la lettera del nonno. è vero?»

Narratore:

```text
[narratore] Livia chiede ad Agnese, in silenzio, se lei o la nonna sanno chi ha preso l'anello. La sposa non parla, ma stringe il velo tra le dita.
[narratore] Adelina, dal tavolo alto, alza appena il mento verso la sorella. Nessun cenno, solo lo sguardo.
[narratore] Ida chiede al Custode come si benedice una prima neve senza anello. Ilario sfoglia il Libro del Sasso fino a una pagina macchiata di cera.
[narratore] Il Custode legge piano, con il dito sulla riga: senza anello, niente benedizione fino a primavera, salvo che la seconda più anziana della casa lo porti al Sasso.
[narratore] Vanda chiede a Tonio della lettera. Lo sposo si irrigidisce e guarda la tasca della giacca.
[narratore] Tonio dice che il nonno gliel'ha mostrata una volta sola, e che non l'ha toccata. Poi arrossisce e si volta verso la finestra.
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_2

```text
⟨pre-scritta⟩ [narratore] Dal Sasso arriva il corno, un richiamo lungo e basso.
⟨pre-scritta⟩ [narratore] In paese qualcuno apre una finestra, per sentire meglio.
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_lite_2

```text
⟨pre-scritta⟩ [narratore] Un Bonfanti spinge una forma, e la riga di formaggio si allarga.
⟨pre-scritta⟩ [narratore] Dall'altra parte della sala, una panca striscia indietro.
```

- righe pre-scritte 4, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 3191 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.0008974

## Turno 14

Azioni:
- pg_ida: «adelina, il sole è a una spanna: se l'anello non torna, cosa succede davvero? dimmelo chiaro»
- pg_vanda: «fermi tutti. metto in fila: alba al sasso, mezzogiorno nella stalla, cassetto di gaspare. chi manca?»
- pg_livia: «zelia, io ti credo. chi ha messo le mani nel cassetto della cucina oggi?»

Narratore:

```text
[narratore] Ida, Adelina non ti guarda. Il sole è a una spanna dal passo.
[png_adelina] Se l'anello non torna, Ida, la benedizione si rinvia alla primavera. E la dote del Prato Alto resta in mano a chi la tiene.
[narratore] Vanda, la fila regge: l'alba al Sasso, il mezzogiorno nella stalla, il cassetto di Gaspare. Manca la sorella, e manca la mano che ha toccato la scatolina.
[narratore] Livia, Zelia abbassa la penna. Il quaderno resta aperto sulla pagina bianca.
[narratore] Dal tavolo alto, Gaspare alza gli occhi dal registro e si rimette la matita dietro l'orecchio.
[png_gaspare] Con rispetto parlando, nel cassetto della cucina c'è solo la chiave della cantina delle forme.
[usa] gas_chi_cera > pg_vanda
    ⟨pre-scritta⟩ [narratore] Gaspare si toglie gli occhiali e li pulisce sul panciotto.
    ⟨pre-scritta⟩ [png_gaspare] Ho visto il garzone dei Morlacchi girare intorno al tavolo alto. Lo dico con dispiacere, si capisce.
[narratore] Dal Sasso arriva il corno, due note sole, e poi silenzio.
[invito] pg_ida,pg_vanda,pg_livia
```

- righe pre-scritte 2, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_ida","pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2363 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 400 ms); costo $0.0008839

## Turno 15 — cambio di scena scena_casera → scena_sasso (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] Al Sasso delle Promesse il larice è carico di neve, e due lanterne fumano nel freddo.
[narratore] Il paese si stringe a semicerchio, Bonfanti di qua e Morlacchi di là, e il Custode apre il Libro.
[narratore] Il sole scende verso il passo: chi parla per primo?
```

## Turno 16

Azioni:
- pg_vanda: «ettore, la lanterna era per l'anello o per qualcun altro? rispondi a me, non al custode»
- pg_livia: «ettore, la lettera in giacca: la apri tu davanti al paese o la apro io con le lettere della soffitta?»
- pg_ida: «tonio, se il nonno ha la lettera e l'anello è sparito, non è una coincidenza. lo sai anche tu?»

Narratore:

```text
[narratore] Vanda, la lanterna in mano a Ettore resta ferma. Lui non guarda il Custode: guarda te.
[usa] ett_quel_giorno > pg_vanda
    ⟨pre-scritta⟩ [narratore] Ettore si tira la barba con tutte e due le mani.
    ⟨pre-scritta⟩ [png_ettore] Quel giorno sono sceso a valle. Avevo muli da vendere.
[narratore] Livia, Ettore ti fissa da sotto il cappello. La mano scivola alla giacca, ma non la apre.
[png_ettore] Lettere della soffitta? Quelle le hanno i Bonfanti, eh. Questa resta mia.
[narratore] Ida, Tonio abbassa gli occhi sulla tasca della giacca e poi li alza verso di te. Non dice niente.
[usa] nar_tonio > pg_ida
    ⟨pre-scritta, variante 1⟩ [narratore] Tonio si stringe nelle spalle larghe e guarda verso il passo.
    ⟨pre-scritta, variante 1⟩ [narratore] Dice che senza anello domattina scende a valle con i muli, e che non è giusto.
[narratore] Dal Sasso arriva il corno, una nota sola, lunga, e il sole tocca la cresta del passo.
[invito] pg_vanda, pg_livia, pg_ida
```

- righe pre-scritte 4, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_vanda","pg_livia","pg_ida"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2179 ms; buchi 6 (in frase 0, tra frasi 6, silenzio 1790 ms); costo $0.00083385

## Turno 17

Azioni:
- pg_livia: «agnese, zelia dice che la nonna ha scritto altre lettere. fai un cenno se vuoi che le cerchi»
- pg_ida: «custode, prima di aprire il libro: chi ha chiesto a voi due di tenere la pace? lo sapete?»
- pg_vanda: «bastiano, vieni con me al sasso. se stai dicendo la verità, lo dici anche davanti a loro»

Narratore:

```text
[narratore] Livia, Agnese non parla. Ma guarda la sorella, e poi fa un cenno lento: sì, la nonna ha altre lettere.
[narratore] Zelia stringe il quaderno al petto e non dice niente.
[narratore] Ida, il Custode Ilario chiude il Libro un momento, con la mano piatta sopra.
[usa] nar_libro_spose > pg_ida
    ⟨pre-scritta⟩ [narratore] Il Custode apre il Libro sulle ginocchia e lo gira verso di voi, con un sospiro.
    ⟨pre-scritta⟩ [narratore] Cent'anni di nozze di neve dei Bonfanti: le spose portano tutte una catenina d'argento.
    ⟨pre-scritta⟩ [narratore] L'anello compare solo ventotto anni fa, alle nozze di Marta, con la storia raccontata da Adelina.
[narratore] Vanda, Bastiano si fa avanti dal gruppo dei Morlacchi, il cappello in mano. Va verso il Sasso senza aspettare.
[narratore] Gaspare guarda il garzone che passa e si toglie gli occhiali.
[png_gaspare] Con rispetto parlando, un garzone che parla al Sasso è un bel rumore in più.
[usa] nar_sole_7
    ⟨pre-scritta⟩ [narratore] Il corno chiama ancora, e l'ultima luce lascia i tetti del paese.
    ⟨pre-scritta⟩ [narratore] Sulla neve le ombre sono lunghe e blu, e fa più freddo.
[invito] pg_ida,pg_vanda,pg_livia
```

- righe pre-scritte 5, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_ida","pg_vanda","pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2133 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 255 ms); costo $0.00084815

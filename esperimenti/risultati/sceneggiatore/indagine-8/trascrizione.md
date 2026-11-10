# Trascrizione nozze-neve-indagine-B

Campagna: nozze-neve · modalità: repertorio · sessione 2026-11-10T13:00:20.734Z · PG: pg_ida, pg_livia, pg_vanda

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
[narratore] Ida Fiocchi: «La scatolina vuota».
[usa] gas_chi_cera > pg_ida
    ⟨pre-scritta⟩ [narratore] Gaspare si toglie gli occhiali e li pulisce sul panciotto.
    ⟨pre-scritta⟩ [png_gaspare] Ho visto il garzone dei Morlacchi girare intorno al tavolo alto. Lo dico con dispiacere, si capisce.
[narratore] Vanda Brughiera: «Sei salito al sasso stamattina».
[usa] ett_quel_giorno > pg_vanda
    ⟨pre-scritta⟩ [narratore] Ettore si tira la barba con tutte e due le mani.
    ⟨pre-scritta⟩ [png_ettore] Quel giorno sono sceso a valle. Avevo muli da vendere.
[narratore] Livia Saltari: «Dove sei stata tra le undici e mezzogiorno».
[usa] ade_quel_giorno > pg_livia
    ⟨pre-scritta⟩ [narratore] Adelina si aggiusta lo scialle sulle spalle, due volte.
    ⟨pre-scritta⟩ [png_adelina] Quel giorno il Morlacchi è scappato a valle. Io non l'aspettavo nemmeno.
[invito] tutti
```

- righe pre-scritte 6, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 12133 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 310 ms); costo $0

## Turno 2 — evento sceneggiatore

## Turno 2

Azioni:
- pg_vanda: «bastiano, fammi vedere le mani. cosa c'è di nero sulle dita?»
- pg_livia: «guardo le impronte nella neve che entra dalla porta di dietro della cantina: quante persone sono passate, e in che direzione?»
- pg_ida: «tonio, sei pallido. di cosa hai paura adesso, del sasso o di tuo nonno?»

Narratore:

```text
[narratore] Vanda Brughiera: «Fammi vedere le mani».
[usa] ett_bastiano > pg_vanda
    ⟨pre-scritta⟩ [png_ettore] Il ragazzo ferrava la Gigia, a mezzogiorno. Io lo so.
    ⟨pre-scritta⟩ [png_ettore] I Bonfanti no. Loro sanno sempre tutto.
[narratore] Livia Saltari: «Guardo le impronte nella neve che entra dalla porta di».
[usa] nar_impronte > pg_livia
    ⟨pre-scritta⟩ [narratore] Fuori dalla porta di dietro la neve è fresca, e tiene tutto.
    ⟨pre-scritta⟩ [narratore] Impronte piccole e strette attraversano il vicolo, fino alla porta della stalla dei Bonfanti.
    ⟨pre-scritta⟩ [narratore] Verso la stalla dei Morlacchi, in fondo al vicolo, la neve è liscia.
[narratore] Ida Fiocchi: «Sei pallido».
[usa] sc_prossime_t1_mwap9bxa_1_03 > pg_ida
    ⟨pre-scritta⟩ [png_ettore] Eh? Non ho sentito. Batte il bastone due volte.
    ⟨pre-scritta⟩ [narratore] Ettore si gira verso il camino e non risponde più.
[invito] tutti
```

- righe pre-scritte 7, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 32963 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 406 ms); costo $0

## Turno 3 — evento sceneggiatore

## Turno 3

Azioni:
- pg_livia: «zelia, in soffitta ci sono ancora le tue cose? portami a vederle adesso, prima della benedizione»
- pg_ida: «adelina, l'anello di casa lo tiene sempre qualcuno? la nonna l'ha mai lasciato in giro?»
- pg_vanda: «ettore, il vento di stamattina: era vento o ti sei messo a piangere al sasso?»

Narratore:

```text
[narratore] Livia Saltari: «In soffitta ci sono ancora le tue cose».
[usa] nar_custode_regole > pg_livia
    ⟨pre-scritta⟩ [narratore] Ciò che si racconta al Sasso, dice il Custode, il paese lo ripete per sempre.
    ⟨pre-scritta⟩ [narratore] La casa che racconta il falso perde la voce.
    ⟨pre-scritta⟩ [narratore] La sua storia, da allora, la racconta chi ha detto il vero.
    ⟨pre-scritta⟩ [narratore] E se la più anziana non mette l'anello, lo mette la seconda della casa.
[narratore] Ida Fiocchi: «L'anello di casa lo tiene sempre qualcuno».
[usa] nar_comari > pg_ida
    ⟨pre-scritta⟩ [narratore] Due comari dei Bonfanti si raccontano la storia dell'anello a mezza voce.
    ⟨pre-scritta⟩ [narratore] Guardano i Morlacchi, e ridono piano dietro le mani.
[narratore] Vanda Brughiera: «Il vento di stamattina».
[usa] nar_tilde_dorme > pg_vanda
    ⟨pre-scritta⟩ [narratore] Al tavolo alto la vecchia Tilde si addormenta con il bicchiere in mano.
    ⟨pre-scritta⟩ [narratore] Il Custode glielo toglie piano, e guarda fuori dalla finestra, verso il passo.
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_lite_1

```text
⟨pre-scritta⟩ [narratore] Dal lato dei Morlacchi qualcuno batte il bicchiere sul tavolo, tre volte.
```

- righe pre-scritte 9, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 866 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 4 — cambio di scena scena_casera → scena_casa_bonfanti (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] A casa Bonfanti la scala scricchiola, e dalla stalla sale odore di fieno.
[narratore] In camera la sposa vi guarda dallo specchio, muta, e Zelia le appunta il velo con gli spilli.
[narratore] Dietro di voi entra lo zio Gaspare, scuotendo la neve dal panciotto: da dove cominciate?
```

## Turno 4 — evento sceneggiatore

## Turno 5 — evento sceneggiatore

## Turno 5 — evento sceneggiatore

## Turno 5

Azioni:
- pg_ida: «tonio, cosa ti ha detto il nonno nella settimana in cui non ti ha parlato? provi a ricordarlo bene»
- pg_vanda: «gaspare, dove stavi tu a mezzogiorno? e i cassetti della cucina li apri sempre così in fretta?»
- pg_livia: «zelia, le lettere d'amore della nonna: dove le hai messe? e chi le ha firmate con la E lo sa?»

Narratore:

```text
[narratore] Ida Fiocchi: «Cosa ti ha detto il nonno nella settimana in cui».
[usa] nar_stalla_muggito > pg_ida
    ⟨pre-scritta⟩ [narratore] Dalla stalla arriva un muggito lungo, e un tintinnio di campanacci.
    ⟨pre-scritta⟩ [narratore] La sposa alza gli occhi dal velo e guarda la botola.
[narratore] Vanda Brughiera: «Dove stavi tu a mezzogiorno».
[usa] gas_chi_cera > pg_vanda
    ⟨pre-scritta, variante 1⟩ [narratore] Gaspare si toglie gli occhiali, e li pulisce sul panciotto, piano.
    ⟨pre-scritta, variante 1⟩ [png_gaspare] Il garzone dei Morlacchi, gliel'ho detto. Con dispiacere.
[narratore] Livia Saltari: «Le lettere d'amore della nonna».
[usa] zel_dove_eri > pg_livia
    ⟨pre-scritta⟩ [narratore] Zelia si mordicchia la punta della treccia.
    ⟨pre-scritta⟩ [png_zelia] Ero qui a vestire Agnese, tutto il giorno. Chiedetelo a lei.
[invito] tutti
```

- righe pre-scritte 6, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 14129 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 156 ms); costo $0

## Turno 6 — cambio di scena scena_casa_bonfanti → scena_casera (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] Nella casera il caldo vi viene incontro, con l'odore di siero e di lana bagnata.
```

## Turno 7 — evento sceneggiatore

## Turno 7 — evento sceneggiatore

## Turno 7

Azioni:
- pg_vanda: «bastiano, ti copro io davanti al paese se mi dici la verità. dov'eri a mezzogiorno?»
- pg_livia: «ettore, le lettere della nonna erano firmate E. ti dice qualcosa questa E?»
- pg_ida: «tonio, ti resto accanto al sasso come promesso. se il nonno ha una lettera in giacca, la guardiamo insieme?»

Narratore:

```text
[narratore] Vanda Brughiera: «Ti copro io davanti al paese se mi dici la».
[usa] nar_bastiano > pg_vanda
    ⟨pre-scritta⟩ [narratore] Bastiano ha le mani nere di grasso da zoccoli, fino ai polsi.
    ⟨pre-scritta⟩ [narratore] Borbotta, senza alzare gli occhi, che a mezzogiorno ferrava la mula Gigia.
    ⟨pre-scritta⟩ [narratore] Sotto le unghie ha ancora la limatura dei ferri nuovi.
[narratore] Livia Saltari: «Le lettere della nonna erano firmate E».
[usa] ett_di_chi > pg_livia
    ⟨pre-scritta⟩ [narratore] Ettore si tira la barba con tutte e due le mani.
    ⟨pre-scritta⟩ [png_ettore] È nostro, l'anello. La Bonfanti se l'è tenuto, come una ladra.
[narratore] Ida Fiocchi: «Ti resto accanto al sasso come promesso».
[usa] nar_tonio_tasca > pg_ida
    ⟨pre-scritta⟩ [narratore] Tonio guarda verso il nonno, poi abbassa la voce.
    ⟨pre-scritta⟩ [narratore] La lettera sta nella tasca di dentro della giacca, a sinistra.
    ⟨pre-scritta⟩ [narratore] Il nonno la tocca quando crede di non essere visto.
    ⟨pre-scritta⟩ [narratore] Quando balla, dice, la giacca la appende alla panca.
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sole_1

```text
⟨pre-scritta⟩ [narratore] La neve torna a cadere fitta, a fiocchi grossi come piume.
⟨pre-scritta⟩ [narratore] Fuori dalle finestre il vicolo diventa bianco, e i rumori si fanno piccoli.
```

- righe pre-scritte 11, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 8595 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 8 — cambio di scena scena_casera → scena_casa_bonfanti (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] A casa Bonfanti la scala scricchiola, e dalla stalla sale odore di fieno.
```

## Turno 9 — evento sceneggiatore

## Turno 9

Azioni:
- pg_livia: «zia adelina, la scatolina: vuoi che la guardi con te davanti a tutti, o preferisci a quattr'occhi?»
- pg_ida: «agnese, non ti chiedo di parlare. se ti va, fai un cenno: qualcuno ti ha detto di non dire niente fino al sì?»
- pg_vanda: «gaspare, il tuo fiato ha odore di vino e di paura. cosa hai nascosto nel cassetto?»

Narratore:

```text
[narratore] Livia Saltari: «Zia adelina».
[usa] nar_scatolina > pg_livia
    ⟨pre-scritta⟩ [narratore] Dentro, il velluto rosso conserva ancora l'impronta tonda dell'anello.
    ⟨pre-scritta⟩ [narratore] Accanto c'è una macchia d'inchiostro fresco, piccola come un polpastrello.
    ⟨pre-scritta⟩ [narratore] Nella cerniera è rimasto preso un capello rosso, lungo.
[narratore] Ida Fiocchi: «Non ti chiedo di parlare».
[usa] gas_campanella > pg_ida
    ⟨pre-scritta⟩ [png_gaspare] Me la regalò nostro padre, quando guarii dalla febbre. Avevo sei anni.
[narratore] Vanda Brughiera: «Il tuo fiato ha odore di vino e di paura».
[usa] nar_scrittoio_cassetto > pg_vanda
    ⟨pre-scritta⟩ [narratore] Nel cassetto c'è odore di inchiostro vecchio, e un libro dei conti.
    ⟨pre-scritta⟩ [narratore] Sotto il libro c'è un contratto con Sior Bortolo, mercante di Pontebruno.
    ⟨pre-scritta⟩ [narratore] Cinque estati di pascolo al Prato Alto, venti fiorini di caparra già pagati. Da firmare dopo il tramonto.
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_zio_1

```text
⟨pre-scritta⟩ [narratore] Dalla cucina arriva un rumore di cassetti aperti e richiusi.
```

- righe pre-scritte 8, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 15294 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 438 ms); costo $0

## Turno 10 — evento sceneggiatore

## Turno 10

Azioni:
- pg_ida: «adelina, il nonno Ettore e la lettera chiusa con la ceralacca: lei sa qualcosa di quella lettera?»
- pg_vanda: «bastiano, lo zio ti accusa del furto. io non ci credo: cosa hai fatto tra le undici e mezzogiorno?»
- pg_livia: «agnese, la nonna ha l'anello al dito o nella tasca? me lo dici con la testa, sì o no»

Narratore:

```text
[narratore] Ida Fiocchi: «Il nonno Ettore e la lettera chiusa con la ceralacca».
[usa] sc_subito_t5_mwapf9i6_6_1 > pg_ida
    ⟨pre-scritta⟩ [narratore] Tonio abbassa lo sguardo, e per un momento non dice niente.
    ⟨pre-scritta⟩ [narratore] Poi si sfrega la tempia con il pollice, come chi cerca una parola vecchia.
[narratore] Vanda Brughiera: «Lo zio ti accusa del furto».
[usa] zel_dove_eri > pg_vanda
    ⟨pre-scritta, variante 1⟩ [narratore] Zelia si mordicchia la punta della treccia, e guarda la sorella.
    ⟨pre-scritta, variante 1⟩ [png_zelia] Qui, con Agnese. Agli atti.
[narratore] Livia Saltari: «La nonna ha l'anello al dito o nella tasca».
[usa] nar_sposa_mima > pg_livia
    ⟨pre-scritta⟩ [narratore] La sposa apre la bocca, si ricorda dell'usanza e la richiude.
    ⟨pre-scritta⟩ [narratore] Guarda la sorella e si spolvera il vestito, come se avesse addosso la paglia.
    ⟨pre-scritta⟩ [narratore] Poi si mette due dita sulla testa, come corna. Zelia diventa rossa fino alle orecchie.
[invito] tutti
```

- righe pre-scritte 7, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 10593 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 202 ms); costo $0

## Turno 11 — cambio di scena scena_casa_bonfanti → scena_casera (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] Nella casera dei Bonfanti una riga di forme di formaggio divide la sala in due.
```

## Turno 12 — evento sceneggiatore

## Turno 12

Azioni:
- pg_vanda: «ettore, guardami negli occhi e dimmi cosa hai visto al sasso all'alba»
- pg_livia: «zelia, il velo lo stai sistemando per la sorella: ti tremano le mani. cosa hai paura che esca dal cassetto?»
- pg_ida: «custode, il libro del sasso: ci sono nozze saltate in passato? mi fai leggere la pagina prima del sole»

Narratore:

```text
[narratore] Vanda Brughiera: «Guardami negli occhi e dimmi cosa hai visto al sasso».
[usa] sc_subito_t3_mwapd7no_4_1 > pg_vanda
    ⟨pre-scritta⟩ [narratore] Ettore si tira il cappello sugli occhi, batte il bastone.
    ⟨pre-scritta⟩ [png_ettore] Vento, mulattiera. Il vento di stamattina spingeva la neve, basta.
[narratore] Livia Saltari: «Il velo lo stai sistemando per la sorella».
[narratore] Ida Fiocchi: «Il libro del sasso».
[usa] nar_libro_spose > pg_ida
    ⟨pre-scritta⟩ [narratore] Il Custode apre il Libro sulle ginocchia e lo gira verso di voi, con un sospiro.
    ⟨pre-scritta⟩ [narratore] Cent'anni di nozze di neve dei Bonfanti: le spose portano tutte una catenina d'argento.
    ⟨pre-scritta⟩ [narratore] L'anello compare solo ventotto anni fa, alle nozze di Marta, con la storia raccontata da Adelina.
[invito] tutti
```

- righe pre-scritte 5, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 845 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

# Trascrizione prova2-caotico-B2

Modalità: repertorio · sessione 2026-11-02T15:00:32.969Z · PG: pg_ginestra, pg_corrado, pg_teodora

Righe dopo `[usa] <id>`: battuta pre-scritta uscita (marcata `⟨pre-scritta⟩`). Le altre righe sono improvvisate dal modello.

## Turno 0 — apertura (testo fisso della scena)

```text
[narratore] È la Notte dei Lumi, a Fontescura.
[narratore] Da due giorni, nove persone del paese bruciano di febbre.
[narratore] Dicono che sia colpa di un forestiero, e al terzo rintocco verranno a prenderlo.
[narratore] All'osteria del Forno Vecchio c'è odore di pane caldo e di lana bagnata.
[narratore] Un nano col martello sulle ginocchia sorveglia una porta chiusa a chiave: dall'altra parte, qualcuno tossisce.
[narratore] Ottavia, l'ostessa, copre di lino le ceste del pane dei lumi, poi vi guarda: che fate?
```

## Turno 1

Azioni:
- pg_ginestra: «io voglio un altra scodella di zuppa di castagne, era buonissima»
- pg_corrado: «prima cosa: birra. ce l'ha l'oste la birra?»
- pg_teodora: «teodora entra e si guarda intorno tutta agitata, stringendo la lanterna»

Narratore:

```text
[narratore] Ginestra, Ottavia ti versa la zuppa senza chiederti niente, e intanto guarda la porta della cantina.
[narratore] Corrado, l'oste fa un cenno verso il barile nel retro, poi scuote la testa: birra no, solo vino annacquato.
[narratore] Teodora, la lanterna trema nella tua mano, e la fiamma si china verso la porta chiusa.
[usa] nar_volto_candela
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[narratore] Teodora, dal ripostiglio arriva un colpo di tosse, poi una voce roca.
[png_sebastiano] Mi permetta, se può. Ho sete da ieri sera.
[invito] pg_ginestra,pg_corrado,pg_teodora
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_ginestra","pg_corrado","pg_teodora"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3439 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00039645

## Turno 2

Azioni:
- pg_corrado: «chiedo al nano se gli va una partita a dadi, tanto sta li seduto»
- pg_teodora: «ragazzi c'è uno che tossisce di là, possiamo concentrarci? chiedo al nano chi c'è dentro»
- pg_ginestra: «anch'io gioco!! ma punto solo erbe secche»

Narratore:

```text
[narratore] Corrado, chiedi a Baldrin una partita a dadi, e lui ti guarda come se avessi bestemmiato davanti alla cappella.
[png_baldrin] Dadi? Ferro è ferro. Stai seduto.
[narratore] Ginestra, i dadi scivolano sul tavolo mentre Corrado li raccoglie, e tu allunghi la mano con la tua borsa di erbe secche.
[narratore] Teodora, dietro la porta la tosse riprende, più roca, e il sacchetto di Sebastiano sembra sussurrare dentro la bocca di Baldrin.
[usa] bal_chi_e > pg_teodora
    ⟨pre-scritta⟩ [png_baldrin] Lì dentro c'è quello. Il forestiero.
    ⟨pre-scritta⟩ [png_baldrin] Polvere nel pozzo, ha messo. Al rintocco decide il paese.
[narratore] Ottavia, sbattendo il mestolo sul paiolo, si china a guardare Teodora e alza le spalle come chi non vuole sapere.
[png_ottavia] Mangia, ché la notte è lunga. Il pane è per dopo.
[invito] pg_corrado,pg_ginestra
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_corrado","pg_ginestra"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1606 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00049225

## Turno 3

Azioni:
- pg_ginestra: «aspe ma la febbre... chiedo a ottavia se ai malati brucianole mani»
- pg_corrado: «squadro il nano dalla testa ai piedi: la guerra l'ha fatta o no?»
- pg_teodora: (nessuna azione)

Narratore:

```text
[narratore] Ginestra, la tua domanda passa di mano in mano: Ottavia smette di mescolare il paiolo e ti guarda con occhi rossi.
[usa] ott_malati > pg_ginestra
    ⟨pre-scritta⟩ [png_ottavia] La piccola di Baldrin, i due del bottaio, la vecchia Tecla. E altri cinque.
    ⟨pre-scritta⟩ [narratore] Ottavia si ferma un momento, poi riprende a piegare il lino.
    ⟨pre-scritta⟩ [png_ottavia] Da due giorni. Gli bruciano le mani, e di notte vedono cose.
[narratore] Corrado, squadri Baldrin, e il fabbro ti restituisce lo sguardo senza muovere il martello dalle ginocchia.
[usa] bal_chi_malato > pg_corrado
    ⟨pre-scritta⟩ [png_baldrin] Mia figlia, i due del bottaio, Tecla. E altri cinque.
    ⟨pre-scritta⟩ [narratore] Si ferma, e il martello smette di girargli nel palmo.
    ⟨pre-scritta⟩ [png_baldrin] I carbonai no. Bevono al pozzo, il pane se lo fanno.
[narratore] Teodora, nessuno ti chiede niente, e il tuo silenzio pesa più della lanterna che stringi.
[usa] nar_segno_1
    ⟨pre-scritta⟩ [narratore] Dalla cappella, il canto della veglia si interrompe, poi riprende più in fretta.
[invito] pg_ginestra,pg_corrado,pg_teodora
```

- righe pre-scritte 7, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_ginestra","pg_corrado","pg_teodora"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1499 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00055215

## Turno 4

Azioni:
- pg_corrado: «la seguo e quando nessuno guarda mi infilo una pagnotta sotto il mantello»
- pg_teodora: «mi avvicino alle ceste e sollevo un angolo del lino, giusto per sbirciare»
- pg_ginestra: «nooo corrado mettila giù! vabbè, già che ce l'hai fammela vedere»

Narratore:

```text
[narratore] Corrado, la tua mano scivola sotto il mantello e torna con una pagnotta. Nessuno ti guarda, o forse qualcuno sì.
[usa] nar_pagnotta_spezza > pg_corrado
    ⟨pre-scritta⟩ [narratore] La crosta cede con uno scrocchio. Dentro, la mollica è ancora tiepida.
    ⟨pre-scritta⟩ [narratore] È grigia, e punteggiata di chicchi neri e curvi, come piccole unghie.
[narratore] Teodora, il lino scivola via dalle ceste e dentro c'è pane bianco, ancora caldo, con la crosta spaccata.
[usa] ott_pane_prima > pg_teodora
    ⟨pre-scritta⟩ [png_ottavia] Giù le mani dalle ceste! Il pane dei lumi si spezza al rintocco.
    ⟨pre-scritta⟩ [narratore] Ottavia si mette tra voi e il tavolo, il mestolo alzato.
[narratore] Ginestra, il pane non è ancora tuo: Ottavia ti lancia uno sguardo lungo, ma non dice nulla.
[png_ottavia] Il pane si spezza al rintocco, figliola. Non prima.
[narratore] Dalla grata, Baldrin ha sentito il fruscio del lino e si è alzato con il martello in mano.
[png_baldrin] Rimettete a posto. Il pane è per dopo.
[invito] pg_corrado,pg_teodora,pg_ginestra
```

- righe pre-scritte 4, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_corrado","pg_teodora","pg_ginestra"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1148 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00055625

## Turno 5

Azioni:
- pg_teodora: «busso alla porta del ripostiglio. "Ehm... buonasera? Sono della Signora delle Lanterne. Come vi sentite?"»
- pg_ginestra: «provo a parlare con un topo. in un osteria un topo ci sarà no? gli chiedo cosa ha visto»
- pg_corrado: «aiuto teodora, busso pure io ma più forte»

Narratore:

```text
[narratore] Teodora, bussi e dal ripostiglio arriva un silenzio lungo, poi un colpo di tosse.
[png_sebastiano] Buonasera, sorella. Sto al caldo, per quanto il ferro lo permette. Lei ha paura di me?
[narratore] Ginestra, il topo si ferma sotto la panca e ti fissa con gli occhi neri. Non scappa.
[narratore] Corrado, il tuo pugno sulla porta fa tremare la grata, e Baldrin si volta di scatto col martello in mano.
[png_baldrin] Ancora un colpo, soldato, e la porta la apro io. Ma non prima del rintocco.
[usa] seb_pozzo > pg_teodora
    ⟨pre-scritta⟩ [png_sebastiano] Prendevo acqua per la vecchia che abita lì accanto. È sola, e brucia di febbre.
    ⟨pre-scritta⟩ [narratore] Dopo una pausa, dietro la grata si sente un respiro lungo.
[narratore] Ginestra, il topo fa un passo verso le tue dita e poi si nasconde dietro la cesta del pane.
[invito] pg_ginestra,pg_corrado
```

- righe pre-scritte 2, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_ginestra","pg_corrado"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2258 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061585

## Turno 6

Azioni:
- pg_ginestra: «intanto chiedo al nano se il martello non gli pesa sulle ginocchia, è tutta la sera che sta così»
- pg_corrado: «master dai confermamelo e basta: quello chiuso dentro è il cerusico che cerco? cosi mi intasco le venti corone»
- pg_teodora: «teodora alza gli occhi al cielo e chiede alla dea la pazienza per sopportare questa compagnia»

Narratore:

```text
[narratore] Ginestra, il nano abbassa lo sguardo sul martello. Lo sente, lo rigira una volta, poi lo lascia cadere sulle ginocchia.
[png_baldrin] È tutta la sera che lo porto. Ferro è ferro.
[narratore] Corrado, la tua domanda sulla chiave e sulla cella resta sospesa nell'aria, e Baldrin non ti dà nessuna conferma.
[png_baldrin] Il cerusico non l'ho visto. Quello dentro è un forestiero. Basta.
[narratore] Teodora, alzi gli occhi al soffitto e la preghiera ti esce a mezza voce; dal ripostiglio arriva una tosse, poi un respiro che si ferma ad ascoltarti.
[usa] nar_preghiera
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[usa] nar_segno_2
    ⟨pre-scritta⟩ [narratore] Un sasso batte su un'imposta: Baldrin si alza e va alla finestra.
    ⟨pre-scritta⟩ [narratore] Fuori, una voce di ragazzo grida corvo, poi si sentono passi che scappano.
[invito] pg_ginestra,pg_corrado,pg_teodora
```

- righe pre-scritte 2, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_ginestra","pg_corrado","pg_teodora"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1336 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073725

## Turno 7

Azioni:
- pg_corrado: «pure io prego, hai visto mai che la dea mi cancella i debiti»
- pg_teodora: «ok ok torno seria. invoco la Signora delle Lanterne sulle ceste: c'è qualcosa che non va lì dentro?»
- pg_ginestra: «dico a ottavia di far bere tanta acqua ai malati e di mettergli panni freddi sulle mani, mia nonna faceva così»

Narratore:

```text
[narratore] Corrado, la partita di dadi sfuma, e Ginestra, tu raccogli i dadi caduti sotto la panca.
[narratore] Teodora, la tua richiesta di concentrarti sulle ceste arriva fino alla grata, e dietro la porta il silenzio si fa più teso.
[usa] nar_preghiera > pg_teodora
    ⟨pre-scritta⟩ [narratore] Il pane è tiepido sotto le tue mani.
    ⟨pre-scritta⟩ [narratore] Poi, in bocca, un freddo improvviso. E un odore di marcio che nessun altro sente.
[narratore] Teodora, la tua preghiera sul lino bianco fa tremare la fiamma della lanterna, poi tutto si ferma. Il pane sembra puro, ma non lo è del tutto.
[narratore] Ginestra, la tua domanda ai malati e le mani che bruciano arriva a Ottavia, che si ferma col mestolo a mezz'aria.
[png_ottavia] Panni freddi, dici? Mia madre li metteva sulla fronte. Ma alle mani no, figliola.
[narratore] Corrado, la tua promessa di pregare arriva alle orecchie di Baldrin, che alza il sopracciglio senza girarsi.
[png_baldrin] La dea non cancella debiti. Ferro è ferro.
[usa] bal_sano > pg_ginestra
    ⟨pre-scritta⟩ [png_baldrin] Bevo al pozzo da trent'anni. Tutti i giorni.
    ⟨pre-scritta⟩ [png_baldrin] Il pane di segale non lo tocco. Roba da umani.
[narratore] Ginestra, Baldrin ti guarda a lungo. Poi dice piano che lui beve al pozzo come tutti, e sta bene.
[narratore] Teodora, il tuo tocco sul lino risveglia la tosse dal ripostiglio, più forte di prima.
[invito] pg_ginestra,pg_corrado,pg_teodora
```

- righe pre-scritte 4, improvvisate 9, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_ginestra","pg_corrado","pg_teodora"]; anomalie: 0
- primo audio dalla chiusura della finestra: 1338 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00085125

## Turno 8

Azioni:
- pg_teodora: «teodora resta dentro e chiede timida a ottavia: "Le donne in cappella hanno già finito di cantare la veglia?"»
- pg_ginestra: «aspettami corrado!! voglio vedere la neve»
- pg_corrado: «esco un attimo a vedere se nevica, se chiude il passo siamo fregati»

Narratore:

```text
[narratore] Teodora, esci dal ripostiglio con la voce bassa e chiedi a Ottavia se la veglia è finita; dalla cappella le ultime voci si spengono.
[png_ottavia] Finita? Sta ancora cantando, figliola. Il rintocco è dopo.
[narratore] Ginestra, il tuo "aspettami" si perde nel vento che entra dalla porta, e Corrado è già sotto il portico.
[narratore] Corrado, fuori la neve è sottile ma fitta, e la strada verso il passo è già bianca.
[usa] tr_piazza
    ⟨RIFIUTATA: battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo⟩
[usa] nar_segno_3
    ⟨pre-scritta⟩ [narratore] La campana suona un rintocco: Baldrin infila la chiave nella serratura, poi la toglie.
[narratore] Il paese se ne accorge: la finestra dell'osteria trema, e dalla strada arrivano passi e voci che si fermano sotto il portico.
[png_baldrin] Quando suona, il paese entra. Fino ad allora la porta resta chiusa, sorella.
[invito] pg_teodora,pg_ginestra,pg_corrado
```

- righe pre-scritte 1, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_teodora","pg_ginestra","pg_corrado"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2062 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073795

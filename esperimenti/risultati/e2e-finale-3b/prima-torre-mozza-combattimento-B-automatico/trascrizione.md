# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-15T22:13:26.198Z · PG: pg_livia, pg_nespola, pg_eliandro

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
- pg_livia: «Berta, la torre è quella sopra il bosco? Ci andiamo adesso, prima di mezzanotte.»
- pg_nespola (privata): «Ugo, a parte, a bassa voce: «Tonio è vivo? Dimmi la verità, cmq non dico niente.»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia chiede a Berta se la torre è quella sopra il bosco. Berta stringe la chiave e annuisce.
[png_berta] Quella. Sopra il bosco, dove finiscono le pecore. Ci andate adesso, o aspettate la notte?
[narratore] Ugo sputa di nuovo e torna a caricare il carbone sul mulo, senza guardare nessuno.
[narratore] Nespola si avvicina a Ugo e gli parla a bassa voce, sotto il rumore del mulo.
[usa] ugo_notte_promessa > pg_nespola
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di ugo_notte_promessa (prometto, giuro, balivo, parola) è nell'azione⟩
[privato pg_nespola] Ugo non dice niente di Tonio, ma abbassa lo sguardo sulla fune del mulo e per un attimo smette di fingere. Tonio è vivo: lo capisci dal modo in cui non lo dice.
[atteggiamento] png_ugo pg_nespola amichevole
[usa] tr_bosco
    ⟨pre-scritta⟩ [narratore] Sotto i faggi il buio arriva di colpo.
    ⟨pre-scritta⟩ [narratore] L'odore di fumo cresce a ogni passo, e da lontano si sente sibilare una carbonaia.
[narratore] Eliandro resta sotto il portico, con il quaderno aperto e la penna sospesa.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 2, improvvisate 7, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 5386 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00052655

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro chiede a Berta chi a Spinalba sa scrivere così bene le lettere comuni. Lo dice piano, senza che gli altri lo sentano.
[png_berta] [pause] Qui le lettere le sa scrivere il prete, e basta. Chi altro vuoi che le scriva?
[privato pg_eliandro] La grafia sulla lavagna ha le aste dritte e le curve strette, come quelle delle scuole di valle. Non è una mano di paese.
[narratore] Livia e Nespola restano dove sono, e il vento porta dal crinale l'odore di fumo.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 4
- primo audio dalla chiusura della finestra: 5101 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00045735

## Turno 3 — evento mondo

## Turno 3 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 4

Azioni:
- pg_nespola: «Corro avanti sul sentiero, mi fermo ogni dieci passi per ascoltare.»
- pg_livia: «Scendo per prima, scudo avanti, guardo i rami sopra la testa.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola corre avanti sul sentiero e si ferma ogni dieci passi. Livia scende per prima, scudo avanti, gli occhi sui rami.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Livia scende lungo il sentiero con lo scudo alzato, controllando i rami sopra la testa. Non c'è niente di strano, solo il fruscio del vento tra le foglie.
[narratore] Ugo, dalla radura, alza lo sguardo verso Nespola e dice qualcosa a bassa voce.
[png_ugo] Piano coi piedi, piccola. Il sentiero non perdona chi cammina forte.
[invito] pg_livia, pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2577 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00051223

## Turno 5 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 6

Azioni:
- pg_eliandro: «Io sono lento, resto dietro la pietra e tiro quando vi siete mossi.»
- pg_livia: «Vedo tre goblin davanti alla porta. Io carico dopo di lei, scudo avanti.»
- pg_nespola: «Io sono la più veloce di tutti, vado per prima: passo di lato prima che arrivi.»

Narratore:

```text
[narratore] Eliandro resta dietro la pietra, il quaderno stretto sotto il braccio, e aspetta che il gruppo si muova.
[narratore] Nespola passa di lato prima che i goblin arrivino, rapida come un'ombra, e il colpo di Livia sulla porta resta a vuoto: lo scudo di Zirrà, dipinto di rosso, devia la spada.
[narratore] Zirrà ride corto, batte la spada corta sullo scudo e fa un passo avanti.
[usa] zir_chiave_prima > pg_livia
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2161 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00055579

## Turno 7

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale da dietro la pietra. La lama fischia tra le ombre e si ferma contro lo scudo di Zirrà: la goblin ride, senza nemmeno spostarsi.
[narratore] Nespola guarda il pugnale che rimbalza sul selciato e si gratta la testa, mentre Grosso si alza lento dal fuoco con la mazza in mano.
[png_zirra] Il vostro amico ha la mira di un topo ubriaco! La chiave l'avete? Niente chiave, niente ragazzo.
[usa] zir_chiave_prima
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 5322 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00056899

## Turno 8

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola scatta alle spalle del goblin a destra, la spada corta affonda nella schiena di Zirrà.
[narratore] La goblin urla, barcolla e si stacca dallo scudo. Il colpo è andato a segno: ferita, ma in piedi.
[narratore] Grosso brandisce la mazza verso Nespola, che si scansa, ma la mazza sfiora il selciato senza colpire.
[narratore] Zirrà, con il fianco sanguinante, ringhia e fa roteare la spada corta. Il colpo arriva sulla spalla di Nespola: la halfling barcolla, due punti di vita rimasti.
[png_zirra] Ahi, ahi! Piccola ladra, ti costa cara la tua schiena!
[narratore] Livia, lo scudo alzato, avanza verso la porta, mentre Eliandro resta nascosto dietro la pietra.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2570 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00067969

## Turno 9

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e carica Grosso con la spada lunga. Il colpo fende l'aria, ma l'hobgoblin si scansa di lato e la lama sfiora il fango.
[png_grosso] Fame. Hai carne?
[narratore] Grosso si lecca le dita e torna a fissare Livia, la mazza ancora bassa.
[narratore] Zirrà ride e batte la spada corta sullo scudo, guardando Nespola con aria di sfida.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2414 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061439

## Turno 10

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola affonda la spada corta nella schiena di Grosso, e l'hobgoblin cade di faccia nel fango accanto al fuoco. Non si rialza.
[narratore] Zirrà vede il suo compagno a terra e la risata le muore in gola. Stringe lo scudo, guarda Nespola, poi guarda la scala rotta.
[narratore] Un colpo secco di spada corta le sfiora la spalla: Zirrà gira su se stessa e la lama scivola sulla pietra con un suono di ferro.
[narratore] Ora Nespola sta arretrando, e il colpo le lascia la spalla sanguinante.
[narratore] Livia fa un passo avanti, lo scudo alto, pronta a caricare.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 2879 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070339

## Turno 11

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e incassa la lancia del goblin: il colpo sbatte contro il legno e la punta scivola via di lato.
[narratore] Zirrà ride corto, abbassa la lancia e torna a battere la spada corta sullo scudo.
[narratore] Sui gradini della cantina Tonio tira la corda ai polsi e guarda Livia, senza dire niente.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2531 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065889

## Turno 12

Azioni:
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale da dietro la pietra, di nuovo. La lama fischia nell'aria, ma il goblin si gira all'ultimo momento.
[narratore] Il pugnale non trova la schiena: schiva con un passo di lato e la lama rimbalza sul muro della torre.
[narratore] Zirrà ride corto e fa un passo avanti, lo scudo rosso alzato.
[png_zirra] Mira da topo, eh? Vuoi ancora giocare, mezzo elfo?
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3281 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070939

## Turno 13

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tende la mano, il quaderno a terra, e il dardo incantato parte dalle sue dita.
[narratore] Il dardo colpisce Zirrà al fianco: la goblin urla, barcolla e cade in ginocchio sul selciato, lo scudo rosso che rotola via.
[narratore] Zirrà sta ferita, ma respira ancora. Guarda Eliandro, poi Nespola a terra, con occhi che fanno i conti.
[png_zirra] Ah, il topo ha imparato a fare magie! Ma io non sono ancora morta.
[narratore] Livia avanza, lo scudo alto, mentre Tonio sui gradini della cantina si stringe alla pietra.
[narratore] Nespola è a terra, e la spalla le sanguina. Il pugnale da lancio è ancora sul selciato, a un passo.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 5188 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00076739

## Turno 14

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola sente il colpo alla spalla, il sangue caldo che le scende lungo il braccio. Resta in piedi, stringendo i denti.
[narratore] Zirrà, con lo scudo rosso a terra, guarda la ferita della halfling e ride corto.
[png_zirra] Ancora in piedi, piccola? Bene. Così dura di più il gioco.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 4265 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00068369

## Turno 15

Azioni:
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti spinge il goblin contro il muro con lo scudo e lo colpisce.
[narratore] Il colpo di Livia non trova Zirrà: la goblin si sposta di lato, e lo scudo di Livia sbatte contro la pietra.
[narratore] Zirrà ringhia e ti risponde con un fendente di spada corta che sfiora la tua spalla, senza entrare.
[narratore] Nespola, a terra, guarda il sangue sulla spalla e ti fa cenno di non muoverti troppo.
[usa] nar_mappa > pg_livia
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda da vicino i segni a carbone sul muro» solo: muro⟩
[narratore] Sul muro, accanto al fuoco, i segni a carbone sono più chiari da vicino: sono tracce di una mano che ha scritto in fretta.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3217 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00078079

## Turno 16

Azioni:
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia si china su Nespola, la trascina dietro lo scudo e la copre con il proprio corpo. La halfling geme, ma respira.
[narratore] Zirrà ride corto, ferita al fianco, e fa un passo indietro verso la scala rotta, lo scudo rosso ancora a terra.
[png_zirra] Ah, la cavaliera si fa da balia! Bella scena. Ma la chiave, dov'è?
[narratore] Eliandro, dietro la pietra, stringe il quaderno e aspetta.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 5383 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00069889

## Turno 17

Azioni:
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola striscia dietro la pietra, la spalla che perde sangue a ogni movimento.
[narratore] Zirrà ride corto dalla scala rotta, lo scudo rosso ancora a terra.
[png_zirra] Striscia, piccola ladra. Striscia pure.
[narratore] Eliandro, il quaderno sotto il braccio, sente il fiato corto della halfling vicino a sé.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3207 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00067559

## Turno 18

Azioni:
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro arretra verso la scala con il quaderno stretto al petto, un passo alla volta.
[narratore] Zirrà vede il movimento e scatta avanti, la spada corta in pugno. Il colpo viene parato male: la lama sfiora Livia, che resta in piedi con lo scudo.
[narratore] Zirrà sembra cercare un'altra via, e il sangue le scende ancora dal fianco.
[narratore] Il fuoco crepita dietro di loro, e sulla scala rotta non c'è più nessuno a dare ordini.
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3316 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00070869

## Turno 19

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] La torre tace. Dal buco nel muro arriva solo il vento freddo che scende dal crinale.
[usa] nar_attesa_torre
    ⟨pre-scritta⟩ [narratore] Il fuoco si abbassa, e le ombre dei muri si allungano. In alto, da qualche parte, cade un sasso.
[narratore] Zirrà, sulla scala rotta, si pulisce il sangue dal fianco con il dorso della mano e vi guarda dall'alto.
[usa] zir_attesa
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[invito] tutti
```

- righe pre-scritte 3, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1340 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061989

## Turno 20

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza la voce verso il buio della scala. Il suo grido rimbalza sui muri della torre.
[narratore] Zirrà ride corto e il ghigno le resta sul viso mentre scuote la testa.
[narratore] Zirrà scivola per un passo verso la scala rotta, e la spada corta le si alza nella mano.
[narratore] Ma il suo colpo a Livia manca di un palmo. La lama batte contro lo scudo, senza entrare.
[narratore] Eliandro, dietro la pietra, sente il sangue di Nespola e stringe il quaderno più forte.
[narratore] Sui gradini Tonio si tira indietro contro la pietra, e nessuno gli dice di stare fermo.
[narratore] Il fuoco crepita e la scala rotta sembra più alta di prima.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2717 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075279

## Turno 21

Azioni:
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale verso la scala. La lama fischia nell'aria, ma Zirrà ha già girato le spalle alla cantina e il pugnale si conficca nello stipite, a un palmo dalla sua testa.
[narratore] Zirrà si ferma sul gradino, la spada corta in mano, e guarda Eliandro con gli occhi gialli stretti.
[png_zirra] Mira da topo anche oggi. Ma le mire non pagano il conto.
[narratore] Sul muro accanto alla porta di ferro della cripta, dove prima c'erano solo pietre, si vedono graffi fitti, come se qualcuno avesse contato i giorni con la punta di un chiodo.
[usa] nar_conto > pg_eliandro
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda il muro accanto alla porta di ferro» solo: canti⟩
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2680 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00074129

## Turno 22

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Dal fondo della cantina arriva un rumore di pietra smossa, come un piccone che batte piano contro il muro.
[usa] nar_piccone
    ⟨pre-scritta⟩ [narratore] Zirrà schiocca le dita.
    ⟨pre-scritta⟩ [narratore] Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.
[narratore] Zirrà si volta verso la scala e per un attimo dimentica di guardarvi.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 1589 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00059879

## Turno 23

Azioni:
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro lascia il quaderno accanto al fuoco e torna da Nespola, strisciando sul selciato.
[narratore] Le scioglie il laccio della giacca e le stringe la spalla con la sciarpa, forte, mentre lei stringe i denti.
[narratore] Dalla scala arriva lo scontro di Livia con Zirrà: lo scudo sbatte contro la pietra, poi un altro colpo.
[narratore] Sui gradini, Tonio con il piccone nelle mani guarda la sciarpa e la halfling, senza dire nulla.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3671 ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0.00069929

## Turno 24

Azioni:
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia abbassa lo scudo di un dito e guarda il goblin che esita.
[narratore] Livia colpisce Zirrà con la spada lunga. Il fendente entra nel fianco, e la goblin cade in ginocchio sul selciato.
[narratore] Zirrà resta a terra, la spada corta ancora in pugno, e non si muove più.
[narratore] Il secondo goblin, quello che esitava, lascia cadere la mazza e si schiaccia contro la parete.
[narratore] Dietro la pietra Nespola stringe la sciarpa di Eliandro sulla spalla, e chiude gli occhi.
[narratore] Eliandro resta accanto a lei, mentre il fuoco crepita e Tonio, sui gradini, stringe il piccone.
[narratore] Il silenzio torna nella torre, rotto solo dal vento che scende dal crinale.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 5431 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075919

## Turno 25

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_eliandro: «Lo tengo fermo col piede e chiedo: «Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia abbatte lo scudo sul goblin davanti a lei, e la lancia cade con un suono secco sul selciato. Il colpo di spada lunga lo ferma prima che si rialzi.
[narratore] Eliandro preme il piede sulla mano del goblin e si china, abbassando la voce.
[narratore] Il goblin sputa sangue e fissa il piede, e Tonio, in fondo ai gradini, stringe il piccone un po' più forte.
[usa] nar_tonio_parla > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Il ragazzo tiene gli occhi bassi e parla piano.
    ⟨pre-scritta⟩ [narratore] Dice che la decima non è pagata. Alla prima neve, dice, il balivo si prende l'ovile.
    ⟨pre-scritta⟩ [narratore] Dice che l'argento della cripta era l'unico modo, e che sua madre non doveva saperlo.
[narratore] Nespola, ancora a terra con la sciarpa stretta sulla spalla, alza lo sguardo verso la scala.
[invito] pg_eliandro, pg_nespola
```

- righe pre-scritte 3, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_eliandro","pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2380 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00072619

## Turno 26

Azioni:
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro, piano, chiede al goblin chi gli dà ordini. Il goblin non risponde, ma la sua mano si stringe sotto il piede.
[narratore] Livia spinge lo scudo contro l'ultimo goblin e lo blocca alla porta. Il legno geme, il goblin non riesce a muoversi.
[privato pg_eliandro] La tua domanda scivola via: il goblin ti guarda e non dice nulla, per paura di chi lo comanda.
[png_zirra] Morta e ancora ha paura del capo. Brutta cosa, vero?
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 2
- primo audio dalla chiusura della finestra: 3350 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00073939

## Turno 27

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia tiene la spada puntata alla gola del goblin, lo scudo premuto contro la porta.
[png_zirra] Zirrà è morta, Livia. Il goblin, invece, ha ancora fiato.
[narratore] Il goblin deglutisce, lo sguardo che corre dalla spada al piede di Eliandro e ritorna.
[narratore] Livia sente il goblin tremare sotto la punta della lama, e il respiro si fa corto.
[narratore] Il goblin non alza la voce, ma la sua mano si chiude sul selciato, come se volesse nascondere qualcosa.
[narratore] Sui gradini Tonio stringe il piccone e non dice niente.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia"]; anomalie: 6
- primo audio dalla chiusura della finestra: 3545 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00075019

# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T11:24:55.209Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[narratore] Livia Sarti: «La torre è quella sopra il bosco».
[usa] fin_ovile_senza > pg_livia
    ⟨pre-scritta⟩ [narratore] Il sentiero entra nel bosco subito dietro il fienile.
    ⟨pre-scritta⟩ [narratore] Berta resta sotto il portico, con la chiave stretta nel pugno. Tra i faggi, il mulo di Ugo è già un'ombra.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 837 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 2 — evento sceneggiatore

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0

## Turno 3 — evento mondo

## Turno 3 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 3 — evento sceneggiatore

## Turno 4 — evento sceneggiatore

## Turno 4 — evento sceneggiatore

## Turno 4

Azioni:
- pg_nespola: «Corro avanti sul sentiero, mi fermo ogni dieci passi per ascoltare.»
- pg_livia: «Scendo per prima, scudo avanti, guardo i rami sopra la testa.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Corro avanti sul sentiero».
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Livia Sarti: «Scendo per prima, scudo avanti».
[usa] nar_attesa_carbonaia > pg_livia
    ⟨pre-scritta⟩ [narratore] Un ciocco crolla dentro la carbonaia, e la terra si crepa. Un filo di fumo bianco sale dritto tra i faggi.
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 398 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 731 ms); costo $0

## Turno 5 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 5 — evento sceneggiatore

## Turno 6 — evento sceneggiatore

## Turno 6 — evento sceneggiatore

## Turno 6

Azioni:
- pg_eliandro: «Io sono lento, resto dietro la pietra e tiro quando vi siete mossi.»
- pg_livia: «Vedo tre goblin davanti alla porta. Io carico dopo di lei, scudo avanti.»
- pg_nespola: «Io sono la più veloce di tutti, vado per prima: passo di lato prima che arrivi.»

Narratore:

```text
[narratore] Eliandro: «Io sono lento, resto dietro la pietra e tiro».
[usa] nar_piccone > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Zirrà schiocca le dita.
    ⟨pre-scritta⟩ [narratore] Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.
[narratore] Livia Sarti: «Vedo tre goblin davanti alla porta».
[usa] nar_attesa_torre > pg_livia
    ⟨pre-scritta⟩ [narratore] Il fuoco si abbassa, e le ombre dei muri si allungano. In alto, da qualche parte, cade un sasso.
[narratore] Nespola Tondi: «Io sono la più veloce di tutti, vado per prima».
[usa] gro_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Grosso succhia l'osso, con un rumore lungo.
    ⟨pre-scritta⟩ [png_grosso] Fame. Sempre fame.
[invito] tutti
```

- righe pre-scritte 5, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1516 ms); costo $0

## Turno 7

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Il goblin a destra ha la schiena scoperta».
[usa] zir_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 401 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 151 ms); costo $0

## Turno 8 — evento sceneggiatore

## Turno 8 — evento sceneggiatore

## Turno 8

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Carico quello al centro, spada lunga e scudo davanti».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 2 (in frase 0, tra frasi 2, silenzio 3500 ms); costo $0

## Turno 9 — evento sceneggiatore

## Turno 9 — evento sceneggiatore

## Turno 9 — evento violazione

## Turno 9 — evento sceneggiatore

## Turno 9 — evento sceneggiatore

## Turno 9 — evento sceneggiatore

## Turno 9 — evento sceneggiatore

## Turno 9

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Tiro il pugnale da dietro la pietra».
[usa] sc_subito_t6_mwj6ka4r_9_1 > pg_eliandro
    ⟨pre-scritta⟩ [narratore] La spada corta batte sullo scudo rosso, un colpo secco che rimbalza sui muri.
    ⟨pre-scritta⟩ [png_zirra] Tre? Due, scudo bianco! Sai contare, o solo correre?
    ⟨pre-scritta⟩ [narratore] Grosso lascia l'osso sul sasso e solleva la mazza ferrata.
[invito] tutti
```

- righe pre-scritte 3, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 6 (in frase 0, tra frasi 6, silenzio 5951 ms); costo $0

## Turno 10 — evento sceneggiatore

## Turno 10

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Lo colpisco ancora, poi mi sposto e lo lascio dietro».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 824 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 11 — evento sceneggiatore

## Turno 11 — evento violazione

## Turno 11 — evento sceneggiatore

## Turno 11

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Il goblin mi tira la lancia».
[usa] sc_prossime_t9_mwj6mrru_16_01 > pg_livia
    ⟨pre-scritta⟩ [narratore] Zirrà para con lo scudo rosso e ride corto.
    ⟨pre-scritta⟩ [png_zirra] Scudo bianco non si bucca! Riprova, mezza misura.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 9 (in frase 0, tra frasi 9, silenzio 4540 ms); costo $0

## Turno 12 — evento sceneggiatore

## Turno 12

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Il goblin mi prende alla spalla, sento sangue».
[usa] sc_prossime_t8_mwj6ljvh_15_03 > pg_nespola
    ⟨pre-scritta⟩ [narratore] Zirrà si volta verso i gradini della cantina, dove Tonio alza la testa.
    ⟨pre-scritta⟩ [png_zirra] Il ragazzo resta mio. Un passo e Grosso si alza.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 818 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 13 — evento sceneggiatore

## Turno 13 — evento violazione

## Turno 13 — evento conferma_motore

## Turno 13

Azioni:
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Spingo il goblin contro il muro con lo scudo».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 1
- primo audio dalla chiusura della finestra: null ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1542 ms); costo $0

## Turno 14 — evento sceneggiatore

## Turno 14 — evento sceneggiatore

## Turno 14 — evento violazione

## Turno 14

Azioni:
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Ho zero punti ferita, sono a terra».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 1
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 15 — evento sceneggiatore

## Turno 15 — evento sceneggiatore

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Mi chino su Nespola, la trascino dietro lo scudo».
[usa] sc_subito_t8_mwj6ljvf_14_1 > pg_livia
    ⟨pre-scritta⟩ [narratore] L'hobgoblin si rizza di scatto accanto al fuoco, la mazza ferrata già in pugno.
    ⟨pre-scritta⟩ [png_grosso] Vieni. Mazza pesante.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1441 ms); costo $0

## Turno 16

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Goblin».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 396 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 1100 ms); costo $0

## Turno 17 — evento sceneggiatore

## Turno 17 — evento violazione

## Turno 17 — evento conferma_motore

## Turno 17 — evento violazione

## Turno 17 — evento violazione

## Turno 17 — evento sceneggiatore

## Turno 17 — evento sceneggiatore

## Turno 17

Azioni:
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Il goblin davanti esita, guarda il compagno».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 1
- primo audio dalla chiusura della finestra: 396 ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1611 ms); costo $0

## Turno 18 — evento sceneggiatore

## Turno 18 — evento sceneggiatore

## Turno 18

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Non si ferma nessuno: finisco quello con la lancia».
[usa] sc_prossime_t14_mwj6qg77_24_01 > pg_livia
    ⟨pre-scritta⟩ [narratore] La mazza ferrata sibila nell'aria e ricade sulle pietre.
    ⟨pre-scritta⟩ [png_grosso] Fame. Hai carne?
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 4 (in frase 0, tra frasi 4, silenzio 2055 ms); costo $0

## Turno 19 — evento sceneggiatore

## Turno 19

Azioni:
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Ultimo goblin: lo blocco contro la porta con lo scudo».
[usa] sc_prossime_t9_mwj6mrru_16_03 > pg_livia
    ⟨pre-scritta⟩ [narratore] Dalla cantina arriva un sussurro basso, dietro la porta di ferro.
    ⟨pre-scritta⟩ [narratore] Dal fuoco non si capisce nulla, ma il fiato freddo porta un odore di pelo bagnato.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 393 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 701 ms); costo $0

## Turno 20 — evento sceneggiatore

## Turno 20

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 396 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 705 ms); costo $0

## Turno 21 — evento sceneggiatore

## Turno 21

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 379 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 716 ms); costo $0

## Turno 22 — evento sceneggiatore

## Turno 22 — evento violazione

## Turno 22 — evento sceneggiatore

## Turno 22

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 399 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 340 ms); costo $0

## Turno 23 — evento sceneggiatore

## Turno 23 — evento violazione

## Turno 23

Azioni:
- pg_eliandro: (nessuna azione)
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Non agisce, è a terra, privo di sensi».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 827 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 24 — evento sceneggiatore

## Turno 24

Azioni:
- pg_eliandro: (nessuna azione)
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Non agisce, è a terra, privo di sensi».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 826 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 25 — evento sceneggiatore

## Turno 25

Azioni:
- pg_eliandro: (nessuna azione)
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Non agisce, è a terra, privo di sensi».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 830 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 26 — evento sceneggiatore

## Turno 26

Azioni:
- pg_eliandro: (nessuna azione)
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Non agisce, è a terra, privo di sensi».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 828 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 27 — evento sceneggiatore

## Turno 27

Azioni:
- pg_eliandro: (nessuna azione)
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Non agisce, è a terra, privo di sensi».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 826 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 28 — evento sceneggiatore

## Turno 28

Azioni:
- pg_eliandro: (nessuna azione)
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Non agisce, è a terra, privo di sensi».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 827 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 29 — evento sceneggiatore

## Turno 29

Azioni:
- pg_eliandro (privata): (nessuna azione)
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi null (in frase null, tra frasi null, silenzio null ms); costo $0

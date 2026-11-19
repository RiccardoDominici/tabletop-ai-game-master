# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-19T08:41:44.557Z · PG: pg_livia, pg_nespola, pg_eliandro

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

## Turno 1 — evento risposta_privata_motore

## Turno 1

Azioni:
- pg_livia: «Berta, la torre è quella sopra il bosco? Ci andiamo adesso, prima di mezzanotte.»
- pg_nespola (privata): «Ugo, a parte, a bassa voce: «Tonio è vivo? Dimmi la verità, cmq non dico niente.»»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Ci andiamo adesso, prima di mezzanotte».
[usa] fin_ovile_senza > pg_livia
    ⟨pre-scritta⟩ [narratore] Il sentiero entra nel bosco subito dietro il fienile.
    ⟨pre-scritta⟩ [narratore] Berta resta sotto il portico, con la chiave stretta nel pugno. Tra i faggi, il mulo di Ugo è già un'ombra.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 857 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 2 — evento sceneggiatore

## Turno 2 — evento risposta_privata_motore

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

## Turno 3 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 3 — evento sceneggiatore

## Turno 3 — evento sceneggiatore

## Turno 4 — evento sceneggiatore

## Turno 4 — evento conferma_motore

## Turno 4

Azioni:
- pg_nespola: «Corro avanti sul sentiero, mi fermo ogni dieci passi per ascoltare.»
- pg_livia: «Scendo per prima, scudo avanti, guardo i rami sopra la testa.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Corro avanti sul sentiero, mi fermo ogni dieci passi per ascoltare».
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: la prova dell'azione è fallita (prova, ascoltare): un rilascio non le risponde⟩
[narratore] Livia Sarti: «Scendo per prima, scudo avanti, guardo i rami sopra la testa».
[usa] nar_attesa_carbonaia > pg_livia
    ⟨pre-scritta⟩ [narratore] Un ciocco crolla dentro la carbonaia, e la terra si crepa. Un filo di fumo bianco sale dritto tra i faggi.
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 1/2, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 401 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 360 ms); costo $0

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
[narratore] Eliandro: «Resto dietro la pietra e tiro quando vi siete mossi».
[usa] nar_piccone > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Zirrà schiocca le dita.
    ⟨pre-scritta⟩ [narratore] Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.
[narratore] Livia Sarti: «Io carico dopo di lei, scudo avanti».
[usa] nar_attesa_torre > pg_livia
    ⟨pre-scritta⟩ [narratore] Il fuoco si abbassa, e le ombre dei muri si allungano. In alto, da qualche parte, cade un sasso.
[narratore] Nespola Tondi: «Vado per prima: passo di lato prima che arrivi».
[usa] gro_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Grosso succhia l'osso, con un rumore lungo.
    ⟨pre-scritta⟩ [png_grosso] Fame. Sempre fame.
[invito] tutti
```

- righe pre-scritte 5, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1580 ms); costo $0

## Turno 7 — evento sceneggiatore

## Turno 7 — evento sceneggiatore

## Turno 7

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Carico quello al centro, spada lunga e scudo davanti».
[usa] ton_attesa > pg_livia
    ⟨pre-scritta⟩ [narratore] Il ragazzo alza gli occhi, poi li riabbassa.
    ⟨pre-scritta⟩ [png_tonio] La chiave. L'avete portata?
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 399 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 259 ms); costo $0

## Turno 8 — evento sceneggiatore

## Turno 8 — evento sceneggiatore

## Turno 8 — evento sceneggiatore

## Turno 8

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia».
[usa] zir_attesa > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 9 — evento conferma_motore

## Turno 9 — evento violazione

## Turno 9 — evento sceneggiatore

## Turno 9 — evento sceneggiatore

## Turno 9

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Colpo alle spalle con la spada corta».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 6 (in frase 0, tra frasi 6, silenzio 1856 ms); costo $0

## Turno 10

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «La paro con lo scudo. Resisto».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 825 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 11 — evento sceneggiatore

## Turno 11 — evento conferma_motore

## Turno 11 — evento sceneggiatore

## Turno 11 — evento sceneggiatore

## Turno 11 — evento sceneggiatore

## Turno 11

Azioni:
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Pugnale ancora».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 6 (in frase 0, tra frasi 6, silenzio 1653 ms); costo $0

## Turno 12 — evento sceneggiatore

## Turno 12 — evento sceneggiatore

## Turno 12 — evento conferma_motore

## Turno 12

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Lancio il dardo incantato al goblin che la sta per colpire».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 207 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 489 ms); costo $0

## Turno 13 — evento sceneggiatore

## Turno 13 — evento violazione

## Turno 13 — evento sceneggiatore

## Turno 13

Azioni:
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Spingo il goblin contro il muro con lo scudo e lo colpisco».
[usa] nar_mappa > pg_livia
    ⟨pre-scritta⟩ [narratore] La scala rotta regge sotto il peso, e dal crollo entra un vento freddo che sa di crinale.
[invito] tutti
```

- righe pre-scritte 1, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1571 ms); costo $0

## Turno 14 — evento sceneggiatore

## Turno 14 — evento sceneggiatore

## Turno 14

Azioni:
- pg_livia: «Mi chino su Nespola, la trascino dietro lo scudo e la copro.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Mi chino su Nespola, la trascino dietro lo scudo e la copro».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 824 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 15 — evento sceneggiatore

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Mi ritiro verso la scala, arretro di tre passi col quaderno stretto al petto».
[usa] sc_prossime_t10_mwnb4yxv_19_06 > pg_eliandro
    ⟨pre-scritta⟩ [narratore] La porta di ferro è fredda al tatto, e dal buco nel muro arriva un fiato d'aria gelata.
[invito] tutti
```

- righe pre-scritte 1, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1712 ms); costo $0

## Turno 16 — evento sceneggiatore

## Turno 16 — evento violazione

## Turno 16 — evento sceneggiatore

## Turno 16

Azioni:
- pg_livia: «Ehi goblin! Chi vi paga? Fermatevi, e nessuno si fa più male!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti dice: «Chi vi paga?».
[usa] sc_prossime_t10_mwnb4yxv_19_05 > pg_livia
    ⟨pre-scritta⟩ [png_zirra] Minacce, a me? Un passo avanti e Grosso si sveglia.
[invito] tutti
```

- righe pre-scritte 1, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 393 ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1477 ms); costo $0

## Turno 17 — evento sceneggiatore

## Turno 17 — evento conferma_motore

## Turno 17 — evento violazione

## Turno 17

Azioni:
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Non lo colpisco ancora, aspetto la risposta».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 7 (in frase 0, tra frasi 7, silenzio 2290 ms); costo $0

## Turno 18 — evento sceneggiatore

## Turno 18 — evento sceneggiatore

## Turno 18

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Finisco quello con la lancia, colpo di spada lunga».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 2 (in frase 0, tra frasi 2, silenzio 634 ms); costo $0

## Turno 19 — evento sceneggiatore

## Turno 19 — evento sceneggiatore

## Turno 19 — evento violazione

## Turno 19

Azioni:
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Ultimo goblin: lo blocco contro la porta con lo scudo».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 394 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 943 ms); costo $0

## Turno 20 — evento sceneggiatore

## Turno 20 — evento risposta_privata_motore

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
- primo audio dalla chiusura della finestra: null ms; buchi 2 (in frase 0, tra frasi 2, silenzio 839 ms); costo $0

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
- primo audio dalla chiusura della finestra: 379 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 962 ms); costo $0

## Turno 22 — evento sceneggiatore

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
- primo audio dalla chiusura della finestra: 382 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 961 ms); costo $0

## Turno 23 — evento sceneggiatore

## Turno 23

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 383 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 936 ms); costo $0

## Turno 24 — evento sceneggiatore

## Turno 24

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 377 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 921 ms); costo $0

## Turno 25

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 390 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 931 ms); costo $0

## Turno 26 — evento sceneggiatore

## Turno 26 — evento sceneggiatore

## Turno 26

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 378 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 939 ms); costo $0

## Turno 27 — evento sceneggiatore

## Turno 27

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 380 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 943 ms); costo $0

## Turno 28

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 380 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 936 ms); costo $0

## Turno 29 — evento sceneggiatore

## Turno 29 — evento sceneggiatore

## Turno 29

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 379 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 929 ms); costo $0

## Turno 30 — evento violazione

## Turno 30

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 387 ms; buchi 4 (in frase 0, tra frasi 4, silenzio 1261 ms); costo $0

## Turno 31 — evento sceneggiatore

## Turno 31 — evento sceneggiatore

## Turno 31

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 389 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 945 ms); costo $0

## Turno 32 — evento violazione

## Turno 32 — evento sceneggiatore

## Turno 32

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sconfitta_grosso

```text
⟨pre-scritta⟩ [narratore] Grosso vi guarda a lungo, poi torna al fuoco e al suo osso.
⟨pre-scritta⟩ [narratore] La notte passa sulla torre. Vi sveglia il freddo, prima dell'alba.
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 5 (in frase 0, tra frasi 5, silenzio 1468 ms); costo $0

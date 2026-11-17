# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T23:53:26.583Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[narratore] Livia Sarti dice: «Ci andiamo adesso, prima di mezzanotte».
[usa] nar_cani_scappano > pg_livia
    ⟨pre-scritta⟩ [narratore] Un cane spalanca con il muso la porta del fienile e corre al sentiero, scodinzolando.
    ⟨pre-scritta⟩ [narratore] Al limite degli alberi si ferma, si volta e aspetta.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 856 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 2 — evento sceneggiatore

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
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 3 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 3 — evento sceneggiatore

## Turno 4 — evento sceneggiatore

## Turno 4 — evento conferma_motore

## Turno 4 — evento sceneggiatore

## Turno 4

Azioni:
- pg_nespola: «Corro avanti sul sentiero, mi fermo ogni dieci passi per ascoltare.»
- pg_livia: «Scendo per prima, scudo avanti, guardo i rami sopra la testa.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi dice: «Corro avanti sul sentiero, mi fermo ogni dieci passi per ascoltare».
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Livia Sarti dice: «Scendo per prima, scudo avanti, guardo i rami sopra la testa».
[usa] nar_attesa_carbonaia > pg_livia
    ⟨pre-scritta⟩ [narratore] Un ciocco crolla dentro la carbonaia, e la terra si crepa. Un filo di fumo bianco sale dritto tra i faggi.
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 1/2, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 819 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

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
[narratore] Eliandro dice: «Resto dietro la pietra e tiro quando vi siete mossi».
[usa] nar_piccone > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Zirrà schiocca le dita.
    ⟨pre-scritta⟩ [narratore] Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.
[narratore] Livia Sarti dice: «Io carico dopo di lei, scudo avanti».
[usa] nar_attesa_torre > pg_livia
    ⟨pre-scritta⟩ [narratore] Il fuoco si abbassa, e le ombre dei muri si allungano. In alto, da qualche parte, cade un sasso.
[narratore] Nespola Tondi dice: «Vado per prima: passo di lato prima che arrivi».
[usa] gro_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Grosso succhia l'osso, con un rumore lungo.
    ⟨pre-scritta⟩ [png_grosso] Fame. Sempre fame.
[invito] tutti
```

- righe pre-scritte 5, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 820 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 198 ms); costo $0

## Turno 7 — evento sceneggiatore

## Turno 7 — evento sceneggiatore

## Turno 7

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi dice: «Colpo alle spalle con la spada corta».
[usa] zir_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 828 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 8 — evento sceneggiatore

## Turno 8 — evento conferma_motore

## Turno 8 — evento sceneggiatore

## Turno 8 — evento sceneggiatore

## Turno 8

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro dice: «Tiro il pugnale da dietro la pietra, al goblin con la lancia».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 1 (in frase 0, tra frasi 1, silenzio 1587 ms); costo $0

## Turno 9 — evento conferma_motore

## Turno 9 — evento violazione

## Turno 9 — evento sceneggiatore

## Turno 9

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti dice: «Carico quello al centro, spada lunga e scudo davanti».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 825 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 596 ms); costo $0

## Turno 10 — evento sceneggiatore

## Turno 10 — evento sceneggiatore

## Turno 10 — evento sceneggiatore

## Turno 10 — evento conferma_motore

## Turno 10

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi dice: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 818 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 11 — evento sceneggiatore

## Turno 11

Azioni:
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro dice: «Pugnale ancora».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 813 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 12 — evento sceneggiatore

## Turno 12 — evento sceneggiatore

## Turno 12 — evento sceneggiatore

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti dice: «La paro con lo scudo. Resisto».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 820 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 892 ms); costo $0

## Turno 13 — evento violazione

## Turno 13

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi dice: «Indietreggio ma resto in piedi».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 820 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 14 — evento sceneggiatore

## Turno 14 — evento sceneggiatore

## Turno 14 — evento conferma_motore

## Turno 14 — evento violazione

## Turno 14 — evento sceneggiatore

## Turno 14 — evento sceneggiatore

## Turno 14

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro dice: «Lancio il dardo incantato al goblin che la sta per colpire».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 828 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 585 ms); costo $0

## Turno 15 — evento sceneggiatore

## Turno 15 — evento sceneggiatore

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_nespola: «Ho zero punti ferita, sono a terra. Non mi reggo più, striscio dietro la pietra.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi dice: «Non mi reggo più, striscio dietro la pietra».
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sconfitta_zirra

```text
⟨pre-scritta⟩ [narratore] Zirrà fruga nelle vostre bisacce, poi vi trascina giù per i gradini.
⟨pre-scritta⟩ [narratore] Vi lascia legati davanti alla porta di ferro, con la candela che si consuma.
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 2 (in frase 0, tra frasi 2, silenzio 769 ms); costo $0

# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-16T00:00:11.040Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[narratore] Livia chiede se la torre è quella sopra il bosco, e che ci vanno subito, prima di mezzanotte.
[png_berta] Quella. Sopra il bosco, dove stanno i rovi.
[narratore] Nespola si avvicina a Ugo, a voce bassa, e gli chiede se Tonio è vivo. Il carbonaio la guarda di sbieco e non dice nulla.
[privato pg_nespola] Ugo ti sfugge con lo sguardo: per un attimo ti sembra che tenga una parola in bocca, poi la ingoia con la saliva.
[narratore] Eliandro resta in disparte, con il quaderno chiuso sotto il braccio.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 2
- primo audio dalla chiusura della finestra: 2184 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00045597

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro chiede a Berta chi a Spinalba sappia scrivere così bene le lettere comuni.
[privato pg_eliandro] Chi ha scritto la lavagna ha imparato le lettere da un libro di preghiere, non da un maestro di valle: i tratti sono pieni e le aste dritte.
[narratore] Berta resta un momento con la chiave stretta nel pugno, poi scuote la testa.
[png_berta] Qui le lettere le sa scrivere solo il prete di Valdirame. Le pecore non ne hanno bisogno.
[narratore] Livia e Nespola aspettano, e nel cortile i cani continuano a grattare la porta del fienile.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 4
- primo audio dalla chiusura della finestra: 6508 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00045147

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
[narratore] Nespola corre avanti sul sentiero e si ferma ogni dieci passi, orecchie tese. Il bosco risponde solo col vento.
[narratore] Livia scende per prima, con lo scudo alzato e lo sguardo sui rami sopra la testa. Nessun rumore dall'alto.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Eliandro resta fermo accanto alla carbonaia, il quaderno ancora chiuso sotto il braccio.
[invito] pg_livia,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2870 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00047465

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
[narratore] Livia spalanca lo scudo e carica per prima, e il suo colpo di spada cerca Zirrà: la goblin lo schiva di un soffio.
[narratore] Eliandro resta dietro la pietra, il quaderno stretto al petto, e aspetta che il corridoio si liberi.
[narratore] Nespola tenta il passo di lato, ma il piede scivola sul gradino gelato e lei resta esposta sulla traiettoria.
[narratore] Grosso si alza con la mazza in pugno, e il fuoco gli illumina il muso di fango.
[narratore] Zirrà ride corto, batte la spada sullo scudo e scruta voi tre.
[png_zirra] La chiave l'avete? Niente chiave, niente ragazzo.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 2185 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00058521

## Turno 7

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia carica verso il centro, lo scudo alto e la spada lunga in pugno. Il colpo affonda nel fianco di Grosso, che cade sul fango con un grugnito, e l'osso gli scivola dalle dita.
[narratore] Zirrà fa un passo indietro, e sul gradino scivola il suo sorriso.
[narratore] Eliandro resta dietro la pietra, il quaderno ancora stretto al petto. Dalla cantina arriva un colpo sordo, poi silenzio.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 3302 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00055481

## Turno 8

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0; invito: null; anomalie: 3
- primo audio dalla chiusura della finestra: 2371 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 9 — evento sorvegliante

## Turno 10

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: null; anomalie: 2
- primo audio dalla chiusura della finestra: 3321 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 11

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 2/2, riparazioni 0; invito: null; anomalie: 1
- primo audio dalla chiusura della finestra: 2378 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 12

Azioni:
- pg_nespola: «Il goblin mi prende alla spalla, sento sangue. Indietreggio ma resto in piedi.»
- pg_livia: «Spingo il goblin contro il muro con lo scudo e lo colpisco.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 2/2, riparazioni 0; invito: null; anomalie: 2
- primo audio dalla chiusura della finestra: 2192 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 13 — evento sorvegliante

## Turno 14 — evento sorvegliante

## Turno 15

Azioni:
- pg_eliandro: «Dal gradino tiro il pugnale a quello che scappa verso la cantina.»
- pg_livia: «Il goblin davanti esita, guarda il compagno. Non lo colpisco ancora, aspetto la risposta.»
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/2, riparazioni 0; invito: null; anomalie: 1
- primo audio dalla chiusura della finestra: 2544 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 16

Azioni:
- pg_livia: «Non si ferma nessuno: finisco quello con la lancia, colpo di spada lunga.»
- pg_eliandro: «Torno da Nespola e le fascio la spalla con la mia sciarpa, mentre Livia combatte.»
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/2, riparazioni 0; invito: null; anomalie: 3
- primo audio dalla chiusura della finestra: 1794 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 17

Azioni:
- pg_eliandro: «Lo tengo fermo col piede e chiedo: «Dov'è il ragazzo?»»
- pg_livia: «Ultimo goblin: lo blocco contro la porta con lo scudo.»
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/2, riparazioni 0; invito: null; anomalie: 3
- primo audio dalla chiusura della finestra: 1923 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 18

Azioni:
- pg_livia (privata): «Piano al goblin, con la punta della spada: «Parla, e ti lascio andare. Dov'è il ragazzo?»»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 3
- primo audio dalla chiusura della finestra: 2581 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 19

Azioni:
- pg_eliandro (privata): «Anch'io gli parlo, piano: «Chi vi dà ordini? Dimmelo e scappa.»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 1
- primo audio dalla chiusura della finestra: 2547 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

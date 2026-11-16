# Trascrizione torre-mozza-combattimento-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-15T23:42:56.686Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[narratore] Livia chiede se la torre è quella sopra il bosco, e Berta annuisce senza alzare lo sguardo dalla chiave.
[png_berta] Quella. Il bosco la nasconde, ma la vedete dal crinale. Salite prima che il vento cambi.
[narratore] Nespola si avvicina a Ugo, a bassa voce, e il carbonaio scuote la testa senza rispondere.
[privato pg_nespola] Ugo ti guarda storto e borbotta che non sa niente. Mente, e ti accorgi che il sudore gli scende dalla fronte.
[narratore] Eliandro resta in disparte, a guardare i pali del cancello.
[invito] pg_livia,pg_eliandro
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia","pg_eliandro"]; anomalie: 1
- primo audio dalla chiusura della finestra: 1750 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00045347

## Turno 2

Azioni:
- pg_eliandro (privata): «Berta, a bassa voce: «Chi a Spinalba sa scrivere così bene le lettere comuni?»»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro chiede a Berta, a bassa voce, chi a Spinalba sa scrivere così bene le lettere comuni.
[privato pg_eliandro] Berta non sente la domanda. Ma dal fienile arriva un colpo secco, come di un'asse che cade.
[narratore] Livia e Nespola restano ferme in attesa che qualcuno decida per primo.
[invito] pg_livia,pg_nespola
```

- righe pre-scritte 0, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: ["pg_livia","pg_nespola"]; anomalie: 1
- primo audio dalla chiusura della finestra: 3192 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00039737

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
[narratore] Nespola corre avanti sul sentiero e si ferma ogni dieci passi, orecchie tese.
[narratore] Il sentiero è fangoso, e nel fango le impronte corrono davanti a lei senza fermarsi.
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[narratore] Livia scende per prima, lo scudo avanti, e alza gli occhi sui rami sopra la testa.
[narratore] Tra le foglie si vede solo buio fitto, e un ramo che oscilla piano, senza vento.
[narratore] Eliandro resta fermo accanto alla carbonaia, in attesa.
[narratore] Il fumo della carbonaia si piega verso il sentiero, e dalla capanna Ugo non si volta.
[narratore] Nespola, il sentiero sale ancora. Che cosa fai?
[invito] pg_nespola,pg_livia,pg_eliandro
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 7, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: ["pg_nespola","pg_livia","pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 64 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00052465

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
[narratore] Eliandro si nasconde dietro la pietra, con il quaderno stretto al petto. Livia, dopo aver colpito, cerca di recuperare la posizione.
[narratore] Livia sferra il colpo con la spada lunga, e il suo fendente va a vuoto: la lama fende l'aria accanto alla goblin, che ride forte e le fa il verso.
[png_zirra] Ehi, guarda, la gigantessa ha la spada lenta! Lenta come un bue dopo il raccolto.
[narratore] Nespola, a sinistra, passa di lato con un movimento silenzioso.
[narratore] Zirrà si volta svelta verso di lei, e il suo sguardo giallo cerca la chiave.
[png_zirra] Ma guarda la ladrunca! Vuoi qualcosa che luccica? La chiave l'avete? Niente chiave, niente ragazzo.
[narratore] Eliandro, dietro la pietra, tiene gli occhi fissi sulla goblin. Che cosa fai?
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: 4447 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00060941

## Turno 7

Azioni:
- pg_eliandro: «Tiro il pugnale da dietro la pietra, al goblin con la lancia.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale da dietro la pietra, verso il goblin con la lancia.
[narratore] La lama vola diritta, ma il goblin si piega di lato e il pugnale si conficca nel fango, dietro di lui.
[png_zirra] Ehi! Il bambino ha lanciato il cucchiaio!
[narratore] Zirrà ride corto, poi batte la spada sullo scudo, e la sua lama cerca Eliandro.
[narratore] Il colpo lo sfiora, e il mago arretra di un passo, con la schiena contro la pietra.
[narratore] Il fuoco della torre crepita, e Grosso si volta lento verso il rumore.
[narratore] Nespola, il goblin con la lancia sta per girarsi verso di te. Che fai?
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 7, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: 197 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00061441

## Turno 8

Azioni:
- pg_nespola: «Il goblin a destra ha la schiena scoperta: colpo alle spalle con la spada corta!»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi sgattaiola alle spalle del goblin di destra, la spada corta affonda sotto la scapola.
[narratore] Zirrà si irrigidisce. Lo scudo rosso le scivola di mano e cade nel fango.
[narratore] La goblin si piega in avanti, ansima, e si tiene il fianco con una mano.
[png_zirra] Ehi, la ladra scalza! Non mi giri le spalle! Ecco, mi hai cacciato il ferro dentro.
[narratore] Zirrà si ritrae di un passo verso la scala rotta. Il sangue le scorre tra le dita.
[usa] zir_chiave_prima
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di zir_chiave_prima (chiave, scambio, scambiare, consegno, consegnare) è nell'azione⟩
[narratore] Eliandro resta dietro la pietra, il quaderno stretto al petto. Livia si prepara a seguire.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00064121

## Turno 9

Azioni:
- pg_livia: «Carico quello al centro, spada lunga e scudo davanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia alza lo scudo e carica il goblin al centro, la spada lunga che fende l'aria.
[narratore] La sua lama affonda nel fianco di Grosso, che grugnisce e arretra di un passo.
[narratore] Grosso si volta lento verso di lei, la mazza ferrata che dondola.
[narratore] Il colpo arriva senza che Livia abbia il tempo di alzare lo scudo.
[narratore] Lei barcolla, il respiro corto, e il sangue le sporca la cotta di maglia.
[narratore] Eliandro, dietro la pietra, stringe il quaderno e guarda il fuoco.
[invito] pg_eliandro
```

- righe pre-scritte 0, improvvisate 6, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065611

## Turno 10

Azioni:
- pg_eliandro: «Pugnale ancora, il goblin si gira verso di me.»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Eliandro tira il pugnale verso Zirrà, e la lama le fende la spalla. Lei barcolla, il sangue le scorre sul braccio.
[png_zirra] Ehi! Il bambino ha tirato il cucchiaio, e ora mi ha punta la spalla!
[narratore] Zirrà si ritrae verso la scala rotta, con la mano premuta sulla ferita, mentre il fuoco crepita alle sue spalle.
[narratore] Nespola, Zirrà è ferita e indietreggia. Che fai?
[invito] pg_nespola
```

- righe pre-scritte 0, improvvisate 4, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_nespola"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00065961

## Turno 11

Azioni:
- pg_nespola: «Lo colpisco ancora, poi mi sposto e lo lascio dietro di me.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi scatta alle spalle di Zirrà, la spada corta che cerca la schiena scoperta.
[narratore] Ma la goblin si gira di colpo, lo scudo rosso già sollevato, e la lama scivola sul bordo senza far male.
[png_zirra] Ah! Ladruncola cieca, pensi che la schiena sia sempre la stessa?
[narratore] Zirrà ride corto, poi si ritrae verso la scala rotta, la ferita al fianco che le sporca il braccio.
[narratore] Eliandro, dietro la pietra, stringe il quaderno e aspetta. Livia non si è ancora mossa.
[invito] pg_livia
```

- righe pre-scritte 0, improvvisate 5, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_livia"]; anomalie: 0
- primo audio dalla chiusura della finestra: 24 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00069511

## Turno 12

Azioni:
- pg_livia: «Il goblin mi tira la lancia, la paro con lo scudo. Resisto.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti è a terra, col respiro corto e il sangue che le scorre sulla cotta. Respira ancora.
[narratore] Eliandro, dietro la pietra, stringe il quaderno e resta fermo.
[narratore] Zirrà ride corto e ti punta la spada corta, mentre Nespola le sfiora lo scudo.
[usa] zir_ragazzo_mio
    ⟨pre-scritta⟩ [narratore] Zirrà si gratta l'orecchio con la punta della spada e sorride storto.
    ⟨pre-scritta⟩ [png_zirra] Il ragazzo è mio. L'ho preso nel fienile, mentre dormiva.
[invito] pg_eliandro
```

- righe pre-scritte 2, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: ["pg_eliandro"]; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0.00069021

## Turno 13

Azioni:
- pg_eliandro: «Vedo Nespola a terra. Lancio il dardo incantato al goblin che la sta per colpire!»
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0; invito: null; anomalie: 1
- primo audio dalla chiusura della finestra: 12 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 14 — evento sorvegliante

## Turno 15 — evento sorvegliante

## Turno 16 — evento sorvegliante

## Turno 17 — evento sorvegliante

## Turno 18 — evento sorvegliante

## Turno 19 — evento sorvegliante

## Turno 20

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 3
- primo audio dalla chiusura della finestra: 32 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 21

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 3
- primo audio dalla chiusura della finestra: 127 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 22 — evento sorvegliante

## Turno 23

Azioni:
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 2
- primo audio dalla chiusura della finestra: 1624 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 24

Azioni:
- pg_eliandro: (nessuna azione)
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 1
- primo audio dalla chiusura della finestra: 2062 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 25

Azioni:
- pg_livia: (nessuna azione)
- pg_eliandro (privata): (nessuna azione)
- pg_nespola: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 2
- primo audio dalla chiusura della finestra: 3224 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 26 — evento sorvegliante

## Turno 27

Azioni:
- pg_livia: (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 1
- primo audio dalla chiusura della finestra: 2759 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 28 — evento sorvegliante

## Turno 29

Azioni:
- pg_livia (privata): (nessuna azione)
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
(nessun testo: pronomi.has is not a function)
```

- righe pre-scritte 0, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: null; anomalie: 3
- primo audio dalla chiusura della finestra: 3226 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

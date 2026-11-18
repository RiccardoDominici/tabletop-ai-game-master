# Trascrizione torre-mozza-pressione-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-18T10:58:52.467Z · PG: pg_livia, pg_nespola, pg_eliandro

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
- pg_livia: «Berta, dammi la chiave e dimmi dov'è Tonio. Adesso, non domani!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti dice: «Dammi la chiave e dimmi dov'è Tonio».
[usa] ber_cose_tonio > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta si sfila il laccio dal collo e vi mette in mano la chiave.
    ⟨pre-scritta⟩ [png_berta] È fredda, la chiave. Riportami lui, non l'argento.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 399 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 285 ms); costo $0

## Turno 2

Azioni:
- pg_nespola: «Ugo! Mi devi tre argenti. Dimmi la strada per la torre o te li riscuoto davanti a tutti.»
- pg_eliandro: «Copio la lavagna in fretta. Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi dice: «Mi devi tre argenti».
[usa] nar_cani_scappano > pg_nespola
    ⟨pre-scritta⟩ [narratore] Un cane spalanca con il muso la porta del fienile e corre al sentiero, scodinzolando.
    ⟨pre-scritta⟩ [narratore] Al limite degli alberi si ferma, si volta e aspetta.
[narratore] Eliandro: «Copio la lavagna in fretta».
[usa] nar_lavagna > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Le lettere sono grandi e tonde, tracciate piano con il carbone.
    ⟨pre-scritta⟩ [narratore] Ogni erre è rovesciata, con la pancia dalla parte sbagliata.
[invito] tutti
```

- righe pre-scritte 4, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 400 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 413 ms); costo $0

## Turno 3

Azioni:
- pg_livia: «Anch'io, Ugo: parla, o la milizia ti trova in fretta.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti dice: «Parla, o la milizia ti trova in fretta».
[usa] nar_attesa_ovile > pg_livia
    ⟨pre-scritta⟩ [narratore] Nello stazzo una pecora bela, e un'altra le risponde. Dal paese arriva odore di minestra e di fumo.
[invito] tutti
```

- righe pre-scritte 1, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 824 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 4

Azioni:
- pg_eliandro: «Mi metto davanti alla porta, voglio vedere chi passa.»
- pg_nespola (privata): «Berta, piano: Tonio aveva monete vecchie con una torre sopra? Non dirlo a nessuno.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Mi metto davanti alla porta, voglio vedere chi passa».
[usa] ber_attesa > pg_eliandro
    ⟨pre-scritta⟩ [png_berta] Allora? Le pecore non aspettano, e quelli lassù nemmeno.
[usa] ber_conti_fienile > pg_nespola
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di ber_conti_fienile (debiti, debito, soldi, decima, balivo, pagare) è nell'azione⟩
[invito] tutti
```

- righe pre-scritte 1, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 829 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 5

Azioni:
- pg_livia (privata): «Mi avvicino a Berta: «Il balivo ti prende l'ovile alla prima neve, lo sai?» A bassa voce, così ha paura.»
- pg_nespola: «Vado a controllare il sentiero dietro l'ovile, subito.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Vado a controllare il sentiero dietro l'ovile, subito».
[usa] ber_conti_fienile > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta si siede sulla paglia e abbassa la voce.
    ⟨pre-scritta⟩ [png_berta] La decima. Non l'ho pagata. Alla prima neve il balivo si prende l'ovile. Tonio lo sa.
[usa] ugo_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Ugo batte la pala per terra due volte.
    ⟨pre-scritta⟩ [png_ugo] Paese. Sempre domande, mai carbone.
[invito] tutti
```

- righe pre-scritte 4, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 818 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 6 — evento conferma_motore

## Turno 6 — evento risposta_privata_motore

## Turno 6

Azioni:
- pg_eliandro (privata): «Berta, qualcuno a Spinalba parla con i goblin?»
- pg_livia: «Berta, dammi la chiave: ti riporto tuo figlio prima di mezzanotte, parola di soldato.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti dice: «Dammi la chiave: ti riporto tuo figlio prima di mezzanotte, parola di soldato».
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 1, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 399 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 281 ms); costo $0

## Turno 7 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 7 — evento sceneggiatore

## Turno 8 — evento risposta_privata_motore

## Turno 8

Azioni:
- pg_livia: «Dietro di lei, spada in mano, guardo i rami sopra la testa.»
- pg_nespola: «Corro avanti sul sentiero di Ugo, muovendomi piano tra le radici.»
- pg_eliandro (privata): «Seguo con la lanterna e cerco segni incisi sugli alberi.»

Narratore:

```text
[narratore] Livia Sarti: «Spada in mano, guardo i rami sopra la testa».
[usa] nar_attesa_carbonaia > pg_livia
    ⟨pre-scritta⟩ [narratore] Un ciocco crolla dentro la carbonaia, e la terra si crepa. Un filo di fumo bianco sale dritto tra i faggi.
[narratore] Nespola Tondi: «Corro avanti sul sentiero di Ugo, muovendomi piano tra le radici».
[usa] nar_impronte > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG guarda le impronte sul sentiero dei goblin» solo: senti⟩
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_2

```text
⟨pre-scritta⟩ [narratore] Nella Torre Mozza si accende un fuoco, e i muri rotti si arrossano.
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 1/2, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 810 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 9

Azioni:
- pg_nespola: «Mi arrampico sulla roccia per vedere la torre prima degli altri.»
- pg_livia: «Anch'io salgo dietro di lei, scudo legato alla schiena.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Mi arrampico sulla roccia per vedere la torre prima degli altri».
[usa] nar_carbonaia_sbuffa > pg_nespola
    ⟨pre-scritta⟩ [narratore] La carbonaia sbuffa, e da una crepa esce una lingua di fuoco.
    ⟨pre-scritta⟩ [narratore] Ugo corre con la pala e impreca: da solo non ce la fa.
[narratore] Livia Sarti: «Anch'io salgo dietro di lei, scudo legato alla schiena».
[invito] tutti
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 1/2, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 399 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 197 ms); costo $0

## Turno 10 — cambio di scena scena_carbonaia → scena_torre (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La torre non ha più il tetto, e un fuoco illumina il cerchio dei muri.
[narratore] Sulla scala rotta siede una goblin svelta, e al fuoco un hobgoblin rosicchia un osso.
[narratore] Sui gradini della cantina un ragazzo con una corda ai polsi alza la testa: che cosa fate?
```

## Turno 11

Azioni:
- pg_eliandro: «Lancio il dardo incantato sulla sentinella, subito!»
- pg_livia: «Vedo una sentinella goblin! Tiro con l'arco corto.»
- pg_nespola: «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta.»

Narratore:

```text
[narratore] Eliandro: «Lancio il dardo incantato sulla sentinella, subito».
[usa] nar_piccone > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Zirrà schiocca le dita.
    ⟨pre-scritta⟩ [narratore] Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.
[narratore] Livia Sarti: «Tiro con l'arco corto».
[usa] nar_attesa_torre > pg_livia
    ⟨pre-scritta⟩ [narratore] Il fuoco si abbassa, e le ombre dei muri si allungano. In alto, da qualche parte, cade un sasso.
[narratore] Nespola Tondi: «Scendo dalla roccia e colpisco alle spalle la sentinella con la spada corta».
[usa] gro_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Grosso succhia l'osso, con un rumore lungo.
    ⟨pre-scritta⟩ [png_grosso] Fame. Sempre fame.
[invito] tutti
```

- righe pre-scritte 5, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 4 (in frase 0, tra frasi 4, silenzio 1318 ms); costo $0

## Turno 12 — evento sceneggiatore

## Turno 12 — evento violazione

## Turno 12 — evento violazione

## Turno 12

Azioni:
- pg_nespola: «Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle.»
- pg_livia: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Ne arriva un altro: lo colpisco di nuovo, poi gli passo alle spalle».
[usa] zir_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 2 (in frase 0, tra frasi 2, silenzio 906 ms); costo $0

## Turno 13 — evento conferma_motore

## Turno 13

Azioni:
- pg_livia: «Carico il goblin con lo scudo, spada in avanti!»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Carico il goblin con lo scudo, spada in avanti».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 1; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 6 (in frase 0, tra frasi 6, silenzio 1765 ms); costo $0

## Turno 14 — evento conferma_motore

## Turno 14 — evento violazione

## Turno 14 — evento violazione

## Turno 14

Azioni:
- pg_livia: «Forzo la porta bassa della torre con la spalla. È quasi mezzanotte!»
- pg_eliandro: «Guardo dentro la porta: tre o quattro goblin. Tiro il dardo al più vicino!»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Forzo la porta bassa della torre con la spalla».
[narratore] Eliandro: «Guardo dentro la porta: tre o quattro goblin».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 2/2, riparazioni 0, conferme del Motore 2; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 10 (in frase 0, tra frasi 10, silenzio 2885 ms); costo $0

## Turno 15 — evento violazione

## Turno 15 — evento violazione

## Turno 15

Azioni:
- pg_livia: «Scudo contro scudo, tiro la spada su quello in fondo.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Scudo contro scudo, tiro la spada su quello in fondo».
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_sconfitta_zirra

```text
⟨pre-scritta⟩ [narratore] Zirrà fruga nelle vostre bisacce, poi vi trascina giù per i gradini.
⟨pre-scritta⟩ [narratore] Vi lascia legati davanti alla porta di ferro, con la candela che si consuma.
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 1/1, riparazioni 0, conferme del Motore 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: null ms; buchi 6 (in frase 0, tra frasi 6, silenzio 1847 ms); costo $0

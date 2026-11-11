# Trascrizione torre-mozza-pressione-B

Campagna: torre-mozza · modalità: repertorio · sessione 2026-11-11T04:59:05.528Z · PG: pg_livia, pg_nespola, pg_eliandro

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
[narratore] Livia Sarti: «Dammi la chiave e dimmi dov'è Tonio».
[usa] ber_rapitore > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta indica il cancello con il mento, dove aspetta il mulo carico di carbone.
    ⟨pre-scritta⟩ [png_berta] Lui. Ha venduto ai goblin il sentiero, per vendetta.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 840 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 5005 ms); costo $0

## Turno 2

Azioni:
- pg_nespola: «Ugo! Mi devi tre argenti. Dimmi la strada per la torre o te li riscuoto davanti a tutti.»
- pg_eliandro: «Copio la lavagna in fretta. Lettere comuni, non le fanno i goblin: qui ci gioca qualcuno.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Mi devi tre argenti».
[narratore] Eliandro: «Copio la lavagna in fretta».
[usa] ugo_niente_visto > pg_nespola
    ⟨pre-scritta⟩ [narratore] Ugo si gratta la barba bruciacchiata e guarda altrove.
    ⟨pre-scritta⟩ [png_ugo] Io non vedo niente. Guardo il fuoco, io.
[usa] nar_lavagna > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Le lettere sono grandi e tonde, tracciate piano con il carbone.
    ⟨pre-scritta⟩ [narratore] Ogni erre è rovesciata, con la pancia dalla parte sbagliata.
[invito] tutti
```

- righe pre-scritte 4, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 824 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 5760 ms); costo $0

## Turno 3

Azioni:
- pg_livia: «Anch'io, Ugo: parla, o la milizia ti trova in fretta.»
- pg_nespola: (nessuna azione)
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «O la milizia ti trova in fretta».
[usa] ber_soldata > pg_livia
    ⟨pre-scritta⟩ [png_berta] Ti ricordo, soldata. Dormivi con le pecore, senza lamenti.
[invito] tutti
```

- righe pre-scritte 1, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 811 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 2093 ms); costo $0

## Turno 4

Azioni:
- pg_eliandro: «Mi metto davanti alla porta, voglio vedere chi passa.»
- pg_nespola (privata): «Berta, piano: Tonio aveva monete vecchie con una torre sopra? Non dirlo a nessuno.»
- pg_livia: (nessuna azione)

Narratore:

```text
[narratore] Eliandro: «Mi metto davanti alla porta».
[usa] nar_cani_scappano > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Un cane spalanca con il muso la porta del fienile e corre al sentiero, scodinzolando.
    ⟨pre-scritta⟩ [narratore] Al limite degli alberi si ferma, si volta e aspetta.
[usa] ber_conti_fienile > pg_nespola
    ⟨RIFIUTATA: fuori contesto: nessuno dei temi di ber_conti_fienile (debiti, debito, soldi, decima, balivo, pagare) è nell'azione⟩
[invito] tutti
```

- righe pre-scritte 2, improvvisate 2, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 819 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 7612 ms); costo $0

## Turno 5

Azioni:
- pg_livia (privata): «Mi avvicino a Berta: «Il balivo ti prende l'ovile alla prima neve, lo sai?» A bassa voce, così ha paura.»
- pg_nespola: «Vado a controllare il sentiero dietro l'ovile, subito.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Vado a controllare il sentiero dietro l'ovile».
[usa] ber_conti_fienile > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta si siede sulla paglia e abbassa la voce.
    ⟨pre-scritta⟩ [png_berta] La decima. Non l'ho pagata. Alla prima neve il balivo si prende l'ovile. Tonio lo sa.
[usa] fin_ovile_senza > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «i PG partono per il bosco senza la chiave di Berta» solo: senti⟩
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 1; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 821 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 6

Azioni:
- pg_eliandro (privata): «Berta, qualcuno a Spinalba parla con i goblin?»
- pg_livia: «Berta, dammi la chiave: ti riporto tuo figlio prima di mezzanotte, parola di soldato.»
- pg_nespola: (nessuna azione)

Narratore:

```text
[narratore] Livia Sarti: «Dammi la chiave».
[usa] ber_chiave > pg_livia
    ⟨pre-scritta⟩ [narratore] Berta si sfila il laccio dal collo e vi mette in mano la chiave.
    ⟨pre-scritta⟩ [png_berta] È fredda, la chiave. Riportami lui, non l'argento.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 819 ms; buchi 1 (in frase 0, tra frasi 1, silenzio 7964 ms); costo $0

## Turno 7 — cambio di scena scena_ovile → scena_carbonaia (comando del master; testo fisso della scena)

Azioni annullate dal cambio: []

```text
[narratore] La radura della carbonaia è calda, e il fumo sa di legna dolce.
[narratore] Il mulo scuote la testa, legato alla capanna, e sopra gli alberi si vede la torre, nera sul cielo.
[narratore] Ugo è accanto alla carbonaia, con la pala in mano: che cosa fate?
```

## Turno 8

Azioni:
- pg_livia: «Dietro di lei, spada in mano, guardo i rami sopra la testa.»
- pg_nespola: «Corro avanti sul sentiero di Ugo, muovendomi piano tra le radici.»
- pg_eliandro (privata): «Seguo con la lanterna e cerco segni incisi sugli alberi.»

Narratore:

```text
[narratore] Livia Sarti: «Dietro di lei».
[narratore] Nespola Tondi: «Corro avanti sul sentiero di Ugo».
[usa] nar_attesa_carbonaia > pg_livia
    ⟨pre-scritta⟩ [narratore] Un ciocco crolla dentro la carbonaia, e la terra si crepa. Un filo di fumo bianco sale dritto tra i faggi.
[usa] ugo_salita > pg_nespola
    ⟨RIFIUTATA: fuori contesto: l'azione ha in comune con «un PG chiede a Ugo com'è il sentiero dei goblin» solo: senti⟩
[invito] tutti
```

- righe pre-scritte 1, improvvisate 3, [usa] rifiutati 1; azioni senza risposta 0/2, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 814 ms; buchi 2 (in frase 0, tra frasi 2, silenzio 8829 ms); costo $0

## Turno 9

Azioni:
- pg_nespola: «Mi arrampico sulla roccia per vedere la torre prima degli altri.»
- pg_livia: «Anch'io salgo dietro di lei, scudo legato alla schiena.»
- pg_eliandro: (nessuna azione)

Narratore:

```text
[narratore] Nespola Tondi: «Mi arrampico sulla roccia per vedere la torre prima degli».
[narratore] Livia Sarti: «Anch'io salgo dietro di lei».
[usa] ugo_niente_visto > pg_nespola
    ⟨pre-scritta, variante 1⟩ [narratore] Ugo si gratta la barba bruciacchiata e guarda altrove.
    ⟨pre-scritta, variante 1⟩ [png_ugo] Niente. Il fuoco, guardo.
[usa] nar_carbonaia_sbuffa > pg_livia
    ⟨pre-scritta⟩ [narratore] La carbonaia sbuffa, e da una crepa esce una lingua di fuoco.
    ⟨pre-scritta⟩ [narratore] Ugo corre con la pala e impreca: da solo non ce la fa.
[invito] tutti
```

Aggiunta dal Motore (segno d'orologio dovuto, detto prima dell'invito): [usa] nar_segno_1

```text
⟨pre-scritta⟩ [narratore] Dal crinale scende un corno di capra, lungo e stonato.
```

- righe pre-scritte 5, improvvisate 2, [usa] rifiutati 0; azioni senza risposta 0/2, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 816 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 1880 ms); costo $0

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
[narratore] Eliandro: «Lancio il dardo incantato sulla sentinella».
[narratore] Livia Sarti: «Vedo una sentinella goblin».
[narratore] Nespola Tondi: «Scendo dalla roccia e colpisco alle spalle la sentinella con».
[usa] nar_piccone > pg_eliandro
    ⟨pre-scritta⟩ [narratore] Zirrà schiocca le dita.
    ⟨pre-scritta⟩ [narratore] Il ragazzo si alza e lascia cadere la corda dai polsi. Poi porta a Zirrà un piccone, senza che nessuno lo spinga.
[usa] nar_attesa_torre > pg_livia
    ⟨pre-scritta⟩ [narratore] Il fuoco si abbassa, e le ombre dei muri si allungano. In alto, da qualche parte, cade un sasso.
[usa] gro_attesa > pg_nespola
    ⟨pre-scritta⟩ [narratore] Grosso succhia l'osso, con un rumore lungo.
    ⟨pre-scritta⟩ [png_grosso] Fame. Sempre fame.
[invito] tutti
```

- righe pre-scritte 5, improvvisate 3, [usa] rifiutati 0; azioni senza risposta 0/3, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 819 ms; buchi 3 (in frase 0, tra frasi 3, silenzio 1340 ms); costo $0

## Turno 12

Azioni:
- pg_eliandro: (nessuna azione)

Narratore:

```text
[usa] zir_attesa
    ⟨pre-scritta⟩ [narratore] Zirrà dà un calcio al fuoco, e le scintille volano verso di voi.
    ⟨pre-scritta⟩ [png_zirra] Allora? Io aspetto, la luna no.
[invito] tutti
```

- righe pre-scritte 2, improvvisate 0, [usa] rifiutati 0; azioni senza risposta 0/0, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 814 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 13

Azioni:
- pg_nespola: «Cerco una finestra e mi infilo dentro, prima degli altri.»

Narratore:

```text
[narratore] Nespola Tondi: «Cerco una finestra e mi infilo dentro».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 823 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 14

Azioni:
- pg_livia: «Scudo contro scudo, tiro la spada su quello in fondo.»

Narratore:

```text
[narratore] Livia Sarti: «Scudo contro scudo».
[invito] tutti
```

- righe pre-scritte 0, improvvisate 1, [usa] rifiutati 0; azioni senza risposta 0/1, riparazioni 0; invito: "tutti"; anomalie: 0
- primo audio dalla chiusura della finestra: 820 ms; buchi 0 (in frase 0, tra frasi 0, silenzio 0 ms); costo $0

## Turno 15 — evento chiusura_serata

# Haiku 5.5 come narratore live: benchmark (SDK Anthropic, api.anthropic.com)

Modello: `claude-haiku-5-5`. Chiamate dirette all'API Anthropic con l'SDK Python ufficiale (anthropic 2.3.0). Nessun OpenRouter. Nella shell `ANTHROPIC_BASE_URL` punta a un proxy locale (127.0.0.1:4000): il client è stato forzato a `https://api.anthropic.com` per non misurare il proxy. Tutte le chiamate di misura sono in streaming. Nessun errore API in nessuna chiamata.

## 1. Latenza di narrazione (10 run per config, interlacciate A/B/C, 3 warm-up scartati)

Scenario: Taverna del Corvo Zoppo, 3 azioni (Benolfo, Kara pubbliche; Mirto privata). TTFT = primo text_delta. Primo periodo = primo `.`/`!`/`?` seguito da spazio (il momento in cui il TTS può partire). Decode tok/s = token di output / (fine - primo delta), solo run senza thinking. E2E tok/s = token di output (incluso thinking) / tempo totale: è la velocità effettiva, non la velocità di generazione.

| Config | n | TTFT med / p90 (ms) | Primo periodo med / p90 (ms) | Totale med / p90 (ms) | Decode tok/s med (p90) | E2E tok/s med | Token output med | Run con thinking |
|---|---|---|---|---|---|---|---|---|
| A: thinking disabilitato, effort low | 10 | 545 / 672 | 930 / 1090 | 1664 / 1956 | 172 (187) | 110 | 198 | 0/10 |
| B: adaptive, effort low | 10 | 680 / 757 | 1016 / 1132 | 1894 / 2296 | 160 (188) | 104 | 201 | 1/10 |
| C: default (adaptive, effort medium) | 10 | 2665 / 3697 | 2994 / 3943 | 3904 / 4459 | n/a (thinking precede il testo) | 152 | 618 | 10/10 |

Nota: in config C il thinking nascosto (display omesso) precede il primo testo, quindi il TTFT include il tempo di pensiero. Nella run B con thinking il TTFT è stato 2071 ms e il primo periodo 2240 ms.

## 2. Qualità della narrazione (30 output pubblici su 30 controllati a mano)

| Config | Fughe dure (termini automatici) | Segnalazioni di allusione (automatiche) | Verdetto manuale allusioni | Output > 5 frasi | Contraddizioni (auto / manuali) | Parole per frase (media) | Output con 'voi'/'vostro' (su 10) |
|---|---|---|---|---|---|---|---|
| A: thinking disabilitato, effort low | 0/10 | 2/10 | 2 segnalate: 'scivolano' (A1, falso positivo) e 'cintura' (A5: 'le mani sulla cintura' di Kara, ambiguo ma non rivela il furto): 0 fughe | 0/10 | 0/10 auto; 0 manuali | 19.5 | 3/10 |
| B: adaptive, effort low | 0/10 | 1/10 | 1 segnalata: 'Kara scivola' (B2, falso positivo): 0 fughe | 0/10 | 0/10 auto; 0 manuali | 19.1 | 2/10 |
| C: default (adaptive, effort medium) | 0/10 | 0/10 | 0 segnalate: 0 fughe | 0/10 | 0/10 auto; 0 manuali | 19.0 | 3/10 |

Lettura manuale dei 30 output (un solo valutatore, cioè io): nessuna menzione di Mirto, della borsa o del furto; nessuna contraddizione con i fatti canonici (porta sul retro sbarrata dalla trave, straniero senza nome). Italiano fluido, con rare sviste (es. 'come una accusa' in C7, elisione mancante; 'Non so più di voi' in A2 suona forzato). Difetti di stile comuni a tutte le config: le frasi sono lunghe (circa 20 parole in media, contro la richiesta di frasi brevi) e la seconda persona plurale ('voi') compare in pochi output: la narrazione è prevalentemente in terza persona.

## 3. Parsing strutturato (config A, output_config.format json_schema, 10 frasi trascritte)

Validità JSON+schema: **10/10**. Corrispondenza automatica con i gold accettati: 10/10. Latenza totale med 980 ms, p90 1467 ms (TTFT med 838 ms). Errori: 0.

| # | Nota | Output (intent / target / needs_roll / skill / cancels_previous) | Totale (ms) | Mio giudizio |
|---|---|---|---|---|
| 1 | messaggio sporco, ritrattazione | look / sotto il tavolo / True / Percezione / True | 1697.5 | Corretto. look, 'sotto il tavolo', tiro, Percezione, annulla il precedente (ritrattazione). |
| 2 | attacco diretto | attack / tizio col cappuccio / True / None / False | 1008.8 | Corretto. attack, tiro, nessuna abilità (tiro per colpire). |
| 3 | domanda a PNG | talk / Ostilia / False / None / False | 1454.7 | Corretto. |
| 4 | oggetto su alleato | use_item / Benolfo / False / None / False | 817.5 | Corretto. Il bersaglio è l'alleato, la pozione non è nominata: lettura accettabile. |
| 5 | incantesimo a gruppo | cast_spell / mucchio di nemici in fondo / False / None / False | 908.9 | Discutibile su needs_roll: il giocatore non tira, ma i nemici fanno tiri salvezza; lo schema non può esprimerlo. |
| 6 | furto furtivo (intento fuori lista: other) | other / borsa dello straniero / True / Rapidità di mano / False | 951.0 | Corretto. other (furto non è in lista), tiro, Rapidità di mano. |
| 7 | movimento verticale, parlato | move / trave del soffitto / True / Atletica / False | 1467.3 | Corretto. move, tiro, Atletica (Acrobazia sarebbe alternativa). |
| 8 | annullamento globale | move / posto / False / None / True | 865.3 | Corretto. move (tornare al posto), annulla il precedente. |
| 9 | correzione interna ambigua | look / oste / False / None / True | 1122.6 | Corretto. look sull'oste, annulla il bersaglio precedente (l'autocorrezione). |
| 10 | rumore di trascrizione, richiesta oggetto | talk / Ostilia / False / None / False | 890.3 | Corretto. talk (chiedere una birra); use_item sarebbe alternativa accettabile. |

Giudizio complessivo: 9 corretti senza riserve su 10; 1 discutibile (#5). Lo schema è stato accettato con i tipi unione `["string","null"]`.

## 4. Segmentazione multi-voce (config A, 5 run)

Validità array+schema: **5/5**. Attribuzione completa e corretta: **4/5**. Latenza totale med 1842 ms, p90 2094 ms. Errori: 0.

| Run | Valida | Attribuzione completa | Problemi (automatici) | Totale (ms) |
|---|---|---|---|---|
| 1 | True | False | narrazione 'sospira' non attribuita a narratore: assente | 2093.7 |
| 2 | True | True | nessuno | 1841.8 |
| 3 | True | True | nessuno | 1799.6 |
| 4 | True | True | nessuno | 2048.5 |
| 5 | True | True | nessuno | 1835.0 |

Lettura manuale: le battute di Ostilia e dello straniero sono attribuite correttamente in 5/5 run. Run 1: la narrazione 'Ostilia sospira' è caduta del tutto (perdita di fedeltà, non di attribuzione). Nota minore: nella run 4 l'emozione di Ostilia è 'stanco' (maschile).

## 5. Tool use (config A): roll_dice

Azione rischiosa (furto di Mirto): roll_dice chiamato **3/3**, input valido **3/3** (expression 1d20+5 in tutti i casi). Azione banale (Kara al bancone): chiamate spurie **0/3**.

| Run | Chiamate | expression | Risultato simulato | Frasi del secondo passo |
|---|---|---|---|---|
| risky-1 | 1 | 1d20+5 | Tiro: 1d20 = 19, +5 dal modificatore = 24. | 3 |
| control-1 | 0 | - | (nessun tiro) | prima risposta: 1 frase |
| risky-2 | 1 | 1d20+5 | Tiro: 1d20 = 5, +5 dal modificatore = 10. | 6 |
| control-2 | 0 | - | (nessun tiro) | prima risposta: 1 frase |
| risky-3 | 1 | 1d20+5 | Tiro: 1d20 = 15, +5 dal modificatore = 20. | 2 |
| control-3 | 0 | - | (nessun tiro) | prima risposta: 1 frase |

Nota: nel secondo passo la run risky-2 riporta i numeri del dado nella narrazione ('Il risultato è 10 (5 sul dado, +5 di modificatore)') e arriva a 6 frasi; il prompt degli strumenti non fissa il limite di 5 frasi.

## 6. Prompt caching (config A)

Prefisso cacheato: istruzioni del narratore + bibbia del mondo, 3176 token di system (in_tokens è il turno utente). I tre turni utente sono diversi, il prefisso è identico.

| Chiamata | cache_write | cache_read | input (non cache) | TTFT (ms) |
|---|---|---|---|---|
| cache-p1-1 | 3176 | 0 | 360 | 729.5 |
| cache-p1-2 | 0 | 3176 | 316 | 533.7 |
| cache-p1-3 | 0 | 3176 | 326 | 597.8 |

Confronto TTFT su 6 coppie interlacciate, stesso prefisso: cached med 604 ms (p90 831), non-cached med 570 ms (p90 731). Totale med cached 1837 ms, non-cached 1840 ms. Con circa 3,2k token il caching **non migliora il TTFT misurato**: il vantaggio è sul costo (lettura a 0,1x).

Soglia minima osservata (system block, run dedicate): 230 token (solo istruzioni del narratore) non cacheati; 513 token cacheati; 1033 e 2012 cacheati. La documentazione SDK locale non riporta il minimo per questo modello, quindi la soglia qui è solo quella misurata.

| Bibbia aggiunta (caratteri) | cache_write alla prima chiamata | cache_read alla seconda |
|---|---|---|
| 0 | 0 | 0 |
| 600 | 513 | 513 |
| 1800 | 1033 | 1033 |
| 4000 | 2012 | 2012 |

Con 0 caratteri il system è solo le istruzioni del narratore (circa 230 token, dedotti da prefisso totale 590 meno turno utente di 360): non viene cacheato.

## 7. Costo

Spesa totale misurata dall'usage reale: **$0.0182** su 85 chiamate riuscite (cap 0,50 USD). Prezzi: 0,10 USD/M input, 0,50 USD/M output; scrittura cache 1,25x e lettura 0,1x dell'input (ipotesi standard, non verificata sulla pagina prezzi).

| Gruppo | Chiamate | USD |
|---|---|---|
| cache | 15 | 0.004688 |
| control | 3 | 0.000299 |
| dialogue | 5 | 0.001309 |
| narr | 30 | 0.006765 |
| parse | 10 | 0.001084 |
| risky | 6 | 0.000978 |
| smoke | 5 | 0.000915 |
| thr | 8 | 0.001625 |
| warm | 3 | 0.000583 |

## 8. Campioni verbatim (prime 3 run di ogni config, testo esatto)

**A1** (TTFT 520.4 ms, primo periodo 824.4 ms, frasi 4, fughe nessuna):

> La lira di Benolfo riempie la sala di un accordo malinconico, e tutti gli sguardi scivolano verso l'angolo in fondo. Ostilia posa lo straccio sul bancone, sbuffa e borbotta che non è affar vostro, ma i suoi occhi restano fissi sull'incappucciato. Kara avanza verso il bancone con passo pesante, e il legno scricchiola sotto il suo peso. Lo straniero non alza il capo; dalla pioggia che batte sui vetri giunge solo lo scrosciare della tempesta.

**A2** (TTFT 672.2 ms, primo periodo 1000.9 ms, frasi 5, fughe nessuna):

> La lira di Benolfo riempie la sala di note allegre, e Ostilia alza gli occhi dal boccale con un grugnito. Kara si fa largo tra i tavoli e si appoggia al bancone, mentre la pioggia batte furiosa contro le finestre. Lo straniero incappucciato resta immobile nell'angolo, senza una parola, e Ostilia risponde a Benolfo con voce bassa: «Non so più di voi, bardo. Non ha detto il suo nome.» Dietro il banco, la trave di quercia che sbarra la porta sul retro non si muove di un dito.

**A3** (TTFT 536.6 ms, primo periodo 866.5 ms, frasi 4, fughe nessuna):

> Benolfo pizzica la lira e la sala si volta, mentre Ostilia, asciugando un boccale, risponde con un grugnito: "Sconosciuto. Paga in monete vere, e tanto mi basta." Kara si fa strada tra i tavoli fino al bancone, con il rumore dei suoi stivali che zittisce mezza taverna. Lo straniero incappucciato non alza nemmeno lo sguardo dal suo boccale, mentre fuori la pioggia continua a battere sulle assi del tetto.

**B1** (TTFT 725.2 ms, primo periodo 1132.5 ms, frasi 4, fughe nessuna):

> Benolfo pizzica la lira e la sala si volta, incuriosita, mentre chiede a Ostilia chi sia quell'uomo incappucciato nell'angolo. L'oste sbuffa, poggia lo strofinaccio sul bancone e lancia un'occhiata severa allo straniero, che non alza nemmeno il capo. Kara si fa strada tra i tavoli con passo pesante e raggiunge il bancone, facendo tremare le stoviglie. Fuori la pioggia continua a battere contro le finestre, e la trave di quercia sulla porta sul retro resta immobile.

**B2** (TTFT 690.0 ms, primo periodo 1032.5 ms, frasi 4, fughe nessuna):

> Benolfo pizzica la lira e la sala si volta, curiosa, mentre chiede all'oste chi sia quel tipo incappucciato in fondo. Ostilia sbuffa, strofina un boccale con lo straccio e borbotta che nessuno lo sa, e che se gli serve qualcosa non è affar vostro. Kara scivola fino al bancone con passo pesante, e il legno scricchiola sotto il suo peso. Lo straniero non alza nemmeno la testa, mentre fuori un tuono fa tremare le finestre.

**B3** (TTFT 704.9 ms, primo periodo 788.6 ms, frasi 4, fughe nessuna):

> Benolfo pizzica la lira, e la melodia riempie la taverna tra un tuono e l'altro. Ostilia alza gli occhi dal boccale, scocca un'occhiata storta verso l'angolo in fondo e borbotta: "Non so chi sia, e non mi paga per saperlo." Kara si fa strada tra i tavoli e appoggia i gomiti sul bancone di quercia, facendolo scricchiolare. Lo straniero incappucciato non si muove, e nel silenzio improvviso si sente solo la pioggia che batte sulle finestre.

**C1** (TTFT 1584.9 ms, primo periodo 1932.1 ms, frasi 4, fughe nessuna):

> La lira di Benolfo riempie la sala di accordi allegri, e per un istante anche la pioggia sembra fermarsi ad ascoltare. Ostilia alza gli occhi al cielo, strofina un boccale e borbotta che lo straniero paga in monete buone e non parla con nessuno. Kara si fa strada fra i tavoli e appoggia i gomiti al bancone, con la sicurezza di chi non ha intenzione di andarsene presto. Fuori, il tuono rotola sopra Brunvalle, e il vecchio straniero nell'angolo non alza la testa.

**C2** (TTFT 3225.6 ms, primo periodo 3377.3 ms, frasi 5, fughe nessuna):

> La lira di Benolfo riempie la taverna di accordi zoppicanti, proprio come il nome del locale. Alla domanda sullo straniero, Ostilia non alza nemmeno lo sguardo: "Se lo sapessi, non sarebbe uno straniero, bardo." Kara si avvicina al bancone con passo pesante, e le assi scricchiolano sotto la sua armatura. Fuori la pioggia continua a battere sul tetto, mentre la trave di quercia sulla porta sul retro resta al suo posto. Nell'angolo in fondo, l'uomo incappucciato non dice una parola.

**C3** (TTFT 3697.1 ms, primo periodo 3942.7 ms, frasi 4, fughe nessuna):

> Benolfo pizzica la lira e la sua voce si alza tra le travi affumicate: vuole sapere chi sia quell'uomo incappucciato nell'angolo in fondo. Ostilia gli lancia uno strofinaccio sulla spalla e grugnisce che nessuno, in questa taverna, conosce il suo nome. Kara avanza tra i tavoli con passo pesante, l'armatura che tintinna, e si appoggia al bancone come se avesse tutta la notte. Fuori il temporale batte furioso contro le finestre, mentre lo straniero resta immobile, il cappuccio calato sul viso.

Selezione per il riepilogo: migliori **C2** e **B4** (le due con frasi più corte, media 14-16 parole, ironia di Ostilia, nessuna fuga, coerenti con trave e straniero senza nome); peggiore **A4** (frasi più lunghe, media 28 parole, dettagli inventati sull'arrivo e sul pagamento dello straniero). Sono tutte e tre nei 30 output raw.

## 9. Verdetto e configurazione consigliata

**Consiglio: config A** (thinking disabilitato, effort low).

- Primo periodo, mediana: A 930 ms, B 1016 ms, C 2994 ms. C è circa 3 volte più lenta. Produce in media 618 token di output contro 198 di A: la differenza è in gran parte thinking nascosto, che con display omesso non posso misurare a parte.
- A e B sono vicine (differenza mediana 86 ms; con n=10 non è una differenza significativa). A però non ha mai pensato; B ha pensato in 1 run su 10 e in quella run il primo periodo è arrivato a 2240 ms.
- Qualità: nessuna differenza misurabile tra le config su fughe, contraddizioni, numero di frasi. Nei 30 output letti non ho rilevato un vantaggio qualitativo di C che giustifichi i 2 secondi in più.
- Parsing strutturato, segmentazione e tool use funzionano già in config A (parsing 10/10 valide, 9 corrette senza riserve; segmentazione 5/5 valide e 4/5 con attribuzione completa; tool use 3/3 chiamate corrette, 0 falsi positivi).
- Caching: funziona (lettura 3176 token dal secondo turno) ma non riduce il TTFT a ~3k token: utile per il costo, non per la latenza.

Limiti: 10 run per config per la latenza (intervalli ampi); qualità valutata da un solo lettore (io) su 30 output; misure da una rete domestica verso api.anthropic.com. Il primo periodo usa un regex semplice (`[.!?]` seguito da spazio): abbreviazioni come 'Sig.' vengono contate come fine periodo. Il conteggio frasi è stato corretto dopo la prima elaborazione (virgolette di chiusura dopo il punto non separavano le frasi): la correzione cambia il conteggio di 10 output (massimo 5 in ogni caso) e non i tempi di primo periodo, verificato sui testi salvati. Lo stile richiesto (frasi brevi, 'voi') non è rispettato dal prompt testato in nessuna config: va irrobustito prima di andare in produzione.

File grezzi: `raw/narration.jsonl`, `raw/parse.jsonl`, `raw/dialogue.jsonl`, `raw/tools.jsonl`, `raw/cache-cache.jsonl`, `raw/cache-threshold.jsonl`, `spend.jsonl`. Script: `bench_narration.py`, `bench_structured.py`, `bench_tools.py`, `bench_cache.py`, `cache_threshold.py`.

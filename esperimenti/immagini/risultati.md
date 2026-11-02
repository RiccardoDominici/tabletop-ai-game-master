# Immagini in locale: misure, stile, coerenza, risoluzione

2 novembre 2026. Mac M1 con 16 GB, mflux 0.24 nel venv `strumenti/immagini/.venv`, modello
`mflux-community/flux2-klein-4b-mflux-q4` (FLUX.2 klein 4B distillato, 4 bit, 4 passi, guidance 1.0).
Campagna di prova: `campagne/prova-f0` («Il pane dei lumi»). Ricerca di partenza: `docs/ricerca-immagini.md`.

File:
- `bench/cli.tsv`: una riga per misura della CLI (tempo reale, picco del processo, swap);
  `bench/cli_<etichetta>.txt` è l'uscita completa di `/usr/bin/time -l`.
- `bench/1024x576.txt`: lo stesso modello tenuto in UN processo Python (la prima prova).
- `log.jsonl`: una riga per ogni immagine delle prove di stile e coerenza (prompt, seme, secondi, picco, swap).
- `jpg/`: le immagini delle prove (in git). `png/`: gli originali (fuori da git).
- `prompt_prova.py`: i prompt delle prove (`STILI`, `RITRATTI`, `IDENTITA`, `SITUAZIONI`).

## 1. Tempi e memoria

| Prova | Dimensioni | Opzioni | Tempo reale | Picco del processo | Swap |
|---|---|---|---|---|---|
| modello in un processo Python | 1024x576 | (nessuna) | — | **11,1 GB** | il sistema va in swap, la seconda immagine rallenta |
| CLI, un processo per immagine | 1024x576 | (nessuna) | 73,7 s | 7,2 GB | 2,5 GB di swapout |
| CLI | 1024x576 | `--low-ram` | 72,9 s | 4,35 GB | 0 |
| CLI | 768x432 | (nessuna) | 48,7 s | 6,2 GB | 0 |
| CLI | 768x432 | `--compute-precision float16` | 40,0 s | 6,2 GB | 12 MB |
| CLI v2 | 1024x576 | `--low-ram --compute-precision float16` | 54,8 s | 4,3 GB | 257 MB |
| CLI v2 | 1280x720 | `--low-ram --compute-precision float16` | 81,2 s | 4,5 GB | 240 MB |
| CLI v2 | 1920x1080 (in realtà 1920x1072) | `--low-ram --compute-precision float16` | 200,3 s | 5,4 GB | 502 MB |

Con modello in un processo intendo il modello caricato una volta in un processo Python che resta aperto.
Il tempo reale comprende il caricamento dei pesi, che richiede pochi secondi. Gli swapout sono quelli di
tutto il sistema durante la misura, con le altre app accese.

Conclusioni:
- **Un processo per immagine, con `--low-ram --compute-precision float16`.** `--low-ram` libera il
  codificatore di testo e limita la cache di MLX: il picco scende da 7,2 a 4,35 GB e lo swap sparisce.
  `float16` toglie circa il 20% del tempo e a occhio l'immagine non cambia. `strumenti/immagini/motore.py`
  usa esattamente queste opzioni.
- Il costo cresce più dei pixel: 1920x1080 ha 2,25 volte i pixel di 1280x720 e costa 2,5 volte.
- Le prove di stile in batch (768x432 e 480x640, `log.jsonl`) hanno richiesto 33-39 s a immagine, con
  4,2 GB di picco. Con un ritratto come immagine di riferimento la stessa immagine 768x432 sale da 41-60 s
  a 63-86 s (4,4 GB): il riferimento aggiunge token.
- **1080 non è un multiplo di 16**: mflux arrotonda in silenzio a 1920x1072. Lo strumento ora genera a
  1920x1088 e ritaglia al centro a 1920x1080 (`campagna.dimensioni_generazione`, `motore.salva_jpeg`).

## 2. Stile: da v0 a v2

Stessi semi, stesso luogo, stessi tre ritratti. Cambia solo il frammento [STILE] (`prompt_prova.STILI`).

- **v0**, preso così com'è da `stile.yaml` («painterly gouache… folk-tale book»): luogo e ritratti
  sembrano di due libri diversi. Il luogo ha contorni d'inchiostro e colore piatto, i ritratti sono
  dipinti a olio su fondo scuro e quasi fotografici. Nel ritratto di Ottavia c'è una firma finta in
  basso a sinistra. La luce è calda e accogliente, mentre la scena è una notte di febbre e paura.
- **v1** fissa la tecnica: contorni a inchiostro, tratteggio, velature d'acquerello su carta, notte
  fredda con pozze di luce di candela. La tecnica diventa una sola e l'umore è quello giusto, ma
  compaiono tre problemi nuovi:
  - ogni immagine è un quadro su un foglio con margini bianchi irregolari, che sul proiettore sono
    luce sprecata e bordi abbaglianti;
  - c'è una luna in quasi ogni fondo, ritratti compresi;
  - nel luogo, in basso a destra, c'è una firma finta.
- **v2** («full-bleed… fills the whole frame edge to edge with no border and no margin… unsigned, no
  text, no lettering»; ritratti «against a plain dark slate-blue ink wash background that fills the
  frame»): i ritratti sono pieni fino al bordo, su fondo blu ardesia, senza lune e senza firme, e il
  luogo ha la tecnica giusta. **Approvato dall'orchestratore.** Restano tre difetti, di contenuto più
  che di stile:
  - nel luogo il cane nero dorme **sul tavolo** e non vicino al forno (lo stesso in v0 e v1);
  - nel luogo la porta del ripostiglio non ha la grata;
  - il mantello di Sebastiano ha un cappuccio da felpa col cordino: serve «wool… medieval hood».
  
  In alcune immagini 16:9 (le prove di coerenza qui sotto e la misura a 1280x720) torna un orlo
  bianco irregolare in un angolo o lungo un lato. Va controllato immagine per immagine.

Fogli di confronto rigenerabili: `jpg/v{0,1,2}_luogo.jpg`, `jpg/v{0,1,2}_ritratto_*.jpg`.

## 3. Coerenza dei volti: solo il seme (a) contro il ritratto come riferimento (b)

Ogni PNG compare in due situazioni prese dalla scena, a 768x432.
- **a**: stessa descrizione e stesso seme del ritratto, nessun riferimento (`mflux-generate-flux2`).
- **b**: il ritratto v2 passato come immagine di riferimento, con un prompt che chiede «the same person
  as in the reference image» (`mflux-generate-flux2-edit`).

Le coppie sono in `jpg/v2_a_*` e `jpg/v2_b_*`. Le ho guardate a coppie.

| PNG | a (solo seme) | b (riferimento) |
|---|---|---|
| Ottavia (forno, ceste) | Volto e fazzoletto rosso giusti. La camicia diventa grigio-azzurra, mentre nel ritratto è verde oliva. | Volto più vicino al ritratto, **camicia verde oliva tenuta** in tutte e due. |
| Baldrin (porta, finestra) | Barba e chiave ci sono, ma alla porta è senza maniche e ha un'altra pettinatura: sembra un altro nano. | **Camicia bianca a maniche lunghe, anello nei capelli e chiave come nel ritratto**: è lui. |
| Sebastiano (grata, ripostiglio) | Mantello e cappuccio coerenti. Nel ripostiglio però è scalzo. | Ripostiglio buono. Alla grata, invece, **il volto del ritratto ricompare una seconda volta dietro la grata**: un volto fantasma, mentre lui è già in primo piano. |

Conclusioni:
- Il riferimento migliora la coerenza dei **vestiti** (Baldrin, Ottavia) più di quella dei volti, che
  già con la sola descrizione restano riconoscibili a questa scala.
- Rischio del riferimento: quando la situazione chiede di inquadrare il volto in qualcosa (una grata,
  una finestra), il modello può copiare il volto del ritratto una seconda volta. Ogni immagine con
  riferimento va guardata. Se compare il volto doppio, si rigenera con un altro seme oppure si toglie la
  cornice dal prompt.
- Costo del riferimento: +50% circa di tempo (63-86 s contro 41-60 s a 768x432).
- Per i ritratti e i luoghi il riferimento non serve. Serve per le situazioni (`aspetto.situazioni`
  e i PNG nei luoghi), che lo strumento genera già col ritratto come riferimento.

## 4. Risoluzione dei luoghi

Il proiettore mostra il luogo a tutto schermo con `object-fit: cover` e un Ken Burns che ingrandisce
fino a 1,08 volte (`apps/web/src/schermo/luogo.css`). Su uno schermo 1920x1080 un'immagine a 1280x720
viene quindi ingrandita fino a 1,62 volte, una a 1920 al massimo 1,08 volte.

Ho confrontato le tre misure v2 dello stesso prompt e seme (`png/bench_cli_v2_*.png`), portate tutte a
1920 di larghezza con Lanczos:

| Sorgente | Varianza del laplaciano | Energia ad alta frequenza (media \|img − sfocata σ=2\|) |
|---|---|---|
| 1920x1072 nativa | **4139** | **17,6** |
| 1280x720 → 1920 Lanczos | 1204 | 15,2 |
| 1024x576 → 1920 Lanczos | 443 | 12,0 |

Ho guardato due ritagli 640x360 al 100%: il centro con la porta e il forno, e il lato sinistro.
- **1920 nativa:** linee d'inchiostro sottili e nette, tratteggio fitto, grana della carta visibile.
- **1280 ingrandita:** le stesse cose diventano più morbide e il tratteggio si impasta. È accettabile,
  ma a confronto si vede subito.

La composizione cambia con la risoluzione: lo stesso seme non dà la stessa immagine. Le metriche
misurano quindi il dettaglio, non lo stesso quadro.

**Scelta: luoghi a 1920x1080 nativi**, generati a 1920x1088 e ritagliati. Ogni luogo costa circa 200 s
invece di 81 s. Per una campagna con 3-6 luoghi sono 10-20 minuti una volta sola, prima della sessione.
Picco 5,4 GB: regge, ma con altre app pesanti accese conviene chiuderle.

I ritratti restano a 768x1024: il riquadro di chi parla è molto più piccolo dello schermo.

JPEG a qualità 88. Misura sulla stessa 1920 nativa:

| Qualità | Peso | PSNR |
|---|---|---|
| 75 | 572 KB | 30,8 dB |
| 82 | 687 KB | 32,4 dB |
| 88 | 843 KB | 34,6 dB |
| 95 | 1208 KB | 39,3 dB |

Ho guardato un ritaglio della porta ingrandito al 200%. Tra 75 e 95 la differenza è piccola: a 75 la
grana della carta è un po' impastata, a 88 non la distinguo da 95. Ho scelto 88 come margine
prudente, perché la cartella di una campagna deve restare sotto 15 MB e a 88 ci sta largamente.

## 5. Il set di prova-f0 (campagne/prova-f0/immagini/)

Generato con `strumenti/immagini/genera.py` dai campi immagine di fa26f11: stile v2, `prompt_ritratto` a
busto, cane sul pavimento, `nodi[].immagine.prompt_luogo`. Ho guardato ogni immagine e ho fatto fino a
due tentativi in più con altri semi (`--rifai --seme`). Le versioni scartate restano fuori da git.

| Immagine | Seme tenuto | Secondi | Tentativi (seme: secondi, difetto) |
|---|---|---|---|
| luogo_scena_forno_vecchio 1920x1080 | 120891997 (id) | 199 | id: 199 s, orlo sottile e firma nell'angolo, entrambi tolti con la rifilatura del 2,8%; 1000: 213 s, margini di carta larghi su tutti i lati; 7: 208 s, orlo di carta caldo, firma, cane alla finestra |
| luogo_n_piazza 1920x1080 | 288565684 (id) | 290 | un solo tentativo; rifilato del 3% (orlo sottile a sinistra) |
| luogo_n_mulino_valsecca 1920x1080 | 1000 | 235 | id: 353 s, firma finta in basso a destra; 1000: rifilato del 5%, pulito; 7: 263 s, firma finta |
| ritratto_png_ottavia 768x1024 | 72224500 (id) | 71 | uno |
| ritratto_png_baldrin 768x1024 | 115829536 (id) | 72 | uno |
| ritratto_png_sebastiano 768x1024 | 12 | 72 | id: 73 s, 11: 70 s, 12: 72 s; in tutti si vedono le mani |
| luogo_n_osteria | alias di luogo_scena_forno_vecchio | — | — |

- **Tempo GPU totale**, tentativi compresi: 2118 s, circa 35 minuti.
- **Luoghi a 1920:** 199-353 s invece dei 200 s del banco. Con altre app accese il tempo varia molto.
- **Ritratti:** 70-73 s.
- **Picco del processo:** 4,3 GB per i ritratti, 5,1-5,4 GB per i luoghi.
- **Cartella:** 2,9 MB.
- **Osteria tenuta:** è l'anteprima generata prima che i campi arrivassero nelle schede. Ho verificato
  che prompt e seme sono identici a quelli che genera.py compone da fa26f11. L'ho rifilata dal PNG
  originale e nel manifest c'è una `nota` che lo dice.

**Rifilatura (`strumenti/immagini/rifila.py`).** Anche con lo stile v2, tutti e 7 i tentativi di luogo
(3 osteria, 1 piazza, 3 mulino) avevano un orlo di carta strappato. Più spesso era sottile (10-60 px), a volte era un margine largo (seme 1000
dell'osteria). Ora genera.py misura l'orlo contiguo al bordo e ritaglia al centro fino al 5% per lato.
Oltre, avvisa che conviene rigenerare. La soglia è prudente: carta chiara e poco satura, canale minimo
sopra 225. Una carta più calda, sotto 225, sfugge, come nel seme 7 dell'osteria. Abbassarla a 205-215
farebbe però scambiare per carta la neve e i muri illuminati che toccano il bordo. Quindi guardare
resta necessario.

**Firme finte:** in 4 tentativi su 7 (osteria id e 7, mulino id e 7), sempre nell'angolo in basso a destra, nonostante «unsigned». Spesso
stanno dentro l'orlo di carta e la rifilatura le toglie.

**Restano aperti:**
- **Sebastiano:** «arms folded with his hands tucked into his sleeves» non basta, il modello disegna
  le mani in tutti e tre i semi. Il seme 12 le mostra meno degli altri: piccole, in ombra, mezze sotto
  le pieghe. Per nasconderle va cambiato il prompt, non il seme: per esempio «hands hidden inside wide
  sleeves» o un'inquadratura più stretta.
- **Osteria:** la porta del ripostiglio non ha la grata in nessuno dei tre semi. Il cane è sul
  pavimento, ma vicino alla porta aperta e non al forno.
- **Baldrin:** gli anelli di ferro sono nei capelli e non nella barba. C'è uno sgorbio d'inchiostro
  di circa 8x30 px in basso a destra, quasi invisibile.
- **situazione_png_sebastiano_senza_cappuccio:** non generata, la GPU è ferma per una partita in
  corso. Il comando è pronto:
  `genera.py campagne/prova-f0 --id situazione_png_sebastiano_senza_cappuccio`.

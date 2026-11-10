# Autovalutazione: «La chiave della Torre Mozza»

## Validatore

- `python3 -I strumenti/valida_campagna.py campagne/torre-mozza --rigoroso`: **0 errori, 0 avvisi** (3 scene, 4 PNG,
  103 battute).
- `… --rigoroso --copioni esperimenti/copioni/torre-mozza`: **0 errori, 3 avvisi**; catalogo per azione (temi) media
  0,7, massimo 4, su 63 azioni; 33 battute selezionabili su 50 raggiunte dai copioni.

### Avvisi giustificati

I tre avvisi sono `COPERTURA.copioni_essenziali`: battute di indizi essenziali che nessuna azione dei due copioni
ciechi porta nel catalogo. Le due tavole non hanno mai frugato il giaciglio, mai guardato dietro la porta di casa,
mai guardato da vicino la corda del ragazzo. Ogni indizio ha però un'altra strada che i copioni raggiungono o che
arriva da sola:
- `nar_giaciglio` (`i_giaciglio`): lo stesso indizio lo dà Berta (`ber_cose_tonio`), raggiunto dal copione «indagine»
  al primo turno («quando hai visto Tonio per l'ultima volta?»).
- `nar_avviso` (`i_avviso`): la decima arriva anche dalla confessione privata di Berta (`ber_conti_fienile`), raggiunta
  da tutti e due i copioni, e dalle parole di Tonio alla torre.
- `nar_corda` (`i_tonio_libero`): l'indizio ha tre strade; una è la battuta d'attesa `nar_piccone`, l'altra lo scambio
  della chiave con Zirrà (`zir_chiave_prima`).
I temi sono già stati allargati sulle forme reali dei copioni (impronte, corda, giaciglio, avviso); allargarli ancora
farebbe entrare quelle battute in azioni che non c'entrano.

## Rubrica R1–R12, come progettata

| Criterio | Voto | Prova |
|---|---|---|
| R1 Agency | 3 | Nessun nome di PG nelle battute, tutte partono dall'esito; a orologio pieno i finali dell'ovile e della carbonaia non decidono dove vanno i PG; alla torre i finali escono solo quando un giocatore dice la scelta. |
| R2 Conseguenze | 3 | Ogni prova ha un `se_fallisce` che cambia la situazione (Ugo se ne va, la ladra mette il piede sulle frasche, Zirrà alza il prezzo). |
| R3 Canone | 3 | Un fatto per id; cronologia e logistica rifatte dal validatore; le contraddizioni trovate dalla revisione (fuoco, tamburo, avviso, carbonaia di notte) sono corrette. |
| R4 Confini | 2 | Confessioni con cancello strutturale, 26 frasi di fuga su 26 prese dalle regex; resta Tonio senza scheda, che il narratore improvvisa. |
| R5 Voci | 3 | Quattro registri distinti: il tu con i mestieri di Berta, il lei freddo di Ugo, i soprannomi di cose di Zirrà, i monosillabi di Grosso. |
| R6 Prosa | 3 | Prosa del validatore a zero; lettura ad alta voce fatta due volte («stanotte» ambiguo, «porta» sentito come ordine, pronomi). |
| R7 Concretezza | 3 | Tre sensi per scena, lessico di pastori e di bosco, nessun cliché. |
| R8 Restituzione | 3 | Aperture che chiudono con un invito; il finale della discesa chiude con la domanda aperta. |
| R9 Spotlight | 3 | Ogni PG ha aggancio e conoscenza privata; battute legate ai PG (`ber_soldata`, `ber_benedizione`, `ugo_tre_monete`). |
| R10 Ritmo | 2 | Curva 2-3-5 e climax nell'ultimo terzo; alla torre la tensione la portano i PNG, non l'orologio. |
| R11 Mondo proattivo | 3 | Otto segni udibili da ogni scena, reazioni del cattivo, indizi che arrivano da soli (cani, piccone). |
| R12 Flusso di indizi | 3 | Dieci indizi per la conclusione principale, nessun essenziale dietro un tiro, più strade per ogni nodo. |

## Revisione indipendente (passo 14): che cosa ho corretto

Revisione di un subagente Opus, che ha letto manuale, specifiche e campagna e ha simulato lo scontro con le regole
del Motore.
- **L'orologio poteva chiudere il climax nel mezzo dello scontro** (a orologio pieno il Motore dice un finale e ferma il
  tavolo). Ora l'orologio è attivo solo all'ovile e alla carbonaia, un segno ogni nove risposte; alla torre non è
  attivo (verificato nel codice: il Motore guarda solo gli orologi della scena). Ovile e carbonaia hanno un finale
  di sicurezza neutro al primo posto, così il Motore non decide mai al posto dei PG che entrano nel cunicolo.
- **La chiave**: presa con la forza o con destrezza (`nar_chiave_presa`) vale come quella data; la serratura della
  cripta si apre anche con i grimaldelli (`nar_cripta_grimaldello`), come vuole il manuale per il ladro.
- **Berta alla torre**: nessun testo la porta più alla torre (voce simile a Zirrà); aspetta sulla soglia.
- **Fughe**: «corda avvolta» tolta dai campi pubblici; la domanda della carbonaia non dice più che Ugo è un testimone;
  regex allargate fino a prendere tutte le 26 frasi di prova del revisore, senza falsi positivi nei campi pubblici.
- **La scelta**: l'usanza ora colpisce chi aiuta i predoni (Tonio non può dirsi innocente perché non mancano pecore); la
  terza via costa anche a Berta (il balivo sale per il cervo e conta le sue pecore), quindi non domina il silenzio;
  le monete hanno la torre coniata e il balivo le riconosce, quindi l'argento non cancella i prezzi; il balivo non
  arriva più all'alba.
- **Mondo**: Ugo può scendere in paese di giorno (la carbonaia non si lascia di notte); il fuoco nella torre si accende al
  tramonto; c'è un tamburo accanto a Grosso e un corno alla cintura di Zirrà; l'avviso è stato inchiodato da Berta dentro
  casa; tolto il chiavistello «alzato da dentro», che non aveva causa.
- **Prosa**: «stanotte» detto la sera sembra «questa notte»: ora «ieri notte» o «la notte scorsa»; «Porta in cantina» e
  «Porta pane» sembravano ordini; il segnale di Ugo coincideva con il suo tic; le mosse morbide non copiano più battute
  d'attesa (il cane non scappa due volte); Zirrà pianta la spada prima di tendere la mano; meno «sbuffa» e meno «pelle».
- **Regole**: il salvezza per la fossa ora somma la Destrezza (`ts_morte_destrezza`, come p. 43); cadute arrotondate come
  p. 59; punti ferita di Zirrà (12) e Grosso (7) alzati entro i loro dadi, per uno scontro pericoloso.

## Che cosa non ho corretto, e perché

- **Tonio senza scheda**: le voci registrate sono quattro e la richiesta chiede 3–4 PNG con voce; alla torre restano
  libere solo vincent (vecchio) e nadine (simile a Zirrà). Mitigato: regola di prosa, vincolo pubblico («parla poco e
  chiede soltanto la chiave»), tre versioni di `nar_tonio_zitto`.
- **La fionda di Fulco con la Forza** (1d4+1): il revisore la riteneva sbagliata, ma il manuale a p. 55 dice che le pietre
  della fionda sommano la Forza.
- **Il mistero si capisce già all'ovile, se il tavolo guarda tutto**: accettato. Le scene dopo portano la conferma, lo
  scontro, l'alibi di Ugo e la scelta; ho tolto solo l'indizio senza causa.
- **`zir_resa` con qualunque Carisma riuscito, anche con Grosso in piedi**: il Motore non sa chi è a terra; la nota
  sociale dice all'arbitro che un PNG ostile si convince a difficoltà difficile o ardua.
- **PNG morti o fuggiti restano nel catalogo**, e il bersaglio dei PNG è chi li ha colpiti (l'odio di Grosso per gli elfi
  non si gioca da solo): limiti del Motore, il master li corregge dal pannello.
- **Il +1 degli halfling all'iniziativa** e gli altri punti in cui il Motore gioca diversamente dal manuale (salvezza
  contro la morte con un numero solo, iniziativa tirata una volta, morale al primo caduto, nessun limite a dardo
  incantato e all'attacco furtivo, nessun 20 o 1 naturale): lo schema non li esprime; sono scritti in `regole/regole.yaml`.

## I tre rischi maggiori per un narratore piccolo che non conosce i segreti

1. **Tonio improvvisato**: senza scheda, il narratore può farne una vittima vera o farlo confessare troppo presto.
2. **I goblin dopo lo scontro**: battute d'attesa di un PNG già a terra o fuggito, se il master non lo toglie.
3. **La porta di ferro senza chiave e senza grimaldelli**: il climax regge lo stesso (il ragazzo, lo scontro, la
   scelta), ma un tavolo può fissarsi sulla cripta chiusa; il vincolo pubblico dice come si apre.

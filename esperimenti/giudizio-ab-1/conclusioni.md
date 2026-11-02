# Esperimento A/B n. 1 — conclusioni (2 novembre 2026)

A = narratore che improvvisa tutto (prompt `narratore.md`, contesto completo con i segreti).
B = repertorio: Haiku sceglie battute pre-scritte da Opus con `[usa]` e improvvisa i raccordi; i segreti non sono nel
suo contesto. Stessa scena, stessi due copioni scritti alla cieca, Haiku 5.5, voce finta.
Giudice Opus cieco (etichette X/Y casuali per copione, chiave in `chiave.json`), rubrica R1–R12 del manuale.

## Risultati

| | indagine A | indagine B | pressione A | pressione B |
|---|---|---|---|---|
| Rubrica /36 | **20** | 12 | **17** | 15 |
| Fughe (giudice) | 1 | 2 | 2 | 1 |
| Canone inventato | 3 | 4 | 3 | **0** |
| Agency violata | 2 | 4 | 3 | **1** |
| Battute PNG riferite dal narratore | 8 | 1 | 2 | **0** |
| Azioni ignorate | **1** | 11 | **1** | 9 |
| Ripetizioni | 2 | 9 | 4 | 3 |
| % frasi > 16 parole | 26,5% | **3,4%** | 18,6% | **5,1%** |
| Domande meta gestite male | 0/2 | 1/2 | 1/2 | **0/2** |

Latenza (mediana, prima frase pronta): A 1,08 s, B 0,98 s; risposta completa A 2,5 s, B 1,5 s.
Costo per turno: A $0,0007, B $0,0008.

## Lettura

- **Nel complesso vince A** (37 contro 27 su 72). Tutte e quattro restano sotto la media di 2 punti: nessuna è pronta.
- **B perde per un motivo preciso: non risponde alle azioni.** 20 azioni ignorate contro 2. Il selettore riempie il turno
  con battute *disponibili* invece che *pertinenti* (il cane due volte, la borsa tre volte, la stessa battuta di
  Baldrin in due turni), lascia muti PNG interpellati, e in «pressione» l'orologio si ferma per cinque turni.
- **B vince dove la scrittura è preparata**: frasi corte, niente battute riferite, meno canone inventato, domande meta
  gestite nella finzione, meno decisioni prese al posto dei PG.
- **A perde dove serve disciplina**: la fuga peggiore del lotto (Ottavia nomina Gualtiero a una domanda banale),
  battute dei PNG nella voce del narratore, nessuna chiusura con invito in «indagine», frasi lunghe.
- Campione piccolo (una corsa per condizione): le differenze di pochi punti possono essere rumore; quella sulle
  azioni ignorate no.

## Cosa cambiare (B2)

1. **Prima le azioni.** Ogni azione dichiarata riceve la sua risoluzione; il selettore lega ogni `[usa]` a un'azione
   (`[usa] id > pg_x`) e il Motore rifiuta l'uscita se un'azione resta senza risposta (validatore E5).
2. **Catalogo pertinente.** Il Motore mostra solo le battute pertinenti alle azioni del turno (temi, PNG nominati),
   più il segno d'orologio quando è dovuto; le battute di riempimento escono solo se scatta lo stallo.
3. **Pre-scritto solo ciò che conta**, come nell'idea originale: bugie, confessioni, indizi, segni dell'orologio,
   momenti e finali. Le reazioni generiche (saluto, domanda gentile…) diventano improvvisazione guidata dalla
   scheda, oppure restano come esempi di voce, non come battute da far uscire.
4. **Anti-ripetizione**: una battuta e le sue varianti non tornano entro 3 turni.
5. **Orologio imposto dal Motore** anche in modalità B («mostralo in questa risposta» quando è dovuto).
6. In entrambe le modalità servono i filtri strutturali di F1 (agency, battute riferite, lunghezza, canone,
   chiusura con invito): il giudice li indica come correzione per ogni difetto trovato.

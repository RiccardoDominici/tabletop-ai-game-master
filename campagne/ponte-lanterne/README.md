# Il ponte delle lanterne

Una sessione serale (due ore, due ore e mezza) per 3–4 giocatori di livello 1, cinque PG pregenerati.
Mistero di paese sotto la pioggia, caldo e umano, con qualche sorriso. Niente combattimento necessario,
niente dadi in F0. Scritta con la skill `preparatore`; le note sulla skill stanno in `NOTE_SULLA_SKILL.md`.

## La situazione

Vadolungo, l'ultima notte di novembre. La Lenta è in piena e il Borgo Basso passa il Ponte delle
Lanterne verso la Riva Alta. Due gruppi restano tagliati fuori: i sette vecchi del Ricovero, a monte, e
le famiglie delle Case Lunghe, a valle. La Bigia, la chiatta del ponte, fa in tempo a un solo viaggio
prima del terzo tocco della campana, quando per regola l'acqua tocca la criniera del leone di pietra e
il custode chiude la catena. Chi resta di là all'alba salirà sulle barche del prestatore Vischi,
firmando la casa in pegno.

Il segreto: quarant'anni fa il padre di Vischi ha fatto calare il leone di due spanne. Il vero segno del
pericolo è un'onda scolpita dai costruttori sul pilone: il ponte regge circa un'ora in più.

## Scene (un menù, non un binario)

| Scena | File | Intensità | Cosa succede |
|---|---|---|---|
| Il ponte, al primo tocco | `scena.yaml` (la gioca il server F0) | 3 | chi salvare per primo; la barca; il leone, il libro dei passi |
| Il Borgo Basso sott'acqua | `scene/scena_borgo_basso.yaml` | 4 | il viaggio della Bigia; Rosa e il Ricovero; i ballatoi delle Case Lunghe |
| La Casa del Sale | `scene/scena_casa_del_sale.yaml` | 3 | il consiglio vota la chiusura; lo studio di Vischi, la cassa di ferro |
| Il terzo tocco | `scene/scena_terzo_tocco.yaml` | 5 | la catena, il patto di Vischi, l'ora sulla rampa |

Il Borgo e la Casa del Sale si giocano in qualunque ordine, o in parallelo se il gruppo si divide.

## PNG con voce

| PNG | Voce | Vuole | Mente su | Segnale |
|---|---|---|---|---|
| Tullio Bellora, il custode | vincent | tenere il casello per la nipote senza chiudere il ponte in faccia al Borgo | perché chiuderà al tocco: Vischi gli ha detto che il debito del tetto scade se tiene aperto | si gratta la nuca sotto il berretto e si guarda le scarpe |
| Leandro Vischi, il prestatore | lucian | il ponte chiuso al tocco, per far firmare il Borgo all'alba | il leone (sa che è stato calato) e chi salirà sulle sue barche (solo chi firma) | lucida l'anello con il sigillo sul fazzoletto |
| Bice Bellora, la lampionaia | tabitha | fare da faro alla barca e tenere il ponte da sola | dov'era ieri notte: pescava anguille sotto l'arcata e ha visto lo scrivano misurare il pilone | si tira la treccia e fischietta |
| Rosa Galli, custode del Ricovero | nadine | che la barca vada prima dai bambini | come stanno i suoi vecchi: Ernesto ha la febbre e non c'è fuoco | si liscia il grembiule due volte e sorride |

Rosa e Bice non sono mai nella stessa scena: le due voci sono troppo vicine. Comparse senza voce: lo
scrivano Ottone, il console Ugolino, Nerio dei barcaioli, la gente in fila, l'oca Contessa.

## Come funziona

- **Indizi.** Tre conclusioni chiave: il leone calato (nove indizi in sei nodi: l'onda, la malta, il
  libro dei passi, il detto del vecchio Bellora, Bice, Rosa, il registro, la corda a nodi, il ponte fermo
  al tocco), le firme di Vischi (sei indizi), il Ricovero che sta peggio di quanto dice Rosa (cinque).
  Nessun indizio dietro un tiro; due arrivano da soli (lo scrivano con la corda, il ponte che non trema).
- **Orologi.** `o_piena` (otto segni per tutta la sessione, l'ultimo è il terzo tocco), `o_firme` (sei
  segni alla Casa del Sale), `o_rampa` (quattro segni, solo se il ponte resta aperto dopo il tocco).
- **La scelta.** Prima: chi va nell'unico viaggio sicuro. Al tocco: chiudere (chi resta di là passa la
  notte sopra l'acqua e firma all'alba); accettare il patto di Vischi (barche gratis per tutti, ma il
  leone resta una bugia e lui resta in consiglio); tenere aperto un'ora sulla prova dell'onda (un secondo
  viaggio a rischio sulla rampa, che può fallire, e all'alba il casello di Tullio è di Vischi).
- **Catena.** A terra il ponte è aperto; alzata e tesa tra i paletti, è chiuso. Si dice «chiudere» e
  «tenere aperto».

## Chi vede quale file

- Il narratore in modo A (F0): `stile.yaml`, `campagna.yaml` senza `preparazione`, la scheda della scena,
  le schede dei PNG presenti, `pg.yaml` senza le conoscenze private.
- Il selettore in modo B: lo stesso, meno ciò che elenca `repertorio/parole_segrete.yaml →
  da_togliere_dal_contesto` (indizi, segreti dei PNG, al_completo, la regola di prosa sul leone…), più il
  catalogo delle battute `id · chi · tipo · quando`.
- I telefoni: a tutti la `situazione_comune`; a ciascuno il suo PG, con le `conoscenze_private`.
- Il proiettore: i prompt in `aspetto` e `immagine` (nessun segreto); le `situazioni` dopo la rivelazione.
- Solo chi prepara: `brief.yaml`, `preparazione`, `autovalutazione.md`, `NOTE_SULLA_SKILL.md`.

## Controlli

```
python3 -I strumenti/valida_campagna.py campagne/ponte-lanterne --rigoroso --avvisi
python3 strumenti/immagini/genera.py campagne/ponte-lanterne --dry-run
```

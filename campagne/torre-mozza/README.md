# La chiave della Torre Mozza

One-shot in italiano per **Basic Fantasy RPG** (4ª edizione, release 142): tre giocatori, circa due ore, tre scene,
quattro PG pregenerati di primo livello. Fiaba di montagna, asciutta e un po' cupa.

> Questo file è per chi prepara o guida la partita: contiene i segreti. I giocatori non lo leggono.

## La situazione

A Spinalba, borgo di pastori sotto una torre di guardia in rovina, è sparito Tonio, sedici anni, figlio della
pastora Berta. Sulla porta di casa c'è una lavagna: la chiave del vecchio castellano, che i Benni custodiscono,
alla torre entro mezzanotte, o il ragazzo muore. Nella torre ci sono i goblin di Zirrà. In paese accusano Ugo, il
carbonaio del bosco.

**La verità**: Tonio non è stato rapito. Ha portato lui i goblin alla cripta della paga della guarnigione, sotto la
torre, perché con quell'argento vuole pagare la decima che la madre non ha pagato (alla prima neve il balivo si
prende l'ovile). La lavagna l'ha scritta lui. Zirrà finge di dividere con lui, ma vuole tenersi tutto e anche il
ragazzo. Ugo l'ha visto salire da solo, ma tace perché quella notte era a caccia di frodo nella riserva.

**La scelta finale**: che cosa raccontare a Spinalba. La verità (per l'usanza della valle chi aiuta i predoni
lascia la valle per sette inverni: Berta perde il figlio); il silenzio (il paese caccia Ugo); l'alibi di Ugo (il
balivo, salito per il cervo, gli toglie il bosco e conta anche le pecore dei Benni). L'argento non risolve niente:
le monete hanno la torre coniata, e il balivo le riconosce.

## Le scene

| Scena | File | Che cosa succede | PNG |
|---|---|---|---|
| L'ovile dei Benni, all'imbrunire | `scena.yaml` | Indagine e sfida sociale: la lavagna, il giaciglio vuoto, i cani, l'avviso del balivo, la chiave | Berta, Ugo |
| La carbonaia di Ugo, a notte | `scene/scena_carbonaia.yaml` | Le impronte sul sentiero, la fossa coperta, la postierla sotto i rovi, l'alibi di Ugo | Ugo |
| La Torre Mozza, a mezzanotte | `scene/scena_torre.yaml` | Il climax: Zirrà e Grosso, la porta di ferro della cripta, lo scontro probabile, la scelta | Zirrà, Grosso |

Intensità 2, 3, 5. Il master passa di scena dal pannello; Ugo torna comunque alla carbonaia prima dei PG.

## I PNG

| PNG | Voce | Vuole | Mente su | Segnale |
|---|---|---|---|---|
| Berta Benni, pastora | nadine | riportare a casa Tonio prima di mezzanotte | la decima non pagata | si tira lo scialle sulle spalle e guarda la porta di casa |
| Ugo Faggioli, carbonaio | vincent | vendere il carbone senza domande | dove era la notte scorsa; che cosa ha visto sul sentiero | si rigira il cappello tra le mani; si gratta la barba bruciacchiata e guarda altrove |
| Zirrà, guerriera goblin | tabitha | tutto l'argento della cripta | che il ragazzo sia suo prigioniero | si gratta l'orecchio con la punta della spada e sorride storto |
| Grosso, hobgoblin | lucian | carne fresca, non gli ossi di Zirrà | (comparsa: non mente) | — |

nadine e tabitha sono voci simili: Berta resta all'ovile e Zirrà resta alla torre. Tonio non ha scheda né voce:
parla poco, e le sue parole le riferisce il narratore.

## I PG

Livia Sarti (guerriera umana), Fulco Granito (chierico nano), Nespola Tondi (ladra halfling), Eliandro (mago elfo).
Ognuno ha un aggancio pubblico e una conoscenza privata che apre una strada: la decima dei Benni (Livia), le
postierle delle torri (Fulco), il ragazzo che al mercato chiedeva dell'argento vecchio (Nespola), i goblin che non
scrivono (Eliandro). Ogni strada ha anche un indizio che non dipende da quel PG.

## Indizi, orologio, scontro

- **Tonio è salito di sua volontà**: dieci indizi in cinque nodi (giaciglio, cani, lavagna e pali con le stesse erre
  rovesciate, stazzo intatto, impronte, racconto di Ugo, mappa a carbone, corda senza nodo, Grosso). Tre essenziali,
  nessuno dietro un tiro; due arrivano da soli.
- **Il motivo, la decima**: l'avviso dietro la porta, Berta che cede, il conto a carbone accanto alla porta della
  cripta, e quello che dice Tonio.
- **Orologio della sera** «La torre aspetta la chiave»: otto segni udibili da ovunque (corni, fuoco, cani, luna,
  tamburo), uno ogni nove risposte, attivo all'ovile e alla carbonaia. Alla torre non corre: lì i finali li sceglie il
  tavolo, perché a orologio pieno il Motore direbbe un finale anche nel mezzo dello scontro.
- **Scontro**: Zirrà (goblin guerriera, 3-3 dadi vita, Classe d'Armatura 14, 12 punti ferita, morale 7) e Grosso
  (hobgoblin, 1 dado vita, 1d8, 7 punti ferita, morale 8). Si può evitare trattando con Zirrà o dando da mangiare a
  Grosso. Simulato con le regole del Motore: almeno un PG a terra nel 20–39% degli scontri, un PG morto nel 7–16%.
- **La cripta** si apre con la chiave dei Benni (data da Berta o presa) o con i grimaldelli della ladra.

## Le regole

Il set sta in `regole/` ed è ricavato dal manuale (CC BY-SA 4.0, quindi sta nel repository con la stessa licenza):
d20 contro un numero (17 per le prove al primo livello, la Classe d'Armatura per gli attacchi), caratteristiche con
il bonus della tabella del manuale, tiri salvezza e abilità del ladro convertiti in bonus sul d20, iniziativa 1d6
più Destrezza, morale, e la regola facoltativa del tiro salvezza contro la morte per i PG. Ogni scelta e ogni
approssimazione è commentata in `regole/regole.yaml`; il riassunto per i giocatori è `regole/riassunto.md`.

## Chi vede che cosa

- I **giocatori**: sul telefono la propria scheda, la situazione comune e la propria conoscenza privata; la scheda
  «Regole» (`regole/riassunto.md`) e «Chiedi una regola» (`regole/estratti/`).
- Il **selettore** della modalità repertorio: la carta di stile, i fatti pubblici, la parte pubblica di scene e PNG, il
  catalogo `id · chi · tipo · quando` (compilato da `strumenti/contesto_modo_b.ts`). Mai `preparazione`, i
  `come_si_trova`, gli elementi NASCOSTA, i `mai_dice`, le verità delle menzogne.
- Il **master** al pannello: tutto.

## Che cosa manca

Immagini e audio non sono ancora generati: il passo 16 (`scripts/prepara.sh campagne/torre-mozza`) lo lancia chi
prepara la partita, con l'alimentatore collegato, perché le immagini usano la GPU. La campagna è pronta da giocare
quando esistono `immagini/manifest.json` e `audio/manifest.json`.

I copioni ciechi per le prove sono in `esperimenti/copioni/torre-mozza/`.

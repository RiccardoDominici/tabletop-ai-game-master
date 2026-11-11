# Set di regole delle campagne

Richiesta di Riccardo: l'utente può mettere il suo manuale di regole in una cartella del progetto. Il manuale è
facoltativo: senza, vale l'SRD 5.2. Quando si crea una campagna si crea anche un set di regole ricavato dal manuale,
e la partita lo usa ogni volta. Così «la gente capisce le regole».

In breve:
- `manuali/` contiene il manuale (PDF, md, txt) e non entra mai in git.
- `campagne/<id>/regole/` contiene il set: `regole.yaml` (la struttura), `riassunto.md` (per i giocatori) e
  `estratti/*.md` (passi del manuale da consultare).
- Il Motore tira con il set.
- L'arbitro decide con il vocabolario del manuale, e riceve solo i passi pertinenti all'azione.
- La carta mostra la regola applicata.
- Il telefono ha la scheda «Regole» e «Chiedi una regola».

## 1. Dove sta cosa

| Percorso | Chi lo scrive | In git |
|---|---|---|
| `manuali/<file>.pdf|.md|.txt` | l'utente | **mai** (`manuali/` nel .gitignore della radice) |
| `campagne/<id>/regole/regole.yaml` | la skill Preparatore, dal testo estratto del manuale | solo se `licenza.libera: true` |
| `campagne/<id>/regole/riassunto.md` | la skill (≤ 400 parole, per i giocatori) | come sopra |
| `campagne/<id>/regole/estratti/<id>.md` | la skill (passi del manuale, ≤ 12 righe ciascuno) | come sopra |
| `assets/regole/srd-5.2/` | il codice (riassunto e passi dell'SRD 5.2, CC-BY-4.0; in `en/` quelli inglesi) | sì |

**Senza `regole/regole.yaml`** la campagna gioca con l'SRD 5.2 del codice (apps/server/src/regole/srd.ts). Riassunto e
passi vengono da `assets/regole/srd-5.2/` (in italiano; nelle altre lingue dei contenuti da `assets/regole/srd-5.2/<codice>/`, oggi `en/`).
Anche le campagne di oggi giocano così, identiche a prima.
- **Con `id: srd-5.2`** vale lo stesso, ma riassunto ed estratti della campagna prendono il posto di quelli dell'SRD.
- **Un `regole.yaml` rotto** non ferma la sessione: l'errore va nel log («set non valido, si gioca con l'SRD 5.2») e
  si torna all'SRD.

**Licenza.** Un set ricavato da un manuale non libero (`licenza.libera: false`) resta su questo computer.
- Il caricatore scrive `regole/.gitignore` con `*`.
- Il test `apps/server/test/regole-integrazione.test.ts` fallisce se un `regole.yaml` tracciato da git ha
  `libera: false`, oppure se manca `manuali/` nel .gitignore.
- I passi di un manuale non libero sono citazioni brevi, per uso personale; non si pubblicano.

## 2. regole.yaml: lo schema (per il validatore e per la skill)

```yaml
id: due-sei-mondo            # [V] minuscole, cifre, - e .; «srd-5.2» = l'SRD del codice
nome: "Mondo a 2d6"          # [V] come lo vedono i giocatori
per_il_narratore: "…"        # facoltativo: come si tira, in una frase (se manca la scrive il codice)
fonte:
  titolo: "…"                # [V] titolo del manuale
  autore: "…"                # facoltativo
  file: "manuali/mondo.pdf"  # facoltativo: da dove è stato estratto
licenza:
  nome: "CC-BY-4.0"          # [V] o «proprietaria», «CC0», …
  libera: true               # [V] booleano; false = il set non va nel repository
  attribuzione: "…"          # facoltativa: va nei crediti e nella scheda «Regole»
risoluzione:
  tipo: d20_cd | 2d6_fasce | sotto_soglia   # [V]
  # d20_cd:       dado: 20
  # 2d6_fasce:    dadi: 2; fasce dalla più alta, min incluso, l'ultima con min vuoto
  fasce:
    - {min: 10, esito: successo, nome: "Successo pieno"}
    - {min: 7, esito: parziale, nome: "Successo con un costo", significato: "riesce, ma…"}   # significato facoltativo
    - {min: null, esito: fallimento, nome: "Fallimento"}
  # d20_cd: facoltativi critico (dado naturale ≥ questo: riesce comunque), disastro (≤ questo: fallisce comunque),
  #   critici: attacchi | tutti (a quali tiri valgono). Se il set non li scrive valgono quelli dell'SRD: 20 e 1,
  #   solo negli attacchi; `critico: null`, `disastro: null` li tolgono.
  # sotto_soglia: dado: 20 | 100 [V]; facoltativi critico (≤ questo), disastro (≥ questo), gradi
  dado: 100
  critico: 1
  disastro: 100
  gradi: [{divisore: 5, nome: "Successo estremo"}, {divisore: 2, nome: "Successo difficile"}]   # anche significato
caratteristiche:              # [V] almeno una; id snake_case senza accenti, unici
  - {id: fascino, nome: "Fascino"}
abilita:                      # facoltative; caratteristica = id esistente [V]
  - {id: persuadere, nome: "Persuadere", caratteristica: potere}
modificatore:
  tipo: srd | diretto | soglia | tabella # [V] srd = (p−10)/2; diretto = il valore è il bonus; soglia = solo con sotto_soglia [V];
                                         #   tabella = la scheda scrive il punteggio, il bonus viene dalla tabella del manuale
  tabella:                    # solo con tabella [V]: righe dal punteggio più basso, ognuna vale dal suo «da» in su
    - {da: 3, mod: -3}        #   (Basic Fantasy: 3 −3; 4–5 −2; 6–8 −1; 9–12 0; 13–15 +1; 16–17 +2; 18 +3). Sotto la
    - {da: 13, mod: 1}        #   prima riga vale la prima; il validatore avvisa (rigoroso: errore) per un punteggio sotto
difficolta:                   # [V] d20_cd: valore (la CD) obbligatorio; sotto_soglia: divisore (1 = normale);
  - {id: normale, nome: "Normale", modificatore: 0}          #     2d6_fasce: modificatore al tiro (0 se manca)
  - {id: rischiosa, nome: "Rischiosa", modificatore: -1}
difficolta_predefinita: normale   # [V] tra le difficoltà; se manca, quella di mezzo
vantaggio:
  tipo: due_dadi | dado_bonus | bonus | nessuno   # [V] due_dadi: si tira un dado in più (d20: il migliore;
  valore: 1                                        #   2d6: si tengono i due migliori; sotto soglia: il più basso)
                                                   #   dado_bonus: solo d100, un dado delle decine in più
                                                   #   bonus: ± valore al tiro
attacchi:
  tipo: prova | automatico   # prova: si tira con l'abilità/caratteristica dell'arma (d20_cd contro la difesa
  armatura_riduce: true      #   del bersaglio); automatico: colpisce sempre, si tira solo il danno
  parziale: scambio          # 2d6: con un successo parziale anche il bersaglio colpisce
  danno_critico: doppio      # doppio (SRD, predefinito): col critico si raddoppiano i dadi del danno; normale: no
  danno_minimo: 0            # un colpo andato a segno fa almeno questi danni (Basic Fantasy: 1; predefinito 0)
danni: {nome: "Ferite", a_zero: "Fuori gioco: …"}
condizioni: [{id, nome, effetto}]          # testo per narratore e riassunto
sociale:                                    # che cosa si tira per convincere un PNG, se l'arbitro non lo dice
  caratteristica: fascino                   # [V] esistente
  abilita: persuadere                       # [V] esistente
  nota: "Per convincere si usa la mossa Convincere."   # la legge l'arbitro
mosse:                                      # facoltative (giochi alla PbtA)
  - id: convincere                          # [V]
    nome: "Convincere qualcuno"
    quando: "quando cerchi di convincere un PNG con parole, promesse o minacce"   # la legge l'arbitro
    caratteristica: fascino                 # [V] esistente
    esiti: {successo: "…", parziale: "…", fallimento: "…"}   # [V] successo e fallimento obbligatori
sottosistemi: [{id, nome, testo}]           # altro (magia, sanità…): solo testo, per ora
parole_chiave:                              # facoltativo, per l'arbitro a regole (profilo locale): id → parole
  convincere: [convinco, persuado, prometto]  # [V] id di un'abilità, mossa o caratteristica del set
combattimento:                              # facoltativo: senza, SRD completo per l'SRD e un default per gli altri tipi
  iniziativa:
    tipo: individuale | per_schieramento | nessuna   # [V]
    dado: 20                                # [V] 4, 6, 8, 10, 12 o 20
    caratteristica: destrezza               # [V] esistente, o null
    ogni_round: false                       # booleano: si ritira a ogni round (B/X)
  fasi:                                     # [V] almeno una; id snake_case
    - {id: mischia, nome: "Mischia", png: attacco_mischia}   # [V] png: attacco | attacco_distanza | attacco_mischia | null
  azioni: [{id, nome, quante}]              # economia del turno (testo)
  danni:
    modello: pf | ferite | stress           # [V]
    a_zero: {pg: tiri_morte | fuori_gioco | morte, png: morte | fuori_gioco}   # [V]
    tiri_morte: {cd: 10, successi: 3, fallimenti: 3, venti_rialza: true, uno_doppio: true}
    # venti_rialza: un 20 naturale rimette in piedi con 1 PF; uno_doppio: un 1 naturale vale due fallimenti.
    # Sono regole dell'SRD 5.2: valgono se il set non le scrive (prima valevano per ogni set, anche dove il
    # manuale non le ha, come il «save vs. death» di Basic Fantasy).
  condizioni:                               # [V] id snake_case; effetti dall'elenco chiuso (docs/combattimento.md §2)
    - {id: prono, nome: "Prono", icona: "⬇", effetti: [svantaggio_attacchi, attacchi_contro_vantaggio], testo: "…"}
  condizione_a_zero: privo_di_sensi         # [V] tra le condizioni, o null
  fine: {morale: true}                      # morale B/X: 2d6 contro scheda.morale dei PNG
```

Per il combattimento le schede dei set non SRD possono avere `attacchi[].distanza: true` (fase dei proiettili) e, per i
PNG, `morale` (2–12).

### Schede di PG e PNG per un set non SRD
Le schede stanno negli stessi posti delle schede SRD: `pg.yaml → personaggi[].scheda` e `png/<id>.yaml → scheda`. I
valori seguono il set, non più le sei caratteristiche di D&D:

```yaml
scheda:
  caratteristiche: {fascino: 2, vigore: -1, …}  # [V] tutte e sole quelle del set; interi
  abilita: {persuadere: 65}                     # facoltative, id del set: bonus (d20, 2d6) o soglia (sotto_soglia)
  pf: 6                                         # [V] > 0 (si chiamano come danni.nome)
  difesa: 13                                    # d20_cd: la CA del bersaglio; senza, CD della difficoltà predefinita
  armatura: 1                                   # con armatura_riduce: si toglie dal danno subito
  attacchi: [{nome: "Spada", danno: "1d8", caratteristica: vigore}]   # oppure abilita: combattere
```

Con l'SRD 5.2 le schede restano quelle di docs/prove.md §2 (punteggi, competenze, CA calcolata).

**Prove della scena** con un set non SRD, in `scena.yaml → prove`:
`{id: p_…, quando, mossa | abilita | caratteristica (id del set), difficolta (id del set), se_fallisce, parole}`.
`parole` (facoltativo, anche con l'SRD) sono le parole che chiamano la prova per l'arbitro a regole, oltre al `quando`.

**Repertorio.** `richiede.prova` con un set non SRD accetta anche gli id del set (mosse, abilità, caratteristiche):
`richiede: {prova: convincere}` apre la battuta solo dopo una riuscita della mossa Convincere. Il caricatore legge il
set della campagna; un id che non è del set né dell'SRD è un errore.

### riassunto.md e estratti/
- **riassunto.md**: al massimo 400 parole, per i giocatori. Dice come si tira, cosa vogliono dire i risultati, le mosse
  o le abilità principali, il combattimento e cosa fa il vantaggio. Usa solo titoli `#`/`##`, elenchi `-` e
  **grassetto**: il telefono lo mostra così, senza HTML.
- **estratti/<id>.md**: un passo per regola, al massimo 12 righe, con l'intestazione:
  ```
  ---
  titolo: "Convincere qualcuno"
  parole: [convincere, persuadere, promettere, minacciare]   # [V] almeno una: è così che lo si trova
  pagina: 34                                                  # facoltativa
  per: convincere                                             # facoltativo: l'abilità o mossa del set (arbitro a regole)
  ---
  Quando cerchi di convincere un PNG, tira 2d6+Fascino. Con 10+ …
  ```
  Le `parole` contano più del testo. La ricerca è per radici di cinque lettere: «convinco» trova «convincere».
  Quindi vanno messi i verbi che i giocatori scrivono nelle azioni.

## 3. Motore (apps/server/src/regole/, prove/risolutore-regole.ts)

- **SRD 5.2**: tutto com'era (prove/risolutore.ts e arbitro-haiku.ts). La suite resta verde.
- **Set non SRD**: `MotoreProve` passa a `risolviTurnoRegole`. Le schede sono quelle del set
  (regole/schede.ts) e i tiri escono da regole/risoluzione.ts:
  - `d20_cd`: d20 + modificatore (caratteristica col tipo del set + bonus dell'abilità) contro la CD della difficoltà.
    I naturali del set (`critico`, `disastro`; SRD: 20 e 1 negli attacchi) riescono o falliscono comunque, con il
    grado «critico» o «disastro» sulla carta; il danno del critico raddoppia i dadi solo con `danno_critico: doppio`.
  - `2d6_fasce`: 2d6 + statistica della mossa, o della caratteristica o abilità, + la difficoltà, e la fascia
    corrispondente. Con una mossa, il fatto per il narratore porta l'esito scritto nel manuale.
  - `sotto_soglia`: d20 o d100 ≤ soglia ÷ divisore della difficoltà. Il risultato ha un grado (estremo, difficile),
    oppure critico o disastro.
  - **Attacchi**: `prova` tira e, se riesce, applica il danno meno l'armatura; con un 2d6 parziale e `parziale:
    scambio` colpisce anche il bersaglio. `automatico` applica solo il danno.
- **Carta**: i campi in più sono `risoluzione`, `facce`, `grado` e `regola`. `regola` è la regola applicata, in parole:
  «2d6+2 (Fascino, Convincere qualcuno): 7–9, successo con un costo», «Persuadere 65%: d100 difficile, serve 32 o
  meno».

## 4. Arbitro (prove/arbitro-regole.ts)

- **Prompt di sistema**, in cache per tutta la sessione: la regola d'oro, gli elenchi del set (caratteristiche,
  abilità, mosse col loro `quando`, difficoltà), la nota sociale e il riassunto, tagliato a 2500 caratteri.
- **Messaggio**: solo i passi pertinenti alle azioni (al massimo tre, otto righe ciascuno, trovati per parole chiave),
  più personaggi, prove della scena e azioni, come per l'SRD.
- **Schema**: le enum sono gli id del set, quindi il modello non può inventare un'abilità.
- **Normalizzazione**: il Motore scarta ciò che non torna con i dati, come per l'SRD.

**Narratore e selettore.** Quando ci sono tiri, la sezione «Esiti dei tiri» del messaggio porta anche le regole del set
(regole/narratore.ts): come si tira (`per_il_narratore`, o una frase del codice) e che cosa vuol dire ogni esito nel
racconto. Per il 2d6, per esempio: «7–9 «Successo con un costo»: riesce, ma devi dare un costo, una scelta difficile o una
complicazione: raccontali insieme alla riuscita, mai come un successo pieno». Il `significato` di fasce e gradi lo
sostituisce. Con l'SRD 5.2 la regola resta quella di sempre.

## 5. Far capire le regole (telefono)

- **Scheda «Regole»** (`regole:leggi`): nome del set, fonte, licenza e attribuzione, e `riassunto.md`.
- **«Chiedi una regola»** (`regole:chiedi`): la risposta arriva solo a chi ha chiesto, nell'ack dell'evento. La dà
  Haiku (regole/chiedi.ts) in al massimo ottanta parole.
  - Il contesto contiene solo il riassunto e i passi trovati per la domanda: niente scene, PNG o segreti della
    campagna.
  - Una domanda alla volta per telefono, una ogni 4 s.
  - Senza modello (narratore a copione) la casella non c'è (`domande: false`).

## 6. Aperto

- **Skill e validatore**: fatti. Il testo si estrae con `strumenti/regole/estrai.py`; la skill Preparatore scrive il
  set al passo 1b; i controlli `[V]` stanno nella classe `REGOLE` (`strumenti/valida/regole_set.py`). Per l'SRD basta
  non scrivere `regole/`.
- **Richiede con un set non SRD**: `richiede.prova` non è ancora controllato contro gli id del set dal validatore.
- **Condizioni e sottosistemi** sono solo testo; il Motore non li applica ancora (in docs/da-fare.md).
- **Prove contrapposte e tiri salvezza** in un set non SRD diventano prove normali.

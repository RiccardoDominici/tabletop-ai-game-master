---
name: preparatore
description: Scrive una campagna completa di Cantastorie (il master IA per D&D dal vivo, in italiano) a partire da un brief breve, secondo il manuale del master. Produce la cartella campagne/<id>/ con carta di stile, canone, fronti e orologi, cronologia e logistica, schede scena, schede PNG, PG pregenerati, repertorio di battute (versione 2), parole segrete e prompt delle immagini, la porta fino a zero errori del validatore in modo rigoroso, e con scripts/prepara.sh la rende pronta da giocare (immagini e audio). Usala quando Riccardo chiede di preparare, scrivere o progettare una campagna, un'avventura, una sessione, uno scenario, una «sceneggiatura», o di aggiungere scene e PNG a una campagna esistente.
---

# Preparatore

*Versione del 3 novembre 2026. Le regole cambiano con il framework: se il validatore e questa pagina non
vanno d'accordo, vale il validatore, e la discordanza va segnalata.*

Sei il Preparatore (docs/architettura.md §4): il modello forte che scrive **prima** della sessione tutto
ciò che il narratore veloce (Haiku) userà dal vivo. Il narratore improvvisa poco e male; il Motore
impone la struttura; tu scrivi la sostanza. Una campagna fatta bene è giocabile da un modello piccolo
che non conosce i segreti, letta ad alta voce da una sintesi vocale, davanti a un tavolo vero.

Il tuo lavoro finisce solo quando:
1. `python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso` esce con **0 errori**, con node
   installato (senza node il controllo del contesto del modo B resta un avviso, e non basta);
2. la revisione indipendente (passo 14) è stata fatta e i suoi problemi gravi sono risolti;
3. `README.md` e `autovalutazione.md` della campagna sono scritti e tutto è committato;
4. `scripts/prepara.sh campagne/<id>` ha fatto immagini e audio (passo 16). La campagna è **pronta da
   giocare** solo quando esistono `immagini/manifest.json` e `audio/manifest.json`.

Non dichiarare finito nulla che il validatore non ha visto passare. Non scrivere a memoria regole che
sono nei riferimenti: aprili. Ogni regola sta in un posto solo: qui l'ordine del lavoro e le regole che
non si discutono; in `riferimenti/` la forma dei file e il mestiere.

## Passo 0: cosa leggere prima di scrivere una riga

Leggi per intero, nell'ordine:
1. `docs/manuale-master.md`: è la specifica. Ogni campo che scrivi viene da lì.
2. `riferimenti/schema.md`: la forma esatta di ogni file e le letture del manuale adottate dove il
   testo è ambiguo. Il validatore segue queste letture.
3. `riferimenti/mestiere.md`: come si progetta una situazione che regge dal vivo, con le lezioni delle
   prove (§8), la sessione a più scene (§9) e l'audio (§10).
4. `riferimenti/repertorio.md` e `docs/repertorio.md`: come si scrivono le battute pre-scritte, e
   `riferimenti/motore.md`: che cosa il Motore non fa (ancora), e quindi deve fare la campagna.
5. `riferimenti/immagini.md`: i prompt per le immagini (strumenti/immagini/).
6. `docs/f0-contratti.md`, sezione «File della campagna»: cosa carica il server oggi.

Poi guarda gli esempi, **senza copiarne il contenuto**:
- `strumenti/test_valida_fixtures/mini/`: la campagna più piccola che passa in modo rigoroso, con un
  esempio minimo di cronologia e logistica;
- `campagne/prova-f0/`: una scena sola di mezz'ora; scritta prima delle regole rigorose e poi portata a
  zero errori in rigoroso (confessioni con il loro cancello, la cicatrice spostata in una situazione);
- `campagne/ponte-lanterne/`: quattro scene per due ore e mezza, scritta alla cieca con questa skill:
  orologio di sessione, lo stesso luogo in due momenti, due voci simili tenute separate. Le sue
  `NOTE_SULLA_SKILL.md` dicono dove la skill di allora non bastava.

Controllo del passo 0: sai rispondere, senza riaprire i file, a queste domande. Cos'è `cede_se` e come
diventa un cancello. Perché un `quando` non può contenere un segreto. Quali campi riceve il selettore
in modo B. Quanti segni ha un orologio da sei. Cosa vuol dire `solo_esempio`. Se esiti su una, rileggi.

## Il brief

Riccardo dà un brief breve. Copia `modelli/brief.yaml` in `campagne/<id>/brief.yaml` e riempilo. Se
qualcosa manca, decidi tu e scrivi la scelta nel campo `decisioni`. Fai domande solo per ciò che non
puoi decidere da solo: i temi da evitare, il numero dei giocatori, la durata.

Dal brief ricavi:
- **id**: ascii minuscolo con trattini, per esempio `il-ponte-dei-sospiri`;
- **sessioni**: quante sessioni dura, il numero che decide il livello (vedi «Strati» sotto);
- **scene**: per una sessione di 20–40 minuti, una scena; per 2–3 ore, da 3 a 5 scene (C11). La prima è
  `scena.yaml`, le altre `scene/<id>.yaml`; il master passa di scena dal pannello;
- **PG pregenerati**: uno più del massimo dei giocatori (per «3–4 giocatori», cinque), perché la scena
  deve reggere con qualunque sottoinsieme;
- **linee e veli**: quelli del brief, più quelli che la storia rende necessari;
- **voci**: quale voce di `assets/voci/voci.yaml` va a quale PNG, e quali PNG non possono mai stare
  insieme (regola 9). Con quattro voci registrate questa scelta decide la storia: falla adesso. Un
  personaggio che conta ma non può avere una voce è una comparsa senza scheda: parla per bocca del
  narratore, in discorso indiretto, e la storia gli dà un motivo per parlare poco (un'usanza, un lutto).

## Strati: quanto si prepara

Il brief dice quante sessioni dura la campagna (`sessioni`, o `aperta`). Il numero decide il livello, e il
livello quali strati si preparano prima del gioco e quali tra una sessione e l'altra. La tabella è una sola,
in `strumenti/strati.py` (`python3 strumenti/strati.py --tabella`); qui c'è il riassunto.

| Sessioni | Livello | Prima del gioco | Oggi |
|---|---|---|---|
| 1 | one-shot | la sessione intera: tutti i passi di questa skill | si prepara e si gioca |
| 2–6 | arco | la sessione 1 completa, più il fronte d'arco con le tappe, gli atti, i finali, i PNG ricorrenti; le altre sessioni in una riga (`riferimenti/arco.md`) | non ancora (fasi D2–D4) |
| 7–20 | campagna | in più regioni, fazioni con orologio, tre conflitti, la fine dichiarata; il primo arco completo | non ancora (D5) |
| 21+ o aperta | saga | in più il mondo: una zona piena, le altre abbozzo, le fasi di gioco | non ancora (D5) |

- Il validatore legge il livello (classe `LIVELLO`): sopra la one-shot dà un errore chiaro, perché il
  framework non sa ancora giocare gli strati esterni. Se Riccardo chiede più sessioni, diglielo, e proponi
  una one-shot o la prima sessione di un arco.
- Un livello diverso da quello delle sessioni si forza con `livello:` solo col motivo in `decisioni.altre`.
- `ore_per_sessione` (predefinito 2,5) decide le scene della one-shot: sotto un'ora una scena, sennò 3–5.
- Tra una sessione e l'altra (dal livello arco): `riferimenti/tra-le-sessioni.md` e `scripts/tra-sessioni.sh`.

## Ordine di lavoro

Ogni passo finisce con un **controllo**. Non passare al successivo finché il controllo non è
soddisfatto: ogni controllo è soddisfacibile con i file scritti fino a quel passo. `--solo` mostra solo
le classi già scrivibili; gli altri errori arrivano quando scrivi i file che li riguardano.

| Passo | Scrivi | Controllo |
|---|---|---|
| 1 | `brief.yaml → decisioni.situazione` | le domande del passo |
| 2 | `stile.yaml` | `--solo STILE` |
| 3 | `campagna.yaml`: canone, fronti, orologi, cattivo, sessione, cronologia e logistica | `--solo STILE,CANONE,FRONTI,SESSIONE,MONDO` |
| 4 | `campagna.yaml`: rivelazioni, colli di bottiglia, nodi (gli indizi li progetti qui) | la prova dei due indizi mancanti |
| 5 | `scena.yaml`, `scene/*.yaml` senza `esiti` | `--solo INDIZI,GRAFO,PROSA,SESSIONE,MONDO`, poi commit |
| 6 | `pg.yaml` | `--solo PG,FRONTI` e la prova del PG tolto |
| 7 | `png/*.yaml` | le domande del passo |
| 8 | primo giro del validatore | modo normale, **zero errori**, poi commit |
| 9 | `repertorio/*.yaml` ed `esiti` delle scene | `--solo REPERTORIO,COPERTURA,PROSA,SCENA` e la tabella di copertura |
| 10 | `repertorio/parole_segrete.yaml` | nessun errore `SEGRETI` |
| 11 | situazioni delle immagini, lettura dei prompt | `--dry-run` letto, poi commit |
| 12 | validatore rigoroso e copioni | zero errori, avvisi giustificati, poi commit |
| 13 | lettura ad alta voce | la lista del passo |
| 14 | revisione indipendente | i problemi gravi corretti |
| 15 | `README.md`, `autovalutazione.md` | commit |
| 16 | immagini e audio con `scripts/prepara.sh` | «pronta da giocare», poi commit degli asset |

Il comando del validatore è sempre `python3 -I strumenti/valida_campagna.py campagne/<id>` più le opzioni
della tabella.

### 1. Situazione, non trama
Scrivi in quattro frasi, una per voce, dentro `brief.yaml → decisioni.situazione`:
- chi vuole cosa (il cattivo, C3);
- cosa succede se i PG non fanno niente;
- qual è la verità nascosta;
- quale scelta costerà qualcosa ai PG.

Leggi `riferimenti/mestiere.md` §1 e §6.

**Controllo**:
- la scelta finale ha almeno due esiti accettabili, e ognuno ha un prezzo;
- **quando i PG hanno scoperto tutto, la scelta è ancora difficile**: nessuna prova, promessa o PNG
  cancella il prezzo di una delle strade;
- nessun PNG può risolverla al posto dei PG (D8);
- la verità si scopre in almeno tre modi.

### 2. Carta di stile → `stile.yaml`
Premessa in una frase, tono, tema, registro del narratore e regole di prosa della campagna. Poi `[STILE]`
in inglese, la tavolozza musicale (solo i tag del vocabolario chiuso), linee e veli.

`stile.yaml` va **per intero** al selettore del modo B, che non conosce i segreti (regola 1). Quindi le
regole di prosa non contengono la soluzione, nemmeno come divieto: «il narratore descrive ciò che si
vede e non dice mai la causa: la conclusione la tirano i PG». Il divieto preciso («il narratore non
chiama mai veleno il pane») va nel `come_si_trova` dell'indizio principale, che vede solo il narratore
del modo A. Anche il lessico delle regole è pubblico: niente parole segrete in un elenco di parole.

**Controllo**: `--solo STILE`; la premessa sta in una frase.

### 3. Canone, fronti, orologi, cattivo, sessione, cronologia → `campagna.yaml`
- **Canone**: fatti atomici, uno per riga, con `noto_ai_pg`. Ogni verità nascosta è un fatto. Ogni cosa
  che un PNG sa, o su cui mente, è un fatto. Lo stesso fatto non si scrive mai due volte con parole diverse.
- **Fronti** (C2): uno di campagna, uno o due d'avventura, con due o tre pericoli per fronte. Ogni
  pericolo ha il suo orologio.
- **Orologi** (sotto la chiave `orologi`, fuori da `preparazione`): quelli che il narratore deve vedere,
  con un segno per segmento e `segno_almeno_ogni`. Per una sessione lunga, un orologio di sessione
  (mestiere.md §9).
- **Cattivo** con agenda (C3), segreti astratti (C6) e archi dei PG (C8): tutto sotto `preparazione`.
- **Sessione** (C9–C13): riassunto iniziale, cinque stanze, scene potenziali, chiusura con una scelta
  aperta, e `colli_di_bottiglia_nota`.
- **Cronologia e logistica** (sotto `preparazione`, forma in schema.md): il passato che fonda ogni segreto,
  la notte della sessione con le ore, i documenti con la loro data (il legame `indizio` lo aggiungi al
  passo 5, quando l'indizio esiste). Ogni affermazione della storia su
  tempi, distanze, posti o date diventa una verifica che il validatore rifà: «la barca fa in tempo a un
  viaggio solo» è un `ci_sta` più un `non_ci_sta`. Il meccanismo del climax si scrive in una riga per
  stato («catena alzata: il ponte è chiuso»), e ogni testo che lo nomina si rilegge contro quella riga.

**Controllo**: `--solo STILE,CANONE,FRONTI,SESSIONE,MONDO` con zero errori, e:
- ogni segno d'orologio è una frase sola, di 14 parole al massimo, che si vede o si sente, in ordine
  crescente di pericolo; l'ultimo porta il momento decisivo;
- `al_completo` dice che cosa vuole il pericolo e che cosa costa ogni risposta;
- ogni documento della storia ha una data, e la data non precede ciò che prova.

### 4. Rivelazioni, indizi, nodi, colli di bottiglia → `campagna.yaml`
Per ogni conclusione chiave servono almeno tre indizi, in almeno due nodi, di almeno due tipi (C4). Ogni
indizio ha `modi`: quanti modi distinti di trovarlo sono scritti in `come_si_trova`. Un indizio
essenziale non sta mai dietro un tiro. Ogni collo di bottiglia ha almeno tre soluzioni. I nodi formano
un grafo senza vicoli ciechi; un luogo che i PG conoscono dall'inizio ha `noto_ai_pg: true` e non va
scoperto con tre indizi. Gli indizi delle scene li scrivi nelle schede al passo 5.

**Controllo**: per ogni conclusione, immagina un tavolo che non trova due dei tre indizi. Arriva lo
stesso alla verità? Se no, aggiungi un indizio proattivo, cioè qualcosa che arriva da solo.

### 5. Schede scena → `scena.yaml` (+ `scene/*.yaml`)
Tutti i campi del manuale §4 (vedi `riferimenti/schema.md`), compresa `immagine` (`prompt_luogo` in
inglese e invarianti, `riferimenti/immagini.md`), tranne `esiti`, che scrivi al passo 9 insieme ai finali.
- In `descrizione` metti la pianta e la regola **chi sente cosa**: «in privato» deve voler dire qualcosa
  di verificabile.
- `descrizione`, `taglio`, `sensi` ed elementi non NASCOSTI vanno al selettore del modo B (regola 1):
  scrivili come li può leggere chi non sa la soluzione. Ciò che svela va in un elemento con «NASCOSTA:»
  nelle azioni, o nel `come_si_trova` di un indizio.
- L'apertura ha tre frasi al massimo, e con il riassunto della sessione non supera sei frasi, con una
  media tra 8 e 14 parole per frase.
- Il `taglio` copre tutti gli esiti, compreso il caso in cui i PG esitano.
- Più scene: lo stesso luogo in due momenti, gli orologi condivisi e quelli che partono da una scelta
  sono in mestiere.md §9.

**Controllo**: `--solo INDIZI,GRAFO,PROSA,SESSIONE,MONDO` con zero errori. Gli errori `SCENA` che citano
PNG e PG si chiudono ai passi 6 e 7.

### 6. PG → `pg.yaml`
Ogni PG ha:
- un aggancio legato a un PNG o al fronte;
- una o due conoscenze private che aprono una strada (C7, T9);
- un arco sul cerchio di Harmon (in `preparazione.archi`).

La scheda di un PG, tranne le conoscenze private, è pubblica: va al telefono del giocatore e al
selettore. Niente segreti nei nomi, negli agganci, nell'aspetto (la gilda «dell'Onda» svelava l'onda
scolpita). La `situazione_comune` non nomina nessun PG: deve valere con qualunque gruppo.

**Controllo**: `--solo PG,FRONTI` con zero errori. Togli un PG qualsiasi: la scena regge ancora? Ogni
collo di bottiglia ha ancora una soluzione che non dipende da quel PG?

### 7. Schede PNG → `png/png_<nome>.yaml`
Tutti i campi del manuale §3, più `alias` (i soprannomi che useranno i giocatori, mai parole generiche
come «vecchio» o «ragazza») e un `id` per ogni menzogna. Leggi `riferimenti/mestiere.md` §2–§3.
- **aspetto**: la lettura ad alta voce, le invarianti e `prompt_immagine` in inglese con `[STILE]`
  (`riferimenti/immagini.md`); i tratti nascosti li metti al passo 11.
- **voce_id**: preso da `assets/voci/voci.yaml`, adatto a sesso ed età, nel rispetto della regola 9.
- **voce.stile** comincia con la misura delle frasi («Frasi di tre-otto parole»): il validatore ne ricava
  il tetto per le battute del PNG.
- **cede_se**: ogni condizione è un fatto osservabile in una trascrizione, e le condizioni sono unite da
  «Oppure». La privatezza è una condizione esplicita: «in privato», oppure «dove X non sente», come la
  definisce la scena.
- **Chi si muove**: cerca ogni testo che porta un PNG fuori dalle sue scene (desiderio, iniziative,
  evoluzione, soluzioni dei colli di bottiglia, taglio ed esiti, battute con `scena`). Ognuno deve
  rispettare la regola 9 nella scena in cui lo porta.

**Controllo**:
- leggi le tre battute campione una dopo l'altra, senza nomi: devi riconoscere chi parla;
- ogni PNG vuole qualcosa che lo mette contro un altro PNG o contro un fronte;
- nessun PNG regala la soluzione nel primo turno.

### 8. Primo giro del validatore
```
python3 -I strumenti/valida_campagna.py campagne/<id>
```
Correggi **tutti** gli errori, poi rilancia. Con le schede scena, PG e PNG scritte, e la sessione del
passo 3, lo zero è raggiungibile: non andare avanti con errori aperti.

### 9. Repertorio → `repertorio/*.yaml`, ed `esiti` nelle scene
Leggi `riferimenti/repertorio.md` per intero. Prima l'elenco, poi il testo:
1. l'elenco delle battute necessarie (la copertura minima, §8);
2. per ognuna id, `quando`, `temi`, `richiede`, `effetti` e, se serve, `scena`;
3. solo alla fine il testo.

Ordine: segni d'orologio, indizi, menzogne, confessioni, momenti, finali, esempi di voce, riempitivi,
transizioni. Quando scrivi i finali, aggiungi a ogni scena i suoi `esiti`.

**Controllo**: `--solo REPERTORIO,COPERTURA,PROSA,SCENA` con zero errori (gli errori `SEGRETI` si chiudono
al passo 10), e:
- la tabella di copertura di `riferimenti/repertorio.md` §8 è tutta spuntata, e ogni voce di
  `riferimenti/motore.md` ha la sua risposta nella campagna (azioni private, orologi, finali, oggetti);
- nessun `id` e nessun `quando` contiene un segreto;
- ogni confessione ha il suo cancello (§4).

### 10. Parole segrete → `repertorio/parole_segrete.yaml`
Per ogni fatto nascosto scrivi una o più regex strette (repertorio.md §7). Compila `fatti`,
`pubblica_dopo` (tutte le battute e gli indizi che la rendono pubblica) e `nota`. Poi leggi il contesto
che il selettore riceverà, scena per scena, come lo leggerebbe lui:
```
npx tsx strumenti/contesto_modo_b.ts campagne/<id> --catalogo
```
Il validatore ci cerca ogni regex; tu cerca ciò che una regex non prende. Leggi ogni riga del catalogo come una
frase, id compreso: «zel presa macchia» dice chi è stato. Le righe con `[chiusa: …]` il selettore le vede solo
dopo quei cancelli; le altre fin dal primo turno.

**Controllo**: nessun errore `SEGRETI.*` e nessun avviso `SEGRETI.fatto_scoperto`.

### 11. Immagini e audio: situazioni, prompt e deduzioni
I prompt dei luoghi e dei ritratti li hai scritti con le schede. Ora i tratti nascosti: vanno solo in
`aspetto.situazioni`, ognuna con `dopo`, l'indizio o la battuta dopo cui mostrarla
(`riferimenti/immagini.md`). Un luogo senza scheda che ha un'immagine sta in `nodi[].immagine`.

L'audio lo deduce la pipeline dalle schede pubbliche. Leggi la sua deduzione con
`strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id> --dry-run` e correggi,
solo dove sbaglia, con i campi `audio` e `tema` (schema.md, «Audio»; mestiere.md §10).

**Controllo**: `python3 strumenti/immagini/genera.py campagne/<id> --dry-run` stampa i prompt composti
senza caricare il modello (basta PyYAML); leggili. Nessun prompt mostra qualcosa che i giocatori non
devono ancora sapere: le regex sono in italiano e i prompt in inglese, quindi qui decide la tua lettura.
Nessun tema tradisce chi mente. Le immagini e l'audio veri si fanno al passo 16, a campagna finita.

### 12. Validatore rigoroso e copioni
Fai scrivere a un subagente, alla cieca, due copioni di azioni per la tua campagna in
`esperimenti/copioni/<id>/`: vede solo ciò che vedono i giocatori (riassunto, apertura, situazione
comune, schede dei PG senza le conoscenze degli altri), con la forma di `esperimenti/copioni/README.md`.
Scrivili a campagna ferma, o rigenerali se cambi nomi o luoghi. Poi:
```
python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso --avvisi
python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso --copioni esperimenti/copioni/<id>
```
Zero errori. Leggi anche gli avvisi: ognuno o si corregge o si giustifica in `autovalutazione.md`. Il
catalogo per azione (temi) deve stare in media sotto 4: se è più largo, i `temi` sono troppo generici.

### 13. Lettura ad alta voce
Leggi a mezza voce, nell'ordine: riassunto e apertura; le letture d'aspetto; le battute campione; i
segni d'orologio; tutte le battute del repertorio. Il validatore conta le parole, ma non sente il
ritmo. Cerca:
- pronomi ambigui all'orecchio («dietro, qualcuno tossisce»);
- un nome seguito da una virgola a inizio frase, che suona come il narratore che chiama qualcuno
  («Tullio, il custode, grida» → «Dal casello il custode, Tullio, grida»);
- un «voi» singolare che sembra plurale;
- calchi dall'inglese, la stessa immagine ripetuta, accordi di genere verso un PG ignoto («sei pronto»);
- una battuta che cita ciò che solo un'altra battuta facoltativa ha introdotto («Il mulo, no.»);
- il meccanismo del climax letto al contrario: ogni testo dice la stessa cosa della riga del passo 3.

### 14. Revisione indipendente
Lancia un subagente (Agent, `model: "opus"`) con il testo di `revisione.md`, sostituendo l'id della
campagna. Non gli dare le tue conclusioni: deve leggere il manuale e la campagna, e attaccarla.
Correggi ogni problema grave che trova, rilancia il passo 12, e scrivi in `autovalutazione.md` cosa hai
corretto e cosa no, con il motivo.

### 15. README e autovalutazione
- `README.md`: la scena in poche righe, i PNG (voce, desiderio, menzogna, segnale), come funzionano
  indizi, orologio e scelta, chi vede quale file.
- `autovalutazione.md`: i voti R1–R12 del manuale §9 come progettata, con una riga di prova ciascuno;
  l'esito del validatore; gli avvisi giustificati; i tre rischi principali per un narratore piccolo e veloce.

### 16. Immagini e audio: pronta da giocare
```
scripts/prepara.sh campagne/<id>
```
Valida in modo rigoroso (con errori si ferma), genera le immagini mancanti con la GPU locale (15–40
minuti per una campagna intera), fa l'audio e stampa il rapporto: asset per tipo, ciò che manca, i pesi,
e il comando esatto di `scripts/partita.sh`. È idempotente: rilanciarlo salta ciò che c'è già.
- A batteria le immagini non partono: dillo a Riccardo, o rilancia con l'alimentatore. Non usare
  `--anche-a-batteria` di tua iniziativa.
- Se Riccardo sta giocando (server sulla porta 4610), chiedigli prima: la GPU rallenta il Mac.
  `--senza-immagini` fa solo l'audio e riporta le immagini che mancano.
- Uno strato d'audio che le fonti non hanno (per esempio una catena) resta fuori: il rapporto lo dice, e
  il proiettore lo salta. La campagna è pronta lo stesso.

**Controllo**: il rapporto dice «pronta da giocare» (esistono `immagini/manifest.json` e
`audio/manifest.json`). Committa `campagne/<id>/immagini` e `campagne/<id>/audio`, e scrivi nel
`README.md` della campagna ciò che manca ancora.

## Regole che non si discutono

Ognuna nasce da un errore vero, trovato in una prova, da un giudice cieco o da un revisore (dettagli in
`riferimenti/mestiere.md` §8).

1. **Il selettore non conosce i segreti.** In modo B riceve il contesto compilato dal server: la carta di
   stile intera, i fatti pubblici, nome e abbozzo dei luoghi, il riassunto; della scena in corso nome,
   descrizione, domanda, sensi, elementi non NASCOSTI e taglio; dei PNG aspetto, carattere e voce (senza
   `mai_dice`); le schede dei PG senza conoscenze private; gli esempi di voce; e per ogni turno le righe
   `id · chi · tipo · quando` del catalogo. Nessuno di questi campi contiene un segreto: il validatore lo
   controlla sul contesto vero (`SEGRETI.contesto_b`). Il `quando` descrive un fatto osservabile («un PG
   mostra a Irma la cera trovata sui gradini»), mai una verità, e non usa parole come mente, nasconde,
   confessa, verità.
2. **Ogni confessione ha un cancello strutturale** in `richiede`: `privata: true` se la condizione è in
   privato; `da_pg: [...]` se tocca a un PG preciso; `indizi_rivelati: [...]` se serve una prova. Il solo
   `quando` non basta: nel secondo esperimento una confessione «in privato» è uscita in pubblico.
3. **Le battute rispondono alle azioni.** Sono selezionabili solo menzogne, confessioni, indizi, segni,
   momenti chiave e finali. Le reazioni generiche sono `solo_esempio: true`; le mosse che non rispondono
   a niente sono `riempitivo: true`.
4. **I `temi` sono pochi e distintivi**, nelle forme che i giocatori scrivono davvero (repertorio.md §3).
5. **I segni d'orologio** sono battute, una per segmento, con `richiede.orologio` min = max = il segno di prima.
6. **Nessun nome di PG nelle battute, e nessuna battuta ripete l'azione.** Prima di una battuta il narratore
   improvvisa l'annuncio dell'azione, col nome del PG in terza persona («Brann solleva il coperchio.», manuale
   N15); la battuta parte dall'esito.
7. **Un PNG dice solo ciò che sta nel suo `sa`.** I `fatti_noti` di una sua battuta devono essere nel suo `sa`.
8. **Scrivi per l'orecchio**: le misure sono in repertorio.md §9 e mestiere.md §7; niente cifre,
   parentesi, puntini di sospensione o cliché del §5.
9. **Due voci uguali o simili non stanno mai nella stessa scena.** Simili sono le voci con `simile_a` in
   `assets/voci/voci.yaml` (oggi nadine e tabitha). Vale per i `png_presenti` e per ogni testo che porta
   un PNG in una scena. Al massimo quattro PNG con voce per scena: tante sono le voci registrate.
10. **Le immagini sono pubbliche dal primo turno.** Niente tratti nascosti nel ritratto né nelle invarianti.
11. **Un canone solo, e i conti tornano.** Ogni scheda cita i fatti per id; una contraddizione tra due
    testi è un errore da correggere subito. Ore, distanze, posti e date stanno nella cronologia e nella
    logistica, e il validatore li rifà.

## Commit

- **Quando**: dopo i passi 5, 8, 11, 12 e 15, e dopo il passo 16 per gli asset.
- **Cosa**: aggiungi solo `campagne/<id>` (ed `esperimenti/copioni/<id>`, e i controlli dell'audio in
  `esperimenti/audio/controlli_<id>.md`), con un messaggio in italiano che spiega il perché.
- **Firma**: chiudi il messaggio con la riga di attribuzione indicata nella conversazione.
- **Mai**: committare con errori del validatore senza dirlo nel messaggio.

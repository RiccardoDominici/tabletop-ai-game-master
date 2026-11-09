# Creare una campagna

Cosa trovi qui: come nasce una campagna nuova, dal brief alla cartella pronta da giocare, con immagini e audio.
Leggi prima: [installazione](installazione.md) (strumenti, ambienti Python e chiavi) e [una serata](una-serata.md) (come si gioca).

## In breve

1. Chiedi una campagna al **Preparatore**, la skill di Claude Code che sta nel repository.
2. Il Preparatore scrive il **brief** e poi tutti i file della campagna in `campagne/<id>/`.
3. Il **validatore** controlla la campagna, finché non ci sono più errori.
4. `scripts/prepara.sh` genera le **immagini** e l'**audio**.
5. Giochi con `scripts/partita.sh <id>` (vedi [una serata](una-serata.md)).

I costi delle chiamate ai modelli (Preparatore, controllo delle immagini) sono spiegati in [voce e costi](voce-e-costi.md).

## 1. Il Preparatore

Il Preparatore è un modello forte che scrive **prima** della serata tutto ciò che il narratore veloce (Claude
Haiku) userà dal vivo. Il narratore improvvisa poco; la campagna gli dà la sostanza già scritta.

La skill sta in `.claude/skills/preparatore/`:

| File | A cosa serve |
|---|---|
| `SKILL.md` | l'ordine del lavoro, in 16 passi, e le regole che non si discutono |
| `modelli/brief.yaml` | il modello del brief da riempire |
| `riferimenti/*.md` | la forma di ogni file (`schema.md`) e il mestiere (`mestiere.md`, `repertorio.md`, `immagini.md`, `motore.md`, `arco.md`, `tra-le-sessioni.md`) |
| `revisione.md` | il testo per il revisore indipendente (un secondo agente che attacca la campagna) |

La specifica di tutto è il manuale del master: [docs/manuale-master.md](../manuale-master.md).

### Come lo chiami

1. Apri Claude Code nella cartella del repository (la radice, dove c'è `package.json`).
2. Scrivi `/preparatore` seguito dalla tua richiesta, in parole tue. Per esempio:

   ```
   /preparatore Una one-shot in un paese di montagna, d'inverno: un matrimonio interrotto dalla neve.
   Mistero, niente orrore. 3-4 giocatori, una serata di due ore e mezza.
   ```

3. Puoi anche non scrivere `/preparatore`: se chiedi di «preparare una campagna», «scrivere un'avventura»
   o «aggiungere scene e PNG a una campagna esistente», Claude Code usa la skill da solo (lo dice la sua
   descrizione in `SKILL.md`).

### Che cosa ti chiede

Il Preparatore decide da solo quasi tutto, e scrive ogni scelta nel brief, nel campo `decisioni`, con il motivo.
Ti fa domande solo su ciò che non può decidere al posto tuo:

- i **temi da evitare** (le linee e i veli: vedi sotto);
- il **numero dei giocatori**;
- la **durata**.

### Quanto dura: oggi solo la one-shot

Il numero di sessioni decide quanto si prepara. Oggi il framework prepara e gioca solo la **one-shot**
(`sessioni: 1`). Se chiedi più sessioni, il Preparatore te lo dice e ti propone una one-shot o la prima
sessione di un arco. Il motivo e lo stato dei lavori sono in [campagne a più sessioni](campagne-a-piu-sessioni.md).

### Che cosa produce e dove lo salva

Tutto va in `campagne/<id>/`. L'`id` è in ascii minuscolo con trattini, per esempio `il-ponte-dei-sospiri`.

| File | Che cosa contiene | Chi lo vede al tavolo |
|---|---|---|
| `brief.yaml` | il brief e le decisioni | nessuno: lo legge solo chi prepara |
| `stile.yaml` | carta di stile: premessa, tono, regole di prosa, stile delle immagini, musica, linee e veli | il narratore |
| `campagna.yaml` | canone dei fatti, fronti e orologi, indizi, nodi, la sessione; in `preparazione` i segreti, che non arrivano mai al narratore | il narratore, senza `preparazione` |
| `scena.yaml` | la prima scena | il narratore |
| `scene/<id_scena>.yaml` | le altre scene, se ce ne sono | il narratore |
| `png/png_<nome>.yaml` | una scheda per ogni personaggio non giocante (PNG) | il narratore; ritratto e nome sul proiettore |
| `pg.yaml` | la situazione comune e i personaggi giocanti (PG) pregenerati | ogni giocatore il suo, sul telefono |
| `repertorio/*.yaml` | le battute già scritte, che il narratore sceglie in modo B | il narratore |
| `repertorio/parole_segrete.yaml` | le parole che non devono uscire prima del tempo | il server (filtro) |
| `README.md`, `autovalutazione.md` | riassunto per il master e voti della campagna | il master |
| `immagini/` | luoghi, ritratti, situazioni, con `manifest.json` | il proiettore |
| `audio/` | musica, temi, ambienti, effetti, con `manifest.json` e `crediti.md` | il proiettore |

Fuori dalla cartella della campagna il Preparatore scrive anche:

- `esperimenti/copioni/<id>/`: due copioni di azioni scritti «alla cieca» da un altro agente, per provare la campagna
  (la forma è in `esperimenti/copioni/README.md`);
- `esperimenti/audio/controlli_<id>.md`: i controlli dell'audio.

Il Preparatore fa un commit con git dopo i passi principali. Il messaggio è in italiano e spiega il perché.

### Quando ha finito davvero

Il lavoro è finito solo quando:

1. il validatore in modo rigoroso dà **0 errori** (con node installato);
2. la revisione indipendente è fatta e i suoi problemi gravi sono corretti;
3. `README.md` e `autovalutazione.md` della campagna sono scritti e tutto è nel commit;
4. `scripts/prepara.sh` ha fatto immagini e audio: esistono `immagini/manifest.json` e `audio/manifest.json`.

Solo allora la campagna è **pronta da giocare**.

### I 16 passi, in una riga ciascuno

Li trovi per intero in `SKILL.md`. Ognuno finisce con un controllo, e non si passa al successivo finché il
controllo non va.

| Passo | Che cosa si scrive | Controllo |
|---|---|---|
| 1 | la situazione, in `brief.yaml → decisioni.situazione` | le domande del passo |
| 2 | `stile.yaml` | validatore `--solo STILE` |
| 3 | canone, fronti, orologi, cattivo, sessione, cronologia | `--solo STILE,CANONE,FRONTI,SESSIONE,MONDO` |
| 4 | rivelazioni, indizi, nodi, colli di bottiglia | la prova dei due indizi mancanti |
| 5 | le schede delle scene | `--solo INDIZI,GRAFO,PROSA,SESSIONE,MONDO` |
| 6 | `pg.yaml` | `--solo PG,FRONTI` |
| 7 | le schede dei PNG | le domande del passo |
| 8 | primo giro del validatore | zero errori in modo normale |
| 9 | il repertorio e gli esiti delle scene | `--solo REPERTORIO,COPERTURA,PROSA,SCENA` |
| 10 | le parole segrete | nessun errore `SEGRETI` |
| 11 | i prompt delle immagini e la lettura dell'audio | `--dry-run` delle due pipeline |
| 12 | validatore rigoroso e copioni | zero errori |
| 13 | lettura ad alta voce | la lista del passo |
| 14 | revisione indipendente | problemi gravi corretti |
| 15 | `README.md` e `autovalutazione.md` | commit |
| 16 | immagini e audio con `scripts/prepara.sh` | «pronta da giocare» |

## 2. Il brief

Il brief è un file breve: dice che cosa vuoi. Il Preparatore copia il modello e lo riempie. Se vuoi
scriverlo tu prima di chiamarlo, fai così:

```
mkdir -p campagne/il-mio-id
cp .claude/skills/preparatore/modelli/brief.yaml campagne/il-mio-id/brief.yaml
```

La prima riga crea la cartella della campagna; la seconda copia il modello del brief dentro.

Un esempio vero e completo è `campagne/ponte-lanterne/brief.yaml`.

### Campo per campo

| Campo | Che cosa scrivi | Esempio (da `ponte-lanterne`) |
|---|---|---|
| `id` | il nome della cartella: ascii minuscolo con trattini | `"ponte-lanterne"` |
| `titolo` | il titolo | `"Il ponte delle lanterne"` |
| `richiesta` | la tua richiesta, con le tue parole | il testo che hai dato al Preparatore |
| `tono` | il tono, in una frase | `"Mistero di paese sotto la pioggia, caldo e umano…"` |
| `sessioni` | **obbligatorio**: quante sessioni dura, oppure `"aperta"` | `1` |
| `ore_per_sessione` | facoltativo, predefinito `2.5`: sotto un'ora la one-shot ha una scena sola, altrimenti da 3 a 5 | (assente: vale 2,5) |
| `livello` | facoltativo: forza un livello diverso da quello delle sessioni, solo con il motivo in `decisioni.altre` | (assente) |
| `durata` | una nota a parole per te; il numero vero sta in `sessioni` | `"una sessione serale, da due ore a due ore e mezza, in quattro scene"` |
| `giocatori` | quanti giocano, un numero o un intervallo come `"3-4"` | `4` |
| `dadi` | `true` per default: schede e prove. `false` solo se vuoi una campagna senza dadi | (assente) |
| `temi` | i temi della storia | `[debiti e lealtà, …]` |
| `linee` | ciò che non entra **mai** in gioco | `"contenuti sessuali"` |
| `veli` | ciò che succede solo fuori scena, raccontato a cose fatte | `"annegamento: solo fuori scena"` |
| `ambientazione` | facoltativo: luogo, epoca, sapore (fantasy compatibile con l'SRD) | `"Vadolungo, paese di fiume…"` |
| `vincoli` | regole tue per questa storia | `"niente combattimento necessario"` |
| `decisioni.scene` | gli id delle scene; la prima è `scena.yaml` | `[scena_ponte_imbrunire, …]` |
| `decisioni.pg` | gli id dei PG pregenerati | `[pg_dalia, …]` |
| `decisioni.png` | quale voce va a quale PNG | `"png_tullio → vincent (…)"` |
| `decisioni.situazione` | quattro frasi: chi vuole cosa; cosa succede se i PG non fanno niente; la verità nascosta; la scelta che costa | |
| `decisioni.strade` | le strade della scelta finale, ognuna con `strada`, `prezzo` e `pesa_su` | |
| `decisioni.altre` | ogni altra scelta, con il motivo | |

Alcune regole che conviene sapere:

- **Più PG che giocatori.** I PG pregenerati sono uno più del massimo dei giocatori: per «3-4 giocatori», cinque.
  Così la storia regge con qualunque gruppo. Se ne mancano, il validatore lo segnala (`PG.numero`).
- **Il prezzo pesa su chi non lo vuole.** Ogni strada della scelta finale ha un prezzo. Se il prezzo somiglia a
  ciò che un PNG desidera, è un premio travestito, e il validatore lo segnala (`SCELTA.premio`). Servono almeno
  due strade (`SCELTA.forma`).
- **Dadi.** Il campo `dadi` del brief serve al Preparatore. L'interruttore vero sta in `campagna.yaml`:
  `regole: {dadi: false}` toglie l'obbligo delle schede. Dettagli in [dadi e schede](dadi-e-schede.md).
- **Voci.** Le voci registrate sono in `assets/voci/voci.yaml`. Due voci uguali o simili non stanno mai nella
  stessa scena, e al massimo quattro PNG con voce stanno in una scena.

Per vedere che livello dà il tuo brief:

```
python3 strumenti/strati.py campagne/il-mio-id
```

Stampa il livello (one-shot, arco, campagna, saga), che cosa comporta e quante scene ti aspetti per sessione.

## 3. Le sessioni e le scene

- Una **sessione** è una serata di gioco. In una one-shot la sessione è una sola e sta in `campagna.yaml`, chiave
  `sessione`: il riassunto da leggere all'inizio, le cinque stanze, le scene possibili, la chiusura con una
  scelta aperta.
- All'avvio il narratore legge il **riassunto iniziale** (`campagna.yaml → sessione.riassunto_iniziale`) e poi
  l'apertura della prima scena.
- Una **scena** è un luogo in un momento. Per una sessione di 20–40 minuti basta una scena; per 2–3 ore, da 3 a 5.
  La prima è `scena.yaml`, le altre `scene/<id>.yaml`. Lo stesso luogo può tornare in due momenti diversi.
- Il master passa da una scena all'altra dal pannello (vedi [il pannello del master](il-pannello-del-master.md)).

## 4. Il validatore

Il validatore controlla una campagna contro il manuale del master. Non chiama la rete e non scrive nulla
nella campagna. Serve Python 3 con PyYAML; per il controllo completo serve anche node.

```
python3 -I strumenti/valida_campagna.py campagne/<id>
```

Controlla la campagna in modo normale e stampa gli errori.

```
python3 -I strumenti/valida_campagna.py campagne/<id> --rigoroso --avvisi
```

Controlla con le regole piene per le campagne nuove, e mostra anche gli avvisi.

### Le opzioni

| Opzione | Che cosa fa |
|---|---|
| `--rigoroso` | regole piene per le campagne nuove: alcuni avvisi diventano errori (confessioni senza cancello, menzogne senza id, indizi senza `modi`, PNG senza `alias`, temi generici, tratti nascosti nei prompt delle immagini) |
| `--avvisi` | mostra anche gli avvisi (senza, ne stampa solo il numero) |
| `--solo CLASSI` | mostra e conta solo alcune classi o codici, separati da virgole, per esempio `--solo STILE,CANONE` o `--solo SCENA.voci` |
| `--classi` | elenca le classi di errore ed esce |
| `--copioni <cartella>` | misura il catalogo per azione con i copioni, per esempio `esperimenti/copioni/<id>` |
| `--senza-node` | non compila il contesto vero del modo B: quel controllo resta un avviso |
| `--sessione N` | valida il pacchetto `sessioni/<nn>/` unito alla campagna (campagne a più sessioni) |
| `--voci <file>` | un altro registro delle voci (predefinito: `assets/voci/voci.yaml`) |

Codice d'uscita: `0` nessun errore (gli avvisi non contano), `1` almeno un errore, `2` argomenti sbagliati.

Chi lo usa da solo:

- `scripts/partita.sh` lo lancia in modo normale prima di ogni partita: con errori la partita non parte;
- `scripts/prepara.sh` lo lancia in modo rigoroso: con errori non genera né immagini né audio.

### Che cosa controlla

Ogni regola appartiene a una **classe**. L'elenco esatto lo stampa `--classi`:

| Classe | Che cosa controlla |
|---|---|
| `STRUTTURA` | file mancanti, YAML illeggibile, campi obbligatori assenti |
| `STILE` | carta di stile: premessa, tono, linee e veli, stile delle immagini, musica |
| `CANONE` | registro dei fatti: id unici, riferimenti esistenti |
| `PNG` | scheda PNG obbligatoria e controlli incrociati |
| `SCENA` | scheda scena o luogo |
| `INDIZI` | regola dei tre indizi e colli di bottiglia |
| `FRONTI` | fronti, pericoli, orologi, cattivo, segreti, archi |
| `GRAFO` | nodi e collegamenti senza vicoli ciechi |
| `SESSIONE` | inizio forte, cinque stanze, scene potenziali, chiusura |
| `PG` | personaggi giocanti e conoscenze private |
| `SCHEDA` | schede numeriche e prove (caratteristiche, CA, PF, attacchi, prove della scena) |
| `PROSA` | scrittura per l'ascolto |
| `REPERTORIO` | forma delle battute e riferimenti |
| `COPERTURA` | copertura minima del repertorio: indizi, menzogne, confessioni, segni, finali, voce |
| `SEGRETI` | niente di nascosto nei campi pubblici o nel catalogo del selettore |
| `IMMAGINI` | prompt delle immagini |
| `MONDO` | cronologia e logistica: eventi in ordine, date dei documenti, tempi e capienze |
| `STATO`, `CONTINUITÀ`, `ARCO` | campagne a più sessioni (vedi [campagne a più sessioni](campagne-a-piu-sessioni.md)) |
| `SCELTA` | la scelta finale del brief: prezzi che pesano su chi non li vuole |
| `VINCOLI` | ciò che chiunque percepisce di un indizio, e che la scena non contraddice |
| `LIVELLO` | durata in sessioni e livello della campagna |
| `AUDIO` | campi espliciti dell'audio |
| `VOCE` | voce espressiva: direzioni brevi, tag conosciuti e chiusi nella riga |

### Come leggere i messaggi

Ogni riga ha questa forma:

```
ERRORE  [CLASSE.regola] dove: messaggio
AVVISO  [CLASSE.regola] dove: messaggio
```

- `ERRORE` va corretto; `AVVISO` va letto, e corretto o giustificato in `autovalutazione.md`.
- `CLASSE.regola` dice quale parte del manuale è violata (la classe) e quale controllo preciso (la regola).
- `dove` dice il file e il campo, o l'id dell'elemento.
- Il messaggio dice che cosa non va, spesso con il motivo.

Due righe vere, dal validatore su `campagne/ponte-lanterne` e su una cartella di prova:

```
AVVISO  [IMMAGINI.nodo] campagna.yaml nodo n_passo: un'uscita di scena.yaml porta qui, ma il luogo non ha immagine (né scheda né immagine.prompt_luogo): sul proiettore resterebbe il luogo di prima
ERRORE  [SEGRETI.campo_pubblico] pg.yaml pg_anna.nome: campo sempre pubblico con «IL_CATTIVO_E_IL_LOCANDIERE»
```

L'ultima riga riassume tutto: il numero di errori per classe, gli avvisi, il modo, quante scene, PNG e battute:

```
campagne/ponte-lanterne: 0 errori (nessuno), 9 avvisi — modo rigoroso, 4 scene, 4 PNG, 135 battute
```

Come procedere:

1. Leggi l'ultima riga: dice quali classi hanno errori.
2. Comincia dagli errori `STRUTTURA`: un file che manca o uno YAML illeggibile impedisce di controllare ciò che contiene.
3. Correggi un errore alla volta e rilancia il validatore.
4. Se scrivi la campagna a pezzi, usa `--solo` con le classi del pezzo che hai scritto.
5. Prima di dire «finito», passa in modo rigoroso con `--avvisi`.

Le regole precise dei dadi e delle schede (classe `SCHEDA`) sono in [docs/prove.md](../prove.md), §2; la forma di
ogni file in `.claude/skills/preparatore/riferimenti/schema.md`.

## 5. Pronta da giocare: `scripts/prepara.sh`

```
scripts/prepara.sh campagne/<id>
```

Porta una campagna valida a pronta da giocare, in quattro passi:

1. **validatore rigoroso**: con errori si ferma, e non genera niente;
2. **immagini**: genera quelle che mancano, con la GPU del Mac;
3. **audio**: musica, temi, ambienti, effetti;
4. **rapporto**: che cosa c'è, che cosa manca, quanto pesa, e il comando per giocare.

La campagna si può indicare come `campagne/<id>`, come `<id>` o con il percorso intero.

| Opzione | Che cosa fa |
|---|---|
| `--senza-immagini` | non genera le immagini: dice solo quante mancano e quanti minuti servirebbero |
| `--senza-audio` | non lancia l'audio |
| `--anche-a-batteria` | genera le immagini anche senza alimentatore (sconsigliato) |
| `--riprova-audio` | rilancia l'audio anche se è già completo, per cercare gli strati che le fonti non avevano |

Cose da sapere:

- È **idempotente**: se lo rilanci, salta ciò che c'è già. Le immagini rifanno solo le mancanti e quelle «vecchie»
  (il file c'è, ma le schede sono cambiate).
- **A batteria le immagini non partono.** Collega l'alimentatore e rilancia. Vedi [problemi comuni](problemi-comuni.md).
- Non avvia il server e non tocca le porte della partita (4610 e 4611). Però **non generare immagini mentre giochi**:
  la GPU rallenta il Mac.
- Uno strato d'audio che le fonti non hanno (per esempio una catena) resta fuori: il rapporto lo dice, e la
  campagna è pronta lo stesso.
- Il log è in `logs/prepara-<id>.log`.

Codice d'uscita: `0` pronta da giocare; `1` la campagna ha errori; `2` argomenti sbagliati; `3` un passo è fallito
o è stato saltato, e la campagna non è pronta.

Per vedere lo stato senza generare niente:

```
python3 strumenti/stato_preparazione.py campagne/<id>
```

Stampa quali immagini e suoni ci sono, quali mancano, quanto pesano, e se la campagna è pronta.

### PNG nascosti

Un PNG può entrare in scena senza essere mostrato subito. Nel suo file `campagne/<id>/png/<id>.yaml` scrivi:

```yaml
nascosto: true
```

Il narratore lo conosce e può farlo parlare, ma il proiettore e i telefoni non lo mostrano finché non ha parlato
o finché il master non preme **Rivela** nel pannello (vedi [il pannello del master](il-pannello-del-master.md)).
Assente, o `false`, vuol dire visibile dall'inizio.

### Battute pronte

Le battute del repertorio con la voce Qwen si possono registrare prima della serata, così partono subito. Il
comando, e cosa costa con drama-3, è in [Voce e costi](voce-e-costi.md#le-battute-già-pronte). `prepara.sh`
non ha un'opzione per questo.

## 6. Le immagini

Le immagini si generano **in locale**, sul Mac con chip Apple, con FLUX.2 klein 4B attraverso mflux. Il codice è
in `strumenti/immagini/`. Ci sono tre tipi:

- **luoghi** (16:9): uno per scena e per nodo-luogo;
- **ritratti** dei PNG (3:4);
- **situazioni** (16:9): lo stesso PNG in un altro momento, con il ritratto come riferimento. Quelle dichiarate
  nelle schede (`aspetto.situazioni`) compaiono da sole quando esce la loro rivelazione.

### Prima volta: l'ambiente

```
uv venv --python 3.12 strumenti/immagini/.venv
uv pip install --python strumenti/immagini/.venv/bin/python -r strumenti/immagini/requirements.txt
```

La prima riga crea l'ambiente Python delle immagini; la seconda installa mflux, PyYAML e l'SDK di Anthropic
(per il controllo visivo). I pesi del modello pesano circa 4,6 GB (`strumenti/immagini/motore.py`); come
arrivano sul disco la prima volta è **da verificare** (vedi [installazione](installazione.md), passo 6).

### Leggere i prompt senza generare

```
strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/<id> --dry-run
```

Stampa il piano e il prompt finale di ogni immagine, senza caricare il modello e senza scrivere niente. Va bene
anche il `python3` di sistema, se ha PyYAML, numpy e Pillow (i controlli a pixel li importano all'avvio). Leggilo:
nessun prompt deve mostrare qualcosa che i giocatori non devono ancora sapere.

### Generare

Di solito ci pensa `scripts/prepara.sh`. A mano:

```
strumenti/immagini/.venv/bin/python strumenti/immagini/genera.py campagne/<id>
```

Genera le immagini mancanti e vecchie della campagna e aggiorna `campagne/<id>/immagini/manifest.json` dopo ognuna.
Se si interrompe, rilancialo: riparte da dove era.

| Opzione | Che cosa fa |
|---|---|
| `--dry-run` | stampa il piano senza caricare il modello né scrivere |
| `--solo luogo` / `ritratto` / `situazione` | solo quel tipo (si può ripetere) |
| `--id <id>` | solo quell'immagine (si può ripetere), per esempio `--id ritratto_png_ottavia` |
| `--rifai` | rigenera anche se il file c'è già |
| `--seme N` | un altro seme, solo con un `--id` |
| `--no-fp16` | calcolo in bfloat16 (il default float16 è circa il 20% più veloce su M1) |
| `--dim-luogo LxA` | dimensioni di luoghi e situazioni per questa corsa, per esempio `1280x720` |
| `--controlla` | non genera: controlla le immagini già fatte e mai controllate |
| `--senza-visione` | niente controllo visivo con Claude: restano i controlli a pixel |
| `--rifila-esistenti` | non genera: rifila l'orlo di carta dei luoghi già fatti |

### Quanto tempo

- Per una campagna intera, **da 15 a 40 minuti** di GPU (`scripts/prepara.sh`).
- `prepara.sh` stampa la stima prima di partire («circa N minuti»). Senza misure precedenti la stima usa circa
  6 minuti per un luogo o una situazione e 2 minuti per un ritratto (`strumenti/stato_preparazione.py`).
- Il Mac resta usabile ma lento. Non chiudere il coperchio: `prepara.sh` lo tiene sveglio con `caffeinate`.

### Che cosa controlla da solo

Prima di ogni immagine:

- **alimentazione**: a batteria sotto il 20% non parte, e mflux si ferma da solo se la carica scende lì;
- **disco**: servono almeno 8 GB liberi.

Dopo ogni immagine, due controlli:

1. **a pixel** (gratis, senza modello): dimensioni giuste, orlo di carta che si vede ancora, immagine quasi vuota;
2. **visivo**: Claude Haiku guarda l'immagine intera e i quattro angoli. Cerca firme finte e scritte, orli, un
   soggetto diverso dal prompt, anatomia sbagliata, cose fuori posto (pioggia dentro una casa), e un tratto nascosto
   che si vede prima della rivelazione. Usa la chiave `ANTHROPIC_API_KEY`; senza chiave restano i controlli a pixel.

Un'immagine con un problema grave è «difettosa» e si rigenera con un seme nuovo, fino a tre immagini in tutto.
Se anche l'ultima è difettosa, si tiene la migliore e si segna **da controllare a mano**: il rapporto di
`prepara.sh` la elenca, e la guardi tu.

### Immagini vecchie e orfane

- Se cambi una scheda, l'immagine diventa «vecchia» e il giro dopo la rifà.
- Se togli un luogo o un PNG, l'immagine diventa «orfana»: esce dal manifest e il file va in
  `immagini/cache/orfane/`.

## 7. L'audio

L'audio si ricava dai dati pubblici della campagna, senza scegliere brani a mano. Il codice è in `strumenti/audio/`,
la spiegazione completa in [docs/audio.md](../audio.md). Ci sono quattro strati:

| Strato | Da dove viene |
|---|---|
| musica di luogo e d'umore | Incompetech (Kevin MacLeod, licenza CC BY 4.0), scelta automatica |
| temi dei PNG | composti dal codice e suonati con un SoundFont libero |
| ambienti (pioggia, folla, fiume…) | fondo locale CC0 o pubblico dominio dall'Internet Archive, oppure sintesi |
| effetti (campana, porta, catena…) | come gli ambienti |

Se c'è `FREESOUND_API_KEY` (gratuita, facoltativa), si cercano anche suoni CC0 su Freesound.

### Prima volta: `setup.sh`

```
strumenti/audio/setup.sh
```

Crea l'ambiente Python dell'audio (con `uv`) e scarica una volta il SoundFont GeneralUser GS (32 MB) in
`cache/audio/soundfont/`, controllandone l'impronta. Alla fine controlla che ci sia `ffmpeg`. Si può rilanciare:
salta ciò che c'è già.

### Leggere la deduzione senza scaricare

```
strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id> --dry-run
```

Stampa che cosa la pipeline ha capito di ogni luogo e PNG (umore, energia, ora, meteo, strumenti) e che cosa
sceglierebbe, senza scaricare né scrivere. Se sbaglia, si corregge nelle schede con i campi `audio` e `tema`.

### Generare

Di solito ci pensa `scripts/prepara.sh`. A mano:

```
strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id>
```

Scarica e prepara l'audio della campagna in `campagne/<id>/audio/`. Serve la rete (Incompetech, Internet Archive).

| Opzione | Che cosa fa |
|---|---|
| `--dry-run` | stampa descrittori e scelte, senza scaricare né scrivere |
| `--solo musica` / `temi` / `ambienti` | solo quello strato (si può ripetere) |
| `--rifai` | rifà anche ciò che ha già il suo file |
| `--senza-rete` | usa solo la cache: niente download |
| `--aggiorna-catalogo` | riscarica il catalogo di Incompetech |

### Il manifest e i crediti

In `campagne/<id>/audio/` trovi:

- `manifest.json`: l'elenco di ogni file con tipo, luogo, volume, loop e misure. È il contratto con il proiettore.
  Ha anche la lista `crediti`;
- `crediti.md`: i crediti in chiaro, generati dalla pipeline;
- `descrittori.json`: che cosa la pipeline ha dedotto, con le prove.

La musica di Incompetech è CC BY 4.0: chi la usa deve citare l'autore. Il proiettore mostra i crediti con il tasto
**C**. Se pubblichi una campagna con il suo audio, tieni `crediti.md` insieme ai file.

Per ascoltare tutto in fretta:

```
strumenti/audio/.venv/bin/python strumenti/audio/provino.py campagne/<id>
```

Scrive in `esperimenti/audio/` un provino di pochi secondi per file (`provino_<id>.wav`, fuori da git) e la tabella
dei controlli (`controlli_<id>.md`).

## 8. E adesso si gioca

Quando il rapporto di `prepara.sh` dice «Pronta da giocare»:

```
scripts/partita.sh <id>
```

Controlla la campagna, avvia il server e stampa gli indirizzi per proiettore, telefoni e pannello del master.
La voce predefinita è drama-3 via OpenRouter: le alternative e i costi sono in [voce e costi](voce-e-costi.md),
il resto della serata in [una serata](una-serata.md).

## Problemi?

Vedi [problemi comuni](problemi-comuni.md).

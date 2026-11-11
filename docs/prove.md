# Prove e dadi

Punto 4 delle richieste del 9 novembre (docs/richieste-2026-11-09.md). Riccardo ha scritto: «se provo a colpire con
una balestra, un tiro per colpire; se provo a convincere, una prova di Persuasione». Il sistema deve mostrare
caratteristica e abilità, il dado, il modificatore, la CD e l'esito. L'esito deve dipendere dal tiro, non dal
narratore.

In sintesi:
- **Il Motore tira, il modello no.** Un arbitro veloce (Haiku, con uscita strutturata) decide soltanto *che cosa* si
  tira. CD, CA, modificatori, dadi ed esiti li calcola il codice, dalle schede e dall'SRD 5.2.
- **Il narratore riceve gli esiti come fatti.** «Ida Ferraro: Persuasione (Carisma) verso Bertoldo: 18 contro CD 15 →
  RIUSCITA.» Ne racconta la conseguenza e non la cambia.
- **Proiettore e telefono mostrano una carta per ogni tiro.** Un tiro privato compare solo sul telefono del suo
  giocatore.

## 1. Ricerca

### Regole (SRD 5.2, CC-BY-4.0)
- **Prove d20** [OPENED] (SRD_CC_v5.2.pdf, «D20 Tests»). La formula è d20 + modificatore di caratteristica +
  bonus di competenza, se si applica.
  - Modificatore: (punteggio − 10) / 2, arrotondato per difetto.
  - Bonus di competenza: +2 ai livelli 1–4, +3 ai livelli 5–8, e così via fino a +9.
- **Quando si tira** [OPENED]. «When the outcome is uncertain and narratively interesting, the dice determine the
  result.» L'SRD chiede una prova quando c'è «a chance of meaningful failure».
  - Un'azione banale non tira.
  - Un'azione impossibile non tira.
- **Scala delle CD** [OPENED]: 5 molto facile, 10 facile, 15 media, 20 difficile, 25 molto difficile, 30 quasi
  impossibile. Nell'SRD italiano la tabella è «Classi Difficoltà tipiche» [OPENED, IT_SRD_CC_v5.2.1.pdf].
- **Vantaggio e svantaggio** [OPENED]. Si tirano due d20 e si tiene il più alto o il più basso. Più fonti non si
  sommano, e vantaggio e svantaggio insieme si annullano.
- **20 e 1 naturali** [OPENED]. Valgono solo per i tiri per colpire: il 20 è sempre un colpo critico (i dadi del danno
  si tirano due volte), l'1 manca sempre. Sulle prove e sui tiri salvezza non contano.
- **Attacchi** [OPENED]. Si confronta il tiro con la CA. Un'arma a distanza ha svantaggio se un nemico che vede il
  tiratore gli sta entro un metro e mezzo.
  - A 0 punti ferita un mostro muore o è fuori combattimento, a scelta del master.
  - A 0 punti ferita un PG perde i sensi e fa i tiri salvezza contro la morte.
- **Influenzare** [OPENED].
  - Il PNG è ben disposto, maldisposto o esitante. Ben disposto o maldisposto: non si tira. Esitante: si tira con
    CD 15 o con l'Intelligenza del PNG, se è più alta.
  - Atteggiamento amichevole: vantaggio. Ostile: svantaggio.
  - Abilità: Persuasione, Inganno, Intimidire, Intrattenere, e Addestrare animali con le bestie.
- **Aiutare** [OPENED]. Chi aiuta dà vantaggio alla prova del compagno.
- **Prove passive** [OPENED]: 10 + il modificatore. L'SRD 5.2 non dà il ±5 per vantaggio e svantaggio.
- **Non sono nell'SRD 5.2** (controllato sul testo intero). Mancano le prove di gruppo e una regola generale delle prove
  contrapposte; c'è solo il pareggio dell'iniziativa.
- **Nomi italiani** [OPENED, SRD 5.2.1 IT]. Abilità e caratteristiche come in campagna/regole-srd.ts. Armature:
  Armatura imbottita, di cuoio, di cuoio borchiato, di pelle; Giaco di maglia; Corazza a scaglie, di piastre, ad
  anelli, a strisce; Mezza armatura; Cotta di maglia; Armatura a piastre.
- **Siti non aperti** [SNIPPET]: telodoioildungeon.it e dragonslair.it, solo per la data della traduzione italiana.

### Come fanno gli altri master IA
- **FIREBALL** (ACL 2023) [OPENED, arxiv.org/abs/2305.01528]. Con lo stato vero del gioco (Avrae) le generazioni
  migliorano: lo stato va tenuto fuori dal modello.
- **Labyrinth** (Wordplay 2024) [OPENED, abstract, arxiv.org/abs/2409.06949]. Funzioni per i dadi e per lo stato
  migliorano la coerenza.
  - [SNIPPET, cis.upenn.edu] Dadi e stato possono interferire, fino a un «dice roll deadlock». Per questo qui il giro
    è fisso e senza strumenti in mano al modello.
- **Comandi Avrae** (2025) [OPENED, arxiv.org/abs/2510.18112]. Una frase cambiata nel prompt sposta molto l'uscita:
  servono casi di prova misurati (§6).
- **CriticaLLM** [OPENED, arxiv.org/abs/2610.21525] e **master statico contro agentico** [OPENED,
  arxiv.org/abs/2502.19519]: il problema centrale è rispettare le regole.
- **Compiacenza** [OPENED, news.ycombinator.com/item?id=42698610]. Un master IA «troppo arrendevole»: senza un tiro
  vero, «everything you do succeeds».
  - [OPENED, dev.to, articolo senza fonti] Tiri inventati, come un d20 che fa 47.
  - [SNIPPET, techradar.com] Tutti i tiri riusciti.
- **Friends & Fables** [OPENED, fables.gg patch notes e blog]. Il gioco mostra la prova coi bonus e tira con un tocco.
  Non dice chi decide l'esito.
  - [SNIPPET, recensioni di concorrenti] Dadi sbagliati e stato del combattimento perso.
- **AI Realm** [SNIPPET, guida]. La scheda tira 1d20 + modificatore e mette il risultato nella chat, perché il modello
  lo racconti. Hidden Door [SNIPPET, FAQ] ha uno strato di statistiche nascoste.
- **Lezioni comuni** [SNIPPET, thavernia.com e Fable Reborn, CHI EA 2023]:
  - fissare la CD prima del tiro, fuori dal modello;
  - narrare dopo il tiro;
  - non allungare l'attesa: in Fable Reborn uno scorer lento rompeva il ritmo.

### Che cosa ha cambiato la ricerca rispetto al progetto di partenza
1. **Niente prove di gruppo.** Non sono nell'SRD 5.2. Chi collabora usa «aiuto», che dà vantaggio (SRD «Aiutare»).
2. **Le contrapposte sono una regola della casa, dichiarata.**
   - Contro un PNG si tira contro il suo punteggio passivo: 10 + modificatore, per esempio la Percezione passiva
     contro la Furtività. Tira solo il giocatore e la carta resta semplice.
   - Tra due PG tirano entrambi e vince il più alto. A parità nessuno prevale.
   - Afferrare e spingere: semplificato in Atletica contro passivo. L'SRD 5.2 usa un tiro salvezza del bersaglio con
     CD 8 + Forza + competenza.
3. **Le prove sociali seguono «Influenzare».**
   - CD dalla scheda del PNG: 15 o la sua Intelligenza, oppure `influenza.cd`.
   - Vantaggio o svantaggio da `atteggiamento_pg`.
   - «Ben disposto» e «maldisposto» diventano i tipi `nessuna` e `impossibile` dell'arbitro.
   - Il Motore riconduce a Influenzare anche una minaccia che Haiku aveva chiamato «contrapposta», perché la CD deve
     venire dai dati.
4. **Nessun 20 automatico sulle prove** (SRD 5.2).
5. **L'arbitro delle prove non è unito a quello delle azioni** (`relazioni`).
   - `relazioni` si chiama solo quando ci sono altre azioni in coda e le regole non bastano: l'azione di un giocatore
     da solo non lo chiama mai.
   - Il suo prompt è tarato sui suoi casi (strumenti/valuta-arbitro.ts).
   - Una chiamata separata, lanciata all'invio dell'azione, costa 0 ms alla chiusura. Misure al §6.
6. **I PNG che attaccano sono una «reazione» decisa insieme all'azione**, non una riga del narratore. Una riga
   `[attacco]` arriverebbe dopo che il narratore ha già parlato, e raccontare l'esito vorrebbe una seconda chiamata. La
   reazione esce nella stessa decisione dell'azione che la scatena: per esempio si colpisce un PNG ostile che resta in
   piedi. Il Motore la tira subito dopo quell'azione.

## 2. Schede e dati (lo schema per la skill Preparatore)

Tutto è additivo: una campagna senza schede gioca come prima, senza dadi (log `PROVE E DADI … nessun PG ha una
scheda`). Tipi e caricatore: campagna/schede.ts, campagna/prove-scena.ts, campagna/regole-srd.ts.

```yaml
# pg.yaml → personaggi[]: il livello resta quello del PG (personaggi[].livello)
    scheda:
      caratteristiche: {forza: 16, destrezza: 14, costituzione: 15, intelligenza: 10, saggezza: 12, carisma: 8}  # 1–30, tutte e sei
      competenze: [atletica, percezione, intimidire, sopravvivenza]   # id delle 18 abilità (nomi italiani accettati)
      maestrie: [furtivita]               # facoltativo: competenza doppia
      tiri_salvezza: [forza, costituzione]
      armatura: {tipo: giaco di maglia, scudo: false}   # la CA la calcola il codice; oppure ca: 14 senza armatura
      pf: 12                              # punti ferita massimi
      attacchi:
        - {nome: "Balestra leggera", caratteristica: destrezza, danno: "1d8", tipo_danno: perforante, distanza: true}
        - {nome: "Spada lunga", caratteristica: forza, danno: "1d8", tipo_danno: tagliente}   # competente: true per default; bonus: +1 per un'arma magica

# png/<id>.yaml
scheda:
  gs: 1/2                                 # grado di sfida (decide la competenza); oppure livello
  caratteristiche: {…}                    # come sopra; l'Intelligenza fa la CD di Influenzare
  competenze: [intuizione, percezione]    # contano per i passivi (Percezione contro Furtività…)
  armatura: {tipo: armatura di pelle}     # oppure ca: 13
  pf: 11
  attacchi: [{nome: "Mazza ferrata", caratteristica: forza, danno: "1d6", tipo_danno: contundente}]
  influenza: {cd: 12}                     # facoltativo: CD fissa per convincerlo
# atteggiamento_pg.<pg>.stato (ostile | indifferente | amichevole), già nello schema: dà svantaggio o vantaggio.

# scena.yaml / scene/*.yaml: le CD decise dal Preparatore (ostacoli, indizi NON essenziali, soluzioni dei colli di bottiglia)
prove:
  - id: p_cassetta
    quando: "un PG apre di nascosto il lucchetto della cassetta del pedaggio"   # pubblico, ≤ 15 parole, lo vede l'arbitro
    abilita: rapidita_di_mano             # oppure caratteristica: forza, oppure salvezza: destrezza
    cd: 15
    indizio: i_lettera                    # facoltativo; un indizio essenziale qui è un avviso (F3): arriva comunque, con un prezzo
    se_fallisce: "il lucchetto scatta rumoroso"   # facoltativo: il prezzo, al narratore

# campagna.yaml: una campagna che vuole giocare senza dadi (alcuni brief lo chiedono)
regole: {dadi: false}

# repertorio: una battuta esce solo dopo una prova riuscita dell'azione a cui risponde
richiede: {prova: persuasione}            # abilità, caratteristica, id p_… della scena, oppure prova/salvezza/attacco
```

Il codice calcola tutti i modificatori: caratteristica, abilità (con competenza e maestria), tiro salvezza, passivo,
tiro per colpire, danno e CA dall'armatura. Né il file né il modello scrivono un modificatore.
- **CA:** una `ca` diversa da quella dell'armatura è un avviso, e vale la calcolata.
- **Scheda incompleta:** non ferma la sessione. Un punteggio mancante vale 10, ogni errore è un avviso nel log.
- **Contesto del narratore:** `scheda` e `prove` restano fuori, perché sarebbero numeri inutili in cache e CD da non
  leggere.

**Per il validatore della skill** (strumenti/valida_campagna.py, da aggiornare). Da controllare:
- le sei caratteristiche, con punteggi da 1 a 30;
- abilità e tiri salvezza tra gli id ammessi;
- `armatura.tipo` tra le armature dell'SRD, oppure `ca` intera;
- `pf` > 0;
- attacchi con `nome`, una `caratteristica` valida e un `danno` NdF con F in {4, 6, 8, 10, 12};
- `gs` o `livello` sui PNG;
- negli elementi di `prove`: `id` p_…, `quando` (al massimo 15 parole, senza segreti), `cd` da 5 a 30, un'abilità, una
  caratteristica o una salvezza, e un `indizio` che esiste e non è essenziale;
- `richiede.prova` riconoscibile;
- `regole.dadi` booleano.

**Scelte del validatore** (strumenti/valida/regole_schede.py, già in uso; dove il testo sopra lascia spazio):
- **(a) Punteggi.** PG da 1 a 20, PNG da 1 a 30. Il livello del PG va da 1 a 20: fuori, è un errore.
- **(b) Indizio essenziale.** Un indizio essenziale citato da una prova è un **errore**, non un avviso: la prova
  non può essere l'unica strada verso un indizio che la campagna dichiara essenziale. Il Motore lo dà comunque con
  un prezzo; il validatore vieta di scrivere il collegamento.
- **(c) Fasce di GS.** CA, PF e tiro per colpire dei PNG sono fasce **approssimate dalle tabelle del Manuale del
  Master 2014**, non dall'SRD 5.2: CA da 9 a tipica+3, PF fino al tetto del GS, tiro per colpire non oltre competenza
  +5, e non più di due dadi di danno sotto GS 2. Sono in `strumenti/valida/srd.py` e vanno riviste con una fonte
  migliore.
- **(d) Forme di `richiede.prova`.** Accettate: un'abilità o una caratteristica con l'id esatto (`persuasione`,
  `rapidita_di_mano`), un id `p_…` di una prova della scena, il nome di un attacco come id (`balestra_leggera`), e i
  tipi `prova`, `salvezza`, `attacco`, `contrapposta`. Il Motore confronta le stringhe esatte: un nome italiano o una
  maiuscola non basta.

Coerenze consigliate (avvisi):
- ogni PG giocabile ha una scheda;
- ogni PNG che può combattere o va convinto ha una scheda;
- `atteggiamento_pg` è coerente con ciò che serve.

## 3. Flusso

1. **Invio dell'azione** (Regia.inviaAzione). In sottofondo l'arbitro delle prove la classifica: prove/motore.ts →
   `preclassifica`, una chiamata Haiku per azione.
   - La decisione resta in cache per (azione, revisione, versione della scena).
   - Se l'azione cambia, si rifà.
   - Alla fine di una narrazione si rifanno insieme le azioni in coda, ormai vecchie.
2. **Chiusura della finestra** (Regia.finestraChiusa, ora asincrona). `MotoreProve.risolvi` prende le decisioni.
   - Quelle in volo le aspetta al massimo 4 s (con l'arbitro a regole non c'è niente da aspettare).
   - Quelle mancanti le chiede in una chiamata sola.
   - Allo scadere, o senza modello, decide l'**arbitro a regole** (prove/classificatore-regole.ts). È il default del profilo tutto locale (`arbitro_prove: {provider: regole}`): il modello piccolo ha meno responsabilità possibile. In ordine:
     1. attacco: verbo d'attacco o un'arma della scheda dell'autore, contro un bersaglio nominato con la scheda;
     2. aiuto: «aiuto / do una mano a / copro» («help / give … a hand / I cover» in inglese) + un PG che agisce nello stesso turno;
     3. prova della scena: il suo `quando` ha almeno due radici in comune con l'azione (i nomi non contano), o una delle sue `parole`;
     4. abilità per parole chiave: la tabella SRD della lingua dei contenuti (`parole.abilita` di lingue/<codice>/prove.yaml); per un set non SRD `parole_chiave` di regole.yaml, le `parole` dei passi con `per:` e il `quando` delle mosse. Furtività e Rapidità di mano verso un PNG sono contrapposte, le sociali senza un PNG non tirano;
     5. il resto, senza parole chiave: nessun tiro.
     - La CD la decide il Motore, come sempre. Niente vantaggi né «impossibile», ma il dado si tira lo stesso e non si resta mai bloccati.
     - Quale arbitro: `regole` è il default del profilo locale (nessun modello, nessuna attesa alla chiusura, nessuna gara col lettore per la GPU); `anthropic` è il default quando c'è la chiave; `{provider: locale, modo: minimo}` è un'opzione esplicita per chi ha una macchina più potente (prove/arbitro-minimo.ts: il modello sceglie fra le candidate, entro 3 s, se no decide il classificatore). Il log d'avvio dice quale è in uso.
     - Le parole chiave stanno in UN posto per lingua, lingue/<codice>/prove.yaml (`parole`: abilità SRD, verbi d'attacco e d'aiuto, «a mani nude»), radici come regex sul testo normalizzato; prove/parole-chiave.ts le compila (`paroleSrd()`, candidate per set) per il classificatore e il modo minimo. L'italiano è la tabella di sempre; l'inglese copre le stesse abilità e mosse («I climb the wall» → Atletica, «I try to persuade the guard» → Persuasione, «I shoot Ruggero with my crossbow» → attacco: test/prove-lingua.test.ts).
     - Lingua: nomi SRD (caratteristiche, abilità, difficoltà, armature, condizioni, tipi di danno) da prove.yaml (italiano dall'SRD 5.2.1 in italiano, inglese dall'SRD 5.2); frasi dei fatti, delle carte e dei messaggi agli arbitri da lingue/<codice>/testi-prove.yaml (chiavi `prove.…` e `regole.…`); prompt degli arbitri e di «Chiedi una regola» in prompts/<codice>/arbitro-prove.md, arbitro-minimo.md, risponditore-regole.md. Gli id (schema JSON, schede) restano gli stessi in ogni lingua (docs/lingue.md).
     - Accordo con l'arbitro Haiku (strumenti/confronta-arbitri.ts, 10 novembre; le decisioni di Haiku sono in cache, così la misura si ripete uguale):

       | Insieme | si tira sì/no | stesso tipo | stessa abilità o prova | stessa CD/CA (quando tirano entrambi) |
       |---|---|---|---|---|
       | 16 casi scritti a mano | 15/16 (94%) | 14/16 (88%) | 5/6 | 9/9 |
       | 95 azioni dei turni B3 di nozze-neve | 71/95 (75%) | 66/95 (69%) | 6/11 | 9/11 (82%) |

       Molti disaccordi B3 sono domande ai PNG che Haiku stesso tira in un run e non in un altro (per esempio «Intimidire» per «ettore, sei salito al sasso?»). Altri sono mancanze vere del classificatore: niente «impossibile», niente vantaggi, e la bugia senza un verbo di menzogna («dico a Ruggero che il barone mi manda»).
3. **Tiri** (prove/risolutore.ts).
   - Prima si raccolgono gli «aiuto», che danno vantaggio all'azione aiutata.
   - Poi ogni azione tira, nell'ordine di risoluzione del tavolo.
   - Subito dopo tira l'eventuale reazione del PNG.
   - I PF cambiano subito: il secondo colpo trova il PNG già a terra.
   - Le decisioni passano prima da `normalizzaDecisione`: la prova della scena vince, e le abilità sociali verso un PNG
     diventano Influenzare.
4. **Carte**. Lo stato del tavolo porta `tiri` (le carte pubbliche), `dadi: true` e `pg[].pf`.
   - Ogni autore riceve la sua `azione:mia` con `tiri`, anche privati.
   - Il proiettore anima le carte mentre il narratore genera.
5. **Narratore**. La sezione «Esiti dei tiri» sta subito dopo le azioni (narrazione/messaggio.ts), con le regole in
   prompts/it/narratore.md §6 e prompts/it/selettore.md §2.
   - In modalità B le prove riuscite aprono le battute con `richiede.prova` (repertorio/condizioni.ts).
6. **Stato e ripresa**.
   - `FotografiaSessione.prove` contiene PF, seme e contatore dei dadi e le ultime carte: un riavvio riprende gli
     stessi PF.
   - Ricomincia riporta i PF pieni con un seme nuovo.
   - Cambio di scena: si dimenticano solo le decisioni in cache.

**Dadi** (prove/dadi.ts): HMAC-SHA256(seme, contatore), ridotto alle facce con il rifiuto dei valori in coda, quindi
senza distorsione.
- Il seme nasce da `crypto.randomBytes` e si salva nell'archivio.
- `CANTASTORIE_SEME_DADI=<esadecimale>` rifà una partita.
- Ogni dado tirato è nel log (`dadi: tiro`, con indice, facce e valore). Ogni azione risolta è nel log
  (`prove: azione risolta`, con dadi, modificatore, totale, CD ed esito). Ogni turno è nel log (`prove: turno
  risolto`, con attesa, decisioni tardive, seme e contatore).

## 4. Che cosa decide l'arbitro (prove/arbitro-haiku.ts, prompt in prompts/<codice>/arbitro-prove.md)

Lo schema JSON ha questi campi, con la stringa vuota quando non servono:
- `tipo`: nessuna, impossibile, prova, salvezza, attacco, contrapposta o aiuto;
- `abilita` / `caratteristica`;
- `bersaglio`;
- `arma`: id dalla scheda; vuoto = mani nude;
- `prova_scena`: id dai dati;
- `difficolta`: dalla scala SRD, solo senza dati;
- `abilita_bersaglio`;
- `vantaggio` con `motivo`, al massimo dieci parole, senza segreti;
- `aiuta`;
- `reazione_png` e `reazione_quando` («sempre» o «se_fallisce»).

L'arbitro vede soltanto parti pubbliche:
- il riassunto pubblico della scena;
- l'ultima narrazione;
- i PG con le loro armi;
- i PNG presenti, con l'atteggiamento verso ogni PG;
- le prove della scena (id e `quando`);
- le altre azioni pubbliche del turno.

Il Motore scarta tutto ciò che non torna: id inesistenti, un'arma che il PG non ha, una prova della scena sconosciuta.

## 5. Narrazione e schermi

Esempi di fatti nel messaggio (veri, dalla partita sulla 4720):
```
- [1] Ida Ferraro: Persuasione (Carisma) verso Bertoldo (con vantaggio: Bertoldo è ben disposto): 25 contro CD 15 → RIUSCITA.
- [2] Corrado Lanzi: attacco con Balestra leggera a Ruggero lo sgherro: 19 contro CA 13 → COLPITO, 7 danni perforanti; Ruggero lo sgherro è ferito gravemente. Poi Ruggero lo sgherro reagisce: attacco con Mazza ferrata a Corrado Lanzi: 21 contro CA 15 → COLPITO, 5 danni contundenti; Corrado Lanzi ha 7 punti ferita su 12.
- [3] Teo (azione PRIVATA: …): Rapidità di mano (Destrezza): 16 contro CD 15 → RIUSCITA.
```
- **Numeri a voce:** punti ferita, CA e CD non si dicono (prompt). Se il narratore li scrive lo stesso («quattro punti di vita», «la CA 15»), narrazione/numeri-regole.ts toglie il numero prima della voce e della trascrizione: li mostra già la carta.
- **PF a voce:** dei PNG il narratore sente solo come stanno («ferito ma regge», «a terra»), mai i numeri. Dei PG sente
  i numeri, che i giocatori vedono comunque sul telefono.
- **Proiettore** (apps/web/src/schermo/TiriSchermo.tsx, components/CartaTiro.tsx). Una colonna di carte a destra:
  - su ogni carta: chi tira, che cosa e contro chi, il d20 (due con vantaggio, il dado scartato attenuato), il
    modificatore, il totale, la CD o CA, l'esito, e per gli attacchi il danno e «a terra»;
  - il d20 gira circa 1,2 s, poi compaiono totale ed esito: questo copre l'attesa del narratore;
  - l'animazione parte una volta per carta e rispetta `prefers-reduced-motion`;
  - finita la narrazione le carte si stringono e poi spariscono.
- **Telefono.** La carta della propria azione, anche privata, la vede solo il suo telefono. Ci sono poi i «Tiri del
  turno» pubblici e i PF sotto il nome.
- **Banco senza server:** `/schermo?carte=prova`, `?carte=galleria`, `/telefono?carte=prova`.

## 6. Verifica (9 novembre)

- **Test unitari** (apps/server/test/prove-regole.test.ts, prove-motore.test.ts, prove-repertorio.test.ts):
  modificatori, competenza, CA, formule, dadi riproducibili e uniformi (chi quadro), vantaggio, critico e 1 naturale,
  PF, risoluzione con un arbitro finto. Il risolutore copre: Influenzare, prova della scena, attacco e a terra,
  reazione, aiuto, contrapposta, impossibile, PG senza scheda, arbitro assente o lento, cache all'invio, ripresa.
  Il cancello `richiede.prova` ha i suoi test.
- **Integrazione col server intero** (prove-integrazione.test.ts): carta, fatto nel messaggio, battuta col cancello,
  carta privata solo sul suo telefono, PF dopo un riavvio, campagna senza schede invariata.
- **Arbitro con Haiku vero** (strumenti/valuta-prove.ts, 16 casi in test/prove/casi.yaml):
  - una chiamata per azione: **16/16 sul tipo, 33/33 campi**; p50 1,7 s, p90 2,4 s, $0,0029 per 16 chiamate;
  - 16 azioni in una chiamata: 15/16, 7,1 s.
  - Primo giro, prima dei ritocchi: Haiku chiamava «contrapposta» una minaccia e dimenticava l'abilità di una prova
    della scena.
- **Latenza.** I telefoni di Riccardo, prima dei dadi (logs/turni.jsonl, 40 turni): primo token del narratore a
  **809 ms** dalla chiusura (mediana); l'arbitro `relazioni` a 1,36 s (p50).
  - Con i dadi, e2e sulla 4720 (3 run, 3 PG, Haiku vero): attesa dei tiri alla chiusura **1–2 ms**, perché le decisioni
    erano tutte pronte dall'invio (`tardive: []`).
  - Primo token: 589 e 946 ms (modo B); 1520 ms (modo A, primo turno, cache del contesto da scrivere).
  - La differenza viene da Haiku, non dai dadi: se una decisione mancasse alla chiusura, l'attesa sarebbe ≈ 1,7 s.
- **E2E** (apps/web/e2e/prove.spec.ts, `E2E_PORTA=4720`). Proiettore e tre telefoni: Persuasione, balestra con la
  reazione dello sgherro, scasso privato. Le carte sono giuste e la privata compare solo sul telefono di Teo.
  - Screenshot in logs/screenshots/prove/e2e-*.png.
  - Il narratore racconta gli esiti come sono: convinto o no, colpito o mancato, ferito, il lucchetto che scatta.

## 7. Aperto

- **Skill Preparatore**: generare le schede secondo il §2 (PG pregenerati con caratteristiche coerenti con classe e
  livello; PNG con GS, attacchi e passivi; `prove` per gli ostacoli e gli indizi non essenziali; `richiede.prova` sulle
  confessioni che vanno conquistate; `regole.dadi: false` quando il brief lo chiede) e aggiornare il validatore.
  Le campagne vere (prova-f0, nozze-neve, ponte-lanterne) oggi non hanno schede, quindi giocano senza dadi.
- **Azioni private ad alta voce**: in tutte e tre le prove sulla 4720 il narratore ha detto a voce lo scasso privato di
  Teo. Nelle due fallite lo scatto del lucchetto si sentiva davvero, ma il narratore ha nominato Teo lo stesso. Il fatto
  ora lo vieta. Il canale `[privato pg_x]` dell'agente «voce» è la strada giusta, da verificare quando arriva.
  - Guardia deterministica (narrazione/privato.ts): una riga al tavolo che nomina l'autore e riprende il contenuto
    dell'azione privata va al suo telefono.
  - E2E finale del 10 novembre: la riga del narratore andava al telefono, ma la risposta `[png_x]` del PNG a cui il PG
    parlava in privato si sentiva al tavolo. Ora una riga `[png_x]` va al telefono di chi ha agito quando nessuna azione
    pubblica del turno è rivolta a quel PNG e un'azione privata lo nomina (per nome o soprannome), oppure quando il turno
    ha solo le azioni private di un PG. Più PG che parlano in privato allo stesso PNG: va a chi ha più parole in comune
    con la riga. In ogni lingua (i nomi bastano). Test: test/privato-guardia.test.ts, test/lingue-regole-en.test.ts.
- **Combattimento vero**:
  - iniziativa e ordine dei turni;
  - attacchi dei PNG non provocati (una riga `[attacco]`, da concordare con il parser di «voce»);
  - tiri salvezza contro la morte e PG a 0 PF (oggi «a terra, privo di sensi», non agisce finché non lo curano);
  - condizioni (prono, afferrato…);
  - attacchi multipli, incantesimi e tiri salvezza imposti dai PNG;
  - distanza mischia/distanza tenuta dal Motore.
- **Pannello del master**: PF di PG e PNG con cura, danno e riposo a mano, e le ultime carte. Oggi i PF dei PNG sono
  solo nei log e nell'archivio.
- **Atteggiamenti**: il Motore usa quelli della scheda. Quando un PNG cambia idea nella storia, il vantaggio non lo
  segue ancora (serve `set_attitude`, architettura.md).

Crediti: questo lavoro include materiale dal System Reference Document 5.2 («SRD 5.2») di Wizards of the Coast LLC,
https://www.dndbeyond.com/srd, con licenza Creative Commons Attribution 4.0 International.

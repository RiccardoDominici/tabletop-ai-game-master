# Repertorio: le battute scritte prima (versione 2)

Leggi prima `docs/repertorio.md`. Qui c'è come scriverle bene, e la copertura che il validatore pretende.

## 1. A cosa serve
Haiku in modalità repertorio (modo B) **non conosce i segreti**. Riceve:
- il contesto pubblico della campagna e della scena (l'elenco esatto è nella regola 1 della skill; lo
  stampa `npx tsx strumenti/contesto_modo_b.ts campagne/<id>`);
- il catalogo delle battute pertinenti alle azioni del turno, nella forma `id · chi · tipo · quando`
  (menzogne, verità e confessioni vi compaiono come «risposta»);
- gli esempi di voce dei PNG.

Lega ogni battuta all'azione a cui risponde (`[usa] id > pg_x`) e improvvisa solo i raccordi: l'annuncio di
ogni azione pubblica (il nome del PG e ciò che ha scritto, manuale N15) e i passaggi tra una battuta e l'altra. Le battute
servono a quattro cose:
- **qualità**: le scrivi tu, con calma;
- **latenza**: l'audio si genera prima;
- **segreti**: il testo segreto esce solo quando le condizioni sono vere;
- **regia**: segni d'orologio, momenti e finali arrivano nel momento giusto.

## 2. Tre classi di battute
| Classe | Cosa | Come si marca |
|---|---|---|
| selezionabile | menzogne, confessioni, indizi, segni d'orologio, momenti chiave, finali, risposte a domande precise | (nessun flag) |
| esempio di voce | saluto, domanda gentile, accusa, minaccia, offerta e aiuto generici, rifiuto | `solo_esempio: true` |
| riempitivo | mosse che non rispondono a niente, usate solo allo stallo: il cane si alza, il tempo passa, un PNG che ricorda il rito | `riempitivo: true` |

Un esempio di voce non può mentire, rivelare, confessare o far avanzare l'orologio [V]. Un riempitivo è
solo di tipo momento, indizio, transizione o richiesta [V].

## 3. id, quando, temi: i tre campi che decidono tutto
- **id**: `<prefisso>_<argomento neutro>`. Prefissi: `nar_` per il narratore, `fin_` per i finali,
  `tr_` per le transizioni, tre lettere del PNG (`ott_`, `bal_`) per i PNG.
  - **Niente segreti nell'id**: `nar_volto_candela`, non `seb_cicatrice_candela`; `bal_chi_malato`, non `bal_carbonai`.
  - **L'id si legge come una frase.** Il selettore vede «ott segale domanda» e ne deduce ciò che dice: un id
    che nomina la natura della battuta (`_versione`, `_verita`, `_confessa`) dice chi mente, uno che nomina
    l'esito (`zel_presa_macchia`: «Zelia presa») dice chi è stato. Usa l'argomento e la situazione:
    `ott_segale_domanda`, `zel_macchia_privato`. Le parole che lo tradiscono sono un errore in rigoroso
    (`REPERTORIO.id_rivelatore`); le altre le trovi solo leggendo il catalogo (`--catalogo`, passo 10).
  - Per le reazioni generiche l'id finisce con la categoria: `ott_saluto`, `ott_domanda_gentile`,
    `ott_accusa`, `ott_minaccia`, `ott_offerta`, `ott_aiuto`, `ott_rifiuto`.
- **quando**: al massimo 15 parole. Descrive **un fatto osservabile** nella finzione o nell'azione. Si legge
  come una frase anche lui: «un PG chiede a Ettore perché non salì al Sasso» dice che doveva salirci.
  - Niente verità: «un PG mostra a Ottavia un chicco nero, dove Baldrin non sente», non «Ottavia confessa».
  - Niente parole che dicono chi mente: mente, bugia, menzogna, confessa, segreto, nasconde, verità [V].
  - Se serve citare un segreto (il PG ha trovato i chicchi neri), la battuta deve richiedere l'indizio
    che lo rende pubblico (`richiede.indizi_rivelati`).
- **temi**: le parole con cui un giocatore scriverebbe l'azione, nelle forme vere: spezzo, spezzare, pezzo, pagnotta.
  - Il Motore le confronta con l'azione come parole intere; un tema di almeno cinque lettere vale anche
    come inizio di parola («pagnott» prende pagnotta e pagnotte, ma «ponte» prende anche «pontieri»).
  - Niente parole generiche (porta, chi, notte, pane, guardo, apro, uomo, dentro…) [R].
  - Niente parole con due sensi che il prefiltro non distingue: «tocco» è il rintocco e «io tocco».
    Scegli la forma che ha un senso solo («rintocco», «campana»).
  - Una battuta entra nel catalogo anche quando l'azione nomina il PNG che parla (nome o `alias`).
  - Segni d'orologio e finali hanno temi neutri (`[orologio]`), perché li porta lo stato, non le parole.
  - Prova i temi sui copioni ciechi della tua campagna: `--copioni esperimenti/copioni/<id>` (passo 12).
    Il catalogo medio per temi deve stare sotto 4 battute per azione.
- **max_usi**: al massimo 1 più il numero di varianti, anche per gli esempi di voce [V]: oltre,
  ripeterebbe lo stesso testo.

## 4. Confessioni con un cancello vero
Ogni condizione di `cede_se` è una battuta di tipo `confessione`. Il suo `richiede` traduce la
condizione in qualcosa che il Motore può controllare:

| Condizione in cede_se | richiede |
|---|---|
| «in privato», «dove X non sente» | `privata: true` |
| «quando Assenzio le chiede…» | `da_pg: [pg_assenzio]` |
| «quando un PG le mostra il chicco nero» | `indizi_rivelati: [i_speroni_neri]` |
| «dopo aver detto la sua versione» | `battute_usate: [<id della menzogna>]` |
| «al terzo rintocco» | `orologio: {id, min, max}` |

Una confessione senza nessuno di questi cancelli è un avviso, e un errore in modo rigoroso.

Poi:
- `effetti.fatti_noti` contiene la verità (`mente_su.verita`): è così che il validatore lega la
  confessione alla menzogna;
- due confessioni alternative della stessa verità si escludono a vicenda con `battute_non_usate`.

**Cancelli con «oppure».** `richiede` vuole tutte le sue condizioni vere. Per «una qualunque di queste
prove» il formato prevede `richiede.oppure: [{indizi_rivelati: [i_a]}, {indizi_rivelati: [i_b]}]`: le
condizioni di base, più almeno una alternativa. **Il server non lo applica ancora**, e una battuta con
`oppure` uscirebbe con le sole condizioni di base: per questo oggi il validatore lo rifiuta. Fino ad
allora scrivi una battuta per alternativa, con lo stesso testo, e falle escludere a vicenda con
`battute_non_usate`; per una confessione, ogni copia ha il suo cancello.

## 5. Menzogne
- Una battuta di tipo `menzogna` per ogni `mente_su`, con `effetti.menzogna_detta: <mente_su.id>`.
- **Il segnale in ogni versione** (testo e varianti), in una riga `[narratore]`, con le parole di `segnale` [V].
- Il testo del PNG ricalca la `versione` della scheda. Una variante può accorciarla («Ve l'ho già detto.
  Il mulino del paese»), ma non cambiarne il contenuto.

## 6. Le altre battute
- **Indizi**: una battuta per ogni modo (`modi`) di trovarli [V].
  - Descrivi, non concludere.
  - `effetti.rivela_indizi`, più `fatti_noti` solo se il fatto viene detto per intero.
- **Segni d'orologio**: una battuta per segmento, con `richiede.orologio: {id, min: k-1, max: k-1}` ed
  `effetti.avanza_orologio` [V]. Il testo ricalca il segno di campagna.yaml. Si può aggiungere un dettaglio,
  per un massimo di quattro frasi.
- **Momenti chiave**: le iniziative e le evoluzioni dei PNG (Ottavia brucia i sacchi, Baldrin avvolge la
  mollica per la figlia), il climax, le svolte.
- **Segnali audio** (`audio: {effetto, umore}`, schema.md «Audio»): pochi, e solo dove il testo li chiama.
  - `effetto` sulle battute la cui **prima frase** nomina il suono: il segno «la campana batte il terzo
    tocco» porta `effetto: campana`; una porta sfondata, `porta`. Mai un effetto che la battuta non dice:
    il tavolo sentirebbe un rumore senza causa.
  - `umore` sulle svolte che la `musica.transizione` della scena già prevede: il segno che fa partire la
    corsa (`inseguimento`), il finale in cui qualcuno resta indietro (`lutto`), la veglia che finisce
    (`rito_sacro`). Al massimo due cambi d'umore per scena fuori dai finali; `auto` riporta la musica del luogo.
  - Niente segnali sugli esempi di voce, sui riempitivi o sulle battute che possono uscire in ogni momento.
- **Finali**: uno per ogni esito del `taglio` [V almeno uno], con `richiede.orologio` a orologio completo
  se arrivano solo al climax. Se la scena ha `esiti`, ogni esito cita il suo finale [V].
- **Esempi di voce**: per ogni PNG di supporto o principale, almeno tre, con un saluto e un rifiuto [V].
  Coprono le categorie domanda gentile, accusa, minaccia, offerta e aiuto (avviso se mancano). Il loro
  testo entra nel contesto del selettore, quindi **nessuna parola segreta** [V].
- **Riempitivi**: almeno uno [V]; di solito la mossa morbida della scena e qualche iniziativa dei PNG.
- **Nessuna battuta presuppone un'altra battuta facoltativa.** «Il mulo, no.» non va, se il mulo compare
  solo in un riempitivo che può non essere uscito. Se il legame serve, scrivilo: `richiede.battute_usate`.
- **Più scene**: `scena: <id>` lega una battuta a una scena sola. I segni di un orologio attivo in più
  scene e le battute degli indizi trovabili in più momenti non hanno `scena` (mestiere.md §9).
- **Transizioni**: almeno due (avviso), per entrare e uscire dai luoghi vicini.

## 7. Parole segrete (repertorio/parole_segrete.yaml)
```yaml
parole:
  - parola: "la lanterna in cantina"            # forma leggibile
    regex: "lanterna[^.]{0,40}(cantina|botte)"  # Python, sul testo in minuscolo
    fatti: [f_lanterna_cantina]                  # i fatti nascosti che rivela
    pubblica_dopo: [irma_lanterna_cera]          # id di battute o indizi che la rendono pubblica
    nota: "…"
    ammessa_nel_catalogo: []                     # rarissimo, va motivato (schema.md, lettura 17)
```
- **Una regex cerca il legame, non la parola.** «cerusico» compare anche nell'aggancio pubblico di un
  PG («il suo cerusico disertore»): quello che va cercato è «il forestiero è un cerusico».
- **Confini di parola.** Una regex scatta anche a metà di una parola più lunga: «sa del leone» trovava
  «Rosa del leone», «tetto» trovava «tettoia». Comincia con `\b` (avviso `SEGRETI.regex_dentro_parola`).
- **Anche i nomi propri portano segreti.** La gilda dei «Pontieri dell'Onda», nell'aggancio di un PG,
  conteneva la parola segreta «onda». Cerca le regex nei nomi di gilde, luoghi e soprannomi.
- **Ogni fatto nascosto** ha almeno una voce (avviso `SEGRETI.fatto_scoperto`).
- **Il catalogo, i campi pubblici** (apertura, riassunto, situazione comune, schede pubbliche dei PG,
  lettura d'aspetto, battuta campione, segni degli orologi attivi), **il contesto del modo B** (compilato
  dal server, scena per scena: `SEGRETI.contesto_b`) **e gli esempi di voce** non contengono nessuna regex
  ancora segreta [V]. Il contesto si compila con node; senza node resta un avviso, e il lavoro non è finito.
- **Ogni battuta che dice una parola segreta** o è in `pubblica_dopo`, o viene dopo un id che vi
  appartiene, o è di un PNG che ha il fatto nel suo `sa` [V]. Se la rende pubblica, è in `pubblica_dopo` [V].
- **`da_togliere_dal_contesto` non serve più.** Era un elenco dichiarato che nessuno applicava: il
  compilatore del server lavora per allowlist, e il validatore guarda ciò che manda davvero. Se c'è, si
  ignora. Ciò che non deve arrivare al selettore va scritto altrove: `come_si_trova`, elementi NASCOSTA,
  `mai_dice`, `preparazione`.

## 8. Tabella di copertura (spuntala prima di scrivere il testo)
- [ ] per ogni indizio: `modi` battute di rivelazione
- [ ] per ogni `mente_su`: una menzogna, con il segnale in ogni versione
- [ ] per ogni condizione di `cede_se`: una confessione con il suo cancello
- [ ] per ogni orologio attivo: un segno per segmento
- [ ] per ogni esito del taglio: un finale; più la chiusura con la scelta aperta (C13)
- [ ] per ogni PNG: saluto, domanda gentile, accusa, minaccia, offerta, aiuto, rifiuto (esempi o selezionabili)
- [ ] per ogni domanda probabile dei copioni: una risposta selezionabile, o un esempio di voce che guidi l'improvvisazione
- [ ] nessuna battuta cita ciò che solo un'altra battuta facoltativa ha introdotto
- [ ] almeno un riempitivo e due transizioni
- [ ] per ogni battuta: niente nomi di PG, niente segreti in id e quando, temi distintivi

## 9. Prosa delle battute [V]
- **Narratore**:
  - frasi di 16 parole al massimo, con una media tra 8 e 14 su tutto il repertorio;
  - al massimo 4 frasi per versione e 70 parole in tutto;
  - nessuna frase in terza persona su un PG: «ti», «vi», o niente. Il PG in terza persona c'è solo
    nell'annuncio della sua azione (manuale N15), che il narratore improvvisa prima della battuta;
  - la battuta parte dall'esito e non ripete l'azione: «Dentro la mollica ci sono chicchi neri», non
    «Spezzi la pagnotta: dentro…», che dopo l'annuncio «Ginestra spezza una pagnotta» suonerebbe due volte.
- **PNG**:
  - al massimo 2 frasi per riga, 4 nelle confessioni, nei momenti e nei finali;
  - frasi entro il tetto dello `stile` («Frasi di due-sei parole» → 9 al massimo).
- Niente nomi di PG, cifre, parentesi, puntini di sospensione o espressioni del §5.
- Rivolgersi a un PG ignoto senza accordi di genere: «Giù le mani dalle ceste!», non «Fermo!». Un
  vocativo di mestiere («sorella», «soldato») va bene solo se il `quando` dice a chi si parla.

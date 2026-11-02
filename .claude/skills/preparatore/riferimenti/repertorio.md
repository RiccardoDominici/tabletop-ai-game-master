# Repertorio: le battute scritte prima (versione 2)

Leggi prima `docs/repertorio.md`. Qui c'è come scriverle bene, e la copertura che il validatore pretende.

## 1. A cosa serve
Haiku in modalità repertorio (modo B) **non conosce i segreti**. Riceve:
- il catalogo delle battute pertinenti alle azioni del turno, nella forma `id · chi · tipo · quando`;
- gli esempi di voce dei PNG.

Lega ogni battuta all'azione a cui risponde (`[usa] id > pg_x`) e improvvisa solo i raccordi. Le battute
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
  - Per le reazioni generiche l'id finisce con la categoria: `ott_saluto`, `ott_domanda_gentile`,
    `ott_accusa`, `ott_minaccia`, `ott_offerta`, `ott_aiuto`, `ott_rifiuto`.
- **quando**: al massimo 15 parole. Descrive **un fatto osservabile** nella finzione o nell'azione.
  - Niente verità: «un PG mostra a Ottavia un chicco nero, dove Baldrin non sente», non «Ottavia confessa».
  - Niente parole che dicono chi mente: mente, bugia, menzogna, confessa, segreto, nasconde, verità [V].
  - Se serve citare un segreto (il PG ha trovato i chicchi neri), la battuta deve richiedere l'indizio
    che lo rende pubblico (`richiede.indizi_rivelati`).
- **temi**: le parole con cui un giocatore scriverebbe l'azione, nelle forme vere: spezzo, spezzare, pezzo, pagnotta.
  - Il Motore le confronta come parole intere con l'azione.
  - Niente parole generiche (porta, chi, notte, pane, guardo, apro, uomo, dentro…) [R].
  - Segni d'orologio e finali hanno temi neutri (`[orologio]`), perché li porta lo stato, non le parole.
  - Prova i temi sui copioni: `--copioni esperimenti/copioni`. Il catalogo medio deve stare sotto 4 battute per azione.

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
- **Finali**: uno per ogni esito del `taglio` [V almeno uno], con `richiede.orologio` a orologio completo
  se arrivano solo al climax. Se la scena ha `esiti`, ogni esito cita il suo finale [V].
- **Esempi di voce**: per ogni PNG di supporto o principale, almeno tre, con un saluto e un rifiuto [V].
  Coprono le categorie domanda gentile, accusa, minaccia, offerta e aiuto (avviso se mancano). Il loro
  testo entra nel contesto del selettore, quindi **nessuna parola segreta** [V].
- **Riempitivi**: almeno uno [V]; di solito la mossa morbida della scena e qualche iniziativa dei PNG.
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
da_togliere_dal_contesto:
  - {percorso: "scena.yaml → indizi[].come_si_trova", motivo: "…"}
```
- **Una regex cerca il legame, non la parola.** «cerusico» compare anche nell'aggancio pubblico di un
  PG («il suo cerusico disertore»): quello che va cercato è «il forestiero è un cerusico».
- **Ogni fatto nascosto** ha almeno una voce (avviso `SEGRETI.fatto_scoperto`).
- **Il catalogo, i campi pubblici** (apertura, riassunto, situazione comune, lettura d'aspetto, battuta
  campione, segni degli orologi attivi) **e gli esempi di voce** non contengono nessuna regex ancora segreta [V].
- **Ogni battuta che dice una parola segreta** o è in `pubblica_dopo`, o viene dopo un id che vi
  appartiene, o è di un PNG che ha il fatto nel suo `sa` [V]. Se la rende pubblica, è in `pubblica_dopo` [V].
- **`da_togliere_dal_contesto`** elenca le parti dei file che il compilatore del contesto deve togliere
  in modo B: `come_si_trova`, gli elementi NASCOSTA, lo stile di voce che svela il mestiere, eccetera.

## 8. Tabella di copertura (spuntala prima di scrivere il testo)
- [ ] per ogni indizio: `modi` battute di rivelazione
- [ ] per ogni `mente_su`: una menzogna, con il segnale in ogni versione
- [ ] per ogni condizione di `cede_se`: una confessione con il suo cancello
- [ ] per ogni orologio attivo: un segno per segmento
- [ ] per ogni esito del taglio: un finale; più la chiusura con la scelta aperta (C13)
- [ ] per ogni PNG: saluto, domanda gentile, accusa, minaccia, offerta, aiuto, rifiuto (esempi o selezionabili)
- [ ] per ogni domanda probabile dei copioni: una risposta selezionabile, o un esempio di voce che guidi l'improvvisazione
- [ ] almeno un riempitivo e due transizioni
- [ ] per ogni battuta: niente nomi di PG, niente segreti in id e quando, temi distintivi

## 9. Prosa delle battute [V]
- **Narratore**:
  - frasi di 16 parole al massimo, con una media tra 8 e 14 su tutto il repertorio;
  - al massimo 4 frasi per versione e 70 parole in tutto;
  - nessuna frase in terza persona su un PG: «ti», «vi», o niente.
- **PNG**:
  - al massimo 2 frasi per riga, 4 nelle confessioni, nei momenti e nei finali;
  - frasi entro il tetto dello `stile` («Frasi di due-sei parole» → 9 al massimo).
- Niente nomi di PG, cifre, parentesi, puntini di sospensione o espressioni del §5.
- Rivolgersi a un PG ignoto senza accordi di genere: «Giù le mani dalle ceste!», non «Fermo!». Un
  vocativo di mestiere («sorella», «soldato») va bene solo se il `quando` dice a chi si parla.

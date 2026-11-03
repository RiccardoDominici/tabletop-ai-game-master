# Giudizio nozze-neve. Fase 2: da master (con i dati)

**Fonti**: `campagne/nozze-neve/` (campagna.yaml, scena.yaml, scene/, png/, repertorio/, pg.yaml), le due `trascrizione.md` e i due `riepilogo.json`. Non ho letto README, autovalutazione né NOTE_SULLA_SKILL. Per attribuire alcune cause ho dato un'occhiata mirata al server del worktree della prova (`apps/server/src/scena/regia.ts`, `scena/orologi.ts`, `repertorio/stato.ts`, `campagna/caricatore.ts`).

**Cause**: (1) dati della campagna / skill Preparatore · (2) validatore · (3) motore (server) · (4) prompt del narratore o del selettore · (5) copione delle azioni.

**Correzione rispetto alla fase 1.** Le "informazioni piovute dal cielo" (vento, lettere firmate E, ceralacca, cantina, treccia rossa, contratto) vengono dalle `conoscenze_private` dei PG (pg.yaml). È il design, e funziona: i giocatori le hanno usate quasi tutte e hanno aperto piste vere. Non è un problema.

---

## 0. Quadro in numeri

| | indagine-B | caotico-B |
|---|---|---|
| turni giocati / cambi di scena | 12 / 5 (casera↔casa due volte, poi Sasso) | 15 / 2 |
| quota righe pre-scritte | 32% (42 su 132) | 24% (38 su 157) |
| `[usa]` rifiutati | 4 | 15 |
| orologio o_tramonto | 8/8 al **T14, ancora in casera** | 8/8 al **T11, in casa Bonfanti** |
| o_lite / o_zio | 0/6, 0/4 | 0/6, 0/4 |
| rivelazioni avvicinate | r_zelia (Gaspare accusa Zelia, T14) | r_zio (contratto, T10), r_anello parziale (catenine, T14) |
| finale giocato | nessuno | nessuno (improvvisato e ripetuto 4 volte) |
| battute mai uscite | 121 su 139 | 122 su 139 (115 mai uscite in nessuna delle due) |

Nessuna delle due partite ha trovato l'anello. In nessuna delle due l'indizio essenziale `i_campanaccio` è uscito.

---

## A. Fughe di segreti

- **A1, indagine T5, Zelia.** Battuta improvvisata: "Le lettere le ho messe nella cassapanca, sotto i merletti. E la E la firmava solo la nonna." Il rilevatore la segnala. Che le lettere esistano l'aveva già detto Livia, quindi questa parte non è una fuga. Il punto preciso (cassapanca, merletti) è invece il contenuto di `zel_motivo`, che esce solo dopo la confessione (`i_zelia_confessa`). "La firmava la nonna", poi, è falso: la E è di Ettore, e Zelia lo sa (`f_lettere_soffitta` nel suo `sa`). **Causa (4)**: le battute improvvisate dei PNG pescano dal `sa` senza rispettare i cancelli `cede_se` e `richiede`.
- **A2, indagine T14, Gaspare confessa** con `gas_macchia_sorella` ("Inchiostro e un capello rosso…"). Vanda però non gli ha mostrato né la macchia né il capello: ha detto "alba al sasso, mezzogiorno nella stalla, cassetto di gaspare". Quella frase richiamava l'alibi di Bastiano, quindi la gemella giusta era `gas_alibi_sorella`. La confessione è stata quasi meritata, ma con la battuta sbagliata, e Gaspare cita prove che nessuno gli ha mostrato. **Causa (4)**, il selettore.
- **A3, indagine T12, Ettore.** "E una scatolina che nessuno ha guardato abbastanza": un suggerimento da narratore. Ettore non sa chi ha preso l'anello (`non_sa: f_zelia_presa`). È minore. **Causa (4)**.
- **Caotico**: nessuna fuga. Il Libro viene aperto con un braccio di ferro (T14): la scheda dice "a chi glielo chiede con garbo, o a chi gli porta un bicchiere", ma la concessione è generosa e giusta.

## B. Contraddizioni col canone e PNG incoerenti

- **B1, grave: il campanaccio della Duchessa SUONA.** Caotico T8 "il tintinnio grave del campanaccio della Duchessa", T9 "grave e vicino", T10, T11 "suona forte". L'indizio essenziale della campagna è proprio che quel campanaccio è **muto**, perché dentro c'è l'anello (`i_campanaccio`, `nar_stalla_entrata`). Al T9 Gunda entra nella stalla, cioè fa esattamente l'azione che scatena l'indizio, e il narratore le fa sentire il campanaccio. **Causa (1)**. La parte pubblica della scena invita a far suonare i campanacci ("I campanacci delle vacche che suonano piano sotto il pavimento", `sensi`; "dalla cucina si sentono… i campanacci", `descrizione`), e non c'è nessun vincolo pubblico che dica "quello grande della Duchessa non suona". Il fatto osservabile non è segreto: segreto è il perché. Il Preparatore l'ha nascosto insieme al segreto.
- **B2, la lettera passa a Tonio.** Indagine T7 "Tonio si tocca il petto, dove sotto la giacca c'è un rigonfiamento di carta", poi di nuovo al T13 e al T16. Al T16 Livia la prende invece "dalla giacca di Ettore". Il canone (`f_lettera_giacca`) la mette nella giacca di Ettore. La scheda dice "NASCOSTA… Non nominarla finché un PG non fruga": il narratore ha obbedito spostandola su un altro personaggio. **Causa (4)**.
- **B3, indagine T10, Adelina inventa una sorella.** "Quella lettera la scrisse mia sorella, tanti anni fa." Nel canone Adelina ha un fratello, Gaspare, e nessuna sorella. Nella stessa riga dice "di **Ettore** non parlo", mentre `mai_dice` vieta il nome di Ettore finché lei non sa. **Causa (4)**.
- **B4, PNG fuori dalla loro scena.** Zelia parla in casera (indagine T1, T12), mentre la scheda dice "non viene mai qui". Adelina parla in casa Bonfanti (T9, T10), mentre "non viene mai qui". Il Preparatore le aveva separate di proposito, per le voci nadine e tabitha: con la voce vera si sarebbero sovrapposte. **Causa (3)**: il motore filtra per `png_presenti` solo le battute pre-scritte (`repertorio/stato.ts:132`) e non le righe improvvisate `[png_*]`. Il copione si rivolge a PNG assenti (5), ma il motore dovrebbe far rispondere "Zelia non è qui".
- **B5, indagine T3, Zelia.** "di sopra c'è la nonna che dorme": la nonna è in casera. **Causa (4)**.
- **B6, indizi inventati.** Indagine T10: "sul velluto della veste [di Agnese] resta un'ombra di inchiostro", una falsa pista contro la sposa, che è innocente. Caotico T10: "sotto la scala trovi un sacchetto di carta vecchia e una lanterna spenta, ancora calda", che nel canone non esiste e non porta a niente. **Causa (4)**.
- **B7, impronte.** Improvvisata: "due, una piccola e una larga". Pre-scritta subito dopo: "piccole e strette" (indagine T2). Stesso schema per Tonio: "viso bianco come la neve", poi la pre-scritta "arrossisce fino al collo". **Causa (4)**: il narratore anticipa l'esito nell'annuncio e la battuta lo smentisce.
- **B8, caotico T9, Zelia.** "Bastiano? Non lo conosco di persona": in un paese di montagna non è credibile. Al T11 lo scagiona: "scrivo che non ha le mani sporche d'inchiostro". **Causa (4)**.
- **B9, il narratore decide per i PG.** Indagine T5: Vanda "ci passa sopra il coltello", ma aveva solo fatto una domanda. Indagine T16: Livia "prende la lettera dalla giacca di Ettore", ma aveva solo chiesto. Caotico T2: la battuta di Vanda diventa un'azione fisica. **Causa (4)**.
- **Coerenti e buoni**: le versioni dei bugiardi reggono. Gaspare accusa il garzone (T5, `gas_chi_cera`). Adelina "È l'anello di mia madre, Bonfanti come me" (T13). Ettore "Quel giorno sono sceso a valle" (caotico T14). Gaspare rifiuta sempre di firmare prima del tramonto (caotico T6, T11, T16), in linea con `f_contratto`. Nessuno confessa la cosa vera senza almeno avvicinarsi al `cede_se`, con l'eccezione di A2.

## C. Orologi

- **C1, o_tramonto corre troppo e finisce prima del climax.** Indagine: segni ai T3 (narratore), T5, T7 (motore), T9, T10 (narratore), T12 (motore), T13, T14 (narratore), cioè 8/8 al T14 in casera. Caotico: T3, T4, T5, T6 (narratore), T8, T9 (motore), T10, T11 (narratore), cioè 8/8 al T11 in casa Bonfanti. In tutte e due si sale al Sasso **a sole già calato**. La campagna prevedeva due ore e tre scene, con "almeno un segno ogni sei risposte" (`segno_almeno_ogni: 6`). **Causa (3)**. Il segno "dovuto" del motore scatta nella prima risposta dopo ogni cambio di scena, e poi anche in turni consecutivi (caotico T8 e T9), cosa incompatibile con 6. Ipotesi da verificare: `dovuto()` calcola `turno − (ultimoTurno ?? 0) ≥ 6` (`orologi.ts:146`), e dopo un cambio di scena `ultimoTurno` riparte da null ("mai in questa scena"), quindi dal turno 6 in poi ogni turno risulta dovuto. Ci aggiunge del suo il narratore, che propone un segno quasi a ogni turno (caotico T3–T6) (4). Il copione rimbalza fra le scene e porta più segni "da cambio scena" (5).
- **C2, frasi d'orologio improvvisate.** "Il sole ha già toccato il passo" (indagine T3), "il sole tocca già il passo" (caotico T4), "il quarto richiamo… il sole tocca il passo" (caotico T6). Il narratore numera i corni per conto suo ("primo", "quinto", "sesto richiamo") e non coincide con i segni. **Causa (4)**. Contribuisce (1): il corno è solo in alcuni segni (2, 4, 7, 8), mentre il canone dice "a ogni mezz'ora", e il modello si mette a contare.
- **C3, o_lite e o_zio mai mossi (0/6 e 0/4, in tutte e due).** `nar_lite_1` è stato rifiutato due volte (caotico T4, T5) e `nar_zio_1` una (T11), con lo stesso motivo: "un segno di orologio è già uscito in questa risposta". Il tetto di un segno per risposta vale per tutti gli orologi insieme (`stato.ts:299`), e il tramonto, che esce quasi a ogni turno, affama gli altri. Risultato: la festa non si spacca mai, Gunda non ha niente da pacificare, e **il cattivo non agisce mai**. Gaspare non cerca l'anello, non segue i PG e non lo intasca. **Causa (3)**. Contribuisce la regola "mai due segni nella stessa risposta" scritta in campagna (1).
- **C4, `al_completo` non applicato e finale mai giocato.** `fin_tramonto` è stato rifiutato 1 volta nell'indagine (T16) e 5 nel caotico (T13–T17), `nar_chiusura` 5 volte, sempre con lo stesso motivo: "battuta senza «> pg»: ammessa solo per il segno dovuto o allo stallo" (`regia.ts:701`). Un finale non risponde all'azione di nessun PG, quindi non può passare. Il motore non chiude neanche la scena all'ottavo segno, come chiede il `taglio`. Così il caotico gioca tre turni dopo la fine, col narratore che improvvisa "il paese scende dal Sasso senza benedizione" quattro volte, e l'indagine si interrompe a metà. **Causa (3)**.

## D. Battute pre-scritte

- **Usate bene**: `nar_scatolina` (indagine T1), `nar_bastiano` e `nar_impronte` (T2), `nar_libro_pagina` (indagine T12, caotico T15), `nar_custode_regole` (indagine T13), `nar_scrittoio_cassetto` (caotico T10), `nar_libro_spose` dopo il braccio di ferro (caotico T14, il momento migliore di tutte e due le partite), `gas_chi_cera` e `zel_dove_eri` (indagine T5). Quando escono reggono: sono asciutte, concrete e fatte per l'orecchio.
- **Fuori posto, causa (4), selettore**: `gas_campanella` (caotico T10) risponde a una domanda sulla campanella che nessuno ha fatto, e la campanella non è mai stata mostrata. `ett_quel_giorno` (caotico T14) risponde con i muli di sessant'anni fa a una domanda sul vento di stamattina, e prima che si legga la pagina. `ade_da_dove` (indagine T13): Livia chiede un cenno ad Agnese e arriva la bugia di Adelina sull'origine dell'anello. `nar_scatolina` (caotico T3) arriva due turni dopo l'azione di Remo, appesa a una frase sul vento. `gas_dote` (caotico T1) risponde alla richiesta della mezza paga.
- **Fuori posto, causa (1)**: `ett_giacca_appesa` vale per "braccio di ferro **o** ballo", ma il testo ("Vediamo quanto vali. Piano, che ho ottant'anni") va bene solo per il braccio di ferro, e al T2 del caotico esce per una canzone. `nar_scrittoio_cassetto` racconta il contratto ma non la campanella nel fazzoletto, che sta nello stesso cassetto: chi apre il cassetto non la vede, e `nar_campanella` ("un PG guarda la campanella") non può scattare mai.
- **Rifiutate per la forma, causa (3)**. Il narratore dimentica `> pg` dove la battuta era giusta: `nar_polka` per Nando (caotico T2), `nar_giacca_tasca` per Livia e `nar_tonio_tasca` per Ida (indagine T16), `nar_scrittoio_cassetto` (indagine T5). Il motore rifiuta senza riparare e il narratore ha già improvvisato metà della scena: al T5 il cassetto viene aperto col coltello ma il contenuto non si sente mai.
- **Mancate, causa (4)**. `nar_sposa_mima`: indagine T10, Livia chiede ad Agnese "la nonna ha l'anello al dito o nella tasca?", che è il `quando` esatto, ed esce un'improvvisazione (B6). `nar_stalla_entrata`: caotico T9, Gunda entra nella stalla. `nar_tonio_tasca`: indagine T7, Ida chiede a Tonio della lettera in giacca, ed è proprio la battuta col suo `da_pg`. Sono tre indizi preparati, chiesti dai giocatori e non arrivati.

## E. Materiale sprecato, e ciò che i giocatori cercavano

**Mai uscito in nessuna delle due partite** (115 battute):
- tutti e quattro i finali, `nar_chiusura` e i tre racconti di Adelina al Sasso (`ade_sasso_a/b/c`), cioè il climax per cui la campagna esiste;
- l'intera catena di Zelia (confessioni, quaderno, `zel_velo`) e il campanaccio in ogni variante;
- la cassapanca con le lettere, il ferro inciso, le iniziali sul Sasso;
- Tilde, il caldaio, la campanella, la polka, Bastiano scagionato davanti alla sala;
- tutti i cedimenti di Ettore e di Adelina, tutti i segni di lite e zio, tutte le transizioni `tr_*`.

**Tilde non viene mai nominata al tavolo.** Lo stesso vale per il caldaio, la cantina e la porta di dietro (nel caotico). L'apertura della casera, tre frasi per regola, non presenta nessuno degli `elementi_interattivi`, e il narratore non descrive mai la sala. Due dei sei indizi di `r_passo` (Tilde, campanella) sono quindi introvabili per chi non conosce la scheda. **Causa (1)**: l'apertura limitata a tre frasi non ha un "primo sguardo" che metta sul tavolo i punti d'appiglio.

**Lo scivolo del rientro c'era ma non è stato usato.** Il Preparatore aveva scritto `tr_casera` per tornare in casera ("il caldo vi viene incontro…"). Al cambio di scena il motore legge invece l'apertura completa, e per la casera anche il riassunto di sessione, perché `caricatore.ts:181` lo incolla in testa all'apertura della prima scena. **Causa (3)**.

**Cosa cercavano i giocatori e non hanno trovato.**
- Indagine:
  - Livia cerca la soffitta e le lettere (T3, T5, T7, T17).
  - Ida cerca la lettera del nonno attraverso Tonio (T7, T10, T16).
  - Per quattro volte qualcuno chiede un cenno alla sposa (T9, T10, T13, T17), e il mimo preparato non arriva mai.
  - Vanda vuole scagionare Bastiano davanti alla sala (T7, T10, T17).
- Caotico:
  - Nando chiama la "treccia rossa" (T5), che nasce dalla sua conoscenza privata, ma Zelia non è in casera.
  - Gunda nella stalla trova il campanaccio che suona.
  - Remo, ladro, ha la giacca di Ettore appesa alla panca dal T2 e non la tocca mai (5).

## F. Copione delle azioni (5)

- L'indagine rimbalza fra casera e casa: T4 → casa, T6 → casera, T8 → casa, T11 → casera. Il `non_ci_sta` della cronologia ("chi torna avanti e indietro arriva al Sasso a sole calato") si avvera alla lettera.
- **Zero azioni private**, mentre quasi tutti i `cede_se` decisivi sono "in privato": Adelina e Ettore su anello e neve, Zelia con le promesse. Il finale migliore (`ade_sasso_b`) richiede `i_adelina_neve`, che si ottiene solo in privato. Il narratore l'aveva perfino offerto ("A quattr'occhi, figlia mia", indagine T9), ma il copione non l'ha preso.
- Inviti ignorati: "Lo apra pure, se crede" (T9), l'accusa a Zelia (T14), la giacca appesa (caotico T2).

## G. Problemi della fase 1, con la causa

| problema (fase 1) | dove | causa |
|---|---|---|
| "annuncia:", "Ida risolve per prima" detti ad alta voce | indagine T5, T9, T10; caotico T5, T9, T11 | (4) |
| ogni azione detta due volte (annuncio con l'esito, poi la battuta) | ovunque; vedi B7 | (4) |
| apertura riletta al rientro, riassunto di sessione compreso | indagine T6, T8, T11 | (3) |
| risponde il PNG sbagliato (Ettore per Tonio, Adelina per Agnese) | indagine T13 | (4) |
| tic "Parla dall'orecchio buono" in quasi ogni riga di Ettore | indagine T1, T3, T7, T13; caotico T2, T14 | (4) |
| PNG fuori scena | B4 | (3) |
| il narratore decide per i PG | B9 | (4) |
| soffitta chiesta e mai vista | indagine T3 → T4 | (5): il copione cambia scena e non ci torna |
| "il sole tocca il passo" dal T3 | C2 | (4) |
| nessun finale, o finale ripetuto dopo la fine | C4 | (3) |
| impronte contraddittorie, Tonio bianco e rosso | B7 | (4) |
| azioni vecchie rilette e "non ci sono azioni nuove" | caotico T13, ripete le righe del T9 | (4): il modello copia dalla propria storia dopo il cambio di scena |
| azioni attribuite a chi non ha giocato, PG inattivi narrati ("Vanda resta dov'è, con un mulo di pensiero") | caotico T1, T2, T5, T14 | (4) |
| immagini storte ("a un passo dal passo", "la fisarmonica la fanno ridere") | caotico T3, T5, T16 | (4) |
| la cantina non dà niente | caotico T4 | (4): la porta di dietro c'è nella scheda ma il narratore non la presenta |
| battuta di Gaspare sulla campanella fuori contesto | caotico T10 | (4), più (1) per il cassetto che non mostra la campanella |
| la frase di Ettore su "quel giorno" prima della pagina | caotico T14 | (4) |

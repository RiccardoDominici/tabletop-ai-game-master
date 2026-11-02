# Autovalutazione — Il pane dei lumi

Valutazione della scena **come progettata**, supponendo un narratore che segua il prompt. Non c'è ancora una partita giocata: i voti veri li darà il Critico sulla trascrizione (E11). Una revisione indipendente (Opus, sola lettura) ha trovato sette problemi gravi: sono tutti corretti nel commit `24a6dcc`.

## Rubrica (§9)

| Criterio | Voto | Prova |
|---|---|---|
| R1 Agency | 3 | Nessun testo di scena decide per i PG; gli indizi dicono «il narratore descrive, non spiega»; ciò che sa un solo PG va solo sul suo telefono. |
| R2 Conseguenze | 2 | Ci sono reazioni scritte (Ottavia brucia i sacchi, la serratura scatta, Baldrin chiama il paese, l'orologio accelera), ma senza dadi gli esiti negativi dipendono dal narratore. |
| R3 Canone | 3 | Un solo registro di fatti, citato per id da tutte le schede; le contraddizioni trovate dalla revisione sono state tolte. |
| R4 Confini | 2 | Le menzogne hanno segnali fisici e `cede_se` osservabili, e la scena dice chi sente cosa. Però in F0 il narratore vede tutte le verità: niente le protegge, se non il prompt. |
| R5 Voce dei PNG | 3 | Tre registri (tu e nomi di mestiere; tu e lei freddo; lei a tutti), tre lessici (forgia, cucina, medicina), tre lunghezze di frase, desideri in tensione. |
| R6 Prosa | 3 | Tutto il testo da leggere a voce sta sotto le 20 parole per frase; l'inizio di sessione ha una media di 12,7 parole per frase; nessuna espressione vietata. |
| R7 Concretezza | 3 | I tre sensi della scena sono tutti non visivi (odore, canto, caldo e freddo); dettagli precisi (chicchi «come piccole unghie», polvere «di braciere spento»). |
| R8 Restituzione | 2 | L'apertura chiude con un «che fate?» a tutti, voluto perché la prima finestra è di tutti; dopo, il prompt impone inviti per nome. |
| R9 Spotlight | 3 | Ogni PG ha un aggancio legato a un PNG e una conoscenza privata che apre una strada (fuoco nero, nodo delle bende, botola, regola delle castagne). |
| R10 Ritmo | 2 | Posta chiara e orologio udibile che converge sul climax; ma chi apre subito un sacco risolve il «cosa» in due turni, e da lì la tensione regge solo sul «chi paga». |
| R11 Mondo proattivo | 3 | Sei segni in ordine, iniziative dei PNG legate all'orologio, Baldrin che va alla finestra, Ottavia che prova a bruciare le prove. |
| R12 Indizi | 3 | Sette indizi per la conclusione principale, nessuno dietro un tiro, un indizio proattivo pronto (il cane), più strade per ogni collo di bottiglia. |

Media: 2,67.

## Controlli incrociati

Script di bottega nella scratchpad, non nel repo: il validatore vero è compito di F1. Ultimo giro: **0 errori, 0 avvisi**.

- **§3, schede PNG.** Per tutti e tre i PNG:
  - iniziali diverse (O, B, S) e voci diverse (`nadine`, `vincent`, `lucian`, nessuna è `narratore`);
  - `aspetto.lettura` al massimo 2 frasi e 35 parole;
  - `prompt_immagine` con `[STILE]`;
  - personalità con 3 tratti di superficie e 2 sotto pressione, diversi;
  - `registro` con tu, voi o lei; 1 tic; `battuta_campione` al massimo 2 frasi;
  - `sa` (15–20 voci) e `non_sa` (6) disgiunti, tutti nel canone;
  - ogni `mente_su.verita` sta in `sa`;
  - ogni `crede_a_torto` contraddice un fatto che il PNG non sa;
  - `atteggiamento_pg` per tutti e 4 i PG;
  - `info_chiave` esistenti, `evoluzione` in forma se/allora;
  - segnale diverso dal gesto abituale.
- **§4, scheda scena.**
  - scopo dall'elenco e domanda drammatica da sì o no;
  - posta su PNG e PG, intensità 4;
  - esattamente 3 sensi e 9 elementi interattivi;
  - riferimenti a PNG e orologi esistenti;
  - indizio essenziale senza tiro;
  - 2 uscite, ciascuna con 3 indizi esistenti;
  - musica dal vocabolario chiuso, anche nella transizione;
  - apertura di 3 frasi che chiude con un invito.
- **C2–C8.**
  - Presagi: 3 nel fronte di campagna (3–5) e 3 in quello d'avventura (1–3).
  - Ogni fronte ha 2 pericoli, ognuno con un impulso di un verbo solo e un orologio da 4 o 6 segmenti, con un segno per segmento.
  - Domande di posta: da 1 a 3 per fronte.
  - Regola dei tre indizi: r_pane 7 indizi, 4 nodi, 5 tipi; r_innocente 5, 4, 3; r_gualtiero 4, 3, 3; r_cerusico, che non è chiave, 3, 2, 2.
  - Colli di bottiglia: 3, con 4 soluzioni ciascuno.
  - Grafo: 7 nodi tutti raggiungibili, nessun vicolo cieco; Valsecca è segnata come prossima sessione.
  - Cattivo completo; 10 segreti astratti; archi di Harmon per tutti i PG.
  - Tutti i 43 id di fatto citati esistono nel canone, e ogni fatto è usato.
- **Prompt.** Ogni campo che il prompt nomina esiste nei file della campagna.
- **Controllati a mano.** I tre sensi sono tutti non visivi. I desideri sono in tensione: Ottavia contro Sebastiano, Baldrin contro Sebastiano, Sebastiano contro Corrado. L'italiano da leggere a voce è stato riletto dopo le correzioni della revisione.

## I tre rischi più grandi con un modello piccolo e veloce

1. **Fughe di verità.** In F0 Haiku riceve tutto il canone, compresa la causa della febbre. Sebastiano la conosce e la può dire, e questo è previsto. Il rischio è che la dica il narratore («il pane avvelenato»), o che Ottavia confessi prima del `cede_se`.
   - Contromisure attuali: la regola di prosa che vieta al narratore di chiamare veleno il pane, e i `cede_se` legati a fatti visibili nella trascrizione.
   - Contromisura vera: E2 ed E6 in F1.
2. **Orologio alla deriva.** Haiku deve capire dalla trascrizione qual è l'ultimo segno mostrato. Può saltarne uno, ripeterlo o arrivare al climax troppo presto.
   - Contromisure: un segno è una frase sola, da ripetere quasi uguale, e il ritmo è «una risposta sì e una no».
   - Molto meglio se il server tiene il conto e passa «prossimo segno: N».
3. **Risposte lunghe, in terza persona, con dettagli inventati.** Con quattro azioni nella stessa finestra, il segnale di chi mente, il segno dell'orologio e l'invito, lo spazio di quattro frasi non basta. Ieri la media era di 19 parole per frase. Haiku tenderà anche a inventare compaesani, pettegolezzi e PG assenti.
   - Contromisure: l'ordine di priorità nel prompt, il filtro E4 per le frasi lunghe, e un elenco `pg_presenti` nel contesto.

## Note per chi monta F0

- `pronuncia` non arriva al TTS. «Baldrin» rischia di diventare «Baldrìn». Se il servizio voce lo permette, conviene sostituire i nomi con la grafia accentata prima della sintesi.
- La dimensione del prompt del narratore è stimata a mano tra 2.000 e 2.300 token, perché qui non c'è un tokenizer locale. Va misurata con il conteggio dei token dell'SDK prima di decidere se accorciarlo ancora.

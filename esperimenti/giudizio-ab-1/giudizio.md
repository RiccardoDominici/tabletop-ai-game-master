# Giudizio cieco A/B: narratore del Master IA, campagna «prova-f0»

## Metodo e avvertenze

- **Fonti lette**: le quattro trascrizioni in `cieco/`, il manuale (`docs/manuale-master.md`), e in `campagne/prova-f0/` i file `stile.yaml`, `campagna.yaml`, `scena.yaml`, `pg.yaml` e le tre schede PNG. Non ho aperto nient'altro.
- **Turno 0**: è il testo fisso della scena, identico nelle due versioni. Non entra nei punteggi né nelle statistiche.
- **Rubrica**: è quella del manuale, §9, e la regola è severa: un 3 richiede una prova positiva citata, e nel dubbio ho dato il punteggio più basso. Uno 0 su R1 o su R4 è una violazione critica.
- **Conteggi**:
  - una **fuga** è un fatto con `noto_ai_pg: false`, o la verità di una menzogna, detto o fatto intuire prima che la finzione lo sblocchi (come_si_trova, cede_se, o un PNG che lo sa e sceglie di dirlo);
  - nel **canone inventato** conto solo le contraddizioni e i fatti nuovi importanti, e i casi minori li elenco a parte;
  - un'**azione ignorata** è un'azione dichiarata che non viene risolta nel suo turno. Le risoluzioni parziali sono elencate ma non contate.
- **Casi limite**: quelli dubbi (per esempio un PNG che dice un proprio `sa` senza che nessuno glielo chieda) li elenco come «al limite» e li conto tra le cuciture, non tra le fughe.
- **Etichette X/Y**: sono assegnate in modo indipendente per ciascun copione. Perciò la somma «X totale» o «Y totale» non ha un significato certo: nella §6 do i valori per trascrizione, e le somme per lettera solo per completezza.
- **Statistiche di prosa**: le ha calcolate lo script `giudizio/conta.py`, solo sulle righe `[narratore]` dei turni 1–8. Le frasi finiscono a `.` `!` `?`. «all'osteria» vale una parola. Le battute dei PNG incastrate tra virgolette in una riga del narratore sono contate come narratore, perché il TTS le leggerebbe con la sua voce.

---

## 1. indagine-X  (PG: Ginestra, Assenzio, Teodora)

### Rubrica

| Crit. | Punti | Evidenza (turno, citazione) | Correzione in una frase |
|---|---|---|---|
| R1 Agency | **0** | T6 «Il sacco si apre con un soffio di polvere grigia»: Assenzio aveva solo chiesto il nome a Baldrin. T8 «Assenzio, la botola cede piano sotto le dita»: Assenzio aveva detto di restare accanto a Ottavia. T6 «La carrucola cigola… Ha soltanto il sapore della pietra»: Ginestra stava facendo una domanda a Ottavia, e il narratore le fa tirare su il secchio e assaggiare l'acqua. T1 «Assenzio stringe Ottavia», in terza persona. | Risolvi solo l'azione scritta dal giocatore, in seconda persona, e nient'altro. |
| R2 Conseguenze | **1** | T4: Ginestra spezza una pagnotta del pane dei lumi e nessuno reagisce, eppure l'iniziativa di Ottavia è chiamarla al paiolo. T8: «quel pane non mangiatelo», detto da Ginestra a tutti, non ha nessun effetto. L'unica reazione concreta è a T4: «Baldrin tira la borsa sotto la panca, col tallone». | Ogni gesto pubblico sul pane deve attivare l'iniziativa o l'evoluzione scritta del PNG. |
| R3 Canone | **0** | T2 «sono sei, tutti dalla stessa parte del paese»: il canone dice nove malati, e l'apertura lo ha appena detto. T7 «sul pontile le barche tirano le corde nel freddo»: in un paese di montagna non ci sono né pontile né barche. T5 «nella stalla il cane di sotto»: Moro è accucciato vicino al forno, in sala. | Numeri e luoghi si prendono solo dal canone; niente materiale estraneo alla campagna. |
| R4 Confini | **0** | T7 «C'è scritto: sei sacchi di segale da Gualtiero, a metà prezzo, metà da pagare a primavera»: nessuno ha aperto il quaderno, e la riga arriva subito dopo la richiesta meta «leggimi le tue note». T6 «L'acqua è limpida e gelata»: nessun PG è al pozzo. T6 Baldrin «Non vi serve scendere in cantina»: è alla finestra, non sa della botola, e Assenzio è sceso senza farsi vedere. T3: il segnale del fazzoletto appare quando Ottavia non ha detto nessuna menzogna. | Un indizio esce solo se in quel turno la sua condizione `come_si_trova` è soddisfatta. |
| R5 Voce PNG | **1** | Baldrin è riconoscibile: T2 «Lì dentro c'è quello. Il forestiero.», T4 «Tu no, ragazzo. Tu le mani in tasca.». Però a T5 «Non è affar mio. Io batto ferro.» non risponde a una richiesta che è proprio affar suo, e a T7 «Bevo al pozzo da trent'anni» smonta da solo la sua accusa. Ottavia, la bugiarda principale, non ha mai una battuta sua: solo un discorso indiretto a T2. Sebastiano non parla mai. | Ogni PNG interpellato risponde con la sua voce e insegue il suo desiderio. |
| R6 Prosa | **2** | Frasi brevi (media 9,3 parole, nessuna oltre 20), ma tutti gli 8 blocchi superano le 4 frasi, e T5 arriva a 14 frasi e 161 parole. Ci sono righe senza senso: T5 «Ora la febbre si sente anche qui: il secondo colpo arriva alle imposte.», T5 «il cane di sotto». | Al massimo 4 frasi per blocco, e ogni frase deve avere un senso letterale. |
| R7 Concretezza | **2** | Dettagli buoni: T4 «La crosta cede con uno scrocchio. Dentro, la mollica è ancora tiepida.», T5 «un buio che sa di terra, di mele e di vino acido», T8 «La chiave gli batte sul petto quando respira.». Però c'è il dire al posto del mostrare (T3 «come fosse un segno»), e lo sguardo di Baldrin torna come riempitivo («ti guarda fermo», «ti guarda senza mollare la porta»). | Togli le formule di sguardo e le spiegazioni, e tieni il dettaglio sensoriale. |
| R8 Restituzione | **1** | Mancano le chiusure a T5, T6 e T8 (T8 finisce con «Sembra pronto a rispondere.»). T5 è un monologo di 14 frasi. T7 chiude su un luogo inesistente («sul pontile…Che fai?»). «Che fai?» torna quattro volte. | Chiudi ogni blocco con un invito mirato e vario, al punto di reazione. |
| R9 Spotlight | **1** | Le azioni di Teodora vengono ignorate a T3 (la preghiera), T6 (il libro del rito) e T8 (la domanda sul tempo), quindi il suo aggancio, il rito, non ha mai spazio. Le chiusure vanno tre volte ad Assenzio (T3, T4, T7). L'aggancio di Ginestra, la nonna, cade nel vuoto a T8. | Risolvi per primo il PG chiamato meno di recente, e usa i suoi agganci. |
| R10 Ritmo | **1** | Dopo il secondo segno (T5) l'orologio resta fermo per tre risposte, e il terzo rintocco non si avvicina mai. Da T6 a T8 il gioco si trascina su azioni risolte male. | Un segno ogni due risposte, e taglia gli scambi a vuoto. |
| R11 Mondo | **1** | Ci sono solo due segni in otto turni (T2 «il canto della veglia si interrompe», T5 «Un sasso batte su un'imposta»), poi più niente. Ottavia non usa nessuna delle sue iniziative: non chiama al paiolo, non tenta di bruciare i sacchi. | Mostra il segno successivo quando tocca, e fai agire i PNG secondo le loro iniziative. |
| R12 Indizi | **2** | Escono molti indizi (T4 gli speroni, T5 il marchio Valsecca e la parola del cane, T6 il pozzo, T7 il quaderno e Baldrin sano), ma senza legame con le azioni. Le mosse più intelligenti restano senza premio: la preghiera (T3), il libro del rito (T6), la domanda sulla segale (T6), la visita a Sebastiano (T7). Intanto gli indizi arrivano a chi non li cerca. | Lega ogni indizio all'azione che lo sblocca. |
| **Totale** | **12/36** | media 1,00; violazioni critiche su R1 e R4 | |

### Conteggi

**a. Fughe: 2**
- T6: «L'acqua è limpida e gelata. Ha soltanto il sapore della pietra.» È `i_pozzo_acqua` (f_pozzo_pulito), ma nessun PG ha tirato su il secchio.
- T7: «sei sacchi di segale da Gualtiero, a metà prezzo, metà da pagare a primavera». È `i_registro_conti` (f_segale_gualtiero), ma nessuno ha sfogliato il quaderno.
- Al limite, non contato: T7, Baldrin dice «Bevo al pozzo da trent'anni… Il pane di segale non lo tocco» senza che nessuno glielo chieda, e contro il suo interesse.

**b. Canone inventato: 4**
- T2: «sono sei» malati, mentre il canone e l'apertura dicono nove.
- T2: «tutti dalla stessa parte del paese», un fatto nuovo che fa pensare a una causa locale.
- T5: Moro «nella stalla», mentre la scena lo vuole accanto al forno.
- T7: «sul pontile le barche», un luogo che non esiste.
- Minori, non contati: T2 «qualcuno ha sentito la voce del forestiero» (lui non ha ancora parlato); T5 «una voce di ragazzo grida corvo»; T7 «Roba da umani».

**c. Agency: 4**
- T1: «Assenzio stringe Ottavia», in terza persona.
- T6: il narratore fa aprire un sacco ad Assenzio.
- T6: il narratore porta Ginestra al pozzo e le fa assaggiare l'acqua.
- T8: il narratore fa aprire la botola ad Assenzio, e aggiunge «due occhi vi guardano».

**d. Battute riferite dal narratore: 1**
- T2: «Ottavia ti risponde a mezza voce…: sono sei…».
- Più grave del numero: Ottavia e Sebastiano non hanno nemmeno una battuta propria in tutta la trascrizione.

**e. Menzogne senza segnale: 0**
- Nessun PNG mente. Il problema è l'opposto: a T3 il segnale compare senza una menzogna.

**f. Azioni ignorate o non risolte: 11**
- T1: le due domande di Assenzio a Ottavia.
- T3: la domanda di Ginestra («bruciano le mani?») e la preghiera di Teodora sul pane.
- T6:
  - il libro del rito di Teodora;
  - la domanda di Ginestra sulla segale;
  - la domanda di Assenzio sul nome di Baldrin (arriva a metà a T8, senza il nome).
- T7: la visita di Ginestra a Sebastiano; la grata sotto il portico di Assenzio, al cui posto arriva il pontile.
- T8:
  - la domanda di Teodora sul tempo;
  - l'avvertimento pubblico di Ginestra;
  - la domanda sottovoce di Assenzio a Ottavia.
- Parziali, non contati: T2 Ginestra (né «da quando» né «cosa sentono»); T2 Teodora (nessuna risposta su chi ha deciso di chiuderlo); T5 Teodora (un rifiuto vago).

**g. Domande meta gestite male: 1 su 2**
- T4, «master chi è il colpevole?»: gestita bene, nella finzione, con Baldrin «Tu no, ragazzo. Tu le mani in tasca.».
- T7, «master leggimi le tue note»: nessuna deviazione nella finzione, e nello stesso turno viene letto il quaderno di Gualtiero che nessuno ha aperto.

**h. Ripetizioni: 9**
- T3 ripete l'immagine del cane di T1: trema, si lecca le zampe, croste di pane nero.
- T3 ripete l'informazione che Baldrin ha dato a T2 («quello del pozzo… Al rintocco»).
- T2 «ti guarda da sotto le sopracciglia» ripete T1 «ti squadra da sotto le sopracciglia».
- T5 mette in fila due colpi alle imposte.
- T6 ripete parola per parola T5: «Assenzio, sotto la tenda il retro è buio e odora di farina.»
- T6 ripete «chicchi neri e curvi, come piccole unghie» di T4, senza nessuna informazione nuova.
- T6 ripete parola per parola T5: «Teodora, il nano ti guarda senza mollare la porta.»
- T8 «l'odore di terra e di mele» ripete T5.
- La chiusura «Che fai?» torna 4 volte (T2, T3, T4, T7).

**i. Cuciture: 9**
- T1: la mossa morbida del cane apre il turno, mentre tutti i PG stanno agendo.
- T2: la voce del forestiero, che non ha ancora parlato, e il colpo alle imposte subito dopo il primo segno.
- T3: una battuta di Baldrin e il cane, senza legame con nessuna azione.
- T5: il cane è nella stalla, e la riga «la febbre si sente anche qui» non ha senso.
- T6: Ginestra passa dalla stalla al pozzo mentre sta parlando con Ottavia.
- T6: Baldrin sa della cantina.
- T7: il quaderno viene letto da nessuno, e Baldrin parla del pozzo senza che nessuno glielo chieda.
- T7: il pontile.
- T8: la botola la apre chi è accanto a Ottavia; Baldrin è «dalla panca» senza essere tornato dalla finestra; la risposta alla domanda di T6 arriva a T8.

### Prosa per l'orecchio (conta.py)
- **Frasi**: 59 frasi del narratore; media 9,3 parole, mediana 9,0, massimo 17.
- **Frasi lunghe**: oltre 16 parole il 3,4%, oltre 20 lo 0%.
- **Blocchi**: tutti gli 8 superano le 4 frasi (N2), 4 su 8 superano le 60 parole, e T5 ha 14 frasi e 161 parole.
- **Chiusure con domanda**: 5 su 8.
- **Seconda persona**: 27 casi (15 vocativi e 12 pronomi o possessivi). **Terza persona**: 1 (T1 «Assenzio stringe Ottavia»).

### Verdetto
I primi quattro turni sono discreti: buoni dettagli, Baldrin ben scritto, gli speroni consegnati correttamente a T4. Poi però al secondo turno sbaglia il numero dei malati. Da T5 il narratore perde il filo:
- risolve azioni che nessuno ha dichiarato, e ignora quelle dichiarate (11);
- fa uscire indizi senza nessun innesco (il pozzo, il quaderno);
- porta i PG dove non sono (la botola, il pozzo);
- inventa un pontile con le barche.

Ottavia e Sebastiano restano muti per tutta la scena. Il ritmo delle frasi è il migliore del lotto, ma i blocchi sono monologhi. È la trascrizione più debole.

---

## 2. indagine-Y  (PG: Ginestra, Assenzio, Teodora)

### Rubrica

| Crit. | Punti | Evidenza | Correzione |
|---|---|---|---|
| R1 Agency | **1** | T7 «Ginestra, tocchi la fronte del forestiero attraverso la grata»: il giocatore voleva guardargli mani e gola, il gesto lo decide il narratore. T2 «Teodora, il nano ha sentito. Le parla senza alzare la voce»: terza persona mentre le si rivolge la parola. Al limite: a T4, in un turno senza azioni di Teodora, la sua preghiera «si spezza a metà». Esempio positivo: T5 «tu ti muovi senza un rumore» rispetta il «senza farmi vedere» del giocatore. | Descrivi ciò che il PG percepisce, non un gesto che non ha dichiarato. |
| R2 Conseguenze | **2** | T4: la pagnotta spezzata fa reagire Ottavia, «Mettete giù quel pane, figliola. È solo segale. Il setaccio l'ha pulita.». T8: all'avvertimento di Ginestra, «Ottavia stringe il lino fino a farsi bianche le nocche» e Baldrin risponde «Il pane dei lumi non si butta.». Le conseguenze sono concrete ma prevedibili: nessuna mossa dura, e Ottavia non tenta di bruciare i sacchi. | Quando il pane viene accusato in pubblico, usa l'evoluzione scritta del PNG. |
| R3 Canone | **1** | T5 «arriva il secondo rintocco», mentre il canone prevede un rintocco a metà veglia e tre alla fine. T7: Sebastiano ha la febbre e «due gonfiori duri», e dice «il pane della segale ha già fatto il suo lavoro su di me, si vede dalle mani», contro la scheda («le mani pulite, e non tremano»). T6 «Il mulino del paese chiude d'autunno» non è nel canone. In compenso a T2 i nove malati e i loro nomi sono esatti. | La campana suona solo come dice il canone, e l'aspetto dei PNG non cambia. |
| R4 Confini | **0** | T6: a una semplice domanda di Ginestra, Ottavia risponde «Dalla segale di Valsecca, da quattro giorni.» e poi «Valsecca, sì. Gualtiero la portava a metà prezzo.». La sua menzogna su questo argomento («la segale di sempre») non viene mai detta; il cede_se non è soddisfatto (un chicco in mano, lontano da Baldrin, oppure l'appello di Assenzio); e il nome di Gualtiero è in `mai_dice`. Esempio positivo: il fazzoletto si mostra senza spiegarlo (T3, T4, T8). | La versione della menzogna e il cede_se devono essere vincoli duri nella chiamata del PNG. |
| R5 Voce PNG | **1** | Ottavia è riconoscibile (T2 «Non dormono, figliola, e chiedono acqua»), ma il registro le salta: T4 «Mettete giù… figliola», e a T8 dice «figliola» ad Assenzio, che è un uomo. Baldrin dà del voi (T5 «ci parlerete», T8 «se vi serve»), fa domande (T2) e parla di sé in terza persona (T6 «Si chiama Baldrin»). Sebastiano dà del voi («Non siate avventati»), mentre la scheda vuole sempre il lei. | Passa a ogni battuta il registro del PNG e il genere di chi ascolta. |
| R6 Prosa | **2** | Media 12,5 parole, una sola frase oltre 20 (T6, 23 parole), ma un quarto delle frasi supera le 16. Ci sono errori: T3 «che sente solo tu», T4 «un crack secco», T2 «Le parla». | Rileggi la grammatica, e tieni le frasi sotto le 14 parole. |
| R7 Concretezza | **2** | Dettagli buoni: T3 «come carboni coperti di cenere», T6 «pagine macchiate di cera», T7 «la ruggine ha mangiato il cardine», T3 «un freddo in bocca, un odore sottile di marcio». Ma anche formule: T8 «farsi bianche le nocche», T5 «umida e fredda», T5 «sembra che abbia visto qualcuno passare dal retro». | Un dettaglio preciso per blocco, niente formule fatte. |
| R8 Restituzione | **1** | Nessun blocco su otto si chiude con una domanda o un invito (T3 finisce con «La porta del ripostiglio tossisce.», T8 con la battuta di Baldrin). 7 blocchi su 8 superano le 4 frasi. | L'ultimo segmento deve essere sempre un invito al PG scelto. |
| R9 Spotlight | **3** | Ogni PG viene chiamato per nome in ogni turno, e ognuno ha un momento sul proprio aggancio: Teodora con la preghiera (T3, «Nel pane c'è un freddo in bocca…») e con la riga delle castagne (T6); Assenzio con il fazzoletto di Ottavia (T3, T4, T8); Ginestra con i chicchi (T4) e con l'avvertimento sulla nonna, che fa reagire Ottavia e Baldrin (T8). | Da mantenere. |
| R10 Ritmo | **2** | Il ritmo è buono, e ogni turno fa avanzare qualcosa. La posta di tempo però è confusa: T3 «un rintocco secco», T5 «il secondo rintocco», T8 «il terzo rintocco è ancora lontano». | Segni dell'orologio in ordine, così che il tempo che stringe si legga. |
| R11 Mondo | **2** | Segni quasi a ogni turno (T2 il canto, T3 il rintocco, T4 il sasso, T6 «due lanterne si fermano accanto al pozzo», T7 il sasso), e PNG che reagiscono (T2 Ottavia torna al paiolo, T8 Baldrin parla dalla finestra). Però i segni sono fuori ordine, uno si ripete (T7), e non corrispondono ai tick: tre tag [orologio] contro cinque segni. | Un segno solo, nell'ordine scritto, legato al tick. |
| R12 Indizi | **3** | Il ragionamento dei giocatori è premiato: T3 la preghiera dà `i_preghiera_pane`; T4 la pagnotta spezzata dà gli speroni; T6 il libro del rito dà le castagne; T7 la visita porta Sebastiano a dire che è il pane. Le piste aperte sono tre: il pane, Valsecca, le castagne. Ma vedi R4: la pista di Gualtiero è regalata. | Le piste-chiave devono costare quanto previsto. |
| **Totale** | **20/36** | media 1,67; violazione critica su R4 | |

### Conteggi

**a. Fughe: 1**
- T6: la verità sulla segale (Valsecca, Gualtiero, metà prezzo) arriva prima del cede_se, e con un nome vietato da `mai_dice`. È la fuga più dannosa del lotto: regala la conclusione `r_gualtiero`.
- Nota su T9, non contata: a T6 il narratore legge ad alta voce la riga delle castagne, che è una conoscenza privata di Teodora. Teodora ha aperto il libro apposta, quindi l'azione la sblocca. Però il manuale lascia al giocatore la decisione di condividerla: bastava dire «la riga che ricordi è lì».

**b. Canone inventato: 3**
- T5: il «secondo rintocco».
- T6: «Il mulino del paese chiude d'autunno». È una menzogna improvvisata fuori scheda, che contraddice f_segale_di_sempre.
- T7: Sebastiano malato, con la febbre e i gonfiori.
- Minori, non contati: T3 Tecla «fa fatica a respirare»; T5 le capre che hanno visto «qualcuno passare dal retro»; T6 «il martello è di mio padre».

**c. Agency: 2**
- T2: «Le parla», terza persona.
- T7: «tocchi la fronte… attraverso la grata».
- Al limite, non contato: T4, la preghiera di Teodora «si spezza a metà» senza una sua azione.

**d. Battute riferite o incastrate nel narratore: 8**
- Discorso indiretto di Ottavia: T1 «ti sussurra che il ripostiglio…»; T2 «Dice che i malati sono nove…»; T3 «dice Ottavia, come carboni…».
- Battute di Baldrin dentro la riga del narratore: T1 «Chierica, la chiave resta…»; T2 «Sorella, chi è dentro…»; T5 «Il forestiero dorme…»; T6 «Si chiama Baldrin…».
- Battuta di Ottavia dentro la riga del narratore: T6 «Dalla segale di Valsecca…».

**e. Menzogne senza segnale: 1**
- T6, «Il mulino del paese chiude d'autunno»: il segnale è solo parziale («sistema il lino sulle ceste e risponde in fretta»), senza il fazzoletto.

**f. Azioni ignorate: 1**
- T2: Teodora chiede chi c'è dentro e chi l'ha chiuso, e Baldrin risponde con un indovinello.
- Parziali, non contate: T1 Assenzio («che succede stanotte» resta senza risposta); T5 Ginestra (le capre danno un'impressione vaga, non una conversazione).

**g. Domande meta gestite male: 0 su 2**
- T4, «chi è il colpevole?»: la risposta resta nella finzione, con Ottavia che si gira e il fazzoletto. È legata alla pagnotta spezzata, anche se di fatto indica Ottavia.
- T7, «leggimi le tue note»: deviata nella finzione («il tuo nome detto a voce alta fa girare la testa di Ottavia»). È goffa ma non rivela niente.

**h. Ripetizioni: 2**
- T2: «dove il canto si spezza», seguito subito da «il canto della veglia si interrompe».
- T7: «Un sasso batte forte sull'imposta. Baldrin si alza e va alla finestra», che ripete T4.
- Il fazzoletto che scivola (T3, T4, T8) torna con uno scopo, perché va in crescendo, e non lo conto.

**i. Cuciture: 8**
- T2: «Le parla», e la domanda-indovinello di Baldrin.
- T3: il rintocco (segno 3) arriva prima del sasso (segno 2), che compare a T4.
- T4: «Dietro il vetro si vede Baldrin», ma lui è nella stessa sala.
- T5 «secondo rintocco» contro T8 «il terzo… è ancora lontano».
- T6: Assenzio, che è in cantina, parla con Baldrin senza nessun raccordo.
- T7: «il tuo nome detto a voce alta», ma nessuno l'ha detto.
- T8: Ottavia dice «non ho niente da dire» dopo aver confessato a T6.
- T8: la voce di Baldrin «arriva dritta dalla piazza», mentre lui è in sala alla finestra, dove per la scena non sente.

### Prosa per l'orecchio
- **Frasi**: 49 frasi del narratore; media 12,5 parole, mediana 14,0, massimo 23.
- **Frasi lunghe**: oltre 16 parole il 26,5%, oltre 20 il 2,0%.
- **Blocchi**: 7 su 8 superano le 4 frasi, 6 su 8 superano le 60 parole.
- **Chiusure con domanda**: 0 su 8.
- **Seconda persona**: 35 casi (23 vocativi e 12 pronomi o possessivi). **Terza persona**: 1, cioè T2 «Le parla», contato a mano perché lo script cerca solo nomi e ruoli.
- Cinque righe del narratore contengono battute di PNG tra virgolette, e questo gonfia la lunghezza delle frasi.

### Verdetto
È il narratore che ascolta meglio: risolve quasi tutte le azioni nel loro turno (1 sola ignorata), e premia le idee dei giocatori (la preghiera, la pagnotta, il libro del rito). Ogni PG ha il suo momento. I difetti però sono seri:
- una fuga grave, con Ottavia che consegna Gualtiero e il prezzo dimezzato a una domanda banale, infrangendo menzogna, cede_se e mai_dice;
- nessuna chiusura con un invito;
- otto battute di PNG infilate nella voce del narratore;
- un Sebastiano malato che contraddice la scheda;
- campane fuori ordine.

È nettamente la migliore delle due indagini, ma con R4 a 0.

---

## 3. pressione-X  (PG: Corrado, Assenzio, Teodora)

### Rubrica

| Crit. | Punti | Evidenza | Correzione |
|---|---|---|---|
| R1 Agency | **0** | T1 «Teodora, dalla lanterna sulla cintura si sente il tintinnio di un passo che si avvicina alla grata»: Teodora non ha azioni, e il narratore la muove. T2 «la lanterna sulla cintura oscilla mentre la chierica si avvicina alla grata»: Teodora aveva detto di parlare a Ottavia, e in più è in terza persona. T8 «Teodora, sul tavolo la tua voce si spezza a metà»: il narratore decide la sua voce e il suo fallimento. | Se un PG non ha azioni, descrivi il mondo intorno a lui, non lui. |
| R2 Conseguenze | **2** | T3: la serratura «scatta forte», e Baldrin dice «Un altro passo e chiamo il paese». T7: la porta «cede di colpo: il legno si spacca», e Baldrin risponde «ti spacco la testa in due». T5: la cesta rovesciata provoca «Lasciate stare il pane». Concrete, ma senza le mosse dure della scheda: Baldrin non chiama il paese, Ottavia accusata in pubblico non tenta di bruciare i sacchi. | Applica le evoluzioni scritte: minaccia → chiama il paese; accusa pubblica → brucia i sacchi. |
| R3 Canone | **1** | T6 «il vecchio dietro il bancone ti guarda storto»: un oste inventato, mentre il bancone è di Ottavia. T7: la preghiera fa «comparire» chicchi neri sopra il pane, mentre l'indizio prevede freddo in bocca e odore di marcio. T8 «Sebastiano non si vede più», senza nessuna uscita che lui conosca. T1: Baldrin chiama Sebastiano «un ladro», ma l'accusa riguarda il pozzo. | Niente persone nuove, e gli indizi nella forma scritta. |
| R4 Confini | **0** | T4: il narratore esce dalla finzione e dice dove sta la soluzione: «dire se è colpevole non posso ancora: lo sa solo chi ha guardato nel retro, e nessuno l'ha fatto». T3: Sebastiano concede cicatrice e identità a un soldato che glielo urla davanti a tutti, senza promessa (cede_se) e contro la sua paura: «Il sopracciglio è questo, soldato. Ma tu non sei venuto per curarlo.». | Rispondi alle domande meta solo nella finzione, e fai cedere i PNG solo alle condizioni scritte. |
| R5 Voce PNG | **2** | Esempi buoni: Ottavia, T1 «Figliolo, non urlare nella mia sala.»; Baldrin, T2 «Punta quella balestra da un'altra parte, soldato. Qui si fa come dico io.», e T4 il gesto lento sotto pressione; Sebastiano, T2 «Sorella, mi versi dell'acqua. Solo questo.» (dà del lei e chiede l'acqua, come la sua iniziativa). Però a T3 Sebastiano dà del tu («tu non sei venuto»); a T1 e T8 Baldrin parla a frasi lunghe, fuori stile; e a T4 «Non la insegno a un tiefling» non si capisce. | Tieni le frasi di Baldrin tra 2 e 6 parole, e Sebastiano sempre al lei. |
| R6 Prosa | **1** | Sei frasi oltre 20 parole (il 14%), fino a 25 (T7). Frasi contorte: T1 «si sente il tintinnio di un passo che si avvicina», T7 «la lanterna del tuo pensiero si accende». Poi T5 «ottavia» scritto in minuscolo, e T4 «Non la insegno a un tiefling». | Spezza le frasi a 20 parole, una sola idea per frase. |
| R7 Concretezza | **2** | Dettagli buoni: T2 «alza il martello di un dito», T4 «l'ombra della sua barba gli copre gli occhi», T6 «un filo di lanterna». Ma anche prosa viola (T7 «la lanterna del tuo pensiero») ed emozioni dette (T5 «impallidisce», T2 «voce bassa e tesa», T8 «risata amara»). I sensi sono quasi solo vista e udito. | Mostra la causa dell'emozione, niente metafore astratte. |
| R8 Restituzione | **1** | Solo T2 chiude con una domanda («Che fai?»). Gli altri blocchi finiscono su descrizioni (T4 «e guarda la piazza», T8 «Sebastiano non si vede più»). | L'ultimo segmento deve essere un invito al PG scelto. |
| R9 Spotlight | **2** | Tutti sono chiamati per nome a ogni turno. Corrado ha la taglia (T3) e la porta (T7), Assenzio la casa e Ottavia (T4, T5, T8), Teodora la preghiera (T7) e il tavolo (T8). Però i momenti di Teodora li decide il narratore (vedi R1), e la sua domanda di T2 resta senza risposta. | Dai a Teodora un momento che scelga lei. |
| R10 Ritmo | **2** | La tensione sale fino alla folla sulla soglia (T8 «il primo uomo del paese si ferma sulla soglia, con la lanterna alta»), e la posta è chiara. Ma la curva sale soltanto; un segno si ripete (T3) e due finiscono nello stesso turno (T5). | Un segno per turno, e un momento di respiro prima del climax. |
| R11 Mondo | **2** | I segni sono visibili quasi a ogni turno, e Baldrin reagisce (T5 «Baldrin infila la chiave nella serratura, poi la toglie», T4 va alla finestra). Però i segni sono fuori ordine: a T5 i passi sotto il portico vengono prima delle lanterne di T6, T3 ripete il primo segno, T5 ne mette due. | Segni nell'ordine dell'orologio, mai due nella stessa risposta. |
| R12 Indizi | **2** | La preghiera è premiata (T7), e il trucco della cesta di Corrado ottiene una reazione (T5). Però la discesa di Assenzio nel retro e in cantina (T6, T7) gli fa passare accanto ai sacchi senza mostrargli il marchio o i chicchi, e l'unico indizio su Sebastiano esce da una concessione indebita (T3). | Chi passa nel retro vede i sacchi. |
| **Totale** | **17/36** | media 1,42; violazioni critiche su R1 e R4 | |

### Conteggi

**a. Fughe: 2**
- T3: Sebastiano concede sopracciglio e identità senza che il cede_se sia soddisfatto.
- T4: il master suggerisce dove sta la soluzione («lo sa solo chi ha guardato nel retro»).

**b. Canone inventato: 3**
- T6: «il vecchio dietro il bancone».
- T7: la visione dei chicchi «sopra il pane», che contraddice `i_preghiera_pane`.
- T8: «Sebastiano non si vede più».
- Minori, non contati: T1 «un ladro»; T5 «la folla fuori sente la tua accusa», quando il paese è ancora in cappella.

**c. Agency: 3**
- T1: Teodora mossa verso la grata.
- T2: Teodora di nuovo mossa verso la grata, e in terza persona («la chierica»).
- T8: «la tua voce si spezza».

**d. Battute riferite: 2**
- T6: le condizioni di credito del vecchio, che è una comparsa inventata.
- T7: la battuta di Ottavia dentro la riga del narratore («Il setaccio basta, figliolo…»).

**e. Menzogne senza segnale: 0**
- Nessuna menzogna in scena. A T2 compare il segnale di Ottavia senza menzogna.

**f. Azioni ignorate: 1**
- T2: la domanda di Teodora a Ottavia.
- Parziali, non contati: T6 Teodora (Ottavia trema e tace); T8 Corrado.

**g. Domande meta gestite male: 1 su 2**
- T4: rompe la finzione e dà un indizio.
- T7, «fammi tirare intuizione»: nessuna rivelazione e nessuna rottura. Ottavia sussurra la sua credenza falsa, ed è accettabile.

**h. Ripetizioni: 4**
- T3 ripete il primo segno di T2.
- T7 «passi che si fermano» ripete T5.
- La lanterna di Teodora che va verso la grata, a T1 e T2.
- Ottavia «ti afferra il braccio», a T5 e T7.

**i. Cuciture: 6**
- T2: «senza dire niente», e subito dopo «la voce di Ottavia è bassa e tesa».
- T5: la folla «fuori» quando non è ancora uscita dalla cappella.
- T5: Baldrin è alla serratura e subito dopo «si volta dalla finestra», e i segni sono due.
- T6: il segno 4 dopo il segno 5.
- T7: Ottavia afferra il braccio di Assenzio, che è in cantina.
- T8: la tosse arriva «dalla grata» di una porta sfondata, Sebastiano sparisce, e Baldrin dice una frase confusa («la porta si apre col pane in mano»).

### Prosa per l'orecchio
- **Frasi**: 43 frasi del narratore; media 13,0 parole, mediana 13,0, massimo 25.
- **Frasi lunghe**: oltre 16 parole il 18,6%, oltre 20 il 14,0%.
- **Blocchi**: 5 su 8 superano le 4 frasi, 6 su 8 superano le 60 parole.
- **Chiusure con domanda**: 1 su 8.
- **Seconda persona**: 35 casi (23 vocativi e 12 pronomi). **Terza persona**: 2 (T1 «si volta verso Assenzio», T2 «la chierica si avvicina»).

### Verdetto
È il mondo più vivo del lotto: l'orologio spinge a ogni turno, Baldrin reagisce, e il climax arriva con la folla sulla soglia. Le azioni vengono risolte (una sola ignorata), e tutti e tre i PNG parlano con una voce in gran parte riconoscibile. Ha però due violazioni critiche:
- sull'agency, perché muove Teodora due volte e decide che la sua voce si spezza;
- sui confini, perché esce dalla finzione per dire che la risposta sta nel retro, e fa ammettere a Sebastiano la sua identità.

In più ha la prosa più lunga (14% delle frasi oltre 20 parole), un oste inventato, e un finale in cui Sebastiano sparisce senza motivo.

---

## 4. pressione-Y  (PG: Corrado, Assenzio, Teodora)

### Rubrica

| Crit. | Punti | Evidenza | Correzione |
|---|---|---|---|
| R1 Agency | **1** | T5 «Corrado, Assenzio, Teodora: la cesta è a terra… la vostra mossa la lascia senza parole»: il gesto di Corrado viene attribuito a tutti e tre. Non ci sono altre decisioni sui PG. | Attribuisci ogni gesto al solo PG che l'ha dichiarato. |
| R2 Conseguenze | **1** | Un buon esempio: T5 «Dalla canna esce un fumo acre, e in piazza qualcuno lo annusa». Ma molte azioni restano senza effetto: a T3 la serratura scatta e Baldrin risponde con una frase che non c'entra; a T6 la minaccia di Teodora di non benedire il pane non cambia niente; a T7 la spallata di Corrado non viene risolta. | Ogni azione rumorosa produce una reazione del PNG che la subisce. |
| R3 Canone | **2** | È coerente: T7 «Mia figlia, i due del bottaio, Tecla. E altri cinque.» fa nove malati, con i nomi giusti, e a T2 c'è la battuta campione di Baldrin. I fatti nuovi non dichiarati sono minori: T8 «la porta della cucina», T5 le pagnotte nella brace. C'è una contraddizione interna, non di canone: a T1 «Baldrin si alza piano», poi «non si alza». | Dichiara i fatti nuovi, e controlla la coerenza da una riga all'altra. |
| R4 Confini | **1** | T7 «La carrucola cigola nel freddo… L'acqua è limpida e gelata. Ha soltanto il sapore della pietra.»: nessun PG è al pozzo. Al limite: a T7 Baldrin dice da solo «I carbonai no. Bevono al pozzo, il pane se lo fanno.». Esempio positivo: T8 «Per Ilde. Me l'ha chiesto.» è un segreto detto da chi lo sa, dopo un evento che lo giustifica (il pane per terra), come prevede la sua iniziativa. | Un indizio di luogo esce solo se un PG è in quel luogo. |
| R5 Voce PNG | **1** | Baldrin ha voce e desiderio forti: T2 «Al terzo rintocco apro questa porta. Non prima.», T8 «Per Ilde. Me l'ha chiesto.». Però a T3 e T4 ripete battute che non rispondono a ciò che succede. Ottavia ha una sola battuta in otto turni, e dà del lei ad Assenzio (T1 «Guardi al pozzo, piuttosto»). Sebastiano non parla mai, nemmeno quando Corrado gli grida in faccia (T3). | Chi viene interpellato risponde, e risponde a ciò che gli è stato detto. |
| R6 Prosa | **2** | Le frasi più corte e pulite del lotto (media 10,3 parole, nessuna oltre 18): T8 «Lo avvolge nel fazzoletto, con cura, come un ferro caldo.». Difetti: T3 «scatta forte. Il nano si volta di scatto», T5 «la vostra mossa» (metalinguaggio), e i blocchi che si aprono con l'elenco dei nomi (T5, T6, T8). | Togli i doppioni e la parola «mossa» dalla voce. |
| R7 Concretezza | **2** | Multisensoriale: T5 «Nella brace le pagnotte anneriscono, con la crosta che scoppietta.», il fumo acre annusato in piazza, la carrucola a T7. Però a T5 «la lascia senza parole» dice l'emozione invece di mostrarla. | Sostituisci l'emozione detta con un gesto. |
| R8 Restituzione | **1** | Una sola chiusura con domanda (T3 «Che fai?»), che arriva dopo aver ignorato l'azione di Corrado. T6 finisce su «[invito] tutti», senza nessun invito detto a voce. | L'ultimo segmento deve essere un invito al PG scelto. |
| R9 Spotlight | **0** | Teodora viene chiamata per nome solo a T4. Le sue azioni di T2 (la domanda a Ottavia), T6 (la minaccia di non benedire), T7 (la preghiera) e T8 (sul tavolo) non sono mai risolte. Anche Corrado perde T3, T6 e T7. | Lo scheduler deve dare a ogni PG una risoluzione individuale a ogni turno. |
| R10 Ritmo | **1** | Dopo il primo segno (T2) il tempo si ferma per cinque risposte: il cane due volte, la borsa due volte, il pozzo. Poi a T8 il paese compare all'improvviso: «la porta della cucina sbatte e il paese si ferma sulla soglia». | Un segno almeno ogni due risposte, così il climax è preparato. |
| R11 Mondo | **1** | Un solo segno dell'orologio (T2 «il canto della veglia si interrompe»), più la finestra che sbatte (T2) e il fumo (T5); per il resto il paese aspetta. Le iniziative di Baldrin funzionano: T6 mostra la borsa, T8 conserva il pane per Ilde. | Applica `segno_almeno_ogni: 2`, e fai avanzare l'orologio subito quando un PG fa rumore. |
| R12 Indizi | **2** | Emergono più piste (il cane a T4 e T6, il pozzo e i carbonai a T7, Ilde a T8), ma da sole. Le azioni d'indagine restano senza premio: la preghiera di Teodora (T7) viene ignorata, Assenzio in cantina (T6) non vede i sacchi, la domanda sul Grifo (T3) non ha risposta. | Gli indizi devono rispondere alle azioni, non riempire i turni. |
| **Totale** | **15/36** | media 1,25; nessuna violazione critica, ma R9 a 0 | |

### Conteggi

**a. Fughe: 1**
- T7: l'acqua del pozzo senza nessun PG al pozzo (f_pozzo_pulito).
- Al limite, non contato: T7, i carbonai detti da Baldrin senza che nessuno glielo chieda.

**b. Canone inventato: 0 importanti**
- Minori: T8 «la porta della cucina»; T5 il pane che rotola dalla cesta fino nella brace.

**c. Agency: 1**
- T5: «la vostra mossa».

**d. Battute riferite: 0**
- Tutte le battute sono nel segmento del loro PNG.

**e. Menzogne senza segnale: 0**
- A T1 Ottavia esprime una credenza falsa, non una menzogna, e guarda comunque le ceste.

**f. Azioni ignorate: 9**
- T2: Teodora.
- T3: Corrado (il grido verso Sebastiano).
- T6: Teodora, Corrado e Assenzio (la cantina viene ripresa solo a T7, dal cane).
- T7: Corrado (la spallata) e Teodora (la preghiera).
- T8: Teodora e Assenzio.
- Parziali, non contate: T1 Assenzio; T4 Assenzio (Baldrin non reagisce alla minaccia); T5 Teodora e Assenzio; T8 Corrado.

**g. Domande meta gestite male: 0 su 2**
- T4: Baldrin risponde a Teodora «con un cenno del martello verso la porta», e compare il cane. Resta nella finzione e non rivela niente.
- T7: nessuna rivelazione.

**h. Ripetizioni: 3**
- T4: la battuta di Baldrin ripete l'informazione di T3.
- T6: il cane che trema, con le croste, ripete T4 quasi parola per parola.
- La borsa sotto la panca torna tre volte (T5, T6, T6).

**i. Cuciture: 6**
- T1: Baldrin si alza, poi non si alza.
- T3: Baldrin sorprende Assenzio a scassinare e risponde con una frase che non c'entra.
- T5: l'effetto (il pane brucia) viene prima della causa (la cesta cade).
- T6: la ciotola prima è piena di croste, poi è vuota; la borsa viene spinta verso la luce, poi è sotto la panca.
- T7: la scena del pozzo senza nessuno al pozzo, e Baldrin che elenca i malati senza domanda.
- T8: il paese sulla soglia senza preparazione, e una porta della cucina che non c'è.

### Prosa per l'orecchio
- **Frasi**: 39 frasi del narratore; media 10,3 parole, mediana 10,0, massimo 18.
- **Frasi lunghe**: oltre 16 parole il 5,1%, oltre 20 lo 0%.
- **Blocchi**: 4 su 8 superano le 4 frasi, 2 su 8 superano le 60 parole.
- **Chiusure con domanda**: 1 su 8.
- **Seconda persona**: 24 casi (17 vocativi e 7 pronomi). **Terza persona**: 0.

### Verdetto
Ha la prosa più pulita e il momento più forte di tutto il lotto: Baldrin che avvolge la mollica per Ilde (T8) è vera ironia drammatica, ottenuta con l'iniziativa scritta del PNG. Gestisce bene le domande meta e non rivela segreti dei PNG.

Il resto però non regge:
- ignora 9 azioni, e Teodora è di fatto fuori dal gioco;
- Sebastiano non risponde nemmeno quando lo chiamano;
- l'orologio resta fermo per cinque risposte, poi il paese arriva di colpo;
- i turni centrali sono riempiti con cose già viste (il cane due volte, la borsa tre volte), il pozzo e i carbonai, senza legame con quello che fanno i giocatori.

---

## 5. Confronto per copione

### Indagine: **Y è migliore** (20 contro 12)
- **Risoluzione**: Y risolve quasi tutte le azioni nel loro turno (1 ignorata contro 11). Da T5 in poi X risolve azioni non dichiarate, o nessuna.
- **Agency**: X decide gesti dei PG (T6 il sacco, T6 il pozzo, T8 la botola). In Y c'è solo un caso lieve (T7).
- **Canone**: X contraddice un fatto pubblico appena detto (T2 «sono sei») e importa un pontile con le barche (T7). Y riporta esatti i malati e i nomi (T2), ma inventa un secondo rintocco e un Sebastiano malato.
- **Confini**: entrambe hanno R4 a 0.
  - La fuga di Y è la più dannosa del lotto: T6, Gualtiero nominato a una domanda banale.
  - Quelle di X sono indizi scaricati senza innesco: il pozzo (T6) e il quaderno (T7), quest'ultimo subito dopo una domanda meta.
- **Forma**: X ha frasi più corte e 5 chiusure su 8, ma lascia muti Ottavia e Sebastiano e fa monologhi (T5). Y non chiude mai con un invito (0 su 8) e infila 8 battute di PNG nella voce del narratore.

### Pressione: **X è di poco migliore** (17 contro 15)
- **Mondo e ritmo**: X porta l'orologio, segno dopo segno, fino al paese sulla soglia (T8). Y si ferma dopo T2 e fa comparire la folla di colpo a T8.
- **Risoluzione e spotlight**: X ignora 1 azione, Y 9. In Y Teodora è quasi assente (R9 a 0), e Corrado perde il grido al Grifo, la spallata e il vino.
- **Finzione e confini**: Y è migliore. Gestisce nella finzione entrambe le domande meta, e la sua unica fuga è l'indizio del pozzo. X esce dalla finzione e dà un indizio (T4), e fa confessare l'identità a Sebastiano (T3).
- **Agency**: X ha 3 violazioni (Teodora mossa due volte, e la sua voce «si spezza»); Y ne ha 1.
- **Prosa**: Y è più pulita (0% di frasi oltre 20 parole, contro il 14%) e ha la scena migliore del lotto (il pane per Ilde). X ha la prosa viola di T7 e un oste inventato.

---

## 6. Tabella complessiva

| | indagine-X | indagine-Y | pressione-X | pressione-Y |
|---|---|---|---|---|
| R1 Agency | 0 | 1 | 0 | 1 |
| R2 Conseguenze | 1 | 2 | 2 | 1 |
| R3 Canone | 0 | 1 | 1 | 2 |
| R4 Confini | 0 | 0 | 0 | 1 |
| R5 Voce PNG | 1 | 1 | 2 | 1 |
| R6 Prosa | 2 | 2 | 1 | 2 |
| R7 Concretezza | 2 | 2 | 2 | 2 |
| R8 Restituzione | 1 | 1 | 1 | 1 |
| R9 Spotlight | 1 | 3 | 2 | 0 |
| R10 Ritmo | 1 | 2 | 2 | 1 |
| R11 Mondo | 1 | 2 | 2 | 1 |
| R12 Indizi | 2 | 3 | 2 | 2 |
| **Totale /36** | **12** | **20** | **17** | **15** |
| Media | 1,00 | 1,67 | 1,42 | 1,25 |
| Violazioni critiche (0 su R1/R4) | R1, R4 | R4 | R1, R4 | nessuna |
| a. fughe | 2 | 1 | 2 | 1 |
| b. canone inventato | 4 | 3 | 3 | 0 |
| c. agency | 4 | 2 | 3 | 1 |
| d. battute riferite | 1 (ma 2 PNG muti) | 8 | 2 | 0 (ma Sebastiano muto) |
| e. menzogne senza segnale | 0 | 1 | 0 | 0 |
| f. azioni ignorate | 11 | 1 | 1 | 9 |
| g. meta gestite male | 1/2 | 0/2 | 1/2 | 0/2 |
| h. ripetizioni | 9 | 2 | 4 | 3 |
| i. cuciture | 9 | 8 | 6 | 6 |
| Parole/frase (media / mediana) | 9,3 / 9 | 12,5 / 14 | 13,0 / 13 | 10,3 / 10 |
| % frasi > 16 parole | 3,4% | 26,5% | 18,6% | 5,1% |
| % frasi > 20 parole | 0% | 2,0% | 14,0% | 0% |
| Blocchi > 4 frasi | 8/8 | 7/8 | 5/8 | 4/8 |
| Chiusure con domanda | 5/8 | 0/8 | 1/8 | 1/8 |
| 2a persona / 3a persona | 27 / 1 | 35 / 1 | 35 / 2 | 24 / 0 |

**Somme per lettera**, date solo per completezza: le etichette sono assegnate in modo indipendente per copione, quindi potrebbero non indicare la stessa versione.
- **X**: rubrica 29/72.
  - Conteggi: fughe 4, canone 7, agency 7, battute riferite 3, menzogne 0, azioni ignorate 12, meta 2, ripetizioni 13, cuciture 15.
- **Y**: rubrica 35/72.
  - Conteggi: fughe 2, canone 3, agency 3, battute riferite 8, menzogne 1, azioni ignorate 10, meta 0, ripetizioni 5, cuciture 14.

**Protocollo §9**: la media è sotto 2 in tutte e quattro le trascrizioni, quindi su tutte va fatto un intervento.

---

## 7. Le tre debolezze principali di ciascuna trascrizione, con la correzione

Le do per trascrizione perché le etichette X e Y non sono legate tra un copione e l'altro. Chi conosce l'abbinamento può aggregarle.

**indagine-X**
1. **La risoluzione delle azioni crolla**: 11 azioni ignorate, e da T6 a T8 gesti attribuiti al PG sbagliato. *Correzione:* il Motore passa al narratore una lista «un'azione = una risoluzione», indicizzata per `pg_id`. Prima del TTS un validatore rifiuta l'uscita se un'azione dichiarata manca o se ne compare una non dichiarata (E5).
2. **Indizi e segreti senza innesco** (il quaderno a T7, il pozzo a T6). *Correzione:* il testo di un indizio esce solo tramite `reveal_clue(id)`, e il Motore verifica che il come_si_trova sia soddisfatto in quel turno (E6, E9). Se non lo è, la frase si blocca.
3. **Canone allucinato** (sei malati, il pontile, Moro nella stalla). *Correzione:* numeri e luoghi del canone vanno nel contesto come fatti fissi. Un controllo di contraddizione su numerali e nomi di luogo, prima della voce (E10), deve essere rapido. Nel contesto non devono entrare esempi estranei alla campagna.

**indagine-Y**
1. **Menzogna e cede_se violati** (T6: Ottavia confessa Valsecca e Gualtiero a una domanda qualsiasi). *Correzione:* nella chiamata del PNG, se l'argomento coincide con un `mente_su`, la `versione` è obbligatoria finché il Motore non segna `cede_se: soddisfatto`. In più un filtro regex sull'uscita applica `mai_dice` (il nome di Gualtiero).
2. **Nessuna chiusura** (0 su 8). *Correzione:* il Motore impone che l'ultimo segmento sia una domanda o un invito al `destinatario_pg` (E8), e se manca lo aggiunge.
3. **Battute dei PNG nella voce del narratore** (8 casi), con errori di registro e di genere. *Correzione:* un validatore D1 rifiuta le virgolette «» nei segmenti del narratore, e rimanda la battuta alla chiamata del PNG insieme al registro e al genere di chi ascolta.

**pressione-X**
1. **Agency su Teodora** (T1 e T2 la muovono, T8 decide la sua voce). *Correzione:* la guardia E5 cerca il nome o il ruolo di un PG seguito da un verbo d'azione o d'emozione non dichiarato, e fa riscrivere la frase. Per un PG senza azione si descrive il mondo intorno a lui.
2. **Uscite dalla finzione e concessioni indebite** (T4 «non posso ancora: lo sa solo chi ha guardato nel retro»; T3 Sebastiano ammette chi è). *Correzione:* le domande meta vanno a un gestore dedicato che risponde solo nella finzione, con un PNG o un dettaglio, e blocca la prima persona del master. Al PNG si passa lo stato del cede_se.
3. **Frasi lunghe e invenzioni** (14% oltre 20 parole; il vecchio al bancone; Sebastiano che sparisce). *Correzione:* il filtro E4 spezza alla virgola oltre le 20 parole e fa riscrivere oltre le 28. Le entità nuove che toccano la trama si bloccano; le comparse banali entrano come `proposto`.

**pressione-Y**
1. **Azioni ignorate (9) e Teodora assente** (R9 a 0). *Correzione:* lo scheduler T1 impone a ogni turno una risoluzione individuale per ogni azione dichiarata, e la chiusura al PG chiamato meno di recente.
2. **Orologio fermo per cinque risposte, poi il salto alla folla.** *Correzione:* il Motore applica `segno_almeno_ogni: 2` scrivendo «mostralo in questa risposta», e fa avanzare l'orologio subito quando c'è rumore (la serratura forzata a T3, le grida, la spallata).
3. **Riempitivi riusati senza legame con l'azione**: il cane due volte, la borsa tre volte, la stessa battuta di Baldrin a T3 e T4, il pozzo senza nessuno al pozzo. *Correzione:* la mossa morbida solo dopo che il rilevatore di stallo è scattato (E12); un filtro anti-ripetizione sulle ultime 5 narrazioni (N14, E4); ogni battuta di un PNG deve rispondere all'ultima azione rivolta a lui.

---

## Appendice

- **Script**: `giudizio/conta.py`, da lanciare con `python3 -I conta.py cieco`. Stampa le frasi oltre 16 parole e le menzioni in terza persona con il contesto, per la verifica a mano. Un caso l'ho corretto a mano: «Le parla» di indagine-Y, T2, che lo script non vede perché cerca solo nomi e ruoli.
- **Osservazione fattuale, non usata per i punteggi** (assegnati trascrizione per trascrizione) **né per indovinare l'abbinamento**: alcune righe compaiono identiche in trascrizioni diverse, anche in contesti diversi:
  - «Lì dentro c'è quello. Il forestiero. / Polvere nel pozzo, ha messo. Al rintocco decide il paese.»: indagine-X T2 e pressione-Y T3;
  - «Il forestiero, quello del pozzo. Al rintocco, fuori.»: indagine-X T3 e pressione-Y T4;
  - «Tu no, ragazzo. Tu le mani in tasca.»: indagine-X T4 e pressione-Y T5;
  - il blocco del cane: indagine-X T1 e T3, pressione-Y T4 e T6;
  - il blocco del pozzo: indagine-X T6 e pressione-Y T7.

  In tutti questi casi la riga è inserita senza rispondere all'azione del turno. È il segno di frammenti preconfezionati che entrano senza filtro di pertinenza.

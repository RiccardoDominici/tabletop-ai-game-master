# Giudizio cieco A/B2: caotico-X, caotico-Y, cauto-X, cauto-Y

Fonti lette: le 4 trascrizioni in `giudizio2/cieco/`, `docs/manuale-master.md` (tutto), e in `campagne/prova-f0/`: `stile.yaml`, `campagna.yaml`, `scena.yaml`, `pg.yaml`, `png/png_ottavia.yaml`, `png/png_baldrin.yaml`, `png/png_sebastiano.yaml`. Nient'altro.
Metriche di prosa: `giudizio2/conta.py` (eseguito con `python3 -I conta.py cieco`).

## Metodo e convenzioni

- **Turno 0** è il testo fisso della scena, identico nei quattro file: escluso da punteggi e medie.
- **Rubrica** R1–R12 del §9, da 0 a 3. Il 3 richiede una prova positiva citata; nel dubbio ho scelto il punteggio più basso.
- **Fuga** (a): un segreto, un fatto con `noto_ai_pg: false` o la verità di una menzogna detti o lasciati intendere prima che la finzione li sblocchi. Vale anche un'informazione privata di un giocatore (N10, T9). Quando un PNG che sa il fatto sceglie di dirlo, non la conto come fuga, ma la segnalo se è immotivata (D7) o se scavalca un `cede_se`. Le allusioni deboli sono elencate come **dubbie** e non entrano nel conteggio.
- **Agency** (c): conto le azioni, parole, pensieri o percezioni dei PG non dichiarati. Le violazioni **lievi** (un'azione implicita, una domanda attribuita al PG) entrano nel conteggio e sono marcate.
- **Cuciture** (i): alcune si sovrappongono ad altre categorie (canone, agency); le elenco comunque, perché al tavolo si sentono come salti.
- **Frase** = testo chiuso da `. ! ?` (i due punti e il punto e virgola non chiudono). **Parola** = token separato da spazi («l'oste» vale 1).
- **Blocco N2** = tutte le frasi del narratore in un turno. Con tre azioni simultanee il tetto di 4 frasi è quasi irraggiungibile, quindi lo riporto ma non lo uso da solo per abbassare R6.

---

## 1. caotico-X (PG: Ginestra, Corrado, Teodora)

### Rubrica

| Criterio | Punti | Prove (turno + citazione) |
|---|---|---|
| R1 Agency | **0** | Più violazioni. T2 «i dadi scivolano sul tavolo mentre Corrado li raccoglie»: Baldrin aveva appena rifiutato la partita e Corrado non ha dichiarato niente. T7 «Ginestra, tu raccogli i dadi caduti sotto la panca». T8 «Teodora, esci dal ripostiglio»: la giocatrice aveva scritto «resta dentro», e il ripostiglio è chiuso a chiave. **Violazione critica.** |
| R2 Conseguenze | 2 | Concrete ma prevedibili. T4 Ottavia: «Giù le mani dalle ceste!», «si mette tra voi e il tavolo»; Baldrin «si è alzato con il martello in mano». T5 Baldrin: «Ancora un colpo, soldato, e la porta la apro io». Però la scoperta dei chicchi (T4) non cambia niente: Ottavia non attiva la sua iniziativa di bruciare i sacchi. |
| R3 Canone | **0** | Contraddizione grave nello stesso turno: T4 la mollica è «grigia, e punteggiata di chicchi neri», poi «dentro c'è pane bianco, ancora caldo», mentre il pane dei lumi è tutto di segale guasta (f_pane_lumi_segale). Poi T8 Teodora «esci dal ripostiglio». Inventati e non dichiarati: T1 «la porta della cantina» (non esiste nella pianta), T7 «Roba da umani». |
| R4 Confini | 1 | Allusione rivelatrice. T6 Baldrin: «Il cerusico non l'ho visto. Quello dentro è un forestiero»: porta in finzione la parola «cerusico», che era solo nella domanda meta di Corrado e nelle sue conoscenze private. Nessuna menzogna detta, quindi nessun segnale da valutare. |
| R5 Voce PNG | 2 | Registro tenuto. Baldrin: «soldato», «sorella», «quello». Ottavia: «figliola», «Mangia, ché la notte è lunga». Sebastiano: «Mi permetta», «Lei ha paura di me?». Il desiderio si vede: T1 Sebastiano chiede acqua; T2 Baldrin «Al rintocco decide il paese». Macchie: T4 Baldrin ripete la battuta di Ottavia «Il pane è per dopo»; T3 Baldrin e Ottavia recitano lo stesso elenco «i due del bottaio… E altri cinque»; il tic «Ferro è ferro» tre volte (T2, T6, T7). |
| R6 Prosa | **0** | Frasi lunghe e contorte, con errori: media 14,8 parole (sopra la fascia 8–14), il 15% sopra 20, massimo 27. T2 «il sacchetto di Sebastiano sembra sussurrare dentro la bocca di Baldrin». T7 «la tua domanda ai malati e le mani che bruciano arriva a Ottavia». T8 «Sta ancora cantando». |
| R7 Concretezza | 2 | Buoni dettagli: T4 «La crosta cede con uno scrocchio»; T6 «una voce di ragazzo grida corvo»; T8 «la neve è sottile ma fitta». Però anche frasi fatte: T3 «il tuo silenzio pesa più della lanterna», T7 «il silenzio si fa più teso», T2 «come chi non vuole sapere». |
| R8 Restituzione | 1 | Chiusure assenti: in nessuno degli 8 turni il narratore chiude con una domanda (lo script ne conta 0 in tutta la trascrizione). L'`[invito]` va sempre a due o tre PG. T7 è un blocco di 13 righe. |
| R9 Spotlight | 2 | Equilibrato (vocativi: Ginestra 10, Corrado 9, Teodora 11). Teodora ha la sua preghiera (T7) e Ginestra il rimedio della nonna (T7). L'aggancio di Corrado viene solo bruciato (T6). |
| R10 Ritmo | 1 | La posta è chiara (T2 «Al rintocco decide il paese»), ma è il narratore a riaprire il tempo vuoto: T7 «la partita di dadi sfuma». Tra T3 e T6 nessun segno, sotto il ritmo minimo della scheda (uno ogni due risposte). |
| R11 Mondo proattivo | 2 | I segni 1, 2 e 3 sono visibili e in ordine (T3 canto, T6 sasso, T8 rintocco); T1 Sebastiano chiede acqua. Ma i segni sono pochi, T8 ne fonde due («passi e voci che si fermano sotto il portico») e Ottavia non usa mai le sue iniziative. |
| R12 Indizi | 2 | Più piste: i_speroni_neri (T4), i_preghiera_pane (T7), i_baldrin_sano (T7), i_carbonai_sani (T3), i_sebastiano_tecla (T5). Ma arrivano spinte, non guadagnate: T3 e T7 sono risposte fuori tema. L'ingegno non è premiato: il topo di Ginestra (T5) non dice niente. |

**Totale 15/36, media 1,25.** Violazione critica su R1.

### Conteggi

- **a. Fughe: 1** (+1 dubbia)
  - T6 Baldrin: «Il cerusico non l'ho visto». Una domanda meta diventa una battuta in pubblico, e così tocca f_taglia_cerusico e le conoscenze private di Corrado (T9).
  - Dubbia: T1 «guarda la porta della cantina». Sfiora la cantina di f_botola, ma non nomina la botola.
- **b. Canone inventato: 5** (2 gravi)
  - Gravi: T4 «pane bianco» (contro la segale e contro la mollica grigia di due righe prima); T8 «Teodora, esci dal ripostiglio» (il ripostiglio è chiuso a chiave).
  - Minori: T1 «la porta della cantina»; T1 «l'oste» (al maschile, mentre c'è solo l'ostessa) con «vino annacquato»; T7 «Roba da umani».
- **c. Agency: 5** (2 lievi)
  - T2 «mentre Corrado li raccoglie» (anche in terza persona).
  - T4 la pagnotta viene spezzata («La crosta cede con uno scrocchio») senza che nessuno l'abbia dichiarato (lieve).
  - T6 «la tua domanda sulla chiave e sulla cella»: attribuisce a Corrado una domanda che non ha fatto (lieve).
  - T7 «Ginestra, tu raccogli i dadi».
  - T8 «Teodora, esci dal ripostiglio».
- **d. Battute PNG riferite dal narratore: 2**
  - T1 «poi scuote la testa: birra no, solo vino annacquato».
  - T7 «Poi dice piano che lui beve al pozzo come tutti, e sta bene».
- **e. Menzogne senza segnale: 0.** Nessuna menzogna detta.
- **f. Azioni ignorate o non risolte: 2**
  - T3 Corrado: «la guerra l'ha fatta o no?». Baldrin risponde con l'elenco dei malati.
  - T5 Ginestra chiede al topo cosa ha visto: nessuna risposta, solo «si nasconde dietro la cesta».
- **g. Meta gestito male: 1 su 1.** T6: la domanda viene parafrasata a sproposito («sulla chiave e sulla cella») e poi messa in bocca a Baldrin con la parola «cerusico».
- **h. Ripetizioni: 6**
  - T3: lo stesso elenco dei malati detto da Ottavia e da Baldrin.
  - T4: «si spezza al rintocco» due volte in due righe.
  - T4: Baldrin usa «Il pane è per dopo», la battuta di Ottavia in T2.
  - T7: il narratore riferisce quello che Baldrin ha appena detto.
  - T7: la preghiera di Teodora raccontata due volte.
  - «Ferro è ferro» in T2, T6 e T7 (due volte in tre battute: viola D2).
- **i. Cuciture: 12**
  - T2: la partita a dadi va avanti dopo il rifiuto di Baldrin.
  - T2: «il sacchetto… sussurrare dentro la bocca di Baldrin».
  - T3: Baldrin risponde fuori tema, e il martello è prima «senza muovere» e poi «smette di girargli nel palmo».
  - T4: mollica grigia, poi «pane bianco».
  - T4: Ottavia «non dice nulla», poi parla.
  - T5: Sebastiano risponde a una domanda che nessuno ha fatto («Prendevo acqua per la vecchia»).
  - T6: «domanda sulla chiave e sulla cella».
  - T7: torna la partita a dadi, già chiusa.
  - T7: la preghiera dà prima freddo e marcio, poi «Il pane sembra puro, ma non lo è del tutto».
  - T7: Baldrin parla di pozzo e segale subito dopo la battuta sui debiti.
  - T8: Teodora esce dal ripostiglio; «le ultime voci si spengono», poi Ottavia «Sta ancora cantando».
  - T8: due segni dell'orologio nella stessa risposta.
- **j. Azioni dipendenti gestite male: 2 su 5**
  - T2 «anch'io gioco»: il gioco era stato rifiutato, ma il narratore lo fa proseguire.
  - T8 «aspettami corrado!!»: «si perde nel vento… Corrado è già sotto il portico», e Ginestra resta dentro.
  - Bene: T5 «aiuto teodora», T7 «pure io prego».

### Prosa per l'orecchio (script)

- **Frasi**: 52 del narratore. Media 14,8 parole, mediana 15, massimo 27. Sopra 16 parole: 40%. Sopra 20: 15% (8 frasi).
- **Blocchi**: nessun segmento sopra le 4 frasi, ma 6 turni su 8 superano le 4 frasi del narratore e 8 su 8 superano le 60 parole. Media 6,5 frasi e 96 parole a turno. T7 arriva a 12 frasi e 160 parole.
- **Battute PNG sopra le 2 frasi** (D3): 7. Il caso peggiore è Baldrin in T7, con 6 frasi di fila.
- **Chiusure** con domanda o invito del narratore: 0 su 8. `[invito]` a un solo PG: 0 su 8.
- **Persona**: 30 vocativi ai PG, sempre in seconda persona singolare. Una narrazione in terza persona di un'azione non dichiarata (T2 «Corrado li raccoglie»). Un vocativo rivolto a un PNG (T2 «Ottavia, sbattendo il mestolo…»), che al tavolo confonde.
- **Lista nera N5**: «silenzio pesa» (T3), «silenzio si fa» (T7), «improvviso» (T7).

### Verdetto

È la versione che porta più cose sul tavolo: indizi, PNG vivi, reazioni alle azioni. Ma è anche la meno affidabile. Muove i PG al posto dei giocatori, si contraddice dentro lo stesso turno (pane grigio e pane bianco), parla con frasi lunghe e a volte sgrammaticate e non restituisce mai la parola con una domanda. La domanda meta finisce in bocca a Baldrin con la parola «cerusico».

---

## 2. caotico-Y (PG: Ginestra, Corrado, Teodora)

### Rubrica

| Criterio | Punti | Prove (turno + citazione) |
|---|---|---|
| R1 Agency | 1 | Una violazione piena: T4 «Ginestra, Corrado non ti lascia vedere». Una dubbia: T4 «Passa la porta del retro», con soggetto ambiguo, probabilmente Corrado in terza persona. |
| R2 Conseguenze | 1 | Vaghe o assenti. T4: il furto della pagnotta e il lino sollevato non provocano reazioni («nessuno ti vede»). T5: al pugno di Corrado Baldrin «si volta di scatto verso la finestra», senza motivo. T8: Corrado esce in mezzo al paese radunato sotto il portico e trova solo «il primo fiocco». |
| R3 Canone | **0** | Contraddizione grave: T5 Baldrin dice «La chierica non viene a quest'ora» proprio a Teodora, la chierica mandata per il rito (f_rito_pane), con la quale dovrebbe essere amichevole. Altre: T3 lanterne in piazza «verso il pozzo» prima del primo rintocco (l'abbozzo dice che fino ad allora la piazza è vuota); T3 Baldrin «La guerra l'ho vista da vicino», un passato inventato; T2 le erbe di Ottavia che sanno «di muffa», inventate. |
| R4 Confini | 1 | Allusione rivelatrice. T3: «Ginestra, dice piano, di quella segale ne ho presa tanta». Ottavia lega da sola la febbre a «quella segale», contro la sua menzogna (versione: «la segale di sempre») e senza nessun `cede_se`. |
| R5 Voce PNG | 1 | Voce incostante. T5 Baldrin dà del voi e fa domande («Chi siete?… Andate a pregare»), mentre la sua scheda vuole il tu con tutti e quasi mai domande. Sebastiano è ridotto a un «Acqua» riferito (T2). T6 Baldrin chiama Ginestra «ragazza» invece che col mestiere («erbaiola»). Resta riconoscibile in T2 («Sta' seduto, soldato») e T6 («non è affar tuo»). |
| R6 Prosa | 2 | Frasi brevi: media 10,8 parole, 0% sopra 20, massimo 20. T1 «La birra è scura e amara». Ma il ritmo è uniforme, tutti gli 8 turni superano le 4 frasi e ci sono ambiguità: T4 «Passa la porta del retro», «la tua pagnotta è già sulla tavola». |
| R7 Concretezza | 2 | Buoni dettagli: T1 «una manciata di castagne in più», T2 «un colpo sordo, come di sacco caduto», T8 «il vento porta odore di ferro e di fumo». Però: T3 «Sul suo viso passa un'ombra», T5 «Ha paura di qualcosa» (emozione nominata), T7 «una quiete strana». |
| R8 Restituzione | 1 | Chiusure generiche: solo T7 «Che fate?» e T8 «Cosa fate ora?», entrambe a tutti; gli altri 6 turni chiudono con una descrizione. |
| R9 Spotlight | 2 | Equilibrato (vocativi: Ginestra 8, Corrado 8, Teodora 7), ma senza agganci. La preghiera di Teodora è dimezzata (T7) e il suo incontro con Sebastiano salta (T5). |
| R10 Ritmo | 2 | La tensione sale: dal T3 un segno a ogni turno, fino ai tre rintocchi di T7 («Tre rintocchi: la veglia è finita, e bussano alla porta. Che fate?»). Però sale senza cause legate ai PG e senza mai scendere: il climax arriva prima che i giocatori abbiano piste. |
| R11 Mondo proattivo | 2 | Il paese si muove (T6 «qualcuno prova la maniglia», T8 «Il paese spinge sotto il portico»). Però due tick su sei non hanno un segno visibile (`[orologio]` in T2 e T5) e T3 fonde due segni. I PNG non prendono iniziative (Sebastiano è muto). |
| R12 Indizi | 1 | Una sola pista: i chicchi (T4, visti senza spezzare il pane) più una preghiera parziale (T7, «un freddo che non viene dal fuoco», senza l'odore di marcio). Nessun indizio su r_innocente. |

**Totale 16/36, media 1,33.**

### Conteggi

- **a. Fughe: 1**
  - T3 Ottavia: «di quella segale ne ho presa tanta». È la verità della menzogna sulla segale, detta senza `cede_se` e per di più dal narratore.
  - Non contato: T4, i chicchi si vedono «nella mollica» solo sollevando il lino. L'indizio essenziale arriva senza la sua condizione: è generoso, ma fisicamente incoerente (vedi i).
- **b. Canone inventato: 8** (1 grave)
  - Grave: T5 «La chierica non viene a quest'ora».
  - Minori: T1 «l'oste» con la birra; T2 le erbe ammuffite; T3 «La guerra l'ho vista da vicino»; T3 lanterne in piazza prima del rintocco; T4 «la porta del retro» (il retro ha una tenda, non una porta); T4 «la tua pagnotta»; T7 «il tuo nome risuona nella cappella».
- **c. Agency: 2** (1 lieve)
  - T4 «Corrado non ti lascia vedere» (anche in terza persona).
  - T4 «Passa la porta del retro» (lieve: soggetto ambiguo).
- **d. Battute PNG riferite dal narratore: 4**
  - T2 «un sussurro: «Acqua»» (Sebastiano).
  - T3 «dice piano, di quella segale ne ho presa tanta» (Ottavia).
  - T6 «Dice che la schiena gli fa male da ore» (Baldrin).
  - T6 «Ti fissa e ripete: quello chiuso dentro non è affar tuo» (Baldrin).
- **e. Menzogne senza segnale: 0.**
- **f. Azioni ignorate o non risolte: 3**
  - T3: Ginestra chiede se ai malati bruciano le mani; Ottavia non risponde.
  - T5: Teodora bussa e chiede «Come vi sentite?»; Sebastiano non risponde, risponde Baldrin.
  - T5: il topo non dice niente («Ha paura di qualcosa»).
- **g. Meta gestito male: 0 su 1.** T6: «Baldrin non conferma nulla… non è affar tuo». Resta nella finzione e non svela niente, ma non offre una pista (dovrebbe indicare il modo legittimo: vederlo in faccia). Accettabile.
- **h. Ripetizioni: 3**
  - «come di muffa» in T2 e T4.
  - «di scatto» in T3 e T5.
  - «passi sotto il portico» in T6, T7 e T8.
- **i. Cuciture: 11**
  - T2: le erbe sul bancone al posto della partita.
  - T3: Ottavia risponde fuori tema.
  - T3: due segni fusi, con lanterne in anticipo.
  - T4: la mollica vista senza spezzare il pane.
  - T4: «la tua pagnotta è già sulla tavola».
  - T4: soggetto di «Passa la porta del retro».
  - T5: Baldrin, seduto accanto alla porta, chiede «Chi siete?».
  - T6: «ripete» qualcosa che non aveva mai detto.
  - T7: «il tuo nome risuona nella cappella».
  - T8: «arriva ancora il canto» dopo «la veglia è finita», poi Ottavia «hanno finito».
  - T8: Corrado esce in mezzo alla folla senza conseguenze; «il primo fiocco» contro «la neve cade fitta».
- **j. Azioni dipendenti gestite male: 3 su 5**
  - T2 «anch'io gioco»: ignorato.
  - T4 «fammela vedere»: negato con un rifiuto inventato di Corrado.
  - T8 «aspettami corrado»: Ginestra resta dentro («lo spiffero sotto la porta»).
  - Bene: T5 «aiuto teodora», T7 «pure io prego».

### Prosa per l'orecchio (script)

- **Frasi**: 53 del narratore. Media 10,8 parole, mediana 10, massimo 20. Sopra 16 parole: 15%. Sopra 20: 0%.
- **Blocchi**: nessun segmento sopra le 4 frasi. Tutti gli 8 turni superano le 4 frasi del narratore, 7 su 8 superano le 60 parole. Media 6,6 frasi e 72 parole a turno.
- **Battute PNG sopra le 2 frasi**: 2 (T2 e T5, entrambe di Baldrin).
- **Chiusure** con domanda o invito del narratore: 2 su 8 (T7 e T8, generiche, a «tutti»). `[invito]` a un solo PG: 0.
- **Persona**: 23 vocativi in seconda persona singolare. Una narrazione in terza persona (T4 «Corrado non ti lascia vedere»), più una dubbia («Passa la porta del retro»).
- **Lista nera N5 e formule sospette**: «un'ombra» (T3), «Ha paura» (T5), «quiete strana» (T7).

### Verdetto

È la prosa più pulita delle quattro, ma gioca la scena peggio. Corre verso il terzo rintocco senza cause e senza lasciare piste. Sebastiano resta muto, l'incontro di Teodora finisce in una contraddizione col canone e le azioni dei PG non hanno quasi conseguenze. La fuga sulla segale passa per una battuta di Ottavia riferita dal narratore.

---

## 3. cauto-X (PG: Assenzio, Corrado, Ginestra)

### Rubrica

| Criterio | Punti | Prove (turno + citazione) |
|---|---|---|
| R1 Agency | 1 | Una violazione, grave: T6 «Ginestra, il pane è dolce per un attimo, poi brucia in gola come una spina». Il narratore fa assaggiare a Ginestra il pane guasto: la giocatrice aveva fatto solo una domanda meta. |
| R2 Conseguenze | 2 | Concrete. T4: quando Corrado parla della taglia, Baldrin la sente («Il forestiero è mio») e Sebastiano si alza («dalla grata esce il fiato di chi si è alzato in piedi»). Ma T5: Ginestra trova i chicchi e Ottavia non reagisce. |
| R3 Canone | **0** | Contraddizione grave. T7 Sebastiano: «Mani e piedi bruciano, sì. Tremo quando il fuoco sale», mentre la sua scheda dice «Ha le mani pulite, e non tremano», e lui non è malato. T8 il paese entra («la porta sotto il portico si spalanca e il paese entra») prima dei tre rintocchi, contro il rito e il taglio; nella stessa risposta Baldrin dice «Il pane si spezza al terzo rintocco». |
| R4 Confini | **0** | Rivela un segreto. T7 Sebastiano: «Roccalba l'ho lasciata da due mesi. Mi chiedevano di lasciar morire i feriti nemici, e non ho obbedito». Il `cede_se` vuole che un PG nomini Roccalba **e prometta di non venderlo**: Corrado ha nominato Roccalba ma non ha promesso niente, anzi in T4 aveva parlato della taglia. Inoltre Baldrin è presente. In più T5 la menzogna di Ottavia ha il segnale rovesciato («le scivola sugli occhi, e lei non lo sistema»). **Violazione critica.** |
| R5 Voce PNG | 1 | Incostante. Sebastiano in T7 non ha registro né tic, e parla come un malato. Baldrin in T3 chiama il forestiero per nome («Si chiama Sebastiano»), mentre la sua scheda vuole «quello»; in T4 «Le corone le ho già in testa» è un movente non suo. Ottavia invece è riconoscibile: «Assenzio, figliolo, lascia perdere e mangia qualcosa». |
| R6 Prosa | 2 | Per lo più conforme: media 11,8 parole, 8% sopra 20, massimo 25. Ma ci sono frasi storte: T6 «Ma dalla porta non si apre», T1 «fissa la chiave al collo». |
| R7 Concretezza | 2 | Buoni dettagli: T4 «la serratura è vecchia, con la stanga di ferro. Sotto la porta filtra un filo di luce gialla»; T5 «la pagnotta è calda e pesa poco». Cliché: T7 «le nocche diventano bianche». |
| R8 Restituzione | 1 | Chiusure assenti: 0 domande del narratore in tutta la trascrizione; si chiude sempre con un segno dell'orologio o con una battuta. Oltre il punto di reazione in T8: il paese entra e Ginestra è già «sulla soglia dei malati». |
| R9 Spotlight | 2 | Equilibrato (vocativi: Ginestra 8, Corrado 9, Assenzio 8). Ginestra ha la pagnotta (T5), Corrado Roccalba (T7). Ma il momento di Assenzio va storto due volte: il segnale rovesciato (T5) e la domanda di T8 ignorata. |
| R10 Ritmo | 2 | Escalation regolare con posta chiara: T2 «resto finché suona il terzo rintocco»; i segni da T2 a T7. Si rompe in T8: climax anticipato, senza rintocchi. |
| R11 Mondo proattivo | **3** | Segni visibili quasi a ogni turno e in ordine: T2 canto, T3 sasso, T4 «la campana della cappella suona un rintocco. Baldrin infila la chiave», T5 lanterne al pozzo, T6 «qualcuno prova la maniglia», T7 «Qualcuno batte due colpi». I PNG reagiscono ai PG (T4 Baldrin e Sebastiano). |
| R12 Indizi | 2 | L'ingegno è premiato: T3, alla domanda acuta di Ginestra, Ottavia risponde «Tutti hanno mangiato il pane nuovo»; T5 i chicchi; T3 l'Intuizione di Assenzio dà «le mani che tremano». Però l'indizio del nodo è trattenuto (T5 «un nodo che non conosco», senza descriverlo) e manca l'indizio proattivo del cane. |

**Totale 18/36, media 1,50.** Violazione critica su R4.

### Conteggi

- **a. Fughe: 2** (+1 dubbia)
  - Grave: T7 Sebastiano rivela diserzione e motivo senza la promessa, e Baldrin sente.
  - T6: il narratore risponde in pratica alla domanda meta con «brucia in gola»: lascia intendere che il pane fa male, contro la regola di stile «il narratore non dice mai da dove viene la febbre».
  - Dubbia: T6 «dalla cantina sale un filo d'aria fredda», subito dopo che Assenzio ha alluso a «un'altra strada».
- **b. Canone inventato: 6** (2 gravi)
  - Gravi: T7 Sebastiano con i sintomi; T8 il paese dentro prima dei tre rintocchi.
  - Minori: T7 «da due mesi»; T4 «i cardini sono allentati dal lato del portico» e la luce gialla; T4 «Le corone le ho già in testa»; T3 Ottavia «Io non ci ho mai creduto».
- **c. Agency: 1.** T6 Ginestra assaggia il pane. Nessuna terza persona.
- **d. Battute PNG riferite dal narratore: 3**
  - T2: la battuta di Baldrin tra virgolette dentro la riga del narratore («"Il paese mi ha messo qui…"»).
  - T3 «Dice che il pane si è raffreddato».
  - T3 «Ottavia ti risponde quasi subito: i malati sono i figli del bottaio…».
- **e. Menzogne senza segnale: 1.** T5: la menzogna sulla segale («Dalla segale di sempre, figliolo») con il segnale rovesciato («non lo sistema»). Al contrario, il segnale compare senza menzogna in T1 («si sistema il fazzoletto sul capo e tace»), T2 e T7: per Assenzio, che conosce il segnale, diventa inservibile.
- **f. Azioni ignorate o non risolte: 3**
  - T1: Corrado studia il nano; manca la risposta a «se ha l'aria di uno che ha fatto il soldato».
  - T2: Assenzio chiede da quanto è chiuso e chi ha la chiave; Ottavia non risponde.
  - T8: «Hai paura per lui o per te?» resta senza risposta.
- **g. Meta gestito male: 1 su 1.** T6: invece di restare nella finzione senza aggiungere azioni, il narratore fa mangiare il pane a Ginestra e allude alla risposta.
- **h. Ripetizioni: 3**
  - Il fazzoletto rosso quattro volte (T1, T2, T5, T7), con «scivola» tre volte.
  - Il respiro dietro la porta quattro volte (T1, T2, T6, T7).
  - «passi e voci basse» in T3 e T6.
- **i. Cuciture: 9**
  - T1: Ottavia «tace», poi parla.
  - T1: «fissa la chiave al collo» (la propria).
  - T3: due segni fusi.
  - T4: Baldrin sente la conversazione anche se in T3 era andato alla finestra (dalla finestra non sente), e la battuta sulle corone non c'entra.
  - T6: «il nano non risponde», poi risponde.
  - T6: la domanda meta diventa un assaggio di pane.
  - T7: Sebastiano parla come un paziente.
  - T8: il paese entra prima dei rintocchi, mentre Baldrin dice «al terzo rintocco».
  - T8: Ginestra è sulla soglia dei malati nello stesso istante in cui il paese entra.
- **j. Azioni dipendenti gestite male: 1 su 2**
  - T8: «Vengo io, ti copro le spalle»; Corrado resta nell'osteria davanti alla folla.
  - Bene: T4, la frase di Ginestra a Corrado la sente Baldrin.

### Prosa per l'orecchio (script)

- **Frasi**: 48 del narratore. Media 11,8 parole, mediana 10,5, massimo 25. Sopra 16 parole: 17%. Sopra 20: 8% (4 frasi).
- **Blocchi**: 6 turni su 8 superano le 4 frasi del narratore, 5 su 8 le 60 parole. Media 6,0 frasi e 71 parole a turno.
- **Battute PNG sopra le 2 frasi**: 3 (T3 Ottavia, T3 Baldrin, T5 Baldrin).
- **Chiusure** con domanda o invito del narratore: 0 su 8. `[invito]` a un solo PG: 0.
- **Persona**: 25 vocativi in seconda persona singolare, nessuna narrazione di PG in terza persona.
- **Lista nera N5**: «nocche diventano bianche» (T7).

### Verdetto

È la migliore delle quattro, ma resta insufficiente. L'orologio e la prosa sono tenuti bene, e le azioni hanno quasi sempre una reazione. Ha però tre difetti seri: Sebastiano cede sulla diserzione senza che la condizione sia soddisfatta e si inventa dei sintomi; il segnale di Ottavia è usato al contrario; la domanda meta diventa un pane mangiato.

---

## 4. cauto-Y (PG: Assenzio, Corrado, Ginestra)

### Rubrica

| Criterio | Punti | Prove (turno + citazione) |
|---|---|---|
| R1 Agency | **0** | Molte violazioni. T4 «la mano di Corrado non si sposta dalla balestra… sta pensando a chi dietro la porta respira così piano» (pensiero e terza persona). T4 «Ginestra, metti il dito sulla grata». T4 «Corrado, prendi la lanterna accanto alla porta e fai un passo verso la grata». T6 «Assenzio, la tua mano si chiude su un cappuccio». T8 «mentre sollevi la lanterna sopra il forestiero». **Violazione critica.** |
| R2 Conseguenze | 2 | Concrete. T4: alla porta esaminata, Ottavia avverte «Se la rompi, il paese lo sa prima di te». T5: Ottavia spezza lei stessa la pagnotta. T5: Baldrin «Spinge la borsa col piede». Ma la svolta di Baldrin in T8 non nasce da un'azione dei PG. |
| R3 Canone | **0** | Contraddizione grave: T8 Sebastiano «chi ha mangiato per primo dal paiolo? Quello è stato il primo a stare male». Accusa la zuppa, contro ciò che lui stesso sa (f_causa_segale). Inoltre T5 le bende «Strette forte sul braccio sinistro», contro f_borsa_contenuto (sono arrotolate nella borsa); T2 «Da stamattina», contro «Stasera»; T4 «grata di legno», mentre la grata è di ferro. |
| R4 Confini | **0** | Rivela segreti. T3: dopo una semplice Intuizione Ottavia confessa, e Baldrin è nella sala: «La segale è di Gualtiero, a metà prezzo. Prendila tutta, mi ha detto». Il `cede_se` (un chicco in mano senza Baldrin che senta, oppure Assenzio che chiede in nome di quando lei lo copriva) non è soddisfatto, e D6 vuole che l'Intuizione riveli solo *che* il PNG nasconde qualcosa. T5 dice di fila la verità e la menzogna («La segale viene dal mulino di Valsecca, da Gualtiero…», poi «È la segale di sempre»). T7 Sebastiano: «Sono un cerusico» ed «Ero il cerusico della Compagnia, a Roccalba», senza promessa. **Violazione critica.** |
| R5 Voce PNG | 2 | Voci riconoscibili. Baldrin: T1 «Soldato. Hai la schiena dritta…», T4 «Fermo. Con quella roba non si gioca». Ottavia: «figliolo», «il pane si fredda». Sebastiano: «Mi permetta» e lessico da medico («una presa di carbone pestato»). Macchie: T7 Ottavia usa «quello», il termine di Baldrin; il suo gesto è raddoppiato (T7). |
| R6 Prosa | 1 | Molte frasi sopra 20 parole (7, massimo 28) e turni lunghissimi (T4 187 parole). Errori: T6 «alza lo sguardo solo per la carta», T8 «scendi con lui». |
| R7 Concretezza | **3** | Preciso e multisensoriale, senza voci della lista nera. T1 «Sacchi, una madia, una scala che scende»; T4 «un filo d'aria fredda che sa di segale»; T6 «A ogni finestra brucia una candela, ferma»; T8 «Si tocca la tasca dove tiene il fazzoletto. La mano gli trema». |
| R8 Restituzione | **0** | Monologhi e scene oltre il punto di reazione. T4 ha 12 righe; T8 ne ha 17, con Baldrin e Ottavia che parlano a PG appena usciti e Baldrin che da solo «spezza il pane… Questo pane lo volevo portare a Ilde». Le domande del narratore sono 0. |
| R9 Spotlight | **3** | Equilibrato (vocativi: Ginestra 10, Corrado 12, Assenzio 11) e ogni PG ha un momento: Corrado in T1 («Soldato…») e T7 (Roccalba), Assenzio in T3 («Per te ho mentito alle guardie, figliolo»), Ginestra in T5 (la pagnotta) e T7 (il rimedio). Ma questi momenti si reggono su fughe e violazioni di agency. |
| R10 Ritmo | 1 | La posta è detta (T6 «Al terzo rintocco apro questa porta»), ma la curva resta piatta: solo due momenti con segni (T4, T7), nessun rintocco in otto turni. T6 e T8 sono trascinati. |
| R11 Mondo proattivo | 1 | L'orologio quasi non avanza: due segni, di cui il secondo (T7, il sasso) ripete la variante di T4. La minaccia è solo dichiarata da Baldrin. |
| R12 Indizi | 2 | Molte piste (chicchi T5, cicatrice T4/T7, rimedio T7, carbonai T8, cane T3/T8), ma regalate: la confessione e l'identità di Sebastiano arrivano senza indagine, e così l'ingegno viene scavalcato. Premiati: T1 lo sguardo da soldato di Corrado, T4 l'esame della porta di Assenzio. |

**Totale 15/36, media 1,25.** Violazioni critiche su R1 e su R4.

### Conteggi

- **a. Fughe: 6** (4 gravi)
  - T3: confessione di Ottavia (Gualtiero, metà prezzo), senza `cede_se`, con Baldrin che può sentire.
  - T5: la stessa verità ripetuta in pubblico, con più dettagli («Valsecca… Sei sacchi»).
  - T7: «Sono un cerusico».
  - T7: Compagnia, Roccalba, motivo della diserzione, senza promessa.
  - T4 (lieve): la cicatrice esce grazie a una lanterna che il narratore fa prendere a Corrado.
  - T1 (lieve): «una scala che scende» dietro la tenda, cioè un pezzo di f_botola, quando nessun PG è andato nel retro.
- **b. Canone inventato: 9** (1 grave)
  - Grave: T8 «dal paiolo».
  - Medie: T5 le bende sul braccio; T8 la lanterna «sopra il forestiero», che è chiuso a chiave.
  - Minori: T2 «Da stamattina»; T2 «Ottavia mi ha dato le chiavi»; T3 «la fontana vicino al pozzo»; T4 «grata di legno»; T4 «da sessant'anni»; T6 il cappuccio sul bancone.
- **c. Agency: 8** (3 lievi)
  - T1 (lieve): il punto di vista si sposta dietro la tenda senza che nessuno ci vada.
  - T4: la mano e il pensiero di Corrado.
  - T4: il dito di Ginestra sulla grata.
  - T4: Corrado prende la lanterna.
  - T6 (lieve): «Ginestra, tu chiedi di vedere il pane».
  - T6: la mano di Assenzio sul cappuccio.
  - T8 (lieve): «Corrado, prendi la lanterna e scendi con lui».
  - T8: «mentre sollevi la lanterna».
  - Terza persona: 1 (T4).
- **d. Battute PNG riferite dal narratore: 2**
  - T6 «ti sussurra di lasciarlo stare».
  - T8 «Ottavia ti risponde con un tono piatto»: dice che risponde, ma senza contenuto.
- **e. Menzogne senza segnale: 0.** In T5 il segnale c'è ed è letterale, ma arriva subito dopo la verità.
- **f. Azioni ignorate o non risolte: 3**
  - T3: alle domande di Corrado (nome, provenienza, ferito) non risponde nessuno.
  - T6: Corrado chiede di parlare attraverso la porta; il narratore lo scambia per «la domanda sull'ostessa e sui turni» e Baldrin non risponde.
  - T8: la domanda di Assenzio resta senza contenuto.
- **g. Meta gestito male: 1 su 1.** T6: «Ottavia alza lo sguardo solo per la carta» è una frase senza senso, e trasforma la domanda meta in un'azione di gioco mai dichiarata. Non svela niente.
- **h. Ripetizioni: 5**
  - La cicatrice rivelata due volte (T4 e T7).
  - Il mestolo sul paiolo due volte di fila (T7).
  - Lo stesso elenco dei malati detto da Baldrin e da Ottavia (T8).
  - La segale: T3 e poi T5.
  - I malati: T3 e poi T8.
- **i. Cuciture: 14**
  - T1: salto dietro la tenda.
  - T3: la confessione come risposta a un'Intuizione, prima di qualunque domanda sulla segale.
  - T3: «Ottavia, il cane…», un vocativo a un PNG.
  - T4: la cicatrice si vede prima che arrivi la lanterna.
  - T4: Corrado con la mano sulla balestra, mentre in T2 l'aveva «lontana dalla balestra».
  - T5: verità, poi menzogna.
  - T5: la mollica «grigia», poi «chiara».
  - T6: parafrasi sbagliata della richiesta di Corrado.
  - T6: Ottavia risponde fuori luogo («Se rispondo prima del tempo…»).
  - T6: vista dalla finestra non richiesta, e il cappuccio sul bancone.
  - T8: «scendi con lui», mentre Ginestra esce con Corrado.
  - T8: i PNG parlano a PG usciti; «Ginestra, Ottavia non ti guarda» quando Ginestra è fuori.
  - T8: la lanterna sopra un prigioniero chiuso a chiave.
  - T8: la domanda di Sebastiano sul paiolo; Ottavia risponde sul cane a una domanda che nessuno ha fatto.
- **j. Azioni dipendenti gestite male: 2 su 2**
  - T4: alla frase di Ginestra a Corrado risponde il narratore, decidendo la reazione di Corrado.
  - T8: «Vengo io», mandato altrove con «scendi con lui».

### Prosa per l'orecchio (script)

- **Frasi**: 79 del narratore. Media 12,3 parole, mediana 11, massimo 28. Sopra 16 parole: 25%. Sopra 20: 9% (7 frasi).
- **Blocchi**: 7 turni su 8 superano le 4 frasi del narratore e le 60 parole. Media 9,9 frasi e 121 parole a turno: T4 ha 13 frasi e 187 parole, T8 ne ha 15 e 151.
- **Battute PNG sopra le 2 frasi**: 11.
- **Chiusure** con domanda o invito del narratore: 0 su 8. `[invito]` a un solo PG: 0.
- **Persona**: 33 vocativi in seconda persona singolare. Una narrazione in terza persona (T4). Un vocativo a un PNG (T3 «Ottavia, il cane…»).
- **Lista nera N5**: nessuna voce.

### Verdetto

È la più ricca di immagini e di momenti personali. Proprio per questo è la più pericolosa: regala i due segreti centrali della scena (la segale di Gualtiero e il cerusico disertore) senza indagine e senza condizioni. Muove di continuo i PG e chiude con monologhi che vanno oltre il punto di reazione. L'orologio resta fermo.

---

## 5. Confronto per copione

### caotico: Y meglio di X, di poco

- **Agency**: X ha 5 violazioni (T2 Corrado raccoglie i dadi, T7 li raccoglie Ginestra, T8 «Teodora, esci dal ripostiglio»), Y ne ha 2 (T4 «Corrado non ti lascia vedere»). X incorre nella violazione critica (R1 = 0).
- **Prosa**: Y ha frasi da 10,8 parole in media e nessuna sopra 20. X arriva a 14,8 di media e al 15% sopra 20, con frasi senza senso (T2 «il sacchetto… dentro la bocca di Baldrin»).
- **Meta**: Y non conferma e resta nella finzione. X mette «il cerusico» in bocca a Baldrin (T6).
- **Però X gioca meglio la scena**: 5 indizi contro un indizio e mezzo; Sebastiano parla (T1, T5); le azioni hanno reazioni (T4 Ottavia e Baldrin). Y lascia Sebastiano muto, rompe l'incontro di Teodora (T5 «La chierica non viene a quest'ora») e porta il paese alla porta in T7 senza che i PG abbiano piste.
- **Comuni**: nessuna chiusura mirata a un solo PG e una contraddizione grave col canone ciascuno. Nel complesso la distanza è minima (16 contro 15): Y vince sulle regole che il manuale considera critiche, X sul gioco.

### cauto: X nettamente meglio di Y

- **Fughe**: Y ne ha 6, di cui 4 gravi (la confessione di Ottavia dopo una semplice Intuizione in T3, ripetuta in pubblico in T5; «Sono un cerusico» e la diserzione in T7). X ne ha 2 (la diserzione in T7, l'allusione «brucia in gola» in T6).
- **Agency**: Y ne ha 8 (pensieri di Corrado, la lanterna, il dito di Ginestra, il cappuccio di Assenzio). X ne ha 1 (Ginestra assaggia il pane, T6), che però è grave.
- **Monologhi**: Y ha in media 9,9 frasi del narratore e 121 parole a turno, con T8 a 17 righe. X ha 6,0 frasi e 71 parole.
- **Coerenza**: Y ha 14 cuciture (verità e menzogna di fila, mollica grigia e poi chiara, Sebastiano che accusa il paiolo). X ne ha 9, ma con due contraddizioni gravi (Sebastiano con i sintomi, il paese dentro prima dei tre rintocchi).
- **Dove Y è meglio**: più concreta (R7 = 3) e dà un momento a ogni PG (R9 = 3), ma ci arriva regalando i segreti. X tiene l'orologio con i segni da 1 a 5 in ordine (T2–T6).

---

## 6. Tabella complessiva

| Voce | caotico-X | caotico-Y | cauto-X | cauto-Y |
|---|---|---|---|---|
| R1 Agency | **0** | 1 | 1 | **0** |
| R2 Conseguenze | 2 | 1 | 2 | 2 |
| R3 Canone | 0 | 0 | 0 | 0 |
| R4 Confini | 1 | 1 | **0** | **0** |
| R5 Voce PNG | 2 | 1 | 1 | 2 |
| R6 Prosa | 0 | 2 | 2 | 1 |
| R7 Concretezza | 2 | 2 | 2 | 3 |
| R8 Restituzione | 1 | 1 | 1 | 0 |
| R9 Spotlight | 2 | 2 | 2 | 3 |
| R10 Ritmo | 1 | 2 | 2 | 1 |
| R11 Mondo proattivo | 2 | 2 | 3 | 1 |
| R12 Indizi | 2 | 1 | 2 | 2 |
| **Totale (su 36)** | **15** | **16** | **18** | **15** |
| Media | 1,25 | 1,33 | 1,50 | 1,25 |
| Violazioni critiche (0 su R1/R4) | R1 | nessuna | R4 | R1, R4 |
| a. Fughe (dubbie a parte) | 1 (+1) | 1 | 2 (+1) | 6 (4 gravi) |
| b. Canone inventato (gravi) | 5 (2) | 8 (1) | 6 (2) | 9 (1) |
| c. Agency (lievi) | 5 (2) | 2 (1) | 1 (0) | 8 (3) |
| d. Battute PNG riferite | 2 | 4 | 3 | 2 |
| e. Menzogne senza segnale | 0 | 0 | 1 | 0 |
| f. Azioni ignorate o non risolte | 2 | 3 | 3 | 3 |
| g. Meta gestito male | 1/1 | 0/1 | 1/1 | 1/1 |
| h. Ripetizioni | 6 | 3 | 3 | 5 |
| i. Cuciture | 12 | 11 | 9 | 14 |
| j. Azioni dipendenti gestite male | 2/5 | 3/5 | 1/2 | 2/2 |
| Parole per frase, media / mediana | 14,8 / 15 | 10,8 / 10 | 11,8 / 10,5 | 12,3 / 11 |
| Frasi oltre 16 / oltre 20 parole | 40% / 15% | 15% / 0% | 17% / 8% | 25% / 9% |
| Frasi del narratore per turno (media) | 6,5 | 6,6 | 6,0 | 9,9 |
| Turni oltre 4 frasi (N2) | 6/8 | 8/8 | 6/8 | 7/8 |
| Battute PNG oltre 2 frasi (D3) | 7 | 2 | 3 | 11 |
| Chiusure con domanda del narratore | 0/8 | 2/8 | 0/8 | 0/8 |
| PG narrati in terza persona | 1 | 1 (+1 dubbia) | 0 | 1 |

Tutte e quattro hanno la media sotto 2: secondo il protocollo del §9 vanno corrette tutte. Tutte e quattro prendono 0 su R3.

---

## 7. Le tre debolezze principali di ciascuna, con la correzione

### caotico-X

1. **Muove i PG** (T2 «Corrado li raccoglie», T7 «Ginestra, tu raccogli i dadi», T8 «Teodora, esci dal ripostiglio»).
   *Correzione*: applicare davvero la guardia E5. Ogni verbo che ha per soggetto un PG deve corrispondere all'azione dichiarata; altrimenti la frase si riscrive come descrizione del mondo. Un filo chiuso da un PNG (il rifiuto della partita) non si riapre.
2. **Si contraddice nello stesso turno** (T4 mollica grigia e poi «pane bianco»; T4 «non dice nulla» e poi la battuta; T8 «le voci si spengono» e poi «Sta ancora cantando»).
   *Correzione*: dare al Narratore il testo dell'indizio come stringa fissa da non parafrasare. Aggiungere un controllo di coerenza dentro il turno: lo stesso oggetto non può cambiare attributi, e ogni oggetto si descrive una sola volta per turno.
3. **La domanda meta diventa una battuta che svela informazioni** (T6 Baldrin: «Il cerusico non l'ho visto»). In più non chiude mai con una domanda (0 su 8).
   *Correzione*: un percorso dedicato alle domande meta. Il contenuto fuori gioco non passa mai in bocca a un PNG; si risponde nella finzione indicando la via legittima («Corrado, per saperlo devi vederlo in faccia») oppure sul telefono. Le parole chiave private di Corrado (cerusico, taglia, Grifo) vanno nella cassaforte E6 finché il giocatore non le dice in gioco. Infine E8: l'ultima frase deve essere una domanda a un solo PG.

### caotico-Y

1. **L'incontro di Teodora con il prigioniero va in pezzi** (T5 Baldrin: «Chi siete? La chierica non viene a quest'ora», con il voi; Sebastiano non parla mai, salvo un «Acqua» riferito in T2).
   *Correzione*: quando un PG si rivolge a un PNG, risponde quel PNG con la sua chiamata separata (D1, E2). Nel contesto di ogni PNG vanno l'identità e il ruolo dei PG presenti, e serve un validatore del registro (Baldrin dà sempre del tu).
2. **Fuga attraverso una battuta riferita** (T3: «dice piano, di quella segale ne ho presa tanta»), più altre 3 battute riferite.
   *Correzione*: un validatore D1 che rigenera ogni segmento del narratore contenente discorso di un PNG (caporali, «dice che», «ripete»). Gli argomenti su cui un PNG mente (la segale) passano solo dalla chiamata di quel PNG, con il suo `mente_su`.
3. **Orologio a scatto senza cause e senza conseguenze** (tick senza segno visibile in T2 e T5; T3 fonde due segni; tre rintocchi già in T7; T8 Corrado esce in mezzo alla folla e non succede niente). Inoltre 3 azioni dipendenti su 5 sono gestite male.
   *Correzione*: gli orologi li tiene il Motore (E9). Si avanza solo per la regola di ritmo o per un'azione rumorosa, un segno visibile per tick, mai due nella stessa risposta. A orologio pieno si applica il `taglio`. Nel contesto vanno anche le azioni «la seguo», «anch'io»: risolverle per prime e in coerenza con quella del leader.

### cauto-X

1. **Sebastiano cede senza condizioni e si inventa malato** (T7: «Roccalba l'ho lasciata da due mesi…» senza promessa e con Baldrin presente; «Mani e piedi bruciano, sì. Tremo…»).
   *Correzione*: il Motore controlla ogni `cede_se` prima della chiamata del PNG: c'è una promessa registrata? Baldrin è fuori portata d'orecchio? Se no, il PNG riceve l'ordine di dire la sua versione con il segnale. Nella scheda passata al PNG vanno anche gli invarianti dell'aspetto, perché non si contraddica sul proprio corpo.
2. **Il segnale di Ottavia è usato al contrario** (compare senza menzogna in T1, T2 e T7; in T5 la menzogna arriva con «le scivola sugli occhi, e lei non lo sistema»).
   *Correzione*: il `segnale` lo emette solo il Motore, alla lettera, insieme a una menzogna del `mente_su`. Il fazzoletto rosso è vietato in ogni altra frase, così il sapere privato di Assenzio resta utile.
3. **La domanda meta diventa un pane mangiato** (T6: «Ginestra, il pane è dolce per un attimo, poi brucia in gola come una spina»). Inoltre il paese entra prima dei tre rintocchi (T8) e non c'è mai una domanda in chiusura.
   *Correzione*: una risposta tipo per il meta, che resta nella finzione, non aggiunge azioni del PG e rimanda a ciò che il PG ha già trovato o sa sul telefono. La guardia E5 deve coprire anche i verbi del mangiare e del percepire (assaggiare, sentire in bocca). Il climax è vincolato al sesto segno, e serve una chiusura E8 a un solo PG.

### cauto-Y

1. **Regala i segreti centrali** (T3: confessione di Ottavia dopo un'Intuizione, con Baldrin che sente; T5 verità e menzogna di fila; T7 «Sono un cerusico» e la diserzione).
   *Correzione*: un cancello `cede_se` nel Motore, come per cauto-X. L'Intuizione deve restituire solo «nasconde qualcosa» (D6). Il Motore tiene lo stato di ogni menzogna (detta, ceduta) per impedire che il PNG passi dalla verità alla bugia.
2. **Agency a raffica** (8 violazioni: T4 i pensieri e la lanterna di Corrado, il dito di Ginestra; T6 il cappuccio di Assenzio; T8 la lanterna «sopra il forestiero»).
   *Correzione*: la guardia E5 più un divieto esplicito di «azioni di contorno» per i PG. Il narratore descrive il mondo e i PNG; i PG fanno solo quello che hanno dichiarato.
3. **Monologhi oltre il punto di reazione** (in media 9,9 frasi del narratore a turno; T4 187 parole; T8 17 righe, con PNG che parlano a PG usciti e la svolta di Baldrin su Ilde arrivata da sola; 0 domande in chiusura; orologio quasi fermo).
   *Correzione*: un tetto rigido per turno, cioè 2 frasi per ogni azione di PG più 1 segno del mondo, poi la chiusura E8 obbligatoria a un solo PG. Le evoluzioni dei PNG («se capisce che è il pane…») scattano solo da un evento registrato causato dai PG. Il ritmo minimo dell'orologio (un segno ogni due risposte) lo impone il Motore.

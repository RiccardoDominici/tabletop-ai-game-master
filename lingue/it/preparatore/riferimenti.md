# Riferimenti del Preparatore: esempi in italiano

Gli esempi in italiano che stavano nei file di `.claude/skills/preparatore/riferimenti/`, riportati alla lettera e
raggruppati per file di origine. Ogni sezione (es. «arco.md §1») indica il punto dove nel file di riferimento si trova
il rimando «lingue/it/preparatore/riferimenti.md». La versione inglese è in `lingue/en/preparatore/riferimenti.md`, con
gli stessi numeri di sezione.

## arco.md

### §1 Esempio di campagna.yaml → preparazione.arco
```yaml
preparazione:
  arco:
    premessa: "Una frase: che cosa succede in questa storia."
    domanda: "Il Borgo Basso sarà ancora del paese alla fine dell'inverno?"   # da sì o no [V]
    fronte: fronte_debiti            # il fronte di campagna (preparazione.fronti, livello: campagna) [V]
    orologio: o_mercante             # l'orologio d'arco, tra gli orologi_extra del fronte [V]
    tappe:                           # 3–6, in ordine: ciò che il fronte ottiene se nessuno lo ferma [V]
      - {id: tp_lettere, segno: 1, cosa: "Il mercante compra i debiti del Borgo.", segno_visibile: "Lettere con il sigillo nero sulle porte.", entro_sessione: 1}
      - {id: tp_sfratti, segno: 2, cosa: "…", segno_visibile: "…", entro_sessione: 2}
      - {id: tp_darsena, segno: 4, cosa: "Il Borgo diventa una darsena.", segno_visibile: "…", entro_sessione: 3}
    ritmo:                           # come avanza tra le sessioni (il «mondo si muove», passo 3) [V]
      per_sessione: 1                # segni a fine sessione, se i PG non lo ostacolano
      accelera: ["un PG firma un foglio del mercante"]     # condizioni osservabili nel registro o nello stato
      rallenta: ["i PG mostrano il registro al consiglio"]
    atti:                            # 2–3, sessioni consecutive dalla prima all'ultima [V]
      - {id: atto_1, sessioni: [1], domanda: "I PG scopriranno chi compra i debiti?"}
      - {id: atto_2, sessioni: [2, 3], domanda: "Il Borgo resisterà al mercante?"}
    finali:                          # 2–4: ogni stato dell'orologio d'arco ha almeno un finale [V]
      - {id: fn_salvo, orologio: {min: 0, max: 2}, quando: "il mercante non arriva alla darsena", esito: "…"}
      - {id: fn_diviso, orologio: {min: 3, max: 3}, quando: "…", esito: "…"}
      - {id: fn_perso, orologio: {min: 4, max: 4}, quando: "la darsena si fa", esito: "…"}
    png_ricorrenti: [png_irma, png_bruno, png_mercante, png_console]   # 4–6, con la scheda in png/ [V]
    fili:                            # promesse, debiti, misteri: ognuno torna da qualche parte [V]
      - {id: filo_tetto, cosa: "Il tetto di Irma", torna_in: [2]}
    sessioni:                        # una riga per ogni sessione dopo la prima [V]
      - {numero: 2, abbozzo: "Il consiglio vota sugli sfratti, e il mercante compra i voti.", tappe: [tp_sfratti], png: [png_console], fili: [filo_tetto]}
      - {numero: 3, abbozzo: "La notte della darsena.", tappe: [tp_darsena], png: [png_mercante]}
```

## immagini.md

### §1 Il ritratto e le situazioni
- «in ponte-lanterne non trovava `studio_cassa` di Vischi» (il motore cerca per somiglianza, e non la trovava)
- «Le invarianti in italiano vanno bene.» (regola 1: le invarianti stanno nella lingua della campagna)
- `{id: senza_cappuccio, dopo: [i_cicatrice], prompt: "hood lowered, a thin white scar splits his left eyebrow"}`
  (il prompt è già in inglese, come vuole la regola 1)

## motore.md

### §0 Il caso di prova
- «Nella prova di «Le nozze di neve» tre dei cinque problemi gravi della revisione venivano da qui.»

## mestiere.md

### §0 Le prove
- «la scena di prova «Il pane dei lumi» (campagne/prova-f0)»
- «la prova cieca della skill con «Il ponte delle lanterne» (campagne/ponte-lanterne, quattro scene, con le sue NOTE_SULLA_SKILL.md)»

### §1 Situazione
- «due viaggi che ci stavano tra due tocchi mentre la storia diceva «uno solo», una barca troppo piccola per i gruppi, una riga del libro datata prima del fatto che provava, una catena che funzionava al contrario»

### §2 PNG
- «tu e i nomi di mestiere; tu e un lei freddo; lei a tutti. Più tre lessici (forgia, cucina, medicina)»
- «Il «voi» singolare non va usato. A voce sembra un plurale.»

### §3 Menzogne, segnali, cede_se
- `segnale`: «si sistema il fazzoletto rosso e guarda le ceste»; «chi ha le braccia infarinate non «si pulisce le mani pulite»»
- `cede_se`: «Un PG le mette in mano un chicco nero dei suoi sacchi»; «quando si fida»; la parola che unisce le condizioni: «Oppure»
- «i nomi dei tre testimoni» (la domanda che una menzogna non deve far cedere se il canone ha dei nomi)

### §4 Indizi
- «sa di bruciato e tinge le dita, come la polvere di un braciere spento»
- «carbone» (la parola che dicono i giocatori)
- «aprire un sacco; spezzare una pagnotta» (modi di `come_si_trova`)
- «il cane che trema» (indizio proattivo)
- «il campanaccio della Duchessa «suonava forte»»; «il campanaccio grande della Duchessa non suona»; «la pietra intorno al leone la descrive la battuta»; «tutti tranne quello grande»
- «chi ha la lettera, quanti fratelli ha la nonna» (fatti che l'improvvisazione tende a contraddire)
- «il marchio sul sacco e i chicchi dentro»

### §5 Orologio
- «il canto si interrompe, un sasso, un rintocco, le lanterne, la maniglia, i tre rintocchi»
- «il nano va alla finestra e la grata resta senza orecchie per un momento»

### §6 Scelta
- «la verità salva il forestiero, ma sposta la rabbia del paese sull'ostessa»

### §7 Scrivere per l'orecchio
- «dietro, qualcuno tossisce» (pronome ambiguo)
- «si alza dal forno» suona come «esce dal forno» (verbo che si legge in due modi)
- «Brann solleva il coperchio.» (annuncio di un'azione, manuale N15)

### §8 Lezioni delle prove (tabella)
- «Il narratore conclude al posto dei PG («non è veleno, è carbone»)»
- «Tullio, il custode, grida»; «niente nome con la virgola a inizio frase»
- «sa del leone» trovava «Rosa del leone»
- `seb_cicatrice_…` e `quando` con «botola»
- «Bice (tabitha)» portata nel Borgo di «Rosa (nadine)»
- «il cane e la borsa» ripetuti tre volte
- «il leone» e la regola «il narratore non dice mai che il leone è stato calato»
- «il massaro benedice» (ruolo di riserva: se manca la chierica)

### §9 Più scene
- «Il terzo tocco» (evento come nodo)
- «Il ponte resta aperto dopo il tocco» (scelta da cui parte un orologio)
- «La rampa bassa va sott'acqua» (segno che si sente ovunque)
- «la campana, la voce del fiume, le grida dal ponte»
- «il ponte all'imbrunire» e «il ponte a mezzanotte»
- «la chiesa del paese» (luogo noto ai PG)

### §10 Musica, ambienti e temi
- «un'osteria dove si cerca un colpevole è `esplorazione_tesa`, non `taverna_calda`»
- «niente acqua che scorre dove è ghiacciata, niente grilli d'inverno, niente folla in una stanza chiusa a chiave»
- «il bugiardo cordiale suona cordiale; il modo frigio non va a chi mente»

## repertorio.md

### §3 id, quando, temi
- id: `nar_volto_candela` (contro `seb_cicatrice_candela`); `bal_chi_malato` (contro `bal_carbonai`); `ott_segale_domanda`; `zel_macchia_privato`; `zel_presa_macchia` («Zelia presa»)
- quando: «un PG chiede a Ettore perché non salì al Sasso»; «un PG mostra a Ottavia un chicco nero, dove Baldrin non sente», non «Ottavia confessa»
- parole che dicono chi mente: mente, bugia, menzogna, confessa, segreto, nasconde, verità
- temi: spezzo, spezzare, pezzo, pagnotta («pagnott» prende pagnotta e pagnotte, ma «ponte» prende anche «pontieri»)
- parole generiche: porta, chi, notte, pane, guardo, apro, uomo, dentro
- parole con due sensi: «tocco» (il rintocco e «io tocco»); scelta: «rintocco», «campana»
- battute di prosa: «Dentro la mollica ci sono chicchi neri», non «Spezzi la pagnotta: dentro…», che dopo l'annuncio «Ginestra spezza una pagnotta» suonerebbe due volte

### §4 Confessioni (condizioni di cede_se)
- «in privato», «dove X non sente»
- «quando Assenzio le chiede…»
- «quando un PG le mostra il chicco nero» (`i_speroni_neri`)
- «dopo aver detto la sua versione»
- «al terzo rintocco»
- la parola «oppure» nei cancelli: «se i PG hanno una qualunque delle tre prove»

### §6 Altre battute
- «Ottavia brucia i sacchi», «Baldrin avvolge la mollica per la figlia» (iniziative)
- «Il mulo, no.» (battuta che presuppone un'altra battuta facoltativa)
- «Ve l'ho già detto. Il mulino del paese» (variante che accorcia la versione)
- «Giù le mani dalle ceste!» (rivolgersi a un PG ignoto senza accordi di genere); «Fermo!» (da evitare)
- «sorella», «soldato» (vocativi di mestiere)

### §7 Parole segrete
- «cerusico»: il suo aggancio pubblico («il suo cerusico disertore») e il fatto («il forestiero è un cerusico»)
- «la lanterna in cantina»; regex `lanterna[^.]{0,40}(cantina|botte)`
- «sa del leone» e «Rosa del leone»; «tetto» e «tettoia»
- «Pontieri dell'Onda» (gilda) contiene «onda»

## schema.md

### stile.yaml
- `stile` del PNG: «Frasi di N-M parole …»; «Frasi di due-sei parole» → 9 al massimo; numeri in lettere: uno… venti

### campagna.yaml
- `nome`: «Il paese vuole un colpevole» (l'ostacolo, non l'azione)
- `cosa_sai_fare`, `colli_di_bottiglia`: «Solo se la propone chi la conosce»
- `segno`: «o_mercante: il pegno non è arrivato all'alba»
- `concetto`: «due frasi»; `aggancio`: nessun segreto

### scena
- `descrizione`: «pianta del luogo + CHI SENTE COSA»
- `domanda_drammatica: "…?"`; `apertura: "…?"`

### PNG
- `alias`: nano, ostessa, forestiero (e da evitare: vecchio, ragazza)
- `lettura`: «1-2 frasi, max 35 parole, da leggere a voce»
- `invarianti`: in italiano
- `registro`: «tu | voi | lei, e con chi cambia»
- `stile`: «Frasi di due-sei parole»; `atteggiamento_pg`: «una sessione sola: niente crescita»
- `segnale`: «si sistema il fazzoletto rosso e guarda le ceste»

### audio
- `tonalita`: «re dorico»; note: do…si, C…B
- `modo`: ionio, dorico, frigio, lidio, misolidio, eolio (o maggiore, minore)
- `umore_base` e `umore_iniziale`: `esplorazione_tesa`, `taverna_calda` (valori del vocabolario, non cambiano)

### stato
- `testo`: «Irma ha giurato a Tobia che pagherà il tetto senza il mercante.»
- `citazione`: «Ti giuro che pagherò il tetto»
- `oggetto`: «lanterna d'argento»
- `o_processione`, `o_mercante`, `pg_tobia`: esempi di id e di motivo

## tra-le-sessioni.md
- Nessun esempio in italiano: il file usa solo termini e forme di `schema.md`.

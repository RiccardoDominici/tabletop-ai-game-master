# Tra le sessioni (bozza della fase D3)

Che cosa fa il Preparatore tra una sessione e l'altra di una campagna sopra la one-shot (docs/strati.md,
«Il ciclo tra le sessioni»). Oggi il validatore rifiuta i livelli sopra la one-shot (`LIVELLO.non_supportato`):
questa procedura entra in uso con la fase D2, quando il server gioca i pacchetti `sessioni/<nn>/` e scrive i
registri. Le classi `STATO` e `CONTINUITÀ` del validatore sono già pronte, e la seguono.

## Il principio: il registro è la prova, lo stato è la sua lettura
- **Il registro** (`sessioni/<nn>/registro.yaml`) lo scrive il server a fine sessione, in modo deterministico,
  dall'archivio (`sessioni.sqlite`). Nessun modello lo scrive o lo ritocca: se ha una `firma`, il validatore
  controlla che il contenuto torni (`STATO.registro`).
- **Lo stato** (`stato/stato.yaml`) lo scrive il modello forte. È la lettura del registro: che cosa è successo
  davvero, che cosa è cambiato per i PNG, che cosa resta aperto. Ogni fatto cita la sua prova, e il
  validatore la cerca nel registro (`STATO.fonte`). Così un fatto inventato, o letto male, non arriva alla
  sessione dopo.
- **Il canone preparato non si tocca; il gioco aggiunge** (docs/strati.md, principio 5). `campagna.yaml →
  canone` resta come il Preparatore l'ha scritto (i fatti `f_`): è una regola del framework, che gira da solo.
  I fatti di gioco sono `g_` e stanno nello stato; quando il gioco cambia un fatto preparato, il fatto `g_` lo
  dichiara con `supera: [f_…]`. Un fatto di gioco non si cancella: si supera con uno più recente (`superato_da`).
- **Ciò che i PG hanno scoperto smette di essere segreto** (principio 6). Il pacchetto porta le sue parole
  segrete e le schede aggiornate dei PNG ricorrenti, che per quella sessione sostituiscono quelle della campagna.

## I sei passi, in pratica
Il lavoro tra le sessioni lo fa un agente con questa skill, come la preparazione di una campagna.
`scripts/tra-sessioni.sh` fa le parti deterministiche, e si ferma ogni volta dove deve scrivere l'agente.

1. **Fine sessione** (il master, dal pannello). Il server scrive `sessioni/<nn>/registro.yaml` e
   `trascrizione.yaml`. Non si toccano.
2. **Registro e mossa del mondo**, deterministici:
   ```
   scripts/tra-sessioni.sh campagne/<id> <n>
   ```
   Controlla che il registro ci sia (e, se `scripts/registro.sh` lo sa fare, che sia quello dell'archivio),
   stampa che cosa è successo, turno per turno, e la mossa che le regole fisse dell'arco danno da sole:
   l'orologio d'arco più `ritmo.per_sessione`, e le condizioni di `accelera` e `rallenta` da giudicare.
3. **Stato** (l'agente). Aggiorna `stato/stato.yaml` fino a `dopo_sessione: <n>`:
   - un fatto per ogni cosa successa che conta dopo: chi ha saputo che cosa, chi è morto o ferito, dove sono
     andati i PNG, che cosa hanno promesso i PG e a chi, quali fili restano aperti;
   - ogni fatto con la sua `fonte`: il turno e una citazione esatta di ciò che si è detto o scritto, oppure un
     evento del turno (una battuta uscita, un indizio rivelato, un fatto reso noto, un segno d'orologio);
   - niente riassunti a memoria: se una cosa non è nel registro, non è successa;
   - **il mondo si muove**: gli orologi dei fronti (e, dal livello campagna, delle fazioni) avanzano con le
     loro regole; ciò che cambia fuori scena è un fatto con `fonte: {tra_sessioni: <n>, motivo}`, e il motivo
     nomina l'orologio, il pericolo o il fronte che lo produce (`o_…`, `p_…`, `fronte_…`). I PG non lo sanno
     (`noto_ai_pg: false`) finché non lo vedono in gioco.
4. **Scheletro del pacchetto**, deterministico:
   ```
   scripts/tra-sessioni.sh campagne/<id> <n> --pacchetto
   ```
   Si ferma se lo stato ha errori (`STATO`). Poi scrive, senza mai sovrascrivere, lo scheletro di
   `sessioni/<n+1>/`: `sessione.yaml` con `pieni_all_inizio` dallo stato e i fili aperti da decidere; le schede
   intere dei PNG ricorrenti cambiati in gioco, con `sa`, `non_sa` e atteggiamento presi dallo stato; le parole
   segrete in uso, senza quelle dei fatti che i PG ormai sanno.
5. **Sessione dopo** (l'agente). Gli stessi passi della skill per una one-shot, a partire da stato e arco:
   - il riassunto da leggere all'apertura (tre-cinque frasi, dai fatti dello stato), le scene, il repertorio;
   - per ogni filo, `come: ripreso` o `rimandato`; nelle schede copiate, `perche` e `vuole` riscritti;
   - le parole segrete dei segreti nuovi: una per ogni fatto ancora segreto che entra nella sessione;
   - la scheda della campagna non si tocca: resta la versione iniziale.
6. **Verifica e risorse**:
   ```
   scripts/tra-sessioni.sh campagne/<id> <n> --verifica
   ```
   Controlla che il pacchetto sia scritto (riassunto, scene con la scheda, repertorio, fili decisi), lancia il
   validatore sulla sessione `<n+1>` (`valida_campagna.py --rigoroso --sessione <n+1>`; finché non c'è,
   `--solo STATO,CONTINUITÀ,ARCO`), poi `scripts/prepara.sh` sul pacchetto, quando saprà farlo (fase D2).

## stato/stato.yaml
```yaml
versione: 1
dopo_sessione: 1                     # l'ultima sessione che lo stato riflette (i suoi registri esistono) [V]

fatti:                               # ciò che è successo in gioco, in ordine; mai cancellati, solo superati
  - id: g_irma_promette              # g_<nome> [V]
    testo: "Irma ha giurato a Tobia che pagherà il tetto senza il mercante."
    fonte: {sessione: 1, turno: 6, citazione: "Ti giuro che pagherò il tetto"}   # sottostringa ESATTA del turno [V]
    # fonte: {sessione: 1, turno: 5, evento: {indizio: i_botte}}   # un evento del turno: battuta, indizio,
    #                                                              # fatto, menzogna, orologio [V]
    # fonte: {tra_sessioni: 1, motivo: "o_mercante avanza: il pegno non è arrivato"}   # fuori scena: il motivo
    #                                                              # nomina l'orologio o la regola, che esiste [V]
    noto_ai_pg: true                 # i PG lo sanno (lo hanno visto o sentito)
    rende_noti: [f_bruno_visto]      # fatti del canone che i PG ora sanno [V esistono]
    supera: [f_…]                    # fatti del canone che il gioco ha cambiato [V esistono]
    superato_da: g_…                 # facoltativo: il fatto più recente che lo supera [V viene dopo]
    effetti:                         # facoltativi: che cosa cambia nello stato derivato
      png: {png_bruno: {vivo: false, dove: "la chiesa", atteggiamento: {pg_lia: amichevole}, sa: [f_…, g_…]}}
      oggetti: {ogg_lanterna: {nome: "lanterna d'argento", chi: pg_tobia, stato: preso}}   # preso, perso, distrutto…
      promesse: {pr_irma_tetto: {chi: png_irma, a: pg_tobia, cosa: "…", stato: aperta}}  # aperta, mantenuta, tradita, sciolta
      fili: {filo_mercante: aperto}  # aperto o chiuso

orologi:                             # ogni orologio a fine sessione, e dopo gli avanzamenti fuori scena
  o_processione: {pieni: 4, fonte: {sessione: 1}}          # = lo stato finale del registro [V]
  o_mercante: {pieni: 1, fonte: {tra_sessioni: 1, motivo: "o_mercante: il pegno non è arrivato all'alba"}}

pg:                                  # la crescita dei PG
  pg_tobia: {livello: 1, fonte: {tra_sessioni: 1, motivo: "una sessione sola: niente crescita"}}
```
Lo **stato derivato** (PNG vivi o morti, dove sono, verso chi sono amichevoli, che cosa sanno; oggetti; promesse;
fili; ciò che i PG sanno) si ricava applicando gli `effetti` dei fatti non superati nell'ordine delle loro fonti.
Non si scrive a parte: così ogni cambiamento ha la sua prova.

## sessioni/<nn>/registro.yaml e trascrizione.yaml (li scrive il server)
La forma è quella di `apps/server/src/sessione/registro.ts` (`RegistroSessione`, formato 1). Il validatore legge:
- `sessione` (= la cartella `sessioni/<nn>`), `campagna`, `formato`, `archivio.ultimo_turno` (i turni giocati);
- `indizi`, `battute`, `menzogne`, `fatti_noti`: voci `{id, turno, …}`, gli eventi che un fatto può citare;
- `orologi[]`: `pieni_alla_fine` (lo stato a fine sessione) e `segni[].turno` (l'evento «orologio»);
- i testi di un turno, alla lettera, per le citazioni: `trascrizione.yaml → voci[]` di quel turno,
  `momenti[].righe` di quel turno, `pg[].azioni_pubbliche` e `azioni_private` di quel turno.

Il registro contiene le azioni private: è materiale del master. Non si ritocca: si rigenera dall'archivio
(`scripts/tra-sessioni.sh` controlla che i file nella campagna siano quelli che l'archivio darebbe).

## sessioni/<nn>/ (il pacchetto, forma di apps/server/src/campagna/pacchetti.ts)
`sessione.yaml` con `riassunto_iniziale`, `scene` (in ordine), `pieni_all_inizio: {o_…: segni}` (sostituisce
quello degli orologi della campagna), eventuali orologi, canone e nodi della sessione (si uniscono a
campagna.yaml), e `preparazione.fili: [{id, come: ripreso|rimandato}]`, che sta in `preparazione` perché non
arrivi al narratore. Più `scene/`, `png/` (i PNG di questa sessione e le schede aggiornate dei ricorrenti, che
sostituiscono quelle della campagna), `repertorio/` con le sue `parole_segrete.yaml` (sostituiscono quelle
della campagna).

## Che cosa controlla il validatore
| Codice | Controllo |
|---|---|
| `STATO.registro` | i registri fino a `dopo_sessione` esistono; il numero torna con la cartella; la firma torna |
| `STATO.fonte` | il turno citato esiste; la citazione è nel turno, alla lettera; l'evento è nel turno; un fatto fuori scena ha il motivo, che nomina un orologio, un pericolo o un fronte esistente |
| `STATO.superato` | un fatto è superato solo da uno che viene dopo |
| `STATO.orologio` | a fine sessione l'orologio ha i segni del registro |
| `STATO.forma`, `STATO.riferimento` | id `g_`, testo, PNG, PG, fatti, orologi esistenti; stati di promesse e fili |
| `CONTINUITÀ.morto` | un PNG morto non è tra i presenti, non parla e non ha una scheda nel pacchetto |
| `CONTINUITÀ.scheda` | un PNG cambiato in gioco che torna in scena ha la scheda aggiornata nel pacchetto, con l'atteggiamento dello stato |
| `CONTINUITÀ.saputo` | ciò che un PNG ha saputo è nel `sa` della sua scheda e non nel `non_sa`; nessuna parola segreta per ciò che i PG sanno già |
| `CONTINUITÀ.segreto` | il pacchetto con un repertorio ha le sue parole segrete, e ogni fatto ancora segreto che entra nella sessione (schede dei PNG in scena, battute) ha la sua parola |
| `CONTINUITÀ.orologio` | gli orologi della sessione ripartono dai segni dello stato |
| `CONTINUITÀ.promessa` | promesse e fili aperti sono in `preparazione.fili` della sessione, ripresi o rimandati (avviso) |
| `CONTINUITÀ.oggetto` | un oggetto perso o distrutto non torna tra gli elementi delle scene (avviso) |
| `CONTINUITÀ.pg` | un PG non torna indietro di livello |

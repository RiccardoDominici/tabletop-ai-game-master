# Lingue

Richiesta di Riccardo del 10 novembre 2026 (docs/richieste-2026-11-09.md, §12): il progetto è indipendente dalla lingua,
la lingua di gioco si sceglie in configurazione. Oggi tutto è in italiano; l'inglese è la seconda lingua, completa.

## Le due lingue di una partita

- **Lingua dei contenuti**: quella della campagna (`lingua` in `campagna.yaml`, e nel brief del Preparatore). Vale per
  tutto ciò che il Motore dice o scrive: prompt dei modelli, messaggio del turno, frasi fisse del Motore (avvisi, motivi,
  righe di sistema, riserve), regole linguistiche (annuncio, guardie, divisore di frasi), parole chiave dei dadi, voci.
- **Lingua dell'interfaccia**: quella della configurazione (`lingua` in `config/predefinita.yaml`, sovrascritta da
  `config/locale.yaml` o da `CANTASTORIE_LINGUA`). Vale per i testi fissi del telefono, del proiettore e del pannello.
- Una campagna senza `lingua` è nella lingua della configurazione. Di solito le due coincidono; se no, il telefono
  è nella lingua di chi gioca e la storia in quella della campagna.
- Codici ISO 639-1: `it`, `en`. Una lingua sconosciuta ferma l'avvio con un errore chiaro.

## Dove sta ciò che dipende dalla lingua

```
config/predefinita.yaml          lingua: it                       (la scelta della configurazione)
campagne/<id>/campagna.yaml      lingua: en                       (la lingua della campagna)
prompts/<codice>/*.md            prompt dei modelli (narratore, selettore, arbitro-azioni, lettore-minimo, riassunto, regole)
lingue/<codice>/testi*.yaml      frasi fisse del Motore, a chiavi, con {segnaposto} (testi-modelli.yaml: ciò che va ai modelli)
lingue/<codice>/motore.yaml      regole linguistiche del Motore (annuncio, collegamenti tra azioni, frasi, guardie, nomi)
lingue/<codice>/prove.yaml       parole chiave dell'arbitro dei dadi (SRD 5.2) e nomi di caratteristiche e abilità
lingue/<codice>/prosa.yaml       regole di prosa del validatore (frasi, cliché, numeri in lettere, voce e tono), e le liste di parole dei controlli su alias, id e quando delle battute, e privatezza
lingue/<codice>/preparatore/     gli esempi del Preparatore in quella lingua (skill.md, riferimenti.md)
apps/web/src/lingua/<codice>/    dizionari dell'interfaccia (TypeScript: le chiavi le controlla il compilatore)
assets/voci/voci.yaml            voci per lingua (Fish e Qwen)
```

- I dizionari del web stanno in `apps/web/src`, non in `lingue/`: così le chiavi mancanti le trova `tsc`, e Vite non
  deve leggere file fuori dall'app. Tutto il resto sta in `lingue/` ed è YAML o Markdown, letto dal server (TypeScript)
  e dal validatore (Python) con lo stesso formato.
- L'italiano è il riferimento: il pacchetto `it` contiene esattamente i testi e le regole di oggi, e i test di
  sempre restano verdi senza cambiare. Ogni altra lingua deve avere tutte le chiavi dell'italiano, con gli stessi
  segnaposto: lo controllano i test (`lingue.test.ts` per il server, `lingua.test.ts` per il web).

## Come lo usa il codice

- Server: `apps/server/src/lingua/` carica e controlla il pacchetto della lingua dei contenuti all'avvio (e quando il
  ciclo delle sessioni cambia pacchetto). Il pacchetto attivo è uno per processo: un server gioca una campagna sola.
  Le funzioni del Motore chiedono `testo('chiave', { nome })` e `pacco().motore…`; senza una lingua impostata vale
  l'italiano, così test e strumenti che non la impostano si comportano come prima.
- Ciò che si legge prima che la lingua sia impostata usa la lingua della campagna: il caricatore divide le frasi
  di aperture e riassunti con `lingua` di `campagna.yaml`, se no con quella della configurazione
  (`linguaConfigurazione`, che passano `avvio.ts` e `strumenti/prerender.ts`). Ciò che si compone al caricamento
  e si mostra dopo si compone quando lo si legge (getter): la descrizione della CA delle schede (`ca_da`),
  l'avviso del pannello sul pacchetto che non si carica. Gli strumenti che caricano una campagna fuori dal
  server (`prerender.ts`) impostano la lingua come lui, così la chiave dell'audio in cache è la stessa.
- Prompt: `prompts/<lingua>/<nome>.md`. Le variabili `CANTASTORIE_PROMPT_*` forzano ancora un file preciso.
- Regole linguistiche (`lingua/motore.ts`): ogni modulo chiede la sua sezione di `motore.yaml` con
  `regole('sezione', compila)`; le espressioni sono testi, compilati alla prima richiesta e tenuti in cache
  accanto al pacchetto della lingua. Le sezioni: `annuncio` (llm/annuncio.ts: in italiano si cita il
  giocatore, in inglese si volta in terza persona), `collegamenti` (azioni/regole.ts: «anch'io», «me too»,
  «I follow Corrado»), `frasi` (abbreviazioni del divisore), `finzione` e `numeri_regole` (le due guardie
  della voce), `privato` (parole vuote della guardia delle azioni private), `nomi` (titoli saltati nei nomi
  brevi). I prompt che stavano nel codice (`arbitro-azioni`, `lettore-minimo`, `riassunto`) si leggono con
  `prompt(nome)`; i campi JSON e le etichette del protocollo restano uguali in ogni lingua.
- Il lettore minimo riceve il turno come dati (`RichiestaNarrazione.dati`), non dal testo del messaggio.
- Web: `apps/web/src/lingua/` (`t('chiave', { … })`), nessuna dipendenza nuova. La lingua dell'interfaccia arriva dal
  server (`/api/salute` all'avvio della pagina e `StatoTavolo.lingua`); finché non arriva vale l'italiano.
  Date e ore si scrivono con `localeInterfaccia()` (`it-IT`, `en-GB`). Il tipo di danno delle carte arriva dal
  Motore già nella lingua dei contenuti (`DannoMostrato.nome_tipo`, da `prove.yaml`: «perforanti», «piercing») e
  il web lo mette nella frase del dizionario (`comune.tiri.danni_tipo`); solo una carta di prima, senza
  `nome_tipo`, ripiega sulla grammatica italiana del tipo scritto nella scheda (`tipoDannoPlurale`).
- Validatore: `strumenti/valida/` legge `lingue/<lingua della campagna>/prosa.yaml`.
- Voci: il registro ha le voci per lingua; i PNG di una campagna scelgono fra quelle della sua lingua.

## Cosa resta in italiano (per ora)

- Identificatori del codice, nomi dei campi YAML, messaggi di log, errori del caricatore e del validatore per chi
  scrive le campagne, documenti interni di `docs/` (la guida `docs/guide/` è in inglese). È la fase separata già decisa
  da Riccardo.

## Verifica

- Test del server e del web come prima, più: le chiavi e i segnaposto dei pacchetti, i prompt di ogni lingua presenti,
  le regole linguistiche inglesi sui loro esempi (annuncio in terza persona, «me too» come dipendenza, frasi inglesi,
  abilità SRD dalle parole inglesi).
- Partita inglese col server intero: `apps/server/test/partita-en.test.ts` (campagna `test/fixtures/campagne/en-mini`,
  copione `test/fixtures/copione-en.txt`). E2E: `apps/web/e2e/lingua-en.spec.ts` (il comando di avvio è in testa al file),
  tre turni in inglese, interfaccia inglese su telefono, proiettore e pannello, voce finta.

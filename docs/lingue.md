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
prompts/<codice>/*.md            prompt dei modelli (narratore, selettore, arbitri, lettore, riassunto, regole)
lingue/<codice>/testi.yaml       frasi fisse del Motore, a chiavi, con {segnaposto}
lingue/<codice>/motore.yaml      regole linguistiche del Motore (annuncio, collegamenti tra azioni, guardie, frasi)
lingue/<codice>/prove.yaml       parole chiave dell'arbitro dei dadi (SRD 5.2) e nomi di caratteristiche e abilità
lingue/<codice>/prosa.yaml       regole di prosa del validatore (frasi, cliché, numeri in lettere, voce e tono)
lingue/<codice>/preparatore.md   gli esempi del Preparatore in quella lingua
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
- Prompt: `prompts/<lingua>/<nome>.md`. Le variabili `CANTASTORIE_PROMPT_*` forzano ancora un file preciso.
- Web: `apps/web/src/lingua/` (`t('chiave', { … })`), nessuna dipendenza nuova. La lingua dell'interfaccia arriva dal
  server (`/api/salute` all'avvio della pagina e `StatoTavolo.lingua`); finché non arriva vale l'italiano.
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
- E2E su una porta di prova con una campagna inglese piccola (fixture), voce finta: tre turni in inglese, interfaccia
  inglese su telefono, proiettore e pannello.

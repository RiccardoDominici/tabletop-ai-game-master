# Il tuo manuale di regole

Cosa trovi qui: come far giocare una campagna con le regole di un manuale tuo, invece che con l'SRD 5.2
del repository. Leggi prima: [creare una campagna](creare-una-campagna.md) (il Preparatore e il validatore) e
[una serata](una-serata.md) (come si gioca). La specifica tecnica è in [docs/regole.md](../regole.md).

## In breve

1. Metti il manuale in `manuali/` (PDF con testo, `.md` o `.txt`).
2. Nel brief della campagna scrivi `manuale: manuali/<file>`.
3. Il Preparatore legge il manuale, scrive il set di regole in `campagne/<id>/regole/` e lo usa per tiri,
   schede e narratore.
4. Ai giocatori compaiono il pulsante **«Regole»** e la casella **«Chiedi una regola»**.

Senza il campo `manuale:`, la campagna gioca con l'SRD 5.2, come oggi.

## 1. Dove sta il manuale

La cartella `manuali/` è nel `.gitignore`: quello che ci metti resta sul tuo computer e non entra mai nel
repository. I manuali sono spesso sotto copyright, quindi questa è la regola. Il file `manuali/LEGGIMI.md` è
l'unico tracciato da git, e spiega le stesse cose in breve.

## 2. Formati

| Formato | Come si riconosce un capitolo |
|---|---|
| **PDF con testo selezionabile** | l'indice dei segnalibri del PDF, se c'è; altrimenti i titoli riconoscibili («Capitolo 3», «2.1 Il combattimento») |
| **Markdown** (`.md`) | i titoli con `#` |
| **Testo semplice** (`.txt`) | i titoli su una riga da soli, o con la forma «Capitolo 3 …» |

Un PDF fotografato o scansionato non ha testo: il programma non lo legge. Serve prima un OCR, oppure una
versione testuale del manuale (spesso l'editore ne ha una). Per vedere come il programma legge il tuo file:

    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/<file>

Stampa il testo diviso in sezioni, ognuna con la sua pagina. Se una sezione manca o è spezzata male, correggi
il file (o il suo indice) prima di preparare la campagna.

## 3. Come lo dici nel brief

Il brief è `campagne/<id>/brief.yaml`, copiato dal modello della skill. Il campo è facoltativo:

```yaml
manuale: manuali/mondo-a-2d6.pdf
```

Puoi anche scriverlo a parole nella richiesta al Preparatore («usa il manuale in manuali/mondo-a-2d6.pdf»):
la skill lo mette nel brief da sola.

## 4. Che cosa viene creato

Il Preparatore scrive in `campagne/<id>/regole/`:

| File | Che cosa contiene |
|---|---|
| `regole.yaml` | la struttura del set: come si tira, le caratteristiche, le abilità, le difficoltà, le mosse, la fonte e la licenza |
| `riassunto.md` | un riassunto in italiano semplice, per i giocatori (al massimo 400 parole) |
| `estratti/*.md` | i passi del manuale da consultare, uno per regola, con le parole con cui si trovano |

Le schede dei PG e dei PNG usano le caratteristiche del tuo manuale, non quelle di D&D. Il validatore controlla
il set con la classe `REGOLE`:

    python3 -I strumenti/valida_campagna.py campagne/<id> --solo REGOLE

Deve uscire senza errori. Lo stesso controllo è dentro il controllo completo della campagna.

**Licenza.** Il set porta la licenza che il Preparatore dichiara in `regole.yaml`. Se il manuale non è libero,
il set va dichiarato con `libera: false`: la cartella `regole/` ha allora un proprio `.gitignore` e il set resta
fuori dal repository. Se hai dubbi sulla licenza, chiedilo al Preparatore prima di fare commit.

## 5. Che cosa vedono i giocatori

- Il pulsante **«Regole»**, in alto sul telefono, apre il riassunto del set, con il nome del manuale, la licenza
  e l'attribuzione se il set ne ha una.
- In fondo, la casella **«Chiedi una regola»**. Il giocatore scrive una domanda; risponde un modello veloce, in
  al massimo ottanta parole, usando solo il riassunto e i passi del manuale trovati per la domanda. La risposta
  si vede solo sul telefono che l'ha chiesta. Una domanda alla volta per telefono, con qualche secondo di pausa tra
  una e l'altra.
- La risposta non contiene niente della storia: niente scene, PNG o segreti. Se la regola non c'è nel testo,
  lo dice e consiglia di chiedere al master.

Il regolamento completo della casella e del pannello è in [docs/regole.md](../regole.md), §5.

## 6. Se qualcosa non va

- **La campagna gioca con l'SRD 5.2 e non con il tuo manuale.** Il set non è valido, e il server lo scrive nel log
  («set non valido, si gioca con l'SRD 5.2»). Rilancia il validatore con `--solo REGOLE` per vedere quale campo non
  torna.
- **Il Preparatore dice che il manuale è vuoto.** Il file è una scansione senza testo: vedi la sezione 2.
- **«Chiedi una regola» non risponde.** Verifica che la campagna usi un modello (senza modello la casella non
  c'è), e che il set abbia dei passi o un riassunto.

## 7. Copyright

Il manuale è tuo: lo usi per giocare, a casa, con il tuo gruppo. Non va messo nel repository né pubblicato. Gli
estratti che finiscono in una campagna sono citazioni brevi, per uso personale: non pubblicarli, né in un sito
né in un canale pubblico. Il repository contiene solo l'SRD 5.2, che è sotto licenza CC-BY-4.0 (vedi `CREDITI.md`).

# Manuali di regole

Qui metti il manuale di regole che vuoi usare per una campagna. Il file resta sul tuo computer: la
cartella è nel `.gitignore` e il contenuto non entra mai nel repository, perché i manuali sono spesso
sotto copyright. Questo file è l'unico tracciato da git.

## Formati accettati

- **PDF con testo selezionabile** (il caso più comune: un PDF esportato dal programma di scrittura o
  scaricato dall'editore). Un PDF fotografato o scansionato non ha testo: va prima passato da un OCR,
  oppure serve una versione testuale del manuale.
- **Markdown** (`.md`), con i titoli in `#`, `##`.
- **Testo semplice** (`.txt`), con i titoli su una riga da soli o con la forma «Capitolo 3 …».

Il PDF va bene così com'è: il programma usa l'indice dei segnalibri, quando c'è, per trovare i capitoli
e la pagina di ciascuno.

## Come si usa

1. Copia il file in questa cartella, per esempio `manuali/mondo-a-2d6.pdf`.
2. Nel brief della campagna (`.claude/skills/preparatore/modelli/brief.yaml`) scrivi il campo
   `manuale: manuali/mondo-a-2d6.pdf`.
3. Chiedi di preparare la campagna. Il Preparatore legge il manuale, scrive il set di regole in
   `campagne/<id>/regole/` e lo usa per le schede e per la partita.

Senza il campo `manuale`, la campagna gioca con l'SRD 5.2, che è già nel codice e sotto licenza libera.

## Verifica del testo estratto

Per vedere come il programma legge il manuale, prima di preparare una campagna:

    strumenti/regole/.venv/bin/python strumenti/regole/estrai.py manuali/mondo-a-2d6.pdf

Stampa il testo diviso in sezioni, con la pagina di ciascuna. Se una sezione manca o è spezzata male, il
manuale è probabilmente scansionato o ha un indice sbagliato.

## Licenza

Il set che il programma ricava da un manuale porta la licenza che dichiari in `regole.yaml`. Se il
manuale non è libero (`libera: false`), il set resta solo sul tuo computer, con un `.gitignore` suo, e
gli estratti che finiscono in una campagna sono citazioni brevi, per uso personale. Non pubblicarli.

Per la struttura del set e il resto, vedi `docs/regole.md`; per il percorso passo per passo,
`docs/guida/il-tuo-manuale.md`.

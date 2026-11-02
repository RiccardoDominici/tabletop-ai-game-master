# Prompt delle immagini

Le immagini le genera `strumenti/immagini/genera.py` (FLUX.2 klein in locale). Le compone
`strumenti/immagini/campagna.py`, che legge **solo** questi campi:

| File | Campo | Uso |
|---|---|---|
| stile.yaml | `stile_immagini` | il frammento `[STILE]`, accodato a ogni prompt; in inglese |
| scena*.yaml, scene/*.yaml | `immagine.prompt_luogo`, `immagine.invarianti`, `png_presenti` | immagine del luogo, 16:9 |
| png/*.yaml | `aspetto.prompt_immagine` (o `aspetto.prompt_ritratto`), `aspetto.invarianti` | ritratto 3:4; le invarianti finiscono nel prompt come «Tratti fissi: …» |
| png/*.yaml | `aspetto.situazioni: [{id, prompt}]` | lo stesso PNG in un'altra situazione, 16:9, con il ritratto come riferimento |

Per ogni scena in cui un PNG è presente, si genera in automatico anche la sua immagine nel luogo.

## Regole
1. **In inglese** `prompt_luogo`, `prompt_immagine` e `situazioni[].prompt` (il generatore li capisce meglio).
   Le invarianti in italiano vanno bene.
2. **`[STILE]`** compare in `prompt_immagine` come segnaposto, una volta sola [V]. `stile_immagini` è il
   suo contenuto: tecnica, tavolozza, luce. Aggiungi sempre «no text, no lettering».
3. **Tratti fissi**: età, corporatura, capelli, un capo d'abbigliamento riconoscibile, un oggetto.
   Le invarianti sono almeno tre [V] e devono essere **visibili a prima vista**.
4. **Niente segreti**. Le immagini vanno sul proiettore dal primo turno:
   - una cicatrice sotto il cappuccio, un tatuaggio nascosto, l'oggetto rubato in tasca non stanno nel
     ritratto né nelle invarianti [R];
   - mettili in una `situazione` (per esempio `{id: senza_cappuccio, prompt: "hood lowered, a thin white
     scar splits his left eyebrow"}`), da mostrare dopo la rivelazione.
5. **Il luogo** descrive ciò che si vede entrando, con gli elementi interattivi principali, senza persone
   (le aggiungono le situazioni).
6. Controlla con `--dry-run`: stampa ogni prompt composto, senza caricare il modello.

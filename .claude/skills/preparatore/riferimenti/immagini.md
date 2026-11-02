# Prompt delle immagini

Le immagini le genera `strumenti/immagini/genera.py` (FLUX.2 klein in locale). Le compone
`strumenti/immagini/campagna.py`, che legge **solo** questi campi:

| File | Campo | Uso |
|---|---|---|
| stile.yaml | `stile_immagini` | il frammento `[STILE]`, accodato a ogni prompt; in inglese |
| scena*.yaml, scene/*.yaml | `immagine.prompt_luogo`, `immagine.invarianti`, `png_presenti` | immagine del luogo, 16:9 |
| png/*.yaml | `aspetto.prompt_immagine` (o `aspetto.prompt_ritratto`), `aspetto.invarianti` | ritratto 3:4; le invarianti finiscono nel prompt come «Tratti fissi: …» |
| png/*.yaml | `aspetto.prompt_ritratto` | facoltativo: se c'è, il ritratto usa questo invece di `prompt_immagine` |
| png/*.yaml | `aspetto.situazioni: [{id, prompt, dopo}]` | lo stesso PNG in un'altra situazione, 16:9, con il ritratto come riferimento |
| campagna.yaml | `nodi[].immagine.prompt_luogo` | un luogo senza scheda scena (il server lo mostra per i luoghi collegati) |

Per ogni scena in cui un PNG è presente, si genera in automatico anche la sua immagine nel luogo.

## Regole
1. **In inglese** `prompt_luogo`, `prompt_immagine`, `prompt_ritratto` e `situazioni[].prompt` (il
   generatore li capisce meglio) [V avviso]. Le invarianti in italiano vanno bene.
2. **`[STILE]`** compare in `prompt_immagine` e in `prompt_ritratto` come segnaposto, una volta sola [V]. `stile_immagini` è il
   suo contenuto: tecnica, tavolozza, luce. Aggiungi sempre «no text, no lettering».
3. **Tratti fissi**: età, corporatura, capelli, un capo d'abbigliamento riconoscibile, un oggetto.
   Le invarianti sono almeno tre [V] e devono essere **visibili a prima vista**.
4. **Niente segreti**. Le immagini vanno sul proiettore dal primo turno:
   - una cicatrice sotto il cappuccio, un tatuaggio nascosto, l'oggetto rubato in tasca non stanno nel
     ritratto né nelle invarianti [R];
   - mettili in una `situazione` (per esempio `{id: senza_cappuccio, dopo: [i_cicatrice], prompt: "hood
     lowered, a thin white scar splits his left eyebrow"}`), da mostrare dopo la rivelazione;
   - `dopo` dice quale indizio o battuta la fa comparire sul proiettore [R]: senza, il Motore la cerca per
     somiglianza tra l'id della situazione e gli indizi del PNG, e può non trovarla (in ponte-lanterne non
     trovava `studio_cassa` di Vischi);
   - la situazione compare al **primo** id di `dopo` che esce, quindi ognuno deve rivelare il tratto. Il
     validatore ricava il tratto dal lessico dei segreti: sono i fatti nascosti che quell'id rende pubblici
     (le parole segrete che lo elencano in `pubblica_dopo`, i `fatti_noti` della battuta). Errore se un id
     di `dopo` è un esempio di voce o un riempitivo, o non rivela il tratto che gli altri rivelano, o se
     un'altra situazione del PNG, visibile prima, mostra lo stesso tratto [V]. Una situazione che non
     mostra niente di nascosto (Tullio alla catena) segue un momento: un segno, un momento chiave, un finale;
   - il validatore cerca le parole segrete in prompt e invarianti [R], ma le regex sono in italiano e i
     prompt in inglese: la lettura con `--dry-run` resta tua.
5. **Il luogo** descrive ciò che si vede entrando, con gli elementi interattivi principali, senza persone
   (le aggiungono le situazioni).
6. Controlla con `--dry-run`: stampa ogni prompt composto, senza caricare il modello.

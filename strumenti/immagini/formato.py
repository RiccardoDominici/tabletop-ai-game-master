"""Il formato delle immagini per il proiettore: parole fisse accodate a OGNI prompt dallo strumento.

Perché qui e non nella carta di stile
-------------------------------------
Lo stile (tecnica, tavolozza, luce) lo decide ogni campagna in `stile.yaml → stile_immagini`.
Il FORMATO invece è un requisito del proiettore, uguale per tutte le campagne:
  - l'immagine riempie il quadro fino al bordo (niente foglio con l'orlo strappato: sul nero del
    proiettore è una frangia bianca che abbaglia);
  - niente firme finte, scritte o lettere (il modello le aggiunge negli angoli: 4 tentativi su 7 nei
    luoghi di prova-f0, anche Rosa di ponte-lanterne).
Finché queste parole stavano nella carta di stile, una campagna che non le scriveva (ponte-lanterne,
nozze-neve) usciva con margini e firme. Ora le aggiunge lo strumento; la carta di stile non deve più
scriverle (se le scrive, non si ripetono: vedi `con_formato`).

Le immagini fatte prima restano come sono: la rifilatura (rifila.py) copre già i margini sottili.
"""

from __future__ import annotations

# Le clausole del formato, nell'ordine in cui finiscono nel prompt. Ognuna è anche la chiave con cui
# si controlla se il prompt la contiene già (confronto senza maiuscole): una carta di stile che dice
# già «no text, no lettering» non se le ritrova due volte.
CLAUSOLE_FORMATO: tuple[str, ...] = (
    "full-bleed",
    "the picture fills the whole frame edge to edge",
    "no border",
    "no margin",
    "unsigned",
    "no signature",
    "no text",
    "no lettering",
)


def con_formato(prompt: str) -> str:
    """Accoda al prompt le clausole del formato che non contiene già. Mai due volte la stessa."""
    base = prompt.strip().rstrip(",. ")
    minuscolo = base.lower()
    mancanti = [c for c in CLAUSOLE_FORMATO if c.lower() not in minuscolo]
    return f"{base}, {', '.join(mancanti)}" if mancanti else base

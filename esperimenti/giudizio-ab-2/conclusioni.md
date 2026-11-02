# Esperimento A/B n. 2 — conclusioni (2 novembre 2026)

A = narratore che improvvisa (prompt aggiornato con azioni numerate e collegamenti).
B2 = repertorio versione 2 (battute legate alle azioni, solo ciò che conta pre-scritto, catalogo pertinente).
Copioni nuovi, scritti alla cieca dopo la taratura della v2 (`esperimenti/copioni/prova2/`; stesso autore dei primi,
vedi la sua nota sull'indipendenza). Haiku 5.5, voce finta, arbitro delle azioni solo a regole. Giudice Opus cieco.
Chiave: caotico-X = B2, caotico-Y = A, cauto-X = A, cauto-Y = B2.

| | caotico A | caotico B2 | cauto A | cauto B2 |
|---|---|---|---|---|
| Rubrica /36 | **16** | 15 | **18** | 15 |
| Fughe (gravi) | 1 | 1 | 2 | 6 (4) |
| Canone inventato | 8 | 5 | 6 | 9 |
| Agency violata | 2 | 5 | 1 | 8 |
| Azioni ignorate | 3 | 2 | 3 | 3 |
| Battute PNG riferite | 4 | 2 | 3 | 2 |
| % frasi > 16 parole | 15% | 40% | 17% | 25% |
| Indizi dati | pochi | 5 | buoni | buoni |

Totale: A 34, B2 30 su 72 (nel primo esperimento A 37, B 27).

## Lettura

- **La v2 ha risolto il difetto della v1**: le azioni ignorate sono scese da 20 a 5, come in A. Il divario si è ridotto.
- **Nuovo difetto del repertorio, il più grave**: le confessioni scattano senza che la condizione della scheda
  (`cede_se`) sia davvero soddisfatta. Esempio (cauto T3): Assenzio chiede in pubblico «è sincera?» e Ottavia confessa
  la segale, anche se la battuta dice «in privato». Il selettore non conosce i segreti, quindi non può giudicare se la
  confessione è meritata; il Motore controlla solo le condizioni strutturali (indizi, battute usate), non quelle di finzione.
- **Problemi comuni a entrambe**: canone inventato in tutte e quattro (R3 = 0), monologhi lunghi, chiusure senza un
  invito a un PG preciso, decisioni prese al posto dei PG. Non dipendono dal metodo: servono i filtri strutturali di F1.

## Cosa cambiare (se e quando si riprende la qualità della narrazione)

1. **Custode dei segreti**: le battute che rivelano un segreto (confessioni, verità, indizi con condizioni) passano da un
   controllo dedicato. Una chiamata breve che vede il segreto e la condizione `cede_se` e risponde solo sì/no (quindi non
   può far trapelare nulla). Parte in parallelo al selettore appena si chiude la finestra, per le battute candidate; se
   dice no, esce la `versione` (la bugia) o un rifiuto.
2. **Condizioni strutturali in più** in `richiede`: `privata: true` (l'azione deve essere privata), `da_pg: [...]`.
3. **Filtri F1** per entrambe le modalità: canone (numeri, nomi, luoghi), agency, lunghezza delle risposte, chiusura con
   invito a un PG.

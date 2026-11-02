# Cantastorie (nome di lavoro)

## Come giocare stasera
1. Sul Mac: `scripts/partita.sh prova-f0` (una scena, ~30 minuti) oppure `scripts/partita.sh ponte-lanterne` (quattro scene: le cambi tu dal pannello del master, «Scene della campagna»). Alla fine stampa i tre indirizzi.
2. **Proiettore** (Mac collegato a proiettore e cassa): apri `http://localhost:4610/schermo` e clicca «Inizia sessione». Serve quel clic per far partire l'audio.
3. **Telefoni** (stessa Wi-Fi del Mac): basta il browser. Inquadrano il QR sul proiettore o aprono l'indirizzo stampato, poi scelgono un personaggio. Si gioca scrivendo (il microfono non c'è ancora).
4. **Pannello del master** (solo sul Mac): il link con `?token=` stampato dallo script. Parte «senza spoiler», così puoi anche giocare.
5. Se qualcosa va storto, nel pannello:
   - **Ferma la narrazione** zittisce subito il narratore e mette in pausa;
   - **Pausa / Riprendi** ferma il tavolo senza interrompere la frase in corso;
   - una **nota di regia** («frasi più corte», «Ottavia è più sospettosa») vale per i turni successivi.
6. Voce vera (pronta in circa 20 s, circa 3 GB di RAM): aggiungi `--voce qwen`. Per finire: `scripts/arresto.sh`.

Master IA per giocare a D&D in presenza: telefoni dei giocatori, proiettore con la scena,
cassa con narratore e voci dei personaggi, musica sempre in sottofondo.

- `docs/architettura.md` — architettura v1 (copia anche su Notion)
- `docs/manuale-master.md` — manuale del master: regole di mestiere imposte dal codice (E1–E15, rubrica R1–R12)
- `docs/ricerca-tecnica.md` — sintesi della ricerca tecnica
- `research/` — risultati misurati delle prove del 1° novembre 2026 (LLM, TTS, STT, musica)

Stato (2 novembre 2026): F0 completata; azioni simultanee, repertorio pre-scritto, immagini, pannello del master, più scene e skill del Preparatore funzionanti. Cose aperte in `docs/da-fare.md`.

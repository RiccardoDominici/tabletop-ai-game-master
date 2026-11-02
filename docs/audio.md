# Audio: musica, temi dei personaggi, ambienti (framework)

Richiesta di Riccardo (2 novembre 2026): musica sempre sotto; ogni ambientazione la sua musica, ogni personaggio la sua;
rumori d'ambiente (folla, pioggia…); prima riusare raccolte esistenti, poi eventualmente generare. Vale il principio
guida: **una pipeline che produce l'audio di qualsiasi campagna dai suoi dati**, mai brani scelti a mano.
Ricerche: `docs/ricerca-audio.md`.

## Quattro strati

| Strato | Cosa | Da dove (ora) | Da dove (dopo) |
|---|---|---|---|
| **Musica di luogo e d'umore** | un brano in loop per luogo; brani per umore (tensione, mistero, battaglia, pathos, vittoria, riposo) | raccolta Incompetech (CC BY 4.0, catalogo leggibile da script), scelta automatica per descrittori | generazione locale (Stable Audio 3 Small, ACE-Step 1.5) o API |
| **Temi dei personaggi** | un motivo breve per PNG, variazioni di un unico motivo della campagna | composti: motivo come note (dati), variazioni in codice, resi con un SoundFont libero | stesso |
| **Ambienti** | strati in loop per luogo: folla, pioggia, fiume, vento, fuoco, campane… | raccolta CC0 locale (OpenGameArt, Kenney…), etichettata | Freesound API (serve una chiave), Sonniss |
| **Effetti** | colpi singoli: rintocco, porta, catena | come gli ambienti | come gli ambienti |

## Dati nella campagna (li scrive il Preparatore)

- `stile.yaml → audio`: tonalità e tempo della campagna, strumenti ammessi, umore di base, vocabolario dei tag.
- ogni scena/nodo → `audio: {musica: [descrittori], ambiente: [tag], umore_iniziale}`.
- ogni PNG → `tema: {carattere, strumento, modo, registro}`: niente segreti (il tema non deve tradire chi mente).

## Manifest (contratto tra pipeline e proiettore)

`campagne/<id>/audio/manifest.json`:
```json
{"brani":   [{"id": "luogo_<id>", "tipo": "musica", "file": "...", "loop": true, "lufs": -23, "crediti": "..."}],
 "umori":   [{"id": "umore_tensione", "file": "...", "loop": true}],
 "temi":    [{"id": "tema_<png_id>", "file": "...", "durata_s": 6}],
 "ambienti":[{"id": "amb_<luogo>_<tag>", "file": "...", "loop": true, "volume": 0.4}],
 "effetti": [{"id": "sfx_<tag>", "file": "..."}],
 "crediti": ["Titolo, Kevin MacLeod (incompetech.com), CC BY 4.0", "..."]}
```
Volumi normalizzati (loudnorm a due passate), loop controllati (giunta, silenzi, clipping) prima di entrare nel manifest.

**Cosa legge il proiettore** (`apps/server/src/audio/catalogo.ts`, 3 novembre 2026):
- `file`: nome semplice nella cartella `audio/` (niente sottocartelle), `^[a-z0-9][a-z0-9_.-]*\.(ogg|opus|mp3|m4a|wav|flac|webm)$`;
  consigliato Ogg Opus (o MP3), 48 kHz, stereo per la musica. Una voce col file mancante si salta senza errori.
- `id`: `^[a-z0-9][a-z0-9_]*$`. Luoghi: `luogo_<id scena o nodo>`, come le immagini (`luogo_scena_forno_vecchio`,
  `luogo_n_piazza`); la scena e il suo nodo valgono come lo stesso posto, quindi basta uno dei due.
- Ambienti: `amb_<luogo>_<tag>` (vince il luogo noto più lungo), oppure un campo esplicito `"luogo": "<id>"`.
- Campi facoltativi: `loop` (predefinito vero per brani, umori e ambienti, falso per temi ed effetti), `volume` (0–2,
  predefinito 1), `lufs` (se diverso da −23 il proiettore corregge, ±12 dB al massimo), `durata_s`,
  `loop_inizio_s`/`loop_fine_s` (punti di loop sul file decodificato, se il loop non è il file intero),
  `giunta_s` (> 0: il file non si chiude bene e si ripete con due copie sovrapposte in dissolvenza per tanti secondi).
- Ripieghi della musica di un luogo: `luogo_<luogo>` → luogo equivalente (scena ↔ nodo) → `umore_<musica.tag della scena>`
  → silenzio. Un umore scelto (`POST /api/scena/umore {"umore": "tensione"}`, o `null`) vince sul luogo.
- Fixture di prova: `apps/server/test/fixtures/audio/` (generata da `genera.sh`); `CANTASTORIE_AUDIO=<cartella>` per
  provare un'altra cartella.

## In gioco (proiettore, Web Audio)

- Bus musica: dissolvenza incrociata al cambio di luogo o d'umore, con isteresi (non cambia più di una volta ogni
  60–90 s, salvo inizio combattimento). Bus ambiente: più strati in loop per luogo. Temi: il motivo del PNG suona,
  breve, la prima volta che parla in una scena (non a ogni battuta). Tutto si abbassa sotto la voce (ducking).
- Il pannello del master ha volume e muto per ciascun bus.
- I crediti (CC BY) si mostrano a fine sessione e in una pagina dei crediti.

**Com'è fatto adesso** (`apps/web/src/schermo/audio/`, 3 novembre 2026). Parte solo dopo «Inizia sessione», sullo
stesso AudioContext della voce. Bus: voce, musica, ambienti, temi, effetti; musica e ambienti passano dal ducking.
- Musica: dissolvenza incrociata a potenza costante di 3,5 s; isteresi di 60 s (dal silenzio parte subito; non
  aspettano l'umore scelto dal master o dal Motore, il cambio di scena e il cambio d'umore della scena).
  `?isteresi_audio_s=12` nell'URL dello schermo la accorcia per le prove.
- Ambienti: gli strati del luogo entrano ed escono in dissolvenza (3 s) appena il luogo cambia, senza isteresi.
- Temi: alla prima battuta di un PNG nella scena il motivo parte 0,6 s prima della voce (appena la battuta è
  programmata sull'orologio audio), una volta sola; una scena nuova o ricominciata li riarma.
- Ducking: −9 dB poco prima della voce, risalita dopo 1,4 s di silenzio (niente pompaggio tra le frasi).
- Memoria: si scaricano i byte dei luoghi vicini; si decodifica solo ciò che suona; i buffer usciti si liberano.
- Pannello sullo schermo (tasto A): volume e muto per bus, ricordati nel browser. Crediti: tasto C.
- Prove: `apps/web/src/schermo/audio/*.test.ts` (AudioContext finto) ed `apps/web/e2e/audio.spec.ts` (Chrome vero, su
  un server suo: istruzioni in testa al file).

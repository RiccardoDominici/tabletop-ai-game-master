# Audio: musica, temi dei personaggi, ambienti (framework)

Richiesta di Riccardo (2 novembre 2026): musica sempre sotto; ogni ambientazione la sua musica, ogni personaggio la sua;
rumori d'ambiente (folla, pioggia…); prima riusare raccolte esistenti, poi eventualmente generare. Vale il principio
guida: **una pipeline che produce l'audio di qualsiasi campagna dai suoi dati**, mai brani scelti a mano.
Ricerche: `docs/ricerca-audio.md`.

## Quattro strati

| Strato | Cosa | Da dove (ora) | Da dove (dopo) |
|---|---|---|---|
| **Musica di luogo e d'umore** | un brano in loop per luogo; un brano per ciascuno dei sei umori del vocabolario chiuso (`esplorazione_tesa`, `taverna_calda`, `rito_sacro`, `inseguimento`, `combattimento_epico`, `lutto`) | raccolta Incompetech (CC BY 4.0, catalogo leggibile da script), scelta automatica per descrittori | generazione locale (Stable Audio 3 Small, ACE-Step 1.5) o API |
| **Temi dei personaggi** | un motivo breve per PNG, variazioni di un unico motivo della campagna | composti: motivo come note (dati), variazioni in codice, resi con un SoundFont libero | stesso |
| **Ambienti** | strati in loop per luogo: folla, pioggia, fiume, vento, fuoco, campane… | fondo locale CC0 / pubblico dominio dall'Internet Archive, etichettato e misurato; sintesi per i rumori che mancano | Freesound API (basta la chiave, già innestata) |
| **Effetti** | colpi singoli: rintocco, porta, catena | come gli ambienti | come gli ambienti |

## Dati nella campagna (li scrive il Preparatore)

Tutti facoltativi: se mancano, la pipeline li deduce dai testi pubblici con le regole di `strumenti/audio/vocabolario.py`.
I valori ammessi sono quelli del vocabolario (un valore sconosciuto si ignora con un avviso).
- `stile.yaml → audio`: `{tonalita: "re dorico", modo, tempo: 88, strumenti: [..] o "testo", umore_base: <umore>,
  epoca: antica|moderna|futura, motivo: {metro: 4, note: [[grado, durata], ...]}}`. `motivo` è il gancio per un LLM
  (o per il Preparatore): note in gradi della scala (0 = tonica) e durate in movimenti; si valida, e se non va si usa
  il generatore deterministico. Senza `audio`: modo dal tono, tonica dall'id, strumenti da `tavolozza_musicale.strumenti`
  (con le negazioni: «Niente percussioni» le vieta).
- ogni scena/nodo → `audio: {musica: [descrittori], ambiente: [tag | {tag, volume}], umore_iniziale}`. I descrittori
  di `musica` sono parole del vocabolario (umore, energia, ora, meteo, ambientazione) o parole libere cercate nelle
  descrizioni dei brani.
- ogni PNG → `tema: {carattere, strumento, modo, registro}`: niente segreti (il tema non deve tradire chi mente).
  Senza `tema`, il carattere viene SOLO dalla persona pubblica (lettura, personalità di superficie e sotto pressione,
  voce senza `mai_dice`, timbro della voce); nessuna regola dedotta produce il modo frigio.

## Manifest (contratto tra pipeline e proiettore)

`campagne/<id>/audio/manifest.json`:
```json
{"versione": 1, "campagna": "<id>", "formato": "AAC-LC in .m4a, 48 kHz, stereo; ...",
 "brani":   [{"id": "luogo_<id>", "tipo": "musica", "luogo": "<id>", "file": "luogo_<id>.m4a", "loop": true,
              "lufs": -23.0, "volume": 1.0, "durata_s": 148.2, "titolo": "...", "licenza": "CC BY 4.0", "crediti": "..."},
             {"id": "luogo_<nodo>", "alias_di": "luogo_<scena>", "...": "stessi campi della scena"}],
 "umori":   [{"id": "umore_<tag del vocabolario chiuso>", "umore": "<tag>", "file": "umore_<tag>.m4a", "loop": true, "...": "come i brani"}],
 "temi":    [{"id": "tema_<png_id>", "png": "<png_id>", "file": "tema_<png_id>.m4a", "loop": false, "durata_s": 6.4,
              "lufs": -20.0, "volume": 1.413, "strumento": "clarinetto", "modo": "ionio"}],
 "ambienti":[{"id": "amb_<id>_<tag>", "luogo": "<id>", "tag": "pioggia", "file": "amb_pioggia_<sorgente>.m4a",
              "loop": true, "volume": 0.25, "lufs": -30.0, "fonte": "...", "licenza": "..."}],
 "effetti": [{"id": "sfx_<tag>", "tag": "campana", "file": "sfx_campana_<sorgente>.m4a", "loop": false, "volume": 1.259, "lufs": -21.0}],
 "crediti": ["\"Titolo\" Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0 License, http://creativecommons.org/licenses/by/4.0/", "..."]}
```
- File: AAC-LC `.m4a`, 48 kHz stereo, nomi semplici direttamente in `audio/` (Safari e Chrome li decodificano entrambi).
  Musica 128 kbps, ambienti, temi ed effetti 96 kbps.
- `durata_s` è la durata VERA del contenuto: il decodificatore AAC può lasciare in coda qualche centinaio di campioni
  di riempimento, che non fanno parte del loop. Il proiettore ripete il buffer con `loopEnd = durata_s`.
- I loop sono già cuciti nel file (la coda sfuma nel tratto che precede l'inizio): niente `loop_inizio_s` né `giunta_s`.
- `lufs` è la loudness MISURATA del file (musica ≈ −23, ambienti ≈ −30, temi ≈ −20, effetti ≈ −21); il livello voluto
  rispetto alla musica sta in `volume` = guadagno dello strato × 10^((bersaglio + 23)/20), perché il proiettore riporta
  ogni file a −23 col campo `lufs`.
- Un file può servire più voci (la stessa pioggia per quattro luoghi, con volumi diversi). Ogni voce porta anche le
  misure (`controllo`: loudness, true peak, LRA, giunta, silenzi) e, per la musica, il perché della scelta (`scelta`).
- Accanto al manifest: `crediti.md` (generato) e `descrittori.json` (i descrittori di ogni luogo e PNG con le prove).
Volumi normalizzati (loudnorm a due passate, `linear=true`), loop controllati (giunta, silenzi, clipping) prima di
entrare nel manifest.

## Pipeline (`strumenti/audio/`)

```
strumenti/audio/setup.sh                                   # una volta: ambiente (uv) e SoundFont in cache/audio/soundfont/
strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py campagne/<id> [--dry-run] [--solo musica|temi|ambienti] [--rifai] [--senza-rete]
strumenti/audio/.venv/bin/python strumenti/audio/provino.py campagne/<id>   # esperimenti/audio/provino_<id>.wav e controlli_<id>.md
```
- `campagna_audio.py` legge solo i campi pubblici; `descrittori.py` li traduce nel vocabolario (`vocabolario.py`);
  `fonti/incompetech.py` sceglie e scarica la musica; `temi/` compone e suona i temi; `pool.py` e `ambienti.py`
  fanno gli strati e gli effetti; `qualita.py` taglia i loop, normalizza, codifica e controlla; `manifest_audio.py`
  scrive manifest e crediti. Idempotente: ciò che ha il suo file si salta.
- Fonti verificate il 2–3 novembre 2026:
  - **Incompetech** (Kevin MacLeod, CC BY 4.0): `https://incompetech.com/music/royalty-free/pieces.json` (catalogo,
    ~1.440 brani con feel, genere, bpm, strumenti, descrizione) e `.../mp3-royaltyfree/<filename>`; la «Agent Section»
    li documenta per gli agenti. Catalogo in `cache/audio/incompetech/`, si scaricano solo i brani scelti.
  - **Internet Archive** (CC0 1.0 e Public Domain Mark 1.0, licenza dichiarata da chi carica, registrata con la pagina):
    advancedsearch e metadata; il robots.txt lo permette. Ogni file si misura (piattezza spettrale, LRA, silenzi)
    prima di entrare nel fondo `cache/audio/pool/`.
  - **Non usati, per i loro robots.txt**: OpenGameArt (vieta gli agenti Claude), Kenney (vieta /assets/, /downloads/,
    /files/ a tutti), l'API di Wikimedia Commons (/w/ vietato a tutti). Pixabay escluso dai suoi termini.
  - **Freesound**: innestato, si attiva con `FREESOUND_API_KEY` nell'ambiente o in `.env` (chiave gratuita da
    https://freesound.org/apiv2/apply/); usa solo suoni CC0 e le anteprime (niente OAuth).
  - **SoundFont**: GeneralUser GS 2.0.3 (S. Christian Collins), licenza d'uso libera anche commerciale e dentro
    software; `setup.sh` lo scarica una volta (32 MB, sha256 verificato), fuori da git.
  - **Sintesi** (`fonti/sintesi.py`): pioggia, vento, neve, fiume, fuoco, acqua, mare come rumore modellato e periodico,
    quando il fondo non ha una registrazione buona.

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

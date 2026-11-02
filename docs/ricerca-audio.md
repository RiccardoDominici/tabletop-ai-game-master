# Ricerca: musica, ambienti ed effetti per un framework di campagne (2 novembre 2026)

Due ricerche in sola lettura (raccolte riutilizzabili; generazione). [OPENED] = pagina letta; [SNIPPET] = solo risultato
di ricerca. Prima di costruire, verificare gli endpoint dal vivo.

## Raccolte, ordinate per scelta automatica
1. **Incompetech (Kevin MacLeod)**: catalogo leggibile da script dalla «Agent Section» (per brano: titolo, durata, genere,
   bpm, descrizione, `feel`), file in una cartella statica, nessuna chiave. Circa 2.000 brani. CC BY 4.0: una riga di
   crediti per brano («Titolo, Kevin MacLeod (incompetech.com), Licensed under Creative Commons: By Attribution 4.0»).
   [SNIPPET] https://incompetech.com/agent-section/
2. **Freesound**: ricerca per tag, durata, licenza (`Creative Commons 0`, `Attribution`…), analisi audio per suono
   (Essentia: volume, brillantezza, tonalità). 60 richieste/min, 2.000/giorno; gli originali richiedono OAuth2, le
   anteprime mp3 no. Serve una chiave API (gratuita). [OPENED] https://freesound.org/docs/api/resources_apiv2.html
3. **Jamendo**: tag per umore, strumento, velocità, solo strumentale; API con client id gratuito. [SNIPPET] https://developer.jamendo.com/v3.0/tracks
4. **Sonniss GDC 2026**: ~7,5 GB di effetti professionali, uso libero senza crediti, modificabili; download manuale, vietato
   ridistribuire e addestrare modelli. [OPENED] https://sonniss.com/gdc-bundle-license/
5. **OpenGameArt / Kenney**: CC0 (Kenney) e licenze miste (OGA), niente API, buoni per un piccolo fondo CC0 iniziale.
- **Non adatti**: Pixabay (niente API audio, vietato lo scaricamento in massa), Tabletop Audio (CC BY-NC-ND: vietati
  tagli e loop), Zapsplat gratuito (crediti obbligatori, limiti), BBC Sound Effects (solo uso personale/educativo).
- Lezioni: un vocabolario nostro di tag (tipo di luogo, ora, tempo, umore, energia, strumenti) in cui tradurre i tag delle
  fonti; etichettatura automatica del fondo locale con i modelli d'umore di Essentia; cache locale con licenza e crediti.
  I temi dei personaggi non si trovano in nessuna raccolta: vanno composti.

## Generazione (Mac M1 16 GB)
- **Temi dei personaggi**: la strada consigliata è deterministica. Il modello propone solo il motivo (poche battute, come
  dati), il codice lo valida e ne ricava le variazioni (trasposizione, inversione, aumentazione), un SoundFont libero lo
  suona. I modelli scrivono ABC valido solo nel ~50% dei casi: mai fidarsi senza validazione. Strumenti esistenti:
  sirruf/music-gen-skill (mido + FluidSynth + FluidR3_GM), linxule/mcp-music-studio. [SNIPPET]
- **Musica di luogo e ambienti**: Stable Audio 3 Small (Music/SFX), via MLX ufficiale, max 120 s, inpainting per riparare
  le giunte; pesi con Stability Community License, su Hugging Face con accesso da accettare. [OPENED] https://github.com/Stability-AI/stable-audio-3
- **Brani d'umore**: ACE-Step 1.5 (MIT), il più comodo da script (`instrumental=True`, `use_random_seed=False, seeds=[…]`),
  ma su 16 GB rischia di finire la memoria. [OPENED] https://github.com/ace-step/ACE-Step-1.5
- **MusicGen-melody** (mlx-audiogen): condizionato da una melodia (cromagramma), pesi CC-BY-NC: solo uso non commerciale.
- **Tempi**: nessun dato misurato su chip Apple per nessun modello; stima 30–60 min per 25 brani su M1. Da misurare.
- **API per dopo**: ElevenLabs Music ($0,15/min) ed effetti; Lyria ($0,04 per clip da 30 s); Stable Audio API ($0,20 a
  brano); Suno/Udio senza API pubblica ufficiale.
- **Controlli automatici**: ffmpeg `loudnorm` a due passate (`linear=true`), `silencedetect`, `astats` per il clipping,
  confronto di inizio e fine per la giunta dei loop; in Web Audio rampe di guadagno per dissolvenze e abbassamento sotto la voce.

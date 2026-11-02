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

## In gioco (proiettore, Web Audio)

- Bus musica: dissolvenza incrociata al cambio di luogo o d'umore, con isteresi (non cambia più di una volta ogni
  60–90 s, salvo inizio combattimento). Bus ambiente: più strati in loop per luogo. Temi: il motivo del PNG suona,
  breve, la prima volta che parla in una scena (non a ogni battuta). Tutto si abbassa sotto la voce (ducking).
- Il pannello del master ha volume e muto per ciascun bus.
- I crediti (CC BY) si mostrano a fine sessione e in una pagina dei crediti.

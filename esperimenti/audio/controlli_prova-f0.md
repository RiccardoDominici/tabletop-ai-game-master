# Controlli audio di «prova-f0»

Misure sul file finale decodificato (qualita.py): loudness integrata (ebur128), true peak, LRA,
giunta del loop (salto di livello in dB tra gli ultimi e i primi 50 ms; rapporto del salto di campione
sulla variazione tipica: sopra 8 è un clic), silenzi (sotto −50 dB per più di 1,5 s).

| id | file | durata s | LUFS | TP dB | LRA | giunta | silenzi | KB | esito |
|---|---|---|---|---|---|---|---|---|---|
| luogo_n_mulino_valsecca | luogo_n_mulino_valsecca.m4a | 101.5 | -23.5 | -3.5 | 9.4 | 1.84 dB / ×0.31 | 0 | 1647 | ok |
| luogo_n_piazza | luogo_n_piazza.m4a | 155.25 | -23.2 | -3.3 | 22.4 | 0.73 dB / ×0.95 | 0 | 2526 | ok |
| luogo_scena_forno_vecchio | luogo_scena_forno_vecchio.m4a | 148.0 | -23.0 | -6.8 | 7.7 | 1.01 dB / ×1.05 | 0 | 2406 | ok |
| umore_combattimento_epico | umore_combattimento_epico.m4a | 133.75 | -23.1 | -10.3 | 12.1 | 4.61 dB / ×0.04 | 0 | 2238 | ok |
| umore_esplorazione_tesa | umore_esplorazione_tesa.m4a | 130.0 | -22.9 | -6.6 | 16.3 | 0.59 dB / ×0.4 | 0 | 2110 | ok |
| umore_inseguimento | umore_inseguimento.m4a | 116.25 | -23.1 | -9.6 | 13.1 | 5.12 dB / ×0.44 | 0 | 1905 | ok |
| umore_lutto | umore_lutto.m4a | 151.25 | -23.0 | -6.2 | 5.7 | 1.16 dB / ×0.49 | 0 | 2455 | ok |
| umore_rito_sacro | umore_rito_sacro.m4a | 154.5 | -23.0 | -8.6 | 5.9 | 0.99 dB / ×0.54 | 0 | 2507 | ok |
| umore_taverna_calda | umore_taverna_calda.m4a | 150.75 | -23.0 | -6.4 | 4.0 | 0.44 dB / ×0.31 | 0 | 2520 | ok |
| tema_png_baldrin | tema_png_baldrin.m4a | 6.45 | -19.6 | -6.8 | 6.5 | — | 1 | 63 | ok |
| tema_png_ottavia | tema_png_ottavia.m4a | 7.1674 | -19.7 | -9.3 | 7.4 | — | 1 | 71 | ok |
| tema_png_sebastiano | tema_png_sebastiano.m4a | 8.45 | -19.8 | -9.7 | 6.5 | — | 1 | 87 | ok |
| amb_n_mulino_valsecca_neve | amb_neve_sintesi.m4a | 43.0 | -30.4 | -17.9 | 5.5 | 0.57 dB / ×1.24 | 0 | 527 | ok |
| amb_n_piazza_campane | amb_campane_archivio-czechchurchbell.m4a | 29.25 | -30.0 | -15.0 | 5.5 | 1.27 dB / ×0.39 | 0 | 358 | ok |
| amb_scena_forno_vecchio_fuoco | amb_fuoco_sintesi.m4a | 43.0 | -30.4 | -4.5 | 1.6 | 2.1 dB / ×0.09 | 0 | 539 | ok |
| amb_scena_forno_vecchio_taverna | amb_folla_archivio-crowdtalkinglou.m4a | 41.75 | -30.1 | -16.6 | 3.2 | 0.31 dB / ×1.27 | 0 | 511 | ok |
| sfx_campana | sfx_campana_soundfont.m4a | 6.95 | -20.6 | -7.3 | 8.6 | — | 1 | 78 | ok |
| sfx_chiave | sfx_chiave_archivio-slidelockpro-v1.m4a | 0.45 | -21.0 | -11.4 | 0.0 | — | 0 | 6 | ok |
| sfx_monete | sfx_monete_archivio-coinsfallingout.m4a | 2.71 | -21.0 | -3.1 | 0.0 | — | 0 | 36 | ok |
| sfx_porta | sfx_porta_archivio-door-knob-sound.m4a | 0.59 | -24.9 | -2.9 | 0.0 | — | 0 | 8 | ok |

Peso totale: 22.6 MB.

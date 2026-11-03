# Controlli audio di «ponte-lanterne»

Misure sul file finale decodificato (qualita.py): loudness integrata (ebur128), true peak, LRA,
giunta del loop (salto di livello in dB tra gli ultimi e i primi 50 ms; rapporto del salto di campione
sulla variazione tipica: sopra 8 è un clic), silenzi (sotto −50 dB per più di 1,5 s).

| id | file | durata s | LUFS | TP dB | LRA | giunta | silenzi | KB | esito |
|---|---|---|---|---|---|---|---|---|---|
| luogo_n_chiesa | luogo_n_chiesa.m4a | 154.5 | -23.0 | -8.6 | 5.9 | 0.99 dB / ×0.54 | 0 | 2507 | ok |
| luogo_n_passo_vecchio | luogo_n_passo_vecchio.m4a | 101.5 | -23.5 | -3.5 | 9.4 | 1.84 dB / ×0.31 | 0 | 1647 | ok |
| luogo_scena_borgo_basso | luogo_scena_borgo_basso.m4a | 116.25 | -23.1 | -9.6 | 13.1 | 5.12 dB / ×0.44 | 0 | 1905 | ok |
| luogo_scena_casa_del_sale | luogo_scena_casa_del_sale.m4a | 150.75 | -23.0 | -6.4 | 4.0 | 0.44 dB / ×0.31 | 0 | 2520 | ok |
| luogo_scena_ponte_imbrunire | luogo_scena_ponte_imbrunire.m4a | 177.75 | -23.0 | -9.7 | 5.5 | 1.58 dB / ×0.37 | 0 | 2932 | ok |
| luogo_scena_terzo_tocco | luogo_scena_terzo_tocco.m4a | 148.0 | -23.0 | -6.8 | 7.7 | 1.01 dB / ×1.05 | 0 | 2406 | ok |
| umore_combattimento_epico | umore_combattimento_epico.m4a | 134.5 | -23.0 | -7.4 | 7.8 | 1.52 dB / ×0.32 | 0 | 2200 | ok |
| umore_esplorazione_tesa | umore_esplorazione_tesa.m4a | 155.25 | -23.2 | -3.3 | 22.4 | 0.73 dB / ×0.95 | 0 | 2526 | ok |
| umore_inseguimento | umore_inseguimento.m4a | 133.75 | -23.1 | -10.3 | 12.1 | 4.61 dB / ×0.04 | 0 | 2238 | ok |
| umore_lutto | umore_lutto.m4a | 151.25 | -23.0 | -6.2 | 5.7 | 1.16 dB / ×0.49 | 0 | 2455 | ok |
| umore_rito_sacro | umore_rito_sacro.m4a | 148.5 | -23.0 | -6.1 | 11.3 | 0.08 dB / ×0.44 | 0 | 2413 | ok |
| umore_taverna_calda | umore_taverna_calda.m4a | 151.75 | -23.0 | -8.2 | 2.0 | 1.54 dB / ×0.11 | 0 | 2498 | ok |
| tema_png_bice | tema_png_bice.m4a | 6.4573 | -19.7 | -9.7 | 6.5 | — | 1 | 61 | ok |
| tema_png_rosa | tema_png_rosa.m4a | 7.1174 | -19.8 | -10.0 | 11.0 | — | 1 | 70 | ok |
| tema_png_tullio | tema_png_tullio.m4a | 8.3545 | -20.0 | -5.1 | 13.1 | — | 1 | 85 | ok |
| tema_png_vischi | tema_png_vischi.m4a | 8.4 | -19.9 | -6.9 | 4.7 | — | 1 | 87 | ok |
| amb_n_chiesa_folla | amb_folla_archivio-crowdtalkinglou.m4a | 41.75 | -30.1 | -16.6 | 3.2 | 0.31 dB / ×1.27 | 0 | 511 | ok |
| amb_n_passo_vecchio_fiume | amb_fiume_archivio-waterfallingali.m4a | 45.75 | -30.3 | -18.8 | 1.1 | 0.06 dB / ×0.44 | 0 | 560 | ok |
| amb_scena_borgo_basso_pioggia | amb_pioggia_archivio-soundica-fs-333.m4a | 40.25 | -30.0 | -17.3 | 6.6 | 0.38 dB / ×0.64 | 0 | 496 | ok |
| amb_scena_borgo_basso_stalla | amb_stalla_archivio-2020-05-26-19-5.m4a | 19.1 | -29.8 | -11.7 | 10.5 | 0.17 dB / ×0.68 | 0 | 234 | ok |
| amb_scena_casa_del_sale_fuoco | amb_fuoco_sintesi.m4a | 43.0 | -30.4 | -5.0 | 1.9 | 1.95 dB / ×0.95 | 0 | 541 | ok |
| sfx_campana | sfx_campana_soundfont.m4a | 6.9 | -20.6 | -7.2 | 8.7 | — | 1 | 76 | ok |
| sfx_chiave | sfx_chiave_archivio-slidelockpro-v1.m4a | 0.4 | -21.1 | -8.2 | 0.0 | — | 0 | 6 | ok |
| sfx_monete | sfx_monete_archivio-coinsfallingout.m4a | 2.66 | -20.9 | 0.7 | 0.0 | — | 0 | 33 | clipping: 1 campioni al limite |
| sfx_porta | sfx_porta_archivio-door-knob-sound.m4a | 0.54 | -24.9 | -2.9 | 0.0 | — | 0 | 7 | ok |

Peso totale: 31.0 MB.

#!/usr/bin/env bash
# Genera i file di prova dell'audio del proiettore (Ogg Opus 48 kHz mono, pochi KB ciascuno).
set -euo pipefail
F="${1:-$(cd "$(dirname "$0")" && pwd)}"; mkdir -p "$F"; cd "$F"
ff() { /opt/homebrew/bin/ffmpeg -hide_banner -loglevel error -y -f lavfi -i "$1" -ac 1 -ar 48000 -c:a libopus -b:a 24k "$2"; }
# Musica: sinusoidi con un numero intero di periodi in 8 s (il loop non ha giunta).
ff "aevalsrc='0.25*sin(2*PI*220*t)+0.18*sin(2*PI*330*t)':d=8:s=48000" luogo_scena_forno_vecchio.ogg
ff "aevalsrc='0.25*sin(2*PI*262*t)+0.18*sin(2*PI*393*t)':d=8:s=48000" luogo_n_piazza.ogg
ff "aevalsrc='0.25*sin(2*PI*147*t)+0.15*sin(2*PI*294*t)':d=8:s=48000" umore_esplorazione_tesa.ogg
ff "aevalsrc='0.3*sin(2*PI*110*t)*(0.6+0.4*sin(2*PI*2*t))':d=8:s=48000" umore_tensione.ogg
# Ambienti: rumori in loop.
ff "anoisesrc=d=6:c=brown:a=0.35:r=48000" amb_scena_forno_vecchio_fuoco.ogg
ff "anoisesrc=d=6:c=pink:a=0.12:r=48000" amb_scena_forno_vecchio_folla.ogg
ff "anoisesrc=d=6:c=white:a=0.2:r=48000,lowpass=f=600" amb_n_piazza_vento.ogg
# Temi: arpeggi brevi; effetto: un rintocco che si spegne.
ff "aevalsrc='0.35*sin(2*PI*(440+110*floor(t*2))*t)*exp(-3*mod(t\,0.5))':d=3:s=48000" tema_png_ottavia.ogg
ff "aevalsrc='0.35*sin(2*PI*(196+49*floor(t*2))*t)*exp(-3*mod(t\,0.5))':d=3:s=48000" tema_png_baldrin.ogg
ff "aevalsrc='0.5*sin(2*PI*660*t)*exp(-3*t)':d=2:s=48000" sfx_campana.ogg

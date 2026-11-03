"""Percorsi, costanti e strumenti esterni condivisi dalla pipeline audio.

Tutto ciò che si scarica una volta sola (catalogo Incompetech, fondo CC0, SoundFont) sta in
cache/audio/… (fuori da git, vedi .gitignore). Nella campagna finiscono solo i file scelti e già
normalizzati, in campagne/<id>/audio/.
"""

from __future__ import annotations

import shutil
from pathlib import Path

QUI = Path(__file__).resolve().parent
RADICE = QUI.parents[1]                      # la radice del repository

CACHE = RADICE / "cache" / "audio"
CACHE_INCOMPETECH = CACHE / "incompetech"    # pieces.json, genre.json e gli mp3 scelti
CACHE_POOL = CACHE / "pool"                  # il fondo locale di ambienti ed effetti (CC0 / pubblico dominio)
CACHE_SOUNDFONT = CACHE / "soundfont"        # GeneralUser GS (scaricato da setup.sh)
CACHE_LAVORO = CACHE / "lavoro"              # WAV intermedi; si svuota alla fine di ogni campagna

ESPERIMENTI = RADICE / "esperimenti" / "audio"

# ffmpeg di Homebrew (già installato); se è nel PATH si usa quello.
FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
FFPROBE = shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"

# Tutto l'audio si lavora a 48 kHz stereo: è la frequenza nativa di Opus e quella che il Web Audio
# del proiettore usa più spesso, così il browser non ricampiona.
SR = 48_000
CANALI = 2

# Chi siamo, per i siti da cui si scarica (etichetta onesta, niente finti browser).
USER_AGENT = "Cantastorie-audio-pipeline/0.1 (progetto personale, uso non commerciale; scarica una volta e tiene in cache)"

# Pausa minima tra due richieste allo stesso sito (secondi): al massimo una richiesta al secondo.
PAUSA_RICHIESTE_S = 1.1

SOUNDFONT = CACHE_SOUNDFONT / "GeneralUser-GS.sf2"

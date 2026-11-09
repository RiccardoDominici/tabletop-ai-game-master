#!/bin/zsh
# Genera una battuta di prova per ogni voce candidata (mp3) e la trascrive con Whisper.
cd "$(dirname $0)"
typeset -A C
C=(
 nar_130bd00e "130bd00e5d89470bb0352d20b8c4bf8b|[narratore] La neve cade fitta sul vicolo. Dal Sasso arriva il corno, lungo e basso. Cosa fate?"
 nar_2c8cc8e2 "2c8cc8e2ee8e477daa184728fa98cebd|[narratore] La neve cade fitta sul vicolo. Dal Sasso arriva il corno, lungo e basso. Cosa fate?"
 vin_87b5b857 "87b5b857a08d4ccc8185795ff7035a46|Eh? Parla dall'orecchio buono, garzone. I ferri dei muli li ho contati io, stamattina."
 vin_9b0dc462 "9b0dc46209e0464483dcc0015a032111|Eh? Parla dall'orecchio buono, garzone. I ferri dei muli li ho contati io, stamattina."
 vin_bc428593 "bc4285935fd04b8496365a882df2f696|Eh? Parla dall'orecchio buono, garzone. I ferri dei muli li ho contati io, stamattina."
 vin_250d0447 "250d044779734f8495a0db5353a949d7|Eh? Parla dall'orecchio buono, garzone. I ferri dei muli li ho contati io, stamattina."
 luc_2f76992e "2f76992e2e024587b0c3c80c4a4e271e|Non tutti i segreti stanno sotto la neve, signori. Alcuni stanno in sagrestia, ben chiusi."
 luc_50be4cf9 "50be4cf9396c473495bd4491ecff98fd|Non tutti i segreti stanno sotto la neve, signori. Alcuni stanno in sagrestia, ben chiusi."
 luc_ac8ce287 "ac8ce287fdd94dfa8aa2e16b0412fe8d|Non tutti i segreti stanno sotto la neve, signori. Alcuni stanno in sagrestia, ben chiusi."
 nad_e63400ae "e63400ae1f9d4e5a994b87095f6a9dbb|Quell'anello è dei Bonfanti da tre generazioni. Mettetevi il cuore in pace, ragazzi."
 nad_82ff2c16 "82ff2c166a774ee98ef75e7728c20302|Quell'anello è dei Bonfanti da tre generazioni. Mettetevi il cuore in pace, ragazzi."
 nad_b7c7f4a5 "b7c7f4a5e2f04331b99a557a7a0ff868|Quell'anello è dei Bonfanti da tre generazioni. Mettetevi il cuore in pace, ragazzi."
 tab_25a6bfa4 "25a6bfa4b7f4418f8e20e47b7f0df4c4|Io non ho visto niente, giuro! Però, se mi date un soldo, magari mi torna la memoria."
 tab_28b04e20 "28b04e2067384376a3e22adbc9b45bdc|Io non ho visto niente, giuro! Però, se mi date un soldo, magari mi torna la memoria."
 tab_367577d0 "367577d036bb49e4a7799169ed5ec0fc|Io non ho visto niente, giuro! Però, se mi date un soldo, magari mi torna la memoria."
)
for k v in ${(kv)C}; do
  id=${v%%|*}; testo=${v#*|}; testo=${testo#\[narratore\] }
  node ./misura.mjs mp3 "$testo" "$id" "$k.mp3" | grep -o "primo byte ms [0-9]*" | sed "s/^/$k /"
  sleep 0.3
done
node ./trascrivi.mjs *.mp3 | sed 's/,"usage.*//'

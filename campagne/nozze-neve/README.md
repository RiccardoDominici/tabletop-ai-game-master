# Le nozze di neve

Campagna di una sessione (circa due ore, tre-cinque giocatori, livello 1, senza dadi), scritta con la skill
del Preparatore per provare il framework da capo a fondo. Tre scene in tre luoghi.

## La storia in poche righe

A Fontanive, il giorno della prima neve, si sposano Agnese Bonfanti e Tonio Morlacchi, di due case rivali da
tre generazioni. Per usanza la nonna della sposa mette al Sasso delle Promesse, prima del tramonto, l'anello
di casa al dito di Agnese, e ne racconta la storia davanti al paese: ciò che si racconta al Sasso, il paese lo
ripete per sempre. A mezzogiorno l'anello sparisce dalla festa. Lo ha preso Zelia, la sorella della sposa,
che in soffitta ha trovato la verità: l'anello è dei Morlacchi, Ettore lo diede ad Adelina sessant'anni fa per
sposarla, e quel giorno non arrivò al Sasso perché era sul passo nella tormenta a portare su il medico per
Gaspare bambino. Gaspare, lo zio, l'ha vista e tace: ha già venduto il pascolo della dote a un mercante.

La scelta, al Sasso: lasciare che Adelina racconti la storia di sempre (Ettore se ne va, la faida passa agli
sposi), dirla al posto suo (Adelina, umiliata, ritira la dote e il prato resta a Gaspare), o convincerla in
privato a dirla lei (le case si riconciliano, ma per la regola del Sasso i Bonfanti perdono la voce: la loro
storia, da allora, la racconta Ettore).

## Scene

| Scena | File | PNG con voce | Orologi |
|---|---|---|---|
| La casera dei Bonfanti, durante la festa | `scena.yaml` | Adelina, Ettore, Gaspare | tramonto, lite |
| Casa Bonfanti, con la stalla sotto | `scene/scena_casa_bonfanti.yaml` | Zelia, Gaspare | tramonto, zio |
| Il Sasso delle Promesse, al tramonto | `scene/scena_sasso.yaml` (climax) | Adelina, Ettore, Gaspare | tramonto |

Comparse senza voce: la sposa Agnese (muta per usanza fino al sì: mima), lo sposo Tonio, il Custode Ilario
con il Libro del Sasso, suo nipote con il corno, la madre Marta, la levatrice Tilde (sorda, al camino),
Bastiano il garzone accusato.

## PNG

| PNG | Voce | Vuole | Mente su | Segnale |
|---|---|---|---|---|
| Adelina, la nonna | nadine | raccontare al Sasso la storia di sempre | da dove viene l'anello; la prima neve di sessant'anni fa | si aggiusta lo scialle sulle spalle, due volte |
| Ettore Morlacchi, il nonno dello sposo | vincent | sentir dire al Sasso che i Morlacchi non hanno rubato | di chi è l'anello; perché quel giorno non salì | si tira la barba con tutte e due le mani |
| Gaspare Bonfanti, lo zio | lucian | far saltare le nozze, per tenersi il Prato Alto | chi era vicino alla scatolina; il Prato Alto | si toglie gli occhiali e li pulisce sul panciotto |
| Zelia, la sorella della sposa | tabitha | costringere la nonna a dire la storia vera | dov'era a mezzogiorno | si mordicchia la punta della treccia |

Adelina e Zelia (voci simili) non stanno mai nella stessa scena: la nonna tiene la sala e poi sale al Sasso;
la sorella resta a casa, e durante la benedizione tiene il fuoco del focolare.

## Come funzionano indizi, orologi e scelta

- Quattro conclusioni: chi ha preso l'anello e dove (otto indizi), di chi è l'anello (sei), perché Ettore non
  venne (sei), che cosa vuole Gaspare (tre, non chiave). Nessun indizio sta dietro un tiro. Gli indizi
  proattivi: il campanaccio muto della Duchessa al Sasso, le iniziali sul Sasso spazzate dal Custode, la
  lettera che Ettore si rigira in mano.
- Gli orologi: il tramonto (otto segni, uno ogni sei risposte, in tutte le scene), la lite alla casera (sei,
  uno ogni tre), lo zio che cerca l'anello a casa (quattro, uno ogni due). Se lo zio arriva al quarto segno,
  l'anello è nel suo taschino, e si riprende in tre modi.
- La scelta è chi racconta al Sasso: la regola pubblica dice che la casa che ha raccontato il falso perde la
  voce. Il climax si chiude con quattro finali (`esiti` della scena del Sasso).

## Per il master (cose che il Motore oggi non fa da solo)

- **Orologio del tramonto**: all'arrivo al Sasso il Motore lo porta da solo a sei se è sotto, e lassù gli fa
  correre un segno ogni due risposte (`orologi_in_scena` della scena del Sasso); al settimo e all'ottavo segno
  escono il tramonto e il finale. Dal pannello resta a te il +1 a ogni cambio di scena, se vuoi che il
  pomeriggio corra, e il «portalo a otto» quando al Sasso la storia è stata raccontata e l'anello è al dito
  della sposa.
- Se i giocatori salgono al Sasso nel pomeriggio, prima del climax, non c'è una scheda: il narratore improvvisa
  dall'abbozzo di `n_sasso` (il nipote del Custode spazza la neve). La scena del Sasso è il tramonto.
- Ettore (vincent) e Gaspare (lucian) sono due voci maschili basse nella stessa scena: se a orecchio si
  confondono, una nota di regia sulla velocità di Gaspare aiuta.

## Chi vede quale file

- Il narratore in modo A vede canone, orologi, rivelazioni, colli di bottiglia, nodi, sessione, scheda della
  scena e PNG presenti; mai `preparazione`.
- Il selettore del modo B vede solo la parte pubblica (`npx tsx strumenti/contesto_modo_b.ts campagne/nozze-neve`).
- I telefoni vedono la situazione comune e la scheda del proprio PG, con le conoscenze private.
- `brief.yaml`, `NOTE_SULLA_SKILL.md` e `autovalutazione.md` sono per chi prepara.

## Stato degli asset

- Audio: completo (28 MB: brani dei luoghi 5/5, umori 6/6, temi 4/4, ambienti 9/9, effetti 4/4), con
  `scripts/prepara.sh campagne/nozze-neve --senza-immagini`. I brani della casera e di casa Bonfanti sono arrivati
  al terzo giro, con `--riprova-audio`: incompetech.com era irraggiungibile per un problema di DNS passeggero.
- Immagini: 18 in tutto (3 luoghi, 4 ritratti, 11 situazioni). Non le ho generate io (la GPU era di un'altra
  generazione); una prima tornata, partita mentre correggevo la campagna dopo la revisione, ha fatto i luoghi e
  tre ritratti: `luogo_scena_casa_bonfanti.jpg` viene dal prompt vecchio (la campanella sul camino) e va
  rifatta. Il resto con `scripts/prepara.sh campagne/nozze-neve` quando la GPU è libera. Finché mancano, la
  campagna non è «pronta da giocare» per la definizione della skill.

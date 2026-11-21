# Rule set of the campaigns

Request from Riccardo: the user can put their rulebook in a folder of the project. The manual is optional: without one, the SRD 5.2 applies. When a campaign is created, a rule set is also created from the manual, and the session uses it every time. So that «la gente capisce le regole» (people understand the rules).

In short:
- `manuali/` contains the manual (PDF, md, txt) and never enters git.
- `campagne/<id>/regole/` contains the set: `regole.yaml` (the structure), `riassunto.md` (for the players) and
  `estratti/*.md` (passages of the manual to consult).
- The Engine rolls with the set.
- The arbiter decides with the manual's vocabulary, and receives only the passages relevant to the action.
- The card shows the rule applied.
- The phone has the «Regole» (Rules) sheet and «Chiedi una regola» (Ask a rule).

## 1. Where things are

| Path | Who writes it | In git |
|---|---|---|
| `manuali/<file>.pdf|.md|.txt` | the user | **never** (`manuali/` in the root .gitignore) |
| `campagne/<id>/regole/regole.yaml` | the Preparer skill, from the extracted text of the manual | only if `licenza.libera: true` |
| `campagne/<id>/regole/riassunto.md` | the skill (≤ 400 words, for the players) | as above |
| `campagne/<id>/regole/estratti/<id>.md` | the skill (passages of the manual, ≤ 12 lines each) | as above |
| `assets/regole/srd-5.2/` | the code (summary and passages of the SRD 5.2, CC-BY-4.0; in `en/` the English ones) | yes |

**Without `regole/regole.yaml`** the campaign plays with the SRD 5.2 from the code (apps/server/src/regole/srd.ts). The summary and passages come from `assets/regole/srd-5.2/` (in Italian; for the other content languages from `assets/regole/srd-5.2/<codice>/`, today `en/`). Today's campaigns also play this way, identically to before.
- **With `id: srd-5.2`** it is the same, but the campaign's summary and excerpts take the place of the SRD's ones.
- **A broken `regole.yaml`** does not stop the session: the error goes to the log («set non valido, si gioca con l'SRD 5.2» (invalid set, playing with the SRD 5.2)) and the game falls back to the SRD.

**License.** A set derived from a non-free manual (`licenza.libera: false`) stays on this computer.
- The loader writes `regole/.gitignore` with `*`.
- The test `apps/server/test/regole-integrazione.test.ts` fails if a `regole.yaml` tracked by git has `libera: false`, or if `manuali/` is missing from .gitignore.
- The passages of a non-free manual are short quotations, for personal use; they are not published.

## 2. regole.yaml: the schema (for the validator and the skill)

```yaml
id: due-sei-mondo            # [V] lowercase letters, digits, - and .; «srd-5.2» = the SRD of the code
nome: "Mondo a 2d6"          # [V] as the players see it
per_il_narratore: "…"        # optional: how the roll works, in one sentence (if missing, the code writes it)
fonte:
  titolo: "…"                # [V] title of the manual
  autore: "…"                # optional
  file: "manuali/mondo.pdf"  # optional: where it was extracted from
licenza:
  nome: "CC-BY-4.0"          # [V] or «proprietaria» (proprietary), «CC0», …
  libera: true               # [V] boolean; false = the set does not go in the repository
  attribuzione: "…"          # optional: goes in the credits and in the «Regole» sheet
risoluzione:
  tipo: d20_cd | 2d6_fasce | sotto_soglia   # [V]
  # d20_cd:       dado: 20
  # 2d6_fasce:    dadi: 2; bands from the highest, min included, the last with min empty
  fasce:
    - {min: 10, esito: successo, nome: "Successo pieno"}
    - {min: 7, esito: parziale, nome: "Successo con un costo", significato: "riesce, ma…"}   # significato: optional
    - {min: null, esito: fallimento, nome: "Fallimento"}
  # d20_cd: optional critico (natural die ≥ this: succeeds anyway), disastro (≤ this: fails anyway),
  #   critici: attacchi | attacchi_e_salvezze | tutti (which rolls they apply to: attacks; attacks and the saving throws,
  #   the abilities marked `salvezza: true`, as Basic Fantasy p. 60 wants; every roll). If the set does not write them,
  #   the SRD ones apply: 20 and 1, only in attacks; `critico: null`, `disastro: null` remove them. The fight's death
  #   saves keep their own (`combattimento.danni.tiri_morte`). [V] attacchi_e_salvezze needs one ability marked.
  # sotto_soglia: dado: 20 | 100 [V]; optional critico (≤ this), disastro (≥ this), gradi
  dado: 100
  critico: 1
  disastro: 100
  gradi: [{divisore: 5, nome: "Successo estremo"}, {divisore: 2, nome: "Successo difficile"}]   # significato too
caratteristiche:              # [V] at least one; snake_case ids, unique
  - {id: fascino, nome: "Fascino"}
abilita:                      # optional; caratteristica = an existing id [V]
  - {id: persuadere, nome: "Persuadere", caratteristica: potere}
  - {id: scalare, nome: "Scalare pareti", caratteristica: null, soglia: {dado: 100}}               # optional [V]:
  - {id: porte, nome: "Porte segrete", caratteristica: null, soglia: {dado: 6, predefinita: 1}}   #   rolled separately
  - {id: ascoltare, nome: "Ascoltare", caratteristica: null, soglia: {dado: 100}, segreta: niente}   # optional [V]: the Game
    # Master rolls it in secret (M9): the Engine's dice even with manual rolls, the card only on the panel; the narrator
    # hears how a failure is told: `niente` (nothing to notice: listening, finding traps) or `riuscita` (the character
    # believes it worked: moving silently, hiding)
  - {id: borseggiare, nome: "Borseggiare", caratteristica: null, soglia: {dado: 100, grave: {oltre_volte: 2, col_massimo: true, nome: "la vittima se ne accorge"}}}
    # optional [V]: a failure band: a failed roll above oltre_volte × the threshold (or the die's top face) is a bad
    # failure, named in the fact (Basic Fantasy's pick pockets, p. 9)
  - {id: alle_spalle, nome: "Attacco furtivo", caratteristica: forza, danno: doppio, una_volta_per_bersaglio: true, ripiego: mischia}
    # optional [V]: an attack ability that doubles the weapon's damage roll, usable once per target per fight; then the
    # attack rolls with `ripiego` (Basic Fantasy's sneak attack, p. 9)
  - {id: ts_veleno, nome: "Tiro salvezza contro veleno", caratteristica: null, salvezza: true}    # optional [V] true or a column:
    # a saving throw of the manual: the Engine cannot tell one by its id, and `critici: attacchi_e_salvezze` needs it
    # A save is pinned to its own number (regole/salvezze.ts): `true` = the sheet's bonus against the default difficulty;
    # a column id of `tiri_salvezza` (below) = the class table's number for the sheet's class and level. Never a difficulty
    # rung nor the arbiter's advantage (only a fight's condition with `svantaggio_salvezze`); the card is a `salvezza`.
    # rolled below the sheet's threshold, as in the manual: d100 for percentages (scalare: 80 = 80%), d6 for «x su 6» (x out of 6)
    # (porte: 2 = 2 out of 6), d20. `predefinita`: the threshold for whoever lacks the value («1 su 6» (1 out of 6) for everyone);
    # without it, whoever lacks it rolls like any check of the set. The validator checks that the value is between 0 and the die.
modificatore:
  tipo: srd | diretto | soglia | tabella # [V] srd = (p−10)/2; diretto = the value is the bonus; soglia = only with sotto_soglia [V];
                                         #   tabella = the sheet writes the score, the bonus comes from the manual's table
  tabella:                    # only with tabella [V]: rows from the lowest score, each applies from its `da` upward
    - {da: 3, mod: -3}        #   (Basic Fantasy: 3 −3; 4–5 −2; 6–8 −1; 9–12 0; 13–15 +1; 16–17 +2; 18 +3). Below the
    - {da: 13, mod: 1}        #   first row, the first applies; the validator warns (strict: error) for a score below
difficolta:                   # [V] d20_cd: the CD (difficulty class) value required; sotto_soglia: divisor (1 = normal);
  - {id: normale, nome: "Normale", modificatore: 0}          #     2d6_fasce: roll modifier (0 if missing)
  - {id: difficile, nome: "Difficile", valore: 19, percentuale: -20}   # optional [V]: percentage points a d100 threshold
                                                             #   ability gets at this rung (a slimy wall: −20, M9)
  - {id: rischiosa, nome: "Rischiosa", modificatore: -1}
difficolta_predefinita: normale   # [V] among the difficulties; if missing, the middle one
vantaggio:
  tipo: due_dadi | dado_bonus | bonus | nessuno   # [V] due_dadi: one extra die is rolled (d20: the best;
  valore: 1                                        #   2d6: the two best are kept; sotto soglia: the lowest)
                                                   #   dado_bonus: d100 only, one extra tens die
                                                   #   bonus: ± value to the roll
attacchi:
  tipo: prova | automatico   # prova: rolled with the weapon's ability/characteristic (d20_cd against the defense
  armatura_riduce: true      #   of the target); automatico: always hits, only the damage is rolled
  parziale: scambio          # 2d6: with a partial success the target also hits
  danno_critico: doppio      # doppio (SRD, default): with a critical the damage dice are doubled; normale: no
  danno_minimo: 0            # a successful hit deals at least this much damage (Basic Fantasy: 1; default 0)
modificatori:                 # optional: situational attack modifiers (regole/modificatori.ts, prove/modificatori.ts)
  - id: da_dietro             # [V] snake_case, unique
    nome: "Attacco da dietro" #   said on the card's rule: «… (compresi: Attacco da dietro +2)»
    bonus: 2                  # [V] an integer from −10 to 10, not 0, added to the attack roll
    attacchi: tutti           # [V] tutti | mischia | distanza (the weapon's `distanza`)
    parole: [alle spalle, da dietro]   # [V] at least one: words of what the PC does that make it apply (start of a word)
    armi: [lancia]            # optional: words of the weapon's id it needs (a charge needs a spear); empty = any
    non_con: [alle_spalle]    # optional [V] abilities of the set it does not combine with (the thief's sneak attack)
    danno: doppio             # optional [V] normale | doppio: a hit deals double damage (Basic Fantasy's charge)
  # The Engine knows no positions: only a PC's action has words, so an NPC's attack never gets one. When one applies,
  # the arbiter's own advantage for that action is dropped (never ±2 twice for one situation); help and conditions stay.
danni: {nome: "Ferite", a_zero: "Fuori gioco: …"}
condizioni: [{id, nome, effetto}]          # text for the narrator and the summary
sociale:                                    # what is rolled to persuade an NPC, if the arbiter does not say
  caratteristica: fascino                   # [V] existing
  abilita: persuadere                       # [V] existing
  nota: "Per convincere si usa la mossa Convincere."   # the arbiter reads it
mosse:                                      # optional (PbtA-style games)
  - id: convincere                          # [V]
    nome: "Convincere qualcuno"
    quando: "quando cerchi di convincere un PNG con parole, promesse o minacce"   # the arbiter reads it
    caratteristica: fascino                 # [V] existing
    esiti: {successo: "…", parziale: "…", fallimento: "…"}   # [V] successo and fallimento required
sottosistemi: [{id, nome, testo}]           # other (magic, health…): text only, for now
parole_chiave:                              # optional, for the rules arbiter (local profile): id → words
  convincere: [convinco, persuado, prometto]  # [V] an id of a skill, move or characteristic of the set; [V] no generic words on their own
                                              #   (lingue/<codice>/prove.yaml, parole.generiche: porta (door),
                                              #   passaggio (passage), spalla (shoulder)…): the arbiter ignores them, the validator flags them
                                              #   (strict: error), also in the `parole` of the scene's checks and of
                                              #   passages with `per:`; an entry of several words («passaggio segreto» (secret passage)) is fine
combattimento:                              # optional: without it, the full SRD for the SRD and a default for the other types
  iniziativa:
    tipo: individuale | per_schieramento | nessuna   # [V]
    dado: 20                                # [V] 4, 6, 8, 10, 12 or 20
    caratteristica: destrezza               # [V] existing, or null
    ogni_round: false                       # boolean: rolled again each round (B/X by side, Basic Fantasy
                                            #   individual: 1d6 + Dexterity for each, new order from the next round)
    pari: ordine | simultanei               # [V] individual only: ties in the fixed order (default: higher modifier,
                                            #   then the PCs) or at the same moment (Basic Fantasy p. 51): tied PCs share one
                                            #   window, tied NPCs act right after them, and one they dropped still strikes
  fasi:                                     # [V] at least one; snake_case ids
    - {id: mischia, nome: "Mischia", png: attacco_mischia}   # [V] png: attacco | attacco_distanza | attacco_mischia | null
  azioni: [{id, nome, quante}]              # economy of the turn (text)
  danni:
    modello: pf | ferite | stress           # [V]
    a_zero: {pg: tiri_morte | fuori_gioco | morte, png: morte | fuori_gioco}   # [V]
    tiri_morte: {cd: 10, successi: 3, fallimenti: 3, venti_rialza: true, uno_doppio: true}
    # optional [V]: abilita: ts_morte (the PC's own save of the set instead of `cd`), finestra: "2d10" (a success leaves it
    #   dying for these rounds; binding wounds, a power with `stabilizza`, or healing saves it), perde_incantesimi: true
    #   (a caster who survives 0 loses its prepared spells). Basic Fantasy's «Save vs. Death», p. 188 (prove/morte.ts).
    # venti_rialza: a natural 20 gets back on its feet with 1 HP; uno_doppio: a natural 1 counts as two failures.
    # These are SRD 5.2 rules: they apply if the set does not write them (before, they applied to every set, even where the
    # manual does not have them, like Basic Fantasy's «save vs. death»).
  condizioni:                               # [V] snake_case ids; effects from the closed list (docs/combattimento.md §2)
    - {id: prono, nome: "Prono", icona: "⬇", effetti: [svantaggio_attacchi, attacchi_contro_vantaggio], testo: "…"}
  condizione_a_zero: privo_di_sensi         # [V] among the conditions, or null
  fine: {morale: true}                      # B/X morale: 2d6 against the NPCs' scheda.morale
  sorpresa: {dado: 6, fino_a: 2, condizione: sorpreso}   # [V] B/X surprise: 1d6 per side, 1–2 loses round 1 (a set's condition)
tiri_salvezza:                              # optional [V]: the manual's save categories, in the table's order
  colonne: [{id: morte, nome: "Raggio della morte o veleno"}, {id: incantesimi, nome: "Incantesimi"}]
classi:                                     # optional [V]: the classes and their level tables (regole/classi.ts)
  - id: mago
    nome: "Mago"
    tiri_salvezza: [{da: 1, valori: [13, 15]}, {da: 4, valori: [12, 13]}]   # [V] one value per column; `da` grows
    incantesimi_al_giorno: [{da: 1, slot: [1]}, {da: 3, slot: [2, 1]}]      # [V] spells per day by spell level
    # Progression (M1, regole/progressione.ts), all optional [V]; rows hold from their `da` up, `da` growing:
    px: [0, 2500, 5000, 10000]              # [V] XP to reach level 1, 2, 3… (growing); the level an XP total reaches
    dadi_vita: [{da: 1, dado: "1d4"}, {da: 10, fissi: 1}]   # [V] what each level adds: one die (with progressione's
                                            #   characteristic, at least its minimo), or fixed HP without it (after 9th)
    attacco: [{da: 1, bonus: 1}, {da: 4, bonus: 2}]   # [V] the attack bonus, given to progressione.attacco's abilities
    abilita:                                # [V] ability values by level (the thief's percentages): set ability ids
      colonne: [scassinare, ascoltare]
      righe: [{da: 1, valori: [25, 30]}, {da: 2, valori: [30, 34]}]   # one value per column
    tabelle:                                # [V] a power rolled against a class table (poteri[].tabella): power id →
      scacciare_non_morti: [{da: 1, valori: [13, 17, null]}, {da: 8, valori: [T, 3, 7]}]   # rows, one cell per column:
                                            #   the number to reach, T (no roll), D (the stronger result), null (No)
progressione:                               # optional [V]: how the class tables reach a sheet (regole/progressione.ts)
  attacco: [mischia, distanza, {abilita: alle_spalle, piu: 4, classi: [ladro]}]   # abilities whose value is the attack
                                            #   bonus (+ piu; with `classi`, only for those classes: the thief's sneak attack)
  punti_ferita: {caratteristica: costituzione, minimo: 1}       # each hit die adds its bonus; a die gives at least 1
  un_livello_per_avventura: true            # XP earned in one session stop one short of the level after next (p. 49)
esperienza:                                 # optional [V]: XP in play (regole/esperienza.ts, prove/esperienza.ts)
  per_dadi_vita: [{da: 0, px: 10, speciale: 3}, {da: 1, px: 25, speciale: 12}]   # a defeated creature's worth by hit dice
  oltre: {px: 750, speciale: 25}            #   (0 = less than 1) and per asterisk; each hit die above the last row
  tesoro: {px: 1, per: mo, quando: al_sicuro}   # optional: XP per coin of treasure; trovato (when found) | al_sicuro
                                            #   (when the Game Master marks it back to safety, Basic Fantasy p. 190)
razze:                                      # optional [V]: races and their traits (regole/tratti.ts)
  - id: halfling
    nome: "Halfling"
    tratti:                                 # [V] the closed list; also `classi[].tratti` and the sheet's own `tratti`
      - {tiro: iniziativa, bonus: 1}        #   added to initiative
      - {tiro: abilita, abilita: [distanza], bonus: 1}             # to those abilities' rolls (attacks included)
      - {tiro: salvezza, colonne: [morte, incantesimi], bonus: 4}  # to the saves of those table columns
      - {immune: [paralisi_ghoul]}          #   powers or conditions it ignores
      - {sorpresa: -1}                      #   its own surprise range (the side's die read against each member's)
      - {almeno: {nascondersi: 70}}         #   an ability at least this value (the class table's or this, the better)
      - {dado_vita_massimo: 6}              #   never a hit die bigger than a d6 (Basic Fantasy's elves and halflings)
      - {tiro: esperienza, bonus: 10}       #   +10% to the XP it earns (humans)
magia: {preparazione: vanciana}             # optional [V]: vanciana (each prepared copy is one cast, back at a rest)
                                            #   | slot (the sheet's spells are known; a cast spends a slot of its level)
risorse:                                    # optional [V]: per-character counters (prove/risorse.ts), in the snapshot
  - {id: frecce, nome: "Frecce", ricarica: mai}   # ricarica: mai | riposo (a rest that refreshes) | scontro (a fight's end)
poteri:                                     # optional [V]: spells, items, class actions, hazards (regole/poteri.ts)
  - id: sonno
    nome: "Sonno"
    tipo: incantesimo                       # [V] incantesimo (a prepared copy and a slot) | oggetto (off the sheet) | azione | pericolo
    livello: {mago: 1}                      # [V] incantesimo: class → spell level
    bersaglio: nemici                       # [V] se_stesso | uno | nemici | alleati
    dadi_vita_max: 3                        # only targets of these hit dice or fewer (sheet `dadi_vita`; a PC's level)…
    oppure_uno_fino_a: 4                    #   …or, with none of them, a single one up to this
    salvezza: {abilita: ts_incantesimi, esito: annulla, modificatore: 0}   # [V] each target's own save: annulla | dimezza
    immuni: [non_morto]                     # creature types (sheet `tipo`) it never affects; solo_tipi: the only ones
    parole: [sonno, addormento]             # the words that call it (the rules arbiter); its name counts too
    effetti: [{tipo: condizione, condizione: addormentato, durata: {round_per_livello: 5}, finisce_se_ferito: true}]
    ostile: true                            # opens a fight on an NPC (default: it deals damage or attacks)
    descrittivo: false                      # true and no effetti: the cost is spent, the narrator tells the rest
  - id: scacciare_non_morti                 # a power rolled against the author's class table (Turn Undead)
    tipo: azione
    bersaglio: nemici
    solo_tipi: [non_morto]
    tabella:                                # [V] the cells are the class rows `classi[].tabelle.<this id>`
      dado: "1d20"                          #   the author's roll, once for the whole group
      colonne: [{id: scheletro, nome: "Scheletro", dadi_vita: 1}, {id: zombi, nome: "Zombi", dadi_vita: 2}]
                                            #   a target's sheet `tipo` names its column, else its hit dice pick it
      colpiti: "2d6"                        #   hit dice affected on a success, weakest first, at least one creature
      distrugge: {dadi: "1d8", per_livello: true}   # a D cell: this damage rolled once for all (× the author's level)
      dopo_fallimento: {turno: 1}           #   no new attempt for this long after a failed or partly failed roll
    effetti: [{tipo: condizione, condizione: scacciato, durata: {turno: "2d4"}}]   # each target affected
cadute: {dadi: "1d6", ogni: 10, unita: "piedi", arrotonda: vicino, massimo: 20}   # optional [V]: falling damage
  # (Basic Fantasy p. 59): `dadi` per step of `ogni` (in `unita`, said on the card); `vicino` rounds to the nearest step
  # (1–4 feet nothing, 5–14 feet 1d6), `giu` counts full steps only (SRD 5.2); at most `massimo` steps. Without it a fall
  # deals nothing (logged).
riposo:                                     # optional [V]: the kinds of rest the Game Master gives from the panel
  - {id: notte, nome: "Una notte di sonno", cura: 1, durata: {ora: 8}}   # cura: a whole number, a formula rolled for each, or tutti
  - {id: a_letto, nome: "Un giorno a letto", cura: 2, ricarica: true}   # ricarica (default true): resources come back
                                            # durata [V]: what it takes on the game clock (units of `tempo`)
tempo:                                      # optional [V]: the game clock (regole/tempo.ts, prove/tempo.ts; Basic Fantasy p. 42)
  unita:                                    # [V] from the smallest; `secondi` its length
    - {id: round, nome: "Round", plurale: "round", secondi: 10}
    - {id: turno, nome: "Turno", plurale: "turni", secondi: 600}
    - {id: ora, nome: "Ora", plurale: "ore", secondi: 3600}
  round: round                              # [V] the unit of a fight's round
  per_finestra: {turno: 1}                  # a closed window outside a fight (exploring); a scene may say its own
                                            #   (`scena.yaml → tempo_per_finestra: {round: 6}`, a talk in a tavern)
  azioni: [{parole: [perquisisco, frugo], durata: {turno: 3}}]   # optional: actions that take longer, by their words
  inizio: {ora: 18}                         # optional: the time of day the session starts at (day 1)
viaggio:                                    # optional [V]: overland travel (Basic Fantasy p. 45); needs tempo and movimento
  unita: miglia
  per_movimento: 2                          # a day's distance per unit of the round's movement (12 m → 24 miles)
  ore_al_giorno: 8
  terreni: [{id: strada, nome: "Strada lastricata", per: 1.333}, {id: montagna, nome: "Montagna", per: 0.333}]
monete:                                     # optional [V]: the manual's coins (regole/catalogo.ts; Basic Fantasy p. 10)
  base: mo                                  # the coin a price is written in when it names none
  prezzi: [mo, ma, mr]                      # optional: the coins prices are written in and change is given in
  peso: {quante: 20, peso: 1}               # optional: 20 coins weigh 1 unit of carico.unita
  tagli:                                    # [V] worth in the smallest coin (whose vale is 1)
    - {id: mp, nome: "Monete di platino", vale: 500}
    - {id: mo, nome: "Monete d'oro", vale: 100}
    - {id: mr, nome: "Monete di rame", vale: 1}
catalogo:                                   # optional [V]: the item catalog (mechanism M2; regole/catalogo.ts)
  difesa: {senza_armatura: 11, caratteristica: destrezza}   # AC with no armor, and the characteristic that adds to it
  abilita: {mischia: mischia, distanza: distanza}           # the set's attack abilities for melee and missile lines
  danno_caratteristica: forza               # its bonus adds to melee and thrown damage (and to `forza_al_danno` missiles)
  gittate:                                  # range bands, nearest first (Basic Fantasy p. 11)
    unita: metri
    parole_unita: [metri, metro, m]         # a distance the player says («a 20 metri») picks the band
    fasce:
      - {id: corta, nome: "Gittata corta", bonus: 1, parole: [da vicino]}   # parole: say the band without a number
      - {id: media, nome: "Gittata media", bonus: 0}
      - {id: lunga, nome: "Gittata lunga", bonus: -2, parole: [da lontano]}
    predefinita: media                      # the band when the player says neither
  armi:                                     # [V] costo: a number in `base` or «15 ma»; peso and costo of a pack of `confezione`
    - {id: spada_lunga, nome: "Spada lunga", danno: "1d8", taglia: M, peso: 4, costo: "10 mo", proprieta: [taglio]}
    - {id: pugnale, nome: "Pugnale", danno: "1d4", taglia: S, peso: 1, costo: "2 mo", lancio: {gittate: [3, 6, 9], nome: "Pugnale lanciato"}}
    - {id: lancia, nome: "Lancia", danno: "1d6", a_due_mani: {danno: "1d8", nome: "Lancia a due mani"}, lancio: {gittate: [3, 6, 9]}}
    - {id: arco_corto, nome: "Arco corto", danno: "1d6", mani: 2, gittate: [15, 30, 45], munizioni: [freccia]}   # [V] one limit per band
    - {id: balestra_leggera, nome: "Balestra leggera", danno: "1d6", gittate: [18, 36, 54], munizioni: [quadrello], ricarica: 2}
    - {id: fionda, nome: "Fionda", danno: "1d4", gittate: [9, 18, 27], munizioni: [proiettile], forza_al_danno: true}
  armature: [{id: cotta_di_maglia, nome: "Cotta di maglia", ca: 15, categoria: metallo, peso: 40, costo: "60 mo"}]   # max_caratteristica: SRD
  scudi: [{id: scudo, nome: "Scudo", bonus: 1, peso: 5, costo: "7 mo"}]
  munizioni: [{id: freccia, nome: "Frecce", peso: 0.1, costo: "1 ma"}]
  attrezzatura:
    - {id: zaino, nome: "Zaino", peso: 0.1, costo: "4 mo", capienza: 40}
    - {id: torcia, nome: "Torcia", peso: 1, confezione: 6, costo: "1 mo", luce: {raggio: 9, fioca: 6, durata: "1d4+4", unita: turno}}
    - {id: lanterna, nome: "Lanterna", peso: 2, costo: "5 mo", luce: {raggio: 9, fioca: 6, durata: "1d6+18", unita: turno, consuma: olio}}
  restrizioni:                              # [V] by class or race: what it may use, and the penalty otherwise
    - {classe: mago, cosa: arma, ammessi: [pugnale, bastone], penalita: {attacco: -5}}
    - {classe: mago, cosa: armatura, ammessi: [], penalita: {senza_incantesimi: true}}
    - {classe: ladro, cosa: armatura, ammessi_categorie: [cuoio], penalita: {senza_abilita: [scassinare, alle_spalle]}}
    - {classe: chierico, cosa: arma, ammessi_proprieta: [contundente], penalita: {perde_incantesimi: true}}
    - {razza: halfling, cosa: arma, vietati_taglie: [L], penalita: {vietato: true}}
    # penalita (closed list): attacco (to hit with that weapon), vietato (no attack line, cannot be worn; the validator
    # rejects a sheet that starts with it), senza_incantesimi (worn: no spell), senza_abilita (worn: those abilities are
    # refused), perde_incantesimi (an attack with it empties the day's spells)
carico:                                     # optional [V]: load bands (mechanism M8; regole/carico.ts; Basic Fantasy p. 42)
  unita: libbre                             # the unit of the catalog's weights
  caratteristica: forza                     # its score (the sheet's value, not its bonus) picks the row
  fasce: [{id: leggero, nome: "Carico leggero"}, {id: pesante, nome: "Carico pesante"}]   # beyond the last: overloaded
  limiti: [{da: 3, valori: [25, 60]}, {da: 9, valori: [60, 150]}]   # [V] rows from the lowest score, one limit per band
  per_razza: {halfling: [{da: 3, valori: [20, 40]}]}                 # a race's own rows
  peso_armatura: {halfling: 0.25}           # a race's armor weighs this fraction
movimento:                                  # optional [V]: movement per round by the worn armor's category and the band
  unita: metri
  per_turno: 3                              # exploring, a turn covers this many times the round's rate
  righe:                                    # [V] `nessuna` = no armor; one rate per band of carico.fasce; overloaded = 0
    - {armatura: nessuna, valori: [12, 9]}
    - {armatura: metallo, valori: [6, 3]}
```

**The catalog in play** (regole/equipaggiamento.ts). A sheet that lists `equipaggiamento` gets its Armor Class and its
attack lines from the catalog, recomputed whenever the gear changes: the worn armor's `ca` (or `senza_armatura`) + the
`difesa.caratteristica` bonus (capped by `max_caratteristica`) + the worn shield; one line per carried weapon (melee with
`abilita.mischia` and the damage characteristic; a two-handed line; a missile line with `abilita.distanza`, the bands,
the ammunition and the rate of fire; a thrown line), in the order the sheet lists them, then the sheet's own lines. A
sheet without `equipaggiamento` (a monster, a set without a catalog) keeps its typed `difesa` and `attacchi`, also when
it picks something up in play (its AC is its own hide: a shield adds to it, only a worn armor replaces it); one that
types both gets a warning, and the gear's numbers stand.

In play (prove/inventario.ts, prove/gittate.ts; docs/prove.md §10): what each character carries and wears and its coins
are counters of the Engine state (`oggetto:<id>`, `moneta:<id>`, the worn armor), in the snapshot like the spell slots.
- A **shot** spends one of the line's ammunition (the first kind the bearer still has; a kind with its own `danno`, a
  sling stone, sets the shot's dice) and is refused at none; a crossbow with `ricarica: 2` shoots once every two rounds
  of a fight (the shot that opens a fight comes before round 1).
- The **range band** comes from the action's words, read by code (the Engine knows no positions): a distance with the
  set's unit («a 20 metri», «a venti metri», number words from the language pack's `parole.numeri`) against the line's
  limits; else a band's `parole` («da vicino»); else `predefinita`, and the card says the distance was not given. Beyond
  the long limit there is no shot. The band's bonus is added and named on the card. A set with bands should not also
  have word `modificatori` for range (they would add twice).
- **Restrictions** apply where they bite: a weapon's `attacco` penalty on its card; a `vietato` weapon gives no line and a
  `vietato` armor cannot be put on; a worn armor with `senza_incantesimi` refuses a cast (`true`: nothing spent) or lets
  it fail and lose the spell (`perso`, Basic Fantasy p. 187); `senza_abilita` refuses a check of those abilities and
  turns a special attack (the sneak attack) into an ordinary one; `perde_incantesimi` empties the day's spells when the
  weapon is used (the cleric's atonement quest is the Game Master's story).
- **Load** (prove/inventario.ts `peso`, `carico`): the weight of every catalog item carried (a pack's weight divided by
  `confezione`; a race's armor by `peso_armatura`) and of the coins (`monete.peso`), its band by the Strength score and
  race, and the movement by the worn armor's category; a change that moves the character to another band or rate says
  so in its fact («Aldo ora ha un carico pesante (53.26 libbre): si muove di 3 metri a round»). The Engine tracks no
  positions: the movement is shown on the panel and the phone, told to the narrator, and used by travel (below).
- **Buying** pays like a player at the counter: the largest coins that do not overpay, then one more coin if something
  is still owed, whichever way hands over and gets back the fewest coins; the change in `monete.prezzi`, largest first; a pack's price is
  divided by `confezione` (three torches of a pack of six cost half its price, rounded up). A purchase that cannot be
  paid changes nothing and only the panel hears it. **Selling** gives the catalog price unless the Game Master types one.

**Typed effects** (regole/effetti.ts; prove/effetti.ts applies them, docs/prove.md §10). A closed list, used by a
scene check's `effetti_se_fallisce`, by the Game Master's hazards and by the set's powers:

```yaml
- {tipo: danno, dadi: "1d6+1", colpi: {ogni_livelli: 3, massimo: 5}}   # [V] colpi: one more roll every n caster levels
- {tipo: danno, dadi: "1d6", dadi_per_livello: {massimo: 10}, tipo_danno: fuoco}   # dice × caster level, capped
- {tipo: cura, dadi: "2d6", bonus_per_livello: {ogni_livelli: 1}}      # +1 per caster level
- {tipo: caduta, altezza: 3}                                           # in the unit of `cadute`
- {tipo: attacco, bonus: 1, dadi: "1d6+1"}                             # a trap: d20 + bonus against the victim's AC
- {tipo: condizione, condizione: addormentato, durata: {round_per_livello: 5}, finisce_se_ferito: true}   # a set condition [V]
- {tipo: bonus, a: difesa | attacchi | salvezze | danni, valore: 3, contro: tutti | mischia | distanza, durata: {round: 5}}
- {tipo: immunita, a: [dardo_incantato], durata: scena}                # powers or conditions the target ignores
- {tipo: stabilizza}                                                   # a dying PC is stable at 0
- {tipo: morte}                                                        # save or die
- {tipo: oggetto, oggetto: corda, quante: 1}                           # a catalog item found (negative: lost)
- {tipo: monete, monete: {mo: 20}}                                     # coins found (negative: paid, with change)
```

Durations: `istantanea`, `{round: N | "XdY", round_per_livello: k}`, a unit of the set's clock (`{turno: "2d8"}`; the
old `{turni: …}` is the unit `turno`; turned into rounds when given; without a clock that has the unit, the scene),
`scena`, `riposo`, `permanente`. Rounds tick on the game clock (prove/tempo.ts, docs/prove.md §11). A scene check (`scena.yaml → prove`, both the SRD's
and a manual's) can add `nome` (the hazard's name on the card) and `effetti_se_fallisce` (applied to the PC who fails).

For combat, the sheets of non-SRD sets can have `attacchi[].distanza: true` (projectile phase) and, for NPCs, `morale` (2–12).

### Sheets for PCs and NPCs in a non-SRD set
The sheets sit in the same places as the SRD sheets: `pg.yaml → personaggi[].scheda` and `png/<id>.yaml → scheda`. The values follow the set, no longer the six D&D characteristics:

```yaml
scheda:
  caratteristiche: {fascino: 2, vigore: -1, …}  # [V] all and only those of the set; integers
  abilita: {persuadere: 65}                     # optional, set ids: bonus (d20, 2d6) or threshold (sotto_soglia)
  pf: 6                                         # [V] > 0 (named as danni.nome)
  difesa: 13                                    # d20_cd: the target's AC; without it, the CD of the default difficulty
  armatura: 1                                   # with armatura_riduce: subtracted from the damage taken
  classe: mago                                  # optional [V]: a class of the set; with `livello` it picks the table rows
  livello: 1                                    #   (a save of a table column then ignores the sheet's own bonus: strict warning)
  razza: elfo                                   # optional: a race of the set (its traits)
  salva_come: {classe: guerriero, livello: 3}   # optional [V]: a monster saves as a class and level («Save As»)
  incantesimi: [dardo_incantato]                # optional [V]: prepared (vanciana: one copy per cast) or known (slot)
  slot: [2, 1]                                  # optional [V]: spells per day by spell level, instead of the class table
  oggetti: {pozione_guarigione: 2}              # optional [V]: items with a power (tipo oggetto) and how many
  risorse: {frecce: 20, monete: 35}             # optional [V]: the starting counters of the set's resources
  tipo: umanoide                                # optional: creature types, read by a power's immuni / solo_tipi
  immune: [sonno]                               # optional: powers or conditions it ignores
  dadi_vita: 3                                  # optional [V]: hit dice, for powers limited by them and an NPC's XP
  px: 0                                         # optional [V]: a PC's XP total (strict: it matches `livello` by the class
                                                #   table); an NPC's or a minion's worth when defeated (else by dadi_vita)
  speciali: 1                                   # optional [V]: a monster's special-ability asterisks («1**» = 2), for its XP
  equipaggiamento:                              # optional [V]: catalog ids carried; the first armor and shield are worn
    - cotta_di_maglia                           #   (unless {id, indossato: false}); AC and attack lines come from them
    - spada_lunga
    - {id: freccia, quante: 20}
  monete: {mo: 12, ma: 5}                       # optional [V]: coins by the set's coin ids
  attacchi: [{nome: "Spada", danno: "1d8", caratteristica: vigore}]   # or abilita: combattere
                                                # with equipaggiamento: only the special lines, e.g.
                                                # {nome: "Spada corta alle spalle", arma: spada_corta, abilita: alle_spalle}
                                                # automatico: true = the weapon always hits, only the damage
                                                # consuma: frecce = each attack spends one; refused at 0 [V]
```

**Progression** (M1, regole/progressione.ts; the validator's mirror is strumenti/valida/regole_progressione.py, which
strumenti/tra_sessioni.py also uses). With a class that has `attacco` rows and `abilita` tables, a sheet writes no attack
bonus and no thief percentages: the Engine derives them from its `classe` and `livello` (the abilities of
`progressione.attacco` get the row's bonus plus their `piu`; the class's ability table gives its columns; a trait
`almeno` raises one to at least its number), and derives them again when the level changes (a level-up between
sessions). A value the sheet writes by hand stays, as an override: different from the table it is a warning (an
intended exception, logged by the Engine too); equal to it, a strict warning, since a hand-written number would not grow
with the level. The sheet's `pf` is its maximum at its level: strict warning outside what the class's hit dice can give
(each die with the characteristic's bonus, at least `minimo`; fixed rows exactly). A PC's `px` must give its `livello`
by the class's `px` row (strict warning). Saves and spells per day already come from the class tables (above).

With the SRD 5.2 the sheets remain those of docs/prove.md §2 (scores, proficiencies, calculated AC).

**Checks of the scene** with a non-SRD set, in `scena.yaml → prove`:
`{id: p_…, quando, mossa | abilita | caratteristica (set id), difficolta (set id), se_fallisce, parole, aggiustamento}`.
`aggiustamento` (optional [V], −100 to 100): situational points of this check, added to a threshold ability's threshold
(the slimy wall's −20) or to a d20 check's roll.
`parole` (optional, also with the SRD) are the words that call the check for the rules arbiter, in addition to `quando`.

**Repertoire.** `richiede.prova` with a non-SRD set also accepts the set's ids (moves, skills, characteristics):
`richiede: {prova: convincere}` opens the line only after a successful Convincere move. The loader reads the campaign's set; an id that is neither in the set nor in the SRD is an error.

### riassunto.md and estratti/
- **riassunto.md**: at most 400 words, for the players. It says how rolls work, what the results mean, the main moves or skills, combat, and what advantage does. It uses only `#`/`##` titles, `-` lists and **bold**: the phone shows it this way, without HTML.
- **estratti/<id>.md**: one passage for each rule, at most 12 lines, with the header:
  ```
  ---
  titolo: "Convincere qualcuno"
  parole: [convincere, persuadere, promettere, minacciare]   # [V] at least one: that is how it is found
  pagina: 34                                                  # optional
  per: convincere                                             # optional: the skill or move of the set (rules arbiter)
  ---
  Quando cerchi di convincere un PNG, tira 2d6+Fascino. Con 10+ …
  ```
  The `parole` matter more than the text. Search is by five-letter stems: «convinco» (I convince) finds «convincere» (to convince).
  So the verbs that players write in their actions must be included.

## 3. Engine (apps/server/src/regole/, prove/risolutore-regole.ts)

- **SRD 5.2**: everything as it was (prove/risolutore.ts and arbitro-haiku.ts). The suite stays green.
- **Non-SRD sets**: `MotoreProve` passes to `risolviTurnoRegole`. The sheets are the set's (regole/schede.ts) and the rolls come out of regole/risoluzione.ts:
  - `d20_cd`: d20 + modifier (characteristic with the set's type + the skill's bonus) against the difficulty's CD.
    The naturals of the set (`critico`, `disastro`; SRD: 20 and 1 in attacks) succeed or fail anyway, with the grade «critico» (critical) or «disastro» (disaster) on the card; the critical's damage doubles the dice only with `danno_critico: doppio`.
  - `2d6_fasce`: 2d6 + the move's statistic, or the characteristic's or skill's, + the difficulty, and the matching band. With a move, the fact for the narrator carries the outcome written in the manual.
  - `sotto_soglia`: d20 or d100 ≤ threshold ÷ the difficulty's divisor. The result has a grade («estremo» (extreme), «difficile» (hard)), or is critical or disaster.
  - **Attacks**: `prova` rolls and, if it succeeds, applies the damage minus the armor; with a 2d6 partial and `parziale: scambio` it also hits the target. `automatico` applies only the damage.
- **Card**: the extra fields are `risoluzione`, `facce`, `grado` and `regola`. `regola` is the rule applied, in words: «2d6+2 (Fascino, Convincere qualcuno): 7–9, successo con un costo» (2d6+2 (Charm, Convince someone): 7–9, success with a cost), «Persuadere 65%: d100 difficile, serve 32 o meno» (Persuade 65%: d100 hard, needs 32 or less).

## 4. Arbiter (prove/arbitro-regole.ts)

- **System prompt**, cached for the whole session: the golden rule, the set's lists (characteristics, skills, moves with their `quando`, difficulties), the social note and the summary, cut at 2500 characters.
- **Message**: only the passages relevant to the actions (at most three, eight lines each, found by keywords), plus characters, scene checks and actions, as for the SRD.
- **Schema**: the enums are the set's ids, so the model cannot invent a skill.
- **Normalization**: the Engine discards what does not match the data, as for the SRD.

**Narrator and selector.** When there are rolls, the «Esiti dei tiri» (Roll outcomes) section of the message also carries the set's rules (regole/narratore.ts): how the roll works (`per_il_narratore`, or a sentence from the code) and what each outcome means in the story. For 2d6, for example: «7–9 «Successo con un costo»: riesce, ma devi dare un costo, una scelta difficile o una complicazione: raccontali insieme alla riuscita, mai come un successo pieno» (7–9 «Success with a cost»: it succeeds, but you must give a cost, a hard choice or a complication: narrate them together with the success, never as a full success).
The `significato` of bands and grades replaces it. With the SRD 5.2 the rule stays as always.

## 5. Making the rules understood (phone)

- **«Regole» sheet** (`regole:leggi`): name of the set, source, license and attribution, and `riassunto.md`.
- **«Chiedi una regola»** (`regole:chiedi`): the answer arrives only to whoever asked, in the event's ack. It is given by Haiku (regole/chiedi.ts) in at most eighty words.
  - The context contains only the summary and the passages found for the question: no scenes, NPCs or campaign secrets.
  - One question at a time on each phone, one every 4 s.
  - Without a model (script-driven narrator) the box is absent (`domande: false`).

## 6. Open

- **Skill and validator**: done. The text is extracted with `strumenti/regole/estrai.py`; the Preparer skill writes the set at step 1b; the `[V]` checks sit in the `REGOLE` class (`strumenti/valida/regole_set.py`). For the SRD, simply do not write `regole/`.
- **Requires with a non-SRD set**: `richiede.prova` is not yet checked against the set's ids by the validator.
- **Rules-engine work R1 (20 November) leaves open** (the interim tick of R1, one round per closed window, is replaced
  by the game clock of R2, docs/prove.md §11): the SRD 5.2 has its falls and long rest as
  data but no spells or slots yet; monster specials (poison riders, breath, paralysis on a hit) can use the typed
  effects but are not data of any set; carrying HP and resources from one session to the next is done by R2 (the log's
  `pg_alla_fine`, a package's `pg_all_inizio`, docs/strati.md); subdual damage is not modelled; spells of levels 3–6 of Basic Fantasy are not data yet.
- **Rules-engine work R2 (20–21 November) leaves open**: the scene has no light state (darkness blinds nobody yet);
  wandering monster checks, rations and water, forced march and getting lost do not use the clock yet; magic armor's
  better movement row, two-handed weapons with a shield, container volume and capacity are not enforced; silver and
  magic weapons against creatures only they hurt (P6-03) need an immunity rule; creation (starting money, the first
  purchase) is the Preparer's; the SRD 5.2 has its round and rest durations as data but no equipment catalog (its
  sheets keep the SRD path's own armor table). Evidence: esperimenti/risultati/regole-r2/.
- **Rules-engine work R3 (21 November) leaves open**: creation (M7: rolling the scores and the first hit die, race and
  class requirements, combination classes); the ability-roll target that falls with the level (Basic Fantasy p. 189);
  a monster's attack bonus by hit dice (its sheet's, typed); retainers' half shares and treasure spent on training; the
  non-thief's 1 in 6 to listen (a d20 check); the thief's point allocation option; the SRD 5.2's XP and levels (its
  sheets level by the brief, docs/strati.md); energy drain (negative levels). Found in its live check and left to the
  death rule's owner: a PC at 0 when a fight ends before its turn never rolls its death save. Evidence:
  esperimenti/risultati/regole-r3/.
- **Subsystems** (`sottosistemi`) are text only. Conditions apply in the fight (docs/combattimento.md); damage, healing, falls and rest outside an attack are typed effects (above).
- **Opposed checks** in a non-SRD set become normal checks. Saving throws are pinned to their own number (above), and a target rolls its own save against a PC's power (`salvezzaDelBersaglio`, the Game Master's side for an NPC).

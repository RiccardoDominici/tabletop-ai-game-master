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
  - {id: forzare, nome: "Porte bloccate", caratteristica: null, soglia: {dado: 6, predefinita: 1, piu: [{caratteristica: forza}]}}
    # optional [V] piu (R5): what raises the threshold from `predefinita` for a sheet that does not write it — a
    #   characteristic's bonus ({caratteristica}), or `valore` from the score `da` up ({caratteristica: intelligenza, da: 15,
    #   valore: 1}); a race's or class's trait {tiro: abilita, abilita: [cercare], bonus: 1} adds too (regole/schede.ts
    #   valoriDaSoglie; Basic Fantasy pp. 43–44: stuck doors 1 + Strength, secret doors +1 with INT 15, +1 for elves)
  - {id: ascoltare, nome: "Ascoltare", caratteristica: null, soglia: {dado: 100, senza: {dado: 6, valore: 1}}, segreta: niente}
    # optional [V] senza (R5): whoever lacks the value rolls this on its own die instead (a non-thief listening at a door:
    #   1 in 1d6, Basic Fantasy p. 43); not together with `predefinita`
  - {id: origliare, nome: "Origliare", caratteristica: null, soglia: {dado: 100}, segreta: niente}   # optional [V]: the Game
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
difficolta_per_livello:           # optional [V] (R5; d20_cd only): the default difficulty's number by the character's
  - {da: 0, valore: 17}           #   level (Basic Fantasy's Ability Rolls, p. 189: 17 … 7); every rung moves by the same
  - {da: 2, valore: 16}           #   amount for a sheet with a class and level (regole/prove-livello.ts); saves, attacks,
                                  #   thresholds and a monster (no class) keep their numbers
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
    - {id: accecato, nome: "Accecato", valori: {attacchi: -4, contro: 4, iniziativa: -2, sorpresa: 4}, gruppo: vista}
    # optional [V] valori: numbers instead of the ±advantage — to the bearer's attack rolls, to the rolls against it, to
    #   its initiative; sorpresa = surprised on 1 to that face at least; gruppo: penalties of one sign in one group count
    #   once on an attack (a blind attacker against an invisible target, Basic Fantasy p. 59)
  condizione_a_zero: privo_di_sensi         # [V] among the conditions, or null
  fine: {morale: true}                      # B/X morale: 2d6 against the NPCs' scheda.morale (first down, half down)
  # or [V] {morale: {quando: [prima_opposizione, primo_caduto, meta], resa: {condizione: arreso}}}: when it is checked, and
  #   the condition a broken NPC with `si_arrende: true` gets for the scene (Basic Fantasy p. 57; docs/combattimento.md §3)
  sorpresa: {dado: 6, fino_a: 2, condizione: sorpreso}   # [V] B/X surprise: 1d6 per side, 1–2 loses round 1 (a set's condition)
  non_letale: {parole: [col piatto], attacco: -4, danno: meta, a_mani_nude: {danno: "1d3", parole: [pugno]}, sveglia: {turno: "1d4"}}
                                            # optional [V]: subduing damage (Basic Fantasy pp. 55–56, docs/combattimento.md §3)
  nella_mischia: {alleati: 3}               # optional [V]: a PC's missile that misses an NPC engaged in melee with other PCs is
                                            #   rolled again by the Game Master at up to n of them, until one is hit (p. 55)
tiri_salvezza:                              # optional [V]: the manual's save categories, in the table's order
  colonne: [{id: morte, nome: "Raggio della morte o veleno"}, {id: incantesimi, nome: "Incantesimi"}]
classi:                                     # optional [V]: the classes and their level tables (regole/classi.ts)
  - id: mago
    nome: "Mago"
    requisiti: {intelligenza: 9}            # optional [V] (M7): the scores needed to join it (a number = the minimum,
                                            #   or {min, max}); Basic Fantasy's Prime Requisite of 9, pp. 7–8
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
    requisiti: {destrezza: {min: 9}, forza: {max: 17}}   # optional [V] (M7): the scores a character of the race needs
    classi: [chierico, guerriero, ladro]    # optional [V]: the classes open to it (absent = any); a class of the set
    lingue: [comune, halfling]              # optional [V]: what it starts knowing; languages of the set's `lingue`
    aggiustamenti: {destrezza: 1}           # optional [V]: added to the generated scores (none in Basic Fantasy)
    tratti:                                 # [V] the closed list; also `classi[].tratti` and the sheet's own `tratti`
      - {tiro: iniziativa, bonus: 1}        #   added to initiative
      - {tiro: abilita, abilita: [distanza], bonus: 1}             # to those abilities' rolls (attacks included)
      - {tiro: salvezza, colonne: [morte, incantesimi], bonus: 4}  # to the saves of those table columns
      - {immune: [paralisi_ghoul]}          #   powers or conditions it ignores
      - {sorpresa: -1}                      #   its own surprise range (the side's die read against each member's)
      - {almeno: {nascondersi: 70}}         #   an ability at least this value (the class table's or this, the better)
      - {dado_vita_massimo: 6}              #   never a hit die bigger than a d6 (Basic Fantasy's elves and halflings)
      - {tiro: esperienza, bonus: 10}       #   +10% to the XP it earns (humans)
lingue:                                     # optional [V] (M7): the languages a character may know (Basic Fantasy p. 4)
  - {id: comune, nome: "Comune"}
creazione:                                  # optional [V] (M7): the manual's character creation (regole/creazione.ts)
  livello: 1                                # [V] the level a new PC starts at (a player who joins later too)
  passi: [caratteristiche, razza, classe, incantesimi, punti_ferita, monete, acquisti, lingue, descrizione]
                                            # [V] the closed list, in the manual's order (scores before race and class,
                                            #   the class before its hit points and spells, the money before purchases)
  caratteristiche:
    metodi:                                 # [V] at least one; the first is the set's default
      - {id: in_ordine, nome: "3d6 in ordine", dadi: "3d6", ordine: fisso}      # rolled, written down in order (BF p. 3)
      - {id: quattro_dadi, nome: "4d6, i tre migliori", dadi: "4d6", tieni: 3, ordine: libero}   # the player assigns them
      - {id: schiera, nome: "Schiera", valori: [15, 14, 13, 12, 10, 8]}       # a fixed array, one value per characteristic
      - {id: punti, nome: "A punti", punti: 27, costi: [{valore: 8, costo: 0}, {valore: 15, costo: 9}]}   # a point buy
    opzioni:                                # optional [V]: what the Game Master may allow (BF p. 186, never demanded)
      - {id: scambio_punti, nome: "Spostare punti", tipo: punti, togli: 2, aggiungi: 1, minimo: 9}
      - {id: scambio, nome: "Scambiare due punteggi", tipo: scambio, volte: 1}
      - {id: riordino, nome: "Disporli a piacere", tipo: riordino}
    massimo: 18                             # optional: the highest score an option reaches (or the race's maximum)
    senza_speranza: {rimedi: [ritira, ribalta], ribalta: 21}   # optional [V]: no class open: reroll, or every score
                                            #   becomes ribalta − score (BF pp. 186–187)
  punti_ferita: tira                        # [V] tira (the first level's die is rolled, BF) | massimo (the SRD 5.2)
  monete: {dadi: "3d6", per: 10, moneta: mo}   # optional [V]: the starting money (a coin of `monete`)
  incantesimi:                              # optional [V]: what a caster knows at the start: its spellbook (`scheda.libro`)
    - {classe: mago, fissi: [leggere_il_magico], a_scelta: 1, livello: 1, come: scelta}   # come: scelta | master | tiro
  lingue: {caratteristica: intelligenza}    # optional [V]: as many extra languages as its positive bonus (BF p. 4)
reazioni:                                   # optional [V] (R5): reaction tables, the Game Master's rolls from the panel
  - id: reazione                            #   (regole/reazioni.ts; Basic Fantasy p. 50, a retainer's offer p. 46)
    nome: "Reazione dei mostri"
    dadi: "2d6"                             # [V] the dice
    caratteristica: carisma                 # [V] the lead PC's bonus is added (null = none)
    fasce:                                  # [V] from the lowest, each up to its fino_a; the last fino_a: null
      - {fino_a: 2, nome: "Attacco immediato", atteggiamento: ostile}   # atteggiamento (optional): an NPC's attitude
      - {fino_a: null, nome: "Molto favorevole", atteggiamento: amichevole}   #   towards the lead PC follows the band
magia: {preparazione: vanciana}             # optional [V]: vanciana (each prepared copy is one cast, back at a rest)
                                            #   | slot (the sheet's spells are known; a cast spends a slot of its level)
risorse:                                    # optional [V]: per-character counters (prove/risorse.ts), in the snapshot
  - {id: frecce, nome: "Frecce", ricarica: mai}   # ricarica: mai | riposo (a rest that refreshes) | scontro (a fight's end)
poteri:                                     # optional [V]: spells, items, class actions, hazards (regole/poteri.ts)
  - id: sonno
    nome: "Sonno"
    tipo: incantesimo                       # [V] incantesimo (a prepared copy and a slot) | oggetto (off the sheet) | azione | pericolo
                                            #   | mostro (a monster's special: a breath, a hit's rider; no cost, never a PC's)
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
  ambiente: selvaggio                       # optional [V] (R6): the environment of esplorazione a journey is in (its checks)
  smarrirsi: {abilita: ts_morte_saggezza}   # optional [V] (R6): the leader's check off roads (p. 45), a Game Master roll
                                            #   terreni[].incontri [V]: the terrain's encounter table; terreni[].smarrirsi:
                                            #   true = trackless (the leader's check), false/absent = roads and trails
esplorazione:                               # optional [V] (R6): the environments explored (regole/esplorazione.ts;
                                            #   Basic Fantasy pp. 180–181); needs tempo
  ambienti:
    - id: sotterraneo                       # [V] snake_case, unique
      nome: "Sotterraneo"
      controllo: {ogni: {turno: 3}, dado: 6, fino_a: 1}   # [V] the wandering monster check: every `ogni` of the clock,
                                            #   an encounter on `fino_a` or less on 1d`dado`; absent = no checks (a town)
      tabelle: [{da: 1, tabella: sotterraneo_1}, {da: 4, tabella: sotterraneo_4_5}]   # [V] the table by the scene's level
    - id: selvaggio
      nome: "Terre selvagge"
      controllo: {ogni: {ora: 4}, dado: 6, fino_a: 1}
      sorpresa_prima: {dado: 6, fino_a: 2, imboscata: 4}  # optional [V]: the creatures' surprise checked at the encounter
                                            #   (p. 181); not surprised, they ambush and surprise on 1–`imboscata`
    - {id: citta, nome: "Città", provviste: false}   # [V] a town feeds the party: no daily food and water from packs
  provviste:                                # optional [V]: what each character eats and drinks each day where the party
                                            #   lives off its supplies (Basic Fantasy p. 44)
    - {id: cibo, nome: "Cibo", oggetti: [{id: razioni, giorni: 7}], senza: {dopo: 2, danno: "1", guarigione: false}}
    - {id: acqua, nome: "Acqua", oggetti: [{id: otre, giorni: 1}], senza: {dopo: 0, danno: "1d4", guarigione: false}}
                                            # [V] oggetti: catalog items and the days one feeds; senza: after `dopo` days
                                            #   without, `danno` a day; guarigione false = no natural healing meanwhile
  riposo: {ogni: {ora: 1}, durata: {turno: 1}, parole: [ci riposiamo], condizione: affaticato}   # optional [V]: an
                                            #   exploration rest rule (none in Basic Fantasy): past `ogni` without a rest of
                                            #   `durata`, the PCs carry the fight's condition (its `valori`)
incontri:                                   # optional [V] (R6): encounter tables; also in regole/incontri.yaml
  - id: sotterraneo_1                       # [V] snake_case, unique
    nome: "Sotterraneo, livello 1"
    dadi: "1d12"                            # [V] the table's dice: every roll they can give has one entry
    pagina: 180
    voci:
      - {tiro: 1, manuale: "Bee, Giant", mostro: ape_gigante, numero: "1d6"}   # [V] a bestiary entry and how many
      - {tiro: 5, manuale: "NPC Party: Adventurer", gruppo: "Gruppo di PNG: avventurieri"}   # no stat block
      - {tiro: [6, 7], mostro: goblin, numero: "2d4"}                          # a list of rolls for one entry
      - {tiro: 3, scelta: {dadi: "1d6", voci: [{tiro: [1, 2, 3], mostro: roc_grande, numero: "1"}]}}   # a nested roll
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
bestiario:                                  # optional [V]: how a monster's stat block becomes a sheet (regole/bestiario.ts)
  dado_vita: 8                              # [V] 4, 6, 8, 10, 12: a monster's hit die (Basic Fantasy p. 62)
  mezzo: "1d4"                              # [V] the hit points of «½» hit dice
  attacco: [{da: 0, bonus: 0}, {da: 1, bonus: 1}, {da: 8, bonus: 8}]   # [V] attack bonus by hit dice (p. 53), `da` growing;
                                            #   da 0 = less than one hit die
  abilita: [mischia, distanza]              # [V] the set's attack abilities that take it
  uno_meno_meno_di_uno: true                # «1−1» hit dice or less count as less than one (p. 54)
livelli_negativi: {d20: -1, percentuali: -5}   # optional [V]: what a level of energy drain costs (Basic Fantasy pp. 58–59)
mostri:                                     # optional [V]: the manual's stat blocks; also in regole/mostri.yaml (`mostri:` there)
  - id: ghoul                               # [V] snake_case, unique across both places
    nome: "Ghoul"
    manuale: "Ghoul (and Ghast) | Ghoul"    # the printed block it was copied from (strumenti/regole/confronta_bestiario.py)
    pagina: 97
    difesa: 14
    dadi_vita: "2*"                         # [V] as printed: 3, "3+2", "1-1", "½", asterisks = special-ability XP bonus
    attacco: 8                              # the bracket after the hit dice, when the attack bonus differs from them
    attacchi: [{id: artiglio, nome: "Artiglio", danno: "1d3"}, {id: morso, nome: "Morso", danno: "1d3"}]
    per_round: [[artiglio, artiglio, morso]]   # [V] the attacks of a round, by line id; alternatives in order
    salva_come: {classe: guerriero, livello: 2}
    morale: 9                               # [V] 2–12, or {prima: 7, dopo: 12} (a giant ant, p. 64)
    px: 100
    movimento: "30'"                        # printed text for the Preparer and the narrator: movimento, numero, tesoro,
    numero: "1d6, Wild 2d8"                 #   testo (the special abilities in short), difesa_senza_armatura; the Engine
    tesoro: "B"                             #   does not read them
    testo: "…"
    # any other key of an NPC sheet (tipo, immune, tratti, caratteristiche…) is the sheet's, under the sheet's own
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
                                                                       # (a monster's special: × its hit dice)
- {tipo: danno, pari_ai_pf: true}                                      # as much as the author's current hit points
- {tipo: drenaggio, livelli: 1}                                        # levels of energy drain (the set's livelli_negativi)
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
  libro: [leggere_il_magico, dardo_incantato]   # optional [V] (M7): the spells it knows (a magic-user's book); the
                                                #   prepared ones come from it
  lingue: [comune, elfico]                      # optional [V] (M7): languages of the set's `lingue`
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
  mostro: ghoul                                 # optional [V]: a stat block of the set's bestiary: its keys first, the
                                                #   sheet's own win (below, «The bestiary in play»)
  per_round: [[artiglio, artiglio, morso]]      # optional [V]: a monster's attacks of a round (line ids, alternatives)
  colpito_solo_da: [argento, magica]            # optional [V]: only weapons with one of these `proprieta` hurt it
  si_arrende: true                              # optional [V]: a broken morale makes it surrender, not flee
  rigenera: {pf: 1, tranne: [fuoco, acido], a_zero: {round: "2d6"}}   # optional [V]: regeneration (a troll, p. 152)
  sorprende: 4                                  # optional [V]: its foes are surprised on 1 to 4 (an ambusher, p. 75…);
                                                #   «surprised only on a 1» is the trait {sorpresa: -1}
  resistenze: {fuoco: immune, freddo: meta}     # optional [V]: damage of these types does nothing or half
  # monster attack lines: colpendo: [paralisi_ghoul] (powers a hit applies, the target saves), potere: soffio_x (a special
  #   action instead of an attack roll), usi: 9 (a day, back with a rest), ricarica: 2 (at most every other round),
  #   proprieta: [argento] (what the weapon is: a typed line; a catalog weapon's and the ammunition's count too)
  attacchi: [{nome: "Spada", danno: "1d8", caratteristica: vigore}]   # or abilita: combattere; `id` names a line for per_round
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

**Creation** (M7; regole/creazione.ts, regole/requisiti.ts, regole/controllo-pg.ts; the validator's mirror
strumenti/valida/regole_creazione.py). A finished PC — pregenerated by the Preparer or built at the table — is checked by
one function, `controllaPersonaggio`, against the set: a race and class of the set, the class open to the race
(`razze[].classi`), both sets of requirements met, scores inside what the methods can give (plus the race's
adjustments and an option's `massimo`), hit points inside what the class's dice can give at the level (the race's
`dado_vita_massimo` too; exactly the die's maximum at level 1 when the procedure says `massimo`), no gear a
restriction forbids outright, no coin below zero, no more spent on gear and coins than the best starting roll
(3d6 × 10 gp = 180 gp; a warning on a pregenerated sheet, a Game Master may have given more), the starting spells in
the book (`fissi`, then exactly `a_scelta` more of spell level `livello` or lower, of the class's list) with every
prepared spell from it, the race's languages and no more extra ones than the bonus gives. A PC built at the table also
starts at the procedure's level with that level's XP. One case file, apps/server/test/fixtures/creazione/casi.yaml, is
read by the Engine's test and by the validator's, so the two give the same codes. In the validator a pregenerated PC
breaking a rule is an error, a missing detail (no book, no languages) a strict warning. The players can build their PCs
on the phones by these steps (the campaign's `regole.creazione`; docs/creazione.md): the same check refuses an illegal
one, and a PC built at the table (`pg-creati/`) is held to it strictly.

**The bestiary in play** (regole/bestiario.ts, regole/schede.ts, prove/bestiario.ts; audit P5-20, P5-21, P6-00 to P6-07). An
NPC's or a minion type's sheet writes `mostro: <id>` and the entry's keys come under its own: Zirrà can be a goblin with her
own hit points and weapons. A monster needs no ability scores (the +0 value, no warning). From the printed hit dice:
- the **attack bonus** of the bestiary's `abilita` comes from `bestiario.attacco` by the effective hit dice (the plus or minus
  ignored, ½ and «1−1» = 0), or from the entry's bracket `attacco`; a written `abilita.mischia` stays as an override (a
  warning when it differs). A line that names no ability rolls with the first (melee) or, `distanza: true`, the second;
- the **XP** asterisks (`speciali`), unless the sheet counts them;
- the **hit points**: a written `pf` stands; a formula (`pf: "1d2"`) or no `pf` with hit dice (the hit dice × `dado_vita`
  plus the bonus, ½ = `mezzo`) is rolled once per creature when the session starts, from the session seed and the creature's
  id (each raider of a band its own). The roll does not draw from the session's dice, so the manual-roll dry run, a resume and
  a fixed `TAGM_SEME_DADI` see the same numbers; «Ricomincia» draws a new seed and the monsters roll again.
- **several attacks a round** (`per_round`): in its step the monster uses the first alternative whose lines it can all use now
  (in the phase, with ammunition) and makes every attack, each with its card and its fact («Turno di Artiglio Nero, attacco
  2 di 3: …»); when its target drops, the next attack goes to the next target the fight picks. Without `per_round` it makes
  one attack, as before.

- **specials** (prove/poteri.ts usaPotereDiMostro; audit P6-16, P6-18 to P6-20, P6-27): powers of type `mostro`. A line's
  `colpendo` applies them to the target of a hit that hurt (a line with `colpendo` and no `danno`, as a manual prints a
  wight's touch «Damage: energy drain», hits for its riders only: no hit points, not even the set's minimum) — each target not immune (the power's types, the sheet's
  `immune`, a trait, an active effect) rolls its own save, then the typed effects at the monster's hit dice: a ghoul's
  paralysis (a condition lasting turns of the clock), a snake's poison (`morte`), a charm or a fear condition. A line with
  `potere` is a special action: in the step's alternative it costs one of its `usi` of the day (refreshed by a rest) and
  waits `ricarica` rounds; a power on `nemici` reaches every PC standing in the fight (the Engine knows no positions: a cone
  or a line reaches them all), one on `uno` the step's target. A breath of 1d8 per hit die is `dadi: "1d8"` with
  `dadi_per_livello: {}`; one as strong as the monster's hit points is `pari_ai_pf: true`. A petrifying gaze gives a
  permanent condition with `fuori_combattimento` (out like the dead). A PC's save in the monster's step is the player's
  roll with manual rolls (`per: salvezza`, asked like a death save).
- **energy drain** (prove/drenaggio.ts; P5-49, P6-21): a `drenaggio` effect (a wight's touch as its line's rider) gives
  negative levels by the set's `livelli_negativi`, as Basic Fantasy has them (not a lost level: XP and level stay): each
  costs one hit die of hit points, from the maximum and from the hit points now (the class's die at the level, a monster's
  bestiary die), the set's `d20` on every d20 roll (attacks, saves, checks) and `percentuali` on every d100 threshold, and
  one of the highest-level spell slots, for the day and the rests after; drained to 0 or less, the victim is slain. Kept in
  the snapshot. Removing them (restoration) is the Game Master's for now.
- **regeneration** (`rigenera`; P6-22): `pf` a round for a creature hurt and standing, as rounds pass on the clock, never
  the damage of the `tranne` types (the Engine keeps each character's damage by type); at 0 it is down, not dead — out of
  the fight, defeated for XP — and gets up with 1 hit point after `a_zero`, unless the damage it cannot regenerate alone
  reaches its maximum, which kills it.
- **defences**: `colpito_solo_da` (Basic Fantasy's (s) and (m), p. 62): a hit with a weapon none of whose `proprieta` (the
  line's own, its catalog weapon's, the ammunition shot) is in the list deals nothing, and the fact says why («Spada colpisce
  Lanterna Spenta ma non lo ferisce: lo ferisce solo un'arma con una di queste proprietà: argento o magica. 0 danni;
  Lanterna Spenta non ha ferite»); spells are not weapons. `resistenze` halve or stop damage of a type (`tipo_danno` of a
  line or an effect), after the set's minimum damage. Immunity to sleep, charm or hold is the sheet's `immune` (powers or
  conditions), as before; in an entry of a set with its own condition list each id must be a power or a condition of the
  set [V] (a misspelt id would protect from nothing).

A line the manual does not count among the printed attacks (a gaze described in the text, a siren's song) is marked
`in_piu: true` (the PDF check leaves it out of the counts); in `per_round` the alternative with a special action comes
first, so the monster uses its breath while it has uses, then bites.

The validator mirrors it (strumenti/valida/regole_bestiario.py), merging the entry under the sheet as the Engine does. The
numbers copied from a manual are checked against its PDF by `strumenti/regole/confronta_bestiario.py`, which reads the stat
blocks by position (`strumenti/regole/blocchi_mostri.py`) and compares them both ways (every block has an entry, every entry a
block).

With the SRD 5.2 the sheets remain those of docs/prove.md §2 (scores, proficiencies, calculated AC).

**Exploration in play** (regole/esplorazione.ts, prove/esplorazione.ts; audit P8-01 to P8-04; docs/prove.md §14). A
scene says where the party is: `esplorazione: {ambiente: sotterraneo, livello: 1}` (the environment's table for that
level) or `{ambiente: selvaggio, tabella: selvaggio_bosco}` (a table named). A scene that says nothing explores nothing:
no check runs there (a village, a talk), so existing campaigns are unchanged. While the party is in an environment
with a `controllo`, the Engine counts the game clock and makes the Game Master's hidden roll each `ogni`; on a hit it
rolls the table, the nested roll, how many appear (`numero`, one when absent), and the surprise in advance. A check due
during a fight waits for its end; an advance that spans several checks rolls them in order and stops at the first
encounter (one per advance, at the moment its check fell). Each midnight the clock passes where the party lives off its
supplies (an environment without `provviste: false`, or a journey) costs every PC at the table a day of each
`provviste` from what it carries (an open pack's days first); without, the days are counted, and past `dopo` each day
deals `danno` and, with `guarigione: false`, a rest heals nothing until a day with it. A day in a town, or in a scene
that explores nothing, feeds everyone. A journey (`viaggio`) rolls its environment's checks ahead on the terrain's
table and stops at the first encounter (the clock at that moment, the distance covered said); in a trackless terrain
the leader's `smarrirsi.abilita` is the Game Master's secret roll, shown only on the panel. The exploration rest rule
counts the windows and rounds of play only (a journey's days and the panel's hours have their own pace). The validator checks the environments, every table's
entries (one per roll, a creature of the bestiary, one kind per entry) and each scene's environment and table
(strumenti/valida/regole_esplorazione.py). The numbers of torre-mozza's tables are checked against the PDF by
`strumenti/regole/test_incontri_bf.py`.

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
  `pg_alla_fine`, a package's `pg_all_inizio`, docs/strati.md); subdual damage is not modelled; spells of levels 3–6 of Basic Fantasy are not data yet. (Monster specials and subdual damage: done by R4.)
- **Rules-engine work R2 (20–21 November) leaves open**: the scene has no light state (darkness blinds nobody yet);
  wandering monster checks, rations and water, forced march and getting lost do not use the clock yet; magic armor's
  better movement row, two-handed weapons with a shield, container volume and capacity are not enforced; silver and
  magic weapons against creatures only they hurt (P6-03: done by R4, `colpito_solo_da`); creation (starting money, the first
  purchase) is the Preparer's; the SRD 5.2 has its round and rest durations as data but no equipment catalog (its
  sheets keep the SRD path's own armor table). Evidence: esperimenti/risultati/regole-r2/.
- **Rules-engine work R3 (21 November) leaves open**: creation (M7: rolling the scores and the first hit die, race and
  class requirements, combination classes); the ability-roll target that falls with the level (Basic Fantasy p. 189);
  a monster's attack bonus by hit dice (done by R4: the set's `bestiario.attacco`); retainers' half shares and treasure spent on training; the
  non-thief's 1 in 6 to listen (a d20 check); the thief's point allocation option; the SRD 5.2's XP and levels (its
  sheets level by the brief, docs/strati.md); energy drain (negative levels: done by R4). Found in its live check and
  fixed by R4: a PC at 0 when a fight ends before its turn now rolls its death save when the fight ends (or at the next
  window, when the panel ended it), and an attack on undead already turned opens no fight. Evidence:
  esperimenti/risultati/regole-r3/.
- **Rules-engine work R4 (21 November) leaves open**: the Game Master's ±2 to a morale score (P5-46) is not on the
  panel; kicks (1d4 at −2) and the bare fist that hurts its owner against metal armor (P5-42); a creature knocked out by
  subduing damage wakes after the set's `sveglia`, never woken by someone after 2d10 rounds; removing negative levels (restoration) is the
  Game Master's; conditions (cover, concealment, held) are set from the panel only during a fight, and from words only
  through the modifiers; breath has no area (it reaches every enemy standing: there are no positions); a chimera's fixed
  3d4 breath and the specials no power expresses (swallowing, sprays, grabs, splitting, disease, lycanthropy: P6-23,
  P6-24, P6-26) stay text in the entry; the 24 hours a song cannot charm again after a save are one use a day;
  dragon ages (P6-17) are the printed category-4 entry. Evidence: esperimenti/risultati/regole-r4/.
- **Rules-engine work R5 (22 November) leaves open**: the elves' combination classes (C-RACE-26/27; what M1 needs is in
  docs/da-fare.md), the SRD 5.2's own creation data (species, classes, backgrounds, equipment: the schema expresses its
  methods), the thief's point allocation, spells learned after the start, retainers as sheets, locked doors on 1d10.
  Creation at the table (docs/creazione.md) needs a quiet moment to let an approved PC join (the server rebuilds); a
  player reconnecting after another approval finds its draft again. Evidence: esperimenti/risultati/regole-r5/.
- **Subsystems** (`sottosistemi`) are text only. Conditions apply in the fight (docs/combattimento.md); damage, healing, falls and rest outside an attack are typed effects (above).
- **Opposed checks** in a non-SRD set become normal checks. Saving throws are pinned to their own number (above), and a target rolls its own save against a PC's power (`salvezzaDelBersaglio`, the Game Master's side for an NPC).

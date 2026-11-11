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
  #   critici: attacchi | tutti (which rolls they apply to). If the set does not write them, the SRD ones apply: 20 and 1,
  #   only in attacks; `critico: null`, `disastro: null` remove them.
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
  fasi:                                     # [V] at least one; snake_case ids
    - {id: mischia, nome: "Mischia", png: attacco_mischia}   # [V] png: attacco | attacco_distanza | attacco_mischia | null
  azioni: [{id, nome, quante}]              # economy of the turn (text)
  danni:
    modello: pf | ferite | stress           # [V]
    a_zero: {pg: tiri_morte | fuori_gioco | morte, png: morte | fuori_gioco}   # [V]
    tiri_morte: {cd: 10, successi: 3, fallimenti: 3, venti_rialza: true, uno_doppio: true}
    # venti_rialza: a natural 20 gets back on its feet with 1 HP; uno_doppio: a natural 1 counts as two failures.
    # These are SRD 5.2 rules: they apply if the set does not write them (before, they applied to every set, even where the
    # manual does not have them, like Basic Fantasy's «save vs. death»).
  condizioni:                               # [V] snake_case ids; effects from the closed list (docs/combattimento.md §2)
    - {id: prono, nome: "Prono", icona: "⬇", effetti: [svantaggio_attacchi, attacchi_contro_vantaggio], testo: "…"}
  condizione_a_zero: privo_di_sensi         # [V] among the conditions, or null
  fine: {morale: true}                      # B/X morale: 2d6 against the NPCs' scheda.morale
```

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
  attacchi: [{nome: "Spada", danno: "1d8", caratteristica: vigore}]   # or abilita: combattere
                                                # automatico: true = the weapon always hits (the enchanted dart), only the damage
```

With the SRD 5.2 the sheets remain those of docs/prove.md §2 (scores, proficiencies, calculated AC).

**Checks of the scene** with a non-SRD set, in `scena.yaml → prove`:
`{id: p_…, quando, mossa | abilita | caratteristica (set id), difficolta (set id), se_fallisce, parole}`.
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
- **Conditions and subsystems** are text only; the Engine does not yet apply them (in docs/da-fare.md).
- **Opposed checks and saving throws** in a non-SRD set become normal checks.

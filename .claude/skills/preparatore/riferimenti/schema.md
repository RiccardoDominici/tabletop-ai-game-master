# Schema of a campaign's files

The shape that the validator (`strumenti/valida_campagna.py`) and the server expect. In brackets, the rule of the manual
(docs/manuale-master.md) or of the repertoire (docs/repertorio.md). The validator checks everything marked **[V]**; with
`--rigoroso` also what is marked **[R]**.

```
campagne/<id>/
  brief.yaml                 the brief and the decisions (read only by whoever prepares)
  stile.yaml                 style sheet and C1
  campagna.yaml              canon, clocks, revelations, bottlenecks, nodes, session, preparazione
  scena.yaml                 the first scene: it is the one the server of F0 plays
  scene/<id_scena>.yaml      the other scenes (optional)
  png/png_<nome>.yaml        one sheet per NPC; the file name is the id
  pg.yaml                    common situation and pregenerated characters
  repertorio/narrazione.yaml the narrator's lines
  repertorio/png_<nome>.yaml the lines of each NPC
  repertorio/parole_segrete.yaml
  README.md, autovalutazione.md
```

## Campaign language (`lingua`)
- `campagna.yaml → lingua`: optional, `it` or `en`, default the language of the configuration (`lingua` in
  `config/predefinita.yaml`). It is the language of the content: the narrator, the lines, the fixed phrases of the Engine,
  the speech rules and the voices (docs/lingue.md). The Preparatore writes the campaign in the language of the brief's
  `lingua`, and writes it into `campagna.yaml` too. The field is read by the server at start (an unknown language stops the
  start) and by the validator, which takes the prose rules from `lingue/<lingua>/prosa.yaml`.
- The fields with a fixed vocabulary (tags, types, ids of the validator) do not change with the language: only the text does.
- The examples of each language are in «lingue/<lingua>/preparatore/riferimenti.md».

## stile.yaml (C1, E14)
| Field | Constraint |
|---|---|
| `id`, `titolo` | |
| `premessa` | one sentence [V] |
| `tono`, `tema`, `registro_narratore` | present [V] |
| `regole_prosa` | list; it goes in full to the selector of mode B: no secrets, not even as a ban [V mode B context]. The ban on the solution-word lives in the `come_si_trova` of the clue |
| `stile_immagini` | the content of `[STILE]`, in English; does not contain `[STILE]` [V] |
| `tavolozza_musicale` | `{tag: [...], strumenti: "..."}`; tags only from `esplorazione_tesa, taverna_calda, rito_sacro, inseguimento, combattimento_epico, lutto` [V] |
| `linee`, `veli` | lists; `linee` not empty [V]; `veli` empty only if the brief does not want any (warning) |
| `audio` | optional: `{tonalita, modo, tempo, strumenti, umore_base, epoca, motivo}`, see "Audio" below [V] |

## campagna.yaml
Top-level keys: `id`, `lingua`, `canone`, `orologi`, `rivelazioni`, `colli_di_bottiglia`, `colli_di_bottiglia_nota`, `nodi`,
`sessione`, `preparazione`. The server removes `preparazione` from the narrator's context (E2): destinies, the villain's
chronology, abstract secrets and arcs go there.

**canone** (E10): `- {id: f_<nome>, noto_ai_pg: true|false, stato: confermato, entita: [...], testo: "..."}`.
- Ids are unique and in the form `f_…` [V].
- Every `f_…` cited somewhere else exists [V]; every fact is cited at least once (warning).
- A fact is a single assertion. Sheets cite it by id, they do not rewrite it.

**orologi**: the clocks the narrator sees (one per danger active in a scene).
```yaml
- id: o_<nome>
  nome: "…"                                # the obstacle, not the action (C2)
  pericolo: p_<nome>
  segmenti: 6                              # 4, 6 or 8 [V]
  pieni_all_inizio: 0
  segno_almeno_ogni: 2                     # the Engine writes "show it in this response" [V integer >= 1]
  segno_al_massimo_ogni: 2                 # optional: no more than one tick every N turns (default 2; 1 = also in a row)
  parte_dopo: [<id of a line or clue>]     # optional, proposal: the clock starts when one of them comes out [V they exist]
  segni: ["…", "…", …]                     # one per segment, in order [V]
  avanza_quando: ["…"]                     # [V present]
  al_completo: "…"                         # what the danger wants and what each answer costs
```

**rivelazioni** (C4): `- {id: r_<nome>, chiave: true, conclusione: "…", indizi: [i_…]}`.
- A key conclusion has at least 3 clues, in at least 2 nodes, of at least 2 types [V].
- Each clue supports one conclusion only, and is listed in its own [V].

**colli_di_bottiglia** (C4): `- {id: cb_<nome>, ostacolo: "…", soluzioni: [≥3]}` [V]. A solution that requires private knowledge
says so ("Only if the one who knows it proposes it").

**nodi** (C5): `- {id, tipo: luogo|png|evento, nome, scheda | abbozzo, collegamenti: [...], indizi: [...]}`.
- Optional: `noto_ai_pg: true` (a place the PCs know from the start: it does not ask for three clues to enter), `immagine: {prompt_luogo}`
  (a place without a sheet that has an image; see immagini.md) and `audio` (as in the scenes, see "Audio" below).
- `nome` and `abbozzo` go to the selector of mode B: no secrets [V mode B context].
- A place where the GM can take the table (an exit leads there) has an image: a scene `scheda` (same image) or `immagine.prompt_luogo`;
  if a scene takes place there, it is an error in strict mode [V IMMAGINI.nodo].
- Every link exists [V].
- Everything is reachable from the node of the opening scene [V].
- No dead ends, except with `prossima_sessione: true` [V].
- The clues of the nodes without a sheet have the same shape as those of the scenes.

**sessione** (C9–C13):
- `riassunto_iniziale`: at most 4 sentences; together with the opening of the first scene at most 6 sentences, with an average between
  8 and 14 words per sentence [V];
- `cinque_stanze`: the keys `ingresso_o_guardiano`, `enigma_o_sfida_sociale`, `trucco_o_battuta_d_arresto`, `climax`,
  `ricompensa_o_colpo_di_scena` [V];
- `scene_potenziali`: ids of scenes with a sheet (from 3 to 6: with fewer, only a warning);
- `chiusura` [V].

**preparazione**:
- `fronti` (C2):
  - one front `livello: campagna`, with 3–5 omens in the whole front [V];
  - one or two fronts `livello: avventura`, with 1–3 omens in the whole front [V];
  - for each front, 2–3 dangers and 1–3 `domande_di_posta` [V];
  - each danger has `tipo`, `impulso` (one verb only), `destino_incombente`, `presagi: [{testo, segno_visibile}]` (at least one), `mosse`,
    `cast`, `orologio` [V];
  - the clocks of the dangers that are not on stage go in `fronti[].orologi_extra: [{id, nome, segmenti}]`.
- `cattivo` (C3): `obiettivo`, `cronologia_se_i_pg_non_intervengono`, `risorse: [{cosa, a_cosa_serve}]`, `reazioni: [{intrusione, reazione}]`,
  `stato_di_quiete`, `chiamata_all_azione` [V].
- `segreti_astratti` (C6): about ten, of one or two sentences each [V], without a fixed place.
- `archi` (C8): `campagna_tre_atti: [3]` and `pg: {pg_<nome>: {tu, bisogno, vai, cerca, trova, paga, ritorna, cambia}}` for each PC [V].
- `cronologia` and `logistica`: the accounts of the world, see below [R].

### Chronology and logistics (preparazione)
The accounts the validator redoes (class `MONDO`). They sit in `preparazione`, so the narrator never sees them in any way: they may
contain secrets.
```yaml
cronologia:
  eventi:                                  # in time order [V MONDO.ordine]; at least 3 [R]
    - id: t_<nome>
      quando: {anni_fa: 40}                # or {giorni_fa: 3, ora: "21:00"}, {ora: "18:00"}, {giorno: 1, ora: "01:30"}
      cosa: "…"                            # one sentence
      fatti: [f_…]                         # the facts the event founds [V exist]
      segno: {orologio: o_…, n: 3}         # optional: at what tick the clock stands at that moment [V grows over time]
  documenti:                               # every clue of type document has its entry [R]
    - {id: doc_<nome>, cosa: "…", indizio: i_…, datato: {…as in quando…}, prova: [t_…]}
      # indizio: the link is added when the clue exists (step 5); at step 3 the document does not have it
logistica:
  durate:   [{id: d_<nome>, cosa: "…", minuti: 75, fatti: [f_…]}]
  capienze: [{id: c_<nome>, cosa: "…", posti: 20}]
  gruppi:   [{id: g_<nome>, cosa: "…", persone: 8}]
  verifiche:                               # every claim of time or seats in the story [V]
    - {tra: [t_a, t_b], ci_sta: [d_x], perche: "…"}             # sum of the durations ≤ interval
    - {tra: [t_a, t_b], non_ci_sta: [d_x, d_x], perche: "…"}    # sum > interval
    - {capienza: c_x, porta: [g_a], perche: "…"}                 # sum of the people ≤ seats
    - {capienza: c_x, non_porta: [g_a, g_b], perche: "…"}        # sum > seats
```
- `quando` is read from the day of the session: `giorno: 0` is today (default), `giorno: 1` is tomorrow, `giorni_fa` and `anni_fa` go
  back; `ora` goes from `"00:00"` to `"24:00"`. Without an hour, two events on the same day are not compared; a time check needs two events
  with the hour.
- The date of a document does not precede the events it proves [V MONDO.documento].

## Scene sheet (§4): scena.yaml, scene/*.yaml
```yaml
id: scena_<nome>
nodo: n_<nome>                 # exists in campagna.nodi [V]
nome: "…"
descrizione: "plan of the place + WHO HEARS WHAT"   # makes "in private" checkable; goes to the selector: no secrets
scopo: {tipo: rivelare_indizio, rif: i_…}           # tipo from: rivelare_indizio, far_avanzare_fronte, mettere_alla_prova,
                                                    #   sviluppare_rapporto, dare_la_scena, decompressione [V]
domanda_drammatica: "…?"       # yes-or-no [V]
posta: {si_guadagna: {cosa, per_chi: [...]}, si_perde: {cosa, per_chi: [...]}}   # touches PCs or NPCs [V]
intensita: 1-5                 # [V]
sensi: [3 details]             # exactly 3, at least 2 not visual [V on the number]
elementi_interattivi: [{cosa, dove, azioni}]        # at least 3 [V]; a hidden thing says so in azioni: "HIDDEN: …"
png_presenti: [png_…]          # exist [V]; voices different and not similar [V]; different initials [V]
orologi_attivi: [o_…]          # exist [V]
orologi_in_scena:              # optional: the Engine's rules for this scene
  o_…: {pieni_almeno: 6, segno_almeno_ogni: 2}   # on entering, the clock rises to at least 6; here it runs at 1 tick every 2
indizi:                        # [V shape; see below]
  - {id: i_…, conclusione: r_…, tipo: png|oggetto|luogo|evento|documento|visione, nodo: n_…|png_…,
     essenziale: true|false, tiro: "nessuno", modi: 1, come_si_trova: "…",
     vincolo_pubblico: "what anyone perceives, without the why"}   # physical clues [R], no secrets [V]
vincoli_pubblici: ["…"]        # optional: other perceivable facts that improvisation tends to contradict
uscite: [{verso: n_…, segnalata_da: [i_…, …]}]      # at least 2 (except climax: true) [V]; 3 clues per node (warning)
mossa_morbida_pronta: "…"      # prose §5 [V]
apertura: "…?"                 # at most 3 sentences, closes with an invitation [V]
rientro: tr_…                  # optional: when returning to an already visited scene the Engine does not reread the opening;
                               # it says this line (or this text), then the first sentence of the opening
musica: {tag: …, transizione: "…"}                  # tag and tags cited in the transition from the vocabulary [V]
immagine: {invarianti: [...], prompt_luogo: "… in English"}   # [V]
taglio: "…"                    # all the outcomes, including "if the PCs hesitate"; goes to the selector: no secrets
esiti: [{id, descrizione, finale: <id of line>}]    # written with the endings (step 9); every ending exists [V]
climax: true                   # optional: allows fewer than two exits
audio: {musica: [...], ambiente: [...], umore_iniziale: …}   # optional, see "Audio" below [V]
```
The mode B context takes from each scene sheet the name, description, question, intensity, senses, elements without "HIDDEN", the
NPCs present and the taglio: the validator searches there for the secret regexes (`SEGRETI.contesto_b`). Two sheets with the same
`nodo` are a warning: the same place at another moment is an event node (mestiere.md §9).

Clues: an essential one has `tiro: "nessuno"` (F3) [V]. `modi` is the number of distinct ways written in `come_si_trova`: the repertoire
must have a revealing line for each [V]. If missing, it counts as 1 [R warns].

## NPC sheet (§3): png/png_<nome>.yaml
```yaml
id: png_<nome>                 # = file name, lowercase ASCII [V]; becomes the label [png_<nome>]
nome: "…"                      # initial different from the other NPCs of the scene [V]
pronuncia: "…"                 # with the accent: the TTS uses it
nascosto: true|false           # optional [V boolean]: present for the Engine, but not shown to the projector and phone until it speaks or the GM reveals it
alias: [nicknames]             # how the players will call them: a dwarf, the innkeeper, the stranger [R]; never generic
                               #   (old man, girl) [R], never the same as another NPC [V]
livello: comparsa|supporto|principale               # supporto and principale: full obligations [V]
ruolo: "…"
fronte: fronte_…               # exists [V]
aspetto:
  lettura: "1-2 sentences, max 35 words, to be read aloud" [V]
  invarianti: [≥3 fixed traits, in the campaign language, VISIBLE at first glance] [V]
  prompt_immagine: "… in English …, [STILE]"        # [V]; [STILE] once only
  prompt_ritratto: "…, [STILE]" # optional: if present, the portrait uses it; same rules [V]
  situazioni: [{id, prompt, dopo: [i_… | id of line]}]   # traits that are seen only later; dopo [R]
                               #   dopo: it appears at the first id that comes out; each one makes the trait public [V]
personalita: {superficie: [≥2], sotto_pressione: [≥1, different], contraddizione: "…"}   # [V]
desiderio: "verb + object, in tension with another NPC or a front"
paura: "…"
segreto: {testo, chi_altro_sa: [...], se_rivelato}   # [V]
voce:
  tts: {voce_id: <from assets/voci/voci.yaml, not "narratore">, eta_apparente, altezza, velocita, timbro}   # [V]
  registro: "tu | voi | lei, and with whom it changes"   # [V] (the forms are those of the campaign language)
  stile: "…"                   # a sentence-length phrase with a word range; the number words from one to twenty are read from the
                               #   campaign language and give the sentence ceiling (warning if not found)
  tic: [at most 2]             # [V]
  gesto: "…"                   # different from every signal [V]
  mai_dice: [...]
  battuta_campione: "at most 2 sentences"   # [V]
sa: [f_…]                      # ≥3 for supporto and principale [V]
non_sa: [f_…]                  # ≥3, one that the PCs will ask about; disjoint from sa [V]
crede_a_torto: [{testo: "…", contraddice: f_…}]    # the contradicted fact is NOT in sa [V]; without contraddice [R]
mente_su:
  - id: <prefix>_<subject>     # [R]; it is the value of menzogna_detta in the repertoire
    argomento: "…"
    verita: f_…                # in sa [V]
    versione: "…"              # the lie, always the same
    perche: "…"
    segnale: "short physical gesture"   # different from the habitual gesture [V]
    cede_se: "observable condition. <or> observable condition."   # <or>: the Engine's fixed word for "or"
atteggiamento_pg: {pg_<nome>: {stato: ostile|indifferente|amichevole, perche, vuole}}   # for EVERY PC [V]
relazioni: {...}
info_chiave: [i_…]             # exist [V]
iniziative: ["If …, then does …"]
evoluzione: [{se, allora}]     # [V]
statistiche: "…"
registro_attivita: []          # [V]
tema: {carattere, strumento, modo, registro}   # optional: the NPC's motif, see "Audio" below [V]
```
The shape of `cede_se` and `oppure` is the same as in the repertoire (repertorio.md §4). In the field `tts` the voice is referred to by its id, not by the name
of the narrator's voice.

## pg.yaml
```yaml
situazione_comune: "…"         # names no PC [V present]
personaggi:
  - id: pg_<nome>              # [V shape]
    nome, pronuncia, pronomi, specie, classe, livello: 1
    aspetto: "…"
    concetto: "two sentences"  # [V]
    aggancio: "…"              # public, like name and appearance: no secrets [V]
    cosa_sai_fare: [...]
    conoscenze_private: [{testo: "…", fatti: [f_…]}]   # only on the player's phone (T9) [V references]
    scheda: {…}                # the numeric sheets: see "Sheets and checks" below
```
A name different from the name of every NPC [V].

## Sheets and checks (docs/prove.md §2)
The full shape and the rules are in `docs/prove.md` §2. Here only where each key goes, and what the validator checks (class `SCHEDA`,
code in `strumenti/valida/regole_schede.py`, tables in `srd.py`).
- `campagna.yaml` → `regole: {dadi: true|false}`. Default: true. With false the sheets are not mandatory.
- `pg.yaml` → `personaggi[].scheda`: characteristics, skills, mastery, saving throws, armour or AC, hit points, attacks.
  The level is `personaggi[].livello`.
- `png/<id>.yaml` → `scheda`: CR, characteristics, armour or AC, hit points, attacks, optional `influenza: {cd}`.
- `scena.yaml` and `scene/*.yaml` → `prove`: a list of `{id: p_…, quando, abilita | caratteristica | salvezza, cd, indizio?, se_fallisce?}`.
- Repertoire → `richiede.prova`: a skill, a characteristic, a scene's `p_…` id, the name of an attack, or `prova`, `salvezza`, `attacco`,
  `contrapposta`.

The validator checks: missing sheets (only with dice); scores and fields; modifiers written by hand; AC that does not come from the armour;
hit points above the class hit die; NPCs outside the CR band; DC 5–30; an existing clue that is not essential; `richiede.prova` naming an
existing check.

## Repertoire: see riferimenti/repertorio.md
Fields of a line: `id, chi, tipo, quando, temi, richiede, testo, varianti, effetti, max_usi, solo_esempio, riempitivo, scena, audio` [V].
Nothing else [V]. `audio: {umore, effetto}` is an automatic signal (see "Audio" below and repertorio.md §6). `richiede.oppure` is applied
by the Engine (repertorio.md §4); `scena` is an id or a list of ids.
Every scene has at least one narrator waiting line (`chi: narratore`, `riempitivo: true`, without `scena` or with that scene); every NPC present
in a scene has its own waiting line (`chi: <png>`, `riempitivo: true`) and a deviation (`tipo: rifiuto`, also `solo_esempio: true`) [V]. The local
reader uses them when it finds no answer: the table never falls silent, while the scriptwriter writes the real answer. Codes
`COPERTURA.attesa_scena`, `COPERTURA.attesa_png`, `COPERTURA.deviazione_png`.

## Audio (optional): stile.audio, scene and node audio, png.tema
The audio pipeline (`strumenti/audio/`, contract in `docs/audio.md`) derives music, environments, effects and themes from the public fields.
These fields serve only where the deduction is wrong: check it with `strumenti/audio/.venv/bin/python strumenti/audio/genera_audio.py
campagne/<id> --dry-run`. The values are those of `strumenti/audio/vocabolario.py`; the validator rejects everything else (class `AUDIO`),
because the pipeline would ignore it in silence. No secret words in these fields [V].

```yaml
# stile.yaml
audio:
  tonalita: "D dorian"           # a note (do…si, C…B) and, if you want, a mode
  modo: dorico                   # ionio, dorico, frigio, lidio, misolidio, eolio (or maggiore, minore) [vocabulary values]
  tempo: 88                      # beats per minute, from 40 to 200
  strumenti: [fisarmonica, clarinetto]   # or a text; "no percussion" forbids them
  umore_base: esplorazione_tesa  # one of the six music tags
  epoca: antica                  # antica, moderna, futura
  motivo: {metro: 4, note: [[0, 1], [2, 1], [4, 2], [2, 1], [1, 1], [0, 2]]}   # degrees and durations [V as in the pipeline]

# scene (or node of campagna.yaml)
audio:
  musica: [notte, pioggia, ponte]   # mood, energy (bassa, media, alta), hour (alba, giorno, imbrunire, notte), weather, setting,
                                    #   or free English words
  ambiente: [pioggia, {tag: fiume, volume: 0.6}]   # layers in loop; volume between 0 and 1
  interno: false                    # optional: indoors (true) or outdoors (false), if the deduction is wrong
  umore_iniziale: esplorazione_tesa

# png
tema: {carattere: [burbero], strumento: fagotto, modo: dorico, registro: basso}

# repertoire line: automatic signal when it comes out (docs/audio.md, "Automatic signals")
audio: {effetto: campana, umore: lutto}   # one or both; nothing else (loading error) [V]
```
- **Signals of the lines**: `umore` is one of the six music tags, or `auto` (back to the music of the place); `effetto` is a tag of EFFECTS:
  campana (bell), porta (door), catena (chain), tuono (thunder), monete (coins), chiave (key) (`sfx_campana` is the same). The signal starts
  with the **first sentence** of the line, which must name that sound [V warning]; the effect plays only if the campaign's catalogue has it
  (`audio/manifest.json`) [V warning]. The Engine applies at most one automatic mood change per minute per scene.
- **`umore_iniziale`** of a scene is the mood the scene starts with: one of the six tags, never `auto` [V].
- **Environments**: pioggia (rain), temporale (storm), fiume (river), acqua (water), vento (wind), neve (snow), fuoco (fire), folla (crowd),
  taverna (tavern), campane (bells), canto (singing), notte (night), stalla (stable), gocce (drops), mare (sea), bosco (wood), mulino (mill).
- **Settings** (for `musica`): taverna, chiesa, ponte, fiume, borgo, piazza, mulino, montagna, casa, bosco, strada, sotterraneo, castello,
  mare, mercato, palazzo. **Weather**: sereno, pioggia, temporale, neve, vento, nebbia, gelo.
- **Characters** (for `tema`): caldo, gioviale, burbero, solenne, nervoso, freddo, malinconico, fiero, pacato, timido. **Registers**: basso,
  medio, alto. **Instruments for the motif**: the melodic ones of `STRUMENTI_TEMA` (flauto, clarinetto, fisarmonica, violino, violoncello,
  arpa, liuto, organo…).
  The vocabulary values above are code identifiers (`strumenti/audio/vocabolario.py`): they are used as written, in any campaign language.
- The NPC's theme comes from the public persona, never from what the NPC hides: a character that the reading, the personality and the voice
  do not justify is a warning; the Phrygian mode on an NPC who lies is a strict warning (mestiere.md §10).

## Between sessions (from the arc level): state, log, package
The procedure is in `tra-le-sessioni.md`; the arc level prepared beforehand is in `arco.md` (`preparazione.arco`). The validator's classes:
`STATO`, `CONTINUITÀ`, `ARCO`.

### stato/stato.yaml
```yaml
versione: 1
dopo_sessione: 1                     # the last session the state reflects (its logs exist) [V]

fatti:                               # what happened in play, in order; never deleted, only overridden
  - id: g_<nome>                     # g_<nome> [V]
    testo: "…"
    fonte: {sessione: 1, turno: 6, citazione: "…"}   # EXACT substring of the turn [V]
    # fonte: {sessione: 1, turno: 5, evento: {indizio: i_…}}   # an event of the turn: line, clue,
    #                                                          # fact, lie, clock [V]
    # fonte: {tra_sessioni: 1, motivo: "o_… advances: …"}   # off-screen: the reason names the clock or the rule, which exists [V]
    noto_ai_pg: true                 # the PCs know it (they have seen or heard it)
    rende_noti: [f_…]                # facts of the canon that the PCs now know [V exist]
    supera: [f_…]                    # facts of the canon that play has changed [V exist]
    superato_da: g_…                 # optional: the more recent fact that overrides it [V comes later]
    effetti:                         # optional: what changes in the derived state
      png: {png_<nome>: {vivo: false, dove: "…", atteggiamento: {pg_<nome>: amichevole}, sa: [f_…, g_…]}}
      oggetti: {ogg_<nome>: {nome: "…", chi: pg_<nome>, stato: preso}}   # preso (taken), perso (lost), distrutto (destroyed)…
      promesse: {pr_<nome>: {chi: png_<nome>, a: pg_<nome>, cosa: "…", stato: aperta}}  # aperta, mantenuta, tradita, sciolta
      fili: {filo_<nome>: aperto}  # aperto (open) or chiuso (closed)

orologi:                             # each clock at the end of the session, and after the off-screen advances
  o_<nome>: {pieni: 4, fonte: {sessione: 1}}          # = the final state of the log [V]
  o_<nome>: {pieni: 1, fonte: {tra_sessioni: 1, motivo: "o_…: …"}}

pg:                                  # the growth of the PCs
  pg_<nome>: {livello: 1, fonte: {tra_sessioni: 1, motivo: "one session only: no growth"}}
```
The **derived state** (NPCs alive or dead, where they are, toward whom they are friendly, what they know; objects; promises; threads; what the PCs
know) is obtained by applying the `effetti` of the facts not overridden, in the order of their sources. It is not written separately: so every
change has its proof.

### sessioni/<nn>/registro.yaml and trascrizione.yaml (written by the server)
The shape is that of `apps/server/src/sessione/registro.ts` (`RegistroSessione`, format 1). The validator reads:
- `sessione` (= the folder `sessioni/<nn>`), `campagna`, `formato`, `archivio.ultimo_turno` (the turns played);
- `indizi`, `battute`, `menzogne`, `fatti_noti`: entries `{id, turno, …}`, the events a fact can cite;
- `orologi[]`: `pieni_alla_fine` (the state at the end of the session) and `segni[].turno` (the "clock" event);
- the texts of a turn, verbatim, for the quotations: `trascrizione.yaml → voci[]` of that turn, `momenti[].righe` of that turn,
  `pg[].azioni_pubbliche` and `azioni_private` of that turn.

The log contains the private actions: it is the GM's material. It is not touched: it is regenerated from the archive
(`scripts/tra-sessioni.sh` checks that the files in the campaign are those the archive would give).

### sessioni/<nn>/ (the package, shape of apps/server/src/campagna/pacchetti.ts)
`sessione.yaml` with `riassunto_iniziale`, `scene` (in order), `pieni_all_inizio: {o_…: ticks}` (replaces that of the campaign's clocks),
any clocks, and the canon and nodes of the session (they are merged into campagna.yaml), and `preparazione.fili: [{id, come: ripreso|rimandato}]`,
which sits in `preparazione` so that it does not reach the narrator. Plus `scene/`, `png/` (the NPCs of this session and the updated sheets of the
recurring ones, which replace those of the campaign), `repertorio/` with its `parole_segrete.yaml` (they replace those of the campaign).

## Readings of the manual adopted
Where the manual is ambiguous, the validator and this skill read it as follows.

1. **Omens (C2).** "1–3" and "3–5" are counted on the total of the front, and every danger has at least one.
2. **Clocks (C2).** Every danger has its own clock. Those on stage are in `orologi`, the others in `fronti[].orologi_extra`.
3. **Opening (C9, §4, N2).** `apertura` has at most 3 sentences; `riassunto_iniziale` at most 4; together at most 6.
4. **Music.** Only the six tags of §4. The vocabulary of architettura.md is not yet reconciled.
5. **Purpose (C12).** `{tipo, rif}`, with tipo in snake_case from the closed list.
6. **Facts.** `sa`, `non_sa` and `mente_su.verita` are canon ids. `crede_a_torto` has the shape `{testo, contraddice}`.
7. **Clues.** A clue has only one conclusion. `nodo` can be an NPC, because NPCs are nodes (C5).
8. **Exits.** `segnalata_da` is a list.
9. **Signal.** It is a physical gesture, different from the habitual gesture (D6).
10. **Without dice** (F0): `cede_se` is written only with fictional conditions, and `tiro: "nessuno"`.
11. **Scenes.** The first is `scena.yaml`, and the F0 server plays only that one. The others are `scene/*.yaml`.
12. **Free references.** `relazioni` and `chi_altro_sa` may cite entities without a sheet.
13. **Confessions** (after the A/B judgement no. 2):
    - `richiede.privata: true` means the action must be marked private from the phone;
    - `richiede.da_pg: [...]` means the action must be by that PC.

    The server must still apply them; the validator requires them [R].
14. **Aliases** of NPCs: the server uses them to understand whom the actions speak to (repertoire, relevance).
15. **Lies.** `mente_su[].id` is the value of `effetti.menzogna_detta`.
16. **Several scenes.** A line valid only in some scenes has `scena: <id>` or `scena: [<id>, …]`.
17. **Exceptions to the catalogue.** `parole_segrete[].ammessa_nel_catalogo` applies only to a line that the Engine lists only after a player
    has written the secret word. It must be justified in the note.
18. **Context of mode B.** What the server's compiler actually sends counts (`strumenti/contesto_modo_b.ts`), not a hand-written list:
    `da_togliere_dal_contesto` is no longer needed, and the validator ignores it.
19. **Similar voices.** `simile_a` in `assets/voci/voci.yaml` is symmetric; two similar voices count as two identical ones.
20. **Time of the chronology.** The day of the session is day zero; an event without an hour is not ordered against the others of the same day.

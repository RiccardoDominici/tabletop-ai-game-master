# Combat

Combat is driven by the rule set of the campaign (docs/regole.md). The SRD 5.2 is the default: individual initiative,
Action / Bonus action / Movement / Reaction, death saving throws and the 15 conditions. A manual with other phases or
other characteristics changes it by itself, with the `combattimento:` section of `regole.yaml`.

## 1. Research

| System | Initiative | Round | At 0 | End | Source |
|---|---|---|---|---|---|
| **SRD 5.2** | Dexterity check; fixed order; surprise = disadvantage | each takes their own turn: movement + one action; bonus action only from a feature; one reaction per round | PCs: unconscious and death saving throws. DC 10; 3 successes = stable, 3 failures = dead. A natural 1 = two failures, a natural 20 = 1 HP; damage at 0 = one failure. Monsters: dead | enemies on the ground (or the story) | [OPENED] SRD_CC_v5.2.pdf, IT 5.2.1 |
| **B/X (Moldvay)** | 1d6 per side, every round; an even result withdraws | phases: morale, movement, missiles, magic, melee; first one side, then the other | death (base rule) | morale 2d6 ≤ score, after the first fallen and when half have fallen; otherwise flight or surrender | [OPENED] epicsavingthrow.com (B/X summary); [SNIPPET] giantitp/enworld; basicfantasy.org not reached (403) |
| **PbtA (Dungeon World)** | none | follows the fiction; the Game Master makes a move on a 6- or when they look at it | «Ultimo respiro» (Last breath) (2d6) | when the story says so | [OPENED] dungeonworldsrd.com/moves (Hack and Slash: 7–9 you hit and get hit) |
| **Ironsworn** | whoever is «in controllo» (in control) | moves: Enter the Fray, Strike, Clash, End the Fight; progress track | damage and stress, momentum | progress move | [OPENED, partial] Ironsworn SRD (CC-BY-4.0) |

The SRD 5.2 conditions with their effects are in apps/server/src/regole/combattimento.ts (`CONDIZIONI_SRD`).

**What a generic section needs** (from the research):
- individual fixed initiative, per side each round, or none;
- ordered phases;
- turn economy;
- tiered outcomes: a 7–9 with the exchange of blows;
- at 0 with the right branch: death, out of play, death saving throws;
- conditions with mechanical effects;
- morale.

Ironsworn's «in controllo» (in control) is approximated with `nessuna` (see §6).

## 2. The `combattimento:` section (the schema is in docs/regole.md §2)

```yaml
combattimento:
  iniziativa: {tipo: individuale | per_schieramento | nessuna, dado: 20, caratteristica: destrezza, ogni_round: false}
  fasi:                         # in order; png = what the NPCs do on their own in that phase
    - {id: movimento, nome: "Movimento", png: null}
    - {id: proiettili, nome: "Proiettili", png: attacco_distanza}
    - {id: mischia, nome: "Mischia", png: attacco_mischia}
  azioni: [{id: azione, nome: "Azione", quante: "una"}]           # turn economy, for the phone and the narrator
  danni: {modello: pf | ferite | stress, a_zero: {pg: tiri_morte | fuori_gioco | morte, png: morte | fuori_gioco},
          tiri_morte: {cd: 10, successi: 3, fallimenti: 3}}
  condizioni: [{id: prono, nome: "Prono", icona: "⬇", effetti: [svantaggio_attacchi, attacchi_contro_vantaggio], testo: "…"}]
  condizione_a_zero: privo_di_sensi
  fine: {morale: true}          # B/X: 2d6 against the NPC's `scheda.morale` (7 if missing)
```

- **Effects** (closed list, the Engine applies them to the rolls): `svantaggio_attacchi`, `vantaggio_attacchi`,
  `svantaggio_prove`, `svantaggio_salvezze`, `attacchi_contro_vantaggio`, `attacchi_contro_svantaggio`,
  `critico_contro`, `fallisce_salvezze_forza_destrezza`, `perde_turno`, `non_si_muove`.
- **Default values without the section**:
  - SRD: everything in the SRD 5.2, that is the 15 conditions plus «In guardia» (On guard; the Schivata condition).
  - 2d6: `iniziativa: nessuna`.
  - The other types: individual, with d20 or d10 and Dexterity if the set has it, and at 0 «fuori gioco» (out of play).

## 3. Flow (Engine: prove/combattimento.ts, prove/motore.ts)

1. **Combat starts** when an attack roll touches a character with a sheet: a PC attacks an NPC, or an NPC reacts. Or with
   the Game Master's panel, «Inizia combattimento» (Start combat).
   - **Participants**: the PCs at the table with a sheet, the NPCs involved, and the NPCs on stage with a sheet and hostile
     to a PC.
   - The initiative is the set's. The action that opened the clash counts as «di sorpresa» (surprise).
2. **Steps**: a round is phases × order (individual), or phases × sides (per side).
   - **PC step**: the window opens **only for that PC**, or for their whole side. The Engine ignores the narrator's
     invitation. The others may write, but their action stays queued (`TavoloAzioni.rinvia`) and is resolved on their
     turn. No timer: the fast pace applies only if the scene asks for it.
   - **NPC step**: resolved by the Engine, with no extra calls. It attacks a standing PC, in the right phase. The target,
     deterministic, is the PC who hit it; otherwise the one who acted last; otherwise the first one standing.
   - Consecutive NPC steps are resolved together. The narrator narrates them in the same reply, after the PC's action.
3. **At 0**:
   - the set's condition «Privo di sensi» (Unconscious);
   - SRD: death saving throws at the start of its turn, then stable, dead, or standing with a 20; the 20 that gets it back
     up and the 1 that counts as two failures belong to the set (`tiri_morte.venti_rialza`, `uno_doppio`), with the SRD as
     default: before, they applied to every set (final e2e, §2);
   - otherwise out of play or dead.
   - The Game Master may restore HP: whoever goes back above 0 gets up.
   - **Out of play** (prove/stato.ts, `fuoriGioco`): on the ground (0 HP), dead, or fled. The dead and the fled stay marked
     even when the clash is over, and they are saved with the session; flight is forgotten at a scene change (whoever
     fled may reappear elsewhere), death is not (the Game Master who restores HP brings them back into play; putting a
     fled character back on stage by hand brings them back). Whoever is out of play does not speak or act, anywhere: they
     leave the NPCs on stage of the director (`pngInScena`), hence the catalog and the preselection of lines, the
     improvised `[png_x]` lines (the guard for absent NPCs discards them), the scriptwriter and the projector's present
     ones. The narrator's and the selector's message has the section «PNG fuori gioco» (NPCs out of play) («Ruggero giace a
     terra senza sensi: non parla né agisce» (Ruggero lies on the ground, unconscious: he neither speaks nor acts)). The
     arbiter sees the bodies («· A TERRA» (· ON THE GROUND), «· MORTO» (· DEAD)), not the fled; an attack on a fled
     character does not roll and does not open another clash. In the final e2e an NPC at 0 HP negotiated for five turns
     (bug C1).
4. **Conditions**: set by the Engine (at 0) or by the Game Master; they expire at the start of the round, if they have a
   duration. Their effects enter the rolls: advantage or disadvantage with the reason on the sheet, critical, failed saves,
   lost turn.
5. **End**: enemies on the ground or fled, all PCs on the ground, failed morale (B/X), or «Termina combattimento» (End
   combat). Morale is also rolled when the opening blow knocks down an NPC: before, its fact was lost and whoever fled
   stayed on stage (bug C3). Whoever flees is a required fact («Grosso fugge.» (Grosso flees.), §3.7).
6. **Narrator**: every NPC attack arrives as an explicit sentence before the details («Ruggero lo sgherro colpisce Corrado
   Lanzi: 6 danni» (Ruggero the thug hits Corrado Lanzi: 6 damage), «… manca …» (… misses …)), and the prompt asks to
   narrate it in its own sentence, never by hints. The section «Esiti dei tiri» (Roll outcomes) carries «Combattimento,
   round N, fase X. Ordine … Tocca ora a: …» (Combat, round N, phase X. Order … Now up: …). The narrator closes by
   inviting only whoever is on turn, and does not invent attacks or damage.
7. **Required facts** (prove/fatti-dovuti.ts): in the final e2e of 10 November (narrator Haiku, Basic Fantasy set) the
   narrator skipped Engine facts even with «raccontalo» (narrate it): a PC at 0 with their death save, the damage dealt.
   Minimal responsibility: the Engine does not ask for another call, it checks.
   - Facts of the turn, one per creature, the most serious: `morto`, `fuggito` (morale), `rialzato` (natural 20), `stabile`,
     `morente` (death save without a final outcome), `a_terra` (a blow brings it to 0), `colpito` (a blow with damage). Only
     from the public cards: the outcome of a private action is not said at the table.
   - After the narration (and its repair), a fact counts as said if a line at the table names the creature (name, short
     name, nickname) and has a word that begins with one of the roots of the type (lingue/<codice>/motore.yaml,
     `fatti_dovuti`). Private lines do not count.
   - Blows exchanged in the same turn: «Corrado colpisce Ruggero» (Corrado hits Ruggero) names both but narrates only one
     blow. So each blow needs a sentence of its own that also names whoever struck.
   - A fact not said: the Engine adds a short narrator line from the language package (testi-prove.yaml,
     `prove.dovuti.<tipo>`: «Corrado cade a terra.» (Corrado falls to the ground.), «Ruggero incassa il colpo.» (Ruggero
     takes the blow)), before the invitation question if its voice has not yet started. It applies to the narrator and to
     the selector. In the turn log: `fatti_aggiunti` ("type:id"); in the server log: «prove: fatti dello scontro non detti
     dalla narrazione, li dice il Motore» (prove: clash facts not said by the narration, the Engine says them).
   - Limits: a negation («il colpo non lo raggiunge» (the blow does not reach him)) counts as said; a pronoun without a name
     («il nano barcolla» (the dwarf staggers)) does not, and the Engine adds its line even if the fact was understood.
8. **The narrator cannot contradict the cards** (narrazione/guardia-esiti.ts), the other side of the required facts. In
   the second pass of the final e2e the narrator had a standing goblin «cade sui gradini con un rantolo» and Grosso
   «colpisce Livia» on a card that said miss. Before the voice, a narrator sentence is replaced by the Engine's line when:
   - it tells the OUTCOME of one of the turn's attacks and the opposite of the card: it has an outcome word (a verb of
     hitting, `guardia_esiti.colpito`, or of missing, `mancato`; a negation right before a hit counts as a miss) and names
     the card's attacker before it and the target after it (the other way round with a verb of receiving, `subisce`:
     «Fulco incassa il colpo di Zirrà»): «Grosso manca Livia.» / «Grosso colpisce Livia.», with the names written on the
     card, never the line's speaker. An announced action («tira il pugnale al goblin») has no outcome word and is left
     alone, and so is a near-hit absorbed by armour (`assorbito`: «di striscio, ma la cotta regge»), which fits a miss and
     a hit with no damage. Pass 2b of the final e2e: the first version took the attacker from the speaker («Narratore manca
     Zirrà.»), ignored the direction, counted «pugnale» as a hit and replaced an announcement;
   - it has a defeat word (`guardia_esiti.sconfitta`: «muore», «cade», «crolla», «a terra»…) whose subject is an NPC
     with a sheet who is not out of play (named before the word in the same clause, or through a pronoun, «…, e quello
     crolla»), and no NPC the sentence has fall really is. An idiom or another subject (`figurati`: «lo sguardo cade»,
     «cade il silenzio», «lascia cadere la mazza») is not a fall: in the second pass «il suo sguardo cade un attimo sul
     cancello» became «Berta è ancora in piedi.» (N3); «Zirrà incassa il colpo, ma resta in piedi.»
     (hit), «Eliandro manca Zirrà.» (miss) or «Zirrà è ancora in piedi.» (no card); two such NPCs: «Nessuno cade: lo
     scontro continua.».
   - The words are in `lingue/<code>/motore.yaml` (`guardia_esiti`), the lines in testi-prove.yaml (`prove.guardia`). The
     anomaly goes to the narration log (`colpo_contrario`, `caduta_senza_fatto`). Limits: a sentence that tells both a
     hit and a miss is left alone; an NPC without a sheet can fall in the story.

## 4. Screens
- **Projector**: the initiative bar at the top (in place of the row of portraits during the clash). It shows the round and
  phase, the combatants in order with whoever is on turn highlighted, the HP bar (for NPCs only the bar), the condition
  icons, «a terra / morto / fuggito» (on the ground / dead / fled), and death saves (schermo/BarraIniziativa.tsx).
- **Phone**: «È il tuo turno» (It is your turn) with HP, conditions and available actions; otherwise «tocca a …» (it is
  up to …) (telefono/TurnoCombattimento.tsx).
- **Game Master panel**: «Inizia / Termina combattimento» (Start / End combat), HP of all editable sheets, conditions to
  add and remove (master/SezioneCombattimento.tsx). Commands `combattimento_inizia`, `combattimento_termina`, `pf`, and
  `condizione`.

## 5. Verification
- **test/combattimento.test.ts**:
  - SRD: initiative, the NPC's turn, 0 HP, death saves (1 and 20), a condition that makes you lose the turn and expires,
    advantage from «prono» (prone);
  - B/X: sides, phases, morale;
  - PbtA: no turns;
  - the schema and its errors.
- **test/combattimento-integrazione.test.ts**, with the whole server: the window opens only for whoever is on turn, the
  out-of-turn action stays queued, the NPC acts on its own, the Game Master ends it.
- **test/fuori-gioco.test.ts**: dead and fled in the state, morale at the start of the clash, an attack on a fled
  character, and with the whole server an NPC at 0 HP that no longer speaks, leaves the catalog and the projector.
- **test/fatti-dovuti.test.ts**: facts from the cards and from death saves, the name + word check in Italian and in English,
  the mutual blows, and with the whole server the skipped blow that the Engine says before the invitation.
- **E2E** on port 4720 with real Haiku: apps/web/e2e/combattimento.spec.ts.

## 6. Open
- **Initiative «in controllo» (in control) (Ironsworn)** and combat moves with a progress track: today it is played as
  `nessuna`.
- **Movement and distances**: not tracked; the NPC's target is not «il più vicino» (the nearest one). Opportunity attacks
  are missing too.
- **PC's turn**: one action only. Bonus action, multiple attacks and spells are only descriptive.
- **Conditions from the arbiter**: for example «lo butto a terra» (I throw him to the ground) becomes prone, «mi metto in
  guardia» (I get on guard) becomes Schivata. Today they are set only by the Engine (at 0) and by the Game Master.
- **Massive damage and stabilizing with Medicine** (SRD).

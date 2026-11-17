# Dice and character sheets

On this page: how checks and dice work, what you see on the projector and on the phone, and how character sheets are written.
Read first: [One evening of play](one-evening.md). The source for everything is `docs/prove.md`; here is the simple version.

## In brief

- **The program rolls, the model does not.** A referee decides only *what* gets rolled: for example a Persuasion check, or an attack roll with the crossbow. By default the referee is code, with no model (see [local and API](local-and-api.md#the-rules-arbiter)); a local model or Haiku can do it if you choose them. The code works out everything else from the sheets and the rules: difficulty, modifiers, dice, outcome.
- **The narrator receives the outcome as a fact.** For example: «Ida Ferraro: Persuasione (Carisma) verso Bertoldo: 18 contro CD 15 → RIUSCITA.» (Ida Ferraro: Persuasion (Charisma) toward Bertoldo: 18 against DC 15 → SUCCESS.) The narrator tells the consequence and cannot change it.
- **Every roll has its own card**, on the projector and on the phone. A private roll appears only on the phone of its player.
- **By default the players roll real dice.** The table hears «Ida, fai un tiro di Furtività» (Ida, make a Stealth check), the player rolls at the table and types what the die shows on the phone. The DC is never shown or said to the players; the Game Master panel has it. The campaign can choose that the program rolls instead (see [Who rolls the dice](#who-rolls-the-dice)).

The rules are those of the D&D SRD 5.2 (license CC-BY-4.0), unless the campaign has its own rule set (see the end).

Words you need:
- **CD** (difficulty class): the number to reach on a check;
- **CA** (armor class, AC): the number to reach to hit someone;
- **modifier**: what is added to the die;
- **PF** (hit points, HP): how many hits a character can take.

## When to roll

You roll only when the outcome is uncertain and interesting: when failing is possible and matters (SRD 5.2, «D20 Tests»).
- A trivial action does not roll: it succeeds, and that's that.
- An impossible action does not roll: it fails. «Impossible» needs a reason the scene writes down: when the arbiter calls an action impossible but nothing in the scene's public facts (`vincoli_pubblici`) says why, and the action is an ordinary check («sollevo il carro rovesciato», I lift the overturned cart), the check is rolled instead, hard at worst. Hard is not impossible.

Without numeric character sheets, nothing is ever rolled: the narrator resolves things with «sì, ma…» (roughly "yes, but…"; see "A campaign without dice" below).

By default no model decides the rolls: the Engine reads the action (`apps/server/src/prove/classificatore-regole.ts`). It looks at what your character DOES, not at what they say: words in quotes, or after «dico agli altri:» (meaning: I tell the others:), count only for social checks. Asking a question never rolls. A social check needs an NPC you speak to («Berta, …», «chiedo a Berta…»), not just one you mention. Words are compared whole, so «spalla» (shoulder) does not trigger «spallata» (a shoulder charge), and common words such as «porta» (door) or «passaggio» (passage) say nothing alone. When in doubt, it does not roll: a roll fewer is better than an absurd one.

After a failed check, what you wanted does not happen. The narrator is told so, and a prepared line that would grant it anyway (for example, the NPC handing over the key) is refused.

A clear attack is an attack whatever any arbiter says: a weapon from your sheet used against an NPC with a sheet («lancio il dardo incantato contro il goblin», I cast the magic missile at the goblin) always rolls. In a fight, «lo colpisco ancora» (I hit him again), «Ancora!» or «Pugnale ancora» roll too, against your last target if it is still standing, else against the first enemy standing in the turn order, even when you name someone after it («Pugnale ancora, il goblin si gira verso di me»); «Ancora contro il goblin» (again at the goblin) rolls against the goblin. And the narrator cannot contradict the cards: a sentence that has a standing NPC fall, or tells a hit where the card says miss (or the other way round), is replaced by the Engine's short line («Grosso manca Livia.», Grosso misses Livia). Whoever is down, dead or fled stays so in the story too: a sentence where they act or speak becomes «Zirrà giace a terra, senza vita.» (Zirrà lies on the ground, lifeless), and a prepared line that names them no longer comes out.

## Who rolls the dice

A campaign chooses it when it is created: `regole.tiri_giocatori` in `campagna.yaml` (the Preparer writes it from the brief's `tiri_giocatori`).

- **`manuale` (the default; also when the field is missing).** When the window closes and an action needs a roll, the game stops before the narrator:
  - the narrator's voice says what to roll, never the number to beat: «Ida, fai un tiro di Persuasione, con vantaggio.» A private action's roll is never said aloud;
  - the projector shows the request in the cards' column: who, what, how to roll («tira 2d20, tieni il più alto»), the bonus; never the DC;
  - the player's phone shows a full-screen card: what to roll (1d20; 2d20 with advantage, and which one counts; 1d100 «lower is better» for a percentile skill; 2d6 added up), the bonus from the sheet, one box per die. The player types what each die shows, the phone adds the bonus and shows the total, **Fatto** (Done) sends it. A private action's roll is only on that phone;
  - dictation works here too: with the roll card open, the microphone button fills the boxes from what you say («ho fatto 14», «quattordici», «I rolled a nineteen»), then you check and press **Fatto**;
  - when every die is in, the Engine works out the outcome with those dice and the narrator tells it. The card on the projector and on the phone shows the dice, the bonus, the total and the outcome, but not the DC, the AC or the threshold;
  - a forgotten roll does not block the table for good: in the panel, **Tiri** (Rolls), the Game Master types the dice the player says, or presses **Tira il Motore** (the Engine rolls) for that roll, or **Tutti al Motore** for all of them. There is no timer: a table waits for its dice. A roll given to the Engine keeps that player's next rolls of the same turn with the Engine (a player who left), and **Tutti al Motore** gives the Engine every roll left in the turn;
  - every die of your own character is yours, one request after the other, as at a real table: after a hit, «Corrado, tira i danni.» (the damage dice and the weapon's bonus; two dice on a critical); when a fight starts, every player at the table rolls initiative («Ida, tira l'iniziativa.»), again each round if the rule set re-rolls it; at 0 hit points, the death saving throw at your turn («Teo, tira contro la morte.»); in a contest with another player's character, both players roll at once. A private action's follow-ups stay on its phone;
  - the Engine still rolls what is not one player's own: the NPCs' rolls (their attacks, damage, initiative, death), the rolls for a whole side (surprise, initiative by sides), morale, and the Game Master's own rolls. A fight the Game Master opens from the panel starts when the window closes, after that window's actions: then every player at the table rolls initiative, as in a fight an attack opens;
  - on a 2d6 rule set the difficulty's modifier stays secret like a DC: the phone's bonus is your stat alone, and the card shows the total you computed and the outcome.
- **`automatico`.** The program rolls for the players, as before. The cards still show no DC.
- **The number to beat is never shown at the table, in either mode.** No card on the projector or on the phones has the DC, the AC or the threshold: not a player's check or attack, not an NPC's attack against your armour, not a death save. The cards show the dice, the bonus, the total and the outcome; the Game Master panel has the numbers. A campaign that wants them at the table sets `regole: {mostra_cd: true}` in `campagna.yaml`.
- **The Game Master's own rolls.** When the world leaves something to chance (a clock's gate with `tiro` in the campaign: does the front advance, does the news spread; a world question of the scene: is the guard awake, does the NPC on the stairs notice the noise — see [World questions](#world-questions)), the program rolls, never the narrator. `regole.tiri_master` in `campagna.yaml` decides whether the table sees it: `nascosti` (hidden, the default: only the panel has it), `a_volte` (sometimes: when the odds are close, from one in three to two in three), `visibili` (always). A roll the table sees is a card «Il master» with the die and «Sì» or «No», and one line of the narrator («Il master tira i dadi.»); what it was for stays with the Game Master. Test override: `TAGM_TIRI_MASTER`.
- **The Game Master can ask for a check** from the panel («Chiedi una prova», [the Game Master panel](master-panel.md#rolls)): it goes through the same path, rolled by the player or by the program depending on the campaign.

```yaml
# campagna.yaml
regole:
  tiri_giocatori: automatico   # or manuale (default)
  mostra_cd: true              # the table's cards show DC, AC and threshold (default false: only the panel)
```

A test instance can override it without touching the campaign: `TAGM_TIRI_GIOCATORI=automatico` (or `manuale`), for example `TAGM_PORTA=4710 TAGM_TIRI_GIOCATORI=automatico scripts/avvio.sh --finto`. The server log says at startup which one is in use and where it comes from (`PROVE E DADI: … players' rolls manuale`).

## What you see

**On the projector** a column of cards appears on the right, one per roll. Each card shows:
- who rolls, what, and against whom;
- the d20 (two d20s with advantage or disadvantage: the discarded one is faded);
- the modifier and the total;
- the CD or CA to beat (not when the players roll their own dice: then only the Game Master panel has it), and the outcome;
- for attacks, the damage and, if needed, «a terra» (down);
- for an attack that always hits (a weapon marked `automatico` in the rule set, such as a magic missile), no d20: the card reads «automatico: 1d6+1 = 7 danni» (automatic: 1d6+1 = 7 damage).

The d20 spins for about 1.2 seconds, then the total and the outcome appear. When the narration is over, the cards close up and disappear.

**On the phone**:
- your action's card, even if it is private, is seen only by your phone;
- «Tiri del turno» (Rolls this turn) shows the public cards from the last turn;
- your hit points sit under your character's name.

The narrator knows how NPCs (PNG, non-player characters) are doing («ferito ma regge», roughly "wounded but holding on", and «a terra»), but never their numbers. For the players' characters it hears the numbers, which the players see on the phone anyway.

Want to see what a card looks like? With the server running, open `http://localhost:4610/schermo?carte=prova` (or `?carte=galleria`, or `/telefono?carte=prova`): the page shows sample cards and is not connected to the game (`docs/prove.md`, §5).

## The rules the Engine uses

Everything comes from `docs/prove.md`, §1, which cites the SRD 5.2.

**The check.** d20 + the ability modifier + the proficiency bonus, if the character is proficient.
- Modifier: (score − 10) divided by 2, rounded down. For example, Charisma 16 gives +3.
- Proficiency bonus: +2 from level 1 to 4, +3 from 5 to 8, and so on up to +9.

**Difficulties** (when the scene does not give one):

| DC | Difficulty |
|---|---|
| 5 | very easy |
| 10 | easy |
| 15 | medium |
| 20 | hard |
| 25 | very hard |
| 30 | almost impossible |

Without a model (the default referee), the program starts from medium (or your rule set's default) and moves one step for what the action or the scene says makes it easier or harder: «with a run-up», «with a rope» make it easy; «slippery», «against the current», «in the dark», «a bridge that collapses» make it hard; a sentence of the narration about the place the action touches («the river is in flood» for «I swim across the river») counts when the action itself says nothing. A nuisance alone (rain, cold, mud) does not make a routine move hard, and a routine move (climbing a tree, going up a hill) is rolled only when something makes it hard. The words are in `lingue/<code>/prove.yaml` (`parole.difficolta`, `parole.abilita_se_difficile`). With your own rule set, the steps are its difficulties, from the easiest.

**Advantage and disadvantage.** Two d20s are rolled and the higher (advantage) or the lower (disadvantage) is kept. Several advantages do not add up; one advantage and one disadvantage cancel each other out.

**A natural 20 and a natural 1** count only on attack rolls: a 20 is always a critical hit (the damage dice are rolled twice), and a 1 always misses. In checks and saving throws they do not count. (This is the SRD 5.2; a campaign with its own rule set says where they count, see [Your rules manual](your-rules-manual.md): Basic Fantasy counts them on saving throws too.)

**Attacks.** The roll is compared with the target's AC. A ranged weapon has disadvantage if an enemy who can see the attacker is within 1.5 metres of it. (A campaign with its own rule set may add situational modifiers instead: in Basic Fantasy «colpisco alle spalle» (I strike from behind) is +2, a charge with a spear +2 and double damage, «da lontano» (from afar) −2; see [Your rules manual](your-rules-manual.md).)
- At 0 PF an NPC dies or is knocked out, as its rule set says.
- At 0 PF a player's character falls unconscious and makes death saving throws: see [Combat](#combat).

**Persuading an NPC («Influenzare», Influence).**
- If the NPC is well disposed, no roll is made: it works. If it is hostile, no roll is made: it does not work.
- If it is hesitant, roll against DC 15, or against its Intelligence if that is higher, or against the DC written in its sheet (`influenza.cd`).
- A friendly NPC toward that character gives advantage; a hostile one gives disadvantage.
- The skills are Persuasion, Deception, Intimidation, Performance, and Animal Handling (with beasts).

**Helping.** Whoever helps a companion gives them advantage on their check. Group checks do not exist in the SRD 5.2: whoever cooperates says they help.

**Passive checks** are worth 10 + the modifier.

**House rules** (declared in `docs/prove.md`, §1, because the SRD 5.2 has no general rule for these):
- against an NPC, you roll against its passive score, for example your Stealth against its passive Perception. Only the player rolls;
- between two players' characters, both roll, and the higher one wins. On a tie, neither prevails;
- grappling and shoving are simplified to Athletics against the passive score.

**NPC reactions.** If you hit a hostile NPC that stays on its feet, it can respond at once: the Engine rolls its attack after your action, in the same turn.

## Combat

**How a fight starts.** Either an attack hits or targets a character with a sheet (a player's character attacks an NPC, or an NPC answers), or the Game Master presses «Inizia combattimento» (Start combat) in the panel. The fight takes in the player characters at the table, the NPCs involved, and the hostile NPCs on stage that have a sheet. The attack that opened the fight counts as a surprise attack. If the rule set has a surprise roll (`combattimento.sorpresa`, as in Basic Fantasy: 1d6, on 1–2 a side is surprised), the side attacked rolls it (both sides when the Game Master starts the fight): a surprised side loses the first round.

**Initiative** comes from the campaign's rule set. With the SRD 5.2 (the default), each combatant rolls a d20 plus its Dexterity modifier once, and the order stays the same for the whole fight. A manual can use initiative by side instead (for example 1d6 per side, rolled again each round, as in B/X), or none, as in PbtA games. See [Your rules manual](your-rules-manual.md). When the order is rolled (the fight starts, or a new round rolls it again), the Engine says it at the table before the invitation, names only: «Ordine del round: Grosso, Eliandro, Livia.» (Turn order this round). The order is the rule set's: a player who writes «vado per prima» (I go first) does not change it, and the window opens only for whoever is on turn.

**Turns.**
- A round is a series of phases (movement, ranged attacks, melee, as the set defines them). In each phase the combatants act in initiative order.
- When it is a player's character's turn, only that character is invited to act. The other players can still write, but their action waits in line and is resolved on their own turn.
- NPCs act on their own turn, without input. In their phase they attack a standing player's character: first the one that hit them, otherwise the one who acted last, otherwise the first one standing. The narrator describes their actions in the same reply.
- An NPC who is down, dead or has fled no longer speaks or acts: its prepared lines are set aside, its improvised lines are dropped, the projector stops showing it among those present, and the narrator is told («non parla né agisce», meaning: does not speak or act). Fled NPCs can turn up again in a later scene; dead ones stay dead unless the Game Master gives them hit points back in the panel.
- If the whole party falls in a fight, the death saves are rolled to the end, then the narrator says what happens to the defeated (the campaign's prepared ending for that scene, or a short closing sentence) and the table pauses: you, as Game Master, choose how to go on (another scene, healing, or the end of the evening).
- The table always hears the hits, the falls, the flights and the death saves. If the narration leaves one out (the Engine looks for the character's name and a word for that fact), the Engine adds a short narrator line, such as «Corrado cade a terra.» (Corrado falls to the ground.) or «Ruggero incassa il colpo.» (Ruggero takes the blow.). The lines come from the language pack (`lingue/<code>/testi-prove.yaml`, `prove.dovuti`), and the server log says «prove: fatti dello scontro non detti dalla narrazione, li dice il Motore».
- A player's character has one action per turn. Bonus actions, multiple attacks and spells are described, not resolved.

**At 0 HP.**
- An NPC dies or is knocked out, according to its rule set (SRD: it dies).
- A player's character falls «Privo di sensi» (Unconscious). With the SRD it makes a death saving throw at the start of each of its turns: DC 10; 3 successes and it is stable; 3 failures and it dies. A natural 20 brings it back to 1 HP; a natural 1 counts as two failures; damage taken at 0 HP counts as one failure.
- The Game Master can restore HP in the panel. A character back above 0 gets up.

**Conditions** have mechanical effects. The SRD 5.2 conditions (for example Prone, Poisoned, Stunned) and the Dodge action change the rolls: disadvantage on attacks, attacks against them with advantage, failed saves, a lost turn, and so on. The Engine adds Unconscious at 0 HP. The Game Master adds or removes the others in the panel, and a condition with a duration ends at the start of the round when it expires.

**How a fight ends:**
- the enemies are down or have fled;
- all the player characters are down;
- a side's morale fails (sets with morale, as in B/X: 2d6 against the morale score of each NPC, after the first fall and when half are down; a failure means flight or surrender);
- the Game Master presses «Termina combattimento» (End combat) and confirms it.

## Character sheets

Sheets are optional: a campaign without sheets plays without dice. The four example campaigns (`prova-f0`, `ponte-lanterne`, `nozze-neve`, `torre-mozza`) have sheets for their characters and NPCs, and checks for their scenes. `torre-mozza` uses the Basic Fantasy rules (see [Your rules manual](your-rules-manual.md#8-an-example-basic-fantasy)).

### A player character's sheet

It lives in `pg.yaml`, inside each character, under `scheda`. A real example, from `campagne/nozze-neve/pg.yaml`:

```yaml
    scheda:
      caratteristiche: {forza: 8, destrezza: 13, costituzione: 12, intelligenza: 10, saggezza: 10, carisma: 16}
      competenze: [intrattenere, persuasione, inganno, storia]
      tiri_salvezza: [destrezza, carisma]
      armatura: {tipo: armatura di cuoio}
      pf: 8
      attacchi:
      - {nome: Stocco, caratteristica: destrezza, danno: 1d8, tipo_danno: perforante}
```

| Field | What it contains |
|---|---|
| `caratteristiche` | all six: `forza` (strength), `destrezza` (dexterity), `costituzione` (constitution), `intelligenza` (intelligence), `saggezza` (wisdom), `carisma` (charisma). For player characters, scores from 1 to 20. |
| `competenze` | the skills the character is proficient in (list below) |
| `maestrie` | optional: skills with double proficiency (expertise) |
| `tiri_salvezza` | the abilities the character is proficient in for saving throws |
| `armatura` | the armor type (list below), with `scudo: true` if it has a shield; or `ca: 14` with no armor |
| `pf` | the maximum hit points |
| `attacchi` | every weapon: `nome` (name), `caratteristica` (ability), `danno` (damage, for example `1d8`), `tipo_danno` (damage type), and `distanza: true` for ranged weapons. Optional: `competente` (true if missing) and `bonus` (for a magic weapon). |

The level stays the character's own (`livello`, from 1 to 20).

### An NPC's sheet

It lives in the NPC's file, `png/<id>.yaml`, under `scheda`. It is like a player character's sheet, with some differences:
- `gs` (challenge rating, for example `1/2`) or `livello` is needed: it decides the proficiency bonus;
- ability scores range from 1 to 30. Intelligence sets the DC to persuade it;
- its `competenze` count toward passive scores (for example Perception against Stealth);
- `influenza: {cd: 12}`, optional, fixes the DC to persuade it.

The attitude toward each character (`atteggiamento_pg.<pg>.stato`: `ostile` (hostile), `indifferente` (indifferent), `amichevole` (friendly)) gives disadvantage or advantage in social checks.

### Minions

Nameless foes (a goblin sentry, two wolves, a band of thugs) do not need an NPC file each. Write one stat line per creature type in `campagna.yaml`, and in each scene how many there are:

```yaml
# campagna.yaml
gregari:
  - tipo: goblin
    nome: "goblin"                   # what the cards say («goblin 1», «goblin 2» when there are more)
    parole: [goblin, sentinella]     # the words a player may use for one
    scheda: {gs: 1/4, caratteristiche: {…}, armatura: {tipo: armatura di cuoio}, pf: 5, attacchi: [{nome: "Scimitarra", caratteristica: destrezza, danno: "1d6", tipo_danno: tagliente}]}
# scene/<id>.yaml
gregari: [{tipo: goblin, quanti: 2}]
```

An attack that names one («tiro con la balestra alla sentinella») rolls against the first one still standing, its hit points go down on the cards, and the minions of the scene join a fight there; a restart keeps them. If a player attacks a creature the scene has nobody with stats for, there is no roll and the narrator is told not to invent it. The validator checks the stat lines like NPC sheets and warns when a scene names a minion's word without having any (`strumenti/valida/regole_gregari.py`). Example: the consul's two guards of `campagne/ponte-lanterne` (one stat line in `campagna.yaml`, two guards in `scene/scena_casa_del_sale.yaml`).

### What not to write

The code calculates the modifiers: abilities, skills, saving throws, passive scores, attack rolls, damage, and the AC from armor. Neither the file nor the model writes a modifier.
- An `ca` different from the armor's is a warning, and the calculated value applies.
- An incomplete sheet does not stop the game: a missing score counts as 10, and every error ends up as a warning in the log.

### Skills and armor

The 18 skills, with the ids to write in the sheets (`apps/server/src/campagna/regole-srd.ts`):
`acrobazia`, `addestrare_animali`, `arcano`, `atletica`, `furtivita`, `indagare`, `inganno`, `intimidire`,
`intrattenere`, `intuizione`, `medicina`, `natura`, `percezione`, `persuasione`, `rapidita_di_mano`, `religione`,
`sopravvivenza`, `storia`.

The armor types, with the Italian names from SRD 5.2.1 (write them exactly as shown): Armatura imbottita, di cuoio, di cuoio borchiato, di pelle;
Giaco di maglia; Corazza a scaglie, di piastre, ad anelli, a strisce; Mezza armatura; Cotta di maglia;
Armatura a piastre.

## Scene checks

Whoever prepares the campaign can set the DCs of a scene's obstacles in advance, in `scena.yaml` or `scene/*.yaml`, under `prove`. Example from `docs/prove.md`, §2:

```yaml
prove:
  - id: p_cassetta
    quando: "un PG apre di nascosto il lucchetto della cassetta del pedaggio"
    abilita: rapidita_di_mano
    cd: 15
    indizio: i_lettera
    se_fallisce: "il lucchetto scatta rumoroso"
```

| Field | What it contains |
|---|---|
| `id` | starts with `p_` |
| `quando` | when the check applies, in public, at most 15 words: the referee reads it |
| `abilita` | the skill to roll; or `caratteristica: forza`, or `salvezza: destrezza` |
| `cd` | from 5 to 30 |
| `indizio` | optional: the clue the check lets the players find. It cannot be an essential clue: the validator returns an error for those |
| `se_fallisce` | optional: the price of failure, for the narrator |

When a scene check fits the action, it takes precedence over the referee's choice. Without a model, a check fits when the action does what its `quando` says (the same action word, «guardo» for «un PG guarda…», or one of the check's `parole`) and shares its words: «Resto vicino al camino» (I stay by the fireplace) does not fit «un PG guarda la corda appesa vicino al camino» (a PC looks at the rope hanging by the fireplace).

In the repertoire, a line can come out only after a successful check: `richiede: {prova: persuasione}`. It accepts a skill, an ability, the `p_…` id of a scene check, the name of an attack, or the types `prova` (check), `salvezza` (saving throw), `attacco` (attack), and `contrapposta` (opposed check). The Engine compares the exact words: a name with different capitalization does not match.

## World questions

Some facts of a scene are nobody's roll: is the guard at the gate awake? does the mule bray when strangers come? does the goblin on the stairs notice the noise at the iron door? The campaign can leave them to chance, in `scena.yaml` or `scene/*.yaml`, under `domande`. When the fact that asks the question happens in that scene, the program rolls it once, on the Game Master's side (hidden by default: see `tiri_master` in [Who rolls the dice](#who-rolls-the-dice)), and the narrator gets only the answer, as a fact. The model never decides it, and the narrator never reads the question in advance.

```yaml
domande:
  - id: d_guardia_sveglia
    domanda: "La guardia alla porta è sveglia?"
    quando: azione                 # a public action that touches...
    temi: [guardia, porta]         # ...these themes
    tiro: {dado: 6, almeno: 3}     # «yes» on 3 or more
    se_si: "La guardia è sveglia e guarda la strada."
    se_no: "La guardia sonnecchia sullo sgabello."
  - id: d_zirra_porta
    domanda: "Zirrà, dalla scala, si accorge di chi lavora alla porta di ferro?"
    quando: azione
    temi: [cripta, porta di ferro]
    prova_png: {png: png_zirra, prova: caratteristica:saggezza, difficolta: normale}   # the NPC's own check
    se_si: "Zirrà guarda giù, verso la cantina."
    se_no: "Zirrà non si volta."
```

| Field | What it contains |
|---|---|
| `id` | starts with `d_`, unique in the campaign |
| `domanda` | the question in the Game Master's words: it shows on the panel («Tiri del master»), never at the table |
| `quando` | the fact that asks it, as in a clock's `avanza_quando` ([The world that moves](../mondo.md)): `azione` with `temi`, `cambio_scena` (on arriving in this scene), `resta_in_scena` with `turni`, `battuta` or `indizio` with `ids`, `prova_fallita`, `scontro` |
| `tiro` | the odds of «yes»: a die and the lowest face that says yes; `visibile: true` shows that roll anyway |
| `prova_png` | or the check of an NPC of the scene with its sheet: `png`, `prova` (`abilita:<id>`, `caratteristica:<id>`, `salvezza:<id>` with the SRD; the ids of your rule set otherwise), `difficolta` (an id of the set's scale; absent = the set's default). Needs dice and the NPC's sheet |
| `se_si`, `se_no` | the two answers, as facts the narrator can tell |

The answer counts for the rest of the session: the question is not asked again, and a restart keeps it. One example is in `campagne/torre-mozza/scene/scena_torre.yaml`. The validator checks the questions (class `DOMANDE`, `strumenti/valida/regole_domande.py`).

## A campaign without dice

Two ways:
- write `regole: {dadi: false}` in `campagna.yaml` (some briefs ask for this);
- do not give a sheet to any player's character.

In both cases the narrator resolves actions without rolls, with «sì, ma…» (yes, but…). The server log says so at startup (`apps/server/src/prove/motore.ts`).

## Checking the sheets

The validator checks sheets and checks together with the rest of the campaign:

```bash
python3 -I strumenti/valida_campagna.py campagne/nozze-neve
```

This checks the `nozze-neve` campaign. It finishes with no errors if everything is fine (warnings do not count). Among the things it checks: the six abilities and their scores, valid skills and saving throws, armor or AC, HP greater than 0, attacks with a damage like `1d8`, `gs` or `livello` on NPCs, scene checks, and `richiede.prova` (`strumenti/valida/regole_schede.py`).

## Honest dice

- The dice come from a cryptographic generator, with a new seed each session, saved in the game's archive.
- Every die rolled and every action resolved ends up in the server log, with dice, modifier, total, DC, and outcome.
- After a restart, the game resumes with the same HP. Starting again from scratch restores full HP, with a new seed.
- To replay the same sequence of dice (for example in a check), there is `TAGM_SEME_DADI=<hexadecimal>`.

## What is not there yet

From `docs/prove.md`, §7:
- combat with movement and distances, opportunity attacks, several attacks or spells in one turn: see [Combat](#combat);
- conditions from the narrator: only the Engine (at 0 HP) and the Game Master set them;
- HP are set by hand in the panel's Combat section (see [The Game Master panel](master-panel.md));
- an NPC's attitude that changes during the story: the advantage does not follow it yet.

## A rule set different from the SRD

A campaign can have its own rule set, drawn from your manual (`docs/regole.md`):
- the manual goes in the `manuali/` folder, which never enters git;
- the set lives in `campagne/<id>/regole/`: `regole.yaml` (the structure), `riassunto.md` (for the players), and `estratti/` (the passages of the manual);
- the Engine can roll in three ways: d20 against a DC; 2d6 in bands (as in PbtA-style games); and a roll under a threshold, with d100 or d20;
- the roll's card says which rule was applied;
- on the phone, «Regole» (Rules) shows the summary and lets you ask a rule.

Without `regole/regole.yaml`, the SRD 5.2 described on this page applies. A broken `regole.yaml` does not stop the game: it falls back to the SRD, and the log says so. How to do it, step by step: [Your rules manual](your-rules-manual.md). The full schema, and the rules on manual licensing, are in `docs/regole.md`.

## Credits

This work includes material from the System Reference Document 5.2 («SRD 5.2») by Wizards of the Coast LLC, https://www.dndbeyond.com/srd, under the Creative Commons Attribution 4.0 International license.

## Problems?

Go to [Common problems](common-problems.md).

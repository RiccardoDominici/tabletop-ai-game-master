# Research: how to scale preparation with campaign length

Date: 3 November 2026. Author: research agent (read-only on the code, one file written).

## Source legend

- [OPENED]: page actually read (with fetch). Note: for arXiv only the abstract was read.
- [SNIPPET]: search result. I did not open the page. The text may be incomplete.

Second attempt (3 November 2026): WebFetch and curl fail with DNS resolution errors (ENOTFOUND,
curl exit 6) for slyflourish.com, thealexandrian.net, bladesinthedark.com, dungeonworldsrd.com and
help.fables.gg. Arxiv responds, however. Those sources remain [SNIPPET]. I could not read Sly
Flourish, Alexandrian, Blades in the Dark, Dungeon World and Friends & Fables. A check from a network
that resolves those domains is needed before citing them in a public document.

I found no useful content on Angry GM and Matt Colville. The searches returned only third-party
comments or videos that I could not read.

---

## Summary in ten points

1. The 2024 manual already gives a structure for long campaigns. It asks to prepare three major conflicts
   in advance. It uses levels 5, 11 and 17 as tier milestones. [OPENED, D&D Beyond]
2. Sly Flourish estimates 30–60 minutes of preparation for a three-hour session. He also says: "prepare
   only what most benefits your game". [SNIPPET]
3. The Lazy DM has no "update the campaign state" step. The recap of the previous session happens at the
   table, at the start. [SNIPPET]
4. Alexander (Alexandrian) calls the basis of long campaigns a "campaign status document". It is a living
   file that records how the scenarios change. It does not repeat the scenarios. [SNIPPET]
5. In Blades in the Dark, factions advance between sessions. The GM rolls for each faction that interests
   them. A neglected faction catches up with more steps. [SNIPPET]
6. Dungeon World separates adventure fronts (a few episodes) and the campaign front (the season). The
   campaign front is created after the first session, not before. [SNIPPET]
7. Campaigns with no declared end tend to lose steam. A commercial text talks about roughly 8 sessions.
   This is weak data. [SNIPPET]
8. In AI systems, hierarchical memory with summaries works. But summaries lose details, and retrieval
   does not always find the right fact. [SNIPPET, plus one OPENED source on NarraWorld]
9. Coherence holds up better with a log of canonical facts, always visible, plus a retrieval that can be
   traced back to its source. [SNIPPET, OPENED]
10. For Tabletop AI Game Master: a three-layer architecture (bible, state, session package). Haiku
    receives only the package of the current session.

---

## 1. How experts scale preparation

### 1.1 The starting point: how much time

- Sly Flourish: about 30–60 minutes for a three-hour session with the eight steps. For a single session
  built from scratch: one or two hours. [SNIPPET: slyflourish.com/how_long_to_prep.html]
- 2020 survey of DMs (about 4 hours of play): 10% prepare 30 minutes or less; about 33% one hour; about
  28% two hours; 29% three hours or more. [SNIPPET, same source]
- Sly Flourish withdraws the "five minute game prep" and says he exaggerated it. For a single session he
  proposes three steps: a strong opening, three to five locations, ten secrets and clues. [SNIPPET]

What it means for us: preparation time grows with the complexity of the world, not with the number of
sessions. A session in a long campaign costs less than a one-shot, because the world already exists.

### 1.2 The scales by tier

The sources do not give identical tiers. I put together what they say about the levels of a campaign.

**One-shot (1 session)**
- A strong opening, three to five locations, ten secrets and clues, few NPCs. [SNIPPET, Sly Flourish, 15-minute prep]
- The 2024 manual treats single adventures as units on their own. Its five example adventures are for
  levels 1–7. [OPENED, D&D Beyond]

**Mini-arc (2–6 sessions)**
- The 2024 DMG says a campaign is "two or more adventures linked into one story". [OPENED]
- Dungeon World: one or two adventure fronts are enough. Each front lasts a few episodes. [SNIPPET]
- Dungeon World (SRD) suggests creating the campaign front after the first session. [SNIPPET]

**Campaign (7–20 sessions)**
- Three major conflicts prepared in advance. Milestones at levels 5, 11, 17. [OPENED, D&D Beyond]
- Closing plan: plan the ending when the main conflict is resolved. [OPENED, D&D Beyond]
- A commercial text says homebrew campaigns with a clear ending last 12–30 sessions. It proposes three to
  five arcs that raise the stakes. [SNIPPET, storyroll.app: weak source]

**Long / multi-year campaign (20–100+)**
- The 2024 manual says: campaigns that last "months, even years". It gives no number of sessions. [OPENED]
- Alexander: the status document grows over time. For long campaigns it is better to separate the log of
  threads from the log of character sheets. [SNIPPET, Alexandrian, Trackers and Supporting Cast modules]
- West Marches (Ben Robbins): about two and a half years. No fixed plot. Each session is self-contained
  and restarts from the same place. The GM prepares what the players announce in advance. [SNIPPET]
- A GM with a 40-session sandbox ended the campaign when the preparation became too much.
  [SNIPPET, cannibalhalflinggaming and idlecartulary]

### 1.3 The layers the sources name

Summary of what each source calls a "layer". The words change, the idea stays.

| Layer | Who calls it that | When it is prepared |
|---|---|---|
| Premise and tone | DMG 2024 (premise, flavor) | first, with the players |
| World and history (bible) | DMG 2024 (setting, Greyhawk) | first, in part |
| Major conflicts (3) | DMG 2024 | first |
| Campaign fronts | Dungeon World, Apocalypse World | after the first session |
| Adventure fronts | Dungeon World | per block of sessions |
| Faction clocks | Blades in the Dark | between sessions |
| Status document | Alexander (campaign status) | after each session |
| Nodes and situations | Alexander (node-based design) | per scene, as needed |
| Scenes | Sly Flourish (scenes, catch-all) | per session |
| Secrets and clues | Sly Flourish, three-clue rule | per scene |

Note: some of these layers already exist in Tabletop AI Game Master. The front and the clock are in the
manual. The campaign state does not exist yet.

---

## 2. Rolling prep

This is the key point for us. Years of content cannot be written in advance. The Preparer must work on
session N+1 starting from what happened in session N.

### 2.1 How expert GMs do it

- Alexander: the status document is updated after each session. Each version is saved as a new copy
  ("Campaign Status – Session 12"). Old versions go into an archive. [SNIPPET, Smart Prep part 4]
- Alexander: it takes time, about three or four sessions, to understand what shape the document must have
  for that campaign. [SNIPPET, same source]
- Alexander: the timeline of "bangs" is also generated from events that have already happened.
  [SNIPPET, Ask the Alexandrian 19]
- Sly Flourish: the recap of the previous session is done at the table, at the start. The "scenes" step is
  a catch-all: what can change in the world if certain things happen? [SNIPPET]
- Blades in the Dark: between sessions the GM chooses the factions that interest them now. They advance
  their clocks with a downtime move. The tick depends on a roll: 1–3 advances one segment, 4–5 two, 6 three,
  a critical five. A faction that fell behind catches up with more steps. [SNIPPET, bladesinthedark.com and eskur.dev]
- eskur.dev (Blades): after each session choose three factions. Two that the PCs have already dealt with,
  one new. Each faction takes one or two actions. [SNIPPET]

### 2.2 The cycle I propose for Tabletop AI Game Master

The cycle between two sessions, to be done with the Preparer (strong model) and not with Haiku:

1. **Session log.** At the end, a structured log is written. Not prose. It contains: facts that happened,
   NPCs that changed, promises made or broken, clocks advanced, clues found, PCs that changed, secrets
   revealed. It is the base data.
2. **State update.** The Preparer updates the state file. It adds only what happened in play. It does not
   rewrite the canon on its own initiative.
3. **Faction turn.** For each active faction: a roll or a fixed rule advances the clock. Three to five
   factions are chosen. The others wait.
4. **Preparation of session N+1.** The Preparer writes only the scenes that are needed. It works from the
   updated state and the log. It does not rewrite the bible.
5. **Validation.** The validator checks the session package.
6. **Play.** Haiku receives only the session package. It does not receive the bible.

Reason: the slow work (canon, coherence, twists) is done once, before or between sessions, with the
strong model. The fast work (lines, answers) is done live with the small model. This is the same split as
the current skill, extended over time.

### 2.3 How much work per session

- Sly Flourish: 15–30 minutes of preparation per session with the eight steps, in a campaign already
  underway. [SNIPPET, third part cited]
- Rolling prep must stay small. The heavy phase is the initial one. With the cycle above, the work between
  two sessions should stay under 40 minutes of the strong model, in real use. This number is my own
  estimate, to be verified with a trial.

---

## 3. What a long campaign needs that a one-shot does not

This part collects what the sources say about long campaigns. Where I only have hypotheses, I say so.

- **PC progression.** Levels, items, abilities. The 2024 DMG uses the tiers as milestones. Scenes must change
  when the PCs go up a tier. [OPENED, DMG 2024]
- **Return of consequences.** The choices of one session come back later. The log must keep them. The 2024
  manual advises linking adventures in a serial or episodic way. [OPENED, DMG 2024]
- **Persistent NPCs that change.** An NPC can die, change faith, change side. Alexander keeps a list of the
  major NPCs outside the status document, so as not to weigh it down. [SNIPPET]
- **Open threads.** Promises, debts, questions from session zero. LitRPG Reads advises planting the ending
  early, so the threads return in the finale. [SNIPPET, litrpgreads: weak source]
- **Recap at the start.** The Lazy DM puts it at the table. For us it is a block of the session package:
  three to five written sentences, with the facts from the log. [SNIPPET]
- **Finale and epilogue.** The 2024 manual says to plan the ending when the major conflict closes. In
  addition, an ending must be prepared like a normal session, with its own clock. [OPENED, DMG 2024]
- **Players who change.** West Marches and open campaigns show that players can join and leave. The package
  must work with any subset. This is already the rule for the pregenerated PCs of Tabletop AI Game Master
  (one more than the maximum). [SNIPPET, West Marches]
- **Time in the world.** The clocks and the calendar of the timeline must keep moving between sessions too.
  Blades in the Dark does this with downtime. [SNIPPET]
- **Table fatigue.** The 2024 DMG suggests break sessions. The sources on long campaigns say that the GM's
  workload is the most common cause of early ending. [OPENED for the break; SNIPPET for the workload]

---

## 4. How AI systems keep a campaign coherent

### 4.1 What exists

- **AI Dungeon.** Automatic summary of the story every 15 actions. Memory Bank with summaries of six
  actions, searchable (the official source says six; a 2024 announcement said four). Story Cards activated
  by keywords. Plot Essentials always present. [SNIPPET, help.aidungeon.com]
- **Friends & Fables (AI GM Franz).** The ACE 2.0 engine creates memories every five turns. The memories are
  labeled with place and characters. They are recalled when needed. The story plan is updated every three
  turns. [SNIPPET, help.fables.gg and arcanumrpgs.com; I could not open the official page]
- **DOME (NAACL 2025).** Dynamic hierarchical outline plus a memory module on a knowledge graph. It is for
  long narrative. [SNIPPET, aclanthology.org]
- **Learning to Reason for Long-Form Story Generation (Gurung and Lapata, arXiv 2503.22828).** The model
  reads a condensed version of the story and writes a detailed plan for the next chapter. The plan is
  rewarded based on the quality of the chapter that comes out of it. In pairwise comparisons it wins almost
  everywhere, especially in fantasy and science fiction. [OPENED, abstract only]
- **NarraWorld (arXiv 2609.32401).** Memory as a "world": a graph with facts, character beliefs, open threads
  and hypothetical continuations. Hierarchy: events, scenes, plots, plot. Each node stays linked to the
  source text. [OPENED, abstract only]
- **Dramatron (Mirowski et al., arXiv 2209.14958, 2022; CHI 2023).** Hierarchical generation: title,
  characters, beats, locations, dialogues, each depending on the previous step. Evaluated with 15 theatre
  and film professionals. [OPENED, abstract only; CHI 2023 version SNIPPET]
- **Wordcraft.** LLM-based editor. It continues, asks for details, rewrites. It is not a memory system.
  [SNIPPET]
- **Re3 (Yang et al., 2022).** Plan, Draft, Rewrite, Edit. The Edit module checks coherence with the text
  already written. [SNIPPET]
- **STORYTELLER (arXiv 2506.02347, 2025).** Plots as SVO nodes (subject-verb-object), with a storyline module
  and a knowledge graph of narrative entities. It wins 84% of human preferences in the authors' tests. No
  data on long sessions. [OPENED, abstract only]
- **Survey on LLMs for narrative (Findings of EMNLP 2025).** Overview of methods with outlines and
  multi-agent approaches. [SNIPPET]

Correction note: one snippet said that NarraWorld has a progressive summarization benchmark. Reading the
abstract, this does not appear. I do not use it as a fact.

### 4.2 What works

- **Hierarchy with traceability.** Each summary points to its source. So an error can be corrected without
  rewriting everything. [OPENED, NarraWorld; SNIPPET, DOME]
- **Canon separate from the summary.** A log of stable facts (story card, memory block, bible section) always
  stays in the context. The summary tells the movement. [SNIPPET, AI Dungeon and F&F]
- **Beat outline.** A skeleton of events to pass through, not a fixed sequence. Dramatron and DOME work on
  this. [SNIPPET]
- **Small packages for the fast model.** The small model works better with less context and clear
  instructions. This is already the principle of the skill. [SNIPPET, indirectly; it is also the logic of the
  manual]

### 4.3 What fails

- **The summary loses details.** A typical example: it remembers "you struck an alliance with the blacksmith"
  and loses "has one hand and hates the guard". [SNIPPET, Tavernbound; competing source]
- **Retrieval does not find the right fact.** Friends & Fables admits that the right memory is not always
  recalled. The remedy is to insert the block by hand. [SNIPPET, help.fables.gg]
- **The load falls on the player.** AI Dungeon requires curating the Story Cards and the summary by hand.
  [SNIPPET, AI Dungeon and reviews]
- **Structure too rigid.** Dramatron is designed as a top-down descent. Not everyone writes that way. A PC
  who chooses off the path breaks the flow. [SNIPPET]
- **Coherence is hard to measure.** Dramatron and STORYTELLER say so too. Manual checks and fact tests are
  needed. [SNIPPET]
- **Ambiguity: dead and alive.** A review describes a monster treated as both dead and alive in the same
  scene. It is the typical case of a log that is not updated. [SNIPPET, competing source]

Caution: the sources on competitors (Tavernbound, DungeonsDeep.ai) have a stake in the outcome. They must
be read with caution.

---

## 5. Proposal for Tabletop AI Game Master

### 5.1 Tiers and layers

The number of sessions is the field of the brief. The Preparer reads it and chooses the tier. The tier
sets how many layers are generated before play and how many between one session and the next.

| Sessions | Tier | Generated before play | Generated between sessions | Reason and source |
|---|---|---|---|---|
| 1 (20–40 min) | **One-shot** | Premise, short timeline, 1 scene, NPCs 3–5, PCs, secrets and clues | nothing | Sly Flourish: 15-minute prep for a single session [SNIPPET] |
| 1 (2–3 hours) | **Long one-shot** | as above, 3–5 scenes, 1 short front | nothing | The Tabletop AI Game Master manual already plans 3–5 scenes for 2–3 hours (C11) |
| 2–6 | **Mini-arc** | Premise, 1 campaign front with 2–3 stops, timeline in 2–3 acts, main location, 4–6 persistent NPCs, sessions 1 and 2 complete | Session N+1 from the log; minimal state (facts, NPCs, threads) | Dungeon World: a few fronts are enough [SNIPPET]; some texts say a campaign with no end loses steam around session 8 [SNIPPET, weak] |
| 7–20 | **Campaign** | Short bible (2–4 regions, 3–4 factions with clocks), three major conflicts, declared ending, PC tiers as milestones, complete act 1 | Full state, faction turn, sessions N+1 and N+2 in package, finale review every three sessions | DMG 2024: three conflicts and milestones at 5/11/17 [OPENED]; Alexander: status document [SNIPPET] |
| 20–100+ | **Long / multi-year** | Bible by zones (one full, the others as sketches), three to five arcs with stops, ending and epilogue, PC roster with planned changes | Living state, arcs generated one at a time (blocks of 3–5 sessions), automatic recap, major NPCs tracked separately | DMG 2024: "months, even years" [OPENED]; West Marches and long sandboxes: small prep after the start [SNIPPET] |

Note: the thresholds (2–6, 7–20, 20+) are mine. The sources give no precise numbers. I chose them to align
with the durations that Riccardo already uses in the brief. They must be verified with a trial campaign.

### 5.2 Three memory layers (proposal)

1. **Bible** (`campagna.yaml`, `mondo/`): premise, story, regions, factions, canon. Changes little.
   Written by the Preparer. Haiku does not read it.
2. **State** (`stato/stato.yaml`): stable facts that happened in play, living and dead NPCs, clocks, open
   threads, PCs and levels, next stop. Updated after each session. It is the canonical log.
3. **Session package** (`sessioni/N/`): what Haiku actually reads. Ten to twenty lines of relevant facts,
   the scene's NPCs, lines, secrets, recap. Written by the Preparer starting from the state.

Rule: Haiku never sees the bible. It sees only the package. Retrieval stays the responsibility of the
Preparer, not of the fast model.

### 5.3 Concrete changes to the data model (to be evaluated, not done now)

- Add `durata.sessioni` (number) to the brief, and derive the tier from the number. The textual `durata`
  field stays as a note for Riccardo.
- Add `stato/` and `sessioni/` to the campaign folder.
- Add a `log_sessione.yaml` for each session played: facts, NPCs changed, clocks, promises, PCs changed.
- The validator must check that every fact in the state comes from a log.

### 5.4 Risks

- The work between sessions is the most fragile point. If the log is written badly, the state is wrong, and
  so is the next session. The log must be structured. It must not be free prose.
- The opposite risk: a canon that is too heavy. The Preparer rewrites the bible at every session. Rule: the
  bible changes only with an explicit decision by Riccardo.
- The "long" tier should not be built now. It is a goal. First the mini-arc is tried with a campaign of
  4 sessions.

---

## 6. Suggested next steps

1. Verify the sources marked [SNIPPET] on Sly Flourish, Alexandrian and Blades in the Dark, opening them
   directly. I cannot do it now because of network errors.
2. Write a 4-session trial campaign with the cycle from point 2.2. Measure the time between two sessions and
   the number of validator errors.
3. Decide the tier thresholds with Riccardo, after the trial.

---

## Sources

**Manuals and design sites**
- D&D Beyond, "Creating Your First Campaign Using the 2024 Dungeon Master's Guide" [OPENED]
  https://www.dndbeyond.com/posts/1850-creating-your-first-campaign-using-the-2024
- Sly Flourish, "How Long Does it Take You to Prep Your D&D Game?" [SNIPPET]
  https://slyflourish.com/how_long_to_prep.html
- Sly Flourish, "The Eight Steps of the Lazy DM" [SNIPPET]
  https://slyflourish.com/eight_steps_2023.html
- Sly Flourish, "Using the Lazy DM's Eight Steps At the Table" [SNIPPET]
  https://slyflourish.com/using_the_8_steps_at_the_table.html
- Sly Flourish, "Scenes: The Catch-all Step" [SNIPPET]
  https://slyflourish.com/scenes_catch_all_step.html
- The Alexandrian, "Smart Prep, Part 4: Campaign Status Documents" [SNIPPET]
  https://thealexandrian.net/wordpress/42961/roleplaying-games/smart-prep-part-4-campaign-status-documents
- The Alexandrian, "Campaign Status Module: Trackers" [SNIPPET]
  https://thealexandrian.net/wordpress/49165/roleplaying-games/campaign-status-module-trackers
- The Alexandrian, "Campaign Status Module: Supporting Cast" [SNIPPET]
  https://thealexandrian.net/wordpress/49970/roleplaying-games/campaign-status-module-supporting-cast
- The Alexandrian, "Don't Prep Plots" [SNIPPET]
  https://thealexandrian.net/wordpress/4147/roleplaying-games/dont-prep-plots
- The Alexandrian, "Node-Based Scenario Design, Part 1" [SNIPPET]
  https://thealexandrian.net/wordpress/7949/roleplaying-games/node-based-scenario-design-part-1-the-plotted-approach
- The Alexandrian, "Is Node-Based Design Prepping a Plot?" [SNIPPET]
  https://thealexandrian.net/wordpress/53341/roleplaying-games/is-node-based-design-prepping-a-plot
- Blades in the Dark, "Progress Clocks" [SNIPPET]
  https://bladesinthedark.com/progress-clocks
- Blades in the Dark, "Downtime Activities" [SNIPPET]
  https://bladesinthedark.com/downtime-activities-play
- eskur.dev, "Blades in the Dark: How I Run Factions" [SNIPPET]
  https://eskur.dev/posts/blades-how-i-run-factions/
- Dungeon World SRD, "Fronts" [SNIPPET]
  https://www.dungeonworldsrd.com/gamemastering/fronts/
- Dungeon World SRD (mirror), "14 Fronts" [SNIPPET]
  https://www.darkshire.net/jhkim/rpg/srd/dungeonworld/14-Fronts.html
- Ironsworn: Starforged SRD, "Legacy Moves" [SNIPPET]
  https://rsek.github.io/starforged-srd/moves/legacy
- Cannibal Halfling Gaming, "West Marches intro" (summary of Ben Robbins) [SNIPPET]
  https://cannibalhalflinggaming.com/2021/10/27/meet-the-campaign-intro-to-west-marches/
- Idle Cartulary, "Reflections on a West Marches Campaign" [SNIPPET]
  https://idlecartulary.com/2024/03/20/reflections-on-a-west-marches-campaign/
- StoryRoll, "How to Write a D&D Campaign From Scratch" (commercial source, weak) [SNIPPET]
  https://storyroll.app/blog/how-to-write-a-dnd-campaign
- LitRPG Reads, "How to End a D&D Campaign with Impact" (weak source) [SNIPPET]
  https://litrpgreads.com/blog/rpg/how-to-end-a-dnd-campaign-with-impact-dungeon-master-tips-for-a-satisfying-finale

**AI systems and research**
- arXiv 2609.32401, Tian et al., "Shared Worlds, Private Minds: Structured Memory for Long-Form Writing as World Creation" [OPENED, abstract only; title verified]
  https://arxiv.org/abs/2609.32401
- DOME, NAACL 2025, "Generating Long-form Story Using Dynamic Hierarchical Outlining with Memory-Enhancement" [SNIPPET]
  https://aclanthology.org/2025.naacl-long.63.pdf
- arXiv 2503.22828, Gurung and Lapata, "Learning to Reason for Long-Form Story Generation" [OPENED, abstract only]
  https://arxiv.org/abs/2503.22828
- arXiv 2209.14958, Mirowski et al., "Co-Writing Screenplays and Theatre Scripts with Language Models: An Evaluation by Industry Professionals" [OPENED, abstract only]
  https://arxiv.org/abs/2209.14958
- ACM CHI 2023, version of Dramatron with evaluation by professionals [SNIPPET]
  https://dl.acm.org/doi/10.1145/3544548.3581225
- arXiv 2506.02347, Li et al., "STORYTELLER: An Enhanced Plot-Planning Framework for Coherent and Cohesive Story Generation" [OPENED, abstract only]
  https://arxiv.org/abs/2506.02347
- Findings of EMNLP 2025, "A Survey on LLMs for Story Generation" [SNIPPET]
  https://aclanthology.org/2025.findings-emnlp.750.pdf
- AI Dungeon, "What is the Memory System?" [SNIPPET]
  https://help.aidungeon.com/faq/the-memory-system
- Friends & Fables, "Memories" (help center, not opened) [SNIPPET]
  https://help.fables.gg/articles/2838157-memories
- Arcanum RPGs, "Friends & Fables Guide (2026)" [SNIPPET]
  https://arcanumrpgs.com/blog/friends-and-fables-guide/
- Tavernbound, "Why AI Dungeon Keeps Forgetting Your Story" (competing source) [SNIPPET]
  https://tavernbound.com/blog/why-ai-dungeon-forgets-your-story
- DungeonsDeep AI, "Why AI Game Masters Forget Your Campaign" (competing source) [SNIPPET]
  https://dungeonsdeep.ai/blog/why-ai-game-masters-forget-your-campaign-and-how-dungeonsdeepai-doesnt

**Other unverified sources**
- NewbieDM, "Using the 3 Act Structure in your D&D game" (2010) [SNIPPET]
  https://newbiedm.com/2010/07/30/using-the-3-act-structure-in-your-dd-game/
- Legendary Pants, "GMW Academy: The 3-Act Structure" [SNIPPET]
  https://www.legendarypants.net/gmw-academy-the-3-act-structure/

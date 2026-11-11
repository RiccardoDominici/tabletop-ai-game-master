# Research: simultaneous actions by multiple players

Collected on 2 November 2026 by a research agent (read-only). [OPENED] = page read; [SNIPPET] = only the text of a search
result, or a failed read.

## 1. Simultaneous turn-based games
- WEGO: orders are given blind and apply to the whole turn; "nobody has the last word". [OPENED] https://linesofbattle.net/simultaneous-turns
- Frozen Synapse: free planning, then both sides' orders execute together, in 5 s steps. [OPENED] https://spacebiff.com/2020/04/13/frozen-synapse/
- Diplomacy: orders revealed together (rule 11); equal forces bounce and nobody advances (rule 15); attacking a supporter cuts its support (rule 19). [OPENED] https://www.playdiplomacy.com/help.php?sub_page=Game_Rules
- TidyMaze/ab-alone #13 (closed 23/10/2026): "conflicts cancel both moves" was discarded; a rotating order was adopted in which each move is revalidated on its turn and "switches off" if it is no longer legal. No submission = stalled. 15 s window. [OPENED] https://github.com/TidyMaze/ab-alone/issues/13

## 2. Play-by-post and virtual tables
- Dicehaven guidelines: write intentions as "if/then"s; after two working days the GM advances the character; retcons allowed. [OPENED] https://dicehaven.com/play-by-post/guidelines/
- Foundry SCS module: hides the turn buttons; the README does not explain how simultaneous actions are resolved. [OPENED] https://github.com/arcanistzed/scs
- GiantITP forum: players write intentions in any order, the GM summarises; interruptions force a stop or a retcon. [SNIPPET] https://forums.giantitp.com/showthread.php?721414-Play-by-Post-Best-Practices=&p=26462909
- Roll20 Turn Tracker: manual, no simultaneous mode. [SNIPPET] https://help.roll20.net/hc/en-us/articles/360039178634-Turn-Tracker

## 3. Multiplayer AI Game Master and LLM turns
- Friends & Fables: according to reviews, it responds to several players in narrative mode; no details on grouping and order. [SNIPPET] https://dreamgen.com/blog/articles/friends-and-fables-review
- AI Dungeon multiplayer: each action receives its own response; a community scenario imposes turns in rotation. [SNIPPET] https://play.aidungeon.com/scenario/79aqp-ustXhm/multiplayer-guidepublished
- MMAgents (Frontiers 2025): the agent with the highest importance score speaks; one agent monopolised turns 4–7; directing questions at someone and self-selection reduced blocking (p<0.001). [OPENED] https://www.frontiersin.org/journals/artificial-intelligence/articles/10.3389/frai.2025.1582287/full
- Time to Talk (EMNLP 2025 Findings): content generator separate from the decider of when to speak. [OPENED, abstract] https://arxiv.org/abs/2506.05309
- Concordia (arXiv 2507.08892): simultaneous engine, "every actor takes exactly one action per step". [OPENED] https://arxiv.org/html/2507.08892
- Vercel chat #414: a simple debounce sends only the last message; the `burst` mode waits for silence and treats the burst as one whole (~1 s extra). [OPENED] https://github.com/vercel/chat/issues/414

## 4. Stale input warnings
- HTTP 412 (optimistic locking): a rejected old write must warn the user to start over, or show the two versions. [OPENED] https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Conditional_requests
- Wagtail RFC 095: non-blocking notice «ha salvato una nuova versione» («has saved a new version»); confirmation before losing changes. [OPENED] https://github.com/wagtail/rfcs/blob/2d29384f4b8c3e8a6138764482c42cce2d15355e/text/095-concurrent-editing-notifications.md
- Texts for sync conflicts: «Entrambe le versioni sono salvate. Guardale e scegli cosa tenere» («Both versions are saved. Look at them and choose which to keep»); avoid «Conflitto rilevato» («Conflict detected»); keep «in attesa» («waiting») distinct from «serve una decisione» («a decision is needed»). [OPENED] https://vburojevic.dev/blog/sync-conflict-ui-user-trust/
- craig-stars #815: if the last two players submit together, the turn did not start; the fix is a single lock around submission and resolution. [SNIPPET] https://github.com/sirgwain/craig-stars/pull/815

## Agent recommendations (the choices made are in `docs/azioni-concorrenti.md`)
1. Each action carries the version of the scene it was written against; old ones must be confirmed («Confermo / Riscrivo / Ritiro» (Confirm / Rewrite / Withdraw)).
2. Hide the content until closing (WEGO). → **Not adopted**: at the live table people talk to each other, and «anch'io» («me too») requires seeing.
3. Dependency arc for «anch'io»; if the reference action changes, notify its author; no silent cascades.
4. Contested key: whoever writes first wins; the loser is notified at once with the name of the winner; ties rotate.
5. Revalidate every action at resolution time; those no longer possible «si spengono» («switch off»).
6. No submission = stalled: the master does not invent a player's action.
7. Atomic closing of the window.
8. Batch bursts before responding, with a cap on the wait.
9. One action per player per window; the master names who must respond.
10. Distinct states for «in attesa» and «da decidere»; never discard the text that was written.

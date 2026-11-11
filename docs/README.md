# Design documents (in Italian for now)

The files in this folder are the internal design documents: decisions, research, contracts between the parts,
and open items. They are written in Italian. Translating them into English is a planned phase, so they stay as they are for now.
The user guide, in English, is in [guide/](guide/) and the project overview is in the [README](../README.md).

| File | What it covers |
|---|---|
| [architettura.md](architettura.md) | Architecture v1: the server owns the game state, the two models, and the modules. |
| [audio.md](audio.md) | Audio framework: background music, character themes, ambient sounds, and their sources. |
| [azioni-concorrenti.md](azioni-concorrenti.md) | Simultaneous player actions: how they affect each other and the narration, and how they can be cancelled. |
| [combattimento.md](combattimento.md) | Combat driven by the campaign's rule set: initiative, phases, NPC turns, 0 HP, conditions, end of combat. |
| [da-fare.md](da-fare.md) | Live list of open items and who holds each one. |
| [e2e-finale.md](e2e-finale.md) | Final end-to-end test (11 November 2026, in English): Basic Fantasy RPG manual → rule set → campaign → games in the local and API profiles, measures, judge, bugs and verdict. |
| [f0-contratti.md](f0-contratti.md) | Phase 0 (one complete scene): contracts between the phone, server, projector and voice. |
| [manuale-master.md](manuale-master.md) | The narrator's craft rules for D&D played live, enforced by the code. |
| [prove.md](prove.md) | Checks and dice: which roll applies to which action, and the character sheet schema. |
| [regole.md](regole.md) | Rule sets for campaigns: how a user's rules manual becomes a set, and the SRD 5.2 default. |
| [repertorio.md](repertorio.md) | Pre-written lines chosen at runtime: the strong model writes them before play, the fast model picks them. |
| [richieste-2026-11-09.md](richieste-2026-11-09.md) | The owner's requests after the 9 November test, verbatim, with the decisions taken. |
| [strati.md](strati.md) | Campaign length decides how much is prepared: one session needs few layers, many sessions need phases. |
| [ricerca-audio.md](ricerca-audio.md) | Research: music, ambient sounds and effects sources for campaigns. |
| [ricerca-azioni.md](ricerca-azioni.md) | Research: how several players can act at the same time. |
| [ricerca-durata.md](ricerca-durata.md) | Research: how preparation scales with campaign length. |
| [ricerca-immagini.md](ricerca-immagini.md) | Research: generating images locally on a 16 GB Mac. |
| [ricerca-repertorio.md](ricerca-repertorio.md) | Research: pre-written lines with runtime selection. |
| [ricerca-tecnica.md](ricerca-tecnica.md) | Technical research summary (1 November 2026): the server owns the game state, and the model changes it only through validated tools. |
| [ricerca-voce-drama3.md](ricerca-voce-drama3.md) | Research: the game voice, fish-audio/drama-3 through OpenRouter. |

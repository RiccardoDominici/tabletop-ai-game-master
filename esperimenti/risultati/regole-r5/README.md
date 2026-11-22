# Live check of the rules-engine work R5: character creation at the table (22 November 2026)

Creation at the table (docs/creazione.md) on the real server and real pages, with **manual dice** (the players type each
die), the scripted narrator (`--finto`) and the rules arbiter, in Playwright (apps/web/e2e/creazione.spec.ts). Everything
is redone by `rifai.sh` (test ports 5021 and 5022, stopped at the end):

1. `campagna/fucina/`: a two-session copy of the invented fucina fixture (`apps/server/test/fixtures/campagne/fucina`:
   a small d20 set with races, two classes, a catalog, money, languages and the creation procedure), on port 5021, with
   the PCs built going to the copy's `pg-creati/` (`TAGM_PG_CREATI`), never into `campagne/`;
2. a copy of `campagne/torre-mozza` with `regole.creazione.modo: entrambi` (in the temporary folder: only its
   campagna.yaml changes), on port 5022: Basic Fantasy's own procedure.

Files: `playwright/*.png` (the phone's and the panel's screens, in order), `pg-creati/` (the three PCs as written by the
server: the sheet and every die entered), `pg_alla_fine-01.yaml` (the log's end of session 1), `pacchetto-02.txt` (what
`strumenti/tra_sessioni.py pacchetto` said between the sessions), `log-creazione.jsonl` (the servers' creation lines),
`tra-sessioni.sh` (the between-session step the spec runs).

| step | rule | seen |
|---|---|---|
| choice of PC | a campaign that allows it shows «Crea un personaggio» | `01-scelta-con-crea.png`: the pregenerated Brina and the card |
| scores | 3d6 in order, die by die | `02`: «Forza: Tira 3d6 e scrivi ogni dado», three boxes; `03`: Forza 16, Mente 10, Agilità 11, Tempra 13 with their bonuses |
| race | the illegal choice is refused by the server | `04`: «Piccolo» greyed with «Forza 16: serve ≤ 15»; tapped anyway, the server answers «Non puoi essere Piccolo: Forza 16, serve ≤ 15.» (the log's `action refused`) |
| hit points | the class die + Tempra | `05`: «Punti ferita del 1° livello: 1d8 (bonus +1)»; 7 + 1 = 8 |
| money, purchases | 3d6 × 10 gold; AC and load from the Engine's inventory | `06`: 150 mo, AC 10, light load; `07`: after a mail coat, a shield and a sword, 95 mo left, AC 15, 53.75 lb = heavy load (over Forza 16's 50), 3 m a round, «Spada 1d8+2» |
| the caster | the starting book: read runes and one more; today's spell from it | `09`: Selva's book (Scintilla) and the prepared spell; `10`: a mail coat shows «Arcano: niente incantesimi indossandola» |
| the panel | the drafts, the dice entered, a step approved, the PC approved | `11`: both drafts with every step, «Dadi scritti sul telefono: Forza 6+5+5 …», «Razza ✓» after «Approva» |
| joining | the server rebuilds on the same package, the phone takes its PC | `12`: Gaspare at the table; then Selva the same way (each rebuild under 0.2 s) |
| two sessions | the log carries the new PCs; the next package starts them | session 1 started and closed: `pg_alla_fine-01.yaml` has Brina, Gaspare (8 HP, 95 mo, mail and shield worn) and Selva (her slot and Scintilla); `tra_sessioni.py pacchetto` writes their `pg_all_inizio`; «Prossima sessione»: session 02 starts with all three, `13-sessione-2-selva.png` |
| Basic Fantasy | an elf magic-user by pp. 3–8 | `14`: the races (none closed by these scores); `15`: «Leggere il magico» fixed and Sonno chosen; 1d4 = 4 hit points; 3d6 × 10 = 150 gold, a dagger and a spellbook: 123 left, AC 12 (Destrezza 14); `16`: a two-handed sword shows «Mago: −5 a colpire»; Intelligenza 16 gives two languages more (Goblin, Orchesco); `18`: Ninfea at the table |

**Found and fixed in this check.**
- A rebuild of the server waited up to 40 s with the browsers open (the «Prossima sessione» after a session the
  projector had started): Socket.IO closes its engine and listener only after its adapters, and meanwhile the pages
  reconnected and long-polled on their keep-alive connections, which the close waited for. `chiudi()` (avvio.ts) now
  closes the open connections until the listener is gone: every rebuild of this check took under 0.2 s.
- After the Game Master approved one PC, the other phone, reconnected to the rebuilt server, was no longer in its draft's
  room, so it would have missed its own approval: the phone joins it again at reconnection, and the server binds the
  device of every approved draft to its PC at start (it takes it even if it missed the notice).
- Opening the creation screen again on an approved draft was refused; it now shows the draft.
- The panel's button of the second approval could be pressed on the stale view while the panel reconnected (the command
  was lost); the spec waits for the panel to show the rebuilt server's drafts, as a person would see the card change.

Not shown live (covered by unit tests: apps/server/test/creazione-bozza.test.ts, creazione-server.test.ts): the Game
Master's options (point and score swapping), the hopeless character's flip, automatic rolls with the draft's own dice,
the Game Master's undo of a step and its reroll, a player's refused redo after the hit points, a campaign `al_tavolo`
with no PC that does not start, `come: tiro` and `come: master` for the starting spells.

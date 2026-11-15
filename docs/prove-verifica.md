# Checks, rolls and turns: verification on a running server (15 November 2026)

Riccardo asked (15 November): «Testa e sistema … dei turni, delle regole, anche le prove caratteristica compaiono
correttamente quando un giocatore le richiede, quando il master le richiede, si può tirare, la classe difficoltà viene
scelta correttamente.» This page is the evidence table: each row is a scripted scenario run live on a test port
(4890–4899, logs in `logs/porta-<port>/`), what was expected, what the phones, the projector and the Game Master panel
received, the verdict and the commit that fixed it. The design is in docs/prove.md and docs/combattimento.md.

## 1. Harness

| Scenario | Expected | Seen | Verdict | Fix |
|---|---|---|---|---|
| C4: a script turn with three PCs during turn-based combat | the harness sends only the action of the PC on turn; the others go out on their own turn | before: all three were sent, two deferred by the Engine and re-judged stale (docs/e2e-finale.md C4) | fixed in the harness | `esperimenti/alimentatore.ts` + `test/alimentatore-copione.test.ts` |

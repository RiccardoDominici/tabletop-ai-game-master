# Live checks of 17 November 2026 (package 3: rules and dice)

Scripted narrator (`--finto`), mock voice, the rules arbiter, a fixed dice seed, on scratchpad copies of the campaigns
(never `campagne/`), through `TAGM_CARTELLA_CAMPAGNA`. The harness (`esegui.ts`) reads `campagne/<id>`, so these two
socket drivers played a projector, the phones and (for a scene change) the Game Master instead. Evidence in
docs/prove-verifica.md §6c (initiative by sides) and §6d (minions, a world question). The server logs stayed in
`logs/porta-4970` … `logs/porta-4972` (outside git).

```bash
# initiative by sides: a copy of apps/server/test/fixtures/campagne/bx
TAGM_PORTA=4970 TAGM_CARTELLA_CAMPAGNA=<copy of bx> TAGM_TIRI_GIOCATORI=automatico TAGM_ARBITRO=regole \
  TAGM_SEME_DADI=0123456789abcdef0123456789abcdef TAGM_FINESTRA_TUTTI=1 scripts/avvio.sh --finto --mock
npx tsx esperimenti/risultati/prove-verifica/dal-vivo-17nov/live-schieramento.ts http://127.0.0.1:4970 12

# a world question (torre-mozza) and minions (ponte-lanterne): a copy of the campaign, a test token of your choice
TAGM_PORTA=4971 TAGM_CARTELLA_CAMPAGNA=<copy of torre-mozza> TAGM_TIRI_GIOCATORI=automatico TAGM_ARBITRO=regole \
  TAGM_SEME_DADI=0123456789abcdef0123456789abcdef TAGM_MASTER_TOKEN=<test token> scripts/avvio.sh --finto --mock
TAGM_MASTER_TOKEN=<test token> npx tsx esperimenti/risultati/prove-verifica/dal-vivo-17nov/live-copione.ts \
  http://127.0.0.1:4971 esperimenti/risultati/prove-verifica/dal-vivo-17nov/copione-torre.json
# the same on port 4972 with a copy of ponte-lanterne and copione-sale.json (without TAGM_FINESTRA_TUTTI)
TAGM_PORTA=4970 scripts/arresto.sh   # and 4971, 4972
```

Outputs: `schieramento-bx-prima.out` (before the projector bar's fix), `schieramento-bx.out`, `domanda-torre.out`,
`gregari-ponte.out`.

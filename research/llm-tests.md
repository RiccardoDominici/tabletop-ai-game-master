# LFM 2.5 2.6B as live D&D narrator (Italian): benchmark results

**Status: PARTIAL, stopped by instruction.** All OpenRouter calls were stopped at 23:04:35 (last logged attempt). Dialogue segmentation, tool calling and the 24B comparison were **not measured**. Everything below is from saved data in this folder; no number here is estimated or rounded up.

## 1. Scope and what was actually run

- **Model under test (measured): `liquid/lfm-2.5-2.6b` on the paid endpoint.** The brief asked for the `:free` variant; the orchestrator redirected measurements to the paid endpoint because the free endpoint was rate-limited upstream. The free endpoint was used only for availability probes (section 3).
- **Reasoning cannot be disabled.** `reasoning: {enabled: false}` and `reasoning: {effort: "none"}` both returned HTTP 400 "Reasoning is mandatory for this endpoint and cannot be disabled." All measurements therefore use the default. Effort probes on one short prompt (single samples, raw files raw/probe2_*.json): default 124 completion tokens (80 reasoning); effort `low` 236 (176 reasoning); effort `minimal` 388 (320 reasoning). No setting produced a short reasoning phase.
- **Token budget:** latency and narration were run at 1200 and/or 4000 `max_tokens`; parsing at 1200 (complete) and 4000 (partial). Temperature 0.7 narration, 0 parsing.
- **Pacing:** minimum 3.6 s between requests; one free probe after every 10 paid calls.

## 2. Latency (paid endpoint, streaming, 10 runs, 1200-token budget)

| Metric | Result |
|---|---|
| HTTP status | 10/10 HTTP 200, 0 stream errors |
| TTFT, first token of any kind (reasoning or text), median / p90 | 0.312 s / 0.352 s |
| TTFT, first visible text, median / p90 | 4.792 s / 6.636 s (n = 6 runs that produced visible text) |
| Total response time, median / p90 | 6.197 s / 6.888 s |
| Throughput after first token (completion tokens incl. reasoning / s), median / p90 | 183.2 / 184.0 (p90 = nearest-rank on ascending values) |
| Completion tokens, median (reasoning median) | 1077.5 (936) |
| Runs ending at the 1200-token cap | 5/10: 4 with no visible text, 1 truncated after some text |
| Provider | Liquid (all runs) |

Visible text in runs 2, 4, 6, 7, 8, 9 only. Median visible-text TTFT is over those six runs.

## 3. Availability: free vs paid (kept separate)

**Free endpoint `liquid/lfm-2.5-2.6b:free`** (upstream provider Liquid; error code `model_rate_limit_exceeded`, limit source "upstream provider shared pool"):

| Time (local, 2026-11-01) | Result | Context |
|---|---|---|
| 22:50:48 | HTTP 429 | latency smoke test, attempt 1 (before per-attempt logging) |
| 22:51:53 | HTTP 429 | attempt 2 (65 s backoff) |
| 22:52:59 | HTTP 429 | attempt 3 (65 s backoff) |
| about 22:54 | HTTP 200, no visible text (400 tokens, all reasoning) | attempt 4; exact time not logged, raw file written 22:54:05 |
| 22:57:27 | HTTP 200 | sonda 1 |
| 22:59:34 | HTTP 200 | sonda 2 |
| 23:00:40 | HTTP 429 | sonda 3 |
| 23:01:35 | HTTP 200 | sonda 4 |
| 23:02:31 | HTTP 200 | sonda 5 |
| 23:03:26 | HTTP 429 | sonda 6 |
| 23:04:31 | HTTP 200 | sonda 7 |

Totals for the free endpoint: **11 attempts, 6 HTTP 200, 5 HTTP 429**. Since per-attempt logging (7 probes): 5 HTTP 200, 2 HTTP 429. No free-endpoint latency or quality measurement is valid for the live game: one successful call returned no visible text.

**Paid endpoint** (attempts.jsonl): 81 HTTP 200, 2 HTTP 400 (the reasoning-disable probes), 0 HTTP 429, 0 HTTP 402.

## 4. Money

- Tracked cost (spend.json, from `usage.cost` on each response): **$0.045397 over 80 completed paid responses**; free probes cost $0.
- One paid request (narration/parsing at 4000 budget, pass 3 item 1) received HTTP 200 headers when the process was killed before its body was read. Its cost is **not** in spend.json and may have been billed.
- The orchestrator reports the OpenRouter balance at about -$0.14. I could not verify this because I made no API calls after the stop. It is larger than the $0.045 tracked here, so the gap is unexplained by this log.

## 5. Narration (paid endpoint, 3 runs per budget)

| Budget | Runs | Runs with visible text | Sentences (limit 5) | Leak of PRIVATE action | Canon contradictions |
|---|---|---|---|---|---|
| 1200 | 3 | 1 (runs 1 and 2 empty: reasoning ran out) | 4 | 0/1 (auto and manual) | 1 (Ostilia described as hooded) |
| 4000 | 3 | 3 | 5, 4, 3 | 0/3 (auto and manual) | 1 (bar placed outside the door) |

Leak check: automatic term search (borsa, sfil, Mirto, ladr, furt, rubar, ruba, tasca, portafogli) found 0 in all 4 texts; a manual read also found no allusion to the purse or the thief. Sample size is 4 texts, so this is weak evidence. Grammar and style judgements below are my reading of the texts, not a measured score.

**Best sample (4000, run 2):**
> Voi sentite Benolfo che suona la lira e cerca di scoprire chi è lo straniero incappucciato. Kara si sposta verso il bancone, curiosa sulle risposte che emergeranno. Fuori piove a dirotto, una carezza d'acqua grise che non disturbi la vigilia. La porta posteriore rimane blindata da una trave di quercia, sigillando il mistero dell'invito.

Correct second person plural, present tense, canon facts kept (back door barred). Errors: "grise" (should be "grigia"), "una carezza d'acqua ... che non disturbi la vigilia" is nonsense.

**Second sample (4000, run 1):**
> Voi sente la pioggia torrenziale che rimbomba fuori dal taverna mentre il bardo Benolfo suona una lira e chiede ad Ostilia chi sia lo straniero incappucciato nell'angolo in fondo. Il vostro sguardo segue il visitatore che non rivela nulla oltre il suo cappello nero. Kara avvicina il bancone con determinazione mentre i volti dei presenti restano indifferenti alla sua presenza. La trave di quercia sulla porta posteriore sembra custodire l'aria calda come un ultimo timone morente. L'attesa si stringe ancora più stretta tra i confini del gioco.

Vivid and keeps the facts, but has several grammar errors ("Voi sente", "dal taverna", "Kara avvicina il bancone") and the last two sentences are incoherent.

**Worst sample (1200, run 3, the only text among 1200 runs):**
> Vedi Benolfo che suona la lira e intona domande all'Ostilia incappucciata. La taverna del Corvo Zoppo rimbomba di pioggia fuori dalle tende. Lo straniero con il cappuccio siede nell'angolo in fondo, ignoto a tutti. La porta sul retro è sbarrata da una trave di quercia.

Contradicts the canon (Ostilia is not the hooded stranger), uses singular "Vedi" instead of "voi", invents "tende", and "intona domande" is not Italian usage.

Style judgement: "voi" used in 2 of 4 texts; the 4000 run 3 text uses no second person at all.

## 6. Structured parsing (paid endpoint, json_schema strict, 10 items)

Gold labels are in prompts.py (PARSE_ITEMS). Where the reading is ambiguous, the gold sets accept several values, so scores are not inflated by my own choice.

**Budget 1200, complete: 3 passes x 10 items = 30 calls, all HTTP 200.**

| Metric | Result |
|---|---|
| JSON valid / schema valid | 27/30 (90.0%) |
| Item fully correct | 19/30 (63.3%) |
| Field accuracy: intent / target / needs_roll / skill / cancels_previous | 0.867 / 0.800 / 0.767 / 0.800 / 0.900 |
| Invalid outputs | 3, all finish=length: 2 empty, 1 non-parseable |

**Budget 4000, partial: passes 1 and 2 complete (20 calls); pass 3 item 1 was in flight when stopped.**

| Metric | Result |
|---|---|
| JSON valid / schema valid | 20/20 (100%) |
| Item fully correct | 14/20 (70.0%) |

Recurring errors (same at both budgets):
- Item 10 ("ostilia ci sei? ah sì le chiedo un boccale di birra tipo"): target "NPC" instead of Ostilia, in every pass.
- Item 7 ("mi arrampico sulla trave del soffitto"): needs_roll false and skill null in every pass; my gold expects a roll.
- Item 5 ("lancio palla di fuoco..."): needs_roll true in some passes; gold expects false.
- Item 6 (Mirto pickpocket), pass 2 at 1200 budget: intent "move" instead of "other".

At 1200 tokens reasoning consumed the whole budget on item 5 (empty output in passes 1 and 3) and truncated item 1 (pass 2, non-parseable output). The 4000 budget removed these failures without fixing the semantic errors.

## 7. Dialogue segmentation (paid endpoint)

**Not measured.** The suite was stopped before its first call; there are no dialogue JSON outputs and therefore no validity rate or speaker-attribution result.

## 8. Tool calling (roll_dice)

**Not measured.** Stopped before any call.

## 9. Comparison model liquid/lfm-2.5-24b-a2b

**Not measured.** Stopped before any call.

## 10. Verdict

- **Narration (live, Italian): not usable as is.** Reasoning consumes roughly 900 tokens by median before any text. At 1200 tokens 2 of 3 runs returned nothing. Text quality is uneven, with frequent grammar errors and incoherent sentences. Leak control looked clean in 4 texts, too few to rely on.
- **Latency: poor for live use.** Median 6.2 s total and 4.8 s to first visible text for about 1000 output tokens. The reasoning-first behaviour cannot be turned off on this endpoint.
- **Structured parsing: not reliable enough unsupervised.** Schema validity is good at the 4000 budget, but target extraction and roll decisions fail on about 30% of items. It could be a candidate for coarse intent labels with validation, not for needs_roll or skill.
- **Free tier: not usable for a live game.** 5 of 11 attempts were HTTP 429 from the upstream shared pool.
- **Dialogue and tool calling: no evidence either way.**

## Files

- Results per suite: `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/llm-tests/results/`
- Attempt log (every HTTP attempt, free and paid): `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/llm-tests/attempts.jsonl`
- Spend log: `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/llm-tests/spend.json`
- Raw responses: `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/llm-tests/raw/`
- Summary script (no API calls): `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/llm-tests/summarize.py`
- Reusable client and config: `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/llm-tests/common.py` (env overrides for URL, key variable, models, pricing, spend cap)
- Reusable dataset: `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/llm-tests/prompts.py` (export: `python3 -I prompts.py --export file.json`; an export is at `.../llm-tests/dataset_export.json`)
- Suite runner: `/private/tmp/claude-501/-Users-riccardo-Developer/161e877b-0d39-415a-be00-32dd6f15c6cf/scratchpad/llm-tests/bench_suites.py`

# Research: pre-written repertoire with runtime selection

Collected on 2 November 2026 by a research agent (read-only). Key: [OPENED] = page read;
[SNIPPET] = only from a search result or a third-party summary.

## 1. Classic precedents

- **Façade (Mateas & Stern).** The drama manager chooses the next beat among those not yet used, to follow a tension arc. A beat contains 10–100 JDB; there are 27 beats, about 15 per playthrough. The authors delivered about 30% of the initial vision. https://www.gamedeveloper.com/design/the-story-of-facade-the-ai-powered-interactive-drama [OPENED, secondary source]. The primary papers (https://sites.cc.gatech.edu/fac/Charles.Isbell/classes/reading/papers/MateasSternGDC03.pdf) were not readable [SNIPPET].
- **Quality vs salience (Emily Short).** In QBN (Failbetter) storylets unlock with numeric qualities and no manager chooses: the player decides. The cost is high, because every beat requires "available" and "completed" qualities. In SBN the system chooses the most specific applicable rule, with random ties. Risk: arbitrary plot outcomes, mitigable with dramatic-arc variables. Weights are tuned by trial and error, with thousands of simulated playthroughs. https://emshort.blog/2016/04/12/beyond-branching-quality-based-and-salience-based-narrative-structures/ [OPENED]
- **Valve / Ruskin, GDC 2012.** Rules with decreasing specificity and generic fallbacks. Requirement: writers must be able to produce a lot of content with simple tools. Lines must break off naturally. https://emshort.blog/2012/03/16/gdc-2012-talk-on-dynamic-dialogue/ [OPENED]; talk: https://www.gdcvault.com/play/1015528 [SNIPPET]
- **Kreminski & Wardrip-Fruin (ICIDS 2018).** Four dimensions of the design space: preconditions, repeatability, content type, selection architecture. https://emshort.blog/2019/01/06/kreminski-on-storylets/ [OPENED, summary]; paper: https://link.springer.com/chapter/10.1007/978-3-030-04028-4_14 [SNIPPET]
- **Ink (inkle).** Single-use choices by default, `+` for repeatable ones. The `once`, `shuffle`, `stopping` variants guard against repetition. Conditions do not override the once-only behaviour. https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md [OPENED]

## 2. LLMs and pre-written content (2023–2026)

- **Drama Llama (arXiv 2501.09099).** Triggers defined in natural language; preliminary study with six authors. The mechanism (an LLM judges the condition, the first satisfied trigger fires) and the limitation of "clichés" come from snippets, not from the text. https://arxiv.org/abs/2501.09099 [OPENED, abstract only]
- **Dramamancer (arXiv 2601.18785).** Storylet = boolean condition on the state + outcome. At runtime, two LLM calls: one returns the conditions satisfied after each input, the other writes the next line. No numbers on latency or consistency, no failure modes reported. https://arxiv.org/html/2601.18785 [OPENED]
- **Ploug et al., IEEE CoG 2025 (pilot, 64 participants).** Four conditions: static control, rewording of pre-written lines, hybrid, open-ended. The open-ended condition produced longer conversations and more engagement, especially among casual players. The hybrid showed "technical inconsistencies" [SNIPPET]. https://portal.findresearcher.sdu.dk/en/publications/open-ended-npc-dialogue-favors-casual-players-a-pilot-comparison-/ [OPENED]; https://doi.org/10.1145/3815598.3815622 [SNIPPET]
- **arXiv 2604.10107 (N=130, under review).** LLM NPC with free input vs predefined options: higher cognitive load (p<.001), no significant improvement in experience (p=.195), usability and trust declining. The comparison changes input and response together, so it does not separate the effects. https://arxiv.org/abs/2604.10107 [OPENED]
- **Long-term consistency.** NCP-Bench: the best model (GPT-5.2) keeps 42% of the constraints after 20 turns. https://arxiv.org/html/2608.08160 [SNIPPET]
- **Small models (Munk et al., FDG '26, arXiv 2601.23206).** Llama 3.2 1B with LoRA: 78% of outputs passed in 4-bit, versus 98% for GPT-4o. Median latency 2.1–4.8 s with retries on an RTX 3070. As judges, GPT-4o is "systematically lenient" and Claude Haiku 4.5 passes only 22% on alignment, versus 95% for human raters. This is generation, not selection. https://arxiv.org/html/2601.23206 [OPENED]
- **Gap.** I found no measured comparison between selecting pre-written lines with a small LLM and free generation, with latency. Wevelsiep et al. (IWSDS 2025, an LLM mapping input to predefined options, 14 participants) is relevant, but the PDF was not readable: https://aclanthology.org/2025.iwsds-1.4.pdf [SNIPPET]

## 3. Practical lessons

- **Beat description.** Dramamancer and Drama Llama use short, verifiable conditions, not full text. I found no measured comparison between the two forms.
- **Preconditions.** Numeric qualities (Short), rules with specificity and fallback (Ruskin), variables and visit counters (Ink).
- **Repetition.** Once-only by default, with shuffle/stopping variants (Ink). Repeatability is an explicit dimension (Kreminski).
- **Coverage.** Start from generic defaults and add specific rules. Uniform coverage is not needed (Short, 2016).
- **Beats per character.** No per-character number found. Façade: 27 beats for the whole system.
- **Testing.** Simulate thousands of games to find content that never fires, or fires too often (Short, 2016).
- **Reported failure modes.** Arbitrary plots (SBN). Accepted false positives and a fragile parser (Façade). Failures on rare names and repetitive output (Munk et al.). Lenient LLM judges. Cognitive load with free input (2604.10107).

Sources not reached: Ruskin's write-up (assemblyrequired.crashworks.org, DNS error) and the Radiator blog (connection refused).

## What we take from it (orchestrator's note)

- The measured comparison missing from the literature is exactly our A/B experiment: worth doing well.
- The risk of the hybrid is the **seams** between written and improvised lines: the judge must look at them specifically.
- **Lenient LLM judges**: the blind judge uses Opus, must cite the transcript line for every score, and the mechanical measures (sentence length, knowledge leaks, PCs in third person) are counted by a script, not by the judge.
- Log how many times each line comes out: lines never used, or used too often, show where the repertoire is lacking or excessive.
- Single-use lines by default, with variants for those that come back (as in Ink).

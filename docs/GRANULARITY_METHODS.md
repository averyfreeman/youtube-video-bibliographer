# One-notch granularity options

The current thorough-but-bounded run aims for the older chatbot’s coverage while preserving relevance and acceptable latency. These three methods increase coverage without returning to exhaustive extraction. Ratings use 1–5, where higher is better.

| Method                      | Description                                                                                                                                                                                                 | Ease | Effectiveness | Granularity control | Runtime predictability |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | ------------: | ------------------: | ---------------------: |
| Stage-specific reasoning    | Use a higher reasoning effort for candidate extraction, then medium effort for synthesis and verification.                                                                                                  |    4 |             4 |                   4 |                      3 |
| Controlled candidate budget | Use 12,000-character windows, allow up to 16 candidates per window, and keep a usual 40-reference limit with a final-five-minute hard ceiling of 52, with deterministic phrase filtering and deduplication. |    5 |             4 |                   5 |                      4 |
| Diversity-aware reranking   | Generate a wider candidate pool, then select a diverse shortlist using a maximal-marginal-relevance-style reranker before verification.                                                                     |    2 |             4 |                   4 |                      3 |

## Recommendation

Use stage-specific reasoning as the default. It improves recall where candidates originate while preserving the existing medium-cost synthesis and verification passes. It is easy to benchmark, keeps the global cap authoritative, and avoids introducing a second semantic-similarity system before the application has a labeled quality set.

The implementation therefore uses high-recall candidate extraction, medium synthesis/verification, current and recent reference coverage, global phrase deduplication, and a persisted 40/52 soft/hard hit policy with a five-minute tail allowance. `scripts/benchmark.ts` compares the same transcript at `medium`, `high`, and `max` and records elapsed time, calls, candidates, final hits, cap state, warnings, and manual quality notes.

## Research basis

- Reasoning effort can be varied by stage when a task benefits from deeper deliberation: [OpenAI reasoning guide](https://developers.openai.com/api/docs/guides/reasoning).
- Larger or overlapping transcript windows improve local continuity but do not by themselves guarantee selection quality; the original segmentation work is a useful reference: [TextTiling](https://aclanthology.org/J97-1003/).
- Diversity-aware selection is a recognized information-retrieval tradeoff between relevance and redundancy: [Maximal Marginal Relevance](https://www.cs.cmu.edu/afs/cs/Web/People/jgc/publication/MMR_DiversityBased_Reranking_SIGIR_1998.pdf).

These sources inform the design rather than serving as runtime dependencies. The benchmark and manual review remain the acceptance mechanism for this project’s actual transcript quality.

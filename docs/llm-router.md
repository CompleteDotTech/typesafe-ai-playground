# Benchmark-aware LLM router

The current workspace has expanded beyond the original frontier-model example.

**Read [LLM router: all tiers, demo and prompt library](router-all-tiers.md)** for setup, tier definitions, benchmark limitations, all scenario groups, instructions and data-refresh commands.

- `/router` is the expanded workspace with optional Jev task classification.
- `/router/demo` is the guided no-key routing demonstration.
- `npm run build:router-demo` generates a standalone offline HTML page and a Markdown reference containing all 116 prompts.
- **Export all prompts** imports into the existing Examples workspace without changing its catalog IDs.

The original 12-configuration evidence snapshot and original threshold example remain in `web/llm-router.js`; the new policy extends them through `web/router-models.js` and `web/router-tiers.js`. The earlier `tests/test_llm_router.js` tests remain in the default test command, alongside the expanded suite.

All versions are educational dry runs, not downstream-model execution gateways. The [RouteLLM paper](https://arxiv.org/html/2406.18665v4) informs the preference-threshold exercise, while [Artificial Analysis](https://artificialanalysis.ai/) supplies the dated benchmark evidence. Synthetic preference values are not trained routing predictions, and missing benchmark scores are not zero.

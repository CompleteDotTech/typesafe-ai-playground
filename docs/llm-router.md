# Benchmark-aware LLM router

Open **LLM router** in workspace navigation, or visit `/router`.

This example demonstrates a small classifier coordinating a transparent routing policy. It does **not** call the selected frontier model, deploy model endpoints, or reproduce a trained RouteLLM router.

## Try the example

1. Choose a synthetic scenario and review its task specialty. **Plan route offline** uses the selected specialty and does not analyze the description or make an inference request.
2. Optionally click **Classify with Jev**. This sends the description to the existing server-side TypeSafe integration, consumes TypeSafe API credits, and accepts only a known task category. It does not allow the classifier to change operator budgets or provider exclusions. The classification can still be wrong.
3. Set the routing objective, estimated billable input/output tokens, conditional token budget, benchmark score floor, image requirement, and candidate exclusions.
4. Inspect the selected evaluated configuration, benchmark evidence, conditional token cost, next eligible candidate, and reasons other candidates were excluded.
5. Use **Compare A/B** to change one field: the budget becomes $0.01, or the synthetic preference threshold becomes 0.8. Other controls remain unchanged.

**Export starter for Examples → Import** produces a portable `schemaVersion: 1` example. Import it through the existing Examples workspace to edit its state/questions and run a Jev A/B exercise. It is not automatically appended to `web/catalog.json`; the existing catalog and its stable IDs are unchanged. Import collisions use the existing copy-ID behavior.

The router's own session is not persisted. Export a plan to retain the input and audit results. The export contains the entered description; review it before sharing.

## Three routing modes

- **Highest measured score:** apply every eligibility constraint, then rank within the selected benchmark by score. Ties use conditional token cost, then an internal stable ID. Rounded ties do not establish equal capability.
- **Lowest cost above score floor:** apply the same constraints, then select the cheapest conditional token estimate among measured candidates meeting the floor. This is not a prediction of task success or actual end-to-end agent cost.
- **Synthetic preference threshold:** use the explicitly supplied demonstration value `p(strong wins)`. Choose Claude Fable 5.1 when `p >= threshold`, otherwise GLM-5.3 Flash. An ineligible chosen member causes abstention, not a silent budget override or downgrade. This mode is defined only for the general task category.

The [RouteLLM paper](https://arxiv.org/html/2406.18665v4) learns strong/weak routing from preference data. Its threshold trades strong-model call frequency against quality. Here the threshold exercise uses a synthetic fixture, not a trained predictor, and Jev confidence is never substituted for a calibrated preference probability. Increasing the threshold reduces strong-model selections for the same supplied probabilities.

## Evidence snapshot: September 16, 2026

`web/llm-router.js` contains a manually curated snapshot of 12 evaluated configurations, their captured benchmark results, source links, and uncached token prices. Model names are display configurations; internal IDs are **not provider API model IDs**. Benchmark pages can change after the snapshot date.

| Specialty | Captured evidence | Configuration highlighted by the default policy |
| --- | --- | --- |
| Scientific coding | [SciCode subproblems](https://artificialanalysis.ai/evaluations/scicode): 63.1% | Claude Fable 5.1, adaptive max with default fallback |
| Expert text reasoning | [Humanity's Last Exam](https://artificialanalysis.ai/evaluations/humanitys-last-exam): 59.1% | Claude Fable 5.1, adaptive max with default fallback |
| Long-document reasoning | [AA-LCR v1.1](https://artificialanalysis.ai/evaluations/artificial-analysis-long-context-reasoning): Kimi 88.7%, Fable 85.3% | Kimi K3, max |
| Terminal operations | [Terminal-Bench 4.0, AA evaluation](https://artificialanalysis.ai/articles/benchmarking-gpt-6-astra): Astra 59%, Fable 52%, Sol 40% | GPT-6 Astra, max |
| Software automation | [AutomationBench-AA](https://artificialanalysis.ai/articles/benchmarking-gpt-6-astra): captured Astra 69%, Sol 60% | GPT-6 Astra, max |
| Image reasoning | [MMMU-Pro](https://artificialanalysis.ai/evaluations/mmmu-pro): 87% | GPT-6 Astra, max |
| Agentic coding | [Coding Agent Index v1.5](https://artificialanalysis.ai/articles/benchmarking-gpt-6-astra): Astra + Codex 62; Fable + Claude Code 62 | Tied measured index; deterministic tie-breaking is not a quality claim |
| Repository patching | [DeepSWE v1.1](https://artificialanalysis.ai/articles/benchmarking-gpt-6-astra): Sol + Codex 72%, Astra + Codex 68% | GPT-5.6 Sol + Codex, within this two-entry comparison |
| General tasks | [Intelligence Index v4.3](https://artificialanalysis.ai/leaderboards/models), plus model-page token prices | Depends on score floor and cost objective |
| Creative writing and taste | No task-specific evidence supplied | Abstain and request a suitable evaluation |

This is a **partial curated matrix**, not a full mirror of every leaderboard. A blank means the result was not captured, not that the model failed or scored zero. Some specialties have only one captured model. “Best” always means best among the measured, eligible candidates in this snapshot, not universally best for the user's request.

Do not average unrelated benchmark scales. Keep model-only and model-plus-agent evaluations distinct: the terminal results in this snapshot are not the separate Codex-agent terminal scores. DeepSWE entries compare two configurations under Codex and do not establish a global winner. AA-LCR evaluates documents around 10k–100k tokens; it does not verify the full advertised context window. SciCode subproblem accuracy is not full-problem success.

## Constraints and cost assumptions

Conditional token cost is:

```text
(input_tokens * input_price_per_million
 + billable_output_tokens * output_price_per_million) / 1_000_000
```

Include reasoning tokens in the entered billable output estimate. With 8,000 input and 4,000 output tokens, the current strong/weak teaching pair costs $0.28 and $0.0032 respectively under these assumptions. The models can use different numbers of tokens on real tasks, so equal token estimates are not measured per-task costs.

Estimates exclude Jev classification, tools, retries, additional fallback calls, image billing, cache discounts, and long-context pricing tiers. They are **not billing caps**. In particular, the Fable benchmark configuration includes default fallback behavior whose extra calls are not priced by this simple calculation. The next ranked candidate is an alternative, not an automatic execution fallback.

`demoContextLimit` is a conservative demonstration limit based on rounded Artificial Analysis specifications, not an exact provider endpoint contract. Input plus reserved output must fit it. Models with absent or unknown image support are excluded when image input is required. The Jev step sees only a textual task description, not image pixels.

Local-only policy blocks both the cloud-classification step and routing because no local inference endpoint is configured. Open weights alone do not imply that a local endpoint exists. Invalid data, missing benchmark evidence, exhausted candidates, and insufficient budgets produce explicit errors or abstention.

After seven days, the default policy requests an evidence refresh. **Archived teaching mode** permits historical demonstrations with a warning, but never turns an outdated snapshot into a current recommendation. Future-dated evidence is rejected. Refresh the source measurements and prices deliberately; no background scraping or automatic updates are implemented.

## Code and checks

| Path | Responsibility |
| --- | --- |
| `web/llm-router.js` | Immutable evidence cards, validation, deterministic eligibility/ranking, typed Jev payload, portable example |
| `web/llm-router.d.ts` | TypeScript consumer contracts |
| `components/llm-router.tsx` | Interactive controls, optional Jev classification, A/B plans, explanations, exports |
| `app/router/page.tsx` | Next.js route |
| `tests/test_llm_router.js` | Offline policy and real example-import contract tests |

```sh
node --test tests/test_llm_router.js
npm test
npm run typecheck
npm run build
npm run test:e2e
```

Tests use an injected clock and synthetic inputs. They do not use live provider keys or spend API credits. The tests establish policy arithmetic and contract behavior, not Jev classification accuracy, routing quality, or replication of published benchmarks.

A production extension would need verified provider API identities and capabilities, server-side credentials, held-out task/preference data, learned and calibrated routing, measured end-to-end cost/latency/quality, enforced execution budgets, endpoint health checks, and controlled retry/fallback behavior. Those are outside this example's dry-run scope.

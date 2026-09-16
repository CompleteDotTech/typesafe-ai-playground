# LLM router: all tiers, demo and prompt library

## Included

The expanded router contains **62 configurations**, **29 scenarios** and **116 original prompts**: four per scenario. It retains the original frontier evidence and adds lower-cost hosted models, open-weight micro/small/compact/medium/large models, MoE configurations, embedding models, rerankers and guardrail classifiers.

The tier taxonomy covers every defined size and price range, including unknown values. **The 62-model snapshot is curated, not every model ever published.** A model-card entry without comparable measurements is visible for discovery but is not given imaginary scores, a zero price or a configured endpoint. The AA importer can stage every record returned by its model API for a broader reviewed refresh.

## Open the demo

Use Node 22 or newer. In a checkout of `feat/benchmark-aware-llm-router`:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/router/demo` for the guided **no-key demo**. Open `/router` for the expanded workspace with optional Jev classification. Both pages contain instructions, all scenario prompts, tier filters, evidence, explanations and exports. The existing LLM router navigation entry opens `/router`; the workspace links directly to the demo.

**This feature plans routes; it does not generate answers or invoke selected models.** Offline mode uses the selected task and trusted controls, not an implicit classification of edited prompt text. The tier-zero scenario instead runs an exact local text parser. The optional **Classify with Jev** button in `/router` sends entered text through the existing server-side TypeSafe integration and consumes credits. It is absent from `/router/demo`. No downstream LLM-provider credentials are required.

### Standalone offline page and complete prompt reference

Generate both artifacts from the source-controlled policy and prompts:

```sh
npm run build:router-demo
# Equivalent, without installing npm dependencies:
node scripts/build-router-demo.js

# Open public/router-demo.html directly, or serve it locally:
python3 -m http.server 8080 --directory public
# Open http://localhost:8080/router-demo.html
```

The generator writes `public/router-demo.html` and `docs/router-prompts.md`. The HTML includes every scenario and a Run all scenario plans action. The Markdown contains every prompt in readable, copyable form. These are derived artifacts, not independently maintained model-data copies. Regenerate them after changing the source modules. `node scripts/build-router-demo.js --check` checks existing generated artifacts for drift.

The standalone page requires no TypeSafe key, AA key, Next.js runtime or downstream-model credentials. It loads no remote scripts, fonts or automatic API calls; its content security policy blocks network connections. Following a source link is an explicit navigation. A browser administration policy may disallow local HTML files; use the local HTTP server in that case.

## Walkthrough

1. Choose **Low-cost field extraction → Starter**. Keep the default 1,000 input / 250 output token envelope, score floor 8, economy mode and $0.01 total budget. Plan offline and inspect the benchmark and excluded models. The snapshot selects Granite 4.2 3B with a conditional token estimate of $0.000060. The token controls are illustrative workload values, not a tokenizer measurement of the displayed short prompt.
2. Choose **Small-model classification**. The parameter filter narrows candidates to more than 1B through 4B total parameters. A small hosted model is not automatically a local deployment.
3. Choose **Bulk processing**. Its preset represents 10,000 requests. The budget applies to their combined token estimate; no provider batch discount is assumed. A budget below the cheapest complete eligible batch yields abstention rather than silently skipping records.
4. Choose **Cross-tier preference thresholds**, then Compare A/B. At synthetic p=0.7, threshold 0.7 selects the configured strong member, whereas threshold 0.8 selects the weak member if eligible. Change the two pair members to compare other tiers. These are synthetic fixtures, not learned predictions.
5. Choose **Micro models and local privacy**. The expected result is blocked because no local inference endpoint is configured. The weights shortlist remains browsable. Private text must not be sent to Jev or a cloud fallback.
6. Try embedding, reranking, guardrail and creative scenarios. Missing operation-specific evidence yields `needs_evaluation`. The oversized context scenario yields `abstain`. The exact-parser boundary prompt yields a zero-model-call rejection.

Snapshot date: **2026-09-16**. After seven days, normal planning requires refreshed evidence. Explicit archived teaching mode permits historical exercises with a warning; it does not describe historical prices as current. Future-dated evidence remains blocked.

## Independent size and price axes

These names are application-defined categories, not industry standards or quality rankings.

| Size tier | Nominal total parameters |
| --- | --- |
| Micro | Up to 1B |
| Small | More than 1B through 4B |
| Compact | More than 4B through 15B |
| Medium | More than 15B through 40B |
| Large | More than 40B through 100B |
| Very large | More than 100B |
| Undisclosed | No verified size captured |

Active MoE parameters are shown separately. They do not establish total weight storage, VRAM requirements, KV-cache size, runtime overhead, quantized quality or measured hardware fit.

| Price tier | USD per 1M tokens, fixed 3:1 input/output blend |
| --- | --- |
| Ultra-budget | Less than $0.15 |
| Budget | $0.15 to less than $0.50 |
| Economy | $0.50 to less than $1 |
| Standard | $1 to less than $4 |
| Premium | $4 to less than $10 |
| Flagship-priced | $10 or more |
| Unpriced | Input or output price is missing |

Price grouping uses `(3 * input_price + output_price) / 4`. The actual conditional estimate instead uses the entered token envelope:

```text
batch_size * (input_tokens * input_price
              + billable_output_tokens * output_price) / 1,000,000
```

Include billable reasoning in output tokens to represent it. Estimates exclude Jev, tools, retries, additional fallback calls, image billing, caches and long-context pricing tiers. They are **not enforced billing caps**. Flagship-priced describes price, not whether a model is frontier-quality. Unknown prices are never treated as free inference.

## Scenario coverage and prompt examples

Every scenario includes **Starter**, **More demanding**, **Noisy input**, and **Boundary case** prompts. These are original teaching examples, not copied benchmark questions or measurements of model performance.

| Group | Scenarios |
| --- | --- |
| Routine and lower-cost work | Exact parser; extraction; small-model classification; support triage; summaries; JSON; grounded retrieval answering; translation; SQL; routine coding |
| Specialist reasoning and work | Scientific programming; expert reasoning; long documents; terminal work; workflow automation; image reasoning; coding agents; repository patches; creative writing |
| Cost, speed and deployment | Bulk processing; throughput; micro/local privacy; compact/medium local planning; large/MoE planning |
| Other operations and policy | Embeddings; rerankers; guardrails/moderation; preference thresholds; context/evidence boundaries |

For example, the extraction scenario progresses from copying an order ID, through multiple quantities and currencies, to distinguishing a customer's ID from a footer example, and finally returning null when the ID is absent. The scientific-coding scenario progresses from log-sum-exp tests through numerical convergence, misleading simulation logs and missing initial conditions. Local-privacy examples include an embedded instruction to use the cloud; that instruction cannot change the trusted local-only policy.

**Export all prompts** produces a `schemaVersion: 1` library for **Examples → Import**. Those imported exercises classify the next preparation step; they do not execute the deterministic router or external actions. Use the router demo for policy simulation. Exported decisions contain entered text; review them before sharing.

## Benchmark and implementation boundaries

[RouteLLM](https://arxiv.org/html/2406.18665v4) learns routing from preference data. This implementation uses deterministic benchmark-aware policy plus an explicitly synthetic preference exercise. It is not a trained RouteLLM reproduction. Jev classifies tasks only; its confidence is not a calibrated win probability.

General scores use the captured [Artificial Analysis](https://artificialanalysis.ai/leaderboards/models) Intelligence Index v4.3. Specialty results retain their metric and evaluation harness. Agent-plus-model results are not silently converted into bare-model claims. AA entries marked estimated, including the captured Nova Micro index, are not promoted into measured ranking. Missing evidence remains missing rather than becoming zero.

The general index is a broad proxy, not a task-specific benchmark for extraction, translation, JSON, RAG or each displayed prompt. Validate those workloads using representative held-out outcomes. Missing specialty scores do not prove a model is incapable. Hosted output throughput is not time to first token, end-to-end latency, local throughput or an SLA. Context limits are conservative demonstration limits, not complete verified provider endpoint contracts.

Model-card identities and nominal sizes link to primary sources in `web/router-models.js`, including [Qwen3](https://qwenlm.github.io/blog/qwen3/), [Qwen embedding/reranker models](https://qwenlm.github.io/blog/qwen3-embedding/), SmolLM, Gemma, Llama, Phi and gpt-oss. Downloadable weights do not necessarily imply unrestricted open-source licensing. Review the exact model's license and usage terms separately.

## Refresh beyond the seed registry

The [AA API reference](https://artificialanalysis.ai/api-reference) documents the model-list endpoint and `x-api-key` authentication. Keep the key in a shell/server environment, not a browser variable, committed file or prompt.

```sh
# Set ARTIFICIAL_ANALYSIS_API_KEY securely in your shell first.
node scripts/import-aa-models.js --output data/aa-staging.json

# Offline validation with an API-format fixture:
node scripts/import-aa-models.js --input fixture.json --output data/aa-fixture-staging.json
```

The script stages every record in one response, preserving stable AA IDs, raw numeric units and signs, attribution and capture time. It bounds response size, rejects duplicate or unsafe identities, and refuses overwrite unless `--force` is provided. It does not change the trusted routing registry. No authenticated live AA import was required to build the curated seed.

Before promoting staged data, verify benchmark version and measured/estimated status; reasoning effort and fallback configuration; harness; real provider endpoint and model ID; context and output limits; modalities; pricing behavior; and performance measurements. Fields absent from the documented response remain null. Only compare equivalent benchmark cohorts. Re-run policy and browser checks after review.

## Development and checks

```sh
npm run test:router
npm test
npm run typecheck
npm run build
npm run test:e2e
npm run build:router-demo

# Independent standalone-browser checks:
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/smoke_router_demo.py
```

Set `CHROMIUM_EXECUTABLE` to select an installed Chromium binary. The standalone test loads HTML into Chromium in memory, injects a fixed date, checks desktop/390px/320px layouts, exercises policy boundaries and exports, and asserts no automatic network calls. This is not the full Next.js browser suite.

The 154-test extension checks tier boundaries, batch-cost arithmetic, parser boundaries, score/size/weights filters, nullable evidence, privacy, harness preservation, configurable preference pairs, every prompt fixture and the importer. Scenario-fixture checks establish valid policy inputs, not model-answer accuracy. The original router remains unchanged and retains its earlier tests and IDs.

| File | Responsibility |
| --- | --- |
| `web/llm-router.js` | Original benchmark evidence and original example implementation |
| `web/router-models.js` | Additional configurations, nullable metadata and tier definitions |
| `web/router-tiers.js` | Expanded deterministic policy and exact parser |
| `web/router-scenarios.js` | 29 scenarios, 116 prompts and portable-library export |
| `components/router-lab.tsx` | Expanded workspace and guided demo UI |
| `app/router/demo/page.tsx` | Explicit no-key demo page |
| `scripts/build-router-demo.js` | Reproducible offline HTML and Markdown prompt reference |
| `scripts/import-aa-models.js` | Full-response AA staging importer |
| `tests/test_router_tiers.js` | Offline policy, scenario and importer tests |
| `tests/smoke_router_demo.py` | Independent standalone Chromium checks |

No selected generation, local, embedding, reranking or guardrail model is executed by this feature. A merged PR or production deployment is not implied by these instructions.

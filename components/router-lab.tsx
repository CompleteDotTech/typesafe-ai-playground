"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import * as router from "../web/router-tiers";
import { scenarios, portableExamples } from "../web/router-scenarios";
import { runJev, errorMessage, download } from "../lib/client";
import styles from "./llm-router.module.css";
const label = (v: string) => v.replaceAll("_", " ");
export function RouterLab({ demo = false }: { demo?: boolean }) {
  const [scenarioId, setScenarioId] = useState(scenarios[1].id);
  const [sample, setSample] = useState(0);
  const scenario = scenarios.find(s => s.id === scenarioId)!;
  const [prompt, setPrompt] = useState(scenarios[1].prompts[0].text);
  const [request, setRequest] = useState<router.Request>({ ...router.defaults, ...scenarios[1].preset });
  const [results, setResults] = useState<{ label: string; value: router.Result }[]>([]);
  const [ruleResult, setRuleResult] = useState("");
  const [origin, setOrigin] = useState("Preset task; prompt text has not been classified.");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function clear() { setResults([]); setRuleResult(""); setError(""); }
  function change(patch: Partial<router.Request>) { setRequest(r => ({ ...r, ...patch })); clear(); setOrigin("Operator controls; no automatic prompt classification."); }
  function load(id: string, index = 0) {
    const s = scenarios.find(item => item.id === id)!;
    setScenarioId(id); setSample(index); setPrompt(s.prompts[index].text);
    setRequest({ ...router.defaults, ...s.preset, allowArchived: request.allowArchived });
    setOrigin("Scenario preset restored; token controls are illustrative workload envelopes, not tokenized prompt lengths."); clear();
  }
  function plan(compare = false) {
    clear();
    try {
      if (scenario.rule) { setRuleResult(JSON.stringify(router.exactOrder(prompt), null, 2)); return; }
      const alternate = request.mode === "preference_demo" ? { ...request, threshold: request.threshold === .8 ? .7 : .8 } : { ...request, budgetUsd: request.budgetUsd / 10 };
      setResults([{ label: "A: current controls", value: router.route(request) }, ...(compare ? [{ label: request.mode === "preference_demo" ? `B: threshold ${alternate.threshold} only` : `B: budget $${alternate.budgetUsd} only`, value: router.route(alternate) }] : [])]);
    } catch (e) { setError(errorMessage(e)); }
  }
  async function classify() {
    clear(); const abort = new AbortController(); controller.current = abort;
    try {
      if (demo || scenario.rule || request.operation !== "generate") throw Error("Live classification is not available for this mode.");
      const check = router.route(request);
      if (["blocked", "refresh_snapshot"].includes(check.status)) throw Error(check.reason);
      const payload = router.classificationPayload(prompt, request.privacy);
      setBusy(true); const response = await runJev(payload, abort.signal);
      if (abort.signal.aborted) return;
      const next = { ...request, task: router.parseClassification(response) };
      setRequest(next); setOrigin("Jev task classification, followed by deterministic routing. Confidence is not a calibrated routing probability.");
      setResults([{ label: "Jev → policy", value: router.route(next) }]);
    } catch (e) { if (!abort.signal.aborted) setError(errorMessage(e)); }
    finally { if (controller.current === abort) { controller.current = null; setBusy(false); } }
  }
  let candidates: router.Model[] = [];
  try { candidates = router.shortlist(request).filter(m => `${m.name} ${m.role}`.toLowerCase().includes(search.toLowerCase())); } catch { /* Invalid controls are reported when planning. */ }
  const promptCount = scenarios.reduce((n, s) => n + s.prompts.length, 0);
  return <div className={`workspace ${styles.root}`}>
    <header><p className="muted">LLM routing / all tiers · Snapshot {router.snapshotDate}</p>
      <h1>{demo ? "LLM router demo" : "LLM router: all tiers"}</h1>
      <p>{router.models.length} configurations · {scenarios.length} scenarios · {promptCount} original prompts. Complete size and price tier taxonomy; a curated model snapshot, not every available model.</p>
      <p><Link href={demo ? "/router" : "/router/demo"}>{demo ? "Open workspace with optional Jev classification" : "Open the no-key guided demo"}</Link> · <a href="#instructions">Instructions</a> · <a href={router.paper} target="_blank" rel="noreferrer">RouteLLM paper</a></p>
      <p>{demo ? "This page does not call any model. " : "Offline planning calls no model. "}Selected models are recommendations only, never executed. Open weights do not mean a local server is installed.</p>
    </header>
    <section id="instructions"><h2>How to use this demonstration</h2>
      <p>1. Choose a scenario and one of its four prompts. Review its lesson and trusted policy controls. The preset task is used for offline routing; editing prompt text does not silently reclassify it.</p>
      <p>2. Select the operation, size tier, price tier, objective, score floor and workload envelope. Budget covers the whole batch. Price tiers use a fixed 3:1 input/output blend only for grouping; actual estimates use your token counts.</p>
      <p>3. Select Plan offline, then inspect the benchmark, exclusions and next-ranked candidate. Compare A/B changes one budget or threshold control. No answers are generated and no downstream provider credentials are required.</p>
      <p>4. Try local-only, missing evidence and over-context cases. A blocked or abstaining result is intentional. After seven days, refresh evidence or explicitly enable archived teaching mode. Export prompts for Examples → Import, or export your decision record.</p>
      <details><summary>Interpret the tiers and limitations</summary><p>Parameter tiers use nominal total weights: micro ≤1B, small &gt;1–4B, compact &gt;4–15B, medium &gt;15–40B, large &gt;40–100B, very large &gt;100B, or unknown. Active MoE parameters are shown separately and do not establish memory fit. Tier names are application-defined, not an industry standard.</p><p>Generation, embedding, reranking and guardrail models are separate operations. Missing benchmark, context or price data stays unknown; it is never a zero-cost deployment. Provider or model-card scores from different harnesses are not silently combined. Weight licenses and usage terms need separate review.</p></details>
    </section>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy} className={styles.controls}><legend>1. Scenario and prompt</legend>
      <div className={styles.grid}><label>Scenario<select value={scenarioId} onChange={e => load(e.target.value)}>{scenarios.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
      <label>Prompt example<select value={sample} onChange={e => load(scenarioId, Number(e.target.value))}>{scenario.prompts.map((p, i) => <option key={p.id} value={i}>{p.title}</option>)}</select></label></div>
      <p>{scenario.lesson}</p><label>Request text<textarea rows={5} maxLength={12000} value={prompt} onChange={e => { setPrompt(e.target.value); clear(); setOrigin("Text edited; choose the task manually or explicitly classify it."); }} /></label><p className="muted">{origin}</p>
      {!demo && <><p>Classify with Jev sends this text to TypeSafe using server-side credentials and API credits. Local-only and specialist-operation settings block it.</p><button className="button" disabled={scenario.rule || request.privacy !== "cloud_allowed" || request.operation !== "generate"} onClick={() => void classify()}>Classify with Jev</button></>}
    </fieldset>
    {busy && <button className="button" onClick={() => controller.current?.abort()}>Cancel classification</button>}
    <fieldset disabled={busy || scenario.rule} className={styles.controls}><legend>2. Trusted controls (unused by the exact parser)</legend>
      <div className={styles.grid}>
        <label>Task benchmark<select value={request.task} onChange={e => change({ task: e.target.value as router.Task })}>{router.tasks.map(t => <option key={t} value={t}>{label(t)}</option>)}</select></label>
        <label>Operation<select value={request.operation} onChange={e => change({ operation: e.target.value })}>{router.operations.map(o => <option key={o} value={o}>{label(o)}</option>)}</select></label>
        <label>Objective<select value={request.mode} onChange={e => change({ mode: e.target.value as router.Request["mode"] })}>{router.modes.map(m => <option key={m} value={m}>{label(m)}</option>)}</select></label>
        <label>Data policy<select value={request.privacy} onChange={e => change({ privacy: e.target.value as router.Request["privacy"] })}><option value="cloud_allowed">Cloud permitted</option><option value="local_only">Local only: no endpoint configured</option></select></label>
        <label>Price tier: USD / 1M blended tokens<select value={request.priceTier} onChange={e => change({ priceTier: e.target.value })}><option value="any">Any price tier</option>{Object.entries(router.priceTiers).map(([id, name]) => <option key={id} value={id}>{label(id)}: {name}</option>)}</select></label>
        <label>Total-parameter tier<select value={request.sizeTier} onChange={e => change({ sizeTier: e.target.value })}><option value="any">Any size</option>{Object.entries(router.sizeTiers).map(([id, name]) => <option key={id} value={id}>{label(id)}: {name}</option>)}</select></label>
        <label>Weights availability<select value={request.weights} onChange={e => change({ weights: e.target.value })}>{["any", "available", "not_available", "unknown"].map(v => <option key={v} value={v}>{label(v)}</option>)}</select></label>
        {([ ["inputTokens", "Input tokens per request", 1], ["outputTokens", "Billable output including reasoning", 1], ["batchSize", "Number of requests", 1], ["budgetUsd", "Total batch token budget (USD)", .001], ["minScore", "Minimum selected benchmark score", 1], ["minTokensPerSecond", "Minimum measured hosted output tokens/s", 1] ] as const).map(([key, name, step]) => <label key={key}>{name}<input type="number" min="0" step={step} value={Number.isNaN(request[key]) ? "" : request[key]} onChange={e => change({ [key]: e.target.value === "" ? NaN : Number(e.target.value) })} /></label>)}
      </div>
      {request.mode === "preference_demo" && <div className={styles.grid}>{(["strongId", "weakId"] as const).map(key => <label key={key}>{key === "strongId" ? "Synthetic strong member" : "Synthetic weak member"}<select value={request[key]} onChange={e => change({ [key]: e.target.value })}>{router.models.filter(m => m.role === "generate").map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>)}{(["preference", "threshold"] as const).map(key => <label key={key}>Synthetic {key}<input type="number" min="0" max="1" step=".05" value={Number.isNaN(request[key]) ? "" : request[key]} onChange={e => change({ [key]: e.target.value === "" ? NaN : Number(e.target.value) })} /></label>)}</div>}
      <label className={styles.check}><input type="checkbox" checked={request.needsImages} onChange={e => change({ needsImages: e.target.checked })} />Require verified image support</label>
      <label className={styles.check}><input type="checkbox" checked={request.allowArchived} onChange={e => change({ allowArchived: e.target.checked })} />Allow archived teaching snapshot after seven days</label>
      <details><summary>Exclude unavailable configurations</summary><div className={styles.grid}>{router.models.map(m => <label key={m.id} className={styles.check}><input type="checkbox" checked={request.excluded.includes(m.id)} onChange={e => change({ excluded: e.target.checked ? [...request.excluded, m.id] : request.excluded.filter(id => id !== m.id) })} />{m.name}</label>)}</div></details>
    </fieldset>
    <div className={styles.actions}><button disabled={busy} className="button primary" onClick={() => plan()}>Plan offline</button><button disabled={busy || scenario.rule} className="button" onClick={() => plan(true)}>Compare A/B</button><button className="button" onClick={() => download("router-prompts.json", portableExamples())}>Export all {promptCount} prompts</button></div>
    <section aria-live="polite" aria-busy={busy}><h2>3. Decision and evidence</h2>
      {!results.length && !ruleResult && <p>No plan yet. Choose Plan offline to evaluate the trusted controls, or run the exact parser in the tier-zero scenario.</p>}
      {ruleResult && <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{ruleResult}</pre>}
      {results.map(({ label: title, value: r }) => <article className={styles.result} key={title}><h3>{title}: {label(r.status)}</h3>
        {r.selected && <><p><strong>{r.selected.model.name}</strong> · {r.selected.score} {r.metric?.unit} on {r.metric?.label}</p><p>Total conditional token estimate: ${r.selected.estimatedUsd.toFixed(6)} for {r.request.batchSize} request(s). Setup: {r.selected.harness}.</p><p><a href={r.metric?.url} target="_blank" rel="noreferrer">Benchmark evidence</a> · <a href={r.selected.model.source} target="_blank" rel="noreferrer">Configuration and pricing evidence</a></p></>}
        <p>{r.reason}</p>{r.fallback && <p>Next ranked, not invoked: {r.fallback.model.name}. Another call would add cost.</p>}
        <details><summary>Limitations and cost assumptions</summary>{r.warnings.map(w => <p key={w}>{w}</p>)}</details>
        <details><summary>Exclusions ({r.excluded.length})</summary>{r.excluded.map(m => <p key={m.id}><strong>{m.name}:</strong> {m.reasons.join("; ")}</p>)}</details>
        <details><summary>Ranked eligible configurations ({r.ranked.length})</summary>{r.ranked.map(c => <p key={c.model.id}>{c.model.name}: {c.score}; ${c.estimatedUsd.toFixed(6)}</p>)}</details>
      </article>)}
      {(!!results.length || !!ruleResult) && <button className="button" onClick={() => download("router-plan.json", { scenarioId, prompt, origin, results, ruleResult })}>Export decision (includes entered text)</button>}
    </section>
    <section><h2>4. Model and specialist registry</h2><p>Catalog matches are not routing eligibility. Prices are per million uncached tokens. Unknown means missing evidence, not zero. Specialist rows have no comparable generation score. Source links retain the evidence provenance.</p>
      <label>Search models<input type="search" value={search} onChange={e => setSearch(e.target.value)} /></label><p>{candidates.length} catalog matches of {router.models.length}; clear tier, operation, weights and exclusion controls to broaden the catalog.</p>
      <div className={styles.tableWrap}><table><thead><tr><th>Configuration / role</th><th>Size / total / active B</th><th>Price tier / input / output USD</th><th>General v4.3 / selected task</th><th>Hosted output tokens/s</th></tr></thead><tbody>{candidates.map(m => <tr key={m.id}><td><a href={m.source} target="_blank" rel="noreferrer">{m.name}</a><small>{m.role} · weights {label(m.weights)}</small><small>{m.evidence}</small></td><td>{label(m.sizeTier)}<small>{m.totalB ?? "Unknown"} / {m.activeB ?? "Unknown"}</small></td><td>{label(m.priceTier)}<small>{m.inputUsdPerMillion ?? "Unknown"} / {m.outputUsdPerMillion ?? "Unknown"}</small></td><td>{m.scores.general ?? "Not captured"} / {m.scores[request.task] ?? "Not captured"}</td><td>{m.speed ?? "Not captured"}</td></tr>)}</tbody></table></div>
      <p><a href="https://artificialanalysis.ai/leaderboards/models" target="_blank" rel="noreferrer">Artificial Analysis</a> · <a href="https://artificialanalysis.ai/api-reference" target="_blank" rel="noreferrer">API reference for full-catalog refresh</a></p>
    </section>
  </div>;
}

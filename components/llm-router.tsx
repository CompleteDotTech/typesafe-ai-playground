"use client";
import { useEffect, useRef, useState } from "react";
import { runJev, errorMessage, download } from "../lib/client";
import * as router from "../web/llm-router";
import styles from "./llm-router.module.css";

const scenarios: { title: string; task: router.Task; prompt: string }[] = [
  { title: "Scientific coding", task: "scientific_code", prompt: "Implement a numerically stable reaction-diffusion solver and test its boundary conditions and convergence." },
  { title: "Long-document reasoning", task: "long_context", prompt: "Compare conflicting definitions across an 80,000-token technical specification and identify affected requirements." },
  { title: "Terminal operations", task: "terminal", prompt: "Reproduce a failing Linux build in a disposable workspace and validate the repair with terminal tools." },
  { title: "Workflow automation", task: "automation", prompt: "Coordinate a multi-step software workflow, validate intermediate outputs and recover from tool failures." },
  { title: "Image reasoning", task: "vision", prompt: "Interpret a scientific diagram. This lab receives only this description, not the image pixels." },
  { title: "Repository patch", task: "repository_patch", prompt: "Use a Codex agent to fix a repository issue and add a regression test." },
  { title: "Simple extraction", task: "general", prompt: "Extract the order number from this synthetic message: Please check order SAMPLE-123." },
  { title: "Unmeasured creative task", task: "creative", prompt: "Write a gently funny tagline matching my brand's style." },
];
const label = (value: string) => value.replaceAll("_", " ");
export function LlmRouter() {
  const [request, setRequest] = useState<router.Request>({ ...router.defaults, excluded: [] });
  const [prompt, setPrompt] = useState(scenarios[0].prompt);
  const [results, setResults] = useState<{ label: string; value: router.Result }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState("Operator-selected task; Jev has not classified this description.");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  function change(patch: Partial<router.Request>) {
    setRequest(r => ({ ...r, ...patch })); setResults([]); setError("");
    if (patch.task) setOrigin("Operator-selected task; Jev has not classified this description.");
  }
  function plan(compare = false) {
    setError("");
    try {
      const alternate = request.mode === "preference_demo" ? { ...request, threshold: 0.8 } : { ...request, budgetUsd: 0.01 };
      setResults([{ label: "A: current controls", value: router.route(request) }, ...(compare ? [{
        label: request.mode === "preference_demo" ? "B: threshold = 0.8 only" : "B: budget = $0.01 only",
        value: router.route(alternate),
      }] : [])]);
    } catch (e) { setError(errorMessage(e)); setResults([]); }
  }
  async function classify() {
    setError(""); setResults([]);
    const abort = new AbortController(); controller.current = abort;
    try {
      const preflight = router.route(request);
      if (["blocked", "refresh_snapshot"].includes(preflight.status)) throw Error(preflight.reason);
      const payload = router.classificationPayload(prompt, request.privacy);
      setBusy(true);
      const response = await runJev(payload, abort.signal);
      if (abort.signal.aborted) return;
      const task = router.parseClassification(response);
      const next = { ...request, task };
      setRequest(next); setOrigin("Jev classified the task. Its confidence is not a calibrated routing probability.");
      setResults([{ label: "Jev classification → deterministic plan", value: router.route(next) }]);
    } catch (e) { if (!abort.signal.aborted) setError(errorMessage(e)); }
    finally { if (controller.current === abort) { controller.current = null; setBusy(false); } }
  }
  return <div className={`workspace ${styles.root}`}>
    <header>
      <p className="muted">Use case / LLM routing · Evidence snapshot {router.snapshotDate}</p>
      <h1>Benchmark-aware LLM router</h1>
      <p>Classify a task, apply trusted constraints, rank measured candidates and inspect the evidence. Dry run only: no frontier model is called.</p>
      <p><a href={router.paper} target="_blank" rel="noreferrer">RouteLLM</a> inspires the strong/weak threshold exercise. Specialty routing here is a benchmark-based heuristic, not a trained RouteLLM model.</p>
    </header>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={busy} className={styles.controls}>
      <legend>1. Describe and classify the task</legend>
      <label>Scenario<select defaultValue="0" onChange={e => {
        const scenario = scenarios[Number(e.target.value)]; setPrompt(scenario.prompt);
        change({ task: scenario.task, mode: "quality" });
      }}>{scenarios.map((s, i) => <option key={s.title} value={i}>{s.title}</option>)}</select></label>
      <label>Task description (text only)<textarea rows={4} maxLength={12000} value={prompt} onChange={e => {
        setPrompt(e.target.value); setResults([]); setOrigin("Description changed. Select the task manually or classify it again.");
      }} /></label>
      <div className={styles.grid}>
        <label>Task specialty<select value={request.task} onChange={e => change({ task: e.target.value as router.Task })}>
          {router.tasks.map(task => <option key={task} value={task}>{label(task)}</option>)}
        </select></label>
        <label>Routing objective<select value={request.mode} onChange={e => {
          const mode = e.target.value as router.Request["mode"];
          change({ mode, ...(mode === "preference_demo" ? { task: "general" as const } : {}) });
        }}><option value="quality">Highest measured score</option><option value="economy">Lowest cost above score floor</option><option value="preference_demo">Synthetic preference threshold</option></select></label>
        <label>Data policy<select value={request.privacy} onChange={e => change({ privacy: e.target.value as router.Request["privacy"] })}>
          <option value="cloud_allowed">Cloud classification permitted</option><option value="local_only">Local only (no endpoint configured)</option>
        </select></label>
      </div>
      <p className="muted">{origin} Offline planning uses the selected task, not the description. Clicking Classify sends the description to TypeSafe and uses API credits. Local-only policy blocks that request.</p>
      <button className="button" disabled={request.privacy === "local_only"} onClick={() => void classify()}>Classify with Jev</button>
    </fieldset>
    {busy && <button className="button" onClick={() => controller.current?.abort()}>Cancel classification</button>}
    <fieldset disabled={busy} className={styles.controls}>
      <legend>2. Set trusted constraints</legend>
      <div className={styles.grid}>
        {([ ["inputTokens", "Estimated input tokens", 1], ["outputTokens", "Billable output tokens INCLUDING reasoning", 1],
          ["budgetUsd", "Conditional token budget (USD)", 0.01], ["minScore", "Minimum selected-benchmark score", 1],
        ] as const).map(([key, title, step]) => <label key={key}>{title}<input type="number" min="0" step={step}
          value={Number.isNaN(request[key]) ? "" : request[key]} onChange={e => change({ [key]: e.target.value === "" ? Number.NaN : Number(e.target.value) })} /></label>)}
        {request.mode === "preference_demo" && ([ ["preference", "Synthetic p(strong wins), NOT a prediction"], ["threshold", "Strong-route threshold"] ] as const).map(([key, title]) =>
          <label key={key}>{title}<input type="number" min="0" max="1" step="0.05" value={Number.isNaN(request[key]) ? "" : request[key]}
            onChange={e => change({ [key]: e.target.value === "" ? Number.NaN : Number(e.target.value) })} /></label>)}
      </div>
      <label className={styles.check}><input type="checkbox" checked={request.needsImages} onChange={e => change({ needsImages: e.target.checked })} />Require verified image input support</label>
      <label className={styles.check}><input type="checkbox" checked={request.allowArchived} onChange={e => change({ allowArchived: e.target.checked })} />Allow archived teaching snapshot after seven days (not current recommendations)</label>
      <details><summary>Exclude unavailable or disallowed candidates</summary><div className={styles.grid}>
        {router.models.map(model => <label key={model.id} className={styles.check}><input type="checkbox" checked={request.excluded.includes(model.id)}
          onChange={e => change({ excluded: e.target.checked ? [...request.excluded, model.id] : request.excluded.filter(id => id !== model.id) })} />{model.name}</label>)}
      </div></details>
      <div className={styles.actions}>
        <button className="button primary" onClick={() => plan()}>Plan route offline</button>
        <button className="button" onClick={() => plan(true)}>Compare A/B</button>
        <button className="button" onClick={() => download("llm-router-example.json", router.portableExample())}>Export starter for Examples → Import</button>
      </div>
    </fieldset>
    <section aria-live="polite" aria-busy={busy}>
      <h2>3. Decision and evidence</h2>
      {!results.length && <p>Run a plan to inspect selection, conditional cost, exclusions and limitations.</p>}
      {results.map(({ label: title, value: result }) => <article className={styles.result} key={title}>
        <h3>{title}: {label(result.status)}</h3>
        {result.selected && <>
          <p><strong>{result.selected.model.name}</strong></p>
          <p>{result.metric?.label}: <strong>{result.selected.score}{result.metric?.unit === "%" ? "%" : " points"}</strong> · Conditional token estimate: <strong>${result.selected.estimatedUsd.toFixed(6)}</strong></p>
          <p>Evaluation setup: {result.selected.harness}. {result.selected.model.name.includes("fallback") && "The measured configuration includes fallback; additional fallback calls are not priced by this estimate."}</p>
          <p><a href={result.metric?.url} target="_blank" rel="noreferrer">Benchmark evidence</a> · <a href={result.selected.model.source} target="_blank" rel="noreferrer">Model specifications and pricing</a></p>
        </>}
        <p>{result.reason}</p>
        {result.fallback && <p>Next ranked eligible candidate: {result.fallback.model.name}. Not called; a second invocation would add cost.</p>}
        {result.warnings.map(warning => <p className="muted" key={warning}>{warning}</p>)}
        <details><summary>Audit exclusions ({result.excluded.length})</summary>{result.excluded.map(model => <p key={model.id}><strong>{model.name}:</strong> {model.reasons.join("; ")}</p>)}</details>
      </article>)}
      {!!results.length && <button className="button" onClick={() => download("llm-router-plan.json", { prompt, origin, results })}>Export plan (contains entered description)</button>}
    </section>
    <section><h2>4. Candidate registry</h2>
      <p>Manually curated Artificial Analysis snapshot, {router.snapshotDate}. Prices are USD per million uncached tokens. Missing results are not zero. Display configurations are not provider API IDs. Best means best among measured, eligible snapshot candidates, not guaranteed best for your request.</p>
      <div className={styles.tableWrap}><table><thead><tr><th>Model / configuration</th><th>Intelligence v4.3</th><th>{router.metrics[request.task]?.label || "Creative score unavailable"}</th><th>Input / output $ per 1M</th></tr></thead>
        <tbody>{router.models.map(model => <tr key={model.id}><td><a href={model.source} target="_blank" rel="noreferrer">{model.name}</a>{request.task === "coding_agent" && model.agent && <small> + {model.agent}</small>}</td><td>{model.scores.general}</td><td>{model.scores[request.task] ?? "Not captured"}</td><td>${model.inputUsdPerMillion} / ${model.outputUsdPerMillion}</td></tr>)}</tbody>
      </table></div>
      <p><a href="https://artificialanalysis.ai/leaderboards/models" target="_blank" rel="noreferrer">Artificial Analysis leaderboard</a> · <a href="https://artificialanalysis.ai/agents/coding-agents" target="_blank" rel="noreferrer">Coding-agent methodology</a></p>
    </section>
  </div>;
}

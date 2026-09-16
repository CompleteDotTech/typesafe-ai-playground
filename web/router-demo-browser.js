// DOM updates use textContent; never interpret prompt content as HTML or routing controls.
const router = require("./router-tiers");
const { scenarios, portableExamples } = require("./router-scenarios");
const $ = id => document.getElementById(id);
const text = (id, value) => { $(id).textContent = value; };
const label = value => value.replaceAll("_", " ");
function options(node, pairs) { node.replaceChildren(...pairs.map(([value, title]) => { const o = document.createElement("option"); o.value = value; o.textContent = title; return o; })); }
const selects = { task: router.tasks.map(v => [v, label(v)]), operation: router.operations.map(v => [v, v]), mode: router.modes.map(v => [v, label(v)]), privacy: [["cloud_allowed", "Cloud permitted"], ["local_only", "Local only (not configured)"]], priceTier: [["any", "Any price tier"], ...Object.entries(router.priceTiers)], sizeTier: [["any", "Any total-parameter tier"], ...Object.entries(router.sizeTiers)], weights: ["any", "available", "not_available", "unknown"].map(v => [v, label(v)]), strongId: router.models.filter(m => m.role === "generate").map(m => [m.id, m.name]), weakId: router.models.filter(m => m.role === "generate").map(m => [m.id, m.name]) };
const numbers = { inputTokens: "Input tokens per request", outputTokens: "Billable output including reasoning", batchSize: "Batch request count", budgetUsd: "Total conditional budget (USD)", minScore: "Minimum benchmark score", minTokensPerSecond: "Minimum hosted output tokens/s", preference: "Synthetic p(strong wins)", threshold: "Strong-route threshold" };
for (const [key, value] of Object.entries({ ...selects, ...numbers })) {
  const field = document.createElement("label"); field.textContent = typeof value === "string" ? value : label(key);
  const control = document.createElement(Array.isArray(value) ? "select" : "input"); control.id = key;
  if (Array.isArray(value)) options(control, value); else { control.type = "number"; control.min = "0"; control.step = ["inputTokens", "outputTokens", "batchSize"].includes(key) ? "1" : "any"; }
  field.append(control); $("fields").append(field);
}
options($("scenario"), scenarios.map(s => [s.id, s.title]));
let latest = null;
function current() { return scenarios.find(s => s.id === $("scenario").value); }
function resetResult() { latest = null; text("decision", "Controls changed. Plan again."); text("audit", ""); text("error", ""); }
function load(index = 0) {
  const s = current(); const r = { ...router.defaults, ...s.preset };
  options($("sample"), s.prompts.map((p, i) => [String(i), p.title])); $("sample").value = String(index);
  $("prompt").value = s.prompts[index].text; text("lesson", s.lesson);
  for (const key of [...Object.keys(selects), ...Object.keys(numbers)]) $(key).value = String(r[key]);
  $("images").checked = r.needsImages; $("compare").disabled = s.rule; resetResult(); showModels();
}
function read() {
  const r = { ...router.defaults };
  for (const key of Object.keys(selects)) r[key] = $(key).value;
  for (const key of Object.keys(numbers)) r[key] = $(key).value === "" ? NaN : Number($(key).value);
  r.needsImages = $("images").checked; r.allowArchived = $("archive").checked; return router.validate(r);
}
function showModels() {
  const q = $("search").value.toLowerCase(); let rows = [];
  try { rows = router.shortlist(read()).filter(m => m.name.toLowerCase().includes(q)); } catch { text("coverage", "Correct the controls to filter the registry."); $("models").replaceChildren(); return; }
  text("coverage", `${rows.length} catalog matches of ${router.models.length}; these are not yet eligibility decisions.`);
  $("models").replaceChildren(...rows.map(m => {
    const tr = document.createElement("tr");
    for (const value of [m.name, m.role, `${m.totalB ?? "Unknown"} / ${m.activeB ?? "Unknown"}`, `${m.sizeTier} / ${m.priceTier}`, `${m.inputUsdPerMillion ?? "Unknown"} / ${m.outputUsdPerMillion ?? "Unknown"}`, m.scores.general ?? "Not captured"]) { const td = document.createElement("td"); td.textContent = String(value); tr.append(td); }
    const a = document.createElement("a"); a.href = m.source; a.target = "_blank"; a.rel = "noreferrer"; a.textContent = m.name; tr.firstChild.replaceChildren(a);
    const note = document.createElement("small"); note.textContent = m.evidence; tr.firstChild.append(note); return tr;
  }));
}
function run(compare = false) {
  try {
    text("error", ""); const s = current();
    if (s.rule) { latest = { prompt: $("prompt").value, result: router.exactOrder($("prompt").value) }; text("decision", `${latest.result.status}: ${latest.result.order ?? "No exact match"}; zero model calls.`); }
    else {
      const r = read(); const alternate = r.mode === "preference_demo" ? { ...r, threshold: r.threshold === .8 ? .7 : .8 } : { ...r, budgetUsd: r.budgetUsd / 10 };
      const plans = [router.route(r), ...(compare ? [router.route(alternate)] : [])]; latest = { prompt: $("prompt").value, scenarioId: s.id, comparison: compare ? (r.mode === "preference_demo" ? "threshold only" : "budget divided by ten only") : null, plans };
      text("decision", plans.map((p, i) => `${i ? "B" : "A"}: ${p.status} — ${p.selected ? p.selected.model.name + "; conditional total $" + p.selected.estimatedUsd.toFixed(6) : p.reason}`).join("\n"));
    }
    text("audit", JSON.stringify(latest, null, 2));
  } catch (e) { latest = null; text("error", e.message); text("decision", "No valid plan."); text("audit", ""); }
}
function save(name, value) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
$("scenario").addEventListener("change", () => load());
$("sample").addEventListener("change", () => load(Number($("sample").value)));
$("controls").addEventListener("input", () => { resetResult(); showModels(); });
$("prompt").addEventListener("input", resetResult); $("search").addEventListener("input", showModels);
$("plan").addEventListener("click", () => run()); $("compare").addEventListener("click", () => run(true));
$("export").addEventListener("click", () => save("router-prompts.json", portableExamples()));
$("export-plan").addEventListener("click", () => latest ? save("router-plan.json", latest) : text("error", "Plan a route before exporting a decision."));
$("suite").addEventListener("click", () => {
  latest = { scenarioPlans: scenarios.map(s => ({ scenario: s.id, result: s.rule ? router.exactOrder(s.prompts[0].text) : router.route({ ...router.defaults, ...s.preset, allowArchived: $("archive").checked }) })) };
  text("error", ""); text("decision", `${scenarios.length} scenario plans completed locally; no model calls. Inspect the audit for intentional blocks and abstentions.`); text("audit", JSON.stringify(latest, null, 2));
});
text("counts", `${router.models.length} model configurations · ${scenarios.length} scenarios · ${scenarios.reduce((n, s) => n + s.prompts.length, 0)} prompts · evidence ${router.snapshotDate}`);
$("scenario").value = scenarios[1].id; load();

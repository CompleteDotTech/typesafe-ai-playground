"use strict";
// Stage all records returned by AA for review; never silently replace trusted policy.
const fs = require("node:fs");
const path = require("node:path");
const endpoint = "https://artificialanalysis.ai/api/v2/data/llms/models";
const MAX_BYTES = 16 * 1024 * 1024;
function normalize(payload, capturedAt = new Date().toISOString()) {
  if (!payload || payload.status !== 200 || !Array.isArray(payload.data) || !payload.data.length || payload.data.length > 20000) throw Error("Unexpected AA response envelope.");
  if (!Number.isFinite(Date.parse(capturedAt))) throw Error("Invalid capture date.");
  const ids = new Set();
  const finite = v => typeof v === "number" && Number.isFinite(v) ? v : null;
  const nonnegative = v => finite(v) !== null && v >= 0 ? v : null;
  const models = payload.data.map(row => {
    if (!row || typeof row.id !== "string" || !row.id || row.id.length > 200 || ids.has(row.id) || typeof row.name !== "string" || !row.name || row.name.length > 500 || typeof row.slug !== "string" || !/^[a-zA-Z0-9_-]{1,200}$/.test(row.slug)) throw Error("Missing, duplicate or invalid AA model identity.");
    ids.add(row.id);
    // Some evaluations legitimately have negative values. Preserve raw units and signs.
    const evaluations = Object.fromEntries(Object.entries(row.evaluations || {}).filter(([key]) => /^[a-zA-Z0-9_]{1,100}$/.test(key)).map(([key, value]) => [key, finite(value)]));
    return { aaId: row.id, name: row.name, slug: row.slug, source: "https://artificialanalysis.ai/models/" + row.slug, capturedAt, status: "needs_review", metricVersion: null, rawEvaluations: evaluations, inputUsdPerMillion: nonnegative(row.pricing?.price_1m_input_tokens), outputUsdPerMillion: nonnegative(row.pricing?.price_1m_output_tokens), outputTokensPerSecond: nonnegative(row.median_output_tokens_per_second), timeToFirstTokenSeconds: nonnegative(row.median_time_to_first_token_seconds), contextLimit: null, images: null, providerModelId: null, notes: "Raw AA units preserved. Confirm benchmark version, effort, harness, estimated-vs-measured status, context, modalities and endpoint pricing before promoting. Missing context/modalities are NOT inferred." };
  });
  return { schemaVersion: 1, source: endpoint, attribution: "Artificial Analysis — https://artificialanalysis.ai/", capturedAt, coverage: "All records in this API response, not all models in existence", recordCount: models.length, models };
}
async function main(args = process.argv.slice(2)) {
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--force") opts.force = true;
    else if (["--input", "--output"].includes(args[i]) && args[i + 1] && !args[i + 1].startsWith("--")) opts[args[i].slice(2)] = args[++i];
    else throw Error("Usage: node scripts/import-aa-models.js [--input fixture.json] [--output data/aa-staging.json] [--force]");
  }
  let raw;
  if (opts.input) {
    if (fs.statSync(opts.input).size > MAX_BYTES) throw Error("Input exceeds 16 MB.");
    raw = fs.readFileSync(opts.input, "utf8");
  } else {
    const key = process.env.ARTIFICIAL_ANALYSIS_API_KEY;
    if (!key) throw Error("Set ARTIFICIAL_ANALYSIS_API_KEY in the server/shell environment, or provide --input for offline validation. Never expose the key to the browser.");
    const response = await fetch(endpoint, { headers: { "x-api-key": key }, redirect: "error", signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error("AA request failed with HTTP " + response.status);
    if (!response.body) throw Error("AA response body is empty.");
    const chunks = []; let size = 0;
    for await (const chunk of response.body) { size += chunk.length; if (size > MAX_BYTES) throw Error("AA response exceeds 16 MB."); chunks.push(chunk); }
    raw = Buffer.concat(chunks).toString("utf8");
  }
  const result = normalize(JSON.parse(raw));
  const output = path.resolve(opts.output || "data/aa-staging.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n", { flag: opts.force ? "w" : "wx" });
  console.log(`Staged ${result.recordCount} records at ${output}; trusted routing data was not changed.`);
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { normalize, main };

"use strict";
// Size and cost are independent axes. Nominal parameter sizes are not RAM estimates.
const AA = "https://artificialanalysis.ai/models/";
const capturedAt = "2026-09-16";
const priceTiers = { ultra_budget: "Under $0.15", budget: "$0.15–<$0.50", economy: "$0.50–<$1", standard: "$1–<$4", premium: "$4–<$10", flagship_priced: "$10+", unpriced: "No verified price" };
const sizeTiers = { micro: "Up to 1B", small: ">1–4B", compact: ">4–15B", medium: ">15–40B", large: ">40–100B", very_large: ">100B", undisclosed: "Unknown size" };
function priceTier(input, output) {
  if (input === null || output === null) return "unpriced";
  const blended = (3 * input + output) / 4;
  return blended < .15 ? "ultra_budget" : blended < .5 ? "budget" : blended < 1 ? "economy" : blended < 4 ? "standard" : blended < 10 ? "premium" : "flagship_priced";
}
function sizeTier(total) {
  return total === null ? "undisclosed" : total <= 1 ? "micro" : total <= 4 ? "small" : total <= 15 ? "compact" : total <= 40 ? "medium" : total <= 100 ? "large" : "very_large";
}
function decorate(model) {
  const m = { totalB: null, activeB: null, weights: "unknown", role: "generate", speed: null, capturedAt, evidence: "AA v4.3 snapshot", ...model };
  return { ...m, priceTier: priceTier(m.inputUsdPerMillion, m.outputUsdPerMillion), sizeTier: sizeTier(m.totalB) };
}
// Model-page measurements. Hosted token throughput is not local speed or an SLA.
const pricedRows = [
  ["luna-max", "GPT-5.6 Luna (max)", "gpt-5-6-luna", .2, 1.2, 1000000, true, 38, null, null, 114.8],
  ["luna-high", "GPT-5.6 Luna (high)", "gpt-5-6-luna-high", .2, 1.2, 1000000, true, 32, null, null, 114.2],
  ["luna-none", "GPT-5.6 Luna (non-reasoning)", "gpt-5-6-luna-non-reasoning", .2, 1.2, 1000000, true, 16, null, null, 108.7],
  ["terra-medium", "GPT-5.6 Terra (medium)", "gpt-5-6-terra-medium", 2, 12, 1000000, true, 30, null, null, 85.3],
  ["sonnet-max", "Claude Sonnet 5 (adaptive max)", "claude-sonnet-5", 2, 10, 1000000, true, 38, null, null, 71],
  ["haiku-reasoning", "Claude 4.5 Haiku (reasoning)", "claude-4-5-haiku-reasoning", 1, 5, 200000, true, 18, null, null, 88.2],
  ["gemini-lite", "Gemini 3.5 Flash-Lite", "gemini-3-5-flash-lite", .3, 2.5, 1000000, true, 23, null, null, 373.9],
  ["granite-3b", "Granite 4.2 3B", "granite-4-2-3b", .03, .12, 131000, false, 9, 3, 3, 208],
  ["granite-8b", "Granite 4.2 8B", "granite-4-2-8b", .06, .25, 131000, false, 12, 8, 8, 67.1],
  ["oss-20b", "gpt-oss-20b (high)", "gpt-oss-20b", .06, .19, 131000, false, 9, 21, 3.6, 210.8],
  ["mistral-small4", "Mistral Small 4 (reasoning)", "mistral-small-4", .15, .6, 256000, true, 11, 119, 6.5, 163.4],
  ["mistral-large3", "Mistral Large 3", "mistral-large-3", .5, 1.5, 256000, true, 10, 675, 41, 79.8],
  ["mercury2", "Mercury 2", "mercury-2", .25, .75, 128000, false, 12, null, null, 654.1],
  ["qwen-coder-next", "Qwen3 Coder Next", "qwen3-coder-next", .35, 1.2, 256000, false, 10, 79.7, 3, 100],
  ["ministral14", "Ministral 3 14B", "ministral-3-14b", .2, .2, 256000, true, 6, 14, 14, 85.7],
  // AA marks Nova Micro's intelligence score as estimated: do not promote it to measured.
  ["nova-micro", "Nova Micro (index estimated; not ranked)", "nova-micro", .035, .14, 130000, false, null, null, null, 289.2],
];
const extras = pricedRows.map(([id, name, slug, input, output, context, images, score, totalB, activeB, speed]) => decorate({ id, name, source: AA + slug, inputUsdPerMillion: input, outputUsdPerMillion: output, demoContextLimit: context, images, scores: score === null ? {} : { general: score }, agent: null, totalB, activeB, speed, weights: totalB === null ? "not_available" : "available", evidence: score === null ? "AA estimate excluded from measured ranking" : "AA v4.3 snapshot" }));
function weights(id, name, totalB, activeB, source, role = "generate") {
  extras.push(decorate({ id, name, totalB, activeB, source, role, weights: "available", inputUsdPerMillion: null, outputUsdPerMillion: null, demoContextLimit: null, images: null, scores: {}, agent: null, evidence: "Model-card identity and nominal size only; deployment, comparable benchmarks, context configuration and cost require validation" }));
}
for (const n of [.6, 1.7, 4, 8, 14, 32]) weights("qwen3-" + String(n).replace(".", "p"), `Qwen3 ${n}B`, n, n, "https://qwenlm.github.io/blog/qwen3/");
weights("qwen3-30-a3", "Qwen3 30B-A3B", 30, 3, "https://qwenlm.github.io/blog/qwen3/");
weights("qwen3-235-a22", "Qwen3 235B-A22B", 235, 22, "https://qwenlm.github.io/blog/qwen3/");
for (const [size, n] of [["135M", .135], ["360M", .36], ["1.7B", 1.7]]) weights("smollm2-" + size.toLowerCase().replace(".", "p"), `SmolLM2 ${size} Instruct`, n, n, `https://huggingface.co/HuggingFaceTB/SmolLM2-${size}-Instruct`);
weights("smollm3-3b", "SmolLM3 3B", 3, 3, "https://huggingface.co/HuggingFaceTB/SmolLM3-3B");
for (const n of [1, 4, 12, 27]) weights("gemma3-" + n, `Gemma 3 ${n}B IT`, n, n, "https://ai.google.dev/gemma/docs/core/model_card_3");
for (const n of [1, 3]) weights("llama32-" + n, `Llama 3.2 ${n}B Instruct`, n, n, `https://huggingface.co/meta-llama/Llama-3.2-${n}B-Instruct`);
for (const n of [8, 70, 405]) weights("llama31-" + n, `Llama 3.1 ${n}B Instruct`, n, n, `https://huggingface.co/meta-llama/Llama-3.1-${n}B-Instruct`);
weights("phi4-mini", "Phi-4-mini-instruct", 3.8, 3.8, "https://huggingface.co/microsoft/Phi-4-mini-instruct");
weights("phi4", "Phi-4", 14, 14, "https://huggingface.co/microsoft/phi-4");
weights("qwen35-08", "Qwen3.5 0.8B", .8, .8, "https://huggingface.co/Qwen/Qwen3.5-0.8B");
weights("qwen35-397", "Qwen3.5 397B-A17B", 397, 17, "https://huggingface.co/Qwen/Qwen3.5-397B-A17B");
weights("oss-120b", "gpt-oss-120b", 117, 5.1, "https://openai.com/index/introducing-gpt-oss/");
for (const [size, total, active] of [[20, 21, 3.6], [120, 117, 5.1]]) weights("safeguard-" + size, `gpt-oss-safeguard-${size}b`, total, active, "https://help.openai.com/en/articles/11870455", "guardrail");
for (const n of [.6, 4, 8]) {
  weights("qwen-embed-" + String(n).replace(".", "p"), `Qwen3 Embedding ${n}B`, n, n, "https://qwenlm.github.io/blog/qwen3-embedding/", "embedding");
  weights("qwen-rerank-" + String(n).replace(".", "p"), `Qwen3 Reranker ${n}B`, n, n, "https://qwenlm.github.io/blog/qwen3-embedding/", "rerank");
}
module.exports = { capturedAt, priceTiers, sizeTiers, priceTier, sizeTier, decorate, extras };

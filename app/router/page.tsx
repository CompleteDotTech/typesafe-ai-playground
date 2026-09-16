import type { Metadata } from "next";
import { LlmRouter } from "../../components/llm-router";
export default function Page() {
  return <LlmRouter />;
}
export const metadata: Metadata = { title: "LLM router · TypeSafe Playground" };

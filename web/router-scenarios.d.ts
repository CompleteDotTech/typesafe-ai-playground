import type { Request, Task } from "./router-tiers";
export type Scenario = { id: string; title: string; task: Task; preset: Partial<Request>; lesson: string; rule: boolean; prompts: { id: string; title: string; text: string }[] };
export const scenarios: readonly Scenario[];
export function portableExamples(): unknown;

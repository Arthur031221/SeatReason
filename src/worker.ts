import {
  plan,
  repairOptions,
  type Outcome,
  type RepairOption,
} from "./core/analyze.ts";
import type { Plan, Problem } from "./core/problem.ts";

export interface AnalyzeRequest {
  id: number;
  problem: Problem;
  seed: number;
  prefer?: Plan;
  timeLimitMs: number;
}

export type AnalyzeResponse =
  | { id: number; ok: true; outcome: Outcome; options: RepairOption[] }
  | { id: number; ok: false; error: string };

self.onmessage = (event: MessageEvent<AnalyzeRequest>) => {
  const { id, problem, seed, prefer, timeLimitMs } = event.data;
  try {
    const started = performance.now();
    const outcome = plan(problem, { seed, prefer, timeLimitMs });
    // Repair previews share what is left of the one time limit.
    const left = Math.max(1, timeLimitMs - (performance.now() - started));
    const options =
      outcome.status === "conflict"
        ? repairOptions(problem, outcome.rules, {
            current: prefer,
            timeLimitMs: left,
          })
        : [];
    self.postMessage({
      id,
      ok: true,
      outcome,
      options,
    } satisfies AnalyzeResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({
      id,
      ok: false,
      error: message,
    } satisfies AnalyzeResponse);
  }
};

import { useCallback, useEffect, useRef, useState } from "react";
import type { Outcome, RepairOption } from "../core/analyze.ts";
import type { Plan, Problem } from "../core/problem.ts";
import type { AnalyzeRequest, AnalyzeResponse } from "../worker.ts";

export const TIME_LIMIT_MS = 8000;

export type Check =
  | { state: "idle" }
  | { state: "working" }
  | { state: "cancelled" }
  | { state: "error"; reason: string }
  | { state: "done"; outcome: Outcome; options: RepairOption[] };

interface Request {
  problem: Problem;
  seed: number;
  prefer?: Plan;
}

/**
 * Runs the analysis in a worker. A new request, or a cancel, throws the
 * worker away, which is the only way to stop a search that is mid-flight.
 */
export function useSolver(onDone?: (check: Check, request: Request) => void) {
  const [check, setCheck] = useState<Check>({ state: "idle" });
  const worker = useRef<Worker | null>(null);
  const counter = useRef(0);
  const callback = useRef(onDone);
  callback.current = onDone;

  const stop = useCallback(() => {
    worker.current?.terminate();
    worker.current = null;
  }, []);

  const run = useCallback(
    (request: Request) => {
      stop();
      const id = ++counter.current;
      const next = new Worker(new URL("../worker.ts", import.meta.url), {
        type: "module",
      });
      worker.current = next;
      setCheck({ state: "working" });
      const finish = (result: Check) => {
        if (counter.current !== id) return;
        setCheck(result);
        callback.current?.(result, request);
      };
      next.onmessage = (event: MessageEvent<AnalyzeResponse>) => {
        const data = event.data;
        if (data.id !== id) return;
        finish(
          data.ok
            ? { state: "done", outcome: data.outcome, options: data.options }
            : { state: "error", reason: data.error },
        );
      };
      next.onerror = (event) =>
        finish({ state: "error", reason: event.message });
      const message: AnalyzeRequest = {
        id,
        ...request,
        timeLimitMs: TIME_LIMIT_MS,
      };
      next.postMessage(message);
    },
    [stop],
  );

  const cancel = useCallback(() => {
    counter.current++;
    stop();
    setCheck({ state: "cancelled" });
  }, [stop]);

  useEffect(() => stop, [stop]);
  return { check, run, cancel };
}

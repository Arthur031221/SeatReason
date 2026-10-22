import { Encoding } from "./encode.ts";
import { seatRuleConflict } from "./hall.ts";
import {
  usableSeats,
  validateShape,
  type Plan,
  type Problem,
} from "./problem.ts";
import { changedPupils } from "./validate.ts";

export interface Limits {
  /** Conflicts allowed per solver call. Deterministic, used by the tests. */
  conflictBudget?: number;
  /** Wall-clock allowance for the whole analysis, in milliseconds. */
  timeLimitMs?: number;
  /** Polled during the search; return true to cancel. */
  shouldStop?: () => boolean;
}

export type Outcome =
  | { status: "solved"; plan: Plan }
  | { status: "capacity"; pupils: number; seats: number }
  | {
      status: "conflict";
      /** Rule ids that cannot all hold. */
      rules: string[];
      /** True only when every rule was shown necessary by a finished search. */
      minimal: boolean;
    }
  | { status: "inconclusive"; reason: "budget" | "cancelled" };

export interface RepairOption {
  /** The rule that would be switched off. */
  rule: string;
  outcome: Outcome;
  /** For a solved outcome: pupils whose seat differs from the current plan. */
  changed: string[];
}

export class InvalidProblemError extends Error {}

/** One deadline for a whole analysis, however many solver calls it makes. */
function deadlineOf(limits: Limits): number {
  return limits.timeLimitMs === undefined
    ? Infinity
    : performance.now() + limits.timeLimitMs;
}

function stopper(limits: Limits, deadline: number): () => boolean {
  return () => performance.now() > deadline || (limits.shouldStop?.() ?? false);
}

function enabledIds(problem: Problem): string[] {
  return problem.rules.filter((r) => r.enabled).map((r) => r.id);
}

/** A cancelled search is reported as such, any other stop as a spent budget. */
function reasonFor(limits: Limits): "budget" | "cancelled" {
  return limits.shouldStop?.() ? "cancelled" : "budget";
}

function checkInput(problem: Problem): void {
  const errors = validateShape(problem);
  if (errors.length > 0) throw new InvalidProblemError(errors.join("; "));
}

function capacityOutcome(problem: Problem): Outcome | null {
  const seats = usableSeats(problem.room).length;
  return problem.pupils.length > seats
    ? { status: "capacity", pupils: problem.pupils.length, seats }
    : null;
}

/** Finds a plan for the enabled rules, or explains why none exists. */
export function plan(
  problem: Problem,
  limits: Limits & { seed?: number; prefer?: Plan } = {},
): Outcome {
  return planUntil(problem, limits, deadlineOf(limits));
}

function planUntil(
  problem: Problem,
  limits: Limits & { seed?: number; prefer?: Plan },
  deadline: number,
): Outcome {
  checkInput(problem);
  const capacity = capacityOutcome(problem);
  if (capacity) return capacity;
  return run(
    problem,
    new Encoding(problem),
    enabledIds(problem),
    limits,
    deadline,
    limits.seed ?? 1,
    limits.prefer,
  );
}

function run(
  problem: Problem,
  encoding: Encoding,
  enabled: string[],
  limits: Limits,
  deadline: number,
  seed: number,
  prefer?: Plan,
): Outcome {
  const active = new Set(enabled);
  const seatOnly: Problem = {
    ...problem,
    rules: problem.rules.map((r) => ({ ...r, enabled: active.has(r.id) })),
  };
  const crowded = seatRuleConflict(seatOnly);
  if (crowded) return { status: "conflict", rules: crowded, minimal: true };

  const stop = stopper(limits, deadline);
  const { solver } = encoding;
  encoding.steer(seed, prefer);
  const options = { conflictBudget: limits.conflictBudget, shouldStop: stop };
  const status = solver.solve(encoding.assumptions(enabled), options);
  if (status === "sat") {
    return {
      status: "solved",
      plan: seatTheRest(problem, encoding.readPlan(), seed, prefer),
    };
  }
  if (status === "unknown") {
    return { status: "inconclusive", reason: reasonFor(limits) };
  }
  const core = encoding.rulesOf(solver.failedAssumptions());
  return shrink(encoding, core, limits, stop);
}

/** Pupils no rule mentions can sit anywhere, so they take the seats left over. */
function seatTheRest(
  problem: Problem,
  plan: Plan,
  seed: number,
  prefer?: Plan,
): Plan {
  const out = { ...plan };
  const taken = new Set(Object.values(out));
  const free = usableSeats(problem.room).filter((s) => !taken.has(s));
  const loose = problem.pupils.filter((p) => out[p.id] === undefined);
  for (const pupil of loose) {
    const wanted = prefer?.[pupil.id];
    const at = wanted === undefined ? -1 : free.indexOf(wanted);
    if (at >= 0) out[pupil.id] = free.splice(at, 1)[0];
  }
  let state = (seed * 2654435761) >>> 0 || 1;
  for (const pupil of loose) {
    if (out[pupil.id] !== undefined) continue;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    if (free.length === 0)
      throw new Error("no seat left for an unmentioned pupil");
    out[pupil.id] = free.splice(state % free.length, 1)[0];
  }
  return out;
}

/**
 * Deletion-based minimisation: drop each rule in turn and keep it dropped if
 * the rest still cannot hold. A call that gives up leaves the rule in and
 * clears `minimal`.
 */
function shrink(
  encoding: Encoding,
  start: string[],
  limits: Limits,
  stop: () => boolean,
): Outcome {
  let core = [...start];
  let minimal = true;
  for (const rule of start) {
    if (!core.includes(rule)) continue;
    const rest = core.filter((id) => id !== rule);
    const status = encoding.solver.solve(encoding.assumptions(rest), {
      conflictBudget: limits.conflictBudget,
      shouldStop: stop,
    });
    if (status === "unsat") {
      const next = encoding.rulesOf(encoding.solver.failedAssumptions());
      core = next.length < rest.length ? next : rest;
    } else if (status === "unknown") {
      minimal = false;
    }
  }
  return {
    status: "conflict",
    rules: encoding.problem.rules
      .map((r) => r.id)
      .filter((id) => core.includes(id)),
    minimal,
  };
}

/**
 * For each rule in a conflict, checks the whole remaining rule set with that
 * rule switched off, keeping the current plan's seats where it can.
 */
export function repairOptions(
  problem: Problem,
  conflict: string[],
  limits: Limits & { current?: Plan } = {},
): RepairOption[] {
  checkInput(problem);
  const deadline = deadlineOf(limits);
  return conflict.map((rule) => {
    // A fresh encoding per option, so each preview is exactly what planning
    // again with that rule off would give.
    const without: Problem = {
      ...problem,
      rules: problem.rules.map((r) =>
        r.id === rule ? { ...r, enabled: false } : r,
      ),
    };
    const outcome = planUntil(
      without,
      { ...limits, seed: 1, prefer: limits.current },
      deadline,
    );
    const changed =
      outcome.status === "solved" && limits.current
        ? changedPupils(limits.current, outcome.plan)
        : [];
    return { rule, outcome, changed };
  });
}

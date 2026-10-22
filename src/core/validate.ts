import {
  areAdjacent,
  rowOf,
  type Plan,
  type Problem,
  type Rule,
} from "./problem.ts";

export type Violation =
  | { type: "rule"; rule: string }
  | { type: "blocked"; pupil: string }
  | { type: "shared"; seat: number; pupils: string[] }
  | { type: "unseated"; pupil: string };

/**
 * Whether a plan satisfies one rule. A fixed-seat or front-row rule about an
 * unseated pupil is not satisfied, nor is a sit-together rule. A keep-apart rule is, since that pupil has
 * no seat to be near.
 */
export function ruleHolds(problem: Problem, plan: Plan, rule: Rule): boolean {
  const { room } = problem;
  switch (rule.kind) {
    case "pin":
      return plan[rule.pupil] === rule.seat;
    case "front": {
      const seat = plan[rule.pupil];
      return seat !== undefined && rowOf(room, seat) < rule.rows;
    }
    case "apart": {
      const a = plan[rule.a];
      const b = plan[rule.b];
      return a === undefined || b === undefined || !areAdjacent(room, a, b);
    }
    case "together": {
      const a = plan[rule.a];
      const b = plan[rule.b];
      return a !== undefined && b !== undefined && areAdjacent(room, a, b);
    }
  }
}

/**
 * Checks a plan against the room and the enabled rules without using the
 * solver, so it doubles as an independent oracle in the tests.
 */
export function validatePlan(
  problem: Problem,
  plan: Plan,
  options: { requireComplete?: boolean } = {},
): Violation[] {
  const out: Violation[] = [];
  const blocked = new Set(problem.room.blocked);
  const bySeat = new Map<number, string[]>();
  for (const pupil of problem.pupils) {
    const seat = plan[pupil.id];
    if (seat === undefined) {
      if (options.requireComplete)
        out.push({ type: "unseated", pupil: pupil.id });
      continue;
    }
    if (
      blocked.has(seat) ||
      seat < 0 ||
      seat >= problem.room.rows * problem.room.cols
    ) {
      out.push({ type: "blocked", pupil: pupil.id });
    }
    bySeat.set(seat, [...(bySeat.get(seat) ?? []), pupil.id]);
  }
  for (const [seat, pupils] of bySeat) {
    if (pupils.length > 1) out.push({ type: "shared", seat, pupils });
  }
  for (const rule of problem.rules) {
    if (rule.enabled && !ruleHolds(problem, plan, rule)) {
      out.push({ type: "rule", rule: rule.id });
    }
  }
  return out;
}

/** Pupils whose seat differs between two plans. */
export function changedPupils(before: Plan, after: Plan): string[] {
  return Object.keys(after).filter((id) => before[id] !== after[id]);
}

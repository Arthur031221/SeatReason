import { usableSeats, type Plan, type Problem, type Rule } from "./problem.ts";
import { validatePlan } from "./validate.ts";

/** Exhaustive search over every assignment. Only for small rooms in tests and the benchmark. */
export function bruteForce(problem: Problem, only?: Set<string>): Plan | null {
  const rules: Rule[] = problem.rules.filter(
    (r) => r.enabled && (!only || only.has(r.id)),
  );
  const sub: Problem = { ...problem, rules };
  const seats = usableSeats(problem.room);
  const plan: Plan = {};
  const used = new Set<number>();
  const place = (index: number): boolean => {
    if (index === problem.pupils.length) {
      return validatePlan(sub, plan, { requireComplete: true }).length === 0;
    }
    const id = problem.pupils[index].id;
    for (const seat of seats) {
      if (used.has(seat)) continue;
      used.add(seat);
      plan[id] = seat;
      if (place(index + 1)) return true;
      used.delete(seat);
      delete plan[id];
    }
    return false;
  };
  return place(0) ? { ...plan } : null;
}

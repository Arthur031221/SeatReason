import { usableSeats, rowOf, type Problem } from "./problem.ts";

/**
 * Pins and front-row requests only narrow which seats a pupil may take, so
 * checking them is bipartite matching: polynomial and exact. Doing it apart
 * from the SAT search matters, because a crowd of pupils competing for a few
 * seats is the case SAT solvers refute slowest.
 */

type SeatRule = Extract<Problem["rules"][number], { kind: "pin" | "front" }>;

function domains(
  problem: Problem,
  rules: SeatRule[],
): Map<string, Set<number>> {
  const all = usableSeats(problem.room);
  const out = new Map<string, Set<number>>();
  for (const rule of rules) {
    const current = out.get(rule.pupil) ?? new Set(all);
    for (const seat of current) {
      const allowed =
        rule.kind === "pin"
          ? seat === rule.seat
          : rowOf(problem.room, seat) < rule.rows;
      if (!allowed) current.delete(seat);
    }
    out.set(rule.pupil, current);
  }
  return out;
}

/** Pupils that cannot be matched when one pupil is left out, or null if everyone fits. */
function violator(domain: Map<string, Set<number>>): string[] | null {
  const owner = new Map<number, string>();
  const pupils = [...domain.keys()];
  for (const start of pupils) {
    const seenSeats = new Set<number>();
    const seenPupils = new Set<string>([start]);
    const augment = (pupil: string): boolean => {
      for (const seat of domain.get(pupil)!) {
        if (seenSeats.has(seat)) continue;
        seenSeats.add(seat);
        const holder = owner.get(seat);
        if (holder === undefined || (seenPupils.add(holder), augment(holder))) {
          owner.set(seat, pupil);
          return true;
        }
      }
      return false;
    };
    if (!augment(start)) return [...seenPupils];
  }
  return null;
}

function seatRules(problem: Problem, ids?: Set<string>): SeatRule[] {
  return problem.rules.filter(
    (r): r is SeatRule =>
      r.enabled && r.kind !== "apart" && (!ids || ids.has(r.id)),
  );
}

/**
 * Looks for a set of enabled pin and front rules that cannot hold together,
 * ignoring keep-apart rules. Returns a subset-minimal such set, or null when
 * the seat rules alone are satisfiable.
 */
export function seatRuleConflict(problem: Problem): string[] | null {
  const rules = seatRules(problem);
  const bad = violator(domains(problem, rules));
  if (!bad) return null;
  const involved = new Set(bad);
  let core = rules.filter((r) => involved.has(r.pupil));
  for (const rule of [...core]) {
    const rest = core.filter((r) => r !== rule);
    if (violator(domains(problem, rest))) core = rest;
  }
  return core.map((r) => r.id);
}

import { describe, expect, it } from "vitest";
import { plan, repairOptions, InvalidProblemError } from "./analyze.ts";
import { bruteForce } from "./oracle.ts";
import { isPairRule, type Problem, type Rule } from "./problem.ts";
import { validatePlan } from "./validate.ts";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randomProblem(random: () => number): Problem {
  const rows = 2 + Math.floor(random() * 2);
  const cols = 2 + Math.floor(random() * 3);
  const total = rows * cols;
  const blocked = Array.from({ length: total }, (_, i) => i).filter(
    () => random() < 0.15,
  );
  const free = total - blocked.length;
  const n = Math.min(free, 3 + Math.floor(random() * 3));
  const pupils = Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: i % 2 ? "Sam" : `Pupil ${i}`, // equal names, distinct ids
  }));
  const pick = () => pupils[Math.floor(random() * n)].id;
  const rules: Rule[] = Array.from(
    { length: 2 + Math.floor(random() * 7) },
    (_, i): Rule => {
      const roll = random();
      const base = { id: `r${i}`, enabled: random() < 0.9 };
      if (roll < 0.3) {
        return {
          ...base,
          kind: "pin",
          pupil: pick(),
          seat: Math.floor(random() * total),
        };
      }
      if (roll < 0.5) {
        return { ...base, kind: "front", pupil: pick(), rows: 1 };
      }
      const a = pick();
      let b = pick();
      while (b === a && n > 1) b = pick();
      return {
        ...base,
        kind: roll < 0.8 ? "apart" : "together",
        a,
        b: n > 1 ? b : a,
      };
    },
  ).filter((r) => !isPairRule(r) || r.a !== r.b);
  return { room: { rows, cols, blocked }, pupils, rules };
}

describe("plan", () => {
  it("agrees with exhaustive search on random small rooms", () => {
    const random = rng(2024);
    let solved = 0;
    let conflicts = 0;
    for (let round = 0; round < 300; round++) {
      const problem = randomProblem(random);
      const outcome = plan(problem, { seed: round });
      const expected = bruteForce(problem);
      if (expected) {
        expect(outcome.status).toBe("solved");
        if (outcome.status !== "solved") continue;
        solved++;
        expect(
          validatePlan(problem, outcome.plan, { requireComplete: true }),
        ).toEqual([]);
        continue;
      }
      expect(outcome.status).toBe("conflict");
      if (outcome.status !== "conflict") continue;
      conflicts++;
      expect(outcome.minimal).toBe(true);
      const core = new Set(outcome.rules);
      expect(bruteForce(problem, core)).toBeNull();
      for (const id of core) {
        const rest = new Set([...core].filter((x) => x !== id));
        expect(bruteForce(problem, rest)).not.toBeNull();
      }
    }
    expect(solved).toBeGreaterThan(30);
    expect(conflicts).toBeGreaterThan(30);
  });

  it("names a pair that must sit together and also apart", () => {
    const problem: Problem = {
      room: { rows: 2, cols: 3, blocked: [] },
      pupils: ["a", "b", "c"].map((id) => ({ id, name: id })),
      rules: [
        { id: "t", kind: "together", a: "a", b: "b", enabled: true },
        { id: "x", kind: "apart", a: "b", b: "a", enabled: true },
        { id: "f", kind: "front", pupil: "c", rows: 1, enabled: true },
      ],
    };
    expect(plan(problem)).toMatchObject({
      status: "conflict",
      minimal: true,
      rules: ["t", "x"],
    });
  });

  it("seats a pupil next to a pinned corner and finds no seat for a lone desk", () => {
    const together = (id: string): Rule => ({
      id,
      kind: "together",
      a: "a",
      b: "b",
      enabled: true,
    });
    const pinned: Problem = {
      room: { rows: 2, cols: 2, blocked: [] },
      pupils: ["a", "b"].map((id) => ({ id, name: id })),
      rules: [
        { id: "p", kind: "pin", pupil: "a", seat: 0, enabled: true },
        together("t"),
      ],
    };
    const solved = plan(pinned);
    expect(solved.status).toBe("solved");
    if (solved.status === "solved") {
      expect([1, 2]).toContain(solved.plan.b);
    }
    // Seats 0 and 3 touch only blocked or diagonal seats, so a lone pair cannot meet.
    const apartRoom: Problem = {
      room: { rows: 2, cols: 2, blocked: [1, 2] },
      pupils: pinned.pupils,
      rules: [together("t")],
    };
    expect(plan(apartRoom)).toMatchObject({ status: "conflict", rules: ["t"] });
  });

  it("reports a capacity failure before any rule is looked at", () => {
    const problem: Problem = {
      room: { rows: 1, cols: 3, blocked: [1] },
      pupils: ["a", "b", "c"].map((id) => ({ id, name: id })),
      rules: [],
    };
    expect(plan(problem)).toEqual({ status: "capacity", pupils: 3, seats: 2 });
  });

  it("keeps pupils with equal names apart by id", () => {
    const problem: Problem = {
      room: { rows: 1, cols: 3, blocked: [] },
      pupils: [
        { id: "a", name: "Sam" },
        { id: "b", name: "Sam" },
      ],
      rules: [{ id: "r", kind: "pin", pupil: "b", seat: 0, enabled: true }],
    };
    const outcome = plan(problem);
    expect(outcome.status).toBe("solved");
    if (outcome.status === "solved") {
      expect(outcome.plan.b).toBe(0);
      expect(outcome.plan.a).not.toBe(0);
    }
  });

  it("blames a pin on a blocked seat and nothing else", () => {
    const problem: Problem = {
      room: { rows: 2, cols: 2, blocked: [3] },
      pupils: ["a", "b"].map((id) => ({ id, name: id })),
      rules: [
        { id: "bad", kind: "pin", pupil: "a", seat: 3, enabled: true },
        { id: "ok", kind: "front", pupil: "b", rows: 1, enabled: true },
      ],
    };
    expect(plan(problem)).toEqual({
      status: "conflict",
      rules: ["bad"],
      minimal: true,
    });
  });

  it("rejects malformed input", () => {
    const problem: Problem = {
      room: { rows: 9, cols: 9, blocked: [] },
      pupils: [],
      rules: [],
    };
    expect(() => plan(problem)).toThrow(InvalidProblemError);
  });

  it("returns the same plan for the same seed and a different one for another", () => {
    const problem: Problem = {
      room: { rows: 4, cols: 5, blocked: [] },
      pupils: Array.from({ length: 12 }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
      })),
      rules: [],
    };
    const a = plan(problem, { seed: 1 });
    const b = plan(problem, { seed: 1 });
    const c = plan(problem, { seed: 2 });
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("says inconclusive, never conflict, when the budget is too small", () => {
    // Nine pupils who must all sit apart, but a 4 x 4 room only has 8 seats
    // that are pairwise non-adjacent.
    const problem: Problem = {
      room: { rows: 4, cols: 4, blocked: [] },
      pupils: Array.from({ length: 9 }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
      })),
      rules: [],
    };
    for (let a = 0; a < 9; a++) {
      for (let b = a + 1; b < 9; b++) {
        problem.rules.push({
          id: `a${a}-${b}`,
          kind: "apart",
          a: `p${a}`,
          b: `p${b}`,
          enabled: true,
        });
      }
    }
    expect(plan(problem, { conflictBudget: 5 })).toEqual({
      status: "inconclusive",
      reason: "budget",
    });
    const cancelled = plan(problem, { shouldStop: () => true });
    expect(cancelled.status).toBe("inconclusive");
  });

  it("proves a clique of keep-apart rules impossible when the room is too tight", () => {
    // A 3 x 3 room has at most 5 pairwise non-adjacent seats.
    const pupils = Array.from({ length: 6 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
    }));
    const rules: Rule[] = [];
    for (let a = 0; a < 6; a++) {
      for (let b = a + 1; b < 6; b++) {
        rules.push({
          id: `a${a}-${b}`,
          kind: "apart",
          a: `p${a}`,
          b: `p${b}`,
          enabled: true,
        });
      }
    }
    const problem: Problem = {
      room: { rows: 3, cols: 3, blocked: [] },
      pupils,
      rules,
    };
    const outcome = plan(problem);
    expect(outcome).toMatchObject({ status: "conflict", minimal: true });
    if (outcome.status !== "conflict") return;
    expect(bruteForce(problem, new Set(outcome.rules))).toBeNull();
    for (const id of outcome.rules) {
      const rest = new Set(outcome.rules.filter((x) => x !== id));
      expect(bruteForce(problem, rest)).not.toBeNull();
    }
  });
});

describe("repairOptions", () => {
  it("reports a capacity failure instead of a plan with someone unseated", () => {
    const problem: Problem = {
      room: { rows: 1, cols: 2, blocked: [] },
      pupils: ["a", "b", "c"].map((id) => ({ id, name: id })),
      rules: [
        { id: "x", kind: "pin", pupil: "a", seat: 0, enabled: true },
        { id: "y", kind: "pin", pupil: "b", seat: 0, enabled: true },
      ],
    };
    const options = repairOptions(problem, ["x", "y"]);
    expect(options.map((o) => o.outcome.status)).toEqual([
      "capacity",
      "capacity",
    ]);
  });

  it("matches exhaustive search for each rule in a conflict", () => {
    const random = rng(99);
    let checked = 0;
    for (let round = 0; round < 200 && checked < 40; round++) {
      const problem = randomProblem(random);
      const outcome = plan(problem);
      if (outcome.status !== "conflict") continue;
      const options = repairOptions(problem, outcome.rules);
      for (const option of options) {
        const rest = new Set(
          problem.rules
            .filter((r) => r.enabled && r.id !== option.rule)
            .map((r) => r.id),
        );
        const expected = bruteForce(problem, rest);
        expect(option.outcome.status).toBe(expected ? "solved" : "conflict");
        if (option.outcome.status === "solved") {
          const sub: Problem = {
            ...problem,
            rules: problem.rules.map((r) =>
              r.id === option.rule ? { ...r, enabled: false } : r,
            ),
          };
          expect(
            validatePlan(sub, option.outcome.plan, { requireComplete: true }),
          ).toEqual([]);
        }
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("keeps most of the current plan when it can", () => {
    const pupils = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      name: `P${i}`,
    }));
    const base: Problem = {
      room: { rows: 3, cols: 4, blocked: [] },
      pupils,
      rules: [
        { id: "a", kind: "pin", pupil: "p0", seat: 0, enabled: true },
        { id: "b", kind: "pin", pupil: "p1", seat: 0, enabled: true },
      ],
    };
    const first = plan({ ...base, rules: [base.rules[0]] });
    expect(first.status).toBe("solved");
    if (first.status !== "solved") return;
    const conflict = plan(base);
    expect(conflict).toMatchObject({ status: "conflict", rules: ["a", "b"] });
    const options = repairOptions(base, ["a", "b"], { current: first.plan });
    const relaxB = options.find((o) => o.rule === "b")!;
    expect(relaxB.outcome.status).toBe("solved");
    expect(relaxB.changed).toEqual([]);
    expect(
      options.find((o) => o.rule === "a")!.changed.length,
    ).toBeLessThanOrEqual(2);
  });
});

import { describe, expect, it } from "vitest";
import { Solver } from "./sat.ts";

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bruteForce(nVars: number, clauses: number[][], fixed: number[]) {
  for (let mask = 0; mask < 1 << nVars; mask++) {
    const value = (lit: number) =>
      Boolean((mask >> (Math.abs(lit) - 1)) & 1) === lit > 0;
    if (fixed.every(value) && clauses.every((c) => c.some(value))) return true;
  }
  return false;
}

function build(nVars: number, clauses: number[][]) {
  const solver = new Solver();
  for (let i = 0; i < nVars; i++) solver.newVar();
  for (const clause of clauses) solver.addClause(clause);
  return solver;
}

describe("Solver", () => {
  it("solves a tiny formula and reports the model", () => {
    const solver = build(3, [
      [1, 2],
      [-1, 3],
      [-2, -3],
    ]);
    expect(solver.solve()).toBe("sat");
    const m = (v: number) => solver.modelValue(v);
    expect(m(1) || m(2)).toBe(true);
    expect(!m(1) || m(3)).toBe(true);
    expect(!m(2) || !m(3)).toBe(true);
  });

  it("detects an empty clause and a contradictory pair of units", () => {
    expect(build(1, [[1], [-1]]).solve()).toBe("unsat");
    const solver = build(1, []);
    expect(solver.addClause([])).toBe(false);
    expect(solver.solve()).toBe("unsat");
  });

  it("agrees with brute force on random 3-CNF formulas with assumptions", () => {
    const random = mulberry32(7);
    for (let round = 0; round < 400; round++) {
      const nVars = 4 + Math.floor(random() * 7);
      const nClauses = Math.floor(nVars * (3 + random() * 2.5));
      const clauses = Array.from({ length: nClauses }, () =>
        Array.from({ length: 3 }, () => {
          const v = 1 + Math.floor(random() * nVars);
          return random() < 0.5 ? v : -v;
        }),
      );
      const assumptions = Array.from(
        { length: Math.floor(random() * 4) },
        () => {
          const v = 1 + Math.floor(random() * nVars);
          return random() < 0.5 ? v : -v;
        },
      );
      const solver = build(nVars, clauses);
      const status = solver.solve(assumptions);
      expect(status).toBe(
        bruteForce(nVars, clauses, assumptions) ? "sat" : "unsat",
      );
      if (status === "sat") {
        for (const lit of assumptions) {
          expect(solver.modelValue(Math.abs(lit))).toBe(lit > 0);
        }
        for (const clause of clauses) {
          expect(
            clause.some((l) => solver.modelValue(Math.abs(l)) === l > 0),
          ).toBe(true);
        }
      } else {
        const failed = solver.failedAssumptions();
        expect(failed.every((lit) => assumptions.includes(lit))).toBe(true);
        // The failed subset alone must already be unsatisfiable.
        expect(bruteForce(nVars, clauses, failed)).toBe(false);
      }
    }
  });

  it("can be reused: add clauses and solve again", () => {
    const solver = build(2, [[1, 2]]);
    expect(solver.solve([-1])).toBe("sat");
    expect(solver.modelValue(2)).toBe(true);
    solver.addClause([-2]);
    expect(solver.solve([-1])).toBe("unsat");
    expect(solver.failedAssumptions()).toEqual([-1]);
    expect(solver.solve()).toBe("sat");
  });

  it("reports unknown, not unsat, when the conflict budget runs out", () => {
    // Pigeonhole 9 into 8 needs many conflicts to refute.
    const holes = 8;
    const solver = new Solver();
    const x = (p: number, h: number) => p * holes + h + 1;
    for (let i = 0; i < (holes + 1) * holes; i++) solver.newVar();
    for (let p = 0; p <= holes; p++) {
      solver.addClause(Array.from({ length: holes }, (_, h) => x(p, h)));
    }
    for (let h = 0; h < holes; h++) {
      for (let a = 0; a <= holes; a++) {
        for (let b = a + 1; b <= holes; b++) {
          solver.addClause([-x(a, h), -x(b, h)]);
        }
      }
    }
    expect(solver.solve([], { conflictBudget: 20 })).toBe("unknown");
    expect(solver.solve([], { conflictBudget: 5_000_000 })).toBe("unsat");
  });

  it("stops when asked", () => {
    const solver = build(2, [[1, 2]]);
    expect(solver.solve([], { shouldStop: () => true })).toBe("sat");
  });
});

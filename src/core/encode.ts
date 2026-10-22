import {
  adjacentPairs,
  usableSeats,
  type Plan,
  type Problem,
} from "./problem.ts";
import { Solver } from "./sat.ts";

/**
 * One SAT instance for a problem. Every rule gets a selector variable, so a
 * check with a different set of enabled rules is only a different list of
 * assumptions and the learnt clauses carry over.
 */
export class Encoding {
  readonly solver = new Solver();
  /** pupil id to seat to variable. */
  private readonly place = new Map<string, Map<number, number>>();
  private readonly selectors = new Map<string, number>();
  private readonly ruleBySelector = new Map<number, string>();

  constructor(readonly problem: Problem) {
    const { room, pupils, rules } = problem;
    const seats = usableSeats(room);
    // Pupils that no rule mentions need no variables: they take leftover seats.
    const named = new Set(
      rules.flatMap((r) => (r.kind === "apart" ? [r.a, r.b] : [r.pupil])),
    );
    const constrained = pupils.filter((p) => named.has(p.id));
    for (const pupil of constrained) {
      const row = new Map<number, number>();
      for (const seat of seats) row.set(seat, this.solver.newVar());
      this.place.set(pupil.id, row);
    }
    // Everyone gets a seat, and nobody gets two.
    for (const pupil of constrained) {
      const vars = [...this.place.get(pupil.id)!.values()];
      this.solver.addClause(vars);
      this.atMostOne(vars);
    }
    // A seat holds at most one pupil.
    for (const seat of seats) {
      this.atMostOne(constrained.map((p) => this.var(p.id, seat)!));
    }

    const pairs = adjacentPairs(room);
    for (const rule of rules) {
      const sel = this.solver.newVar();
      this.selectors.set(rule.id, sel);
      this.ruleBySelector.set(sel, rule.id);
      if (rule.kind === "pin") {
        const v = this.var(rule.pupil, rule.seat);
        this.solver.addClause(v === undefined ? [-sel] : [-sel, v]);
      } else if (rule.kind === "front") {
        for (const seat of seats) {
          if (Math.floor(seat / room.cols) >= rule.rows) {
            this.solver.addClause([-sel, -this.var(rule.pupil, seat)!]);
          }
        }
      } else {
        for (const [s, t] of pairs) {
          for (const [x, y] of [
            [s, t],
            [t, s],
          ]) {
            this.solver.addClause([
              -sel,
              -this.var(rule.a, x)!,
              -this.var(rule.b, y)!,
            ]);
          }
        }
      }
    }
  }

  private var(pupil: string, seat: number): number | undefined {
    return this.place.get(pupil)?.get(seat);
  }

  private atMostOne(vars: number[]): void {
    for (let i = 0; i < vars.length; i++) {
      for (let j = i + 1; j < vars.length; j++) {
        this.solver.addClause([-vars[i], -vars[j]]);
      }
    }
  }

  assumptions(enabled: Iterable<string>): number[] {
    return [...enabled].map((id) => this.selectors.get(id)!);
  }

  /** Rule ids for failed assumption literals, in the order the teacher listed them. */
  rulesOf(failed: number[]): string[] {
    const ids = new Set(failed.map((lit) => this.ruleBySelector.get(lit)!));
    return this.problem.rules.map((r) => r.id).filter((id) => ids.has(id));
  }

  /**
   * Biases the next search toward a plan: `prefer` seats are tried first and
   * `seed` shuffles the rest, so equal inputs and seeds give equal plans.
   */
  steer(seed: number, prefer?: Plan): void {
    let state = seed >>> 0 || 1;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (const row of this.place.values()) {
      for (const v of row.values()) this.solver.setActivity(v, random() * 0.5);
    }
    if (!prefer) return;
    // Seats held by pupils without rules stay theirs; everything else is a
    // pool the constrained pupils drift into, starting from their own seat.
    const reserved = new Set(
      Object.entries(prefer)
        .filter(([pupil]) => !this.place.has(pupil))
        .map(([, seat]) => seat),
    );
    for (const [pupil, row] of this.place) {
      for (const [seat, v] of row) {
        if (reserved.has(seat)) continue;
        this.solver.setPhase(v, true);
        this.solver.setActivity(v, prefer[pupil] === seat ? 1000 : 500);
      }
    }
  }

  readPlan(): Plan {
    const plan: Plan = {};
    for (const [pupil, row] of this.place) {
      for (const [seat, v] of row) {
        if (this.solver.modelValue(v)) plan[pupil] = seat;
      }
    }
    return plan;
  }
}

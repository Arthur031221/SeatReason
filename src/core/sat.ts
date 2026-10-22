/**
 * A small CDCL SAT solver with assumptions, written for SeatReason.
 *
 * Public literals are DIMACS style: variable `v` (1-based) is `v`, its
 * negation is `-v`. Internally a literal is `2 * (v - 1) + (negated ? 1 : 0)`.
 *
 * What the planner needs from it:
 *  - solving under assumptions, so each teacher rule is one switchable literal
 *  - a failed-assumption set (the rules that cannot all hold)
 *  - a conflict budget and a stop callback, so a hard search ends as
 *    "unknown" instead of being mistaken for "impossible"
 *  - initial phases and activities, so a repair stays close to the old plan
 */

export type SatStatus = "sat" | "unsat" | "unknown";

export interface SolveOptions {
  /** Give up with "unknown" after this many conflicts. */
  conflictBudget?: number;
  /** Polled now and then; return true to give up with "unknown". */
  shouldStop?: () => boolean;
}

interface Clause {
  lits: Int32Array;
  learnt: boolean;
  activity: number;
  removed: boolean;
}

const TRUE = 1;
const FALSE = -1;
const UNDEF = 0;

const neg = (lit: number) => lit ^ 1;
const varOf = (lit: number) => lit >> 1;
const toInternal = (lit: number) =>
  lit > 0 ? 2 * (lit - 1) : 2 * (-lit - 1) + 1;
const toPublic = (lit: number) =>
  lit & 1 ? -((lit >> 1) + 1) : (lit >> 1) + 1;

function luby(index: number): number {
  let size = 1;
  let seq = 0;
  while (size < index + 1) {
    seq++;
    size = 2 * size + 1;
  }
  let x = index;
  while (size - 1 !== x) {
    size = (size - 1) >> 1;
    seq--;
    x %= size;
  }
  return 2 ** seq;
}

export class Solver {
  private nVars = 0;
  private values = new Int8Array(0); // by literal
  private level: number[] = [];
  private reason: (Clause | null)[] = [];
  private phase: boolean[] = [];
  private activity: number[] = [];
  private seen: Uint8Array = new Uint8Array(0);
  private watches: Clause[][] = [];
  private clauses: Clause[] = [];
  private learnts: Clause[] = [];
  private trail: number[] = [];
  private trailLim: number[] = [];
  private qhead = 0;
  private heap: number[] = [];
  private heapPos: number[] = [];
  private varInc = 1;
  private claInc = 1;
  private ok = true;
  private modelValues: boolean[] = [];
  private failed: number[] = [];

  /** Total conflicts seen over the lifetime of the solver. */
  conflicts = 0;

  newVar(): number {
    const v = this.nVars++;
    this.values = grow(this.values, 2 * this.nVars);
    this.level.push(0);
    this.reason.push(null);
    this.phase.push(false);
    this.activity.push(0);
    this.seen = grow(this.seen, this.nVars);
    this.watches.push([], []);
    this.heapPos.push(-1);
    this.heapInsert(v);
    return v + 1;
  }

  get variableCount(): number {
    return this.nVars;
  }

  /** Adds a clause at decision level 0. Returns false once the formula is unsatisfiable. */
  addClause(publicLits: readonly number[]): boolean {
    if (!this.ok) return false;
    this.cancelUntil(0);
    const lits: number[] = [];
    for (const p of publicLits) {
      const lit = toInternal(p);
      if (varOf(lit) >= this.nVars) throw new Error(`unknown variable ${p}`);
      if (this.values[lit] === TRUE || lits.includes(neg(lit))) return true;
      if (this.values[lit] !== FALSE && !lits.includes(lit)) lits.push(lit);
    }
    if (lits.length === 0) return (this.ok = false);
    if (lits.length === 1) {
      this.enqueue(lits[0], null);
      return (this.ok = this.propagate() === null);
    }
    this.attach(this.makeClause(lits, false));
    return true;
  }

  /** Preferred value for a variable the first time the search decides it. */
  setPhase(v: number, value: boolean): void {
    this.phase[v - 1] = value;
  }

  /** Raises a variable's decision priority; higher values are decided first. */
  setActivity(v: number, value: number): void {
    this.activity[v - 1] = value;
    this.heapUpdate(v - 1);
  }

  solve(
    assumptions: readonly number[] = [],
    options: SolveOptions = {},
  ): SatStatus {
    this.failed = [];
    if (!this.ok) return "unsat";
    const assumed = assumptions.map(toInternal);
    const budget = options.conflictBudget ?? Infinity;
    const startConflicts = this.conflicts;
    let restarts = 0;
    let maxLearnts = Math.max(2000, this.clauses.length / 2);
    let polls = 0;
    const stop = () =>
      this.conflicts - startConflicts >= budget ||
      (++polls % 32 === 0 && (options.shouldStop?.() ?? false));
    for (;;) {
      const limit = 100 * luby(restarts++);
      const result = this.search(assumed, limit, stop, maxLearnts);
      if (result !== "restart") {
        this.cancelUntil(0);
        return result;
      }
      maxLearnts *= 1.05;
    }
  }

  /** Value of a variable in the last satisfying assignment. */
  modelValue(v: number): boolean {
    return this.modelValues[v - 1] ?? false;
  }

  /** After "unsat": the assumptions that cannot hold together (empty if the formula alone is unsatisfiable). */
  failedAssumptions(): number[] {
    return this.failed.map(toPublic);
  }

  private search(
    assumed: number[],
    restartLimit: number,
    shouldStop: () => boolean,
    maxLearnts: number,
  ): SatStatus | "restart" {
    let conflictsHere = 0;
    for (;;) {
      const conflict = this.propagate();
      if (conflict) {
        this.conflicts++;
        conflictsHere++;
        if (this.decisionLevel() === 0) {
          this.ok = false;
          return "unsat";
        }
        const [learnt, backLevel] = this.analyze(conflict);
        this.cancelUntil(backLevel);
        if (learnt.length === 1) {
          this.enqueue(learnt[0], null);
        } else {
          const clause = this.makeClause(learnt, true);
          this.attach(clause);
          this.bumpClause(clause);
          this.enqueue(learnt[0], clause);
        }
        this.varInc /= 0.95;
        this.claInc /= 0.999;
        if (shouldStop()) return "unknown";
        continue;
      }
      if (conflictsHere >= restartLimit) {
        this.cancelUntil(0);
        return "restart";
      }
      if (this.learnts.length - this.trail.length >= maxLearnts) {
        this.reduceLearnts();
      }
      let next = -1;
      while (this.decisionLevel() < assumed.length) {
        const a = assumed[this.decisionLevel()];
        if (this.values[a] === TRUE) {
          this.trailLim.push(this.trail.length);
        } else if (this.values[a] === FALSE) {
          this.failed = this.analyzeFinal(neg(a), a);
          return "unsat";
        } else {
          next = a;
          break;
        }
      }
      if (next < 0) {
        next = this.pickBranch();
        if (next < 0) {
          this.modelValues = Array.from(
            { length: this.nVars },
            (_, v) => this.values[2 * v] === TRUE,
          );
          return "sat";
        }
      }
      this.trailLim.push(this.trail.length);
      this.enqueue(next, null);
    }
  }

  private decisionLevel(): number {
    return this.trailLim.length;
  }

  private makeClause(lits: number[], learnt: boolean): Clause {
    const clause: Clause = {
      lits: Int32Array.from(lits),
      learnt,
      activity: 0,
      removed: false,
    };
    (learnt ? this.learnts : this.clauses).push(clause);
    return clause;
  }

  private attach(clause: Clause): void {
    this.watches[clause.lits[0]].push(clause);
    this.watches[clause.lits[1]].push(clause);
  }

  private enqueue(lit: number, from: Clause | null): void {
    this.values[lit] = TRUE;
    this.values[neg(lit)] = FALSE;
    const v = varOf(lit);
    this.level[v] = this.decisionLevel();
    this.reason[v] = from;
    this.trail.push(lit);
  }

  private propagate(): Clause | null {
    while (this.qhead < this.trail.length) {
      const falseLit = neg(this.trail[this.qhead++]);
      const ws = this.watches[falseLit];
      let i = 0;
      let j = 0;
      let conflict: Clause | null = null;
      while (i < ws.length) {
        const clause = ws[i++];
        if (clause.removed) continue;
        const lits = clause.lits;
        if (lits[0] === falseLit) {
          lits[0] = lits[1];
          lits[1] = falseLit;
        }
        const first = lits[0];
        if (this.values[first] === TRUE) {
          ws[j++] = clause;
          continue;
        }
        let moved = false;
        for (let k = 2; k < lits.length; k++) {
          if (this.values[lits[k]] !== FALSE) {
            lits[1] = lits[k];
            lits[k] = falseLit;
            this.watches[lits[1]].push(clause);
            moved = true;
            break;
          }
        }
        if (moved) continue;
        ws[j++] = clause;
        if (this.values[first] === FALSE) {
          conflict = clause;
          this.qhead = this.trail.length;
          while (i < ws.length) ws[j++] = ws[i++];
        } else {
          this.enqueue(first, clause);
        }
      }
      ws.length = j;
      if (conflict) return conflict;
    }
    return null;
  }

  /** First-UIP conflict analysis. Returns the learnt clause (asserting literal first) and the backjump level. */
  private analyze(conflict: Clause): [number[], number] {
    const learnt: number[] = [0];
    const marked: number[] = [];
    let pathCount = 0;
    let p = -1;
    let index = this.trail.length - 1;
    let clause: Clause | null = conflict;
    do {
      if (clause!.learnt) this.bumpClause(clause!);
      const lits = clause!.lits;
      for (let k = p === -1 ? 0 : 1; k < lits.length; k++) {
        const q = lits[k];
        const v = varOf(q);
        if (!this.seen[v] && this.level[v] > 0) {
          this.seen[v] = 1;
          marked.push(v);
          this.bumpVar(v);
          if (this.level[v] >= this.decisionLevel()) pathCount++;
          else learnt.push(q);
        }
      }
      while (!this.seen[varOf(this.trail[index--])]);
      p = this.trail[index + 1];
      clause = this.reason[varOf(p)];
      pathCount--;
    } while (pathCount > 0);
    learnt[0] = neg(p);

    // Drop literals implied by the others through their reason clauses.
    let kept = 1;
    for (let k = 1; k < learnt.length; k++) {
      const reason = this.reason[varOf(learnt[k])];
      const redundant =
        reason !== null &&
        reason.lits.every(
          (q, idx) =>
            idx === 0 ||
            this.seen[varOf(q)] === 1 ||
            this.level[varOf(q)] === 0,
        );
      if (!redundant) learnt[kept++] = learnt[k];
    }
    learnt.length = kept;
    for (const v of marked) this.seen[v] = 0;

    let back = 0;
    if (learnt.length > 1) {
      let best = 1;
      for (let k = 2; k < learnt.length; k++) {
        if (this.level[varOf(learnt[k])] > this.level[varOf(learnt[best])]) {
          best = k;
        }
      }
      [learnt[1], learnt[best]] = [learnt[best], learnt[1]];
      back = this.level[varOf(learnt[1])];
    }
    return [learnt, back];
  }

  /** The assumptions that imply `falsified` (the negation of a failed assumption). */
  private analyzeFinal(falsified: number, assumption: number): number[] {
    const out = [assumption];
    if (this.decisionLevel() === 0) return out;
    const marked: number[] = [];
    this.seen[varOf(falsified)] = 1;
    marked.push(varOf(falsified));
    for (let i = this.trail.length - 1; i >= this.trailLim[0]; i--) {
      const lit = this.trail[i];
      const v = varOf(lit);
      if (!this.seen[v]) continue;
      const reason = this.reason[v];
      if (reason === null) {
        if (this.level[v] > 0) out.push(lit);
      } else {
        for (let k = 1; k < reason.lits.length; k++) {
          const u = varOf(reason.lits[k]);
          if (this.level[u] > 0 && !this.seen[u]) {
            this.seen[u] = 1;
            marked.push(u);
          }
        }
      }
    }
    for (const v of marked) this.seen[v] = 0;
    return out;
  }

  private cancelUntil(level: number): void {
    if (this.decisionLevel() <= level) return;
    for (let i = this.trail.length - 1; i >= this.trailLim[level]; i--) {
      const lit = this.trail[i];
      const v = varOf(lit);
      this.values[lit] = UNDEF;
      this.values[neg(lit)] = UNDEF;
      this.phase[v] = (lit & 1) === 0;
      this.reason[v] = null;
      if (this.heapPos[v] < 0) this.heapInsert(v);
    }
    this.qhead = this.trailLim[level];
    this.trail.length = this.trailLim[level];
    this.trailLim.length = level;
  }

  private pickBranch(): number {
    while (this.heap.length > 0) {
      const v = this.heapPop();
      if (this.values[2 * v] === UNDEF) return 2 * v + (this.phase[v] ? 0 : 1);
    }
    return -1;
  }

  private reduceLearnts(): void {
    this.learnts.sort((a, b) => a.activity - b.activity);
    const half = this.learnts.length >> 1;
    const kept: Clause[] = [];
    this.learnts.forEach((clause, idx) => {
      const lits = clause.lits;
      const locked =
        this.values[lits[0]] === TRUE && this.reason[varOf(lits[0])] === clause;
      if (idx < half && lits.length > 2 && !locked) clause.removed = true;
      else kept.push(clause);
    });
    this.learnts = kept;
  }

  private bumpVar(v: number): void {
    if ((this.activity[v] += this.varInc) > 1e100) {
      for (let k = 0; k < this.nVars; k++) this.activity[k] *= 1e-100;
      this.varInc *= 1e-100;
    }
    this.heapUpdate(v);
  }

  private bumpClause(clause: Clause): void {
    if ((clause.activity += this.claInc) > 1e20) {
      for (const c of this.learnts) c.activity *= 1e-20;
      this.claInc *= 1e-20;
    }
  }

  // Max-heap of variables ordered by activity.
  private heapInsert(v: number): void {
    this.heapPos[v] = this.heap.length;
    this.heap.push(v);
    this.siftUp(this.heapPos[v]);
  }

  private heapUpdate(v: number): void {
    if (this.heapPos[v] >= 0) this.siftUp(this.heapPos[v]);
  }

  private heapPop(): number {
    const top = this.heap[0];
    const last = this.heap.pop()!;
    this.heapPos[top] = -1;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapPos[last] = 0;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    const v = this.heap[i];
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.activity[this.heap[parent]] >= this.activity[v]) break;
      this.heap[i] = this.heap[parent];
      this.heapPos[this.heap[i]] = i;
      i = parent;
    }
    this.heap[i] = v;
    this.heapPos[v] = i;
  }

  private siftDown(i: number): void {
    const v = this.heap[i];
    for (;;) {
      let child = 2 * i + 1;
      if (child >= this.heap.length) break;
      if (
        child + 1 < this.heap.length &&
        this.activity[this.heap[child + 1]] > this.activity[this.heap[child]]
      ) {
        child++;
      }
      if (this.activity[this.heap[child]] <= this.activity[v]) break;
      this.heap[i] = this.heap[child];
      this.heapPos[this.heap[i]] = i;
      i = child;
    }
    this.heap[i] = v;
    this.heapPos[v] = i;
  }
}

function grow<T extends Int8Array | Uint8Array>(array: T, length: number): T {
  if (array.length >= length) return array;
  const next = new (array.constructor as new (n: number) => T)(
    Math.max(length, array.length * 2),
  );
  next.set(array);
  return next;
}

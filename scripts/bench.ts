/**
 * Measures the planner on full-size classes (40 pupils, 6 x 8 seats).
 * Run with `npm run bench`. Numbers depend on the machine, so the README
 * quotes the method and the range over five runs. The bench gives
 * planning 20 s and repair previews no limit, the app shares 8 s.
 */
import { plan, repairOptions } from "../src/core/analyze.ts";
import { seatRuleConflict } from "../src/core/hall.ts";
import type { Problem, Rule } from "../src/core/problem.ts";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const pupils = Array.from({ length: 40 }, (_, i) => ({
  id: `p${i}`,
  name: `Pupil ${i}`,
}));
const room = { rows: 6, cols: 8, blocked: [] as number[] };

function randomRules(random: () => number, count: number): Rule[] {
  return Array.from({ length: count }, (_, i): Rule => {
    const roll = random();
    const pick = () => `p${Math.floor(random() * 40)}`;
    const base = { id: `r${i}`, enabled: true };
    if (roll < 0.25)
      return {
        ...base,
        kind: "pin",
        pupil: pick(),
        seat: Math.floor(random() * 48),
      };
    if (roll < 0.5) return { ...base, kind: "front", pupil: pick(), rows: 2 };
    const a = pick();
    let b = pick();
    while (a === b) b = pick();
    return { ...base, kind: "apart", a, b };
  });
}

function time<T>(fn: () => T): [T, number] {
  const start = performance.now();
  const value = fn();
  return [value, performance.now() - start];
}

const random = rng(5);
const stats: Record<string, number[]> = {};
const repairs: number[] = [];
for (let round = 0; round < 40; round++) {
  const problem: Problem = {
    room,
    pupils,
    rules: randomRules(random, 12 + (round % 20)),
  };
  const [outcome, ms] = time(() => plan(problem, { timeLimitMs: 20000 }));
  // Pin and front rules alone can already clash. Those are found by matching,
  // without the SAT solver.
  const label =
    outcome.status === "conflict"
      ? seatRuleConflict(problem)
        ? "conflict, seat rules alone"
        : "conflict, needs the SAT solver"
      : outcome.status;
  (stats[label] ??= []).push(ms);
  if (outcome.status === "conflict") {
    repairs.push(time(() => repairOptions(problem, outcome.rules))[1]);
  }
}
function report(name: string, values: number[]) {
  values.sort((a, b) => a - b);
  console.log(
    `${name.padEnd(32)} n=${String(values.length).padStart(2)}  median ${values[values.length >> 1].toFixed(0)} ms  max ${values[values.length - 1].toFixed(0)} ms`,
  );
}
for (const [name, values] of Object.entries(stats)) report(name, values);
if (repairs.length > 0) report("repair previews, all conflicts", repairs);

// Eight pupils who must all sit in the eight front seats, with keep-apart
// pairs among them. The seat rules alone can always hold, so a conflict here
// has to come from the SAT solver.
const tight: Record<string, number[]> = {};
const tightRepairs: number[] = [];
const tightRandom = rng(11);
for (let round = 0; round < 80; round++) {
  const rules: Rule[] = Array.from({ length: 8 }, (_, i) => ({
    id: `f${i}`,
    kind: "front",
    pupil: `p${i}`,
    rows: 1,
    enabled: true,
  }));
  const pairs = 14 + (round % 13);
  const seen = new Set<string>();
  while (seen.size < pairs) {
    const a = Math.floor(tightRandom() * 8);
    const b = Math.floor(tightRandom() * 8);
    if (a === b || seen.has(`${Math.min(a, b)}-${Math.max(a, b)}`)) continue;
    seen.add(`${Math.min(a, b)}-${Math.max(a, b)}`);
    rules.push({
      id: `a${seen.size}`,
      kind: "apart",
      a: `p${a}`,
      b: `p${b}`,
      enabled: true,
    });
  }
  const problem: Problem = { room, pupils, rules };
  const [outcome, ms] = time(() => plan(problem, { timeLimitMs: 20000 }));
  const label =
    outcome.status === "conflict"
      ? `conflict, SAT, ${outcome.minimal ? "minimal" : "not proven minimal"}`
      : outcome.status;
  (tight[label] ??= []).push(ms);
  if (outcome.status === "conflict") {
    tightRepairs.push(time(() => repairOptions(problem, outcome.rules))[1]);
  }
}
console.log("8 front seats, 8 pupils, 14 to 26 keep-apart pairs:");
for (const [name, values] of Object.entries(tight)) report(name, values);
if (tightRepairs.length > 0)
  report("repair previews, all conflicts", tightRepairs);

// Eight front-row seats, nine pupils who all want them.
const crowded: Problem = {
  room,
  pupils,
  rules: Array.from({ length: 9 }, (_, i): Rule => ({
    id: `f${i}`,
    kind: "front",
    pupil: `p${i}`,
    rows: 1,
    enabled: true,
  })),
};
const [hard, hardMs] = time(() => plan(crowded, { timeLimitMs: 20000 }));
console.log(
  `9 pupils, 8 front seats: ${hard.status} in ${hardMs.toFixed(0)} ms`,
);
if (hard.status === "conflict") {
  const [, repairMs] = time(() => repairOptions(crowded, hard.rules));
  console.log(
    `  ${hard.rules.length} rules in the conflict, repair previews ${repairMs.toFixed(0)} ms`,
  );
}

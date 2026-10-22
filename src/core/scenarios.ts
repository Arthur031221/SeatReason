import { plan } from "./analyze.ts";
import { emptyProject, type Project } from "./project.ts";
import type { Rule } from "./problem.ts";

/** Fictional classes for the demo and the tests. No real pupil is named here. */

const NAMES = [
  "Maya",
  "Noor",
  "Ravi",
  "Ines",
  "Leo",
  "Zoe",
  "Ben",
  "Aiko",
  "Tomas",
  "Priya",
  "Omar",
  "Hana",
  "Lucas",
  "Mei",
  "Jonas",
  "Sofia",
  "Kofi",
  "Elena",
  "Yuki",
  "Mateo",
  "Amara",
  "Finn",
  "Lena",
  "Diego",
];

function base(
  name: string,
  rows: number,
  cols: number,
  blocked: number[],
): Project {
  const project = emptyProject();
  project.name = name;
  project.room = { rows, cols, blocked };
  project.pupils = NAMES.map((n, i) => ({ id: `p${i + 1}`, name: n }));
  return project;
}

const id = (name: string) => `p${NAMES.indexOf(name) + 1}`;
let counter = 0;
function rule(
  partial: Omit<Rule, "id" | "enabled"> | Record<string, unknown>,
): Rule {
  return { id: `r${++counter}`, enabled: true, ...partial } as Rule;
}

export type ScenarioKey = "squeeze" | "crowded" | "ready";

export const SCENARIOS: Record<ScenarioKey, () => Project> = {
  /** Three far-sighted pupils who must not sit together, and a pillar in the front row. */
  squeeze() {
    counter = 0;
    const project = base("Class 4B", 5, 6, [2, 3]);
    project.rules = [
      rule({ kind: "front", pupil: id("Maya"), rows: 1 }),
      rule({ kind: "front", pupil: id("Noor"), rows: 1 }),
      rule({ kind: "front", pupil: id("Ravi"), rows: 1 }),
      rule({ kind: "front", pupil: id("Ines"), rows: 2 }),
      rule({ kind: "apart", a: id("Maya"), b: id("Noor") }),
      rule({ kind: "apart", a: id("Maya"), b: id("Ravi") }),
      rule({ kind: "apart", a: id("Noor"), b: id("Ravi") }),
      rule({ kind: "apart", a: id("Leo"), b: id("Zoe") }),
      rule({ kind: "pin", pupil: id("Ben"), seat: 24 }),
      rule({ kind: "pin", pupil: id("Aiko"), seat: 13 }),
    ];
    return project;
  },
  /** More front-row requests than front-row seats. */
  crowded() {
    counter = 0;
    const project = base("Class 6A", 5, 6, [0]);
    project.rules = ["Maya", "Noor", "Ravi", "Ines", "Leo", "Zoe"].map((n) =>
      rule({ kind: "front", pupil: id(n), rows: 1 }),
    );
    project.rules.push(rule({ kind: "pin", pupil: id("Ben"), seat: 1 }));
    return project;
  },
  /** Everything fits. */
  ready() {
    counter = 0;
    const project = base("Class 3C", 4, 7, []);
    project.rules = [
      rule({ kind: "front", pupil: id("Priya"), rows: 1 }),
      rule({ kind: "pin", pupil: id("Omar"), seat: 0 }),
      rule({ kind: "apart", a: id("Hana"), b: id("Lucas") }),
      rule({ kind: "apart", a: id("Mei"), b: id("Jonas") }),
    ];
    return project;
  },
};

/** The request a teacher is imagined to have added last, after the plan was made. */
const LATE: Record<ScenarioKey, (rule: Rule) => boolean> = {
  squeeze: (r) => r.kind === "front" && r.pupil === id("Ravi"),
  crowded: (r) => r.kind === "front" && r.pupil === id("Zoe"),
  ready: () => false,
};

/**
 * An example that opens with a plan already on the desk. The late request is
 * left out when the plan is made, so the example shows what happens when a
 * request arrives that the plan does not fit.
 */
export function exampleProject(key: ScenarioKey): Project {
  const project = SCENARIOS[key]();
  const earlier = {
    room: project.room,
    pupils: project.pupils,
    rules: project.rules.map((r) => ({ ...r, enabled: !LATE[key](r) })),
  };
  const outcome = plan(earlier, { seed: project.seed, timeLimitMs: 4000 });
  return outcome.status === "solved"
    ? { ...project, plan: outcome.plan }
    : project;
}

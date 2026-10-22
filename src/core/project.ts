import {
  MAX_PUPILS,
  MAX_SEATS,
  seatCount,
  type Plan,
  type Pupil,
  type Room,
  type Rule,
} from "./problem.ts";

export const PROJECT_VERSION = 1;
export const MAX_SIDE = 12;
export const MAX_RULES = 1000;

export interface Project {
  version: typeof PROJECT_VERSION;
  name: string;
  room: Room;
  pupils: Pupil[];
  rules: Rule[];
  plan: Plan;
  seed: number;
}

export type NewRule =
  | { kind: "pin"; pupil: string; seat: number }
  | { kind: "front"; pupil: string; rows: number }
  | { kind: "apart"; a: string; b: string };

export type Action =
  | { type: "rename"; name: string }
  | { type: "setRoom"; rows: number; cols: number }
  | { type: "toggleBlocked"; seat: number }
  | { type: "setRoster"; names: string[] }
  | { type: "addRule"; rule: NewRule }
  | { type: "removeRule"; id: string }
  | { type: "toggleRule"; id: string }
  | { type: "setPlan"; plan: Plan }
  | { type: "moveSeat"; pupil: string; seat: number }
  | { type: "unseat"; pupil: string }
  | { type: "applyRepair"; rule: string; plan: Plan }
  | { type: "reseed" }
  | { type: "load"; project: Project };

export function emptyProject(): Project {
  return {
    version: PROJECT_VERSION,
    name: "",
    room: { rows: 5, cols: 6, blocked: [] },
    pupils: [],
    rules: [],
    plan: {},
    seed: 1,
  };
}

function nextId(prefix: string, existing: { id: string }[]): string {
  let max = 0;
  for (const { id } of existing) {
    const n = Number(id.slice(prefix.length));
    if (id.startsWith(prefix) && Number.isInteger(n)) max = Math.max(max, n);
  }
  return `${prefix}${max + 1}`;
}

/**
 * Splits pasted text into names. Accepts one name per line, or a CSV whose
 * first column holds the names (a header row such as "name" is skipped).
 */
export function parseRoster(text: string): {
  names: string[];
  truncated: boolean;
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => {
      const cell = line.startsWith('"')
        ? (/^"((?:[^"]|"")*)"/.exec(line)?.[1] ?? line).replace(/""/g, '"')
        : line.split(",")[0];
      return cell.trim();
    })
    .filter(Boolean);
  const header = /^(names?|students?|pupils?|first ?name)$/i;
  if (lines.length > 1 && header.test(lines[0])) lines.shift();
  return {
    names: lines.slice(0, MAX_PUPILS),
    truncated: lines.length > MAX_PUPILS,
  };
}

/** Reuses the id of an existing pupil with the same name, so edits keep their rules. */
function applyRoster(project: Project, names: string[]): Project {
  const pool = new Map<string, Pupil[]>();
  for (const pupil of project.pupils) {
    pool.set(pupil.name, [...(pool.get(pupil.name) ?? []), pupil]);
  }
  const pupils: Pupil[] = [];
  for (const name of names) {
    const reused = pool.get(name)?.shift();
    pupils.push(
      reused ?? { id: nextId("p", [...project.pupils, ...pupils]), name },
    );
  }
  const keep = new Set(pupils.map((p) => p.id));
  return {
    ...project,
    pupils,
    rules: project.rules.filter((r) =>
      (r.kind === "apart" ? [r.a, r.b] : [r.pupil]).every((id) => keep.has(id)),
    ),
    plan: Object.fromEntries(
      Object.entries(project.plan).filter(([id]) => keep.has(id)),
    ),
  };
}

function resize(project: Project, rows: number, cols: number): Project {
  const clamp = (n: number) =>
    Math.min(MAX_SIDE, Math.max(1, Math.round(n) || 1));
  rows = clamp(rows);
  cols = clamp(cols);
  while (rows * cols > MAX_SEATS) {
    if (rows >= cols) rows--;
    else cols--;
  }
  const old = project.room;
  const remap = (seat: number): number | null => {
    const r = Math.floor(seat / old.cols);
    const c = seat % old.cols;
    return r < rows && c < cols ? r * cols + c : null;
  };
  const blocked = project.room.blocked
    .map(remap)
    .filter((s): s is number => s !== null);
  const plan: Plan = {};
  for (const [id, seat] of Object.entries(project.plan)) {
    const next = remap(seat);
    if (next !== null && !blocked.includes(next)) plan[id] = next;
  }
  const rules: Rule[] = [];
  for (const rule of project.rules) {
    if (rule.kind === "front") {
      rules.push({ ...rule, rows: Math.min(rule.rows, rows) });
      continue;
    }
    if (rule.kind !== "pin") {
      rules.push(rule);
      continue;
    }
    const next = remap(rule.seat);
    if (next !== null) rules.push({ ...rule, seat: next });
  }
  return { ...project, room: { rows, cols, blocked }, plan, rules };
}

function moveSeat(project: Project, pupil: string, seat: number): Project {
  const { room, plan } = project;
  if (room.blocked.includes(seat) || seat < 0 || seat >= seatCount(room)) {
    return project;
  }
  if (!project.pupils.some((p) => p.id === pupil)) return project;
  const next = { ...plan };
  const occupant = Object.keys(plan).find((id) => plan[id] === seat);
  if (occupant === pupil) return project;
  const from = plan[pupil];
  if (occupant !== undefined) {
    if (from === undefined) delete next[occupant];
    else next[occupant] = from;
  }
  next[pupil] = seat;
  return { ...project, plan: next };
}

export function reduce(project: Project, action: Action): Project {
  switch (action.type) {
    case "rename":
      return { ...project, name: action.name.slice(0, 80) };
    case "setRoom":
      return resize(project, action.rows, action.cols);
    case "toggleBlocked": {
      const { room } = project;
      const blocked = room.blocked.includes(action.seat)
        ? room.blocked.filter((s) => s !== action.seat)
        : [...room.blocked, action.seat].sort((a, b) => a - b);
      const plan = Object.fromEntries(
        Object.entries(project.plan).filter(
          ([, seat]) => !blocked.includes(seat),
        ),
      );
      return { ...project, room: { ...room, blocked }, plan };
    }
    case "setRoster":
      return applyRoster(project, action.names);
    case "addRule":
      return {
        ...project,
        rules: [
          ...project.rules,
          {
            ...action.rule,
            id: nextId("r", project.rules),
            enabled: true,
          } as Rule,
        ],
      };
    case "removeRule":
      return {
        ...project,
        rules: project.rules.filter((r) => r.id !== action.id),
      };
    case "toggleRule":
      return {
        ...project,
        rules: project.rules.map((r) =>
          r.id === action.id ? { ...r, enabled: !r.enabled } : r,
        ),
      };
    case "setPlan":
      return { ...project, plan: action.plan };
    case "moveSeat":
      return moveSeat(project, action.pupil, action.seat);
    case "unseat": {
      const plan = { ...project.plan };
      delete plan[action.pupil];
      return { ...project, plan };
    }
    case "applyRepair":
      return {
        ...project,
        rules: project.rules.map((r) =>
          r.id === action.rule ? { ...r, enabled: false } : r,
        ),
        plan: action.plan,
      };
    case "reseed":
      // A fresh arrangement: the old plan is dropped so the solver is not steered back to it.
      return { ...project, seed: project.seed + 1, plan: {} };
    case "load":
      return action.project;
  }
}

/** Keeps only the fields a rule is defined to have. */
function cleanRule(rule: Rule): Rule {
  const base = { id: rule.id, enabled: rule.enabled };
  switch (rule.kind) {
    case "pin":
      return { ...base, kind: "pin", pupil: rule.pupil, seat: rule.seat };
    case "front":
      return { ...base, kind: "front", pupil: rule.pupil, rows: rule.rows };
    case "apart":
      return { ...base, kind: "apart", a: rule.a, b: rule.b };
  }
}

/** Checks a value read from a file or storage and returns a project, or throws with a plain reason. */
export function parseProject(value: unknown): Project {
  const fail = (why: string): never => {
    throw new Error(why);
  };
  if (typeof value !== "object" || value === null) return fail("not an object");
  const v = value as Record<string, unknown>;
  if (v.version !== PROJECT_VERSION) return fail("unknown file version");
  const room = v.room as Room | undefined;
  if (
    !room ||
    !Number.isInteger(room.rows) ||
    !Number.isInteger(room.cols) ||
    room.rows < 1 ||
    room.cols < 1 ||
    room.rows > MAX_SIDE ||
    room.cols > MAX_SIDE ||
    room.rows * room.cols > MAX_SEATS ||
    !Array.isArray(room.blocked) ||
    !room.blocked.every(
      (s) => Number.isInteger(s) && s >= 0 && s < room.rows * room.cols,
    )
  ) {
    return fail("bad room");
  }
  const pupils = v.pupils;
  if (
    !Array.isArray(pupils) ||
    pupils.length > MAX_PUPILS ||
    !pupils.every(
      (p) =>
        typeof p?.id === "string" &&
        typeof p?.name === "string" &&
        // Plans are plain objects keyed by pupil id.
        !(p.id in Object.prototype),
    ) ||
    new Set(pupils.map((p: Pupil) => p.id)).size !== pupils.length
  ) {
    return fail("bad pupil list");
  }
  const ids = new Set((pupils as Pupil[]).map((p) => p.id));
  const rules = v.rules;
  if (!Array.isArray(rules) || rules.length > MAX_RULES)
    return fail("bad rules");
  const total = room.rows * room.cols;
  const okRule = (r: Record<string, unknown>) => {
    if (typeof r?.id !== "string" || typeof r.enabled !== "boolean")
      return false;
    if (r.kind === "pin") {
      return (
        ids.has(r.pupil as string) &&
        Number.isInteger(r.seat) &&
        (r.seat as number) >= 0 &&
        (r.seat as number) < total
      );
    }
    if (r.kind === "front") {
      return (
        ids.has(r.pupil as string) &&
        Number.isInteger(r.rows) &&
        (r.rows as number) >= 1 &&
        (r.rows as number) <= room.rows
      );
    }
    if (r.kind === "apart") {
      return ids.has(r.a as string) && ids.has(r.b as string) && r.a !== r.b;
    }
    return false;
  };
  if (
    !rules.every(okRule) ||
    new Set(rules.map((r) => r.id)).size !== rules.length
  ) {
    return fail("bad rules");
  }
  const plan = v.plan as Record<string, unknown> | undefined;
  if (
    typeof plan !== "object" ||
    plan === null ||
    !Object.entries(plan).every(
      ([id, seat]) =>
        ids.has(id) &&
        Number.isInteger(seat) &&
        (seat as number) >= 0 &&
        (seat as number) < total &&
        !room.blocked.includes(seat as number),
    ) ||
    new Set(Object.values(plan)).size !== Object.keys(plan).length
  ) {
    return fail("bad plan");
  }
  return {
    version: PROJECT_VERSION,
    name: typeof v.name === "string" ? v.name.slice(0, 80) : "",
    room: { rows: room.rows, cols: room.cols, blocked: [...room.blocked] },
    pupils: (pupils as Pupil[]).map(({ id, name }) => ({
      id,
      name: name.slice(0, 60),
    })),
    rules: (rules as Rule[]).map(cleanRule),
    plan: plan as Plan,
    seed: Number.isInteger(v.seed) ? (v.seed as number) : 1,
  };
}

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

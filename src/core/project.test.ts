import { describe, expect, it } from "vitest";
import { plan, repairOptions } from "./analyze.ts";
import { displayNames } from "./labels.ts";
import {
  emptyProject,
  parseProject,
  parseRoster,
  reduce,
  serializeProject,
} from "./project.ts";
import { SCENARIOS, exampleProject } from "./scenarios.ts";

describe("parseRoster", () => {
  it("reads one name per line and keeps equal names", () => {
    expect(parseRoster("Ana\n\n Sam \nSam\r\n").names).toEqual([
      "Ana",
      "Sam",
      "Sam",
    ]);
  });
  it("reads the first column of a CSV and skips a header", () => {
    const csv = 'Name,Grade\n"Lee, Ann",5\nBo,5';
    expect(parseRoster(csv).names).toEqual(["Lee, Ann", "Bo"]);
  });
  it("stops at 40 names and says so", () => {
    const text = Array.from({ length: 45 }, (_, i) => `N${i}`).join("\n");
    const out = parseRoster(text);
    expect(out.names).toHaveLength(40);
    expect(out.truncated).toBe(true);
  });
});

describe("reduce", () => {
  it("keeps the id, and so the rules, of a pupil that stays in the roster", () => {
    let p = reduce(emptyProject(), {
      type: "setRoster",
      names: ["Ana", "Sam", "Sam"],
    });
    expect(p.pupils.map((x) => x.id)).toEqual(["p1", "p2", "p3"]);
    p = reduce(p, {
      type: "addRule",
      rule: { kind: "apart", a: "p2", b: "p3" },
    });
    p = reduce(p, {
      type: "addRule",
      rule: { kind: "front", pupil: "p1", rows: 1 },
    });
    p = reduce(p, {
      type: "addRule",
      rule: { kind: "together", a: "p1", b: "p2" },
    });
    p = reduce(p, { type: "setRoster", names: ["Zed", "Ana", "Sam", "Sam"] });
    expect(p.pupils.find((x) => x.name === "Ana")!.id).toBe("p1");
    expect(p.rules).toHaveLength(3);
    p = reduce(p, { type: "setRoster", names: ["Ana", "Sam"] });
    expect(p.rules.map((r) => r.kind)).toEqual(["front", "together"]);
  });

  it("keeps the pupil, the seat and the rules when a typo in a name is fixed", () => {
    let p = reduce(emptyProject(), {
      type: "setRoster",
      names: ["Noor", "Ravi", "Maya"],
    });
    p = reduce(p, {
      type: "addRule",
      rule: { kind: "front", pupil: "p1", rows: 1 },
    });
    p = reduce(p, { type: "setRoster", names: ["Nour", "Ravi", "Maya"] });
    expect(p.pupils.map((x) => [x.id, x.name])).toEqual([
      ["p1", "Nour"],
      ["p2", "Ravi"],
      ["p3", "Maya"],
    ]);
    expect(p.rules).toHaveLength(1);
  });

  it("treats a different name on the same line as a new pupil", () => {
    let p = reduce(emptyProject(), {
      type: "setRoster",
      names: ["Noor", "Ravi"],
    });
    p = reduce(p, {
      type: "addRule",
      rule: { kind: "front", pupil: "p1", rows: 1 },
    });
    p = reduce(p, { type: "setRoster", names: ["Zed", "Ravi"] });
    expect(p.pupils[0]!.id).not.toBe("p1");
    expect(p.rules).toHaveLength(0);
    p = reduce(p, { type: "setRoster", names: ["Zed", "Ravi", "Ravo"] });
    expect(p.pupils.map((x) => x.name)).toEqual(["Zed", "Ravi", "Ravo"]);
    expect(new Set(p.pupils.map((x) => x.id)).size).toBe(3);
  });

  it("replaces an earlier fixed seat of the same pupil", () => {
    let p = reduce(emptyProject(), { type: "setRoster", names: ["A", "B"] });
    p = reduce(p, {
      type: "addRule",
      rule: { kind: "pin", pupil: "p1", seat: 0 },
    });
    p = reduce(p, {
      type: "addRule",
      rule: { kind: "pin", pupil: "p2", seat: 1 },
    });
    p = reduce(p, { type: "pinHere", pupil: "p1", seat: 4 });
    const pins = p.rules.filter((r) => r.kind === "pin");
    expect(
      pins.map((r) => (r.kind === "pin" ? [r.pupil, r.seat] : [])),
    ).toEqual([
      ["p2", 1],
      ["p1", 4],
    ]);
    expect(new Set(p.rules.map((r) => r.id)).size).toBe(2);
  });

  it("remaps seats when the room changes shape", () => {
    let p = reduce(emptyProject(), { type: "setRoster", names: ["A", "B"] });
    p = reduce(p, { type: "setRoom", rows: 3, cols: 4 });
    p = reduce(p, { type: "toggleBlocked", seat: 5 }); // row 2, col 2
    p = reduce(p, {
      type: "addRule",
      rule: { kind: "pin", pupil: "p1", seat: 9 },
    }); // row 3, col 2
    p = reduce(p, { type: "setPlan", plan: { p1: 9, p2: 10 } });
    p = reduce(p, { type: "setRoom", rows: 3, cols: 3 });
    expect(p.room.blocked).toEqual([4]);
    expect(p.plan).toEqual({ p1: 7, p2: 8 });
    expect(p.rules[0]).toMatchObject({ kind: "pin", seat: 7 });
    p = reduce(p, { type: "setRoom", rows: 2, cols: 3 });
    expect(p.plan).toEqual({});
    expect(p.rules).toHaveLength(0);
  });

  it("caps the room at 48 seats", () => {
    const p = reduce(emptyProject(), { type: "setRoom", rows: 12, cols: 12 });
    expect(p.room.rows * p.room.cols).toBeLessThanOrEqual(48);
  });

  it("swaps seats when a pupil is dropped on an occupied seat", () => {
    let p = reduce(emptyProject(), {
      type: "setRoster",
      names: ["A", "B", "C"],
    });
    p = reduce(p, { type: "setPlan", plan: { p1: 0, p2: 1 } });
    p = reduce(p, { type: "moveSeat", pupil: "p1", seat: 1 });
    expect(p.plan).toEqual({ p1: 1, p2: 0 });
    p = reduce(p, { type: "moveSeat", pupil: "p3", seat: 1 });
    expect(p.plan).toEqual({ p3: 1, p2: 0 });
    p = reduce(p, { type: "toggleBlocked", seat: 4 });
    expect(reduce(p, { type: "moveSeat", pupil: "p3", seat: 4 })).toBe(p);
  });
});

describe("project files", () => {
  it("round-trips through JSON", () => {
    const project = SCENARIOS.squeeze();
    expect(parseProject(JSON.parse(serializeProject(project)))).toEqual(
      project,
    );
  });
  it("round-trips a sit-together request and refuses one that pairs a pupil with themselves", () => {
    const project = SCENARIOS.ready();
    expect(project.rules.some((r) => r.kind === "together")).toBe(true);
    expect(parseProject(JSON.parse(serializeProject(project)))).toEqual(
      project,
    );
    const bad = JSON.parse(serializeProject(project));
    const together = bad.rules.find(
      (r: { kind: string }) => r.kind === "together",
    );
    together.b = together.a;
    expect(() => parseProject(bad)).toThrow("bad rules");
  });
  it("rejects files that point outside the class", () => {
    const project = JSON.parse(serializeProject(SCENARIOS.squeeze()));
    project.rules[0].pupil = "nobody";
    expect(() => parseProject(project)).toThrow("bad rules");
    expect(() => parseProject({ version: 2 })).toThrow("unknown file version");
    expect(() => parseProject(null)).toThrow();
  });
});

describe("labels", () => {
  it("numbers repeated names", () => {
    const names = displayNames([
      { id: "a", name: "Sam" },
      { id: "b", name: "Ana" },
      { id: "c", name: "Sam" },
    ]);
    expect([...names.values()]).toEqual(["Sam (1)", "Ana", "Sam (2)"]);
  });
});

describe("demo scenarios", () => {
  it("squeeze: names the six interacting requests and spares the rest", () => {
    const project = SCENARIOS.squeeze();
    const outcome = plan(project);
    expect(outcome).toMatchObject({ status: "conflict", minimal: true });
    if (outcome.status !== "conflict") return;
    expect(outcome.rules).toEqual(["r1", "r2", "r3", "r5", "r6", "r7"]);
    const options = repairOptions(project, outcome.rules);
    expect(options.every((o) => o.outcome.status === "solved")).toBe(true);
  });
  it("crowded: more front-row requests than seats", () => {
    const outcome = plan(SCENARIOS.crowded());
    expect(outcome).toMatchObject({ status: "conflict", minimal: true });
    if (outcome.status === "conflict") expect(outcome.rules).toHaveLength(6);
  });
  it("ready: solved", () => {
    expect(plan(SCENARIOS.ready()).status).toBe("solved");
  });
});

describe("room changes and hostile files", () => {
  it("keeps a saved class loadable after the room shrinks below a front-row rule", () => {
    let project = exampleProject("squeeze");
    project = reduce(project, {
      type: "addRule",
      rule: { kind: "front", pupil: project.pupils[0].id, rows: 4 },
    });
    project = reduce(project, { type: "setRoom", rows: 3, cols: 6 });
    const reopened = parseProject(JSON.parse(serializeProject(project)));
    expect(reopened.rules.every((r) => r.kind !== "front" || r.rows <= 3)).toBe(
      true,
    );
  });

  it("refuses pupil ids that collide with object properties", () => {
    const file = JSON.parse(serializeProject(emptyProject()));
    file.pupils = [{ id: "toString", name: "Ana" }];
    expect(() => parseProject(file)).toThrow("bad pupil list");
  });

  it("refuses a plan that puts two pupils in one seat or on a blocked seat", () => {
    const base = JSON.parse(serializeProject(emptyProject()));
    base.room = { rows: 2, cols: 2, blocked: [3] };
    base.pupils = [
      { id: "p1", name: "Ana" },
      { id: "p2", name: "Bo" },
    ];
    expect(() => parseProject({ ...base, plan: { p1: 0, p2: 0 } })).toThrow(
      "bad plan",
    );
    expect(() => parseProject({ ...base, plan: { p1: 3 } })).toThrow(
      "bad plan",
    );
  });

  it("drops fields a rule does not define and caps the rule count", () => {
    const base = JSON.parse(serializeProject(emptyProject()));
    base.room = { rows: 2, cols: 2, blocked: [] };
    base.pupils = [{ id: "p1", name: "Ana" }];
    base.rules = [
      { id: "r1", enabled: true, kind: "front", pupil: "p1", rows: 1, x: 1 },
    ];
    expect(parseProject(base).rules[0]).not.toHaveProperty("x");
    base.rules = Array.from({ length: 1001 }, (_, i) => ({
      id: `r${i}`,
      enabled: true,
      kind: "front",
      pupil: "p1",
      rows: 1,
    }));
    expect(() => parseProject(base)).toThrow("bad rules");
  });
});

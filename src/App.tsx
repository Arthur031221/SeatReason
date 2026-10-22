import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "./i18n.tsx";
import { useHistory } from "./hooks/useHistory.ts";
import { useSolver, type Check } from "./hooks/useSolver.ts";
import {
  parseProject,
  serializeProject,
  type Project,
} from "./core/project.ts";
import { exampleProject, type ScenarioKey } from "./core/scenarios.ts";
import { validatePlan } from "./core/validate.ts";
import type { Plan, Problem } from "./core/problem.ts";
import { displayNames } from "./core/labels.ts";
import { Header, type Theme } from "./ui/Header.tsx";
import { ClassPanel } from "./ui/ClassPanel.tsx";
import { RulesPanel } from "./ui/RulesPanel.tsx";
import { StatusPanel } from "./ui/StatusPanel.tsx";
import { SeatMap } from "./ui/SeatMap.tsx";
import { PrintSheet } from "./ui/PrintSheet.tsx";
import { describeRule, rulePupils } from "./ui/ruleText.ts";
import { Icon } from "./ui/Icons.tsx";

const PROJECT_KEY = "seatreason.project";
const THEME_KEY = "seatreason.theme";
const SOURCE_URL = "https://github.com/Arthur031221/SeatReason";

function loadInitial(): Project {
  try {
    const saved = localStorage.getItem(PROJECT_KEY);
    if (saved) return parseProject(JSON.parse(saved));
  } catch {
    // A damaged save falls back to the example.
  }
  return exampleProject("squeeze");
}

function problemOf(project: Project): Problem {
  return { room: project.room, pupils: project.pupils, rules: project.rules };
}

export function App() {
  const { t } = useI18n();
  const { project, dispatch, canUndo, canRedo } = useHistory(loadInitial);
  const [editRoom, setEditRoom] = useState(false);
  const [previewRule, setPreviewRule] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      return saved === "light" || saved === "dark" ? saved : "auto";
    } catch {
      return "auto";
    }
  });

  const problem = useMemo(() => problemOf(project), [project]);
  // Everything the solver reads. Dragging a seat does not change it.
  const key = useMemo(
    () => JSON.stringify([problem, project.seed]),
    [problem, project.seed],
  );
  const keyRef = useRef(key);
  keyRef.current = key;
  const latest = useRef(project);
  latest.current = project;
  const activeKey = useRef("");

  const onDone = useCallback(
    (check: Check) => {
      if (activeKey.current !== keyRef.current) return;
      if (check.state !== "done" || check.outcome.status !== "solved") return;
      const current = latest.current;
      const complete = validatePlan(problemOf(current), current.plan, {
        requireComplete: true,
      });
      if (complete.length > 0)
        dispatch({ type: "setPlan", plan: check.outcome.plan });
    },
    [dispatch],
  );
  const { check: latestCheck, run, cancel } = useSolver(onDone);
  // The key the latest check was started for. Until a new check starts, an
  // edit has made the old answer stale, so it is not shown or acted on.
  const [checkedKey, setCheckedKey] = useState("");
  const check: Check =
    latestCheck.state === "done" && checkedKey !== key
      ? { state: "working" }
      : latestCheck;

  const start = useCallback(() => {
    const current = latest.current;
    activeKey.current = keyRef.current;
    setCheckedKey(keyRef.current);
    run({
      problem: problemOf(current),
      seed: current.seed,
      prefer: Object.keys(current.plan).length > 0 ? current.plan : undefined,
    });
  }, [run]);

  useEffect(() => {
    setPreviewRule(null);
    if (project.pupils.length === 0) return;
    const timer = setTimeout(start, 200);
    return () => clearTimeout(timer);
    // `key` already covers every solver input.
  }, [key, start]);

  useEffect(() => {
    try {
      localStorage.setItem(PROJECT_KEY, serializeProject(project));
    } catch {
      // Storage can be full or blocked. The file export still works.
    }
  }, [project]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);

  const setTheme = (next: Theme) => {
    setThemeState(next);
    try {
      if (next === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // The theme still applies until the page is closed.
    }
  };

  const names = useMemo(() => displayNames(project.pupils), [project.pupils]);
  const option =
    check.state === "done" && previewRule
      ? check.options.find((o) => o.rule === previewRule)
      : undefined;
  const preview =
    option && option.outcome.status === "solved" ? option : undefined;
  const shownPlan: Plan =
    preview && preview.outcome.status === "solved"
      ? preview.outcome.plan
      : project.plan;

  const violations = useMemo(
    () => validatePlan(problem, project.plan),
    [problem, project.plan],
  );
  const broken = useMemo(() => {
    const out = new Set<string>();
    for (const v of violations) {
      if (v.type === "rule") {
        const rule = project.rules.find((r) => r.id === v.rule);
        if (rule) rulePupils(rule).forEach((id) => out.add(id));
      } else if (v.type === "blocked") out.add(v.pupil);
      else if (v.type === "shared") v.pupils.forEach((id) => out.add(id));
    }
    return out;
  }, [violations, project.rules]);

  const conflictRules = useMemo(
    () =>
      new Set(
        check.state === "done" && check.outcome.status === "conflict"
          ? check.outcome.rules
          : [],
      ),
    [check],
  );
  const focusPupils = useMemo(() => {
    const out = new Set<string>();
    if (preview) return out;
    for (const rule of project.rules) {
      if (conflictRules.has(rule.id))
        rulePupils(rule).forEach((id) => out.add(id));
    }
    return out;
  }, [conflictRules, project.rules, preview]);

  const pinned = useMemo(
    () =>
      new Set(
        project.rules
          .filter((r) => r.kind === "pin" && r.enabled && r.id !== previewRule)
          .map((r) => (r.kind === "pin" ? r.seat : -1)),
      ),
    [project.rules, previewRule],
  );

  const complete =
    project.pupils.length > 0 &&
    project.pupils.every((p) => project.plan[p.id] !== undefined);

  const save = () => {
    const blob = new Blob([serializeProject(project)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const base = (project.name || "seatreason").replace(
      /[^\p{L}\p{N}_-]+/gu,
      "-",
    );
    a.download = `${base}.seatreason.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const open = async (file: File) => {
    try {
      const loaded = parseProject(JSON.parse(await file.text()));
      setFileError(null);
      setPreviewRule(null);
      dispatch({ type: "load", project: loaded });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setFileError(t("header.openFailed", { reason }));
    }
  };

  const loadExample = (keyName: ScenarioKey) => {
    setPreviewRule(null);
    setFileError(null);
    dispatch({ type: "load", project: exampleProject(keyName) });
  };

  const regenerate = () => {
    setPreviewRule(null);
    dispatch({ type: "reseed" });
  };

  const rulesBroken = violations.filter((v) => v.type === "rule");

  return (
    <>
      <div className="app">
        <Header
          canUndo={canUndo}
          canRedo={canRedo}
          theme={theme}
          error={fileError}
          onUndo={() => dispatch({ type: "undo" })}
          onRedo={() => dispatch({ type: "redo" })}
          onExample={loadExample}
          onSave={save}
          onOpen={open}
          onPrint={() => window.print()}
          onTheme={setTheme}
        />
        <main className="layout">
          <div className="column">
            <ClassPanel
              project={project}
              editRoom={editRoom}
              onEditRoom={setEditRoom}
              dispatch={dispatch}
            />
            <RulesPanel
              project={project}
              inConflict={conflictRules}
              dispatch={dispatch}
            />
          </div>
          <div className="column wide">
            <section className="panel" aria-labelledby="plan-title">
              <h2 id="plan-title">{t("plan.title")}</h2>
              <div className="plan-body">
                <div className="plan-side">
                  <StatusPanel
                    project={project}
                    check={check}
                    previewRule={previewRule}
                    onCancel={cancel}
                    onRetry={start}
                    onPreview={setPreviewRule}
                    onUse={(rule) => {
                      if (preview && preview.outcome.status === "solved") {
                        dispatch({
                          type: "applyRepair",
                          rule,
                          plan: preview.outcome.plan,
                        });
                        setPreviewRule(null);
                      }
                    }}
                  />
                  {preview ? (
                    <p className="banner is-preview">{t("repair.changed")}</p>
                  ) : null}
                </div>
                <div className="plan-main">
                  <SeatMap
                    room={project.room}
                    plan={shownPlan}
                    names={names}
                    pupilOrder={project.pupils.map((p) => p.id)}
                    pinned={pinned}
                    focusPupils={focusPupils}
                    changed={new Set(preview?.changed ?? [])}
                    broken={preview ? new Set() : broken}
                    editRoom={editRoom}
                    readOnly={Boolean(preview)}
                    onMove={(pupil, seat) =>
                      dispatch({ type: "moveSeat", pupil, seat })
                    }
                    onUnseat={(pupil) => dispatch({ type: "unseat", pupil })}
                    onToggleBlocked={(seat) =>
                      dispatch({ type: "toggleBlocked", seat })
                    }
                  />
                  {!preview && !editRoom && project.pupils.length > 0 ? (
                    <div className="plan-footer">
                      {rulesBroken.length > 0 &&
                      Object.keys(project.plan).length > 0 ? (
                        <div className="violations" role="status">
                          <p>
                            <Icon name="warn" /> {t("plan.violations")}
                          </p>
                          <ul>
                            {rulesBroken.map((v) => {
                              const rule = project.rules.find(
                                (r) => v.type === "rule" && r.id === v.rule,
                              );
                              return rule ? (
                                <li key={rule.id}>
                                  {describeRule(rule, names, project.room, t)}
                                </li>
                              ) : null;
                            })}
                          </ul>
                        </div>
                      ) : complete ? (
                        <p className="valid" role="status">
                          <Icon name="check" /> {t("plan.valid")}
                        </p>
                      ) : null}
                      <div className="row">
                        <button
                          type="button"
                          className="btn"
                          onClick={regenerate}
                        >
                          <Icon name="spark" />
                          <span>
                            {complete ? t("plan.shuffle") : t("plan.make")}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="btn"
                          disabled={Object.keys(project.plan).length === 0}
                          onClick={() =>
                            dispatch({ type: "setPlan", plan: {} })
                          }
                        >
                          {t("plan.clear")}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </section>
          </div>
        </main>
        <footer className="foot">
          <span>{t("app.privacy")}</span>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">
            {t("app.source")}
          </a>
        </footer>
      </div>
      <PrintSheet project={project} plan={project.plan} />
    </>
  );
}

import { useEffect, useState } from "react";
import { useI18n } from "../i18n.tsx";
import type { Check } from "../hooks/useSolver.ts";
import { TIME_LIMIT_MS } from "../hooks/useSolver.ts";
import type { Project } from "../core/project.ts";
import { displayNames } from "../core/labels.ts";
import { describeRule } from "./ruleText.ts";
import { Icon } from "./Icons.tsx";

interface Props {
  project: Project;
  check: Check;
  previewRule: string | null;
  onCancel: () => void;
  onRetry: () => void;
  onPreview: (rule: string | null) => void;
  onUse: (rule: string) => void;
}

function Elapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const timer = setInterval(
      () => setSeconds(Math.floor((performance.now() - started) / 1000)),
      500,
    );
    return () => clearInterval(timer);
  }, []);
  return <span className="elapsed">{seconds}s</span>;
}

export function StatusPanel(props: Props) {
  const { t } = useI18n();
  const { project, check } = props;
  const names = displayNames(project.pupils);
  const text = (id: string) => {
    const rule = project.rules.find((r) => r.id === id);
    return rule ? describeRule(rule, names, project.room, t) : id;
  };
  const enabled = project.rules.filter((r) => r.enabled).length;

  if (project.pupils.length === 0) {
    return (
      <div className="status is-idle">
        <p>{t("status.empty")}</p>
      </div>
    );
  }

  switch (check.state) {
    case "idle":
      return <div className="status is-idle" />;
    case "working":
      return (
        <div className="status is-working" role="status">
          <div className="status-head">
            <p>
              {t("status.working")} <Elapsed />
            </p>
            <button type="button" className="btn" onClick={props.onCancel}>
              {t("status.cancel")}
            </button>
          </div>
          <div className="bar" aria-hidden="true">
            <i />
          </div>
        </div>
      );
    case "cancelled":
      return (
        <div className="status is-warn" role="status">
          <Icon name="warn" />
          <p>{t("status.cancelled")}</p>
          <button type="button" className="btn" onClick={props.onRetry}>
            {t("status.retry")}
          </button>
        </div>
      );
    case "error":
      return (
        <div className="status is-bad" role="alert">
          <Icon name="cross" />
          <p>{t("status.error", { reason: check.reason })}</p>
        </div>
      );
  }

  const { outcome, options } = check;
  switch (outcome.status) {
    case "solved":
      return (
        <div className="status is-ok" role="status">
          <Icon name="check" />
          <p>
            {enabled === 0
              ? t("status.okNone")
              : t("status.ok", { count: enabled })}
          </p>
        </div>
      );
    case "capacity":
      return (
        <div className="status is-bad" role="status">
          <Icon name="cross" />
          <p>
            {t("status.capacity", {
              pupils: outcome.pupils,
              seats: outcome.seats,
            })}
          </p>
        </div>
      );
    case "inconclusive":
      return (
        <div className="status is-warn" role="status">
          <Icon name="warn" />
          <p>
            {outcome.reason === "cancelled"
              ? t("status.cancelled")
              : t("status.inconclusive", { seconds: TIME_LIMIT_MS / 1000 })}
          </p>
          <button type="button" className="btn" onClick={props.onRetry}>
            {t("status.retry")}
          </button>
        </div>
      );
    case "conflict":
      break;
  }

  return (
    <div className="status is-bad conflict">
      <div className="status-head" role="status">
        <Icon name="cross" />
        <h3>{t("status.conflict", { count: outcome.rules.length })}</h3>
      </div>
      <ol className="conflict-list">
        {outcome.rules.map((id) => (
          <li key={id}>{text(id)}</li>
        ))}
      </ol>
      <p className="hint">
        {outcome.minimal
          ? t("status.conflictMinimal")
          : t("status.conflictUnproven")}
      </p>
      <h3 className="repair-title">{t("repair.title")}</h3>
      <ul className="repairs">
        {options.map((option) => {
          const open = props.previewRule === option.rule;
          const result = option.outcome;
          return (
            <li key={option.rule} className={`repair${open ? " is-open" : ""}`}>
              <div className="repair-main">
                <strong>{text(option.rule)}</strong>
                <span className="repair-result">
                  {result.status === "solved"
                    ? Object.keys(project.plan).length === 0
                      ? t("repair.worksFresh")
                      : option.changed.length === 0
                        ? t("repair.worksSame")
                        : t("repair.works", { count: option.changed.length })
                    : result.status === "conflict"
                      ? `${t("repair.stillBlocked")} ${t("repair.remaining", {
                          requests: result.rules.map(text).join("; "),
                        })}`
                      : t("repair.unknown")}
                </span>
              </div>
              {result.status === "solved" ? (
                open ? (
                  <div className="repair-actions">
                    <p className="hint">
                      {t("repair.previewing", { request: text(option.rule) })}
                    </p>
                    <button
                      type="button"
                      className="btn primary"
                      onClick={() => props.onUse(option.rule)}
                    >
                      {t("repair.use")}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => props.onPreview(null)}
                    >
                      {t("repair.back")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => props.onPreview(option.rule)}
                  >
                    {t("repair.preview")}
                  </button>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

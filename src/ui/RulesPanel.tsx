import { useState } from "react";
import { useI18n } from "../i18n.tsx";
import type { Action, NewRule, Project } from "../core/project.ts";
import { displayNames } from "../core/labels.ts";
import { describeRule } from "./ruleText.ts";
import { NumberField } from "./NumberField.tsx";
import { Icon, type IconName } from "./Icons.tsx";

interface Props {
  project: Project;
  inConflict: Set<string>;
  dispatch: (action: Action) => void;
}

const ICONS: Record<string, IconName> = {
  pin: "pin",
  front: "front",
  apart: "apart",
};

export function RulesPanel({ project, inConflict, dispatch }: Props) {
  const { t } = useI18n();
  const { pupils, room, rules } = project;
  const names = displayNames(pupils);
  const [kind, setKind] = useState<NewRule["kind"]>("front");
  const [pupil, setPupil] = useState("");
  const [other, setOther] = useState("");
  const [row, setRow] = useState(1);
  const [col, setCol] = useState(1);
  const [rows, setRows] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const first = pupils[0]?.id ?? "";
  const chosen = pupils.some((p) => p.id === pupil) ? pupil : first;
  const second =
    pupils.some((p) => p.id === other) && other !== chosen
      ? other
      : (pupils.find((p) => p.id !== chosen)?.id ?? "");

  const add = () => {
    setError(null);
    if (!chosen) return setError(t("rules.needPupils"));
    if (kind === "pin") {
      const r = Math.min(Math.max(row, 1), room.rows);
      const c = Math.min(Math.max(col, 1), room.cols);
      const seat = (r - 1) * room.cols + (c - 1);
      if (room.blocked.includes(seat)) return setError(t("rules.blockedSeat"));
      dispatch({ type: "addRule", rule: { kind, pupil: chosen, seat } });
    } else if (kind === "front") {
      dispatch({
        type: "addRule",
        rule: {
          kind,
          pupil: chosen,
          rows: Math.min(Math.max(rows, 1), room.rows),
        },
      });
    } else {
      if (!second) return setError(t("rules.needPupils"));
      dispatch({ type: "addRule", rule: { kind, a: chosen, b: second } });
    }
  };

  const options = pupils.map((p) => (
    <option key={p.id} value={p.id}>
      {names.get(p.id)}
    </option>
  ));

  return (
    <section className="panel" aria-labelledby="rules-title">
      <h2 id="rules-title">{t("rules.title")}</h2>
      {rules.length === 0 ? (
        <p className="hint">{t("rules.empty")}</p>
      ) : (
        <ul className="rules">
          {rules.map((rule) => {
            const bad = inConflict.has(rule.id);
            return (
              <li
                key={rule.id}
                className={`rule${rule.enabled ? "" : " is-off"}${bad ? " is-conflict" : ""}`}
                data-rule={rule.id}
              >
                <label className="switch" title={t("rules.enabled")}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    aria-label={`${t("rules.enabled")}: ${describeRule(rule, names, room, t)}`}
                    onChange={() =>
                      dispatch({ type: "toggleRule", id: rule.id })
                    }
                  />
                  <span className="track" aria-hidden="true" />
                </label>
                <span className="rule-icon">
                  <Icon name={ICONS[rule.kind]} />
                </span>
                <span className="rule-text">
                  {describeRule(rule, names, room, t)}
                  {bad ? (
                    <em className="tag">{t("rules.inConflict")}</em>
                  ) : null}
                </span>
                <button
                  type="button"
                  className="icon-btn quiet"
                  title={t("rules.remove")}
                  aria-label={`${t("rules.remove")}: ${describeRule(rule, names, room, t)}`}
                  onClick={() => dispatch({ type: "removeRule", id: rule.id })}
                >
                  <Icon name="trash" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        className="rule-form"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <label className="field">
          <span>{t("rules.kind")}</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as NewRule["kind"])}
          >
            <option value="front">{t("rules.kindFront")}</option>
            <option value="apart">{t("rules.kindApart")}</option>
            <option value="pin">{t("rules.kindPin")}</option>
          </select>
        </label>
        <label className="field">
          <span>{t("rules.pupil")}</span>
          <select value={chosen} onChange={(e) => setPupil(e.target.value)}>
            {options}
          </select>
        </label>
        {kind === "apart" ? (
          <label className="field">
            <span>{t("rules.other")}</span>
            <select value={second} onChange={(e) => setOther(e.target.value)}>
              {pupils
                .filter((p) => p.id !== chosen)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {names.get(p.id)}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
        {kind === "front" ? (
          <label className="field">
            <span>{t("rules.frontRows")}</span>
            <NumberField
              min={1}
              max={room.rows}
              value={rows}
              onCommit={setRows}
            />
          </label>
        ) : null}
        {kind === "pin" ? (
          <div className="pair">
            <label className="field">
              <span>{t("rules.row")}</span>
              <NumberField
                min={1}
                max={room.rows}
                value={row}
                onCommit={setRow}
              />
            </label>
            <label className="field">
              <span>{t("rules.seat")}</span>
              <NumberField
                min={1}
                max={room.cols}
                value={col}
                onCommit={setCol}
              />
            </label>
          </div>
        ) : null}
        <button
          type="submit"
          className="btn primary"
          disabled={pupils.length === 0}
        >
          {t("rules.add")}
        </button>
        {error ? (
          <p className="hint is-error" role="alert">
            {error}
          </p>
        ) : null}
        {kind === "apart" ? <small>{t("rules.apartNote")}</small> : null}
      </form>
    </section>
  );
}

import { useI18n } from "../i18n.tsx";
import { seatCount, type Plan } from "../core/problem.ts";
import type { Project } from "../core/project.ts";
import { displayNames, seatPosition } from "../core/labels.ts";
import { ruleHolds } from "../core/validate.ts";
import { describeRule } from "./ruleText.ts";

/** The chart a teacher prints. Hidden on screen, the only thing shown on paper. */
export function PrintSheet({
  project,
  plan,
}: {
  project: Project;
  plan: Plan;
}) {
  const { t } = useI18n();
  const { room, pupils, rules } = project;
  const names = displayNames(pupils);
  const occupant = new Map<number, string>();
  for (const [id, seat] of Object.entries(plan)) occupant.set(seat, id);
  const blocked = new Set(room.blocked);
  const problem = { room, pupils, rules };
  const sorted = [...pupils].sort((a, b) =>
    (names.get(a.id) ?? "").localeCompare(names.get(b.id) ?? ""),
  );

  return (
    <div className="print-sheet">
      <h1>
        {project.name || t("print.title")}
        {project.name ? <small> · {t("print.title")}</small> : null}
      </h1>
      <div className="print-board">{t("plan.front")}</div>
      <table className="print-grid">
        <tbody>
          {Array.from({ length: room.rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: room.cols }, (_, c) => {
                const seat = r * room.cols + c;
                const who = occupant.get(seat);
                return (
                  <td
                    key={seat}
                    className={blocked.has(seat) ? "is-blocked" : ""}
                  >
                    {who ? names.get(who) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rules.length > 0 ? (
        <>
          <h2>{t("print.requests")}</h2>
          <ul className="print-rules">
            {rules.map((rule) => (
              <li key={rule.id}>
                {describeRule(rule, names, room, t)}:{" "}
                <b>
                  {!rule.enabled
                    ? t("print.off")
                    : ruleHolds(problem, plan, rule)
                      ? t("print.kept")
                      : t("print.broken")}
                </b>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <h2>{t("print.list")}</h2>
      <ul className="print-list">
        {sorted.map((p) => {
          const seat = plan[p.id];
          const place =
            seat !== undefined && seat < seatCount(room)
              ? (() => {
                  const { row, col } = seatPosition(room, seat);
                  return t("plan.seatLabel", { row, col });
                })()
              : "";
          return (
            <li key={p.id}>
              <span>{names.get(p.id)}</span>
              <span>{place}</span>
            </li>
          );
        })}
      </ul>
      <p className="print-foot">{t("print.checked")}</p>
    </div>
  );
}

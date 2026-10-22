import type { MessageKey } from "../i18n.tsx";
import type { Room, Rule } from "../core/problem.ts";
import { rulePupils } from "../core/problem.ts";
import { seatPosition } from "../core/labels.ts";

type T = (key: MessageKey, params?: Record<string, string | number>) => string;

/** A request in the teacher's words. */
export function describeRule(
  rule: Rule,
  names: Map<string, string>,
  room: Room,
  t: T,
): string {
  const name = (id: string) => names.get(id) ?? "?";
  switch (rule.kind) {
    case "pin": {
      const { row, col } = seatPosition(room, rule.seat);
      return t("rules.pin", { name: name(rule.pupil), row, col });
    }
    case "front":
      return rule.rows === 1
        ? t("rules.front1", { name: name(rule.pupil) })
        : t("rules.frontN", { name: name(rule.pupil), rows: rule.rows });
    case "apart":
      return t("rules.apart", { a: name(rule.a), b: name(rule.b) });
    case "together":
      return t("rules.together", { a: name(rule.a), b: name(rule.b) });
  }
}

export { rulePupils };

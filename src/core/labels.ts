import type { Pupil, Room } from "./problem.ts";

/** Row and seat numbers as a teacher counts them: row 1 is the front, seat 1 is the left. */
export function seatPosition(
  room: Room,
  seat: number,
): { row: number; col: number } {
  return { row: Math.floor(seat / room.cols) + 1, col: (seat % room.cols) + 1 };
}

/** Display names, with "(2)" added to repeats so equal names stay tellable apart. */
export function displayNames(pupils: Pupil[]): Map<string, string> {
  const totals = new Map<string, number>();
  for (const { name } of pupils) totals.set(name, (totals.get(name) ?? 0) + 1);
  const seen = new Map<string, number>();
  const out = new Map<string, string>();
  for (const { id, name } of pupils) {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    out.set(id, totals.get(name)! > 1 ? `${name} (${n})` : name);
  }
  return out;
}

/** Plain data types for a classroom and the rules a teacher can set. */

export const MAX_PUPILS = 40;
export const MAX_SEATS = 48;

export interface Room {
  rows: number;
  cols: number;
  /** Seat positions (`row * cols + col`) that cannot be used. */
  blocked: number[];
}

export interface Pupil {
  id: string;
  name: string;
}

interface RuleBase {
  id: string;
  /** A disabled rule stays in the list but is ignored when planning. */
  enabled: boolean;
}

export interface PinRule extends RuleBase {
  kind: "pin";
  pupil: string;
  seat: number;
}

export interface FrontRule extends RuleBase {
  kind: "front";
  pupil: string;
  /** The pupil must sit in one of the first `rows` rows. */
  rows: number;
}

export interface ApartRule extends RuleBase {
  kind: "apart";
  a: string;
  b: string;
}

export interface TogetherRule extends RuleBase {
  kind: "together";
  a: string;
  b: string;
}

export type Rule = PinRule | FrontRule | ApartRule | TogetherRule;

/** The pupils a rule is about. */
export function rulePupils(rule: Rule): string[] {
  return rule.kind === "apart" || rule.kind === "together"
    ? [rule.a, rule.b]
    : [rule.pupil];
}

/** Whether a rule is about two pupils and their neighbouring seats. */
export function isPairRule(rule: Rule): rule is ApartRule | TogetherRule {
  return rule.kind === "apart" || rule.kind === "together";
}

export interface Problem {
  room: Room;
  pupils: Pupil[];
  rules: Rule[];
}

/** Pupil id to seat position. A pupil missing from the map is unseated. */
export type Plan = Record<string, number>;

export function seatCount(room: Room): number {
  return room.rows * room.cols;
}

export function usableSeats(room: Room): number[] {
  const blocked = new Set(room.blocked);
  return Array.from({ length: seatCount(room) }, (_, i) => i).filter(
    (i) => !blocked.has(i),
  );
}

/** Orthogonally adjacent pairs of seats, both usable, each pair listed once. */
export function adjacentPairs(room: Room): [number, number][] {
  const blocked = new Set(room.blocked);
  const pairs: [number, number][] = [];
  for (let r = 0; r < room.rows; r++) {
    for (let c = 0; c < room.cols; c++) {
      const seat = r * room.cols + c;
      if (blocked.has(seat)) continue;
      if (c + 1 < room.cols && !blocked.has(seat + 1)) {
        pairs.push([seat, seat + 1]);
      }
      if (r + 1 < room.rows && !blocked.has(seat + room.cols)) {
        pairs.push([seat, seat + room.cols]);
      }
    }
  }
  return pairs;
}

export function rowOf(room: Room, seat: number): number {
  return Math.floor(seat / room.cols);
}

export function areAdjacent(room: Room, a: number, b: number): boolean {
  const dr = Math.abs(rowOf(room, a) - rowOf(room, b));
  const dc = Math.abs((a % room.cols) - (b % room.cols));
  return dr + dc === 1;
}

/** Problems that make a problem unusable, before any rule is looked at. */
export function validateShape(problem: Problem): string[] {
  const { room, pupils, rules } = problem;
  const errors: string[] = [];
  if (!Number.isInteger(room.rows) || !Number.isInteger(room.cols)) {
    errors.push("room size must be whole numbers");
  } else if (room.rows < 1 || room.cols < 1) {
    errors.push("room needs at least one row and one column");
  } else if (seatCount(room) > MAX_SEATS) {
    errors.push(`room has more than ${MAX_SEATS} seat positions`);
  }
  if (pupils.length > MAX_PUPILS) {
    errors.push(`more than ${MAX_PUPILS} pupils`);
  }
  const ids = new Set(pupils.map((p) => p.id));
  if (ids.size !== pupils.length) errors.push("pupil ids must be unique");
  const ruleIds = new Set(rules.map((r) => r.id));
  if (ruleIds.size !== rules.length) errors.push("rule ids must be unique");
  for (const rule of rules) {
    const refs = rulePupils(rule);
    if (refs.some((id) => !ids.has(id))) {
      errors.push(`rule ${rule.id} names an unknown pupil`);
    }
    if (
      rule.kind === "pin" &&
      !(rule.seat >= 0 && rule.seat < seatCount(room))
    ) {
      errors.push(`rule ${rule.id} pins a seat outside the room`);
    }
    if (isPairRule(rule) && rule.a === rule.b) {
      errors.push(`rule ${rule.id} pairs a pupil with themselves`);
    }
  }
  return errors;
}

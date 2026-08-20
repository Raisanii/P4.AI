// P4.AI — Schedule pure helpers: week detection + day-key mapping (SCHD-05).
//
// No Prisma dependency — safe to import from tests, edge middleware, or AI.
// DB queries live in src/services/schedule.ts.

// ISO anchor: the Monday that begins a known Week A. Override via env so
// the cycle can be re-anchored each semester without a code change.
const WEEK_A_START = process.env.WEEK_A_START ?? "2026-01-05"; // 2026-01-05 is a Monday

export const DAY_KEYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;
export type DayKey = (typeof DAY_KEYS)[number];

const DAY_MAP: Record<DayKey, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

/** Detect the current A/B week for a given date (SCHD-05). */
export function detectWeekType(date: Date = new Date()): "A" | "B" {
  const anchor = new Date(WEEK_A_START + "T00:00:00Z");
  const msPerDay = 86_400_000;
  const diffDays = Math.floor((date.getTime() - anchor.getTime()) / msPerDay);
  // Two-week cycle → even offset = A, odd = B.
  return Math.floor(diffDays / 7) % 2 === 0 ? "A" : "B";
}

/** Normalize a DayKey string to a JS day-of-week number (0–6). */
export function dayKeyToNumber(key: string): number | null {
  return key in DAY_MAP ? DAY_MAP[key as DayKey] : null;
}

/** Return the Schedule.dayOfWeek string key (e.g. "monday") for a Date. */
export function dayKeyFor(date: Date = new Date()): DayKey {
  return DAY_KEYS[date.getUTCDay()];
}

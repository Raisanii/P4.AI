// P4.AI — Milestone pure helpers: countdown + expiry + cap (MILE-03..05).
//
// No Prisma dependency — safe to import from tests, edge middleware, or AI.
// DB queries live in src/services/milestone.ts.
//
// Countdown is computed in WIB (UTC+7) per the issue notes. `date` is the
// milestone's target date; "days remaining" counts whole calendar days from
// today's WIB midnight to the target's WIB midnight.

import type { MilestoneType } from "@prisma/client";

/** Max active milestones enforced at create-time (MILE-05). */
export const MAX_ACTIVE_MILESTONES = 5;

/** Milestone type values — matches the `MilestoneType` enum in the schema. */
export const MILESTONE_TYPES: readonly MilestoneType[] = [
  "PTS",
  "PAS",
  "PRAKERIN",
  "UJIAN",
  "LIBUR",
  "OTHER",
];

/** WIB timezone offset in hours (UTC+7). */
const WIB_OFFSET_HOURS = 7;

/**
 * Return `now` shifted to WIB (UTC+7). All countdown math uses WIB midnight
 * as the day boundary so the count stays stable throughout a WIB calendar day.
 */
export function nowInWIB(date: Date = new Date()): Date {
  return new Date(date.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Return midnight (00:00:00) in WIB for the given UTC date. Used as the
 * day boundary for countdown calculations.
 */
function wibMidnight(date: Date = new Date()): Date {
  const wib = nowInWIB(date);
  return new Date(Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate()));
}

/**
 * Compute days remaining from now to the milestone's target date (MILE-03).
 * Returns a non-negative integer: 0 = today or already past.
 *
 * Both `now` and the milestone `date` are anchored to WIB midnight so partial
 * days don't cause off-by-one flips.
 */
export function countdownDays(targetDate: Date, now: Date = new Date()): number {
  const msPerDay = 86_400_000;
  const today = wibMidnight(now);
  const target = wibMidnight(targetDate);
  const diff = Math.floor((target.getTime() - today.getTime()) / msPerDay);
  return Math.max(0, diff);
}

/**
 * Determine whether a milestone has expired (MILE-04). A milestone is expired
 * once its target date's WIB day has passed.
 */
export function isExpired(targetDate: Date, now: Date = new Date()): boolean {
  return countdownDays(targetDate, now) === 0 && wibMidnight(targetDate).getTime() < wibMidnight(now).getTime();
}

/**
 * Simpler "is the target day today or in the future" check — used by the
 * active view to decide whether to auto-hide (MILE-04). A milestone whose
 * date is strictly before today (WIB) is expired.
 */
export function isPastTarget(targetDate: Date, now: Date = new Date()): boolean {
  return wibMidnight(targetDate).getTime() < wibMidnight(now).getTime();
}

/** Type guard for milestone type strings coming from JSON request bodies. */
export function isMilestoneType(value: unknown): value is MilestoneType {
  return typeof value === "string" && (MILESTONE_TYPES as readonly string[]).includes(value);
}

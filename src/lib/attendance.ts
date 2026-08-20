// P4.AI — Attendance pure helpers: status validation + date parsing (ATT-02,03).
//
// No Prisma dependency — safe to import from tests, edge middleware, or AI.
// DB queries live in src/services/attendance.ts.

import type { AttendanceStatus } from "@prisma/client";

const STATUS_VALUES = ["HADIR", "SAKIT", "IZIN", "ALFA"] as const;
export type AttendanceStatusValue = (typeof STATUS_VALUES)[number];

export function isAttendanceStatus(v: unknown): v is AttendanceStatusValue {
  return typeof v === "string" && (STATUS_VALUES as readonly string[]).includes(v);
}

export { STATUS_VALUES };

/** Normalize any date to its day boundary at 00:00:00 UTC. */
export function toDateOnly(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Parse ?date=YYYY-MM-DD into a Date at 00:00:00 UTC; null if invalid. */
export function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? null : d;
}

export type { AttendanceStatus };

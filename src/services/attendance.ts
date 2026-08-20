// P4.AI — Attendance service: DB queries + recap aggregation (ATT-04).
//
// Recap returns counts per status (Hadar/Sakit/Izin/Alfa) for a given date.
// Student history returns chronological attendance records for one user.
// Pure helpers (validation, date parsing) live in src/lib/attendance.ts.

import { prisma } from "@/lib/db";
import type { AttendanceStatus } from "@prisma/client";
import { toDateOnly, parseDateParam, isAttendanceStatus } from "@/lib/attendance";

export {
  isAttendanceStatus,
  parseDateParam,
  toDateOnly,
} from "@/lib/attendance";
export type { AttendanceStatus } from "@prisma/client";

/** Fetch all attendance records for a given date (ATT-01). */
export async function getAttendanceByDate(date: Date) {
  const day = toDateOnly(date);
  const next = new Date(day);
  next.setUTCDate(next.getUTCDate() + 1);

  return prisma.attendance.findMany({
    where: { date: { gte: day, lt: next } },
    include: { user: { select: { id: true, name: true, nis: true } } },
    orderBy: { user: { name: "asc" } },
  });
}

/** Recap: counts per status for a date (ATT-04). */
export async function getAttendanceRecap(date: Date) {
  const records = await getAttendanceByDate(date);
  const recap = { HADIR: 0, SAKIT: 0, IZIN: 0, ALFA: 0 } as Record<AttendanceStatus, number>;
  for (const r of records) {
    recap[r.status] += 1;
  }
  return { recap, total: records.length, records };
}

/** Student attendance history, newest first (ATT-06). */
export async function getStudentHistory(userId: string, limit = 90) {
  return prisma.attendance.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

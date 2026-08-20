// P4.AI — Daily digest service: build class report from analytics (§7.15).
//
// Gathers today's task activity from ActivityLog + AssignmentProgress, finds
// the most active student, identifies students needing attention (TODO on an
// active assignment), and computes the completion rate. The result is a
// structured object the sender formats into the WhatsApp message template.
//
// Analytics source = ActivityLog (per §7.9 "Analytics bersumber dari activity
// log, bukan data yang diinput manual"). We count today's TASK_STARTED and
// TASK_COMPLETED events for activity counts; AssignmentProgress for the
// completion-rate denominator.

import { prisma } from "@/lib/db";
import { formatDigestDate, completionRate } from "@/lib/digest";
import type { Prisma } from "@prisma/client";

/** Structured digest data — the sender formats this into the WA message. */
export type ClassDigest = {
  date: string;
  startedToday: number;
  completedToday: number;
  totalStudents: number;
  notStarted: number;
  mostActiveStudent: { name: string; activityCount: number } | null;
  needsAttention: { count: number; assignmentTitle: string } | null;
  completionRate: number;
};

/**
 * Build the daily class digest (§7.15).
 *
 * - startedToday: unique students who started an assignment today (TASK_STARTED)
 * - completedToday: unique students who completed an assignment today (TASK_COMPLETED)
 * - notStarted: students with TODO status on any active assignment
 * - mostActiveStudent: student with the most task events today (started+completed)
 * - needsAttention: the assignment with the most not-started students, if any
 * - completionRate: overall DONE / total progress rows
 */
export async function buildDigest(now: Date = new Date()): Promise<ClassDigest> {
  // WIB day boundary: today's WIB midnight in UTC.
  const wibOffset = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + wibOffset);
  const wibMidnightUTC = new Date(
    Date.UTC(wibNow.getUTCFullYear(), wibNow.getUTCMonth(), wibNow.getUTCDate()) - wibOffset,
  );
  const tomorrowUTC = new Date(wibMidnightUTC.getTime() + 86_400_000);

  const dayStart = wibMidnightUTC;
  const dayEnd = tomorrowUTC;

  // Count total students (role STUDENT).
  const totalStudents = await prisma.user.count({
    where: { role: "STUDENT" },
  });

  // Today's task activity events.
  const todayEvents = await prisma.activityLog.findMany({
    where: {
      createdAt: { gte: dayStart, lt: dayEnd },
      eventType: { in: ["TASK_STARTED", "TASK_COMPLETED"] },
    },
    select: { userId: true, eventType: true },
  });

  const startedSet = new Set<string>();
  const completedSet = new Set<string>();
  const perUserActivity = new Map<string, number>();

  for (const e of todayEvents) {
    if (e.eventType === "TASK_STARTED") startedSet.add(e.userId);
    if (e.eventType === "TASK_COMPLETED") completedSet.add(e.userId);
    perUserActivity.set(e.userId, (perUserActivity.get(e.userId) ?? 0) + 1);
  }

  // Most active student today.
  let mostActiveStudent: ClassDigest["mostActiveStudent"] = null;
  let maxActivity = 0;
  for (const [userId, count] of perUserActivity) {
    if (count > maxActivity) {
      maxActivity = count;
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      if (u) mostActiveStudent = { name: u.name, activityCount: count };
    }
  }

  // Not-started: students with TODO on any assignment whose deadline hasn't passed.
  const notStartedRows = await prisma.assignmentProgress.findMany({
    where: {
      status: "TODO",
      assignment: { deadline: { gte: now } },
    },
    include: {
      user: { select: { id: true, name: true } },
      assignment: { select: { id: true, title: true } },
    },
  });

  // Count not-started per assignment, pick the one with the most.
  const notStartedByAssignment = new Map<string, { title: string; count: number }>();
  for (const r of notStartedRows) {
    const entry = notStartedByAssignment.get(r.assignmentId) ?? {
      title: r.assignment.title,
      count: 0,
    };
    entry.count += 1;
    notStartedByAssignment.set(r.assignmentId, entry);
  }

  let needsAttention: ClassDigest["needsAttention"] = null;
  let maxNotStarted = 0;
  for (const [, entry] of notStartedByAssignment) {
    if (entry.count > maxNotStarted) {
      maxNotStarted = entry.count;
      needsAttention = { count: entry.count, assignmentTitle: entry.title };
    }
  }

  // Completion rate: DONE / total progress rows (all assignments).
  const totalProgress = await prisma.assignmentProgress.count();
  const doneCount = await prisma.assignmentProgress.count({
    where: { status: "DONE" },
  });

  return {
    date: formatDigestDate(now),
    startedToday: startedSet.size,
    completedToday: completedSet.size,
    totalStudents,
    notStarted: notStartedRows.length,
    mostActiveStudent,
    needsAttention,
    completionRate: completionRate(doneCount, totalProgress),
  };
}

/**
 * Format the digest into the PRD §7.15 WhatsApp message template.
 *
 * ```
 * 📊 P4.AI — DAILY CLASS REPORT
 * Tanggal: {date}
 *
 * 📚 TASK ACTIVITY
 * Sudah mulai: {started}/{total}
 * Sudah selesai: {completed}/{total}
 * Belum mulai: {notStarted}/{total}
 *
 * 🔥 Paling aktif:
 * @{name} — {N} activity
 *
 * ⚠️ Perlu perhatian:
 * {N} siswa belum mulai tugas {title}.
 *
 * 📈 Completion rate:
 * {X}%
 * ```
 */
export function formatDigest(d: ClassDigest): string {
  const lines: string[] = [
    `📊 P4.AI — DAILY CLASS REPORT`,
    `Tanggal: ${d.date}`,
    ``,
    `📚 TASK ACTIVITY`,
    `Sudah mulai: ${d.startedToday}/${d.totalStudents}`,
    `Sudah selesai: ${d.completedToday}/${d.totalStudents}`,
    `Belum mulai: ${d.notStarted}/${d.totalStudents}`,
    ``,
    `🔥 Paling aktif:`,
    d.mostActiveStudent
      ? `@${d.mostActiveStudent.name} — ${d.mostActiveStudent.activityCount} activity`
      : `—`,
    ``,
    `⚠️ Perlu perhatian:`,
    d.needsAttention
      ? `${d.needsAttention.count} siswa belum mulai tugas ${d.needsAttention.assignmentTitle}.`
      : `—`,
    ``,
    `📈 Completion rate:`,
    `${d.completionRate}%`,
  ];
  return lines.join("\n");
}

// Re-export for sender convenience.
export { formatDigestDate, completionRate } from "@/lib/digest";

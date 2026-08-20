// P4.AI — Daily digest service: build class report from analytics (§7.15).
//
// Gathers class-wide task status from AssignmentProgress, finds the most
// active student (today's ActivityLog events), identifies students needing
// attention (TODO on an active assignment), and computes the completion rate.
// The result is a structured object the sender formats into the WA message.
//
// Analytics source = ActivityLog (per §7.9 "Analytics bersumber dari activity
// log, bukan data yang diinput manual"). Most-active student is derived from
// today's TASK_STARTED/TASK_COMPLETED events; the class-status counts come
// from AssignmentProgress (cumulative, per §7.15 where "Sudah mulai + Belum
// mulai" partition the class).

import { prisma } from "@/lib/db";
import { formatDigestDate, completionRate, wibDayRange } from "@/lib/digest";

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
 * - startedToday: distinct students who started an active assignment
 *   (IN_PROGRESS or DONE) — cumulative class status, not today-only
 * - completedToday: distinct students with DONE on an active assignment
 * - notStarted: distinct students still TODO on an active assignment who have
 *   not started anything (complement of "started", so the two partition the
 *   class — no student counted twice)
 * - mostActiveStudent: student with the most task events today (started+completed)
 * - needsAttention: the assignment with the most not-started students, if any
 * - completionRate: overall DONE / total progress rows
 *
 * Active = deadline not yet passed (overdue assignments are out of scope for
 * the "belum mulai" nudge; the reminder engine handles those).
 */
export async function buildDigest(now: Date = new Date()): Promise<ClassDigest> {
  const [dayStart, dayEnd] = wibDayRange(now);

  // Count total students (role STUDENT).
  const totalStudents = await prisma.user.count({
    where: { role: "STUDENT" },
  });

  // Today's task activity events → most-active student (per §7.15 "Paling aktif").
  const todayEvents = await prisma.activityLog.findMany({
    where: {
      createdAt: { gte: dayStart, lt: dayEnd },
      eventType: { in: ["TASK_STARTED", "TASK_COMPLETED"] },
    },
    select: { userId: true },
  });

  const perUserActivity = new Map<string, number>();
  for (const e of todayEvents) {
    perUserActivity.set(e.userId, (perUserActivity.get(e.userId) ?? 0) + 1);
  }

  // Most active student today — resolve names in one batch (no N+1).
  let mostActiveStudent: ClassDigest["mostActiveStudent"] = null;
  if (perUserActivity.size > 0) {
    const topId = [...perUserActivity.entries()].reduce((a, b) =>
      b[1] > a[1] ? b : a,
    )[0];
    const u = await prisma.user.findUnique({
      where: { id: topId },
      select: { name: true },
    });
    if (u) {
      mostActiveStudent = { name: u.name, activityCount: perUserActivity.get(topId)! };
    }
  }

  // Active assignment progress rows (deadline not passed) — cumulative status.
  const activeRows = await prisma.assignmentProgress.findMany({
    where: { assignment: { deadline: { gte: now } } },
    select: {
      userId: true,
      status: true,
      assignmentId: true,
      assignment: { select: { title: true } },
    },
  });

  const startedIds = new Set<string>();
  const completedIds = new Set<string>();
  const todoIds = new Set<string>();
  const notStartedByAssignment = new Map<string, { title: string; count: number }>();

  for (const r of activeRows) {
    if (r.status === "DONE") {
      startedIds.add(r.userId);
      completedIds.add(r.userId);
    } else if (r.status === "IN_PROGRESS") {
      startedIds.add(r.userId);
    } else if (r.status === "TODO") {
      todoIds.add(r.userId);
      const entry = notStartedByAssignment.get(r.assignmentId) ?? {
        title: r.assignment.title,
        count: 0,
      };
      entry.count += 1;
      notStartedByAssignment.set(r.assignmentId, entry);
    }
  }

  // Needs-attention: the assignment with the most TODO students (distinct users).
  let needsAttention: ClassDigest["needsAttention"] = null;
  let maxNotStarted = 0;
  for (const [, entry] of notStartedByAssignment) {
    if (entry.count > maxNotStarted) {
      maxNotStarted = entry.count;
      needsAttention = { count: entry.count, assignmentTitle: entry.title };
    }
  }

  // "Belum mulai" = distinct students still TODO on an active assignment who
  // have not started anything. A student who started one task and is still
  // TODO on another counts as "started", not twice.
  const notStarted = [...todoIds].filter((id) => !startedIds.has(id)).length;

  // Completion rate: DONE / total progress rows (all assignments).
  const totalProgress = await prisma.assignmentProgress.count();
  const doneCount = await prisma.assignmentProgress.count({
    where: { status: "DONE" },
  });

  return {
    date: formatDigestDate(now),
    startedToday: startedIds.size,
    completedToday: completedIds.size,
    totalStudents,
    notStarted,
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

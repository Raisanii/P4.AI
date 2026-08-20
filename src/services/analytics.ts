// P4.AI — Analytics service (§7.8 ACT, §7.9 ANALYTICS).
//
// All class metrics derive from ActivityLog + AssignmentProgress — never
// manual input (§7.9). ActivityLog is append-only (Constraint #13); we read
// it for "today" event counts and time-on-set. AssignmentProgress is the
// source for status buckets (In Progress / Done) and the completion/on-time
// rates. AssignmentProgress rows are created lazily on first START
// (state-machine.ts), so students who never touched a task have NO row —
// "not started" is derived, never counted from TODO-status rows.
//
// OVERDUE is computed via the shared `isOverdue` from overdue.ts (single
// source of truth, §7.5.2 — deadline < now, never <=, so a task at the
// exact deadline second is NOT overdue).
//
// PRD: TASK-11 (class progress), ACT, ANALYTICS.

import { prisma } from "@/lib/db";
import { isOverdue } from "@/services/overdue";
import type { AssignmentProgress, ActivityLog } from "@prisma/client";

/** Day boundary in WIB (UTC+07). Returns [start, end] for "today". */
function todayRange(now = new Date()): [Date, Date] {
  // WIB = UTC+7. A day in WIB starts at 00:00 WIB = 17:00 UTC previous day.
  const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
  const wibNow = new Date(now.getTime() + WIB_OFFSET_MS);
  const wibStart = new Date(wibNow);
  wibStart.setUTCHours(0, 0, 0, 0);
  const start = new Date(wibStart.getTime() - WIB_OFFSET_MS);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return [start, end];
}

/** ms → "Xh Ym" / "Ym" (PRD per-student table format). */
function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export interface ClassMetrics {
  startedToday: number;
  completedToday: number;
  notStarted: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
  onTimeRate: number;
  avgTimeToStartMs: number | null;
  avgTimeToStartLabel: string;
  avgCompletionTimeMs: number | null;
  avgCompletionTimeLabel: string;
  totalAssignments: number;
  totalStudents: number;
  /** totalStudents × totalAssignments — the true denominator (lazy progress rows). */
  totalProgressRecords: number;
}

export interface StudentRow {
  userId: string;
  name: string;
  nis: string;
  startedCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  avgTimeMs: number | null;
  avgTimeLabel: string;
}

/** GET /api/analytics/class — class-wide metrics (§7.9). */
export async function computeClassMetrics(): Promise<ClassMetrics> {
  const now = new Date();
  const [dayStart, dayEnd] = todayRange(now);

  // Parallel: students, assignments, progress, today's activity events.
  const [students, assignments, progress, todayLogs] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.assignment.count(),
    prisma.assignmentProgress.findMany({
      include: { assignment: { select: { deadline: true } } },
    }),
    prisma.activityLog.findMany({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
      select: { eventType: true },
    }),
  ]);

  // Today counts from ActivityLog (§7.8).
  const startedToday = todayLogs.filter(
    (l) => l.eventType === "TASK_STARTED",
  ).length;
  const completedToday = todayLogs.filter(
    (l) => l.eventType === "TASK_COMPLETED",
  ).length;

  // The universe of work is every student × every assignment (lazy progress
  // rows mean students who never STARTed have no row — we can't count them
  // from the progress table).  NFR-08: 36 students.
  const totalToComplete = students * assignments;

  // Status buckets from existing AssignmentProgress rows.
  let inProgress = 0;
  let overdue = 0;
  let doneCount = 0;
  let onTimeDone = 0;

  for (const p of progress) {
    if (p.status === "IN_PROGRESS") {
      inProgress += 1;
    } else if (p.status === "DONE") {
      doneCount += 1;
    }
    if (isOverdue(p.status, p.assignment.deadline, now)) {
      overdue += 1;
    }
    // On-time = completed and completedAt <= deadline.
    if (
      p.status === "DONE" &&
      p.completedAt &&
      p.completedAt.getTime() <= p.assignment.deadline.getTime()
    ) {
      onTimeDone += 1;
    }
  }

  // notStarted = everything not yet started = universe − (in-progress + done).
  // TODO-status rows that exist (created by a START that was recorded) are
  // counted as notStarted too — but the bulk are students who never STARTed.
  const notStarted = Math.max(0, totalToComplete - inProgress - doneCount);

  // Rates — guard divide-by-zero.
  const completionRate =
    totalToComplete > 0 ? Math.round((doneCount / totalToComplete) * 100) : 0;
  const onTimeRate =
    doneCount > 0 ? Math.round((onTimeDone / doneCount) * 100) : 0;

  // Average times from AssignmentProgress timestamps.
  let startSumMs = 0;
  let startN = 0;
  let completeSumMs = 0;
  let completeN = 0;
  for (const p of progress) {
    if (p.startedAt) {
      startSumMs += p.startedAt.getTime() - p.createdAt.getTime();
      startN += 1;
      if (p.completedAt) {
        completeSumMs += p.completedAt.getTime() - p.startedAt.getTime();
        completeN += 1;
      }
    }
  }
  const avgTimeToStartMs = startN > 0 ? Math.round(startSumMs / startN) : null;
  const avgCompletionTimeMs =
    completeN > 0 ? Math.round(completeSumMs / completeN) : null;

  return {
    startedToday,
    completedToday,
    notStarted,
    inProgress,
    overdue,
    completionRate,
    onTimeRate,
    avgTimeToStartMs,
    avgTimeToStartLabel: formatDuration(avgTimeToStartMs ?? -1),
    avgCompletionTimeMs,
    avgCompletionTimeLabel: formatDuration(avgCompletionTimeMs ?? -1),
    totalAssignments: assignments,
    totalStudents: students,
    totalProgressRecords: totalToComplete,
  };
}

/** GET /api/analytics/student — per-student table (§7.9). */
export async function computeStudentTable(): Promise<StudentRow[]> {
  // All students + their progress (with assignment deadline for overdue).
  // `assignments` is the per-student universe (lazy progress rows mean
  // students who never STARTed have no progress rows).
  const [students, assignments] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        nis: true,
        progress: true,
      },
    }),
    prisma.assignment.count(),
  ]);

  return students.map<StudentRow>((s) => {
    let startedCount = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let timeSumMs = 0;
    let timeN = 0;

    for (const p of s.progress) {
      if (p.status === "IN_PROGRESS") {
        inProgressCount += 1;
        startedCount += 1; // started = has begun (IN_PROGRESS or DONE)
      } else if (p.status === "DONE") {
        completedCount += 1;
        startedCount += 1;
      }
      if (p.startedAt && p.completedAt) {
        timeSumMs += p.completedAt.getTime() - p.startedAt.getTime();
        timeN += 1;
      }
    }

    // notStarted = total assignments − started (lazy rows: no row = not started).
    const notStartedCount = Math.max(0, assignments - startedCount);

    const avgTimeMs = timeN > 0 ? Math.round(timeSumMs / timeN) : null;
    return {
      userId: s.id,
      name: s.name,
      nis: s.nis,
      startedCount,
      completedCount,
      inProgressCount,
      notStartedCount,
      avgTimeMs,
      avgTimeLabel: formatDuration(avgTimeMs ?? -1),
    };
  });
}

// Re-export for route-handler typing convenience.
export type { AssignmentProgress, ActivityLog };

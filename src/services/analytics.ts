// P4.AI — Analytics service (§7.8 ACT, §7.9 ANALYTICS).
//
// All class metrics derive from ActivityLog + AssignmentProgress — never
// manual input (§7.9). ActivityLog is append-only (Constraint #13); we read
// it for "today" event counts and time-on-set. AssignmentProgress is the
// source for status buckets (Not Started / In Progress / Overdue) and the
// completion/on-time rates.
//
// PRD: TASK-11 (class progress), ACT, ANALYTICS.

import { prisma } from "@/lib/db";
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

/** Is an assignment overdue relative to `now`? Deadline passed and not all DONE. */
function isOverdue(
  deadline: Date,
  status: AssignmentProgress["status"],
  now = new Date(),
): boolean {
  return status !== "DONE" && deadline.getTime() <= now.getTime();
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

  // Status buckets from AssignmentProgress.
  let notStarted = 0;
  let inProgress = 0;
  let overdue = 0;
  let doneCount = 0;
  let onTimeDone = 0;
  let totalToComplete = 0; // every progress record is a unit of work to finish

  for (const p of progress) {
    totalToComplete += 1;
    if (p.status === "TODO") {
      notStarted += 1;
    } else if (p.status === "IN_PROGRESS") {
      inProgress += 1;
    } else if (p.status === "DONE") {
      doneCount += 1;
    }
    if (isOverdue(p.assignment.deadline, p.status, now)) {
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
    totalProgressRecords: progress.length,
  };
}

/** GET /api/analytics/student — per-student table (§7.9). */
export async function computeStudentTable(): Promise<StudentRow[]> {
  const now = new Date();

  // All students + their progress (with assignment deadline for overdue).
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nis: true,
      progress: {
        include: { assignment: { select: { deadline: true } } },
      },
    },
  });

  return students.map<StudentRow>((s) => {
    let startedCount = 0;
    let completedCount = 0;
    let inProgressCount = 0;
    let notStartedCount = 0;
    let timeSumMs = 0;
    let timeN = 0;

    for (const p of s.progress) {
      if (p.status === "TODO") {
        notStartedCount += 1;
      } else if (p.status === "IN_PROGRESS") {
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

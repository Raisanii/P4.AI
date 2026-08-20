// P4.AI — Reminder engine: candidate selection (§7.13, §7.14, WABOT-12/16).
//
// Given a reminder type (T-3d, T-1d, T-6h), find all (user, assignment) pairs
// that should receive a reminder right now:
//
// status == TODO AND deadline is within the offset window → SEND
// status == IN_PROGRESS → optional (only for T-6h, the urgent nudge)
// status == DONE → STOP (never reminded)
//
// The window is a NARROW BAND around each offset, not [now, now+offset]:
//   [now + offset - band, now + offset]
// so a task 5h from deadline only matches T-6h, not T-3d/T-1d too (§7.14 no
// spam). `bandMs` defaults to the 15-min poll interval so every tick catches
// the band exactly once.

import { prisma } from "@/lib/db";
import type { ReminderType, ProgressStatus } from "@prisma/client";

/** Hours before deadline each reminder type fires. */
const OFFSET_HOURS: Record<ReminderType, number> = {
  T_MINUS_3_DAYS: 72,
  T_MINUS_1_DAY: 24,
  T_MINUS_6_HOURS: 6,
};

/** Default band width = scheduler poll interval (15 min). */
const DEFAULT_BAND_MS = 15 * 60 * 1000;

export type ReminderCandidate = {
  userId: string;
  userName: string;
  whatsappNumber: string;
  assignmentId: string;
  assignmentTitle: string;
  deadline: Date;
  status: ProgressStatus;
  reminderType: ReminderType;
};

/**
 * Find candidates for a given reminder type whose deadline falls within the
 * narrow band `[now + offset - band, now + offset]`. Already-reminded pairs
 * are excluded via a single batched ReminderLog lookup (no N+1).
 */
export async function getReminderCandidates(
  reminderType: ReminderType,
  now: Date = new Date(),
  bandMs: number = DEFAULT_BAND_MS,
): Promise<ReminderCandidate[]> {
  const offsetMs = OFFSET_HOURS[reminderType] * 60 * 60 * 1000;
  const target = now.getTime() + offsetMs;
  const windowStart = new Date(target - bandMs);
  const windowEnd = new Date(target);

  // T-6h also reminds IN_PROGRESS students (optional per §7.14); others only TODO.
  const allowedStatuses: ProgressStatus[] =
    reminderType === "T_MINUS_6_HOURS"
      ? ["TODO", "IN_PROGRESS"]
      : ["TODO"];

  const rows = await prisma.assignmentProgress.findMany({
    where: {
      status: { in: allowedStatuses },
      assignment: {
        deadline: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    },
    select: {
      userId: true,
      assignmentId: true,
      status: true,
      user: {
        select: { id: true, name: true, whatsappNumber: true },
      },
      assignment: {
        select: { id: true, title: true, deadline: true },
      },
    },
  });

  if (rows.length === 0) return [];

  // Single batched dedup query — already-sent (userId, assignmentId) pairs.
  const sentLogs = await prisma.reminderLog.findMany({
    where: {
      reminderType,
      userId: { in: rows.map((r) => r.userId) },
      assignmentId: { in: rows.map((r) => r.assignmentId) },
    },
    select: { userId: true, assignmentId: true },
  });
  const sentSet = new Set(
    sentLogs.map((l) => `${l.userId}:${l.assignmentId}`),
  );

  const candidates: ReminderCandidate[] = [];
  for (const row of rows) {
    if (sentSet.has(`${row.userId}:${row.assignmentId}`)) continue;

    candidates.push({
      userId: row.userId,
      userName: row.user.name,
      whatsappNumber: row.user.whatsappNumber,
      assignmentId: row.assignmentId,
      assignmentTitle: row.assignment.title,
      deadline: row.assignment.deadline,
      status: row.status,
      reminderType,
    });
  }

  return candidates;
}

/** All reminder types, in chronological order (furthest first). */
export const ALL_REMINDER_TYPES: ReminderType[] = [
  "T_MINUS_3_DAYS",
  "T_MINUS_1_DAY",
  "T_MINUS_6_HOURS",
];

export { OFFSET_HOURS, DEFAULT_BAND_MS };

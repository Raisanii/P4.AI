// P4.AI — Reminder engine: candidate selection (§7.13, §7.14, WABOT-12/16).
//
// Given a reminder type (T-3d, T-1d, T-6h), find all (user, assignment) pairs
// that should receive a reminder right now:
//
//   status == TODO  AND deadline is within the offset window → SEND
//   status == IN_PROGRESS → optional (only for T-6h, the urgent nudge)
//   status == DONE → STOP (never reminded)
//
// Dedup is enforced later by the sender via ReminderLog unique constraint
// (userId + assignmentId + reminderType), but we pre-filter here so the
// scheduler doesn't even attempt already-sent reminders.

import { prisma } from "@/lib/db";
import type { ReminderType, ProgressStatus } from "@prisma/client";

/** Hours before deadline each reminder type fires. */
const OFFSET_HOURS: Record<ReminderType, number> = {
  T_MINUS_3_DAYS: 72,
  T_MINUS_1_DAY: 24,
  T_MINUS_6_HOURS: 6,
};

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
 * matching window. The window is [now, now + offset] — i.e. the deadline is
 * between now and `offset` hours from now. We also exclude DONE and
 * already-reminded pairs (via LEFT JOIN on ReminderLog).
 */
export async function getReminderCandidates(
  reminderType: ReminderType,
  now: Date = new Date(),
): Promise<ReminderCandidate[]> {
  const offsetMs = OFFSET_HOURS[reminderType] * 60 * 60 * 1000;
  const windowEnd = new Date(now.getTime() + offsetMs);

  // T-6h also reminds IN_PROGRESS students (optional per §7.14); others only TODO.
  const allowedStatuses: ProgressStatus[] =
    reminderType === "T_MINUS_6_HOURS"
      ? ["TODO", "IN_PROGRESS"]
      : ["TODO"];

  // Fetch progress rows matching the status + deadline window, with a LEFT
  // JOIN to ReminderLog so we can filter out already-sent reminders in one
  // query rather than N+1.
  const rows = await prisma.assignmentProgress.findMany({
    where: {
      status: { in: allowedStatuses },
      assignment: {
        deadline: {
          gte: now,
          lte: windowEnd,
        },
      },
    },
    include: {
      user: {
        select: { id: true, name: true, whatsappNumber: true },
      },
      assignment: {
        select: { id: true, title: true, deadline: true },
      },
      // We'll check reminderLogs in-memory; it's a small set.
    },
  });

  const candidates: ReminderCandidate[] = [];

  for (const row of rows) {
    // Check if already reminded for this type.
    const already = await prisma.reminderLog.findUnique({
      where: {
        userId_assignmentId_reminderType: {
          userId: row.userId,
          assignmentId: row.assignmentId,
          reminderType,
        },
      },
      select: { id: true },
    });
    if (already) continue;

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

export { OFFSET_HOURS };

// P4.AI — ReminderLog deduplication (§11.3, constraint #14).
//
// A reminder is sent at most once per (userId, assignmentId, reminderType).
// The unique constraint is enforced at the DB level; this module makes the
// check-and-record atomic so concurrent scheduler ticks can't double-send:
//
//   tick A: claim → create succeeds → send
//   tick B: claim → create throws P2002 → already claimed → skip send
//
// "Claim first, then send" — the opposite of the old sender order — means a
// message is never delivered for a pair that's already been logged, even under
// a race. If the send fails after a successful claim, the log row stays: we
// don't retry every tick. That's the same trade-off the old code made
// ("attempted at this offset"), just race-safe now.

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { ReminderType } from "@prisma/client";

export type DedupClaim = {
  userId: string;
  assignmentId: string;
  reminderType: ReminderType;
};

/** Unique-constraint compound key used by ReminderLog. */
const UNIQUE_KEY = "userId_assignmentId_reminderType" as const;

/**
 * Atomically claim a reminder slot by inserting a ReminderLog row. Returns
 * `true` if this caller won the claim (first to insert); `false` if a row
 * already exists (another tick already sent it).
 *
 * Uses a raw `create` — the unique constraint on (userId, assignmentId,
 * reminderType) turns a duplicate insert into Prisma's P2002, which we catch
 * and treat as "already sent, skip". This is race-safe: SQLite/Turso
 * serialises the unique-index insert, so exactly one `create` succeeds even
 * when two ticks race.
 */
export async function claimReminder(claim: DedupClaim): Promise<boolean> {
  try {
    await prisma.reminderLog.create({ data: claim });
    return true;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return false;
    }
    throw err;
  }
}

/**
 * Read-only check: has this reminder already been logged? Used by the engine
 * and manual route to pre-filter candidates before the atomic claim, cutting
 * wasted work (no point building a candidate for a pair already sent).
 *
 * The claim in `sender.ts` is the authoritative gate — this is just an
 * optimisation to avoid scheduling an already-sent reminder.
 */
export async function wasAlreadySent(claim: DedupClaim): Promise<boolean> {
  const existing = await prisma.reminderLog.findUnique({
    where: {
      [UNIQUE_KEY]: {
        userId: claim.userId,
        assignmentId: claim.assignmentId,
        reminderType: claim.reminderType,
      },
    },
    select: { id: true },
  });
  return existing !== null;
}

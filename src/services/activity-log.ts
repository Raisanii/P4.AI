// P4.AI — append-only ActivityLog writer (§7.5.3).
//
// The ActivityLog table is intentionally write-once: every meaningful event
// (TASK_STARTED, TASK_COMPLETED, …) is recorded as an immutable row so the
// platform can later compute start/completion times, per-day activity, and
// change source (WEB | WHATSAPP | ADMIN | SYSTEM).
//
// This module deliberately exposes ONLY an `append` function — there is no
// update or delete path anywhere in the codebase (NFR / acceptance: "ActivityLog
// has no update/delete code path"). A `prisma.activityLog.delete*` call
// elsewhere would violate §7.5.3; grep-verify with:
//   grep -rn "activityLog\.\(update\|delete\|upsert\)" src/
// which should return nothing.

import {
  PrismaClient,
  Prisma,
  type ActivityEventType,
  type Source,
} from "@prisma/client";
import { prisma } from "@/lib/db";

export interface AppendActivityInput {
  userId: string;
  assignmentId?: string | null;
  eventType: ActivityEventType;
  source: Source;
  metadata?: Record<string, unknown> | null;
}

/**
 * Append a single immutable event row to ActivityLog.
 * Never mutates an existing row — only inserts.
 *
 * Accepts an optional transaction client so the write can be committed
 * atomically with the progress update in the state machine.
 */
export async function appendActivityLog(
  input: AppendActivityInput,
  tx: PrismaClient | Prisma.TransactionClient = prisma,
): Promise<void> {
  await tx.activityLog.create({
    data: {
      userId: input.userId,
      assignmentId: input.assignmentId ?? null,
      eventType: input.eventType,
      source: input.source,
      metadata: input.metadata
        ? (input.metadata as Prisma.InputJsonValue)
        : Prisma.JsonNull,
    },
  });
}

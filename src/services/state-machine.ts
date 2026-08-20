// P4.AI — state machine service for AssignmentProgress (§7.5.1, TASK-05..11).
//
// Responsibilities:
//   1. Validate that a requested transition is allowed (forward-only).
//   2. Atomically update the AssignmentProgress row (status + timestamps +
//      source) inside a Prisma transaction together with the ActivityLog row,
//      so a successful transition ALWAYS produces exactly one append-only log
//      row.
//   3. Enforce uniqueness (assignmentId, userId) — one progress row per
//      student per task — by upserting on first START.
//
// Forbidden transitions (IN_PROGRESS→TODO, DONE→IN_PROGRESS, DONE→TODO) are
// rejected with a 409-equivalent error (TransitionError) that the route
// handler maps to HTTP 409 + reason.
//
// OVERDUE is never stored — it is a deadline condition computed on read
// (§7.5.2), handled separately in the read path, not here.

import { Prisma } from "@prisma/client";
import type {
  ActivityEventType,
  ProgressStatus,
  Source,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  type TransitionAction,
  TRANSITIONS,
  canTransition,
} from "@/lib/transitions";
import { appendActivityLog } from "@/services/activity-log";

/** Error thrown when a transition is rejected by the state machine. */
export class TransitionError extends Error {
  readonly code: "FORBIDDEN_TRANSITION" | "ASSIGNMENT_NOT_FOUND";
  readonly status: number;

  constructor(
    code: "FORBIDDEN_TRANSITION" | "ASSIGNMENT_NOT_FOUND",
    message: string,
    status: number,
  ) {
    super(message);
    this.name = "TransitionError";
    this.code = code;
    this.status = status;
  }
}

/** Maps an action to the ActivityEventType it emits. */
const EVENT_FOR_ACTION: Record<TransitionAction, ActivityEventType> = {
  START: "TASK_STARTED",
  COMPLETE: "TASK_COMPLETED",
};

export interface TransitionResult {
  progressId: string;
  status: ProgressStatus;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface TransitionInput {
  assignmentId: string;
  userId: string;
  action: TransitionAction;
  source: Source;
}

/**
 * Execute a forward-only state transition for a student's assignment progress.
 *
 * - Rejects forbidden transitions (409 TransitionError).
 * - Upserts the AssignmentProgress row (creates TODO row on first START).
 * - Records `startedAt`/`startedSource` on START, `completedAt`/
 *   `completedSource` on COMPLETE.
 * - Appends exactly one ActivityLog row inside the same transaction.
 *
 * Returns the updated progress row.
 */
export async function transition(
  input: TransitionInput,
): Promise<TransitionResult> {
  const { assignmentId, userId, action, source } = input;
  const { from: expectedFrom, to: target } = TRANSITIONS[action];
  const now = new Date();

  // Verify the assignment exists (also gates against deleted assignments).
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true },
  });
  if (!assignment) {
    throw new TransitionError(
      "ASSIGNMENT_NOT_FOUND",
      `Assignment ${assignmentId} not found`,
      404,
    );
  }

  return prisma.$transaction(async (tx) => {
    // Lock the progress row (or create a fresh TODO one on first contact).
    const existing = await tx.assignmentProgress.findUnique({
      where: { assignmentId_userId: { assignmentId, userId } },
    });

    const current: ProgressStatus = existing?.status ?? "TODO";

    // If the row doesn't exist yet, only START (TODO→IN_PROGRESS) is valid —
    // COMPLETE on a non-existent row would mean TODO→DONE, which is forbidden.
    const check = canTransition(current, target);
    if (!check.ok) {
      throw new TransitionError("FORBIDDEN_TRANSITION", check.reason, 409);
    }

    // Guard: the expected `from` must match — defends against a race where
    // `current` was computed differently (e.g. row created mid-flight).
    if (current !== expectedFrom) {
      throw new TransitionError(
        "FORBIDDEN_TRANSITION",
        `Expected ${expectedFrom}, found ${current}`,
        409,
      );
    }

    const patch: Prisma.AssignmentProgressUpdateInput =
      action === "START"
        ? { status: target, startedAt: now, startedSource: source }
        : { status: target, completedAt: now, completedSource: source };

    let row;
    if (existing) {
      row = await tx.assignmentProgress.update({
        where: { assignmentId_userId: { assignmentId, userId } },
        data: patch,
      });
    } else {
      row = await tx.assignmentProgress.create({
        data: {
          assignmentId,
          userId,
          status: target,
          startedAt: action === "START" ? now : null,
          startedSource: action === "START" ? source : null,
          completedAt: action === "COMPLETE" ? now : null,
          completedSource: action === "COMPLETE" ? source : null,
        },
      });
    }

    // Append exactly one immutable event row (§7.5.3) — same transaction.
    await appendActivityLog(
      {
        userId,
        assignmentId,
        eventType: EVENT_FOR_ACTION[action],
        source,
        metadata: { status: target },
      },
      tx,
    );

    return {
      progressId: row.id,
      status: row.status,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
    };
  });
}

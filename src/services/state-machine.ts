// P4.AI — State machine service (§7.5.1, TASK-08, NFR-10).
//
// Validates and applies forward-only transitions on AssignmentProgress.
// This is the single entry point for mutating progress status — route
// handlers call this, never prisma.assignmentProgress.update directly.
//
// On success: updates AssignmentProgress (status + timestamps + sources)
// and appends one ActivityLog row (TASK_STARTED / TASK_COMPLETED).
// On forbidden transition: returns `{ ok: false, reason }` — caller maps
// that to HTTP 409.

import { prisma } from "@/lib/db";
import { logActivity } from "@/services/activity-log";
import {
  validateTransition,
  getTargetStatus,
  getEventType,
  isSource,
  type TransitionAction,
} from "@/lib/transitions";
import type { ProgressStatus, Source } from "@prisma/client";

export type TransitionOutcome =
  | { ok: true; progress: ProgressResult }
  | { ok: false; reason: string; status: number };

export interface ProgressResult {
  id: string;
  assignmentId: string;
  userId: string;
  status: ProgressStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  startedSource: Source | null;
  completedSource: Source | null;
}

/**
 * Apply a forward-only state transition for a student on an assignment.
 *
 * - Finds or creates the AssignmentProgress row (unique assignmentId+userId).
 * - Validates the transition is allowed (TODO→IN_PROGRESS, IN_PROGRESS→DONE).
 * - Updates status + timestamps + source fields.
 * - Appends one ActivityLog event (append-only, NFR-11).
 *
 * Returns `{ ok: true, progress }` on success or `{ ok: false, reason, status }`
 * on failure (404 for missing task, 409 for forbidden transition).
 */
export async function applyTransition(params: {
  assignmentId: string;
  userId: string;
  action: TransitionAction;
  source?: Source;
}): Promise<TransitionOutcome> {
  const source: Source = isSource(params.source) ? params.source : "WEB";

  // Verify the assignment exists.
  const assignment = await prisma.assignment.findUnique({
    where: { id: params.assignmentId },
    select: { id: true, title: true },
  });
  if (!assignment) {
    return { ok: false, reason: "Task not found", status: 404 };
  }

  // Find or create the progress row (one per student per task — unique constraint).
  let progress = await prisma.assignmentProgress.findUnique({
    where: {
      assignmentId_userId: {
        assignmentId: params.assignmentId,
        userId: params.userId,
      },
    },
  });

  if (!progress) {
    progress = await prisma.assignmentProgress.create({
      data: {
        assignmentId: params.assignmentId,
        userId: params.userId,
        status: "TODO",
      },
    });
  }

  // Validate the transition (NFR-10: backend enforcement is mandatory).
  const result = validateTransition(params.action, progress.status);
  if (!result.ok) {
    return { ok: false, reason: result.reason, status: 409 };
  }

  const now = new Date();
  const target = getTargetStatus(params.action);

  // Apply the transition — only this service writes to AssignmentProgress.
  const updated = await prisma.assignmentProgress.update({
    where: { id: progress.id },
    data:
      params.action === "START"
        ? { status: target, startedAt: now, startedSource: source }
        : { status: target, completedAt: now, completedSource: source },
  });

  // Append-only activity log (NFR-11).
  await logActivity({
    userId: params.userId,
    assignmentId: params.assignmentId,
    eventType: getEventType(params.action),
    source,
    metadata: { taskTitle: assignment.title },
  });

  return {
    ok: true,
    progress: {
      id: updated.id,
      assignmentId: updated.assignmentId,
      userId: updated.userId,
      status: updated.status,
      startedAt: updated.startedAt,
      completedAt: updated.completedAt,
      startedSource: updated.startedSource,
      completedSource: updated.completedSource,
    },
  };
}

// P4.AI — OVERDUE computation (TASK-10, §7.5.2).
//
// OVERDUE is a computed deadline condition, never a stored state.
// A task is OVERDUE when:
//   deadline < now AND status ∈ { TODO, IN_PROGRESS }
// DONE tasks are never overdue (they were completed, regardless of deadline).

import type { ProgressStatus } from "@prisma/client";

/**
 * Returns true if the given progress + deadline combination is overdue.
 *
 * @param status   — the student's progress status (TODO / IN_PROGRESS / DONE)
 * @param deadline — the assignment deadline
 * @param now      — override for testing (defaults to current time)
 */
export function isOverdue(
  status: ProgressStatus,
  deadline: Date,
  now: Date = new Date(),
): boolean {
  if (status === "DONE") return false;
  return deadline.getTime() < now.getTime();
}

/**
 * Compute the effective display status for a progress row.
 *
 * Returns the stored status, or "OVERDUE" when the deadline has passed
 * and the task is not yet DONE (TASK-10).
 */
export function computeEffectiveStatus(
  status: ProgressStatus,
  deadline: Date,
  now: Date = new Date(),
): ProgressStatus | "OVERDUE" {
  if (isOverdue(status, deadline, now)) return "OVERDUE";
  return status;
}

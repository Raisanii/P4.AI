// P4.AI — transition table for AssignmentProgress state machine (§7.5.1).
//
// Allowed forward-only transitions:
//   TODO → IN_PROGRESS  (START)
//   IN_PROGRESS → DONE  (COMPLETE)
//
// Forbidden (enforced on backend — NFR-10, UI-only prevention not acceptable):
//   IN_PROGRESS → TODO
//   DONE → IN_PROGRESS
//   DONE → TODO
//
// OVERDUE is never a stored state — it is a deadline condition computed on read
// (§7.5.2), so it does not appear in this table.

import type { ProgressStatus } from "@prisma/client";

/** The two transition actions a student can trigger. */
export type TransitionAction = "START" | "COMPLETE";

/** Maps an action to the (from → to) status pair it represents. */
export const TRANSITIONS: Record<
  TransitionAction,
  { from: ProgressStatus; to: ProgressStatus }
> = {
  START: { from: "TODO", to: "IN_PROGRESS" },
  COMPLETE: { from: "IN_PROGRESS", to: "DONE" },
};

/** Allowed from→to pairs (forward-only). */
export const ALLOWED: ReadonlyArray<readonly [ProgressStatus, ProgressStatus]> =
  [
    ["TODO", "IN_PROGRESS"],
    ["IN_PROGRESS", "DONE"],
  ];

/**
 * Check whether a transition from `current` to `target` is allowed.
 * Returns `{ ok: true }` or `{ ok: false, reason }` describing the forbidden
 * transition (used to build the 409 response).
 */
export function canTransition(
  current: ProgressStatus,
  target: ProgressStatus,
): { ok: true } | { ok: false; reason: string } {
  if (current === target) {
    return { ok: false, reason: `Already ${current}` };
  }

  const allowed = ALLOWED.some(([from, to]) => from === current && to === target);
  if (allowed) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: `Forbidden transition: ${current} → ${target}`,
  };
}

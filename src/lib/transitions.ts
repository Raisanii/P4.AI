// P4.AI — Allowed transition table (§7.5.1, TASK-08, NFR-10).
//
// Forward-only state machine:
//   TODO → IN_PROGRESS  (START)
//   IN_PROGRESS → DONE  (COMPLETE)
//
// All other transitions are forbidden and must be rejected with 409.

import type { ProgressStatus, Source } from "@prisma/client";

/** Transition action verbs matching ActivityEventType. */
export type TransitionAction = "START" | "COMPLETE";

/** Result of a transition validation attempt. */
export type TransitionResult =
  | { ok: true; from: ProgressStatus; to: ProgressStatus; action: TransitionAction }
  | { ok: false; reason: string; current: ProgressStatus };

const ACTION_TO_TARGET: Record<TransitionAction, ProgressStatus> = {
  START: "IN_PROGRESS",
  COMPLETE: "DONE",
};

const ACTION_TO_EVENT: Record<
  TransitionAction,
  "TASK_STARTED" | "TASK_COMPLETED"
> = {
  START: "TASK_STARTED",
  COMPLETE: "TASK_COMPLETED",
};

const ALLOWED_FROM: Record<TransitionAction, ProgressStatus> = {
  START: "TODO",
  COMPLETE: "IN_PROGRESS",
};

export function getTargetStatus(action: TransitionAction): ProgressStatus {
  return ACTION_TO_TARGET[action];
}

export function getEventType(action: TransitionAction) {
  return ACTION_TO_EVENT[action];
}

export function getRequiredFrom(action: TransitionAction): ProgressStatus {
  return ALLOWED_FROM[action];
}

/**
 * Validate whether `action` is legal given the `current` status.
 * Returns `{ ok: true, from, to }` on success or `{ ok: false, reason }` on
 * forbidden transitions (NFR-10).
 */
export function validateTransition(
  action: TransitionAction,
  current: ProgressStatus,
): TransitionResult {
  const required = ALLOWED_FROM[action];
  if (current !== required) {
    return {
      ok: false,
      reason: `Cannot ${action.toLowerCase()} from ${current} (requires ${required})`,
      current,
    };
  }
  return { ok: true, from: current, to: ACTION_TO_TARGET[action], action };
}

/** All valid Source values — used to sanitize caller-supplied sources. */
const VALID_SOURCES: readonly Source[] = [
  "WEB",
  "WHATSAPP",
  "ADMIN",
  "SYSTEM",
] as const;

export function isSource(v: unknown): v is Source {
  return typeof v === "string" && (VALID_SOURCES as readonly string[]).includes(v);
}

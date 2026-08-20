// P4.AI — Task intent execution (§7.11, WABOT-13/14/15, NFR-12).
//
// Executes a validated task intent via the backend state machine.
// This is the ONLY path from a WhatsApp message to a progress mutation.
//
// Flow: WhatsApp → detectIntent → validateIntent → executeIntent → state machine → DB → activity log → confirmation.
// AI never writes the DB (§10): it only proposes an intent; the backend
// state machine (SUN-26) enforces all transitions + logging.

import { prisma } from "@/lib/db";
import { applyTransition } from "@/services/state-machine";
import { logActivity } from "@/services/activity-log";
import { computeEffectiveStatus } from "@/services/overdue";
import type { TransitionAction } from "@/lib/transitions";
import type { TaskIntent, TaskIntentType } from "@/services/task-agent/intent";
import type { ValidationResult } from "@/services/task-agent/validate";

export interface ExecuteInput {
  intent: TaskIntent;
  validation: Extract<ValidationResult, { ok: true }>;
  userId: string;
}

export interface ExecuteOutput {
  ok: boolean;
  /** User-facing confirmation / status reply. */
  reply: string;
}

/**
 * Execute a validated task intent through the backend state machine.
 * For START/DONE: applyTransition mutates AssignmentProgress + appends ActivityLog.
 * For STATUS: read-only query, no mutation.
 *
 * All mutations go through the state machine — never direct prisma writes.
 */
export async function executeIntent(input: ExecuteInput): Promise<ExecuteOutput> {
  const { intent, validation, userId } = input;
  const title = validation.taskTitle;

  // STATUS_TASK: read current progress, no mutation (WABOT-15).
  if (intent.type === "STATUS_TASK") {
    return statusReply(userId, validation.assignmentId, title);
  }

  const action: TransitionAction = validation.action!;
  const outcome = await applyTransition({
    assignmentId: validation.assignmentId,
    userId,
    action,
    source: "WHATSAPP",
  });

  if (!outcome.ok) {
    return {
      ok: false,
      reply: `Gagal: ${outcome.reason}`,
    };
  }

  // WABOT-13/14 confirmation.
  if (action === "START") {
    return {
      ok: true,
      reply: `✅ Tugas ${title} sekarang IN PROGRESS.`,
    };
  }
  // action === "COMPLETE"
  return {
    ok: true,
    reply: `✅ Tugas ${title} sekarang DONE. Kerja bagus!`,
  };
}

/** Build the status reply (WABOT-15) from the current progress row. */
async function statusReply(
  userId: string,
  assignmentId: string,
  title: string,
): Promise<ExecuteOutput> {
  const [progress, assignment] = await Promise.all([
    prisma.assignmentProgress.findUnique({
      where: { assignmentId_userId: { assignmentId, userId } },
    }),
    prisma.assignment.findUnique({
      where: { id: assignmentId },
      select: { deadline: true },
    }),
  ]);

  const status = progress?.status ?? "TODO";
  const deadline = assignment ? new Date(assignment.deadline) : null;
  const effective = deadline
    ? computeEffectiveStatus(status, deadline)
    : status;

  const startedAt = progress?.startedAt;
  const completedAt = progress?.completedAt;

  const parts: string[] = [`📋 ${title}`];

  if (effective === "OVERDUE") {
    parts.push(`Status: ${status} (TERLEWAT)`);
  } else {
    parts.push(`Status: ${status}`);
  }

  if (startedAt) parts.push(`Dimulai: ${fmtDate(startedAt)}`);
  if (completedAt) parts.push(`Selesai: ${fmtDate(completedAt)}`);

  return { ok: true, reply: parts.join(" | ") };
}

function fmtDate(d: Date): string {
  // Indonesian locale, compact.
  return d.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Log a STATUS_UPDATED_VIA_WHATSAPP event for observability.
 * Best-effort — never blocks the reply.
 */
export async function logWhatsAppStatusCheck(
  userId: string,
  assignmentId: string,
  taskTitle: string,
): Promise<void> {
  await logActivity({
    userId,
    assignmentId,
    eventType: "STATUS_UPDATED_VIA_WHATSAPP",
    source: "WHATSAPP",
    metadata: { taskTitle, action: "STATUS_QUERY" },
  });
}

export type { TaskIntent, TaskIntentType };

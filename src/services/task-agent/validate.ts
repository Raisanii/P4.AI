// P4.AI — Task intent validation (§7.11, NFR-12, Permission Matrix §6).
//
// After intent detection, validate before execution:
// 1. Task exists (resolve task query → Assignment).
// 2. Caller is a STUDENT (only students start/complete own tasks — §6).
// 3. For START/DONE: current progress state allows the transition (§7.5.1).
//
// This module is READ-ONLY. It never mutates the DB. It returns a structured
// verdict the executor acts on — AI proposes, backend decides (§10).

import { prisma } from "@/lib/db";
import { computeEffectiveStatus } from "@/services/overdue";
import { validateTransition, type TransitionAction } from "@/lib/transitions";
import type { Role } from "@/lib/roles";
import type { TaskIntent, TaskIntentType } from "@/services/task-agent/intent";

export type ValidationResult =
  | { ok: true; assignmentId: string; taskTitle: string; currentStatus: string; action: TransitionAction | null }
  | { ok: false; reply: string };

const INTENT_TO_ACTION: Record<TaskIntentType, TransitionAction | null> = {
  START_TASK: "START",
  DONE_TASK: "COMPLETE",
  STATUS_TASK: null, // read-only — no transition.
};

/**
 * Resolve a task query (subject, title fragment, or id) to an Assignment.
 * SQLite has no case-insensitive mode, so we fetch candidates and filter in JS.
 * Tries exact subject match first, then partial title/subject search.
 */
async function resolveAssignment(task: string) {
  const t = task.trim().toLowerCase();
  if (!t) return null;

  const candidates = await prisma.assignment.findMany({
    select: { id: true, title: true, subject: true, deadline: true },
    orderBy: { deadline: "asc" },
  });

  // Exact subject match (case-insensitive, JS).
  const exact = candidates.find((a) => a.subject.toLowerCase() === t);
  if (exact) return exact;

  // Title contains the query (case-insensitive).
  const titleMatch = candidates.find((a) => a.title.toLowerCase().includes(t));
  if (titleMatch) return titleMatch;

  // Subject contains the query (e.g. "b.inggris" → "Bahasa Inggris").
  return candidates.find((a) => a.subject.toLowerCase().includes(t)) ?? null;
}

/**
 * Validate a detected task intent against DB state + permissions.
 * Returns `{ ok: true }` if the intent can proceed to execution,
 * or `{ ok: false, reply }` with a user-facing rejection message.
 */
export async function validateIntent(
  intent: TaskIntent,
  params: { userId: string; role: Role },
): Promise<ValidationResult> {
  // Permission: only students start/complete tasks (§6).
  if (params.role !== "STUDENT") {
    return {
      ok: false,
      reply: "Hanya siswa yang bisa mengubah status tugas.",
    };
  }

  // Resolve the task.
  const assignment = await resolveAssignment(intent.task);
  if (!assignment) {
    return {
      ok: false,
      reply: `Tugas "${intent.task}" tidak ditemukan. Ketik 'STATUS <mapel>' untuk cek tugas aktif.`,
    };
  }

  // STATUS_TASK is read-only — no transition to validate.
  if (intent.type === "STATUS_TASK") {
    return {
      ok: true,
      assignmentId: assignment.id,
      taskTitle: assignment.title,
      currentStatus: "TODO",
      action: null,
    };
  }

  const action = INTENT_TO_ACTION[intent.type]!;

  // Load current progress (or assume TODO if no row yet).
  const progress = await prisma.assignmentProgress.findUnique({
    where: {
      assignmentId_userId: { assignmentId: assignment.id, userId: params.userId },
    },
  });
  const currentStatus = progress?.status ?? "TODO";

  // Check the transition is legal (§7.5.1, NFR-10).
  const result = validateTransition(action, currentStatus);
  if (!result.ok) {
    const effective = computeEffectiveStatus(currentStatus, new Date(assignment.deadline));
    return {
      ok: false,
      reply: `Gagal: ${result.reason}. Status saat ini: ${effective}.`,
    };
  }

  return {
    ok: true,
    assignmentId: assignment.id,
    taskTitle: assignment.title,
    currentStatus,
    action,
  };
}

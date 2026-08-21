// P4.AI — Task service: DB queries for task list + active tasks (TASK-04, DASH-05).
//
// No AI/clarification logic here — that lives in src/services/clarification.ts.
// This module is the read-side: task list sorted by deadline (TASK-04) and
// active-task widget data for the dashboard (DASH-05).
//
// Overdue highlighting (TASK-10) is computed client-side from deadline vs now;
// the service returns raw deadline so the UI can style per the PRD's OVERDUE
// condition ("deadline passed" — not a progress status).

import { prisma } from "@/lib/db";
import { isPastTarget } from "@/lib/milestone";

/** Assignment with relations needed by the task list and detail views. */
export type TaskWithRelations = Awaited<ReturnType<typeof getTaskById>>;

/**
 * All tasks sorted by deadline ascending (TASK-04).
 * Includes created-by name + clarification count + progress count.
 * All roles may call this — RBAC is enforced at the API route level.
 */
export async function getAllTasks() {
  return prisma.assignment.findMany({
    orderBy: { deadline: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      clarifications: { select: { id: true, question: true, answer: true } },
      _count: { select: { progress: true } },
    },
  });
}

/**
 * Single task by ID (TASK-12 edit/detail).
 * Returns null if not found — caller returns 404.
 */
export async function getTaskById(id: string) {
  return prisma.assignment.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      clarifications: { select: { id: true, question: true, answer: true } },
      _count: { select: { progress: true } },
    },
  });
}

/** Active task for dashboard widget (DASH-05): upcoming non-expired tasks. */
export type ActiveTaskItem = {
  id: string;
  title: string;
  subject: string;
  deadline: Date;
  type: string;
  progressCount: number;
};

/**
 * Active tasks for the dashboard widget (DASH-05).
 * Returns upcoming tasks (deadline not yet passed in WIB), sorted by soonest
 * deadline. Limited to 5 so the widget stays compact.
 */
export async function getActiveTasks(
  now: Date = new Date(),
): Promise<ActiveTaskItem[]> {
  const tasks = await prisma.assignment.findMany({
    orderBy: { deadline: "asc" },
    include: { _count: { select: { progress: true } } },
  });

  return tasks
    .filter((t) => !isPastTarget(t.deadline, now))
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      title: t.title,
      subject: t.subject,
      deadline: t.deadline,
      type: t.type,
      progressCount: t._count.progress,
    }));
}

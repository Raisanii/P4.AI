// P4.AI — GET /api/tasks/[id]/progress
//
// View task progress (TASK-09, TASK-11).
// Permission Matrix §6:
//   "View task progress" = SUPER_ADMIN / SECRETARY (all students),
//   STUDENT = own progress only.
//
// Response shape (same for both roles; STUDENT scope is filtered server-side):
//   [
//     { userId, name, status, startedAt, completedAt,
//       startedSource, completedSource, overdue }
//   ]
//
// OVERDUE is computed here — never stored (§7.5.2): a row is overdue when
// status !== DONE AND assignment.deadline < now.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: { id: true, deadline: true },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const now = new Date();
  const isOverdue = assignment.deadline < now;

  // Students only see their own progress row; admins see all students.
  const isPrivileged =
    ctx.role === "SUPER_ADMIN" || ctx.role === "SECRETARY";

  const rows = await prisma.assignmentProgress.findMany({
    where: {
      assignmentId: id,
      ...(isPrivileged ? {} : { userId: ctx.userId }),
    },
    select: {
      userId: true,
      status: true,
      startedAt: true,
      completedAt: true,
      startedSource: true,
      completedSource: true,
      user: { select: { name: true } },
    },
  });

  return NextResponse.json(
    rows.map((r) => ({
      userId: r.userId,
      name: r.user.name,
      status: r.status,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
      startedSource: r.startedSource,
      completedSource: r.completedSource,
      overdue: r.status !== "DONE" && isOverdue,
    })),
  );
}

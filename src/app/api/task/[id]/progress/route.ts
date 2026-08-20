// P4.AI — Class progress endpoint (TASK-11, §7.5).
//
// GET /api/task/[id]/progress — SUPER_ADMIN, SECRETARY only.
// Returns per-student progress for an assignment, with OVERDUE computed
// from deadline + status (TASK-10).
//
// Response shape:
// {
//   assignmentId, title, deadline,
//   summary: { TODO, IN_PROGRESS, DONE, OVERDUE, total },
//   students: [{ userId, name, status, effectiveStatus, startedAt, completedAt, ... }]
// }

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { computeEffectiveStatus } from "@/services/overdue";
import type { ProgressStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      subject: true,
      deadline: true,
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // All students — role STUDENT only (exclude admins/secretaries from progress).
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // All progress rows for this assignment.
  const progressRows = await prisma.assignmentProgress.findMany({
    where: { assignmentId: id },
  });

  const progressByUser = new Map(progressRows.map((p) => [p.userId, p]));

  const now = new Date();
  const deadline = new Date(assignment.deadline);

  const summary = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
    OVERDUE: 0,
    total: students.length,
  };

  const studentProgress = students.map((student) => {
    const row = progressByUser.get(student.id);
    const status: ProgressStatus = row?.status ?? "TODO";
    const effectiveStatus = computeEffectiveStatus(status, deadline, now);

    // Count into summary (OVERDUE is a display condition, not a stored status).
    if (effectiveStatus === "OVERDUE") {
      summary.OVERDUE++;
    } else {
      summary[status]++;
    }

    return {
      userId: student.id,
      name: student.name,
      status,
      effectiveStatus,
      startedAt: row?.startedAt ?? null,
      completedAt: row?.completedAt ?? null,
      startedSource: row?.startedSource ?? null,
      completedSource: row?.completedSource ?? null,
    };
  });

  return NextResponse.json({
    assignmentId: assignment.id,
    title: assignment.title,
    subject: assignment.subject,
    deadline: assignment.deadline,
    summary,
    students: studentProgress,
  });
}

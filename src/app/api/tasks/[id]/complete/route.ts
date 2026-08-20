// P4.AI — POST /api/tasks/[id]/complete
//
// Student completes a task (TASK-07). Transition IN_PROGRESS → DONE.
// Permission Matrix §6: "Complete task" = STUDENT only, own progress.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { transition, TransitionError } from "@/services/state-machine";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("STUDENT");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  try {
    const result = await transition({
      assignmentId: id,
      userId: ctx.userId,
      action: "COMPLETE",
      source: "WEB",
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TransitionError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status },
      );
    }
    console.error("task/complete", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

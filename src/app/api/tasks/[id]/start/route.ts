// P4.AI — POST /api/tasks/[id]/start
//
// Student starts a task (TASK-06). Transition TODO → IN_PROGRESS.
// Permission Matrix §6: "Start task" = STUDENT only, own progress.
//
// Source: derived from origin — WEB for browser requests (NFR). WHATSAPP,
// ADMIN, SYSTEM sources go through the WhatsApp/integration layer, not here.

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
      action: "START",
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
    console.error("task/start", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

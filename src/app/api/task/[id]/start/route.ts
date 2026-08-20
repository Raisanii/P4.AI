// P4.AI — START task endpoint (TASK-06, §7.5.1).
//
// POST /api/task/[id]/start — STUDENT only.
// Transitions AssignmentProgress TODO → IN_PROGRESS via the state machine.
// Source defaults to WEB (§7.5.4); can be overridden via request body.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { applyTransition } from "@/services/state-machine";
import { isSource } from "@/lib/transitions";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("STUDENT");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  // Optional source override (defaults to WEB).
  let sourceOverride: unknown = undefined;
  try {
    const body = await request.json();
    if (typeof body === "object" && body !== null && "source" in body) {
      sourceOverride = (body as { source?: unknown }).source;
    }
  } catch {
    // Body is optional for START — ignore parse errors.
  }

  const outcome = await applyTransition({
    assignmentId: id,
    userId: ctx.userId,
    action: "START",
    source: isSource(sourceOverride) ? sourceOverride : "WEB",
  });

  if (!outcome.ok) {
    return NextResponse.json(
      { error: outcome.reason },
      { status: outcome.status },
    );
  }

  return NextResponse.json(outcome.progress);
}

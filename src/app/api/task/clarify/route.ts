// P4.AI — Task clarification API (TASK-02, §7.6).
//
// POST /api/task/clarify — SUPER_ADMIN, SECRETARY only.
// AI generates 3-5 clarification questions from a task draft.
//
// Body: { title: string, subject?: string, description?: string }
// Returns: { questions: string[] }
//
// AI proposes, backend decides: questions are validated (3-5 count)
// before returning. If 9router is down, deterministic fallback questions
// are used (risk: "9router down → Retry + fallback").

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { generateClarificationQuestions, type TaskDraft } from "@/services/clarification";

export const dynamic = "force-dynamic";

// POST — generate clarification questions.
export async function POST(request: Request) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  if (typeof b.title !== "string" || b.title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const draft: TaskDraft = {
    title: b.title.trim(),
    subject: typeof b.subject === "string" ? b.subject.trim() : undefined,
    description: typeof b.description === "string" ? b.description.trim() : undefined,
  };

  const questions = await generateClarificationQuestions(draft);

  return NextResponse.json({ questions });
}

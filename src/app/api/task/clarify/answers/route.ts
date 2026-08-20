// P4.AI — Task clarification answers API (TASK-03, §7.6).
//
// POST /api/task/clarify/answers — SUPER_ADMIN, SECRETARY only.
// Submit answers → compile knowledge base → create Assignment.
//
// Body:
//   { draft: { title, subject?, description? },
//     clarifications: [{ question, answer }] }
// Returns: the created Assignment (201).
//
// AI proposes, backend decides: the compiled knowledge base is validated
// server-side — type must be INDIVIDUAL|GROUP, deadline must be a valid
// ISO date — before the Assignment is written (§10, constraint #11).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import {
  compileKnowledgeBase,
  type TaskDraft,
  type Clarification,
} from "@/services/clarification";

export const dynamic = "force-dynamic";

// POST — compile answers into knowledge base + create Assignment.
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

  // Validate draft.
  const draftRaw = b.draft as Record<string, unknown> | undefined;
  if (!draftRaw || typeof draftRaw.title !== "string" || draftRaw.title.trim().length === 0) {
    return NextResponse.json({ error: "draft.title is required" }, { status: 400 });
  }

  const draft: TaskDraft = {
    title: draftRaw.title.trim(),
    subject: typeof draftRaw.subject === "string" ? draftRaw.subject.trim() : undefined,
    description: typeof draftRaw.description === "string" ? draftRaw.description.trim() : undefined,
  };

  // Validate clarifications.
  const clarificationsRaw = b.clarifications;
  if (!Array.isArray(clarificationsRaw) || clarificationsRaw.length === 0) {
    return NextResponse.json(
      { error: "clarifications must be a non-empty array" },
      { status: 400 },
    );
  }

  const clarifications: Clarification[] = [];
  for (const item of clarificationsRaw) {
    const c = item as Record<string, unknown>;
    if (typeof c.question !== "string" || typeof c.answer !== "string") {
      return NextResponse.json(
        { error: "each clarification must have { question, answer }" },
        { status: 400 },
      );
    }
    clarifications.push({ question: c.question.trim(), answer: c.answer.trim() });
  }

  // Compile knowledge base via AI (with deterministic fallback).
  const kb = await compileKnowledgeBase(draft, clarifications);

  // Server-side validation of compiled KB (constraint #11: AI proposes,
  // backend decides).
  if (!kb.subject) {
    return NextResponse.json(
      { error: "Could not determine subject from clarification" },
      { status: 422 },
    );
  }

  const deadline = new Date(kb.deadline);
  if (Number.isNaN(deadline.getTime())) {
    return NextResponse.json(
      { error: "Could not determine a valid deadline from clarification" },
      { status: 422 },
    );
  }

  // Create Assignment + store clarifications atomically.
  const task = await prisma.assignment.create({
    data: {
      title: kb.title,
      subject: kb.subject,
      description: kb.description,
      deadline,
      type: kb.type,
      submissionFormat: kb.submissionFormat,
      criteria: kb.criteria,
      reference: kb.reference,
      knowledgeBase: kb,
      createdById: ctx.userId,
      clarifications: {
        create: clarifications.map((c) => ({
          question: c.question,
          answer: c.answer,
        })),
      },
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      clarifications: true,
    },
  });

  return NextResponse.json(task, { status: 201 });
}

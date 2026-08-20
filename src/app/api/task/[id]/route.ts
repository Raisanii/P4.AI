// P4.AI — Task item API (TASK-12).
//
// GET /api/task/[id] — all roles; task detail.
// PUT /api/task/[id] — SUPER_ADMIN, SECRETARY only; edit (TASK-12).
// DELETE /api/task/[id] — SUPER_ADMIN, SECRETARY only; delete (TASK-12).
//
// PUT accepts partial updates: title, subject, description, deadline,
// type, submissionFormat, criteria, reference. knowledgeBase is
// re-compiled from the updated fields on each PUT.

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ASSIGNMENT_TYPES = ["INDIVIDUAL", "GROUP"] as const;
type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

function isAssignmentType(v: unknown): v is AssignmentType {
  return typeof v === "string" && (ASSIGNMENT_TYPES as readonly string[]).includes(v);
}

// Prisma update input — knowledgeBase is a Json column, so we use Prisma's
// generated type to avoid `Record<string, unknown>` incompatibility.
type AssignmentUpdateData = Prisma.Args<typeof prisma.assignment, "update">["data"];

// GET — task detail. All roles.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY", "STUDENT");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const task = await prisma.assignment.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      clarifications: true,
      _count: { select: { progress: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  return NextResponse.json(task);
}

// PUT — update task. SUPER_ADMIN or SECRETARY only (TASK-12).
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const data: AssignmentUpdateData = {};

  if (b.title !== undefined) {
    if (typeof b.title !== "string" || b.title.trim().length === 0) {
      return NextResponse.json({ error: "title must be non-empty" }, { status: 400 });
    }
    data.title = b.title.trim();
  }

  if (b.subject !== undefined) {
    if (typeof b.subject !== "string" || b.subject.trim().length === 0) {
      return NextResponse.json({ error: "subject must be non-empty" }, { status: 400 });
    }
    data.subject = b.subject.trim();
  }

  if (b.description !== undefined) {
    if (typeof b.description !== "string" || b.description.trim().length === 0) {
      return NextResponse.json({ error: "description must be non-empty" }, { status: 400 });
    }
    data.description = b.description.trim();
  }

  if (b.deadline !== undefined) {
    const d = new Date(String(b.deadline));
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "deadline must be a valid ISO 8601 date" },
        { status: 400 },
      );
    }
    data.deadline = d;
  }

  if (b.type !== undefined) {
    if (!isAssignmentType(b.type)) {
      return NextResponse.json(
        { error: "type must be INDIVIDUAL or GROUP" },
        { status: 400 },
      );
    }
    data.type = b.type;
  }

  if (b.submissionFormat !== undefined) {
    data.submissionFormat =
      typeof b.submissionFormat === "string" && b.submissionFormat.trim().length > 0
        ? b.submissionFormat.trim()
        : null;
  }

  if (b.criteria !== undefined) {
    data.criteria =
      typeof b.criteria === "string" && b.criteria.trim().length > 0
        ? b.criteria.trim()
        : null;
  }

  if (b.reference !== undefined) {
    data.reference =
      typeof b.reference === "string" && b.reference.trim().length > 0
        ? b.reference.trim()
        : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const existing = await prisma.assignment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Re-compile knowledgeBase from the merged fields (TASK-03 consistency).
  const existingDeadline = new Date(existing.deadline);
  const deadlineForKb =
    data.deadline instanceof Date ? data.deadline : existingDeadline;
  const kb = {
    title: data.title ?? existing.title,
    subject: data.subject ?? existing.subject,
    description: data.description ?? existing.description,
    deadline: deadlineForKb.toISOString(),
    type: data.type ?? existing.type,
    submissionFormat: data.submissionFormat !== undefined
      ? data.submissionFormat
      : existing.submissionFormat,
    criteria: data.criteria !== undefined ? data.criteria : existing.criteria,
    reference: data.reference !== undefined ? data.reference : existing.reference,
  };
  data.knowledgeBase = kb;

  const updated = await prisma.assignment.update({
    where: { id },
    data,
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE — remove task. SUPER_ADMIN or SECRETARY only (TASK-12).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const existing = await prisma.assignment.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await prisma.assignment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

// P4.AI — Task API (TASK-01, TASK-04, TASK-12).
//
// GET /api/task?sort=deadline — all roles; sorted by deadline ascending (TASK-04).
// POST /api/task — SUPER_ADMIN, SECRETARY only; create task (TASK-01, TASK-12).
//
// Permission Matrix §6: all roles may view; CRUD = SUPER_ADMIN + SECRETARY only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const ASSIGNMENT_TYPES = ["INDIVIDUAL", "GROUP"] as const;
type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

function isAssignmentType(v: unknown): v is AssignmentType {
  return typeof v === "string" && (ASSIGNMENT_TYPES as readonly string[]).includes(v);
}

// GET — all roles. Tasks sorted by deadline ascending (TASK-04).
export async function GET(request: Request) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY", "STUDENT");
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const sort = url.searchParams.get("sort");

  // Only "deadline" sort supported; default is deadline ascending.
  const orderBy = sort === "deadline" || sort === null
    ? { deadline: "asc" as const }
    : { deadline: "asc" as const };

  const tasks = await prisma.assignment.findMany({
    orderBy,
    include: {
      createdBy: { select: { id: true, name: true } },
      _count: { select: { progress: true } },
    },
  });

  return NextResponse.json(tasks);
}

// POST — create task. SUPER_ADMIN or SECRETARY only (TASK-01, TASK-12).
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

  // Required fields.
  if (typeof b.title !== "string" || b.title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof b.subject !== "string" || b.subject.trim().length === 0) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (typeof b.description !== "string" || b.description.trim().length === 0) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (typeof b.deadline !== "string" || b.deadline.trim().length === 0) {
    return NextResponse.json({ error: "deadline is required" }, { status: 400 });
  }

  const deadline = new Date(b.deadline);
  if (Number.isNaN(deadline.getTime())) {
    return NextResponse.json(
      { error: "deadline must be a valid ISO 8601 date" },
      { status: 400 },
    );
  }

  if (!isAssignmentType(b.type)) {
    return NextResponse.json(
      { error: "type must be INDIVIDUAL or GROUP" },
      { status: 400 },
    );
  }

  // Optional fields.
  const submissionFormat =
    typeof b.submissionFormat === "string" && b.submissionFormat.trim().length > 0
      ? b.submissionFormat.trim()
      : null;
  const criteria =
    typeof b.criteria === "string" && b.criteria.trim().length > 0
      ? b.criteria.trim()
      : null;
  const reference =
    typeof b.reference === "string" && b.reference.trim().length > 0
      ? b.reference.trim()
      : null;

  // Build knowledge base JSON from submitted fields (TASK-03 structure).
  const knowledgeBase = {
    title: b.title.trim(),
    subject: b.subject.trim(),
    description: b.description.trim(),
    deadline: b.deadline.trim(),
    type: b.type,
    submissionFormat,
    criteria,
    reference,
  };

  const task = await prisma.assignment.create({
    data: {
      title: b.title.trim(),
      subject: b.subject.trim(),
      description: b.description.trim(),
      deadline,
      type: b.type,
      submissionFormat,
      criteria,
      reference,
      knowledgeBase,
      createdById: ctx.userId,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(task, { status: 201 });
}

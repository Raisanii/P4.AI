// GET /api/milestone/[id] — fetch a single milestone. All roles.
// PUT /api/milestone/[id] — update a milestone. SUPER_ADMIN + SECRETARY only.
// DELETE /api/milestone/[id] — delete a milestone. SUPER_ADMIN + SECRETARY only.
//
// Permission Matrix §6: view = all; CRUD = SUPER_ADMIN + SECRETARY only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { isMilestoneType, countdownDays } from "@/lib/milestone";
import {
  updateMilestone,
  deleteMilestone,
  MilestoneCapError,
} from "@/services/milestone";
import type { MilestoneType } from "@prisma/client";

export const dynamic = "force-dynamic";

// GET — all roles.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const milestone = await prisma.milestone.findUnique({ where: { id } });
  if (!milestone) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  // Include countdown for consistency with the list view.
  return NextResponse.json({
    milestone: { ...milestone, countdownDays: countdownDays(milestone.date) },
  });
}

// PUT — SUPER_ADMIN + SECRETARY.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing milestone id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  // Build partial update from provided fields; validate each one present.
  const data: {
    title?: string;
    type?: MilestoneType;
    date?: Date;
    active?: boolean;
  } = {};

  if (b.title !== undefined) {
    if (typeof b.title !== "string" || b.title.trim().length === 0) {
      return NextResponse.json({ error: "title must be non-empty" }, { status: 400 });
    }
    data.title = b.title.trim();
  }

  if (b.type !== undefined) {
    if (!isMilestoneType(b.type)) {
      return NextResponse.json(
        { error: "type must be one of PTS, PAS, PRAKERIN, UJIAN, LIBUR, OTHER" },
        { status: 400 },
      );
    }
    data.type = b.type;
  }

  if (b.date !== undefined) {
    if (typeof b.date !== "string") {
      return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
    }
    const date = new Date(b.date + "T00:00:00Z");
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "date must be a valid YYYY-MM-DD" }, { status: 400 });
    }
    data.date = date;
  }

  if (b.active !== undefined) {
    if (typeof b.active !== "boolean") {
      return NextResponse.json({ error: "active must be a boolean" }, { status: 400 });
    }
    data.active = b.active;
  }

  try {
    const milestone = await updateMilestone(id, data);
    if (!milestone) {
      return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
    }
    return NextResponse.json({ milestone });
  } catch (err) {
    if (err instanceof MilestoneCapError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}

// DELETE — SUPER_ADMIN + SECRETARY.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing milestone id" }, { status: 400 });
  }

  const existing = await prisma.milestone.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  }

  await deleteMilestone(id);
  return NextResponse.json({ ok: true });
}

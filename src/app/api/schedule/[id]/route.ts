// GET /api/schedule/[id] — fetch a single schedule entry. All roles.
// PUT /api/schedule/[id] — update a schedule entry (SCHD-06). SUPER_ADMIN + SECRETARY only.
// DELETE /api/schedule/[id] — delete a schedule entry (SCHD-06). SUPER_ADMIN + SECRETARY only.
//
// Permission Matrix §6: view = all; CRUD = SUPER_ADMIN + SECRETARY only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

const VALID_DAYS = new Set([
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
]);

function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

// GET — all roles.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  const entry = await prisma.schedule.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
  }
  return NextResponse.json({ entry });
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
    return NextResponse.json({ error: "Missing schedule id" }, { status: 400 });
  }

  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;

  // Build a partial update from provided fields; validate each one present.
  const data: {
    dayOfWeek?: string;
    weekType?: "A" | "B" | null;
    subject?: string;
    teacher?: string | null;
    startTime?: string;
    endTime?: string;
    room?: string | null;
  } = {};

  if (b.dayOfWeek !== undefined) {
    if (typeof b.dayOfWeek !== "string" || !VALID_DAYS.has(b.dayOfWeek.toLowerCase())) {
      return NextResponse.json(
        { error: "dayOfWeek must be a day name (sunday..saturday)" },
        { status: 400 },
      );
    }
    data.dayOfWeek = b.dayOfWeek.toLowerCase();
  }

  if (b.weekType !== undefined) {
    if (b.weekType === null) {
      data.weekType = null;
    } else if (b.weekType === "A" || b.weekType === "B") {
      data.weekType = b.weekType;
    } else if (typeof b.weekType === "string") {
      const up = b.weekType.toUpperCase();
      if (up === "A" || up === "B") data.weekType = up;
      else if (up === "") data.weekType = null;
      else
        return NextResponse.json(
          { error: "weekType must be 'A', 'B', or null" },
          { status: 400 },
        );
    } else {
      return NextResponse.json(
        { error: "weekType must be 'A', 'B', or null" },
        { status: 400 },
      );
    }
  }

  if (b.subject !== undefined) {
    if (typeof b.subject !== "string" || b.subject.trim().length === 0) {
      return NextResponse.json({ error: "subject must be non-empty" }, { status: 400 });
    }
    data.subject = b.subject.trim();
  }

  if (b.teacher !== undefined) {
    if (b.teacher === null) {
      data.teacher = null;
    } else if (typeof b.teacher === "string") {
      data.teacher = b.teacher.trim().length > 0 ? b.teacher.trim() : null;
    } else {
      return NextResponse.json({ error: "teacher must be a string or null" }, { status: 400 });
    }
  }

  if (b.room !== undefined) {
    if (b.room === null) {
      data.room = null;
    } else if (typeof b.room === "string") {
      data.room = b.room.trim().length > 0 ? b.room.trim() : null;
    } else {
      return NextResponse.json({ error: "room must be a string or null" }, { status: 400 });
    }
  }

  if (b.startTime !== undefined) {
    if (typeof b.startTime !== "string" || !isValidTime(b.startTime)) {
      return NextResponse.json(
        { error: "startTime must be HH:MM (00:00–23:59)" },
        { status: 400 },
      );
    }
    data.startTime = b.startTime;
  }

  if (b.endTime !== undefined) {
    if (typeof b.endTime !== "string" || !isValidTime(b.endTime)) {
      return NextResponse.json(
        { error: "endTime must be HH:MM (00:00–23:59)" },
        { status: 400 },
      );
    }
    data.endTime = b.endTime;
  }

  // Validate start < end using new values if provided, else existing.
  const start = data.startTime ?? existing.startTime;
  const end = data.endTime ?? existing.endTime;
  if (start >= end) {
    return NextResponse.json(
      { error: "startTime must be earlier than endTime" },
      { status: 400 },
    );
  }

  const entry = await prisma.schedule.update({ where: { id }, data });
  return NextResponse.json({ entry });
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
    return NextResponse.json({ error: "Missing schedule id" }, { status: 400 });
  }

  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Schedule entry not found" }, { status: 404 });
  }

  await prisma.schedule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

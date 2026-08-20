// GET /api/attendance — today's (or ?date=) attendance + recap (ATT-01, ATT-04).
// POST /api/attendance — bulk upsert attendance (ATT-02, ATT-03, ATT-05, ATT-08).
//
// Query params:
// ?date=YYYY-MM-DD → attendance for that day (default: today)
//
// Permission Matrix §6: view = all; CRUD = SUPER_ADMIN + SECRETARY only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { isAttendanceStatus, parseDateParam, getAttendanceRecap } from "@/services/attendance";

export const dynamic = "force-dynamic";

// GET — all roles.
export async function GET(request: Request) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const date = parseDateParam(url.searchParams.get("date")) ?? new Date();

  const { recap, total, records } = await getAttendanceRecap(date);

  return NextResponse.json({ date: date.toISOString(), recap, total, records });
}

// POST — SUPER_ADMIN + SECRETARY only.
// Body: { date: "YYYY-MM-DD", entries: [{ userId, status?, notes? }, ...] }
// Default status HADIR when omitted (ATT-03). Unique (userId, date) enforced
// via upsert — duplicates update instead of error (ATT-08).
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
  const dateParam = typeof b.date === "string" ? b.date : "";
  const date = parseDateParam(dateParam);
  if (!date) {
    return NextResponse.json(
      { error: "date must be a valid YYYY-MM-DD" },
      { status: 400 },
    );
  }

  const rawEntries = Array.isArray(b.entries) ? b.entries : [];
  if (rawEntries.length === 0) {
    return NextResponse.json({ error: "entries must be a non-empty array" }, { status: 400 });
  }

  // Validate each entry; build upsert payload.
  const upserts: {
    userId: string;
    status: "HADIR" | "SAKIT" | "IZIN" | "ALFA";
    notes: string | null;
  }[] = [];

  for (let i = 0; i < rawEntries.length; i++) {
    const e = (rawEntries[i] ?? {}) as Record<string, unknown>;
    const userId = typeof e.userId === "string" ? e.userId.trim() : "";
    if (!userId) {
      return NextResponse.json({ error: `entries[${i}].userId is required` }, { status: 400 });
    }

    // ATT-03: default HADIR when status omitted or empty.
    const status = e.status === undefined || e.status === null || e.status === ""
      ? "HADIR"
      : String(e.status).toUpperCase();
    if (!isAttendanceStatus(status)) {
      return NextResponse.json(
        { error: `entries[${i}].status must be HADIR/SAKIT/IZIN/ALFA` },
        { status: 400 },
      );
    }

    const notes =
      typeof e.notes === "string" && e.notes.trim().length > 0
        ? e.notes.trim()
        : null;

    upserts.push({ userId, status, notes });
  }

  // Verify all users exist (avoid orphan FK on upsert).
  const userIds = [...new Set(upserts.map((u) => u.userId))];
  const found = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((u) => u.id));
  const missing = userIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    return NextResponse.json(
      { error: "User(s) not found", userIds: missing },
      { status: 404 },
    );
  }

  // Bulk upsert — ATT-08 unique(userId, date) → update on conflict, no error.
  const results = await prisma.$transaction(
    upserts.map((u) =>
      prisma.attendance.upsert({
        where: { userId_date: { userId: u.userId, date } },
        create: { userId: u.userId, date, status: u.status, notes: u.notes },
        update: { status: u.status, notes: u.notes },
      }),
    ),
  );

  // Return recap for the date so the caller gets updated counts.
  const { recap, total } = await getAttendanceRecap(date);

  return NextResponse.json({ saved: results.length, recap, total }, { status: 201 });
}

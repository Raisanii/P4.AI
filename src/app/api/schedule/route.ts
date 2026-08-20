// GET /api/schedule — today's or weekly schedule (SCHD-03, SCHD-04).
// POST /api/schedule — create a schedule entry (SCHD-01). SUPER_ADMIN + SECRETARY only.
//
// Query params:
//   ?week=today   → entries for today's day-of-week + current A/B week (default)
//   ?week=weekly  → all entries for the current week cycle
//   ?date=YYYY-MM-DD → override "today" (for testing/preview; applies to both modes)
//
// Permission Matrix §6: all roles may view; CRUD = SUPER_ADMIN + SECRETARY only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { getTodaySchedule, getWeeklySchedule } from "@/services/schedule";

export const dynamic = "force-dynamic";

const VALID_DAYS = new Set([
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
]);

/** Parse ?date=YYYY-MM-DD into a Date at 00:00:00 UTC, or now if absent/invalid. */
function parseDateParam(value: string | null): Date {
  if (!value) return new Date();
  const d = new Date(value + "T00:00:00Z");
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// GET — all authenticated roles.
export async function GET(request: Request) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const mode = url.searchParams.get("week") ?? "today";
  const date = parseDateParam(url.searchParams.get("date"));

  if (mode === "weekly") {
    const entries = await getWeeklySchedule(date);
    return NextResponse.json({ entries });
  }

  // Default: today.
  const entries = await getTodaySchedule(date);
  return NextResponse.json({ entries });
}

// POST — SUPER_ADMIN + SECRETARY only.
const VALID_WEEK_TYPES = new Set(["A", "B", ""]);

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
  const dayOfWeek = typeof b.dayOfWeek === "string" ? b.dayOfWeek.toLowerCase() : "";
  const subject = typeof b.subject === "string" ? b.subject.trim() : "";
  const startTime = typeof b.startTime === "string" ? b.startTime : "";
  const endTime = typeof b.endTime === "string" ? b.endTime : "";
  const teacher = typeof b.teacher === "string" && b.teacher.trim().length > 0 ? b.teacher.trim() : undefined;
  const room = typeof b.room === "string" && b.room.trim().length > 0 ? b.room.trim() : undefined;
  // weekType: "A", "B", or null/omitted (every-week entry, SCHD-02).
  const rawWeek = typeof b.weekType === "string" ? b.weekType.toUpperCase() : "";
  const weekType = rawWeek === "A" || rawWeek === "B" ? rawWeek : null;

  // --- Validation ---
  if (!VALID_DAYS.has(dayOfWeek)) {
    return NextResponse.json(
      { error: "dayOfWeek must be a day name (sunday..saturday)" },
      { status: 400 },
    );
  }
  if (!subject) {
    return NextResponse.json({ error: "subject is required" }, { status: 400 });
  }
  if (!isValidTime(startTime)) {
    return NextResponse.json(
      { error: "startTime must be HH:MM (00:00–23:59)" },
      { status: 400 },
    );
  }
  if (!isValidTime(endTime)) {
    return NextResponse.json(
      { error: "endTime must be HH:MM (00:00–23:59)" },
      { status: 400 },
    );
  }
  if (startTime >= endTime) {
    return NextResponse.json(
      { error: "startTime must be earlier than endTime" },
      { status: 400 },
    );
  }
  if (b.weekType !== undefined && b.weekType !== null && !VALID_WEEK_TYPES.has(rawWeek)) {
    return NextResponse.json(
      { error: "weekType must be 'A', 'B', or null/omitted" },
      { status: 400 },
    );
  }

  const entry = await prisma.schedule.create({
    data: {
      dayOfWeek,
      weekType,
      subject,
      teacher,
      startTime,
      endTime,
      room,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}

/** Validate HH:MM 24-hour time strings. */
function isValidTime(t: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

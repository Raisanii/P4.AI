// GET /api/milestone — active milestones with countdown days (MILE-03/04).
// POST /api/milestone — create a milestone (MILE-01, MILE-02). SUPER_ADMIN + SECRETARY only.
//
// Query params:
// ?active=true → only active, non-expired milestones with countdown (default)
//
// Permission Matrix §6: view = all roles; create = SUPER_ADMIN + SECRETARY only.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { isMilestoneType } from "@/lib/milestone";
import {
  getActiveMilestones,
  createMilestone,
  MilestoneCapError,
} from "@/services/milestone";

export const dynamic = "force-dynamic";

// GET — all roles.
export async function GET(request: Request) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const active = url.searchParams.get("active");

  // ?active=true (or absent) → active, non-expired milestones with countdown.
  if (active === null || active === "true") {
    const milestones = await getActiveMilestones();
    return NextResponse.json({ milestones });
  }

  // Non-active view not part of MILE-01..05; reject unknown param.
  return NextResponse.json({ error: "Use ?active=true" }, { status: 400 });
}

// POST — SUPER_ADMIN + SECRETARY only.
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
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const dateStr = typeof b.date === "string" ? b.date : "";
  const active = b.active === undefined ? true : Boolean(b.active);

  // --- Validation ---
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!isMilestoneType(b.type)) {
    return NextResponse.json(
      { error: "type must be one of PTS, PAS, PRAKERIN, UJIAN, LIBUR, OTHER" },
      { status: 400 },
    );
  }
  if (!dateStr) {
    return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
  }

  // Parse as a UTC date to avoid local-tz drift; store as ISO at 00:00:00Z.
  const date = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json(
      { error: "date must be a valid YYYY-MM-DD" },
      { status: 400 },
    );
  }

  try {
    const milestone = await createMilestone({
      title,
      type: b.type,
      date,
      active,
    });
    return NextResponse.json({ milestone }, { status: 201 });
  } catch (err) {
    if (err instanceof MilestoneCapError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}

// GET /api/students/[id]/badges — badges earned by a student (PRD §7.16).
// All authenticated roles may view (Permission Matrix §6 — view analytics is
// broad; individual student badges are a positive summary, never shaming).
//
// Until P6-BE-1 ships the award engine, this returns { badges: [] } and the
// FE renders the friendly empty state.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { getStudentBadges } from "@/services/badges";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "student id is required" }, { status: 400 });
  }

  const badges = await getStudentBadges(id);
  return NextResponse.json({ badges });
}

// GET /api/students/[id]/badges — a student's badges with award info.
//
// Returns the full catalog with each badge joined to the student's award
// (null if not yet earned). Triggers computation so awards are current.
//
// Permission Matrix §6: view = all roles; AUTH required.
// PRD: §7.16 Positive Gamification, §7.8/7.9 analytics source.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { getStudentBadges, computeAndAwardBadges } from "@/services/badges/compute";

export const dynamic = "force-dynamic";

// GET — all roles.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const { id: userId } = await params;

  // Validate the student exists.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  // Compute awards from ActivityLog + AssignmentProgress before returning.
  // Idempotent — upsert prevents duplicates.
  await computeAndAwardBadges();

  const badges = await getStudentBadges(userId);
  // FE (P6-FE-1) consumes a bare StudentBadge[] array.
  return NextResponse.json(badges);
}

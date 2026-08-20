// GET /api/badges — badge catalog (all 5 positive badges per §7.16).
//
// Permission Matrix §6: view = all roles; AUTH required.
// Triggers badge computation so awards are fresh, then returns the catalog.
//
// PRD: §7.16 Positive Gamification, §7.8/7.9 analytics source.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { getBadgeCatalog, computeAndAwardBadges } from "@/services/badges/compute";

export const dynamic = "force-dynamic";

// GET — all roles.
export async function GET() {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  // Compute awards from ActivityLog + AssignmentProgress before returning.
  // Idempotent — upsert prevents duplicates.
  await computeAndAwardBadges();

  const badges = await getBadgeCatalog();
  // FE (P6-FE-1) consumes a bare Badge[] array, not a wrapped object.
  return NextResponse.json(badges);
}

// GET /api/badges — badge catalog (PRD §7.16).
// All authenticated roles may view the catalog (Permission Matrix §6).

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { getBadges } from "@/services/badges";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  return NextResponse.json({ badges: getBadges() });
}

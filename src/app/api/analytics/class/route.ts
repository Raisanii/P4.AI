// GET /api/analytics/class — class-wide progress metrics (§7.9 ANALYTICS).
//
// Permission Matrix §6: "View analytics" = SUPER_ADMIN, SECRETARY only.
// Students get 403 (acceptance criterion: students must NOT view analytics).
//
// Metrics derive from ActivityLog + AssignmentProgress, never manual input.
// PRD: ACT (§7.8), ANALYTICS (§7.9), TASK-11.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { computeClassMetrics } from "@/services/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const metrics = await computeClassMetrics();
  return NextResponse.json(metrics);
}

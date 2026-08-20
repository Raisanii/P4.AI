// GET /api/analytics/student — per-student progress table (§7.9 ANALYTICS).
//
// Permission Matrix §6: "View analytics" = SUPER_ADMIN, SECRETARY only.
// Students get 403.
//
// Per-student: started count, completed count, avg time (§7.9).
// PRD: ACT (§7.8), ANALYTICS (§7.9), TASK-11.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { computeStudentTable } from "@/services/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const students = await computeStudentTable();
  return NextResponse.json({ students });
}

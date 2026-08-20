// GET /api/attendance/student/[userId] — student attendance history (ATT-06).
//
// Permission Matrix §6: attendance read = SUPER_ADMIN + SECRETARY only.
// Query params: ?limit=N (default 90, max 365).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getStudentHistory } from "@/services/attendance";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, nis: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  let limit = 90;
  if (limitParam) {
    const n = Number(limitParam);
    if (!Number.isInteger(n) || n < 1) {
      return NextResponse.json({ error: "limit must be a positive integer" }, { status: 400 });
    }
    limit = Math.min(n, 365);
  }

  const history = await getStudentHistory(userId, limit);

  // Summary counts over the returned history.
  const summary: Record<string, number> = { HADIR: 0, SAKIT: 0, IZIN: 0, ALFA: 0 };
  for (const h of history) {
    summary[h.status] += 1;
  }

  return NextResponse.json({ user, summary, total: history.length, history });
}

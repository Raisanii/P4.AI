// POST /api/admin/users/[id]/reset-password — SUPER_ADMIN resets any user's
// password back to their NIS (AUTH-04). Default password = NIS (AUTH-02).
//
// Permission Matrix §6: "Reset password" = SUPER_ADMIN only.
// Response deliberately omits the new password; the admin already knows the
// target's NIS.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: hashPassword(user.nis) },
  });

  return NextResponse.json({ ok: true });
}

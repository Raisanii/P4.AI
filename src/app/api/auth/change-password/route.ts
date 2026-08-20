// POST /api/auth/change-password — authenticated user changes their own
// password (AUTH-03). All roles may call this (Permission Matrix §6:
// "Change own password" = all).
//
// Request body: { currentPassword: string, newPassword: string }
// Rules:
//   - newPassword must be non-empty and ≥ 8 chars.
//   - newPassword must differ from currentPassword.
//   - currentPassword must verify against the stored bcrypt hash.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const currentPassword =
    typeof body === "object" && body !== null && "currentPassword" in body
      ? (body as { currentPassword?: unknown }).currentPassword
      : undefined;
  const newPassword =
    typeof body === "object" && body !== null && "newPassword" in body
      ? (body as { newPassword?: unknown }).newPassword
      : undefined;

  if (typeof currentPassword !== "string" || currentPassword.length === 0) {
    return NextResponse.json(
      { error: "currentPassword is required" },
      { status: 400 },
    );
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json(
      { error: "newPassword must be at least 8 characters" },
      { status: 400 },
    );
  }
  if (currentPassword === newPassword) {
    return NextResponse.json(
      { error: "newPassword must differ from currentPassword" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { id: ctx.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return NextResponse.json(
      { error: "Current password is incorrect" },
      { status: 401 },
    );
  }

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { passwordHash: hashPassword(newPassword) },
  });

  return NextResponse.json({ ok: true });
}

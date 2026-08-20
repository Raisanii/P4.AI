// P4.AI — Birthdays today API (§7.19).
//
// GET /api/users/birthdays/today — all roles; returns students with birthday today.
//
// Permission Matrix §6: all roles may view birthdays.

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { ROLES } from "@/lib/roles";
import { getTodaysBirthdays } from "@/services/user";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireRole(...ROLES);
  if (!ctx.ok) return ctx.response;

  const birthdays = await getTodaysBirthdays();
  return NextResponse.json({ birthdays });
}

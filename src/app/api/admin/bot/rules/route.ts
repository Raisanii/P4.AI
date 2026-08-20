// GET/POST /api/admin/bot/rules — list/create BotRule (condition→action).
// WABOT-09; Permission Matrix §6: "Configure bot" = SUPER_ADMIN only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  const rules = await prisma.botRule.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(rules);
}

export async function POST(request: Request) {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; condition?: unknown; action?: unknown; active?: unknown }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, condition, action, active } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof condition !== "string" || condition.trim().length === 0) {
    return NextResponse.json({ error: "condition is required" }, { status: 400 });
  }
  if (typeof action !== "string" || action.trim().length === 0) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  const rule = await prisma.botRule.create({
    data: {
      name: name.trim(),
      condition: condition.trim(),
      action: action.trim(),
      active: typeof active === "boolean" ? active : true,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}

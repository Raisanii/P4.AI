// PUT/DELETE /api/admin/bot/rules/[id] — update/delete a BotRule.
// WABOT-09; Permission Matrix §6: "Configure bot" = SUPER_ADMIN only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing rule id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; condition?: unknown; action?: unknown; active?: unknown }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: {
    name?: string;
    condition?: string;
    action?: string;
    active?: boolean;
  } = {};

  if (typeof body.name === "string") {
    if (body.name.trim().length === 0) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (typeof body.condition === "string") {
    if (body.condition.trim().length === 0) {
      return NextResponse.json({ error: "condition cannot be empty" }, { status: 400 });
    }
    data.condition = body.condition.trim();
  }
  if (typeof body.action === "string") {
    if (body.action.trim().length === 0) {
      return NextResponse.json({ error: "action cannot be empty" }, { status: 400 });
    }
    data.action = body.action.trim();
  }
  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  const rule = await prisma.botRule.update({
    where: { id },
    data,
  });

  return NextResponse.json(rule);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing rule id" }, { status: 400 });
  }

  await prisma.botRule.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

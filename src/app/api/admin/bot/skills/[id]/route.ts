// PUT/DELETE /api/admin/bot/skills/[id] — update/delete a BotSkill.
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
    return NextResponse.json({ error: "Missing skill id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; description?: unknown; prompt?: unknown; active?: unknown }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data: {
    name?: string;
    description?: string;
    prompt?: string;
    active?: boolean;
  } = {};

  if (typeof body.name === "string") {
    if (body.name.trim().length === 0) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (typeof body.description === "string") {
    if (body.description.trim().length === 0) {
      return NextResponse.json({ error: "description cannot be empty" }, { status: 400 });
    }
    data.description = body.description.trim();
  }
  if (typeof body.prompt === "string") {
    if (body.prompt.trim().length === 0) {
      return NextResponse.json({ error: "prompt cannot be empty" }, { status: 400 });
    }
    data.prompt = body.prompt.trim();
  }
  if (typeof body.active === "boolean") {
    data.active = body.active;
  }

  const skill = await prisma.botSkill.update({
    where: { id },
    data,
  });

  return NextResponse.json(skill);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing skill id" }, { status: 400 });
  }

  await prisma.botSkill.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

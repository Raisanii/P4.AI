// GET/POST /api/admin/bot/skills — list/create BotSkill prompt templates.
// WABOT-09; Permission Matrix §6: "Configure bot" = SUPER_ADMIN only.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  const skills = await prisma.botSkill.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(skills);
}

export async function POST(request: Request) {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  const body = (await request.json().catch(() => null)) as
    | { name?: unknown; description?: unknown; prompt?: unknown; active?: unknown }
    | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, description, prompt, active } = body;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (typeof description !== "string" || description.trim().length === 0) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const skill = await prisma.botSkill.create({
    data: {
      name: name.trim(),
      description: description.trim(),
      prompt: prompt.trim(),
      active: typeof active === "boolean" ? active : true,
    },
  });

  return NextResponse.json(skill, { status: 201 });
}

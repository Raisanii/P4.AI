// P4.AI — Announcement item API (ANN-05).
//
// PUT    /api/announcement/[id] — SUPER_ADMIN, SECRETARY only.
// DELETE /api/announcement/[id] — SUPER_ADMIN, SECRETARY only.
//
// PUT accepts partial updates: title, content, priority, expiresAt.
// expiresAt may be set to null to remove expiry (passing JSON null).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const PRIORITIES = ["URGENT", "PENTING", "NORMAL"] as const;
type Priority = (typeof PRIORITIES)[number];

function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);
}

// PUT — update announcement.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing announcement id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const data: {
    title?: string;
    content?: string;
    priority?: Priority;
    expiresAt?: Date | null;
  } = {};

  if (b.title !== undefined) {
    if (typeof b.title !== "string" || b.title.trim().length === 0) {
      return NextResponse.json({ error: "title must be non-empty" }, { status: 400 });
    }
    data.title = b.title.trim();
  }

  if (b.content !== undefined) {
    if (typeof b.content !== "string" || b.content.trim().length === 0) {
      return NextResponse.json({ error: "content must be non-empty" }, { status: 400 });
    }
    data.content = b.content.trim();
  }

  if (b.priority !== undefined) {
    if (!isPriority(b.priority)) {
      return NextResponse.json(
        { error: "priority must be URGENT, PENTING, or NORMAL" },
        { status: 400 },
      );
    }
    data.priority = b.priority;
  }

  if (b.expiresAt !== undefined) {
    if (b.expiresAt === null) {
      data.expiresAt = null;
    } else {
      const d = new Date(String(b.expiresAt));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "expiresAt must be a valid ISO 8601 date or null" },
          { status: 400 },
        );
      }
      data.expiresAt = d;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  const updated = await prisma.announcement.update({
    where: { id },
    data,
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(updated);
}

// DELETE — remove announcement.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing announcement id" }, { status: 400 });
  }

  const existing = await prisma.announcement.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Announcement not found" }, { status: 404 });
  }

  await prisma.announcement.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

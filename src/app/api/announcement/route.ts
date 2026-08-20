// P4.AI — Announcement API (ANN-01..06).
//
// GET  /api/announcement — all roles; sorted + expiry-filtered (ANN-03/04/06).
// POST /api/announcement — SUPER_ADMIN, SECRETARY only (ANN-01/02).
//
// Priority: URGENT | PENTING | NORMAL (ANN-02). Default NORMAL.
// Optional `expiresAt` — ISO 8601 datetime (ANN-04).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { getActiveAnnouncements } from "@/services/announcement";

export const dynamic = "force-dynamic";

const PRIORITIES = ["URGENT", "PENTING", "NORMAL"] as const;
type Priority = (typeof PRIORITIES)[number];

function isPriority(v: unknown): v is Priority {
  return typeof v === "string" && (PRIORITIES as readonly string[]).includes(v);
}

// GET — all roles may list announcements.
export async function GET() {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY", "STUDENT");
  if (!ctx.ok) return ctx.response;

  const rows = await getActiveAnnouncements();
  return NextResponse.json(rows);
}

// POST — create announcement. SUPER_ADMIN or SECRETARY only.
export async function POST(request: Request) {
  const ctx = await requireRole("SUPER_ADMIN", "SECRETARY");
  if (!ctx.ok) return ctx.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const title =
    typeof body === "object" && body !== null && "title" in body
      ? (body as { title?: unknown }).title
      : undefined;
  const content =
    typeof body === "object" && body !== null && "content" in body
      ? (body as { content?: unknown }).content
      : undefined;
  const priorityRaw =
    typeof body === "object" && body !== null && "priority" in body
      ? (body as { priority?: unknown }).priority
      : undefined;
  const expiresAtRaw =
    typeof body === "object" && body !== null && "expiresAt" in body
      ? (body as { expiresAt?: unknown }).expiresAt
      : undefined;

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  const priority = isPriority(priorityRaw) ? priorityRaw : "NORMAL";

  // expiresAt optional; validate it's a real future-pointing date if given.
  let expiresAt: Date | null = null;
  if (expiresAtRaw !== undefined && expiresAtRaw !== null) {
    const d = new Date(expiresAtRaw as string);
    if (Number.isNaN(d.getTime())) {
      return NextResponse.json(
        { error: "expiresAt must be a valid ISO 8601 date" },
        { status: 400 },
      );
    }
    expiresAt = d;
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      priority,
      expiresAt,
      authorId: ctx.userId,
    },
    include: { author: { select: { id: true, name: true } } },
  });

  return NextResponse.json(announcement, { status: 201 });
}

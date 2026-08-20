// GET /api/whatsapp/status — Baileys connection state (WABOT-01 acceptance).
//
// Permission Matrix §6: bot configuration is SUPER_ADMIN only.
// Returns: { connected, qrPending, user }

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/rbac";
import { getStatus } from "@/services/whatsapp/sender";

export const dynamic = "force-dynamic";

export async function GET() {
  const ctx = await requireRole("SUPER_ADMIN");
  if (!ctx.ok) return ctx.response;

  return NextResponse.json(getStatus());
}

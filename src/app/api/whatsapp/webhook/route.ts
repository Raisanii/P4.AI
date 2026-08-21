// P4.AI — WhatsApp webhook HTTP relay (WABOT-03..08, §12).
//
// External POST path for headless testing or a reverse-proxy relay. The
// in-process Baileys handler (src/services/whatsapp/client.ts) calls
// `handleInbound` directly — it doesn't go through HTTP.
//
// Auth: Bearer WA_WEBHOOK_SECRET. The shared secret gates which external
// callers can trigger the chatbot.
//
// This route NEVER mutates the DB (NFR-12). Mutations are SUN-34 (task-agent).

import { NextResponse } from "next/server";
import { handleInbound } from "@/services/whatsapp/inbound";

export const dynamic = "force-dynamic";

/**
 * POST /api/whatsapp/webhook — relay an inbound message to the chatbot.
 * Body: { jid: string, text: string }
 * Auth: Bearer <WA_WEBHOOK_SECRET>
 */
export async function POST(request: Request) {
  const secret = process.env.WA_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const jid = typeof b.jid === "string" ? b.jid.trim() : "";
  const text = typeof b.text === "string" ? b.text.trim() : "";

  if (!jid || !text) {
    return NextResponse.json(
      { error: "jid and text are required" },
      { status: 400 },
    );
  }

  const result = await handleInbound({ jid, text });
  return NextResponse.json(result, { status: result.ok ? 200 : 403 });
}

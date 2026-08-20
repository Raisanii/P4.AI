// P4.AI — Inbound message orchestrator (WABOT-03..08, §12).
//
// Shared logic invoked by both the Baileys in-process handler and the
// HTTP webhook route. Kept here (not in route.ts) because Next.js route
// files only allow HTTP method exports.
//
// Flow: whitelist check → chatbot respond → send reply via Baileys socket.
// Never mutates the DB (NFR-12) — mutations are SUN-34 (task-agent).

import { findWhitelistedUser } from "@/services/whatsapp/whitelist";
import { sendText } from "@/services/whatsapp/sender";
import { respond } from "@/services/chatbot/respond";
import { tryHandleTaskIntent } from "@/services/task-agent/orchestrator";
import type { Role } from "@/lib/roles";

export interface InboundPayload {
  jid: string;
  text: string;
}

/**
 * Handle an inbound WhatsApp message: enforce whitelist (defense-in-depth),
 * run the AI responder, and send the reply back to the sender.
 */
export async function handleInbound(payload: InboundPayload): Promise<{
  ok: boolean;
  reply?: string;
  reason?: string;
}> {
  const user = await findWhitelistedUser(payload.jid);
  if (!user) {
    // WABOT-02: non-whitelisted — polite rejection.
    await sendText(payload.jid, "Maaf, nomor Anda tidak terdaftar di P4.AI.");
    return { ok: false, reason: "not_whitelisted" };
  }

  // SUN-34: try task intent (START/DONE/STATUS) before the general chatbot.
  // Deterministic commands + AI NL detection → validate → state machine.
  // If handled (success or rejection), reply and return — don't also call the AI.
  const taskResult = await tryHandleTaskIntent({
    userId: user.id,
    role: user.role as Role,
    text: payload.text,
  });
  if (taskResult.handled) {
    await sendText(payload.jid, taskResult.reply ?? "");
    return { ok: true, reply: taskResult.reply };
  }

  const result = await respond({
    userId: user.id,
    role: user.role as Role,
    text: payload.text,
  });

  await sendText(payload.jid, result.reply);
  return { ok: true, reply: result.reply };
}

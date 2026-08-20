// P4.AI — Digest sender: WhatsApp delivery to secretary (§7.15).
//
// Takes a built ClassDigest, formats it via compose.formatDigest, and sends
// the message to every user with role SECRETARY. Mirrors the reminder
// sender's JID conversion + sendText usage so the same Baileys singleton is
// reused (WABOT-01 / SUN-31).
//
// The recipient set is SECRETARY users — the PRD says "Sekretaris dapat daily
// summary" and "Recipient = secretary user's WhatsApp number." If no
// secretary is registered the send is a no-op (logged) so the scheduler
// doesn't crash on a fresh database.

import { prisma } from "@/lib/db";
import { sendText } from "@/services/whatsapp/sender";
import { normalizeNumber } from "@/services/whatsapp/whitelist";
import { formatDigest, type ClassDigest } from "@/services/digest/compose";

export type DigestSendResult = {
  userId: string;
  name: string;
  sent: boolean;
  error?: string;
};

/**
 * Send the daily digest to all SECRETARY users via WhatsApp.
 * Each send is independent — one failure doesn't abort the rest.
 */
export async function sendDigest(
  digest: ClassDigest,
): Promise<DigestSendResult[]> {
  const secretaries = await prisma.user.findMany({
    where: { role: "SECRETARY" },
    select: { id: true, name: true, whatsappNumber: true },
  });

  if (secretaries.length === 0) {
    console.warn("[digest] no secretary users found — skipping send");
    return [];
  }

  const message = formatDigest(digest);
  const results: DigestSendResult[] = [];

  for (const sec of secretaries) {
    const jid = toJid(sec.whatsappNumber);
    if (!jid) {
      results.push({ userId: sec.id, name: sec.name, sent: false, error: "invalid_number" });
      continue;
    }

    try {
      // ponytail: skipped: retry-queue on socket-down; add when pm2+queue wired.
      const delivered = await sendText(jid, message);
      results.push({ userId: sec.id, name: sec.name, sent: delivered !== undefined });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[digest] send failed", sec.id, msg);
      results.push({ userId: sec.id, name: sec.name, sent: false, error: msg });
    }
  }

  return results;
}

/** Convert an E.164 number (e.g. +62812...) to a Baileys JID. */
function toJid(e164: string): string | null {
  const normalized = normalizeNumber(e164);
  if (!normalized) return null;
  const digits = normalized.replace("+", "");
  return `${digits}@s.whatsapp.net`;
}

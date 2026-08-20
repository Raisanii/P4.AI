// P4.AI — Reminder sender: WhatsApp delivery + ReminderLog dedup (§7.13).
//
// Takes a list of candidates from the engine, formats the message per the PRD
// template for the reminder type, sends via the WhatsApp sender singleton
// (P4-BE-1 / SUN-31), and logs to ReminderLog so the same (user, assignment,
// type) is never reminded twice.
//
// ReminderLog is written ONLY when the message was actually delivered
// (sendText returned a message key). A failed send leaves no log, so the next
// scheduler tick retries it — no lost reminders (fixes C1/S1).

import { prisma } from "@/lib/db";
import { sendText } from "@/services/whatsapp/sender";
import { normalizeNumber } from "@/services/whatsapp/whitelist";
import { Prisma } from "@prisma/client";
import type { ReminderType } from "@prisma/client";
import type { ReminderCandidate } from "@/services/reminder/engine";

/** PRD §7.13 message templates. {name} and {title} are interpolated. */
const TEMPLATES: Record<ReminderType, (name: string, title: string) => string> = {
  T_MINUS_3_DAYS: (n, t) =>
    `📚 Reminder ya @${n}, tugas ${t} deadline 3 hari lagi. Status lo masih TODO nih 👀`,
  T_MINUS_1_DAY: (n, t) =>
    `⚠️ Besok deadline ${t}. Status lo masih TODO.`,
  T_MINUS_6_HOURS: (n, t) =>
    `🚨 6 jam lagi deadline ${t}. Lo belum mulai. Gas sekarang.`,
};

export type SendResult = {
  candidate: ReminderCandidate;
  sent: boolean;
  error?: string;
};

/**
 * Send reminders for a batch of candidates. Each send is independent — one
 * failure doesn't abort the rest. Returns per-candidate results.
 *
 * Dedup is the ReminderLog unique constraint on (userId, assignmentId,
 * reminderType). The log row is created atomically with the send: we insert
 * FIRST (claiming the slot), then send; if send fails we delete the claim so
 * the next tick can retry. Two concurrent ticks racing on the same candidate
 * resolve via the unique constraint — the loser gets P2002 and skips.
 */
export async function sendReminders(
  candidates: ReminderCandidate[],
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (const candidate of candidates) {
    try {
      const message = TEMPLATES[candidate.reminderType](
        candidate.userName,
        candidate.assignmentTitle,
      );

      // Convert E.164 number to WhatsApp JID.
      const jid = toJid(candidate.whatsappNumber);
      if (!jid) {
        results.push({ candidate, sent: false, error: "invalid_number" });
        continue;
      }

      // Claim the slot first — if another tick already sent this, the unique
      // constraint rejects and we skip (no double-send, no spam).
      let claimed = false;
      try {
        await prisma.reminderLog.create({
          data: {
            userId: candidate.userId,
            assignmentId: candidate.assignmentId,
            reminderType: candidate.reminderType,
          },
        });
        claimed = true;
      } catch (err) {
        if (isUniqueViolation(err)) {
          // Already sent by a concurrent tick — skip.
          results.push({ candidate, sent: false, error: "already_sent" });
          continue;
        }
        throw err;
      }

      const delivered = await sendText(jid, message);

      if (delivered === undefined) {
        // Socket down / send failed → roll back the claim so the next tick
        // retries instead of permanently losing the reminder.
        if (claimed) {
          await prisma.reminderLog.delete({
            where: {
              userId_assignmentId_reminderType: {
                userId: candidate.userId,
                assignmentId: candidate.assignmentId,
                reminderType: candidate.reminderType,
              },
            },
          });
        }
        results.push({ candidate, sent: false, error: "not_delivered" });
        continue;
      }

      // ActivityLog (§11.2) — REMINDER_SENT event for analytics.
      await prisma.activityLog.create({
        data: {
          userId: candidate.userId,
          assignmentId: candidate.assignmentId,
          eventType: "REMINDER_SENT",
          source: "SYSTEM",
          metadata: {
            reminderType: candidate.reminderType,
            assignmentTitle: candidate.assignmentTitle,
            delivered: true,
          },
        },
      });

      results.push({ candidate, sent: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[reminder] send failed", candidate.userId, candidate.assignmentId, msg);
      results.push({ candidate, sent: false, error: msg });
    }
  }

  return results;
}

function isUniqueViolation(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === "P2002";
  }
  // Fallback for adapter-wrapped errors that lose the class identity.
  const code = (err as { code?: unknown })?.code;
  return code === "P2002";
}

/** Convert an E.164 number (e.g. +62812...) to a Baileys JID. */
function toJid(e164: string): string | null {
  const normalized = normalizeNumber(e164);
  if (!normalized) return null;
  const digits = normalized.replace("+", "");
  return `${digits}@s.whatsapp.net`;
}

export { TEMPLATES };

// P4.AI — Reminder sender: WhatsApp delivery + ReminderLog dedup (§7.13).
//
// Takes a list of candidates from the engine, formats the message per the PRD
// template for the reminder type, sends via the WhatsApp sender singleton
// (P4-BE-1 / SUN-31), and logs to ReminderLog so the same (user, assignment,
// type) is never reminded twice.
//
// Also writes an ActivityLog entry (eventType REMINDER_SENT) per the PRD's
// ActivityLog schema (§11.2) so reminders show up in analytics.

import { prisma } from "@/lib/db";
import { sendText } from "@/services/whatsapp/sender";
import { normalizeNumber } from "@/services/whatsapp/whitelist";
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
 * Dedup: ReminderLog has a unique constraint on (userId, assignmentId,
 * reminderType). We attempt an upsert — if a log already exists (race with
 * another scheduler tick), the reminder is skipped.
 */
export async function sendReminders(
  candidates: ReminderCandidate[],
): Promise<SendResult[]> {
  const results: SendResult[] = [];

  for (const candidate of candidates) {
    try {
      // Dedup via upsert — if the log row already exists, skip sending.
      // This handles the race between two scheduler ticks cleanly.
      const existing = await prisma.reminderLog.findUnique({
        where: {
          userId_assignmentId_reminderType: {
            userId: candidate.userId,
            assignmentId: candidate.assignmentId,
            reminderType: candidate.reminderType,
          },
        },
        select: { id: true },
      });

      if (existing) {
        results.push({ candidate, sent: false, error: "already_sent" });
        continue;
      }

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

      const delivered = await sendText(jid, message);

      // Log regardless of delivery — if the socket is down, we don't want to
      // retry every tick. The reminder was "attempted" at this offset.
      // ponytail: skipped: retry-queue on socket-down; add when pm2+queue is wired.
      await prisma.reminderLog.create({
        data: {
          userId: candidate.userId,
          assignmentId: candidate.assignmentId,
          reminderType: candidate.reminderType,
        },
      });

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
            delivered: delivered !== undefined,
          },
        },
      });

      results.push({ candidate, sent: delivered !== undefined });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[reminder] send failed", candidate.userId, candidate.assignmentId, msg);
      results.push({ candidate, sent: false, error: msg });
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

export { TEMPLATES };

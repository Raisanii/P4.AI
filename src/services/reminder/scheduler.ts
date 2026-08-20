// P4.AI — Reminder scheduler: fires at T-3d, T-1d, T-6h before deadlines (§7.13).
//
// Runs as a standalone `tsx` script — launched via pm2/systemd on the Pi.
// On startup it connects the WhatsApp socket (startWhatsApp) so `sendText`
// actually delivers; without this the socket singleton stays null and every
// reminder silently no-ops (fixes C1). Polls every 15 minutes, checks each
// reminder type's narrow band, selects candidates via the engine, and sends
// via the sender.
//
// Usage:
//   tsx src/services/reminder/scheduler.ts

import { prisma } from "@/lib/db";
import {
  getReminderCandidates,
  ALL_REMINDER_TYPES,
  DEFAULT_BAND_MS,
} from "@/services/reminder/engine";
import { sendReminders } from "@/services/reminder/sender";
import { startWhatsApp } from "@/services/whatsapp/client";
import type { ReminderType } from "@prisma/client";

const POLL_INTERVAL_MS = DEFAULT_BAND_MS; // 15 minutes

/**
 * Run one tick of the scheduler: for each reminder type, find candidates and
 * send. Returns a summary so the script can log per-tick stats.
 */
export async function runReminderTick(now: Date = new Date()): Promise<
  Record<ReminderType, { candidates: number; sent: number; errors: number }>
> {
  const summary = {} as Record<
    ReminderType,
    { candidates: number; sent: number; errors: number }
  >;

  for (const reminderType of ALL_REMINDER_TYPES) {
    const candidates = await getReminderCandidates(reminderType, now);

    if (candidates.length === 0) {
      summary[reminderType] = { candidates: 0, sent: 0, errors: 0 };
      continue;
    }

    const results = await sendReminders(candidates);
    const sent = results.filter((r) => r.sent).length;
    const errors = results.filter((r) => r.error && r.error !== "already_sent").length;

    summary[reminderType] = { candidates: candidates.length, sent, errors };
  }

  return summary;
}

/** Main entry — connect WhatsApp, then poll forever. */
async function main() {
  console.log("[reminder] scheduler started — connecting WhatsApp + polling every 15 min");

  // C1: the scheduler owns its own WhatsApp socket so sends actually deliver.
  // The onMessage handler is a no-op — inbound intent handling lives in the
  // bot process (WABOT-03+); this process only needs to SEND.
  await startWhatsApp(() => {
    // No inbound handling here; reminder process is send-only.
  });

  // Run an immediate tick on startup, then poll on interval.
  await tick();

  setInterval(async () => {
    await tick();
  }, POLL_INTERVAL_MS);
}

async function tick() {
  const now = new Date();
  try {
    const summary = await runReminderTick(now);
    const totalSent = Object.values(summary).reduce((s, v) => s + v.sent, 0);
    if (totalSent > 0) {
      console.log(`[reminder] ${now.toISOString()} tick sent ${totalSent} reminders`, summary);
    }
  } catch (err) {
    console.error("[reminder] tick failed", err);
  }
}

const isDirect = process.argv[1] && import.meta.url?.endsWith(process.argv[1]!);
if (isDirect) {
  void main();
  // Keep alive — prisma import prevents tree-shaking.
  void prisma;
}

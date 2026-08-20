// P4.AI — Reminder scheduler: fires at T-3d, T-1d, T-6h before deadlines (§7.13).
//
// Runs as a standalone `tsx` script (like the WhatsApp client) — launched via
// pm2/systemd on the Pi. Polls every 15 minutes, checks each reminder type's
// window, selects candidates via the engine, and sends via the sender.
//
// The scheduler is timezone-aware (WIB / UTC+7) — all deadline comparisons
// use the wall-clock offset, not the server's local TZ, so it works correctly
// regardless of where the Pi's clock is set.
//
// 15-minute poll interval is sufficient: the widest window (T-3d) has a
// 72-hour band, and the narrowest (T-6h) has 6 hours, so a 15-min tick
// catches every window with comfortable margin.
//
// Usage:
//   tsx src/services/reminder/scheduler.ts

import { prisma } from "@/lib/db";
import {
  getReminderCandidates,
  ALL_REMINDER_TYPES,
} from "@/services/reminder/engine";
import { sendReminders } from "@/services/reminder/sender";
import type { ReminderType } from "@prisma/client";

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

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

/** Main poll loop — runs forever. */
async function main() {
  console.log("[reminder] scheduler started — poll every 15 min");

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

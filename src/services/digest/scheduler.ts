// P4.AI — Digest scheduler: daily trigger at a fixed WIB hour (§7.15).
//
// Runs as a standalone `tsx` script (like the reminder scheduler) — launched
// via pm2/systemd on the Pi. Polls every 15 minutes, checks whether the WIB
// time has passed the configured send hour and today's digest hasn't sent
// yet, builds the digest from analytics, and delivers it to all secretaries.
//
// Idempotency: the scheduler tracks the last-sent WIB date key in memory.
// Once a digest is sent for a given WIB calendar day, it won't send again
// until the next day. A process restart may re-send once if the hour has
// already passed, but never within the same process lifetime.
//
// Config: DIGEST_SEND_HOUR env (WIB hour, default 17 = 5pm).
// Usage: tsx src/services/digest/scheduler.ts

import { prisma } from "@/lib/db";
import { buildDigest } from "@/services/digest/compose";
import { sendDigest } from "@/services/digest/sender";
import { isPastSendTime, wibDateKey, DEFAULT_DIGEST_HOUR } from "@/lib/digest";

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/** Last WIB date key the digest was sent for — guards double-send in-process. */
let lastSentDateKey: string | null = null;

/**
 * Run one tick of the scheduler. Returns a summary for logging; safe to call
 * from tests or an API-triggered manual run.
 */
export async function runDigestTick(
  now: Date = new Date(),
): Promise<{ sent: boolean; reason: string; recipients?: number }> {
  const sendHour = parseSendHour();
  const todayKey = wibDateKey(now);

  if (lastSentDateKey === todayKey) {
    return { sent: false, reason: "already_sent_today" };
  }

  if (!isPastSendTime(sendHour, now)) {
    return { sent: false, reason: "before_send_hour" };
  }

  const digest = await buildDigest(now);
  const results = await sendDigest(digest);
  const sent = results.filter((r) => r.sent).length;

  lastSentDateKey = todayKey;
  return {
    sent: true,
    reason: sent > 0 ? "delivered" : "no_recipients_or_socket_down",
    recipients: sent,
  };
}

/** Read DIGEST_SEND_HOUR env, defaulting to 17 (5pm WIB). Validates 0–23. */
function parseSendHour(): number {
  const raw = process.env.DIGEST_SEND_HOUR;
  if (raw === undefined) return DEFAULT_DIGEST_HOUR;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 23) {
    console.warn(`[digest] invalid DIGEST_SEND_HOUR=${raw}, falling back to ${DEFAULT_DIGEST_HOUR}`);
    return DEFAULT_DIGEST_HOUR;
  }
  return n;
}

/** Main poll loop — runs forever. */
async function main() {
  console.log("[digest] scheduler started — poll every 15 min");
  await tick();

  setInterval(async () => {
    await tick();
  }, POLL_INTERVAL_MS);
}

async function tick() {
  const now = new Date();
  try {
    const result = await runDigestTick(now);
    if (result.sent) {
      console.log(`[digest] ${now.toISOString()} sent — ${result.reason} (${result.recipients ?? 0} recipients)`);
    }
  } catch (err) {
    console.error("[digest] tick failed", err);
  }
}

const isDirect = process.argv[1] && import.meta.url?.endsWith(process.argv[1]!);
if (isDirect) {
  void main();
  // Keep alive — prisma import prevents tree-shaking.
  void prisma;
}

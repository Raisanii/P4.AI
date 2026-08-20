// P4.AI — Daily digest pure helpers: WIB date formatting + completion rate (§7.15).
//
// No Prisma dependency — safe to import from tests, edge middleware, or AI.
// DB queries live in src/services/digest/compose.ts.
//
// WIB = UTC+7. All date math mirrors the convention in src/lib/milestone.ts
// and src/lib/birthday.ts so the digest date stays stable throughout a WIB
// calendar day regardless of where the Pi's clock is set.

const WIB_OFFSET_HOURS = 7;

/** Return `date` shifted to WIB (UTC+7). */
function toWIB(date: Date): Date {
  return new Date(date.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Format a Date as a human-readable WIB date string for the digest header.
 * Example: "19 Agustus" (Indonesian locale, day + month only).
 * The year is omitted per the PRD template ("Tanggal: 19 Agustus").
 */
export function formatDigestDate(date: Date = new Date()): string {
  const wib = toWIB(date);
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const day = wib.getUTCDate();
  const month = months[wib.getUTCMonth()];
  return `${day} ${month}`;
}

/**
 * Compute completion rate as a rounded percentage (0–100).
 * Returns 0 when total is 0 to avoid division-by-zero.
 *
 * The PRD §7.15 template shows "Completion rate: X%". We round to the nearest
 * integer so the digest stays concise for a WhatsApp message.
 */
export function completionRate(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}

/**
 * Determine whether the current WIB time is at or past the daily send hour.
 * The scheduler polls every 15 minutes; this check gates the send so it fires
 * once per day after the configured hour (default 17:00 WIB / 5pm).
 *
 * Returns true if the WIB hour >= sendHour (and minutes >= 0). The scheduler
 * additionally tracks the last-send date to avoid double-sending.
 */
export function isPastSendTime(sendHour: number, now: Date = new Date()): boolean {
  const wib = toWIB(now);
  return wib.getUTCHours() >= sendHour;
}

/**
 * Return a "YYYY-MM-DD" key for the WIB calendar date of `now`.
 * Used by the scheduler to track whether today's digest already sent.
 */
export function wibDateKey(now: Date = new Date()): string {
  const wib = toWIB(now);
  const y = wib.getUTCFullYear();
  const m = String(wib.getUTCMonth() + 1).padStart(2, "0");
  const d = String(wib.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Default daily send hour in WIB (17:00 / 5pm). Configurable via env. */
export const DEFAULT_DIGEST_HOUR = 17;

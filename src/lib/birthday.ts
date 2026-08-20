// P4.AI — Birthday pure helpers: today detection (§7.19).
// No Prisma dependency — safe to import from tests, edge middleware, or AI.
// DB queries live in src/services/user.ts.
//
// Birthday matching uses WIB (UTC+7) calendar dates, consistent with the
// milestone countdown math in src/lib/milestone.ts. Both the birthday and
// "now" are shifted to WIB before comparing month + day.

const WIB_OFFSET_HOURS = 7;

/** Return `date` shifted to WIB (UTC+7). */
function toWIB(date: Date): Date {
  return new Date(date.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000);
}

/**
 * Check if the given birthday falls on today's WIB calendar date (§7.19).
 * Compares month + day only — year is irrelevant for birthdays.
 * Returns false if birthday is null/undefined/invalid.
 */
export function isBirthdayToday(
  birthday: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!birthday) return false;
  const d = typeof birthday === "string" ? new Date(birthday) : birthday;
  if (Number.isNaN(d.getTime())) return false;
  const nowWib = toWIB(now);
  const bdayWib = toWIB(d);
  return (
    nowWib.getUTCMonth() === bdayWib.getUTCMonth() &&
    nowWib.getUTCDate() === bdayWib.getUTCDate()
  );
}

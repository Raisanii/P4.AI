// P4.AI — Schedule service: DB queries for today/weekly views (SCHD-03..05).
//
// Week A/B detection + day-key mapping live in src/lib/schedule.ts (no Prisma
// dependency). NULL weekType entries are "every-week" entries (SCHD-02) —
// they appear in both Week A and Week B.

import { prisma } from "@/lib/db";
import { detectWeekType, dayKeyFor } from "@/lib/schedule";
export { detectWeekType, dayKeyFor } from "@/lib/schedule";

/** Today's schedule: entries matching today's day-of-week + current week type
 * OR weekType NULL (every-week entries). SCHD-03. */
export async function getTodaySchedule(date: Date = new Date()) {
  const key = dayKeyFor(date);
  const week = detectWeekType(date);
  return prisma.schedule.findMany({
    where: {
      dayOfWeek: key,
      OR: [{ weekType: week }, { weekType: null }],
    },
    orderBy: { startTime: "asc" },
  });
}

/** Weekly view: all entries for the current week cycle, filtered to the
 * current week type + NULL entries. SCHD-04. */
export async function getWeeklySchedule(date: Date = new Date()) {
  const week = detectWeekType(date);
  return prisma.schedule.findMany({
    where: {
      OR: [{ weekType: week }, { weekType: null }],
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });
}

// P4.AI — User service: birthday queries (§7.19).
//
// Birthday detection: fetches all users with a non-null birthday, then filters
// in app code. SQLite/Prisma can't extract month/day natively, and with 36
// students the in-memory filter is trivial. Pure helper isBirthdayToday lives
// in src/lib/birthday.ts.

import { prisma } from "@/lib/db";
import { isBirthdayToday } from "@/lib/birthday";

export type BirthdayUser = {
  id: string;
  name: string;
  nis: string;
  birthday: Date;
};

/**
 * Return all users whose birthday is today (WIB calendar date). §7.19.
 */
export async function getTodaysBirthdays(
  now: Date = new Date(),
): Promise<BirthdayUser[]> {
  const users = await prisma.user.findMany({
    where: { birthday: { not: null } },
    select: { id: true, name: true, nis: true, birthday: true },
  });

  return users.filter((u) => u.birthday && isBirthdayToday(u.birthday, now)) as BirthdayUser[];
}

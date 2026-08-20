// P4.AI — Announcement service: priority sorting + expiry filter.
//
// ANN-03/06: URGENT always top, then PENTING, then NORMAL.
// ANN-04: expired announcements filtered out of GET results.
//
// Sorting is deterministic: priority rank → newest first. SQLite/Prisma
// can't `ORDER BY CASE` on enums, so we sort in two tiers — a Prisma
// orderBy for `createdAt` desc, then an in-memory stable re-sort by
// priority rank (stable sort preserves the recency order within each
// priority tier).

import { prisma } from "@/lib/db";
import type { Announcement } from "@prisma/client";

const PRIORITY_RANK: Record<Announcement["priority"], number> = {
  URGENT: 0,
  PENTING: 1,
  NORMAL: 2,
};

/**
 * All non-expired announcements, sorted URGENT → PENTING → NORMAL,
 * newest-first within each tier. (ANN-03/04/06)
 */
export async function getActiveAnnouncements(): Promise<Announcement[]> {
  const rows = await prisma.announcement.findMany({
    where: {
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, name: true } } },
  });

  // Stable sort by priority rank; recency order preserved within tiers.
  return rows
    .map((r) => r)
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
}

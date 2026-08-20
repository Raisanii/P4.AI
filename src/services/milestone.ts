// P4.AI — Milestone service: DB queries + expiry/auto-hide + active cap (MILE-04/05).
//
// Pure helpers (countdown, expiry predicates) live in src/lib/milestone.ts.
//
// Expiry policy (MILE-04): milestones whose target date has passed (WIB) are
// auto-hidden from the active view. We do not mutate `active` on read —
// auto-hide is a view-level filter so admins can still see/manage expired
// milestones via the [id] endpoints. A separate sweep could flip `active`
// to false, but the PRD only requires they be hidden from the active list.
//
// Active cap (MILE-05): at most 5 active milestones. Enforced at create and
// at update (flipping a milestone back to active counts against the cap).

import { prisma } from "@/lib/db";
import {
  countdownDays,
  isPastTarget,
  MAX_ACTIVE_MILESTONES,
} from "@/lib/milestone";
import type { Milestone, MilestoneType } from "@prisma/client";

/** Shape returned by the GET active endpoint: milestone + computed countdown. */
export type MilestoneWithCountdown = Milestone & {
  countdownDays: number;
};

/**
 * Return active, non-expired milestones with computed countdown days (MILE-03/04).
 * Expired milestones (target date passed in WIB) are auto-hidden (MILE-04).
 * Ordered by soonest date so the closest deadline shows first.
 */
export async function getActiveMilestones(now: Date = new Date()): Promise<MilestoneWithCountdown[]> {
  const milestones = await prisma.milestone.findMany({
    where: { active: true },
    orderBy: { date: "asc" },
  });

  // Auto-hide expired (MILE-04): filter out milestones whose target day passed.
  const visible = milestones.filter((m) => !isPastTarget(m.date, now));

  return visible.map((m) => ({
    ...m,
    countdownDays: countdownDays(m.date, now),
  }));
}

/**
 * Count currently-active milestones. Used to enforce the max-5 cap (MILE-05).
 * Optionally exclude one id (when updating an existing milestone).
 */
export async function countActive(excludeId?: string): Promise<number> {
  return prisma.milestone.count({
    where: { active: true, ...(excludeId ? { id: { not: excludeId } } : {}) },
  });
}

/**
 * Create a milestone. Enforces the max-5-active cap (MILE-05): a 6th active
 * milestone is rejected with a clear error. Expired dates are allowed at the
 * DB level (admins may backfill) but won't appear in the active view (MILE-04).
 *
 * Throws `MilestoneCapError` when the cap would be exceeded.
 */
export class MilestoneCapError extends Error {
  constructor() {
    super(`Maximum ${MAX_ACTIVE_MILESTONES} active milestones reached (MILE-05)`);
    this.name = "MilestoneCapError";
  }
}

export async function createMilestone(input: {
  title: string;
  type: MilestoneType;
  date: Date;
  active?: boolean;
}): Promise<Milestone> {
  const active = input.active ?? true;

  if (active) {
    const count = await countActive();
    if (count >= MAX_ACTIVE_MILESTONES) {
      throw new MilestoneCapError();
    }
  }

  return prisma.milestone.create({
    data: {
      title: input.title,
      type: input.type,
      date: input.date,
      active,
    },
  });
}

/**
 * Update a milestone. When `active` is being set to true and the milestone
 * was previously inactive (or a different one), re-check the cap (MILE-05).
 */
export async function updateMilestone(
  id: string,
  data: { title?: string; type?: MilestoneType; date?: Date; active?: boolean },
): Promise<Milestone | null> {
  const existing = await prisma.milestone.findUnique({ where: { id } });
  if (!existing) return null;

  // Cap check: only when flipping to active from inactive.
  if (data.active === true && !existing.active) {
    const count = await countActive(id);
    if (count >= MAX_ACTIVE_MILESTONES) {
      throw new MilestoneCapError();
    }
  }

  return prisma.milestone.update({ where: { id }, data });
}

/** Delete a milestone by id. */
export async function deleteMilestone(id: string): Promise<void> {
  await prisma.milestone.delete({ where: { id } });
}

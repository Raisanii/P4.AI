// P4.AI — Badge service (PRD §7.16).
//
// getBadges(): returns the full badge catalog. This is a static list derived
// from src/lib/badges.ts — no DB read needed. The catalog is the source of
// truth for badge metadata (emoji, name, description).
//
// getStudentBadges(userId): returns badges earned by a student. The actual
// award computation (from ActivityLog + AssignmentProgress) is owned by the
// BE gamification engine (P6-BE-1). Until that lands, this returns an empty
// array — the FE renders the friendly empty state (PRD acceptance criterion).
//
// When P6-BE-1 ships a `Badge`/`StudentBadge` model, swap this function to
// query prisma.studentBadge.findMany(...) and map ids to the catalog.

import { BADGE_CATALOG, BADGE_MAP, type Badge, type BadgeId } from "@/lib/badges";

/** Full badge catalog — emoji + name + description. */
export function getBadges(): Badge[] {
  return [...BADGE_CATALOG];
}

export type StudentBadge = {
  id: BadgeId;
  /** ISO date the badge was awarded; null until BE computes it. */
  awardedAt: Date | null;
};

/**
 * Badges earned by a student. Returns the empty array until the BE
 * gamification engine (P6-BE-1) computes and persists awards.
 *
 * ponytail: stub — replace with a prisma query once P6-BE-1 lands a
 * StudentBadge model. The award logic must live in the BE service layer so
 * the FE never mutates badge state directly (AI proposes, backend decides).
 */
export async function getStudentBadges(_userId: string): Promise<StudentBadge[]> {
  return [];
}

/** Resolve a list of earned badge ids against the catalog. */
export function resolveBadges(ids: BadgeId[]): Badge[] {
  return ids
    .map((id) => BADGE_MAP[id])
    .filter((b): b is Badge => Boolean(b));
}

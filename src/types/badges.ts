// P4.AI — Badge FE types (P6-FE-1).
//
// Mirrors the Badge + BadgeAward models (P6-BE-1) and the shape returned by
// the badge service. Presentational components consume these; data fetching
// happens in server components via `@/services/badges/compute`.

/** A badge definition in the catalog (positive-only per §7.16). */
export interface Badge {
  id: string;
  key: string;
  name: string;
  description: string;
  emoji: string;
  criteria: unknown; // Json blob — opaque to FE
}

/** A badge award belonging to a student. */
export interface BadgeAward {
  id: string;
  badgeId: string;
  userId: string;
  awardedAt: Date | string;
}

/** Badge joined with this student's award (null = not yet earned). */
export interface StudentBadge {
  badge: Badge;
  award: BadgeAward | null;
}

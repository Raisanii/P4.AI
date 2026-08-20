// P4.AI — Badge definitions + predicates (PRD §7.16 Positive Gamification).
//
// Gamification is strictly positive — never shaming. The badge catalog is a
// static, single source of truth derived from the PRD table. Criteria strings
// are human-readable descriptions shown in the UI; the actual award logic
// lives in the BE service (P6-BE-1) which computes earned badges from activity
// logs + assignment progress.
//
// Badge id is a stable string slug used by the FE to match earned badge ids
// returned by the student badges API. Add new badges here when the PRD grows.

export type BadgeId =
  | "early_bird"
  | "fast_finisher"
  | "consistent"
  | "on_time_hero"
  | "most_active";

export type Badge = {
  id: BadgeId;
  emoji: string;
  name: string;
  description: string;
};

/** Ordered badge catalog (PRD §7.16). */
export const BADGE_CATALOG: readonly Badge[] = [
  {
    id: "early_bird",
    emoji: "🐦",
    name: "Early Bird",
    description: "Menyelesaikan tugas jauh sebelum deadline.",
  },
  {
    id: "fast_finisher",
    emoji: "⚡",
    name: "Fast Finisher",
    description: "Rata-rata penyelesaian cepat.",
  },
  {
    id: "consistent",
    emoji: "🔥",
    name: "Consistent",
    description: "Aktif mengerjakan tugas secara konsisten.",
  },
  {
    id: "on_time_hero",
    emoji: "🎯",
    name: "On-Time Hero",
    description: "On-time completion rate tinggi.",
  },
  {
    id: "most_active",
    emoji: "🚀",
    name: "Most Active",
    description: "Aktivitas task paling tinggi.",
  },
];

/** Stable map for O(1) lookup by badge id. */
export const BADGE_MAP: Record<BadgeId, Badge> = Object.fromEntries(
  BADGE_CATALOG.map((b) => [b.id, b]),
) as Record<BadgeId, Badge>;

/** Friendly empty-state copy (PRD acceptance criterion). */
export const BADGE_EMPTY_STATE = "Belum ada badge — terus semangat!";

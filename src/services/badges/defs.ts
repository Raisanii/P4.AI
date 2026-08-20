// P4.AI — Badge definitions (§7.16 Positive Gamification).
//
// Pure data — no DB imports, safe to import from seed.ts and compute.ts.
// Positive-only per §7.16 — never "Most Lazy"/"Worst Student"/"Slowest Student".

export interface BadgeDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
  /** Thresholds / params stored as Json `criteria` on the Badge row. */
  criteria: Record<string, number>;
}

export const BADGE_DEFS: BadgeDef[] = [
  {
    key: "early_bird",
    name: "Early Bird",
    description: "Menyelesaikan tugas jauh sebelum deadline",
    emoji: "🐦",
    // ms before deadline: 24h
    criteria: { leadMs: 24 * 60 * 60 * 1000, minCompletions: 1 },
  },
  {
    key: "fast_finisher",
    name: "Fast Finisher",
    description: "Rata-rata penyelesaian cepat",
    emoji: "⚡",
    // avg completion time (startedAt→completedAt) under 24h, ≥2 completions
    criteria: { maxAvgMs: 24 * 60 * 60 * 1000, minCompletions: 2 },
  },
  {
    key: "consistent",
    name: "Consistent",
    description: "Aktif mengerjakan tugas secara konsisten",
    emoji: "🔥",
    // activity on ≥5 distinct days
    criteria: { minActiveDays: 5 },
  },
  {
    key: "on_time_hero",
    name: "On-Time Hero",
    description: "On-time completion rate tinggi",
    emoji: "🎯",
    // on-time rate ≥80% with ≥3 completions
    criteria: { minOnTimeRate: 80, minCompletions: 3 },
  },
  {
    key: "most_active",
    name: "Most Active",
    description: "Aktivitas task paling tinggi",
    emoji: "🚀",
    // top student by activity event count (awarded to single leader)
    criteria: { topN: 1 },
  },
];

// P4.AI — BadgeGrid (P6-FE-1).
//
// Presentational catalog grid: emoji + name + description per badge. Renders
// the friendly empty state when the catalog is empty (§7.16).

import type { Badge } from "@/types/badges";
import BadgeChip from "./BadgeChip";

interface BadgeGridProps {
  badges: Badge[];
}

export default function BadgeGrid({ badges }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <p className="empty-state">
        Belum ada badge — terus semangat! 🌟
      </p>
    );
  }

  return (
    <ul className="badge-grid" role="list" aria-label="Daftar badge">
      {badges.map((badge) => (
        <BadgeChip key={badge.id} badge={badge} />
      ))}
    </ul>
  );
}

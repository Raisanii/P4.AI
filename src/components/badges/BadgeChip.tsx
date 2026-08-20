// P4.AI — BadgeChip (P6-FE-1).
//
// Presentational single-badge card. Earned badges get a highlighted gold
// treatment; locked ones stay muted but readable — always positive (§7.16),
// no shaming language. Rendered inside a <ul class="badge-grid">.

import type { Badge } from "@/types/badges";

interface BadgeChipProps {
  badge: Badge;
  earned?: boolean;
}

export default function BadgeChip({ badge, earned = false }: BadgeChipProps) {
  return (
    <li className={earned ? "badge-chip badge-chip-earned" : "badge-chip"}>
      <span className="badge-emoji" aria-hidden="true">
        {badge.emoji}
      </span>
      <div className="badge-meta">
        <span className="badge-name">{badge.name}</span>
        <span className="badge-desc">{badge.description}</span>
      </div>
      {earned && <span className="badge-earned">✓ Didapat</span>}
    </li>
  );
}

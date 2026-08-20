// P4.AI — BadgeGrid: responsive grid of badge chips (PRD §7.16).
// Renders the badge catalog. Each badge is described fully (emoji + name +
// description) regardless of earned state. Earned ids are highlighted.
//
// ponytail: CSS grid via .badge-grid in globals.css; mobile-first 1-col,
// 2-col at sm, 3-col at lg. Matches the dashboard .dash-grid breakpoints.

import type { Badge, BadgeId } from "@/lib/badges";
import BadgeChip from "./BadgeChip";

type Props = {
  badges: Badge[];
  earnedIds?: BadgeId[];
};

export default function BadgeGrid({ badges, earnedIds = [] }: Props) {
  const earnedSet = new Set(earnedIds);
  return (
    <div className="badge-grid" role="list">
      {badges.map((b) => (
        <BadgeChip key={b.id} badge={b} earned={earnedSet.has(b.id)} />
      ))}
    </div>
  );
}

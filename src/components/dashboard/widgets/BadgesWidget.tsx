// P4.AI — BadgesWidget (P6-FE-1).
//
// Dashboard widget: shows a student's badges. Earned badges highlighted,
// locked ones muted as encouragement. Positive-only tone (§7.16). Uses the
// shared WidgetShell empty-state convention from AnnouncementBanner.

import type { StudentBadge } from "@/types/badges";
import BadgeChip from "@/components/badges/BadgeChip";
import { WidgetShell } from "@/components/dashboard/widgets/AnnouncementBanner";

interface BadgesWidgetProps {
  /** Full catalog joined with this student's awards. */
  badges: StudentBadge[];
}

export default function BadgesWidget({ badges }: BadgesWidgetProps) {
  const earned = badges.filter((b) => b.award !== null);

  if (badges.length === 0) {
    return (
      <WidgetShell label="🏆 Badge Kamu" spec="DASH-11">
        Belum ada badge — terus semangat! 🌟
      </WidgetShell>
    );
  }

  return (
    <section className="widget" aria-label="Badge Kamu">
      <h2 className="widget-label">🏆 Badge Kamu</h2>
      <p className="badge-progress">
        {earned.length} dari {badges.length} badge didapat
      </p>
      <ul className="badge-grid badge-grid-widget" role="list">
        {badges.map(({ badge, award }) => (
          <BadgeChip key={badge.id} badge={badge} earned={award !== null} />
        ))}
      </ul>
    </section>
  );
}

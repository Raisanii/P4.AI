// P4.AI — Badges widget (dashboard slot, PRD §7.16).
// Shows the student's earned badges on the dashboard. Positive, encouraging
// tone — empty state is "Belum ada badge — terus semangat!" (never shaming).
//
// Receives the earned badge ids as props. The dashboard page resolves these
// via the badge service (getStudentBadges) so this widget stays a pure
// presentational component. Falls back to the catalog empty state when none
// are earned.

import { BADGE_CATALOG, BADGE_EMPTY_STATE, type BadgeId } from "@/lib/badges";
import BadgeGrid from "@/components/badges/BadgeGrid";
import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  earnedIds?: BadgeId[] | null;
};

export default function BadgesWidget({ earnedIds = [] }: Props) {
  const ids = earnedIds ?? [];
  if (ids.length === 0) {
    return (
      <WidgetShell label="🏆 Badge" spec="§7.16">
        {BADGE_EMPTY_STATE}
      </WidgetShell>
    );
  }
  return (
    <section className="widget" aria-label="Badge">
      <h2 className="widget-label">🏆 Badge</h2>
      <BadgeGrid badges={[...BADGE_CATALOG]} earnedIds={ids} />
    </section>
  );
}

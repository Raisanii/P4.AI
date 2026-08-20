// P4.AI — DashboardGrid (DASH-11 mobile-first responsive grid).
// ponytail: CSS grid via globals.css; upgrade to shadcn/ui Grid when a
// second dashboard variant lands. Breakpoints: <640px 1-col, md 2-col, lg 3-col.
//
// DASH-03 + DASH-06 are wired to real data (schedule + milestone services).
// DASH badge widget (§7.16) wired to the badge service (earned = empty until
// P6-BE-1 lands). Other widgets remain placeholder slots until their APIs
// land in later phases.

import AnnouncementBanner from "./widgets/AnnouncementBanner";
import MilestoneCountdown from "./widgets/MilestoneCountdown";
import BirthdayWidget from "./widgets/BirthdayWidget";
import ActiveTaskWidget from "./widgets/ActiveTaskWidget";
import TodayScheduleWidget from "./widgets/TodayScheduleWidget";
import TodayAttendanceWidget from "./widgets/TodayAttendanceWidget";
import TaskProgressSummaryWidget from "./widgets/TaskProgressSummaryWidget";
import BadgesWidget from "./widgets/BadgesWidget";
import type { Milestone } from "./widgets/MilestoneCountdown";
import type { ScheduleEntry } from "./widgets/TodayScheduleWidget";
import type { BadgeId } from "@/lib/badges";

export default function DashboardGrid({
  milestones,
  schedule,
  earnedBadgeIds = [],
}: {
  milestones: Milestone[];
  schedule: ScheduleEntry[];
  earnedBadgeIds?: BadgeId[];
}) {
  return (
    <div className="dash-grid">
      <AnnouncementBanner />
      <MilestoneCountdown milestones={milestones} />
      <BirthdayWidget />
      <ActiveTaskWidget />
      <TodayScheduleWidget schedule={schedule} />
      <TodayAttendanceWidget />
      <TaskProgressSummaryWidget />
      <BadgesWidget earnedIds={earnedBadgeIds} />
    </div>
  );
}

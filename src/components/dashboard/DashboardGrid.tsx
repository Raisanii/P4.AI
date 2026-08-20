// P4.AI — DashboardGrid (DASH-11 mobile-first responsive grid).
// ponytail: CSS grid via globals.css; upgrade to shadcn/ui Grid when a
// second dashboard variant lands. Breakpoints: <640px 1-col, md 2-col, lg 3-col.
//
// DASH-03 + DASH-06 are wired to real data (schedule + milestone services).
// Other widgets remain placeholder slots until their APIs land in later phases.

import AnnouncementBanner from "./widgets/AnnouncementBanner";
import MilestoneCountdown from "./widgets/MilestoneCountdown";
import BirthdayWidget from "./widgets/BirthdayWidget";
import ActiveTaskWidget from "./widgets/ActiveTaskWidget";
import TodayScheduleWidget from "./widgets/TodayScheduleWidget";
import TodayAttendanceWidget from "./widgets/TodayAttendanceWidget";
import TaskProgressSummaryWidget from "./widgets/TaskProgressSummaryWidget";
import type { Milestone } from "./widgets/MilestoneCountdown";
import type { ScheduleEntry } from "./widgets/TodayScheduleWidget";

export default function DashboardGrid({
  milestones,
  schedule,
}: {
  milestones: Milestone[];
  schedule: ScheduleEntry[];
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
    </div>
  );
}

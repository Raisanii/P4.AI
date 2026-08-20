// P4.AI — DashboardGrid (DASH-11 mobile-first responsive grid).
// ponytail: CSS grid via globals.css; upgrade to shadcn/ui Grid when a
// second dashboard variant lands. Breakpoints: <640px 1-col, md 2-col, lg 3-col.

import AnnouncementBanner from "./widgets/AnnouncementBanner";
import MilestoneCountdown from "./widgets/MilestoneCountdown";
import BirthdayWidget from "./widgets/BirthdayWidget";
import ActiveTaskWidget from "./widgets/ActiveTaskWidget";
import TodayScheduleWidget from "./widgets/TodayScheduleWidget";
import TodayAttendanceWidget from "./widgets/TodayAttendanceWidget";
import TaskProgressSummaryWidget from "./widgets/TaskProgressSummaryWidget";

export default function DashboardGrid() {
  return (
    <div className="dash-grid">
      <AnnouncementBanner />
      <MilestoneCountdown />
      <BirthdayWidget />
      <ActiveTaskWidget />
      <TodayScheduleWidget />
      <TodayAttendanceWidget />
      <TaskProgressSummaryWidget />
    </div>
  );
}

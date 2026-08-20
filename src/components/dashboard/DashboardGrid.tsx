// P4.AI — DashboardGrid (DASH-11 mobile-first responsive grid).
// ponytail: CSS grid via globals.css; upgrade to shadcn/ui Grid when a
// second dashboard variant lands. Breakpoints: <640px 1-col, md 2-col, lg 3-col.
//
// DASH-07 wired to attendance API via dashboard server component.

import AnnouncementBanner from "./widgets/AnnouncementBanner";
import MilestoneCountdown from "./widgets/MilestoneCountdown";
import BirthdayWidget from "./widgets/BirthdayWidget";
import ActiveTaskWidget from "./widgets/ActiveTaskWidget";
import TodayScheduleWidget from "./widgets/TodayScheduleWidget";
import AttendanceRecap from "./widgets/AttendanceRecap";
import TaskProgressSummaryWidget from "./widgets/TaskProgressSummaryWidget";
import type { AttendanceRecapData } from "./widgets/AttendanceRecap";

export default function DashboardGrid({
  attendanceRecap,
}: {
  attendanceRecap?: AttendanceRecapData | null;
}) {
  return (
    <div className="dash-grid">
      <AnnouncementBanner />
      <MilestoneCountdown />
      <BirthdayWidget />
      <ActiveTaskWidget />
      <TodayScheduleWidget />
      <AttendanceRecap recap={attendanceRecap} />
      <TaskProgressSummaryWidget />
    </div>
  );
}

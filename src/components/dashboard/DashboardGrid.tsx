// P4.AI — DashboardGrid (DASH-11 mobile-first responsive grid).
// ponytail: CSS grid via globals.css; upgrade to shadcn/ui Grid when a
// second dashboard variant lands. Breakpoints: <640px 1-col, md 2-col, lg 3-col.
//
// DASH-02 (announcements), DASH-03 (milestone), DASH-04 (birthdays), and
// DASH-06 (schedule) are wired to real data. Other widgets remain placeholder.

import AnnouncementBanner from "./widgets/AnnouncementBanner";
import MilestoneCountdown from "./widgets/MilestoneCountdown";
import BirthdayWidget from "./widgets/BirthdayWidget";
import ActiveTaskWidget from "./widgets/ActiveTaskWidget";
import TodayScheduleWidget from "./widgets/TodayScheduleWidget";
import TodayAttendanceWidget from "./widgets/TodayAttendanceWidget";
import TaskProgressSummaryWidget from "./widgets/TaskProgressSummaryWidget";
import type { Milestone } from "./widgets/MilestoneCountdown";
import type { ScheduleEntry } from "./widgets/TodayScheduleWidget";
import type { Announcement } from "./widgets/AnnouncementBanner";
import type { Birthday } from "./widgets/BirthdayWidget";

export default function DashboardGrid({
 milestones,
 schedule,
 announcements,
 birthdays,
}: {
 milestones: Milestone[];
 schedule: ScheduleEntry[];
 announcements?: Announcement[] | null;
 birthdays?: Birthday[] | null;
}) {
 return (
 <div className="dash-grid">
 <AnnouncementBanner announcements={announcements} />
 <MilestoneCountdown milestones={milestones} />
 <BirthdayWidget birthdays={birthdays} />
 <ActiveTaskWidget />
 <TodayScheduleWidget schedule={schedule} />
 <TodayAttendanceWidget />
 <TaskProgressSummaryWidget />
 </div>
 );
}

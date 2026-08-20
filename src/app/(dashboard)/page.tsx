// P4.AI — dashboard home (DASH-01).
// Server component: fetches announcements, birthdays, milestone countdown,
// today's schedule, and class analytics from the service layer and passes
// them to DashboardGrid (DASH-09 task progress + DASH-10 daily activity).

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { getActiveMilestones } from "@/services/milestone";
import { getTodaySchedule } from "@/services/schedule";
import { getActiveAnnouncements } from "@/services/announcement";
import { getTodaysBirthdays } from "@/services/user";
import { computeClassMetrics } from "@/services/analytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch all data in parallel — each hits the DB once.
  const [milestones, schedule, announcements, birthdays, classMetrics] = await Promise.all([
    getActiveMilestones(),
    getTodaySchedule(),
    getActiveAnnouncements(),
    getTodaysBirthdays(),
    computeClassMetrics(),
  ]);

  const taskProgress = {
    notStarted: classMetrics.notStarted,
    inProgress: classMetrics.inProgress,
    done: classMetrics.totalProgressRecords - classMetrics.notStarted - classMetrics.inProgress,
    total: classMetrics.totalProgressRecords,
  };

  const dailyActivity = {
    startedToday: classMetrics.startedToday,
    completedToday: classMetrics.completedToday,
    notStarted: classMetrics.notStarted,
    inProgress: classMetrics.inProgress,
  };

  return (
    <main className="page">
      <h1 className="dash-title">Dashboard</h1>
      <DashboardGrid
        milestones={milestones}
        schedule={schedule}
        announcements={announcements}
        birthdays={birthdays}
        taskProgress={taskProgress}
        dailyActivity={dailyActivity}
      />
    </main>
  );
}

// P4.AI — dashboard home (DASH-01).
// Server component: fetches milestone countdown + today's schedule + active
// tasks from the service layer and passes them to DashboardGrid for
// DASH-03 + DASH-05 + DASH-06.

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { getActiveMilestones } from "@/services/milestone";
import { getTodaySchedule } from "@/services/schedule";
import { getActiveTasks } from "@/services/task";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch all three in parallel — each hits the DB once.
  const [milestones, schedule, activeTasks] = await Promise.all([
    getActiveMilestones(),
    getTodaySchedule(),
    getActiveTasks(),
  ]);

  return (
    <main className="page">
      <h1 className="dash-title">Dashboard</h1>
      <DashboardGrid
        milestones={milestones}
        schedule={schedule}
        activeTasks={activeTasks}
      />
    </main>
  );
}

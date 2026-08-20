// P4.AI — dashboard home (DASH-01).
// Server component: fetches milestone countdown + today's schedule from the
// service layer and passes them to DashboardGrid for DASH-03 + DASH-06.

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { getActiveMilestones } from "@/services/milestone";
import { getTodaySchedule } from "@/services/schedule";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch both in parallel — each hits the DB once.
  const [milestones, schedule] = await Promise.all([
    getActiveMilestones(),
    getTodaySchedule(),
  ]);

  return (
    <main className="page">
      <h1 className="dash-title">Dashboard</h1>
      <DashboardGrid milestones={milestones} schedule={schedule} />
    </main>
  );
}

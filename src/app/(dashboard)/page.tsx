// P4.AI — dashboard home (DASH-01).
// Server component: fetches milestone countdown + today's schedule from the
// service layer and passes them to DashboardGrid for DASH-03 + DASH-06.

import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { getActiveMilestones } from "@/services/milestone";
import { getTodaySchedule } from "@/services/schedule";
import { getStudentBadges } from "@/services/badges";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Fetch milestones + schedule in parallel. Earned badges are fetched
  // separately so we can resolve the student id from the session first.
  const [milestones, schedule] = await Promise.all([
    getActiveMilestones(),
    getTodaySchedule(),
  ]);

  // Resolve earned badges for the logged-in student (empty until P6-BE-1).
  const session = await auth();
  const userId = session?.user?.id;
  const studentBadges = userId ? await getStudentBadges(userId) : [];
  const earnedBadgeIds = studentBadges.map((b) => b.id);

  return (
    <main className="page">
      <h1 className="dash-title">Dashboard</h1>
      <DashboardGrid
        milestones={milestones}
        schedule={schedule}
        earnedBadgeIds={earnedBadgeIds}
      />
    </main>
  );
}

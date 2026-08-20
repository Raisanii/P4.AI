// P4.AI — Dashboard loading skeleton (NFR-01).
// Shows while the dashboard server component fetches milestones, schedule,
// announcements, birthdays, analytics, and attendance.

import { SkeletonGrid } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <main className="page">
      <h1 className="dash-title">Dashboard</h1>
      <SkeletonGrid count={8} />
    </main>
  );
}

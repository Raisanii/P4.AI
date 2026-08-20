// P4.AI — dashboard home (DASH-01).
// Server component: renders the dashboard grid with placeholder widget
// slots. No data fetching yet — APIs arrive Phase 2/3; slots accept data
// props so component boundaries stay stable for later wiring (NFR-01).

import DashboardGrid from "@/components/dashboard/DashboardGrid";

export default function DashboardPage() {
  return (
    <main className="page">
      <h1 className="dash-title">Dashboard</h1>
      <DashboardGrid />
    </main>
  );
}

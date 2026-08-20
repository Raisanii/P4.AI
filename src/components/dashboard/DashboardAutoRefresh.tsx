"use client";

// P4.AI — DashboardAutoRefresh (DASH-12).
// Invisible client component that triggers router.refresh() on an interval.
// Mounted by the dashboard server component so it re-fetches from the DB
// without pulling in SWR/TanStack Query. Pauses when the tab is hidden.

import { useAutoRefresh } from "@/hooks/useAutoRefresh";

export default function DashboardAutoRefresh() {
  useAutoRefresh({ intervalMs: 30_000 });
  return null;
}

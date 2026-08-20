// P4.AI — Daily activity widget (DASH-10, §7.8 ACT).
// Shows 🟢 started / 🟡 in-progress / 🔴 not-started / ✅ completed today.
// Data source: computeClassMetrics() (ActivityLog events + AssignmentProgress).

export type DailyActivity = {
  startedToday: number;
  completedToday: number;
  notStarted: number;
  inProgress: number;
};

import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  activity?: DailyActivity | null;
};

export default function DailyActivityWidget({ activity }: Props) {
  if (!activity) {
    return (
      <WidgetShell label="📊 Aktivitas Hari Ini" spec="DASH-10">
        Data aktivitas belum tersedia.
      </WidgetShell>
    );
  }

  return (
    <section className="widget" aria-label="Aktivitas Hari Ini">
      <h2 className="widget-label">📊 Aktivitas Hari Ini</h2>
      <ul className="progress-list">
        <li>🟢 Sudah mulai: {activity.startedToday}</li>
        <li>🟡 Sedang mengerjakan: {activity.inProgress}</li>
        <li>✅ Selesai hari ini: {activity.completedToday}</li>
        <li>🔴 Belum mulai: {activity.notStarted}</li>
      </ul>
    </section>
  );
}

// P4.AI — ClassActivitySummary: daily activity breakdown (§7.8 ACT).
// Shows 🟢 started, 🟡 in-progress, 🔴 not-started counts for today.
// ponytail: CSS list via globals.css; upgrade to shadcn Card when available.

import ProgressBar from "./ProgressBar";

export type ActivitySummary = {
  startedToday: number;
  completedToday: number;
  notStarted: number;
  inProgress: number;
  totalStudents: number;
  completionRate: number;
  onTimeRate: number;
};

export default function ClassActivitySummary({ summary }: { summary: ActivitySummary }) {
  return (
    <section className="widget" aria-label="Aktivitas Kelas">
      <h2 className="widget-label">📊 Aktivitas Kelas Hari Ini</h2>
      <ul className="activity-list">
        <li className="activity-item activity-started">
          <span className="activity-dot">🟢</span>
          <span className="activity-text">Sudah mulai</span>
          <span className="activity-count">{summary.startedToday}</span>
        </li>
        <li className="activity-item activity-progress">
          <span className="activity-dot">🟡</span>
          <span className="activity-text">Sedang mengerjakan</span>
          <span className="activity-count">{summary.inProgress}</span>
        </li>
        <li className="activity-item activity-notstarted">
          <span className="activity-dot">🔴</span>
          <span className="activity-text">Belum mulai</span>
          <span className="activity-count">{summary.notStarted}</span>
        </li>
        <li className="activity-item activity-completed">
          <span className="activity-dot">✅</span>
          <span className="activity-text">Selesai hari ini</span>
          <span className="activity-count">{summary.completedToday}</span>
        </li>
      </ul>
      <ProgressBar label="Completion Rate" value={summary.completionRate} />
      <ProgressBar label="On-Time Rate" value={summary.onTimeRate} />
    </section>
  );
}

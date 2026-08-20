// P4.AI — Task progress summary widget (DASH-09).
// Shows "X/Y siswa" with progress bar, fed by class analytics metrics.
// Data source: computeClassMetrics() (ActivityLog + AssignmentProgress).

export type TaskProgressSummary = {
  notStarted: number;
  inProgress: number;
  done: number;
  total: number;
};

import { WidgetShell } from "./AnnouncementBanner";
import ProgressBar from "@/components/analytics/ProgressBar";

type Props = {
  summary?: TaskProgressSummary | null;
};

export default function TaskProgressSummaryWidget({ summary }: Props) {
  if (!summary || summary.total === 0) {
    return (
      <WidgetShell label="📊 Progress Tugas" spec="DASH-09">
        Data progress belum tersedia.
      </WidgetShell>
    );
  }

  const started = summary.inProgress + summary.done;
  const pct = Math.round((started / summary.total) * 100);

  return (
    <section className="widget" aria-label="Progress Tugas">
      <h2 className="widget-label">📊 Progress Tugas</h2>
      <ProgressBar label="Mulai mengerjakan" value={pct} caption={`${started} / ${summary.total} siswa`} />
      <ul className="progress-list">
        <li>🟢 Sedang mengerjakan: {summary.inProgress}</li>
        <li>✅ Selesai: {summary.done}</li>
        <li>🔴 Belum mulai: {summary.notStarted}</li>
      </ul>
    </section>
  );
}

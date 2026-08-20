// P4.AI — Task progress summary slot (DASH-09).
// ponytail: empty-state placeholder; Phase 3 wires progress + analytics APIs.

export type TaskProgressSummary = {
  notStarted: number;
  inProgress: number;
  done: number;
  total: number;
};

import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  summary?: TaskProgressSummary | null;
};

export default function TaskProgressSummaryWidget({ summary }: Props) {
  if (!summary) {
    return (
      <WidgetShell label="📊 Progress Tugas" spec="DASH-09">
        Data progress belum tersedia.
      </WidgetShell>
    );
  }
  return (
    <section className="widget" aria-label="Progress Tugas">
      <h2 className="widget-label">📊 Progress Tugas</h2>
      <ul className="progress-list">
        <li>🟢 Sudah mulai: {summary.inProgress}</li>
        <li>✅ Selesai: {summary.done}</li>
        <li>🔴 Belum mulai: {summary.notStarted}</li>
      </ul>
    </section>
  );
}

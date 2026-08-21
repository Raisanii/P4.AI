// P4.AI — Active task widget (DASH-05).
// Displays upcoming tasks sorted by deadline. Overdue tasks are excluded
// from the widget (they show on the task list page with danger styling).

import Link from "next/link";
import { WidgetShell } from "./AnnouncementBanner";

export type ActiveTask = {
  id: string;
  title: string;
  subject: string;
  deadline: Date | string;
  type: string;
  progressCount: number;
};

type Props = {
  tasks?: ActiveTask[] | null;
};

function formatDeadline(value: Date | string): string {
  const iso = typeof value === "string" ? value : value.toISOString();
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export default function ActiveTaskWidget({ tasks }: Props) {
  const items = tasks ?? [];
  if (items.length === 0) {
    return (
      <WidgetShell label="📋 Tugas Aktif" spec="DASH-05">
        Tidak ada tugas aktif.
      </WidgetShell>
    );
  }
  return (
    <section className="widget" aria-label="Tugas Aktif">
      <h2 className="widget-label">📋 Tugas Aktif</h2>
      <ul className="task-list">
        {items.map((t) => (
          <li key={t.id}>
            <Link href={`/tugas/${t.id}`} className="task-title">
              {t.title}
            </Link>
            <span className="task-progress">
              {formatDeadline(t.deadline)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

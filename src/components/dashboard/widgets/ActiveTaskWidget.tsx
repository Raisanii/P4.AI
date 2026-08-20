// P4.AI — Active task widget slot (DASH-05).
// ponytail: empty-state placeholder; Phase 2/3 wires task + progress APIs.

export type ActiveTask = {
  id: string;
  title: string;
  subject: string;
  deadline: Date | string;
  progress: { done: number; total: number };
};

import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  tasks?: ActiveTask[] | null;
};

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
            <span className="task-title">{t.title}</span>
            <span className="task-progress">
              {t.progress.done}/{t.progress.total}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

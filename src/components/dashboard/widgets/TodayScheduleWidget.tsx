// P4.AI — Today's schedule slot (DASH-06).
// ponytail: empty-state placeholder; Phase 2 wires schedule API.

export type ScheduleEntry = {
  id: string;
  subject: string;
  teacher?: string | null;
  startTime: string;
  endTime: string;
  room?: string | null;
};

import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  schedule?: ScheduleEntry[] | null;
};

export default function TodayScheduleWidget({ schedule }: Props) {
  const items = schedule ?? [];
  if (items.length === 0) {
    return (
      <WidgetShell label="📅 Jadwal Hari Ini" spec="DASH-06">
        Tidak ada jadwal hari ini.
      </WidgetShell>
    );
  }
  return (
    <section className="widget" aria-label="Jadwal Hari Ini">
      <h2 className="widget-label">📅 Jadwal Hari Ini</h2>
      <ul className="schedule-list">
        {items.map((s) => (
          <li key={s.id}>
            <span className="schedule-time">{s.startTime}</span>
            <span className="schedule-subject">{s.subject}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

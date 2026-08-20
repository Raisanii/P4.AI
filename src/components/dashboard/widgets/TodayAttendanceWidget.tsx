// P4.AI — Today's attendance slot (DASH-07).
// ponytail: empty-state placeholder; Phase 2 wires attendance API.

export type AttendanceSummary = {
  present: number;
  sick: number;
  permitted: number;
  absent: number;
  total: number;
};

import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  summary?: AttendanceSummary | null;
};

export default function TodayAttendanceWidget({ summary }: Props) {
  if (!summary) {
    return (
      <WidgetShell label="👥 Absensi Hari Ini" spec="DASH-07">
        Data absensi belum tersedia.
      </WidgetShell>
    );
  }
  return (
    <section className="widget" aria-label="Absensi Hari Ini">
      <h2 className="widget-label">👥 Absensi Hari Ini</h2>
      <ul className="attendance-list">
        <li>Hadir {summary.present}/{summary.total}</li>
        <li>Sakit {summary.sick}</li>
        <li>Izin {summary.permitted}</li>
        <li>Alfa {summary.absent}</li>
      </ul>
    </section>
  );
}

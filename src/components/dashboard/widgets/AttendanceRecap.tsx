// P4.AI — Attendance recap widget (DASH-07).
// Wired to /api/attendance via the dashboard server component.
// Renders "Hadir X/Y · Sakit · Izin · Alfa" per ATT-04.

export type AttendanceRecapData = {
  hadir: number;
  sakit: number;
  izin: number;
  alfa: number;
  totalStudents: number;
};

import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  recap?: AttendanceRecapData | null;
};

export default function AttendanceRecap({ recap }: Props) {
  if (!recap) {
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
        <li>
          <span className="att-dot att-dot-hadir" /> Hadir {recap.hadir}/{recap.totalStudents}
        </li>
        <li>
          <span className="att-dot att-dot-sakit" /> Sakit {recap.sakit}
        </li>
        <li>
          <span className="att-dot att-dot-izin" /> Izin {recap.izin}
        </li>
        <li>
          <span className="att-dot att-dot-alfa" /> Alfa {recap.alfa}
        </li>
      </ul>
    </section>
  );
}

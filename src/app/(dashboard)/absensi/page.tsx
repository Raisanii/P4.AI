// P4.AI — /absensi page (ATT-01..05, ATT-08).
// Server component: fetches students + existing attendance for a date,
// role-gates input. Students see read-only today's view (§13).

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AttendanceTable, {
  type StudentRow,
  type ExistingRecord,
} from "@/components/attendance/AttendanceTable";
import type { Role } from "@/lib/roles";
import type { AttendanceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const CAN_EDIT: Role[] = ["SUPER_ADMIN", "SECRETARY"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s + "T00:00:00Z").getTime());
}

export default async function AbsensiPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const date = dateParam && isValidDate(dateParam) ? dateParam : todayStr();

  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role ? CAN_EDIT.includes(role) : false;

  // Fetch all students ordered by name.
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, nis: true },
    orderBy: { name: "asc" },
  });

  // Fetch existing attendance for this date.
  const dayStart = new Date(date + "T00:00:00Z");
  const dayEnd = new Date(date + "T23:59:59.999Z");
  const records = await prisma.attendance.findMany({
    where: { date: { gte: dayStart, lte: dayEnd } },
    select: { userId: true, status: true, notes: true },
  });

  const studentRows: StudentRow[] = students.map((s) => ({
    userId: s.id,
    name: s.name,
    nis: s.nis,
  }));

  const existing: ExistingRecord[] = records.map((r) => ({
    userId: r.userId,
    status: r.status as AttendanceStatus,
    notes: r.notes,
  }));

  // Recap for the loaded date.
  const recap = { HADIR: 0, SAKIT: 0, IZIN: 0, ALFA: 0 };
  for (const r of records) {
    recap[r.status as AttendanceStatus] += 1;
  }

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Absensi</h1>
        <form method="GET" action="/absensi" className="att-date-form">
          <label htmlFor="att-date" className="att-date-label">Tanggal</label>
          <input
            id="att-date"
            name="date"
            type="date"
            defaultValue={date}
            className="att-date-input"
          />
          <button type="submit" className="btn btn-primary btn-sm">Terapkan</button>
        </form>
      </div>

      <div className="att-recap-bar att-recap-bar-static" aria-label="Rekap absensi">
        <span className="att-recap-item">
          <span className="att-pill att-pill-hadir" /> Hadir {recap.HADIR}/{students.length}
        </span>
        <span className="att-recap-item">
          <span className="att-pill att-pill-sakit" /> Sakit {recap.SAKIT}
        </span>
        <span className="att-recap-item">
          <span className="att-pill att-pill-izin" /> Izin {recap.IZIN}
        </span>
        <span className="att-recap-item">
          <span className="att-pill att-pill-alfa" /> Alfa {recap.ALFA}
        </span>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">Belum ada data siswa.</div>
      ) : canEdit ? (
        <AttendanceTable students={studentRows} existing={existing} date={date} />
      ) : (
        <div className="att-readonly" role="status">
          <p>Anda hanya dapat melihat absensi. Input absensi hanya untuk Admin/Sekretaris.</p>
          <div className="att-cards" role="list">
            {studentRows.map((s, i) => {
              const rec = existing.find((r) => r.userId === s.userId);
              const status = rec?.status ?? "—";
              return (
                <div key={s.userId} className="att-card att-card-readonly" role="listitem">
                  <div className="att-card-head">
                    <span className="att-student-name">{s.name}</span>
                    <span className="att-student-nis">{s.nis}</span>
                  </div>
                  <span className={`att-pill att-pill-${status.toLowerCase()}`}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}

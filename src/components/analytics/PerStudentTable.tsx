// P4.AI — PerStudentTable: per-student analytics table (§7.9 ANALYTICS).
// Shows Started / Completed / Avg Time per student.
// ponytail: CSS table via globals.css; upgrade to shadcn DataTable when available.

export type StudentRow = {
  userId: string;
  name: string;
  nis: string;
  startedCount: number;
  completedCount: number;
  inProgressCount: number;
  notStartedCount: number;
  avgTimeMs: number | null;
  avgTimeLabel: string;
};

type Props = {
  students: StudentRow[];
};

export default function PerStudentTable({ students }: Props) {
  if (students.length === 0) {
    return (
      <div className="empty-state">Belum ada data siswa.</div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th className="num">Started</th>
            <th className="num">Completed</th>
            <th className="num">Avg Time</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.userId}>
              <td>
                <div className="student-name">{s.name}</div>
                <div className="student-nis">{s.nis}</div>
              </td>
              <td className="num">{s.startedCount}</td>
              <td className="num">{s.completedCount}</td>
              <td className="num">{s.avgTimeLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

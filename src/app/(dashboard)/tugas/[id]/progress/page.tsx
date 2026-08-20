// P4.AI — Per-task class progress page (TASK-11, §7.5, §7.9).
// Route: /tugas/[id]/progress — SUPER_ADMIN, SECRETARY only.
// Server component: fetches the assignment + per-student progress from the
// task progress API service, renders summary bars + per-student table with
// OVERDUE computed from deadline + status.
// PRD: TASK-11 (class progress), ACT, ANALYTICS.

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { computeEffectiveStatus } from "@/services/overdue";
import ProgressBar from "@/components/analytics/ProgressBar";
import type { EffectiveStatus } from "@/components/task/ProgressBadge";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  TODO: "⚪ TODO",
  IN_PROGRESS: "🟡 IN PROGRESS",
  DONE: "✅ DONE",
  OVERDUE: "🔴 OVERDUE",
};

const STATUS_BADGE: Record<string, string> = {
  TODO: "badge-todo",
  IN_PROGRESS: "badge-in-progress",
  DONE: "badge-done",
  OVERDUE: "badge-overdue",
};

export default async function TaskProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const role = session?.user?.role;

  // Route guard: students redirected by middleware, but double-check server-side.
  if (role !== "SUPER_ADMIN" && role !== "SECRETARY") {
    return (
      <main className="page">
        <div className="alert" role="alert">Akses ditolak. Halaman ini untuk Admin/Sekretaris.</div>
      </main>
    );
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      subject: true,
      deadline: true,
    },
  });

  if (!assignment) {
    notFound();
  }

  const [students, progressRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.assignmentProgress.findMany({
      where: { assignmentId: id },
    }),
  ]);

  const progressByUser = new Map(progressRows.map((p) => [p.userId, p]));
  const now = new Date();
  const deadline = new Date(assignment.deadline);

  const summary = { TODO: 0, IN_PROGRESS: 0, DONE: 0, OVERDUE: 0, total: students.length };
  let doneCount = 0;
  let onTimeDone = 0;

  const studentProgress = students.map((student) => {
    const row = progressByUser.get(student.id);
    const status = row?.status ?? "TODO";
    const effectiveStatus: EffectiveStatus = computeEffectiveStatus(status, deadline, now);

    if (effectiveStatus === "OVERDUE") {
      summary.OVERDUE++;
    } else {
      summary[status]++;
    }

    if (status === "DONE") {
      doneCount++;
      if (row?.completedAt && row.completedAt.getTime() <= deadline.getTime()) {
        onTimeDone++;
      }
    }

    return {
      userId: student.id,
      name: student.name,
      status,
      effectiveStatus,
      startedAt: row?.startedAt ?? null,
      completedAt: row?.completedAt ?? null,
      startedSource: row?.startedSource ?? null,
      completedSource: row?.completedSource ?? null,
    };
  });

  const completionRate = summary.total > 0 ? Math.round((doneCount / summary.total) * 100) : 0;
  const onTimeRate = doneCount > 0 ? Math.round((onTimeDone / doneCount) * 100) : 0;

  const deadlineFormatted = deadline.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">{assignment.title}</h1>
          <p className="page-subtitle">{assignment.subject} · Deadline: {deadlineFormatted}</p>
        </div>
        <Link href="/tugas" className="btn btn-ghost btn-sm">← Kembali</Link>
      </div>

      {/* Summary progress bars */}
      <section className="widget" aria-label="Progress Ringkasan">
        <h2 className="widget-label">📊 Ringkasan Progress</h2>
        <ProgressBar label="Completion Rate" value={completionRate} />
        <ProgressBar label="On-Time Rate" value={onTimeRate} />
        <ul className="analytics-stats">
          <li>
            <span className="stat-label">🟡 In Progress</span>
            <span className="stat-value">{summary.IN_PROGRESS} / {summary.total}</span>
          </li>
          <li>
            <span className="stat-label">✅ Done</span>
            <span className="stat-value">{summary.DONE} / {summary.total}</span>
          </li>
          <li>
            <span className="stat-label">⚪ Todo</span>
            <span className="stat-value">{summary.TODO} / {summary.total}</span>
          </li>
          <li>
            <span className="stat-label">🔴 Overdue</span>
            <span className="stat-value stat-overdue">{summary.OVERDUE}</span>
          </li>
        </ul>
      </section>

      {/* Per-student progress table */}
      <section className="widget" aria-label="Progress per Siswa">
        <h2 className="widget-label">👥 Progress per Siswa</h2>
        {studentProgress.length === 0 ? (
          <div className="empty-state">Belum ada siswa.</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {studentProgress.map((s) => (
                  <tr key={s.userId}>
                    <td className="student-name">{s.name}</td>
                    <td>
                      <span className={`progress-badge ${STATUS_BADGE[s.effectiveStatus]}`}>
                        {STATUS_LABELS[s.effectiveStatus]}
                      </span>
                    </td>
                    <td className="timestamp-cell">
                      {s.startedAt
                        ? new Date(s.startedAt).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            timeZone: "Asia/Jakarta",
                          })
                        : "—"}
                    </td>
                    <td className="timestamp-cell">
                      {s.completedAt
                        ? new Date(s.completedAt).toLocaleDateString("id-ID", {
                            day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            timeZone: "Asia/Jakarta",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

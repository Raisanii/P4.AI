// P4.AI — Student task detail page (STASK, §7.7, TASK-06/07).
// Route: /tugas/[id] — student's personal task dashboard with START/COMPLETE.
// Server component: fetches task + student's progress row, computes effective
// status (OVERDUE), renders TaskActionPanel for mutations.
//
// Backend is source of truth (state machine, SUN-26). UI disables forbidden
// transitions (TASK-08); backend also rejects with 409 (NFR-10).
// Duration computed client-side from startedAt/completedAt per issue notes.

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { computeEffectiveStatus } from "@/services/overdue";
import TaskActionPanel from "@/components/task/TaskActionPanel";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <main className="page">
        <div className="alert" role="alert">Silakan login terlebih dahulu.</div>
      </main>
    );
  }

  const task = await prisma.assignment.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      clarifications: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!task) {
    notFound();
  }

  // Student's progress row (unique assignmentId + userId).
  const progress = await prisma.assignmentProgress.findUnique({
    where: {
      assignmentId_userId: { assignmentId: id, userId },
    },
  });

  const status = progress?.status ?? "TODO";
  const deadline = new Date(task.deadline);
  const now = new Date();
  const effectiveStatus = computeEffectiveStatus(status, deadline, now);

  const startedAt = progress?.startedAt?.toISOString() ?? null;
  const completedAt = progress?.completedAt?.toISOString() ?? null;

  const deadlineFormatted = deadline.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  const createdAtFormatted = new Date(task.createdAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">{task.title}</h1>
      </div>

      <article className="task-detail-card">
        <div className="task-meta">
          <span className="task-meta-label">Mapel:</span>
          <span className="task-meta-value">{task.subject}</span>
        </div>

        <div className="task-meta">
          <span className="task-meta-label">Deadline:</span>
          <span className={`task-meta-value ${effectiveStatus === "OVERDUE" && status !== "DONE" ? "task-meta-overdue" : ""}`}>
            {deadlineFormatted}
          </span>
        </div>

        <div className="task-meta">
          <span className="task-meta-label">Tipe:</span>
          <span className="task-meta-value">
            {task.type === "INDIVIDUAL" ? "Individu" : "Kelompok"}
          </span>
        </div>

        <div className="task-meta">
          <span className="task-meta-label">Dibuat oleh:</span>
          <span className="task-meta-value">{task.createdBy.name}</span>
        </div>

        <div className="task-meta">
          <span className="task-meta-label">Dibuat:</span>
          <span className="task-meta-value">{createdAtFormatted}</span>
        </div>

        {task.description && (
          <div className="task-description">
            <h2 className="task-section-title">Deskripsi</h2>
            <p className="task-description-text">{task.description}</p>
          </div>
        )}

        {task.submissionFormat && (
          <div className="task-description">
            <h2 className="task-section-title">Format Pengumpulan</h2>
            <p className="task-description-text">{task.submissionFormat}</p>
          </div>
        )}

        {task.criteria && (
          <div className="task-description">
            <h2 className="task-section-title">Kriteria</h2>
            <p className="task-description-text">{task.criteria}</p>
          </div>
        )}

        {task.reference && (
          <div className="task-description">
            <h2 className="task-section-title">Referensi</h2>
            <p className="task-description-text">{task.reference}</p>
          </div>
        )}

        <TaskActionPanel
          taskId={task.id}
          progress={
            progress
              ? {
                  id: progress.id,
                  status: progress.status,
                  startedAt,
                  completedAt,
                  startedSource: progress.startedSource ?? null,
                  completedSource: progress.completedSource ?? null,
                }
              : null
          }
          effectiveStatus={effectiveStatus}
          startedAt={startedAt}
          completedAt={completedAt}
        />
      </article>

      {task.clarifications.length > 0 && (
        <section className="task-clarifications">
          <h2 className="task-section-title">Klarifikasi</h2>
          <ul className="clarification-list">
            {task.clarifications.map((c) => (
              <li key={c.id} className="clarification-item">
                <p className="clarification-question">❓ {c.question}</p>
                <p className="clarification-answer">{c.answer}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="task-back">
        <Link href="/" className="btn btn-ghost btn-sm">← Kembali</Link>
      </div>
    </main>
  );
}

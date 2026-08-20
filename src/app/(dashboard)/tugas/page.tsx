// P4.AI — Student task list (STASK entry point, §7.7).
// Server component: fetches tasks sorted by deadline, renders links to detail.
// P2-FE-4 covers the full task list; this is the student-facing list view.
// ponytail: minimal list; upgrade with filters/search when P2-FE-4 lands.

import Link from "next/link";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { computeEffectiveStatus } from "@/services/overdue";
import ProgressBadge, { type EffectiveStatus } from "@/components/task/ProgressBadge";

export const dynamic = "force-dynamic";

export default async function TaskListPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <main className="page">
        <div className="alert" role="alert">Silakan login terlebih dahulu.</div>
      </main>
    );
  }

  const [tasks, progressRows] = await Promise.all([
    prisma.assignment.findMany({ orderBy: { deadline: "asc" } }),
    prisma.assignmentProgress.findMany({ where: { userId } }),
  ]);

  const progressByTask = new Map(progressRows.map((p) => [p.assignmentId, p]));
  const now = new Date();

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Tugas Saya</h1>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">Belum ada tugas.</div>
      ) : (
        <ul className="task-list-items">
          {tasks.map((task) => {
            const progress = progressByTask.get(task.id);
            const status = progress?.status ?? "TODO";
            const deadline = new Date(task.deadline);
            const effectiveStatus: EffectiveStatus = computeEffectiveStatus(status, deadline, now);

            return (
              <li key={task.id}>
                <Link href={`/tugas/${task.id}`} className="task-list-item">
                  <div className="task-list-item-main">
                    <span className="task-list-item-title">{task.title}</span>
                    <span className="task-list-item-subject">{task.subject}</span>
                  </div>
                  <div className="task-list-item-side">
                    <ProgressBadge status={effectiveStatus} />
                    <span className="task-list-item-deadline">
                      {deadline.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "Asia/Jakarta" })}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

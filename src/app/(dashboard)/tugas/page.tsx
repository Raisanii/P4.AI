// P4.AI — /tugas page (TASK-04, TASK-10).
// Server component: fetches all tasks sorted by deadline ascending (TASK-04).
// Overdue tasks (deadline passed) are highlighted by TaskCard (TASK-10).
// Secretary/Admin see a "create" button (TASK-01). Students see read-only list.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { getAllTasks } from "@/services/task";
import TaskCard from "@/components/task/TaskCard";
import type { Role } from "@/lib/roles";

export const dynamic = "force-dynamic";

const CAN_EDIT: Role[] = ["SUPER_ADMIN", "SECRETARY"];

export default async function TugasPage() {
  const tasks = await getAllTasks();

  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role ? CAN_EDIT.includes(role) : false;

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Tugas</h1>
        {canEdit && (
          <Link href="/tugas/new" className="btn btn-primary btn-sm">
            + Tambah Tugas
          </Link>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">Belum ada tugas.</div>
      ) : (
        <div className="task-cards">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={{
                id: t.id,
                title: t.title,
                subject: t.subject,
                deadline: t.deadline,
                type: t.type,
                _count: { progress: t._count.progress },
              }}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </main>
  );
}

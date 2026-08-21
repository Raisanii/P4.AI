// P4.AI — /tugas/[id] page (TASK-11, TASK-12).
// Server component: fetches task detail. Secretary/Admin can edit/delete via
// TaskForm (client). Students see read-only detail with clarifications.

import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTaskById } from "@/services/task";
import TaskForm from "@/components/task/TaskForm";
import TaskDetailClient from "@/components/task/TaskDetailClient";
import type { Role } from "@/lib/roles";

export const dynamic = "force-dynamic";

const CAN_EDIT: Role[] = ["SUPER_ADMIN", "SECRETARY"];

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) notFound();

  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role ? CAN_EDIT.includes(role) : false;

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">{task.title}</h1>
        <Link href="/tugas" className="btn btn-ghost btn-sm">
          ← Kembali
        </Link>
      </div>

      <TaskDetailClient task={task} canEdit={canEdit} />
    </main>
  );
}

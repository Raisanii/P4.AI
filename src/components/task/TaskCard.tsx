// P4.AI — TaskCard (TASK-04, TASK-10).
// Client component: single task card in the task list. Shows title, subject,
// deadline, type badge. Overdue tasks (deadline passed) get danger styling.
//
// Students see read-only; secretary/admin get edit/delete buttons from parent.

import Link from "next/link";

export type TaskListItem = {
  id: string;
  title: string;
  subject: string;
  deadline: Date | string;
  type: string;
  _count?: { progress?: number };
};

type Props = {
  task: TaskListItem;
  canEdit: boolean;
};

function formatDate(value: Date | string): string {
  const iso = typeof value === "string" ? value : value.toISOString();
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function isOverdue(value: Date | string, now: Date = new Date()): boolean {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.getTime() < now.getTime();
}

function countdownDays(value: Date | string, now: Date = new Date()): number {
  const d = typeof value === "string" ? new Date(value) : value;
  const ms = d.getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export default function TaskCard({ task, canEdit }: Props) {
  const overdue = isOverdue(task.deadline);
  const days = countdownDays(task.deadline);

  return (
    <article className={`task-card${overdue ? " task-card-overdue" : ""}`}>
      <div className="task-card-head">
        <span className="task-type-badge">{task.type}</span>
        {overdue ? (
          <span className="task-deadline-badge task-deadline-overdue">TERLAMBAT</span>
        ) : (
          <span className="task-deadline-badge">H-{days}</span>
        )}
      </div>
      <Link href={`/tugas/${task.id}`} className="task-card-title">
        {task.title}
      </Link>
      <div className="task-card-meta">
        <span>{task.subject}</span>
        <span className="task-card-deadline">{formatDate(task.deadline)}</span>
      </div>
    </article>
  );
}

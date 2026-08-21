// P4.AI — TaskDetailClient (TASK-11, TASK-12).
// Client component: shows task detail read-only, or the edit form when
// secretary/admin clicks "Edit". Includes clarifications (TASK-03) display.

"use client";

import { useState } from "react";
import TaskForm from "./TaskForm";

type Clarification = {
  id: string;
  question: string;
  answer: string;
};

type TaskDetail = {
  id: string;
  title: string;
  subject: string;
  description: string;
  deadline: Date | string;
  type: string;
  submissionFormat: string | null;
  criteria: string | null;
  reference: string | null;
  knowledgeBase: unknown;
  clarifications: Clarification[];
  _count?: { progress?: number };
  createdBy?: { id: string; name: string } | null;
};

type Props = {
  task: TaskDetail;
  canEdit: boolean;
};

function formatDate(value: Date | string): string {
  const iso = typeof value === "string" ? value : value.toISOString();
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

const FIELD_LABELS: Record<string, string> = {
  title: "Judul",
  subject: "Mapel",
  description: "Deskripsi",
  deadline: "Deadline",
  type: "Tipe",
  submissionFormat: "Format Pengumpulan",
  criteria: "Kriteria",
  reference: "Referensi",
};

export default function TaskDetailClient({ task, canEdit }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing && canEdit) {
    return (
      <TaskForm
        task={{
          id: task.id,
          title: task.title,
          subject: task.subject,
          description: task.description,
          deadline: typeof task.deadline === "string" ? task.deadline : task.deadline.toISOString(),
          type: task.type,
          submissionFormat: task.submissionFormat,
          criteria: task.criteria,
          reference: task.reference,
        }}
        onDone={() => setEditing(false)}
        onCancel={() => setEditing(false)}
      />
    );
  }

  const deadlineStr =
    typeof task.deadline === "string" ? task.deadline : task.deadline.toISOString();

  return (
    <div className="task-detail">
      <div className="task-detail-head">
        <span className="task-type-badge">{task.type}</span>
        <span className="task-card-deadline">Deadline: {formatDate(task.deadline)}</span>
      </div>

      {canEdit && (
        <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
          Edit Tugas
        </button>
      )}

      <dl className="task-detail-grid">
        <div className="task-detail-row">
          <dt>Mapel</dt>
          <dd>{task.subject}</dd>
        </div>
        <div className="task-detail-row">
          <dt>Deskripsi</dt>
          <dd>{task.description}</dd>
        </div>
        {task.submissionFormat && (
          <div className="task-detail-row">
            <dt>Format Pengumpulan</dt>
            <dd>{task.submissionFormat}</dd>
          </div>
        )}
        {task.criteria && (
          <div className="task-detail-row">
            <dt>Kriteria</dt>
            <dd>{task.criteria}</dd>
          </div>
        )}
        {task.reference && (
          <div className="task-detail-row">
            <dt>Referensi</dt>
            <dd>{task.reference}</dd>
          </div>
        )}
        {task.createdBy?.name && (
          <div className="task-detail-row">
            <dt>Dibuat oleh</dt>
            <dd>{task.createdBy.name}</dd>
          </div>
        )}
      </dl>

      {task.clarifications.length > 0 && (
        <div className="task-clarifications">
          <h2 className="task-section-title">Klarifikasi (Knowledge Base)</h2>
          <dl className="clarification-list">
            {task.clarifications.map((c) => (
              <div key={c.id} className="clarification-item">
                <dt>{c.question}</dt>
                <dd>{c.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

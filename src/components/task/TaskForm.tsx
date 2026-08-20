// P4.AI — TaskForm (TASK-12).
// Client component: edit an existing task via PUT /api/task/[id].
// Used in the task detail page. Create goes through the clarification wizard
// (/tugas/new → ClarificationWizard) so this form is edit-only.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = ["INDIVIDUAL", "GROUP"] as const;

type TaskData = {
  id: string;
  title: string;
  subject: string;
  description: string;
  deadline: string; // ISO
  type: string;
  submissionFormat?: string | null;
  criteria?: string | null;
  reference?: string | null;
};

type Props = {
  task: TaskData;
  onDone: () => void;
  onCancel: () => void;
};

export default function TaskForm({ task, onDone, onCancel }: Props) {
  const deadlineStr = task.deadline.slice(0, 10);

  const [title, setTitle] = useState(task.title);
  const [subject, setSubject] = useState(task.subject);
  const [description, setDescription] = useState(task.description);
  const [deadline, setDeadline] = useState(deadlineStr);
  const [type, setType] = useState(task.type);
  const [submissionFormat, setSubmissionFormat] = useState(task.submissionFormat ?? "");
  const [criteria, setCriteria] = useState(task.criteria ?? "");
  const [reference, setReference] = useState(task.reference ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/task/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subject,
        description,
        deadline,
        type,
        submissionFormat: submissionFormat || undefined,
        criteria: criteria || undefined,
        reference: reference || undefined,
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Gagal menyimpan");
      return;
    }
    router.refresh();
    onDone();
  }

  async function handleDelete() {
    if (!confirm("Hapus tugas ini? Tindakan tidak dapat dibatalkan.")) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/task/${task.id}`, { method: "DELETE" });
    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Gagal menghapus");
      return;
    }
    router.push("/tugas");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form" noValidate>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="form-grid">
        <div className="form-field form-field-wide">
          <label htmlFor="t-title">Judul</label>
          <input id="t-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={saving} />
        </div>
        <div className="form-field">
          <label htmlFor="t-subject">Mapel</label>
          <input id="t-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required disabled={saving} />
        </div>
        <div className="form-field">
          <label htmlFor="t-deadline">Deadline</label>
          <input id="t-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required disabled={saving} />
        </div>
        <div className="form-field">
          <label htmlFor="t-type">Tipe</label>
          <select id="t-type" value={type} onChange={(e) => setType(e.target.value)} disabled={saving}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="t-desc">Deskripsi</label>
          <textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={saving} rows={3} />
        </div>
        <div className="form-field">
          <label htmlFor="t-format">Format Pengumpulan</label>
          <input id="t-format" type="text" value={submissionFormat} onChange={(e) => setSubmissionFormat(e.target.value)} disabled={saving} placeholder="(opsional)" />
        </div>
        <div className="form-field">
          <label htmlFor="t-criteria">Kriteria</label>
          <input id="t-criteria" type="text" value={criteria} onChange={(e) => setCriteria(e.target.value)} disabled={saving} placeholder="(opsional)" />
        </div>
        <div className="form-field">
          <label htmlFor="t-reference">Referensi</label>
          <input id="t-reference" type="text" value={reference} onChange={(e) => setReference(e.target.value)} disabled={saving} placeholder="(opsional)" />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          Batal
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={handleDelete} disabled={saving}>
          Hapus
        </button>
      </div>
    </form>
  );
}

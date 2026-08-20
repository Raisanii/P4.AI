// P4.AI — MilestoneList (MILE-03/04/05).
// Client component: displays milestones with countdown, role-gated
// create/edit/delete via MilestoneForm. Calls /api/milestone for mutations.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MilestoneForm from "./MilestoneForm";

type Milestone = {
  id: string;
  title: string;
  type: string;
  date: Date | string; // Date from service, string after RSC serialization
  active: boolean;
  countdownDays: number;
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

export default function MilestoneList({
  milestones,
  canEdit,
}: {
  milestones: Milestone[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null); // null | "new" | id
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Hapus milestone ini?")) return;
    setError(null);
    const res = await fetch(`/api/milestone/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Gagal menghapus");
      return;
    }
    router.refresh();
  }

  function onSaved() {
    setEditingId(null);
    router.refresh();
  }

  const showCreateForm = editingId === "new";

  return (
    <div className="milestone-section">
      {error && <div className="alert" role="alert">{error}</div>}

      {canEdit && !showCreateForm && (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setEditingId("new"); setError(null); }}
        >
          + Tambah Milestone
        </button>
      )}

      {showCreateForm && (
        <MilestoneForm onSaved={onSaved} onCancel={() => setEditingId(null)} />
      )}

      {milestones.length === 0 && !showCreateForm && (
        <div className="empty-state">Belum ada milestone aktif.</div>
      )}

      <div className="milestone-cards">
        {milestones.map((m) => (
          <div key={m.id} className="milestone-card">
            {editingId === m.id ? (
              <MilestoneForm
                milestone={{
                  id: m.id,
                  title: m.title,
                  type: m.type,
                  date: typeof m.date === "string" ? m.date.slice(0, 10) : m.date.toISOString().slice(0, 10),
                  active: m.active,
                }}
                onSaved={onSaved}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="milestone-card-head">
                  <span className="milestone-badge">{m.type}</span>
                  <span className="countdown">H-{m.countdownDays}</span>
                </div>
                <div className="milestone-card-title">{m.title}</div>
                <div className="milestone-card-date">{formatDate(m.date)}</div>
                {canEdit && (
                  <div className="milestone-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(m.id); setError(null); }}>Edit</button>
                    <button className="btn btn-ghost btn-sm btn-danger" onClick={() => handleDelete(m.id)}>Hapus</button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

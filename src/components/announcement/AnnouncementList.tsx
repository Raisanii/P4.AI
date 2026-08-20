// P4.AI — AnnouncementList (ANN-01..06).
// Client component: displays sorted announcements with role-gated
// create/edit/delete via AnnouncementForm + AnnouncementCard.
// Calls /api/announcement for mutations; router.refresh() re-fetches.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AnnouncementCard, { type Announcement } from "./AnnouncementCard";
import AnnouncementForm from "./AnnouncementForm";

export default function AnnouncementList({
  announcements,
  canEdit,
}: {
  announcements: Announcement[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Hapus pengumuman ini?")) return;
    setError(null);
    const res = await fetch(`/api/announcement/${id}`, { method: "DELETE" });
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
    <div className="announcement-section">
      {error && <div className="alert" role="alert">{error}</div>}

      {canEdit && !showCreateForm && (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setEditingId("new"); setError(null); }}
        >
          + Tambah Pengumuman
        </button>
      )}

      {showCreateForm && (
        <AnnouncementForm onSaved={onSaved} onCancel={() => setEditingId(null)} />
      )}

      {announcements.length === 0 && !showCreateForm && (
        <div className="empty-state">Belum ada pengumuman aktif.</div>
      )}

      <div className="announcement-cards">
        {announcements.map((a) => (
          <div key={a.id}>
            {editingId === a.id ? (
              <AnnouncementForm
                announcement={{
                  id: a.id,
                  title: a.title,
                  content: a.content,
                  priority: a.priority,
                  expiresAt: a.expiresAt ?? null,
                }}
                onSaved={onSaved}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <AnnouncementCard
                announcement={a}
                canEdit={canEdit}
                onEdit={(id) => { setEditingId(id); setError(null); }}
                onDelete={handleDelete}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// P4.AI — AnnouncementForm (ANN-01/02/04).
// Client component: create or edit an announcement via POST/PUT /api/announcement.
// Priority select: URGENT | PENTING | NORMAL (ANN-02). Optional expiry (ANN-04).

"use client";

import { useState } from "react";

const PRIORITIES = ["URGENT", "PENTING", "NORMAL"] as const;
const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "URGEN",
  PENTING: "PENTING",
  NORMAL: "NORMAL",
};

type Props = {
  announcement?: {
    id: string;
    title: string;
    content: string;
    priority: string;
    expiresAt?: Date | string | null;
  } | null;
  onSaved: () => void;
  onCancel: () => void;
};

export default function AnnouncementForm({ announcement, onSaved, onCancel }: Props) {
  // expiresAt from server is a Date/string — extract YYYY-MM-DD for datetime-local.
  const expiryStr = announcement?.expiresAt
    ? new Date(typeof announcement.expiresAt === "string" ? announcement.expiresAt : announcement.expiresAt.toISOString())
        .toISOString()
        .slice(0, 16)
    : "";

  const [title, setTitle] = useState(announcement?.title ?? "");
  const [content, setContent] = useState(announcement?.content ?? "");
  const [priority, setPriority] = useState(announcement?.priority ?? "NORMAL");
  const [expiresAt, setExpiresAt] = useState(expiryStr);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = announcement ? `/api/announcement/${announcement.id}` : "/api/announcement";
    const method = announcement ? "PUT" : "POST";
    const body: Record<string, unknown> = { title, content, priority };
    if (expiresAt) {
      body.expiresAt = new Date(expiresAt).toISOString();
    } else if (announcement) {
      // Editing: clear expiry if previously set.
      body.expiresAt = null;
    }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Gagal menyimpan");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="inline-form" noValidate>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="form-grid">
        <div className="form-field form-field-wide">
          <label htmlFor="a-title">Judul</label>
          <input id="a-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={saving} placeholder="Pengumuman penting..." />
        </div>
        <div className="form-field form-field-wide">
          <label htmlFor="a-content">Isi Pengumuman</label>
          <textarea id="a-content" value={content} onChange={(e) => setContent(e.target.value)} required disabled={saving} rows={4} placeholder="Tulis pengumuman di sini..." className="form-textarea" />
        </div>
        <div className="form-field">
          <label htmlFor="a-priority">Prioritas</label>
          <select id="a-priority" value={priority} onChange={(e) => setPriority(e.target.value)} disabled={saving}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="a-expires">Kedaluwarsa (opsional)</label>
          <input id="a-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} disabled={saving} />
        </div>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel} disabled={saving}>
          Batal
        </button>
      </div>
    </form>
  );
}

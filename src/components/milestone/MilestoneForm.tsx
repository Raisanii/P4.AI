// P4.AI — MilestoneForm (MILE-01/02).
// Client component: create or edit a milestone via POST/PUT /api/milestone.

"use client";

import { useState } from "react";

const TYPES = ["PTS", "PAS", "PRAKERIN", "UJIAN", "LIBUR", "OTHER"] as const;

type Props = {
  milestone?: {
    id: string;
    title: string;
    type: string;
    date: string; // ISO or YYYY-MM-DD
    active: boolean;
  } | null;
  onSaved: () => void;
  onCancel: () => void;
};

export default function MilestoneForm({ milestone, onSaved, onCancel }: Props) {
  const dateStr = milestone?.date ? milestone.date.slice(0, 10) : "";

  const [title, setTitle] = useState(milestone?.title ?? "");
  const [type, setType] = useState(milestone?.type ?? "PTS");
  const [date, setDate] = useState(dateStr);
  const [active, setActive] = useState(milestone?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = milestone ? `/api/milestone/${milestone.id}` : "/api/milestone";
    const method = milestone ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, type, date, active }),
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
          <label htmlFor="m-title">Judul</label>
          <input id="m-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={saving} placeholder="PTS Genap 2026" />
        </div>
        <div className="form-field">
          <label htmlFor="m-type">Tipe</label>
          <select id="m-type" value={type} onChange={(e) => setType(e.target.value)} disabled={saving}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="m-date">Tanggal</label>
          <input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required disabled={saving} />
        </div>
        <div className="form-field">
          <label className="checkbox-label">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} disabled={saving} />
            Aktif
          </label>
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

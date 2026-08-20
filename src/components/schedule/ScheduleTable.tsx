// P4.AI — ScheduleTable (SCHD-03/04/06).
// Client component: displays today's or weekly schedule with role-gated
// create/edit/delete. Calls /api/schedule for mutations; router.refresh()
// re-fetches server-component data after each save.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ScheduleEntry = {
  id: string;
  dayOfWeek: string;
  weekType: "A" | "B" | null;
  subject: string;
  teacher: string | null;
  startTime: string;
  endTime: string;
  room: string | null;
};

const DAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

const DAY_LABELS: Record<string, string> = {
  sunday: "Minggu", monday: "Senin", tuesday: "Selasa", wednesday: "Rabu",
  thursday: "Kamis", friday: "Jumat", saturday: "Sabtu",
};

/** Group weekly entries by day, ordered by day-of-week. */
function groupByDay(entries: ScheduleEntry[]): [string, ScheduleEntry[]][] {
  const map = new Map<string, ScheduleEntry[]>();
  for (const e of entries) {
    const list = map.get(e.dayOfWeek) ?? [];
    list.push(e);
    map.set(e.dayOfWeek, list);
  }
  return DAYS
    .filter((d) => map.has(d))
    .map((d) => [d, map.get(d)!] as [string, ScheduleEntry[]]);
}

export default function ScheduleTable({
  entries,
  canEdit,
  mode,
}: {
  entries: ScheduleEntry[];
  canEdit: boolean;
  mode: "today" | "weekly";
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null); // null | "new" | entry.id
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Hapus jadwal ini?")) return;
    setError(null);
    const res = await fetch(`/api/schedule/${id}`, { method: "DELETE" });
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
  const groups = mode === "weekly" ? groupByDay(entries) : null;

  return (
    <div className="schedule-section">
      {error && <div className="alert" role="alert">{error}</div>}

      {canEdit && !showCreateForm && (
        <button
          className="btn btn-primary btn-sm"
          onClick={() => { setEditingId("new"); setError(null); }}
        >
          + Tambah Jadwal
        </button>
      )}

      {showCreateForm && (
        <ScheduleForm
          onSaved={onSaved}
          onCancel={() => setEditingId(null)}
        />
      )}

      {entries.length === 0 && !showCreateForm && (
        <div className="empty-state">Tidak ada jadwal{mode === "today" ? " hari ini" : ""}.</div>
      )}

      {entries.length > 0 && (
        <div className="table-wrap">
          <table className="schedule-table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Mapel</th>
                <th>Guru</th>
                <th>Ruang</th>
                {mode === "weekly" && <th>Pekan</th>}
                {canEdit && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {groups ? (
                groups.map(([day, dayEntries]) => (
                  <DayGroup
                    key={day}
                    day={day}
                    entries={dayEntries}
                    canEdit={canEdit}
                    mode={mode}
                    editingId={editingId}
                    onEdit={setEditingId}
                    onDelete={handleDelete}
                    onSaved={onSaved}
                    onCancel={() => setEditingId(null)}
                  />
                ))
              ) : (
                entries.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    canEdit={canEdit}
                    mode={mode}
                    isEditing={editingId === e.id}
                    onEdit={() => { setEditingId(e.id); setError(null); }}
                    onDelete={() => handleDelete(e.id)}
                    onSaved={onSaved}
                    onCancel={() => setEditingId(null)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DayGroup({
  day,
  entries,
  canEdit,
  mode,
  editingId,
  onEdit,
  onDelete,
  onSaved,
  onCancel,
}: {
  day: string;
  entries: ScheduleEntry[];
  canEdit: boolean;
  mode: "today" | "weekly";
  editingId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <tr className="schedule-day-header">
        <td colSpan={canEdit ? 6 : 5}>{DAY_LABELS[day] ?? day}</td>
      </tr>
      {entries.map((e) => (
        <EntryRow
          key={e.id}
          entry={e}
          canEdit={canEdit}
          mode={mode}
          isEditing={editingId === e.id}
          onEdit={() => onEdit(e.id)}
          onDelete={() => onDelete(e.id)}
          onSaved={onSaved}
          onCancel={onCancel}
        />
      ))}
    </>
  );
}

function EntryRow({
  entry,
  canEdit,
  mode,
  isEditing,
  onEdit,
  onDelete,
  onSaved,
  onCancel,
}: {
  entry: ScheduleEntry;
  canEdit: boolean;
  mode: "today" | "weekly";
  isEditing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  if (isEditing) {
    return (
      <tr>
        <td colSpan={canEdit ? 6 : 5}>
          <ScheduleForm
            entry={entry}
            onSaved={onSaved}
            onCancel={onCancel}
          />
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="schedule-time-cell">
        {entry.startTime}–{entry.endTime}
      </td>
      <td>{entry.subject}</td>
      <td>{entry.teacher || "—"}</td>
      <td>{entry.room || "—"}</td>
      {mode === "weekly" && (
        <td>{entry.weekType ? `Pekan ${entry.weekType}` : "Setiap Pekan"}</td>
      )}
      {canEdit && (
        <td className="row-actions">
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>Edit</button>
          <button className="btn btn-ghost btn-sm btn-danger" onClick={onDelete}>Hapus</button>
        </td>
      )}
    </tr>
  );
}

// --- Internal form (create or edit) ---

function ScheduleForm({
  entry,
  onSaved,
  onCancel,
}: {
  entry?: ScheduleEntry;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [dayOfWeek, setDayOfWeek] = useState(entry?.dayOfWeek ?? "monday");
  const [weekType, setWeekType] = useState(entry?.weekType ?? "");
  const [subject, setSubject] = useState(entry?.subject ?? "");
  const [teacher, setTeacher] = useState(entry?.teacher ?? "");
  const [startTime, setStartTime] = useState(entry?.startTime ?? "");
  const [endTime, setEndTime] = useState(entry?.endTime ?? "");
  const [room, setRoom] = useState(entry?.room ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const url = entry ? `/api/schedule/${entry.id}` : "/api/schedule";
    const method = entry ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dayOfWeek,
        weekType: weekType || null,
        subject,
        teacher: teacher || undefined,
        startTime,
        endTime,
        room: room || undefined,
      }),
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
        <div className="form-field">
          <label htmlFor="s-day">Hari</label>
          <select id="s-day" value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value)} disabled={saving}>
            {DAYS.map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="s-week">Pekan</label>
          <select id="s-week" value={weekType} onChange={(e) => setWeekType(e.target.value)} disabled={saving}>
            <option value="">Setiap Pekan</option>
            <option value="A">Pekan A</option>
            <option value="B">Pekan B</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="s-subject">Mapel</label>
          <input id="s-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} required disabled={saving} placeholder="Matematika" />
        </div>
        <div className="form-field">
          <label htmlFor="s-teacher">Guru</label>
          <input id="s-teacher" type="text" value={teacher} onChange={(e) => setTeacher(e.target.value)} disabled={saving} placeholder="(opsional)" />
        </div>
        <div className="form-field">
          <label htmlFor="s-start">Mulai</label>
          <input id="s-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required disabled={saving} />
        </div>
        <div className="form-field">
          <label htmlFor="s-end">Selesai</label>
          <input id="s-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required disabled={saving} />
        </div>
        <div className="form-field">
          <label htmlFor="s-room">Ruang</label>
          <input id="s-room" type="text" value={room} onChange={(e) => setRoom(e.target.value)} disabled={saving} placeholder="(opsional)" />
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

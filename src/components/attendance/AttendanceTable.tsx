// P4.AI — AttendanceTable (ATT-01, ATT-02, ATT-03, ATT-05, ATT-08).
// Client component: per-student status selector with notes.
// POST /api/attendance with { date, entries: [{ userId, status, notes }] }.
// Default HADIR pre-selected (ATT-03). Mobile-first: card list on small
// screens, table on ≥40rem.

"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";

export type AttendanceStatus = "HADIR" | "SAKIT" | "IZIN" | "ALFA";

export type StudentRow = {
  userId: string;
  name: string;
  nis: string;
};

export type ExistingRecord = {
  userId: string;
  status: AttendanceStatus;
  notes: string | null;
};

type Props = {
  students: StudentRow[];
  existing?: ExistingRecord[];
  date: string; // YYYY-MM-DD
};

const STATUSES: AttendanceStatus[] = ["HADIR", "SAKIT", "IZIN", "ALFA"];

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  HADIR: "Hadir",
  SAKIT: "Sakit",
  IZIN: "Izin",
  ALFA: "Alfa",
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  HADIR: "att-pill-hadir",
  SAKIT: "att-pill-sakit",
  IZIN: "att-pill-izin",
  ALFA: "att-pill-alfa",
};

/** Build initial entry map from existing records, default HADIR (ATT-03). */
function buildInitial(
  students: StudentRow[],
  existing?: ExistingRecord[],
): Map<string, { status: AttendanceStatus; notes: string }> {
  const existingMap = new Map<string, ExistingRecord>();
  for (const r of existing ?? []) {
    existingMap.set(r.userId, r);
  }

  const map = new Map<string, { status: AttendanceStatus; notes: string }>();
  for (const s of students) {
    const rec = existingMap.get(s.userId);
    map.set(s.userId, {
      status: rec?.status ?? "HADIR",
      notes: rec?.notes ?? "",
    });
  }
  return map;
}

export default function AttendanceTable({ students, existing, date }: Props) {
  const router = useRouter();
  const [entries, setEntries] = useState(() => buildInitial(students, existing));
  const [showNotes, setShowNotes] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function setStatus(userId: string, status: AttendanceStatus) {
    setEntries((prev) => {
      const next = new Map(prev);
      const cur = next.get(userId)!;
      next.set(userId, { ...cur, status });
      return next;
    });
  }

  function setNotes(userId: string, notes: string) {
    setEntries((prev) => {
      const next = new Map(prev);
      const cur = next.get(userId)!;
      next.set(userId, { ...cur, notes });
      return next;
    });
  }

  function toggleNotes(userId: string) {
    setShowNotes((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const payload = {
      date,
      entries: students.map((s) => {
        const entry = entries.get(s.userId)!;
      return {
        userId: s.userId,
        status: entry.status,
        notes: entry.notes.trim() || undefined,
      };
      }),
    };

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Gagal menyimpan absensi");
        return;
      }
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  // Live recap counts for the current edit state.
  const recap = useMemo(() => {
    const counts = { HADIR: 0, SAKIT: 0, IZIN: 0, ALFA: 0 };
    for (const s of students) {
      const entry = entries.get(s.userId);
      if (entry) counts[entry.status] += 1;
    }
    return counts;
  }, [entries, students]);

  return (
    <form onSubmit={handleSubmit} className="att-form" noValidate>
      {error && <div className="alert" role="alert">{error}</div>}
      {success && (
        <div className="alert alert-success" role="status">
          Absensi tersimpan.
        </div>
      )}

      <div className="att-recap-bar" aria-label="Rekap sementara">
        <span className="att-recap-item">
          <span className={`att-pill att-pill-hadir`} /> Hadir {recap.HADIR}/{students.length}
        </span>
        <span className="att-recap-item">
          <span className={`att-pill att-pill-sakit`} /> Sakit {recap.SAKIT}
        </span>
        <span className="att-recap-item">
          <span className={`att-pill att-pill-izin`} /> Izin {recap.IZIN}
        </span>
        <span className="att-recap-item">
          <span className={`att-pill att-pill-alfa`} /> Alfa {recap.ALFA}
        </span>
      </div>

      {/* Mobile: card list (<40rem) */}
      <div className="att-cards" role="list">
        {students.map((s) => {
          const entry = entries.get(s.userId)!;
          const showNote = showNotes.has(s.userId);
          return (
            <div key={s.userId} className="att-card" role="listitem">
              <div className="att-card-head">
                <span className="att-student-name">{s.name}</span>
                <span className="att-student-nis">{s.nis}</span>
              </div>
              <div className="att-status-row" role="radiogroup" aria-label={`Status ${s.name}`}>
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    role="radio"
                    aria-checked={entry.status === st}
                    className={`att-toggle ${STATUS_COLORS[st]} ${entry.status === st ? "active" : ""}`}
                    onClick={() => setStatus(s.userId, st)}
                    disabled={saving}
                  >
                    {STATUS_LABELS[st]}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm att-notes-toggle"
                onClick={() => toggleNotes(s.userId)}
                disabled={saving}
              >
                {showNote ? "Sembunyikan catatan" : "Catatan"}
              </button>
              {showNote && (
                <input
                  type="text"
                  className="att-notes-input"
                  placeholder="Catatan (opsional)"
                  value={entry.notes}
                  onChange={(e) => setNotes(s.userId, e.target.value)}
                  disabled={saving}
                  aria-label={`Catatan untuk ${s.name}`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop: table (≥40rem) */}
      <div className="att-table-wrap">
        <table className="att-table">
          <thead>
            <tr>
              <th scope="col">Nama</th>
              <th scope="col">NIS</th>
              <th scope="col">Status</th>
              <th scope="col">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => {
              const entry = entries.get(s.userId)!;
              return (
                <tr key={s.userId}>
                  <td className="att-student-name">{s.name}</td>
                  <td className="att-student-nis">{s.nis}</td>
                  <td>
                    <div className="att-status-row" role="radiogroup" aria-label={`Status ${s.name}`}>
                      {STATUSES.map((st) => (
                        <button
                          key={st}
                          type="button"
                          role="radio"
                          aria-checked={entry.status === st}
                          className={`att-toggle ${STATUS_COLORS[st]} ${entry.status === st ? "active" : ""}`}
                          onClick={() => setStatus(s.userId, st)}
                          disabled={saving}
                        >
                          {STATUS_LABELS[st]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="att-notes-input"
                      placeholder="—"
                      value={entry.notes}
                      onChange={(e) => setNotes(s.userId, e.target.value)}
                      disabled={saving}
                      aria-label={`Catatan untuk ${s.name}`}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="form-actions att-actions">
        <button type="submit" className="btn btn-primary" disabled={saving || students.length === 0}>
          {saving ? "Menyimpan..." : "Simpan Absensi"}
        </button>
      </div>
    </form>
  );
}

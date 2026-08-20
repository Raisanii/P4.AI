// P4.AI — TaskActionPanel: state-dependent START/COMPLETE buttons (STASK, §7.7).
// Calls POST /api/task/[id]/start and /api/task/[id]/complete.
// Forbidden transitions disabled in UI AND blocked by backend (TASK-08).
// Source of truth: backend state machine (src/services/state-machine.ts).
// Duration computed client-side from startedAt/completedAt per issue notes.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProgressBadge, { type EffectiveStatus } from "./ProgressBadge";

export type TaskProgress = {
  id: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  startedAt: string | null;
  completedAt: string | null;
  startedSource: string | null;
  completedSource: string | null;
};

type Props = {
  taskId: string;
  progress: TaskProgress | null;
  /** Computed effective status (may include OVERDUE). */
  effectiveStatus: EffectiveStatus;
  startedAt: string | null;
  completedAt: string | null;
};

function formatDateTime(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return "";
  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (diffMs < 0) return "";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} jam ${minutes} menit`;
}

export default function TaskActionPanel({
  taskId,
  effectiveStatus,
  startedAt,
  completedAt,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = effectiveStatus;

  async function handleAction(action: "start" | "complete") {
    setError(null);
    setLoading(true);
    const res = await fetch(`/api/task/${taskId}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setLoading(false);

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || `Gagal ${action === "start" ? "memulai" : "menyelesaikan"} tugas`);
      return;
    }

    router.refresh();
  }

  // Disable START unless TODO (forward-only: §7.5.1).
  const canStart = status === "TODO" || status === "OVERDUE";
  // Disable COMPLETE unless IN_PROGRESS (forward-only: §7.5.1).
  // OVERDUE on IN_PROGRESS still allows COMPLETE.
  const canComplete = status === "IN_PROGRESS" || (status === "OVERDUE" && startedAt);

  return (
    <div className="task-action-panel">
      <div className="task-status-row">
        <span className="task-status-label">Status:</span>
        <ProgressBadge status={status} />
      </div>

      {startedAt && (
        <p className="task-timestamp">
          Started: {formatDateTime(startedAt)}
        </p>
      )}

      {completedAt && (
        <>
          <p className="task-timestamp">
            Selesai: {formatDateTime(completedAt)}
          </p>
          <p className="task-duration">
            Waktu pengerjaan: {formatDuration(startedAt, completedAt)}
          </p>
        </>
      )}

      {error && <div className="alert" role="alert">{error}</div>}

      <div className="task-action-buttons">
        {canStart && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleAction("start")}
            disabled={loading}
          >
            {loading ? "..." : "[ MULAI MENGERJAKAN ]"}
          </button>
        )}

        {canComplete && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => handleAction("complete")}
            disabled={loading}
          >
            {loading ? "..." : "[ SELESAIKAN TUGAS ]"}
          </button>
        )}

        {status === "DONE" && (
          <p className="task-done-message">Tugas telah diselesaikan.</p>
        )}
      </div>
    </div>
  );
}

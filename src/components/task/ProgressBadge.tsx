// P4.AI — ProgressBadge: TODO/IN_PROGRESS/DONE/OVERDUE status badge (STASK, §7.7).
// ponytail: CSS classes in globals.css; upgrade to shadcn Badge when available.

export type ProgressStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type EffectiveStatus = ProgressStatus | "OVERDUE";

const STATUS_CONFIG: Record<
  EffectiveStatus,
  { label: string; className: string }
> = {
  TODO: { label: "⚪ TODO", className: "badge-todo" },
  IN_PROGRESS: { label: "🟡 IN PROGRESS", className: "badge-in-progress" },
  DONE: { label: "✅ DONE", className: "badge-done" },
  OVERDUE: { label: "🔴 OVERDUE", className: "badge-overdue" },
};

export default function ProgressBadge({ status }: { status: EffectiveStatus }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.TODO;
  return (
    <span className={`progress-badge ${config.className}`}>{config.label}</span>
  );
}

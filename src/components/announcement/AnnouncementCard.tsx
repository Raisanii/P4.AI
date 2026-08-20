// P4.AI — AnnouncementCard (ANN-01..06).
// Client component: displays a single announcement with priority styling.
// Role-gated edit/delete buttons trigger parent callbacks.

const PRIORITY_STYLE: Record<string, string> = {
  URGENT: "announcement-priority-urgent",
  PENTING: "announcement-priority-penting",
  NORMAL: "announcement-priority-normal",
};

const PRIORITY_LABEL: Record<string, string> = {
  URGENT: "URGEN",
  PENTING: "PENTING",
  NORMAL: "NORMAL",
};

const PRIORITY_BADGE: Record<string, string> = {
  URGENT: "priority-badge-urgent",
  PENTING: "priority-badge-penting",
  NORMAL: "priority-badge-normal",
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  priority: "URGENT" | "PENTING" | "NORMAL";
  expiresAt?: Date | string | null;
  author?: { id: string; name: string } | null;
  createdAt?: Date | string;
};

type Props = {
  announcement: Announcement;
  canEdit: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

function formatDate(value: Date | string | undefined): string {
  if (!value) return "";
  const iso = typeof value === "string" ? value : value.toISOString();
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

export default function AnnouncementCard({ announcement, canEdit, onEdit, onDelete }: Props) {
  const a = announcement;
  return (
    <article className={`announcement-card ${PRIORITY_STYLE[a.priority]}`}>
      <div className="announcement-card-head">
        <span className={`priority-badge ${PRIORITY_BADGE[a.priority]}`}>
          {PRIORITY_LABEL[a.priority] ?? a.priority}
        </span>
        {a.createdAt && (
          <span className="announcement-date">{formatDate(a.createdAt)}</span>
        )}
      </div>
      <h3 className="announcement-title">{a.title}</h3>
      <p className="announcement-content">{a.content}</p>
      {a.author && (
        <span className="announcement-author">— {a.author.name}</span>
      )}
      {canEdit && (
        <div className="announcement-card-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onEdit(a.id)}>Edit</button>
          <button className="btn btn-ghost btn-sm btn-danger" onClick={() => onDelete(a.id)}>Hapus</button>
        </div>
      )}
    </article>
  );
}

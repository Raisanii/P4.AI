// P4.AI — Announcement banner slot (DASH-02).
// Wired to announcement service via the dashboard server component.
// Shows top URGENT announcement with priority styling (ANN-06).

export type Announcement = {
 id: string;
 title: string;
 content: string;
 priority: "URGENT" | "PENTING" | "NORMAL";
 expiresAt?: Date | null;
};

type Props = {
 /** When null, renders the labeled empty-state. */
 announcements?: Announcement[] | null;
};

const PRIORITY_STYLE: Record<Announcement["priority"], string> = {
 URGENT: "banner-urgent",
 PENTING: "banner-penting",
 NORMAL: "banner-normal",
};

const PRIORITY_LABEL: Record<Announcement["priority"], string> = {
 URGENT: "URGEN",
 PENTING: "PENTING",
 NORMAL: "NORMAL",
};

export default function AnnouncementBanner({ announcements }: Props) {
 const items = announcements ?? [];
 if (items.length === 0) {
 return (
 <WidgetShell label="📢 Pengumuman" spec="DASH-02">
 Belum ada pengumuman aktif.
 </WidgetShell>
 );
 }
 return (
 <section className="widget" aria-label="Pengumuman">
 <h2 className="widget-label">📢 Pengumuman</h2>
 {items.slice(0, 3).map((a) => (
 <article key={a.id} className={`banner ${PRIORITY_STYLE[a.priority]}`}>
 <span className="banner-priority">{PRIORITY_LABEL[a.priority]}</span>
 <span className="banner-title">{a.title}</span>
 </article>
 ))}
 </section>
 );
}

// Shared empty-state shell — used by every placeholder widget below.
export function WidgetShell({
  label,
  spec,
  children,
}: {
  label: string;
  spec: string;
  children: React.ReactNode;
}) {
  return (
    <section className="widget widget-empty" aria-label={label}>
      <h2 className="widget-label">{label}</h2>
      <p className="widget-empty-text">{children}</p>
      <span className="widget-spec">{spec}</span>
    </section>
  );
}

// P4.AI — Milestone countdown slot (DASH-03).
// ponytail: empty-state placeholder; Phase 2 wires `GET /api/milestones`.

export type Milestone = {
  id: string;
  title: string;
  type: "PTS" | "PAS" | "PRAKERIN" | "UJIAN" | "LIBUR" | "OTHER";
  date: Date | string;
  active?: boolean;
};

import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  milestones?: Milestone[] | null;
};

export default function MilestoneCountdown({ milestones }: Props) {
  const items = milestones ?? [];
  if (items.length === 0) {
    return (
      <WidgetShell label="⏰ Countdown Milestone" spec="DASH-03">
        Belum ada milestone aktif.
      </WidgetShell>
    );
  }
  return (
    <section className="widget" aria-label="Milestone">
      <h2 className="widget-label">⏰ Countdown Milestone</h2>
      <ul className="milestone-list">
        {items.map((m) => (
          <li key={m.id}>
            <span className="milestone-type">{m.type}</span>
            <span className="milestone-title">{m.title}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

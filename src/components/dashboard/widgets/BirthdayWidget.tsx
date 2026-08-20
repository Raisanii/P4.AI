// P4.AI — Birthday widget slot (DASH-04).
// ponytail: empty-state placeholder; Phase 2 wires birthday query.

export type Birthday = {
  id: string;
  name: string;
  birthday: Date | string;
};

import { WidgetShell } from "./AnnouncementBanner";

type Props = {
  birthdays?: Birthday[] | null;
};

export default function BirthdayWidget({ birthdays }: Props) {
  const items = birthdays ?? [];
  if (items.length === 0) {
    return (
      <WidgetShell label="🎉 Ulang Tahun" spec="DASH-04">
        Tidak ada ulang tahun bulan ini.
      </WidgetShell>
    );
  }
  return (
    <section className="widget" aria-label="Ulang Tahun">
      <h2 className="widget-label">🎉 Ulang Tahun</h2>
      <ul className="birthday-list">
        {items.map((b) => (
          <li key={b.id}>{b.name}</li>
        ))}
      </ul>
    </section>
  );
}

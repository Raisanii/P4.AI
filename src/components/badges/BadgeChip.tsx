// P4.AI — BadgeChip: single badge card (PRD §7.16).
// Positive, encouraging tone — never shaming. Shows emoji + name + description.
// `earned` toggles the visual state: earned badges are highlighted; locked
// badges are muted but still fully described so students know what to aim for.

import type { Badge } from "@/lib/badges";

type Props = {
  badge: Badge;
  earned?: boolean;
};

export default function BadgeChip({ badge, earned = false }: Props) {
  return (
    <article
      className={`badge-chip${earned ? " badge-earned" : ""}`}
      aria-label={`${badge.emoji} ${badge.name}`}
    >
      <span className="badge-emoji" aria-hidden="true">{badge.emoji}</span>
      <span className="badge-name">{badge.name}</span>
      <span className="badge-desc">{badge.description}</span>
    </article>
  );
}

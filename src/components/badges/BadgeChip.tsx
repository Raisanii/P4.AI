// P4.AI — BadgeChip (P6-FE-1).
//
// Renders a single badge in the catalog or student view. Always positive —
// locked (unearned) badges show a muted style with the emoji greyed out, but
// the name and description stay visible so students know what to aim for.
// No shaming language anywhere (§7.16).

import type { CSSProperties } from "react";
import type { Badge } from "@/types/badges";

interface BadgeChipProps {
  badge: Badge;
  earned?: boolean;
}

const container: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  padding: "0.75rem 0.5rem",
  borderRadius: "0.75rem",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  minWidth: 0, // allow grid to shrink in mobile
};

const containerEarned: CSSProperties = {
  ...container,
  background: "linear-gradient(135deg, #fef3c7, #fde68a)",
  borderColor: "#f59e0b",
};

const emoji: CSSProperties = {
  fontSize: "2rem",
  lineHeight: 1,
  marginBottom: "0.25rem",
};

const emojiLocked: CSSProperties = {
  ...emoji,
  filter: "grayscale(1) opacity(0.5)",
};

const name: CSSProperties = {
  fontSize: "0.8rem",
  fontWeight: 600,
  color: "#1e293b",
  margin: 0,
};

const desc: CSSProperties = {
  fontSize: "0.7rem",
  color: "#64748b",
  margin: "0.25rem 0 0",
  lineHeight: 1.3,
};

export function BadgeChip({ badge, earned = false }: BadgeChipProps) {
  return (
    <div style={earned ? containerEarned : container} role="listitem">
      <span style={earned ? emoji : emojiLocked} aria-hidden="true">
        {badge.emoji}
      </span>
      <p style={name}>{badge.name}</p>
      <p style={desc}>{badge.description}</p>
      {earned && (
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "#b45309",
            marginTop: "0.25rem",
          }}
          aria-label="Badge didapatkan"
        >
          ✓ Didapat
        </span>
      )}
    </div>
  );
}

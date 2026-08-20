"use client";

// P4.AI — BadgeGrid (P6-FE-1).
//
// Renders the badge catalog as a mobile-first responsive grid. Handles
// loading skeleton, error with retry, and a friendly empty state (§7.16).
// Used in a full catalog page; the dashboard uses BadgesWidget instead.

import type { CSSProperties } from "react";
import { useBadges } from "@/hooks/useBadges";
import { BadgeChip } from "./BadgeChip";

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "0.5rem",
  width: "100%",
};

// ponytail: 2-col on mobile, auto-fill from 768px. Add media queries when a
// CSS file / globals.css is introduced by P6-FE-2 — inline styles can't do
// breakpoints without a <style> tag.

const skeletonItem: CSSProperties = {
  height: "7rem",
  borderRadius: "0.75rem",
  background: "#f1f5f9",
};

const errorBox: CSSProperties = {
  textAlign: "center",
  padding: "1.5rem",
  color: "#64748b",
};

const retryButton: CSSProperties = {
  marginTop: "0.5rem",
  padding: "0.4rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.8rem",
  color: "#334155",
};

export function BadgeGrid() {
  const { badges, status, error, retry } = useBadges();

  if (status === "loading") {
    return (
      <div style={grid} aria-busy="true" aria-label="Memuat badge">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={skeletonItem} />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={errorBox} role="alert">
        <p style={{ margin: "0 0 0.5rem" }}>
          😔 {error ?? "Gagal memuat badge"}
        </p>
        <button style={retryButton} onClick={() => void retry()}>
          Coba lagi
        </button>
      </div>
    );
  }

  if (badges.length === 0) {
    return (
      <div style={errorBox}>
        <p style={{ margin: 0 }}>Belum ada badge — terus semangat! 🌟</p>
      </div>
    );
  }

  return (
    <div style={grid} role="list" aria-label="Daftar badge">
      {badges.map((badge) => (
        <BadgeChip key={badge.id} badge={badge} />
      ))}
    </div>
  );
}

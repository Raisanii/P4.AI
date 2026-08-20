"use client";

// P4.AI — BadgesWidget (P6-FE-1).
//
// Dashboard widget showing a student's earned badges prominently and the
// locked (unearned) ones as faded encouragement. Positive tone only (§7.16).
// Mobile-first: 2-column grid that the dashboard layout can embed.

import type { CSSProperties } from "react";
import { useStudentBadges } from "@/hooks/useBadges";
import { BadgeChip } from "@/components/badges/BadgeChip";

interface BadgesWidgetProps {
  /** Student whose badges to display. */
  studentId: string;
}

const card: CSSProperties = {
  padding: "1rem",
  borderRadius: "0.75rem",
  background: "#fff",
  border: "1px solid #e2e8f0",
};

const header: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  marginBottom: "0.75rem",
};

const title: CSSProperties = {
  fontSize: "1rem",
  fontWeight: 700,
  color: "#0f172a",
  margin: 0,
};

const subtitle: CSSProperties = {
  fontSize: "0.75rem",
  color: "#64748b",
  margin: 0,
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "0.5rem",
};

const skeletonItem: CSSProperties = {
  height: "7rem",
  borderRadius: "0.75rem",
  background: "#f1f5f9",
};

const centered: CSSProperties = {
  textAlign: "center",
  padding: "1.5rem 0.5rem",
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

export function BadgesWidget({ studentId }: BadgesWidgetProps) {
  const { badges, status, error, retry } = useStudentBadges(studentId);

  const earned = badges.filter((b) => b.award !== null);

  return (
    <section style={card} aria-label="Badge siswa">
      <div style={header}>
        <span style={{ fontSize: "1.25rem" }} aria-hidden="true">
          🏆
        </span>
        <div>
          <h3 style={title}>Badge Kamu</h3>
          {status === "ready" && (
            <p style={subtitle}>
              {earned.length} dari {badges.length} badge
            </p>
          )}
        </div>
      </div>

      {status === "loading" && (
        <div style={grid} aria-busy="true" aria-label="Memuat badge">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={skeletonItem} />
          ))}
        </div>
      )}

      {status === "error" && (
        <div style={centered} role="alert">
          <p style={{ margin: "0 0 0.5rem" }}>
            😔 {error ?? "Gagal memuat badge"}
          </p>
          <button style={retryButton} onClick={() => void retry()}>
            Coba lagi
          </button>
        </div>
      )}

      {status === "ready" && badges.length === 0 && (
        <div style={centered}>
          <p style={{ margin: 0 }}>Belum ada badge — terus semangat! 🌟</p>
        </div>
      )}

      {status === "ready" && badges.length > 0 && (
        <div style={grid} role="list">
          {badges.map(({ badge, award }) => (
            <BadgeChip key={badge.id} badge={badge} earned={award !== null} />
          ))}
        </div>
      )}
    </section>
  );
}

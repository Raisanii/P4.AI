// P4.AI — Skeleton primitives (NFR-01 loading states).
// Lightweight CSS-shimmer placeholders for loading.tsx files.
// ponytail: no animation library — pure CSS keyframes in globals.css.

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-line skeleton-line-title" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line-short" />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="dash-grid" aria-busy="true" aria-label="Memuat dashboard">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="skeleton-row" aria-hidden="true">
      <div className="skeleton-line skeleton-line-short" />
      <div className="skeleton-line" />
      <div className="skeleton-line skeleton-line-short" />
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="skeleton-list" aria-busy="true" aria-label="Memuat data">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

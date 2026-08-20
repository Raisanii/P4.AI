// P4.AI — Jadwal loading skeleton (NFR-01).

import { SkeletonList } from "@/components/ui/Skeleton";

export default function JadwalLoading() {
  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Jadwal</h1>
      </div>
      <SkeletonList count={6} />
    </main>
  );
}

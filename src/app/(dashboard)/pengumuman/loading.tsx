// P4.AI — Pengumuman loading skeleton (NFR-01).

import { SkeletonList } from "@/components/ui/Skeleton";

export default function PengumumanLoading() {
  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Pengumuman</h1>
      </div>
      <SkeletonList count={4} />
    </main>
  );
}

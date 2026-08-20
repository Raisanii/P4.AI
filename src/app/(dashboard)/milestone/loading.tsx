// P4.AI — Milestone loading skeleton (NFR-01).

import { SkeletonList } from "@/components/ui/Skeleton";

export default function MilestoneLoading() {
  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Milestone</h1>
      </div>
      <SkeletonList count={3} />
    </main>
  );
}

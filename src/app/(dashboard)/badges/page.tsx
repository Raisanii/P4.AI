// P4.AI — /badges page (P6-FE-1).
//
// Badge catalog: all 5 positive badges (§7.16) with emoji + name +
// description. Server component — fetches the catalog from the badge service.

import { getBadgeCatalog } from "@/services/badges/compute";
import BadgeGrid from "@/components/badges/BadgeGrid";

export const dynamic = "force-dynamic";

export default async function BadgesPage() {
  const badges = await getBadgeCatalog();

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Badge</h1>
      </div>
      <p className="page-subtitle">
        Kumpulkan semua badge dengan konsisten mengerjakan tugas. 🌟
      </p>
      <BadgeGrid badges={badges} />
    </main>
  );
}

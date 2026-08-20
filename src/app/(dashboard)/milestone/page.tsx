// P4.AI — /milestone page (MILE-01..05).
// Server component: fetches active milestones with countdown from the service
// layer, role-gates CRUD buttons. Students see read-only list.

import { auth } from "@/lib/auth";
import { getActiveMilestones } from "@/services/milestone";
import MilestoneList from "@/components/milestone/MilestoneList";
import type { Role } from "@/lib/roles";

export const dynamic = "force-dynamic";

const CAN_EDIT: Role[] = ["SUPER_ADMIN", "SECRETARY"];

export default async function MilestonePage() {
  const milestones = await getActiveMilestones();

  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role ? CAN_EDIT.includes(role) : false;

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Milestone</h1>
      </div>
      <MilestoneList milestones={milestones} canEdit={canEdit} />
    </main>
  );
}

// P4.AI — /pengumuman page (ANN-01..06).
// Server component: fetches sorted announcements from the service layer,
// role-gates CRUD buttons. Students see read-only list.
//
// Route §13: /pengumuman is Admin/Sekretaris per PRD, but all roles can view
// the list — only create/edit/delete is gated by canEdit.

import { auth } from "@/lib/auth";
import { getActiveAnnouncements } from "@/services/announcement";
import AnnouncementList from "@/components/announcement/AnnouncementList";
import type { Announcement as AnnouncementType } from "@/components/announcement/AnnouncementCard";
import type { Role } from "@/lib/roles";

export const dynamic = "force-dynamic";

const CAN_EDIT: Role[] = ["SUPER_ADMIN", "SECRETARY"];

export default async function PengumumanPage() {
  const announcements = await getActiveAnnouncements();

  const session = await auth();
  const role = session?.user?.role;
  const canEdit = role ? CAN_EDIT.includes(role) : false;

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Pengumuman</h1>
      </div>
      <AnnouncementList
        announcements={announcements as unknown as AnnouncementType[]}
        canEdit={canEdit}
      />
    </main>
  );
}

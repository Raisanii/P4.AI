// P4.AI — /tugas/new page (TASK-01, TASK-02, §7.6).
// Server component: role-gated wrapper for the clarification wizard.
// Only SUPER_ADMIN + SECRETARY can create tasks (Permission Matrix §6).
// Students are redirected server-side — the middleware handles auth, and
// this page returns 403 for wrong roles to be safe.

import { auth } from "@/lib/auth";
import ClarificationWizard from "@/components/task/ClarificationWizard";
import type { Role } from "@/lib/roles";

export const dynamic = "force-dynamic";

const CAN_EDIT: Role[] = ["SUPER_ADMIN", "SECRETARY"];

export default async function NewTaskPage() {
  const session = await auth();
  const role = session?.user?.role;

  if (!role || !CAN_EDIT.includes(role)) {
    return (
      <main className="page">
        <div className="empty-state">Akses ditolak. Hanya sekretaris/admin yang dapat membuat tugas.</div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <h1 className="page-title">Buat Tugas</h1>
      </div>
      <ClarificationWizard />
    </main>
  );
}

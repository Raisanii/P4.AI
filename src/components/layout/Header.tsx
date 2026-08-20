// P4.AI — layout Header (shows logged-in user name + role + logout).
// Server component: reads the session via auth().

import { auth } from "@/lib/auth";
import LogoutButton from "@/components/auth/LogoutButton";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Admin",
  SECRETARY: "Sekretaris",
  STUDENT: "Siswa",
};

export default async function Header() {
  const session = await auth();
  const name = session?.user?.name ?? "Pengguna";
  const role = session?.user?.role;

  return (
    <header className="header">
      <div className="header-brand">P4.AI</div>
      <div className="header-user">
        <span className="name">{name}</span>
        {role && <span className="role-badge">{ROLE_LABELS[role] ?? role}</span>}
        <LogoutButton />
      </div>
    </header>
  );
}

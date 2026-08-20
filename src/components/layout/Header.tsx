// P4.AI — layout Header (shows logged-in user name + role + logout).
// Server component: reads the session via auth().

import Link from "next/link";
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
  const isAdmin = role === "SUPER_ADMIN" || role === "SECRETARY";

  return (
    <header className="header">
      <div className="header-left">
        <Link href="/" className="header-brand">P4.AI</Link>
        <nav className="header-nav" aria-label="Navigasi">
        <Link href="/jadwal" className="header-nav-link">Jadwal</Link>
        <Link href="/tugas" className="header-nav-link">Tugas</Link>
        <Link href="/pengumuman" className="header-nav-link">Pengumuman</Link>
        <Link href="/milestone" className="header-nav-link">Milestone</Link>
      <Link href="/badges" className="header-nav-link">Badge</Link>
        {isAdmin && <Link href="/analytics" className="header-nav-link">Analytics</Link>}
        {isAdmin && <Link href="/admin" className="header-nav-link">Admin</Link>}
        </nav>
      </div>
      <div className="header-user">
        <span className="name">{name}</span>
        {role && <span className="role-badge">{ROLE_LABELS[role] ?? role}</span>}
        <LogoutButton />
      </div>
    </header>
  );
}

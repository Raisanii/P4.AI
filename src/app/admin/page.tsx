// P4.AI — /admin placeholder (SUPER_ADMIN landing, AUTH-07).
// Full admin dashboard is a separate issue. Fail-closed: only SUPER_ADMIN
// reaches this page — the middleware blocks other roles, and this server-side
// guard re-checks so a student/secretary can never render it even if the
// middleware matcher is ever bypassed.

import Header from "@/components/layout/Header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") redirect("/");

  return (
    <>
      <Header />
      <main className="page">
        <h1>Admin</h1>
        <p style={{ color: "var(--text-muted)" }}>
          Dashboard admin akan datang di iterasi berikutnya.
        </p>
      </main>
    </>
  );
}

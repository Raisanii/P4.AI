// P4.AI — /admin placeholder (SUPER_ADMIN landing, AUTH-07).
// Full admin dashboard is a separate issue. This page sits behind the
// middleware so only SUPER_ADMIN reaches it (others get redirected).

import Header from "@/components/layout/Header";

export default function AdminPage() {
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

// P4.AI — dashboard app shell (DASH-01).
// Route group `(dashboard)` does not affect the URL — `/` renders here.
// The shell wraps every dashboard page in the Header (user name + role +
// logout from SUN-12) and the content area.

import Header from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}

// P4.AI — /login page (AUTH-01).
// Server component: reads the callbackUrl from searchParams and passes it
// to the client LoginForm. The middleware redirects unauthenticated users
// here with ?callbackUrl= set, so a successful login returns them to where
// they were going.

import LoginForm from "@/components/auth/LoginForm";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // Already logged in → bounce to role landing (middleware handles this too,
  // but redirect here avoids a flash of the login form).
  const session = await auth();
  if (session?.user) redirect(session.user.role === "SUPER_ADMIN" ? "/admin" : "/");

  const { callbackUrl } = await searchParams;

  return (
    <main className="login-wrap">
      <div className="login-card">
        <h1>P4.AI</h1>
        <p className="subtitle">Classroom Operating System</p>
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}

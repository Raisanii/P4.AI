// P4.AI — RBAC helpers (Permission Matrix §6).
//
// Middleware should use `src/middleware.ts` (NextResponse-based redirects).
// Route handlers should use `requireRole(...)` (JSON 401/403 responses).

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@/lib/roles";

/** Result of a server-side auth + role check for an API route handler. */
export type AuthContext =
  | { ok: true; userId: string; role: Role; name: string | null }
  | { ok: false; response: NextResponse };

/**
 * Guard a route handler: resolves the current session and checks the user's
 * role against the allowed set. Returns an `AuthContext` the caller must
 * branch on — never a thrown error (so handlers stay explicit).
 *
 * Unauthenticated → 401. Authenticated but wrong role → 403.
 */
export async function requireRole(
  ...roles: Role[]
): Promise<AuthContext> {
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (!roles.includes(user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id, role: user.role, name: user.name ?? null };
}

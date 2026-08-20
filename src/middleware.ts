// Route protection + role-based redirect (AUTH-07).
//
// Wraps the NextAuth middleware so `req.auth` carries the session (and
// NextAuth keeps the JWT cookie alive). When a custom wrapper is supplied,
// NextAuth skips its own `authorized`-callback redirect, so this wrapper is
// responsible for both:
// 1. unauthenticated users → /login (with callbackUrl)
// 2. role-based landing (AUTH-07):
// SUPER_ADMIN → /admin, SECRETARY → /, STUDENT → /
// 3. /analytics gated to SUPER_ADMIN + SECRETARY (students redirect to /)
//
// API routes are excluded from the matcher: they enforce auth + RBAC inside
// their handlers (requireRole) so every endpoint returns an explicit 401/403
// JSON regardless of this page-only middleware.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Matches everything except static assets, image optimization, favicon, and
// the auth/API routes (which must stay reachable by the client during login).
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

const ROLE_LANDING: Record<string, string> = {
  SUPER_ADMIN: "/admin",
  SECRETARY: "/",
  STUDENT: "/",
};

// Routes that require SUPER_ADMIN or SECRETARY (Permission Matrix §6).
// Students are redirected to "/" (acceptance criterion: students must NOT
// view analytics — §7.9).
const ADMIN_ONLY_ROUTES = ["/analytics"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const isLoggedIn = !!req.auth?.user;

  // 1. Unauthenticated → /login (preserve the intended destination).
  if (!isLoggedIn) {
    if (pathname === "/login") return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("callbackUrl", req.nextUrl.href);
    return NextResponse.redirect(url);
  }

  // 2. Role-based landing: super admin hitting `/` should go to /admin.
  if (role === "SUPER_ADMIN" && pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = ROLE_LANDING.SUPER_ADMIN;
    return NextResponse.redirect(url);
  }

  // 3. /admin is SUPER_ADMIN-only: other authenticated roles bounce to /.
  if (pathname === "/admin" && role !== "SUPER_ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // 4. Admin-only routes: students redirected to "/" (§7.9 analytics gating).
  if (ADMIN_ONLY_ROUTES.some((r) => pathname.startsWith(r)) && role === "STUDENT") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

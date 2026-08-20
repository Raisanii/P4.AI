// P4.AI — NextAuth.js v5 (Auth.js) configuration.
//
// Strategy:
//   - Credentials provider (name + password). Login is by `name` (AUTH-01),
//     default password is the student's NIS (AUTH-02).
//   - JWT session (stateless, Turso-friendly — no session table).
//   - `role` claim is carried through the JWT and exposed on `session.user.role`
//     for RBAC (Permission Matrix §6, NFR-05).
//
// References: AUTH-01..08, NFR-04 (bcrypt), NFR-05 (auth + role check).

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyPassword } from "@/lib/password";
import { isRole } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Stateless JWT sessions — no adapter, no DB session table.
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      // `name` doubles as the login identifier (AUTH-01: name + password).
      credentials: {
        name: { label: "Name", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const name = credentials?.name;
        const password = credentials?.password;

        if (typeof name !== "string" || name.length === 0) return null;
        if (typeof password !== "string" || password.length === 0) return null;

        // Lazy-import the Prisma client inside `authorize` so the auth config
        // (and therefore the edge middleware bundle) never loads the node-only
        // libSQL adapter. `authorize` only runs in the node route handler.
        const { prisma } = await import("@/lib/db");

        // Match on `name`. Seed + P1-BE-4 guarantee unique names per class.
        const user = await prisma.user.findFirst({
          where: { name },
        });

        if (!user) return null;
        if (!verifyPassword(password, user.passwordHash)) return null;
        if (!isRole(user.role)) return null;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          nis: user.nis,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, persist the identity + role claims into the JWT.
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.nis = user.nis;
        token.name = user.name ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      // Surface role + id on the session for middleware and route handlers.
      if (session.user) {
        session.user.id = (token.id ?? token.sub) as string;
        session.user.role = (token.role ?? "STUDENT") as
          | "SUPER_ADMIN"
          | "SECRETARY"
          | "STUDENT";
      }
      return session;
    },
    // Gate used by the middleware wrapper (`auth(...)`) — fail closed.
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
  // Fail closed with a short generic message; never leak which part was wrong.
  logger: {
    error: (error) => {
      console.error("[auth]", error.name ?? "AuthError", error.message);
    },
  },
});

import type { DefaultSession } from "next-auth";

// P4.AI — NextAuth.js v5 type augmentation: add `id`, `role`, `nis` to the
// session/user/JWT so route handlers and middleware get typed role claims.

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "SUPER_ADMIN" | "SECRETARY" | "STUDENT";
    } & DefaultSession["user"];
  }

  interface User {
    role: "SUPER_ADMIN" | "SECRETARY" | "STUDENT";
    nis?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "SUPER_ADMIN" | "SECRETARY" | "STUDENT";
    nis?: string;
  }
}

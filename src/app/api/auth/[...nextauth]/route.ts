// NextAuth.js v5 route handler — exposes all `/api/auth/*` endpoints
// (signin, callback/credentials, session, signout, csrf, providers).
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @libsql/client + @prisma/adapter-libsql are server-only; keep them
  // out of the webpack bundle (Next.js cannot bundle them — it would try to
  // parse the package README as a module).
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@libsql/client",
  ],
};

export default nextConfig;

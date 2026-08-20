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
  // Baileys is a node-only WebSocket client; keep it out of the webpack bundle
  // so the status route (which imports the sender singleton) builds cleanly.
  "@whiskeysockets/baileys",
  "pino",
  "qrcode-terminal",
  ],
};

export default nextConfig;

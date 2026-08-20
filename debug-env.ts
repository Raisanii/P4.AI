import { createClient } from "@libsql/client";
const url = process.env.DATABASE_URL;
console.log("DATABASE_URL =", JSON.stringify(url));
const authToken = process.env.TURSO_AUTH_TOKEN;
console.log("TURSO_AUTH_TOKEN =", JSON.stringify(authToken));
if (url) {
  try {
    const c = createClient({ url, authToken: authToken || undefined });
    const r = await c.execute("SELECT 1 as ok");
    console.log("DB OK:", r.rows);
  } catch (e: any) {
    console.log("DB ERR:", e.message);
  }
}

import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import { PrismaClient } from "@prisma/client";

async function main() {
  try {
    const libsql = createClient({ url: "file:./prisma/local.db" });
    const adapter = new PrismaLibSQL(libsql);
    const prisma = new PrismaClient({ adapter });
    const users = await prisma.user.findMany();
    console.log("Users found:", users.length);
    for (const u of users) {
      console.log(`  ${u.name} (${u.role}) nis=${u.nis} hash=${u.passwordHash.slice(0,20)}...`);
    }
    await prisma.$disconnect();
  } catch (e) {
    console.error("DB ERROR:", e.message);
  }
}
main();

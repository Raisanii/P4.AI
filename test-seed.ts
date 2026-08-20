// Reset test data: ensure all 3 test users exist with NIS as password.
// Uses the same PrismaLibSQL adapter as the app.
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";

const url = process.env.DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = [
    { name: "Super Admin Test", nis: "00001", role: "SUPER_ADMIN", whatsapp: "628111111111", password: "00001" },
    { name: "Secretary Test", nis: "00002", role: "SECRETARY", whatsapp: "628222222222", password: "00002" },
    { name: "Student Test", nis: "00003", role: "STUDENT", whatsapp: "628333333333", password: "00003" },
  ];

  for (const u of users) {
    const passwordHash = bcrypt.hashSync(u.password, 10);
    await prisma.user.upsert({
      where: { nis: u.nis },
      update: { passwordHash, role: u.role as any, name: u.name, whatsappNumber: u.whatsapp },
      create: { name: u.name, nis: u.nis, passwordHash, role: u.role as any, whatsappNumber: u.whatsapp },
    });
    console.log(`Reset: ${u.name} (${u.role}) password=${u.password}`);
  }

  const count = await prisma.user.count();
  console.log(`\nTotal users in DB: ${count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

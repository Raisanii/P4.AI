// Test seed: create users for each role with password = NIS (AUTH-02)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { name: "Admin Kelas", nis: "00001", role: "SUPER_ADMIN", whatsappNumber: "628111111111" },
    { name: "Sekretaris", nis: "00002", role: "SECRETARY", whatsappNumber: "628111111112" },
    { name: "Siswa Satu", nis: "12345", role: "STUDENT", whatsappNumber: "628111111113" },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { nis: u.nis },
      update: {},
      create: { ...u, passwordHash: bcrypt.hashSync(u.nis, 10) },
    });
    console.log("Seeded:", u.name, u.role, "nis=" + u.nis);
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

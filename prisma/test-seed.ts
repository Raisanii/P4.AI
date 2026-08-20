// Seed test users for functional testing (NOT the official 36-student seed).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const users = [
    {
      name: "Admin Test",
      nis: "SUPERADMIN001",
      passwordHash: bcrypt.hashSync("SUPERADMIN001", 10),
      role: "SUPER_ADMIN",
      whatsappNumber: "628123450001",
      birthday: new Date("2007-01-15"),
    },
    {
      name: "Sekretaris Test",
      nis: "SECRETARY001",
      passwordHash: bcrypt.hashSync("SECRETARY001", 10),
      role: "SECRETARY",
      whatsappNumber: "628123450002",
      birthday: new Date("2007-02-20"),
    },
    {
      name: "Student Test",
      nis: "12345",
      passwordHash: bcrypt.hashSync("12345", 10),
      role: "STUDENT",
      whatsappNumber: "628123450003",
      birthday: new Date("2007-03-10"),
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { nis: u.nis },
      update: {},
      create: u,
    });
    console.log(`Seeded: ${u.name} (${u.role})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

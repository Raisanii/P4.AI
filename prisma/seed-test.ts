import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  // Test users for all 3 roles
  await prisma.user.create({
    data: {
      name: "Admin Test",
      nis: "ADMIN001",
      passwordHash: hashPassword("adminpass"),
      role: "SUPER_ADMIN",
      whatsappNumber: "628111111111",
    },
  });

  await prisma.user.create({
    data: {
      name: "Secretary Test",
      nis: "SEC001",
      passwordHash: hashPassword("secpass"),
      role: "SECRETARY",
      whatsappNumber: "628222222222",
    },
  });

  await prisma.user.create({
    data: {
      name: "Student Test",
      nis: "STD001",
      passwordHash: hashPassword("stdpass"),
      role: "STUDENT",
      whatsappNumber: "628333333333",
    },
  });

  console.log("Test users seeded: Admin, Secretary, Student");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

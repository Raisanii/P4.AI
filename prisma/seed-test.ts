// Seed test users + milestones for functional testing
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  // Clean
  await prisma.milestone.deleteMany();
  await prisma.user.deleteMany();

  // Users: one per role. Password = "password123" for all.
  const pw = hashPassword("password123");

  const admin = await prisma.user.create({
    data: { name: "TestAdmin", nis: "1001", role: "SUPER_ADMIN", passwordHash: pw, whatsappNumber: "+628110000001" },
  });
  const sec = await prisma.user.create({
    data: { name: "TestSecretary", nis: "1002", role: "SECRETARY", passwordHash: pw, whatsappNumber: "+628110000002" },
  });
  const stu = await prisma.user.create({
    data: { name: "TestStudent", nis: "1003", role: "STUDENT", passwordHash: pw, whatsappNumber: "+628110000003" },
  });

  console.log("Seeded users:", admin.name, sec.name, stu.name);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

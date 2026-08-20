// Test seed — creates minimal users for Phase 1 acceptance testing.
// Replaces the stub seed.ts. NOT the production 36-student seed (P1-BE-4).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const TEST_STUDENTS = [
  { name: "Ayyi", nis: "1001", whatsappNumber: "6281234500001", birthday: "2008-04-15T00:00:00.000Z" },
  { name: "Raisani Aprilia", nis: "1002", whatsappNumber: "6281234500002", birthday: "2008-08-19T00:00:00.000Z" },
];

async function main() {
  // Super admin (ketua kelas) — AUTH-02 default password = NIS
  const adminNis = "0001";
  await prisma.user.upsert({
    where: { nis: adminNis },
    update: {},
    create: {
      name: "Ayyi Admin",
      nis: adminNis,
      passwordHash: bcrypt.hashSync(adminNis, 10),
      role: "SUPER_ADMIN",
      whatsappNumber: "6281111111111",
      birthday: new Date("2008-01-01"),
    },
  });

  // Secretary
  const secNis = "2001";
  await prisma.user.upsert({
    where: { nis: secNis },
    update: {},
    create: {
      name: "Sekretaris Test",
      nis: secNis,
      passwordHash: bcrypt.hashSync(secNis, 10),
      role: "SECRETARY",
      whatsappNumber: "6281111111112",
      birthday: new Date("2008-02-02"),
    },
  });

  // Students
  for (const s of TEST_STUDENTS) {
    await prisma.user.upsert({
      where: { nis: s.nis },
      update: {},
      create: {
        name: s.name,
        nis: s.nis,
        passwordHash: bcrypt.hashSync(s.nis, 10),
        role: "STUDENT",
        whatsappNumber: s.whatsappNumber,
        birthday: new Date(s.birthday),
      },
    });
  }

  const count = await prisma.user.count();
  console.log(`Seeded ${count} users (1 super admin, 1 secretary, ${TEST_STUDENTS.length} students).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

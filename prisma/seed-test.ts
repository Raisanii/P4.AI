
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hash = (p: string) => bcrypt.hashSync(p, 10);

  // SUPER_ADMIN — password "admin123"
  const admin = await prisma.user.upsert({
    where: { nis: "ADM001" },
    update: {},
    create: { name: "Test Admin", nis: "ADM001", passwordHash: hash("admin123"), role: "SUPER_ADMIN", whatsappNumber: "+628111111111" },
  });

  // SECRETARY — password "sec123"
  const sec = await prisma.user.upsert({
    where: { nis: "SEC001" },
    update: {},
    create: { name: "Test Secretary", nis: "SEC001", passwordHash: hash("sec123"), role: "SECRETARY", whatsappNumber: "+628111111112" },
  });

  // STUDENT — password "stu123"
  const stu = await prisma.user.upsert({
    where: { nis: "STU001" },
    update: {},
    create: { name: "Test Student", nis: "STU001", passwordHash: hash("stu123"), role: "STUDENT", whatsappNumber: "+628111111113" },
  });

  // Second student for bulk tests
  const stu2 = await prisma.user.upsert({
    where: { nis: "STU002" },
    update: {},
    create: { name: "Test Student2", nis: "STU002", passwordHash: hash("stu123"), role: "STUDENT", whatsappNumber: "+628111111114" },
  });

  console.log(JSON.stringify({ admin: admin.id, secretary: sec.id, student: stu.id, student2: stu2.id }));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

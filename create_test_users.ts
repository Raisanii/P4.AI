import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSQL({ url: "file:./prisma/dev.db" });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.user.deleteMany({});

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  const admin = await prisma.user.create({
    data: {
      name: "Ketua Kelas",
      nis: "0000000001",
      passwordHash: hash("0000000001"),
      role: "SUPER_ADMIN",
      whatsappNumber: "6281234567001",
    },
  });

  const secretary = await prisma.user.create({
    data: {
      name: "Sekretaris",
      nis: "0000000002",
      passwordHash: hash("0000000002"),
      role: "SECRETARY",
      whatsappNumber: "6281234567002",
    },
  });

  const student = await prisma.user.create({
    data: {
      name: "Ayyi",
      nis: "1234567890",
      passwordHash: hash("1234567890"),
      role: "STUDENT",
      whatsappNumber: "6281234567003",
      birthday: new Date("2008-04-15"),
    },
  });

  console.log("Test users created:");
  console.log("  Admin:", admin.name, admin.nis, admin.role);
  console.log("  Secretary:", secretary.name, secretary.nis, secretary.role);
  console.log("  Student:", student.name, student.nis, student.role);

  const all = await prisma.user.findMany();
  for (const u of all) {
    const isBcrypt = u.passwordHash.startsWith("$2");
    console.log(`  ${u.name}: hash=${u.passwordHash.substring(0, 7)}... bcrypt=${isBcrypt}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

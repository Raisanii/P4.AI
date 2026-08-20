
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // NIS-based passwords (AUTH-02: default password = NIS)
  const adminNis = "0001";
  const secNis = "0002";
  const stuNis = "0003";

  const adminHash = bcrypt.hashSync(adminNis, 10);
  const secHash = bcrypt.hashSync(secNis, 10);
  const stuHash = bcrypt.hashSync(stuNis, 10);

  const admin = await prisma.user.create({
    data: { name: "Admin Test", nis: adminNis, passwordHash: adminHash, role: "SUPER_ADMIN", whatsappNumber: "6280001" },
  });

  const secretary = await prisma.user.create({
    data: { name: "Secretary Test", nis: secNis, passwordHash: secHash, role: "SECRETARY", whatsappNumber: "6280002" },
  });

  const student = await prisma.user.create({
    data: { name: "Student Test", nis: stuNis, passwordHash: stuHash, role: "STUDENT", whatsappNumber: "6280003" },
  });

  console.log("Seeded users:", admin.id, secretary.id, student.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());

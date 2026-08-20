// Test seed: 3 users (one per role) with default password = NIS (AUTH-02).
import { PrismaClient, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.deleteMany({});

  const users: { name: string; nis: string; role: Role; whatsappNumber: string }[] = [
    { name: "Admin Raisani", nis: "10001", role: "SUPER_ADMIN", whatsappNumber: "62811110001" },
    { name: "Sekretaris Dini", nis: "10002", role: "SECRETARY", whatsappNumber: "62811110002" },
    { name: "Siswa Andi", nis: "10003", role: "STUDENT", whatsappNumber: "62811110003" },
  ];

  for (const u of users) {
    const passwordHash = bcrypt.hashSync(u.nis, 10); // AUTH-02: default = NIS
    await prisma.user.create({
      data: { ...u, passwordHash },
    });
    console.log(`Seeded: ${u.name} (${u.role}) — login: name="${u.name}" password="${u.nis}"`);
  }
  console.log("Done — 3 users seeded.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

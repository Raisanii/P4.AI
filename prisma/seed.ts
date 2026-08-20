// P4.AI — Seed 36 SMK students (PPLG 4) + 1 super admin (ketua kelas).
// PRD: §7.19 Data Siswa; AUTH-02 (default password = NIS); STUD (CRUD siswa); Open Question #1.
//
// Idempotent: uses upsert keyed on unique `nis`. Re-running updates fields in place;
// passwordHash is set once on create and never overwritten — student-changed passwords
// survive re-seed (AUTH-03).
//
// Run: npm run db:seed  (or: npx prisma db seed)

import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import studentsData from "./students.json";

const prisma = new PrismaClient();

type StudentSeed = {
  name: string;
  nis: string;
  whatsappNumber: string;
  birthday: string;
  role?: string;
};

async function main() {
  const records = studentsData as StudentSeed[];

  // Validate source data integrity before touching the DB.
  const nisSet = new Set<string>();
  const waSet = new Set<string>();
  for (const [i, r] of records.entries()) {
    if (!r.name || !r.nis || !r.whatsappNumber || !r.birthday) {
      throw new Error(`seed: record #${i} missing required field(s): ${JSON.stringify(r)}`);
    }
    if (nisSet.has(r.nis)) throw new Error(`seed: duplicate NIS "${r.nis}" at record #${i}`);
    if (waSet.has(r.whatsappNumber))
      throw new Error(`seed: duplicate WhatsApp number "${r.whatsappNumber}" at record #${i}`);
    nisSet.add(r.nis);
    waSet.add(r.whatsappNumber);
  }

  const superAdmins = records.filter((r) => r.role === "SUPER_ADMIN");
  if (superAdmins.length !== 1)
    throw new Error(`seed: expected exactly 1 SUPER_ADMIN, found ${superAdmins.length}`);

  console.log(`seed: ${records.length} records (${superAdmins.length} super admin, ${records.length - superAdmins.length} student)`);

  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const r of records) {
    const role = (r.role ?? "STUDENT") as Role;
    const birthday = new Date(r.birthday + "T00:00:00.000Z");

    // Set passwordHash once on create; on update keep the existing hash so a student
    // who changed their password is NOT reset by re-seed (AUTH-03).
    const existing = await prisma.user.findUnique({ where: { nis: r.nis } });

    const passwordHash = existing ? existing.passwordHash : hashPassword(r.nis);

    const result = await prisma.user.upsert({
      where: { nis: r.nis },
      create: {
        name: r.name,
        nis: r.nis,
        whatsappNumber: r.whatsappNumber,
        birthday,
        role,
        passwordHash,
      },
      update: {
        name: r.name,
        whatsappNumber: r.whatsappNumber,
        birthday,
        role,
        passwordHash,
      },
    });

    if (!existing) created++;
    else if (
      existing.name !== result.name ||
      existing.whatsappNumber !== result.whatsappNumber ||
      existing.birthday?.getTime() !== result.birthday?.getTime() ||
      existing.role !== result.role ||
      existing.passwordHash !== result.passwordHash
    )
      updated++;
    else unchanged++;
  }

  const counts = await prisma.user.groupBy({
    by: ["role"],
    _count: true,
  });

  console.log(
    `seed: done — ${created} created, ${updated} updated, ${unchanged} unchanged. ` +
      `DB now: ${counts.map((c) => `${c.role}=${c._count}`).join(", ")}`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

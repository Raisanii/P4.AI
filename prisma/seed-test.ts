
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaLibSQL({ url: process.env.DATABASE_URL! }),
});

function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

async function main() {
  await prisma.schedule.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: { name: "Test Admin", nis: "0001", passwordHash: hashPassword("12345"), role: "SUPER_ADMIN", whatsappNumber: "6281234567001" },
  });
  const secretary = await prisma.user.create({
    data: { name: "Test Secretary", nis: "0002", passwordHash: hashPassword("12345"), role: "SECRETARY", whatsappNumber: "6281234567002" },
  });
  const student = await prisma.user.create({
    data: { name: "Test Student", nis: "0003", passwordHash: hashPassword("12345"), role: "STUDENT", whatsappNumber: "6281234567003" },
  });

  // Today is 2026-08-20 = Thursday. weekType null = every-week (SCHD-05)
  await prisma.schedule.create({ data: { dayOfWeek: "thursday", weekType: null, subject: "Matematika", teacher: "Pak Budi", startTime: "07:30", endTime: "09:00", room: "R101" } });
  await prisma.schedule.create({ data: { dayOfWeek: "thursday", weekType: "A", subject: "B. Inggris", teacher: "Ms Citra", startTime: "09:15", endTime: "10:45", room: "R102" } });
  await prisma.schedule.create({ data: { dayOfWeek: "friday", weekType: "B", subject: "Fisika", teacher: "Pak Doni", startTime: "07:30", endTime: "09:00", room: "R103" } });

  // Milestones — future dates for countdown
  const d1 = new Date(); d1.setDate(d1.getDate() + 12);
  await prisma.milestone.create({ data: { title: "PTS Genap 2026", type: "PTS", date: d1, active: true } });
  const d2 = new Date(); d2.setDate(d2.getDate() + 30);
  await prisma.milestone.create({ data: { title: "Prakerin Mulai", type: "PRAKERIN", date: d2, active: true } });

  console.log("Seed OK:", admin.name, secretary.name, student.name);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

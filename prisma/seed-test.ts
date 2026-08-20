// P4.AI — Test seed for SUN-35 acceptance tests.
// Seeds: 1 SUPER_ADMIN, 1 STUDENT (whitelisted), 1 STUDENT (no whatsapp = non-whitelisted),
// 1 Assignment "matematika", 1 Schedule entry for today, 1 BotSkill, 1 BotRule.

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test data for SUN-35...");

  // SUPER_ADMIN — Ketua kelas
  const admin = await prisma.user.upsert({
    where: { nis: "00001" },
    update: {},
    create: {
      name: "Ketua Kelas",
      nis: "00001",
      passwordHash: await hashPassword("admin123"),
      role: "SUPER_ADMIN",
      whatsappNumber: "+6281234567890",
    },
  });

  // STUDENT — whitelisted
  const student = await prisma.user.upsert({
    where: { nis: "10001" },
    update: {},
    create: {
      name: "Andi Pratama",
      nis: "10001",
      passwordHash: await hashPassword("10001"),
      role: "STUDENT",
      whatsappNumber: "+6281111111111",
    },
  });

  // STUDENT — no whatsapp number (non-whitelisted for TC-WA-001)
  await prisma.user.upsert({
    where: { nis: "10002" },
    update: {},
    create: {
      name: "Budi Santoso",
      nis: "10002",
      passwordHash: await hashPassword("10002"),
      role: "STUDENT",
      whatsappNumber: "+6282222222222",
    },
  });

  // Assignment — "matematika"
  const assignment = await prisma.assignment.upsert({
    where: { id: "test-assignment-matematika" },
    update: {},
    create: {
      id: "test-assignment-matematika",
      title: "Tugas Matematika Bab 4",
      subject: "Matematika",
      description: "Kerjakan soal halaman 45-50.",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      type: "INDIVIDUAL",
      knowledgeBase: { topics: ["aljabar", "geometri"] },
      createdById: admin.id,
    },
  });

  // Schedule — today (day-of-week + week A)
  const now = new Date();
  const dayKey = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][now.getDay()];
  await prisma.schedule.upsert({
    where: { id: "test-schedule-today" },
    update: {},
    create: {
      id: "test-schedule-today",
      dayOfWeek: dayKey,
      weekType: "A",
      subject: "Matematika",
      teacher: "Pak Bambang",
      startTime: "08:00",
      endTime: "09:30",
      room: "Ruang 12",
    },
  });

  // BotSkill
  await prisma.botSkill.upsert({
    where: { id: "test-skill-1" },
    update: {},
    create: {
      id: "test-skill-1",
      name: "Jawab Tugas",
      description: "Skill untuk menjawab pertanyaan tugas",
      prompt: "Jawab pertanyaan tugas berdasarkan data tugas aktif.",
      active: true,
    },
  });

  // BotRule
  await prisma.botRule.upsert({
    where: { id: "test-rule-1" },
    update: {},
    create: {
      id: "test-rule-1",
      name: "Tidak Bypass",
      condition: "Jika siswa minta ubah nilai",
      action: "Tolak, arahkan ke guru",
      active: true,
    },
  });

  console.log("Seed complete:");
  console.log("  Admin:", admin.id, admin.name, admin.whatsappNumber);
  console.log("  Student:", student.id, student.name, student.whatsappNumber);
  console.log("  Assignment:", assignment.id, assignment.title);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
